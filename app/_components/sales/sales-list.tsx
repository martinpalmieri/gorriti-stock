'use client';

import { useMemo, useState } from 'react';
import type { SaleDetail, SaleListItem } from '@/app/(protected)/sales/actions';
import { getSaleDetail } from '@/app/(protected)/sales/actions';
import { paymentMethodLabel } from '@/lib/sales/payment-method';

type SalesListProps = {
  sales: SaleListItem[];
  loadError: string | null;
  initialSaleDetail: SaleDetail | null;
};

const euroFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value: string) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return value;
  return euroFormatter.format(numberValue);
}

function statusLabel(value: string) {
  switch (value) {
    case 'confirmed':
      return 'Confirmada';
    case 'cancelled':
      return 'Cancelada';
    default:
      return value;
  }
}

export function SalesList({
  sales,
  loadError,
  initialSaleDetail,
}: SalesListProps) {
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(
    sales[0]?.id ?? null,
  );
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const selectedSale = useMemo(() => {
    return sales.find((sale) => sale.id === selectedSaleId) ?? null;
  }, [sales, selectedSaleId]);

  const resolvedDetail =
    selectedSaleId && sales[0]?.id === selectedSaleId
      ? (detail ?? initialSaleDetail)
      : detail;

  async function handleSelectSale(nextSaleId: string) {
    setSelectedSaleId(nextSaleId);
    setDetailLoading(true);
    setDetailError(null);

    const result = await getSaleDetail(nextSaleId);
    if (result.status === 'error') {
      setDetail(null);
      setDetailError(result.message);
      setDetailLoading(false);
      return;
    }

    setDetail(result.sale);
    setDetailLoading(false);
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <h3 className="text-lg font-semibold text-stone-950">
          Historial de ventas
        </h3>

        {loadError ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-900">
            No se pudo cargar Supabase: {loadError}
          </p>
        ) : null}

        {sales.length === 0 && !loadError ? (
          <div className="mt-4 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4 text-center">
            <p className="text-base font-semibold text-stone-950">
              Sin ventas todavía
            </p>
            <p className="mt-2 text-sm text-stone-600">
              Cuando confirmes una venta, aparecerá aquí.
            </p>
          </div>
        ) : null}

        {sales.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-lg border border-stone-200">
            <div className="grid grid-cols-[minmax(0,1fr)_120px_140px] gap-4 bg-stone-100 px-3 py-2 text-xs font-medium text-stone-600 max-md:hidden">
              <span>Fecha</span>
              <span>Productos</span>
              <span className="text-right">Total</span>
            </div>
            <div className="divide-y divide-stone-200 bg-white">
              {sales.map((sale) => (
                <button
                  key={sale.id}
                  type="button"
                  onClick={() => void handleSelectSale(sale.id)}
                  className={`grid w-full gap-2 px-3 py-2.5 text-left transition hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-stone-800 md:grid-cols-[minmax(0,1fr)_120px_140px] md:items-center ${
                    selectedSaleId === sale.id ? 'bg-amber-50' : 'bg-white'
                  }`}
                  aria-pressed={selectedSaleId === sale.id}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-950">
                      {formatDateTime(sale.createdAt)}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      Método de pago: {paymentMethodLabel(sale.paymentMethod)} ·{' '}
                      Estado: {statusLabel(sale.status)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-stone-700">
                    {sale.itemCount} unidad{sale.itemCount === 1 ? '' : 'es'}
                  </p>
                  <p className="font-bold text-stone-950 md:text-right">
                    {formatCurrency(sale.totalAmount)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <aside
        className="rounded-lg border border-stone-200 bg-white p-4"
        aria-label="Detalle de venta"
      >
        <h3 className="mt-2 text-lg font-semibold text-stone-950">
          Detalle de venta
        </h3>

        {!selectedSale ? (
          <div className="mt-4 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4 text-center">
            <p className="text-sm font-semibold text-stone-700">
              Selecciona una venta para ver el detalle.
            </p>
          </div>
        ) : null}

        {selectedSale && detailLoading ? (
          <p className="mt-4 rounded-lg bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700 ring-1 ring-stone-200">
            Cargando detalle…
          </p>
        ) : null}

        {selectedSale && detailError ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-900 ring-1 ring-red-200">
            {detailError}
          </p>
        ) : null}

        {selectedSale && resolvedDetail ? (
          <div className="mt-5 space-y-4">
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4 rounded-md bg-stone-50 p-3 ring-1 ring-stone-200">
                <dt className="font-semibold text-stone-600">Fecha</dt>
                <dd className="text-right font-semibold text-stone-950">
                  {formatDateTime(resolvedDetail.createdAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 rounded-md bg-stone-50 p-3 ring-1 ring-stone-200">
                <dt className="font-semibold text-stone-600">Total</dt>
                <dd className="text-right font-bold text-stone-950">
                  {formatCurrency(resolvedDetail.totalAmount)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 rounded-md bg-stone-50 p-3 ring-1 ring-stone-200">
                <dt className="font-semibold text-stone-600">Método de pago</dt>
                <dd className="text-right font-semibold text-stone-950">
                  {paymentMethodLabel(resolvedDetail.paymentMethod)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 rounded-md bg-stone-50 p-3 ring-1 ring-stone-200">
                <dt className="font-semibold text-stone-600">Estado</dt>
                <dd className="text-right font-semibold text-stone-950">
                  {statusLabel(resolvedDetail.status)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 rounded-md bg-stone-50 p-3 ring-1 ring-stone-200">
                <dt className="font-semibold text-stone-600">Productos</dt>
                <dd className="text-right font-semibold text-stone-950">
                  {resolvedDetail.itemCount} unidad
                  {resolvedDetail.itemCount === 1 ? '' : 'es'}
                </dd>
              </div>
            </dl>

            <div>
              <p className="text-sm font-semibold text-stone-800">Productos</p>
              <div className="mt-3 overflow-hidden rounded-lg border border-stone-200">
                <div className="grid grid-cols-[minmax(0,1fr)_90px_120px] gap-3 bg-stone-100 px-3 py-2 text-xs font-medium text-stone-600">
                  <span>Productos</span>
                  <span>Cantidad</span>
                  <span className="text-right">Total</span>
                </div>
                <div className="divide-y divide-stone-200 bg-white">
                  {resolvedDetail.items.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[minmax(0,1fr)_90px_120px] gap-3 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-950">
                          {item.productName}
                        </p>
                        <p className="mt-1 text-sm text-stone-600">
                          Precio unitario: {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-stone-700">
                        {item.quantity}
                      </p>
                      <p className="text-right font-bold text-stone-950">
                        {formatCurrency(item.totalPrice)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </section>
  );
}
