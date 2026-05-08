import { LinkButton } from "../ui/button";

type LatestSale = {
  id: string;
  time: string;
  items: string;
  total: string;
};

type LatestSalesProps = {
  sales: LatestSale[];
};

export function LatestSales({ sales }: LatestSalesProps) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">Últimas ventas</h3>
          <p className="mt-1 text-sm text-stone-500">Actividad simulada del día.</p>
        </div>
        <LinkButton variant="ghost" href="/sales">
          Ver ventas
        </LinkButton>
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Venta</th>
              <th className="px-4 py-3">Hora</th>
              <th className="px-4 py-3">Productos</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="px-4 py-4 font-semibold">{sale.id}</td>
                <td className="px-4 py-4 text-stone-600">{sale.time}</td>
                <td className="px-4 py-4 text-stone-600">{sale.items}</td>
                <td className="px-4 py-4 text-right font-semibold">{sale.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

