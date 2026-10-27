import type { Route } from "./+types/terms";
import { LegalPage, LegalSections, type LegalSection } from "@/components/landing/LegalPage";

// 注意: 以下の規約本文はたたき台です。公開前に必ず弁護士等の専門家による確認を受けること。

export function meta(): Route.MetaDescriptors {
  return [
    { title: "Terms of Service | Letterpay" },
    { name: "description", content: "The terms that govern use of Letterpay, provided by Soma Sekiguchi." },
  ];
}

const SECTIONS: LegalSection[] = [
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
  return (
    <LegalPage title="Terms of Service">
      <LegalSections sections={SECTIONS} effectiveDate="Effective: October 26, 2026" />
    </LegalPage>
  );
}
