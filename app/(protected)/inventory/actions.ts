"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseTableClient } from "@/lib/inventory/supabase-types";
import {
  createFallbackProduct,
  correctFallbackStock,
  getFallbackCategories,
  getFallbackStockMovements,
  updateFallbackProduct,
} from "@/lib/inventory/mock-store";
import {
  allowedConditionValues,
  type Product,
  type ProductConditionValue,
} from "@/lib/inventory/types";
import type { ProductFormState } from "./product-form-state";

type StockMovement = {
  id: string;
  type: string;
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  reason: string | null;
  createdAt: string | null;
};

type SupabaseRpcResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

type SupabaseInventoryClient = SupabaseTableClient & {
  rpc: (fn: string, args: Record<string, unknown>) => SupabaseRpcResult<unknown>;
};

type StockMovementsResult =
  | { status: "success"; movements: StockMovement[] }
  | { status: "error"; message: string; movements: StockMovement[] };

type StockCorrectionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Partial<Record<"adjustment" | "reason", string>>;
  updated?: { productId: string; currentStock: number } | null;
};

type ProductFormValues = {
  name: string;
  categoryId: string;
  price: number;
  initialStock: number;
  creatorOrAuthor: string;
  brandPublisherLabel: string;
  costPrice: number | null;
  condition: ProductConditionValue | null;
  supplier: string;
  barcode: string;
  sku: string;
  isbn: string;
  notes: string;
};

function hasSupabasePublicEnv() {
  return Boolean(
    process.env.PLAYWRIGHT_BYPASS_AUTH !== "1" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function optionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : Number.NaN;
}

function requiredText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function requiredInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  if (value.trim() === "") {
    return null;
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || !Number.isInteger(numberValue)) {
    return Number.NaN;
  }

  return numberValue;
}

function parseProductForm(
  formData: FormData,
  mode: "create" | "edit",
): { values?: ProductFormValues; fieldErrors: ProductFormState["fieldErrors"] } {
  const fieldErrors: ProductFormState["fieldErrors"] = {};
  const name = optionalText(formData.get("name"));
  const categoryId = optionalText(formData.get("categoryId"));
  const price = optionalNumber(formData.get("price"));
  const costPrice = optionalNumber(formData.get("costPrice"));
  const initialStockValue = optionalNumber(formData.get("initialStock"));
  const conditionValue = optionalText(formData.get("condition"));
  const condition = conditionValue === "" ? null : conditionValue;

  if (!name) {
    fieldErrors.name = "El nombre es obligatorio.";
  }

  if (!categoryId) {
    fieldErrors.categoryId = "La categoría es obligatoria.";
  }

  if (price === null || Number.isNaN(price) || price < 0) {
    fieldErrors.price = "El precio debe ser mayor o igual a 0.";
  }

  if (costPrice !== null && (Number.isNaN(costPrice) || costPrice < 0)) {
    fieldErrors.costPrice = "El coste debe ser mayor o igual a 0.";
  }

  if (mode === "create") {
    if (
      initialStockValue === null ||
      Number.isNaN(initialStockValue) ||
      !Number.isInteger(initialStockValue) ||
      initialStockValue < 0
    ) {
      fieldErrors.initialStock =
        "El stock inicial debe ser un entero mayor o igual a 0.";
    }
  }

  if (
    condition !== null &&
    !allowedConditionValues.includes(condition as ProductConditionValue)
  ) {
    fieldErrors.condition = "El estado seleccionado no es válido.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  return {
    values: {
      name,
      categoryId,
      price: price ?? 0,
      initialStock: initialStockValue ?? 0,
      creatorOrAuthor: optionalText(formData.get("creatorOrAuthor")),
      brandPublisherLabel: optionalText(formData.get("brandPublisherLabel")),
      costPrice,
      condition: condition as ProductConditionValue | null,
      supplier: optionalText(formData.get("supplier")),
      barcode: optionalText(formData.get("barcode")),
      sku: optionalText(formData.get("sku")),
      isbn: optionalText(formData.get("isbn")),
      notes: optionalText(formData.get("notes")),
    },
    fieldErrors,
  };
}

function toNullable(value: string) {
  return value === "" ? null : value;
}

