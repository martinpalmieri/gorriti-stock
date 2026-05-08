import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const screenshotDir = path.join(process.cwd(), "docs", "screenshots");

fs.mkdirSync(screenshotDir, { recursive: true });

const routes = [
  {
    path: "/",
    title: "Resumen de la tienda",
    screenshot: "contrast-dashboard.png",
  },
  {
    path: "/inventory",
    title: "Productos",
    screenshot: "contrast-inventory.png",
  },
  {
    path: "/sales/new",
    title: "Venta manual",
    screenshot: "contrast-new-sale.png",
  },
  {
    path: "/sales",
    title: "Historial de ventas",
    screenshot: "contrast-sales.png",
  },
  {
    path: "/settings",
    title: "Configuración",
    screenshot: "contrast-settings.png",
  },
];

test.describe("Gorriti Stock app shell", () => {
  for (const route of routes) {
    test(`renders ${route.path} and captures screenshot`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(route.path);

      await expect(page).toHaveTitle(/Gorriti Stock/i);
      await expect(
        page.getByRole("navigation", { name: "Navegación principal" }),
      ).toBeVisible();
      await expect(page.getByText("En línea")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: route.title }),
      ).toBeVisible();

      const activeNavigationItem = page.locator('[aria-current="page"]');
      await expect(activeNavigationItem).toHaveClass(/text-white/);

      await page.screenshot({
        path: path.join(screenshotDir, route.screenshot),
        fullPage: true,
      });
    });
  }
});

test.describe("Mocked inventory UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/inventory");
    await expect(
      page.getByRole("heading", { name: "Productos" }),
    ).toBeVisible();
  });

  test("captures the default mocked inventory state", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Inventario simulado" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /El Aleph/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Unknown Pleasures/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Fanzine Gorriti 01/i }),
    ).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "inventory-default.png"),
      fullPage: true,
    });
  });

  test("filters products by search and captures the search state", async ({
    page,
  }) => {
    await page.getByLabel("Buscar producto").fill("Factory");

    await expect(
      page.getByRole("button", { name: /Unknown Pleasures/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /El Aleph/i })).toHaveCount(
      0,
    );

    await page.screenshot({
      path: path.join(screenshotDir, "inventory-search.png"),
      fullPage: true,
    });
  });

  test("shows the empty state when no mocked products match", async ({
    page,
  }) => {
    await page.getByLabel("Buscar producto").fill("zzzz sin coincidencias");

    await expect(
      page.getByText("No hay productos que coincidan"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Limpiar filtros" }),
    ).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "inventory-empty.png"),
      fullPage: true,
    });
  });

  test("captures category, condition, and stock filters", async ({ page }) => {
    await page.getByLabel("Categoría").selectOption("Libro");
    await page.getByLabel("Estado").selectOption("Como nuevo");
    await page.getByLabel("Disponibilidad").selectOption("out");

    await expect(
      page.getByRole("button", { name: /Poeta en Nueva York/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /El Aleph/i })).toHaveCount(
      0,
    );
    await expect(page.getByText("Sin stock")).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "inventory-filtered.png"),
      fullPage: true,
    });
  });

  test("opens mocked product detail and captures the detail panel", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Cassette Gorriti Demo/i }).click();

    await expect(page.getByLabel("Detalle del producto")).toContainText(
      "Cassette Gorriti Demo",
    );
    await expect(page.getByLabel("Detalle del producto")).toContainText(
      "MUS-CAS-DEMO-004",
    );

    await page.screenshot({
      path: path.join(screenshotDir, "inventory-detail.png"),
      fullPage: true,
    });
  });
});
