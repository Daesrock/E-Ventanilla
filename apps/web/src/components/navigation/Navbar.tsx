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

export function Navbar({ toggleMenu, menuOpen }: { toggleMenu: () => void; menuOpen: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useDemo();
  const notify = useToast();
  const [exiting, setExiting] = useState(false);
  const [demoInfo, setDemoInfo] = useState(false);
  const exit = async () => {
    setExiting(true);
    try {
      await apiLogout();
    } catch {
      notify(
        'Demo cerrada; no se pudo confirmar cierre de sesión API. Puedes verificarlo desde Conexión con API.',
        'error',
      );
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
          <button
            className="demo-pill"
            onClick={() => setDemoInfo(true)}
            aria-label="Acerca de la demostración"
          >
            <FlaskConical size={13} />
            Demostración
          </button>
          <span className="avatar avatar-small" aria-label={user?.name}>
            {initials(user?.name ?? '')}
          </span>
          <button
            className="icon-button"
            title="Salir de la demostración y cerrar sesión API"
            aria-label="Salir de la demostración"
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
