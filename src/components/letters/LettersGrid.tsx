import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type CellValueChangedEvent,
  type ColDef,
  type ColGroupDef,
  type ICellRendererParams,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import type { LetterRow, ProductRecord } from "@/lib/api-client";

ModuleRegistry.registerModules([AllCommunityModule]);

/** 画面の色の変数をそのまま使い、明るい表示と暗い表示の両方に合わせる */
export const gridTheme = themeQuartz.withParams({
  backgroundColor: "var(--color-surface)",
  foregroundColor: "var(--color-ink)",
  headerBackgroundColor: "var(--color-paper)",
  borderColor: "var(--color-line)",
  accentColor: "var(--color-brand-ink)",
  oddRowBackgroundColor: "var(--color-surface)",
  fontFamily: "inherit",
  fontSize: 13,
  headerFontWeight: 600,
});

export type LetterEdit = { sendOn: string; productId: string; quantity: number };

type Props = {
  rows: LetterRow[];
  products: ProductRecord[];
  formatMoney: (minor: number) => string;
  /** 予定の日・商品・量を直したとき。失敗したら表を読み直す */
  onEdit: (letterId: string, edit: LetterEdit) => void;
  onOpen: (row: LetterRow) => void;
};

/**
 * 1行が客1人。AI が決めた次のメール (送る日・商品・量・理由) と、最後に送ったメールの結果を並べる。
 * 送る日・商品・量は表の中で直せる (店の人による上書き)
 */
export function LettersGrid({ rows, products, formatMoney, onEdit, onOpen }: Props) {
  const { t } = useTranslation();

  const columns = useMemo<(ColDef<LetterRow> | ColGroupDef<LetterRow>)[]>(() => {
    const productName = new Map(products.map((item) => [item.id, item.name]));
    const editable = (params: { data?: LetterRow }) => Boolean(params.data?.planned);
    return [
      {
        headerName: t("letters.columns.customer"),
        field: "name",
        pinned: "left",
        minWidth: 170,
        cellRenderer: (params: ICellRendererParams<LetterRow>) => (
          <div className="leading-tight py-1.5">
            <div className="font-medium">{params.data?.name}</div>
            <div className="text-xs text-ink-mute">{params.data?.country}</div>
          </div>
        ),
      },
      {
        headerName: "",
        colId: "open",
        pinned: "left",
        width: 92,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<LetterRow>) => (
          <button
            className="text-sm font-medium text-brand-ink hover:underline"
            type="button"
            onClick={() => params.data && onOpen(params.data)}
          >
            {t("letters.open")}
          </button>
        ),
      },
      {
        headerName: t("letters.columns.consent"),
        colId: "consent",
        width: 120,
        valueGetter: (params) =>
          params.data?.unsubscribed
            ? t("letters.consent.unsubscribed")
            : params.data?.consent
              ? t("letters.consent.yes")
              : t("letters.consent.no"),
      },
      { headerName: t("letters.columns.purchases"), field: "purchases", width: 110, type: "numericColumn" },
      { headerName: t("letters.columns.lastPurchase"), field: "lastPurchaseOn", width: 130 },
      {
        headerName: t("letters.columns.next"),
        children: [
          {
            headerName: t("letters.columns.sendOn"),
            colId: "sendOn",
            width: 140,
            editable,
            cellEditor: "agDateStringCellEditor",
            valueGetter: (params) => params.data?.planned?.sendOn ?? null,
            valueSetter: (params) => {
              if (!params.data.planned || !params.newValue) return false;
              params.data.planned = { ...params.data.planned, sendOn: params.newValue };
              return true;
            },
            valueFormatter: (params) =>
              params.value ?? (params.data?.stoppedReason ? t("letters.stopped") : "—"),
          },
          {
            headerName: t("letters.columns.product"),
            colId: "product",
            minWidth: 220,
            editable,
            cellEditor: "agSelectCellEditor",
            cellEditorParams: { values: products.filter((item) => item.active).map((item) => item.id) },
            valueGetter: (params) => params.data?.planned?.productId ?? null,
            valueSetter: (params) => {
              if (!params.data.planned || !params.newValue) return false;
              params.data.planned = { ...params.data.planned, productId: params.newValue };
              return true;
            },
            valueFormatter: (params) => (params.value ? (productName.get(params.value) ?? "") : "—"),
          },
          {
            headerName: t("letters.columns.quantity"),
            colId: "quantity",
            width: 90,
            editable,
            cellEditor: "agNumberCellEditor",
            cellEditorParams: { min: 1, precision: 0 },
            valueGetter: (params) => params.data?.planned?.quantity ?? null,
            valueSetter: (params) => {
              if (!params.data.planned || !params.newValue) return false;
              params.data.planned = { ...params.data.planned, quantity: Number(params.newValue) };
              return true;
            },
          },
          {
            headerName: t("letters.columns.decidedBy"),
            colId: "decidedBy",
            width: 110,
            valueGetter: (params) =>
              params.data?.planned
                ? params.data.planned.editedByOwner
                  ? t("letters.decidedBy.owner")
                  : t("letters.decidedBy.ai")
                : null,
          },
          {
            headerName: t("letters.columns.reason"),
            colId: "reason",
            minWidth: 320,
            flex: 1,
            wrapText: true,
            autoHeight: true,
            cellClass: "leading-5 py-2",
            valueGetter: (params) => params.data?.planned?.reason ?? params.data?.stoppedReason ?? null,
          },
        ],
      },
      {
        headerName: t("letters.columns.last"),
        children: [
          { headerName: t("letters.columns.sentOn"), colId: "sentOn", width: 120, valueGetter: (params) => params.data?.lastSent?.sentOn ?? null },
          {
            headerName: t("letters.columns.result"),
            colId: "result",
            width: 120,
            valueGetter: (params) => params.data?.lastSent?.result ?? null,
            valueFormatter: (params) => (params.value ? t(`letters.result.${params.value}`) : "—"),
            cellClassRules: { "text-earn font-semibold": (params) => params.value === "paid" },
          },
        ],
      },
      {
        headerName: t("letters.columns.revenue"),
        field: "letterpayRevenueMinor",
        width: 150,
        type: "numericColumn",
        valueFormatter: (params) => (params.value ? formatMoney(params.value) : "—"),
      },
    ];
  }, [formatMoney, onOpen, products, t]);

  const onCellValueChanged = (event: CellValueChangedEvent<LetterRow>) => {
    const planned = event.data.planned;
    if (!planned) return;
    onEdit(planned.id, { sendOn: planned.sendOn, productId: planned.productId, quantity: planned.quantity });
  };

  return (
    <div className="h-[calc(100dvh-14rem)] min-h-[420px] w-full">
      <AgGridReact<LetterRow>
        theme={gridTheme}
        rowData={rows}
        columnDefs={columns}
        getRowId={(params) => params.data.customerId}
        defaultColDef={{ sortable: true, filter: true, resizable: true }}
        singleClickEdit
        stopEditingWhenCellsLoseFocus
        onCellValueChanged={onCellValueChanged}
      />
    </div>
  );
}
