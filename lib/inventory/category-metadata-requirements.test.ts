import { describe, expect, it } from "vitest";
import {
  categoryRequiresMediaMetadata,
  validateMediaMetadataFields,
} from "./category-metadata-requirements";

describe("categoryRequiresMediaMetadata", () => {
  it("returns true for libros and discos-musica", () => {
    expect(categoryRequiresMediaMetadata("libros")).toBe(true);
    expect(categoryRequiresMediaMetadata("discos-musica")).toBe(true);
  });

  it("returns false for other slugs", () => {
    expect(categoryRequiresMediaMetadata("papeleria")).toBe(false);
    expect(categoryRequiresMediaMetadata(null)).toBe(false);
    expect(categoryRequiresMediaMetadata(undefined)).toBe(false);
    expect(categoryRequiresMediaMetadata("")).toBe(false);
  });
});

describe("validateMediaMetadataFields", () => {
  it("returns empty object when category does not require metadata", () => {
    expect(
      validateMediaMetadataFields({
        categorySlug: "papeleria",
        creatorOrAuthor: "",
        brandPublisherLabel: "",
        supplier: "",
        condition: "",
      }),
    ).toEqual({});
  });

  it("requires creator, editorial, supplier, and condition for libros", () => {
    const errors = validateMediaMetadataFields({
      categorySlug: "libros",
      creatorOrAuthor: "",
      brandPublisherLabel: "",
      supplier: "",
      condition: "",
    });

    expect(errors.creatorOrAuthor).toBeTruthy();
    expect(errors.brandPublisherLabel).toBeTruthy();
    expect(errors.supplier).toBeTruthy();
    expect(errors.condition).toBeTruthy();
  });

  it("returns no errors when all required fields are present", () => {
    expect(
      validateMediaMetadataFields({
        categorySlug: "discos-musica",
        creatorOrAuthor: "Autor",
        brandPublisherLabel: "Sello",
        supplier: "Proveedor",
        condition: "new",
      }),
    ).toEqual({});
  });
});

