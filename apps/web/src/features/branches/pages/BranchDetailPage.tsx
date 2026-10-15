/** Sede organizada por secciones enlazables: información, oferta y horarios. */
import { useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useDemo } from '../../../app/providers/demo-context';
import { useScopedData } from '../../../hooks/useScopedData';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { BranchForm } from '../components/BranchForm';
import { BranchOffer } from '../components/BranchOffer';
import { AvailabilityPage } from '../../availability/pages/AvailabilityPage';

export function BranchDetailPage() {
  const { sedeId } = useParams();
  const location = useLocation();
  const [params] = useSearchParams();
  const { branches } = useScopedData();
  const { db, user } = useDemo();
  const [editing, setEditing] = useState(false);
  const branch = branches.find((item) => item.id === sedeId);
  if (!branch)
    return (
      <EmptyState
        title="Sede no disponible"
        description="La sede no existe o está fuera de tu alcance."
        action={
          <Link className="button button-secondary" to="/sedes">
            Volver a sedes
          </Link>
        }
      />
    );
  const tab = location.pathname.endsWith('/tramites')
    ? 'tramites'
    : params.get('seccion') === 'horarios'
      ? 'horarios'
      : 'informacion';
  const head = db.users.find((item) => item.id === branch.counterHeadId);
  return (
    <>
      <Link className="table-link mb-5" to="/sedes">
        <ArrowLeft size={14} />
        Sedes
      </Link>
      <PageHeader title={branch.name} description={branch.municipality} />
      <nav className="section-tabs" aria-label="Secciones de sede">
        <Link
          to={`/sedes/${branch.id}`}
          className={tab === 'informacion' ? 'section-tab-active' : ''}
          aria-current={tab === 'informacion' ? 'page' : undefined}
        >
          Información
        </Link>
        <Link
          to={`/sedes/${branch.id}/tramites`}
          className={tab === 'tramites' ? 'section-tab-active' : ''}
          aria-current={tab === 'tramites' ? 'page' : undefined}
        >
          Trámites
        </Link>
        <Link
          to={`/sedes/${branch.id}?seccion=horarios`}
          className={tab === 'horarios' ? 'section-tab-active' : ''}
          aria-current={tab === 'horarios' ? 'page' : undefined}
        >
          Horarios
        </Link>
      </nav>
      {tab === 'informacion' && (
        <section className="panel">
          <header className="panel-header">
            <Badge tone={branch.active ? 'green' : 'neutral'}>
              {branch.active ? 'Activa' : 'Inactiva'}
            </Badge>
            <Button icon={Pencil} onClick={() => setEditing(true)}>
              {user?.role === 'COUNTER_HEAD' ? 'Editar contacto' : 'Editar información'}
            </Button>
          </header>
          <div className="panel-body">
            <dl className="detail-list detail-columns">
              <div>
                <dt>TIPO</dt>
                <dd>{branch.type}</dd>
              </div>
              <div>
                <dt>MUNICIPIO</dt>
                <dd>{branch.municipality}</dd>
              </div>
              <div>
                <dt>DIRECCIÓN</dt>
                <dd>{branch.address}</dd>
              </div>
              <div>
                <dt>TELÉFONO</dt>
                <dd>{branch.phone || 'Sin teléfono'}</dd>
              </div>
              <div>
                <dt>RESPONSABLE</dt>
                <dd>{head ? `${head.name}${head.active ? '' : ' · inactivo'}` : 'Sin asignar'}</dd>
              </div>
              <div>
                <dt>PUBLICACIÓN</dt>
                <dd>{branch.published ? 'Publicada' : 'Borrador'}</dd>
              </div>
            </dl>
          </div>
        </section>
      )}
      <div hidden={tab !== 'tramites'}>
        <BranchOffer branch={branch} key={branch.id} />
      </div>
      {tab === 'horarios' && <AvailabilityPage key={branch.id} sedeId={branch.id} embedded />}
      {editing && (
        <Modal
          title={user?.role === 'COUNTER_HEAD' ? 'Contacto' : 'Editar sede'}
          wide
          onClose={() => setEditing(false)}
        >
          <BranchForm branch={branch} onDone={() => setEditing(false)} />
        </Modal>
      )}
    </>
  );
}
