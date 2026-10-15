/** Botón consistente con variantes institucionales; admite iconos y estados nativos. */
import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: LucideIcon;
}

export function Button({
  variant = 'primary',
  icon: Icon,
  className = '',
  children,
  type = 'button',
  ...props
}: Props) {
  return (
    <button type={type} className={`button button-${variant} ${className}`} {...props}>
      {Icon && <Icon size={17} aria-hidden="true" />}
      {children}
    </button>
  );
}
