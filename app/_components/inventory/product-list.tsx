"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type {
  Category,
  Product,
  ProductConditionValue,
} from "@/lib/inventory/types";
import {
  createProduct,
  getProductStockMovements,
  correctProductStock,
  updateProduct,
} from "@/app/(protected)/inventory/actions";
import { initialProductFormState } from "@/app/(protected)/inventory/product-form-state";
import { Button } from "../ui/button";
import { PageHeader } from "../ui/page-header";

const conditionLabels: Record<ProductConditionValue, string> = {
  new: "Nuevo",
  used_very_good: "Como nuevo",
  used_good: "Segunda mano",
};

const conditionOptions: Array<{ value: ProductConditionValue; label: string }> =
  [
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

type StockMovement = {
  id: string;
  type: string;
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  reason: string | null;
  createdAt: string | null;
};

type StockCorrectionFormState = {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Partial<Record<"adjustment" | "reason", string>>;
  updated?: { productId: string; currentStock: number } | null;
};

const initialStockCorrectionState: StockCorrectionFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};

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
  onOpenStockCorrection,
}: {
  categories: Category[];
  mode: Exclude<FormMode, { type: "closed" }>;
  onClose: () => void;
  onOpenStockCorrection: (product: Product) => void;
}) {
  const router = useRouter();
  const isEditing = mode.type === "edit";
  const product = mode.type === "edit" ? mode.product : null;
  const action = isEditing ? updateProduct : createProduct;
  const [state, formAction, pending] = useActionState(
    action,
    initialProductFormState,
  );
  const fieldErrors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-amber-800">
            {isEditing ? "Editar producto" : "Añadir producto"}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-stone-950">
            {product ? product.name : "Nueva ficha de producto"}
          </h3>
          <p className="mt-1 text-sm text-stone-700">
            {isEditing
              ? "El stock actual se muestra solo como lectura."
              : "El stock inicial creará el primer movimiento de inventario."}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
        >
          Cerrar
        </Button>
      </div>

      {state.message ? (
        <p
          className={`mt-4 rounded-md px-3 py-2 text-sm font-medium ${
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
        {product ? (
          <input type="hidden" name="productId" value={product.id} />
        ) : null}
        <Field label="Nombre" error={fieldErrors.name} required>
          <input
            name="name"
            defaultValue={product?.name ?? ""}
            required
            className="field-control"
          />
        </Field>

        <Field label="Categoría" error={fieldErrors.categoryId} required>
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

        <Field label="Precio" error={fieldErrors.price} required>
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
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-sm font-semibold text-stone-800">Stock actual</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xl font-semibold tabular-nums text-stone-950">
                {product?.currentStock ?? 0}
              </p>
              {product ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onOpenStockCorrection(product)}
                >
                  Corregir stock
                </Button>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-stone-600">
              Para cambiar el stock, usá Corregir stock.
            </p>
          </div>
        ) : (
          <Field
            label="Stock inicial"
            error={fieldErrors.initialStock}
            required
          >
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
        <Field label="Coste" error={fieldErrors.costPrice}>
          <input
            name="costPrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue={numberInputValue(product?.costPrice ?? null)}
            className="field-control"
          />
        </Field>
        <Field label="Estado" error={fieldErrors.condition}>
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
          <input
            name="sku"
            defaultValue={product?.sku ?? ""}
            className="field-control"
          />
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
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
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
      {error ? (
        <p className="mt-1 text-sm font-semibold text-red-800">{error}</p>
      ) : null}
    </label>
  );
}

function formatMovementType(type: string) {
  switch (type) {
    case "initial":
      return "Stock inicial";
    case "sale":
      return "Venta";
    case "manual_correction":
      return "Corrección manual";
    case "restock":
      return "Reposición";
    case "return":
      return "Devolución";
    default:
      return type;
  }
}

function formatMovementQuantity(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function StockCorrectionModal({
  open,
  product,
  onClose,
  onSuccess,
}: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSuccess: (update: { productId: string; currentStock: number } | null) => void;
}) {
  const [state, formAction, pending] = useActionState(
    correctProductStock,
    initialStockCorrectionState,
  );
  const onCloseRef = useRef(onClose);
  const onSuccessRef = useRef(onSuccess);
  const didHandleSuccessRef = useRef(false);

  const currentStock = product?.currentStock ?? 0;
  const fieldErrors = state.fieldErrors ?? {};
  const [adjustmentValue, setAdjustmentValue] = useState<string>("");
  const [reasonValue, setReasonValue] = useState<string>("");
  const adjustmentNumber = Number(adjustmentValue);
  const adjustment =
    adjustmentValue.trim() === "" || Number.isNaN(adjustmentNumber)
      ? null
      : adjustmentNumber;
  const resultingStock =
    adjustment === null ? currentStock : currentStock + adjustment;

  useEffect(() => {
    onCloseRef.current = onClose;
    onSuccessRef.current = onSuccess;
  }, [onClose, onSuccess]);

  useEffect(() => {
    if (state.status === "success" && !didHandleSuccessRef.current) {
      didHandleSuccessRef.current = true;
      onSuccessRef.current(state.updated ?? null);
      onCloseRef.current();
    }
  }, [state.status, state.updated]);

  if (!open || !product) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Corregir stock"
    >
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-lg ring-1 ring-stone-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-amber-700">
              Corrección de stock
            </p>
            <h3 className="mt-2 text-xl font-semibold text-stone-950">
              {product.name}
            </h3>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cerrar
          </Button>
        </div>

        {state.message ? (
          <p
            className={`mt-4 rounded-md px-3 py-2 text-sm font-medium ${
              state.status === "success"
                ? "bg-emerald-100 text-emerald-900"
                : "bg-red-100 text-red-900"
            }`}
            role="status"
          >
            {state.message}
          </p>
        ) : null}

        <form action={formAction} className="mt-5 grid gap-4">
          <input type="hidden" name="productId" value={product.id} />

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-stone-50 p-3 ring-1 ring-stone-200">
              <p className="text-sm font-semibold text-stone-700">
                Stock actual
              </p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-stone-950">
                {currentStock}
              </p>
            </div>
            <div className="rounded-lg bg-stone-50 p-3 ring-1 ring-stone-200">
              <p className="text-sm font-semibold text-stone-700">Ajuste</p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-stone-950">
                {adjustment === null
                  ? "—"
                  : formatMovementQuantity(adjustment)}
              </p>
            </div>
            <div className="rounded-lg bg-stone-50 p-3 ring-1 ring-stone-200">
              <p className="text-sm font-semibold text-stone-700">
                Stock resultante
              </p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-stone-950">
                {resultingStock}
              </p>
            </div>
          </div>

          <Field label="Ajuste" error={fieldErrors.adjustment} required>
            <input
              name="adjustment"
              type="number"
              step="1"
              value={adjustmentValue}
              onChange={(event) => setAdjustmentValue(event.target.value)}
              className="field-control"
              placeholder="Ej. -1 o 3"
            />
          </Field>

          <Field label="Motivo" error={fieldErrors.reason} required>
            <textarea
              name="reason"
              value={reasonValue}
              onChange={(event) => setReasonValue(event.target.value)}
              className="field-control min-h-24"
              placeholder="Ej. Recuento, dañado, pérdida, devolución…"
            />
          </Field>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar corrección"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProductList({
  categories,
  products,
  loadError,
}: ProductListProps) {
  const [stockOverrides, setStockOverrides] = useState<Record<string, number>>(
    {},
  );
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [condition, setCondition] = useState<ProductConditionValue | "Todas">(
    "Todas",
  );
  const [stockFilter, setStockFilter] =
    useState<(typeof stockFilters)[number]["value"]>("all");
  const [formMode, setFormMode] = useState<FormMode>({ type: "closed" });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [stockCorrectionProductId, setStockCorrectionProductId] = useState<
    string | null
  >(null);
  const [stockCorrectionOpen, setStockCorrectionOpen] = useState(false);
  const [stockCorrectionSession, setStockCorrectionSession] = useState(0);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsError, setMovementsError] = useState<string | null>(null);

  const clientProducts = useMemo(() => {
    if (Object.keys(stockOverrides).length === 0) {
      return products;
    }

    return products.map((product) => {
      const override = stockOverrides[product.id];
      return typeof override === "number"
        ? { ...product, currentStock: override }
        : product;
    });
  }, [products, stockOverrides]);

  const selectedProduct =
    selectedProductId === null
      ? null
      : clientProducts.find((product) => product.id === selectedProductId) ?? null;

  const stockCorrectionProduct =
    stockCorrectionProductId === null
      ? null
      : clientProducts.find((product) => product.id === stockCorrectionProductId) ??
        null;

  const fetchMovements = async (productId: string) => {
    try {
      setMovementsError(null);
      const result = await getProductStockMovements(productId);
      if (result.status === "success") {
        setMovements(result.movements);
        return;
      }
      setMovements([]);
      setMovementsError(result.message ?? "No se pudieron cargar los movimientos.");
    } catch {
      setMovements([]);
      setMovementsError("No se pudieron cargar los movimientos.");
    }
  };

  const openStockCorrection = (product: Product) => {
    setStockCorrectionProductId(product.id);
    setStockCorrectionOpen(true);
    setStockCorrectionSession((value) => value + 1);
  };

  const handleSelectProductId = (productId: string) => {
    setSelectedProductId(productId);
    void fetchMovements(productId);
  };

  const filteredProducts = useMemo(() => {
    return clientProducts.filter((product) => {
      const matchesCategory =
        category === "Todas" || product.categoryId === category;
      const matchesCondition =
        condition === "Todas" || product.condition === condition;
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
  }, [category, condition, clientProducts, search, stockFilter]);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Inventario"
        description="Busca por nombre, creador, editorial, sello, código de barras, SKU, ISBN o notas."
        actions={
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => setFormMode({ type: "create" })}
          >
            Añadir producto
          </Button>
        }
      />

      {loadError ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-900">
          No se pudo cargar Supabase: {loadError}
        </p>
      ) : null}

      {formMode.type !== "closed" ? (
        <div className="mt-5">
          <ProductForm
            categories={categories}
            mode={formMode}
            onClose={() => setFormMode({ type: "closed" })}
            onOpenStockCorrection={openStockCorrection}
          />
        </div>
      ) : null}

      <StockCorrectionModal
        key={stockCorrectionSession}
        open={stockCorrectionOpen}
        product={stockCorrectionProduct}
        onClose={() => {
          setStockCorrectionOpen(false);
          setStockCorrectionProductId(null);
        }}
        onSuccess={(update) => {
          if (update) {
            setStockOverrides((current) => ({
              ...current,
              [update.productId]: update.currentStock,
            }));
            void fetchMovements(update.productId);
            setSelectedProductId(update.productId);
          } else if (selectedProduct) {
            void fetchMovements(selectedProduct.id);
          }
        }}
      />

      <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_190px_170px]">
        <label className="block">
          <span className="text-sm font-semibold text-stone-800">
            Buscar producto
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ej. Borges, Factory, SKU o ISBN"
            className="field-control mt-2 text-sm"
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
            className="field-control mt-2 text-sm"
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
              setCondition(
                event.target.value as ProductConditionValue | "Todas",
              )
            }
            className="field-control mt-2 text-sm"
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
            className="field-control mt-2 text-sm"
          >
            {stockFilters.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        </div>
      </div>

      <div
        className={
          selectedProduct
            ? "mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"
            : "mt-5"
        }
      >
        <div className="overflow-hidden rounded-lg border border-stone-200">
          <div className="grid grid-cols-[minmax(0,1.4fr)_0.9fr_0.8fr_0.7fr] gap-4 bg-stone-100 px-3 py-2 text-xs font-medium text-stone-600 max-md:hidden">
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
                  onClick={() => handleSelectProductId(product.id)}
                  className={`grid w-full gap-3 px-3 py-2 text-left transition hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-stone-800 md:grid-cols-[minmax(0,1.4fr)_0.9fr_0.8fr_0.7fr] md:items-center ${
                    selectedProduct?.id === product.id
                      ? "bg-amber-50"
                      : "bg-white"
                  }`}
                  aria-pressed={selectedProduct?.id === product.id}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-950">
                      {product.name}
                    </p>
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
                      className={`inline-flex rounded-md border px-2 py-0.5 text-sm font-semibold ${stockBadgeClasses(product.currentStock)}`}
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
                  className="mt-4"
                  onClick={() => setFormMode({ type: "create" })}
                >
                  Añadir producto
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4"
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

        {selectedProduct ? (
          <aside
            className="rounded-lg border border-stone-200 bg-stone-50 p-4"
            aria-label="Detalle del producto"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="mt-2 text-lg font-semibold text-stone-950">
                  {selectedProduct.name}
                </h4>
                <p className="mt-1 text-stone-700">
                  {selectedProduct.creatorOrAuthor || "Sin creador"}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  className="whitespace-nowrap text-xs"
                  onClick={() => openStockCorrection(selectedProduct)}
                >
                  Corregir stock
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="whitespace-nowrap text-xs"
                  onClick={() =>
                    setFormMode({ type: "edit", product: selectedProduct })
                  }
                >
                  Editar producto
                </Button>
              </div>
            </div>

            <dl className="mt-4 grid gap-2 text-sm">
              <DetailRow
                label="Categoría"
                value={selectedProduct.categoryName}
              />
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
              <DetailRow
                label="Precio"
                value={formatCurrency(selectedProduct.price)}
                strong
              />
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
              <div className="rounded-md bg-white p-3 ring-1 ring-stone-200">
                <dt className="font-semibold text-stone-600">
                  Movimientos de stock
                </dt>
                <dd className="mt-3 space-y-2 text-stone-950">
                  {movementsError ? (
                    <p className="text-sm font-semibold text-red-800">
                      {movementsError}
                    </p>
                  ) : movements.length === 0 ? (
                    <p className="text-sm text-stone-600">
                      Sin movimientos para este producto.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {movements.map((movement) => (
                        <li
                          key={movement.id}
                          className="rounded-md bg-stone-50 p-3 ring-1 ring-stone-200"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-stone-900">
                                {formatMovementType(movement.type)}
                              </p>
                              <p className="mt-1 text-sm text-stone-700">
                                {movement.reason || "Sin motivo"}
                              </p>
                            </div>
                            <p className="text-sm font-bold tabular-nums text-stone-950">
                              {formatMovementQuantity(movement.quantityChange)}
                            </p>
                          </div>
                          <p className="mt-2 text-xs font-medium text-stone-600">
                            {movement.stockBefore} → {movement.stockAfter}
                            {movement.createdAt
                              ? ` · ${new Date(movement.createdAt).toLocaleString(
                                  "es-ES",
                                )}`
                              : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
              <div className="rounded-md bg-white p-3 ring-1 ring-stone-200">
                <dt className="font-semibold text-stone-600">Códigos</dt>
                <dd className="mt-2 space-y-1 text-stone-950">
                  <p>SKU: {selectedProduct.sku || "Sin SKU"}</p>
                  <p>
                    Código de barras:{" "}
                    {selectedProduct.barcode || "Sin código"}
                  </p>
                  <p>ISBN: {selectedProduct.isbn || "Sin ISBN"}</p>
                </dd>
              </div>
              <div className="rounded-md bg-white p-3 ring-1 ring-stone-200">
                <dt className="font-semibold text-stone-600">Notas</dt>
                <dd className="mt-2 text-stone-950">
                  {selectedProduct.notes || "Sin notas"}
                </dd>
              </div>
            </dl>
          </aside>
        ) : null}
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
    <div className="flex justify-between gap-4 rounded-md bg-white px-3 py-2 ring-1 ring-stone-200">
      <dt className="font-semibold text-stone-600">{label}</dt>
      <dd className={`text-right text-stone-950 ${strong ? "font-bold" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
