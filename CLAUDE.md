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
- **Tailwind CSS v4**, CSS-first config: no `tailwind.config.js`. Theme tokens live in `src/app/globals.css` via `@theme inline`; CSS is processed through the `@tailwindcss/turbopack` loader configured in `next.config.ts` (not PostCSS). Light/dark colors are CSS variables (`--background`, `--foreground`) switched by `prefers-color-scheme`.
- Fonts: Geist / Geist Mono via `next/font/google`, exposed as `--font-geist-sans` / `--font-geist-mono`.
