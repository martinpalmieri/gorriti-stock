import type { Category, Product } from "./types";

const fallbackCategories: Category[] = [
  { id: "cat-libros", name: "Libros", slug: "libros" },
  { id: "cat-discos-musica", name: "Discos / Música", slug: "discos-musica" },
  { id: "cat-papeleria", name: "Papelería", slug: "papeleria" },
  { id: "cat-prints", name: "Prints", slug: "prints" },
  {
    id: "cat-publicacion-propia",
    name: "Publicación propia",
    slug: "publicacion-propia",
  },
  { id: "cat-otros", name: "Otros", slug: "otros" },
];

type StockMovement = {
  id: string;
  productId: string;
  type: "initial" | "manual_correction";
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  reason: string;
  createdAt: string;
};

const globalStore = globalThis as typeof globalThis & {
  gorritiInventoryStore?: {
    products: Product[];
    stockMovements: StockMovement[];
  };
};

export function getFallbackCategories() {
  return fallbackCategories;
}

export function getFallbackProducts() {
  return [...(globalStore.gorritiInventoryStore?.products ?? [])];
}

export function createFallbackProduct(
  product: Omit<Product, "id" | "createdAt" | "updatedAt">,
  initialStock: number,
) {
  const now = new Date().toISOString();
  const createdProduct: Product = {
    ...product,
    id: `local-product-${crypto.randomUUID()}`,
    currentStock: initialStock,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  globalStore.gorritiInventoryStore ??= {
    products: [],
    stockMovements: [],
  };
  globalStore.gorritiInventoryStore.products.unshift(createdProduct);
  globalStore.gorritiInventoryStore.stockMovements.push({
    id: `local-movement-${crypto.randomUUID()}`,
    productId: createdProduct.id,
    type: "initial",
    quantityChange: initialStock,
    stockBefore: 0,
    stockAfter: initialStock,
    reason: "Stock inicial",
    createdAt: now,
  });

  return createdProduct;
}

export function updateFallbackProduct(
  productId: string,
  values: Omit<Product, "id" | "currentStock" | "createdAt" | "updatedAt">,
) {
  const store = globalStore.gorritiInventoryStore;
  const product = store?.products.find((item) => item.id === productId);

  if (!product) {
    return null;
  }

  Object.assign(product, values, { updatedAt: new Date().toISOString() });

  return product;
}

export function setFallbackProductActive(productId: string, isActive: boolean) {
  const store = globalStore.gorritiInventoryStore;
  const product = store?.products.find((item) => item.id === productId);

  if (!product) {
    return null;
  }

  product.isActive = isActive;
  product.updatedAt = new Date().toISOString();
  return product;
}

export function getFallbackStockMovements(productId: string) {
  const store = globalStore.gorritiInventoryStore;
  const movements = store?.stockMovements ?? [];

  return movements
    .filter((movement) => movement.productId === productId)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((movement) => ({
      id: movement.id,
      type: movement.type,
      quantityChange: movement.quantityChange,
      stockBefore: movement.stockBefore,
      stockAfter: movement.stockAfter,
      reason: movement.reason,
      createdAt: movement.createdAt,
    }));
}

export function correctFallbackStock(input: {
  productId: string;
  adjustment: number;
  reason: string;
}):
  | { status: "success"; currentStock: number }
  | { status: "error"; message: string } {
  const store = globalStore.gorritiInventoryStore;
  const product = store?.products.find((item) => item.id === input.productId);

  if (!store || !product) {
    return { status: "error", message: "No se encontró el producto." };
  }

  if (product.isActive !== true) {
    return { status: "error", message: "Este producto está archivado." };
  }

  if (!Number.isInteger(input.adjustment)) {
    return { status: "error", message: "El ajuste debe ser un entero." };
  }

  if (input.adjustment === 0) {
    return { status: "error", message: "El ajuste no puede ser 0." };
  }

  const reason = input.reason.trim();
  if (!reason) {
    return { status: "error", message: "El motivo es obligatorio." };
  }

  const stockBefore = product.currentStock;
  const stockAfter = stockBefore + input.adjustment;

  if (stockAfter < 0) {
    return { status: "error", message: "El stock resultante no puede ser menor a 0." };
  }

  const now = new Date().toISOString();
  product.currentStock = stockAfter;
  product.updatedAt = now;

  store.stockMovements.push({
    id: `local-movement-${crypto.randomUUID()}`,
    productId: product.id,
    type: "manual_correction",
    quantityChange: input.adjustment,
    stockBefore,
    stockAfter,
    reason,
    createdAt: now,
  });

  return { status: "success", currentStock: stockAfter };
}
