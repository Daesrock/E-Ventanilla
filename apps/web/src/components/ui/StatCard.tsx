/** Tarjeta de métrica con icono, valor y referencia explicativa sin variaciones inventadas. */
import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  accent = 'green',
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon;
  accent?: 'green' | 'pink' | 'charcoal' | 'amber';
}) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon stat-icon-${accent}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
      </div>
      <strong className="stat-value">{value}</strong>
      {detail && <p>{detail}</p>}
    </article>
  );
}
