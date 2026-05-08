import { getInventoryData } from "@/lib/inventory/data";
import { InventoryHeader } from "../../_components/inventory/inventory-header";
import { ProductList } from "../../_components/inventory/product-list";

export default async function InventoryPage() {
  const { categories, products, error } = await getInventoryData();

  return (
    <div className="space-y-6">
      <InventoryHeader />
      <ProductList categories={categories} products={products} loadError={error} />
    </div>
  );
}
