export function InventoryHeader() {
  return (
    <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">
        Inventario
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight">Productos</h2>
      <p className="mt-3 max-w-2xl text-stone-600">
        Placeholder con datos simulados. La búsqueda, filtros, CRUD y movimientos
        de stock se implementarán en tareas posteriores.
      </p>
    </header>
  );
}

