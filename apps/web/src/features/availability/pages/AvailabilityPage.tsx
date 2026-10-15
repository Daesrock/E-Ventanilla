/** Horarios y capacidad por sede accesible; consulta desde detalle mediante query string. */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil } from 'lucide-react';
import type { TimeSlot } from '../../../types/domain';
import { useScopedData } from '../../../hooks/useScopedData';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { InputField, SelectField } from '../../../components/ui/Field';
import { Modal } from '../../../components/ui/Modal';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { dateLabel } from '../../../utils/format';
import { SlotForm } from '../components/SlotForm';

export function AvailabilityPage({
  sedeId,
  embedded = false,
}: { sedeId?: string; embedded?: boolean } = {}) {
  const { branches, slots } = useScopedData();
  const [params] = useSearchParams();
  const [branchId, setBranchId] = useState(
    () =>
      sedeId ??
      (branches.some((branch) => branch.id === params.get('sede')) ? params.get('sede')! : ''),
  );
  const [date, setDate] = useState('');
  const [form, setForm] = useState<TimeSlot | 'new' | null>(null);
  const availableBranches = embedded ? branches.filter((branch) => branch.id === sedeId) : branches;
  const filtered = slots
    .filter((slot) => (!branchId || slot.branchId === branchId) && (!date || slot.date === date))
    .sort((a, b) => `${a.date}${a.startsAt}`.localeCompare(`${b.date}${b.startsAt}`));
  const createAction = (
    <Button
      icon={Plus}
      disabled={!availableBranches.some((branch) => branch.active)}
      onClick={() => setForm('new')}
    >
      Nuevo horario
    </Button>
  );
  return (
    <>
      {embedded ? (
        <div className="embedded-heading">
          <h2>Horarios</h2>
          {createAction}
        </div>
      ) : (
        <PageHeader title="Horarios" actions={createAction} />
      )}
      <div className="filters">
        {!embedded && (
          <SelectField
            label="Sede"
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
          >
            <option value="">Todas las sedes</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </SelectField>
        )}
        <InputField
          label="Fecha"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <Button
          variant="secondary"
          onClick={() => {
            setDate('');
            setBranchId(embedded ? (sedeId ?? '') : '');
          }}
        >
          Limpiar
        </Button>
      </div>
      <section className="panel">
        <div className="table-wrap">
          {filtered.length ? (
            <table>
              <thead>
                <tr>
                  {!embedded && <th>SEDE</th>}
                  <th>FECHA</th>
                  <th>HORARIO</th>
                  {!embedded && <th>OCUPACIÓN</th>}
                  <th>DISPONIBLES</th>
                  <th>ESTADO</th>
                  <th>ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((slot) => (
                  <tr key={slot.id}>
                    {!embedded && (
                      <td className="table-primary">
                        {branches.find((branch) => branch.id === slot.branchId)?.name}
                      </td>
                    )}
                    <td>{dateLabel(slot.date)}</td>
                    <td>
                      {slot.startsAt} – {slot.endsAt}
                    </td>
                    {!embedded && (
                      <td>
                        <span>
                          {slot.occupied} de {slot.capacity}
                        </span>
                        <div className="bar-track mt-2 max-w-28">
                          <span style={{ width: `${(slot.occupied / slot.capacity) * 100}%` }} />
                        </div>
                      </td>
                    )}
                    <td>{slot.active ? slot.capacity - slot.occupied : 'No disponible'}</td>
                    <td>
                      <Badge tone={slot.active ? 'green' : 'neutral'}>
                        {slot.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td>
                      <button className="table-link" onClick={() => setForm(slot)}>
                        <Pencil size={13} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState />
          )}
        </div>
        <div className="table-summary">{filtered.length} horarios</div>
      </section>
      {form && (
        <Modal
          title={form === 'new' ? 'Nuevo horario' : 'Editar horario'}
          onClose={() => setForm(null)}
        >
          <SlotForm
            slot={form === 'new' ? undefined : form}
            branches={availableBranches}
            preferredBranch={branchId}
            onDone={() => setForm(null)}
          />
        </Modal>
      )}
    </>
  );
}
