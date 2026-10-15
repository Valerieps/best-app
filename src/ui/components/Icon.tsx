/**
 * Line icons drawn inline, so nothing is downloaded (google-safe.md). Paths are on a 24 × 24
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
  maximize: 'M16 4h4v4M14 10l6-6M8 20h-4v-4M4 20l6-6',
  minimize: 'M5 9h4v-4M3 3l6 6M5 15h4v4M3 21l6-6M19 9h-4v-4M15 9l6-6M19 15h-4v4M15 15l6 6',
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
