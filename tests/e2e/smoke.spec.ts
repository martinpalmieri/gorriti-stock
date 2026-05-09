import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const screenshotDir = path.join(process.cwd(), "docs", "screenshots");

fs.mkdirSync(screenshotDir, { recursive: true });

const bypassAuth = true;

const e2eEmail = process.env.E2E_EMAIL ?? "tienda@gorriti.local";
const e2ePassword = process.env.E2E_PASSWORD ?? "gorriti-demo";

let didEnsureUser = false;

async function ensureE2EUser() {
  if (didEnsureUser) return;
  didEnsureUser = true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return;

  const supabase = createSupabaseClient(url, anonKey);
  await supabase.auth.signUp({ email: e2eEmail, password: e2ePassword });
}

async function loginForE2E(page: import("@playwright/test").Page) {
  if (bypassAuth) {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Resumen de la tienda" }),
    ).toBeVisible();
    return;
  }

  await ensureE2EUser();
  await page.goto("/login");
  await page.getByLabel("Email").fill(e2eEmail);
  await page.getByLabel("Contraseña").fill(e2ePassword);
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

test.describe.skip("Supabase Auth foundation", () => {
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
    await expect(
      page.getByRole("button", { name: "Cerrar sesión" }),
    ).toBeVisible();

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

test.describe("Supabase-backed inventory UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await loginForE2E(page);
    await page.goto("/inventory");
    await expect(
      page.getByRole("heading", { name: "Productos" }),
    ).toBeVisible();
  });

  test("captures the empty real inventory state", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Productos" }),
    ).toBeVisible();
    await expect(page.getByText("Todavía no hay productos")).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "inventory-real-empty.png"),
      fullPage: true,
    });
  });

  test("creates, edits, filters, and captures real product states", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Añadir producto" }).first().click();
    await expect(
      page.getByRole("heading", { name: "Nueva ficha de producto" }),
    ).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "product-create-form.png"),
      fullPage: true,
    });

    const createForm = page
      .locator("form")
      .filter({ hasText: "Guardar producto" });
    await createForm.getByLabel("Nombre").fill("El Aleph Real");
    await createForm.getByLabel("Categoría").selectOption({ index: 1 });
    await createForm.getByLabel("Precio").fill("12");
    await createForm.getByLabel("Stock inicial").fill("2");
    await createForm.getByLabel("Creador / autor").fill("Jorge Luis Borges");
    await createForm
      .getByLabel("Editorial / marca / sello")
      .fill("Editorial Sur");
    await createForm.getByLabel("Coste").fill("6");
    await createForm.getByLabel("Estado").selectOption("used_good");
    await createForm.getByLabel("Proveedor").fill("Distribuidora Centro");
    await createForm.getByLabel("Código de barras").fill("9780000000011");
    await createForm.getByLabel("SKU").fill("LIB-ALEPH-REAL");
    await createForm.getByLabel("ISBN").fill("978-0-00-000001-1");
    await createForm.getByLabel("Notas").fill("Alta real desde el formulario.");
    await createForm.getByRole("button", { name: "Guardar producto" }).click();

    await expect(page.getByText("Producto creado")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /El Aleph Real/i }),
    ).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "inventory-real-with-products.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: /El Aleph Real/i }).click();
    await expect(page.getByLabel("Detalle del producto")).toContainText(
      "LIB-ALEPH-REAL",
    );
    await expect(page.getByLabel("Detalle del producto")).toContainText(
      "2 unidades",
    );
    await expect(page.getByText("Movimientos de stock")).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "product-detail-real.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Corregir stock" }).first().click();
    await expect(page.getByRole("dialog", { name: "Corregir stock" })).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "stock-correction-form.png"),
      fullPage: true,
    });

    const correctionDialog = page.getByRole("dialog", { name: "Corregir stock" });
    await correctionDialog.getByLabel("Ajuste").fill("0");
    await correctionDialog.getByLabel("Motivo").fill("");
    await correctionDialog
      .getByRole("button", { name: "Guardar corrección" })
      .click();

    await expect(correctionDialog.getByText("El ajuste no puede ser 0.")).toBeVisible();
    await expect(correctionDialog.getByText("El motivo es obligatorio.")).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "stock-correction-validation.png"),
      fullPage: true,
    });

    await correctionDialog.getByLabel("Ajuste").fill("-1");
    await correctionDialog.getByLabel("Motivo").fill("Recuento de stock");
    await correctionDialog
      .getByRole("button", { name: "Guardar corrección" })
      .click();

    await expect(page.getByRole("dialog", { name: "Corregir stock" })).toHaveCount(0);
    await expect(page.getByLabel("Detalle del producto")).toContainText("1 unidades");

    await page.screenshot({
      path: path.join(screenshotDir, "stock-correction-success.png"),
      fullPage: true,
    });

    await expect(page.getByText("Movimientos de stock")).toBeVisible();
    await expect(page.getByText("Corrección manual")).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "product-detail-stock-movement.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Editar producto" }).click();
    await expect(page.getByText("Para cambiar el stock, usá Corregir stock.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Corregir stock" }).first()).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "product-edit-stock-readonly.png"),
      fullPage: true,
    });

    await page.screenshot({
      path: path.join(screenshotDir, "product-edit-form.png"),
      fullPage: true,
    });

    const editForm = page.locator("form").filter({ hasText: "Stock actual" });
    await editForm.getByLabel("Precio").fill("13.5");
    await editForm
      .getByLabel("Notas")
      .fill("Producto actualizado desde edición.");
    await editForm.getByRole("button", { name: "Guardar producto" }).click();

    await page.getByLabel("Buscar producto").fill("Editorial Sur");
    await expect(
      page.getByRole("button", { name: /El Aleph Real/i }),
    ).toBeVisible();
    await page.getByLabel("Estado").first().selectOption("used_good");
    await page.getByLabel("Disponibilidad").selectOption("in");
    await expect(
      page.getByRole("button", { name: /El Aleph Real/i }),
    ).toBeVisible();
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

  test("adds multiple products and captures the cart total", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: "Añadir Unknown Pleasures" })
      .click();
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

  test("captures stock limit controls for a one-stock product", async ({
    page,
  }) => {
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

  test("confirms a mocked sale and captures success state", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Añadir Print Huelin" }).click();
    await page.getByText("Efectivo").click();
    await page.getByRole("button", { name: "Confirmar venta" }).click();

    await expect(page.getByText("Venta confirmada")).toBeVisible();
    await expect(page.getByText("18,00 € registrados")).toBeVisible();
    await expect(page.getByText(/Pago: Efectivo/)).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "sale-success.png"),
      fullPage: true,
    });
  });
});
