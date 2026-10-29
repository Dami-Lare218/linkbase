# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project state

Linkbase is a fresh `create-next-app` scaffold (single commit). There is no app logic, data layer, or test setup yet — `src/app/page.tsx` is still the default starter page.

## Commands

- `npm run dev` — dev server at http://localhost:3000 (Turbopack)
- `npm run build` — production build (also the main type-check, since there is no separate `tsc` script)
- `npm run start` — serve the production build
- `npm run lint` — ESLint 9 flat config (`eslint.config.mjs`, extends `eslint-config-next` core-web-vitals + typescript)

No test runner is configured.

## Stack and conventions

- **Next.js 16.4 / React 19.3, App Router only**, source under `src/app/`. Import alias `@/*` → `src/*`.
- **Next.js has breaking changes vs. older versions** (see AGENTS.md above). Before writing Next-specific code, check the bundled docs in `node_modules/next/dist/docs/` (`01-app/` is the relevant section) rather than relying on memory.
- `next.config.ts` enables `cacheComponents` and `partialPrefetching`. With Cache Components on, data fetching/caching follows the `"use cache"` / Suspense model — read the docs on this before adding data fetching.
- Route props use the generated global types (e.g. `LayoutProps<"/">` in `layout.tsx`, likewise `PageProps<...>`), not hand-written prop interfaces.
- **Tailwind CSS v4**, CSS-first config: no `tailwind.config.js`. Theme tokens live in `src/app/globals.css` via `@theme inline`; CSS is processed through the `@tailwindcss/turbopack` loader configured in `next.config.ts` (not PostCSS). Light/dark colors are CSS variables (`--background`, `--foreground`) switched by `prefers-color-scheme`. The design docs in `Doc/` contain legacy Tailwind v3 config examples; never add a `tailwind.config.js`. See the v4 compatibility note in `Doc/design-system.md` §0.
- Fonts: Geist / Geist Mono via `next/font/google`, exposed as `--font-geist-sans` / `--font-geist-mono`.

## Doc Convention

Project documentation lives in `Doc/`. Whenever a new file is added to `Doc/`, add it to **Project Docs** below with one line on what it covers and when to read it. Keep the list in sync if a doc is renamed or removed.

## Project Docs

- [`Doc/design-system.md`](Doc/design-system.md) — Design tokens and visual foundations (colour, typography, spacing, radii, shadows, motion) with Tailwind mappings and confidence labels. Read before choosing any colour, font, spacing or other styling value. Its Tailwind examples are legacy v3; follow its §0 "Tailwind CSS v4 compatibility" note instead, and note that its source files are not in this repo (values unverified).
- [`Doc/ui.md`](Doc/ui.md) — The 23 UI components, their states and props, the shared interaction model (hover/press/focus/disabled) and screen layout patterns. Read before building or changing any component or screen.
- [`Doc/architecture.md`](Doc/architecture.md) — Intended folder structure (`src/lib`, `src/components/ui`, `src/components/[feature]`), Server vs Client Component rules, naming conventions and open (TBD) technical decisions, separated from what exists today. Read before adding a route, component, shared module or Server Action.
