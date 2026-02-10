# Agent Guidelines

- Windows dev command: `npm run dev -- --webpack` (avoid Turbopack issues).
- MVP-first, minimal changes; do not refactor design system.
- Keep desktop UI visually unchanged unless the task explicitly says otherwise.
- Prefer localStorage; telemetry is opt-in and OFF by default.
- For dark mode: ensure card surface + text contrast is readable (avoid light text on light cards).
