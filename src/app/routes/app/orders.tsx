import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Receipt } from "lucide-react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { gridTheme } from "@/components/letters/LettersGrid";
import { useAccountPage, useMoney } from "@/components/account/hooks";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageBody, PageHeader } from "@/components/ui/PageHeader";
import { getShop, listOrders, type OrderRow } from "@/lib/api-client";

/** 店のすべての注文。Letterpay のメールから払われた注文の数と売上を上に出す */
export default function OrdersPage() {
  const { t } = useTranslation();
  const { openMobileNavigation } = useAccountPage();
  const shop = useQuery({ queryKey: ["shop"], queryFn: getShop });
  const orders = useQuery({ queryKey: ["orders"], queryFn: listOrders });
  const money = useMoney(shop.data?.shop?.currency);

  const columns = useMemo<ColDef<OrderRow>[]>(
    () => [
      { headerName: t("orders.columns.date"), field: "purchasedOn", width: 130, sort: "desc" },
      { headerName: t("orders.columns.customer"), field: "customerName", minWidth: 180, flex: 1 },
      { headerName: t("orders.columns.country"), field: "country", width: 110 },
      { headerName: t("orders.columns.coffee"), field: "productName", minWidth: 220, flex: 1 },
      { headerName: t("orders.columns.bags"), field: "quantity", width: 100, type: "numericColumn" },
      {
        headerName: t("orders.columns.amount"),
        field: "amountMinor",
        width: 130,
        type: "numericColumn",
        valueFormatter: (params) => (params.value == null ? "" : money(params.value)),
      },
      {
        headerName: t("orders.columns.source"),
        field: "source",
        width: 150,
        valueFormatter: (params) => t(`orders.source.${params.value}`),
        cellClass: (params) => (params.value === "letterpay" ? "font-semibold text-brand-ink" : ""),
      },
    ],
    [money, t],
  );

  const rows = orders.data?.items ?? [];
  const fromLetterpay = rows.filter((row) => row.source === "letterpay");
  const letterpayMinor = fromLetterpay.reduce((sum, row) => sum + row.amountMinor, 0);

  return (
    <>
      <PageHeader
        title={t("orders.title")}
        description={t("orders.summary", { count: fromLetterpay.length, amount: money(letterpayMinor) })}
        onOpenMenu={openMobileNavigation}
      />
      <PageBody>
        {orders.isPending ? (
          <div className="h-96 animate-pulse rounded-(--radius-panel) bg-paper" />
        ) : rows.length === 0 ? (
          <EmptyState icon={Receipt} title={t("orders.emptyTitle")} description={t("orders.emptyDescription")} />
        ) : (
          <div className="h-[calc(100dvh-14rem)] min-h-[420px] w-full">
            <AgGridReact<OrderRow>
              theme={gridTheme}
              rowData={rows}
              columnDefs={columns}
              getRowId={(params) => params.data.id}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
            />
          </div>
        )}
      </PageBody>
    </>
  );
}