function fallbackProduct(values: ProductFormValues): Omit<Product, "id" | "createdAt" | "updatedAt"> {
  const category = getFallbackCategories().find(
    (item) => item.id === values.categoryId,
  );

  return {
    name: values.name,
    categoryId: values.categoryId,
    categoryName: category?.name ?? "Sin categoría",
    creatorOrAuthor: values.creatorOrAuthor,
    brandPublisherLabel: values.brandPublisherLabel,
    price: values.price,
    costPrice: values.costPrice,
    currentStock: values.initialStock,
    condition: values.condition,
    supplier: values.supplier,
    barcode: values.barcode,
    sku: values.sku,
    isbn: values.isbn,
    notes: values.notes,
  };
}

export async function createProduct(
  _previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const parsed = parseProductForm(formData, "create");

  if (!parsed.values) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: parsed.fieldErrors,
    };
  }

  if (!hasSupabasePublicEnv()) {
    createFallbackProduct(fallbackProduct(parsed.values), parsed.values.initialStock);
    revalidatePath("/inventory");

    return {
      status: "success",
      message: "Producto creado",
      fieldErrors: {},
    };
  }

  const values = parsed.values;
  const supabase = (await createClient() as unknown) as SupabaseTableClient;
  const { data: product, error: productError } = await supabase
    .from<{ id: string }>("products")
    .insert({
      name: values.name,
      category_id: values.categoryId,
      creator_or_author: toNullable(values.creatorOrAuthor),
      brand_publisher_label: toNullable(values.brandPublisherLabel),
      price: values.price,
      cost_price: values.costPrice,
      current_stock: values.initialStock,
      condition: values.condition,
      supplier: toNullable(values.supplier),
      barcode: toNullable(values.barcode),
      sku: toNullable(values.sku),
      isbn: toNullable(values.isbn),
      notes: toNullable(values.notes),
    })
    .select("id")
    .single();

  if (productError || !product) {
    return {
      status: "error",
      message: productError?.message ?? "No se pudo crear el producto.",
      fieldErrors: {},
    };
  }

  const { error: stockError } = await supabase.from("stock_movements").insert({
    product_id: product.id,
    type: "initial",
    quantity_change: values.initialStock,
    stock_before: 0,
    stock_after: values.initialStock,
    reason: "Stock inicial",
  });

  if (stockError) {
    await supabase.from("products").delete().eq("id", product.id);

    return {
      status: "error",
      message: stockError.message,
      fieldErrors: {},
    };
  }

  revalidatePath("/inventory");

  return {
    status: "success",
    message: "Producto creado",
    fieldErrors: {},
  };
}

export async function updateProduct(
  _previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const productIdEntry = formData.get("productId");
  const productId = typeof productIdEntry === "string" ? productIdEntry.trim() : "";

  if (!productId) {
    return {
      status: "error",
      message: "No se encontró el producto.",
      fieldErrors: {},
    };
  }

  const parsed = parseProductForm(formData, "edit");

  if (!parsed.values) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: parsed.fieldErrors,
    };
  }

  if (!hasSupabasePublicEnv()) {
    const updated = updateFallbackProduct(productId, fallbackProduct(parsed.values));

    if (!updated) {
      return {
        status: "error",
        message: "No se encontró el producto.",
        fieldErrors: {},
      };
    }

    revalidatePath("/inventory");

    return {
      status: "success",
      message: "Producto actualizado",
      fieldErrors: {},
    };
  }

  const values = parsed.values;
  const supabase = (await createClient() as unknown) as SupabaseTableClient;
  const { error } = await supabase
    .from("products")
    .update({
      name: values.name,
      category_id: values.categoryId,
      creator_or_author: toNullable(values.creatorOrAuthor),
      brand_publisher_label: toNullable(values.brandPublisherLabel),
      price: values.price,
      cost_price: values.costPrice,
      condition: values.condition,
      supplier: toNullable(values.supplier),
      barcode: toNullable(values.barcode),
      sku: toNullable(values.sku),
      isbn: toNullable(values.isbn),
      notes: toNullable(values.notes),
    })
    .eq("id", productId);

  if (error) {
    return {
      status: "error",
      message: error.message,
      fieldErrors: {},
    };
  }

  revalidatePath("/inventory");

  return {
    status: "success",
    message: "Producto actualizado",
    fieldErrors: {},
  };
}

