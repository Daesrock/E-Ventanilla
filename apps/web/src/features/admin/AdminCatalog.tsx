/** Catálogo administrativo real: costo central nullable, publicación corroborada y permisos. */
import { useState } from 'react';
import { useAdminSession } from '../../app/providers/admin-context';
import { adminWrite, price, type AdminProcedure } from '../../services/api/admin';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { InputField, SelectField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { AdminEditor, RemoteState, type AdminField } from './AdminUI';
import { publicationFields } from './admin-fields';
import { useAdminQuery } from './admin-hooks';

const procedureFields: AdminField[] = [
  { name: 'name', label: 'Nombre del trámite', required: true, maxLength: 200 },
  { name: 'category', label: 'Categoría', nullable: true },
  { name: 'description', label: 'Descripción', type: 'textarea', nullable: true },
  { name: 'requirements', label: 'Requisitos (uno por línea)', type: 'textarea', nullable: true },
  {
    name: 'cost',
    label: 'Costo central (MXN)',
    type: 'number',
    min: 0,
    step: '0.01',
    nullable: true,
    hint: 'Vacío = por confirmar. 0 = sin costo. Igual en todas las sedes.',
  },
  {
    name: 'estimatedMinutes',
    label: 'Duración estimada (minutos)',
    type: 'number',
    min: 1,
    step: '1',
    nullable: true,
  },
];
export function AdminCatalog() {
  const { identity } = useAdminSession();
  const query = useAdminQuery<{ items: AdminProcedure[] }>('procedures');
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [category, setCategory] = useState('');
  const [editor, setEditor] = useState<AdminProcedure | 'new' | null>(null);
  const [detail, setDetail] = useState<AdminProcedure | null>(null);
  const items = query.data?.items.filter(
    (item) =>
      item.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')) &&
      (!category || item.category === category) &&
      (!state ||
        (state === 'published' && item.published && item.active) ||
        (state === 'draft' && !item.published) ||
        (state === 'inactive' && !item.active)),
  );
  return (
    <>
      <PageHeader
        title="Catálogo de trámites"
        description="Define costos y requisitos centrales. La oferta se configura por sede."
        actions={
          identity?.permissions.includes('procedure.create') && (
            <Button onClick={() => setEditor('new')}>Nuevo trámite</Button>
          )
        }
      />
      <div className="filters">
        <InputField
          label="Buscar trámite"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <SelectField
          label="Estado"
          value={state}
          onChange={(event) => setState(event.target.value)}
        >
          <option value="">Todos</option>
          <option value="published">Publicado y activo</option>
          <option value="draft">Borrador</option>
          <option value="inactive">Inactivo</option>
        </SelectField>
        <SelectField
          label="Categoría"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">Todas</option>
          {[
            ...new Set(
              query.data?.items
                .map((item) => item.category)
                .filter((value): value is string => !!value),
            ),
          ].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </SelectField>
      </div>
      <RemoteState {...query} retry={query.reload} />
      {items && (
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Trámite</th>
                  <th>Costo central</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="table-primary">{item.name}</span>
                      <span className="table-sub">{item.category || 'Sin categoría'}</span>
                    </td>
                    <td>{price(item.cost)}</td>
                    <td>
                      <Badge tone={item.active && item.published ? 'green' : 'amber'}>
                        {!item.active ? 'Inactivo' : item.published ? 'Publicado' : 'Borrador'}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex gap-3">
                        <button className="table-link" onClick={() => setDetail(item)}>
                          Ver
                        </button>
                        {identity?.permissions.includes('procedure.update') && (
                          <button className="table-link" onClick={() => setEditor(item)}>
                            Editar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!items.length && <p className="panel-body">Sin trámites para estos filtros.</p>}
          </div>
          <div className="table-summary">{items.length} trámites</div>
        </section>
      )}
      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <p>{detail.description || 'Descripción por confirmar'}</p>
          <dl className="detail-list mt-3">
            <div>
              <dt>Costo central</dt>
              <dd>{price(detail.cost)}</dd>
            </div>
            <div>
              <dt>Duración</dt>
              <dd>
                {detail.estimatedMinutes === null
                  ? 'Por confirmar'
                  : `${detail.estimatedMinutes} minutos`}
              </dd>
            </div>
            <div>
              <dt>Requisitos</dt>
              <dd style={{ whiteSpace: 'pre-line' }}>{detail.requirements || 'Por confirmar'}</dd>
            </div>
          </dl>
        </Modal>
      )}
      {editor && (
        <AdminEditor
          title={editor === 'new' ? 'Nuevo trámite' : 'Editar trámite'}
          fields={[
            ...procedureFields.map((field) =>
              editor === 'new' && field.type !== 'number' ? { ...field, nullable: false } : field,
            ),
            ...publicationFields.filter((field) => editor !== 'new' || field.name !== 'active'),
          ]}
          initial={editor === 'new' ? { published: false } : { ...editor }}
          close={() => setEditor(null)}
          save={async (body) => {
            await adminWrite(
              editor === 'new' ? 'procedures' : `procedures/${editor.id}`,
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
