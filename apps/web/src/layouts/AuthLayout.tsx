/** Layout de acceso: identidad oficial y panel decorativo sin datos administrativos. */
import { Outlet } from 'react-router-dom';
import { ArrowUpRight, Building2, CalendarCheck2, MapPin } from 'lucide-react';
import { ProductMark } from '../components/branding/ProductMark';
import { InstitutionalLogo } from '../components/branding/InstitutionalLogo';
import { brand } from '../app/config/brand';

export function AuthLayout() {
  return (
    <main className="auth-layout">
      <section className="auth-story geometric-surface">
        <ProductMark light />
        <div className="auth-story-content">
          <span className="auth-eyebrow">SERVICIO PÚBLICO · CHIAPAS</span>
          <h1>
            Más cerca de
            <br />
            las personas.
            <br />
            <span>Más simple.</span>
          </h1>
          <p>Un espacio para coordinar nuestras ventanillas y transformar la atención ciudadana.</p>
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
        <p className="auth-story-footer">Gestión empresarial y ventanillas integrales</p>
      </section>
      <section className="auth-form-side">
        <InstitutionalLogo className="auth-logo" />
        <Outlet />
        <footer>
          {brand.institution}
          <br />
          <span>Gobierno de Chiapas</span>
        </footer>
      </section>
    </main>
  );
}
