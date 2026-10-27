import { and, asc, eq } from "drizzle-orm";
import { Hono, type Context, type MiddlewareHandler } from "hono";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { letter, product, shop } from "@/lib/db/schema";
import { translate } from "@/lib/i18n";
import { PlanRejected } from "@/lib/letters/planner";
import {
  LetterError,
  listLetterRows,
  listPurchaseRows,
  loadPlannerContext,
  overrideLetter,
  planFor,
  sendLetter,
} from "@/lib/letters/service";
import { isDemoUser } from "@/lib/auth/demo-account";
import { loadAndPlanDemoShop } from "@/lib/shop/demo";
import type { ApiEnv, SessionUser } from "./types";

/**
 * 店の人の画面の API。データはすべてログインしている人 (= 1つの店) のもの
 */

function requireUser(): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const session = await auth(c.env, new URL(c.req.url).origin).api.getSession({
      headers: c.req.raw.headers,
    });
    if (!session) {
      return c.json({ message: translate("server.common.loginRequired") }, 401);
    }
    c.set("user", { id: session.user.id, name: session.user.name, email: session.user.email });
    await next();
  };
}

function currentUser(c: Context<ApiEnv>): SessionUser {
  return c.get("user");
}

/** 店のデータの誤り (在庫が足りない、日付が過去など) は 400 で理由を返す */
function failure(c: Context<ApiEnv>, error: unknown) {
  if (error instanceof LetterError || error instanceof PlanRejected) {
    return c.json({ message: error.message }, 400);
  }
  throw error;
}

const shopSchema = z.object({
  name: z.string().trim().min(1).max(120),
  payeeEmail: z.email().max(191),
  currency: z.string().regex(/^[A-Z]{3}$/),
  shippingMinor: z.number().int().min(0),
});

const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  origin: z.string().trim().min(1).max(120),
  roast: z.enum(["light", "medium", "dark"]),
  notes: z.string().trim().min(1).max(1000),
  bagGrams: z.number().int().min(1),
  priceMinor: z.number().int().min(1),
  stock: z.number().int().min(0),
  arrivedOn: z.iso.date(),
  active: z.boolean(),
});

const overrideSchema = z.object({
  sendOn: z.iso.date(),
  productId: z.string().min(1).max(191),
  quantity: z.number().int().min(1),
});

/** デモアカウントでも使える書き込み (予定を直す、今すぐ送る (中身を見せるだけ)、決め直す、デモの店を作り直す) */
const DEMO_WRITE_PATHS = [/^\/api\/letters\/[^/]+$/, /^\/api\/letters\/[^/]+\/send$/, /^\/api\/customers\/[^/]+\/plan$/, /^\/api\/demo$/];

const console_ = new Hono<ApiEnv>();
console_.use("*", requireUser());
console_.use("*", async (c, next) => {
  if (c.req.method === "GET" || !isDemoUser(currentUser(c))) return next();
  if (DEMO_WRITE_PATHS.some((pattern) => pattern.test(new URL(c.req.url).pathname))) return next();
  return c.json({ message: translate("server.common.demoReadOnly") }, 403);
});

console_.get("/shop", async (c) => {
  const [row] = await getDb(c.env).select().from(shop).where(eq(shop.userId, currentUser(c).id)).limit(1);
  return c.json({ shop: row ?? null });
});

console_.put("/shop", async (c) => {
  const input = shopSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ message: input.error.issues[0].message }, 400);
  await getDb(c.env)
    .insert(shop)
    .values({ userId: currentUser(c).id, ...input.data })
    .onConflictDoUpdate({ target: shop.userId, set: input.data });
  return c.json({ ok: true });
});

console_.get("/products", async (c) => {
  const rows = await getDb(c.env)
    .select()
    .from(product)
    .where(eq(product.userId, currentUser(c).id))
    .orderBy(asc(product.name));
  return c.json({ items: rows });
});

console_.post("/products", async (c) => {
  const input = productSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ message: input.error.issues[0].message }, 400);
  const row = { id: crypto.randomUUID(), userId: currentUser(c).id, ...input.data };
  await getDb(c.env).insert(product).values(row);
  return c.json(row, 201);
});

console_.put("/products/:id", async (c) => {
  const input = productSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ message: input.error.issues[0].message }, 400);
  await getDb(c.env)
    .update(product)
    .set(input.data)
    .where(and(eq(product.userId, currentUser(c).id), eq(product.id, c.req.param("id"))));
  return c.json({ ok: true });
});

/** 表の行: 客ごとの次のメールの予定と、最後に送ったメールの結果 */
console_.get("/letters", async (c) => c.json({ items: await listLetterRows(c.env, currentUser(c).id) }));

console_.get("/orders", async (c) => c.json({ items: await listPurchaseRows(c.env, currentUser(c).id) }));

/** 店の人が予定 (送る日・商品・量) を直す */
console_.put("/letters/:id", async (c) => {
  const input = overrideSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ message: input.error.issues[0].message }, 400);
  try {
    await overrideLetter(c.env, currentUser(c).id, c.req.param("id"), input.data);
  } catch (error) {
    return failure(c, error);
  }
  return c.json({ ok: true });
});

/** 予定のメールを今すぐ送る (デモで、送る日を待たずに流れを見せる) */
console_.post("/letters/:id/send", async (c) => {
  const [row] = await getDb(c.env)
    .select()
    .from(letter)
    .where(and(eq(letter.userId, currentUser(c).id), eq(letter.id, c.req.param("id")), eq(letter.status, "planned")))
    .limit(1);
  if (!row) return c.json({ message: "Planned email not found" }, 404);
  // デモの客の宛先は実在しないので、デモアカウントでは送らずに、届くメールの中身を返す
  const demo = isDemoUser(currentUser(c));
  try {
    const result = await sendLetter(c.env, row, demo ? "preview" : "email");
    if (demo && result.preview) {
      return c.json({
        ok: true,
        preview: result.preview,
        sandboxBuyer: { email: c.env.DEMO_SANDBOX_BUYER_EMAIL, password: c.env.DEMO_SANDBOX_BUYER_PASSWORD },
      });
    }
  } catch (error) {
    return failure(c, error);
  }
  return c.json({ ok: true });
});

/** 客の購入と、送ったメールの履歴 (AI に渡しているものと同じ) */
console_.get("/customers/:id/history", async (c) => {
  try {
    const context = await loadPlannerContext(c.env, currentUser(c).id, c.req.param("id"));
    return c.json({ purchases: context.purchases, letters: context.letters });
  } catch (error) {
    return failure(c, error);
  }
});

/** 客の次のメールを AI に決め直させる */
console_.post("/customers/:id/plan", async (c) => {
  try {
    await planFor(c.env, currentUser(c).id, c.req.param("id"));
  } catch (error) {
    return failure(c, error);
  }
  return c.json({ ok: true });
});

/** デモの店のデータを作り直し、客ごとの次のメールを AI に決めさせる */
console_.post("/demo", async (c) => c.json(await loadAndPlanDemoShop(c.env, currentUser(c))));

export default console_;
