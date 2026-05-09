"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseTableClient } from "@/lib/inventory/supabase-types";
import {
  createFallbackProduct,
  getFallbackCategories,
  updateFallbackProduct,
} from "@/lib/inventory/mock-store";
import {
  allowedConditionValues,
  type Product,
  type ProductConditionValue,
} from "@/lib/inventory/types";
import type { ProductFormState } from "./product-form-state";

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
