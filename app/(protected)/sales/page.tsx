import { SalesList } from '../../_components/sales/sales-list';
import { perfTime } from '@/lib/perf/log';
import { createClient } from '@/lib/supabase/server';
import { shouldQuerySupabaseTables } from '@/lib/supabase/should-query-supabase-tables';
import type { SupabaseTableClient } from '@/lib/inventory/supabase-types';
import type { SaleListItem } from './actions';
import { getSaleDetail } from './actions';

export default async function SalesPage() {
  let sales: SaleListItem[] = [];
  let loadError: string | null = null;
  let initialSaleDetail: Awaited<ReturnType<typeof getSaleDetail>> | null =
    null;

  if (shouldQuerySupabaseTables()) {
    type SaleRow = {
      id: string;
      created_at: string | null;
      total_amount: string;
      payment_method: string | null;
      status: string;
      sale_items?: Array<{ quantity: number }>;
    };

    const supabase = (await createClient()) as unknown as SupabaseTableClient;
    const { data, error } = await perfTime("sales", "list", async () =>
      supabase
        .from<SaleRow>('sales')
        .select(
          'id, created_at, total_amount, payment_method, status, sale_items(quantity)',
        )
        .order('created_at', { ascending: false })
        .limit(50),
    );

    if (error) {
      loadError = error.message;
    } else {
      sales = (data ?? []).map((row: SaleRow) => ({
        id: row.id,
        createdAt: row.created_at,
        totalAmount: row.total_amount,
        paymentMethod: row.payment_method ?? null,
        status: row.status,
        itemCount: (row.sale_items ?? []).reduce(
          (total: number, item: { quantity: number }) =>
            total + (item.quantity ?? 0),
          0,
        ),
      }));
    }
  } else {
    loadError = 'Supabase no está configurado.';
  }

  if (!loadError && sales[0]?.id) {
    initialSaleDetail = await perfTime("sales", "firstDetail", () =>
      getSaleDetail(sales[0].id),
    );
  }

  return (
    <div className="space-y-6">
      <SalesList
        sales={sales}
        loadError={loadError}
        initialSaleDetail={
          initialSaleDetail?.status === 'success'
            ? initialSaleDetail.sale
            : null
        }
      />
    </div>
  );
}
