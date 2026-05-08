import { InventoryHeader } from "../_components/inventory/inventory-header";
import { ProductList } from "../_components/inventory/product-list";

const mockedProducts = [
  { name: "El Aleph", category: "Libros", stock: 3, price: "€20" },
  { name: "Kind of Blue", category: "Discos", stock: 1, price: "€24" },
  { name: "Cuaderno A5", category: "Papelería", stock: 18, price: "€11" },
];

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <InventoryHeader />
      <ProductList products={mockedProducts} />
    </div>
  );
}
