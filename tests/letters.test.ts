import assert from "node:assert/strict";
import test from "node:test";
import { validatePlan, type Plan, type PlannerContext } from "../src/lib/letters/planner";
import { createLinkToken, readLinkToken } from "../src/lib/letters/token";
import { currencyDigits, formatMoney, toPayPalValue } from "../src/lib/money";

const context: PlannerContext = {
  today: "2026-10-26",
  shop: { name: "Hoshizora Coffee", currency: "USD" },
  customer: { name: "Mia Thompson", country: "US" },
  purchases: [
    { date: "2026-09-10", productId: "p1", productName: "Brazil Cerrado", quantity: 2, bagGrams: 200 },
    { date: "2026-10-01", productId: "p1", productName: "Brazil Cerrado", quantity: 2, bagGrams: 200 },
  ],
  letters: [],
  products: [
    { id: "p1", name: "Brazil Cerrado", origin: "Brazil", roast: "medium", notes: "Chocolate", bagGrams: 200, priceMinor: 1600, stock: 10, arrivedOn: "2026-03-01" },
    { id: "p2", name: "Hawaii Kona", origin: "Hawaii", roast: "medium", notes: "Macadamia", bagGrams: 200, priceMinor: 3800, stock: 1, arrivedOn: "2026-10-21" },
  ],
};

const plan = (overrides: Partial<Plan>): Plan => ({
  action: "send",
  sendOn: "2026-11-02",
  timingReason: "She buys every three weeks.",
  productId: "p1",
  quantity: 2,
  reason: "Your usual.",
  ...overrides,
});

test("確かめに通る答え", () => {
  assert.equal(validatePlan(plan({}), context), null);
  assert.equal(validatePlan(plan({ action: "stop", sendOn: null, productId: null, quantity: null, reason: null }), context), null);
});

test("送る日は今日より後", () => {
  assert.match(validatePlan(plan({ sendOn: "2026-10-26" }), context)!, /after today/);
  assert.match(validatePlan(plan({ sendOn: "next week" }), context)!, /YYYY-MM-DD/);
});

test("一覧にない商品・いつもと違う量・在庫の足りない商品は通さない", () => {
  assert.match(validatePlan(plan({ productId: "p9" }), context)!, /listed products/);
  assert.match(validatePlan(plan({ quantity: 3 }), context)!, /usual quantity \(2\)/);
  assert.match(validatePlan(plan({ productId: "p2" }), context)!, /only 1 bags/);
});

test("署名つきリンクは用途とメールの ID が合うときだけ読める", async () => {
  const secret = "x".repeat(40);
  const token = await createLinkToken(secret, "pay", "letter-1");
  assert.equal(await readLinkToken(secret, "pay", token), "letter-1");
  assert.equal(await readLinkToken(secret, "unsubscribe", token), null);
  assert.equal(await readLinkToken(secret, "pay", token.replace("letter-1", "letter-2")), null);
  assert.equal(await readLinkToken("y".repeat(40), "pay", token), null);
});

test("金額は通貨の最小単位の整数で持つ", () => {
  assert.equal(currencyDigits("USD"), 2);
  assert.equal(currencyDigits("JPY"), 0);
  assert.equal(toPayPalValue(1900, "USD"), "19.00");
  assert.equal(toPayPalValue(1900, "JPY"), "1900");
  assert.equal(formatMoney(4400, "USD"), "$44.00");
});
