import { isPlaywrightAuthBypassEnabled } from "@/lib/playwright-auth-bypass";
import { createClient } from "@/lib/supabase/server";

export function isoDateForFilename(date = new Date()) {
  // YYYY-MM-DD in local time for user-friendly filenames.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function csvDownloadResponse(csv: string, filename: string) {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Prevent caching potentially sensitive business data.
      "Cache-Control": "no-store",
    },
  });
}

export async function requireAuthenticatedUser() {
  if (isPlaywrightAuthBypassEnabled()) {
    return { ok: true as const };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      response: new Response("Unauthorized", { status: 401 }),
    };
  }

  return { ok: true as const };
}

