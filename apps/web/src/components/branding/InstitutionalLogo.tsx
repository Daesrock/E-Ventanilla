/** Logo oficial de E-Ventanilla; proporción fija para no deformar el recurso entregado. */
import { brand } from '../../app/config/brand';

export function InstitutionalLogo({ className = '' }: { className?: string }) {
  return (
    <img
      className={`institutional-logo ${className}`}
      src={brand.logo}
      alt={`Logotipo ${brand.product}`}
      width="166"
      height="102"
    />
  );
}
