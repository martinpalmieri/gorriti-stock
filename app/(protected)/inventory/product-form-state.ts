export type ProductFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Partial<Record<string, string>>;
};

export const initialProductFormState: ProductFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
