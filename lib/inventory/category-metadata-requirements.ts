import type { ProductConditionValue } from "./types";

export const MEDIA_METADATA_CATEGORY_SLUGS = ["libros", "discos-musica"] as const;

export type MediaMetadataCategorySlug =
  (typeof MEDIA_METADATA_CATEGORY_SLUGS)[number];

export function categoryRequiresMediaMetadata(
  slug: string | null | undefined,
): slug is MediaMetadataCategorySlug {
  if (!slug) {
    return false;
  }

  return (MEDIA_METADATA_CATEGORY_SLUGS as readonly string[]).includes(slug);
}

export function validateMediaMetadataFields(input: {
  categorySlug: string | null | undefined;
  creatorOrAuthor: string;
  brandPublisherLabel: string;
  supplier: string;
  condition: ProductConditionValue | "" | null | undefined;
}): Partial<
  Record<"creatorOrAuthor" | "brandPublisherLabel" | "supplier" | "condition", string>
> {
  if (!categoryRequiresMediaMetadata(input.categorySlug)) {
    return {};
  }

  const errors: Partial<
    Record<
      "creatorOrAuthor" | "brandPublisherLabel" | "supplier" | "condition",
      string
    >
  > = {};

  if (!input.creatorOrAuthor.trim()) {
    errors.creatorOrAuthor = "El creador o autor es obligatorio para esta categoría.";
  }

  if (!input.brandPublisherLabel.trim()) {
    errors.brandPublisherLabel =
      "La editorial, marca o sello es obligatoria para esta categoría.";
  }

  if (!input.supplier.trim()) {
    errors.supplier = "El proveedor es obligatorio para esta categoría.";
  }

  if (!input.condition) {
    errors.condition = "El estado es obligatorio para esta categoría.";
  }

  return errors;
}
