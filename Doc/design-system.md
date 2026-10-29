# Linkbase Design System — Tokens & Visual Foundations

This guide is for engineers building Linkbase in **Next.js + Tailwind CSS**. It covers tokens and visual foundations. For components and layout patterns, see [`ui.md`](./ui.md).

## 0. How to read this document

### Sources of truth (in priority order)
1. `styles.css` and the files under `tokens/`: `colors.css`, `typography.css`, `spacing.css`, `radii.css`, `shadows.css`, `motion.css`, `fonts.css`, `base.css`.
2. `guidelines/tailwind.md`, which maps tokens to a Tailwind theme.
3. The component source in `components/**` and the screens in `ui_kits/**`. These show how tokens are actually used.
4. The root `readme.md`, which holds the written guidelines and the "evidence vs. proposal" log.

### Source availability in this repository
None of the sources listed above (`styles.css`, `tokens/`, `guidelines/tailwind.md`, `components/`, `ui_kits/`, `uploads/`, and the design-system `readme.md`) are in this repository. The root `README.md` is the `create-next-app` boilerplate, not the design-system readme. The values in this document therefore **have not been verified against their sources**. Read "Confirmed" as "reported as defined in the original source", not as re-checked. Until the sources are added, this document is the working reference.

### Status labels
| Label | Meaning |
|---|---|
| **Confirmed** | Defined as a CSS custom property in `tokens/*.css`. Use the exact value. |
| **Mapped** | Has a Tailwind key in `guidelines/tailwind.md`. That file is itself a *proposed* config: it is not yet in the Next.js repo. It is described here in Tailwind v3 terms (`extend`); see "Tailwind CSS v4 compatibility" below. |
| **Observed** | A literal value used in component or kit code that has no token. |
| **Proposed (impl.)** | An implementation suggestion made in this document. It is not a design-system rule. |
| **TBD** | Not defined or not verifiable. Do not invent a value; get a decision first. |

### Provenance caveats (from `readme.md`)
- The visual direction comes from four reference screenshots (`uploads/*.png`). No Figma file, codebase or brand assets were supplied.
- **The brand colour (Tangerine) and the section palette hues are proposed.** The reference supplied the colour-blocking *pattern*, not these values.
- **The typefaces Archivo and Geist are proposed substitutes** for the reference's proprietary typeface.
- **Pixel values were estimated from screenshots** and are starting points. Here, "confirmed" means *defined in the system*, not *validated against production*.
- The screenshots are desktop-only. All responsive behaviour is proposed.

### Tailwind CSS v4 compatibility (this project)
This project uses **Tailwind CSS v4** (4.3.3) with CSS-first configuration. There is no `tailwind.config.js`. Any `tailwind.config.js` snippet, `theme.extend` explanation or `guidelines/tailwind.md` config in these docs is **legacy Tailwind v3 guidance: do not copy it into this project.** The Tailwind class names in this document's "Tailwind" columns show the *intended* keys. None of them are defined in `src/app/globals.css` yet, and v4 silently ignores unknown classes.

- **Where theme values go:** an `@theme` (or `@theme inline`) block in `src/app/globals.css`. The variable's namespace decides the utility:
  - `--color-*` → colour utilities
  - `--text-*` → font size, with optional `--text-*--line-height` / `--text-*--letter-spacing`
  - `--font-*` → font family
  - `--radius-*` → `rounded-*`
  - `--shadow-*` → `shadow-*`
  - `--ease-*` → `ease-*`
  - `--spacing` → spacing scale

  v4 key names for this system are **TBD**. Values must stay exactly as defined in this document.
- **Naming clash:** the colour aliases `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-disabled`, `--text-inverse`, `--text-brand` and `--text-link` share the `--text-*` prefix, which `@theme` reserves for font sizes. Don't add them to `@theme` under those names. Expose them under `--color-*` names (names TBD) that reference the alias.
- **Tokens that override Tailwind defaults:** Tailwind keeps its default theme variables in `@layer theme`, so a token with the same name on unlayered `:root` wins. Checked by compiling against the installed Tailwind 4.3.3 and the current `src/app/globals.css`:
  - `--radius-xs` … `--radius-3xl`: `rounded-xs` … `rounded-3xl` read these variables, so loading the tokens changes those utilities to this system's values (for example `rounded-lg` becomes 16px instead of 8px).
  - `--ease-out`: the `ease-out` utility becomes this system's `cubic-bezier(.2,.8,.2,1)`.
  - `--shadow-xs` … `--shadow-xl`: **not affected**. v4 writes shadow values into the utility, so `shadow-sm` etc. keep Tailwind's values.
  - `--font-sans` / `--font-mono`: **not affected** while `globals.css` maps `font-sans` / `font-mono` to the `next/font` variables with `@theme inline`.

  Whether the radius and `ease-out` overrides are intended is **TBD**. Decide before importing the tokens.

---

## 1. Colour

All colours live in `tokens/colors.css` on `:root`. **Base tokens** (`--lb-*`) hold raw values. **Semantic aliases** (`--text-*`, `--surface-*`, `--border-*`, `--status-*`, `--focus-ring-*`) are what components should reference.

How to read the Tailwind column: `*-ink` means the colour key `ink` works with any colour utility (`bg-ink`, `text-ink`, `border-ink`, `ring-ink`, …). The keys come from `guidelines/tailwind.md` (status: Mapped).

