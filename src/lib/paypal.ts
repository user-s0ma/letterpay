/**
 * PayPal の Orders v2 (REST)。店のサイトを通さず、メールのリンクから直接 PayPal の支払い画面へ送る。
 * https://developer.paypal.com/docs/api/orders/v2/
 */
import { currencyDigits, toPayPalValue } from "@/lib/money";

type PayPalEnv = Pick<AppEnv, "PAYPAL_API_BASE" | "PAYPAL_CLIENT_ID" | "PAYPAL_CLIENT_SECRET">;

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly debugId: string | null,
    /** PayPal のエラーの種類 (例: ORDER_ALREADY_CAPTURED) */
    readonly issue: string | null = null,
  ) {
    super(message);
  }
}

async function accessToken(env: PayPalEnv) {
  const res = await fetch(`${env.PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new PayPalError(`Could not get a PayPal access token (${res.status})`, res.status, res.headers.get("paypal-debug-id"));
  }
  return ((await res.json()) as { access_token: string }).access_token;
}

async function call<T>(
  env: PayPalEnv,
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; requestId?: string },
): Promise<T> {
  const token = await accessToken(env);
  const res = await fetch(`${env.PAYPAL_API_BASE}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      // 同じ ID で送り直しても、PayPal 側で二重に作られない
      ...(init.requestId ? { "PayPal-Request-Id": init.requestId } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json().catch(() => null)) as
    | (T & { message?: string; details?: Array<{ issue?: string }> })
    | null;
  if (!res.ok || !data) {
    throw new PayPalError(
      `PayPal request failed (${res.status} ${data?.message ?? ""})`.trim(),
      res.status,
      res.headers.get("paypal-debug-id"),
      data?.details?.[0]?.issue ?? null,
    );
  }
  return data;
}

type Link = { href: string; rel: string };

export type OrderInput = {
  /** 何の注文か (メールの ID)。PayPal の注文の custom_id に入れる */
  referenceId: string;
  payeeEmail: string;
  brandName: string;
  currency: string;
  item: { name: string; description: string; sku: string; quantity: number; unitMinor: number };
  shippingMinor: number;
  returnUrl: string;
  cancelUrl: string;
};

/** 注文を作り、客を送る支払い画面の URL を返す */
export async function createOrder(env: PayPalEnv, input: OrderInput, requestId: string) {
  const value = (minor: number) => ({ currency_code: input.currency, value: toPayPalValue(minor, input.currency) });
  const itemTotal = input.item.unitMinor * input.item.quantity;
  const order = await call<{ id: string; links: Link[] }>(env, "/v2/checkout/orders", {
    method: "POST",
    requestId,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: input.referenceId,
          payee: { email_address: input.payeeEmail },
          amount: {
            ...value(itemTotal + input.shippingMinor),
            breakdown: { item_total: value(itemTotal), shipping: value(input.shippingMinor) },
          },
          items: [
            {
              name: input.item.name,
              description: input.item.description,
              sku: input.item.sku,
              quantity: String(input.item.quantity),
              unit_amount: value(input.item.unitMinor),
              category: "PHYSICAL_GOODS",
            },
          ],
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: input.brandName,
            // 送り先は客が PayPal に登録した住所を使う (店に入力の画面を作らない)
            shipping_preference: "GET_FROM_FILE",
            user_action: "PAY_NOW",
            return_url: input.returnUrl,
            cancel_url: input.cancelUrl,
          },
        },
      },
    },
  });
  const approve = order.links.find((link) => link.rel === "payer-action");
  if (!approve) throw new PayPalError("PayPal returned no checkout URL", 502, null);
  return { orderId: order.id, approveUrl: approve.href };
}

/**
 * 注文の代金の受け取り (capture)。status は COMPLETED のほか、PENDING (受け取り待ち。
 * 例: 受取人のアカウントが無い UNILATERAL、審査中) もある。PENDING でも客の支払いは済んでいる
 */
export type CaptureResult = {
  id: string;
  status: string;
  /** PENDING のときの理由 (UNILATERAL など) */
  pendingReason: string | null;
  amountMinor: number;
};

type CaptureBody = {
  id: string;
  status: string;
  status_details?: { reason?: string };
  amount: { value: string; currency_code: string };
};

type OrderBody = {
  status: string;
  links?: Link[];
  purchase_units?: Array<{ custom_id?: string; payments?: { captures?: CaptureBody[] } }>;
};

/** 注文の最初の capture。まだ代金を受け取っていなければ null */
function firstCapture(order: OrderBody): CaptureResult | null {
  const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
  if (!capture) return null;
  return {
    id: capture.id,
    status: capture.status,
    pendingReason: capture.status_details?.reason ?? null,
    amountMinor: Math.round(Number(capture.amount.value) * 10 ** currencyDigits(capture.amount.currency_code)),
  };
}

/** 注文の今の状態と、注文を作ったときに付けたメールの ID、まだ払っていなければ支払い画面の URL */
export async function getOrder(env: PayPalEnv, orderId: string) {
  const order = await call<OrderBody>(env, `/v2/checkout/orders/${encodeURIComponent(orderId)}`, { method: "GET" });
  return {
    status: order.status,
    customId: order.purchase_units?.[0]?.custom_id ?? null,
    approveUrl: order.links?.find((link) => link.rel === "payer-action")?.href ?? null,
  };
}

/**
 * 客が承認した注文の代金を受け取る。同じ注文を二度確定しないよう、注文 ID を冪等の鍵にする。
 * 結果は注文を読み直して確かめる (同じ鍵で送り直したとき、前の応答の形がそろっているとは限らないため)
 */
export async function captureOrder(env: PayPalEnv, orderId: string) {
  const path = `/v2/checkout/orders/${encodeURIComponent(orderId)}`;
  try {
    await call<OrderBody>(env, `${path}/capture`, { method: "POST", body: {}, requestId: `capture-${orderId}` });
  } catch (error) {
    // 前に受け取り済み (戻りの画面を開き直したときなど) なら、注文を読んで結果を返す
    if (!(error instanceof PayPalError && error.issue === "ORDER_ALREADY_CAPTURED")) throw error;
  }
  const order = await call<OrderBody>(env, path, { method: "GET" });
  return { capture: firstCapture(order), customId: order.purchase_units?.[0]?.custom_id ?? null };
}
