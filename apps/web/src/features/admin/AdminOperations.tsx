/** Operación real: horarios, personal, citas y reportes con paginación y autorización de API. */
import { useState } from 'react';
import { useAdminSession } from '../../app/providers/admin-context';
import {
  adminWrite,
  downloadReport,
  queryString,
  type AdminSlot,
  type AdminStaff,
  type AdminAppointment,
  type AdminReport,
  type Page,
} from '../../services/api/admin';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { InputField, SelectField } from '../../components/ui/Field';
import { Badge } from '../../components/ui/Badge';
import { AdminEditor, Pager, RemoteState, type AdminField } from './AdminUI';
import { AssistedStaffDialog } from './AssistedStaffDialog';
import { useAdminQuery } from './admin-hooks';
import { useToast } from '../../hooks/useToast';

const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
const stamp = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(value))
    : '—';
export function BranchSelect({ value, change }: { value: string; change: (id: string) => void }) {
  const { identity } = useAdminSession();
  return (
    <SelectField label="Sede" value={value} onChange={(event) => change(event.target.value)}>
      <option value="">Selecciona una sede</option>
      {identity?.scope.branches.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.name}
        </option>
      ))}
    </SelectField>
  );
}
export function AdminSlots({ branchId: fixedBranch }: { branchId?: string }) {
  const { identity } = useAdminSession();
  const [selected, setSelected] = useState(identity?.scope.branches[0]?.id ?? '');
  const branchId = fixedBranch ?? selected;
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const query = useAdminQuery<{ items: AdminSlot[] }>(
    branchId ? `branches/${branchId}/time-slots?${queryString({ from, to })}` : null,
  );
  const [editor, setEditor] = useState<AdminSlot | 'new' | null>(null);
  const fields: AdminField[] = [
    ...(editor === 'new'
      ? [{ name: 'date', label: 'Fecha', type: 'date', required: true } as AdminField]
      : []),
    { name: 'startsAt', label: 'Hora inicial', type: 'time', required: true },
    { name: 'endsAt', label: 'Hora final', type: 'time', required: true },
    {
      name: 'capacity',
      label: 'Cupos del bloque (capacidad)',
      type: 'number',
      min: editor && editor !== 'new' ? Math.max(1, editor.occupied) : 1,
      step: '1',
      required: true,
      hint: 'Máximo de citas que pueden agendarse en este horario. Nunca menor a los cupos ya ocupados.',
    },
    ...(editor && editor !== 'new'
      ? [{ name: 'active', label: 'Bloque activo', type: 'checkbox' } as AdminField]
      : []),
  ];
  return (
    <>
      <PageHeader
        title="Horarios y cupos"
        description="Horarios de Chiapas. La capacidad no puede ser menor que la ocupación."
        actions={
          branchId &&
          identity?.permissions.includes('slot.create') && (
            <Button onClick={() => setEditor('new')}>Nuevo bloque</Button>
          )
        }
      />
      <div className="filters">
        {!fixedBranch && <BranchSelect value={selected} change={setSelected} />}
        <InputField
          label="Desde"
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        <InputField
          label="Hasta"
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
      </div>
      <RemoteState {...query} retry={query.reload} />
      {query.data && (
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Horario</th>
                  <th>Ocupados / capacidad</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((slot) => (
                  <tr key={slot.id}>
                    <td>{slot.date}</td>
                    <td>
                      {slot.startsAt}–{slot.endsAt}
                    </td>
                    <td>
                      {slot.occupied} / {slot.capacity}
                    </td>
                    <td>{slot.active ? 'Activo' : 'Inactivo'}</td>
                    <td>
                      {identity?.permissions.includes('slot.update') && (
                        <button className="table-link" onClick={() => setEditor(slot)}>
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!query.data.items.length && (
              <p className="panel-body">Sin horarios para el periodo elegido.</p>
            )}
          </div>
        </section>
      )}
      {editor && (
        <AdminEditor
          title={editor === 'new' ? 'Nuevo bloque' : 'Editar bloque'}
          fields={fields}
          initial={editor === 'new' ? { date: from, capacity: 1 } : { ...editor }}
          close={() => setEditor(null)}
          save={async (body) => {
            await adminWrite(
              editor === 'new' ? `branches/${branchId}/time-slots` : `time-slots/${editor.id}`,
              editor === 'new' ? 'POST' : 'PATCH',
              body,
            );
            query.reload();
          }}
        />
      )}
    </>
  );
}

export function AdminStaffPage() {
  const { identity } = useAdminSession();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useAdminQuery<Page<AdminStaff>>(`staff?${queryString({ q: search, page })}`);
  const [editor, setEditor] = useState<AdminStaff | 'new' | null>(null);
  const [assisted, setAssisted] = useState(false);
  const root = identity?.role.code === 'ROOT';
  const canCreate = identity?.permissions.includes('staff.create') ?? false;
  const canUpdate = identity?.permissions.includes('staff.update') ?? false;
  // Presentación según el observador: Root ve todo; el departamento ve su cuenta y
  // los jefes de ventanilla, sin cuentas ROOT (igual que la regla demostrativa).
  const visibleStaff = (query.data?.items ?? []).filter(
    (item) => root || item.role.code !== 'ROOT',
  );
  const createFields: AdminField[] = [
    { name: 'firstName', label: 'Nombre', required: true },
    { name: 'paternalLastName', label: 'Apellido paterno', required: true },
    { name: 'maternalLastName', label: 'Apellido materno' },
    { name: 'curp', label: 'CURP', required: true, maxLength: 18 },
    { name: 'email', label: 'Correo', type: 'email', required: true },
    {
      name: 'password',
      label: 'Contraseña inicial',
      type: 'password',
      required: true,
      hint: 'Política de la API: de 12 a 20 caracteres; no debe ser común.',
    },
    {
      name: 'municipalityCode',
      label: 'Clave oficial del municipio',
      required: true,
      maxLength: 5,
    },
    {
      name: 'role',
      label: 'Rol',
      type: 'select',
      required: true,
      // El jefe de departamento solo da de alta jefes de ventanilla.
      options: root
        ? [
            { value: 'DEPARTMENT_HEAD', label: 'Jefe de departamento' },
            { value: 'COUNTER_HEAD', label: 'Jefe de ventanilla' },
          ]
        : [{ value: 'COUNTER_HEAD', label: 'Jefe de ventanilla' }],
    },
    { name: 'phone', label: 'Teléfono (10 dígitos)', maxLength: 10 },
  ];
  const editFields: AdminField[] = [
    { name: 'active', label: 'Cuenta activa', type: 'checkbox' },
    { name: 'phone', label: 'Teléfono (10 dígitos)', nullable: true, maxLength: 10 },
    ...(editor && editor !== 'new' && editor.role.code === 'COUNTER_HEAD'
      ? [
          {
            name: 'counterStaff',
            label: 'Perfil técnico para registrar atención',
            type: 'checkbox',
          } as AdminField,
        ]
      : []),
  ];
  return (
    <>
      <PageHeader
        title="Responsables"
        description="El jefe de departamento administra cuentas de jefes de ventanilla; root administra cualquiera. La asignación a sedes se hace desde cada sede."
        actions={
          canCreate ? (
            <Button onClick={() => setEditor('new')}>Nueva cuenta</Button>
          ) : (
            identity?.role.code === 'DEPARTMENT_HEAD' &&
            identity.permissions.includes('staff.read') && (
              <Button variant="secondary" onClick={() => setAssisted(true)}>
                Alta asistida
              </Button>
            )
          )
        }
      />
      <div className="filters">
        <InputField
          label="Buscar personal"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>
      <RemoteState {...query} retry={query.reload} />
      {query.data && (
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cuenta</th>
                  <th>Rol</th>
                  <th>Sedes asignadas</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleStaff.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="table-primary">{item.name}</span>
                      <span className="table-sub">{item.email}</span>
                    </td>
                    <td>{item.role.name}</td>
                    <td>
                      {item.branches.map((branch) => branch.name).join(', ') ||
                        (item.profiles.counterHead ? 'Sin asignar' : 'Dependencia')}
                    </td>
                    <td>{item.active ? 'Activa' : 'Inactiva'}</td>
                    <td>
                      {canUpdate &&
                        (root ? item.role.code !== 'ROOT' : item.role.code === 'COUNTER_HEAD') && (
                          <button className="table-link" onClick={() => setEditor(item)}>
                            Editar
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visibleStaff.length && <p className="panel-body">Sin cuentas para esta búsqueda.</p>}
          </div>
          <Pager pagination={query.data.pagination} change={setPage} />
        </section>
      )}
      {editor && (
        <AdminEditor
          title={editor === 'new' ? 'Nueva cuenta administrativa' : 'Editar cuenta'}
          fields={editor === 'new' ? createFields : editFields}
          initial={
            editor === 'new' ? {} : { ...editor, counterStaff: editor.profiles.counterStaff }
          }
          close={() => setEditor(null)}
          save={async (body) => {
            await adminWrite(
              editor === 'new' ? 'staff' : `staff/${editor.id}`,
              editor === 'new' ? 'POST' : 'PATCH',
              body,
            );
            query.reload();
          }}
        />
      )}
      {assisted && <AssistedStaffDialog onClose={() => setAssisted(false)} />}
    </>
  );
}

export function AdminAppointments() {
  const { identity } = useAdminSession();
  const [branchId, setBranchId] = useState('');
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const query = useAdminQuery<Page<AdminAppointment>>(
    `appointments?${queryString({ branchId, from, to, status, page })}`,
  );
  const [action, setAction] = useState<{ item: AdminAppointment; action: string } | null>(null);
  const canOperate =
    identity?.permissions.includes('appointment.update') && identity.profiles.counterStaff;
  return (
    <>
      <PageHeader
        title="Citas y atención"
        description="Los estados se muestran como los informa la API. Registrar atención solo guarda llegada, inicio y fin."
      />
      <div className="filters">
        <BranchSelect
          value={branchId}
          change={(id) => {
            setBranchId(id);
            setPage(1);
          }}
        />
        <InputField
          label="Desde"
          type="date"
          value={from}
          onChange={(event) => {
            setFrom(event.target.value);
            setPage(1);
          }}
        />
        <InputField
          label="Hasta"
          type="date"
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            setPage(1);
          }}
        />
        <InputField
          label="Estado informado por API"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        />
      </div>
      <RemoteState {...query} retry={query.reload} />
      {query.data && (
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Folio / cita</th>
                  <th>Ciudadano / trámite</th>
                  <th>Sede</th>
                  <th>Estado</th>
                  <th>Atención</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.folio}
                      <span className="table-sub">{stamp(item.scheduledAt)}</span>
                    </td>
                    <td>
                      {item.citizen.name}
                      <span className="table-sub">{item.procedure.name}</span>
                    </td>
                    <td>{item.branch.name}</td>
                    <td>{item.status}</td>
                    <td>
                      {item.attendance?.endedAt ? (
                        `Finalizada: ${stamp(item.attendance.endedAt)}`
                      ) : canOperate ? (
                        <button
                          className="table-link"
                          onClick={() =>
                            setAction({
                              item,
                              action: !item.attendance
                                ? 'arrive'
                                : !item.attendance.startedAt
                                  ? 'start'
                                  : 'end',
                            })
                          }
                        >
                          {!item.attendance
                            ? 'Registrar llegada'
                            : !item.attendance.startedAt
                              ? 'Iniciar atención'
                              : 'Finalizar atención'}
                        </button>
                      ) : item.attendance ? (
                        'En atención'
                      ) : (
                        'Sin llegada'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!query.data.items.length && (
              <p className="panel-body">Sin citas para el periodo y filtros indicados.</p>
            )}
          </div>
          <Pager pagination={query.data.pagination} change={setPage} />
        </section>
      )}
      {action && (
        <AttendanceEditor
          item={action.item}
          action={action.action}
          close={() => setAction(null)}
          reload={query.reload}
        />
      )}
    </>
  );
}
function AttendanceEditor({
  item,
  action,
  close,
  reload,
}: {
  item: AdminAppointment;
  action: string;
  close: () => void;
  reload: () => void;
}) {
  const counters = useAdminQuery<{ items: { id: string; number: number; active: boolean }[] }>(
    action === 'arrive' ? `branches/${item.branch.id}/counters` : null,
  );
  const fields: AdminField[] =
    action === 'arrive'
      ? [
          {
            name: 'counterId',
            label: 'Mostrador activo',
            type: 'select',
            required: true,
            options:
              counters.data?.items
                .filter((counter) => counter.active)
                .map((counter) => ({ value: counter.id, label: `Mostrador ${counter.number}` })) ??
              [],
          },
          { name: 'qrToken', label: 'Código QR (opcional)' },
          { name: 'late', label: 'Llegada tardía', type: 'checkbox' },
        ]
      : [];
  return (
    <>
      <RemoteState {...counters} retry={counters.reload} />
      {counters.error && (
        <Button variant="secondary" onClick={close}>
          Cerrar registro de atención
        </Button>
      )}
      {action === 'arrive' &&
        counters.data &&
        !counters.data.items.some((counter) => counter.active) && (
          <p className="alert alert-info">
            La sede no tiene mostradores activos. Solicita su configuración antes de registrar una
            llegada.
          </p>
        )}
      {!counters.loading && !counters.error && (
        <AdminEditor
          title={`${action === 'arrive' ? 'Registrar llegada' : action === 'start' ? 'Iniciar atención' : 'Finalizar atención'} · ${item.folio}`}
          fields={fields}
          initial={{}}
          close={close}
          save={async (body) => {
            await adminWrite(`appointments/${item.id}/attendance`, 'POST', { action, ...body });
            reload();
          }}
        />
      )}
    </>
  );
}

const reportColumns = [
  ['folio', 'Folio'],
  ['scheduledAt', 'Fecha programada'],
  ['branch', 'Sede'],
  ['municipality', 'Municipio'],
  ['procedure', 'Trámite'],
  ['citizen', 'Ciudadano'],
  ['status', 'Estado'],
  ['arrivedAt', 'Llegada'],
  ['startedAt', 'Inicio'],
  ['endedAt', 'Fin'],
  ['waitMinutes', 'Espera (min)'],
  ['serviceMinutes', 'Atención (min)'],
] as const;
export function AdminReports() {
  const [filters, setFilters] = useState({
    from: `${today().slice(0, 7)}-01`,
    to: today(),
    branchId: '',
    municipalityCode: '',
    type: '',
    procedureId: '',
    status: '',
  });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [columns, setColumns] = useState<string[]>([
    'folio',
    'scheduledAt',
    'branch',
    'procedure',
    'citizen',
    'status',
  ]);
  const [exporting, setExporting] = useState(false);
  const notify = useToast();
  const query = useAdminQuery<AdminReport>(`reports?${queryString({ ...applied, page })}`);
  return (
    <>
      <PageHeader
        title="Reportes"
        description="Cohorte de citas programadas del periodo, en hora de Chiapas. La exportación incluye todos los resultados filtrados."
      />
      <form
        className="filters"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied({ ...filters });
          setPage(1);
          query.reload();
        }}
      >
        <InputField
          label="Desde"
          type="date"
          required
          value={filters.from}
          onChange={(event) => setFilters({ ...filters, from: event.target.value })}
        />
        <InputField
          label="Hasta"
          type="date"
          required
          value={filters.to}
          onChange={(event) => setFilters({ ...filters, to: event.target.value })}
        />
        <BranchSelect
          value={filters.branchId}
          change={(id) => setFilters({ ...filters, branchId: id })}
        />
        <InputField
          label="Clave de municipio"
          value={filters.municipalityCode}
          onChange={(event) => setFilters({ ...filters, municipalityCode: event.target.value })}
        />
        <SelectField
          label="Tipo de sede"
          value={filters.type}
          onChange={(event) => setFilters({ ...filters, type: event.target.value })}
        >
          <option value="">Todos</option>
          <option>VUGE</option>
          <option>VIM</option>
        </SelectField>
        <InputField
          label="Estado de cita"
          value={filters.status}
          onChange={(event) => setFilters({ ...filters, status: event.target.value })}
        />
        <Button type="submit">Consultar reporte</Button>
      </form>
      <RemoteState {...query} retry={query.reload} />
      {query.data && (
        <>
          <div className="admin-card-grid">
            {[
              ['Citas', query.data.summary.appointments],
              ['Ciudadanos únicos', query.data.summary.citizens],
              ['Llegadas', query.data.summary.attended],
              ['Atenciones finalizadas', query.data.summary.completed],
              ['Espera promedio (min)', query.data.summary.averageWaitMinutes ?? '—'],
              ['Atención promedio (min)', query.data.summary.averageServiceMinutes ?? '—'],
            ].map(([label, value]) => (
              <section className="panel panel-body" key={label}>
                <p className="muted">{label}</p>
                <strong className="admin-metric">{value}</strong>
              </section>
            ))}
          </div>
          <details className="panel panel-body mt-3">
            <summary>Columnas del reporte y exportación</summary>
            <div className="form-grid mt-3">
              {reportColumns.map(([key, label]) => (
                <label className="checkbox-label" key={key}>
                  <input
                    type="checkbox"
                    checked={columns.includes(key)}
                    onChange={(event) =>
                      setColumns((previous) =>
                        event.target.checked
                          ? [...previous, key]
                          : previous.filter((value) => value !== key),
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </details>
          <div className="form-actions">
            <Badge tone="neutral">
              Periodo aplicado: {applied.from}–{applied.to}
            </Badge>
            <Button
              disabled={!columns.length || exporting}
              onClick={async () => {
                setExporting(true);
                try {
                  await downloadReport(queryString({ ...applied, columns: columns.join(',') }));
                } catch (cause) {
                  notify(cause instanceof Error ? cause.message : 'No se pudo exportar.', 'error');
                } finally {
                  setExporting(false);
                }
              }}
            >
              {exporting ? 'Exportando…' : 'Exportar CSV completo'}
            </Button>
          </div>
          <section className="panel">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {reportColumns
                      .filter(([key]) => columns.includes(key))
                      .map(([key, label]) => (
                        <th key={key}>{label}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((item, index) => (
                    <tr key={`${item.folio}-${index}`}>
                      {reportColumns
                        .filter(([key]) => columns.includes(key))
                        .map(([key]) => (
                          <td key={key}>
                            {['scheduledAt', 'arrivedAt', 'startedAt', 'endedAt'].includes(key)
                              ? stamp(item[key] as string | null)
                              : String(item[key] ?? '—')}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!query.data.items.length && (
                <p className="panel-body">Sin resultados para el periodo.</p>
              )}
            </div>
            <Pager pagination={query.data.pagination} change={setPage} />
          </section>
        </>
      )}
    </>
  );
}
