import { formatMoney } from "@/lib/money";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type LetterEmailInput = {
  shopName: string;
  customerName: string;
  reason: string;
  product: { name: string; origin: string; roast: string; notes: string; bagGrams: number };
  quantity: number;
  unitMinor: number;
  shippingMinor: number;
  currency: string;
  payUrl: string;
  unsubscribeUrl: string;
};

/** 客に送るおすすめのメール (英語)。ボタンを押すと、そのまま PayPal の支払い画面になる */
export function renderLetterEmail(input: LetterEmailInput) {
  const money = (minor: number) => formatMoney(minor, input.currency);
  const total = input.unitMinor * input.quantity + input.shippingMinor;
  const firstName = input.customerName.split(/\s+/)[0];
  const subject = `${firstName}, a coffee picked for you: ${input.product.name}`;
  const line = `${input.quantity} × ${input.product.bagGrams}g bag · ${money(input.unitMinor)} each`;
  const text = [
    `Hi ${firstName},`,
    "",
    input.reason,
    "",
    `${input.product.name} (${input.product.origin}, ${input.product.roast} roast)`,
    input.product.notes,
    line,
    `Shipping ${money(input.shippingMinor)} · Total ${money(total)}`,
    "",
    `Pay with PayPal: ${input.payUrl}`,
    "",
    `— ${input.shopName}`,
    "",
    `You get these emails because you agreed to hear from ${input.shopName}. Unsubscribe: ${input.unsubscribeUrl}`,
  ].join("\n");
  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(subject)}</title></head>
  <body style="margin:0;background:#f6f3ee;color:#2b2420;font-family:Georgia,'Times New Roman',serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="background:#fffdf9;border:1px solid #e8dfd3;border-radius:12px;padding:28px;">
        <p style="margin:0 0 16px;font-size:17px;">Hi ${escapeHtml(firstName)},</p>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">${escapeHtml(input.reason)}</p>
        <div style="margin-bottom:24px;font-family:Arial,sans-serif;">
          <p style="margin:0 0 4px;font-size:18px;font-weight:700;">${escapeHtml(input.product.name)}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#7a6a5c;">${escapeHtml(input.product.origin)} · ${escapeHtml(input.product.roast)} roast</p>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#4a3f37;">${escapeHtml(input.product.notes)}</p>
          <p style="margin:0;font-size:14px;">${escapeHtml(line)}</p>
          <p style="margin:4px 0 0;font-size:14px;">Shipping ${escapeHtml(money(input.shippingMinor))} · <strong>Total ${escapeHtml(money(total))}</strong></p>
        </div>
        <a href="${escapeHtml(input.payUrl)}" style="display:inline-block;background:#ffc439;color:#111;border-radius:999px;padding:13px 28px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;">Pay with PayPal</a>
        <p style="margin:16px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#7a6a5c;">Ships to the address in your PayPal account. Nothing is charged until you confirm in PayPal.</p>
        <p style="margin:24px 0 0;font-size:16px;">— ${escapeHtml(input.shopName)}</p>
      </div>
      <p style="margin:20px 0 0;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:#8a7d70;">
        You get these emails because you agreed to hear from ${escapeHtml(input.shopName)}.
        <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#8a7d70;">Unsubscribe</a>
      </p>
    </div>
  </body>
</html>`;
  return { subject, text, html };
}
