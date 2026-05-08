"use client";

import { useSyncExternalStore } from "react";

function subscribeToNetworkStatus(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);

  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getNetworkStatus() {
  return navigator.onLine;
}

function getServerNetworkStatus() {
  return true;
}

export function OnlineStatus() {
  const isOnline = useSyncExternalStore(
    subscribeToNetworkStatus,
    getNetworkStatus,
    getServerNetworkStatus,
  );

  return (
    <div
      aria-live="polite"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${
        isOnline
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          isOnline ? "bg-emerald-500" : "bg-amber-500"
        }`}
        aria-hidden="true"
      />
      {isOnline ? "En línea" : "Sin conexión"}
    </div>
  );
}
