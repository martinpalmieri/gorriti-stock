import { LinkButton } from '../ui/button';
import { PageHeader } from '../ui/page-header';

export function DashboardHeader() {
  return (
    <PageHeader
      title="Resumen de la tienda"
      actions={<LinkButton href="/sales/new">Nueva venta</LinkButton>}
    />
  );
}
