const mockedSales = [
  { id: "V-1042", date: "Hoy, 12:45", total: "€31", status: "Manual" },
  { id: "V-1041", date: "Hoy, 11:20", total: "€24", status: "Manual" },
];

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Ventas</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight">Historial de ventas</h2>
        <p className="mt-3 max-w-2xl text-stone-600">
          Placeholder con ventas simuladas. El historial real, los detalles y las exportaciones llegarán más adelante.
        </p>
      </header>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
        <h3 className="text-xl font-bold">Ventas recientes</h3>
        <div className="mt-5 divide-y divide-stone-200 rounded-2xl border border-stone-200">
          {mockedSales.map((sale) => (
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
    </div>
  );
}
