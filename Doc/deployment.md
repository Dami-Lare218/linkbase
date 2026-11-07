# Deployment

How Linkbase gets from a feature branch to production: GitHub pull requests, GitHub Actions checks, a Docker build, Vercel preview and production deployments, and the MongoDB Atlas production database. Read this before changing CI, Vercel settings, the Dockerfile, production env vars or the production database, or releasing to production.

> **Status: repository side implemented, dashboards not yet configured.** The Dockerfile, `.dockerignore`, the three GitHub Actions workflows and the `typecheck` script exist and were validated locally on 2026-11-06 (§11). They have **not yet run on GitHub**, and **no Vercel project, Vercel env var, production database, Atlas rule or branch protection has been set up or verified**. Those manual steps are in §10. Items marked **TBD** are undecided.
>
> Related: [`git-conventions.md`](git-conventions.md) (branches, PRs, reviews), [`security.md`](security.md) (secrets, env vars, headers), [`database.md`](database.md) (connection, dev vs QA target), [`testing.md`](testing.md) (Vitest, QA, test database), [`auth.md`](auth.md) (`AUTH_SECRET`, sessions).
>
> **Sources:** the repository, and the bundled Next.js 16.4.3 docs (`01-getting-started/17-deploying.md`, `02-guides/self-hosting.md`, `02-guides/environment-variables.md`, `02-guides/building.md`, `03-api-reference/05-config/01-next-config-js/output.md`, `03-api-reference/06-cli/next.md`). Context7 was unavailable (connection timed out), so the bundled docs were the fallback. GitHub Action inputs were read from each pinned action's `action.yml`. Vercel, GitHub and MongoDB Atlas dashboard behaviour is from their standard product behaviour and **must be confirmed in the dashboards** during setup.

## 1. What exists today (verified)

| Item | State |
| --- | --- |
| Hosting target | **Vercel**, through Vercel's GitHub integration. A Vercel project `linkbase` exists, with the Blob store `linkbase-profile-images` connected to **Production and Preview** (`BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_ID`, `BLOB_WEBHOOK_PUBLIC_KEY`), as reported by the user on 2026-11-07. Not verifiable from this machine (no `.vercel/`, no Vercel CLI); the GitHub connection, other env vars and deployments are unverified |
| GitHub remote | `origin` → `https://github.com/Dami-Lare218/linkbase.git`, default branch `main` |
| GitHub Actions | **Exist:** `.github/workflows/pr-checks.yml`, `main-checks.yml` and the shared `quality-checks.yml` (§8). Validated with `actionlint`; **not yet run on GitHub** |
| Dockerfile / `.dockerignore` | **Exist** at the repo root (§5). Image built and started locally (§11) |
| `output: "standalone"` | **Only for Docker builds:** `next.config.ts` sets it when `LINKBASE_STANDALONE_BUILD=1`, which only the Dockerfile sets. Vercel and local builds keep the default output (§5.2) |
| `vercel.json` | **None.** Not needed: Vercel detects Next.js and the defaults are what Linkbase wants |
| `public/` folder | **None.** The Dockerfile handles it either way (§5.2) |
| Package manager | npm, committed `package-lock.json`, `npm ci` in Docker and CI |
| Node.js | **24** in the Dockerfile (`ARG NODE_VERSION=24`) and CI (`NODE_VERSION: "24"`). Next.js 16.4.3 requires `>=20.9.0`. `package.json` has no `engines` field, so Vercel's Node version is a dashboard setting (§10.1) |
| Quality scripts | `npm run lint`, `npm run typecheck` (**new**), `npm run test`, `npm run build` |
| Env var names | App: `MONGODB_URI`, `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`. QA only: `MONGODB_URI_TEST`, `BLOB_READ_WRITE_TOKEN_TEST`, `LINKBASE_DB_TARGET` (set by `npm run qa:server`). Self-hosting only: `AUTH_TRUST_HOST`. Docker build only: `LINKBASE_STANDALONE_BUILD` (not a secret). All but the last two runtime-only flags are listed in `.env.example` with placeholders |
| Env files | `.env.local` and `.env.test` are local and Git-ignored (`.env*`); only `.env.example` is committed. All are excluded from the Docker build context |
| Database users | **Development:** `linkbase_dev`, verified 2026-11-07 to read `linkbase` and be **denied** `linkbase_test`. **QA:** `.env.test` still uses the old shared user, whose login now fails (`bad auth`), so QA can't reach `linkbase_test` until a QA user exists (§10.3) |
| Production database | **Not created / unverified** |
| Build-time database access | **None.** `/user/[handle]`'s `generateStaticParams` returns a sample handle that fails validation, so `next build` never queries MongoDB. Confirmed: the Docker build runs with no env vars at all and succeeds (§11) |

