import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
const NOUNS = {
    blocks: { one: 'bloco', many: 'blocos', feminine: false },
    sections: { one: 'seção', many: 'seções', feminine: true },
    projects: { one: 'projeto', many: 'projetos', feminine: false },
    days: { one: 'dia', many: 'dias', feminine: false },
};
function removedLine(count, noun) {
    const deleted = noun.feminine ? 'apagada' : 'apagado';
    return count === 1
        ? `1 ${noun.one} que não existe no backup será ${deleted}`
        : `${count} ${noun.many} que não existem no backup serão ${deleted}s`;
}
function revertedLine(count, noun) {
    return count === 1
        ? `1 ${noun.one} voltará para uma versão mais antiga`
        : `${count} ${noun.many} voltarão para uma versão mais antiga`;
}
function lossLines(loss) {
    const lines = [];
    for (const name of ['blocks', 'sections', 'projects', 'days']) {
        const table = loss[name];
        if (table.removed > 0)
            lines.push(removedLine(table.removed, NOUNS[name]));
        if (table.reverted > 0)
            lines.push(revertedLine(table.reverted, NOUNS[name]));
    }
    if (loss.missingEvents === 1)
        lines.push('1 alteração feita depois deste backup será perdida');
    if (loss.missingEvents > 1)
        lines.push(`${loss.missingEvents} alterações feitas depois deste backup serão perdidas`);
    return lines;
}
function formatDate(iso) {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });
}
export function ImportDialog({ backup, loss, onConfirm, onCancel }) {
    const dialogRef = useRef(null);
    useEffect(() => {
        dialogRef.current?.showModal();
    }, []);
    return (_jsxs("dialog", { ref: dialogRef, className: "dialog", onCancel: onCancel, "aria-labelledby": "import-title", children: [_jsx("h2", { id: "import-title", children: "Importar backup" }), _jsxs("p", { children: ["Backup de ", _jsx("strong", { children: formatDate(backup.exportedAt) }), ". Importar substitui todos os dados deste navegador pelos dados do backup."] }), loss.hasLoss ? (_jsxs("div", { className: "loss-warning", role: "alert", children: [_jsx("strong", { children: "Aten\u00E7\u00E3o: esta importa\u00E7\u00E3o vai apagar dados." }), _jsx("ul", { children: lossLines(loss).map((line) => (_jsx("li", { children: line }, line))) })] })) : (_jsx("p", { className: "muted", children: "Nada ser\u00E1 perdido: o backup tem tudo o que existe hoje neste navegador." })), _jsx("p", { className: "muted", children: "Uma c\u00F3pia dos dados atuais fica guardada, e voc\u00EA pode desfazer a importa\u00E7\u00E3o depois." }), _jsxs("div", { className: "dialog__actions", children: [_jsx("button", { type: "button", onClick: onCancel, autoFocus: true, children: "Cancelar" }), _jsx("button", { type: "button", className: loss.hasLoss ? 'danger' : 'primary', onClick: onConfirm, children: loss.hasLoss ? 'Apagar e substituir' : 'Importar' })] })] }));
}
