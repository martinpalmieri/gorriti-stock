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
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <Sidebar pathname={pathname} userEmail={userEmail} />
        <main className="flex-1 px-3 py-4 sm:px-4 lg:px-5 lg:py-5 print:bg-white print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}

