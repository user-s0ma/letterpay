import { Form } from "react-router";
import type { Route } from "./+types/u.$token";
import { LetterNotice } from "@/components/letters/LetterNotice";
import { shopNameOfLetter, unsubscribe } from "@/lib/letters/service";
import { readLinkToken } from "@/lib/letters/token";
import { appContext } from "@/lib/util/app-context";

export const meta: Route.MetaFunction = () => [
  { title: "Unsubscribe" },
  { name: "robots", content: "noindex" },
];

/**
 * メールの「Unsubscribe」。メールの安全確認でリンクが自動で開かれることがあるので、
 * 開いただけでは止めず、ボタンを押したときに止める
 */
export async function loader({ params, context }: Route.LoaderArgs) {
  const { env } = context.get(appContext);
  const letterId = await readLinkToken(env.LINK_SIGNING_SECRET, "unsubscribe", params.token);
  return { shopName: letterId ? await shopNameOfLetter(env, letterId) : null, done: false };
}

export async function action({ params, context }: Route.ActionArgs) {
  const { env } = context.get(appContext);
  const letterId = await readLinkToken(env.LINK_SIGNING_SECRET, "unsubscribe", params.token);
  if (!letterId) return { shopName: null, done: false };
  const shopName = await unsubscribe(env, letterId);
  return { shopName, done: shopName !== null };
}

export default function Unsubscribe({ loaderData, actionData }: Route.ComponentProps) {
  const result = actionData ?? loaderData;
  if (!result.shopName) return <LetterNotice shopName={null} title="This link is no longer valid" />;
  if (result.done) {
    return (
      <LetterNotice shopName={result.shopName} title="You are unsubscribed">
        You will not get any more recommendation emails from {result.shopName}.
      </LetterNotice>
    );
  }
  return (
    <LetterNotice shopName={result.shopName} title="Stop these emails?">
      <p>You will not get any more coffee recommendations from {result.shopName}.</p>
      <Form method="post" className="mt-5">
        <button className="console-button-primary" type="submit">
          Unsubscribe
        </button>
      </Form>
    </LetterNotice>
  );
}
