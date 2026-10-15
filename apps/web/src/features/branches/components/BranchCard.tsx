/** Tarjeta breve de sede con municipio, responsable y acción Administrar. */
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, MapPin } from 'lucide-react';
import type { Branch } from '../../../types/domain';
import { useDemo } from '../../../app/providers/demo-context';
import { Badge } from '../../../components/ui/Badge';
import { initials } from '../../../utils/format';

export function BranchCard({ branch }: { branch: Branch }) {
  const { db } = useDemo();
  const head = db.users.find((user) => user.id === branch.counterHeadId);
  return (
    <article className="panel branch-card">
      <div className="branch-card-top">
        <span className={`branch-icon ${branch.type === 'VIM' ? 'branch-icon-pink' : ''}`}>
          <Building2 size={23} aria-hidden="true" />
        </span>
        <Badge tone={branch.active ? 'green' : 'neutral'}>
          {branch.active ? 'Activa' : 'Inactiva'}
        </Badge>
      </div>
      <div className="branch-card-body">
        <h2>{branch.name}</h2>
        <p className="branch-location">
          <MapPin size={12} aria-hidden="true" />
          {branch.municipality}
        </p>
        <p className="branch-head">
          <span className="avatar">{head ? initials(head.name) : '—'}</span>
          {head?.active ? head.name : head ? `${head.name} · inactivo` : 'Sin responsable asignado'}
        </p>
      </div>
      <footer className="branch-card-footer">
        <Badge tone={branch.published ? 'neutral' : 'amber'}>
          {branch.published ? branch.type : `${branch.type} · borrador`}
        </Badge>
        <Link className="table-link" to={`/sedes/${branch.id}`}>
          Administrar
          <ArrowRight size={13} />
        </Link>
      </footer>
    </article>
  );
}
