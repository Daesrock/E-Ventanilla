/** Consulta ligera: mes/sede primero; filtros, columnas y estadísticas secundarias bajo demanda. */
import { useState } from 'react';
import {
  Download,
  Search,
  CalendarCheck2,
  UsersRound,
  UserCheck,
  Columns3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { ReportFilters } from '../../../types/domain';
import { useDemo } from '../../../app/providers/demo-context';
import { useScopedData } from '../../../hooks/useScopedData';
import { useToast } from '../../../hooks/useToast';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { InputField, SelectField } from '../../../components/ui/Field';
import { StatCard } from '../../../components/ui/StatCard';
import { Disclosure } from '../../../components/ui/Disclosure';
import { Modal } from '../../../components/ui/Modal';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ActivityChart } from '../../dashboard/components/ActivityChart';
import { calculateMetrics, filterAppointments, monthRange } from '../report.service';
import { defaultColumns, reportColumns } from '../report.columns';
import { statusLabels } from '../../appointments/appointment.config';
import { dateLabel, downloadCsv, number } from '../../../utils/format';

export function ReportsPage() {
  const { db } = useDemo();
  const { branches, appointments, procedures } = useScopedData();
  const notify = useToast();
  const initial: ReportFilters = {
    ...monthRange(db.referenceDate.slice(0, 7)),
    municipality: '',
    branchType: '',
    branchId: '',
    procedureId: '',
    status: '',
  };
  const [draft, setDraft] = useState(initial);
  const [applied, setApplied] = useState(initial);
  const [period, setPeriod] = useState(db.referenceDate.slice(0, 7));
  const [selected, setSelected] = useState(defaultColumns);
  const [rangeError, setRangeError] = useState({ from: '', to: '' });
  const [advanced, setAdvanced] = useState(false);
  const [choosingColumns, setChoosingColumns] = useState(false);
  const [page, setPage] = useState(1);
  const patch = (values: Partial<ReportFilters>) => setDraft((value) => ({ ...value, ...values }));
  const filtered = filterAppointments(appointments, branches, applied).sort((a, b) =>
    a.scheduledAt.localeCompare(b.scheduledAt),
  );
  const metrics = calculateMetrics(filtered);
  const columns = reportColumns.filter((column) => selected.includes(column.id));
  const pageSize = 6;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeFilters =
    [draft.municipality, draft.branchType, draft.procedureId, draft.status].filter(Boolean).length +
    (period ? 0 : 1);
  const exportReport = () => {
    downloadCsv(
      `e-ventanilla-demo-${applied.from}-${applied.to}.csv`,
      columns.map((column) => column.label),
      filtered.map((row) => columns.map((column) => column.value(row, db))),
    );
    notify(`${filtered.length} registros exportados.`);
  };
  return (
    <>
      <PageHeader title="Reportes" />
      <section className="panel">
        <form
          className="panel-body"
          onSubmit={(event) => {
            event.preventDefault();
            const errors = {
              from: !draft.from ? 'Selecciona una fecha.' : '',
              to: !draft.to
                ? 'Selecciona una fecha.'
                : draft.from > draft.to
                  ? 'Debe ser igual o posterior a Desde.'
                  : '',
            };
            setRangeError(errors);
            if (errors.from || errors.to) {
              setAdvanced(true);
              return;
            }
            setApplied({ ...draft });
            setPage(1);
          }}
        >
          <div className="report-main">
            <InputField
              label="Periodo"
              type="month"
              value={period}
              hint={period ? undefined : 'Rango personalizado en Más filtros.'}
              onChange={(event) => {
                setPeriod(event.target.value);
                if (event.target.value) {
                  patch(monthRange(event.target.value));
                  setRangeError({ from: '', to: '' });
                }
              }}
            />
            <SelectField
              label="Sede"
              value={draft.branchId}
              onChange={(event) => patch({ branchId: event.target.value })}
            >
              <option value="">Todas las sedes</option>
              {branches
                .filter(
                  (branch) =>
                    (!draft.municipality || draft.municipality === branch.municipality) &&
                    (!draft.branchType || draft.branchType === branch.type),
                )
                .map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
            </SelectField>
            <div className="report-main-actions">
              <Button type="submit" icon={Search}>
                Consultar
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(initial);
                  setApplied(initial);
                  setPeriod(db.referenceDate.slice(0, 7));
                  setRangeError({ from: '', to: '' });
                  setPage(1);
                }}
              >
                Limpiar
              </Button>
            </div>
          </div>
          <Disclosure
            title={`Más filtros${activeFilters ? ` (${activeFilters})` : ''}`}
            open={advanced}
            onToggle={setAdvanced}
          >
            <div className="report-filters">
              <InputField
                label="Desde"
                type="date"
                value={draft.from}
                error={rangeError.from}
                onChange={(event) => {
                  patch({ from: event.target.value });
                  setPeriod('');
                  setRangeError((value) => ({ ...value, from: '' }));
                }}
              />
              <InputField
                label="Hasta"
                type="date"
                value={draft.to}
                error={rangeError.to}
                onChange={(event) => {
                  patch({ to: event.target.value });
                  setPeriod('');
                  setRangeError((value) => ({ ...value, to: '' }));
                }}
              />
              <SelectField
                label="Municipio"
                value={draft.municipality}
                onChange={(event) => patch({ municipality: event.target.value, branchId: '' })}
              >
                <option value="">Todos los municipios</option>
                {Array.from(new Set(branches.map((branch) => branch.municipality)))
                  .sort()
                  .map((name) => (
                    <option key={name}>{name}</option>
                  ))}
              </SelectField>
              <SelectField
                label="Tipo de sede"
                value={draft.branchType}
                onChange={(event) => patch({ branchType: event.target.value, branchId: '' })}
              >
                <option value="">VUGE y VIM</option>
                <option>VUGE</option>
                <option>VIM</option>
              </SelectField>
              <SelectField
                label="Trámite"
                value={draft.procedureId}
                onChange={(event) => patch({ procedureId: event.target.value })}
              >
                <option value="">Todos los trámites</option>
                {procedures.map((procedure) => (
                  <option key={procedure.id} value={procedure.id}>
                    {procedure.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Estado"
                value={draft.status}
                onChange={(event) => patch({ status: event.target.value })}
              >
                <option value="">Todos los estados</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
            </div>
          </Disclosure>
        </form>
      </section>
      <p className="report-caption">
        Citas programadas: {dateLabel(applied.from)} – {dateLabel(applied.to)}
      </p>
      <div className="stats-grid stats-three">
        <StatCard label="Citas" value={number(metrics.appointments)} icon={CalendarCheck2} />
        <StatCard
          label="Ciudadanos únicos"
          value={number(metrics.citizens)}
          icon={UsersRound}
          accent="pink"
        />
        <StatCard
          label="Asistencias"
          value={number(metrics.arrivals)}
          icon={UserCheck}
          accent="charcoal"
        />
      </div>
      <section className="panel">
        <header className="report-toolbar">
          <h2>{filtered.length} resultados</h2>
          <div>
            <Button variant="ghost" icon={Columns3} onClick={() => setChoosingColumns(true)}>
              Elegir campos
            </Button>
            <Button
              variant="secondary"
              icon={Download}
              disabled={!filtered.length}
              onClick={exportReport}
            >
              Exportar CSV
            </Button>
          </div>
        </header>
        <div className="table-wrap">
          {rows.length ? (
            <table>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.id}>{column.label.toLocaleUpperCase('es')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {columns.map((column) => (
                      <td key={column.id}>{column.value(row, db)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="Sin resultados" description="Cambia periodo o filtros." />
          )}
        </div>
        <div className="table-summary">
          <span>{columns.length} campos seleccionados</span>
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
      <Disclosure title="Ver estadísticas">
        <dl className="detail-list detail-columns">
          <div>
            <dt>ATENCIONES FINALIZADAS</dt>
            <dd>{metrics.completed}</dd>
          </div>
          <div>
            <dt>CANCELADAS / INASISTENCIAS</dt>
            <dd>
              {metrics.cancelled} / {metrics.noShows}
            </dd>
          </div>
          <div>
            <dt>ESPERA PROMEDIO</dt>
            <dd>{metrics.meanWaitMinutes === null ? '—' : `${metrics.meanWaitMinutes} min`}</dd>
          </div>
          <div>
            <dt>ATENCIÓN PROMEDIO</dt>
            <dd>
              {metrics.meanAttentionMinutes === null ? '—' : `${metrics.meanAttentionMinutes} min`}
            </dd>
          </div>
        </dl>
        {applied.from.slice(0, 7) === applied.to.slice(0, 7) && (
          <div className="mt-6">
            <h3>Citas por día</h3>
            <ActivityChart appointments={filtered} month={applied.from.slice(0, 7)} />
          </div>
        )}
        <p className="muted text-xs mt-4">
          Asistencias y tiempos corresponden a las citas del periodo consultado.
        </p>
      </Disclosure>
      {choosingColumns && (
        <Modal title="Elegir campos" onClose={() => setChoosingColumns(false)}>
          <div className="report-column-options">
            {reportColumns.map((column) => (
              <label className="checkbox-label" key={column.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(column.id)}
                  onChange={(event) => {
                    if (!event.target.checked && selected.length === 1) {
                      notify('Selecciona al menos un campo.', 'error');
                      return;
                    }
                    setSelected((value) =>
                      event.target.checked
                        ? [...value, column.id]
                        : value.filter((id) => id !== column.id),
                    );
                  }}
                />
                {column.label}
              </label>
            ))}
          </div>
          <div className="form-actions">
            <Button onClick={() => setChoosingColumns(false)}>Listo</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