export async function getProductStockMovements(
  productId: string,
): Promise<StockMovementsResult> {
  const normalizedProductId = productId.trim();

  if (!normalizedProductId) {
    return { status: "error", message: "No se encontró el producto.", movements: [] };
  }

  if (!hasSupabasePublicEnv()) {
    return { status: "success", movements: getFallbackStockMovements(normalizedProductId) };
  }

  type StockMovementRow = {
    id: string;
    type: string;
    quantity_change: number;
    stock_before: number;
    stock_after: number;
    reason: string | null;
    created_at: string | null;
  };

  const supabase = (await createClient() as unknown) as SupabaseTableClient;
  const { data, error } = await supabase
    .from<StockMovementRow>("stock_movements")
    .select("id, type, quantity_change, stock_before, stock_after, reason, created_at")
    .eq("product_id", normalizedProductId)
    .order("created_at", { ascending: false });

  if (error) {
    return { status: "error", message: error.message, movements: [] };
  }

  const movements: StockMovement[] = (data ?? []).slice(0, 20).map((row) => ({
    id: row.id,
    type: row.type,
    quantityChange: row.quantity_change,
    stockBefore: row.stock_before,
    stockAfter: row.stock_after,
    reason: row.reason ?? null,
    createdAt: row.created_at ?? null,
  }));

  return { status: "success", movements };
}

export async function correctProductStock(
  previousState: StockCorrectionState,
  formData: FormData,
): Promise<StockCorrectionState> {
  const productId = requiredText(formData.get("productId"));
  const adjustment = requiredInteger(formData.get("adjustment"));
  const reason = requiredText(formData.get("reason"));
  const fieldErrors: StockCorrectionState["fieldErrors"] = {};

  if (!productId) {
    return {
      ...previousState,
      status: "error",
      message: "No se encontró el producto.",
      updated: null,
    };
  }

  if (adjustment === null) {
    fieldErrors.adjustment = "El ajuste es obligatorio.";
  } else if (Number.isNaN(adjustment)) {
    fieldErrors.adjustment = "El ajuste debe ser un entero.";
  } else if (adjustment === 0) {
    fieldErrors.adjustment = "El ajuste no puede ser 0.";
  }

  if (!reason) {
    fieldErrors.reason = "El motivo es obligatorio.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors,
      updated: null,
    };
  }

  if (!hasSupabasePublicEnv()) {
    const result = correctFallbackStock({
      productId,
      adjustment: adjustment ?? 0,
      reason,
    });

    if (result.status === "error") {
      return {
        status: "error",
        message: result.message,
        fieldErrors: {},
        updated: null,
      };
    }

    revalidatePath("/inventory");
    return {
      status: "success",
      message: "Stock corregido",
      fieldErrors: {},
      updated: { productId, currentStock: result.currentStock },
    };
  }

  const supabase = (await createClient() as unknown) as SupabaseInventoryClient;
  const { data, error } = await supabase.rpc("correct_stock", {
    product_id: productId,
    adjustment,
    reason,
  });

  if (error) {
    const message = error.message ?? "No se pudo corregir el stock.";
    const fieldErrorsFromError: StockCorrectionState["fieldErrors"] = {};

    if (message.toLocaleLowerCase("es").includes("menor a 0")) {
      fieldErrorsFromError.adjustment = "Este ajuste dejaría el stock en negativo.";
    }

    return {
      status: "error",
      message,
      fieldErrors: fieldErrorsFromError,
      updated: null,
    };
  }

  type CorrectStockRpcRow = { current_stock: number };
  const rows = Array.isArray(data) ? (data as CorrectStockRpcRow[]) : null;
  const row = rows?.[0];
  if (!row || typeof row.current_stock !== "number") {
    return {
      status: "error",
      message: "No se pudo corregir el stock.",
      fieldErrors: {},
      updated: null,
    };
  }

  revalidatePath("/inventory");

  return {
    status: "success",
    message: "Stock corregido",
    fieldErrors: {},
    updated: { productId, currentStock: row.current_stock },
  };
}
