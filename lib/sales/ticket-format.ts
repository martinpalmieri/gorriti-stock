const euroFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

export function formatTicketCurrency(value: string | number): string {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return String(value);
  }

  return euroFormatter.format(numberValue);
}

export function formatTicketDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Ticket copy uses shorter payment labels than the backoffice UI. */
export function ticketPaymentMethodLabel(
  value: string | null | undefined,
): string {
  switch (value) {
    case "manual_sumup":
      return "Tarjeta";
    case "cash":
      return "Efectivo";
    default:
      return "—";
  }
}

export function resolveTicketNumber(input: {
  ticketNumber: string | null;
  saleId: string;
  createdAt: string | null;
}): string {
  if (input.ticketNumber?.trim()) {
    return input.ticketNumber.trim();
  }

  const year = input.createdAt
    ? new Date(input.createdAt).getFullYear()
    : new Date().getFullYear();
  const suffix = input.saleId.replace(/-/g, "").slice(0, 6).toUpperCase();

  return `GS-${year}-${suffix}`;
}
