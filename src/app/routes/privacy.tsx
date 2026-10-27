import type { Route } from "./+types/privacy";
import { LegalPage, LegalSections, type LegalSection } from "@/components/landing/LegalPage";

// 注意: 以下の本文はたたき台です。公開前に必ず弁護士等の専門家による確認を受けること。

export function meta(): Route.MetaDescriptors {
  return [
    { title: "Privacy Policy | Letterpay" },
    { name: "description", content: "How Letterpay handles personal information." },
  ];
}

const SECTIONS: LegalSection[] = [
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
  return (
    <LegalPage title="Privacy Policy">
      <LegalSections sections={SECTIONS} effectiveDate="Effective: October 26, 2026" />
    </LegalPage>
  );
}
