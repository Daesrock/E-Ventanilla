/**
 * Alta asistida de jefes de ventanilla: el panel captura los datos y genera un
 * archivo privado que el operador aplica con scripts/provision-counter-head.mjs.
 * No llama a la API porque el alta directa sigue reservada a root por diseño.
 */
import { useState, type FormEvent } from 'react';
import { useAdminSession } from '../../app/providers/admin-context';
import { useMunicipalities } from '../../hooks/useMunicipalities';
import { Button } from '../../components/ui/Button';
import { InputField, SelectField } from '../../components/ui/Field';
import { FormSection } from '../../components/ui/FormSection';
import { Modal } from '../../components/ui/Modal';

interface AssistedState {
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  curp: string;
  email: string;
  password: string;
  municipalityCode: string;
  counterStaff: boolean;
  branchIds: string[];
}

const emptyState: AssistedState = {
  firstName: '',
  paternalLastName: '',
  maternalLastName: '',
  curp: '',
  email: '',
  password: '',
  municipalityCode: '07101',
  counterStaff: false,
  branchIds: [],
};

export function AssistedStaffDialog({ onClose }: { onClose: () => void }) {
  const { identity } = useAdminSession();
  const { municipalities } = useMunicipalities();
  const [form, setForm] = useState<AssistedState>(emptyState);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState('');
  const patch = (values: Partial<AssistedState>) =>
    setForm((previous) => ({ ...previous, ...values }));
  const branches = identity?.scope.branches ?? [];

  const generate = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!form.password) {
      setError('Escribe la contraseña inicial del jefe de ventanilla.');
      return;
    }
    const payload: Record<string, unknown> = {
      firstName: form.firstName.trim(),
      paternalLastName: form.paternalLastName.trim(),
      curp: form.curp.trim().toUpperCase(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      municipalityCode: form.municipalityCode,
    };
    if (form.maternalLastName.trim()) payload.maternalLastName = form.maternalLastName.trim();
    if (form.counterStaff) payload.counterStaff = true;
    if (form.branchIds.length) payload.branchIds = form.branchIds;
    const json = JSON.stringify(payload, null, 2);
    const filename = `alta-jefe-ventanilla-${form.email
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9.@-]/g, '-')}.json`;
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setGenerated(filename);
  };

  return (
    <Modal title="Alta asistida de jefe de ventanilla" wide onClose={onClose}>
      {generated ? (
        <>
          <p className="alert alert-info" role="status">
            Archivo generado: <strong>{generated}</strong>. Contiene la contraseña inicial: trátalo
            como información privada.
          </p>
          <FormSection title="Siguiente paso">
            <div className="full-width">
              <p className="muted text-xs">
                El responsable del sistema ejecuta el alta con Bun 1.4.2 y la conexión autorizada:
              </p>
              <pre className="json-output">{`bun scripts/provision-counter-head.mjs "<ruta>/${generated}"`}</pre>
              <p className="muted text-xs">
                El alta queda registrada en auditoría con las sedes asignadas. Después, la cuenta
                aparecerá en esta lista y podrás reasignarla desde cada sede.
              </p>
            </div>
          </FormSection>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setGenerated('')}>
              Generar otra
            </Button>
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        </>
      ) : (
        <form onSubmit={generate}>
          <p className="form-required-note">* Campos obligatorios</p>
          <p className="muted text-xs">
            El alta directa sigue reservada a root. Este formulario prepara un archivo de alta
            asistida que el responsable del sistema aplica sin modificar la API ni la base.
          </p>
          <FormSection title="Datos del jefe de ventanilla">
            <InputField
              label="Nombre"
              value={form.firstName}
              onChange={(event) => patch({ firstName: event.target.value })}
              required
            />
            <InputField
              label="Apellido paterno"
              value={form.paternalLastName}
              onChange={(event) => patch({ paternalLastName: event.target.value })}
              required
            />
            <InputField
              label="Apellido materno"
              value={form.maternalLastName}
              onChange={(event) => patch({ maternalLastName: event.target.value })}
            />
            <InputField
              label="CURP"
              maxLength={18}
              value={form.curp}
              onChange={(event) => patch({ curp: event.target.value })}
              required
            />
            <InputField
              label="Correo"
              type="email"
              value={form.email}
              onChange={(event) => patch({ email: event.target.value })}
              required
            />
            <InputField
              label="Contraseña inicial"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => patch({ password: event.target.value })}
              hint="Política de la API: de 12 a 20 caracteres; no debe ser común."
              required
            />
            <SelectField
              label="Municipio"
              value={form.municipalityCode}
              onChange={(event) => patch({ municipalityCode: event.target.value })}
              required
            >
              {municipalities.map((municipality) => (
                <option key={municipality.code} value={municipality.code}>
                  {municipality.name}
                </option>
              ))}
            </SelectField>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.counterStaff}
                onChange={(event) => patch({ counterStaff: event.target.checked })}
              />
              Perfil técnico para registrar atención de citas
            </label>
          </FormSection>
          <FormSection title="Asignación inicial a sedes (opcional)">
            <div className="full-width">
              {branches.length ? (
                <div className="form-grid">
                  {branches.map((branch) => (
                    <label className="checkbox-label" key={branch.id}>
                      <input
                        type="checkbox"
                        checked={form.branchIds.includes(branch.id)}
                        onChange={(event) =>
                          patch({
                            branchIds: event.target.checked
                              ? [...form.branchIds, branch.id]
                              : form.branchIds.filter((id) => id !== branch.id),
                          })
                        }
                      />
                      {branch.name}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="muted text-xs">Sin sedes dentro del alcance.</p>
              )}
            </div>
          </FormSection>
          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Generar archivo de alta</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
