/** Administración real de sedes y oferta: cambios explícitos, permisos y conservación histórica. */
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useAdminSession } from '../../app/providers/admin-context';
import {
  adminWrite,
  allStaff,
  price,
  type AdminBranch,
  type AdminOffer,
  type AdminStaff,
} from '../../services/api/admin';
import { ApiError } from '../../services/api/client';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { InputField, SelectField } from '../../components/ui/Field';
import { useToast } from '../../hooks/useToast';
import { AdminBranchForm } from './AdminBranchForm';
import { RemoteState } from './AdminUI';
import { useAdminQuery, useUnsavedChanges } from './admin-hooks';
import { AdminSlots } from './AdminOperations';

export function AdminBranches() {
  const { identity } = useAdminSession();
  const query = useAdminQuery<{ items: AdminBranch[] }>('branches');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [creating, setCreating] = useState(false);
  const municipalities = [
    ...new Map(
      query.data?.items.map((branch) => [branch.municipality.code, branch.municipality.name]) ?? [],
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], 'es'));
  const filtered = query.data?.items.filter(
    (branch) =>
      (!type || branch.type === type) &&
      (!municipality || branch.municipality.code === municipality) &&
      `${branch.name} ${branch.municipality.name}`
        .toLocaleLowerCase('es')
        .includes(search.toLocaleLowerCase('es')),
  );
  return (
    <>
      <PageHeader
        title="Sedes"
        description="Configura responsables, trámites y horarios de cada sede."
        actions={
          identity?.role.code === 'ROOT' &&
          identity.permissions.includes('branch.create') && (
            <Button onClick={() => setCreating(true)}>Nueva sede</Button>
          )
        }
      />
      <div className="filters">
        <InputField
          label="Buscar sede"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <SelectField label="Tipo" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">Todos</option>
          <option>VUGE</option>
          <option>VIM</option>
        </SelectField>
        <SelectField
          label="Municipio"
          value={municipality}
          onChange={(event) => setMunicipality(event.target.value)}
        >
          <option value="">Todos</option>
          {municipalities.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </SelectField>
      </div>
      <RemoteState {...query} retry={query.reload} />
      <div className="admin-card-grid">
        {filtered?.map((branch) => (
          <article className="branch-tile" key={branch.id}>
            <header className="branch-tile-head">
              <div>
                <span
                  className={`branch-tile-type ${branch.type === 'VIM' ? 'type-vim' : 'type-vuge'}`}
                >
                  {branch.type}
                </span>
                <h2>{branch.name}</h2>
                <p className="branch-tile-location">{branch.municipality.name}</p>
              </div>
              <Badge tone={branch.active && branch.published ? 'green' : 'amber'}>
                {!branch.active ? 'Inactiva' : branch.published ? 'Publicada' : 'Borrador'}
              </Badge>
            </header>
            <dl className="branch-tile-meta">
              <div>
                <dt>Responsable</dt>
                <dd>
                  {branch.counterHead?.name ?? 'Sin asignar'}
                  {branch.counterHead && !branch.counterHead.active ? ' · inactivo' : ''}
                </dd>
              </div>
            </dl>
            <div className="branch-tile-actions">
              <Link className="button button-primary" to={`/sedes/${branch.id}`}>
                Administrar sede
              </Link>
              <Link className="button button-secondary" to={`/sedes/${branch.id}/tramites`}>
                Asignar trámites
              </Link>
            </div>
          </article>
        ))}
      </div>
      {filtered?.length === 0 && (
        <p className="panel-body">No hay sedes para estos filtros dentro de tu alcance.</p>
      )}
      {creating && (
        <AdminBranchForm
          onDone={() => {
            setCreating(false);
            query.reload();
          }}
        />
      )}
    </>
  );
}

