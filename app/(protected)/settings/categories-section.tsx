import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type { SupabaseTableClient } from "@/lib/inventory/supabase-types";
import { getFallbackCategories } from "@/lib/inventory/mock-store";
import { CategoriesManager } from "./categories-manager";

function hasSupabasePublicEnv() {
  return Boolean(
    process.env.PLAYWRIGHT_BYPASS_AUTH !== "1" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

type CategoryRow = Pick<
  Database["public"]["Tables"]["categories"]["Row"],
  "id" | "name" | "slug"
>;

export async function CategoriesSection() {
  if (!hasSupabasePublicEnv()) {
    return (
      <CategoriesManager
        categories={getFallbackCategories()}
        loadError={null}
        actionsEnabled={false}
      />
    );
  }

  const supabase = (await createClient() as unknown) as SupabaseTableClient;
  const { data, error } = await supabase
    .from<CategoryRow>("categories")
    .select("id, name, slug")
    .order("name", { ascending: true });

  return (
    <CategoriesManager
      categories={(data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
      }))}
      loadError={error?.message ?? null}
      actionsEnabled={true}
    />
  );
}

