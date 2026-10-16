/** Menú lateral compartido: enlaces activos, identidad institucional y perfil actual. */
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { navigation } from '../../app/config/navigation';
import { useDemo } from '../../app/providers/demo-context';
import { roleLabels } from '../../features/auth/policy';
import { ProductMark } from '../branding/ProductMark';
import { InstitutionalLogo } from '../branding/InstitutionalLogo';
import { initials } from '../../utils/format';
import { useAdminSession, pagePermission } from '../../app/providers/admin-context';
import { brand } from '../../app/config/brand';

/** Identidad del bloque superior: rol real y sedes asignadas cuando existen. */
function workspaceIdentity(identity: ReturnType<typeof useAdminSession>['identity']): {
  title: string;
  subtitle: string;
} {
  if (!identity) return { title: 'Gestión empresarial', subtitle: 'Comisión estatal · Chiapas' };
  if (identity.role.code === 'ROOT')
    return { title: 'Root', subtitle: 'Preparación inicial · Chiapas' };
  if (identity.role.code === 'DEPARTMENT_HEAD')
    return { title: 'Jefe de departamento', subtitle: brand.shortDepartment };
  const names = identity.scope.branches.map((branch) => branch.name);
  return {
    title: 'Jefe de ventanilla',
    subtitle:
      names.length === 0
        ? 'Sin sede asignada'
        : names.length === 1
          ? names[0]!
          : `${names[0]} +${names.length - 1}`,
  };
}

export function Sidebar({ open, close }: { open: boolean; close: () => void }) {
  const { user: demoUser } = useDemo();
  const { identity } = useAdminSession();
  const workspace = workspaceIdentity(identity);
  const user = identity
    ? { name: `${identity.user.firstName} ${identity.user.lastName}`, role: identity.role.code }
    : demoUser;
  return (
    <>
      {open && <button className="sidebar-scrim" aria-label="Cerrar menú" onClick={close} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`} aria-label="Navegación principal">
        <div className="sidebar-brand">
          <ProductMark />
          <button className="icon-button mobile-close" aria-label="Cerrar menú" onClick={close}>
            <X size={20} />
          </button>
        </div>
        <div className="workspace">
          <span className="workspace-icon">GE</span>
          <div>
            <strong>{workspace.title}</strong>
            <small>{workspace.subtitle}</small>
          </div>
        </div>
        <nav>
          {(['principal', 'sistema'] as const).map((section) => (
            <div className="nav-section" key={section}>
              <p>{section === 'principal' ? 'ADMINISTRACIÓN' : 'SISTEMA'}</p>
              {navigation
                .filter((item) => item.section === section)
                .filter(
                  (item) =>
                    !identity ||
                    !pagePermission[item.path] ||
                    identity.permissions.includes(pagePermission[item.path]!),
                )
                .map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={close}
                    className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                  >
                    <item.icon size={19} aria-hidden="true" />
                    <span>
                      {item.path === '/usuarios' && user?.role === 'COUNTER_HEAD'
                        ? 'Mi cuenta'
                        : item.label}
                    </span>
                  </NavLink>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="institution-card">
            <InstitutionalLogo />
          </div>
          {user && (
            <div className="sidebar-profile">
              <span className="avatar">{initials(user.name)}</span>
              <div>
                <strong>{user.name}</strong>
                <small>{roleLabels[user.role]}</small>
              </div>
              <span
                className="online-dot"
                aria-label={identity ? 'Sesión institucional activa' : 'Perfil demostrativo activo'}
              />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
