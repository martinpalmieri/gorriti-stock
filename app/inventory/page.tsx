const mockedProducts = [
  { name: "El Aleph", category: "Libros", stock: 3, price: "€20" },
  { name: "Kind of Blue", category: "Discos", stock: 1, price: "€24" },
  { name: "Cuaderno A5", category: "Papelería", stock: 18, price: "€11" },
];

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Inventario</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight">Productos</h2>
        <p className="mt-3 max-w-2xl text-stone-600">
          Placeholder con datos simulados. La búsqueda, filtros, CRUD y movimientos de stock se implementarán en tareas posteriores.
        </p>
      </header>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-bold">Listado preliminar</h3>
          <button
            className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:bg-stone-100 hover:text-stone-950 active:bg-stone-200 active:text-stone-950 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-700"
            type="button"
          >
            Añadir producto próximamente
          </button>
        </div>
        <div className="mt-5 grid gap-3">
          {mockedProducts.map((product) => (
            <article
              key={product.name}
              className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-stone-900 transition hover:border-stone-300 hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold">{product.name}</p>
                <p className="text-sm text-stone-500">{product.category}</p>
              </div>
              <div className="flex gap-4 text-sm">
                <span>{product.stock} en stock</span>
                <span className="font-semibold">{product.price}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
