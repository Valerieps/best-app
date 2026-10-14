import { dismissSaveErrors, useSaveErrors } from '../saveErrors';

/**
 * Short notice, at the bottom of the screen, that a change was not saved. The screen already
 * went back to what is saved; this says so, until I close it.
 */
export function SaveErrorNotice() {
  const failures = useSaveErrors();
  if (failures === 0) return null;
  return (
    <div className="save-error" role="alert">
      <span>
        {failures === 1 ? 'Uma mudança não foi salva.' : `${failures} mudanças não foram salvas.`} A tela mostra o que está salvo;
        tente de novo.
      </span>
      <button type="button" className="link" onClick={dismissSaveErrors}>
        Fechar
      </button>
    </div>
  );
}
