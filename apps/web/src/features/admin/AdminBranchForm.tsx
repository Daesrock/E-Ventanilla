/**
 * Formulario de sede por secciones: datos generales, contacto, ubicación con mapa
 * y publicación corroborada. Respeta el alcance del jefe de ventanilla y mapea
 * los errores por campo que devuelve la API.
 */
import { useState, type FormEvent } from 'react';
import { useAdminSession } from '../../app/providers/admin-context';
import { useMunicipalities } from '../../hooks/useMunicipalities';
import { useToast } from '../../hooks/useToast';
import { adminWrite, type AdminBranch } from '../../services/api/admin';
import { ApiError } from '../../services/api/client';
import { Button } from '../../components/ui/Button';
import { InputField, SelectField, TextareaField } from '../../components/ui/Field';
import { FormSection } from '../../components/ui/FormSection';
import { Modal } from '../../components/ui/Modal';
import { useUnsavedChanges } from './admin-hooks';
import { LocationPicker, type Coordinates } from './LocationPicker';

interface BranchFormState {
  name: string;
  type: string;
  municipalityCode: string;
  address: string;
  phone: string;
  email: string;
  officeHours: string;
  street: string;
  exteriorNumber: string;
  interiorNumber: string;
  neighborhood: string;
  postalCode: string;
  coordinates: Coordinates;
  active: boolean;
  published: boolean;
  sourceKey: string;
  sourceUrl: string;
  sourceSha256: string;
  sourceCheckedAt: string;
}

function initialState(branch?: AdminBranch): BranchFormState {
  return {
    name: branch?.name ?? '',
    type: branch?.type ?? 'VUGE',
    municipalityCode: branch?.municipality.code ?? '07101',
    address: branch?.address ?? '',
    phone: branch?.phone ?? '',
    email: branch?.email ?? '',
    officeHours: branch?.officeHours ?? '',
    street: branch?.street ?? '',
    exteriorNumber: branch?.exteriorNumber ?? '',
    interiorNumber: branch?.interiorNumber ?? '',
    neighborhood: branch?.neighborhood ?? '',
    postalCode: branch?.postalCode ?? '',
    coordinates: {
      latitude: branch?.latitude ?? null,
      longitude: branch?.longitude ?? null,
    },
    active: branch?.active ?? true,
    published: branch?.published ?? false,
    sourceKey: branch?.sourceKey ?? '',
    sourceUrl: branch?.sourceUrl ?? '',
    sourceSha256: branch?.sourceSha256 ?? '',
    sourceCheckedAt: branch?.sourceCheckedAt?.slice(0, 10) ?? '',
  };
}