### 1.1 Neutrals (warm grey ramp) — Confirmed
| Token | HEX | Purpose | Tailwind |
|---|---|---|---|
| `--lb-white` | `#FFFFFF` | Cards, page, white buttons, text on ink | `*-white` (Tailwind default, same value) |
| `--lb-gray-50` | `#F8F8F6` | `--surface-app` (dashboard canvas); disabled input fill | `*-gray-50` |
| `--lb-gray-100` | `#F3F3F1` | `--surface-fill` (inputs, secondary buttons, chips) | `*-gray-100` |
| `--lb-gray-150` | `#EEEEEB` | `--surface-fill-hover` | `*-gray-150` |
| `--lb-gray-200` | `#E6E6E2` | `--border-subtle`, `--surface-fill-active`, disabled switch track | `*-gray-200` |
| `--lb-gray-300` | `#D3D3CE` | `--border-default`, switch off track, avatar fallback fill | `*-gray-300` |
| `--lb-gray-400` | `#A6A6A0` | `--text-disabled` | `*-gray-400` |
| `--lb-gray-500` | `#7E7E77` | `--text-tertiary`, unchecked checkbox border | `*-gray-500` |
| `--lb-gray-600` | `#62625C` | `--text-secondary` | `*-gray-600` |
| `--lb-gray-700` | `#4A4A45` | No alias or component use found | `*-gray-700` |
| `--lb-gray-800` | `#2E2E2B` | `--surface-inverse-hover`, hover on ink social discs | `*-gray-800` |
| `--lb-ink-900` | `#1C1C1A` | No alias or component use found | **TBD** (not mapped) |
| `--lb-ink-950` | `#111110` | Primary text, primary buttons, `--surface-inverse`, `--border-strong` | `*-ink` |

> **Tailwind note (legacy v3 wording; do not copy the v3 config):** `guidelines/tailwind.md` extends `gray` with keys 50–800 only. In Tailwind v3 `extend`, keys 50–800 replace the defaults and `150` is added. **Tailwind v4 (this project):** defining only `--color-gray-50` … `--color-gray-800` (plus `150`) in `@theme` likewise leaves Tailwind's defaults for the other keys. Either way, **`gray-900` and `gray-950` remain Tailwind's default (cool) greys and are not part of this system. Do not use them.**

### 1.2 Profile default theme — Confirmed
| Token | HEX | Purpose | Tailwind |
|---|---|---|---|
| `--lb-mist-100` | `#ECEDF1` | `--surface-profile`: the public profile canvas and phone preview | `bg-surface-profile` (via alias) |
| `--lb-mist-400` | `#A4A8AB` | `--surface-backdrop`: desktop backdrop behind the profile column | **TBD** (not mapped) |

### 1.3 Brand: Tangerine — Confirmed token, *proposed hue*
| Token | HEX | Purpose | Tailwind |
|---|---|---|---|
| `--lb-tangerine-50` | `#FFF1EB` | Brand badge background | `*-tangerine-50` |
| `--lb-tangerine-200` | `#FFC9B3` | Hero image placeholder tint | `*-tangerine-200` |
| `--lb-tangerine-400` | `#FF8A5C` | Announcement-bar action text on ink | `*-tangerine-400` |
| `--lb-tangerine-500` | `#FF6B35` | `--surface-brand`: hero section, brand buttons, promo band, upsell outline | `*-tangerine-500` |
| `--lb-tangerine-600` | `#E5521C` | `--surface-brand-hover` | `*-tangerine-600` |
| `--lb-tangerine-700` | `#C2410C` | `--text-brand`: text-safe brand colour, link hover | `*-tangerine-700` |

Text on Tangerine fills is **ink** (`#111110`), never white. Brand buttons use `--lb-ink-950` as the foreground.

### 1.4 Section palette (marketing colour-blocking) — Confirmed token, *proposed hue*
| Token | HEX | Purpose (as used in `ui_kits/marketing`) | Tailwind |
|---|---|---|---|
| `--lb-ocean-900` | `#13315C` | Feature section background (paired with mint-200 headline); stat/bento tile | `*-ocean` |
| `--lb-ocean-700` | `#1F4E8C` | No component use found | **TBD** (not mapped) |
| `--lb-mint-200` | `#A8F0C6` | Headline on ocean; success icon in Toast | `*-mint-200` |
| `--lb-mint-100` | `#D9F5E4` | Feature section background; default `Card variant="color"` fill | `*-mint-100` |
| `--lb-forest-800` | `#0E4B33` | Headline/body on mint-100; stat tile | `*-forest` |
| `--lb-plum-900` | `#3D0F3A` | Feature and FAQ section background | `*-plum` |
| `--lb-peach-300` | `#FFB59A` | Headline on plum; error icon in Toast | `*-peach` |
| `--lb-butter-300` | `#FFE066` | Welcome right-hand panel; bento/stat tile | `*-butter` |
| `--lb-lilac-200` | `#E3D7FF` | Headline on lilac-800; bento/stat tile; info icon in Toast | `*-lilac-200` |
| `--lb-lilac-800` | `#4B2A8C` | CTA + footer section background | `*-lilac-800` |

Pairings used in the kits (background → headline): Tangerine-500 → Ink · Ocean-900 → Mint-200 · Plum-900 → Peach-300 · Mint-100 → Forest-800 · Lilac-800 → Lilac-200. The readme also names a Butter/Ink pairing, which appears only on tiles. Rule (readme): never more than one section colour per viewport height.

