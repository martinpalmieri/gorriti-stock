import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const screenshotDir = path.join(process.cwd(), "docs", "screenshots");

fs.mkdirSync(screenshotDir, { recursive: true });

const routes = [
  { path: "/", title: "Resumen de la tienda", screenshot: "contrast-dashboard.png" },
  { path: "/inventory", title: "Productos", screenshot: "contrast-inventory.png" },
  { path: "/sales/new", title: "Venta manual", screenshot: "contrast-new-sale.png" },
  { path: "/sales", title: "Historial de ventas", screenshot: "contrast-sales.png" },
  { path: "/settings", title: "Configuración", screenshot: "contrast-settings.png" },
];

test.describe("Gorriti Stock app shell", () => {
  for (const route of routes) {
    test(`renders ${route.path} and captures screenshot`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(route.path);

      await expect(page).toHaveTitle(/Gorriti Stock/i);
      await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
      await expect(page.getByText("En línea")).toBeVisible();
      await expect(page.getByRole("heading", { name: route.title })).toBeVisible();

      const activeNavigationItem = page.locator('[aria-current="page"]');
      await expect(activeNavigationItem).toHaveClass(/text-white/);

      await page.screenshot({
        path: path.join(screenshotDir, route.screenshot),
        fullPage: true,
      });
    });
  }
});
