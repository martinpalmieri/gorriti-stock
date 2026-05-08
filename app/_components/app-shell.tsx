"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar/sidebar";

export function AppShell({
  children,
  userEmail,
}: Readonly<{ children: ReactNode; userEmail?: string }>) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-stone-100 text-stone-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        <Sidebar pathname={pathname} userEmail={userEmail} />
        <main className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

