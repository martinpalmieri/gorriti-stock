import {
  getInventoryData,
  type InventoryStatusFilter,
} from '@/lib/inventory/data';
import { ProductForm } from '@/app/_components/inventory/product-form';

export default async function NewProductPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawStatus = resolvedSearchParams.estado;
  const statusValue = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;
  const status: InventoryStatusFilter =
    statusValue === 'archived' ||
    statusValue === 'all' ||
    statusValue === 'active'
      ? statusValue
      : 'active';

  const returnTo = `/inventory?estado=${status}`;
  const { categories, error } = await getInventoryData({ status });

  return (
    <div className="space-y-6">
      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-900">
          No se pudo cargar Supabase: {error}
        </p>
      ) : null}

      <ProductForm
        categories={categories ?? []}
        mode={{ type: 'create' }}
        returnTo={returnTo}
      />
    </div>
  );
}
