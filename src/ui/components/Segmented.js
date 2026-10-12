import { jsx as _jsx } from "react/jsx-runtime";
/** A row of mutually exclusive buttons, like the destinations in the checkout. */
export function Segmented({ label, options, value, onChange }) {
    return (_jsx("div", { className: "segmented", role: "radiogroup", "aria-label": label, children: options.map((option) => (_jsx("button", { type: "button", role: "radio", "aria-checked": option.value === value, className: `segmented__option ${option.value === value ? 'segmented__option--on' : ''}`, onClick: () => onChange(option.value), children: option.label }, option.value))) }));
}
