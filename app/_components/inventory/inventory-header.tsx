export function InventoryHeader() {
  return (
    <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">
        Inventario
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-stone-950">
        Productos
      </h2>
      <p className="mt-3 max-w-2xl text-stone-600">
        Vista simulada para consultar productos de Gorriti. Los datos son
        locales y temporales: todavía no hay CRUD, Supabase ni movimientos
        reales de stock.
      </p>
    </header>
  );
}
