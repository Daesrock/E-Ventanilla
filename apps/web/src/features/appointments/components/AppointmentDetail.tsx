/** Detalle de cita ficticia y acciones explícitamente simuladas, validadas por sede. */
import type { Appointment, AppointmentStatus } from '../../../types/domain';
import { useDemo } from '../../../app/providers/demo-context';
import { useToast } from '../../../hooks/useToast';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { dateLabel, timeLabel } from '../../../utils/format';
import { statusLabels, statusTones } from '../appointment.config';

export function AppointmentDetail({
  appointment,
  onDone,
}: {
  appointment: Appointment;
  onDone: () => void;
}) {
  const { db, execute } = useDemo();
  const notify = useToast();
  const change = (status: AppointmentStatus) => {
    try {
      execute({ type: 'appointment-status', appointmentId: appointment.id, status });
      notify('Estado de cita actualizado únicamente en la demostración.');
      onDone();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo actualizar.', 'error');
    }
  };
  return (
    <>
      <div className="flex justify-between items-center mb-5">
        <strong>{appointment.folio}</strong>
        <Badge tone={statusTones[appointment.status]}>{statusLabels[appointment.status]}</Badge>
      </div>
      <dl className="detail-list">
        <div>
          <dt>CIUDADANO FICTICIO</dt>
          <dd>{appointment.citizenName}</dd>
        </div>
        <div>
          <dt>SEDE</dt>
          <dd>{db.branches.find((branch) => branch.id === appointment.branchId)?.name}</dd>
        </div>
        <div>
          <dt>TRÁMITE</dt>
          <dd>
            {db.procedures.find((procedure) => procedure.id === appointment.procedureId)?.name}
          </dd>
        </div>
        <div>
          <dt>FECHA PROGRAMADA</dt>
          <dd>
            {dateLabel(appointment.scheduledAt)} · {timeLabel(appointment.scheduledAt)} h
          </dd>
        </div>
        {appointment.arrivedAt && (
          <div>
            <dt>ATENCIÓN REGISTRADA</dt>
            <dd>
              Llegada: {timeLabel(appointment.arrivedAt)} · Inicio:{' '}
              {appointment.startedAt ? timeLabel(appointment.startedAt) : 'pendiente'} · Fin:{' '}
              {appointment.endedAt ? timeLabel(appointment.endedAt) : 'pendiente'}
            </dd>
          </div>
        )}
        {appointment.finalStatus && (
          <div>
            <dt>RESULTADO</dt>
            <dd>{appointment.finalStatus}</dd>
          </div>
        )}
      </dl>
      {appointment.status === 'SCHEDULED' && (
        <>
          <p className="muted text-xs mt-4">Acciones de demostración.</p>
          <div className="form-actions">
            <Button variant="danger" onClick={() => change('CANCELLED')}>
              Cancelar cita
            </Button>
            <Button variant="secondary" onClick={() => change('NO_SHOW')}>
              Simular inasistencia
            </Button>
            <Button onClick={() => change('ATTENDED')}>Simular atención</Button>
          </div>
        </>
      )}
    </>
  );
}
