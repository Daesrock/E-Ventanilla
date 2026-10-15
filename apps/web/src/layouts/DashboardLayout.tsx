/** Shell de rutas anidadas. Monta navbar, sidebar y footer una sola vez para el panel. */
import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useDemo } from '../app/providers/demo-context';
import { Sidebar } from '../components/navigation/Sidebar';
import { Navbar } from '../components/navigation/Navbar';
import { Footer } from '../components/navigation/Footer';

export function DashboardLayout() {
  const { user, storageWarning } = useDemo();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!user) return <Navigate to="/acceso" replace />;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <Sidebar open={menuOpen} close={() => setMenuOpen(false)} />
      <div className="app-main">
        <Navbar toggleMenu={() => setMenuOpen((value) => !value)} menuOpen={menuOpen} />
        <main id="main-content" className="page-content">
          {storageWarning && (
            <p className="alert alert-warning" role="alert">
              {storageWarning}
            </p>
          )}
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
