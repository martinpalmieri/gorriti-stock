export type AllowedNewSalePaymentMethod = "manual_sumup" | "cash";

export const NEW_SALE_PAYMENT_METHODS: ReadonlyArray<{
  value: AllowedNewSalePaymentMethod;
  label: string;
}> = [
  { value: "manual_sumup", label: "Tarjeta / SumUp" },
  { value: "cash", label: "Efectivo" },
];

export function paymentMethodLabel(value: string | null | undefined): string {
  switch (value) {
    case "manual_sumup":
      return "Tarjeta / SumUp";
    case "cash":
      return "Efectivo";
    case "other":
      return "Otro";
    default:
      return "—";
  }
}

