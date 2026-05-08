const settings = [
  "Categorías editables",
  "Acceso privado",
  "Preferencias de exportación CSV",
  "Preparación para modo offline futuro",
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">
          Ajustes
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight">Configuración</h2>
        <p className="mt-3 max-w-2xl text-stone-600">
          Placeholder para configurar la tienda. La autenticación básica ya protege la app. Las categorías reales y la conexión de datos con Supabase quedan para una tarea posterior.
        </p>
      </header>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
        <h3 className="text-xl font-bold">Próximas opciones</h3>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {settings.map((setting) => (
            <li
              key={setting}
              className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm font-medium text-stone-700"
            >
              {setting}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
