/** Gráfico SVG de citas por día; datos reales del almacén ficticio, con descripción accesible. */
import type { Appointment } from '../../../types/domain';
import { localDate } from '../../../utils/format';

export function ActivityChart({
  appointments,
  month,
}: {
  appointments: Appointment[];
  month: string;
}) {
  const [year, monthNumber] = month.split('-').map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const counts = Array.from(
    { length: days },
    (_, index) =>
      appointments.filter(
        (appointment) =>
          localDate(appointment.scheduledAt) === `${month}-${String(index + 1).padStart(2, '0')}`,
      ).length,
  );
  const maximum = Math.max(4, ...counts);
  const width = 540;
  const left = 32;
  const plotWidth = 490;
  const baseline = 152;
  const barWidth = plotWidth / days;
  return (
    <div className="activity-chart">
      <svg
        viewBox={`0 0 ${width} 187`}
        role="img"
        aria-label={`Citas por día de ${month}. ${appointments.length} citas programadas en el periodo.`}
      >
        {[0, 1, 2, 3].map((line) => (
          <g key={line}>
            <line
              x1={left}
              y1={baseline - line * 43}
              x2={width - 8}
              y2={baseline - line * 43}
              stroke="#eee9e6"
              strokeDasharray="3 4"
            />
            <text x="20" y={baseline - line * 43 + 3} textAnchor="end" fontSize="9" fill="#a49ba0">
              {Math.round((maximum * line) / 3)}
            </text>
          </g>
        ))}
        {counts.map((count, index) => (
          <g key={index}>
            <rect
              x={left + index * barWidth + 3}
              y={baseline - (count / maximum) * 129}
              width={Math.max(3, barWidth - 6)}
              height={Math.max(count ? 3 : 0, (count / maximum) * 129)}
              rx="3"
              fill={index % 7 === 3 ? '#FF0164' : '#009D86'}
              opacity={index % 7 === 3 ? '.78' : '.83'}
            >
              <title>
                Día {index + 1}: {count} citas
              </title>
            </rect>
            {(index === 0 || (index + 1) % 5 === 0 || index === days - 1) && (
              <text
                x={left + index * barWidth + barWidth / 2}
                y="174"
                textAnchor="middle"
                fontSize="9"
                fill="#a49ba0"
              >
                {String(index + 1).padStart(2, '0')}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
