import { LinkButton } from "../ui/button";

export function DashboardHeader() {
  return (
    <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">
        Panel
      </p>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Resumen de la tienda
          </h2>
        </div>
        <LinkButton href="/sales/new">Nueva venta</LinkButton>
      </div>
    </header>
  );
}
