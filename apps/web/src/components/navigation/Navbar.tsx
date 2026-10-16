/** Barra compartida: título, aviso compacto de demostración y cierre de sesiones. */
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, FlaskConical } from 'lucide-react';
import { useDemo } from '../../app/providers/demo-context';
import { navigation } from '../../app/config/navigation';
import { initials } from '../../utils/format';
import { apiLogout } from '../../features/auth/auth.service';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../ui/Modal';
import { useAdminSession } from '../../app/providers/admin-context';

export function Navbar({ toggleMenu, menuOpen }: { toggleMenu: () => void; menuOpen: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: demoUser, logout } = useDemo();
  const session = useAdminSession();
  const user = session.identity
    ? { name: `${session.identity.user.firstName} ${session.identity.user.lastName}` }
    : demoUser;
  const notify = useToast();
  const [exiting, setExiting] = useState(false);
  const [demoInfo, setDemoInfo] = useState(false);
  const exit = async () => {
    setExiting(true);
    try {
      if (session.identity) await session.signOut();
      else await apiLogout();
    } catch {
      notify('Sesión web cerrada; no se pudo confirmar la revocación remota.', 'error');
    } finally {
      logout();
      navigate('/acceso');
    }
  };
  const current = navigation.find((item) => location.pathname.startsWith(item.path));
  return (
    <>
      <header className="navbar">
        <div className="navbar-context">
          <button
            className="icon-button mobile-toggle"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            onClick={toggleMenu}
          >
            <Menu size={22} />
          </button>
          <span>{current?.label ?? 'Página'}</span>
        </div>
        <div className="navbar-actions">
          {session.identity ? (
            <span className="demo-pill">Acceso institucional</span>
          ) : (
            <button
              className="demo-pill"
              onClick={() => setDemoInfo(true)}
              aria-label="Acerca de la demostración"
            >
              <FlaskConical size={13} />
              Demostración
            </button>
          )}
          <span className="avatar avatar-small" aria-label={user?.name}>
            {initials(user?.name ?? '')}
          </span>
          <button
            className="icon-button"
            title="Cerrar sesión"
            aria-label={
              session.identity ? 'Cerrar sesión institucional' : 'Salir de la demostración'
            }
            disabled={exiting}
            onClick={() => void exit()}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
      {demoInfo && (
        <Modal title="Acerca de la demostración" onClose={() => setDemoInfo(false)}>
          <p>
            Los datos, trámites y costos son ficticios. Los cambios se guardan únicamente en este
            navegador.
          </p>
          <p className="muted mt-3">
            Las consultas públicas y sesiones existentes de API se prueban desde Configuración. No
            habilitan operaciones administrativas reales.
          </p>
        </Modal>
      )}
    </>
  );
}
