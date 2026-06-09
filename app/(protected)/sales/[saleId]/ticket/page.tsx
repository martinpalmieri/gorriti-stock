import { notFound } from "next/navigation";
import { SaleTicket } from "@/app/_components/sales/sale-ticket";
import { getSaleDetail } from "@/app/(protected)/sales/actions";

export default async function SaleTicketPage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const { saleId } = await params;
  const result = await getSaleDetail(saleId);

  if (result.status === "error") {
    notFound();
  }

  return (
    <div className="print:bg-white print:p-0">
      <SaleTicket sale={result.sale} />
    </div>
  );
}
