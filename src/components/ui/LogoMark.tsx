/**
 * Letterpay のマーク (封筒)。文字色 (currentColor) で塗るので、暗い面でも明るい面でも読める。
 * public/logo.svg と同じ形
 */
export function LogoMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden focusable="false">
      <rect x="1.5" y="4.5" width="21" height="15" rx="3" fill="currentColor" />
      <path d="M3.5 7.5 12 13l8.5-5.5" fill="none" stroke="var(--color-surface, #fff)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
