import { and, asc, desc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { customer, letter, product, purchase, shop } from "@/lib/db/schema";
import { captureOrder, createOrder } from "@/lib/paypal";
import { renderLetterEmail } from "./email";
import { planNextLetter, PlanRejected, writeReason, type PlannerContext } from "./planner";
import { createLinkToken } from "./token";

/** 日付は UTC の YYYY-MM-DD で扱う (送る日の比較と、毎日 0:00 UTC の見回りに合わせる) */
export function utcDate(at: Date = new Date()) {
  return at.toISOString().slice(0, 10);
}

type Env = AppEnv;
type LetterRow = typeof letter.$inferSelect;

export class LetterError extends Error {}

async function loadShop(env: Env, userId: string) {
  const [row] = await getDb(env).select().from(shop).where(eq(shop.userId, userId)).limit(1);
  if (!row) throw new LetterError("The shop is not set up yet");
  return row;
}

/** AI に渡す、1人の客の履歴と今の商品の一覧 */
export async function loadPlannerContext(env: Env, userId: string, customerId: string): Promise<PlannerContext> {
  const db = getDb(env);
  const [owner, person, products, purchases, letters] = await Promise.all([
    loadShop(env, userId),
    db
      .select()
      .from(customer)
      .where(and(eq(customer.userId, userId), eq(customer.id, customerId)))
      .limit(1)
      .then((rows) => rows[0]),
    db.select().from(product).where(and(eq(product.userId, userId), eq(product.active, true))),
    db
      .select({ purchase, productName: product.name, bagGrams: product.bagGrams })
      .from(purchase)
      .innerJoin(product, eq(product.id, purchase.productId))
      .where(eq(purchase.customerId, customerId))
      .orderBy(asc(purchase.purchasedAt)),
    db
      .select({ letter, productName: product.name })
      .from(letter)
      .innerJoin(product, eq(product.id, letter.productId))
      .where(and(eq(letter.customerId, customerId), inArray(letter.status, ["sent", "paid"])))
      .orderBy(asc(letter.sentAt)),
  ]);
  if (!person) throw new LetterError("Customer not found");
  return {
    today: utcDate(),
    shop: { name: owner.name, currency: owner.currency },
    customer: { name: person.name, country: person.country },
    purchases: purchases.map((row) => ({
      date: utcDate(row.purchase.purchasedAt),
      productId: row.purchase.productId,
      productName: row.productName,
      quantity: row.purchase.quantity,
      bagGrams: row.bagGrams,
    })),
    letters: letters.map((row) => ({
      sentOn: utcDate(row.letter.sentAt ?? row.letter.createdAt),
      productName: row.productName,
      quantity: row.letter.quantity,
      clicked: row.letter.clickedAt !== null,
      paidOn: row.letter.paidAt ? utcDate(row.letter.paidAt) : null,
    })),
    products: products.map((row) => ({
      id: row.id,
      name: row.name,
      origin: row.origin,
      roast: row.roast,
      notes: row.notes,
      bagGrams: row.bagGrams,
      priceMinor: row.priceMinor,
      stock: row.stock,
      arrivedOn: row.arrivedOn,
    })),
  };
}

/**
 * 客の次のメールを AI に決めさせる。客が買ったとき、メールを送ったときに呼ぶ。
 * まだ送っていない予定は作り直す。広告メールに同意していない客、配信を止めた客には何も決めない
 */
export async function planFor(env: Env, userId: string, customerId: string) {
  const db = getDb(env);
  const [person] = await db
    .select()
    .from(customer)
    .where(and(eq(customer.userId, userId), eq(customer.id, customerId)))
    .limit(1);
  if (!person) throw new LetterError("Customer not found");
  await db
    .update(letter)
    .set({ status: "canceled" })
    .where(and(eq(letter.customerId, customerId), eq(letter.status, "planned")));
  if (!person.marketingConsentAt || person.unsubscribedAt) return null;

  const context = await loadPlannerContext(env, userId, customerId);
  const plan = await planNextLetter(env, context);
  if (plan.action === "stop") {
    await db
      .update(customer)
      .set({ lettersStoppedAt: new Date(), lettersStoppedReason: plan.timingReason })
      .where(eq(customer.id, customerId));
    return null;
  }
  const row = {
    id: crypto.randomUUID(),
    userId,
    customerId,
    status: "planned",
    sendOn: plan.sendOn!,
    timingReason: plan.timingReason,
    productId: plan.productId!,
    quantity: plan.quantity!,
    reason: plan.reason!,
  };
  await db.insert(letter).values(row);
  await db
    .update(customer)
    .set({ lettersStoppedAt: null, lettersStoppedReason: null })
    .where(eq(customer.id, customerId));
  return row;
}

/** 店の人が予定を直す。直した値にも、AI の答えと同じように在庫と日付を確かめる */
export async function overrideLetter(
  env: Env,
  userId: string,
  letterId: string,
  input: { sendOn: string; productId: string; quantity: number },
) {
  const db = getDb(env);
  const [row] = await db
    .select()
    .from(letter)
    .where(and(eq(letter.userId, userId), eq(letter.id, letterId)))
    .limit(1);
  if (!row) throw new LetterError("Email not found");
  if (row.status !== "planned") throw new LetterError("Only planned emails can be changed");
  if (input.sendOn <= utcDate()) throw new LetterError("The send date must be after today");
  if (!Number.isInteger(input.quantity) || input.quantity < 1) throw new LetterError("Quantity must be 1 or more");
  const [item] = await db
    .select()
    .from(product)
    .where(and(eq(product.userId, userId), eq(product.id, input.productId), eq(product.active, true)))
    .limit(1);
  if (!item) throw new LetterError("Product not found");
  if (item.stock < input.quantity) throw new LetterError(`${item.name} has only ${item.stock} bags in stock`);

  // 商品か量が変われば、AI の理由が合わなくなるので書き直す
  const reason =
    input.productId === row.productId && input.quantity === row.quantity
      ? row.reason
      : await writeReason(env, await loadPlannerContext(env, userId, row.customerId), input);
  await db
    .update(letter)
    .set({ ...input, reason, editedByOwner: true })
    .where(eq(letter.id, row.id));
}

function appUrl(env: Env) {
  return env.VITE_PUBLIC_APP_URL.replace(/\/$/, "");
}

/** 1通送る。送る前に、同意・配信停止・在庫を確かめ直す */
export async function sendLetter(env: Env, row: LetterRow) {
  const db = getDb(env);
  const [owner, person, item] = await Promise.all([
    loadShop(env, row.userId),
    db.select().from(customer).where(eq(customer.id, row.customerId)).limit(1).then((rows) => rows[0]),
    db.select().from(product).where(eq(product.id, row.productId)).limit(1).then((rows) => rows[0]),
  ]);
  const skip = async (error: string) => {
    await db.update(letter).set({ status: "canceled", error }).where(eq(letter.id, row.id));
  };
  if (!person?.marketingConsentAt || person.unsubscribedAt) return skip("The customer does not receive emails");
  if (!item?.active || item.stock < row.quantity) {
    // 在庫が足りなくなっていれば、今の商品の一覧で選び直す
    await skip("Out of stock when sending");
    return planFor(env, row.userId, row.customerId);
  }

  const base = appUrl(env);
  const unsubscribeUrl = `${base}/u/${await createLinkToken(env.LINK_SIGNING_SECRET, "unsubscribe", row.id)}`;
  const message = renderLetterEmail({
    shopName: owner.name,
    customerName: person.name,
    reason: row.reason,
    product: item,
    quantity: row.quantity,
    unitMinor: item.priceMinor,
    shippingMinor: owner.shippingMinor,
    currency: owner.currency,
    payUrl: `${base}/l/${await createLinkToken(env.LINK_SIGNING_SECRET, "pay", row.id)}`,
    unsubscribeUrl,
  });
  try {
    await env.EMAIL.send({
      // 送り元の名前は店の名前にする (客にとっての相手は店)
      from: { name: owner.name, email: env.LETTER_EMAIL_FROM },
      to: person.email,
      ...message,
      // メールソフトの「配信停止」ボタンから、1回で止められるようにする (/u/:token への POST)
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  } catch (error) {
    await db
      .update(letter)
      .set({ status: "failed", error: String(error instanceof Error ? error.message : error).slice(0, 500) })
      .where(eq(letter.id, row.id));
    throw error;
  }
  await db.update(letter).set({ status: "sent", sentAt: new Date(), error: null }).where(eq(letter.id, row.id));
  // 送ったら、その次をすぐに決める (買われたら planFor が作り直す)
  return planFor(env, row.userId, row.customerId);
}

/** 毎日の見回り: 送る日になった予定を送る */
export async function sendDueLetters(env: Env) {
  const due = await getDb(env)
    .select()
    .from(letter)
    .where(and(eq(letter.status, "planned"), lte(letter.sendOn, utcDate())))
    .orderBy(asc(letter.sendOn));
  for (const row of due) {
    await sendLetter(env, row).catch((error) =>
      console.error("メールを送れませんでした:", row.id, error instanceof PlanRejected ? error.message : error),
    );
  }
}

async function loadLetter(env: Env, letterId: string) {
  const [row] = await getDb(env).select().from(letter).where(eq(letter.id, letterId)).limit(1);
  return row ?? null;
}

/**
 * メールのリンクが開かれたら、その時点の価格で PayPal の注文を作り、支払い画面の URL を返す。
 * 送ったときに作らないのは、注文の期限切れと価格のずれを避けるため
 */
export async function startCheckout(env: Env, letterId: string) {
  const row = await loadLetter(env, letterId);
  if (!row || (row.status !== "sent" && row.status !== "paid")) return { state: "unavailable" as const };
  if (row.status === "paid") return { state: "paid" as const };
  const db = getDb(env);
  const [owner, item] = await Promise.all([
    loadShop(env, row.userId),
    db.select().from(product).where(eq(product.id, row.productId)).limit(1).then((rows) => rows[0]),
  ]);
  if (!item?.active || item.stock < row.quantity) return { state: "sold_out" as const, shopName: owner.name };

  const now = new Date();
  await db
    .update(letter)
    .set({ clickedAt: sql`coalesce(${letter.clickedAt}, ${now})` })
    .where(eq(letter.id, row.id));
  const token = await createLinkToken(env.LINK_SIGNING_SECRET, "pay", row.id);
  const base = appUrl(env);
  const order = await createOrder(
    env,
    {
      referenceId: row.id,
      payeeEmail: owner.payeeEmail,
      brandName: owner.name,
      currency: owner.currency,
      item: {
        name: item.name,
        description: `${item.origin}, ${item.roast} roast, ${item.bagGrams}g`.slice(0, 127),
        sku: item.id,
        quantity: row.quantity,
        unitMinor: item.priceMinor,
      },
      shippingMinor: owner.shippingMinor,
      returnUrl: `${base}/l/${token}/return`,
      cancelUrl: `${base}/l/${token}/cancel`,
    },
    // 同じメールでも、開くたびに新しい注文にする (前の注文は期限が切れているかもしれない)
    `letter-${row.id}-${now.getTime()}`,
  );
  await db
    .update(letter)
    .set({ paypalOrderId: order.orderId, checkoutUnitMinor: item.priceMinor })
    .where(eq(letter.id, row.id));
  return { state: "redirect" as const, url: order.approveUrl };
}

/** 客が PayPal で承認して戻ってきたら、代金を受け取り、購入として記録する */
export async function completeCheckout(env: Env, letterId: string, paypalOrderId: string) {
  const row = await loadLetter(env, letterId);
  if (!row) return { state: "unavailable" as const };
  const owner = await loadShop(env, row.userId);
  if (row.status === "paid") return { state: "paid" as const, shopName: owner.name, paidMinor: row.paidMinor, currency: owner.currency };
  // 戻り先の URL の注文 ID は書き換えられるので、このメールで作った注文かを確かめる
  if (row.paypalOrderId !== paypalOrderId) return { state: "unavailable" as const };

  const capture = await captureOrder(env, paypalOrderId);
  if (capture.customId !== row.id || capture.status !== "COMPLETED" || !capture.captureId) {
    return { state: "not_completed" as const, shopName: owner.name };
  }
  if (row.checkoutUnitMinor === null) throw new LetterError("The checkout price was not recorded");
  const unitPriceMinor = row.checkoutUnitMinor;
  const db = getDb(env);
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(letter)
      .set({ status: "paid", paidAt: now, paypalCaptureId: capture.captureId, paidMinor: capture.amountMinor })
      .where(eq(letter.id, row.id));
    await tx.insert(purchase).values({
      id: crypto.randomUUID(),
      userId: row.userId,
      customerId: row.customerId,
      productId: row.productId,
      quantity: row.quantity,
      unitPriceMinor,
      source: "letterpay",
      letterId: row.id,
      purchasedAt: now,
    });
    await tx
      .update(product)
      .set({ stock: sql`${product.stock} - ${row.quantity}` })
      .where(eq(product.id, row.productId));
  });
  // 買われたので、次のメールを決め直す
  await planFor(env, row.userId, row.customerId).catch((error) =>
    console.error("次のメールを決められませんでした:", row.customerId, error),
  );
  return { state: "paid" as const, shopName: owner.name, paidMinor: capture.amountMinor, currency: owner.currency };
}

/** アカウントを消すときに、まだ送っていないメールをすべて取り消す */
export async function cancelPlannedLetters(env: Env, userId: string) {
  await getDb(env)
    .update(letter)
    .set({ status: "canceled" })
    .where(and(eq(letter.userId, userId), eq(letter.status, "planned")));
}

/** メールを送った店の名前 (メールのリンクから来た客に見せる) */
export async function shopNameOfLetter(env: Env, letterId: string) {
  const row = await loadLetter(env, letterId);
  return row ? (await loadShop(env, row.userId)).name : null;
}

/** 配信を止める。まだ送っていない予定も取り消す */
export async function unsubscribe(env: Env, letterId: string) {
  const row = await loadLetter(env, letterId);
  if (!row) return null;
  const db = getDb(env);
  await db
    .update(customer)
    .set({ unsubscribedAt: new Date() })
    .where(and(eq(customer.id, row.customerId), isNull(customer.unsubscribedAt)));
  await db
    .update(letter)
    .set({ status: "canceled" })
    .where(and(eq(letter.customerId, row.customerId), eq(letter.status, "planned")));
  return (await loadShop(env, row.userId)).name;
}

/** 店の画面の表: 客ごとに、最新のメールとその結果、買った回数 */
export async function listLetterRows(env: Env, userId: string) {
  const db = getDb(env);
  const [customers, letters, purchases, products] = await Promise.all([
    db.select().from(customer).where(eq(customer.userId, userId)).orderBy(asc(customer.name)),
    db.select().from(letter).where(eq(letter.userId, userId)).orderBy(desc(letter.createdAt)),
    db
      .select({
        customerId: purchase.customerId,
        count: sql<string>`count(*)`,
        lastAt: sql<Date>`max(${purchase.purchasedAt})`,
        letterpayMinor: sql<string>`coalesce(sum(case when ${purchase.source} = 'letterpay' then ${purchase.quantity} * ${purchase.unitPriceMinor} else 0 end), 0)`,
      })
      .from(purchase)
      .where(eq(purchase.userId, userId))
      .groupBy(purchase.customerId),
    db.select({ id: product.id, name: product.name }).from(product).where(eq(product.userId, userId)),
  ]);
  const productName = new Map(products.map((row) => [row.id, row.name]));
  const purchaseStats = new Map(purchases.map((row) => [row.customerId, row]));
  return customers.map((person) => {
    const own = letters.filter((row) => row.customerId === person.id);
    const planned = own.find((row) => row.status === "planned") ?? null;
    const lastSent = own.find((row) => row.status === "sent" || row.status === "paid") ?? null;
    const stats = purchaseStats.get(person.id);
    return {
      customerId: person.id,
      name: person.name,
      email: person.email,
      country: person.country,
      consent: person.marketingConsentAt !== null && person.unsubscribedAt === null,
      unsubscribed: person.unsubscribedAt !== null,
      stoppedReason: person.lettersStoppedReason,
      purchases: Number(stats?.count ?? 0),
      lastPurchaseOn: stats?.lastAt ? utcDate(new Date(stats.lastAt)) : null,
      letterpayRevenueMinor: Number(stats?.letterpayMinor ?? 0),
      planned: planned && {
        id: planned.id,
        sendOn: planned.sendOn,
        timingReason: planned.timingReason,
        productId: planned.productId,
        productName: productName.get(planned.productId) ?? "",
        quantity: planned.quantity,
        reason: planned.reason,
        editedByOwner: planned.editedByOwner,
      },
      lastSent: lastSent && {
        id: lastSent.id,
        sentOn: lastSent.sentAt ? utcDate(lastSent.sentAt) : null,
        productName: productName.get(lastSent.productId) ?? "",
        result: lastSent.status === "paid" ? "paid" : lastSent.clickedAt ? "clicked" : "sent",
      },
    };
  });
}
