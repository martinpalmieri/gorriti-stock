import { ExportCsvSection } from "./export-csv-section";
import { CategoriesSection } from "./categories-section";
import { PageHeader } from "../../_components/ui/page-header";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ajustes"
        title="Configuración"
        description="Opciones para gestionar Gorriti Stock."
      />

      <CategoriesSection />
      <ExportCsvSection />
    </div>
  );
}
