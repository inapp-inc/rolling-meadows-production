const SVG_PROPS = {
  className: 'ui-icon',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  'aria-hidden': true,
} as const;

export function SaveIcon() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg {...SVG_PROPS}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg {...SVG_PROPS}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
