/** Cuentas ficticias y responsables. Root da altas; departamento asigna desde sedes. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, ArrowRight } from 'lucide-react';
import type { StaffUser } from '../../../types/domain';
import { useDemo } from '../../../app/providers/demo-context';
import { useScopedData } from '../../../hooks/useScopedData';
import { canCreateUsers, roleLabels } from '../../auth/policy';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { UserForm } from '../components/UserForm';
import { initials } from '../../../utils/format';

export function UsersPage() {
  const { db, user } = useDemo();
  const { branches } = useScopedData();
  const [form, setForm] = useState<StaffUser | 'new' | null>(null);
  const root = Boolean(user && canCreateUsers(user));
  const visible = db.users.filter(
    (item) =>
      root || (user?.role === 'DEPARTMENT_HEAD' ? item.role !== 'ROOT' : item.id === user?.id),
  );
  return (
    <>
      <PageHeader
        title={user?.role === 'COUNTER_HEAD' ? 'Mi cuenta' : 'Responsables'}
        actions={
          root ? (
            <Button icon={Plus} onClick={() => setForm('new')}>
              Nueva cuenta
            </Button>
          ) : user?.role === 'DEPARTMENT_HEAD' ? (
            <Link className="button button-secondary" to="/sedes">
              Asignar responsables
              <ArrowRight size={15} />
            </Link>
          ) : undefined
        }
      />
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>CUENTA</th>
                <th>ROL</th>
                <th>SEDES ASIGNADAS</th>
                <th>ESTADO</th>
                {root && <th>ACCIÓN</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="user-name">
                      <span className="avatar">{initials(item.name)}</span>
                      <div>
                        <span className="table-primary">{item.name}</span>
                        <span className="table-sub">{item.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>{roleLabels[item.role]}</td>
                  <td>
                    {item.role === 'COUNTER_HEAD'
                      ? branches
                          .filter((branch) => branch.counterHeadId === item.id)
                          .map((branch) => branch.name)
                          .join(', ') || 'Sin asignación'
                      : 'Alcance de dependencia'}
                  </td>
                  <td>
                    <Badge tone={item.active ? 'green' : 'neutral'}>
                      {item.active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </td>
                  {root && (
                    <td>
                      {item.role !== 'ROOT' ? (
                        <button className="table-link" onClick={() => setForm(item)}>
                          <Pencil size={13} />
                          Editar
                        </button>
                      ) : (
                        <span className="muted text-xs">Cuenta inicial</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {form && (
        <Modal
          title={form === 'new' ? 'Nueva cuenta' : 'Editar cuenta'}
          onClose={() => setForm(null)}
        >
          <UserForm user={form === 'new' ? undefined : form} onDone={() => setForm(null)} />
        </Modal>
      )}
    </>
  );
}
