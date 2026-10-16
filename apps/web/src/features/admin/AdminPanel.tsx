/** Espacio administrativo real: reutiliza shell institucional y mantiene la demo aislada. */
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAdminSession, pagePermission } from '../../app/providers/admin-context';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { AdminBranches, AdminBranchDetail } from './AdminBranches';
import { AdminCatalog } from './AdminCatalog';
import { AdminSlots, AdminStaffPage, AdminAppointments, AdminReports } from './AdminOperations';

export function AdminPanel() {
  const location = useLocation();
  const { identity, refresh } = useAdminSession();
  const root = `/${location.pathname.split('/')[1] ?? ''}`;
  const permission = pagePermission[root];
  if (!identity) return null;
  // Configuración concentra la sesión institucional y se reserva a ROOT:
  // los jefes vuelven al inicio aunque lleguen por URL directa.
  if (root === '/configuracion' && !identity.permissions.includes('permission.manage'))
    return <Navigate to="/inicio" replace />;
  if (permission && !identity.permissions.includes(permission))
    return (
      <section className="panel panel-body">
        <h2>Sin permiso para esta sección</h2>
        <p>El alcance y los permisos los determina la API.</p>
        <Link to="/inicio">Volver al inicio</Link>
      </section>
    );
  if (root === '/sedes')
    return location.pathname.split('/').filter(Boolean).length > 1 ? (
      <AdminBranchDetail />
    ) : (
      <AdminBranches />
    );
  if (root === '/tramites') return <AdminCatalog />;
  if (root === '/disponibilidad') return <AdminSlots />;
  if (root === '/usuarios') return <AdminStaffPage />;
  if (root === '/citas') return <AdminAppointments />;
  if (root === '/reportes') return <AdminReports />;
  if (root === '/configuracion' || root === '/conexion')
    return (
      <>
        <PageHeader title="Configuración" />
        <section className="panel panel-body">
          <h2>Sesión institucional</h2>
          <p>
            {identity.user.email} · {identity.role.name}
          </p>
          <p>
            Los cambios se guardan mediante el servidor intermediario. Las credenciales de API no se
            entregan al navegador.
          </p>
          <Button variant="secondary" onClick={() => void refresh()}>
            Actualizar permisos y sedes
          </Button>
          <details className="mt-3">
            <summary>Permisos actuales</summary>
            <ul>
              {identity.permissions.map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
          </details>
        </section>
      </>
    );
  if (!['/inicio', '/'].includes(root))
    return (
      <section className="panel panel-body">
        <h2>Página no disponible</h2>
        <Link to="/inicio">Volver al inicio</Link>
      </section>
    );
  return (
    <>
      <PageHeader
        title={`Hola, ${identity.user.firstName}`}
        description={`${identity.role.name} · acceso institucional`}
      />
      <section className="panel panel-body">
        <h2>Configurar la atención por sede</h2>
        <p>
          Selecciona una sede, asigna su responsable y define qué trámites atiende. Después
          configura sus horarios y cupos.
        </p>
        <div className="form-actions">
          <Link className="button button-primary" to="/sedes">
            Administrar sedes
          </Link>
          {identity.permissions.includes('procedure.read') && (
            <Link className="button button-secondary" to="/tramites">
              Catálogo central
            </Link>
          )}
        </div>
      </section>
      <div className="admin-card-grid mt-6">
        {[
          ['/sedes', 'Sedes y oferta', 'Responsables, trámites y horarios.'],
          ['/usuarios', 'Responsables', 'Cuentas de personal y sus asignaciones.'],
          ['/reportes', 'Reportes', 'Cohorte de citas y exportación.'],
        ]
          .filter(([path]) => identity.permissions.includes(pagePermission[path] ?? ''))
          .map(([path, title, description]) => (
            <Link className="panel panel-body" to={path!} key={path}>
              <h2>{title}</h2>
              <p className="muted">{description}</p>
            </Link>
          ))}
      </div>
    </>
  );
}
