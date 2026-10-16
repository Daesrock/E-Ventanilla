/** Emblema de la Comisión Estatal de Simplificación Administrativa; crédito institucional. */
import { brand } from '../../app/config/brand';

export function CoesmerLogo({ className = '' }: { className?: string }) {
  return (
    <img
      className={`coesmer-logo ${className}`}
      src={brand.coesmerLogo}
      alt={brand.institution}
      width="590"
      height="183"
    />
  );
}
