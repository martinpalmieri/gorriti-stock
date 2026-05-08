"use client";

import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Category, Product, ProductConditionValue } from "@/lib/inventory/types";
import {
  createProduct,
  initialProductFormState,
  updateProduct,
} from "@/app/(protected)/inventory/actions";
import { Button } from "../ui/button";

const conditionLabels: Record<ProductConditionValue, string> = {
  new: "Nuevo",
  used_very_good: "Como nuevo",
  used_good: "Segunda mano",
};

const conditionOptions: Array<{ value: ProductConditionValue; label: string }> = [
  { value: "new", label: "Nuevo" },
  { value: "used_very_good", label: "Como nuevo" },
  { value: "used_good", label: "Segunda mano" },
];

const stockFilters = [
  { label: "Todo el stock", value: "all" },
  { label: "En stock", value: "in" },
  { label: "Sin stock", value: "out" },
] as const;

type ProductListProps = {
  categories: Category[];
  products: Product[];
  loadError: string | null;
};

type FormMode =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; product: Product };

function normalize(value: string) {
  return value.toLocaleLowerCase("es").trim();
}

function productMatchesSearch(product: Product, query: string) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return true;
  }

  return [
    product.name,
    product.creatorOrAuthor,
    product.brandPublisherLabel,
    product.barcode,
    product.sku,
    product.isbn,
    product.notes,
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function numberInputValue(value: number | null) {
  return value === null ? "" : String(value);
}

function ProductForm({
  categories,
  mode,
  onClose,
}: {
  categories: Category[];
  mode: Exclude<FormMode, { type: "closed" }>;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEditing = mode.type === "edit";
  const product = mode.type === "edit" ? mode.product : null;
  const action = product ? updateProduct.bind(null, product.id) : createProduct;
  const [state, formAction, pending] = useActionState(
    action,
    initialProductFormState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-800">
            {isEditing ? "Editar producto" : "Añadir producto"}
          </p>
          <h3 className="mt-2 text-2xl font-bold text-stone-950">
            {product ? product.name : "Nueva ficha de producto"}
          </h3>
          <p className="mt-1 text-sm text-stone-700">
            {isEditing
              ? "El stock actual se muestra solo como lectura."
              : "El stock inicial creará el primer movimiento de inventario."}
          </p>
        </div>
        <Button type="button" variant="secondary" className="px-4 py-2" onClick={onClose}>
          Cerrar
        </Button>
      </div>

      {state.message ? (
        <p
          className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${
            state.status === "success"
              ? "bg-emerald-100 text-emerald-900"
              : "bg-red-100 text-red-900"
          }`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <form action={formAction} className="mt-5 grid gap-4 lg:grid-cols-2">
        <Field label="Nombre" error={state.fieldErrors.name} required>
          <input
            name="name"
            defaultValue={product?.name ?? ""}
            required
            className="field-control"
          />
        </Field>

        <Field label="Categoría" error={state.fieldErrors.categoryId} required>
          <select
            name="categoryId"
            defaultValue={product?.categoryId ?? ""}
            required
            className="field-control"
          >
            <option value="">Selecciona una categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Precio" error={state.fieldErrors.price} required>
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product?.price ?? ""}
            required
            className="field-control"
          />
        </Field>

        {isEditing ? (
          <Field label="Stock actual">
            <input
              value={product?.currentStock ?? 0}
              readOnly
              aria-readonly="true"
              className="field-control bg-stone-100 font-bold text-stone-700"
            />
          </Field>
        ) : (
          <Field label="Stock inicial" error={state.fieldErrors.initialStock} required>
            <input
              name="initialStock"
              type="number"
              min="0"
              step="1"
              defaultValue="0"
              required
              className="field-control"
            />
          </Field>
        )}

        <Field label="Creador / autor">
          <input
            name="creatorOrAuthor"
            defaultValue={product?.creatorOrAuthor ?? ""}
            className="field-control"
          />
        </Field>
        <Field label="Editorial / marca / sello">
          <input
            name="brandPublisherLabel"
            defaultValue={product?.brandPublisherLabel ?? ""}
            className="field-control"
          />
        </Field>
        <Field label="Coste" error={state.fieldErrors.costPrice}>
          <input
            name="costPrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue={numberInputValue(product?.costPrice ?? null)}
            className="field-control"
          />
        </Field>
        <Field label="Estado" error={state.fieldErrors.condition}>
          <select
            name="condition"
            defaultValue={product?.condition ?? ""}
            className="field-control"
          >
            <option value="">Sin especificar</option>
            {conditionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Proveedor">
          <input
            name="supplier"
            defaultValue={product?.supplier ?? ""}
            className="field-control"
          />
        </Field>
        <Field label="Código de barras">
          <input
            name="barcode"
            defaultValue={product?.barcode ?? ""}
            className="field-control"
          />
        </Field>
        <Field label="SKU">
          <input name="sku" defaultValue={product?.sku ?? ""} className="field-control" />
        </Field>
        <Field label="ISBN">
          <input
            name="isbn"
            defaultValue={product?.isbn ?? ""}
            className="field-control"
          />
        </Field>
        <Field label="Notas" className="lg:col-span-2">
          <textarea
            name="notes"
            defaultValue={product?.notes ?? ""}
            className="field-control min-h-28"
          />
        </Field>

        <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="px-5 py-3" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="px-5 py-3" disabled={pending}>
            {pending ? "Guardando…" : "Guardar producto"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  required = false,
  className = "",
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-semibold text-stone-800">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </span>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1 text-sm font-semibold text-red-800">{error}</p> : null}
    </label>
  );
}

export function ProductList({ categories, products, loadError }: ProductListProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [condition, setCondition] = useState<ProductConditionValue | "Todas">("Todas");
  const [stockFilter, setStockFilter] =
    useState<(typeof stockFilters)[number]["value"]>("all");
  const [formMode, setFormMode] = useState<FormMode>({ type: "closed" });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ?? products[0] ?? null;

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = category === "Todas" || product.categoryId === category;
      const matchesCondition = condition === "Todas" || product.condition === condition;
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "in" && product.currentStock > 0) ||
        (stockFilter === "out" && product.currentStock === 0);

      return (
        matchesCategory &&
        matchesCondition &&
        matchesStock &&
        productMatchesSearch(product, search)
      );
    });
  }, [category, condition, products, search, stockFilter]);

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-200 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-bold text-stone-950">Inventario real</h3>
          <p className="mt-1 text-sm text-stone-600">
            Busca por nombre, creador, editorial, sello, código de barras, SKU,
            ISBN o notas.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="w-full px-4 py-2 text-stone-800 sm:w-auto"
          onClick={() => setFormMode({ type: "create" })}
        >
          Añadir producto
        </Button>
      </div>

      {loadError ? (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">
          No se pudo cargar Supabase: {loadError}
        </p>
      ) : null}

      {formMode.type !== "closed" ? (
        <div className="mt-5">
          <ProductForm
            categories={categories}
            mode={formMode}
            onClose={() => setFormMode({ type: "closed" })}
          />
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_190px_170px]">
        <label className="block">
          <span className="text-sm font-semibold text-stone-800">Buscar producto</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ej. Borges, Factory, SKU o ISBN"
            className="field-control mt-2"
            type="search"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-stone-800">Categoría</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="field-control mt-2"
          >
            <option value="Todas">Todas</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-stone-800">Estado</span>
          <select
            value={condition}
            onChange={(event) =>
              setCondition(event.target.value as ProductConditionValue | "Todas")
            }
            className="field-control mt-2"
          >
            <option value="Todas">Todas</option>
            {conditionOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-stone-800">Disponibilidad</span>
          <select
            value={stockFilter}
            onChange={(event) =>
              setStockFilter(
                event.target.value as (typeof stockFilters)[number]["value"],
              )
            }
            className="field-control mt-2"
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
            <span>Stock actual</span>
            <span className="text-right">Precio</span>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="divide-y divide-stone-200 bg-white">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedProductId(product.id)}
                  className={`grid w-full gap-3 px-4 py-4 text-left transition hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-stone-800 md:grid-cols-[minmax(0,1.4fr)_0.9fr_0.8fr_0.7fr] md:items-center ${
                    selectedProduct?.id === product.id ? "bg-amber-50" : "bg-white"
                  }`}
                  aria-pressed={selectedProduct?.id === product.id}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-950">{product.name}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      {[product.creatorOrAuthor, product.brandPublisherLabel]
                        .filter(Boolean)
                        .join(" · ") || "Sin creador ni marca"}
                    </p>
                    <p className="mt-1 text-xs font-medium text-stone-500">
                      {product.sku ? `SKU ${product.sku}` : "Sin SKU"} ·{" "}
                      {product.isbn
                        ? `ISBN ${product.isbn}`
                        : product.barcode
                          ? `EAN ${product.barcode}`
                          : "Sin EAN"}
                    </p>
                  </div>
                  <div className="text-sm text-stone-700">
                    <span className="font-semibold md:hidden">Categoría: </span>
                    {product.categoryName}
                  </div>
                  <div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${stockBadgeClasses(product.currentStock)}`}
                    >
                      {product.currentStock > 0
                        ? `${product.currentStock} en stock`
                        : "Sin stock"}
                    </span>
                  </div>
                  <div className="font-bold text-stone-950 md:text-right">
                    {formatCurrency(product.price)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white px-6 py-12 text-center">
              <p className="text-lg font-bold text-stone-950">
                {products.length === 0
                  ? "Todavía no hay productos"
                  : "No hay productos que coincidan"}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
                {products.length === 0
                  ? "Añade el primer producto para cargar el inventario desde Supabase."
                  : "Prueba con otro término de búsqueda o cambia los filtros de categoría, estado y disponibilidad."}
              </p>
              {products.length === 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-5 px-4 py-2"
                  onClick={() => setFormMode({ type: "create" })}
                >
                  Añadir producto
                </Button>
              ) : (
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
              )}
            </div>
          )}
        </div>

        <aside
          className="rounded-2xl border border-stone-200 bg-stone-50 p-5"
          aria-label="Detalle del producto"
        >
          {selectedProduct ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                    Detalle
                  </p>
                  <h4 className="mt-3 text-2xl font-bold text-stone-950">
                    {selectedProduct.name}
                  </h4>
                  <p className="mt-1 text-stone-700">
                    {selectedProduct.creatorOrAuthor || "Sin creador"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3 py-2 text-sm"
                  onClick={() => setFormMode({ type: "edit", product: selectedProduct })}
                >
                  Editar producto
                </Button>
              </div>

              <dl className="mt-5 grid gap-3 text-sm">
                <DetailRow label="Categoría" value={selectedProduct.categoryName} />
                <DetailRow
                  label="Editorial / marca / sello"
                  value={selectedProduct.brandPublisherLabel || "Sin especificar"}
                />
                <DetailRow
                  label="Estado"
                  value={
                    selectedProduct.condition
                      ? conditionLabels[selectedProduct.condition]
                      : "Sin especificar"
                  }
                />
                <DetailRow label="Precio" value={formatCurrency(selectedProduct.price)} strong />
                <DetailRow
                  label="Coste"
                  value={
                    selectedProduct.costPrice === null
                      ? "Sin especificar"
                      : formatCurrency(selectedProduct.costPrice)
                  }
                />
                <DetailRow
                  label="Stock actual"
                  value={`${selectedProduct.currentStock} unidades`}
                />
                <DetailRow
                  label="Proveedor"
                  value={selectedProduct.supplier || "Sin especificar"}
                />
                <div className="rounded-xl bg-white p-3 ring-1 ring-stone-200">
                  <dt className="font-semibold text-stone-600">Códigos</dt>
                  <dd className="mt-2 space-y-1 text-stone-950">
                    <p>SKU: {selectedProduct.sku || "Sin SKU"}</p>
                    <p>Código de barras: {selectedProduct.barcode || "Sin código"}</p>
                    <p>ISBN: {selectedProduct.isbn || "Sin ISBN"}</p>
                  </dd>
                </div>
                <div className="rounded-xl bg-white p-3 ring-1 ring-stone-200">
                  <dt className="font-semibold text-stone-600">Notas</dt>
                  <dd className="mt-2 text-stone-950">
                    {selectedProduct.notes || "Sin notas"}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                Detalle
              </p>
              <p className="mt-3 text-lg font-bold text-stone-950">
                Selecciona un producto
              </p>
              <p className="mt-2 text-sm text-stone-600">
                Cuando haya productos cargados, aquí verás sus datos reales.
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function DetailRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 rounded-xl bg-white p-3 ring-1 ring-stone-200">
      <dt className="font-semibold text-stone-600">{label}</dt>
      <dd className={`text-right text-stone-950 ${strong ? "font-bold" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
