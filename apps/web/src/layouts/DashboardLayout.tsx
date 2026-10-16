/** Shell de rutas anidadas. Monta navbar, sidebar y footer una sola vez para el panel. */
import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useDemo } from '../app/providers/demo-context';
import { Sidebar } from '../components/navigation/Sidebar';
import { Navbar } from '../components/navigation/Navbar';
import { Footer } from '../components/navigation/Footer';
import { useAdminSession } from '../app/providers/admin-context';
import { AdminPanel } from '../features/admin/AdminPanel';

export function DashboardLayout() {
  const { user, storageWarning } = useDemo();
  const session = useAdminSession();
  const [menuOpen, setMenuOpen] = useState(false);
  if (session.loading && !user) return <p role="status">Comprobando sesión…</p>;
  if (!user && !session.identity) return <Navigate to="/acceso" replace />;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <Sidebar open={menuOpen} close={() => setMenuOpen(false)} />
      <div className="app-main">
        <Navbar toggleMenu={() => setMenuOpen((value) => !value)} menuOpen={menuOpen} />
        <main id="main-content" className="page-content">
          {storageWarning && !session.identity && (
            <p className="alert alert-warning" role="alert">
              {storageWarning}
            </p>
          )}
          {session.identity ? <AdminPanel /> : <Outlet />}
        </main>
        <Footer />
      </div>
    </div>
  );
}
