/** Sección secundaria desplegable nativa: controles ocultos no reciben foco hasta abrirla. */
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export function Disclosure({
  title,
  children,
  open,
  onToggle,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
  onToggle?: (open: boolean) => void;
}) {
  return (
    <details
      className="disclosure"
      open={open}
      onToggle={onToggle ? (event) => onToggle(event.currentTarget.open) : undefined}
    >
      <summary>
        {title}
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      <div className="disclosure-body">{children}</div>
    </details>
  );
}
