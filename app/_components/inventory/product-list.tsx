"use client";

import { useMemo, useState } from "react";
import { Button } from "../ui/button";

type ProductCondition = "Nuevo" | "Segunda mano" | "Como nuevo";

type Product = {
  id: string;
  title: string;
  creator: string;
  category: string;
  brand: string;
  price: string;
  stock: number;
  condition: ProductCondition;
  barcode: string;
  sku: string;
  isbn?: string;
  notes: string;
};

const mockedProducts: Product[] = [
  {
    id: "book-aleph",
    title: "El Aleph",
    creator: "Jorge Luis Borges",
    category: "Libro",
    brand: "Editorial X",
    price: "€12,00",
    stock: 1,
    condition: "Segunda mano",
    barcode: "9780000000011",
    sku: "LIB-ALEPH-001",
    isbn: "978-0-00-000001-1",
    notes: "Edición cuidada para la mesa de narrativa.",
  },
  {
    id: "music-unknown-pleasures",
    title: "Unknown Pleasures",
    creator: "Joy Division",
    category: "Disco / Música",
    brand: "Factory",
    price: "€24,00",
    stock: 1,
    condition: "Segunda mano",
    barcode: "5021732000024",
    sku: "MUS-JD-UP-001",
    notes: "Vinilo revisado, funda con señales leves de uso.",
  },
  {
    id: "stationery-midori-a5",
    title: "Cuaderno A5",
    creator: "Midori",
    category: "Papelería",
    brand: "Midori",
    price: "€8,00",
    stock: 3,
    condition: "Nuevo",
    barcode: "4902805152884",
    sku: "PAP-MID-A5-003",
    notes: "Papel crema, tamaño A5.",
  },
  {
    id: "print-huelin",
    title: "Print Huelin",
    creator: "Gorriti",
    category: "Print",
    brand: "Gorriti",
    price: "€18,00",
    stock: 5,
    condition: "Nuevo",
    barcode: "8437000000185",
    sku: "ART-HUELIN-005",
    notes: "Lámina inspirada en el barrio de Huelin.",
  },
  {
    id: "own-fanzine-01",
    title: "Fanzine Gorriti 01",
    creator: "Gorriti Editorial",
    category: "Publicación propia",
    brand: "Gorriti Editorial",
    price: "€6,00",
    stock: 10,
    condition: "Nuevo",
    barcode: "8437000000062",
    sku: "PRO-FAN-001",
    isbn: "978-8-43-700006-2",
    notes: "Primera publicación propia de Gorriti.",
  },
  {
    id: "music-cassette-demo",
    title: "Cassette Gorriti Demo",
    creator: "Gorriti Música",
    category: "Cassette",
    brand: "Gorriti Música",
    price: "€9,00",
    stock: 4,
    condition: "Nuevo",
    barcode: "8437000000093",
    sku: "MUS-CAS-DEMO-004",
    notes: "Demo en cassette de tirada corta.",
  },
  {
    id: "book-no-stock",
    title: "Poeta en Nueva York",
    creator: "Federico García Lorca",
    category: "Libro",
    brand: "Editorial Sur",
    price: "€14,00",
    stock: 0,
    condition: "Como nuevo",
    barcode: "9780000000141",
    sku: "LIB-LORCA-PNY-000",
    isbn: "978-0-00-000014-1",
    notes: "Ejemplo sin stock para probar el filtro.",
  },
];

const categories = [
  "Todas",
  ...Array.from(new Set(mockedProducts.map((product) => product.category))),
];
const conditions: Array<ProductCondition | "Todas"> = [
  "Todas",
  "Nuevo",
  "Segunda mano",
  "Como nuevo",
];
const stockFilters = [
  { label: "Todo el stock", value: "all" },
  { label: "En stock", value: "in" },
  { label: "Sin stock", value: "out" },
] as const;

function normalize(value: string) {
  return value.toLocaleLowerCase("es").trim();
}

function productMatchesSearch(product: Product, query: string) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return true;
  }

  return [
    product.title,
    product.creator,
    product.brand,
    product.barcode,
    product.sku,
    product.isbn ?? "",
  ].some((field) => normalize(field).includes(normalizedQuery));
}

