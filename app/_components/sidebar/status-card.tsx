import { OnlineStatus } from "../online-status";

export function StatusCard() {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <p className="mb-2 text-xs font-medium text-stone-600">Estado</p>
      <OnlineStatus />
    </div>
  );
}