### 1.5 Status colours — Confirmed
| Token | HEX | Purpose | Tailwind |
|---|---|---|---|
| `--lb-green-600` | `#137A3E` | `--status-success`: Switch "on" track, Input success ring/icon | **TBD** |
| `--lb-green-50` | `#E3F5EA` | `--status-success-bg` | **TBD** |
| `--lb-red-600` | `#C8281E` | `--status-error`: Input error ring/message | **TBD** |
| `--lb-red-50` | `#FDECEA` | `--status-error-bg` | **TBD** |
| `--lb-amber-700` | `#9A5B00` | `--status-warning` | **TBD** |
| `--lb-amber-50` | `#FFF3D6` | `--status-warning-bg` | **TBD** |
| `--lb-blue-700` | `#1D4ED8` | `--status-info` | **TBD** |
| `--lb-blue-50` | `#E6EDFF` | `--status-info-bg` | **TBD** |

> Status colours have no Tailwind keys in `guidelines/tailwind.md`. Tailwind's default `green`/`red`/`amber`/`blue` scales have **different values**, so don't substitute them. See §9 for a proposed mapping.

### 1.6 Semantic aliases — Confirmed
| Alias | Resolves to | HEX | Purpose | Tailwind |
|---|---|---|---|---|
| `--text-primary` | `--lb-ink-950` | `#111110` | Body and heading text | TBD (alias not mapped; same value as `text-ink`) |
| `--text-secondary` | `--lb-gray-600` | `#62625C` | Meta, helper text, inactive tabs | TBD (same value as `text-gray-600`) |
| `--text-tertiary` | `--lb-gray-500` | `#7E7E77` | Drag handles, faint icons | TBD (same value as `text-gray-500`) |
| `--text-disabled` | `--lb-gray-400` | `#A6A6A0` | Disabled labels | TBD (same value as `text-gray-400`) |
| `--text-inverse` | `--lb-white` | `#FFFFFF` | Text on ink | TBD (same value as `text-white`) |
| `--text-brand` | `--lb-tangerine-700` | `#C2410C` | Brand text, `a:hover` | TBD (same value as `text-tangerine-700`) |
| `--text-link` | `--lb-ink-950` | `#111110` | Default `a` colour (underlined) | TBD |
| `--surface-page` | `--lb-white` | `#FFFFFF` | Page background | `bg-surface-page` |
| `--surface-app` | `--lb-gray-50` | `#F8F8F6` | Dashboard canvas, neutral marketing section | `bg-surface-app` |
| `--surface-card` | `--lb-white` | `#FFFFFF` | Cards, focused inputs | `bg-surface-card` |
| `--surface-fill` | `--lb-gray-100` | `#F3F3F1` | Inputs, secondary buttons, chips | `bg-surface-fill` |
| `--surface-fill-hover` | `--lb-gray-150` | `#EEEEEB` | Hover on fills | TBD |
| `--surface-fill-active` | `--lb-gray-200` | `#E6E6E2` | Pressed fills | TBD |
| `--surface-inverse` | `--lb-ink-950` | `#111110` | Primary button, toasts, tooltips, upsell band | TBD (same value as `bg-ink`) |
| `--surface-inverse-hover` | `--lb-gray-800` | `#2E2E2B` | Primary button hover | TBD (same value as `bg-gray-800`) |
| `--surface-brand` | `--lb-tangerine-500` | `#FF6B35` | Brand fills | TBD (same value as `bg-tangerine-500`) |
| `--surface-brand-hover` | `--lb-tangerine-600` | `#E5521C` | Brand button hover | TBD |
| `--surface-profile` | `--lb-mist-100` | `#ECEDF1` | Public profile canvas | `bg-surface-profile` |
| `--surface-backdrop` | `--lb-mist-400` | `#A4A8AB` | Desktop backdrop around the profile | TBD |
| `--surface-overlay` | — | `rgba(17,17,16,.48)` | Dialog scrim (48% ink) | TBD |
| `--border-subtle` | `--lb-gray-200` | `#E6E6E2` | Card/row hairlines, dividers | TBD (same value as `border-gray-200`, used in the tailwind.md card recipe) |
| `--border-default` | `--lb-gray-300` | `#D3D3CE` | Outline button border, hovered row border | TBD |
| `--border-strong` | `--lb-ink-950` | `#111110` | Focused input ring, active tab underline, outline button hover | TBD |
| `--status-*` / `--status-*-bg` | see §1.5 | — | Feedback | TBD |
| `--focus-ring-inner` | `--lb-white` | `#FFFFFF` | Inner ring of `--shadow-focus` | — |
| `--focus-ring-outer` | `--lb-ink-950` | `#111110` | Outer ring of `--shadow-focus` | — |

### 1.7 Observed non-token colour literals
- `#fff` / `#FFFFFF` is used inline in several kit screens. It is equivalent to `--lb-white`; use the token.
- `rgba(0,0,0,.28)`: Accordion row fill on dark sections. **Not tokenised.**
- `rgba(17,17,16,0)` → `rgba(17,17,16,.85)`: the public profile's bottom protection gradient. **Not tokenised.**
- `rgba(17,17,16,.08)` inset hairline on the marketing claim input. **Not tokenised.**
- No dark mode is defined: **TBD**.

