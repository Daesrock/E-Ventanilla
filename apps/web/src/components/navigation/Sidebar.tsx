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

export function Sidebar({ open, close }: { open: boolean; close: () => void }) {
  const { user: demoUser } = useDemo();
  const { identity } = useAdminSession();
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
            <strong>Gestión empresarial</strong>
            <small>Comisión estatal · Chiapas</small>
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