export function AdminBranchDetail() {
  const location = useLocation();
  const paramsRoute = useParams();
  const sedeId = paramsRoute.sedeId ?? location.pathname.split('/')[2];
  const [params] = useSearchParams();
  const query = useAdminQuery<{ items: AdminBranch[] }>('branches');
  const branch = query.data?.items.find((item) => item.id === sedeId);
  const { identity } = useAdminSession();
  const [editing, setEditing] = useState(false);
  const tab = location.pathname.endsWith('/tramites')
    ? 'tramites'
    : (params.get('seccion') ?? 'informacion');
  const canEdit = identity?.permissions.includes('branch.update');
  const manager = identity?.role.code !== 'COUNTER_HEAD';
  return (
    <>
      <Link className="table-link" to="/sedes">
        ← Volver a sedes
      </Link>
      <RemoteState {...query} retry={query.reload} />
      {branch ? (
        <>
          <PageHeader
            title={branch.name}
            description={`${branch.municipality.name} · ${branch.type}`}
          />
          <nav className="section-tabs" aria-label="Secciones de sede">
            {[
              ['informacion', 'Información'],
              ['responsable', 'Responsable'],
              ['tramites', 'Trámites'],
              ['horarios', 'Horarios'],
            ].map(([key, label]) => (
              <Link
                key={key}
                to={
                  key === 'tramites'
                    ? `/sedes/${branch.id}/tramites`
                    : `/sedes/${branch.id}?seccion=${key}`
                }
                className={tab === key ? 'section-tab-active' : ''}
                aria-current={tab === key ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          {tab === 'informacion' && (
            <section className="panel">
              <header className="panel-header">
                <Badge tone={branch.active ? 'green' : 'neutral'}>
                  {branch.active ? 'Activa' : 'Inactiva'} ·{' '}
                  {branch.published ? 'Publicada' : 'Borrador'}
                </Badge>
                {canEdit && <Button onClick={() => setEditing(true)}>Editar información</Button>}
              </header>
              <div className="panel-body">
                <dl className="detail-list detail-columns">
                  {[
                    ['Dirección', branch.address],
                    ['Teléfono', branch.phone],
                    ['Correo', branch.email],
                    ['Horario de oficina', branch.officeHours],
                    ['Responsable', branch.counterHead?.name],
                    ['Fuente corroborada', branch.sourceUrl],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value || 'Por confirmar'}</dd>
                    </div>
                  ))}
                </dl>
                {!branch.published && (
                  <p className="alert alert-info mt-3">
                    Esta sede es borrador. Para publicarla se requiere una fuente oficial
                    corroborada.
                  </p>
                )}
              </div>
            </section>
          )}
          {tab === 'responsable' && (
            <BranchHead branch={branch} reload={query.reload} editable={!!canEdit && manager} />
          )}
          {tab === 'tramites' && <AdminBranchOffer key={branch.id} branch={branch} />}
          {tab === 'horarios' && <AdminSlots branchId={branch.id} />}
          {editing && (
            <AdminBranchForm
              branch={branch}
              onDone={() => {
                setEditing(false);
                query.reload();
              }}
            />
          )}
        </>
      ) : (
        query.data && <p className="alert alert-info">Sede inexistente o fuera de tu alcance.</p>
      )}
    </>
  );
}

function BranchHead({
  branch,
  reload,
  editable,
}: {
  branch: AdminBranch;
  reload: () => void;
  editable: boolean;
}) {
  const [staff, setStaff] = useState<AdminStaff[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(editable);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(branch.counterHeadId ?? '');
  const notify = useToast();
  useEffect(() => {
    if (!editable) return;
    const controller = new AbortController();
    allStaff(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setStaff(items);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [editable]);
  return (
    <section className="panel">
      <div className="panel-body">
        <h2>Responsable de sede</h2>
        <p className="muted">
          Un jefe de ventanilla puede ser responsable de varias sedes. Las cuentas se dan de alta
          por root.
        </p>
        <p className="mt-3">Actual: {branch.counterHead?.name ?? 'Sin asignar'}</p>
        {editable && (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError('');
              try {
                await adminWrite(`branches/${branch.id}/head`, 'PATCH', {
                  counterHeadId: selected || null,
                });
                notify('Responsable actualizado.');
                reload();
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : 'No se pudo asignar.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <SelectField
              label="Jefe de ventanilla"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              disabled={loading || busy}
            >
              <option value="">Sin asignar</option>
              {branch.counterHead &&
                !staff.some((item) => item.id === branch.counterHeadId && item.active) && (
                  <option value={branch.counterHead.id}>{branch.counterHead.name} · actual</option>
                )}
              {staff
                .filter(
                  (item) =>
                    item.active && item.profiles.counterHead && item.role.code === 'COUNTER_HEAD',
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.branches.length} sedes
                  </option>
                ))}
            </SelectField>
            <div className="form-actions">
              <Button
                type="submit"
                disabled={loading || busy || selected === (branch.counterHeadId ?? '')}
              >
                {busy ? 'Guardando…' : 'Guardar responsable'}
              </Button>
            </div>
          </form>
        )}
        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

export function AdminBranchOffer({ branch }: { branch: AdminBranch }) {
  const query = useAdminQuery<{ items: AdminOffer[] }>(`branches/${branch.id}/procedures`);
  return (
    <>
      <RemoteState {...query} retry={query.reload} />
      {query.data && (
        <OfferEditor
          key={JSON.stringify(query.data.items)}
          branch={branch}
          items={query.data.items}
          reload={query.reload}
        />
      )}
    </>
  );
}
function OfferEditor({
  branch,
  items,
  reload,
}: {
  branch: AdminBranch;
  items: AdminOffer[];
  reload: () => void;
}) {
  const { identity } = useAdminSession();
  const editable = !!identity?.permissions.includes('offer.manage');
  const saved = items.filter((item) => item.active).map((item) => item.procedureId);
  const [selected, setSelected] = useState(saved);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('');
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState(false);
  const notify = useToast();
  const additions = selected.filter((id) => !saved.includes(id));
  const removals = saved.filter((id) => !selected.includes(id));
  const dirty = additions.length + removals.length > 0;
  const blocked = useUnsavedChanges(dirty && !busy);
  const visible = items.filter(
    (item) =>
      selected.includes(item.procedureId) &&
      item.procedureActive &&
      item.procedurePublished &&
      branch.active &&
      branch.published,
  );
  const filtered = items.filter(
    (item) =>
      item.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')) &&
      (!category || item.category === category) &&
      (filter === 'all' ||
        (filter === 'assigned' && selected.includes(item.procedureId)) ||
        (filter === 'available' && !selected.includes(item.procedureId)) ||
        (filter === 'unpublished' && !item.procedurePublished) ||
        (filter === 'inactive' && !item.procedureActive)),
  );
  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>Trámites de esta sede</h2>
          <p className="muted">
            {selected.length} asignados · {visible.length} visibles al ciudadano
          </p>
        </div>
        <Button variant="secondary" onClick={() => setPreview(!preview)}>
          {preview ? 'Volver a configuración' : 'Vista ciudadana (pendiente)'}
        </Button>
      </header>
      <div className="panel-body">
        <p className="alert alert-info">
          El costo pertenece al catálogo central y aplica igual en todas las sedes. Retirar un
          trámite de la oferta conserva las citas históricas.
        </p>
        {preview ? (
          <>
            <p className="muted">
              Vista previa con la selección actual; los cambios solo se aplican al guardar.
            </p>
            {visible.length ? (
              visible.map((item) => (
                <div className="offer-item" key={item.procedureId}>
                  <strong>{item.name}</strong>
                  <span>{price(item.cost)}</span>
                </div>
              ))
            ) : (
              <p className="panel-body">
                Sin trámites visibles: revisa publicación y activación de la sede y del catálogo.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="filters">
              <InputField
                label="Buscar trámite"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <SelectField
                label="Oferta"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                {[
                  ['all', 'Todos'],
                  ['assigned', 'Asignados'],
                  ['available', 'Sin asignar'],
                  ['unpublished', 'No publicados'],
                  ['inactive', 'Inactivos'],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Categoría"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">Todas</option>
                {[
                  ...new Set(
                    items.map((item) => item.category).filter((value): value is string => !!value),
                  ),
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </SelectField>
            </div>
            {filtered.map((item) => (
              <label className="offer-item" key={item.procedureId}>
                <input
                  type="checkbox"
                  aria-label={`Ofrecer ${item.name}`}
                  disabled={!editable || busy}
                  checked={selected.includes(item.procedureId)}
                  onChange={(event) => {
                    setReview(false);
                    setSelected((previous) =>
                      event.target.checked
                        ? [...previous, item.procedureId]
                        : previous.filter((id) => id !== item.procedureId),
                    );
                  }}
                />
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.category || 'Sin categoría'}</small>
                  <div className="mt-1">
                    <Badge
                      tone={item.procedureActive && item.procedurePublished ? 'green' : 'amber'}
                    >
                      {!item.procedureActive
                        ? 'Inactivo en catálogo'
                        : !item.procedurePublished
                          ? 'No publicado'
                          : 'Publicado'}
                    </Badge>
                  </div>
                </div>
                <span className="cost">{price(item.cost)}</span>
              </label>
            ))}
            {!filtered.length && (
              <p className="panel-body">No hay trámites que coincidan con los filtros.</p>
            )}
          </>
        )}
        {dirty && (
          <div className="alert alert-warning mt-3" role="status">
            Cambios sin guardar: {additions.length} altas y {removals.length} retiros.
          </div>
        )}
        {review && (
          <section className="panel-body">
            <h3>Revisar cambios</h3>
            {items
              .filter(
                (item) =>
                  additions.includes(item.procedureId) || removals.includes(item.procedureId),
              )
              .map((item) => (
                <p key={item.procedureId}>
                  {additions.includes(item.procedureId) ? 'Asignar' : 'Retirar'}: {item.name}
                </p>
              ))}
          </section>
        )}
        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
        {editable && (
          <div className="form-actions">
            <Button
              variant="secondary"
              disabled={!dirty || busy}
              onClick={() => {
                setSelected(saved);
                setReview(false);
                setError('');
              }}
            >
              Descartar cambios
            </Button>
            <Button
              disabled={!dirty || busy}
              onClick={async () => {
                if (!review) {
                  setReview(true);
                  return;
                }
                setBusy(true);
                setError('');
                try {
                  await adminWrite(`branches/${branch.id}/procedures`, 'PATCH', {
                    items: items
                      .filter(
                        (item) =>
                          additions.includes(item.procedureId) ||
                          removals.includes(item.procedureId),
                      )
                      .map((item) => ({
                        procedureId: item.procedureId,
                        active: selected.includes(item.procedureId),
                      })),
                  });
                  notify('Oferta de trámites guardada.');
                  reload();
                } catch (cause) {
                  setError(
                    cause instanceof ApiError
                      ? `${cause.message} ${Object.values(cause.fieldErrors).join(' ')}`
                      : 'No se pudo guardar.',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Guardando…' : review ? 'Confirmar y guardar trámites' : 'Revisar cambios'}
            </Button>
          </div>
        )}
      </div>
      {blocked}
    </section>
  );
}
