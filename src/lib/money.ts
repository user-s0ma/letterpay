/** 金額は通貨の最小単位の整数で持つ (USD ならセント、JPY なら円) */

/** 通貨の小数の桁 (JPY などは 0) */
export function currencyDigits(currency: string) {
  const { maximumFractionDigits } = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions();
  if (maximumFractionDigits === undefined) throw new Error(`通貨の桁が分かりません: ${currency}`);
  return maximumFractionDigits;
}

/** PayPal に渡す金額の文字列 (例: 1900 → "19.00") */
export function toPayPalValue(minor: number, currency: string) {
  const digits = currencyDigits(currency);
  return (minor / 10 ** digits).toFixed(digits);
}

export function formatMoney(minor: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(minor / 10 ** currencyDigits(currency));
}
