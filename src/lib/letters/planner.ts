import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

/**
 * Claude が客ごとに「次にいつ、何を、いくつ、なぜすすめるか」を決める。
 * 決め打ちの決まり (○回買ったら新しい豆、など) は置かない。コードは答えを確かめるだけ (validatePlan)
 */

export type PlannerProduct = {
  id: string;
  name: string;
  origin: string;
  roast: string;
  notes: string;
  bagGrams: number;
  priceMinor: number;
  stock: number;
  arrivedOn: string;
};

export type PlannerContext = {
  today: string;
  shop: { name: string; currency: string };
  customer: { name: string; country: string };
  purchases: Array<{ date: string; productId: string; productName: string; quantity: number; bagGrams: number }>;
  letters: Array<{
    sentOn: string;
    productName: string;
    quantity: number;
    clicked: boolean;
    paidOn: string | null;
  }>;
  products: PlannerProduct[];
};

const planSchema = z.object({
  action: z.enum(["send", "stop"]),
  sendOn: z.string().nullable().describe("YYYY-MM-DD. The day to send the next email. Null when action is stop."),
  timingReason: z.string().describe("One or two sentences for the shop owner: why this day (or why to stop)."),
  productId: z.string().nullable().describe("Id of the product to recommend. Null when action is stop."),
  quantity: z.number().int().nullable().describe("Number of bags. Null when action is stop."),
  reason: z
    .string()
    .nullable()
    .describe("Two or three sentences to the customer explaining why this coffee, based on their history. Null when action is stop."),
});

export type Plan = z.infer<typeof planSchema>;

const SYSTEM = `You plan follow-up emails for a small coffee roaster. Each email recommends one coffee and links straight to a PayPal checkout.

For one customer you get their purchase history, the emails already sent and what happened to them, and the current product list. Decide:
- when the next email should arrive: around when they are likely to run out, judging from how much they buy and how often. If they ignored recent emails, wait longer or decide to stop.
- which coffee: their usual one, or a new one that fits what they have liked. Only recommend products that are in stock.
- how many bags: the same number they usually buy.
- the reason, written to the customer in a warm, plain voice. Refer to their actual history. No invented facts about the coffee beyond the product notes. No discount offers.

Never schedule an email on or before today.`;

export class PlanRejected extends Error {}

function usualQuantity(context: PlannerContext) {
  const last = context.purchases.at(-1);
  if (!last) throw new PlanRejected("The customer has no purchases");
  return last.quantity;
}

/** AI の答えを、店のデータに照らして確かめる。だめなら理由を返す */
export function validatePlan(plan: Plan, context: PlannerContext): string | null {
  if (plan.action === "stop") return null;
  if (!plan.sendOn || !/^\d{4}-\d{2}-\d{2}$/.test(plan.sendOn)) return "sendOn must be a date (YYYY-MM-DD)";
  if (plan.sendOn <= context.today) return `sendOn must be after today (${context.today})`;
  const product = context.products.find((candidate) => candidate.id === plan.productId);
  if (!product) return "productId must be one of the listed products";
  if (plan.quantity !== usualQuantity(context)) {
    return `quantity must be the customer's usual quantity (${usualQuantity(context)})`;
  }
  if (product.stock < plan.quantity) return `${product.name} has only ${product.stock} bags in stock`;
  if (!plan.reason?.trim()) return "reason is required";
  return null;
}

const MAX_ATTEMPTS = 2;

/** 答えが確かめに通らなければ、通らなかった理由を添えてもう一度だけ聞く */
export async function planNextLetter(
  env: Pick<AppEnv, "ANTHROPIC_API_KEY" | "ANTHROPIC_MODEL">,
  context: PlannerContext,
): Promise<Plan> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const data = JSON.stringify(context, null, 2);
  let rejection: string | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const content = rejection
      ? `${data}\n\nYour previous answer was rejected: ${rejection}. Answer again.`
      : data;
    const response = await client.beta.messages.parse({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { effort: "medium", format: betaZodOutputFormat(planSchema) },
      // 安全の判定で断られたときは、API が別のモデルで同じ依頼をやり直す
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (response.stop_reason === "refusal") throw new PlanRejected("Claude declined to plan this email");
    const plan = response.parsed_output;
    if (!plan) throw new PlanRejected("Claude returned no plan");
    rejection = validatePlan(plan, context);
    if (!rejection) return plan;
  }
  throw new PlanRejected(rejection ?? "The plan was rejected");
}

const reasonSchema = z.object({
  reason: z.string().describe("Two or three sentences to the customer explaining why this coffee, based on their history."),
});

/** 店の人が商品を差し替えたとき、その商品に合わせて理由を書き直す */
export async function writeReason(
  env: Pick<AppEnv, "ANTHROPIC_API_KEY" | "ANTHROPIC_MODEL">,
  context: PlannerContext,
  choice: { productId: string; quantity: number },
): Promise<string> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const product = context.products.find((candidate) => candidate.id === choice.productId);
  if (!product) throw new PlanRejected("Unknown product");
  const response = await client.beta.messages.parse({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `${JSON.stringify(context, null, 2)}\n\nThe shop owner chose to recommend ${product.name} (id ${product.id}), ${choice.quantity} bag(s). Write only the reason for this choice.`,
      },
    ],
    output_config: { effort: "medium", format: betaZodOutputFormat(reasonSchema) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  if (response.stop_reason === "refusal") throw new PlanRejected("Claude declined to write the reason");
  const reason = response.parsed_output?.reason.trim();
  if (!reason) throw new PlanRejected("Claude returned no reason");
  return reason;
}
