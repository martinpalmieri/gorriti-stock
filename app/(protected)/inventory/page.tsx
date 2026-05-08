import { InventoryHeader } from "../../_components/inventory/inventory-header";
import { ProductList } from "../../_components/inventory/product-list";

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <InventoryHeader />
      <ProductList />
    </div>
  );
}
