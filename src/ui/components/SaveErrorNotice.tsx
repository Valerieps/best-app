import type { FocusEvent } from 'react';
import { dismissSaveErrors, holdSaveErrors, releaseSaveErrors, useSaveErrors } from '../saveErrors';

/**
 * Short notice, at the bottom of the screen, that a change was not saved. The screen already
 * went back to what is saved; this says so, and goes away by itself after a few seconds, or when
 * I close it. With the mouse over it or the focus inside it, it waits.
 */
export function SaveErrorNotice() {
  const failures = useSaveErrors();
  if (failures === 0) return null;
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) releaseSaveErrors('focus');
  };
  return (
    <div
      className="save-error"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      onMouseEnter={() => holdSaveErrors('hover')}
      onMouseLeave={() => releaseSaveErrors('hover')}
      onFocus={() => holdSaveErrors('focus')}
      onBlur={onBlur}
    >
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
