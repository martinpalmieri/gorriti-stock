import { ExportCsvSection } from './export-csv-section';
import { CategoriesSection } from './categories-section';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <CategoriesSection />
      <ExportCsvSection />
    </div>
  );
}
