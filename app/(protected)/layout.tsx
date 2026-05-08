import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "../_components/app-shell";
import { createClient } from "../../lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <AppShell userEmail={user.email}>{children}</AppShell>;
}
