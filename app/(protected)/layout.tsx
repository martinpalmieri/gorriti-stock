import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "../_components/app-shell";
import { isPlaywrightAuthBypassEnabled } from "@/lib/playwright-auth-bypass";
import { perfLog, perfTime } from "@/lib/perf/log";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  if (isPlaywrightAuthBypassEnabled()) {
    return <AppShell userEmail="playwright@gorriti.local">{children}</AppShell>;
  }

  const supabase = await perfTime<Awaited<ReturnType<typeof createClient>>>(
    "layout",
    "createClient",
    async () => createClient(),
  );
  const authResult = await perfTime<Awaited<ReturnType<typeof supabase.auth.getUser>>>(
    "layout",
    "getUser",
    async () => supabase.auth.getUser(),
  );
  const {
    data: { user },
  } = authResult;

  if (process.env.ENABLE_PERF_LOGS === "1") {
    perfLog("layout", `hasUser=${user ? "1" : "0"}`);
  }

  if (!user) {
    redirect("/login");
  }

  return <AppShell userEmail={user.email}>{children}</AppShell>;
}
