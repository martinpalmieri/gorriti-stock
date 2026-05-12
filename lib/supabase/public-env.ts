/**
 * Whether the public Supabase URL and anon key are present.
 * Used by `createClient` to choose real SSR client vs dev mock auth.
 */
export function hasSupabaseUrlAndAnonKey(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
