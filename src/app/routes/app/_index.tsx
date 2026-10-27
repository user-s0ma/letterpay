import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Mail, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { LettersGrid, type LetterEdit } from "@/components/letters/LettersGrid";
import { useAccountPage } from "@/components/account/hooks";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PageBody, PageHeader } from "@/components/ui/PageHeader";
import { useConfirm } from "@/components/ui/useConfirm";
import { isDemoUser } from "@/lib/auth/demo-account";
import {
  getCustomerHistory,
  getLetterPreview,
  listLetters,
  listProducts,
  loadDemo,
  overrideLetter,
  replanCustomer,
  sendLetterNow,
  type LetterPreview,
  type LetterRow,
} from "@/lib/api-client";

/** 店の人の主画面: 客ごとに、AI が決めた次のメールと、送ったメールの結果を表で見る */
export default function LettersPage() {
  const { t } = useTranslation();
  const { openMobileNavigation, user } = useAccountPage();
  // デモアカウントは共有なので、デモの店を作り直せない (ほかの審査員の操作の結果まで消える)
  const demo = isDemoUser(user);
  const queryClient = useQueryClient();
  const [confirm, confirmDialog] = useConfirm();
  const [open, setOpen] = useState<LetterRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // デモで「今すぐ送る」を押したあとの、払う側のリンク (客の画面ごと)
  const [sent, setSent] = useState<{ customerId: string; value: LetterPreview } | null>(null);

  const letters = useQuery({ queryKey: ["letters"], queryFn: listLetters });
  const products = useQuery({ queryKey: ["products"], queryFn: listProducts });

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["letters"] }),
      queryClient.invalidateQueries({ queryKey: ["products"] }),
      queryClient.invalidateQueries({ queryKey: ["shop"] }),
    ]);
  }, [queryClient]);

  const run = useCallback(
    async (key: string, action: () => Promise<unknown>, success?: string) => {
      setBusy(key);
      try {
        await action();
        if (success) toast.success(success);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("common.apiError"));
      } finally {
        setBusy(null);
        await refresh();
      }
    },
    [refresh, t],
  );

  const onEdit = useCallback(
    (letterId: string, edit: LetterEdit) =>
      void run(`edit:${letterId}`, () => overrideLetter(letterId, edit), t("letters.edited")),
    [run, t],
  );

  const startDemo = async () => {
    if (letters.data?.items.length && !(await confirm(t("letters.demoConfirm"), { danger: true }))) return;
    await run(
      "demo",
      async () => {
        const result = await loadDemo();
        if (result.failed > 0) toast.error(t("letters.demoPartial", { count: result.failed }));
      },
      t("letters.demoLoaded"),
    );
  };

  const rows = letters.data?.items ?? [];
  const current = open ? (rows.find((row) => row.customerId === open.customerId) ?? open) : null;

  return (
    <>
      <PageHeader
        title={t("letters.title")}
        description={t("letters.description")}
        onOpenMenu={openMobileNavigation}
        actions={
          <>
            <button className="console-button-secondary" type="button" onClick={() => void refresh()}>
              <RefreshCw className="h-4 w-4" />
              {t("common.refresh")}
            </button>
            {!demo && (
              <button
                className="console-button-primary"
                type="button"
                disabled={busy !== null}
                onClick={() => void startDemo()}
              >
                <Sparkles className="h-4 w-4" />
                {busy === "demo" ? t("letters.demoLoading") : t("letters.demo")}
              </button>
            )}
          </>
        }
      />
      <PageBody>
        {letters.isPending ? (
          <div className="h-96 animate-pulse rounded-(--radius-panel) bg-paper" />
        ) : rows.length === 0 ? (
          <EmptyState icon={Mail} title={t("letters.emptyTitle")} description={t("letters.emptyDescription")} />
        ) : (
          <LettersGrid
            rows={rows}
            products={products.data?.items ?? []}
            onEdit={onEdit}
            onOpen={setOpen}
          />
        )}
      </PageBody>

      {current && (
        <CustomerPanel
          row={current}
          busy={busy}
          sent={sent?.customerId === current.customerId ? sent.value : null}
          onClose={() => {
            setOpen(null);
            setSent(null);
          }}
          onSend={(letterId) =>
            void run(`send:${letterId}`, async () => {
              const result = await sendLetterNow(letterId);
              if (result.preview && result.sandboxBuyer) {
                setSent({ customerId: current.customerId, value: { preview: result.preview, sandboxBuyer: result.sandboxBuyer } });
              } else toast.success(t("letters.sent"));
            })
          }
          onReplan={(customerId) =>
            void run(`plan:${customerId}`, () => replanCustomer(customerId), t("letters.replanned"))
          }
        />
      )}
      {confirmDialog}
    </>
  );
}

/**
 * 客の「詳しく」。左に次のメールを客に届く形のまま見せ、右に客の注文と送ったメールを並べる。
 * デモで今すぐ送ったあとは、払う側のリンクとサンドボックスの買い手をここに出す
 */
