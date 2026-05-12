"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { shouldQuerySupabaseTables } from "@/lib/supabase/should-query-supabase-tables";
import type { SupabaseTableClient } from "@/lib/inventory/supabase-types";

type PaymentMethod = "manual_sumup" | "cash";

type SupabaseError = { message: string };

type SupabaseRpcResult<T> = Promise<{ data: T | null; error: SupabaseError | null }>;

type SupabaseSalesClient = SupabaseTableClient & {
  rpc: (fn: string, args: Record<string, unknown>) => SupabaseRpcResult<unknown>;
};

export type SaleProduct = {
  id: string;
  title: string;
  creator: string;
  category: string;
  priceCents: number;
  stock: number;
  barcode: string;
  sku: string;
  isbn?: string;
};

type ListProductsResult =
  | { status: "success"; products: SaleProduct[]; source: "supabase" | "mock" }
  | { status: "error"; message: string; products: SaleProduct[]; source: "supabase" | "mock" };

type ConfirmSaleInput = {
  items: Array<{ productId: string; quantity: number }>;
  paymentMethod: PaymentMethod;
  notes?: string | null;
};

type ConfirmSaleResult =
  | {
      status: "success";
      saleId: string;
      totalAmount: string;
      itemCount: number;
      paymentMethod: PaymentMethod;
    }
  | { status: "error"; message: string };

const mockedProducts: SaleProduct[] = [
  {
    id: "book-aleph",
    title: "El Aleph",
    creator: "Jorge Luis Borges",
    category: "Libro",
    priceCents: 1200,
    stock: 1,
    barcode: "9780000000011",
    sku: "LIB-ALEPH-001",
    isbn: "978-0-00-000001-1",
  },
  {
    id: "music-unknown-pleasures",
    title: "Unknown Pleasures",
    creator: "Joy Division",
    category: "Disco / Música",
    priceCents: 2400,
    stock: 1,
    barcode: "5021732000024",
    sku: "MUS-JD-UP-001",
  },
  {
    id: "stationery-midori-a5",
    title: "Cuaderno A5",
    creator: "Midori",
    category: "Papelería",
    priceCents: 800,
    stock: 3,
    barcode: "4902805152884",
    sku: "PAP-MID-A5-003",
  },
  {
    id: "print-huelin",
    title: "Print Huelin",
    creator: "Gorriti",
    category: "Print",
    priceCents: 1800,
    stock: 5,
    barcode: "8437000000185",
    sku: "ART-HUELIN-005",
  },
  {
    id: "own-fanzine-01",
    title: "Fanzine Gorriti 01",
    creator: "Gorriti Editorial",
    category: "Publicación propia",
    priceCents: 600,
    stock: 10,
    barcode: "8437000000062",
    sku: "PRO-FAN-001",
    isbn: "978-8-43-700006-2",
  },
];

function priceToCents(value: unknown) {
  if (typeof value === "number") {
    return Math.round(value * 100);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.round(parsed * 100);
    }
  }

  return 0;
}

function assertPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "manual_sumup" || value === "cash";
}

export async function listActiveProductsForSale(): Promise<ListProductsResult> {
  if (!shouldQuerySupabaseTables()) {
    return { status: "success", products: mockedProducts, source: "mock" };
  }

  type ProductRow = {
    id: string;
    name: string;
    creator_or_author: string | null;
    price: string;
    current_stock: number;
    barcode: string | null;
    sku: string | null;
    isbn: string | null;
    is_active: boolean | null;
    categories?: { name: string } | null;
  };

  const supabase = (await createClient() as unknown) as SupabaseSalesClient;
  const { data, error } = await supabase
    .from<ProductRow>("products")
    .select(
      "id, name, creator_or_author, price, current_stock, barcode, sku, isbn, is_active, categories(name)",
    )
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return { status: "error", message: error.message, products: [], source: "supabase" };
  }

  const products: SaleProduct[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.name ?? "",
    creator: row.creator_or_author ?? "",
    category: row.categories?.name ?? "Sin categoría",
    priceCents: priceToCents(row.price),
    stock: row.current_stock ?? 0,
    barcode: row.barcode ?? "",
    sku: row.sku ?? "",
    isbn: row.isbn ?? undefined,
  }));

  return { status: "success", products, source: "supabase" };
}

export async function confirmSale(input: ConfirmSaleInput): Promise<ConfirmSaleResult> {
  const paymentMethod = input.paymentMethod;
  const notes = typeof input.notes === "string" && input.notes.trim() ? input.notes.trim() : null;
  const items = Array.isArray(input.items) ? input.items : [];

  if (!assertPaymentMethod(paymentMethod)) {
    return { status: "error", message: "El método de pago no es válido." };
  }

  if (items.length === 0) {
    return { status: "error", message: "El carrito no puede estar vacío." };
  }

  for (const item of items) {
    if (!item?.productId || typeof item.productId !== "string") {
      return { status: "error", message: "No se encontró el producto." };
    }

    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return { status: "error", message: "La cantidad debe ser al menos 1." };
    }
  }

  if (!shouldQuerySupabaseTables()) {
    const byId = new Map(mockedProducts.map((product) => [product.id, product]));
    let totalCents = 0;
    let itemCount = 0;

    for (const item of items) {
      const product = byId.get(item.productId);
      if (!product) {
        return { status: "error", message: "No se encontró el producto." };
      }

      if (item.quantity > product.stock) {
        return {
          status: "error",
          message: `No hay suficiente stock para este producto: ${product.title}.`,
        };
      }

      totalCents += product.priceCents * item.quantity;
      itemCount += item.quantity;
    }

    revalidatePath("/sales/new");
    return {
      status: "success",
      saleId: "mock-sale",
      totalAmount: (totalCents / 100).toFixed(2),
      itemCount,
      paymentMethod,
    };
  }

  const supabase = (await createClient() as unknown) as SupabaseSalesClient;
  const itemsPayload = items.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
  }));

  const { data, error } = await supabase.rpc("confirm_sale", {
    items: itemsPayload,
    notes,
    payment_method: paymentMethod,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  type ConfirmSaleRpcRow = {
    sale_id: string;
    total_amount: string;
    item_count: number;
  };

  const rows = Array.isArray(data) ? (data as ConfirmSaleRpcRow[]) : null;
  const row = rows?.[0];
  if (!row?.sale_id) {
    return { status: "error", message: "No se pudo confirmar la venta." };
  }

  revalidatePath("/inventory");
  revalidatePath("/sales");
  revalidatePath("/sales/new");

  return {
    status: "success",
    saleId: String(row.sale_id),
    totalAmount: String(row.total_amount ?? "0.00"),
    itemCount: Number(row.item_count ?? 0),
    paymentMethod,
  };
}

