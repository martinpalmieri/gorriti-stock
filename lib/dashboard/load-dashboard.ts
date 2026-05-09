import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseTableClient } from "@/lib/inventory/supabase-types";

export type DashboardLatestSale = {
  id: string;
  createdAt: string | null;
  totalAmount: string;
  paymentMethod: string | null;
  itemCount: number;
};

export type DashboardMovement = {
  id: string;
  productName: string;
  movementTypeLabel: string;
  quantityChange: number;
  quantityDisplay: string;
  createdAt: string | null;
};

export type DashboardData =
  | {
      ok: true;
      loadError: null;
      todaySalesCount: number;
      todayRevenueTotal: number;
      productsInStock: number;
      productsOutOfStock: number;
      latestSales: DashboardLatestSale[];
      latestMovements: DashboardMovement[];
    }
  | {
      ok: false;
      loadError: string;
      todaySalesCount: number;
      todayRevenueTotal: number;
      productsInStock: number;
      productsOutOfStock: number;
      latestSales: DashboardLatestSale[];
      latestMovements: DashboardMovement[];
    };

function hasSupabasePublicEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Límites del día calendario en UTC (mismo reloj que suele usar el servidor en producción).
 * Las métricas "de hoy" comparan created_at en UTC.
 */
function getUtcCalendarDayBounds(): { startIso: string; endExclusiveIso: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0));
  return { startIso: start.toISOString(), endExclusiveIso: endExclusive.toISOString() };
}

function movementTypeLabel(type: string): string {
  switch (type) {
    case "initial":
      return "Stock inicial";
    case "sale":
      return "Venta";
    case "manual_correction":
      return "Corrección manual";
    case "restock":
      return "Reposición";
    case "return":
      return "Devolución";
    default:
      return type;
  }
}

function formatQuantityChange(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

type CountResult = { count: number | null; error: { message: string } | null };

export async function loadDashboardData(): Promise<DashboardData> {
  const empty: Omit<DashboardData, "ok" | "loadError"> = {
    todaySalesCount: 0,
    todayRevenueTotal: 0,
    productsInStock: 0,
    productsOutOfStock: 0,
    latestSales: [],
    latestMovements: [],
  };

  if (!hasSupabasePublicEnv()) {
    return { ok: false, loadError: "Supabase no está configurado.", ...empty };
  }

  const supabase = (await createClient()) as unknown as SupabaseTableClient;
  const { startIso, endExclusiveIso } = getUtcCalendarDayBounds();

  type SaleTodayRow = { total_amount: string };
  type LatestSaleRow = {
    id: string;
    created_at: string | null;
    total_amount: string;
    payment_method: string | null;
    status: string;
    sale_items?: Array<{ quantity: number }>;
  };
type MovementRow = {
    id: string;
    type: string;
    quantity_change: number;
    created_at: string | null;
    product?: { name: string } | null;
  };

  const [
    todaySalesResult,
    inStockResult,
    outOfStockResult,
    latestSalesResult,
    movementsResult,
  ] = await Promise.all([
    supabase
      .from<SaleTodayRow>("sales")
      .select("total_amount")
      .eq("status", "confirmed")
      .gte("created_at", startIso)
      .lt("created_at", endExclusiveIso),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .gt("current_stock", 0),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("current_stock", 0),
    supabase
      .from<LatestSaleRow>("sales")
      .select("id, created_at, total_amount, payment_method, status, sale_items(quantity)")
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from<MovementRow>("stock_movements")
      .select("id, type, quantity_change, created_at, product:product_id(name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const inStockCounted = inStockResult as unknown as CountResult;
  const outStockCounted = outOfStockResult as unknown as CountResult;

  const errors = [
    todaySalesResult.error,
    inStockCounted.error,
    outStockCounted.error,
    latestSalesResult.error,
    movementsResult.error,
  ].filter(Boolean) as { message: string }[];

  if (errors.length > 0) {
    return {
      ok: false,
      loadError: errors[0]!.message,
      ...empty,
    };
  }

  const todayRows = todaySalesResult.data ?? [];
  const todaySalesCount = todayRows.length;
  const todayRevenueTotal = todayRows.reduce((sum, row) => {
    const n = Number(row.total_amount);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const latestSales: DashboardLatestSale[] = (latestSalesResult.data ?? []).map(
    (row) => ({
      id: row.id,
      createdAt: row.created_at,
      totalAmount: row.total_amount,
      paymentMethod: row.payment_method ?? null,
      itemCount: (row.sale_items ?? []).reduce(
        (total, item) => total + (item.quantity ?? 0),
        0,
      ),
    }),
  );

  const latestMovements: DashboardMovement[] = (movementsResult.data ?? []).map(
    (row) => ({
      id: row.id,
      productName: row.product?.name?.trim() ? row.product.name : "—",
      movementTypeLabel: movementTypeLabel(row.type),
      quantityChange: row.quantity_change,
      quantityDisplay: formatQuantityChange(row.quantity_change),
      createdAt: row.created_at,
    }),
  );

  return {
    ok: true,
    loadError: null,
    todaySalesCount,
    todayRevenueTotal,
    productsInStock: inStockCounted.count ?? 0,
    productsOutOfStock: outStockCounted.count ?? 0,
    latestSales,
    latestMovements,
  };
}