function CustomerPanel({
  row,
  busy,
  sent,
  onClose,
  onSend,
  onReplan,
}: {
  row: LetterRow;
  busy: string | null;
  sent: LetterPreview | null;
  onClose: () => void;
  onSend: (letterId: string) => void;
  onReplan: (customerId: string) => void;
}) {
  const { t } = useTranslation();
  const planned = row.planned;
  const history = useQuery({
    queryKey: ["history", row.customerId, planned?.id ?? null, row.lastSent?.id ?? null],
    queryFn: () => getCustomerHistory(row.customerId),
  });
  const preview = useQuery({
    queryKey: ["preview", planned?.id ?? null, planned?.productId, planned?.quantity, planned?.reason],
    queryFn: () => getLetterPreview(planned!.id),
    enabled: Boolean(planned),
  });
  const consent = row.unsubscribed ? t("letters.consent.unsubscribed") : row.consent ? t("letters.consent.yes") : t("letters.consent.no");

  return (
    <Modal title={row.name} size="5xl" onClose={onClose}>
      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">{t("letters.panel.next")}</h3>
              {planned ? (
                <p className="mt-1 text-sm leading-6 text-ink-mute">
                  <span className="num font-medium text-ink">{planned.sendOn}</span>
                  {planned.editedByOwner && <span className="ml-2 text-xs text-signal">{t("letters.editedByYou")}</span>}
                  <br />
                  {planned.timingReason}
                </p>
              ) : (
                <p className="mt-1 text-sm text-ink-mute">
                  {row.stoppedReason ? `${t("letters.stopped")}: ${row.stoppedReason}` : t("letters.panel.none")}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              {row.consent && (
                <button className="console-button-secondary" type="button" disabled={busy !== null} onClick={() => onReplan(row.customerId)}>
                  {busy === `plan:${row.customerId}` ? t("common.processing") : t("letters.panel.replan")}
                </button>
              )}
              {planned && (
                <button className="console-button-primary" type="button" disabled={busy !== null} onClick={() => onSend(planned.id)}>
                  {busy === `send:${planned.id}` ? t("common.processing") : t("letters.panel.sendNow")}
                </button>
              )}
            </div>
          </div>

          {sent && (
            <div className="space-y-2 rounded-(--radius-control) border border-line bg-paper p-3 text-sm">
              <p>{t("letters.panel.sentDemo", { subject: sent.preview.subject })}</p>
              <p className="text-ink-soft">
                {t("letters.preview.sandboxBuyer", { email: sent.sandboxBuyer.email, password: sent.sandboxBuyer.password })}
              </p>
              <a className="console-button-primary" href={sent.preview.payUrl} target="_blank" rel="noreferrer">
                {t("letters.preview.open")}
              </a>
            </div>
          )}

          {planned &&
            (preview.data ? (
              <>
                <p className="text-xs text-ink-mute">
                  {t("letters.preview.to", { email: preview.data.to })} · {preview.data.subject}
                </p>
                {/* 見本なので押せないようにする (送る前のリンクは使わない)。高さはメールの長さに合わせる */}
                <iframe
                  title={preview.data.subject}
                  srcDoc={preview.data.html}
                  sandbox="allow-same-origin"
                  onLoad={(event) => {
                    const frame = event.currentTarget;
                    const height = frame.contentDocument?.documentElement.scrollHeight;
                    if (height) frame.style.height = `${height}px`;
                  }}
                  className="pointer-events-none h-[30rem] w-full rounded-(--radius-control) border border-line bg-white"
                />
              </>
            ) : (
              <div className="h-[30rem] animate-pulse rounded-(--radius-control) bg-paper" />
            ))}
        </section>

        <aside className="space-y-5 text-sm">
          <p className="leading-6 text-ink-mute">
            {row.email}
            <br />
            {row.country} · {consent}
          </p>
          <div>
            <h3 className="font-semibold">{t("letters.panel.purchases")}</h3>
            <ul className="mt-2 space-y-1">
              {history.data?.purchases
                .slice()
                .reverse()
                .map((item, index) => (
                  <li key={index} className="flex justify-between gap-3">
                    <span className="num shrink-0 text-ink-mute">{item.date}</span>
                    <span className="flex min-w-0 gap-1">
                      <span className="truncate">{item.productName}</span>
                      <span className="shrink-0">× {item.quantity}</span>
                    </span>
                  </li>
                ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">{t("letters.panel.letters")}</h3>
            {history.data?.letters.length === 0 && <p className="mt-2 text-ink-mute">{t("letters.panel.noLetters")}</p>}
            <ul className="mt-2 space-y-1">
              {history.data?.letters
                .slice()
                .reverse()
                .map((item, index) => (
                  <li key={index} className="flex justify-between gap-3">
                    <span className="num shrink-0 text-ink-mute">{item.sentOn}</span>
                    <span className="truncate">{item.productName}</span>
                    <span className={`shrink-0 ${item.paidOn ? "font-medium text-earn" : "text-ink-mute"}`}>
                      {t(`letters.result.${item.paidOn ? "paid" : item.clicked ? "clicked" : "sent"}`)}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </aside>
      </div>
    </Modal>
  );
}
