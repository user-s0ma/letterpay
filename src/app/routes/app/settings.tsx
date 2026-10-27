import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAccountPage } from "@/components/account/hooks";
import { PageBody, PageHeader } from "@/components/ui/PageHeader";
import { getShop, saveShop, type ShopRecord } from "@/lib/api-client";
import { currencyDigits } from "@/lib/money";
import { isDemoUser } from "@/lib/auth/demo-account";

/** 店の名前、代金を受け取る PayPal のアカウント、通貨、送料 */
export default function SettingsPage() {
  const { t } = useTranslation();
  const { openMobileNavigation, user } = useAccountPage();
  const shop = useQuery({ queryKey: ["shop"], queryFn: getShop });
  // デモアカウントは共有なので、店の設定は見るだけ
  const demo = isDemoUser(user);
  return (
    <>
      <PageHeader
        title={t("settings.title")}
        description={demo ? t("common.demoReadOnly") : undefined}
        onOpenMenu={openMobileNavigation}
      />
      <PageBody>
        {shop.isPending ? (
          <div className="h-80 max-w-2xl animate-pulse rounded-(--radius-panel) bg-paper" />
        ) : (
          <ShopForm current={shop.data?.shop ?? null} ownerEmail={user.email} readOnly={demo} />
        )}
      </PageBody>
    </>
  );
}

function ShopForm({ current, ownerEmail, readOnly }: { current: ShopRecord | null; ownerEmail: string; readOnly: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() =>
    current
      ? {
          name: current.name,
          address: current.address,
          payeeEmail: current.payeeEmail,
          currency: current.currency,
          shipping: String(current.shippingMinor / 10 ** currencyDigits(current.currency)),
        }
      : { name: "", address: "", payeeEmail: ownerEmail, currency: "USD", shipping: "" },
  );
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const currency = form.currency.trim().toUpperCase();
      await saveShop({
        name: form.name.trim(),
        address: form.address.trim(),
        payeeEmail: form.payeeEmail.trim(),
        currency,
        shippingMinor: Math.round(Number(form.shipping) * 10 ** currencyDigits(currency)),
      });
      toast.success(t("settings.saved"));
      await queryClient.invalidateQueries({ queryKey: ["shop"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.apiError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="console-panel max-w-2xl p-5" onSubmit={submit}>
      <fieldset className="space-y-4" disabled={readOnly}>
      <label className="block">
        <span className="console-label">{t("settings.name")}</span>
        <input className="console-input" required maxLength={120} value={form.name} onChange={(e) => set({ name: e.target.value })} />
      </label>
      <label className="block">
        <span className="console-label">{t("settings.address")}</span>
        <textarea
          className="console-input min-h-20"
          required
          maxLength={300}
          value={form.address}
          onChange={(e) => set({ address: e.target.value })}
        />
        <span className="console-hint">{t("settings.addressHint")}</span>
      </label>
      <label className="block">
        <span className="console-label">{t("settings.payeeEmail")}</span>
        <input className="console-input" type="email" required value={form.payeeEmail} onChange={(e) => set({ payeeEmail: e.target.value })} />
        <span className="console-hint">{t("settings.payeeHint")}</span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="console-label">{t("settings.currency")}</span>
          <input
            className="console-input uppercase"
            required
            pattern="[A-Za-z]{3}"
            maxLength={3}
            value={form.currency}
            onChange={(e) => set({ currency: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="console-label">{t("settings.shipping")}</span>
          <input
            className="console-input num"
            type="number"
            min={0}
            step="any"
            required
            value={form.shipping}
            onChange={(e) => set({ shipping: e.target.value })}
          />
        </label>
      </div>
      {!readOnly && (
        <div className="flex justify-end">
          <button className="console-button-primary" type="submit" disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      )}
      </fieldset>
    </form>
  );
}
