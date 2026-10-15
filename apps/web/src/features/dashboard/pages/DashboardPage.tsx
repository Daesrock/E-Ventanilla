/** Inicio ligero: tres indicadores del mes y accesos por tarea dentro del alcance del perfil. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CalendarCheck2,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  UsersRound,
} from 'lucide-react';
import { useDemo } from '../../../app/providers/demo-context';
import { useScopedData } from '../../../hooks/useScopedData';
import { calculateMetrics, filterAppointments, monthRange } from '../../reports/report.service';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatCard } from '../../../components/ui/StatCard';
import { number } from '../../../utils/format';

export function DashboardPage() {
  const { db, user } = useDemo();
  const { branches, appointments } = useScopedData();
  const [month, setMonth] = useState(db.referenceDate.slice(0, 7));
  const metrics = calculateMetrics(
    filterAppointments(appointments, branches, {
      ...monthRange(month),
      municipality: '',
      branchType: '',
      branchId: '',
      procedureId: '',
      status: '',
    }),
  );
  return (
    <>
      <PageHeader
        title="Inicio"
        actions={
          <label className="month-control">
            <CalendarDays size={16} aria-hidden="true" />
            <span className="sr-only">Mes del resumen</span>
            <input
              aria-label="Mes del resumen"
              type="month"
              value={month}
              onChange={(event) => {
                if (event.target.value) setMonth(event.target.value);
              }}
            />
          </label>
        }
      />
      <section className="welcome-banner welcome-compact geometric-surface">
        <div className="welcome-copy">
          <h2>Hola, {user?.name.split(' ')[0]}.</h2>
          <p>¿Qué necesitas hacer hoy?</p>
        </div>
      </section>
      <div className="stats-grid stats-three">
        <StatCard
          label="Citas del mes"
          value={number(metrics.appointments)}
          icon={CalendarCheck2}
        />
        <StatCard
          label="Atenciones finalizadas"
          value={number(metrics.completed)}
          icon={UsersRound}
          accent="pink"
        />
        <StatCard
          label="Sedes activas"
          value={branches.filter((branch) => branch.active).length}
          icon={Building2}
          accent="charcoal"
        />
      </div>
      <div className="quick-action-grid task-grid">
        <Link className="quick-action" to="/sedes">
          <Building2 size={25} />
          <div>
            <strong>{user?.role === 'COUNTER_HEAD' ? 'Mis sedes' : 'Administrar sedes'}</strong>
            <small>Responsables, trámites y horarios</small>
          </div>
          <ChevronRight size={17} />
        </Link>
        <Link className="quick-action" to="/citas">
          <CalendarCheck2 size={25} />
          <div>
            <strong>Consultar citas</strong>
            <small>Agenda y atención</small>
          </div>
          <ChevronRight size={17} />
        </Link>
        <Link className="quick-action" to="/reportes">
          <ChartNoAxesCombined size={25} />
          <div>
            <strong>Ver reportes</strong>
            <small>Resultados del periodo</small>
          </div>
          <ChevronRight size={17} />
        </Link>
      </div>
    </>
  );
}
