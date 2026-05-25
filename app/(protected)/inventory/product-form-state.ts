export type ProductFormDraft = {
  name: string;
  categoryId: string;
  price: string;
  initialStock: string;
  creatorOrAuthor: string;
  brandPublisherLabel: string;
  costPrice: string;
  condition: string;
  supplier: string;
  barcode: string;
  sku: string;
  isbn: string;
  notes: string;
};

export type ProductFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Partial<Record<string, string>>;
  duplicateWarning?: {
    matches: DuplicateProductMatch[];
  } | null;
  draft?: ProductFormDraft | null;
};

export type DuplicateProductMatchStrength = "strong" | "possible";

export type DuplicateProductMatch = {
  productId: string;
  strength: DuplicateProductMatchStrength;
  reasons: string[];
  isArchived: boolean;
  name: string;
  creatorOrAuthor: string;
  brandPublisherLabel: string;
  categoryName: string;
  condition: string | null;
  currentStock: number;
  price: number;
  barcode: string;
  sku: string;
  isbn: string;
};

export const initialProductFormState: ProductFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
  duplicateWarning: null,
  draft: null,
};
