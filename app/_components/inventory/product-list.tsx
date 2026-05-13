'use client';

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import type {
  Category,
  Product,
  ProductConditionValue,
} from '@/lib/inventory/types';
import {
  getProductStockMovements,
  correctProductStock,
  loadInventoryProductsPage,
  setProductActiveStatus,
} from '@/app/(protected)/inventory/actions';
import { INVENTORY_PAGE_SIZE } from '@/lib/inventory/pagination';
import { Button } from '../ui/button';
import { PageHeader } from '../ui/page-header';
import type {
  InventoryStatusFilter,
  InventoryStockFilter,
} from '@/lib/inventory/data';

const conditionLabels: Record<ProductConditionValue, string> = {
  new: 'Nuevo',
  used_good: 'Segunda mano',
};

const conditionOptions: Array<{ value: ProductConditionValue; label: string }> =
  [
    { value: 'new', label: 'Nuevo' },
    { value: 'used_good', label: 'Segunda mano' },
  ];

const stockFilters = [
  { label: 'Todo el stock', value: 'all' },
  { label: 'En stock', value: 'in' },
  { label: 'Sin stock', value: 'out' },
] as const;

type ProductListProps = {
  categories: Category[];
  initialProducts: Product[];
  initialHasMore: boolean;
  loadError: string | null;
  statusFilter: InventoryStatusFilter;
  deepLinkSelection?: string | null;
  deepLinkOpenStockCorrection?: boolean;
  deepLinkProduct?: Product | null;
};

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
  status: 'idle' | 'success' | 'error';
  message: string | null;
  fieldErrors: Partial<Record<'adjustment' | 'reason', string>>;
  updated?: { productId: string; currentStock: number } | null;
};

const initialStockCorrectionState: StockCorrectionFormState = {
  status: 'idle',
  message: null,
  fieldErrors: {},
};

type InventoryListCache = {
  version: 1;
  statusFilter: InventoryStatusFilter;
  products: Product[];
  hasMore: boolean;
  searchInput: string;
  category: string;
  condition: ProductConditionValue | 'Todas';
  stockFilter: InventoryStockFilter;
};

const INVENTORY_LIST_CACHE_PREFIX = 'inventory:list:v1';

function getInventoryListCacheKey(statusFilter: InventoryStatusFilter) {
  return `${INVENTORY_LIST_CACHE_PREFIX}:${statusFilter}`;
}

function readInventoryListCache(
  statusFilter: InventoryStatusFilter,
): InventoryListCache | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(getInventoryListCacheKey(statusFilter));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<InventoryListCache>;
    if (
      parsed.version !== 1 ||
      parsed.statusFilter !== statusFilter ||
      !Array.isArray(parsed.products) ||
      typeof parsed.hasMore !== 'boolean'
    ) {
      return null;
    }
    return {
      version: 1,
      statusFilter,
      products: parsed.products as Product[],
      hasMore: parsed.hasMore,
      searchInput: typeof parsed.searchInput === 'string' ? parsed.searchInput : '',
      category: typeof parsed.category === 'string' ? parsed.category : 'Todas',
      condition:
        parsed.condition === 'new' ||
        parsed.condition === 'used_good' ||
        parsed.condition === 'Todas'
          ? parsed.condition
          : 'Todas',
      stockFilter:
        parsed.stockFilter === 'in' ||
        parsed.stockFilter === 'out' ||
        parsed.stockFilter === 'all'
          ? parsed.stockFilter
          : 'all',
    };
  } catch {
    return null;
  }
}

function writeInventoryListCache(cache: InventoryListCache) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.setItem(
      getInventoryListCacheKey(cache.statusFilter),
      JSON.stringify(cache),
    );
  } catch {
    // Ignore write errors (private mode/storage quota).
  }
}

