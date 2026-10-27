import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Package, Plus } from "lucide-react";
import { toast } from "sonner";
import { AgGridReact } from "ag-grid-react";
import type { CellValueChangedEvent, ColDef } from "ag-grid-community";
import { gridTheme } from "@/components/letters/LettersGrid";
import { useAccountPage, useMoney } from "@/components/account/hooks";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PageBody, PageHeader } from "@/components/ui/PageHeader";
import {
  createProduct,
  getShop,
  listProducts,
  updateProduct,
  type ProductInput,
  type ProductRecord,
} from "@/lib/api-client";
import { isDemoUser } from "@/lib/auth/demo-account";
import { currencyDigits } from "@/lib/money";

function toInput(row: ProductRecord): ProductInput {
  return {
    name: row.name,
    description: row.description,
    size: row.size,
    priceMinor: row.priceMinor,
    stock: row.stock,
    arrivedOn: row.arrivedOn,
    active: row.active,
  };
}

/** 商品の一覧。価格・在庫・販売中かは表の中で直せる。AI はこの一覧からすすめる */
export default function ProductsPage() {
  const { t } = useTranslation();
  const { openMobileNavigation, user } = useAccountPage();
  // デモアカウントは共有なので、商品は見るだけ
  const demo = isDemoUser(user);
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const shop = useQuery({ queryKey: ["shop"], queryFn: getShop });
  const products = useQuery({ queryKey: ["products"], queryFn: listProducts });
  const currency = shop.data?.shop?.currency;
  const money = useMoney(currency);

  const columns = useMemo<ColDef<ProductRecord>[]>(() => {
    const scale = currency ? 10 ** currencyDigits(currency) : 1;
    return [
      { headerName: t("products.columns.name"), field: "name", minWidth: 220, flex: 1, editable: !demo, pinned: "left" },
      { headerName: t("products.columns.description"), field: "description", minWidth: 320, flex: 2, editable: !demo, cellEditor: "agLargeTextCellEditor", cellEditorPopup: true },
      { headerName: t("products.columns.size"), field: "size", width: 130, editable: !demo },
      {
        headerName: t("products.columns.price"),
        colId: "price",
        width: 120,
        // 通貨が分かるまでは、打った値を最小単位に直せない
        editable: !demo && Boolean(currency),
        type: "numericColumn",
        cellEditor: "agNumberCellEditor",
        valueGetter: (params) => (params.data ? params.data.priceMinor / scale : null),
        valueSetter: (params) => {
          const value = Number(params.newValue);
          if (!Number.isFinite(value) || value <= 0) return false;
          params.data.priceMinor = Math.round(value * scale);
          return true;
        },
        valueFormatter: (params) => (params.data ? money(params.data.priceMinor) : ""),
      },
      { headerName: t("products.columns.stock"), field: "stock", width: 100, editable: !demo, type: "numericColumn" },
      { headerName: t("products.columns.arrivedOn"), field: "arrivedOn", width: 140, editable: !demo, cellEditor: "agDateStringCellEditor" },
      { headerName: t("products.columns.active"), field: "active", width: 110, editable: !demo },
    ];
  }, [currency, demo, money, t]);

  const onCellValueChanged = async (event: CellValueChangedEvent<ProductRecord>) => {
    try {
      await updateProduct(event.data.id, toInput(event.data));
      toast.success(t("products.saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.apiError"));
    }
    await queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const rows = products.data?.items ?? [];
  return (
    <>
      <PageHeader
        title={t("products.title")}
        description={demo ? t("common.demoReadOnly") : t("products.description")}
        onOpenMenu={openMobileNavigation}
        actions={
          !demo && (
            <button className="console-button-primary" type="button" disabled={!currency} onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" />
              {t("products.add")}
            </button>
          )
        }
      />
      <PageBody>
        {products.isPending ? (
          <div className="h-96 animate-pulse rounded-(--radius-panel) bg-paper" />
        ) : rows.length === 0 ? (
          <EmptyState icon={Package} title={t("products.emptyTitle")} description={t("products.emptyDescription")} />
        ) : (
          <div className="h-[calc(100dvh-14rem)] min-h-[420px] w-full">
            <AgGridReact<ProductRecord>
              theme={gridTheme}
              rowData={rows}
              columnDefs={columns}
              getRowId={(params) => params.data.id}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
              singleClickEdit
              stopEditingWhenCellsLoseFocus
              onCellValueChanged={(event) => void onCellValueChanged(event)}
            />
          </div>
        )}
      </PageBody>
      {adding && currency && (
        <AddProduct
          currency={currency}
          onClose={() => setAdding(false)}
          onCreated={async () => {
            setAdding(false);
            await queryClient.invalidateQueries({ queryKey: ["products"] });
          }}
        />
      )}
    </>
  );
}

function AddProduct({
  currency,
  onClose,
  onCreated,
}: {
  currency: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    size: "",
    price: "",
    stock: "",
    arrivedOn: new Date().toISOString().slice(0, 10),
  });
  const set = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createProduct({
        name: form.name.trim(),
        description: form.description.trim(),
        size: form.size.trim(),
        priceMinor: Math.round(Number(form.price) * 10 ** currencyDigits(currency)),
        stock: Number(form.stock),
        arrivedOn: form.arrivedOn,
        active: true,
      });
      toast.success(t("products.created"));
      await onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.apiError"));
      setSaving(false);
    }
  };

  const field = (label: string, input: React.ReactNode) => (
    <label className="block">
      <span className="console-label">{label}</span>
      {input}
    </label>
  );

  return (
    <Modal title={t("products.add")} onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        {field(t("products.columns.name"), <input className="console-input" required value={form.name} onChange={(e) => set({ name: e.target.value })} />)}
        {field(t("products.columns.description"), <textarea className="console-input min-h-20" required value={form.description} onChange={(e) => set({ description: e.target.value })} />)}
        <div className="grid grid-cols-3 gap-3">
          {field(t("products.columns.size"), <input className="console-input" required placeholder={t("products.sizePlaceholder")} value={form.size} onChange={(e) => set({ size: e.target.value })} />)}
          {field(`${t("products.columns.price")} (${currency})`, <input className="console-input num" type="number" min={0} step="any" required value={form.price} onChange={(e) => set({ price: e.target.value })} />)}
          {field(t("products.columns.stock"), <input className="console-input num" type="number" min={0} required value={form.stock} onChange={(e) => set({ stock: e.target.value })} />)}
        </div>
        {field(t("products.columns.arrivedOn"), <input className="console-input" type="date" required value={form.arrivedOn} onChange={(e) => set({ arrivedOn: e.target.value })} />)}
        <div className="flex justify-end pt-2">
          <button className="console-button-primary" type="submit" disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