### 1.8 Contrast (WCAG 2.x, computed from the HEX values)
| Foreground / background | Ratio | Result |
|---|---|---|
| Ink `#111110` / White | 18.89 | AA/AAA |
| `--text-secondary` `#62625C` / White · Gray-50 · Gray-100 · Mist-100 | 6.14 · 5.77 · 5.53 · 5.25 | AA |
| `--text-tertiary` `#7E7E77` / White | 4.09 | **Fails AA for body text.** Passes 3:1 (large text, icons) |
| `--text-tertiary` / Gray-100 | 3.68 | **Fails AA for body text** |
| `--text-disabled` `#A6A6A0` / White | 2.45 | Below 3:1. Acceptable only for disabled controls (WCAG exempts them) |
| `--text-brand` `#C2410C` / White · Tangerine-50 | 5.18 · 4.69 | AA |
| Ink / Tangerine-500 · Tangerine-600 | 6.66 · 5.00 | AA |
| White on Tangerine-500 | — | Not used; don't introduce it |
| Tangerine-400 / Ink | 8.13 | AA |
| White / Gray-800 (primary hover) | 13.62 | AA |
| Status colour / white or its `-bg` | 4.77–6.70 | AA |
| Mint-200/Ocean-900 · Peach-300/Plum-900 · Forest-800/Mint-100 · Lilac-200/Lilac-800 | 9.83 · 9.28 · 8.75 · 7.68 | AA |
| Ink / Butter-300 · Lilac-200 · Peach-300 · Mint-200 | 14.49 · 13.88 · 11.09 · 14.35 | AA |
| White / Ocean-900 · Plum-900 · Forest-800 | 12.95 · 15.82 · 10.13 | AA |
| Switch off track `#D3D3CE` / White (non-text) | 1.50 | **Below 3:1 for UI components.** The thumb and position carry the state. Flag for design review: TBD |
| `--border-subtle` / White | 1.25 | Decorative hairline only; must not be the sole boundary of an input |

**Rule:** don't use `--text-tertiary` for text that carries meaning; use `--text-secondary`.

---

## 2. Typography

### 2.1 Families — Confirmed (proposed substitutes)
| Token | Stack | Use | Tailwind |
|---|---|---|---|
| `--font-display` | `"Archivo","Helvetica Neue",Arial,sans-serif` | Display and headings, Wordmark | `font-display` |
| `--font-sans` | `"Geist","Helvetica Neue",Arial,sans-serif` | All UI and body text (the `body` default) | `font-sans` |
| `--font-mono` | `"Geist Mono",ui-monospace,Menlo,monospace` | Placeholder labels only (in kits) | `font-mono` |

Loaded weights (`tokens/fonts.css`): Archivo 500/600/700/800/900 · Geist 400/500/600/700 · Geist Mono 400/500.

**Next.js (from `guidelines/tailwind.md`):** use `next/font/google` and assign the families to `--font-display` and `--font-sans`. The guide's example loads Archivo at `weight:['800']` only. Every display use found in the components and kits is weight 800, so that is enough for current designs. Loading Geist Mono is **TBD**: it isn't mentioned, and it only appears in placeholder art.

### 2.2 Weights — Confirmed
| Token | Value | Observed use |
|---|---|---|
| `--fw-regular` | 400 | Body |
| `--fw-medium` | 500 | Nav links, labels, inactive tabs, toasts, URL pill |
| `--fw-semibold` | 600 | Buttons, link titles, badges, active rail label |
| `--fw-bold` | 700 | Profile handle, footer column titles |
| `--fw-extrabold` | 800 | Display, headings, Wordmark |

Components currently write these as numeric literals rather than `var(--fw-*)`. The values match. In Tailwind, use `font-normal`/`font-medium`/`font-semibold`/`font-bold`/`font-extrabold` (the defaults have the same values).

### 2.3 Type scale — Confirmed
| Role | Size token | Size | Line-height token | LH | Tracking | Family / weight | Use |
|---|---|---|---|---|---|---|---|
| Display 2XL | `--text-display-2xl` | 88px | `--lh-display-2xl` | 0.95 | `--tracking-display` −0.045em | Display 800 | Hero headline (≥1024px) |
| Display XL | `--text-display-xl` | 64px | `--lh-display-xl` | 1 | −0.045em | Display 800 | No kit use found |
| Display LG | `--text-display-lg` | 48px | `--lh-display-lg` | 1.04 | −0.045em | Display 800 | Feature and CTA headlines (≥1024 / ≥768) |
| Display MD | `--text-display-md` | 36px | `--lh-display-md` | 1.08 | −0.045em | Display 800 | Bento and FAQ headlines |
| Heading LG | `--text-heading-lg` | 32px | `--lh-heading-lg` | 1.12 | `--tracking-heading` −0.02em | Display 800 | Welcome H1 (≥1024px) |
| Heading MD | `--text-heading-md` | 24px | `--lh-heading-md` | 1.2 | −0.02em | Display 800 | Dashboard "Content", Dialog title |
| Heading SM | `--text-heading-sm` | 20px | `--lh-heading-sm` | 1.25 | −0.02em | Display 800 | No kit use found |
| Body LG | `--text-body-lg` | 18px | `--lh-body-lg` | 1.5 | `--tracking-body` −0.005em | Sans 400 | Lead paragraphs, Accordion questions (600) |
| Body | `--text-body` | 16px | `--lh-body` | 1.5 | −0.005em | Sans 400 | Default body, inputs, md/lg buttons |
| Body SM | `--text-body-sm` | 14px | `--lh-body-sm` | 1.43 | −0.005em | Sans | Meta, helper text, labels, sm buttons, toasts |
| Caption | `--text-caption` | 12px | `--lh-caption` | 1.33 | −0.005em | Sans | Rail labels, tooltips, md badges |
| Micro | `--text-micro` | 11px | `--lh-micro` | 1.27 | −0.005em | Sans | sm badges |

