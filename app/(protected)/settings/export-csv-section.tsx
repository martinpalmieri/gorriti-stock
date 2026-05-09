'use client';

const exports = [
  { href: "/api/exports/products", label: "Exportar productos" },
  { href: "/api/exports/stock-movements", label: "Exportar movimientos de stock" },
  { href: "/api/exports/sales", label: "Exportar ventas" },
  { href: "/api/exports/sale-items", label: "Exportar líneas de venta" },
] as const;

export function ExportCsvSection() {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
      <h3 className="text-xl font-bold">Exportar CSV</h3>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Descarga los datos en CSV (UTF-8) para abrirlos en Excel, Numbers o Google Sheets.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {exports.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="inline-flex items-center justify-center rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
          >
            {item.label}
          </a>
        ))}
      </div>
    </section>
  );
}

