import { getInventoryData, type InventoryStatusFilter } from "@/lib/inventory/data";
import { ProductList } from "../../_components/inventory/product-list";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawStatus = resolvedSearchParams.estado;
  const rawSelection = resolvedSearchParams.seleccion;
  const rawOpenStockCorrection = resolvedSearchParams.corregirStock;
  const statusValue = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;
  const selectionValue = Array.isArray(rawSelection)
    ? rawSelection[0]
    : rawSelection;
  const openStockCorrectionValue = Array.isArray(rawOpenStockCorrection)
    ? rawOpenStockCorrection[0]
    : rawOpenStockCorrection;
  const status: InventoryStatusFilter =
    statusValue === "archived" || statusValue === "all" || statusValue === "active"
      ? statusValue
      : "active";
  const deepLinkSelection =
    typeof selectionValue === "string" && selectionValue.trim().length > 0
      ? selectionValue.trim()
      : null;
  const deepLinkOpenStockCorrection = openStockCorrectionValue === "1";

  const { categories, products, error } = await getInventoryData({ status });

  return (
    <div className="space-y-6">
      <ProductList
        categories={categories}
        products={products}
        loadError={error}
        statusFilter={status}
        deepLinkSelection={deepLinkSelection}
        deepLinkOpenStockCorrection={deepLinkOpenStockCorrection}
      />
    </div>
  );
}
