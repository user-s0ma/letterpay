import { clientLocale, translate } from "@/lib/i18n";
import type { PlannerContext } from "@/lib/letters/planner";
import type { listLetterRows } from "@/lib/letters/service";

/*
 * 画面から呼ぶ API。店の人のもの (店・商品・客・メール) は /api の下にある。
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly data?: unknown,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = (await response.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!response.ok) {
    throw new ApiError(data?.message || translate(clientLocale(), "common.apiError"), response.status, data);
  }
  return data as T;
}

const send = (method: "POST" | "PUT", body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

// ---------------------------------------------------------------- shop

export type ShopInput = {
  name: string;
  payeeEmail: string;
  currency: string;
  shippingMinor: number;
};

export type ShopRecord = ShopInput & { userId: string };

export function getShop() {
  return apiRequest<{ shop: ShopRecord | null }>("/api/shop");
}

export function saveShop(input: ShopInput) {
  return apiRequest<{ ok: true }>("/api/shop", send("PUT", input));
}

export function loadDemo() {
  return apiRequest<{ customers: number; failed: number }>("/api/demo", send("POST"));
}

// ---------------------------------------------------------------- products

export type Roast = "light" | "medium" | "dark";

export type ProductInput = {
  name: string;
  origin: string;
  roast: Roast;
  notes: string;
  bagGrams: number;
  priceMinor: number;
  stock: number;
  arrivedOn: string;
  active: boolean;
};

export type ProductRecord = ProductInput & { id: string };

export function listProducts() {
  return apiRequest<{ items: ProductRecord[] }>("/api/products");
}

export function createProduct(input: ProductInput) {
  return apiRequest<ProductRecord>("/api/products", send("POST", input));
}

export function updateProduct(id: string, input: ProductInput) {
  return apiRequest<{ ok: true }>(`/api/products/${encodeURIComponent(id)}`, send("PUT", input));
}

// ---------------------------------------------------------------- letters

export type LetterRow = Awaited<ReturnType<typeof listLetterRows>>[number];

export function listLetters() {
  return apiRequest<{ items: LetterRow[] }>("/api/letters");
}

export function overrideLetter(id: string, input: { sendOn: string; productId: string; quantity: number }) {
  return apiRequest<{ ok: true }>(`/api/letters/${encodeURIComponent(id)}`, send("PUT", input));
}

/** デモアカウントでは送らずに、届くメールの中身と、払う側のサンドボックスのアカウントが返る */
export type LetterPreview = {
  preview: { to: string; subject: string; html: string; payUrl: string };
  sandboxBuyer: { email: string; password: string };
};

export function sendLetterNow(id: string) {
  return apiRequest<{ ok: true } & Partial<LetterPreview>>(`/api/letters/${encodeURIComponent(id)}/send`, send("POST"));
}

export function replanCustomer(customerId: string) {
  return apiRequest<{ ok: true }>(`/api/customers/${encodeURIComponent(customerId)}/plan`, send("POST"));
}

export type CustomerHistory = Pick<PlannerContext, "purchases" | "letters">;

export function getCustomerHistory(customerId: string) {
  return apiRequest<CustomerHistory>(`/api/customers/${encodeURIComponent(customerId)}/history`);
}
