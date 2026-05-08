export default function NewSalePage() {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Nueva venta</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight">Venta manual</h2>
        <p className="mt-3 max-w-2xl text-stone-600">
          Placeholder para el flujo de caja. En esta etapa no se descuenta stock, no se confirma ninguna venta y no existe integración de pagos.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <h3 className="text-xl font-bold">Buscar productos</h3>
          <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-stone-500">
            La búsqueda rápida por título, autor, SKU, ISBN o código de barras se añadirá en una tarea posterior.
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <h3 className="text-xl font-bold">Carrito</h3>
          <p className="mt-4 rounded-2xl bg-stone-50 p-5 text-sm text-stone-500">No hay productos añadidos.</p>
          <div className="mt-5 flex items-center justify-between border-t border-stone-200 pt-5 font-bold">
            <span>Total</span>
            <span>€0</span>
          </div>
        </div>
      </section>
    </div>
  );
}
