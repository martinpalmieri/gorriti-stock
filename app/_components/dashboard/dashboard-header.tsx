import { LinkButton } from '../ui/button';
import { PageHeader } from '../ui/page-header';

export function DashboardHeader() {
  return (
    <PageHeader
      title="Resumen de la tienda"
      actions={
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/sales/new">Nueva venta</LinkButton>
          <LinkButton href="/inventory/new" variant="secondary">
            Nuevo artículo
          </LinkButton>
        </div>
      }
    />
  );
}
