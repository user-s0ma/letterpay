import { bytesToBase64Url, timingSafeEqual } from "@/lib/util/encoding";

/**
 * メールのリンクに入れる署名つきの値。中身はメールの ID と用途だけで、
 * 誰に・どの商品を・いくつかはメールの行 (Letter) から読むので、書き換えても別の注文にはならない
 */
export type LinkPurpose = "pay" | "unsubscribe";

async function sign(secret: string, payload: string) {
  if (secret.length < 32) throw new Error("LINK_SIGNING_SECRET は32文字以上にしてください");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(mac));
}

export async function createLinkToken(secret: string, purpose: LinkPurpose, letterId: string) {
  return `${letterId}.${await sign(secret, `${purpose}:${letterId}`)}`;
}

/** 署名が合えばメールの ID を返す */
export async function readLinkToken(secret: string, purpose: LinkPurpose, token: string) {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const letterId = token.slice(0, dot);
  const expected = await sign(secret, `${purpose}:${letterId}`);
  return timingSafeEqual(token.slice(dot + 1), expected) ? letterId : null;
}
