import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Mail, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { LettersGrid, type LetterEdit } from "@/components/letters/LettersGrid";
import { useAccountPage, useMoney } from "@/components/account/hooks";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PageBody, PageHeader } from "@/components/ui/PageHeader";
import { useConfirm } from "@/components/ui/useConfirm";
import {
  getCustomerHistory,
  getShop,
  listLetters,
  listProducts,
  loadDemo,
  overrideLetter,
  replanCustomer,
  sendLetterNow,
  type LetterRow,
} from "@/lib/api-client";

/** 店の人の主画面: 客ごとに、AI が決めた次のメールと、送ったメールの結果を表で見る */
export default function LettersPage() {
  const { t } = useTranslation();
  const { openMobileNavigation } = useAccountPage();
  const queryClient = useQueryClient();
  const [confirm, confirmDialog] = useConfirm();
  const [open, setOpen] = useState<LetterRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const shop = useQuery({ queryKey: ["shop"], queryFn: getShop });
  const letters = useQuery({ queryKey: ["letters"], queryFn: listLetters });
  const products = useQuery({ queryKey: ["products"], queryFn: listProducts });
  const money = useMoney(shop.data?.shop?.currency);

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
            <button
              className="console-button-primary"
              type="button"
              disabled={busy !== null}
              onClick={() => void startDemo()}
            >
              <Sparkles className="h-4 w-4" />
              {busy === "demo" ? t("letters.demoLoading") : t("letters.demo")}
            </button>
          </>
        }
      />
      <PageBody>
        {letters.isPending ? (
          <div className="h-96 animate-pulse rounded-(--radius-panel) bg-paper" />
        ) : rows.length === 0 ? (
          <section className="console-panel">
            <EmptyState icon={Mail} title={t("letters.emptyTitle")} description={t("letters.emptyDescription")} />
          </section>
        ) : (
          <LettersGrid
            rows={rows}
            products={products.data?.items ?? []}
            formatMoney={money}
            onEdit={onEdit}
            onOpen={setOpen}
          />
        )}
      </PageBody>

      {current && (
        <CustomerPanel
          row={current}
          busy={busy}
          onClose={() => setOpen(null)}
          onSend={(letterId) => void run(`send:${letterId}`, () => sendLetterNow(letterId), t("letters.sent"))}
          onReplan={(customerId) =>
            void run(`plan:${customerId}`, () => replanCustomer(customerId), t("letters.replanned"))
          }
        />
      )}
      {confirmDialog}
    </>
  );
}

function CustomerPanel({
  row,
  busy,
  onClose,
  onSend,
  onReplan,
}: {
  row: LetterRow;
  busy: string | null;
  onClose: () => void;
  onSend: (letterId: string) => void;
  onReplan: (customerId: string) => void;
}) {
  const { t } = useTranslation();
  const history = useQuery({
    queryKey: ["history", row.customerId, row.planned?.id ?? null, row.lastSent?.id ?? null],
    queryFn: () => getCustomerHistory(row.customerId),
  });
  const planned = row.planned;

  return (
    <Modal title={row.name} eyebrow={row.email} size="3xl" onClose={onClose}>
      <div className="space-y-6">
        <section>
          <h3 className="text-sm font-semibold">{t("letters.panel.next")}</h3>
          {planned ? (
            <div className="mt-2 space-y-2 text-sm leading-6">
              <p>
                <span className="font-medium">{planned.sendOn}</span> · {planned.productName} × {planned.quantity}
                {planned.editedByOwner && (
                  <span className="ml-2 text-xs text-signal">{t("letters.decidedBy.owner")}</span>
                )}
              </p>
              <p className="text-ink-mute">
                <span className="font-medium text-ink-soft">{t("letters.panel.whyDay")}</span> {planned.timingReason}
              </p>
              <blockquote className="rounded-(--radius-control) border border-line bg-paper px-4 py-3">
                {planned.reason}
              </blockquote>
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink-mute">
              {row.stoppedReason ? `${t("letters.stopped")}: ${row.stoppedReason}` : t("letters.panel.none")}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {planned && (
              <button
                className="console-button-primary"
                type="button"
                disabled={busy !== null}
                onClick={() => onSend(planned.id)}
              >
                {busy === `send:${planned.id}` ? t("common.processing") : t("letters.panel.sendNow")}
              </button>
            )}
            {row.consent && (
              <button
                className="console-button-secondary"
                type="button"
                disabled={busy !== null}
                onClick={() => onReplan(row.customerId)}
              >
                {busy === `plan:${row.customerId}` ? t("common.processing") : t("letters.panel.replan")}
              </button>
            )}
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">{t("letters.panel.purchases")}</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {history.data?.purchases
                .slice()
                .reverse()
                .map((item, index) => (
                  <li key={index} className="flex justify-between gap-3">
                    <span className="num text-ink-mute">{item.date}</span>
                    <span className="truncate">
                      {item.productName} × {item.quantity}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t("letters.panel.letters")}</h3>
            {history.data?.letters.length === 0 && (
              <p className="mt-2 text-sm text-ink-mute">{t("letters.panel.noLetters")}</p>
            )}
            <ul className="mt-2 space-y-1 text-sm">
              {history.data?.letters
                .slice()
                .reverse()
                .map((item, index) => (
                  <li key={index} className="flex justify-between gap-3">
                    <span className="num text-ink-mute">{item.sentOn}</span>
                    <span className="truncate">{item.productName}</span>
                    <span className={item.paidOn ? "font-medium text-earn" : "text-ink-mute"}>
                      {t(`letters.result.${item.paidOn ? "paid" : item.clicked ? "clicked" : "sent"}`)}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </section>
      </div>
    </Modal>
  );
}