Base (`tokens/base.css`): `body { font-family: var(--font-sans); font-size: var(--text-body); line-height: var(--lh-body); letter-spacing: var(--tracking-body); color: var(--text-primary); -webkit-font-smoothing: antialiased }`.

**Tailwind:** the type scale has **no** Tailwind mapping, so its utilities are **TBD**. Tailwind's default `text-base`/`text-sm` sizes match by size (16/14px), but their line-heights differ from `--lh-body`/`--lh-body-sm`. Don't rely on defaults for line-height. See §9 for a proposed mapping.

### 2.4 Observed type values without tokens
| Where | Value | Note |
|---|---|---|
| Button | `letter-spacing: -0.01em`, `line-height: 1` | Literal |
| Wordmark | Display 800, `letter-spacing: -0.04em`, `line-height: 1` | Literal, size via prop |
| Welcome H1 | Uses `--tracking-display` (−0.045em) at heading size, LH 1.1; 28px below 1024px | Doesn't match the heading tracking rule (−0.02em). **TBD: which is intended** |
| Marketing headlines (mobile) | 48 / 36 / 34 / 30px, LH 1.02 | Not tokens; no mobile display tokens exist (**TBD**) |
| Public profile | Handle 24px/700/−0.02em; bio 15px; footer links 13px | Not tokens |
| Accordion answer | LH 1.6 | Not a token |
| Checkbox label | LH 22px | Not a token |

---

## 3. Spacing & sizing — Confirmed (`tokens/spacing.css`)

### 3.1 Spacing scale (4px base)
| Token | Value | Tailwind spacing key with the same value* |
|---|---|---|
| `--space-0` | 0px | `0` |
| `--space-0-5` | 2px | `0.5` |
| `--space-1` | 4px | `1` |
| `--space-1-5` | 6px | `1.5` |
| `--space-2` | 8px | `2` |
| `--space-3` | 12px | `3` |
| `--space-4` | 16px | `4` |
| `--space-5` | 20px | `5` |
| `--space-6` | 24px | `6` |
| `--space-8` | 32px | `8` |
| `--space-10` | 40px | `10` |
| `--space-12` | 48px | `12` |
| `--space-16` | 64px | `16` |
| `--space-20` | 80px | `20` |
| `--space-24` | 96px | `24` |
| `--space-32` | 128px | `32` |

\*Tailwind's default spacing is in rem. These match at a 16px root size, so `p-4`, `gap-3`, etc. reproduce the tokens. Components use numeric px literals, some of them off-scale (for example 10, 14, 18, 22, 28, 36, 44, 52). Copy those exactly; they are listed per component in `ui.md`.

### 3.2 Control heights
| Token | Value | Used by | Tailwind |
|---|---|---|---|
| `--control-sm` | 36px | Button sm | `h-control-sm` |
| `--control-md` | 48px | Button md, Input/Select md | `h-control-md` |
| `--control-lg` | 56px | Button lg, Input/Select lg (default), LinkButton min-height, marketing claim input | `h-control-lg` |
| `--control-xl` | 64px | No use found | **TBD** (not mapped) |

### 3.3 Layout tokens
| Token | Value | Purpose | Tailwind |
|---|---|---|---|
| `--container-max` | 1280px | Marketing content width | `max-w-container` |
| `--container-narrow` | 640px | No use found | **TBD** |
| `--profile-max` | 580px | Public profile column | `max-w-profile` |
| `--gutter-mobile` | 16px | Section side padding, <768px | TBD |
| `--gutter-tablet` | 24px | No direct use found | TBD |
| `--gutter-desktop` | 32px | Section side padding, ≥768px | TBD |
| `--nav-height` | 72px | SiteNav height | TBD |
| `--banner-height` | 48px | AnnouncementBar min-height | TBD |
| `--sidebar-width` | 96px | Readme: dashboard rail. **Not referenced in code**; SideNavItem is 72px wide | TBD |
| `--section-pad-y` | 96px | Marketing section vertical padding, ≥768px | TBD |
| `--section-pad-y-mobile` | 56px | Marketing section vertical padding, <768px | TBD |

### 3.4 Spacing in use (readme + observed)
- Card padding: default 32px (`Card`); dashboard editor 36px desktop / 20px mobile.
- Link stack gap: 16px on the public profile; 12px for dashboard link rows (readme: 12–16).
- Marketing hero top padding: 168px (≥1024px) / 128px. Observed; not tokens.
- Sticky marketing nav: 16px from the top; side inset 24px (≥768px) / 12px.

---

## 4. Border radius — Confirmed (`tokens/radii.css`)
| Token | Value | Purpose / alias use | Tailwind |
|---|---|---|---|
| `--radius-xs` | 6px | LinkButton `square` shape; Checkbox (as a 6px literal) | **TBD** (not mapped)† |
| `--radius-sm` | 8px | Tooltip, LinkButton thumbnail | TBD† |
| `--radius-md` | 12px | `--radius-input`; rounded IconButton; nav links; LinkCard tile | TBD† |
| `--radius-lg` | 16px | `--radius-link`; Accordion rows; featured-link image | TBD† |
| `--radius-xl` | 24px | `--radius-card`; LinkCard rows; mobile menu; featured LinkButton | TBD† |
| `--radius-2xl` | 32px | `--radius-sheet`; Dialog; marketing tiles and footer card; profile column top | TBD† |
| `--radius-3xl` | 48px | No use found | TBD |
| `--radius-pill` | 9999px | `--radius-button`; buttons, URL pill, nav, toasts, badges, switch | `rounded-full` (Tailwind default 9999px, same value) |
| `--radius-circle` | 50% | Avatars, social discs | TBD (`rounded-full` gives the same visual result on square elements) |
| `--radius-input` | → 12px | Input, Select | `rounded-input` |
| `--radius-link` | → 16px | LinkButton `rounded` shape (default) | `rounded-link` |
| `--radius-card` | → 24px | Card | `rounded-card` |
| `--radius-sheet` | → 32px | Sheets, dialogs | `rounded-sheet` |
| `--radius-button` | → 9999px | Button | `rounded-full` |

