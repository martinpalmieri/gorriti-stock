"use client";

import Image from "next/image";
import type { SaleDetail } from "@/app/(protected)/sales/actions";
import { TICKET_ISSUER } from "@/lib/sales/ticket-issuer";
import {
  formatTicketCurrency,
  formatTicketDateTime,
  resolveTicketNumber,
  ticketPaymentMethodLabel,
} from "@/lib/sales/ticket-format";
import { Button } from "../ui/button";

type SaleTicketProps = {
  sale: SaleDetail;
};

export function SaleTicket({ sale }: SaleTicketProps) {
  const ticketNumber = resolveTicketNumber({
    ticketNumber: sale.ticketNumber,
    saleId: sale.id,
    createdAt: sale.createdAt,
  });

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <div className="no-print mx-auto mb-6 flex max-w-md items-center justify-between gap-3">
        <p className="text-sm font-medium text-stone-700">
          Vista previa del ticket
        </p>
        <Button type="button" onClick={handlePrint}>
          Imprimir ticket
        </Button>
      </div>

      <article className="ticket-print mx-auto bg-white text-black">
        <header className="ticket-section text-center">
          <Image
            src="/brand/logo.png"
            alt={TICKET_ISSUER.tradeName}
            width={220}
            height={48}
            priority
            className="ticket-logo mx-auto h-auto w-[58mm] max-w-full"
          />
          <p className="ticket-issuer-line mt-3 font-semibold">
            {TICKET_ISSUER.legalName}
          </p>
          <p className="ticket-issuer-line">NIF: {TICKET_ISSUER.nif}</p>
          <p className="ticket-issuer-line">{TICKET_ISSUER.address}</p>
        </header>

        <hr className="ticket-rule" />

        <section className="ticket-section">
          <p className="ticket-heading text-center font-bold uppercase">
            Factura simplificada
          </p>
          <p className="ticket-meta">
            <span className="font-semibold">Nº:</span> {ticketNumber}
          </p>
          <p className="ticket-meta">
            <span className="font-semibold">Fecha:</span>{" "}
            {formatTicketDateTime(sale.createdAt)}
          </p>
        </section>

        <hr className="ticket-rule" />

        <table className="ticket-table w-full border-collapse">
          <thead>
            <tr className="ticket-table-head">
              <th className="ticket-col-product text-left font-bold">
                Producto
              </th>
              <th className="ticket-col-qty text-right font-bold">Ud.</th>
              <th className="ticket-col-price text-right font-bold">Precio</th>
              <th className="ticket-col-total text-right font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id} className="ticket-line">
                <td className="ticket-col-product align-top">
                  {item.productName}
                </td>
                <td className="ticket-col-qty text-right align-top">
                  {item.quantity}
                </td>
                <td className="ticket-col-price text-right align-top">
                  {formatTicketCurrency(item.unitPrice)}
                </td>
                <td className="ticket-col-total text-right align-top font-semibold">
                  {formatTicketCurrency(item.totalPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="ticket-rule" />

        <section className="ticket-section">
          {/* TODO: add per-product VAT breakdown when products support VAT rates. */}
          <p className="ticket-iva text-right font-semibold">IVA incluido</p>
          <p className="ticket-total mt-2 text-right text-[13px] font-bold">
            Total: {formatTicketCurrency(sale.totalAmount)}
          </p>
        </section>

        <hr className="ticket-rule" />

        <footer className="ticket-section">
          <p className="ticket-meta font-semibold">Método de pago</p>
          <div className="ticket-payment mt-1 flex items-baseline justify-between gap-3">
            <span>{ticketPaymentMethodLabel(sale.paymentMethod)}</span>
            <span className="font-semibold">
              {formatTicketCurrency(sale.totalAmount)}
            </span>
          </div>
          <p className="ticket-footer mt-4 text-center">Gracias por tu compra</p>
          <p className="ticket-footer text-center">www.gorriti.eu</p>
        </footer>

        <div className="ticket-feed-space" aria-hidden="true" />
      </article>

      <style jsx global>{`
        .ticket-print {
          width: 72mm;
          max-width: 72mm;
          font-size: 11px;
          line-height: 1.25;
          color: #000;
          background: #fff;
        }

        .ticket-section {
          padding: 0.15rem 0;
        }

        .ticket-issuer-line {
          margin: 0;
          font-size: 10px;
        }

        .ticket-heading {
          margin: 0 0 0.35rem;
          font-size: 11px;
          letter-spacing: 0.02em;
        }

        .ticket-meta {
          margin: 0.1rem 0;
        }

        .ticket-rule {
          margin: 0.45rem 0;
          border: 0;
          border-top: 1px solid #000;
        }

        .ticket-table {
          table-layout: fixed;
        }

        .ticket-table-head th {
          padding: 0.15rem 0;
          border-bottom: 1px solid #000;
          font-size: 10px;
        }

        .ticket-line td {
          padding: 0.2rem 0;
          vertical-align: top;
          word-break: break-word;
        }

        .ticket-col-product {
          width: 44%;
          padding-right: 0.2rem;
        }

        .ticket-col-qty {
          width: 12%;
        }

        .ticket-col-price {
          width: 22%;
        }

        .ticket-col-total {
          width: 22%;
        }

        .ticket-iva {
          margin: 0;
        }

        .ticket-total {
          margin: 0;
        }

        .ticket-payment {
          font-size: 11px;
        }

        .ticket-footer {
          margin: 0.1rem 0;
          font-size: 9px;
          line-height: 1.3;
        }

        /* Feed space only matters on the physical roll; hide it on screen. */
        .ticket-feed-space {
          display: none;
        }

        @media print {
          /*
           * Fixed page height instead of "auto": some thermal printer drivers
           * treat an "auto" height page as a fixed short page and cut/break the
           * receipt before the footer. A tall fixed page keeps the ticket on a
           * single continuous block; the printer's own cutter handles the cut.
           */
          @page {
            size: 80mm 200mm;
            margin: 4mm;
          }

          html,
          body {
            width: 80mm;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          .no-print {
            display: none !important;
          }

          main {
            padding: 0 !important;
            background: #fff !important;
          }

          .ticket-print {
            width: 72mm;
            max-width: 72mm;
            margin: 0 auto;
            font-size: 11px;
            line-height: 1.25;
            color: #000;
            background: #fff;
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .ticket-print header,
          .ticket-print section,
          .ticket-print footer,
          .ticket-print tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Bottom feed so the last printed line clears the cutter. */
          .ticket-feed-space {
            display: block;
            height: 12mm;
          }
        }
      `}</style>
    </>
  );
}
