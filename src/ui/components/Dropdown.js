import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
/** A button that opens a small list below it. Closes on outside click and on Escape. */
export function Dropdown({ trigger, label, children, align = 'right', className = '', triggerClassName = '', onClose }) {
    const [open, setOpenState] = useState(false);
    const ref = useRef(null);
    const setOpen = (next) => {
        setOpenState(next);
        if (!next)
            onClose?.();
    };
    useEffect(() => {
        if (!open)
            return;
        const onPointer = (event) => {
            if (!ref.current?.contains(event.target))
                setOpen(false);
        };
        const onKey = (event) => event.key === 'Escape' && setOpen(false);
        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);
    return (_jsxs("div", { className: `dropdown ${className}`, ref: ref, children: [_jsx("button", { type: "button", className: `dropdown__trigger ${triggerClassName}`, "aria-haspopup": "menu", "aria-expanded": open, "aria-label": label, onClick: () => setOpen(!open), children: trigger }), open && (_jsx("div", { className: `dropdown__list dropdown__list--${align}`, role: "menu", children: children(() => setOpen(false)) }))] }));
}
export function DropdownItem({ onSelect, children, badge }) {
    return (_jsxs("button", { type: "button", role: "menuitem", className: "dropdown__item", onClick: onSelect, children: [_jsx("span", { children: children }), badge] }));
}
