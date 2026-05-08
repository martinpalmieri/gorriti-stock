import 'server-only'

import { cookies } from 'next/headers'

type CookieToSet = {
  name: string
  value: string
  options?: Parameters<Awaited<ReturnType<typeof cookies>>['set']>[2]
}

type SupabaseSsrModule = {
  createServerClient: (
    url: string,
    anonKey: string,
    options: {
      cookies: {
        getAll: () => ReturnType<Awaited<ReturnType<typeof cookies>>['getAll']>
        setAll: (cookiesToSet: CookieToSet[]) => void
      }
    },
  ) => {
    auth: {
      getUser: () => Promise<{ data: { user: { email?: string } | null } }>
      signInWithPassword: (credentials: {
        email: string
        password: string
      }) => Promise<{ error: Error | null }>
      signOut: () => Promise<{ error: Error | null }>
    }
  }
}

const mockAuthCookie = 'gorriti_mock_auth'

const loadModule = new Function(
  'specifier',
  'return import(specifier)',
) as (specifier: string) => Promise<SupabaseSsrModule>

function hasSupabasePublicEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

export async function createClient() {
  const cookieStore = await cookies()

  if (!hasSupabasePublicEnv()) {
    return {
      auth: {
        async getUser() {
          const email = cookieStore.get(mockAuthCookie)?.value

          return {
            data: {
              user: email ? { email } : null,
            },
            error: null,
          }
        },
        async signInWithPassword({
          email,
          password,
        }: {
          email: string
          password: string
        }) {
          if (!email || !password) {
            return { data: null, error: new Error('Missing credentials') }
          }

          cookieStore.set(mockAuthCookie, email, {
            httpOnly: true,
            path: '/',
            sameSite: 'lax',
          })

          return { data: { user: { email } }, error: null }
        },
        async signOut() {
          cookieStore.delete(mockAuthCookie)

          return { error: null }
        },
      },
    }
  }

  const { createServerClient } = await loadModule('@supabase/ssr')

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Components can read cookies but cannot write them.
            // Server Actions and Route Handlers can write refreshed auth cookies.
          }
        },
      },
    },
  )
}
