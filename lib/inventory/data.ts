import { createClient } from "@/lib/supabase/server";
import { perfTime } from "@/lib/perf/log";
import { shouldQuerySupabaseTables } from "@/lib/supabase/should-query-supabase-tables";
import type { Database } from "@/types/database.types";
import type { SupabaseTableClient } from "@/lib/inventory/supabase-types";
import type { Category, Product, ProductConditionValue } from "./types";
import { getFallbackCategories, getFallbackProducts } from "./mock-store";
import { INVENTORY_PAGE_SIZE } from "./pagination";
import { productMatchesSearch } from "./product-search";

type ProductRow = Database["public"]["Tables"]["products"]["Row"] & {
  categories: Pick<Database["public"]["Tables"]["categories"]["Row"], "name"> | null;
};

function toNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }

  return typeof value === "number" ? value : Number(value);
}

function normalizeCondition(
  value: string | null,
): ProductConditionValue | null {
  if (value === "new") {
    return "new";
  }

  if (value === "used_good" || value === "used_very_good") {
    return "used_good";
  }

  return null;
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    categoryName: row.categories?.name ?? "Sin categoría",
    creatorOrAuthor: row.creator_or_author ?? "",
    brandPublisherLabel: row.brand_publisher_label ?? "",
    price: toNumber(row.price) ?? 0,
    costPrice: toNumber(row.cost_price),
    currentStock: row.current_stock,
    isActive: row.is_active ?? true,
    condition: normalizeCondition(row.condition),
    supplier: row.supplier ?? "",
    barcode: row.barcode ?? "",
    sku: row.sku ?? "",
    isbn: row.isbn ?? "",
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type InventoryStatusFilter = "active" | "archived" | "all";
export type InventoryStockFilter = "all" | "in" | "out";

export type InventoryQuery = {
  status?: InventoryStatusFilter;
  search?: string;
  categoryId?: string | null;
  condition?: ProductConditionValue | null;
  stockFilter?: InventoryStockFilter;
  offset?: number;
  limit?: number;
  includeCategories?: boolean;
};

export type InventoryQueryResult = {
  categories: Category[] | null;
  products: Product[];
  hasMore: boolean;
  error: string | null;
};

export async function getInventoryData(
  input?: InventoryQuery,
): Promise<InventoryQueryResult> {
  const status = input?.status ?? "active";
  const search = input?.search?.trim() ?? "";
  const categoryId = input?.categoryId ?? null;
  const condition = input?.condition ?? null;
  const stockFilter = input?.stockFilter ?? "all";
  const offset = Math.max(0, input?.offset ?? 0);
  const limit = Math.max(1, input?.limit ?? INVENTORY_PAGE_SIZE);
  const includeCategories = input?.includeCategories ?? offset === 0;

  if (!shouldQuerySupabaseTables()) {
    const all = getFallbackProducts();
    const filtered = all.filter((product) => {
      if (status === "active" && product.isActive !== true) return false;
      if (status === "archived" && product.isActive === true) return false;
      if (categoryId && product.categoryId !== categoryId) return false;
      if (condition && product.condition !== condition) return false;
      if (stockFilter === "in" && product.currentStock <= 0) return false;
      if (stockFilter === "out" && product.currentStock !== 0) return false;
      if (search && !productMatchesSearch(product, search)) return false;
      return true;
    });

    const page = filtered.slice(offset, offset + limit);
    return {
      categories: includeCategories ? getFallbackCategories() : null,
      products: page,
      hasMore: filtered.length > offset + page.length,
      error: null,
    };
  }

  const supabase = (await createClient() as unknown) as SupabaseTableClient;
  let productsQuery = supabase
    .from<ProductRow>("products")
    .select(
      "id, name, category_id, creator_or_author, brand_publisher_label, price, cost_price, current_stock, is_active, condition, supplier, barcode, sku, isbn, notes, created_at, updated_at, categories:category_id(name)",
    );

  if (status === "active") {
    productsQuery = productsQuery.eq("is_active", true);
  } else if (status === "archived") {
    productsQuery = productsQuery.eq("is_active", false);
  }

  if (categoryId) {
    productsQuery = productsQuery.eq("category_id", categoryId);
  }

  if (condition) {
    productsQuery = productsQuery.eq("condition", condition);
  }

  if (stockFilter === "in") {
    productsQuery = productsQuery.gt("current_stock", 0);
  } else if (stockFilter === "out") {
    productsQuery = productsQuery.eq("current_stock", 0);
  }

  productsQuery = productsQuery.order("updated_at", { ascending: false });

  if (!search) {
    productsQuery = productsQuery.range(offset, offset + limit - 1);
  }

  const categoriesQuery = includeCategories
    ? supabase.from<Category>("categories").select("id, name, slug").order("name")
    : null;

  const [categoriesResult, productsResult] = await perfTime(
    "inventory",
    "queries",
    () =>
      Promise.all([
        categoriesQuery ?? Promise.resolve({ data: null, error: null }),
        productsQuery,
      ]),
  );

  if (categoriesResult.error || productsResult.error) {
    return {
      categories: includeCategories ? (categoriesResult.data ?? []) : null,
      products: [],
      hasMore: false,
      error:
        categoriesResult.error?.message ??
        productsResult.error?.message ??
        "No se pudo cargar el inventario.",
    };
  }

  const rows = productsResult.data ?? [];
  const mapped = rows.map((row) => mapProduct(row));

  if (search) {
    const filtered = mapped.filter((product) =>
      productMatchesSearch(product, search),
    );
    const products = filtered.slice(offset, offset + limit);
    return {
      categories: includeCategories ? (categoriesResult.data ?? []) : null,
      products,
      hasMore: filtered.length > offset + products.length,
      error: null,
    };
  }

  return {
    categories: includeCategories ? (categoriesResult.data ?? []) : null,
    products: mapped,
    hasMore: rows.length === limit,
    error: null,
  };
}

export async function getProductById(productId: string): Promise<Product | null> {
  const normalizedProductId = productId.trim();
  if (!normalizedProductId) {
    return null;
  }

  if (!shouldQuerySupabaseTables()) {
    return (
      getFallbackProducts().find((product) => product.id === normalizedProductId) ??
      null
    );
  }

  const supabase = (await createClient() as unknown) as SupabaseTableClient;
  const { data, error } = await supabase
    .from<ProductRow>("products")
    .select(
      "id, name, category_id, creator_or_author, brand_publisher_label, price, cost_price, current_stock, is_active, condition, supplier, barcode, sku, isbn, notes, created_at, updated_at, categories:category_id(name)",
    )
    .eq("id", normalizedProductId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapProduct(data);
}
