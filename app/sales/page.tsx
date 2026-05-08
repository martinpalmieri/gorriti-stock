import { SalesHeader } from "../_components/sales/sales-header";
import { SalesList } from "../_components/sales/sales-list";

const mockedSales = [
  { id: "V-1042", date: "Hoy, 12:45", total: "€31", status: "Manual" },
  { id: "V-1041", date: "Hoy, 11:20", total: "€24", status: "Manual" },
];

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <SalesHeader />
      <SalesList sales={mockedSales} />
    </div>
  );
}
