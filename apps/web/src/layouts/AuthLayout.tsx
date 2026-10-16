/** Layout de acceso: identidad oficial y panel decorativo sin datos administrativos. */
import { Outlet } from 'react-router-dom';
import { ArrowUpRight, Building2, CalendarCheck2, MapPin } from 'lucide-react';
import { ProductMark } from '../components/branding/ProductMark';
import { InstitutionalLogo } from '../components/branding/InstitutionalLogo';
import { CoesmerLogo } from '../components/branding/CoesmerLogo';
import { brand } from '../app/config/brand';

export function AuthLayout() {
  return (
    <main className="auth-layout">
      <section className="auth-story geometric-surface">
        <ProductMark light />
        <div className="auth-story-content">
          <h1>{brand.department}</h1>
          <p>Gestión empresarial y ventanillas integrales.</p>
          <div className="auth-illustration" aria-hidden="true">
            <div className="illustration-header">
              <span className="illustration-dots">● ● ●</span>
              <ArrowUpRight size={18} />
            </div>
            <div className="illustration-row">
              <span>
                <Building2 size={26} />
              </span>
              <div>
                <strong>Ventanillas conectadas</strong>
                <small>VUGE + VIM</small>
              </div>
              <span className="illustration-check">✓</span>
            </div>
            <div className="illustration-stats">
              <div>
                <CalendarCheck2 size={22} />
                <strong>Atención</strong>
                <small>organizada</small>
              </div>
              <div>
                <MapPin size={22} />
                <strong>Municipios</strong>
                <small>más cerca</small>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="auth-form-side">
        <InstitutionalLogo className="auth-logo" />
        <Outlet />
        <footer>
          <CoesmerLogo className="auth-coesmer" />
          {brand.institution}
          <br />
          <span>Gobierno de Chiapas</span>
        </footer>
      </section>
    </main>
  );
}