export function AdminBranchForm({ branch, onDone }: { branch?: AdminBranch; onDone: () => void }) {
  const { identity } = useAdminSession();
  const { municipalities, status } = useMunicipalities();
  const notify = useToast();
  const manager = identity?.role.code !== 'COUNTER_HEAD';
  const creating = !branch;
  const [form, setForm] = useState<BranchFormState>(() => initialState(branch));
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const initial = initialState(branch);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const blocked = useUnsavedChanges(dirty && !busy);
  const patch = (values: Partial<BranchFormState>) => {
    setForm((previous) => ({ ...previous, ...values }));
    setErrors({});
  };

  const buildBody = () => {
    const body: Record<string, unknown> = {};
    if (manager) {
      body.name = form.name.trim();
      body.type = form.type;
      body.municipalityCode = form.municipalityCode;
      body.active = form.active;
      body.published = form.published;
      if (form.published) {
        const missing: Record<string, string> = {};
        if (!form.sourceKey.trim()) missing.sourceKey = 'Indica la clave de la fuente oficial.';
        if (!/^https:\/\/\S+$/.test(form.sourceUrl.trim()))
          missing.sourceUrl = 'Indica la URL https de la fuente oficial.';
        if (!/^[a-f0-9]{64}$/.test(form.sourceSha256.trim()))
          missing.sourceSha256 = 'Indica el sha256 (64 hexadecimales) de la fuente corroborada.';
        if (!form.sourceCheckedAt) missing.sourceCheckedAt = 'Indica la fecha de corroboración.';
        if (Object.keys(missing).length)
          throw new ApiError('Completa la fuente para publicar.', 400, 'VALIDATION_ERROR', missing);
      }
      if (form.sourceKey.trim()) body.sourceKey = form.sourceKey.trim();
      if (form.sourceUrl.trim()) body.sourceUrl = form.sourceUrl.trim();
      if (form.sourceSha256.trim()) body.sourceSha256 = form.sourceSha256.trim();
      if (form.sourceCheckedAt)
        body.sourceCheckedAt = new Date(`${form.sourceCheckedAt}T00:00:00Z`).toISOString();
    }
    const contact: Record<string, string> = {
      address: form.address,
      phone: form.phone,
      email: form.email,
      officeHours: form.officeHours,
      street: form.street,
      exteriorNumber: form.exteriorNumber,
      interiorNumber: form.interiorNumber,
      neighborhood: form.neighborhood,
      postalCode: form.postalCode,
    };
    for (const [key, value] of Object.entries(contact)) {
      if (value.trim()) body[key] = value.trim();
      else if (!creating) body[key] = null;
    }
    const { latitude, longitude } = form.coordinates;
    if (latitude !== null && longitude !== null) {
      body.latitude = latitude;
      body.longitude = longitude;
    } else if (latitude !== null || longitude !== null) {
      throw new ApiError(
        'Indica latitud y longitud juntas o deja ambas vacías.',
        400,
        'VALIDATION_ERROR',
        {
          latitude: 'Indica latitud y longitud juntas.',
          longitude: 'Indica latitud y longitud juntas.',
        },
      );
    } else if (!creating) {
      body.latitude = null;
      body.longitude = null;
    }
    return body;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setErrors({});
    setBusy(true);
    try {
      const body = buildBody();
      await adminWrite(
        creating ? 'branches' : `branches/${branch.id}`,
        creating ? 'POST' : 'PATCH',
        body,
      );
      notify('Sede guardada.');
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar.');
      if (cause instanceof ApiError) setErrors(cause.fieldErrors);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        title={creating ? 'Nueva sede' : manager ? 'Editar sede' : 'Editar contacto'}
        wide
        onClose={() => !busy && onDone()}
      >
        <form onSubmit={(event) => void submit(event)}>
          <p className="form-required-note">* Campos obligatorios</p>

          {manager && (
            <FormSection title="Datos generales">
              <div className="full-width">
                <InputField
                  label="Nombre de sede"
                  placeholder="Ej. VUGE Tuxtla Gutiérrez"
                  value={form.name}
                  onChange={(event) => patch({ name: event.target.value })}
                  error={errors.name}
                  required
                />
              </div>
              <SelectField
                label="Tipo"
                value={form.type}
                onChange={(event) => patch({ type: event.target.value })}
                error={errors.type}
                required
              >
                <option value="VUGE">VUGE</option>
                <option value="VIM">VIM</option>
              </SelectField>
              <SelectField
                label="Municipio"
                value={form.municipalityCode}
                onChange={(event) => patch({ municipalityCode: event.target.value })}
                error={errors.municipalityCode}
                hint={
                  status === 'fallback' ? 'Catálogo de respaldo: API no disponible.' : undefined
                }
                required
              >
                {municipalities.map((municipality) => (
                  <option key={municipality.code} value={municipality.code}>
                    {municipality.name}
                  </option>
                ))}
              </SelectField>
            </FormSection>
          )}

          <FormSection title="Contacto y dirección">
            <div className="full-width">
              <TextareaField
                label="Dirección"
                placeholder="Calle, número y colonia"
                rows={2}
                value={form.address}
                onChange={(event) => patch({ address: event.target.value })}
                error={errors.address}
              />
            </div>
            <InputField
              label="Teléfono"
              type="tel"
              placeholder="Ej. 961 000 0000"
              value={form.phone}
              onChange={(event) => patch({ phone: event.target.value })}
              error={errors.phone}
            />
            <InputField
              label="Correo de contacto"
              type="email"
              value={form.email}
              onChange={(event) => patch({ email: event.target.value })}
              error={errors.email}
            />
            <div className="full-width">
              <InputField
                label="Horario de oficina"
                placeholder="Ej. Lunes a viernes de 9:00 a 16:00"
                value={form.officeHours}
                onChange={(event) => patch({ officeHours: event.target.value })}
                error={errors.officeHours}
              />
            </div>
            <InputField
              label="Calle"
              value={form.street}
              onChange={(event) => patch({ street: event.target.value })}
              error={errors.street}
            />
            <InputField
              label="Número exterior"
              value={form.exteriorNumber}
              onChange={(event) => patch({ exteriorNumber: event.target.value })}
              error={errors.exteriorNumber}
            />
            <InputField
              label="Número interior"
              value={form.interiorNumber}
              onChange={(event) => patch({ interiorNumber: event.target.value })}
              error={errors.interiorNumber}
            />
            <InputField
              label="Colonia"
              value={form.neighborhood}
              onChange={(event) => patch({ neighborhood: event.target.value })}
              error={errors.neighborhood}
            />
            <InputField
              label="Código postal"
              inputMode="numeric"
              maxLength={5}
              value={form.postalCode}
              onChange={(event) => patch({ postalCode: event.target.value })}
              error={errors.postalCode}
            />
          </FormSection>

          <FormSection title="Ubicación">
            <div className="full-width">
              {errors.latitude && (
                <p className="alert alert-error" role="alert">
                  {errors.latitude}
                </p>
              )}
              <LocationPicker
                value={form.coordinates}
                onChange={(coordinates) => patch({ coordinates })}
                disabled={busy}
              />
            </div>
          </FormSection>

          {manager && (
            <FormSection title="Estado y publicación">
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
                Publicada para consulta ciudadana
              </label>
              {form.published && (
                <>
                  <p className="muted text-xs full-width">
                    La publicación requiere fuente oficial corroborada (clave, URL https, sha256 y
                    fecha). No inventes claves ni hashes.
                  </p>
                  <InputField
                    label="Clave de la fuente"
                    value={form.sourceKey}
                    onChange={(event) => patch({ sourceKey: event.target.value })}
                    error={errors.sourceKey}
                  />
                  <InputField
                    label="URL https de la fuente"
                    value={form.sourceUrl}
                    onChange={(event) => patch({ sourceUrl: event.target.value })}
                    error={errors.sourceUrl}
                  />
                  <InputField
                    label="SHA-256 de la fuente"
                    maxLength={64}
                    value={form.sourceSha256}
                    onChange={(event) => patch({ sourceSha256: event.target.value })}
                    error={errors.sourceSha256}
                  />
                  <InputField
                    label="Fecha de corroboración"
                    type="date"
                    value={form.sourceCheckedAt}
                    onChange={(event) => patch({ sourceCheckedAt: event.target.value })}
                    error={errors.sourceCheckedAt}
                  />
                </>
              )}
            </FormSection>
          )}

          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button variant="secondary" type="button" disabled={busy} onClick={onDone}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar sede'}
            </Button>
          </div>
        </form>
      </Modal>
      {blocked}
    </>
  );
}
