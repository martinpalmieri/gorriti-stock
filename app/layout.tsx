import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "./_components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gorriti Stock",
  description: "Backoffice de inventario y ventas para Gorriti",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