## 2. Overview

### 2.1 Architecture

```
 Developer                    GitHub                                Vercel                    MongoDB Atlas
 ─────────                    ──────                                ──────                    ─────────────
 feat/<name> ──push──► Pull request ──► GitHub Actions: PR checks   Preview deployment ──────► preview database
                            │           (lint, typecheck, test,     (unique URL per push)      (never production)
                            │            build, Docker build)
                            │                 │ required checks
                            ▼                 ▼
                     Human review + approval ──► merge to main ──► Production deployment ──► production database
                                                    │               (production domain)
                                                    └──► GitHub Actions: main checks
                                                                          │
                                                                          └──► Vercel Blob (production store)
```

- **GitHub** holds the code and is the gate: every change reaches `main` through a reviewed pull request ([`git-conventions.md`](git-conventions.md) §5–§6).
- **GitHub Actions** runs the quality checks on pull requests and on `main`. It **only verifies; it never deploys** and holds no Vercel or database credentials.
- **Docker** builds and starts the app in a clean, pinned Linux + Node 24 image, as a CI check. Vercel does **not** use the image (§5).
- **Vercel** (native GitHub integration) builds and hosts the app: a **Preview Deployment** for every pushed branch / pull request, and a **Production Deployment** for every commit on `main`.
- **MongoDB Atlas** stores the data, with a separate database and database user per environment (§7).
- **Vercel Blob** stores profile pictures, with a separate store per environment (§6).

### 2.2 Who does what

| Step | Done by | Configured in |
| --- | --- | --- |
| Run lint, typecheck, unit tests, `next build` on a PR / on `main` | **GitHub Actions** | `.github/workflows/*.yml` (in the repo) |
| Build the Docker image and check the home page responds | **GitHub Actions** | `quality-checks.yml` + `Dockerfile` |
| Block merging until checks pass and a human approves | **GitHub branch protection** | GitHub settings (**manual, §10.2**) |
| Build and deploy a Preview for each pushed branch / PR, post its URL on the PR | **Vercel** | Vercel project (**manual, §10.1**) |
| Build and deploy `main` to Production | **Vercel** | Vercel project (**manual, §10.1**) |
| Inject runtime secrets (`MONGODB_URI`, `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`) | **Vercel** | Vercel env vars (**manual, §10.1**) |

**Why native integration and no Vercel CLI:** Vercel's GitHub integration already deploys previews and production from Git, so a second deploy path from Actions (`vercel deploy` with a `VERCEL_TOKEN`) would only add a powerful secret to GitHub and a second way to ship. Nothing in the repo needs it.

**Consequence to know:** Vercel and GitHub Actions run **in parallel**. Vercel doesn't wait for CI by default, so a commit on `main` deploys even if its main checks later fail. The real gate is **branch protection on the PR** (§10.2): code that fails checks can't be merged. For an extra guard, Vercel can be told to wait for the GitHub checks before promoting a production deployment (§10.1, recommended).

## 3. Workflow 1: feature branch → Preview

