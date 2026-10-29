# Coding Standards

How Linkbase code is written. Read this before writing or reviewing any TypeScript or React code. Structure and naming are in [`architecture.md`](architecture.md). Data and auth rules are in [`database.md`](database.md) and [`auth.md`](auth.md).

> **Status:** Some of these standards are enforced by current config. Others are **intended but not enforced yet**, so follow them by hand and in review. Section 1 says which is which. Unconfigured items are marked **TBD**.

## 1. Current tooling (verified)

| Tool | Current state |
| --- | --- |
| **TypeScript** | `typescript` ^5. `tsconfig.json` has `"strict": true`, `noEmit`, `moduleResolution: "bundler"`, alias `@/*` → `./src/*`. **Note:** `allowJs: true` is also set (scaffold default). |
| **Type-check** | No separate `tsc` script. `npm run build` (`next build`) runs the type-check. |
| **ESLint** | ESLint 9 flat config in `eslint.config.mjs`: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`. Run with `npm run lint`. |
| **Prettier** | **Not installed and not configured.** No `prettier` dependency, no config file, no `format` script. |
| **Formatting today** | The scaffold uses double quotes, semicolons and 2-space indents. Match that until Prettier is added. |

What the current ESLint presets enforce (from `typescript-eslint` recommended, included by `eslint-config-next/typescript`):

- `@typescript-eslint/no-explicit-any`: **error**
- `@typescript-eslint/ban-ts-comment`: **error**. `@ts-ignore` and `@ts-nocheck` are banned outright. `@ts-expect-error` is allowed only with a description.
- `@typescript-eslint/no-unused-vars`: warn
- `import/no-anonymous-default-export`: warn

Not enforced by any current rule: import order, no default exports, function-declaration components, no `.then()`, throwing only `Error` objects.

## 2. TypeScript

- Strict mode stays on. Don't weaken `tsconfig.json`.
- **No `any`.** Use `unknown` and narrow it, or write a proper type. Lint enforces this.
- **No `@ts-ignore`.** Lint bans it. If you truly need to suppress an error, use `@ts-expect-error` with a comment explaining why. It fails once the error is gone, so it can't go stale.

  ```ts
  // @ts-expect-error: <library> types are missing <x>; remove after upgrading to <version>
  ```

- Write `.ts` / `.tsx` only. Don't add new `.js` files, even though `allowJs` is on.
- Use `import type` for type-only imports (as in `layout.tsx`).
- Type route props with the generated helpers (`PageProps<"/path">`, `LayoutProps<"/path">`). See [`architecture.md`](architecture.md) §2.

## 3. Formatting and linting

- **Prettier is the intended formatter.** Its install, config, script and editor/CI integration are **TBD**. Don't add them as part of unrelated work.
- Until then, match the existing style (§1).
- Run `npm run lint` and `npm run build` before opening a PR. Fix errors. Don't add disable comments without a reason.
- How ESLint and Prettier will be kept from conflicting (e.g. `eslint-config-prettier`): **TBD**, decided with the Prettier setup.

## 4. Imports

Order imports in three groups, with a blank line between groups:

1. **External packages:** `react`, `next/*`, `mongoose`, …
2. **Internal aliases:** `@/lib/...`, `@/components/...`
3. **Relative imports:** `./...`, `../...`

```ts
import { cache } from "react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";

import { formatHandle } from "./format-handle";
```

- Side-effect imports such as `./globals.css` stay where the file needs them (as in `layout.tsx`).
- Always use the `@/` alias for anything under `src/` outside the current feature folder, not long `../../` paths.
- **Not enforced yet.** An import-order lint rule or Prettier plugin is **TBD**.

`Button` and `formatHandle` above only show the format. They are not existing modules.

## 5. React components

- Define components with **function declarations** and **explicitly typed props**:

  ```tsx
  type IconButtonProps = {
    label: string;
    onPress: () => void;
  };

  export function IconButton({ label, onPress }: IconButtonProps) {
    // ...
  }
  ```

- Don't use `React.FC` or arrow-function components.
- Choose `type` vs `interface` for props: **TBD**. Be consistent within a file.
- Component names are PascalCase, file names are kebab-case ([`architecture.md`](architecture.md) §5).
- Server Components are the default. Add `"use client"` only when needed ([`architecture.md`](architecture.md) §3).
- **Not enforced yet** by lint.

## 6. Exports

- **Use named exports.** Avoid default exports.
- **Exception:** Next.js route files that require a default export, such as `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx` and `template.tsx`. Give that default export a name (e.g. `export default function RootLayout`). The existing lint rule warns on anonymous default exports.
- Route Handlers (`route.ts`) use named exports per HTTP method (`GET`, `POST`, …). They have no default export.
- Config files that a tool requires to default-export (e.g. `next.config.ts`, `eslint.config.mjs`) are also exceptions.
- **Not enforced yet.** A lint rule limiting default exports to route files is **TBD**.

## 7. Async code

- Use **`async` / `await`**. Don't use `.then()` / `.catch()` chains.
- Handle errors with `try` / `catch` around the `await`.
- Run independent work in parallel with `await Promise.all([...])` rather than awaiting one after another.
- Don't leave promises floating. Always `await` them or return them.
- **Not enforced yet.** Type-aware lint rules (e.g. `no-floating-promises`) are **TBD**.

## 8. Errors

- **Throw `Error` objects** (or subclasses), never strings or plain objects:

  ```ts
  throw new Error("Link not found");      // ✓
  throw "Link not found";                 // ✗
  ```

- Pass the original error as `cause` when re-throwing: `new Error("Failed to save link", { cause: err })`.
- In `catch`, the error is `unknown`. Narrow it (`err instanceof Error`) before reading `.message`.
- Don't send internal error messages or stack traces to the client. Server Actions return a typed result for expected errors and throw unexpected ones. See [`errors-and-validation.md`](errors-and-validation.md). The exact result shape is still **TBD** there.
- **Not enforced yet.** A lint rule such as `only-throw-error` is **TBD**.

## 9. Open decisions

| Decision | Status |
| --- | --- |
| Prettier install, config, `format` script | TBD |
| ESLint/Prettier conflict handling | TBD |
| Lint rule for import order | TBD |
| Lint rule restricting default exports to route files | TBD |
| Lint rules for components, `.then()` and thrown values | TBD |
| Type-aware ESLint (`recommended-type-checked`) | TBD |
| Separate `typecheck` script | TBD |
| Whether to turn off `allowJs` | TBD |
| `type` vs `interface` for props | TBD |
| Pre-commit hooks / CI checks | TBD |
| Server Action error shape | TBD (see [`errors-and-validation.md`](errors-and-validation.md) §4 and [`auth.md`](auth.md) §6) |
