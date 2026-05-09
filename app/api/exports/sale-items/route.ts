import { toCsv } from "@/lib/csv/write-csv";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseTableClient } from "@/lib/inventory/supabase-types";
import {
  csvDownloadResponse,
  isoDateForFilename,
  requireAuthenticatedUser,
} from "../_shared";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const columns = [
    "id",
    "sale_id",
    "product_id",
    "product_name",
    "quantity",
    "unit_price",
    "total_price",
    "created_at",
  ] as const;

  const filename = `gorriti-sale-items-${isoDateForFilename()}.csv`;

  const hasSupabasePublicEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!hasSupabasePublicEnv) {
    return csvDownloadResponse(toCsv(columns, []), filename);
  }

  type SaleItemRow = {
    id: string
    sale_id: string
    product_id: string
    quantity: number
    unit_price: string
    total_price: string
    created_at: string | null
    product?: { name: string } | null
  };

  const supabase = (await createClient() as unknown) as SupabaseTableClient;
  const { data, error } = await supabase
    .from<SaleItemRow>("sale_items")
    .select(
      "id, sale_id, product_id, quantity, unit_price, total_price, created_at, product:product_id(name)",
    )
    .order("created_at", { ascending: true });

  if (error) {
    return new Response(`Error exportando líneas de venta: ${error.message}`, { status: 500 });
  }

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    sale_id: row.sale_id,
    product_id: row.product_id,
    product_name: row.product?.name ?? "Producto",
    quantity: row.quantity ?? 0,
    unit_price: row.unit_price ?? "",
    total_price: row.total_price ?? "",
    created_at: row.created_at ?? "",
  }));

  return csvDownloadResponse(toCsv(columns, rows), filename);
}

