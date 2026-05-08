"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {
  message: "",
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-semibold text-stone-800">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-950 shadow-sm outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
          placeholder="tu@email.com"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-sm font-semibold text-stone-800"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-950 shadow-sm outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
          placeholder="••••••••"
        />
      </div>

      {state.message ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-stone-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-stone-800 focus:outline-none focus:ring-4 focus:ring-amber-200 disabled:cursor-not-allowed disabled:bg-stone-500"
      >
        {pending ? "Entrando..." : "Iniciar sesión"}
      </button>
    </form>
  );
}
