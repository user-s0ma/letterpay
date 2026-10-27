import { useTranslation } from "react-i18next";
import { DemoButton } from "@/components/account/DemoButton";
import { Mail, PauseCircle, Receipt, ShieldCheck } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/landing/SiteChrome";

const STEPS = ["s1", "s2", "s3"] as const;
const GUARDS = [
  ["consent", ShieldCheck],
  ["pace", PauseCircle],
  ["unsubscribe", Mail],
  ["price", Receipt],
] as const;

/** トップの右に置く、届くメールの見本 (デモの店 Hoshizora Coffee の例) */
function SampleEmail() {
  return (
    <div className="mx-auto w-full max-w-md rounded-[1.25rem] border border-line bg-raised p-6 shadow-xl shadow-black/10">
      <p className="font-serif text-[15px]">Hi Mia,</p>
      <p className="mt-2 font-serif text-[15px] leading-7 text-ink-soft">
        Your last two bags of Brazil Cerrado should be running low around now. It has been your steady pick since spring,
        so here is the same again.
      </p>
      <div className="mt-4 border-t border-line pt-4 text-sm">
        <p className="font-semibold">Brazil Cerrado Natural</p>
        <p className="mt-0.5 text-xs text-ink-mute">Medium roast from Brazil. Milk chocolate, roasted almond and caramel.</p>
        <p className="num mt-2">2 × 200 g bag · $16.00 each</p>
        <p className="num mt-0.5">
          Shipping $12.00 · <span className="font-semibold">Total $44.00</span>
        </p>
      </div>
      <span className="mt-5 inline-flex rounded-full bg-ink px-6 py-2.5 text-sm font-bold text-surface">
        Pay with PayPal
      </span>
    </div>
  );
}

/** 「すべての判断が1つの表に」の横に置く、メールの表の見本 (デモの店の例) */
const SAMPLE_ROWS = [
  ["Mia Thompson", "Oct 30", "Brazil Cerrado Natural × 2", "Her last two bags should be running low."],
  ["Lukas Weber", "Oct 29", "Guatemala Antigua × 1", "Close to the Sumatra he likes, a bit brighter."],
  ["Hannah Lee", "No consent", "—", ""],
] as const;

function SampleTable() {
  return (
    <div className="mt-8 overflow-x-auto rounded-(--radius-panel) border border-line bg-raised">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead className="bg-paper text-xs font-semibold">
          <tr>
            <th className="px-4 py-2.5">Customer</th>
            <th className="px-4 py-2.5">Next email</th>
            <th className="px-4 py-2.5">Product</th>
            <th className="px-4 py-2.5">Why</th>
          </tr>
        </thead>
        <tbody>
          {SAMPLE_ROWS.map(([name, next, item, why]) => (
            <tr key={name} className="border-t border-line">
              <td className="whitespace-nowrap px-4 py-2.5 font-medium">{name}</td>
              <td className="num whitespace-nowrap px-4 py-2.5 text-ink-soft">{next}</td>
              <td className="px-4 py-2.5">{item}</td>
              <td className="px-4 py-2.5 text-ink-soft">{why}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  return (
    <div className="site relative min-h-screen overflow-x-clip bg-surface font-sans text-ink antialiased">
      <SiteHeader transparentAtTop />

      <section className="ui-container grid gap-14 pt-12 pb-20 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16 lg:py-24">
        <div className="max-w-[38rem]">
          <h1 className="h-display text-[clamp(2.2rem,4.6vw,3.8rem)] font-semibold tracking-[-0.035em]">
            {t("landing.hero.title")}
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-soft sm:text-lg">{t("landing.hero.lead")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <DemoButton />
            <a href="/app" className="ui-button-secondary">
              {t("landing.hero.cta")}
            </a>
          </div>
        </div>
        <SampleEmail />
      </section>

      <section id="how" className="border-t border-line bg-paper py-20">
        <div className="ui-container">
          <h2 className="h-display text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">{t("landing.steps.title")}</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((key) => (
              <li key={key} className="rounded-(--radius-panel) border border-line bg-surface p-6">
                <h3 className="text-lg font-semibold">{t(`landing.steps.${key}.title`)}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{t(`landing.steps.${key}.body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-20">
        <div className="ui-container grid gap-12 lg:grid-cols-2">
          <div className="min-w-0">
            <h2 className="h-display text-3xl font-semibold tracking-[-0.025em]">{t("landing.owner.title")}</h2>
            <p className="mt-4 text-base leading-7 text-ink-soft">{t("landing.owner.body")}</p>
            <SampleTable />
          </div>
          <div>
            <h2 className="h-display text-3xl font-semibold tracking-[-0.025em]">{t("landing.guard.title")}</h2>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2">
              {GUARDS.map(([key, Icon]) => (
                <li key={key}>
                  <Icon className="h-5 w-5 text-brand-ink" aria-hidden />
                  <p className="mt-2 text-sm font-semibold">{t(`landing.guard.${key}.title`)}</p>
                  <p className="mt-1 text-sm leading-6 text-ink-soft">{t(`landing.guard.${key}.body`)}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="ui-container text-center">
          <h2 className="h-display text-3xl font-semibold tracking-[-0.025em]">{t("landing.finalCta.title")}</h2>
          <a href="/app" className="ui-button-primary mt-8 inline-flex">
            {t("landing.finalCta.cta")}
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
