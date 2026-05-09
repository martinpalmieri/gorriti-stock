import { ExportCsvSection } from "./export-csv-section";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">
          Ajustes
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight">Configuración</h2>
        <p className="mt-3 max-w-2xl text-stone-600">
          Opciones para gestionar Gorriti Stock.
        </p>
      </header>

      <ExportCsvSection />
    </div>
  );
}
