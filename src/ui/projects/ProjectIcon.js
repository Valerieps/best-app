import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { isProjectIcon, PROJECT_ICONS, projectInitial } from '../../domain/projectPage';
import { Dropdown } from '../components/Dropdown';
import { Icon } from '../components/Icon';
/** Each icon has its own tint, taken from the existing section and feedback tokens. */
const ICONS = {
    pot: { label: 'Panela', tone: 'lilac' },
    home: { label: 'Casa', tone: 'amber' },
    briefcase: { label: 'Maleta', tone: 'blue' },
    book: { label: 'Livro', tone: 'green' },
    heart: { label: 'Coração', tone: 'pink' },
    plane: { label: 'Viagem', tone: 'blue' },
    code: { label: 'Código', tone: 'lilac' },
    balloon: { label: 'Festa', tone: 'amber' },
    leaf: { label: 'Folha', tone: 'green' },
    music: { label: 'Música', tone: 'pink' },
    dumbbell: { label: 'Exercício', tone: 'blue' },
    camera: { label: 'Câmera', tone: 'amber' },
};
/** The project's icon on a tinted square, or its initial on the project lilac. */
export function ProjectIconBadge({ project, size = 'md' }) {
    const icon = isProjectIcon(project.icon) ? project.icon : null;
    return (_jsx("span", { className: `project-icon project-icon--${size} tone--${icon ? ICONS[icon].tone : 'lilac'}`, "aria-hidden": "true", children: icon ? _jsx(Icon, { name: icon, size: size === 'sm' ? 'sm' : 'lg' }) : _jsx("span", { className: "project-icon__initial", children: projectInitial(project.name) }) }));
}
/** The large icon of the project header; clicking it opens the collection. */
export function ProjectIconPicker({ project, onChange }) {
    return (_jsx(Dropdown, { label: "Trocar o \u00EDcone do projeto", align: "left", className: "icon-picker", triggerClassName: "icon-picker__trigger", trigger: _jsx(ProjectIconBadge, { project: project, size: "lg" }), children: (close) => (_jsxs("div", { className: "icon-picker__panel", children: [_jsx("span", { className: "muted", children: "\u00CDcone do projeto" }), _jsx("div", { className: "icon-picker__grid", children: PROJECT_ICONS.map((id) => (_jsx("button", { type: "button", role: "menuitemradio", "aria-checked": project.icon === id, "aria-label": ICONS[id].label, title: ICONS[id].label, className: `icon-picker__option tone--${ICONS[id].tone} ${project.icon === id ? 'icon-picker__option--on' : ''}`, onClick: () => {
                            close();
                            onChange(id);
                        }, children: _jsx(Icon, { name: id, size: "lg" }) }, id))) }), project.icon && (_jsx("button", { type: "button", className: "link", onClick: () => {
                        close();
                        onChange(null);
                    }, children: "Usar a inicial do nome" }))] })) }));
}