1. **Branch** from an up-to-date `main`, named `<type>/<short-description>` ([`git-conventions.md`](git-conventions.md) §2).
2. **Check locally:** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`. Run QA with the `run-qa-suite` skill when the feature needs it ([`testing.md`](testing.md)).
3. **Push and open a PR into `main`.**
4. **GitHub Actions** (`pr-checks.yml`) runs on the PR's `opened`, `synchronize` (new push) and `reopened` events and reports two checks: **Quality / Lint, typecheck, test, build** and **Quality / Docker image build**. A newer push to the same PR cancels the run still checking the older commit.
5. **Vercel** builds a Preview Deployment of the branch at the same time, using the **Preview** environment variables, and posts the URL on the PR. Every push makes a new preview with its own URL.
6. **Test the preview independently:** sign up with a throwaway account and try the change end to end. Reviewers can use the same URL. The preview talks to the **preview** database and Blob store only (§6–§7). Keep Vercel Deployment Protection on so previews aren't public (§10.1).
7. **Fix and push again** until both checks are green and the preview behaves.
8. **A human reviews and approves.** Claude Code never approves or merges ([`git-conventions.md`](git-conventions.md) §6).

**Pull requests from forks:** `pr-checks.yml` uses the `pull_request` event (never `pull_request_target`), so fork PRs run with a read-only token and no secrets. The workflows use no secrets anyway. Whether Vercel builds previews for fork PRs is a Vercel project setting; by default it asks for authorization first. Leave that on.

**Auth on previews:** Auth.js works out its URL from the request host, so no `AUTH_URL` or `AUTH_TRUST_HOST` is needed on Vercel. Confirm on the first preview sign-in.

## 4. Workflow 2: merge to `main` → Production

1. The PR has passing required checks and at least one human approval (§10.2).
2. A human merges it. Nobody pushes to `main` directly.
3. **GitHub Actions** (`main-checks.yml`) runs the same checks on the merged commit. Every commit on `main` gets its own run (concurrency group per commit SHA, never cancelled), so no commit is left without a result. A failure shows as a red ✗ on the commit in GitHub and fails the workflow run.
4. **Vercel** builds `main` with the **Production** environment variables and moves the production domain to it once its build succeeds. A failed Vercel build leaves the previous production deployment live.
5. **Smoke-test production** (§9.6).
6. **If something is wrong:** use Vercel **Instant Rollback** to the previous production deployment, then fix forward with a new PR. If main checks fail after a merge, treat it the same way. A rollback reverts code only, not database changes (§9.6).

## 5. Docker build

### 5.1 Purpose

Vercel doesn't run Docker images for Linkbase; it builds from source. The Docker image is still worth building on every PR:

- **Consistent build environment:** a pinned Linux image (`node:24-bookworm-slim`) and `npm ci` from the lockfile, so every machine and CI build the same way. It catches what a Windows dev machine hides: case-sensitive imports, Linux native packages (`sharp`), files that only exist locally, or a build that silently relies on `.env.local`.
- **Proves the build needs no secrets or database:** the build context contains no env files, and the build succeeds.
- **Portability:** the Next.js docs list Docker as supporting all Next.js features, so the image is the deployable artifact if Linkbase ever leaves Vercel.

Local development stays on `npm run dev`.

### 5.2 How it works

**`next.config.ts`:**

```ts
output: process.env.LINKBASE_STANDALONE_BUILD === "1" ? "standalone" : undefined,
```

`standalone` makes `next build` write `.next/standalone/`: a minimal `server.js` plus only the files and `node_modules` the server needs (output file tracing). It's switched on **only** by this build-time flag, which only the Dockerfile sets, so Vercel builds and local builds are exactly as before (and Windows avoids standalone's symlink requirements). The flag is not a secret.

**`Dockerfile`** (multi-stage, all stages from `node:${NODE_VERSION}-bookworm-slim`, `NODE_VERSION=24`, `NEXT_TELEMETRY_DISABLED=1`):

| Stage | Does | Ends up in the final image? |
| --- | --- | --- |
| `deps` | Copies `package.json` + `package-lock.json`, runs `npm ci` (with a BuildKit npm cache mount) | No |
| `builder` | Copies `node_modules` and the source, sets `LINKBASE_STANDALONE_BUILD=1`, creates `public/` if missing, runs `npm run build` | No |
| `runner` | Fresh image. `NODE_ENV=production`, `PORT=3000`, `HOSTNAME=0.0.0.0`. Copies `.next/standalone/`, `.next/static/` → `.next/static`, `public/`. Runs as the image's built-in non-root **`node`** user | **Yes** |

- **Static assets:** standalone output doesn't include `.next/static` or `public/`; the runner copies both next to `server.js`, which then serves them (Next.js `output` docs). `public/` doesn't exist yet, so the builder creates an empty one; when it's added it's copied automatically.
- **Non-root and read-only app files:** app files stay owned by root; only `.next/cache` (Next.js runtime cache) is writable by `node`.
- **Port and host:** listens on `0.0.0.0:3000` so it's reachable from outside the container. Override with `-e PORT=…`.
- **Healthcheck:** `HEALTHCHECK` fetches `/` with Node's built-in `fetch` (no curl in the slim image).
- **No secrets in layers:** no `ARG`s or `ENV`s hold secrets; `.dockerignore` keeps env files out of the context.

**`.dockerignore`** is an **allowlist**: everything is ignored except `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `src/` and `public/`, and then `**/.env*` and `**/*.pem` are excluded again. So `.env.local`, `.env.test`, `.git`, `.next`, `node_modules`, `.claude`, `.playwright-mcp`, `plans/`, `scripts/` and docs never reach the build. If a new top-level file is needed by the build (for example a `postcss.config.*`), add it to the allowlist.

