import { createClient } from "@/lib/supabase/server";
import { perfTime } from "@/lib/perf/log";
import { shouldQuerySupabaseTables } from "@/lib/supabase/should-query-supabase-tables";
import type { Database } from "@/types/database.types";
import type { SupabaseTableClient } from "@/lib/inventory/supabase-types";
import { getFallbackCategories } from "@/lib/inventory/mock-store";
import { CategoriesManager } from "./categories-manager";

type CategoryRow = Pick<
  Database["public"]["Tables"]["categories"]["Row"],
  "id" | "name" | "slug"
>;

export async function CategoriesSection() {
  if (!shouldQuerySupabaseTables()) {
    return (
      <CategoriesManager
        categories={getFallbackCategories()}
        loadError={null}
        actionsEnabled={false}
      />
    );
  }

  const supabase = (await createClient() as unknown) as SupabaseTableClient;
  const { data, error } = await perfTime("settings", "categories", async () =>
    supabase
      .from<CategoryRow>("categories")
      .select("id, name, slug")
      .order("name", { ascending: true }),
  );

  return (
    <CategoriesManager
      categories={(data ?? []).map((row: CategoryRow) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
      }))}
      loadError={error?.message ?? null}
      actionsEnabled={true}
    />
  );
}

