"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "../ui/button";
import type { SaleProduct } from "@/app/(protected)/sales/new/actions";
import { confirmSale } from "@/app/(protected)/sales/new/actions";
import {
  NEW_SALE_PAYMENT_METHODS,
  paymentMethodLabel,
  type AllowedNewSalePaymentMethod,
} from "@/lib/sales/payment-method";

type PaymentMethod = AllowedNewSalePaymentMethod;

type CartItem = {
  product: SaleProduct;
  quantity: number;
};

type SuccessSale = {
  totalAmount: string;
  itemCount: number;
  paymentMethod: PaymentMethod;
  saleId: string;
};

const euroFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

function formatPrice(cents: number) {
  return euroFormatter.format(cents / 100);
}

function normalize(value: string) {
  return value.toLocaleLowerCase("es").trim();
}

function productMatchesSearch(product: SaleProduct, query: string) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return true;
  }

  return [
    product.title,
    product.creator,
    product.category,
    product.barcode,
    product.sku,
    product.isbn ?? "",
  ].some((field) => normalize(field).includes(normalizedQuery));
}

export function NewSaleLayout({
  productsResult,
}: {
  productsResult:
    | { status: "success"; products: SaleProduct[]; source: "supabase" | "mock" }
    | {
        status: "error";
        message: string;
        products: SaleProduct[];
        source: "supabase" | "mock";
      };
}) {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("manual_sumup");
  const [successSale, setSuccessSale] = useState<SuccessSale | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredProducts = useMemo(() => {
    return productsResult.products.filter((product) =>
      productMatchesSearch(product, search),
    );
  }, [productsResult.products, search]);

  const cartTotalCents = useMemo(() => {
    return cart.reduce(
      (total, item) => total + item.product.priceCents * item.quantity,
      0,
    );
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  function getQuantityInCart(productId: string) {
    return cart.find((item) => item.product.id === productId)?.quantity ?? 0;
  }

  function addProduct(product: SaleProduct) {
    setSuccessSale(null);
    setErrorMessage(null);
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.product.id === product.id,
      );
      const currentQuantity = existingItem?.quantity ?? 0;

      if (product.stock === 0 || currentQuantity >= product.stock) {
        return currentCart;
      }

      if (existingItem) {
        return currentCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...currentCart, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, nextQuantity: number) {
    setSuccessSale(null);
    setErrorMessage(null);
    setCart((currentCart) =>
      currentCart.flatMap((item) => {
        if (item.product.id !== productId) {
          return [item];
        }

        if (nextQuantity <= 0) {
          return [];
        }

        return [
          {
            ...item,
            quantity: Math.min(nextQuantity, item.product.stock),
          },
        ];
      }),
    );
  }

  function removeItem(productId: string) {
    setSuccessSale(null);
    setErrorMessage(null);
    setCart((currentCart) =>
      currentCart.filter((item) => item.product.id !== productId),
    );
  }

  function cancelSale() {
    setCart([]);
    setSearch("");
    setPaymentMethod("manual_sumup");
    setSuccessSale(null);
    setErrorMessage(null);
  }

  function handleConfirmSale() {
    if (cart.length === 0 || isPending) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result = await confirmSale({
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        paymentMethod,
        notes: null,
      });

      if (result.status === "error") {
        setErrorMessage(result.message);
        return;
      }

      setSuccessSale({
        saleId: result.saleId,
        totalAmount: result.totalAmount,
        itemCount: result.itemCount,
        paymentMethod: result.paymentMethod,
      });
      setCart([]);
      setSearch("");
    });
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-stone-950">
              Buscar productos
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              Busca por título, creador, categoría, código de barras, SKU o ISBN.
            </p>
          </div>
          {productsResult.source === "mock" ? (
            <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
              Datos simulados
            </span>
          ) : null}
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-stone-800">
            Búsqueda rápida
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Escanea o escribe: Borges, Joy Division, ART-HUELIN..."
            className="field-control mt-2 text-base font-medium focus:border-amber-600 focus:ring-4 focus:ring-amber-200"
            type="search"
            autoComplete="off"
            autoFocus
            aria-label="Buscar producto para la venta"
          />
        </label>

        <div className="mt-5 overflow-hidden rounded-lg border border-stone-200">
          <div className="grid grid-cols-[minmax(0,1.25fr)_0.75fr_0.55fr_0.7fr] gap-4 bg-stone-100 px-3 py-2 text-xs font-medium text-stone-600 max-md:hidden">
            <span>Producto</span>
            <span>Categoría</span>
            <span>Stock</span>
            <span className="text-right">Acción</span>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="divide-y divide-stone-200 bg-white">
              {filteredProducts.map((product) => {
                const quantityInCart = getQuantityInCart(product.id);
                const remainingStock = product.stock - quantityInCart;
                const cannotAdd = remainingStock <= 0;

                return (
                  <article
                    key={product.id}
                    className="grid gap-3 px-3 py-2.5 md:grid-cols-[minmax(0,1.25fr)_0.75fr_0.55fr_0.7fr] md:items-center"
                  >
                    <div className="min-w-0">
                      <h4 className="font-semibold text-stone-950">
                        {product.title}
                      </h4>
                      <p className="mt-1 text-sm text-stone-700">
                        {product.creator} · {formatPrice(product.priceCents)}
                      </p>
                      <p className="mt-1 text-xs font-medium text-stone-500">
                        SKU {product.sku} · {product.isbn ? `ISBN ${product.isbn}` : `EAN ${product.barcode}`}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-stone-700">
                      <span className="md:hidden">Categoría: </span>
                      {product.category}
                    </p>
                    <div>
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-sm font-semibold ${
                          remainingStock === 0
                            ? "border-red-200 bg-red-50 text-red-800"
                            : remainingStock === 1
                              ? "border-amber-200 bg-amber-50 text-amber-900"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {remainingStock > 0
                          ? `${remainingStock} disponible${remainingStock === 1 ? "" : "s"}`
                          : "Stock máximo"}
                      </span>
                    </div>
                    <div className="md:text-right">
                      <Button
                        type="button"
                        variant={cannotAdd ? "secondary" : "primary"}
                        className="w-full md:w-auto"
                        onClick={() => addProduct(product)}
                        disabled={cannotAdd}
                        aria-label={`Añadir ${product.title}`}
                      >
                        {cannotAdd ? "Sin stock" : "Añadir"}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="bg-white px-6 py-12 text-center">
              <p className="text-lg font-bold text-stone-950">
                No hay productos que coincidan
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
                Prueba con título, creador, categoría, SKU, ISBN o código de barras.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-4"
                onClick={() => setSearch("")}
              >
                Limpiar búsqueda
              </Button>
            </div>
          )}
        </div>
      </div>

      <aside className="rounded-lg border border-stone-200 bg-white p-4" aria-label="Carrito de venta">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-stone-950">Carrito</h3>
            <p className="mt-1 text-sm text-stone-600">
              {cartItemCount > 0
                ? `${cartItemCount} unidad${cartItemCount === 1 ? "" : "es"} en la venta`
                : "Añade productos para empezar."}
            </p>
          </div>
          <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-800 ring-1 ring-stone-200">
            Venta mostrador
          </span>
        </div>

        {errorMessage ? (
          <div
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-950"
            role="alert"
          >
            <p className="text-xs font-medium text-red-800">
              {errorMessage.toLocaleLowerCase("es").includes("stock")
                ? "Stock insuficiente"
                : "No se pudo confirmar la venta"}
            </p>
            <p className="mt-2 text-sm font-semibold">{errorMessage}</p>
          </div>
        ) : null}

        {cart.length > 0 ? (
          <div className="mt-5 space-y-3">
            {cart.map((item) => (
              <article
                key={item.product.id}
                className="rounded-lg border border-stone-200 bg-stone-50 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-stone-950">
                      {item.product.title}
                    </h4>
                    <p className="mt-1 text-sm text-stone-600">
                      {item.product.creator} · {formatPrice(item.product.priceCents)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.product.id)}
                    className="rounded-md px-2 py-1 text-sm font-medium text-red-700 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                    aria-label={`Quitar ${item.product.title}`}
                  >
                    Quitar
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center overflow-hidden rounded-md border border-stone-300 bg-white">
                    <button
                      type="button"
                      className="px-3 py-1.5 text-base font-semibold text-stone-900 transition hover:bg-stone-100 disabled:text-stone-400"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      aria-label={`Reducir cantidad de ${item.product.title}`}
                    >
                      −
                    </button>
                    <span className="min-w-10 border-x border-stone-200 px-3 py-1.5 text-center font-semibold text-stone-950">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="px-3 py-1.5 text-base font-semibold text-stone-900 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400"
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity + 1)
                      }
                      disabled={item.quantity >= item.product.stock}
                      aria-label={`Aumentar cantidad de ${item.product.title}`}
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-stone-500">Subtotal</p>
                    <p className="text-base font-semibold text-stone-950">
                      {formatPrice(item.product.priceCents * item.quantity)}
                    </p>
                  </div>
                </div>

                {item.quantity >= item.product.stock ? (
                  <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 ring-1 ring-amber-200">
                    Límite de stock alcanzado: {item.product.stock} unidad
                    {item.product.stock === 1 ? "" : "es"} disponible
                    {item.product.stock === 1 ? "" : "s"}.
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4 text-center">
            <p className="text-base font-semibold text-stone-950">Carrito vacío</p>
            <p className="mt-2 text-sm text-stone-600">
              Usa la búsqueda rápida para añadir productos a esta venta.
            </p>
          </div>
        )}

        <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-stone-800">Total</span>
            <span className="text-xl font-semibold tabular-nums tracking-tight text-stone-950">
              {formatPrice(cartTotalCents)}
            </span>
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-stone-800">
            Método de pago
          </legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            {NEW_SALE_PAYMENT_METHODS.map((method) => (
              <label
                key={method.value}
                className={`flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-center text-sm font-medium transition ${
                  paymentMethod === method.value
                    ? "border-stone-950 bg-stone-950 text-white"
                    : "border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.value}
                  checked={paymentMethod === method.value}
                  onChange={() => setPaymentMethod(method.value)}
                  className="sr-only"
                />
                {method.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={cancelSale}
            disabled={isPending}
          >
            Cancelar venta
          </Button>
          <Button
            type="button"
            className="w-full"
            onClick={handleConfirmSale}
            disabled={cart.length === 0 || isPending}
          >
            {isPending ? "Confirmando..." : "Confirmar venta"}
          </Button>
        </div>

        {successSale ? (
          <div
            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-950"
            role="status"
            aria-live="polite"
          >
            <p className="text-xs font-medium text-emerald-800">
              Venta confirmada
            </p>
            <h4 className="mt-2 text-xl font-semibold">
              {euroFormatter.format(Number(successSale.totalAmount))} registrados
            </h4>
            <p className="mt-2 text-sm font-semibold">
              {successSale.itemCount} unidad
              {successSale.itemCount === 1 ? "" : "es"} · Pago:{" "}
              {paymentMethodLabel(successSale.paymentMethod)}.
            </p>
            <p className="mt-2 text-sm text-emerald-900">
              ID de venta: {successSale.saleId}.
            </p>
          </div>
        ) : null}
      </aside>
    </section>
  );
}
