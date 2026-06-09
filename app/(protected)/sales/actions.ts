"use server";

import { createClient } from "@/lib/supabase/server";
import { shouldQuerySupabaseTables } from "@/lib/supabase/should-query-supabase-tables";
import type { SupabaseTableClient } from "@/lib/inventory/supabase-types";

type PaymentMethod = string | null;
type SaleStatus = "confirmed" | "cancelled" | string;

export type SaleListItem = {
  id: string;
  createdAt: string | null;
  totalAmount: string;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  itemCount: number;
};

export type SaleDetail = {
  id: string;
  ticketNumber: string | null;
  createdAt: string | null;
  totalAmount: string;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  notes: string | null;
  itemCount: number;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>;
};

export async function getSaleDetail(
  saleId: string,
): Promise<
  | { status: "success"; sale: SaleDetail }
  | { status: "error"; message: string }
> {
  const normalizedSaleId = saleId.trim();
  if (!normalizedSaleId) {
    return { status: "error", message: "No se encontró la venta." };
  }

  if (!shouldQuerySupabaseTables()) {
    if (normalizedSaleId === "mock-sale") {
      return {
        status: "success",
        sale: {
          id: "mock-sale",
          ticketNumber: "GS-2026-000001",
          createdAt: new Date().toISOString(),
          totalAmount: "18.00",
          paymentMethod: "cash",
          status: "confirmed",
          notes: null,
          itemCount: 1,
          items: [
            {
              id: "mock-item-1",
              productId: "print-huelin",
              productName: "Print Huelin",
              quantity: 1,
              unitPrice: "18.00",
              totalPrice: "18.00",
            },
          ],
        },
      };
    }

    return { status: "error", message: "Supabase no está configurado." };
  }

  type SaleRow = {
    id: string;
    ticket_number: string | null;
    created_at: string | null;
    total_amount: string;
    payment_method: PaymentMethod;
    status: SaleStatus;
    notes: string | null;
    sale_items?: Array<{
      id: string;
      product_id: string;
      quantity: number;
      unit_price: string;
      total_price: string;
      product?: { name: string } | null;
    }>;
  };

  const supabase = (await createClient() as unknown) as SupabaseTableClient;
  const { data, error } = await supabase
    .from<SaleRow>("sales")
    .select(
      "id, ticket_number, created_at, total_amount, payment_method, status, notes, sale_items(id, product_id, quantity, unit_price, total_price, product:product_id(name))",
    )
    .eq("id", normalizedSaleId)
    .single();

  if (error || !data) {
    return {
      status: "error",
      message: error?.message ?? "No se encontró la venta.",
    };
  }

  const items = data.sale_items ?? [];
  const itemCount = items.reduce((total, item) => total + (item.quantity ?? 0), 0);

  return {
    status: "success",
    sale: {
      id: data.id,
      ticketNumber: data.ticket_number ?? null,
      createdAt: data.created_at,
      totalAmount: data.total_amount,
      paymentMethod: data.payment_method ?? null,
      status: data.status,
      notes: data.notes ?? null,
      itemCount,
      items: items.map((item) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product?.name ?? "Producto",
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
      })),
    },
  };
}

