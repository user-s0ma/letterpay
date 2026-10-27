import type { Route } from "./+types/privacy";
import {
  LegalPage,
  LegalSections,
  TRANSLATION_NOTICE,
  type LegalSection,
} from "@/components/landing/LegalPage";
import { localeFromMatches, useLocale } from "@/lib/i18n";

// 注意: 以下の本文はたたき台です。公開前に必ず弁護士等の専門家による確認を受けること。

export function meta({ matches }: Route.MetaArgs): Route.MetaDescriptors {
  if (localeFromMatches(matches) === "en") {
    return [
      { title: "Privacy Policy | Letterpay" },
      { name: "description", content: "How Letterpay handles personal information." },
    ];
  }
  return [
    { title: "プライバシーポリシー | Letterpay" },
    { name: "description", content: "Letterpay での個人情報の取り扱いについて。" },
  ];
}

const SECTIONS_JA: LegalSection[] = [
  {
    heading: "概要",
    paragraphs: [
      "関口壮真（以下「運営者」）は、「Letterpay」（以下「本サービス」）で扱う個人情報を、このプライバシーポリシーに沿って取り扱います。本サービスでは、店のアカウントの情報と、店が登録した客の情報を扱います。客の情報については、運営者は店から委託を受けて取り扱います。",
    ],
  },
  {
    heading: "1. 扱う情報",
    items: [
      { label: "店のアカウントの情報:", text: "氏名、メールアドレス、パスワードのハッシュ値。" },
      { label: "店の情報:", text: "店の名前、代金を受け取る PayPal アカウントのメールアドレス、通貨、送料、商品の情報。" },
      { label: "客の情報:", text: "店が登録した氏名、メールアドレス、国、広告メールへの同意の日時、購入の履歴。" },
      { label: "メールと支払いの記録:", text: "送ったメールの内容（すすめた商品と理由）、送った日時、リンクを開いた日時、PayPal の注文と支払いの ID、支払われた額。送り先の住所やカード情報は PayPal が扱い、本サービスは受け取りません。" },
    ],
  },
  {
    heading: "2. 利用目的",
    paragraphs: [
      "本サービスの提供（AI によるメールの計画、メールの送信、PayPal での支払いの受け付け）、不正の防止、問い合わせへの対応のために利用します。",
    ],
  },
  {
    heading: "3. AI への提供",
    paragraphs: [
      "次のメールを決めるため、客の名前・国・購入の履歴・送ったメールの結果と、店の商品の一覧を、Anthropic の API（Claude）に送ります。メールアドレスは送りません。",
    ],
  },
  {
    heading: "4. 第三者への提供・業務委託",
    paragraphs: [
      "法令に基づく場合を除き、本人の同意なく第三者に提供しません。ただし、本サービスの提供に必要な範囲で、次の事業者に取り扱いを委託します：Cloudflare（ホスティング、メール配信）、PingCAP（TiDB Cloud、データベース）、Anthropic（AI）、PayPal（決済）。",
    ],
  },
  {
    heading: "5. 配信の停止",
    paragraphs: ["客は、どのメールにもある配信停止のリンクから、いつでもメールを止められます。止めたあとは、その店からのメールは送られません。"],
  },
  {
    heading: "6. 保存期間",
    paragraphs: ["アカウントを削除しても、店と客の情報は残ります。"],
  },
  {
    heading: "7. 安全管理",
    paragraphs: ["通信の暗号化、パスワードのハッシュ化、アカウントごとのアクセス制御、メールのリンクへの署名など、情報を守るための措置を講じます。"],
  },
  {
    heading: "8. 開示・訂正・削除",
    paragraphs: ["店は、コンソールで店と客の情報を確かめ、直せます。アカウントはコンソールから削除できます。客からの請求は、その客にメールを送った店を通じて受け付けます。"],
  },
  {
    heading: "9. 変更",
    paragraphs: ["運営者は、このプライバシーポリシーを改定することがあります。改定後の内容は本サービス上に掲載した時点で効力を持ちます。"],
  },
];

const SECTIONS_EN: LegalSection[] = [
  {
    heading: "Overview",
    paragraphs: [
      "Soma Sekiguchi (the \"Operator\") handles personal information in Letterpay (the \"Service\") as described in this policy. The Service handles information about shop accounts and about customers that shops register. The Operator handles customer information on behalf of the shop.",
    ],
  },
  {
    heading: "1. Information we handle",
    items: [
      { label: "Shop account information:", text: "Name, email address and a hash of the password." },
      { label: "Shop information:", text: "Shop name, the email of the PayPal account that receives payments, currency, shipping fee and product information." },
      { label: "Customer information:", text: "Name, email address, country, the date of consent to marketing emails, and purchase history, as registered by the shop." },
      { label: "Email and payment records:", text: "The content of emails sent (the suggested product and reason), when they were sent and when the link was opened, PayPal order and payment IDs, and the amount paid. Shipping addresses and card details are handled by PayPal; the Service does not receive them." },
    ],
  },
  {
    heading: "2. How we use information",
    paragraphs: ["To provide the Service (planning emails with AI, sending them and accepting payment through PayPal), to prevent abuse and to answer enquiries."],
  },
  {
    heading: "3. Sharing with AI",
    paragraphs: [
      "To decide the next email, the customer's name, country, purchase history and the results of previous emails, together with the shop's product list, are sent to Anthropic's API (Claude). Email addresses are not sent.",
    ],
  },
  {
    heading: "4. Disclosure and service providers",
    paragraphs: [
      "We do not give personal information to third parties without consent, except as required by law. To provide the Service, we use these providers: Cloudflare (hosting, email delivery), PingCAP (TiDB Cloud, database), Anthropic (AI) and PayPal (payments).",
    ],
  },
  {
    heading: "5. Unsubscribing",
    paragraphs: ["Customers can stop emails at any time with the unsubscribe link in every email. After that, no more emails are sent from that shop."],
  },
  {
    heading: "6. Retention",
    paragraphs: ["Shop and customer information remains after the shop deletes its account."],
  },
  {
    heading: "7. Security",
    paragraphs: ["We protect information with encryption in transit, hashed passwords, per-account access control and signed links in emails."],
  },
  {
    heading: "8. Access, correction and deletion",
    paragraphs: ["Shops can review and correct shop and customer information in the console, and delete their account there. Requests from customers are handled through the shop that emailed them."],
  },
  {
    heading: "9. Changes",
    paragraphs: ["The Operator may revise this policy. Revisions take effect when posted in the Service."],
  },
];

export default function Privacy() {
  const locale = useLocale();
  if (locale === "en") {
    return (
      <LegalPage title="Privacy Policy" notice={TRANSLATION_NOTICE}>
        <LegalSections sections={SECTIONS_EN} effectiveDate="Effective: October 26, 2026" />
      </LegalPage>
    );
  }
  return (
    <LegalPage title="プライバシーポリシー">
      <LegalSections sections={SECTIONS_JA} effectiveDate="発効日: 2026年10月26日" />
    </LegalPage>
  );
}
