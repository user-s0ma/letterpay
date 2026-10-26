import type { Route } from "./+types/l.$token.return";
import { LetterNotice } from "@/components/letters/LetterNotice";
import { formatMoney } from "@/lib/money";
import { completeCheckout } from "@/lib/letters/service";
import { readLinkToken } from "@/lib/letters/token";
import { appContext } from "@/lib/util/app-context";

export const meta: Route.MetaFunction = () => [
  { title: "Thank you" },
  { name: "robots", content: "noindex" },
];

/** PayPal で承認して戻ってきたところ。ここで代金を受け取る (PayPal は ?token= に注文 ID を付けて戻す) */
export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { env } = context.get(appContext);
  const letterId = await readLinkToken(env.LINK_SIGNING_SECRET, "pay", params.token);
  const orderId = new URL(request.url).searchParams.get("token");
  if (!letterId || !orderId) return { state: "unavailable" as const, shopName: null, paid: null, pending: false };
  try {
    const result = await completeCheckout(env, letterId, orderId);
    if (result.state === "paid") {
      return {
        state: result.state,
        shopName: result.shopName,
        paid: result.paidMinor === null ? null : formatMoney(result.paidMinor, result.currency),
        pending: result.pending,
      };
    }
    if (result.state === "not_completed") return { state: result.state, shopName: result.shopName, paid: null, pending: false };
    return { state: result.state, shopName: null, paid: null, pending: false };
  } catch (error) {
    console.error("代金を受け取れませんでした:", letterId, orderId, error);
    return { state: "error" as const, shopName: null, paid: null, pending: false };
  }
}

export default function PayReturn({ loaderData }: Route.ComponentProps) {
  const { state, shopName, paid, pending } = loaderData;
  if (state === "paid") {
    return (
      <LetterNotice shopName={shopName} title="Thank you for your order">
        {paid && <p className="num text-base font-semibold text-ink">{paid} paid with PayPal</p>}
        <p className="mt-2">
          {pending
            ? "PayPal is still processing this payment. You will get a receipt from PayPal once it goes through, and we will ship to the address in your PayPal account."
            : "We will roast and ship it to the address in your PayPal account. A receipt is on its way from PayPal."}
        </p>
      </LetterNotice>
    );
  }
  if (state === "not_completed") {
    return (
      <LetterNotice shopName={shopName} title="The payment did not go through">
        Open the link in the email again to retry.
      </LetterNotice>
    );
  }
  if (state === "error") {
    return (
      <LetterNotice shopName={shopName} title="Something went wrong">
        We could not confirm the payment. If PayPal shows it as paid, there is nothing more to do; we will reach out.
      </LetterNotice>
    );
  }
  return <LetterNotice shopName={shopName} title="This link is no longer valid" />;
}
