import { Button } from "../ui/button";

type Product = {
  name: string;
  category: string;
  stock: number;
  price: string;
};

type ProductListProps = {
  products: Product[];
};

export function ProductList({ products }: ProductListProps) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xl font-bold">Listado preliminar</h3>
        <Button
          type="button"
          variant="secondary"
          className="px-4 py-2 text-stone-700"
        >
          Añadir producto próximamente
        </Button>
      </div>
      <div className="mt-5 grid gap-3">
        {products.map((product) => (
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
  );
}