function stockBadgeClasses(stock: number) {
  if (stock === 0) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (stock === 1) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

export function ProductList() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [condition, setCondition] = useState<ProductCondition | "Todas">(
    "Todas",
  );
  const [stockFilter, setStockFilter] =
    useState<(typeof stockFilters)[number]["value"]>("all");
  const [selectedProduct, setSelectedProduct] = useState<Product>(
    mockedProducts[0],
  );

  const filteredProducts = useMemo(() => {
    return mockedProducts.filter((product) => {
      const matchesCategory =
        category === "Todas" || product.category === category;
      const matchesCondition =
        condition === "Todas" || product.condition === condition;
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "in" && product.stock > 0) ||
        (stockFilter === "out" && product.stock === 0);

      return (
        matchesCategory &&
        matchesCondition &&
        matchesStock &&
        productMatchesSearch(product, search)
      );
    });
  }, [category, condition, search, stockFilter]);

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-200 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-bold text-stone-950">
            Inventario simulado
          </h3>
          <p className="mt-1 text-sm text-stone-600">
            Busca por título, creador, editorial, sello, código de barras, SKU o
            ISBN.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="w-full px-4 py-2 text-stone-800 sm:w-auto"
        >
          Añadir producto próximamente
        </Button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_190px_170px]">
        <label className="block">
          <span className="text-sm font-semibold text-stone-800">
            Buscar producto
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ej. Borges, Factory, LIB-ALEPH o ISBN"
            className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-950 shadow-sm outline-none transition placeholder:text-stone-500 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/20"
            type="search"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-stone-800">
            Categoría
          </span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-950 shadow-sm outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-900/20"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-stone-800">Estado</span>
          <select
            value={condition}
            onChange={(event) =>
              setCondition(event.target.value as ProductCondition | "Todas")
            }
            className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-950 shadow-sm outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-900/20"
          >
            {conditions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-stone-800">
            Disponibilidad
          </span>
          <select
            value={stockFilter}
            onChange={(event) =>
              setStockFilter(
                event.target.value as (typeof stockFilters)[number]["value"],
              )
            }
            className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-950 shadow-sm outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-900/20"
          >
            {stockFilters.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-2xl border border-stone-200">
          <div className="grid grid-cols-[minmax(0,1.4fr)_0.9fr_0.8fr_0.7fr] gap-4 bg-stone-100 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-stone-600 max-md:hidden">
            <span>Producto</span>
            <span>Categoría</span>
            <span>Stock</span>
            <span className="text-right">Precio</span>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="divide-y divide-stone-200 bg-white">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedProduct(product)}
                  className={`grid w-full gap-3 px-4 py-4 text-left transition hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-stone-800 md:grid-cols-[minmax(0,1.4fr)_0.9fr_0.8fr_0.7fr] md:items-center ${
                    selectedProduct.id === product.id
                      ? "bg-amber-50"
                      : "bg-white"
                  }`}
                  aria-pressed={selectedProduct.id === product.id}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-950">
                      {product.title}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      {product.creator} · {product.brand}
                    </p>
                    <p className="mt-1 text-xs font-medium text-stone-500">
                      SKU {product.sku} ·{" "}
                      {product.isbn
                        ? `ISBN ${product.isbn}`
                        : `EAN ${product.barcode}`}
                    </p>
                  </div>
                  <div className="text-sm text-stone-700">
                    <span className="font-semibold md:hidden">Categoría: </span>
                    {product.category}
                  </div>
                  <div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${stockBadgeClasses(product.stock)}`}
                    >
                      {product.stock > 0
                        ? `${product.stock} en stock`
                        : "Sin stock"}
                    </span>
                  </div>
                  <div className="font-bold text-stone-950 md:text-right">
                    {product.price}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white px-6 py-12 text-center">
              <p className="text-lg font-bold text-stone-950">
                No hay productos que coincidan
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
                Prueba con otro término de búsqueda o cambia los filtros de
                categoría, estado y disponibilidad.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-5 px-4 py-2"
                onClick={() => {
                  setSearch("");
                  setCategory("Todas");
                  setCondition("Todas");
                  setStockFilter("all");
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>

        <aside
          className="rounded-2xl border border-stone-200 bg-stone-50 p-5"
          aria-label="Detalle del producto"
        >
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Detalle
          </p>
          <h4 className="mt-3 text-2xl font-bold text-stone-950">
            {selectedProduct.title}
          </h4>
          <p className="mt-1 text-stone-700">{selectedProduct.creator}</p>

          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex justify-between gap-4 rounded-xl bg-white p-3 ring-1 ring-stone-200">
              <dt className="font-semibold text-stone-600">Categoría</dt>
              <dd className="text-right text-stone-950">
                {selectedProduct.category}
              </dd>
            </div>
            <div className="flex justify-between gap-4 rounded-xl bg-white p-3 ring-1 ring-stone-200">
              <dt className="font-semibold text-stone-600">
                Editorial / marca / sello
              </dt>
              <dd className="text-right text-stone-950">
                {selectedProduct.brand}
              </dd>
            </div>
            <div className="flex justify-between gap-4 rounded-xl bg-white p-3 ring-1 ring-stone-200">
              <dt className="font-semibold text-stone-600">Estado</dt>
              <dd className="text-right text-stone-950">
                {selectedProduct.condition}
              </dd>
            </div>
            <div className="flex justify-between gap-4 rounded-xl bg-white p-3 ring-1 ring-stone-200">
              <dt className="font-semibold text-stone-600">Precio</dt>
              <dd className="text-right font-bold text-stone-950">
                {selectedProduct.price}
              </dd>
            </div>
            <div className="flex justify-between gap-4 rounded-xl bg-white p-3 ring-1 ring-stone-200">
              <dt className="font-semibold text-stone-600">Stock</dt>
              <dd className="text-right text-stone-950">
                {selectedProduct.stock} unidades
              </dd>
            </div>
            <div className="rounded-xl bg-white p-3 ring-1 ring-stone-200">
              <dt className="font-semibold text-stone-600">Códigos</dt>
              <dd className="mt-2 space-y-1 text-stone-950">
                <p>SKU: {selectedProduct.sku}</p>
                <p>Código de barras: {selectedProduct.barcode}</p>
                {selectedProduct.isbn ? (
                  <p>ISBN: {selectedProduct.isbn}</p>
                ) : null}
              </dd>
            </div>
            <div className="rounded-xl bg-white p-3 ring-1 ring-stone-200">
              <dt className="font-semibold text-stone-600">Notas</dt>
              <dd className="mt-2 text-stone-950">{selectedProduct.notes}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
