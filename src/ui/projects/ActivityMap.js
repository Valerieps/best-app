import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { activityGrid, activityTotal } from '../../domain/projectActivity';
import { activityDetail, plural } from '../format';
/**
 * Activity map, GitHub style (SPEC.md, "Projetos"): one column per week, one row per day, and
 * up to four tints of one hue. Plain elements with classes, so the UI keeps no `style` attribute;
 * the hover detail is a CSS tooltip read from `data-tip`.
 */
export function ActivityMap({ activity, today, weeks, name }) {
    const grid = activityGrid(activity, today, weeks);
    const activeDays = grid.flat().filter((cell) => !cell.future && activityTotal(cell.activity) > 0).length;
    return (_jsx("div", { className: `activity-map activity-map--${weeks}`, role: "img", "aria-label": `Atividade de ${name} nas últimas ${weeks} semanas: ${plural(activeDays, 'dia com atividade', 'dias com atividade')}`, children: grid.map((column, index) => (_jsx("span", { className: `activity-map__week ${index >= weeks - 3 ? 'activity-map__week--end' : ''}`, children: column.map((cell) => cell.future ? (_jsx("span", { className: "activity-map__day activity-map__day--future" }, cell.day)) : (_jsx("span", { className: `activity-map__day activity-map__day--${cell.level}`, "data-tip": activityDetail(cell.day, cell.activity) }, cell.day))) }, column[0].day))) }));
}
/** "menos … mais", shown once above every map. */
export function ActivityLegend() {
    return (_jsxs("span", { className: "activity-legend", "aria-hidden": "true", children: ["menos", [0, 1, 2, 3, 4].map((level) => (_jsx("span", { className: `activity-map__day activity-map__day--${level}` }, level))), "mais"] }));
}
