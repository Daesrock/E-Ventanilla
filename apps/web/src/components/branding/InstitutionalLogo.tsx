/** Logo oficial centralizado; respeta proporción y usa texto alternativo institucional. */
import { brand } from '../../app/config/brand';

export function InstitutionalLogo({ className = '' }: { className?: string }) {
  return (
    <img
      className={`institutional-logo ${className}`}
      src={brand.logo}
      alt={brand.institution}
      width="580"
      height="185"
    />
  );
}
