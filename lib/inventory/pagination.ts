function resolvePageSize(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const normalized = Math.trunc(parsed);
  return Math.min(100, Math.max(5, normalized));
}

export const INVENTORY_PAGE_SIZE = resolvePageSize(
  process.env.NEXT_PUBLIC_INVENTORY_PAGE_SIZE,
  40,
);

export const SALES_NEW_PAGE_SIZE = resolvePageSize(
  process.env.NEXT_PUBLIC_SALES_NEW_PAGE_SIZE,
  20,
);