†**Don't use Tailwind's default `rounded-md`/`lg`/`xl`/`2xl`/`3xl`.** Their default values (6/8/12/16/24px) are shifted one step from this system's names, so by default `rounded-lg` (8px) ≠ `--radius-lg` (16px). **Tailwind v4 (this project):** these utilities read `--radius-*`, so once this system's tokens are loaded on `:root` they output this system's values instead (`rounded-lg` = 16px). See §0 "Tailwind CSS v4 compatibility". Whether that is intended is TBD; until it is decided, keep avoiding them, because their output depends on whether the tokens are loaded.

Observed radius literals: dashboard phone preview 36px; marketing ProfileMock 36px; dashboard banner overlap `24px 24px 0 0`; preview-side tool group 20px. None of these are tokens.

### Border widths — Confirmed
| Token | Value | Use |
|---|---|---|
| `--border-width` | 1px | Card and row hairlines, outline button |
| `--border-width-strong` | 2px | Outline LinkButton; also the width of the inset focus/error/success ring on inputs |

Observed: 1.5px on Checkbox (unchecked) and on the AnnouncementBar action pill. Not tokenised.

---

## 5. Shadows — Confirmed (`tokens/shadows.css`)
All shadows are ink-tinted (`rgba(17,17,16,…)`), low and diffuse. Use them only on floating elements.

| Token | Value | Use | Tailwind |
|---|---|---|---|
| `--shadow-none` | `none` | — | `shadow-none` |
| `--shadow-xs` | `0 1px 2px rgba(17,17,16,.06)` | White IconButton, Switch thumb, LinkCard tile, profile corner button | TBD‡ |
| `--shadow-sm` | `0 1px 2px rgba(17,17,16,.04), 0 2px 8px rgba(17,17,16,.05)` | `--shadow-card`; white UrlPill | TBD‡ |
| `--shadow-md` | `0 4px 16px rgba(17,17,16,.08)` | `--shadow-nav`; Tooltip | TBD‡ |
| `--shadow-lg` | `0 12px 40px rgba(17,17,16,.12)` | `--shadow-preview`; Toast; mobile nav menu; profile column (desktop) | TBD‡ |
| `--shadow-xl` | `0 24px 64px rgba(17,17,16,.18)` | `--shadow-overlay` | TBD‡ |
| `--shadow-card` | → `--shadow-sm` | `Card variant="elevated"` | `shadow-card` |
| `--shadow-nav` | → `--shadow-md` | SiteNav | `shadow-nav` |
| `--shadow-preview` | → `--shadow-lg` | Dashboard phone preview | `shadow-preview` |
| `--shadow-overlay` | → `--shadow-xl` | Dialog | `shadow-overlay` |
| `--shadow-focus` | `0 0 0 2px var(--focus-ring-inner), 0 0 0 4px var(--focus-ring-outer)` | Focus ring (2px white + 2px ink) | `shadow-focus` |

‡Tailwind's default `shadow-sm`/`md`/`lg`/`xl` have **different values**. Use the semantic keys, or add the base keys (see §9, a legacy v3 example). In Tailwind v4 this stays true even after this system's `--shadow-*` tokens are loaded, because v4 writes shadow values into the utility instead of reading the variable.

Observed: the `LinkButton theme="shadow"` hard offset `0 4px 0 var(--lb-ink-950)`; the white Avatar ring `0 0 0 3px #fff`; the active SideNavItem double ring `0 0 0 3px #fff, 0 0 0 5px ink`. None are tokens.

---

## 6. Responsive breakpoints — **TBD (no tokens)**
`readme.md` labels breakpoints and mobile layouts as **"Proposed (Tailwind defaults)"**, because the reference screenshots are desktop-only. No breakpoint custom properties exist.

The kits use JS viewport thresholds (`useViewport()`). These are the only verifiable breakpoints:

| Threshold | Behaviour in kits | Tailwind default with the same value |
|---|---|---|
| `< 640px` | Public profile goes full-bleed (no backdrop, no radius, no shadow) | `sm` (640) |
| `< 768px` | Dashboard: left rail becomes a fixed bottom bar; editor card padding 20; buttons shorten. Marketing: section padding switches to the mobile tokens; nav inset 12px | `md` (768) |
| `< 900px` | Marketing bento becomes 1 column; footer link grid goes from 4 to 2 columns | **none** (900 is not a Tailwind default) |
| `< 1024px` | SiteNav collapses to a menu button; Welcome drops its right-hand art panel; marketing hero/feature grids become 1 column | `lg` (1024) |
| `≥ 1100px` | Dashboard shows the sticky phone preview | **none** (1100 is not a Tailwind default) |

