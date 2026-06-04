import { describe, expect, it } from "vitest";
import type { Product } from "./types";
import {
  normalizeForSearch,
  productMatchesSearch,
  saleProductMatchesSearch,
  textFieldsMatchSearch,
} from "./product-search";

function baseProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-1",
    name: "¿Cuánta tierra necesita un hombre?",
    categoryId: "cat-books",
    categoryName: "Libros",
    creatorOrAuthor: "Annelise Heurtier, Raphaël Urwiller",
    brandPublisherLabel: "Ekare Europa",
    price: 13.6,
    costPrice: null,
    currentStock: 1,
    isActive: true,
    condition: "new",
    supplier: "",
    barcode: "",
    sku: "",
    isbn: "978-84-944291-7-0",
    notes: "",
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

describe("normalizeForSearch", () => {
  it("folds accents and case", () => {
    expect(normalizeForSearch("Cuánta")).toBe("cuanta");
    expect(normalizeForSearch("EL ÁLEPH")).toBe("el aleph");
  });

  it("strips punctuation to spaces", () => {
    expect(normalizeForSearch("¿Cuánta tierra?")).toBe("cuanta tierra");
  });
});

describe("productMatchesSearch", () => {
  it("matches title without accents or Spanish punctuation", () => {
    const product = baseProduct();
    expect(
      productMatchesSearch(product, "Cuanta tierra necesita un hombre"),
    ).toBe(true);
  });

  it("matches exact title with accents and punctuation", () => {
    const product = baseProduct();
    expect(
      productMatchesSearch(product, "¿Cuánta tierra necesita un hombre?"),
    ).toBe(true);
  });

  it("matches case-insensitively on name", () => {
    const product = baseProduct({ name: "El Aleph" });
    expect(productMatchesSearch(product, "el áleph")).toBe(true);
  });

  it("matches isbn substring", () => {
    const product = baseProduct();
    expect(productMatchesSearch(product, "9788494429170")).toBe(false);
    expect(productMatchesSearch(product, "944291")).toBe(true);
  });

  it("returns true for empty query", () => {
    expect(productMatchesSearch(baseProduct(), "")).toBe(true);
    expect(productMatchesSearch(baseProduct(), "   ")).toBe(true);
  });

  it("returns false when no field matches", () => {
    expect(productMatchesSearch(baseProduct(), "joy division")).toBe(false);
  });
});

describe("saleProductMatchesSearch", () => {
  it("matches sale product fields with normalized query", () => {
    expect(
      saleProductMatchesSearch(
        {
          title: "El Aleph",
          creator: "Jorge Luis Borges",
          category: "Libro",
          barcode: "9780000000011",
          sku: "LIB-ALEPH-001",
          isbn: "978-0-00-000001-1",
        },
        "el aleph",
      ),
    ).toBe(true);
  });
});

describe("textFieldsMatchSearch", () => {
  it("matches any provided field", () => {
    expect(textFieldsMatchSearch(["Foo Bar"], "foo")).toBe(true);
    expect(textFieldsMatchSearch(["Foo Bar"], "baz")).toBe(false);
  });
});
