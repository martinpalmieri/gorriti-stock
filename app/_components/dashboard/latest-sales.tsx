import { LinkButton } from "../ui/button";
import type { DashboardLatestSale } from "@/lib/dashboard/load-dashboard";

type LatestSalesProps = {
  sales: DashboardLatestSale[];
};

const euroFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

function formatCurrency(value: string) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return value;
  return euroFormatter.format(numberValue);
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function paymentMethodLabel(
  value: DashboardLatestSale["paymentMethod"],
): string {
  switch (value) {
    case "manual_sumup":
      return "SumUp manual";
    case "cash":
      return "Efectivo";
    case "other":
      return "Otro";
    default:
      return "—";
  }
}

export function LatestSales({ sales }: LatestSalesProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Últimas ventas</h3>
          <p className="mt-1 text-sm text-stone-500">
            Las cinco ventas confirmadas más recientes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton variant="ghost" href="/sales">
            Ver ventas
          </LinkButton>
        </div>
      </div>
      {sales.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-6 text-center text-sm text-stone-600">
          Sin ventas todavía
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-stone-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs font-medium text-stone-600">
              <tr>
                <th className="px-3 py-2">Fecha y hora</th>
                <th className="px-3 py-2">Pago</th>
                <th className="px-3 py-2 text-right">Ítems</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="px-3 py-2 text-stone-700">
                    {formatDateTime(sale.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-stone-600">
                    {paymentMethodLabel(sale.paymentMethod)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-stone-700">
                    {sale.itemCount}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {formatCurrency(sale.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
