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
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Últimos movimientos</h3>
          <p className="mt-1 text-sm text-stone-500">
            Cambios recientes de inventario.
          </p>
        </div>
        <LinkButton variant="ghost" href="/inventory">
          Ver inventario
        </LinkButton>
      </div>
      {movements.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-6 text-center text-sm text-stone-600">
          Sin movimientos todavía
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-stone-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs font-medium text-stone-600">
              <tr>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
                <th className="px-3 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {movements.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 font-medium text-stone-900">
                    {row.productName}
                  </td>
                  <td className="px-3 py-2 text-stone-600">
                    {row.movementTypeLabel}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {row.quantityDisplay}
                  </td>
                  <td className="px-3 py-2 text-stone-600">
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
