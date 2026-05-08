type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

type QueryBuilder<T> = {
  select: (columns?: string) => QueryBuilder<T>;
  insert: (values: unknown) => QueryBuilder<T>;
  update: (values: unknown) => QueryBuilder<T>;
  delete: () => QueryBuilder<T>;
  eq: (column: string, value: unknown) => QueryBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder<T>;
  single: () => QueryResult<T>;
  then: Promise<{ data: T[] | null; error: { message: string } | null }>["then"];
};

export type SupabaseTableClient = {
  from: <T = unknown>(table: string) => QueryBuilder<T>;
};
