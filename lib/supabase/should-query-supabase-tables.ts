import "server-only";

import { isPlaywrightAuthBypassEnabled } from "@/lib/playwright-auth-bypass";
import { hasSupabaseUrlAndAnonKey } from "@/lib/supabase/public-env";

/**
 * True when server code should read/write Supabase tables (not mock/fallback data).
 * In non-production, Playwright auth bypass also forces the mock data path.
 */
export function shouldQuerySupabaseTables(): boolean {
  return hasSupabaseUrlAndAnonKey() && !isPlaywrightAuthBypassEnabled();
}
