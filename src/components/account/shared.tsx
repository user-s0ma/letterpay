import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

/** 数字を1枚のパネルに並べる帯。セルは1pxの線で区切る */
export function StatStrip({ children, cols = 4 }: { children: ReactNode; cols?: 3 | 4 }) {
  return (
    <section
      className={`grid grid-cols-2 gap-px overflow-hidden rounded-(--radius-panel) border border-line bg-line ${
        // 3つのときは2列で余ったマスが空くので、最後の1つを横いっぱいに広げる
        cols === 3 ? "lg:grid-cols-3 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1" : "lg:grid-cols-4"
      }`}
    >
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  to,
  tone = "ink",
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  to?: string;
  /** brand はクレジット残高、earn は入ってくるお金 (収益) */
  tone?: "ink" | "brand" | "earn";
}) {
  const body = (
    <>
      <p className="text-xs text-ink-mute">{label}</p>
      <p
        className={`num mt-1.5 truncate text-2xl font-semibold tracking-[-0.01em] ${
          tone === "earn" ? "text-earn" : tone === "brand" ? "text-brand-ink" : "text-ink"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 truncate text-xs text-ink-mute">{hint}</p>}
    </>
  );
  const className = "block min-w-0 bg-paper px-4 py-4 sm:px-5";
  return to ? (
    <Link className={`${className} transition-colors hover:bg-paper`} to={to}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** パネル見出し。右側に「すべて見る」などのリンクを置ける */
export function PanelHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs leading-5 text-ink-mute">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0 text-sm">{action}</div>}
    </div>
  );
}

export function PanelLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="text-sm text-brand-ink hover:underline" to={to}>
      {children}
    </Link>
  );
}

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="console-button-secondary shrink-0"
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(
          () => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          },
          () => toast.error(t("apiKeys.copyFailed")),
        );
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? t("common.copied") : (label ?? t("common.copy"))}
    </button>
  );
}

