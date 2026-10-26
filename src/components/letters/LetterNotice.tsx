import type { ReactNode } from "react";

/**
 * メールのリンクから来た客に見せる1枚の画面 (英語)。店の名前を上に出し、
 * Letterpay は下に小さく出す (客にとっての相手は店なので)
 */
export function LetterNotice({
  shopName,
  title,
  children,
}: {
  shopName: string | null;
  title: string;
  children?: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-4 py-12 font-sans text-ink">
      <div className="w-full max-w-md">
        {shopName && (
          <p className="mb-4 text-center text-sm text-ink-mute">{shopName}</p>
        )}
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-[-0.01em]">{title}</h1>
          {children && <div className="mt-3 text-sm leading-6 text-ink-soft">{children}</div>}
        </div>
        <p className="mt-6 text-center text-xs text-ink-mute">Sent with Letterpay</p>
      </div>
    </main>
  );
}
