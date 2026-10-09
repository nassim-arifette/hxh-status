// A plain button: THEME_SCRIPT (app/theme.ts) handles the click and keeps
// aria-pressed current, so the toggle works on pages that ship no React
// runtime. The icon is drawn by CSS from the same selectors that pick the
// palette — a moon in dark mode that opens into a sun in light mode — so the
// server-rendered page already shows the right one.
export default function ThemeToggle({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={label}
      data-theme-toggle=""
      suppressHydrationWarning
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <mask id="theme-toggle-moon">
          <rect width="24" height="24" fill="white" />
          <circle className="theme-toggle-bite" cx="17" cy="7" r="7" fill="black" />
        </mask>
        <circle
          className="theme-toggle-core"
          cx="12"
          cy="12"
          r="8"
          fill="currentColor"
          mask="url(#theme-toggle-moon)"
        />
        <g className="theme-toggle-rays" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="1.5" x2="12" y2="3.5" />
          <line x1="12" y1="20.5" x2="12" y2="22.5" />
          <line x1="1.5" y1="12" x2="3.5" y2="12" />
          <line x1="20.5" y1="12" x2="22.5" y2="12" />
          <line x1="4.6" y1="4.6" x2="6" y2="6" />
          <line x1="18" y1="18" x2="19.4" y2="19.4" />
          <line x1="4.6" y1="19.4" x2="6" y2="18" />
          <line x1="18" y1="6" x2="19.4" y2="4.6" />
        </g>
      </svg>
    </button>
  );
}
