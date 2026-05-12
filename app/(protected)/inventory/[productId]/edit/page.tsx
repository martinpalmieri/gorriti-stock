import { notFound } from 'next/navigation';
import {
  getInventoryData,
  type InventoryStatusFilter,
  getProductById,
} from '@/lib/inventory/data';
import { ProductForm } from '@/app/_components/inventory/product-form';
import { LinkButton } from '@/app/_components/ui/button';
import { PageHeader } from '@/app/_components/ui/page-header';

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { productId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawStatus = resolvedSearchParams.estado;
  const statusValue = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;
  const status: InventoryStatusFilter =
    statusValue === 'archived' || statusValue === 'all' || statusValue === 'active'
      ? statusValue
      : 'active';

  const returnTo = `/inventory?estado=${status}`;

  const [{ categories, error }, product] = await Promise.all([
    getInventoryData({ status }),
    getProductById(productId),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventario"
        title="Editar producto"
        description="Actualizá los datos del producto y guarda para volver al listado."
        actions={
          <LinkButton href={returnTo} variant="secondary">
            Volver al listado
          </LinkButton>
        }
      />

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-900">
          No se pudo cargar Supabase: {error}
        </p>
      ) : null}

      <ProductForm
        categories={categories}
        mode={{ type: 'edit', product }}
        returnTo={returnTo}
      />
    </div>
  );
}

