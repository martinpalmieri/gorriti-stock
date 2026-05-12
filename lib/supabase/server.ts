import 'server-only'

import { cookies } from 'next/headers'

import { createServerClient } from '@supabase/ssr'

import { hasSupabaseUrlAndAnonKey } from '@/lib/supabase/public-env'

type CookieToSet = {
  name: string
  value: string
  options?: Parameters<Awaited<ReturnType<typeof cookies>>['set']>[2]
}

const mockAuthCookie = 'gorriti_mock_auth'

export async function createClient() {
  const cookieStore = await cookies()

  if (!hasSupabaseUrlAndAnonKey()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Missing Supabase configuration: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
      );
    }

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
