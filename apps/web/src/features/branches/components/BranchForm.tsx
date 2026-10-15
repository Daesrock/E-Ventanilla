/** Formulario agrupado de sede; cada perfil ve únicamente campos que puede editar. */
import { useState, type FormEvent } from 'react';
import type { Branch, BranchType } from '../../../types/domain';
import { useDemo } from '../../../app/providers/demo-context';
import { useMunicipalities } from '../../../hooks/useMunicipalities';
import { useToast } from '../../../hooks/useToast';
import { canAssignHeads } from '../../auth/policy';
import { Button } from '../../../components/ui/Button';
import { InputField, SelectField, TextareaField } from '../../../components/ui/Field';
import { FormSection } from '../../../components/ui/FormSection';
import { Disclosure } from '../../../components/ui/Disclosure';

export function BranchForm({ branch, onDone }: { branch?: Branch; onDone: () => void }) {
  const { db, user, execute } = useDemo();
  const { municipalities, status } = useMunicipalities();
  const notify = useToast();
  const [form, setForm] = useState<Branch>(
    () =>
      branch ?? {
        id: crypto.randomUUID(),
        name: '',
        type: 'VUGE',
        municipality: 'Tuxtla Gutiérrez',
        municipalityCode: '07101',
        address: '',
        phone: '',
        counterHeadId: null,
        active: true,
        published: false,
      },
  );
  const [error, setError] = useState('');
  const manager = Boolean(user && canAssignHeads(user));
  const patch = (values: Partial<Branch>) => setForm((value) => ({ ...value, ...values }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      execute({ type: 'save-branch', branch: form });
      notify('Sede guardada.');
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar.');
    }
  };
  return (
    <form onSubmit={submit}>
      <p className="form-required-note">* Campos obligatorios</p>
      {manager && (
        <FormSection title="Datos generales">
          <div className="full-width">
            <InputField
              label="Nombre de sede"
              placeholder="Ej. VUGE Tuxtla Gutiérrez"
              value={form.name}
              onChange={(event) => patch({ name: event.target.value })}
              required
            />
          </div>
          <SelectField
            label="Tipo"
            value={form.type}
            onChange={(event) => patch({ type: event.target.value as BranchType })}
            required
          >
            <option>VUGE</option>
            <option>VIM</option>
          </SelectField>
          <SelectField
            label="Municipio"
            value={form.municipalityCode}
            onChange={(event) => {
              const municipality = municipalities.find((item) => item.code === event.target.value);
              if (municipality)
                patch({ municipalityCode: municipality.code, municipality: municipality.name });
            }}
            required
          >
            {municipalities.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </SelectField>
          {status === 'fallback' && (
            <p className="field-source-note full-width">Catálogo de ejemplo: API no disponible.</p>
          )}
        </FormSection>
      )}
      <FormSection title="Contacto">
        <div className="full-width">
          <TextareaField
            label="Dirección"
            placeholder="Calle, número y colonia"
            rows={2}
            value={form.address}
            onChange={(event) => patch({ address: event.target.value })}
            required
          />
        </div>
        <div className="full-width">
          <InputField
            label="Teléfono"
            placeholder="Ej. 961 000 0000"
            type="tel"
            value={form.phone}
            onChange={(event) => patch({ phone: event.target.value })}
          />
        </div>
      </FormSection>
      {manager && (
        <>
          <FormSection title="Responsable">
            <div className="full-width">
              <SelectField
                label="Jefe de ventanilla"
                value={form.counterHeadId ?? ''}
                onChange={(event) => patch({ counterHeadId: event.target.value || null })}
              >
                <option value="">Sin asignar</option>
                {db.users
                  .filter((item) => item.role === 'COUNTER_HEAD' && item.active)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </SelectField>
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
                Sede activa
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(event) => patch({ published: event.target.checked })}
                />
                Publicada
              </label>
            </div>
          </Disclosure>
        </>
      )}
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit">Guardar sede</Button>
      </div>
    </form>
  );
}
