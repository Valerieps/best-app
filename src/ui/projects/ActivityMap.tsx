import type { DayKey } from '../../domain/day';
import { activityGrid, activityTotal, type ActivityByDay } from '../../domain/projectActivity';
import { activityDetail, plural } from '../format';

/**
 * Activity map, GitHub style (SPEC.md, "Projetos"): one column per week, one row per day, and
 * up to four tints of one hue. Plain elements with classes, so the UI keeps no `style` attribute;
 * the hover detail is a CSS tooltip read from `data-tip`.
 */
export function ActivityMap({ activity, today, weeks, name }: { activity: ActivityByDay; today: DayKey; weeks: number; name: string }) {
  const grid = activityGrid(activity, today, weeks);
  const activeDays = grid.flat().filter((cell) => !cell.future && activityTotal(cell.activity) > 0).length;
  return (
    <div
      className={`activity-map activity-map--${weeks}`}
      role="img"
      aria-label={`Atividade de ${name} nas últimas ${weeks} semanas: ${plural(activeDays, 'dia com atividade', 'dias com atividade')}`}
    >
      {grid.map((column, index) => (
        // Tooltips of the last columns open to the left, so they stay inside the card.
        <span key={column[0].day} className={`activity-map__week ${index >= weeks - 3 ? 'activity-map__week--end' : ''}`}>
          {column.map((cell) =>
            cell.future ? (
              <span key={cell.day} className="activity-map__day activity-map__day--future" />
            ) : (
              <span key={cell.day} className={`activity-map__day activity-map__day--${cell.level}`} data-tip={activityDetail(cell.day, cell.activity)} />
            ),
          )}
        </span>
      ))}
    </div>
  );
}

/** "menos … mais", shown once above every map. */
export function ActivityLegend() {
  return (
    <span className="activity-legend" aria-hidden="true">
      menos
      {[0, 1, 2, 3, 4].map((level) => (
        <span key={level} className={`activity-map__day activity-map__day--${level}`} />
      ))}
      mais
    </span>
  );
}
