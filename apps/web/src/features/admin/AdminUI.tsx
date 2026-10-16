/** Controles administrativos compartidos: consultas cancelables, formularios y paginación reales. */
import { useState } from 'react';
import type { Page } from '../../services/api/admin';
import { ApiError } from '../../services/api/client';
import { Button } from '../../components/ui/Button';
import { InputField, SelectField, TextareaField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useUnsavedChanges } from './admin-hooks';

export function RemoteState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error?: string;
  retry: () => void;
}) {
  if (loading)
    return (
      <p className="panel-body" role="status">
        Cargando datos…
      </p>
    );
  if (error)
    return (
      <div className="alert alert-error" role="alert">
        {error}{' '}
        <Button variant="secondary" onClick={retry}>
          Reintentar
        </Button>
      </div>
    );
  return null;
}
export function Pager({
  pagination,
  change,
}: {
  pagination: Page<unknown>['pagination'];
  change: (page: number) => void;
}) {
  return (
    <div className="form-actions">
      <span className="muted mr-auto">
        {pagination.total} resultados · página {pagination.page} de {pagination.totalPages}
      </span>
      <Button
        variant="secondary"
        disabled={pagination.page <= 1}
        onClick={() => change(pagination.page - 1)}
      >
        Anterior
      </Button>
      <Button
        variant="secondary"
        disabled={pagination.page >= pagination.totalPages}
        onClick={() => change(pagination.page + 1)}
      >
        Siguiente
      </Button>
    </div>
  );
}
export interface AdminField {
  name: string;
  label: string;
  type?:
    'text' | 'email' | 'password' | 'number' | 'date' | 'time' | 'checkbox' | 'textarea' | 'select';
  required?: boolean;
  nullable?: boolean;
  options?: { value: string; label: string }[];
  hint?: string;
  min?: number;
  step?: string;
  maxLength?: number;
}
export function AdminEditor({
  title,
  fields,
  initial,
  save,
  close,
}: {
  title: string;
  fields: AdminField[];
  initial: Record<string, unknown>;
  save: (body: Record<string, unknown>) => Promise<unknown>;
  close: () => void;
}) {
  const initialValues = Object.fromEntries(
    fields.map((field) => [
      field.name,
      field.type === 'checkbox'
        ? Boolean(initial[field.name])
        : field.type === 'date'
          ? String(initial[field.name] ?? '').slice(0, 10)
          : String(initial[field.name] ?? ''),
    ]),
  );
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  const blocked = useUnsavedChanges(dirty && !busy);
  const cancel = () => {
    if (!busy && (!dirty || window.confirm('¿Descartar los cambios sin guardar?'))) close();
  };
  return (
    <>
      <Modal title={title} wide onClose={cancel}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setError('');
            setErrors({});
            setBusy(true);
            try {
              const body: Record<string, unknown> = {};
              for (const field of fields) {
                const value = values[field.name];
                if (field.type === 'checkbox') body[field.name] = value;
                else if (value === '') {
                  if (field.nullable) body[field.name] = null;
                } else
                  body[field.name] =
                    field.type === 'number'
                      ? Number(value)
                      : field.name === 'sourceCheckedAt'
                        ? value === initialValues[field.name] && initial[field.name]
                          ? initial[field.name]
                          : new Date(`${value}T00:00:00Z`).toISOString()
                        : value;
              }
              if (body.published === true) {
                const missing = [
                  'sourceKey',
                  'sourceUrl',
                  'sourceSha256',
                  'sourceCheckedAt',
                ].filter((key) => !body[key]);
                if (missing.length)
                  throw new ApiError(
                    'Completa la fuente para publicar.',
                    400,
                    'VALIDATION_ERROR',
                    Object.fromEntries(missing.map((key) => [key, 'Obligatorio para publicar.'])),
                  );
              }
              await save(body);
              close();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'No se pudo guardar.');
              if (cause instanceof ApiError) setErrors(cause.fieldErrors);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="form-required-note">* Campos obligatorios</p>
          <fieldset disabled={busy} className="admin-fieldset">
            <div className="form-grid">
              {fields.map((field) => {
                const update = (value: string | boolean) => {
                  setValues((previous) => ({ ...previous, [field.name]: value }));
                  setErrors((previous) => ({ ...previous, [field.name]: '' }));
                };
                const common = {
                  label: field.label,
                  hint: field.hint,
                  error: errors[field.name],
                  required: field.required,
                };
                if (field.type === 'checkbox')
                  return (
                    <label className="checkbox-label" key={field.name}>
                      <input
                        type="checkbox"
                        checked={Boolean(values[field.name])}
                        onChange={(event) => update(event.target.checked)}
                      />
                      {field.label}
                    </label>
                  );
                if (field.type === 'select')
                  return (
                    <SelectField
                      key={field.name}
                      {...common}
                      value={String(values[field.name])}
                      onChange={(event) => update(event.target.value)}
                    >
                      <option value="">Selecciona…</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                  );
                if (field.type === 'textarea')
                  return (
                    <div className="full-width" key={field.name}>
                      <TextareaField
                        {...common}
                        value={String(values[field.name])}
                        onChange={(event) => update(event.target.value)}
                      />
                    </div>
                  );
                return (
                  <InputField
                    key={field.name}
                    {...common}
                    type={field.type ?? 'text'}
                    min={field.min}
                    step={field.step}
                    maxLength={field.maxLength}
                    autoComplete={field.type === 'password' ? 'new-password' : undefined}
                    value={String(values[field.name])}
                    onChange={(event) => update(event.target.value)}
                  />
                );
              })}
            </div>
          </fieldset>
          {error && (
            <div className="alert alert-error" role="alert">
              <p>{error}</p>
              {Object.entries(errors)
                .filter(([key]) => !fields.some((field) => field.name === key))
                .map(([key, message]) => (
                  <p key={key}>
                    {key}: {message}
                  </p>
                ))}
            </div>
          )}
          <div className="form-actions">
            <Button variant="secondary" disabled={busy} onClick={cancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Modal>
      {blocked}
    </>
  );
}
