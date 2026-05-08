import { expect, test } from "@playwright/test";
import path from "node:path";

const screenshotDir = path.join(process.cwd(), "docs", "screenshots");

const routes = [
  { path: "/", title: "Resumen de la tienda", screenshot: "dashboard.png" },
  { path: "/inventory", title: "Productos", screenshot: "inventory.png" },
  { path: "/sales/new", title: "Venta manual", screenshot: "new-sale.png" },
  { path: "/sales", title: "Historial de ventas", screenshot: "sales.png" },
  { path: "/settings", title: "Configuración", screenshot: "settings.png" },
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

      await page.screenshot({
        path: path.join(screenshotDir, route.screenshot),
        fullPage: true,
      });
    });
  }
});
