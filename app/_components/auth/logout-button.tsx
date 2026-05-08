"use client";

import { logout } from "../../login/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-left text-sm font-bold text-stone-800 transition hover:border-stone-400 hover:bg-stone-50 focus:outline-none focus:ring-4 focus:ring-amber-100"
      >
        Cerrar sesión
      </button>
    </form>
  );
}
