export type ProductFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Partial<Record<string, string>>;
  duplicateWarning?: {
    matches: DuplicateProductMatch[];
  } | null;
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
};
