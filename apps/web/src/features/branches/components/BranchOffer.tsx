/** Selección de oferta por sede y vista ciudadana simulada; preserva asociaciones históricas. */
import { useState } from 'react';
import { Eye, Save } from 'lucide-react';
import type { Branch } from '../../../types/domain';
import { useDemo } from '../../../app/providers/demo-context';
import { canManageCatalog } from '../../auth/policy';
import { useToast } from '../../../hooks/useToast';
import { Button } from '../../../components/ui/Button';
import { currency } from '../../../utils/format';
import { Badge } from '../../../components/ui/Badge';

export function BranchOffer({ branch }: { branch: Branch }) {
  const { db, user, execute } = useDemo();
  const notify = useToast();
  const [selected, setSelected] = useState(() =>
    db.branchProcedures
      .filter((link) => link.branchId === branch.id && link.active)
      .map((link) => link.procedureId),
  );
  const [preview, setPreview] = useState(false);
  const editable = user ? canManageCatalog(user) : false;
  const saved = db.branchProcedures
    .filter((link) => link.branchId === branch.id && link.active)
    .map((link) => link.procedureId);
  const dirty = selected.length !== saved.length || selected.some((id) => !saved.includes(id));
  const visible = db.procedures.filter(
    (procedure) =>
      saved.includes(procedure.id) &&
      procedure.active &&
      procedure.published &&
      branch.active &&
      branch.published,
  );
  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>
            {preview
              ? 'Vista ciudadana'
              : editable
                ? 'Selecciona los trámites disponibles'
                : 'Trámites disponibles'}
          </h2>
        </div>
        <Button variant="ghost" icon={Eye} onClick={() => setPreview((value) => !value)}>
          {preview ? 'Configuración' : 'Vista ciudadana'}
        </Button>
      </header>
      <div className="panel-body">
        {preview ? (
          <>
            {visible.length ? (
              visible.map((procedure) => (
                <div className="offer-item" key={procedure.id}>
                  <div>
                    <strong>{procedure.name}</strong>
                    <small>{procedure.description}</small>
                  </div>
                  <span className="cost">
                    {procedure.cost ? currency(procedure.cost) : 'Sin costo'}
                  </span>
                </div>
              ))
            ) : (
              <p className="muted text-xs">
                No hay trámites visibles. Revisa activación y publicación de sede, trámite y
                asociación.
              </p>
            )}
          </>
        ) : (
          <>
            {db.procedures.map((procedure) => (
              <label className="offer-item" key={procedure.id}>
                <input
                  type="checkbox"
                  aria-label={`Ofrecer ${procedure.name}`}
                  checked={selected.includes(procedure.id)}
                  disabled={!editable}
                  onChange={(event) =>
                    setSelected((value) =>
                      event.target.checked
                        ? [...value, procedure.id]
                        : value.filter((id) => id !== procedure.id),
                    )
                  }
                />
                <div>
                  <strong>{procedure.name}</strong>
                  <small>{procedure.estimatedMinutes} min</small>
                  {!procedure.active && (
                    <div className="mt-1">
                      <Badge tone="neutral">Inactivo en catálogo</Badge>
                    </div>
                  )}
                </div>
                <span className="cost">
                  {procedure.cost ? currency(procedure.cost) : 'Sin costo'}
                </span>
              </label>
            ))}
            {editable && (
              <div className="form-actions">
                <span className="muted text-xs self-center mr-auto">
                  {dirty ? 'Cambios sin guardar' : ''}
                </span>
                <Button
                  icon={Save}
                  disabled={!dirty}
                  onClick={() => {
                    try {
                      execute({ type: 'set-offer', branchId: branch.id, procedureIds: selected });
                      notify('Trámites de sede guardados.');
                    } catch (error) {
                      notify(
                        error instanceof Error ? error.message : 'No se pudo guardar.',
                        'error',
                      );
                    }
                  }}
                >
                  Guardar trámites
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
