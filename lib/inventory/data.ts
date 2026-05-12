import { createClient } from "@/lib/supabase/server";
import { shouldQuerySupabaseTables } from "@/lib/supabase/should-query-supabase-tables";
import type { Database } from "@/types/database.types";
import type { SupabaseTableClient } from "@/lib/inventory/supabase-types";
import type { Category, Product, ProductConditionValue } from "./types";
import { getFallbackCategories, getFallbackProducts } from "./mock-store";

type ProductRow = Database["public"]["Tables"]["products"]["Row"] & {
  categories: Pick<Database["public"]["Tables"]["categories"]["Row"], "name"> | null;
};

function toNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }

  return typeof value === "number" ? value : Number(value);
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
    condition: row.condition as ProductConditionValue | null,
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

export async function getInventoryData(input?: {
  status?: InventoryStatusFilter;
}): Promise<{
  categories: Category[];
  products: Product[];
  error: string | null;
}> {
  const status = input?.status ?? "active";
  if (!shouldQuerySupabaseTables()) {
    const allFallbackProducts = getFallbackProducts();
    const filteredFallbackProducts =
      status === "all"
        ? allFallbackProducts
        : allFallbackProducts.filter((p) =>
            status === "active" ? p.isActive === true : p.isActive !== true,
          );
    return {
      categories: getFallbackCategories(),
      products: filteredFallbackProducts,
      error: null,
    };
  }

  const supabase = (await createClient() as unknown) as SupabaseTableClient;
  const productsQuery = supabase
    .from<ProductRow>("products")
    .select(
      "id, name, category_id, creator_or_author, brand_publisher_label, price, cost_price, current_stock, is_active, condition, supplier, barcode, sku, isbn, notes, created_at, updated_at, categories:category_id(name)",
    );

  if (status === "active") {
    productsQuery.eq("is_active", true);
  } else if (status === "archived") {
    productsQuery.eq("is_active", false);
  }

  const [categoriesResult, productsResult] = await Promise.all([
    supabase.from<Category>("categories").select("id, name, slug").order("name"),
    productsQuery.order("updated_at", { ascending: false }),
  ]);

  if (categoriesResult.error || productsResult.error) {
    return {
      categories: categoriesResult.data ?? [],
      products: [],
      error:
        categoriesResult.error?.message ??
        productsResult.error?.message ??
        "No se pudo cargar el inventario.",
    };
  }

  return {
    categories: categoriesResult.data ?? [],
    products: (productsResult.data ?? []).map((row) => mapProduct(row)),
    error: null,
  };
}
