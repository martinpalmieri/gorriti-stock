import type { Product } from "./types";

export const INVENTORY_SEARCH_FIELDS = [
  "name",
  "creator_or_author",
  "brand_publisher_label",
  "barcode",
  "sku",
  "isbn",
  "notes",
] as const;

function removeAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeForSearch(value: string) {
  return removeAccents(value)
    .toLocaleLowerCase("es")
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getSearchableProductFields(product: Product): string[] {
  return [
    product.name,
    product.creatorOrAuthor,
    product.brandPublisherLabel,
    product.barcode,
    product.sku,
    product.isbn,
    product.notes,
  ];
}

export function textFieldsMatchSearch(fields: string[], query: string) {
  const normalized = normalizeForSearch(query);
  if (!normalized) return true;

  return fields.some((field) => normalizeForSearch(field).includes(normalized));
}

export function productMatchesSearch(product: Product, query: string) {
  return textFieldsMatchSearch(getSearchableProductFields(product), query);
}

export type SaleSearchableProduct = {
  title: string;
  creator: string;
  category: string;
  barcode: string;
  sku: string;
  isbn?: string;
};

export function getSaleSearchableFields(product: SaleSearchableProduct): string[] {
  return [
    product.title,
    product.creator,
    product.category,
    product.barcode,
    product.sku,
    product.isbn ?? "",
  ];
}

export function saleProductMatchesSearch(
  product: SaleSearchableProduct,
  query: string,
) {
  return textFieldsMatchSearch(getSaleSearchableFields(product), query);
}
