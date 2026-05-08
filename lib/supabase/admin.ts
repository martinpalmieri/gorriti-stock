import 'server-only'

type SupabaseJsModule = {
  createClient: (
    url: string,
    serviceRoleKey: string,
    options: {
      auth: {
        autoRefreshToken: boolean
        persistSession: boolean
      }
    },
  ) => unknown
}

const loadModule = new Function(
  'specifier',
  'return import(specifier)',
) as (specifier: string) => Promise<SupabaseJsModule>

export async function createAdminClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error('Missing Supabase admin environment variables')
  }

  const { createClient: createSupabaseClient } = await loadModule(
    '@supabase/supabase-js',
  )

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
