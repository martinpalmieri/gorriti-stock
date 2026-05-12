import { toCsv } from "@/lib/csv/write-csv";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseTableClient } from "@/lib/inventory/supabase-types";
import {
  csvDownloadResponse,
  isoDateForFilename,
  requireAuthenticatedUser,
} from "../_shared";
import { shouldQuerySupabaseTables } from "@/lib/supabase/should-query-supabase-tables";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const columns = [
    "id",
    "name",
    "category",
    "creator_or_author",
    "brand_publisher_label",
    "price",
    "cost_price",
    "current_stock",
    "condition",
    "supplier",
    "barcode",
    "sku",
    "isbn",
    "notes",
    "is_active",
    "created_at",
    "updated_at",
  ] as const;

  const filename = `gorriti-products-${isoDateForFilename()}.csv`;

  if (!shouldQuerySupabaseTables()) {
    return csvDownloadResponse(toCsv(columns, []), filename);
  }

  type ProductRow = {
    id: string
    name: string
    creator_or_author: string | null
    brand_publisher_label: string | null
    price: string
    cost_price: string | null
    current_stock: number
    condition: string | null
    supplier: string | null
    barcode: string | null
    sku: string | null
    isbn: string | null
    notes: string | null
    is_active: boolean | null
    created_at: string | null
    updated_at: string | null
    categories?: { name: string } | null
  };

  const supabase = (await createClient() as unknown) as SupabaseTableClient;
  const { data, error } = await supabase
    .from<ProductRow>("products")
    .select(
      "id, name, creator_or_author, brand_publisher_label, price, cost_price, current_stock, condition, supplier, barcode, sku, isbn, notes, is_active, created_at, updated_at, categories(name)",
    )
    .order("created_at", { ascending: true });

  if (error) {
    return new Response(`Error exportando productos: ${error.message}`, { status: 500 });
  }

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name ?? "",
    category: row.categories?.name ?? "Sin categoría",
    creator_or_author: row.creator_or_author ?? "",
    brand_publisher_label: row.brand_publisher_label ?? "",
    price: row.price ?? "",
    cost_price: row.cost_price ?? "",
    current_stock: row.current_stock ?? 0,
    condition: row.condition ?? "",
    supplier: row.supplier ?? "",
    barcode: row.barcode ?? "",
    sku: row.sku ?? "",
    isbn: row.isbn ?? "",
    notes: row.notes ?? "",
    is_active: row.is_active ?? true,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  }));

  return csvDownloadResponse(toCsv(columns, rows), filename);
}

