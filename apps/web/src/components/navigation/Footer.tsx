/** Pie institucional breve, compartido por rutas del panel. */
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="footer">
      <span>© {new Date().getFullYear()} E-Ventanilla</span>
      <Link to="/configuracion">Configuración</Link>
    </footer>
  );
}
