"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

export type LoginState = {
  message: string;
};

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { message: "Introduce un email y una contraseña." };
  }

  const trimmedEmail = email.trim();

  if (!trimmedEmail || !password) {
    return { message: "Introduce un email y una contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });

  if (error) {
    return { message: "No hemos podido iniciar sesión. Revisa los datos." };
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/login");
}
