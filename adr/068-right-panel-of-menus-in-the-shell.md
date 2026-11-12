# ADR-068: The right panel is a strip of menus in the shell, kept in the settings

**Status:** Accepted
**Date:** 2026-11-12
**Decision:** The right panel (`spec/navegacao.md`, "Painel da direita") is `ui/RightPanel.tsx`, the last child of the `.shell` flex row, sticky at full height like the sidebar (ADR-037). It always shows a strip of icons; the open menu renders beside it, and the center (`.shell__main`, `flex: 1`) shrinks along.

- **Menus are a list.** `RIGHT_PANEL_MENUS` in `ui/rightPanelLayout.ts` names each menu, its icon and the route of its full screen. A menu renders the same component as its screen, with a flag that drops the screen header and the page frame: `ExecuteScreen` takes `inPanel`. No second copy of the screen exists.
- **Kept in the settings.** The open menu is `Settings.rightPanelMenu` (absent or null means collapsed, the default) and the dragged width is `Settings.rightPanelWidth`, saved with `setRightPanelMenu` and `setRightPanelWidth`. Both are optional, so the version does not change and they go into backups, like `sidebarCollapsed` and `sidebarWidth`. The toggle changes on screen at once and the write follows (ADR-036).
- **Never twice.** `shownRightPanelMenu` hides the menu while the route is its own screen, without changing the stored choice, so the panel opens again on the next screen. An unknown menu, from another version's backup, also shows as collapsed.
- **Shortcut.** Ctrl + Alt + B (⌘ + Option + B), matched on `event.code` as in ADR-048, toggles the first menu. Ctrl + B stays bold in the day note. The listener skips events whose default was prevented.
- **File names.** The pure logic is `rightPanelLayout.ts`, not `rightPanel.ts`: on a case-insensitive file system `./RightPanel` would resolve to `rightPanel.ts` before `RightPanel.tsx`.
**Why:** A panel inside the shell needs no router change: the center keeps the one route of the hash, and the panel reads it only to avoid repeating a screen. Rendering the screen component keeps the panel and the screen identical with no extra code, and the filters of "Executar" are already shared through this browser's storage.
**Not done here:** several columns dragged from the sidebar, which would need one route per column.
