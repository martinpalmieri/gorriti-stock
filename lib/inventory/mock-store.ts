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
  productId: string;
  type: "initial";
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  reason: string;
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
    createdAt: now,
    updatedAt: now,
  };

  globalStore.gorritiInventoryStore ??= {
    products: [],
    stockMovements: [],
  };
  globalStore.gorritiInventoryStore.products.unshift(createdProduct);
  globalStore.gorritiInventoryStore.stockMovements.push({
    productId: createdProduct.id,
    type: "initial",
    quantityChange: initialStock,
    stockBefore: 0,
    stockAfter: initialStock,
    reason: "Stock inicial",
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
