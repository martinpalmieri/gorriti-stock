"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OnlineStatus } from "./online-status";

const navigationItems = [
  { href: "/", label: "Inicio" },
  { href: "/inventory", label: "Inventario" },
  { href: "/sales/new", label: "Nueva venta" },
  { href: "/sales", label: "Ventas" },
  { href: "/settings", label: "Ajustes" },
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href;
}

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-stone-100 text-stone-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-stone-200 bg-white px-5 py-5 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
          <div className="flex flex-col gap-6 lg:sticky lg:top-8">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">
                Gorriti
              </p>
              <h1 className="text-2xl font-bold tracking-tight">Stock</h1>
              <p className="text-sm leading-6 text-stone-500">
                Backoffice simple para inventario y ventas manuales.
              </p>
            </div>

            <nav aria-label="Navegación principal" className="flex flex-wrap gap-2 lg:flex-col">
              {navigationItems.map((item) => {
                const active = isActiveRoute(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? "bg-stone-950 text-white shadow-sm"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Estado
              </p>
              <OnlineStatus />
            </div>
          </div>
        </aside>

        <main className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
