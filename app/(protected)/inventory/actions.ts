"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { shouldQuerySupabaseTables } from "@/lib/supabase/should-query-supabase-tables";
import type { SupabaseTableClient } from "@/lib/inventory/supabase-types";
import {
  createFallbackProduct,
  correctFallbackStock,
  getFallbackCategories,
  getFallbackProducts,
  getFallbackStockMovements,
  setFallbackProductActive,
  updateFallbackProduct,
} from "@/lib/inventory/mock-store";
import {
  allowedConditionValues,
  type Category,
  type Product,
  type ProductConditionValue,
} from "@/lib/inventory/types";
import { validateMediaMetadataFields } from "@/lib/inventory/category-metadata-requirements";
import {
  getInventoryData,
  type InventoryStatusFilter,
  type InventoryStockFilter,
} from "@/lib/inventory/data";
import { INVENTORY_PAGE_SIZE } from "@/lib/inventory/pagination";
import { collectDuplicateMatches } from "@/lib/inventory/duplicate-detection";
import type {
  ProductFormDraft,
  ProductFormState,
} from "./product-form-state";

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

function optionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function productFormDraftFromFormData(formData: FormData): ProductFormDraft {
  return {
    name: optionalText(formData.get("name")),
    categoryId: optionalText(formData.get("categoryId")),
    price: optionalText(formData.get("price")),
    initialStock: optionalText(formData.get("initialStock")) || "0",
    creatorOrAuthor: optionalText(formData.get("creatorOrAuthor")),
    brandPublisherLabel: optionalText(formData.get("brandPublisherLabel")),
    costPrice: optionalText(formData.get("costPrice")),
    condition: optionalText(formData.get("condition")),
    supplier: optionalText(formData.get("supplier")),
    barcode: optionalText(formData.get("barcode")),
    sku: optionalText(formData.get("sku")),
    isbn: optionalText(formData.get("isbn")),
    notes: optionalText(formData.get("notes")),
  };
}

function productFormDraftFromValues(values: ProductFormValues): ProductFormDraft {
  return {
    name: values.name,
    categoryId: values.categoryId,
    price: String(values.price),
    initialStock: String(values.initialStock),
    creatorOrAuthor: values.creatorOrAuthor,
    brandPublisherLabel: values.brandPublisherLabel,
    costPrice: values.costPrice === null ? "" : String(values.costPrice),
    condition: values.condition ?? "",
    supplier: values.supplier,
    barcode: values.barcode,
    sku: values.sku,
    isbn: values.isbn,
    notes: values.notes,
  };
}

function optionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : Number.NaN;
}

function toNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }

  return typeof value === "number" ? value : Number(value);
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
  categorySlug: string | null,
): { values?: ProductFormValues; fieldErrors: ProductFormState["fieldErrors"] } {
  const fieldErrors: ProductFormState["fieldErrors"] = {};
  const name = optionalText(formData.get("name"));
  const categoryId = optionalText(formData.get("categoryId"));
  const price = optionalNumber(formData.get("price"));
  const costPrice = optionalNumber(formData.get("costPrice"));
  const initialStockValue = optionalNumber(formData.get("initialStock"));
  const conditionValue = optionalText(formData.get("condition"));
  const condition = conditionValue === "" ? null : conditionValue;
  const creatorOrAuthor = optionalText(formData.get("creatorOrAuthor"));
  const brandPublisherLabel = optionalText(formData.get("brandPublisherLabel"));
  const supplier = optionalText(formData.get("supplier"));

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

  Object.assign(
    fieldErrors,
    validateMediaMetadataFields({
      categorySlug,
      creatorOrAuthor,
      brandPublisherLabel,
      supplier,
      condition: conditionValue
        ? (conditionValue as ProductConditionValue)
        : "",
    }),
  );

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  return {
    values: {
      name,
      categoryId,
      price: price ?? 0,
      initialStock: initialStockValue ?? 0,
      creatorOrAuthor,
      brandPublisherLabel,
      costPrice,
      condition: condition as ProductConditionValue | null,
      supplier,
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

async function resolveCategorySlug(categoryId: string): Promise<string | null> {
  const normalizedId = categoryId.trim();
  if (!normalizedId) {
    return null;
  }

  if (!shouldQuerySupabaseTables()) {
    return (
      getFallbackCategories().find((category) => category.id === normalizedId)
        ?.slug ?? null
    );
  }

  const supabase = (await createClient() as unknown) as SupabaseTableClient;
  const { data, error } = await supabase
    .from<Category>("categories")
    .select("slug")
    .eq("id", normalizedId)
    .single();

  if (error) {
    return null;
  }

  return data?.slug ?? null;
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
    isActive: true,
    condition: values.condition,
    supplier: values.supplier,
    barcode: values.barcode,
    sku: values.sku,
    isbn: values.isbn,
    notes: values.notes,
  };
}

export type LoadInventoryProductsPageInput = {
  status: InventoryStatusFilter;
  search: string;
  categoryId: string | null;
  condition: ProductConditionValue | null;
  stockFilter: InventoryStockFilter;
  offset: number;
};

export type LoadInventoryProductsPageResult =
  | { status: "success"; products: Product[]; hasMore: boolean }
  | { status: "error"; message: string };

export async function loadInventoryProductsPage(
  input: LoadInventoryProductsPageInput,
): Promise<LoadInventoryProductsPageResult> {
  const { products, hasMore, error } = await getInventoryData({
    status: input.status,
    search: input.search,
    categoryId: input.categoryId,
    condition: input.condition,
    stockFilter: input.stockFilter,
    offset: Math.max(0, input.offset),
    limit: INVENTORY_PAGE_SIZE,
    includeCategories: false,
  });

  if (error) {
    return { status: "error", message: error };
  }

  return { status: "success", products, hasMore };
}

export async function setProductActiveStatus(input: {
  productId: string;
  isActive: boolean;
}): Promise<{ status: "success" | "error"; message: string }> {
  const productId = input.productId.trim();
  if (!productId) {
    return { status: "error", message: "No se encontró el producto." };
  }

  if (!shouldQuerySupabaseTables()) {
    const updated = setFallbackProductActive(productId, input.isActive);
    if (!updated) {
      return { status: "error", message: "No se encontró el producto." };
    }

    revalidatePath("/inventory");
    return {
      status: "success",
      message: input.isActive ? "Producto restaurado" : "Producto archivado",
    };
  }

  const supabase = (await createClient() as unknown) as SupabaseTableClient;
  const { error } = await supabase
    .from("products")
    .update({ is_active: input.isActive })
    .eq("id", productId);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/inventory");
  return {
    status: "success",
    message: input.isActive ? "Producto restaurado" : "Producto archivado",
  };
}

export async function createProduct(
  previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const duplicateConfirmed = optionalText(formData.get("duplicateConfirmed")) === "1";
  const draftFromSubmit = productFormDraftFromFormData(formData);
  const categorySlug = await resolveCategorySlug(
    optionalText(formData.get("categoryId")),
  );
  const parsed = parseProductForm(formData, "create", categorySlug);

  if (!parsed.values) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: parsed.fieldErrors,
      duplicateWarning: duplicateConfirmed
        ? (previousState.duplicateWarning ?? null)
        : null,
      draft: draftFromSubmit,
    };
  }

  const values = parsed.values;
  const draft = productFormDraftFromValues(values);

  if (!duplicateConfirmed) {
    if (!shouldQuerySupabaseTables()) {
      const duplicateMatches = collectDuplicateMatches(
        values,
        getFallbackProducts().map((product) => ({
          id: product.id,
          name: product.name,
          creatorOrAuthor: product.creatorOrAuthor,
          brandPublisherLabel: product.brandPublisherLabel,
          categoryId: product.categoryId,
          categoryName: product.categoryName,
          condition: product.condition,
          currentStock: product.currentStock,
          price: product.price,
          barcode: product.barcode,
          sku: product.sku,
          isbn: product.isbn,
          isActive: product.isActive === true,
        })),
      );

      if (duplicateMatches.length > 0) {
        return {
          status: "error",
          message: "Ya existe un producto parecido en el inventario. Revisá antes de crear uno nuevo.",
          fieldErrors: {},
          duplicateWarning: { matches: duplicateMatches },
          draft,
        };
      }
    } else {
      type DuplicateProductRow = {
        id: string;
        name: string;
        creator_or_author: string | null;
        brand_publisher_label: string | null;
        category_id: string | null;
        condition: string | null;
        current_stock: number;
        price: number | string | null;
        barcode: string | null;
        sku: string | null;
        isbn: string | null;
        is_active: boolean | null;
        categories: { name: string } | null;
      };

      const supabase = (await createClient() as unknown) as SupabaseTableClient;
      const { data: duplicateRows, error: duplicateError } = await supabase
        .from<DuplicateProductRow>("products")
        .select(
          "id, name, creator_or_author, brand_publisher_label, category_id, condition, current_stock, price, barcode, sku, isbn, is_active, categories:category_id(name)",
        )
        .order("updated_at", { ascending: false });

      if (duplicateError) {
        return {
          status: "error",
          message: duplicateError.message ?? "No se pudo verificar duplicados.",
          fieldErrors: {},
          duplicateWarning: null,
          draft,
        };
      }

      const duplicateMatches = collectDuplicateMatches(
        values,
        (duplicateRows ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          creatorOrAuthor: row.creator_or_author ?? "",
          brandPublisherLabel: row.brand_publisher_label ?? "",
          categoryId: row.category_id,
          categoryName: row.categories?.name ?? "Sin categoría",
          condition: row.condition,
          currentStock: row.current_stock,
          price: toNumber(row.price) ?? 0,
          barcode: row.barcode ?? "",
          sku: row.sku ?? "",
          isbn: row.isbn ?? "",
          isActive: row.is_active === true,
        })),
      );

      if (duplicateMatches.length > 0) {
        return {
          status: "error",
          message: "Ya existe un producto parecido en el inventario. Revisá antes de crear uno nuevo.",
          fieldErrors: {},
          duplicateWarning: { matches: duplicateMatches },
          draft,
        };
      }
    }
  }

  if (!shouldQuerySupabaseTables()) {
    createFallbackProduct(fallbackProduct(values), values.initialStock);
    revalidatePath("/inventory");

    return {
      status: "success",
      message: "Producto creado",
      fieldErrors: {},
      duplicateWarning: null,
      draft: null,
    };
  }

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
      duplicateWarning: duplicateConfirmed
        ? (previousState.duplicateWarning ?? null)
        : null,
      draft,
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
      duplicateWarning: duplicateConfirmed
        ? (previousState.duplicateWarning ?? null)
        : null,
      draft,
    };
  }

  revalidatePath("/inventory");

  return {
    status: "success",
    message: "Producto creado",
    fieldErrors: {},
    duplicateWarning: null,
    draft: null,
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
      duplicateWarning: null,
    };
  }

  const categorySlug = await resolveCategorySlug(
    optionalText(formData.get("categoryId")),
  );
  const parsed = parseProductForm(formData, "edit", categorySlug);

  if (!parsed.values) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: parsed.fieldErrors,
      duplicateWarning: null,
    };
  }

  if (!shouldQuerySupabaseTables()) {
    const updated = updateFallbackProduct(productId, fallbackProduct(parsed.values));

    if (!updated) {
      return {
        status: "error",
        message: "No se encontró el producto.",
        fieldErrors: {},
        duplicateWarning: null,
      };
    }

    revalidatePath("/inventory");

    return {
      status: "success",
      message: "Producto actualizado",
      fieldErrors: {},
      duplicateWarning: null,
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
      duplicateWarning: null,
    };
  }

  revalidatePath("/inventory");

  return {
    status: "success",
    message: "Producto actualizado",
    fieldErrors: {},
    duplicateWarning: null,
  };
}

export async function getProductStockMovements(
  productId: string,
): Promise<StockMovementsResult> {
  const normalizedProductId = productId.trim();

  if (!normalizedProductId) {
    return { status: "error", message: "No se encontró el producto.", movements: [] };
  }

  if (!shouldQuerySupabaseTables()) {
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

  if (!shouldQuerySupabaseTables()) {
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

  const { data: productRow, error: productError } = await supabase
    .from<{ is_active: boolean | null }>("products")
    .select("is_active")
    .eq("id", productId)
    .single();

  if (productError) {
    return {
      status: "error",
      message: productError.message ?? "No se pudo corregir el stock.",
      fieldErrors: {},
      updated: null,
    };
  }

  if (productRow?.is_active !== true) {
    return {
      status: "error",
      message: "Este producto está archivado.",
      fieldErrors: {},
      updated: null,
    };
  }

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
