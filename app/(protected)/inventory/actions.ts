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
  type Product,
  type ProductConditionValue,
} from "@/lib/inventory/types";
import {
  getInventoryData,
  type InventoryStatusFilter,
  type InventoryStockFilter,
} from "@/lib/inventory/data";
import { INVENTORY_PAGE_SIZE } from "@/lib/inventory/pagination";
import type {
  DuplicateProductMatch,
  DuplicateProductMatchStrength,
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

type DuplicateCandidate = {
  id: string;
  name: string;
  creatorOrAuthor: string;
  brandPublisherLabel: string;
  categoryId: string | null;
  categoryName: string;
  condition: string | null;
  currentStock: number;
  price: number;
  barcode: string;
  sku: string;
  isbn: string;
  isActive: boolean;
};

function optionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function removeAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeText(value: string) {
  return removeAccents(value)
    .toLocaleLowerCase("es")
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

function normalizeIdentifier(value: string) {
  return removeAccents(value)
    .toLocaleLowerCase("es")
    .trim()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function getSignificantWords(value: string) {
  return normalizeText(value)
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length >= 3);
}

function firstSignificantWordsMatch(left: string, right: string) {
  const leftWords = getSignificantWords(left);
  const rightWords = getSignificantWords(right);
  if (leftWords.length === 0 || rightWords.length === 0) {
    return false;
  }

  const wordsToCheck = Math.min(2, leftWords.length, rightWords.length);
  for (let index = 0; index < wordsToCheck; index += 1) {
    if (leftWords[index] !== rightWords[index]) {
      return false;
    }
  }

  return true;
}

function buildDuplicateMatch(input: {
  values: ProductFormValues;
  candidate: DuplicateCandidate;
}): DuplicateProductMatch | null {
  const { values, candidate } = input;
  const reasons: string[] = [];
  let strength: DuplicateProductMatchStrength = "possible";

  const inputIsbn = normalizeIdentifier(values.isbn);
  const inputBarcode = normalizeIdentifier(values.barcode);
  const inputSku = normalizeIdentifier(values.sku);
  const candidateIsbn = normalizeIdentifier(candidate.isbn);
  const candidateBarcode = normalizeIdentifier(candidate.barcode);
  const candidateSku = normalizeIdentifier(candidate.sku);

  if (inputIsbn && candidateIsbn && inputIsbn === candidateIsbn) {
    reasons.push("ISBN idéntico");
    strength = "strong";
  }

  if (inputBarcode && candidateBarcode && inputBarcode === candidateBarcode) {
    reasons.push("Código de barras idéntico");
    strength = "strong";
  }

  if (inputSku && candidateSku && inputSku === candidateSku) {
    reasons.push("SKU idéntico");
    strength = "strong";
  }

  const sameCategory =
    values.categoryId.length > 0 &&
    candidate.categoryId !== null &&
    candidate.categoryId.length > 0 &&
    values.categoryId === candidate.categoryId;

  const inputName = normalizeText(values.name);
  const candidateName = normalizeText(candidate.name);
  const namesEqual = inputName.length > 0 && inputName === candidateName;
  const namesInclude =
    inputName.length > 0 &&
    candidateName.length > 0 &&
    (inputName.includes(candidateName) || candidateName.includes(inputName));
  const namesFirstWordsMatch = firstSignificantWordsMatch(values.name, candidate.name);
  const nameLooksSimilar = namesEqual || namesInclude || namesFirstWordsMatch;

  const inputCreator = normalizeText(values.creatorOrAuthor);
  const candidateCreator = normalizeText(candidate.creatorOrAuthor);
  const sameCreator =
    inputCreator.length > 0 &&
    candidateCreator.length > 0 &&
    inputCreator === candidateCreator;

  const inputBrand = normalizeText(values.brandPublisherLabel);
  const candidateBrand = normalizeText(candidate.brandPublisherLabel);
  const sameBrand =
    inputBrand.length > 0 &&
    candidateBrand.length > 0 &&
    inputBrand === candidateBrand;

  // Text-based duplicates require same category so a vinyl record named
  // "St. Vincent" does not collide with a book named "Vincent".
  const textDuplicateInSameCategory =
    sameCategory && (namesEqual || (nameLooksSimilar && (sameCreator || sameBrand)));

  if (textDuplicateInSameCategory) {
    if (namesEqual) {
      reasons.push("Nombre o título idéntico");
    } else {
      reasons.push("Nombre o título parecido");
    }

    if (sameCreator) {
      reasons.push("Mismo creador o autor");
    }

    if (sameBrand) {
      reasons.push("Misma editorial, marca o sello");
    }
  }

  if (strength !== "strong" && !textDuplicateInSameCategory) {
    return null;
  }

  if (reasons.length === 0) {
    return null;
  }

  return {
    productId: candidate.id,
    strength,
    reasons,
    isArchived: candidate.isActive !== true,
    name: candidate.name,
    creatorOrAuthor: candidate.creatorOrAuthor,
    brandPublisherLabel: candidate.brandPublisherLabel,
    categoryName: candidate.categoryName,
    condition: candidate.condition,
    currentStock: candidate.currentStock,
    price: candidate.price,
    barcode: candidate.barcode,
    sku: candidate.sku,
    isbn: candidate.isbn,
  };
}

function sortDuplicateMatches(matches: DuplicateProductMatch[]) {
  return matches.sort((left, right) => {
    if (left.strength !== right.strength) {
      return left.strength === "strong" ? -1 : 1;
    }

    if (left.isArchived !== right.isArchived) {
      return left.isArchived ? 1 : -1;
    }

    return left.name.localeCompare(right.name, "es");
  });
}

function collectDuplicateMatches(
  values: ProductFormValues,
  candidates: DuplicateCandidate[],
) {
  const matches = candidates
    .map((candidate) => buildDuplicateMatch({ values, candidate }))
    .filter((match): match is DuplicateProductMatch => match !== null)
    .filter((match) => {
      if (!match.isArchived) {
        return true;
      }

      return match.strength === "strong";
    });

  const uniqueByProduct = new Map<string, DuplicateProductMatch>();
  for (const match of sortDuplicateMatches(matches)) {
    if (!uniqueByProduct.has(match.productId)) {
      uniqueByProduct.set(match.productId, match);
    }
  }

  return Array.from(uniqueByProduct.values());
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
  _previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const duplicateConfirmed = optionalText(formData.get("duplicateConfirmed")) === "1";
  const parsed = parseProductForm(formData, "create");

  if (!parsed.values) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: parsed.fieldErrors,
      duplicateWarning: null,
    };
  }

  const values = parsed.values;

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
      duplicateWarning: null,
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
      duplicateWarning: null,
    };
  }

  revalidatePath("/inventory");

  return {
    status: "success",
    message: "Producto creado",
    fieldErrors: {},
    duplicateWarning: null,
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

  const parsed = parseProductForm(formData, "edit");

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
