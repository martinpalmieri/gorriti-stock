export function categorySlugFromName(input: string) {
  const trimmed = typeof input === "string" ? input.trim() : "";
  if (!trimmed) {
    return "";
  }

  const withoutAccents = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return withoutAccents
    .toLocaleLowerCase("es")
    .replace(/&/g, " ")
    .replace(/\//g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isValidCategorySlug(slug: string) {
  if (typeof slug !== "string") {
    return false;
  }

  const normalized = slug.trim();
  if (!normalized) {
    return false;
  }

  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized);
}

