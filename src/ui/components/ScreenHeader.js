import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Dropdown, DropdownItem } from './Dropdown';
/**
 * Level 2 of the navigation (SPEC.md, "Navegação"): the screen's own title and actions,
 * always in the same place right below the global bar.
 */
export function ScreenHeader({ title, primary, more = [], back, children }) {
    return (_jsxs("header", { className: "screen-header", children: [back && (_jsxs("button", { type: "button", className: "link screen-header__back", onClick: back.onSelect, children: ["\u2190 ", back.label] })), _jsxs("div", { className: "screen-header__row", children: [_jsx("div", { className: "screen-header__title", children: title }), _jsxs("div", { className: "screen-header__actions", children: [primary && (_jsx("button", { type: "button", className: "primary", onClick: primary.onSelect, children: primary.label })), more.length > 0 && (_jsx(Dropdown, { trigger: "\u22EF", label: "Mais a\u00E7\u00F5es desta tela", className: "screen-header__more", triggerClassName: "tertiary", children: (close) => more.map((action) => (_jsx(DropdownItem, { onSelect: () => {
                                        close();
                                        action.onSelect();
                                    }, children: action.label }, action.label))) }))] })] }), children && _jsx("div", { className: "screen-header__tools", children: children })] }));
}
