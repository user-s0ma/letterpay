import type { Route } from "./+types/terms";
import {
  LegalPage,
  LegalSections,
  TRANSLATION_NOTICE,
  type LegalSection,
} from "@/components/landing/LegalPage";
import { localeFromMatches, useLocale } from "@/lib/i18n";

// 注意: 以下の規約本文はたたき台です。公開前に必ず弁護士等の専門家による確認を受けること。

export function meta({ matches }: Route.MetaArgs): Route.MetaDescriptors {
  if (localeFromMatches(matches) === "en") {
    return [
      { title: "Terms of Service | Letterpay" },
      { name: "description", content: "The terms that govern use of Letterpay, provided by Soma Sekiguchi." },
    ];
  }
  return [
    { title: "利用規約 | Letterpay" },
    { name: "description", content: "関口壮真が提供する「Letterpay」の利用条件を定める利用規約です。" },
  ];
}

const SECTIONS_JA: LegalSection[] = [
  {
    heading: "概要",
    paragraphs: [
      "この利用規約（以下「本規約」）は、関口壮真（以下「運営者」）が提供する「Letterpay」（以下「本サービス」）の利用条件を定めるものです。本サービスは、店が客の購入履歴をもとに、AI が選んだ商品とその理由をメールで客にすすめ、メールのリンクから PayPal で代金を受け取るためのサービスです。本サービスを利用することで、ユーザーは本規約に同意したことになります。",
    ],
  },
  {
    heading: "1. 定義",
    paragraphs: [
      "「店」とは、本サービスにアカウントを作成し、本サービスを使って商品を販売するユーザーをいいます。",
      "「客」とは、店が本サービスに登録し、本サービスからメールを受け取る人をいいます。",
    ],
  },
  {
    heading: "2. アカウント",
    paragraphs: [
      "アカウントは、メールアドレスとパスワードの登録により作成されます。1つのアカウントが1つの店を持ちます。アカウントは個人に帰属し、第三者への譲渡・貸与・共有はできません。",
    ],
  },
  {
    heading: "3. 店の責任",
    paragraphs: [
      "店は、客の氏名・メールアドレス・購入履歴を適法に取得し、本サービスに登録する権限を持つものとします。",
      "店は、広告・宣伝のメールの受信に同意した客についてのみ、その同意の日時を登録するものとします。本サービスは、同意の登録がない客や、配信を止めた客にはメールを送りません。店は、特定電子メールの送信の適正化等に関する法律その他、客の所在地の法令を守るものとします。",
      "商品の内容・価格・在庫・送料の正確さ、および販売・発送・返品・問い合わせへの対応は、店が責任を負います。",
    ],
  },
  {
    heading: "4. AI による提案",
    paragraphs: [
      "本サービスでは、AI（Anthropic の Claude）が、客ごとに次にメールを送る日、すすめる商品と数量、その理由の文章を決めます。本サービスは、その結果を店の商品の一覧と照らして確かめてから保存しますが、AI が書いた文章の正確さや、提案による売上を保証しません。店は、送る前に日・商品・数量を確かめ、直すことができます。",
    ],
  },
  {
    heading: "5. 支払い",
    paragraphs: [
      "客の支払いは PayPal を通じて行われ、代金は店が登録した PayPal アカウントへ直接支払われます。運営者は代金を受け取らず、預かりもしません。支払い、返金、異議申し立てには PayPal の規約が適用されます。",
    ],
  },
  {
    heading: "6. 料金",
    paragraphs: ["現在、本サービスは無料で提供しています。料金を設ける場合は、事前に本サービス上で告知します。"],
  },
  {
    heading: "7. 禁止事項",
    paragraphs: [
      "法令または公序良俗に反する行為、同意のない相手へのメールの送信、他人になりすます行為、本サービスの運営を妨げる行為、本サービスを通じて他のユーザーや客の情報を得ようとする行為を禁止します。",
    ],
  },
  {
    heading: "8. 外部サービス",
    paragraphs: [
      "本サービスは、ホスティングとメール配信（Cloudflare）、データベース（TiDB Cloud）、AI（Anthropic）、決済（PayPal）その他の外部サービスを利用しています。外部サービスの障害や仕様変更により、本サービスの全部または一部を提供できない場合があります。",
    ],
  },
  {
    heading: "9. 停止・変更・終了",
    paragraphs: [
      "運営者は、店が本規約に違反するおそれがあると判断した場合、事前の通知なく、メールの送信の停止、アカウントの停止その他必要な措置を講じることができます。運営者は、本サービスの内容を変更し、または提供を終了することがあります。",
    ],
  },
  {
    heading: "10. 免責",
    paragraphs: [
      "運営者は、本サービスに事実上または法律上の瑕疵がないことを保証しません。運営者が損害賠償責任を負う場合、その総額は、法令に別段の定めがある場合を除き、10,000円を上限とします。",
    ],
  },
  {
    heading: "11. 規約の変更、準拠法と管轄",
    paragraphs: [
      "運営者は、本規約を改定できます。改定後に本サービスの利用を続けた場合、改定後の規約に同意したものとみなします。",
      "本規約は日本法に準拠し、本サービスに関する紛争は東京地方裁判所を第一審の専属的合意管轄裁判所とします。",
    ],
  },
];

