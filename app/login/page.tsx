import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/');
  }

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-10 text-stone-950 sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <div className="w-full rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
