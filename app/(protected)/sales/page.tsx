import { SalesHeader } from "../../_components/sales/sales-header";
import { SalesList } from "../../_components/sales/sales-list";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseTableClient } from "@/lib/inventory/supabase-types";
import type { SaleListItem } from "./actions";
import { getSaleDetail } from "./actions";

function hasSupabasePublicEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export default async function SalesPage() {
  let sales: SaleListItem[] = [];
  let loadError: string | null = null;
  let initialSaleDetail: Awaited<ReturnType<typeof getSaleDetail>> | null = null;

  if (hasSupabasePublicEnv()) {
    type SaleRow = {
      id: string;
      created_at: string | null;
      total_amount: string;
      payment_method: string | null;
      status: string;
      sale_items?: Array<{ quantity: number }>;
    };

    const supabase = (await createClient() as unknown) as SupabaseTableClient;
    const { data, error } = await supabase
      .from<SaleRow>("sales")
      .select("id, created_at, total_amount, payment_method, status, sale_items(quantity)")
      .order("created_at", { ascending: false })

    if (error) {
      loadError = error.message;
    } else {
      sales = (data ?? []).slice(0, 50).map((row: SaleRow) => ({
        id: row.id,
        createdAt: row.created_at,
        totalAmount: row.total_amount,
        paymentMethod: row.payment_method ?? null,
        status: row.status,
        itemCount: (row.sale_items ?? []).reduce(
          (total: number, item: { quantity: number }) => total + (item.quantity ?? 0),
          0,
        ),
      }));
    }
  } else {
    loadError = "Supabase no está configurado.";
  }

  if (!loadError && sales[0]?.id) {
    initialSaleDetail = await getSaleDetail(sales[0].id);
  }

  return (
    <div className="space-y-6">
      <SalesHeader />
      <SalesList
        sales={sales}
        loadError={loadError}
        initialSaleDetail={initialSaleDetail?.status === "success" ? initialSaleDetail.sale : null}
      />
    </div>
  );
}
