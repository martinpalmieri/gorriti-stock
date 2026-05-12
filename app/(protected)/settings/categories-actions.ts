"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { shouldQuerySupabaseTables } from "@/lib/supabase/should-query-supabase-tables";
import { categorySlugFromName, isValidCategorySlug } from "@/lib/categories/slug";
import type { SupabaseTableClient } from "@/lib/inventory/supabase-types";

export type CategoryFormState = {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Partial<Record<"name" | "slug", string>>;
};

function requiredText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybe = error as { message?: unknown; code?: unknown };
  const message = typeof maybe.message === "string" ? maybe.message : "";
  const code = typeof maybe.code === "string" ? maybe.code : "";

  return (
    code === "23505" ||
    message.toLocaleLowerCase("es").includes("duplicate") ||
    message.toLocaleLowerCase("es").includes("unique") ||
    message.includes("categories_slug_key")
  );
}

async function categoryConflictExists(input: {
  supabase: SupabaseTableClient;
  name: string;
  slug: string;
  excludeId?: string;
}) {
  const base = input.supabase
    .from<{ id: string }>("categories")
    .select("id");

  const slugQuery = input.excludeId
    ? base.eq("slug", input.slug).neq("id", input.excludeId)
    : base.eq("slug", input.slug);
  const nameQuery = input.excludeId
    ? base.ilike("name", input.name).neq("id", input.excludeId)
    : base.ilike("name", input.name);

  const [slugResult, nameResult] = await Promise.all([slugQuery, nameQuery]);

  if (slugResult.error) {
    return { status: "error" as const, message: slugResult.error.message };
  }

  if (nameResult.error) {
    return { status: "error" as const, message: nameResult.error.message };
  }

  return {
    status: "success" as const,
    exists: Boolean(slugResult.data?.length || nameResult.data?.length),
  };
}

export async function createCategory(
  _previousState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const name = requiredText(formData.get("name"));
  const slug = categorySlugFromName(name);
  const fieldErrors: CategoryFormState["fieldErrors"] = {};

  if (!name) {
    fieldErrors.name = "El nombre es obligatorio.";
  }

  if (!slug) {
    fieldErrors.slug = "El slug es obligatorio.";
  } else if (!isValidCategorySlug(slug)) {
    fieldErrors.slug =
      "El slug solo puede contener letras minúsculas, números y guiones.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Revisa los campos marcados.", fieldErrors };
  }

  if (!shouldQuerySupabaseTables()) {
    return {
      status: "error",
      message: "No se pudo guardar la categoría",
      fieldErrors: {},
    };
  }

  const supabase = (await createClient() as unknown) as SupabaseTableClient;
  const conflict = await categoryConflictExists({ supabase, name, slug });
  if (conflict.status === "error") {
    return { status: "error", message: conflict.message, fieldErrors: {} };
  }

  if (conflict.exists) {
    return {
      status: "error",
      message: "Ya existe una categoría con ese nombre o slug",
      fieldErrors: {},
    };
  }

  const { error } = await supabase.from("categories").insert({ name, slug });

  if (error) {
    return {
      status: "error",
      message: isUniqueViolation(error)
        ? "Ya existe una categoría con ese nombre o slug"
        : "No se pudo guardar la categoría",
      fieldErrors: {},
    };
  }

  revalidatePath("/settings");
  revalidatePath("/inventory");

  return {
    status: "success",
    message: "Categoría creada",
    fieldErrors: {},
  };
}

export async function updateCategory(
  _previousState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const categoryId = requiredText(formData.get("categoryId"));
  const name = requiredText(formData.get("name"));
  const slug = categorySlugFromName(name);
  const fieldErrors: CategoryFormState["fieldErrors"] = {};

  if (!categoryId) {
    return {
      status: "error",
      message: "No se encontró la categoría.",
      fieldErrors: {},
    };
  }

  if (!name) {
    fieldErrors.name = "El nombre es obligatorio.";
  }

  if (!slug) {
    fieldErrors.slug = "El slug es obligatorio.";
  } else if (!isValidCategorySlug(slug)) {
    fieldErrors.slug =
      "El slug solo puede contener letras minúsculas, números y guiones.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Revisa los campos marcados.", fieldErrors };
  }

  if (!shouldQuerySupabaseTables()) {
    return {
      status: "error",
      message: "No se pudo guardar la categoría",
      fieldErrors: {},
    };
  }

  const supabase = (await createClient() as unknown) as SupabaseTableClient;
  const conflict = await categoryConflictExists({
    supabase,
    name,
    slug,
    excludeId: categoryId,
  });

  if (conflict.status === "error") {
    return { status: "error", message: conflict.message, fieldErrors: {} };
  }

  if (conflict.exists) {
    return {
      status: "error",
      message: "Ya existe una categoría con ese nombre o slug",
      fieldErrors: {},
    };
  }

  const { error } = await supabase
    .from("categories")
    .update({ name, slug })
    .eq("id", categoryId);

  if (error) {
    return {
      status: "error",
      message: isUniqueViolation(error)
        ? "Ya existe una categoría con ese nombre o slug"
        : "No se pudo guardar la categoría",
      fieldErrors: {},
    };
  }

  revalidatePath("/settings");
  revalidatePath("/inventory");

  return {
    status: "success",
    message: "Categoría actualizada",
    fieldErrors: {},
  };
}

