'use client';

import { useActionState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type {
  Category,
  Product,
  ProductConditionValue,
} from '@/lib/inventory/types';
import {
  createProduct,
  updateProduct,
} from '@/app/(protected)/inventory/actions';
import { initialProductFormState } from '@/app/(protected)/inventory/product-form-state';
import { Button, LinkButton } from '../ui/button';

const conditionOptions: Array<{ value: ProductConditionValue; label: string }> =
  [
    { value: 'new', label: 'Nuevo' },
    { value: 'used_very_good', label: 'Como nuevo' },
    { value: 'used_good', label: 'Segunda mano' },
  ];

function numberInputValue(value: number | null) {
  return value === null ? '' : String(value);
}

function Field({
  label,
  error,
  required = false,
  className = '',
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-semibold text-stone-800">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </span>
      <div className="mt-2">{children}</div>
      {error ? (
        <p className="mt-1 text-sm font-semibold text-red-800">{error}</p>
      ) : null}
    </label>
  );
}

export type ProductFormMode =
  | { type: 'create' }
  | { type: 'edit'; product: Product };

export function ProductForm({
  categories,
  mode,
  returnTo,
}: {
  categories: Category[];
  mode: ProductFormMode;
  returnTo: string;
}) {
  const router = useRouter();
  const isEditing = mode.type === 'edit';
  const product = mode.type === 'edit' ? mode.product : null;
  const action = isEditing ? updateProduct : createProduct;
  const [state, formAction, pending] = useActionState(
    action,
    initialProductFormState,
  );
  const fieldErrors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === 'success') {
      router.push(returnTo);
    }
  }, [router, returnTo, state.status]);

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="mt-2 text-xl font-semibold text-stone-950">
            {product ? product.name : 'Nuevo producto'}
          </h3>
          <p className="mt-1 text-sm text-stone-700">
            {isEditing
              ? 'El stock actual se muestra solo como lectura. Para cambiarlo, usá Corregir stock desde el listado.'
              : 'El stock inicial creará el primer movimiento de inventario.'}
          </p>
        </div>
        <LinkButton href={returnTo}>Volver al listado</LinkButton>
      </div>

      {state.message ? (
        <p
          className={`mt-4 rounded-md px-3 py-2 text-sm font-medium ${
            state.status === 'success'
              ? 'bg-emerald-100 text-emerald-900'
              : 'bg-red-100 text-red-900'
          }`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <form action={formAction} className="mt-5 grid gap-4 lg:grid-cols-2">
        {product ? (
          <input type="hidden" name="productId" value={product.id} />
        ) : null}

        <Field label="Nombre" error={fieldErrors.name} required>
          <input
            name="name"
            defaultValue={product?.name ?? ''}
            required
            className="field-control"
          />
        </Field>

        <Field label="Categoría" error={fieldErrors.categoryId} required>
          <select
            name="categoryId"
            defaultValue={product?.categoryId ?? ''}
            required
            className="field-control"
          >
            <option value="">Selecciona una categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Precio" error={fieldErrors.price} required>
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product?.price ?? ''}
            required
            className="field-control"
          />
        </Field>

        {isEditing ? (
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-sm font-semibold text-stone-800">Stock actual</p>
            <p className="mt-2 text-xl font-semibold tabular-nums text-stone-950">
              {product?.currentStock ?? 0}
            </p>
          </div>
        ) : (
          <Field
            label="Stock inicial"
            error={fieldErrors.initialStock}
            required
          >
            <input
              name="initialStock"
              type="number"
              min="0"
              step="1"
              defaultValue="0"
              required
              className="field-control"
            />
          </Field>
        )}

        <Field label="Creador / autor">
          <input
            name="creatorOrAuthor"
            defaultValue={product?.creatorOrAuthor ?? ''}
            className="field-control"
          />
        </Field>

        <Field label="Editorial / marca / sello">
          <input
            name="brandPublisherLabel"
            defaultValue={product?.brandPublisherLabel ?? ''}
            className="field-control"
          />
        </Field>

        <Field label="Coste" error={fieldErrors.costPrice}>
          <input
            name="costPrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue={numberInputValue(product?.costPrice ?? null)}
            className="field-control"
          />
        </Field>

        <Field label="Estado" error={fieldErrors.condition}>
          <select
            name="condition"
            defaultValue={product?.condition ?? ''}
            className="field-control"
          >
            <option value="">Sin especificar</option>
            {conditionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Proveedor">
          <input
            name="supplier"
            defaultValue={product?.supplier ?? ''}
            className="field-control"
          />
        </Field>

        <Field label="Código de barras">
          <input
            name="barcode"
            defaultValue={product?.barcode ?? ''}
            className="field-control"
          />
        </Field>

        <Field label="SKU">
          <input
            name="sku"
            defaultValue={product?.sku ?? ''}
            className="field-control"
          />
        </Field>

        <Field label="ISBN">
          <input
            name="isbn"
            defaultValue={product?.isbn ?? ''}
            className="field-control"
          />
        </Field>

        <Field label="Notas" className="lg:col-span-2">
          <textarea
            name="notes"
            defaultValue={product?.notes ?? ''}
            className="field-control min-h-28"
          />
        </Field>

        <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(returnTo)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar producto'}
          </Button>
        </div>
      </form>
    </div>
  );
}
