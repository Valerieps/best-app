/**
 * How the project's side column shows when the page opens or the screen width changes
 * (rascunhos/rascunho-projeto-pagina.md): pinned, it is docked beside the tasks; on a narrow
 * screen, pinned behaves like peeking, over the content; not pinned, it stays closed.
 */
export function panelOnOpen(pinned: boolean, narrow: boolean): 'docked' | 'peek' | 'closed' {
  if (!pinned) return 'closed';
  return narrow ? 'peek' : 'docked';
}
