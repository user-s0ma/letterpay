import { eq } from "drizzle-orm";
import { isDemoUser } from "@/lib/auth/demo-account";
import { getDb } from "@/lib/db/client";
import { customer, letter, product, purchase, shop } from "@/lib/db/schema";
import { planFor } from "@/lib/letters/service";

/**
 * デモの店 Hoshizora Coffee (架空) の商品と、好みと飲む量の違う客の購入履歴を作る。
 * 客のメールアドレスは店の人のアドレスに +名前 を付けたもの (デモのメールが店の人に届く)
 */

const DAY = 24 * 60 * 60 * 1000;

type DemoProduct = {
  key: string;
  name: string;
  description: string;
  size: string;
  priceMinor: number;
  stock: number;
  /** 何日前に入荷したか */
  arrivedDaysAgo: number;
};

// 定番の豆は履歴の始まりより前 (240日前) に入荷している。新しい豆 (Huila、Kona) は最近入荷した
const PRODUCTS: DemoProduct[] = [
  { key: "yirgacheffe", name: "Ethiopia Yirgacheffe Kochere", description: "Light roast from Ethiopia. Jasmine, bergamot and lemon. Light body, bright finish.", size: "200 g bag", priceMinor: 1900, stock: 40, arrivedDaysAgo: 240 },
  { key: "huila", name: "Colombia Huila Pink Bourbon", description: "Light roast from Colombia. Red grape, hibiscus and brown sugar. Juicy and sweet.", size: "200 g bag", priceMinor: 2200, stock: 18, arrivedDaysAgo: 9 },
  { key: "cerrado", name: "Brazil Cerrado Natural", description: "Medium roast from Brazil. Milk chocolate, roasted almond and caramel. Round and low in acidity.", size: "200 g bag", priceMinor: 1600, stock: 60, arrivedDaysAgo: 240 },
  { key: "antigua", name: "Guatemala Antigua", description: "Medium roast from Guatemala. Cocoa, orange peel and honey. Balanced with a clean finish.", size: "200 g bag", priceMinor: 1800, stock: 35, arrivedDaysAgo: 240 },
  { key: "kona", name: "Hawaii Kona Extra Fancy", description: "Medium roast from Hawaii. Macadamia, butter and soft citrus. Smooth and gentle.", size: "200 g bag", priceMinor: 3800, stock: 6, arrivedDaysAgo: 5 },
  { key: "mandheling", name: "Sumatra Mandheling", description: "Dark roast from Indonesia. Dark chocolate, cedar and spice. Heavy body, long finish.", size: "200 g bag", priceMinor: 1700, stock: 45, arrivedDaysAgo: 240 },
  { key: "hoshizora", name: "Hoshizora House Blend", description: "Dark roast blend of Brazil, Colombia and Indonesia. Bittersweet chocolate and toasted nuts. Made for milk drinks.", size: "400 g bag", priceMinor: 2600, stock: 50, arrivedDaysAgo: 240 },
];

type Persona = {
  name: string;
  country: string;
  /** 好きな商品。たいていはこの中から買う */
  favorites: string[];
  /** 好き以外の商品を試す確率 */
  explore: number;
  /** 買う間隔 (日) とそのぶれ */
  intervalDays: number;
  jitterDays: number;
  quantity: number;
  /** 最後に買ってからの日数 (遠ざかった客を作る) */
  lastPurchaseDaysAgo: number;
  orders: number;
  consent: boolean;
};

const PERSONAS: Persona[] = [
  { name: "Mia Thompson", country: "US", favorites: ["cerrado"], explore: 0, intervalDays: 21, jitterDays: 2, quantity: 2, lastPurchaseDaysAgo: 17, orders: 7, consent: true },
  { name: "Lukas Weber", country: "DE", favorites: ["yirgacheffe", "antigua"], explore: 0.5, intervalDays: 14, jitterDays: 3, quantity: 1, lastPurchaseDaysAgo: 11, orders: 9, consent: true },
  { name: "Olivia Martin", country: "AU", favorites: ["hoshizora"], explore: 0.1, intervalDays: 30, jitterDays: 4, quantity: 1, lastPurchaseDaysAgo: 26, orders: 5, consent: true },
  { name: "Noah Dubois", country: "FR", favorites: ["mandheling", "hoshizora"], explore: 0.2, intervalDays: 18, jitterDays: 3, quantity: 2, lastPurchaseDaysAgo: 8, orders: 6, consent: true },
  { name: "Sofia Rossi", country: "IT", favorites: ["antigua", "cerrado"], explore: 0.3, intervalDays: 25, jitterDays: 5, quantity: 1, lastPurchaseDaysAgo: 95, orders: 4, consent: true },
  { name: "Ethan Clarke", country: "GB", favorites: ["yirgacheffe"], explore: 0.4, intervalDays: 16, jitterDays: 2, quantity: 1, lastPurchaseDaysAgo: 3, orders: 3, consent: true },
  { name: "Hannah Lee", country: "CA", favorites: ["cerrado", "antigua"], explore: 0.1, intervalDays: 20, jitterDays: 3, quantity: 1, lastPurchaseDaysAgo: 12, orders: 5, consent: false },
];

