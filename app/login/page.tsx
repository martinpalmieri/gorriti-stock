import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-10 text-stone-950 sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <div className="w-full rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">
            Gorriti Stock
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Acceso privado
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Inicia sesión con el email y la contraseña de Supabase Auth para
            gestionar inventario, ventas y ajustes de la tienda.
          </p>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
