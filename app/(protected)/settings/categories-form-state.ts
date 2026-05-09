import type { CategoryFormState } from "./categories-actions";

export function initialCategoryFormState(): CategoryFormState {
  return {
    status: "idle",
    message: null,
    fieldErrors: {},
  };
}