**Run locally:**

```bash
docker build -t linkbase .
docker run --rm -p 3000:3000 --env-file <path outside the repo> linkbase
```

The env file must hold `MONGODB_URI`, `AUTH_SECRET` and `BLOB_READ_WRITE_TOKEN` for a **non-production** database and Blob store. Without them the home page still renders (no database or session needed), but sign-in and data pages fail. **Outside Vercel, Auth.js also needs to trust the host:** set `AUTH_TRUST_HOST=true` when the container sits behind a reverse proxy that sets the `Host` header, or set `AUTH_URL` to the public URL. Without either, Auth.js logs `UntrustedHost` errors and sessions don't work (seen in the local container check, §11). This is deliberately **not** baked into the image, because trusting the host is only safe behind a proxy you control.

**If ever self-hosted on several instances** (not planned): the Next.js self-hosting guide also requires a shared `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, a `deploymentId` and a shared cache ([`security.md`](security.md) §2).

**Base image updates:** the tag `node:24-bookworm-slim` follows Node 24 and Debian 12 patch releases, so rebuilds pick up security fixes. It isn't pinned by digest; adding Dependabot for Docker and Actions to pin and update digests/SHAs is **TBD**.

## 6. Environment variables and secrets

### 6.1 Rules (apply everywhere)

- **No real values in Git**: not in source, docs, tests, workflows, the Dockerfile, commit messages or PR text. `.env.example` has names and placeholders only ([`security.md`](security.md) §2).
- **Server-only.** No Linkbase variable uses `NEXT_PUBLIC_`; secrets must never get it (such values are inlined into the browser bundle at build time).
- **Different values per environment:** development, QA, Preview and Production each get their own `AUTH_SECRET`, database + database user, and Blob store.
- **Errors name the variable, never the value** (`database-target.ts`, `connect.ts`).
- **Rotate** any secret that may have been exposed. Rotating `AUTH_SECRET` signs everyone out.

### 6.2 Environment matrix

| Variable | Development (`.env.local`) | QA (`.env.test`) | Vercel **Preview** | Vercel **Production** | GitHub Actions |
| --- | --- | --- | --- | --- | --- |
| `MONGODB_URI` | Dev Atlas database | — (QA uses `MONGODB_URI_TEST`) | Preview database | Production database | **Not set** |
| `AUTH_SECRET` | Dev value | Same as dev (local QA server) | Own preview value | Own production value | **Not set** |
| `BLOB_READ_WRITE_TOKEN` | Dev Blob store | — (QA passes `BLOB_READ_WRITE_TOKEN_TEST` in its place) | Preview Blob store | Production Blob store | **Not set** |
| `MONGODB_URI_TEST` | — | `linkbase_test` | **Never** | **Never** | Not set |
| `BLOB_READ_WRITE_TOKEN_TEST` | — | Separate QA Blob store | **Never** | **Never** | Not set |
| `LINKBASE_DB_TARGET` | Unset | `test`, set by `npm run qa:server` only | **Unset** | **Unset** (the app refuses `test` in production) | Unset |
| `AUTH_TRUST_HOST` | Unset | Unset | Unset (not needed on Vercel) | Unset | Unset |
| `LINKBASE_STANDALONE_BUILD` | Unset | Unset | **Unset** | **Unset** | Set only inside the Docker build |

### 6.3 GitHub Actions: no secrets

The workflows use **no GitHub secrets or variables**. Lint, typecheck, unit tests (no database or network; Blob tests are mocked), `next build` and the Docker build all run without credentials, and the Docker smoke test starts the container with no env vars and only loads the home page. With no `MONGODB_URI` anywhere in CI, **CI cannot connect to any database, production included.** Keep it that way. If a future check truly needs a database, use the isolated test database (`MONGODB_URI_TEST`, `_test` checks) through a GitHub **Environment** secret, never `MONGODB_URI` and never production.

### 6.4 Vercel

- **Project → Settings → Environment Variables.** Add each variable separately for **Production** and **Preview** with different values (§10.1). Mark them **Sensitive**.
- Don't add any variable to the **Development** scope unless you use `vercel env pull`. That command can overwrite `.env.local` and adds `VERCEL_OIDC_TOKEN` / `BLOB_STORE_ID`; `avatar-storage.ts` always passes `BLOB_READ_WRITE_TOKEN` explicitly so those can't redirect uploads ([`security.md`](security.md) §5.1). Never pull Production values to a laptop.
- **Blob:** create separate stores for Preview and Production and connect each only to its own scope.

## 7. MongoDB Atlas production configuration (manual, not done)

### 7.1 Database and users

- **Own database for production**, e.g. `linkbase_prod` (name **TBD**), separate from dev, `linkbase_test` and preview. Recommended: its **own Atlas project or cluster**, so dev/test credentials and network rules can't reach it.
- **One database user per environment**, with the built-in **`readWrite` role on that one database only**. Never `atlasAdmin`, `readWriteAnyDatabase`, or a user shared with development or QA.
- Long autogenerated passwords; URL-encode special characters.
- **Indexes:** Mongoose `autoIndex` is on; keeping it on in production is **TBD** ([`database.md`](database.md) §6).
- **Backups:** turn on backups/snapshots for the production cluster and test a restore (tier dependent, **TBD**).

### 7.2 Connection string

- Goes **only** into Vercel's **Production** `MONGODB_URI` (Sensitive). Never in `.env.local`, `.env.example`, GitHub, the Docker image, chat or tickets.
- Use the `mongodb+srv://…/<database>?retryWrites=true&w=majority` form with the **database name in the path**.
- No code change is needed: `connectToDatabase()` reads `MONGODB_URI` when `LINKBASE_DB_TARGET` is unset, reuses the cached connection across warm invocations, fails fast, and keeps the string out of errors ([`database.md`](database.md) §4). Pool tuning for serverless is **TBD**.

