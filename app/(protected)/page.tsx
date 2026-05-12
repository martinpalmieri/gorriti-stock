import { DashboardHeader } from "../_components/dashboard/dashboard-header";
import { LatestSales } from "../_components/dashboard/latest-sales";
import { LatestStockMovements } from "../_components/dashboard/latest-stock-movements";
import { SummaryCards } from "../_components/dashboard/summary-cards";
import { loadDashboardData } from "@/lib/dashboard/load-dashboard";

const euroFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

function formatEuroTotal(value: number): string {
  return euroFormatter.format(value);
}

export default async function DashboardPage() {
  const data = await loadDashboardData();

  const ventasDetail =
    data.todaySalesCount === 1
      ? "1 venta confirmada"
      : `${data.todaySalesCount} ventas confirmadas`;

  const summaryCards = [
    {
      label: "Ventas de hoy",
      value: String(data.todaySalesCount),
      detail: ventasDetail,
      tone: "bg-amber-100 text-amber-900",
    },
    {
      label: "Ingresos de hoy",
      value: formatEuroTotal(data.todayRevenueTotal),
      detail: "Total de ventas confirmadas hoy",
      tone: "bg-sky-100 text-sky-900",
    },
    {
      label: "Productos en stock",
      value: String(data.productsInStock),
      detail: "Productos activos con existencias",
      tone: "bg-emerald-100 text-emerald-900",
    },
    {
      label: "Productos sin stock",
      value: String(data.productsOutOfStock),
      detail: "Productos activos agotados",
      tone: "bg-rose-100 text-rose-900",
    },
  ];

  return (
    <div className="space-y-8">
      <DashboardHeader />

      {data.dashboardSetupHint ? (
        <div
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          {data.dashboardSetupHint}
        </div>
      ) : null}

      {data.loadError ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
        >
          No se pudieron cargar los datos del panel: {data.loadError}
        </div>
      ) : null}

      <SummaryCards cards={summaryCards} />

      <LatestSales sales={data.latestSales} />

      <LatestStockMovements movements={data.latestMovements} />
    </div>
  );
}
