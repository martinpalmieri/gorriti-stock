import { NewSaleHeader } from "../../../_components/sales/new-sale-header";
import { NewSaleLayout } from "../../../_components/sales/new-sale-layout";
import { listActiveProductsForSale } from "./actions";

export default async function NewSalePage() {
  const productsResult = await listActiveProductsForSale();

  return (
    <div className="space-y-6">
      <NewSaleHeader />
      <NewSaleLayout productsResult={productsResult} />
    </div>
  );
}
