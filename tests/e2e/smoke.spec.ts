import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const screenshotDir = path.join(process.cwd(), "docs", "screenshots");

fs.mkdirSync(screenshotDir, { recursive: true });

async function loginForE2E(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("tienda@gorriti.local");
  await page.getByLabel("Contraseña").fill("gorriti-demo");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(
    page.getByRole("heading", { name: "Resumen de la tienda" }),
  ).toBeVisible();
}

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


test.describe("Supabase Auth foundation", () => {
  test("redirects to login and captures the login page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.context().clearCookies();
    await page.goto("/");

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Acceso privado" }),
    ).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "auth-login.png"),
      fullPage: true,
    });
  });

  test("logs in and captures the protected dashboard", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await loginForE2E(page);

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "auth-dashboard.png"),
      fullPage: true,
    });
  });

  test("logs out and returns to login", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await loginForE2E(page);
    await page.getByRole("button", { name: "Cerrar sesión" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Acceso privado" }),
    ).toBeVisible();
  });
});

test.describe("Gorriti Stock app shell", () => {
  for (const route of routes) {
    test(`renders ${route.path} and captures screenshot`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await loginForE2E(page);
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
    await loginForE2E(page);
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

test.describe("Mocked nueva venta flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await loginForE2E(page);
    await page.goto("/sales/new");
    await expect(
      page.getByRole("heading", { name: "Venta manual" }),
    ).toBeVisible();
  });

  test("captures the empty mocked sale state", async ({ page }) => {
    await expect(page.getByText("Carrito vacío")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirmar venta" }),
    ).toBeDisabled();

    await page.screenshot({
      path: path.join(screenshotDir, "sale-empty.png"),
      fullPage: true,
    });
  });

  test("searches mocked products and captures matching results", async ({
    page,
  }) => {
    await page.getByLabel("Buscar producto para la venta").fill("Gorriti");

    await expect(page.getByText("Print Huelin")).toBeVisible();
    await expect(page.getByText("Fanzine Gorriti 01")).toBeVisible();
    await expect(page.getByText("Unknown Pleasures")).toHaveCount(0);

    await page.screenshot({
      path: path.join(screenshotDir, "sale-search-results.png"),
      fullPage: true,
    });
  });

  test("adds multiple products and captures the cart total", async ({ page }) => {
    await page.getByRole("button", { name: "Añadir Unknown Pleasures" }).click();
    await page.getByRole("button", { name: "Añadir Cuaderno A5" }).click();
    await page
      .getByRole("button", { name: "Aumentar cantidad de Cuaderno A5" })
      .click();

    await expect(page.getByLabel("Carrito de venta")).toContainText(
      "Unknown Pleasures",
    );
    await expect(page.getByLabel("Carrito de venta")).toContainText(
      "Cuaderno A5",
    );
    await expect(page.getByLabel("Carrito de venta")).toContainText("40,00");

    await page.screenshot({
      path: path.join(screenshotDir, "sale-cart.png"),
      fullPage: true,
    });
  });

  test("captures stock limit controls for a one-stock product", async ({ page }) => {
    await page.getByLabel("Buscar producto para la venta").fill("El Aleph");
    await page.getByRole("button", { name: "Añadir El Aleph" }).click();

    await expect(
      page.getByText("Límite de stock alcanzado: 1 unidad disponible."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Aumentar cantidad de El Aleph" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Añadir El Aleph" }),
    ).toBeDisabled();

    await page.screenshot({
      path: path.join(screenshotDir, "sale-stock-limit.png"),
      fullPage: true,
    });
  });

  test("confirms a mocked sale and captures success state", async ({ page }) => {
    await page.getByRole("button", { name: "Añadir Print Huelin" }).click();
    await page.getByText("Efectivo").click();
    await page.getByRole("button", { name: "Confirmar venta" }).click();

    await expect(page.getByText("Venta confirmada")).toBeVisible();
    await expect(page.getByText("18,00")).toBeVisible();
    await expect(page.getByText(/Pago: Efectivo/)).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "sale-success.png"),
      fullPage: true,
    });
  });
});
