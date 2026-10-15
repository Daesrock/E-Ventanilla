/** Horario agrupado por fecha/cupo y horas; valida disponibilidad en comandos locales. */
import { useState, type FormEvent } from 'react';
import type { Branch, TimeSlot } from '../../../types/domain';
import { useDemo } from '../../../app/providers/demo-context';
import { useToast } from '../../../hooks/useToast';
import { InputField, SelectField } from '../../../components/ui/Field';
import { FormSection } from '../../../components/ui/FormSection';
import { Button } from '../../../components/ui/Button';

export function SlotForm({
  slot,
  branches,
  preferredBranch,
  onDone,
}: {
  slot?: TimeSlot;
  branches: Branch[];
  preferredBranch: string;
  onDone: () => void;
}) {
  const { db, execute } = useDemo();
  const notify = useToast();
  const [form, setForm] = useState<TimeSlot>(
    () =>
      slot ?? {
        id: crypto.randomUUID(),
        branchId: preferredBranch || branches[0]?.id || '',
        date: db.referenceDate,
        startsAt: '09:00',
        endsAt: '14:00',
        capacity: 24,
        occupied: 0,
        active: true,
      },
  );
  const [error, setError] = useState('');
  const patch = (values: Partial<TimeSlot>) => setForm((value) => ({ ...value, ...values }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      execute({ type: 'save-slot', slot: form });
      notify('Horario guardado.');
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar.');
    }
  };
  return (
    <form onSubmit={submit}>
      <p className="form-required-note">* Campos obligatorios</p>
      <FormSection title="Fecha y cupo">
        <div className="full-width">
          {slot || branches.length === 1 ? (
            <p className="readonly-value">
              {branches.find((branch) => branch.id === form.branchId)?.name}
            </p>
          ) : (
            <SelectField
              label="Sede"
              value={form.branchId}
              onChange={(event) => patch({ branchId: event.target.value })}
              required
            >
              {branches
                .filter((branch) => branch.active || branch.id === form.branchId)
                .map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
            </SelectField>
          )}
        </div>
        <InputField
          label="Fecha"
          type="date"
          value={form.date}
          onChange={(event) => patch({ date: event.target.value })}
          required
        />
        <InputField
          label="Cupo total"
          type="number"
          min={Math.max(1, form.occupied)}
          step="1"
          value={form.capacity}
          onChange={(event) => patch({ capacity: Number(event.target.value) })}
          hint={form.occupied ? `${form.occupied} cupos ocupados.` : undefined}
          required
        />
      </FormSection>
      <FormSection title="Horario">
        <InputField
          label="Desde"
          type="time"
          value={form.startsAt}
          onChange={(event) => patch({ startsAt: event.target.value })}
          required
        />
        <InputField
          label="Hasta"
          type="time"
          value={form.endsAt}
          onChange={(event) => patch({ endsAt: event.target.value })}
          required
        />
        <label className="checkbox-label full-width">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => patch({ active: event.target.checked })}
          />
          Horario activo
        </label>
      </FormSection>
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit">Guardar horario</Button>
      </div>
    </form>
  );
}
