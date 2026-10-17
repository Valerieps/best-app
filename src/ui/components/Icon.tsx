/**
 * Line icons drawn inline, so nothing is downloaded (SEGURANCA.md). Paths are on a 24 × 24
 * grid, in the style of Tabler Icons (MIT).
 */
const PATHS = {
  // Interface
  chevronRight: 'M9 6l6 6l-6 6',
  chevronDown: 'M6 9l6 6l6-6',
  dots: 'M4 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0M11 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0M18 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
  star: 'M12 17.75l-6.172 3.245l1.179-6.873l-5-4.867l6.9-1l3.086-6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z',
  plus: 'M12 5v14M5 12h14',
  link: 'M9 15l6-6M11 6l.463-.536a5 5 0 0 1 7.071 7.072l-.534.464M13 18l-.397.534a5.068 5.068 0 0 1-7.127 0a4.972 4.972 0 0 1 0-7.071l.524-.463',
  notes: 'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2M9 7h6M9 11h6M9 15h4',
  users: 'M5 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85',
  pin: 'M15 4.5l-4 4l-4 1.5l-1.5 1.5l7 7l1.5-1.5l1.5-4l4-4zM9 15l-4.5 4.5M14.5 4l5.5 5.5',
  sidebar: 'M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2M15 4v16',
  close: 'M18 6l-12 12M6 6l12 12',
  alertCircle: 'M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0M12 8v4M12 16h.01',
  arrowLeft: 'M5 12h14M5 12l6 6M5 12l6-6',
  arrowUp: 'M12 5v14M18 11l-6-6M6 11l6-6',
  arrowDown: 'M12 5v14M18 13l-6 6M6 13l6 6',
  arrowRight: 'M5 12h14M13 18l6-6M13 6l6 6',
  check: 'M5 12l5 5l10-10',
  calendar: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2zM16 3v4M8 3v4M4 11h16',
  calendarOff:
    'M9 5h9a2 2 0 0 1 2 2v9M19.816 19.839a2 2 0 0 1-1.816 1.161h-12a2 2 0 0 1-2-2v-12a2 2 0 0 1 1.158-1.815M16 3v4M8 3v1M4 11h7M15 11h5M3 3l18 18',
  ban: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M5.7 5.7l12.6 12.6',
  clock: 'M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0M12 7v5l3 3',
  // Places of the sidebar
  sun: 'M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0M3 12h1M12 3v1M20 12h1M12 20v1M5.6 5.6l.7 .7M18.4 5.6l-.7 .7M17.7 17.7l.7 .7M6.3 17.7l-.7 .7',
  repeat: 'M4 12v-3a3 3 0 0 1 3-3h13M17 3l3 3l-3 3M20 12v3a3 3 0 0 1-3 3h-13M7 21l-3-3l3-3',
  folder: 'M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2',
  target: 'M11 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0M7 12a5 5 0 1 0 10 0a5 5 0 1 0-10 0M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0',
  checklist: 'M3.5 5.5l1.5 1.5l2.5-2.5M3.5 11.5l1.5 1.5l2.5-2.5M3.5 17.5l1.5 1.5l2.5-2.5M11 6h9M11 12h9M11 18h9',
  database: 'M4 6a8 3 0 1 0 16 0a8 3 0 1 0-16 0M4 6v6a8 3 0 0 0 16 0v-6M4 12v6a8 3 0 0 0 16 0v-6',
  settings:
    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543 .94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543 .826-3.31 2.37-2.37c1 .608 2.296 .07 2.572-1.065M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0',
  maximize:'M16 4h4v4M14 10l6-6M8 20h-4v-4M4 20l6-6',
  minimize: 'M5 9h4v-4M3 3l6 6M5 15h4v4M3 21l6-6M19 9h-4v-4M15 9l6-6M19 15h-4v4M15 15l6 6',
  // Text formatting (the toolbar of the day note's sections)
  bold: 'M7 5h6a3.5 3.5 0 0 1 0 7h-6zM13 12h1a3.5 3.5 0 0 1 0 7h-7v-7',
  italic: 'M11 5h6M7 19h6M14 5l-4 14',
  list: 'M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01',
  listNumbers: 'M11 6h9M11 12h9M12 18h8M4 16a2 2 0 1 1 4 0c0 .591-.5 1-1 1.5l-3 2.5h4M6 10v-6l-2 2',
  indentIncrease: 'M20 6h-11M20 12h-7M20 18h-11M4 8l4 4l-4 4',
  indentDecrease: 'M20 6h-7M20 12h-9M20 18h-7M8 8l-4 4l4 4',
  // Project icons (PROJECT_ICONS in the domain)
  pot: 'M4 11h16M6 11v6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-6M3 11h1M20 11h1M10 7c0-1 1-2 1-3M14 7c0-1 1-2 1-3',
  home: 'M5 12h-2l9-9l9 9h-2M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6',
  briefcase: 'M5 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2M8 7v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18',
  book: 'M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6v13M12 6v13M21 6v13',
  heart: 'M19.5 12.572l-7.5 7.428l-7.5-7.428a5 5 0 1 1 7.5-6.566a5 5 0 1 1 7.5 6.572',
  plane: 'M10 14l11-11M21 3l-6.5 18a.55.55 0 0 1-1 0l-3.5-7l-7-3.5a.55.55 0 0 1 0-1l18-6.5',
  code: 'M7 8l-4 4l4 4M17 8l4 4l-4 4M14 4l-4 16',
  balloon: 'M12 3a5 6 0 0 1 5 6c0 3.5-2.5 6-5 6s-5-2.5-5-6a5 6 0 0 1 5-6zM12 15l-1 2h2l-1-2M12 17v4',
  leaf: 'M5 21c.5-4.5 2.5-8 7-10M9 18c6.218 0 10.5-3.288 11-12v-2h-4.014c-9 0-11.986 4-12 9c0 1 0 3 2 5h3z',
  music: 'M3 17a3 3 0 1 0 6 0a3 3 0 0 0-6 0M13 17a3 3 0 1 0 6 0a3 3 0 0 0-6 0M9 17v-13h10v13M9 8h10',
  dumbbell:
    'M2 12h1M6 8h-2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2M6 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-10a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1M9 12h6M15 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-10a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1M18 8h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M22 12h-1',
  camera:
    'M5 7h1a2 2 0 0 0 2-2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2M9 13a3 3 0 1 0 6 0a3 3 0 0 0-6 0',
} as const;

export type IconName = keyof typeof PATHS;

/** A decorative icon; the button or text around it carries the label. */
export function Icon({ name, size = 'md', filled = false }: { name: IconName; size?: 'sm' | 'md' | 'lg'; filled?: boolean }) {
  return (
    <svg className={`icon icon--${size} ${filled ? 'icon--filled' : ''}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
