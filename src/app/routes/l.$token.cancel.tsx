import type { Route } from "./+types/l.$token.cancel";
import { LetterNotice } from "@/components/letters/LetterNotice";

export const meta: Route.MetaFunction = () => [
  { title: "No problem" },
  { name: "robots", content: "noindex" },
];

/** PayPal の画面で取り消して戻ってきたところ。何も払われていない */
export default function PayCancel() {
  return (
    <LetterNotice shopName={null} title="No problem">
      Nothing was charged. If you change your mind, the link in the email still works.
    </LetterNotice>
  );
}
