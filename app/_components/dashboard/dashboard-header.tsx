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
          <p className="mt-3 max-w-2xl text-stone-600">
            Vista rápida con datos simulados para preparar la base del backoffice.
            Todavía no hay conexión con Supabase ni lógica real de ventas.
          </p>
        </div>
        <LinkButton href="/sales/new">Crear nueva venta</LinkButton>
      </div>
    </header>
  );
}

