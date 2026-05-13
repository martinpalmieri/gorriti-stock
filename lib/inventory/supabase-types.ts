type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

type QueryBuilder<T> = {
  select: (
    columns?: string,
    options?: { count: "exact"; head: boolean },
  ) => QueryBuilder<T>;
  insert: (values: unknown) => QueryBuilder<T>;
  update: (values: unknown) => QueryBuilder<T>;
  delete: () => QueryBuilder<T>;
  eq: (column: string, value: unknown) => QueryBuilder<T>;
  neq: (column: string, value: unknown) => QueryBuilder<T>;
  ilike: (column: string, pattern: string) => QueryBuilder<T>;
  or: (filters: string) => QueryBuilder<T>;
  gte: (column: string, value: unknown) => QueryBuilder<T>;
  lte: (column: string, value: unknown) => QueryBuilder<T>;
  gt: (column: string, value: unknown) => QueryBuilder<T>;
  lt: (column: string, value: unknown) => QueryBuilder<T>;
  limit: (count: number) => QueryBuilder<T>;
  range: (from: number, to: number) => QueryBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder<T>;
  single: () => QueryResult<T>;
  then: Promise<{ data: T[] | null; error: { message: string } | null }>["then"];
};

export type SupabaseTableClient = {
  from: <T = unknown>(table: string) => QueryBuilder<T>;
};
