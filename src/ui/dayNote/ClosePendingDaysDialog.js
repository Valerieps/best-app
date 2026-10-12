import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { closePendingDays, summarizeClosePendingDays } from '../../application/checkout';
import { loadPendingTriages } from '../../application/queries';
import { listDays, plural } from '../format';
import { navigate } from '../hooks';
import { appContext, reader } from '../services';
/** "Fechar dias pendentes": applies the auto-triage to every pending day at once. */
export function ClosePendingDaysDialog({ today, onClose }) {
    const dialogRef = useRef(null);
    const [triages, setTriages] = useState(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        dialogRef.current?.showModal();
        loadPendingTriages(reader, today).then(setTriages, () => setTriages([]));
    }, [today]);
    const summary = triages ? summarizeClosePendingDays(triages) : null;
    async function confirm() {
        if (!triages)
            return;
        setBusy(true);
        try {
            await closePendingDays(appContext, triages);
        }
        finally {
            onClose();
        }
    }
    return (_jsx("dialog", { ref: dialogRef, className: "dialog", onCancel: onClose, "aria-labelledby": "close-days-title", children: summary && (_jsxs(_Fragment, { children: [_jsxs("h2", { id: "close-days-title", children: ["Fechar ", plural(summary.days.length, 'dia pendente', 'dias pendentes')] }), _jsxs("p", { className: "muted", children: [listDays(summary.days, today), ". As regras da auto-triagem s\u00E3o aplicadas a todos de uma vez."] }), _jsxs("ul", { className: "card-list", children: [summary.tasks > 0 && (_jsxs("li", { className: "card-list__item", children: [_jsx("span", { children: summary.tasks === 1
                                        ? '1 tarefa não feita volta para a lista de ativas, sem data'
                                        : `${summary.tasks} tarefas não feitas voltam para a lista de ativas, sem data` }), _jsx("span", { className: "muted", children: "contam como adiamento" })] })), summary.notesToWiki > 0 && (_jsxs("li", { className: "card-list__item", children: ["Notas de ", plural(summary.notesToWiki, 'seção vão', 'seções vão'), " para a wiki"] })), summary.whiteboards > 0 && (_jsx("li", { className: "card-list__item", children: summary.whiteboards === 1
                                ? '1 seção em quadro branco fica sem vínculo'
                                : `${summary.whiteboards} seções em quadro branco ficam sem vínculo` })), _jsx("li", { className: "card-list__item muted", children: "Nada \u00E9 apagado, arquivado ou abandonado" })] }), _jsxs("div", { className: "dialog__actions", children: [_jsx("button", { type: "button", onClick: () => {
                                onClose();
                                navigate({ name: 'checkout', day: summary.days[0] });
                            }, children: "Revisar dia a dia" }), _jsx("button", { type: "button", className: "primary", onClick: confirm, disabled: busy, children: "Fechar dias pendentes" })] })] })) }));
}