/** 種から決まる乱数 (作り直しても同じ履歴になる) */
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function demoEmail(ownerEmail: string, name: string) {
  const at = ownerEmail.lastIndexOf("@");
  const tag = name.split(" ")[0].toLowerCase();
  return `${ownerEmail.slice(0, at)}+${tag}${ownerEmail.slice(at)}`;
}

/**
 * 店のデータを消して、デモのデータで作り直す。作った客の ID を返す。
 * 審査員向けのデモアカウントの店は、代金をサンドボックスのビジネスアカウント (DEMO_PAYEE_EMAIL) で受け取る
 */
export async function loadDemoShop(env: AppEnv, owner: { id: string; email: string }) {
  const db = getDb(env);
  const now = Date.now();
  const payeeEmail = isDemoUser(owner) ? env.DEMO_PAYEE_EMAIL : owner.email;
  await db.delete(letter).where(eq(letter.userId, owner.id));
  await db.delete(purchase).where(eq(purchase.userId, owner.id));
  await db.delete(customer).where(eq(customer.userId, owner.id));
  await db.delete(product).where(eq(product.userId, owner.id));
  await db
    .insert(shop)
    .values({ userId: owner.id, name: "Hoshizora Coffee", payeeEmail, currency: "USD", shippingMinor: 1200 })
    .onConflictDoUpdate({
      target: shop.userId,
      set: { name: "Hoshizora Coffee", currency: "USD", shippingMinor: 1200, ...(isDemoUser(owner) ? { payeeEmail } : {}) },
    });

  const productIds = new Map<string, string>();
  const productRows = PRODUCTS.map((item) => {
    const id = crypto.randomUUID();
    productIds.set(item.key, id);
    return {
      id,
      userId: owner.id,
      name: item.name,
      description: item.description,
      size: item.size,
      priceMinor: item.priceMinor,
      stock: item.stock,
      arrivedOn: new Date(now - item.arrivedDaysAgo * DAY).toISOString().slice(0, 10),
    };
  });
  await db.insert(product).values(productRows);

  const customerIds: string[] = [];
  const purchases: Array<typeof purchase.$inferInsert> = [];
  const customers = PERSONAS.map((persona, index) => {
    const id = crypto.randomUUID();
    customerIds.push(id);
    const next = random(index + 1);
    // 最後の購入から過去へさかのぼって注文を並べる
    let daysAgo = persona.lastPurchaseDaysAgo;
    for (let order = 0; order < persona.orders; order += 1) {
      // その日に店にあった、好き以外の商品 (定番は履歴より前から、新しい豆は最近入荷した)
      const others = PRODUCTS.filter(
        (item) => !persona.favorites.includes(item.key) && item.arrivedDaysAgo >= daysAgo,
      ).map((item) => item.key);
      const pool = next() < persona.explore ? others : persona.favorites;
      const key = pool[Math.floor(next() * pool.length)];
      const item = PRODUCTS.find((candidate) => candidate.key === key)!;
      purchases.push({
        id: crypto.randomUUID(),
        userId: owner.id,
        customerId: id,
        productId: productIds.get(key)!,
        quantity: persona.quantity,
        unitPriceMinor: item.priceMinor,
        source: "import",
        purchasedAt: new Date(now - daysAgo * DAY),
      });
      daysAgo += persona.intervalDays + Math.round((next() * 2 - 1) * persona.jitterDays);
    }
    return {
      id,
      userId: owner.id,
      name: persona.name,
      email: demoEmail(owner.email, persona.name),
      country: persona.country,
      marketingConsentAt: persona.consent ? new Date(now - (daysAgo + 1) * DAY) : null,
    };
  });
  await db.insert(customer).values(customers);
  // D1 は1つの文に渡せる値が100個までなので、購入は10件ずつまとめて入れる
  const chunks = [];
  for (let start = 0; start < purchases.length; start += 10) {
    chunks.push(db.insert(purchase).values(purchases.slice(start, start + 10)));
  }
  const [first, ...rest] = chunks;
  await db.batch([first, ...rest]);
  return customerIds;
}

/** デモの店を作り直し、客ごとの次のメールを AI に決めさせる。決められなかった客の数を返す */
export async function loadAndPlanDemoShop(env: AppEnv, owner: { id: string; email: string }) {
  const customerIds = await loadDemoShop(env, owner);
  // 同意していない客は planFor が何も決めずに返す
  const results = await Promise.allSettled(customerIds.map((id) => planFor(env, owner.id, id)));
  const failed = results.filter((result) => result.status === "rejected");
  for (const result of failed) console.error("デモの客のメールを決められませんでした:", result.reason);
  return { customers: customerIds.length, failed: failed.length };
}

/** 審査員向けのデモアカウントに、店がまだなければデモの店を用意する */
export async function prepareDemoShop(env: AppEnv, owner: { id: string; email: string }) {
  const [existing] = await getDb(env).select({ userId: shop.userId }).from(shop).where(eq(shop.userId, owner.id)).limit(1);
  if (!existing) await loadAndPlanDemoShop(env, owner);
}
