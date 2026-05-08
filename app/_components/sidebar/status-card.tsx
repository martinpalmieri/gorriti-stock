import { OnlineStatus } from "../online-status";

export function StatusCard() {
  return (
    <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
        Estado
      </p>
      <OnlineStatus />
    </div>
  );
}

