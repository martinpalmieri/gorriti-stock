export function NewSaleHeader() {
  return (
    <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">
        Nueva venta
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-stone-950">
        Venta manual
      </h2>
      <p className="mt-3 max-w-2xl text-stone-600">
        Flujo simulado para caja: busca productos, añade unidades al carrito,
        elige el método de pago manual y confirma la venta sin conectar Supabase.
      </p>
    </header>
  );
}
