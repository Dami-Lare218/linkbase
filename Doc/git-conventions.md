# Git Conventions

How Linkbase uses branches, commits and pull requests. Read this before creating a branch, writing a commit message, opening a PR or merging anything. That includes Claude Code.

> **Status:** These are **conventions to follow**. Nothing here is enforced by tooling yet. Section 1 lists what is actually set up. Undecided or unverified settings are marked **TBD**.

## 1. Current repository setup (verified locally)

| Item | State |
| --- | --- |
| Remote | `origin` → `https://github.com/Dami-Lare218/linkbase.git` (GitHub) |
| Default branch | `main`, tracking `origin/main` |
| Branch protection / required reviews on `main` | **Unverified.** Can't be checked from the local repo |
| Allowed merge methods on GitHub | **Unverified** |
| CI workflows (`.github/`) | None |
| Git hooks (Husky, lint-staged, commitlint, custom hooks) | None |
| Commit message linting | None. The format below is followed by hand |

Existing history: the first two commits (`Initial commit: …`, `Add CLAUDE.md …`) predate this convention. Later commits use it. There is also a local branch `add-claude-md` that doesn't follow the naming convention. Leave existing history and branches as they are unless the repo owner decides otherwise.

## 2. Branches

- **One branch per feature or task.** Branch from an up-to-date `main`.
- **Never commit directly to `main`.**
- Name branches `<type>/<short-kebab-description>`, using the commit types in §3:

  | Example | For |
  | --- | --- |
  | `feat/add-links` | A new feature |
  | `fix/session-redirect` | A bug fix |
  | `docs/update-auth-guide` | Documentation only |
  | `chore/claude-code-setup` | Tooling, config, housekeeping |
  | `refactor/…`, `test/…` | Refactors, tests |

- Keep the description short and specific. Delete the branch after it's merged.

## 3. Commits: Conventional Commits

Format:

```
<type>: <subject>

<optional body: what and why>
```

Allowed types:

| Type | Use for |
| --- | --- |
| `feat` | New user-facing functionality |
| `fix` | Bug fixes |
| `docs` | Documentation only (`Doc/`, `README.md`, `CLAUDE.md`) |
| `refactor` | Code changes that don't change behaviour |
| `test` | Adding or changing tests |
| `chore` | Tooling, config, dependencies, housekeeping |

**Subject rules:**
- **Imperative mood:** "add link form", not "added" or "adds".
- **Short and descriptive.** Aim for about 50–72 characters, lowercase after the type, no trailing period.
- Say what changed, not "update files" or "fix stuff".

Use the body to explain *why* when it isn't obvious. Commits made by Claude Code end with the `Co-Authored-By` trailer it's configured to add.

Whether to use scopes (`feat(auth): …`) and breaking-change markers (`!` / `BREAKING CHANGE:`) is **TBD**.

## 4. What never gets committed

- **Secrets and credentials**, in any file. Secrets live in env vars ([`security.md`](security.md) §2).
- **Env files with real values** (`.env.local` etc.). `.gitignore` ignores `.env*`. Don't force-add them. A placeholder-only `.env.example` is the planned exception and will need a `.gitignore` exception ([`security.md`](security.md) §2).
- **Generated output:** `.next/`, `out/`, `build/`, `coverage/`, `*.tsbuildinfo`, `next-env.d.ts`, `node_modules/` (all already in `.gitignore`).
- **Private keys** (`*.pem`, already ignored).
- **Unrelated changes.** Each commit and PR covers one task. Stage files on purpose (`git add <paths>`). Review `git status` and `git diff --staged` before committing.

Note: `next dev` re-adds a managed block to `AGENTS.md` if it's removed. Commit it with your work rather than deleting it from diffs (see the note in `AGENTS.md`).

## 5. Pull requests

- **All changes reach `main` through a pull request.** Never push directly to `main`.
- **Keep PRs focused and reviewable:** one feature or fix, no drive-by changes.
- **Keep history clean and understandable.** Clear Conventional Commit messages, and no "wip" / "fix typo" noise left in the final PR where it can be tidied up.
- The PR description says what changed, why, and how it was checked (e.g. `npm run lint`, `npm run build`). PRs opened by Claude Code end with the attribution line it's configured to add.
- Before opening: branch is up to date with `main`, and lint and build pass locally.

**TBD:** merge strategy (merge commit, squash or rebase), PR template, required checks.

## 6. Review and merging

- **A human must review and approve every PR before it's merged.**
- **Claude Code must not approve or merge its own work**, or act as the reviewer for the human. It may create branches, commit and (when asked) push or open PRs. Approval and merging stay with a human.
- Claude Code commits, pushes or opens PRs only when explicitly asked in the conversation.
- Until branch protection is confirmed on GitHub, these rules rely on people following them, not on enforcement.

## 7. Open settings

| Setting | Status |
| --- | --- |
| Branch protection on `main` (block direct pushes, require PR) | TBD / unverified |
| Required approving reviews | TBD / unverified |
| Merge strategy and allowed merge methods | TBD |
| Required status checks / CI | TBD (no CI exists) |
| Commit message linting or hooks | TBD (none exist) |
| PR template | TBD |
| Commit scopes and breaking-change markers | TBD |
| Fate of the existing `add-claude-md` branch | TBD (owner's call) |