### 7.3 Network access

- **Development:** your own IP(s) only.
- **Vercel:** standard Vercel functions have no fixed outbound IPs. Options, most secure first: (1) **Vercel static IPs / Secure Compute** (paid) or **Atlas private endpoints**, allow-listing only those; (2) **`0.0.0.0/0`**, common for Vercel + Atlas, acceptable **only** with TLS (default with `mongodb+srv`), a strong unique password, a `readWrite` user scoped to the production database, and production in its own project/cluster so the open rule exposes nothing else. **TBD:** record the choice here.
- Atlas alerts on, and two-factor authentication for every Atlas account.

## 8. Required quality checks

### 8.1 The checks

| Check | Command | Where it runs |
| --- | --- | --- |
| Install | `npm ci --no-audit --no-fund` | CI, Docker |
| Lint | `npm run lint` (ESLint 9, `eslint-config-next` core-web-vitals + typescript) | Local, CI |
| Typecheck | `npm run typecheck` = `next typegen && tsc --noEmit --incremental false` | Local, CI |
| Unit tests | `npm run test` (`vitest run`, no database or network) | Local, CI |
| Build | `npm run build` (`next build`, also type-checks) | Local, CI, Docker (standalone) |
| Docker | `docker build` + start the container + `GET /` must return 2xx within 60 s | CI (and locally when Docker is available) |

