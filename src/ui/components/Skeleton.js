import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Gray lines that stand in for content while a query runs. They fade in only after a short wait. */
export function SkeletonLines({ count = 5 }) {
    return (_jsxs("div", { className: "skeleton", role: "status", children: [_jsx("span", { className: "visually-hidden", children: "Carregando\u2026" }), Array.from({ length: count }, (_, index) => (_jsx("span", { className: "skeleton__line", "aria-hidden": "true" }, index)))] }));
}
/** A screen still loading: the title shows at once, so the screen never opens blank. */
export function LoadingPage({ title, before, lines }) {
    return (_jsxs("main", { className: "page", "aria-busy": "true", children: [before, title && _jsx("h1", { className: "page__title", children: title }), _jsx(SkeletonLines, { count: lines })] }));
}