function stockBadgeClasses(stock: number) {
  if (stock === 0) {
    return 'border-red-200 bg-red-50 text-red-800';
  }

  if (stock === 1) {
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatMovementType(type: string) {
  switch (type) {
    case 'initial':
      return 'Stock inicial';
    case 'sale':
      return 'Venta';
    case 'manual_correction':
      return 'Corrección manual';
    case 'restock':
      return 'Reposición';
    case 'return':
      return 'Devolución';
    default:
      return type;
  }
}

function formatMovementQuantity(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function Field({
  label,
  error,
  required = false,
  className = '',
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

function StockCorrectionModal({
  open,
  product,
  onClose,
  onSuccess,
}: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSuccess: (
    update: { productId: string; currentStock: number } | null,
  ) => void;
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
  const [adjustmentValue, setAdjustmentValue] = useState<string>('');
  const [reasonValue, setReasonValue] = useState<string>('');
  const adjustmentNumber = Number(adjustmentValue);
  const adjustment =
    adjustmentValue.trim() === '' || Number.isNaN(adjustmentNumber)
      ? null
      : adjustmentNumber;
  const resultingStock =
    adjustment === null ? currentStock : currentStock + adjustment;

  useEffect(() => {
    onCloseRef.current = onClose;
    onSuccessRef.current = onSuccess;
  }, [onClose, onSuccess]);

  useEffect(() => {
    if (state.status === 'success' && !didHandleSuccessRef.current) {
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
            disabled={pending}
          >
            Cerrar
          </Button>
        </div>

        {state.message ? (
          <p
            className={`mt-4 rounded-md px-3 py-2 text-sm font-medium ${
              state.status === 'success'
                ? 'bg-emerald-100 text-emerald-900'
                : 'bg-red-100 text-red-900'
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
                {adjustment === null ? '—' : formatMovementQuantity(adjustment)}
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
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando…' : 'Guardar corrección'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProductList({
  categories,
  initialProducts,
  initialHasMore,
  loadError,
  statusFilter,
  deepLinkSelection,
  deepLinkOpenStockCorrection = false,
  deepLinkProduct = null,
}: ProductListProps) {
  const router = useRouter();
  const initialCache = readInventoryListCache(statusFilter);
  const normalizedDeepLinkSelection = deepLinkSelection?.trim() ?? null;
  const canOpenDeepLinkStockCorrection =
    deepLinkOpenStockCorrection && deepLinkProduct?.isActive === true;
  const [stockOverrides, setStockOverrides] = useState<Record<string, number>>(
    {},
  );
  const [searchInput, setSearchInput] = useState(initialCache?.searchInput ?? '');
  const [category, setCategory] = useState<string>(initialCache?.category ?? 'Todas');
  const [condition, setCondition] = useState<ProductConditionValue | 'Todas'>(
    initialCache?.condition ?? 'Todas',
  );
  const [stockFilter, setStockFilter] =
    useState<(typeof stockFilters)[number]['value']>(
      initialCache?.stockFilter ?? 'all',
    );
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    normalizedDeepLinkSelection,
  );
  const [stockCorrectionProductId, setStockCorrectionProductId] = useState<
    string | null
  >(canOpenDeepLinkStockCorrection ? normalizedDeepLinkSelection : null);
  const [stockCorrectionOpen, setStockCorrectionOpen] = useState(
    canOpenDeepLinkStockCorrection,
  );
  const [stockCorrectionSession, setStockCorrectionSession] = useState(
    canOpenDeepLinkStockCorrection ? 1 : 0,
  );
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsError, setMovementsError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>(
    initialCache?.products ?? initialProducts,
  );
  const [hasMore, setHasMore] = useState<boolean>(
    initialCache?.hasMore ?? initialHasMore,
  );
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const fetchRequestIdRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const filtersRef = useRef({
    search: '',
    category: 'Todas' as string,
    condition: 'Todas' as ProductConditionValue | 'Todas',
    stockFilter: 'all' as InventoryStockFilter,
    statusFilter,
  });

  useEffect(() => {
    filtersRef.current = {
      search: searchInput.trim(),
      category,
      condition,
      stockFilter,
      statusFilter,
    };
  }, [searchInput, category, condition, stockFilter, statusFilter]);

  useEffect(() => {
    writeInventoryListCache({
      version: 1,
      statusFilter,
      products,
      hasMore,
      searchInput,
      category,
      condition,
      stockFilter,
    });
  }, [statusFilter, products, hasMore, searchInput, category, condition, stockFilter]);

  const fetchPage = useCallback(
    async (params: {
      search: string;
      category: string;
      condition: ProductConditionValue | 'Todas';
      stockFilter: InventoryStockFilter;
      statusFilter: InventoryStatusFilter;
      offset: number;
      append: boolean;
    }) => {
      const requestId = ++fetchRequestIdRef.current;
      setPageLoading(true);
      setPageError(null);

      const result = await loadInventoryProductsPage({
        status: params.statusFilter,
        search: params.search,
        categoryId: params.category === 'Todas' ? null : params.category,
        condition: params.condition === 'Todas' ? null : params.condition,
        stockFilter: params.stockFilter,
        offset: params.offset,
      });

      if (requestId !== fetchRequestIdRef.current) {
        return;
      }

      if (result.status === 'error') {
        setPageError(result.message);
        if (!params.append) {
          setProducts([]);
          setHasMore(false);
        }
        setPageLoading(false);
        return;
      }

      setProducts((current) =>
        params.append ? [...current, ...result.products] : result.products,
      );
      setHasMore(result.hasMore);
      setPageLoading(false);
    },
    [],
  );

  const cancelPendingDebounce = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const refetchFirstPageNow = useCallback(
    (overrides?: Partial<typeof filtersRef.current>) => {
      cancelPendingDebounce();
      const params = { ...filtersRef.current, ...overrides };
      void fetchPage({ ...params, offset: 0, append: false });
    },
    [cancelPendingDebounce, fetchPage],
  );

  const refetchFirstPageDebounced = useCallback(
    (overrides?: Partial<typeof filtersRef.current>) => {
      cancelPendingDebounce();
      const snapshot = { ...filtersRef.current, ...overrides };
      debounceTimerRef.current = window.setTimeout(() => {
        debounceTimerRef.current = null;
        void fetchPage({ ...snapshot, offset: 0, append: false });
      }, 250);
    },
    [cancelPendingDebounce, fetchPage],
  );

  useEffect(() => () => cancelPendingDebounce(), [cancelPendingDebounce]);

  useEffect(() => {
    if (!hasMore || pageLoading) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void fetchPage({
            ...filtersRef.current,
            offset: products.length,
            append: true,
          });
        }
      },
      { rootMargin: '200px 0px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, pageLoading, products.length, fetchPage]);

  const clientProducts = useMemo(() => {
    const list =
      deepLinkProduct && !products.some((p) => p.id === deepLinkProduct.id)
        ? [deepLinkProduct, ...products]
        : products;

    if (Object.keys(stockOverrides).length === 0) {
      return list;
    }

    return list.map((product) => {
      const override = stockOverrides[product.id];
      return typeof override === 'number'
        ? { ...product, currentStock: override }
        : product;
    });
  }, [deepLinkProduct, products, stockOverrides]);

  const selectedProduct =
    selectedProductId === null
      ? null
      : (clientProducts.find((product) => product.id === selectedProductId) ??
        (deepLinkProduct?.id === selectedProductId ? deepLinkProduct : null));

  const stockCorrectionProduct =
    stockCorrectionProductId === null
      ? null
      : (clientProducts.find(
          (product) => product.id === stockCorrectionProductId,
        ) ??
        (deepLinkProduct?.id === stockCorrectionProductId
          ? deepLinkProduct
          : null));

  const fetchMovements = useCallback(async (productId: string) => {
    try {
      setMovementsError(null);
      const result = await getProductStockMovements(productId);
      if (result.status === 'success') {
        setMovements(result.movements);
        return;
      }
      setMovements([]);
      setMovementsError(
        result.message ?? 'No se pudieron cargar los movimientos.',
      );
    } catch {
      setMovements([]);
      setMovementsError('No se pudieron cargar los movimientos.');
    }
  }, []);

  const openStockCorrection = useCallback((product: Product) => {
    setStockCorrectionProductId(product.id);
    setStockCorrectionOpen(true);
    setStockCorrectionSession((value) => value + 1);
  }, []);

  const handleSelectProductId = useCallback(
    (productId: string) => {
      setSelectedProductId(productId);
      void fetchMovements(productId);
    },
    [fetchMovements],
  );

  const reloadAfterMutation = useCallback(() => {
    refetchFirstPageNow();
  }, [refetchFirstPageNow]);

  useEffect(() => {
    if (!deepLinkSelection && !deepLinkOpenStockCorrection) {
      return;
    }
    router.replace(`/inventory?estado=${statusFilter}`);
  }, [deepLinkOpenStockCorrection, deepLinkSelection, router, statusFilter]);

  useEffect(() => {
    if (
      !canOpenDeepLinkStockCorrection ||
      !normalizedDeepLinkSelection ||
      !deepLinkProduct
    ) {
      return;
    }
    const handle = window.setTimeout(() => {
      void fetchMovements(normalizedDeepLinkSelection);
    }, 0);
    return () => window.clearTimeout(handle);
  }, [
    canOpenDeepLinkStockCorrection,
    deepLinkProduct,
    fetchMovements,
    normalizedDeepLinkSelection,
  ]);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Inventario"
        actions={
          <Button
            type="button"
            onClick={() => router.push(`/inventory/new?estado=${statusFilter}`)}
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

      {pageError ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-900">
          {pageError}
        </p>
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
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_190px_170px_170px]">
          <label className="block">
            <span className="text-sm font-semibold text-stone-800">
              Buscar producto
            </span>
            <input
              value={searchInput}
              onChange={(event) => {
                const nextValue = event.target.value;
                setSearchInput(nextValue);
                refetchFirstPageDebounced({ search: nextValue.trim() });
              }}
              placeholder="Ej. Borges, Factory, SKU o ISBN"
              className="field-control mt-2 text-sm"
              type="search"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-stone-800">
              Visibilidad
            </span>
            <select
              value={statusFilter}
              onChange={(event) => {
                const value = event.target.value as InventoryStatusFilter;
                setSelectedProductId(null);
                setMovements([]);
                setMovementsError(null);
                router.replace(`/inventory?estado=${value}`);
              }}
              className="field-control mt-2 text-sm"
            >
              <option value="active">Activos</option>
              <option value="archived">Archivados</option>
              <option value="all">Todos</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-stone-800">
              Categoría
            </span>
            <select
              value={category}
              onChange={(event) => {
                const nextValue = event.target.value;
                setCategory(nextValue);
                refetchFirstPageNow({ category: nextValue });
              }}
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
              onChange={(event) => {
                const nextValue = event.target.value as
                  | ProductConditionValue
                  | 'Todas';
                setCondition(nextValue);
                refetchFirstPageNow({ condition: nextValue });
              }}
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
              onChange={(event) => {
                const nextValue = event.target
                  .value as (typeof stockFilters)[number]['value'];
                setStockFilter(nextValue);
                refetchFirstPageNow({ stockFilter: nextValue });
              }}
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
            ? 'mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]'
            : 'mt-5'
        }
      >
        <div className="overflow-hidden rounded-lg border border-stone-200">
          <div className="grid grid-cols-[minmax(0,1.4fr)_0.9fr_0.8fr_0.7fr] gap-4 bg-stone-100 px-3 py-2 text-xs font-medium text-stone-600 max-md:hidden">
            <span>Producto</span>
            <span>Categoría</span>
            <span>Stock actual</span>
            <span className="text-right">Precio</span>
          </div>

          {clientProducts.length > 0 ? (
            <div className="divide-y divide-stone-200 bg-white">
              {clientProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelectProductId(product.id)}
                  className={`grid w-full gap-3 px-3 py-2 text-left transition hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-stone-800 md:grid-cols-[minmax(0,1.4fr)_0.9fr_0.8fr_0.7fr] md:items-center ${
                    selectedProduct?.id === product.id
                      ? 'bg-amber-50'
                      : 'bg-white'
                  }`}
                  aria-pressed={selectedProduct?.id === product.id}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-stone-950">
                        {product.name}
                      </p>
                      {product.isActive !== true ? (
                        <span className="inline-flex rounded-md border border-stone-300 bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700">
                          Archivado
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-stone-600">
                      {[product.creatorOrAuthor, product.brandPublisherLabel]
                        .filter(Boolean)
                        .join(' · ') || 'Sin creador ni marca'}
                    </p>
                    <p className="mt-1 text-xs font-medium text-stone-500">
                      {product.sku ? `SKU ${product.sku}` : 'Sin SKU'} ·{' '}
                      {product.isbn
                        ? `ISBN ${product.isbn}`
                        : product.barcode
                          ? `EAN ${product.barcode}`
                          : 'Sin EAN'}
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
                        : 'Sin stock'}
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
                {pageLoading
                  ? 'Cargando productos…'
                  : 'No hay productos que coincidan'}
              </p>
              {!pageLoading ? (
                <>
                  <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
                    Prueba con otro término de búsqueda o cambia los filtros de
                    categoría, estado y disponibilidad.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-4"
                    onClick={() => {
                      setSearchInput('');
                      setCategory('Todas');
                      setCondition('Todas');
                      setStockFilter('all');
                      refetchFirstPageNow({
                        search: '',
                        category: 'Todas',
                        condition: 'Todas',
                        stockFilter: 'all',
                      });
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </>
              ) : null}
            </div>
          )}

          {hasMore || pageLoading ? (
            <div
              ref={sentinelRef}
              className="flex flex-col items-center gap-2 bg-white px-3 py-3"
            >
              {pageLoading ? (
                <p className="text-sm font-medium text-stone-600">
                  Cargando productos…
                </p>
              ) : hasMore ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="text-sm"
                  onClick={() =>
                    void fetchPage({
                      ...filtersRef.current,
                      offset: products.length,
                      append: true,
                    })
                  }
                >
                  Cargar más
                </Button>
              ) : null}
            </div>
          ) : null}

          {!hasMore && !pageLoading && clientProducts.length >= INVENTORY_PAGE_SIZE ? (
            <p className="bg-white px-3 py-3 text-center text-xs font-medium text-stone-500">
              No hay más productos.
            </p>
          ) : null}
        </div>

        {selectedProduct ? (
          <aside
            className="rounded-lg border border-stone-200 bg-stone-50 p-4"
            aria-label="Detalle del producto"
          >
            {selectedProduct.isActive !== true ? (
              <div className="rounded-md border border-stone-200 bg-white p-3">
                <p className="text-sm font-semibold text-stone-800">
                  Este producto está archivado
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  Archivar este producto lo ocultará del inventario normal y de
                  nuevas ventas, pero conservará su historial.
                </p>
              </div>
            ) : null}
            <div className="grid gap-3">
              <div className="min-w-0">
                <h4 className="mt-2 text-lg font-semibold text-stone-950">
                  {selectedProduct.name}
                </h4>
                <p className="mt-1 text-stone-700">
                  {selectedProduct.creatorOrAuthor || 'Sin creador'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs"
                  onClick={() => openStockCorrection(selectedProduct)}
                  disabled={selectedProduct.isActive !== true}
                >
                  Corregir stock
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs"
                  onClick={() =>
                    router.push(
                      `/inventory/${selectedProduct.id}/edit?estado=${statusFilter}`,
                    )
                  }
                >
                  Editar producto
                </Button>
                {selectedProduct.isActive === true ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs"
                    onClick={async () => {
                      const confirmed = window.confirm(
                        'Archivar este producto lo ocultará del inventario normal y de nuevas ventas, pero conservará su historial.\n\n¿Archivar producto?',
                      );
                      if (!confirmed) return;
                      const result = await setProductActiveStatus({
                        productId: selectedProduct.id,
                        isActive: false,
                      });
                      if (result.status === 'success') {
                        setSelectedProductId(null);
                        setMovements([]);
                        setMovementsError(null);
                        reloadAfterMutation();
                      } else {
                        window.alert(result.message);
                      }
                    }}
                  >
                    Archivar producto
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs"
                    onClick={async () => {
                      const confirmed = window.confirm(
                        'Restaurar este producto lo mostrará de nuevo en el inventario normal y en nuevas ventas.\n\n¿Restaurar producto?',
                      );
                      if (!confirmed) return;
                      const result = await setProductActiveStatus({
                        productId: selectedProduct.id,
                        isActive: true,
                      });
                      if (result.status === 'success') {
                        reloadAfterMutation();
                      } else {
                        window.alert(result.message);
                      }
                    }}
                  >
                    Restaurar producto
                  </Button>
                )}
              </div>
            </div>

            <dl className="mt-4 grid gap-2 text-sm">
              <DetailRow
                label="Categoría"
                value={selectedProduct.categoryName}
              />
              <DetailRow
                label="Editorial / marca / sello"
                value={selectedProduct.brandPublisherLabel || 'Sin especificar'}
              />
              <DetailRow
                label="Estado"
                value={
                  selectedProduct.condition
                    ? conditionLabels[selectedProduct.condition]
                    : 'Sin especificar'
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
                    ? 'Sin especificar'
                    : formatCurrency(selectedProduct.costPrice)
                }
              />
              <DetailRow
                label="Stock actual"
                value={`${selectedProduct.currentStock} unidades`}
              />
              <DetailRow
                label="Proveedor"
                value={selectedProduct.supplier || 'Sin especificar'}
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
                                {movement.reason || 'Sin motivo'}
                              </p>
                            </div>
                            <p className="text-sm font-bold tabular-nums text-stone-950">
                              {formatMovementQuantity(movement.quantityChange)}
                            </p>
                          </div>
                          <p className="mt-2 text-xs font-medium text-stone-600">
                            {movement.stockBefore} → {movement.stockAfter}
                            {movement.createdAt
                              ? ` · ${new Date(
                                  movement.createdAt,
                                ).toLocaleString('es-ES')}`
                              : ''}
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
                  <p>SKU: {selectedProduct.sku || 'Sin SKU'}</p>
                  <p>
                    Código de barras: {selectedProduct.barcode || 'Sin código'}
                  </p>
                  <p>ISBN: {selectedProduct.isbn || 'Sin ISBN'}</p>
                </dd>
              </div>
              <div className="rounded-md bg-white p-3 ring-1 ring-stone-200">
                <dt className="font-semibold text-stone-600">Notas</dt>
                <dd className="mt-2 text-stone-950">
                  {selectedProduct.notes || 'Sin notas'}
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
      <dd className={`text-right text-stone-950 ${strong ? 'font-bold' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