**Typecheck details:** on a fresh checkout `next-env.d.ts` and `.next/types` (route types such as `PageProps`) don't exist, because they're Git-ignored. `next typegen` generates them (into `.next/types` and `next-env.d.ts` only, both Git-ignored, no application files touched), then `tsc --noEmit` checks every file in `tsconfig.json`, tests included. `--incremental false` stops `tsc` writing `tsconfig.tsbuildinfo`. This is a separate, faster report than `next build`'s type check; it doesn't replace it.

**Not in CI:** Playwright QA ([`testing.md`](testing.md) §3). It needs the test database, a Blob store and the Playwright MCP, so it stays a local pre-PR step (`run-qa-suite`). Moving it to CI is **TBD**.

### 8.2 The workflows

| File | Trigger | Concurrency | Does |
| --- | --- | --- | --- |
| `.github/workflows/pr-checks.yml` | `pull_request` into `main` (`opened`, `synchronize`, `reopened`) | `pr-checks-<PR number>`, **cancels** older runs on the same PR | Calls `quality-checks.yml` |
| `.github/workflows/main-checks.yml` | `push` to `main` (i.e. merges) | `main-checks-<commit SHA>`, **never cancels** | Calls `quality-checks.yml` |
| `.github/workflows/quality-checks.yml` | `workflow_call` only (reusable) | — | The two jobs below |

Jobs in `quality-checks.yml` (both `ubuntu-24.04`, 20-minute timeout, run in parallel):

- **`Lint, typecheck, test, build`:** checkout → Node 24 with npm cache → `npm ci` → lint → typecheck → unit tests → build. If `npm ci` succeeds, the four checks each run **even if an earlier one failed**, so one run lists every failure; the job still fails if any does.
- **`Docker image build`:** checkout → `docker build` → run the container with no env vars → poll `http://127.0.0.1:3000/` for up to 60 s. On failure it prints an `::error::` annotation and the container logs (which contain no secrets: there are none in the container). The container is always removed.

