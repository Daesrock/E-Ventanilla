/** Alta ficticia de jefes agrupada en identificación y acceso; nunca almacena contraseñas. */
import { useState, type FormEvent } from 'react';
import type { Role, StaffUser } from '../../../types/domain';
import { useDemo } from '../../../app/providers/demo-context';
import { useToast } from '../../../hooks/useToast';
import { Button } from '../../../components/ui/Button';
import { InputField, SelectField } from '../../../components/ui/Field';
import { FormSection } from '../../../components/ui/FormSection';
import { roleLabels } from '../../auth/policy';

export function UserForm({ user, onDone }: { user?: StaffUser; onDone: () => void }) {
  const { execute } = useDemo();
  const notify = useToast();
  const [form, setForm] = useState<StaffUser>(
    () =>
      user ?? { id: crypto.randomUUID(), name: '', email: '', role: 'COUNTER_HEAD', active: true },
  );
  const [error, setError] = useState('');
  const patch = (values: Partial<StaffUser>) => setForm((value) => ({ ...value, ...values }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      execute({ type: 'save-user', user: form });
      notify('Cuenta de demostración guardada.');
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar.');
    }
  };
  return (
    <form onSubmit={submit}>
      <p className="form-required-note">* Campos obligatorios · usa datos de ejemplo</p>
      <FormSection title="Identificación">
        <div className="full-width">
          <InputField
            label="Nombre"
            placeholder="Nombre completo"
            value={form.name}
            onChange={(event) => patch({ name: event.target.value })}
            required
          />
        </div>
        <div className="full-width">
          <InputField
            label="Correo"
            type="email"
            placeholder="responsable@ejemplo.invalid"
            value={form.email}
            onChange={(event) => patch({ email: event.target.value })}
            required
          />
        </div>
      </FormSection>
      <FormSection title="Acceso">
        <div className="full-width">
          {user ? (
            <p className="readonly-value">{roleLabels[user.role]}</p>
          ) : (
            <SelectField
              label="Rol"
              value={form.role}
              onChange={(event) => patch({ role: event.target.value as Role })}
              required
            >
              <option value="COUNTER_HEAD">Jefe de ventanilla</option>
              <option value="DEPARTMENT_HEAD">Jefe de departamento</option>
            </SelectField>
          )}
        </div>
        <label className="checkbox-label full-width">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => patch({ active: event.target.checked })}
          />
          Cuenta activa
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
        <Button type="submit">Guardar cuenta</Button>
      </div>
    </form>
  );
}
