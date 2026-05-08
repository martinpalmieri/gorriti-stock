type Sale = {
  id: string;
  date: string;
  total: string;
  status: string;
};

type SalesListProps = {
  sales: Sale[];
};

export function SalesList({ sales }: SalesListProps) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
      <h3 className="text-xl font-bold">Ventas recientes</h3>
      <div className="mt-5 divide-y divide-stone-200 rounded-2xl border border-stone-200">
        {sales.map((sale) => (
          <article
            key={sale.id}
            className="flex flex-col gap-2 bg-white p-4 text-stone-900 transition hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold">{sale.id}</p>
              <p className="text-sm text-stone-500">{sale.date}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                {sale.status}
              </span>
              <span className="font-bold">{sale.total}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