const SECTIONS_EN: LegalSection[] = [
  {
    heading: "Overview",
    paragraphs: [
      "These Terms of Service (\"Terms\") set the conditions for using Letterpay (the \"Service\"), provided by Soma Sekiguchi (the \"Operator\"). The Service lets a shop email its customers a product chosen by AI from their purchase history, with the reason, and receive payment through PayPal from a link in the email. By using the Service, you agree to these Terms.",
    ],
  },
  {
    heading: "1. Definitions",
    paragraphs: [
      "\"Shop\" means a user who creates an account and sells products using the Service.",
      "\"Customer\" means a person a Shop registers in the Service and who receives emails from the Service.",
    ],
  },
  {
    heading: "2. Accounts",
    paragraphs: [
      "Accounts are created with an email address and password. One account has one Shop. An account belongs to an individual and may not be transferred, lent or shared.",
    ],
  },
  {
    heading: "3. Shop responsibilities",
    paragraphs: [
      "The Shop must have lawfully obtained its Customers' names, email addresses and purchase history, and have the right to register them in the Service.",
      "The Shop records a consent date only for Customers who agreed to receive marketing emails. The Service never emails Customers without a recorded consent or who unsubscribed. The Shop must comply with anti-spam and other laws that apply to it and to its Customers.",
      "The Shop is responsible for the accuracy of products, prices, stock and shipping, and for sales, shipping, returns and customer enquiries.",
    ],
  },
  {
    heading: "4. AI recommendations",
    paragraphs: [
      "In the Service, AI (Anthropic's Claude) decides for each Customer the day of the next email, the product and quantity to suggest, and the text explaining why. The Service checks the result against the Shop's product list before saving it, but does not guarantee the accuracy of AI-written text or any sales from it. The Shop can review and change the day, product and quantity before an email is sent.",
    ],
  },
  {
    heading: "5. Payments",
    paragraphs: [
      "Customers pay through PayPal, directly to the PayPal account the Shop registered. The Operator does not receive or hold payments. PayPal's terms apply to payments, refunds and disputes.",
    ],
  },
  {
    heading: "6. Fees",
    paragraphs: ["The Service is currently free. Any fees will be announced in the Service in advance."],
  },
  {
    heading: "7. Prohibited conduct",
    paragraphs: [
      "Illegal acts, emailing people without consent, impersonation, interfering with the Service, and attempting to obtain other users' or Customers' information through the Service are prohibited.",
    ],
  },
  {
    heading: "8. Third-party services",
    paragraphs: [
      "The Service relies on third-party services including hosting and email delivery (Cloudflare), database (TiDB Cloud), AI (Anthropic) and payments (PayPal). Outages or changes to them may prevent all or part of the Service from working.",
    ],
  },
  {
    heading: "9. Suspension, changes and termination",
    paragraphs: [
      "If the Operator judges that a Shop may be in breach of these Terms, the Operator may stop sending emails, suspend the account or take other necessary measures without notice. The Operator may change or end the Service.",
    ],
  },
  {
    heading: "10. Disclaimer",
    paragraphs: [
      "The Operator does not warrant that the Service is free of defects. If the Operator is liable for damages, its total liability is limited to 10,000 yen, except where the law provides otherwise.",
    ],
  },
  {
    heading: "11. Changes, governing law and jurisdiction",
    paragraphs: [
      "The Operator may revise these Terms. Continued use after a revision means you accept the revised Terms.",
      "These Terms are governed by the laws of Japan, and the Tokyo District Court has exclusive jurisdiction in the first instance over disputes about the Service.",
    ],
  },
];

export default function Terms() {
  const locale = useLocale();
  if (locale === "en") {
    return (
      <LegalPage title="Terms of Service" notice={TRANSLATION_NOTICE}>
        <LegalSections sections={SECTIONS_EN} effectiveDate="Effective: October 26, 2026" />
      </LegalPage>
    );
  }
  return (
    <LegalPage title="利用規約">
      <LegalSections sections={SECTIONS_JA} effectiveDate="発効日: 2026年10月26日" />
    </LegalPage>
  );
}
