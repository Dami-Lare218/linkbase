# Security

Security conventions for Linkbase. Read this before handling secrets or env vars, changing `next.config.ts` headers, rendering user-generated content or links, adding sign-in or link-creation flows, or writing logs and error responses.

> **Status: almost nothing here is implemented.** Section 1 lists what is actually in place. Everything else is a planned convention. Undecided details are marked **TBD**. Related: [`auth.md`](auth.md), [`data-mutations.md`](data-mutations.md), [`errors-and-validation.md`](errors-and-validation.md), [`data-fetching.md`](data-fetching.md).

Checked against the bundled Next.js 16.4.3 docs: `02-guides/content-security-policy.md`, `02-guides/data-security.md`, `02-guides/server-actions.md`, `02-guides/environment-variables.md`, `03-api-reference/05-config/01-next-config-js/headers.md`.

## 1. What is in place today (verified)

| Protection | State |
| --- | --- |
| `.env*` files Git-ignored | **Yes.** `.gitignore` has `.env*`, so `.env.local` and `.env.test` are ignored. `!.env.example` is the only exception |
| `*.pem` Git-ignored | Yes |
| Env files in repo | Only `.env.example` (placeholders). `.env.local` is created locally by each developer |
| `.env.example` | **Exists.** Lists `MONGODB_URI` and `MONGODB_URI_TEST` with placeholder values |
| Security headers / CSP | **None.** `next.config.ts` has no `headers()` and no `proxy.ts` exists |
| Authentication, authorization | None ([`auth.md`](auth.md)) |
| Rate limiting | None |
| Server Actions built-in protections | Provided by Next.js when actions are added (§7). No actions exist yet |
| Lint rule for `target="_blank"` | **Turned off.** `eslint-config-next` sets `react/jsx-no-target-blank: "off"`, so §6 is not lint-enforced |

## 2. Secrets and environment variables