The `xl` (1280) and `2xl` (1536) Tailwind defaults aren't used. **Decision needed (TBD):** keep 900/1100 as custom screens, or snap them to `lg`/`xl`. This document does not decide.

---

## 7. Motion — Confirmed (`tokens/motion.css`, `tokens/base.css`)

### 7.1 Tokens
| Token | Value | Use |
|---|---|---|
| `--duration-fast` | 120ms | Colour/background/border changes, press scale |
| `--duration-base` | 200ms | Switch, tab colour, Accordion chevron, LinkButton hover, Accordion answer fade |
| `--duration-slow` | 320ms | Overlay entry (Dialog, Toast) |
| `--ease-standard` | `cubic-bezier(.2,0,0,1)` | Default |
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` | Entrances (fade-up), Switch thumb |
| `--ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | **LinkButton hover only** |
| `--press-scale` | .97 | Button press |

### 7.2 Keyframes (`tokens/base.css`)
```css
@keyframes lb-spin    { to { transform: rotate(360deg) } }                       /* Button loading: 800ms linear infinite */
@keyframes lb-fade-up { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
```

### 7.3 Motion rules (readme + code)
| Interaction | Spec |
|---|---|
| Hover fill change | `background var(--duration-fast) var(--ease-standard)` |
| Button press | `scale(.97)` over 120ms |
| IconButton press | `scale(.94)` (literal) |
| LinkButton hover / press | `scale(1.015)` / `scale(.98)`, `transform var(--duration-base) var(--ease-spring)` |
| SocialIcon hover | `translateY(-1px)`; plain variant opacity .65 |
| Switch | Track background `--duration-base --ease-standard`; thumb `left --duration-base --ease-out` |
| Accordion | Chevron rotates 180° (`--duration-base --ease-standard`); answer `lb-fade-up --duration-base --ease-out` |
| Dialog / Toast entry | `lb-fade-up var(--duration-slow) var(--ease-out)` |
| Exit animations | **TBD** (components unmount with no exit animation) |
| Reduced motion | The readme says "Respect reduced-motion", but **no `prefers-reduced-motion` handling is implemented**. Implementation is TBD. Proposed (impl.): disable scale/translate transforms and `lb-fade-up`, keep the colour transitions. |

---

## 8. Other foundations

### 8.1 Focus
- Global rule (`tokens/base.css`): `:focus-visible:not(input):not(select):not(textarea) { outline: none; box-shadow: var(--shadow-focus) }`.
- Inputs and selects suppress the outline and instead show an **inset 2px `--border-strong` ring** while focused.
- Tailwind recipe (tailwind.md): `focus-visible:shadow-focus`.

### 8.2 Links (`tokens/base.css`)
`a { color: var(--text-link); text-decoration: underline; text-underline-offset: 2px }` and `a:hover { color: var(--text-brand) }`.

### 8.3 Transparency, blur, imagery (readme)
- Dialog scrim: `--surface-overlay` (48% ink). **No backdrop blur anywhere.**
- No gradients, except the public-profile bottom protection gradient (transparent → 85% ink, 180px tall).
- Imagery is photography in rounded tiles. No photos were supplied; the kits use striped placeholders. Real imagery is **TBD**.

### 8.4 Z-index — **TBD (not tokenised)**
Observed literals: SiteNav mobile menu 10 · Tooltip 20 · sticky marketing nav 40 · profile toast 50 · marketing toast 60 · Dialog 100 · dashboard toast 200.

### 8.5 Iconography (readme)
- UI icons: Lucide (`lucide-static@0.454.0`), outline, 2px stroke. Brand glyphs: Simple Icons (`simple-icons@13`), monochrome.
- Sizes: 16 (dense/meta), 18–20 (controls), 22–24 (nav, profile socials).
- No emoji. No unicode used as icons, except `·` as a separator.
- Next.js: the `Icon` component fetches SVGs from a CDN at runtime. Proposed (impl.): use `lucide-react` and import brand SVGs directly. The exact package choice is TBD.

### 8.6 Brand mark
There is **no logo**. Use the `Wordmark`: "Linkbase" set in Archivo 800 with −0.04em tracking. Never draw a symbol.

---

## 9. Proposed (impl.) Tailwind extension for unmapped tokens (legacy Tailwind v3 format)
> **Legacy Tailwind v3 example. Do not copy it into this project.** This project uses Tailwind v4, which has no `tailwind.config.js`. The block is kept only as a record of the proposed key names and which token each key points to. To use it, re-express each entry as a v4 theme variable in `src/app/globals.css`, following §0 "Tailwind CSS v4 compatibility". Mind the `--text-*` naming clash, and don't define a theme variable as `var()` of a token with the same name, which would reference itself.

> **Not part of the design system.** This is a suggestion for wiring the remaining **confirmed** tokens into Tailwind without changing any values. It extends `guidelines/tailwind.md`, which remains the baseline. Key names are proposals.

