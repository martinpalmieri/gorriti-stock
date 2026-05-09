import { LinkButton } from "../ui/button";
import type { DashboardMovement } from "@/lib/dashboard/load-dashboard";

type LatestStockMovementsProps = {
  movements: DashboardMovement[];
};

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

export function LatestStockMovements({ movements }: LatestStockMovementsProps) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">Últimos movimientos</h3>
          <p className="mt-1 text-sm text-stone-500">
            Cambios recientes de inventario.
          </p>
        </div>
        <LinkButton variant="ghost" href="/inventory">
          Ver inventario
        </LinkButton>
      </div>
      {movements.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-600">
          Sin movimientos todavía
        </p>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {movements.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-4 font-medium text-stone-900">
                    {row.productName}
                  </td>
                  <td className="px-4 py-4 text-stone-600">
                    {row.movementTypeLabel}
                  </td>
                  <td className="px-4 py-4 text-right font-semibold tabular-nums">
                    {row.quantityDisplay}
                  </td>
                  <td className="px-4 py-4 text-stone-600">
                    {formatDateTime(row.createdAt)}
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
