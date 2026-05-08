import { DashboardHeader } from "../_components/dashboard/dashboard-header";
import { LatestSales } from "../_components/dashboard/latest-sales";
import { SummaryCards } from "../_components/dashboard/summary-cards";

const summaryCards = [
  { label: "Ventas de hoy", value: "€342", detail: "8 ventas registradas", tone: "bg-amber-100 text-amber-900" },
  { label: "Productos en stock", value: "186", detail: "Libros, discos y papelería", tone: "bg-emerald-100 text-emerald-900" },
  { label: "Productos sin stock", value: "12", detail: "Pendientes de reposición", tone: "bg-rose-100 text-rose-900" },
];

const latestSales = [
  { id: "V-1042", time: "12:45", items: "El Aleph + Cuaderno A5", total: "€31" },
  { id: "V-1041", time: "11:20", items: "Vinilo Miles Davis", total: "€24" },
  { id: "V-1040", time: "10:05", items: "Lámina Gorriti", total: "€18" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <DashboardHeader />

      <SummaryCards cards={summaryCards} />

      <LatestSales sales={latestSales} />
    </div>
  );
}
