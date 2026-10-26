import { redirect } from "react-router";
import type { Route } from "./+types/l.$token";
import { LetterNotice } from "@/components/letters/LetterNotice";
import { startCheckout } from "@/lib/letters/service";
import { readLinkToken } from "@/lib/letters/token";
import { appContext } from "@/lib/util/app-context";

export const meta: Route.MetaFunction = () => [
  { title: "Checkout" },
  { name: "robots", content: "noindex" },
];

/** メールの「Pay with PayPal」。開いた時点の価格で注文を作り、PayPal の支払い画面へ送る */
export async function loader({ params, context }: Route.LoaderArgs) {
  const { env } = context.get(appContext);
  const letterId = await readLinkToken(env.LINK_SIGNING_SECRET, "pay", params.token);
  if (!letterId) return { state: "unavailable" as const, shopName: null };
  try {
    const result = await startCheckout(env, letterId);
    if (result.state === "redirect") throw redirect(result.url);
    if (result.state === "sold_out") return { state: result.state, shopName: result.shopName };
    return { state: result.state, shopName: null };
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("支払い画面へ送れませんでした:", letterId, error);
    return { state: "error" as const, shopName: null };
  }
}

const COPY = {
  unavailable: { title: "This link is no longer valid", body: "It may have expired or already been used." },
  paid: { title: "Already paid", body: "This order has been paid. Thank you!" },
  sold_out: { title: "Sold out for now", body: "This coffee ran out before you got here. We will write again soon." },
  error: { title: "Something went wrong", body: "We could not open PayPal. Please try the link again in a minute." },
} as const;

export default function PayLink({ loaderData }: Route.ComponentProps) {
  const copy = COPY[loaderData.state];
  return (
    <LetterNotice shopName={loaderData.shopName} title={copy.title}>
      {copy.body}
    </LetterNotice>
  );
}
