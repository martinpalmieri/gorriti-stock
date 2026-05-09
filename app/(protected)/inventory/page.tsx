import { getInventoryData, type InventoryStatusFilter } from "@/lib/inventory/data";
import { ProductList } from "../../_components/inventory/product-list";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawStatus = resolvedSearchParams.estado;
  const statusValue = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;
  const status: InventoryStatusFilter =
    statusValue === "archived" || statusValue === "all" || statusValue === "active"
      ? statusValue
      : "active";

  const { categories, products, error } = await getInventoryData({ status });

  return (
    <div className="space-y-6">
      <ProductList
        categories={categories}
        products={products}
        loadError={error}
        statusFilter={status}
      />
    </div>
  );
}
