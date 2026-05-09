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
    "product_id",
    "product_name",
    "type",
    "quantity_change",
    "stock_before",
    "stock_after",
    "sale_id",
    "reason",
    "created_at",
    "created_by",
  ] as const;

  const filename = `gorriti-stock-movements-${isoDateForFilename()}.csv`;

  const hasSupabasePublicEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!hasSupabasePublicEnv) {
    return csvDownloadResponse(toCsv(columns, []), filename);
  }

  type StockMovementRow = {
    id: string
    product_id: string
    type: string
    quantity_change: number
    stock_before: number
    stock_after: number
    sale_id: string | null
    reason: string | null
    created_at: string | null
    created_by: string | null
    product?: { name: string } | null
  };

  const supabase = (await createClient() as unknown) as SupabaseTableClient;
  const { data, error } = await supabase
    .from<StockMovementRow>("stock_movements")
    .select(
      "id, product_id, type, quantity_change, stock_before, stock_after, sale_id, reason, created_at, created_by, product:product_id(name)",
    )
    .order("created_at", { ascending: true });

  if (error) {
    return new Response(`Error exportando movimientos de stock: ${error.message}`, {
      status: 500,
    });
  }

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    product_id: row.product_id,
    product_name: row.product?.name ?? "Producto",
    type: row.type ?? "",
    quantity_change: row.quantity_change ?? 0,
    stock_before: row.stock_before ?? 0,
    stock_after: row.stock_after ?? 0,
    sale_id: row.sale_id ?? "",
    reason: row.reason ?? "",
    created_at: row.created_at ?? "",
    created_by: row.created_by ?? "",
  }));

  return csvDownloadResponse(toCsv(columns, rows), filename);
}

