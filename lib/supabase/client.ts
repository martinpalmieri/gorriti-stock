type SupabaseSsrModule = {
  createBrowserClient: (url: string, anonKey: string) => unknown
}

const loadModule = new Function(
  'specifier',
  'return import(specifier)',
) as (specifier: string) => Promise<SupabaseSsrModule>

export async function createClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    throw new Error('Missing Supabase browser environment variables')
  }

  const { createBrowserClient } = await loadModule('@supabase/ssr')

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
