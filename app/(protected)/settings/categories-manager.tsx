"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { categorySlugFromName } from "@/lib/categories/slug";
import {
  createCategory,
  updateCategory,
  type CategoryFormState,
} from "./categories-actions";
import { initialCategoryFormState } from "./categories-form-state";
import { Button } from "../../_components/ui/button";

type Category = { id: string; name: string; slug: string };

type Mode =
  | { type: "list" }
  | { type: "create" }
  | { type: "edit"; category: Category };

function StatusMessage({ state }: { state: CategoryFormState }) {
  if (!state.message) {
    return null;
  }

  const classes =
    state.status === "success"
      ? "bg-emerald-100 text-emerald-900"
      : "bg-red-100 text-red-900";

  return (
    <p
      className={`mt-4 rounded-md px-3 py-2 text-sm font-medium ${classes}`}
      role="status"
    >
      {state.message}
    </p>
  );
}

function FieldError({ error }: { error?: string }) {
  if (!error) {
    return null;
  }

  return <p className="mt-1 text-sm font-semibold text-red-800">{error}</p>;
}

function CategoryEditor({
  mode,
  actionsEnabled,
  nameValue,
  setNameValue,
  onDone,
}: {
  mode: Exclude<Mode, { type: "list" }>;
  actionsEnabled: boolean;
  nameValue: string;
  setNameValue: (value: string) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const isCreate = mode.type === "create";
  const action = isCreate ? createCategory : updateCategory;
  const [state, formAction, pending] = useActionState(
    action,
    initialCategoryFormState(),
  );

  const slugPreview = useMemo(
    () => categorySlugFromName(nameValue),
    [nameValue],
  );

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    router.refresh();
    setNameValue("");
    onDone();
  }, [onDone, router, setNameValue, state.status]);

  const editCategory = mode.type === "edit" ? mode.category : null;

  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
      <p className="text-xs font-medium text-amber-800">
        {mode.type === "create" ? "Nueva categoría" : "Editar categoría"}
      </p>

      <h4 className="mt-2 text-xl font-semibold text-stone-950">
        {mode.type === "create"
          ? "Nueva categoría"
          : editCategory?.name ?? "Editar"}
      </h4>

      <StatusMessage state={state} />

      <form action={formAction} className="mt-5 grid gap-4 sm:grid-cols-2">
        {mode.type === "edit" ? (
          <input type="hidden" name="categoryId" value={editCategory?.id ?? ""} />
        ) : null}

        <label className="block">
          <span className="text-sm font-semibold text-stone-800">
            Nombre <span className="text-red-700">*</span>
          </span>
          <input
            name="name"
            value={nameValue}
            onChange={(event) => setNameValue(event.target.value)}
            required
            disabled={!actionsEnabled || pending}
            className="field-control mt-2"
            placeholder="Ej. Papelería fina"
          />
          <FieldError error={state.fieldErrors?.name} />
        </label>

        <div className="rounded-lg border border-stone-200 bg-white p-3">
          <p className="text-sm font-semibold text-stone-800">Slug</p>
          <p className="mt-2 rounded-md bg-stone-50 px-3 py-2 font-mono text-sm text-stone-800 ring-1 ring-stone-200">
            {slugPreview || "—"}
          </p>
          <p className="mt-2 text-xs font-medium text-stone-600">
            Se genera automáticamente a partir del nombre.
          </p>
          <FieldError error={state.fieldErrors?.slug} />
        </div>

        <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={() => {
              setNameValue("");
              onDone();
            }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!actionsEnabled || pending}
          >
            {pending ? "Guardando…" : "Guardar categoría"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function CategoriesManager({
  categories,
  loadError,
  actionsEnabled,
}: {
  categories: Category[];
  loadError: string | null;
  actionsEnabled: boolean;
}) {
  const [mode, setMode] = useState<Mode>({ type: "list" });
  const [nameValue, setNameValue] = useState("");
  const [formSession, setFormSession] = useState(0);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Categorías</h3>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Crea y edita las categorías del inventario.
          </p>
        </div>

        {mode.type === "list" ? (
          <Button
            type="button"
            onClick={() => {
              setNameValue("");
              setFormSession((value) => value + 1);
              setMode({ type: "create" });
            }}
            disabled={!actionsEnabled}
          >
            Añadir categoría
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setNameValue("");
              setFormSession((value) => value + 1);
              setMode({ type: "list" });
            }}
          >
            Volver
          </Button>
        )}
      </div>

      {loadError ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-900">
          No se pudo cargar Supabase: {loadError}
        </p>
      ) : null}

      {!actionsEnabled ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          Las categorías se muestran en modo lectura porque faltan variables de entorno de Supabase.
        </p>
      ) : null}

      {mode.type === "list" ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-stone-200">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px] gap-4 bg-stone-100 px-3 py-2 text-xs font-medium text-stone-600 max-md:hidden">
            <span>Nombre</span>
            <span>Slug</span>
            <span className="text-right">Acciones</span>
          </div>
          <div className="divide-y divide-stone-200 bg-white">
            {categories.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-lg font-bold text-stone-950">
                  Todavía no hay categorías
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
                  Crea la primera categoría para poder seleccionarla en los productos.
                </p>
              </div>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="grid items-start gap-3 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-950">{category.name}</p>
                    <p className="mt-1 text-xs font-medium text-stone-500 md:hidden">
                      Slug: {category.slug}
                    </p>
                  </div>
                  <p className="hidden text-sm text-stone-700 md:block">
                    {category.slug}
                  </p>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setNameValue(category.name);
                        setFormSession((value) => value + 1);
                        setMode({ type: "edit", category });
                      }}
                      disabled={!actionsEnabled}
                    >
                      Editar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <CategoryEditor
          key={formSession}
          mode={mode}
          actionsEnabled={actionsEnabled}
          nameValue={nameValue}
          setNameValue={setNameValue}
          onDone={() => {
            setMode({ type: "list" });
          }}
        />
      )}
    </section>
  );
}

