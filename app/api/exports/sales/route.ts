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
    "total_amount",
    "status",
    "payment_method",
    "notes",
    "created_at",
    "created_by",
  ] as const;

  const filename = `gorriti-sales-${isoDateForFilename()}.csv`;

  if (!shouldQuerySupabaseTables()) {
    return csvDownloadResponse(toCsv(columns, []), filename);
  }

  type SaleRow = {
    id: string
    total_amount: string
    status: string
    payment_method: string | null
    notes: string | null
    created_at: string | null
    created_by: string | null
  };

  const supabase = (await createClient() as unknown) as SupabaseTableClient;
  const { data, error } = await supabase
    .from<SaleRow>("sales")
    .select("id, total_amount, status, payment_method, notes, created_at, created_by")
    .order("created_at", { ascending: true });

  if (error) {
    return new Response(`Error exportando ventas: ${error.message}`, { status: 500 });
  }

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    total_amount: row.total_amount ?? "",
    status: row.status ?? "",
    payment_method: row.payment_method ?? "",
    notes: row.notes ?? "",
    created_at: row.created_at ?? "",
    created_by: row.created_by ?? "",
  }));

  return csvDownloadResponse(toCsv(columns, rows), filename);
}