```js
// LEGACY Tailwind v3 format. Do not copy into this project (Tailwind v4, no tailwind.config.js).
// tailwind.config.js (v3) — merge with guidelines/tailwind.md
module.exports = { theme: { extend: {
  colors: {
    'ink-900': 'var(--lb-ink-900)',
    mist: { 100: 'var(--lb-mist-100)', 400: 'var(--lb-mist-400)' },
    'ocean-700': 'var(--lb-ocean-700)',
    fg: { DEFAULT: 'var(--text-primary)', secondary: 'var(--text-secondary)', tertiary: 'var(--text-tertiary)',
          disabled: 'var(--text-disabled)', inverse: 'var(--text-inverse)', brand: 'var(--text-brand)' },
    line: { subtle: 'var(--border-subtle)', DEFAULT: 'var(--border-default)', strong: 'var(--border-strong)' },
    status: { success: 'var(--status-success)', 'success-bg': 'var(--status-success-bg)',
              error: 'var(--status-error)', 'error-bg': 'var(--status-error-bg)',
              warning: 'var(--status-warning)', 'warning-bg': 'var(--status-warning-bg)',
              info: 'var(--status-info)', 'info-bg': 'var(--status-info-bg)' },
    surface: { 'fill-hover': 'var(--surface-fill-hover)', 'fill-active': 'var(--surface-fill-active)',
               inverse: 'var(--surface-inverse)', 'inverse-hover': 'var(--surface-inverse-hover)',
               brand: 'var(--surface-brand)', 'brand-hover': 'var(--surface-brand-hover)',
               backdrop: 'var(--surface-backdrop)', overlay: 'var(--surface-overlay)' },
  },
  fontSize: {
    'display-2xl': ['var(--text-display-2xl)', { lineHeight: 'var(--lh-display-2xl)', letterSpacing: 'var(--tracking-display)' }],
    'display-xl':  ['var(--text-display-xl)',  { lineHeight: 'var(--lh-display-xl)',  letterSpacing: 'var(--tracking-display)' }],
    'display-lg':  ['var(--text-display-lg)',  { lineHeight: 'var(--lh-display-lg)',  letterSpacing: 'var(--tracking-display)' }],
    'display-md':  ['var(--text-display-md)',  { lineHeight: 'var(--lh-display-md)',  letterSpacing: 'var(--tracking-display)' }],
    'heading-lg':  ['var(--text-heading-lg)',  { lineHeight: 'var(--lh-heading-lg)',  letterSpacing: 'var(--tracking-heading)' }],
    'heading-md':  ['var(--text-heading-md)',  { lineHeight: 'var(--lh-heading-md)',  letterSpacing: 'var(--tracking-heading)' }],
    'heading-sm':  ['var(--text-heading-sm)',  { lineHeight: 'var(--lh-heading-sm)',  letterSpacing: 'var(--tracking-heading)' }],
    'body-lg':     ['var(--text-body-lg)',     { lineHeight: 'var(--lh-body-lg)',     letterSpacing: 'var(--tracking-body)' }],
    body:          ['var(--text-body)',        { lineHeight: 'var(--lh-body)',        letterSpacing: 'var(--tracking-body)' }],
    'body-sm':     ['var(--text-body-sm)',     { lineHeight: 'var(--lh-body-sm)',     letterSpacing: 'var(--tracking-body)' }],
    caption:       ['var(--text-caption)',     { lineHeight: 'var(--lh-caption)',     letterSpacing: 'var(--tracking-body)' }],
    micro:         ['var(--text-micro)',       { lineHeight: 'var(--lh-micro)',       letterSpacing: 'var(--tracking-body)' }],
  },
  borderRadius: { 'ds-xs': 'var(--radius-xs)', 'ds-sm': 'var(--radius-sm)', 'ds-md': 'var(--radius-md)', 'ds-lg': 'var(--radius-lg)',
                  'ds-xl': 'var(--radius-xl)', 'ds-2xl': 'var(--radius-2xl)', 'ds-3xl': 'var(--radius-3xl)' },
  boxShadow: { 'ds-xs': 'var(--shadow-xs)', 'ds-sm': 'var(--shadow-sm)', 'ds-md': 'var(--shadow-md)', 'ds-lg': 'var(--shadow-lg)', 'ds-xl': 'var(--shadow-xl)' },
  transitionDuration: { fast: 'var(--duration-fast)', base: 'var(--duration-base)', slow: 'var(--duration-slow)' },
  transitionTimingFunction: { standard: 'var(--ease-standard)', out: 'var(--ease-out)', spring: 'var(--ease-spring)' },
  height: { 'control-xl': 'var(--control-xl)' },
  maxWidth: { narrow: 'var(--container-narrow)' },
}}};
```
- The `ds-` prefix on radius/shadow keys avoids colliding with Tailwind defaults that have different values (§4, §5).
- Ship `styles.css` (the tokens) globally, for example by importing it in `src/app/layout.tsx`, so these `var()` references resolve. (`styles.css` is not in this repository yet; see §0.)
- Breakpoints stay **TBD** (§6).

---

## 10. Open items (TBD summary)
1. Breakpoint tokens, and whether to keep the 900/1100 thresholds.
2. Tailwind keys for status colours, text/border aliases, the type scale, base radii/shadows and motion (§9 is a proposal only).
3. Mobile display type sizes (the kits use 48/36/34/30/28px literals).
4. Welcome H1 tracking: display (−0.045em) vs heading (−0.02em).
5. `--sidebar-width` (96px) vs the actual SideNavItem width (72px).
6. Unused tokens: `--lb-gray-700`, `--lb-ink-900`, `--lb-ocean-700`, `--text-display-xl`, `--text-heading-sm`, `--radius-3xl`, `--control-xl`, `--container-narrow`, `--gutter-tablet`. Purpose TBD.
7. Contrast: `--text-tertiary` on light grounds (4.09 / 3.68) and the Switch off track (1.50).
8. Reduced-motion implementation; exit animations.
9. Z-index scale; dark mode; a final licensed typeface; real photography; a logo.