**Security settings:**
- `permissions: contents: read` at the top of every workflow (the `GITHUB_TOKEN` can only read the repo).
- `actions/checkout` with `persist-credentials: false`, so the token isn't left in `.git/config` for later steps.
- Third-party actions **pinned to full commit SHAs**, with the version in a comment: `actions/checkout` v7.0.1, `actions/setup-node` v7.1.0. No other actions are used (Docker runs with the runner's own CLI).
- No secrets, `pull_request` (not `pull_request_target`), no deploy tokens.
- `NEXT_TELEMETRY_DISABLED=1`.

**Required status-check names** (for branch protection, §10.2), as GitHub shows checks from a reusable workflow: `Quality / Lint, typecheck, test, build` and `Quality / Docker image build`. Confirm the exact names in the branch protection picker after the first run. If a job or workflow is renamed, update branch protection too, or merges will wait for a check that never comes.

**Updating pinned versions:** Node is set in two places (`Dockerfile` `ARG NODE_VERSION`, `quality-checks.yml` `NODE_VERSION`) and Vercel's dashboard; change all three together. To update an action, replace the SHA with the new release's commit SHA and update the comment.

## 9. Security and reliability best practices

### 9.1 Secret protection
- Secrets live only in Vercel (Preview/Production scopes) and local Git-ignored env files. GitHub Actions has none (§6.3).
- Turn on **GitHub secret scanning and push protection** (**manual, §10.2**).
- Never paste secrets into PRs, issues, chat, screenshots or Claude Code prompts. If one leaks, rotate first, then clean up.
- The Docker image and its build have no secrets (§5.2).

### 9.2 Least privilege
- Atlas: one `readWrite` user per database per environment (§7.1).
- Vercel: only owners edit Production env vars and domains.
- GitHub Actions: `contents: read`, no tokens or secrets.
- Docker: runs as non-root `node`, app files read-only.
- Two-factor authentication on GitHub, Vercel and Atlas.

### 9.3 Protected `main`
Branch protection (or a ruleset) on `main` is the main gate, because Vercel deploys whatever lands on `main`. Settings in §10.2.

### 9.4 Pull request reviews
- A human reviews the diff **and** tries the preview before approving.
- Claude Code may open PRs when asked, but never approves or merges ([`git-conventions.md`](git-conventions.md) §6).

### 9.5 Deployment isolation
- Previews and production never share a database, database user, Blob store or `AUTH_SECRET` (§6.2).
- QA stays on `linkbase_test` with its fail-safe checks; `MONGODB_URI_TEST` and `BLOB_READ_WRITE_TOKEN_TEST` are never added to Vercel.
- Preview deployments stay behind Vercel Deployment Protection.

### 9.6 Safe production releases
- Ship only what passed CI, review and a preview check.
- **Smoke test** after each production deploy: `/`, sign up, sign in, `/dashboard` (add/edit/toggle a link), a public `/user/<handle>`, a profile picture upload and removal, sign out.
- **Rollback:** Vercel Instant Rollback. It reverts code only, so database changes must be backward compatible (add fields before using them; remove old ones in a later release).
- Watch Vercel runtime logs and Atlas alerts after a release. Logs never contain secrets or personal data ([`security.md`](security.md) §8).
- Before the first public launch, also resolve [`security.md`](security.md)'s open items: security headers / CSP (none configured) and session revocation (§7.1 there).

## 10. Manual setup still required (not done)

None of this has been configured or verified. Do it in the dashboards, then update this section.

### 10.1 Vercel

1. **Import the repo:** Vercel → Add New → Project → import `Dami-Lare218/linkbase` from GitHub (install the Vercel GitHub app for this repo only). Framework preset **Next.js**; leave build command, output directory and install command on their defaults (`npm run build`; Vercel uses `npm` because of `package-lock.json`).
2. **Production branch:** Settings → Git → production branch `main`. Every other branch gets Preview Deployments.
3. **Node.js version:** Settings → Build and Deployment → **24.x** (matches Docker and CI).
4. **Environment variables** (Sensitive, separate values per scope):
   - **Production:** `MONGODB_URI`, `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`
   - **Preview:** `MONGODB_URI`, `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`
   - **Never:** `MONGODB_URI_TEST`, `BLOB_READ_WRITE_TOKEN_TEST`, `LINKBASE_DB_TARGET`, `LINKBASE_STANDALONE_BUILD`, `AUTH_TRUST_HOST`
5. **Blob:** Storage → create a **production** and a **preview** Blob store; connect each only to its own environment. **Current state (2026-11-07):** `linkbase-profile-images` is connected to both Production and Preview, so previews upload into the production store. Create `linkbase-profile-images-preview`, point Preview's `BLOB_READ_WRITE_TOKEN` at it, and leave `linkbase-profile-images` on Production only. `BLOB_STORE_ID` and `BLOB_WEBHOOK_PUBLIC_KEY` are unused by the app (it always passes the token explicitly) and are harmless.
6. **Domain:** Settings → Domains → add the production domain (TBD) and set the DNS records Vercel shows. Until then the production `*.vercel.app` URL is used.
7. **Deployment Protection:** keep Vercel Authentication on for **Preview** deployments.
8. **Fork PRs:** keep Vercel's authorization requirement for deployments from forks.
9. **Recommended:** make production promotion wait for the GitHub checks (Vercel's deployment checks setting, selecting the two `Quality / …` checks), so a red `main` doesn't go live. Confirm the feature and its name in the dashboard.
10. **After the first deploys:** open a test PR, confirm the preview URL appears on it and sign-in works there; merge and confirm production. Then record the result here.

### 10.2 GitHub

1. **Branch protection / ruleset on `main`:** require a pull request with **at least 1 approval**, dismiss stale approvals on new commits, require conversation resolution, require status checks **`Quality / Lint, typecheck, test, build`** and **`Quality / Docker image build`** with the branch up to date, block force pushes and deletion, and apply to administrators. The checks appear in the picker only after the workflows have run once.
2. **Actions settings:** Settings → Actions → General: workflow permissions **Read repository contents** (default token read-only); require approval for workflows from outside collaborators / first-time contributors.
3. **Secret scanning and push protection:** Settings → Code security, turn both on if available for the repo.
4. **GitHub secrets / variables:** **none needed.**

### 10.3 MongoDB Atlas

1. Create the production database (ideally its own project/cluster) and a **preview** database, both separate from dev and `linkbase_test` (§7.1).
   - **QA user (needed now):** create e.g. `linkbase_qa` with `readWrite` on `linkbase_test` only, and put it in `MONGODB_URI_TEST` in `.env.test` (keep `/linkbase_test?retryWrites=true&w=majority`). Then delete the old shared user once nothing uses it (check Vercel's `MONGODB_URI` values first).
2. Create one `readWrite` user per database, scoped to that database only.
3. Choose and apply the network access option for Vercel (§7.3) and record it.
4. Put each connection string only into the matching Vercel scope (§10.1 step 4).
5. Enable backups and alerts for production.

## 11. Validation (2026-11-06, local)

| Check | Result |
| --- | --- |
| `npm run test` | **Pass:** 13 files, 488 tests |
| `npm run lint` | **Pass** (no findings) |
| `npm run typecheck` | **Pass.** Also confirmed it fails (exit 2, `TS2322`) on a temporary file with a deliberate type error, which was then deleted |
| `npm run build` | **Pass** (local, default output; no `.next/standalone` created, so Vercel-style builds are unchanged) |
| `actionlint` on the three workflows | **Pass** after fixing one ShellCheck warning (unused loop variable) |
| `docker build` | **Pass** (image `linkbase:local`, 397 MB). Build context 647 KB, no env file loaded (no `Environments:` line in the build output). The first attempt failed because the temporary type-error file above was present while the context was sent; `next build` rejected it as it should. Rebuilt after it was deleted |
| Container start + `GET /` (no env vars, as in CI) | **Pass:** `/` 200 in ~4 s (correct page title), `/login` 200, a `/_next/static` asset 200, Docker healthcheck `healthy` |
| Image contents | **Pass:** runs as `node` (uid 1000); app files root-owned and not writable, only `.next/cache` writable; no `.env*` files, no `src/`, `.git`, `scripts/`, `plans/`, `.claude/` or `Doc/`; Linux `sharp` binaries present; image env and layer history contain no secret-like values |
| Logs during the container check | Auth.js logs `UntrustedHost` for `/api/auth/session`, expected outside Vercel without `AUTH_TRUST_HOST`/`AUTH_URL` (§5.2). Public pages are unaffected |
| `npm ci` notice | npm 11 skips the `postinstall` of `unrs-resolver` (an ESLint dependency) until approved. Harmless: its native binary comes from optional dependencies, and lint passes |
| GitHub Actions run on GitHub | **Not run** (nothing pushed) |
| Vercel Preview / Production deployment | **Not done** (no Vercel project connected) |
