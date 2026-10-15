/** Consulta de citas con búsqueda, estados, filtros y paginación respetando alcance local. */
import { useState } from 'react';
import { Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Appointment, AppointmentStatus } from '../../../types/domain';
import { useScopedData } from '../../../hooks/useScopedData';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SelectField, InputField } from '../../../components/ui/Field';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Disclosure } from '../../../components/ui/Disclosure';
import { dateLabel, timeLabel, localDate } from '../../../utils/format';
import { statusLabels, statusTones } from '../appointment.config';
import { AppointmentDetail } from '../components/AppointmentDetail';

export function AppointmentsPage() {
  const { branches, appointments, procedures } = useScopedData();
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Appointment | null>(null);
  const filtered = appointments
    .filter(
      (appointment) =>
        (!status || appointment.status === status) &&
        (!branchId || appointment.branchId === branchId) &&
        (!date || localDate(appointment.scheduledAt) === date) &&
        `${appointment.folio} ${appointment.citizenName}`
          .toLocaleLowerCase('es')
          .includes(query.toLocaleLowerCase('es')),
    )
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  return (
    <>
      <PageHeader title="Citas" />
      <div className="filters">
        <div className="field search-field">
          <label htmlFor="appointment-search">Buscar cita o ciudadano</label>
          <div className="search-input">
            <Search size={16} />
            <input
              id="appointment-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Folio o nombre…"
            />
          </div>
        </div>
        <SelectField
          label="Estado"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas las citas</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </SelectField>
      </div>
      <Disclosure title={`Más filtros${branchId || date ? ' · activos' : ''}`}>
        <div className="filters">
          <SelectField
            label="Sede"
            value={branchId}
            onChange={(event) => {
              setBranchId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas las sedes</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </SelectField>
          <InputField
            label="Fecha programada"
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setPage(1);
            }}
          />
          <Button
            variant="ghost"
            onClick={() => {
              setBranchId('');
              setDate('');
              setPage(1);
            }}
          >
            Limpiar
          </Button>
        </div>
      </Disclosure>
      <section className="panel">
        <div className="table-wrap">
          {rows.length ? (
            <table>
              <thead>
                <tr>
                  <th>FOLIO / CIUDADANO</th>
                  <th>SEDE / MUNICIPIO</th>
                  <th>TRÁMITE</th>
                  <th>FECHA PROGRAMADA</th>
                  <th>ESTADO</th>
                  <th>DETALLE</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((appointment) => {
                  const branch = branches.find((item) => item.id === appointment.branchId);
                  return (
                    <tr key={appointment.id}>
                      <td>
                        <span className="table-primary">{appointment.folio}</span>
                        <span className="table-sub">{appointment.citizenName}</span>
                      </td>
                      <td>
                        {branch?.name}
                        <span className="table-sub">{branch?.municipality}</span>
                      </td>
                      <td>
                        {
                          procedures.find((procedure) => procedure.id === appointment.procedureId)
                            ?.name
                        }
                      </td>
                      <td>
                        {dateLabel(appointment.scheduledAt)}
                        <span className="table-sub">{timeLabel(appointment.scheduledAt)} h</span>
                      </td>
                      <td>
                        <Badge tone={statusTones[appointment.status as AppointmentStatus]}>
                          {statusLabels[appointment.status]}
                        </Badge>
                      </td>
                      <td>
                        <button className="table-link" onClick={() => setDetail(appointment)}>
                          <Eye size={13} />
                          Ver cita
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState />
          )}
        </div>
        <div className="table-summary">
          <span>
            {filtered.length} resultados ·{' '}
            {rows.length
              ? `mostrando ${(currentPage - 1) * 10 + 1}–${Math.min(currentPage * 10, filtered.length)}`
              : 'sin coincidencias'}
          </span>
          <div className="pagination">
            <Button
              variant="secondary"
              aria-label="Página anterior"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={13} />
            </Button>
            <span>
              {currentPage} / {pages}
            </span>
            <Button
              variant="secondary"
              aria-label="Página siguiente"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight size={13} />
            </Button>
          </div>
        </div>
      </section>
      {detail && (
        <Modal title="Detalle de cita" wide onClose={() => setDetail(null)}>
          <AppointmentDetail appointment={detail} onDone={() => setDetail(null)} />
        </Modal>
      )}
    </>
  );
}
