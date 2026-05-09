export const allowedConditionValues = [
  "new",
  "used_very_good",
  "used_good",
] as const;

export type ProductConditionValue = (typeof allowedConditionValues)[number];

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Product = {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string;
  creatorOrAuthor: string;
  brandPublisherLabel: string;
  price: number;
  costPrice: number | null;
  currentStock: number;
  condition: ProductConditionValue | null;
  supplier: string;
  barcode: string;
  sku: string;
  isbn: string;
  notes: string;
  createdAt: string | null;
  updatedAt: string | null;
};
