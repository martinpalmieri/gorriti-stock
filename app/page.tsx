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
      <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Panel</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Resumen de la tienda</h2>
            <p className="mt-3 max-w-2xl text-stone-600">
              Vista rápida con datos simulados para preparar la base del backoffice. Todavía no hay conexión con Supabase ni lógica real de ventas.
            </p>
          </div>
          <a
            href="/sales/new"
            className="inline-flex rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-stone-800"
          >
            Crear nueva venta
          </a>
        </div>
      </header>

      <section aria-label="Indicadores principales" className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <article key={card.label} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${card.tone}`}>{card.label}</div>
            <p className="mt-5 text-4xl font-bold tracking-tight">{card.value}</p>
            <p className="mt-2 text-sm text-stone-500">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">Últimas ventas</h3>
            <p className="mt-1 text-sm text-stone-500">Actividad simulada del día.</p>
          </div>
          <a className="text-sm font-semibold text-amber-700 hover:text-amber-900" href="/sales">Ver ventas</a>
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
              {latestSales.map((sale) => (
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
    </div>
  );
}
