/** Editor central con secciones identificables y errores nativos junto a los campos. */
import { useState, type FormEvent } from 'react';
import type { Procedure } from '../../../types/domain';
import { useDemo } from '../../../app/providers/demo-context';
import { useToast } from '../../../hooks/useToast';
import { Button } from '../../../components/ui/Button';
import { InputField, TextareaField } from '../../../components/ui/Field';
import { FormSection } from '../../../components/ui/FormSection';
import { Disclosure } from '../../../components/ui/Disclosure';

export function ProcedureForm({
  procedure,
  onDone,
}: {
  procedure?: Procedure;
  onDone: () => void;
}) {
  const { execute } = useDemo();
  const notify = useToast();
  const [form, setForm] = useState<Procedure>(
    () =>
      procedure ?? {
        id: crypto.randomUUID(),
        name: '',
        description: '',
        category: 'Gestión empresarial',
        requirements: '',
        cost: 0,
        estimatedMinutes: 30,
        active: true,
        published: false,
      },
  );
  const [error, setError] = useState('');
  const patch = (values: Partial<Procedure>) => setForm((value) => ({ ...value, ...values }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      execute({ type: 'save-procedure', procedure: form });
      notify('Trámite guardado.');
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar.');
    }
  };
  return (
    <form onSubmit={submit}>
      <p className="form-required-note">* Campos obligatorios</p>
      <FormSection title="Datos del trámite">
        <div className="full-width">
          <InputField
            label="Nombre"
            placeholder="Nombre del trámite"
            value={form.name}
            onChange={(event) => patch({ name: event.target.value })}
            required
          />
        </div>
        <div className="full-width">
          <InputField
            label="Categoría"
            value={form.category}
            onChange={(event) => patch({ category: event.target.value })}
            required
          />
        </div>
      </FormSection>
      <FormSection title="Costo y duración">
        <InputField
          label="Costo (MXN)"
          type="number"
          min="0"
          step="0.01"
          value={form.cost}
          onChange={(event) => patch({ cost: Number(event.target.value) })}
          hint="0 = gratuito. Igual en todas las sedes."
          required
        />
        <InputField
          label="Duración (min)"
          type="number"
          min="1"
          step="1"
          value={form.estimatedMinutes}
          onChange={(event) => patch({ estimatedMinutes: Number(event.target.value) })}
          required
        />
      </FormSection>
      <FormSection title="Información para el ciudadano">
        <div className="full-width">
          <TextareaField
            label="Descripción"
            placeholder="¿En qué consiste el trámite?"
            value={form.description}
            onChange={(event) => patch({ description: event.target.value })}
            required
          />
        </div>
        <div className="full-width">
          <TextareaField
            label="Requisitos"
            placeholder="Un requisito por línea"
            value={form.requirements}
            onChange={(event) => patch({ requirements: event.target.value })}
            required
          />
        </div>
      </FormSection>
      <Disclosure title="Estado y publicación">
        <div className="form-grid">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => patch({ active: event.target.checked })}
            />
            Trámite activo
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(event) => patch({ published: event.target.checked })}
            />
            Publicado
          </label>
        </div>
      </Disclosure>
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit">Guardar trámite</Button>
      </div>
    </form>
  );
}
