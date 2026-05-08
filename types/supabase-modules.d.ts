declare module '@supabase/ssr' {
  export function createBrowserClient(...args: unknown[]): unknown
  export function createServerClient(...args: unknown[]): unknown
}

declare module '@supabase/supabase-js' {
  export function createClient(...args: unknown[]): unknown
}
