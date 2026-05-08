import { NewSaleHeader } from "../../_components/sales/new-sale-header";
import { NewSaleLayout } from "../../_components/sales/new-sale-layout";

export default function NewSalePage() {
  return (
    <div className="space-y-6">
      <NewSaleHeader />
      <NewSaleLayout />
    </div>
  );
}
