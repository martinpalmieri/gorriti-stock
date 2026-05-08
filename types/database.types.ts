/**
 * Placeholder for generated Supabase database types.
 *
 * Generate the real types after a Supabase project is available:
 * npx supabase gen types typescript --project-id <project-id> > types/database.types.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = Record<string, never>