- **Secrets live only in environment variables.** Never hardcode them in source, docs, tests or comments, and never commit them.
- Local secrets go in **`.env.local`**, which stays Git-ignored.
- **Only `NEXT_PUBLIC_`-prefixed variables reach the browser.** Next.js inlines them into the client bundle at build time. **Never give a secret a `NEXT_PUBLIC_` prefix.** All other variables stay server-only.
- Read secrets only in server code (Server Components, Server Actions, Route Handlers, `src/lib/` server modules).
- Production secrets are set in the hosting platform's environment, not in files. Hosting is **TBD**.
- For multi-instance or self-hosted deploys, Next.js documents `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (a stable key for Server Action closure encryption). Whether Linkbase needs it depends on hosting: **TBD**.

### `.env.example`

- A checked-in `.env.example` lists **every required variable name** with a one-line description and a placeholder value. **Never real values.**
- The `.gitignore` pattern `.env*` would also ignore `.env.example`, so `.gitignore` has a `!.env.example` exception. Don't add exceptions for any other env file.
- **Only placeholder variable names and descriptions** belong in committed templates such as `.env.example`. Never a real connection string, password, token or key, even an "old" or "test" one.
- **Decided:** `MONGODB_URI`, the development connection string, read only by `src/lib/db/connect.ts` ([`database.md`](database.md) §4), and `MONGODB_URI_TEST` (below).
- **TBD:** the remaining variable names: Auth.js secret and provider variables ([`auth.md`](auth.md) §2), the production connection string (hosting TBD), and any rate-limit or logging service. Add each one to `.env.example` when it's introduced.

### `.env.test` and `MONGODB_URI_TEST`

Established in [`testing.md`](testing.md) §4:

- **`MONGODB_URI_TEST`** holds the test database connection string. It's stored in the **local `.env.test`** file. Neither the file nor a test database exists yet.
- **`.env.test` must stay Git-ignored** because it may contain database credentials. The existing `.env*` rule in `.gitignore` already covers it. Don't add a `.gitignore` exception for it, and don't force-add it (`git add -f`). This intentionally differs from the Next.js docs, which suggest committing `.env.test`.
- If `MONGODB_URI_TEST` is listed in `.env.example`, it gets a placeholder value only.
- Test setup must fail safely, without printing the value, if the variable is missing or points to a non-test database ([`testing.md`](testing.md) §4).

### Connection strings and secrets: never exposed

Database connection strings (dev, test, production) and all other secrets must **never** appear in:
- **logs:** server logs, error logs, QA or test output ([`errors-and-validation.md`](errors-and-validation.md) §7),
- **client responses:** error messages, Server Action results, rendered pages, `NEXT_PUBLIC_` variables,
- **committed files:** source, docs, tests, templates, fixtures or commit messages.

Error messages about configuration name the variable and the problem, never its value.

## 3. Security headers

Configure headers in **`next.config.ts`** (the project's actual config file, TypeScript) using the async `headers()` function, which returns `{ source, headers: [{ key, value }] }` entries. A CSP that needs per-request nonces is instead set in **`src/proxy.ts`** (Next.js 16's renamed Middleware). Nothing is configured yet.

| Header | Purpose | Linkbase value |
| --- | --- | --- |
| `Content-Security-Policy` | Limits where scripts, styles, images, frames, etc. can load from | **TBD** (see §3.1) |
| `X-Frame-Options` | Blocks clickjacking via iframes. Next.js docs note it's **superseded by CSP `frame-ancestors`**, but it still covers older browsers | **TBD** (e.g. `DENY` vs `SAMEORIGIN`) |
| `Referrer-Policy` | Limits how much of the URL is sent to other sites. Matters for outbound links | **TBD** |

Also worth deciding (documented in the Next.js `headers` reference): `Strict-Transport-Security`, `X-Content-Type-Options`, `Permissions-Policy`, and whether to turn off the `X-Powered-By` header (`poweredByHeader`). All **TBD**.

### 3.1 Content-Security-Policy: choose and test, don't copy

**Don't paste a CSP from the docs or elsewhere.** A wrong CSP silently breaks the app. Directives must be chosen and **tested against what Linkbase actually loads**:

- **Scripts:** Next.js inline bootstrap scripts, and any third-party scripts.
- **Styles:** Tailwind v4 output, `next/font` (Geist), and any inline styles.
- **Auth flow:** the Auth.js sign-in, callback and redirect URLs, and provider domains (`form-action`, `connect-src`, `frame-src` as needed). Providers are TBD.
- **Images and other external services:** analytics, avatars, link previews, etc. None decided.
- **Dev vs prod:** development needs `'unsafe-eval'` (React debugging). Production doesn't.

**Strategy conflict to resolve first.** The Next.js docs offer three approaches. Each has trade-offs for this project:

| Approach | Trade-off for Linkbase |
| --- | --- |
| **Nonce-based** CSP (generated in `src/proxy.ts`) | Strictest, but **every page must render on each request**. The docs say it is **incompatible with Partial Prerendering / static shells**, which conflicts with `cacheComponents: true` |
| **Static CSP** in `next.config.ts` `headers()` | Keeps static rendering and caching, but needs `'unsafe-inline'` for scripts, which is weaker |
| **Subresource Integrity (hash-based)** | Keeps static generation with a stricter policy, but is **experimental** in this version |

**TBD:** CSP strategy and directives. Roll out with `Content-Security-Policy-Report-Only` first, fix violations, then enforce. The reporting endpoint is also TBD.

## 4. Rate limiting

- **Rate-limit sign-in attempts and link creation**, as a minimum.
- Apply the limit **on the server**: in the Server Action (link creation) and in the sign-in flow. Never only on the client.
- When the limit is hit, return an **expected** error result with a user-facing message ([`data-mutations.md`](data-mutations.md) §4), not a thrown error.
- **TBD:** implementation and provider/storage, limits and time windows, the key (user ID, IP, both), where the sign-in limit hooks into Auth.js, and any other actions that need limits. None are decided. **In-memory counters don't work across multiple server instances**, so the choice depends on hosting.

## 5. Untrusted user content

Treat **all user-generated text** (link titles, display names, bios, handles, URLs) as untrusted.

- **Render as text with JSX** (`{title}`). React escapes it.
- **Never use `dangerouslySetInnerHTML` with user content.** If rich text is ever needed, the sanitization approach is TBD and must be decided first.
- Never build HTML, `style`, or script strings from user input.
- Validate on input with Zod ([`errors-and-validation.md`](errors-and-validation.md) §3) **and** render safely on output. Validation alone isn't enough.

### URLs used as outbound links

Validate before saving and before rendering as `href`:

- **Parse it as a URL.** Reject anything that doesn't parse.
- **Allow only `http:` and `https:`.** Reject `javascript:`, `data:`, `vbscript:`, `file:` and others. A `javascript:` href runs code when clicked.
- Re-check at render time if the data could have bypassed validation (e.g. older records).
- **TBD:** whether `http:` is allowed or only `https:`, max length, and handling of internationalized/punycode domains.

## 6. Outbound links

- Links opening in a new tab **must** use `target="_blank"` **with** `rel="noopener noreferrer"`:

  ```tsx
  <a href={safeUrl} target="_blank" rel="noopener noreferrer">{title}</a>
  ```

- `noopener` stops the opened page controlling Linkbase through `window.opener`. `noreferrer` stops the Linkbase URL being sent to the destination.
- Use `next/link` for internal navigation, and a plain `<a>` for external user links.
- **Not lint-enforced:** `react/jsx-no-target-blank` is turned off by `eslint-config-next`. Check in review. Re-enabling the rule is **TBD**.

## 7. Authentication, authorization, ownership

Summary. Details are in [`auth.md`](auth.md) and [`data-mutations.md`](data-mutations.md).

- **Every check happens on the server.** UI checks only hide things. They protect nothing.
- **Never trust client-supplied user IDs, roles or permissions**, from forms, arguments, URLs, cookies you didn't verify, or hidden fields. `userId` comes only from the verified session.
- Every Server Action checks the session and ownership itself. Server Actions are reachable by direct POST, whatever page calls them.
- Every private query and write is filtered by `userId`. Another user's document is "not found".
- Proxy checks are optimistic only, never the security boundary.

Next.js provides built-in protections for Server Actions:
- An **Origin vs Host CSRF check**. Configure `serverActions.allowedOrigins` only if a proxy or CDN domain requires it (TBD).
- **Encrypted action IDs** and removal of unused actions.
- **Encrypted closure variables.**

These don't replace auth checks. Auth.js provides its own CSRF protection for its routes.

## 8. Logs and client responses

- **Never expose** secrets, raw internal errors, stack traces or sensitive user data to the client ([`errors-and-validation.md`](errors-and-validation.md) §6).
- **Never log** passwords, tokens, session cookies, secrets, connection strings (including `MONGODB_URI_TEST`), env var values, raw request bodies, emails or other personal data ([`errors-and-validation.md`](errors-and-validation.md) §7).
- Public pages return only approved public fields ([`data-fetching.md`](data-fetching.md) §4).
- Cache keys and tags are plain text. Never put secrets or personal data in them ([`data-fetching.md`](data-fetching.md) §5).

## 9. Open decisions

| Decision | Status |
| --- | --- |
| Env variable names and `.env.example` contents | TBD, except `MONGODB_URI_TEST` (decided, in `.env.test`, see [`testing.md`](testing.md)) |
| `.gitignore` exception for `.env.example` | TBD (needed when the file is created) |
| Hosting, and need for `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | TBD |
| CSP strategy (nonce / static / SRI) and directives | TBD |
| CSP report-only rollout and reporting endpoint | TBD |
| `X-Frame-Options` and `Referrer-Policy` values | TBD |
| HSTS, `X-Content-Type-Options`, `Permissions-Policy`, `poweredByHeader` | TBD |
| Rate-limit implementation, provider, limits, keys | TBD |
| Allowed URL schemes (`https` only?), length limits | TBD |
| Re-enabling `react/jsx-no-target-blank` | TBD |
| `serverActions.allowedOrigins` | TBD |
| Rich text / HTML sanitization (if ever needed) | TBD |
