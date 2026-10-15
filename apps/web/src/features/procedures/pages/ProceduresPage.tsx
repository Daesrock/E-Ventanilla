/** Catálogo central filtrable. Jefe de ventanilla consulta; departamento/root configuran. */
import { useState } from 'react';
import { Plus, Pencil, Eye, Search } from 'lucide-react';
import type { Procedure } from '../../../types/domain';
import { useDemo } from '../../../app/providers/demo-context';
import { canManageCatalog } from '../../auth/policy';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { SelectField } from '../../../components/ui/Field';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { currency } from '../../../utils/format';
import { ProcedureForm } from '../components/ProcedureForm';

export function ProceduresPage() {
  const { db, user } = useDemo();
  const editable = Boolean(user && canManageCatalog(user));
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [form, setForm] = useState<Procedure | 'new' | null>(null);
  const [detail, setDetail] = useState<Procedure | null>(null);
  const filtered = db.procedures.filter(
    (procedure) =>
      (!category || procedure.category === category) &&
      procedure.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')),
  );
  return (
    <>
      <PageHeader
        title="Trámites"
        actions={
          editable && (
            <Button icon={Plus} onClick={() => setForm('new')}>
              Nuevo trámite
            </Button>
          )
        }
      />
      <div className="filters">
        <div className="field search-field">
          <label htmlFor="procedure-search">Buscar trámite</label>
          <div className="search-input">
            <Search size={16} />
            <input
              id="procedure-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre del trámite…"
            />
          </div>
        </div>
        <SelectField
          label="Categoría"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">Todas las categorías</option>
          {Array.from(new Set(db.procedures.map((procedure) => procedure.category))).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </SelectField>
      </div>
      <section className="panel">
        <div className="table-wrap">
          {filtered.length ? (
            <table>
              <thead>
                <tr>
                  <th>TRÁMITE</th>
                  <th>COSTO</th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((procedure) => (
                  <tr key={procedure.id}>
                    <td>
                      <span className="table-primary">{procedure.name}</span>
                    </td>
                    <td className="cost">
                      {procedure.cost ? currency(procedure.cost) : 'Sin costo'}
                    </td>
                    <td>
                      <Badge tone={procedure.active && procedure.published ? 'green' : 'amber'}>
                        {!procedure.active
                          ? 'Inactivo'
                          : procedure.published
                            ? 'Publicado'
                            : 'Borrador'}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex gap-3">
                        <button className="table-link" onClick={() => setDetail(procedure)}>
                          <Eye size={13} />
                          Ver
                        </button>
                        {editable && (
                          <button className="table-link" onClick={() => setForm(procedure)}>
                            <Pencil size={13} />
                            Editar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState />
          )}
        </div>
        <div className="table-summary">{filtered.length} trámites</div>
      </section>
      {form && (
        <Modal
          wide
          title={form === 'new' ? 'Nuevo trámite' : 'Editar trámite'}
          onClose={() => setForm(null)}
        >
          <ProcedureForm
            procedure={form === 'new' ? undefined : form}
            onDone={() => setForm(null)}
          />
        </Modal>
      )}
      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <p className="muted text-xs mb-5">{detail.description}</p>
          <dl className="detail-list">
            <div>
              <dt>COSTO CENTRAL</dt>
              <dd>{detail.cost ? currency(detail.cost) : 'Sin costo'}</dd>
            </div>
            <div>
              <dt>DURACIÓN ESTIMADA</dt>
              <dd>{detail.estimatedMinutes} minutos</dd>
            </div>
            <div>
              <dt>REQUISITOS</dt>
              <dd>
                <ul className="list-disc pl-5 space-y-2">
                  {detail.requirements
                    .split('\n')
                    .filter(Boolean)
                    .map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                </ul>
              </dd>
            </div>
          </dl>
        </Modal>
      )}
    </>
  );
}
