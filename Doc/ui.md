# Linkbase Design System: UI Components & Patterns

This guide is for implementing Linkbase's components and screens in **Next.js + Tailwind CSS**. For token values, see [`design-system.md`](./design-system.md). This document refers to tokens by name (for example `--surface-fill`) and doesn't repeat their values.

## 0. Scope and status

### Sources of truth
- **Components:** `components/<group>/<Name>.jsx` holds the implementation and `<Name>.d.ts` the props contract. `components/core/useInteract.js` holds the shared hover/press/focus logic.
- **Screens:** `ui_kits/app/` (`Welcome.jsx`, `Dashboard.jsx`, `ProfilePage.jsx`, `shared.jsx`) and `ui_kits/marketing/` (`Sections.jsx`, `index.html`).
- **Rationale:** the root `readme.md`, including its "evidence vs. proposal" table and its "Intentional additions" list.

**Source availability:** none of these sources (`components/`, `ui_kits/`, the design-system `readme.md`) are in this repository. The root `README.md` is the `create-next-app` boilerplate. The specifications below **have not been verified against their sources**, so read "Confirmed" as "reported as defined in the original source". Until the sources are added, this document is the working reference.

### Status labels
| Label | Meaning |
|---|---|
| **Confirmed** | Defined in component code or `.d.ts`. Copy it exactly. |
| **Reference-observed** | `readme.md` says the pattern is visible in the reference screenshots. |
| **DS addition** | `readme.md` says the reference doesn't show it. It was added to the system to cover required states or flows. |
| **Gap** | Behaviour is missing or incorrect in the current reference implementation. The fix is TBD or proposed. |
| **Proposed (impl.)** | A suggestion in this document only. Not a design-system rule. |
| **TBD** | Undefined. |

### Component inventory (complete: 23 components)
| Group | Components |
|---|---|
| `core/` | Button, IconButton, Badge, Avatar, Icon, Wordmark |
| `forms/` | Input, Select, Switch, Checkbox |
| `navigation/` | SiteNav, AnnouncementBar, Tabs, SideNavItem, UrlPill |
| `content/` | LinkButton, LinkCard, SocialIcon, Card, Accordion |
| `feedback/` | Toast, Tooltip, Dialog |

The readme lists these as **DS additions**: Icon, Wordmark, Checkbox, Select, Toast, Tooltip, Dialog and Badge.

**Not in the system. Don't build these as DS components without a design decision:** Radio, Textarea, dropdown/menu (all kebab buttons have no menu), Popover, Skeleton/Spinner component, Pagination, Breadcrumbs, Table, Progress, file/image upload, colour picker, drag-and-drop reorder behaviour (only the handle glyph exists), bottom-tab-bar component (the kit composes it from SideNavItem), and a footer component (the kit composes it inline).

---

## 1. Shared interaction model

### 1.1 State matrix (Confirmed unless marked)
| State | Rule |
|---|---|
| **Hover** | Fills step one shade: `--surface-fill` → `--surface-fill-hover`, and `--surface-inverse` → `--surface-inverse-hover`. Outline borders go to `--border-strong`. Text links turn `--text-brand`. |
| **Active / press** | Button scales to `var(--press-scale)` (.97); IconButton to .94; LinkButton to .98. Secondary and ghost Buttons also step to `--surface-fill-active`. |
| **Focus** | `--shadow-focus` (2px white + 2px ink) on `:focus-visible` only. Button, IconButton, Switch and Checkbox detect focus with `matches(':focus-visible')`. Inputs and Selects use an inset 2px `--border-strong` ring instead. |
| **Disabled** | Background `--surface-fill`, text `--text-disabled`, `cursor: not-allowed`, no hover or press. Uses the native `disabled` attribute. |
| **Loading** | Button only: a `loader-circle` spinner (`lb-spin` 800ms linear) replaces the left icon. Also sets `disabled` and `aria-busy`. The label stays, so the width is unchanged. |
| **Error / success** | Input only: a 2px inset ring in `--status-error` / `--status-success`, a message underneath, and the `circle-alert` / `circle-check` icon. |
| **Selected / current** | Tabs: ink text + 2px ink underline. SideNavItem: ink disc + white/ink double ring. Switch: `--status-success` track. Checkbox: ink box. |

### 1.2 Implementation notes (Proposed, impl.)
- The reference components use inline styles plus React hover state. In Tailwind, use `hover:`, `active:`, `focus-visible:` and `disabled:` variants instead of JS state. Keep the values identical.
- `useInteract` clears press when the pointer leaves. CSS `:active` behaves the same way.

---

## 2. Core

### 2.1 Button: Confirmed (pill buttons are Reference-observed)
The main action control. Renders `<button>`, or `<a>` when `href` is set and the button is enabled.

| Prop | Values (default **bold**) |
|---|---|
| `variant` | **`primary`** · `secondary` · `outline` · `brand` · `inverse` · `ghost` |
| `size` | `sm` · **`md`** · `lg` |
| `iconLeft` / `iconRight` | Lucide name |
| `fullWidth` · `disabled` · `loading` | boolean |
| `href` · `type` (**`button`**) · `onClick` | — |

| Variant | Rest | Hover | Press | Text | Border |
|---|---|---|---|---|---|
| primary | `--surface-inverse` | `--surface-inverse-hover` | scale only | `--text-inverse` | transparent |
| secondary | `--surface-fill` | `--surface-fill-hover` | `--surface-fill-active` | `--text-primary` | transparent |
| outline | `--surface-card` | `--surface-fill` | scale only | `--text-primary` | `--border-default` → `--border-strong` on hover |
| brand | `--surface-brand` | `--surface-brand-hover` | scale only | `--lb-ink-950` | transparent |
| inverse (on dark sections) | `--lb-white` | `--lb-gray-100` | scale only | `--lb-ink-950` | transparent |
| ghost | transparent | `--surface-fill` | `--surface-fill-active` | `--text-primary` | transparent |

| Size | Height | Horizontal padding | Font | Icon | Gap |
|---|---|---|---|---|---|
| sm | `--control-sm` 36px | 16px | `--text-body-sm` | 16 | 6 |
| md | `--control-md` 48px | 24px | `--text-body` | 20 | 8 |
| lg | `--control-lg` 56px | 28px | `--text-body` | 20 | 8 |

Common to all sizes: `--radius-button` (pill), weight 600, letter-spacing −0.01em, line-height 1, `nowrap`, 1px border. Transitions are background 120ms `--ease-standard`, border-color 120ms and transform 120ms.

Disabled: background `--surface-fill`, text `--text-disabled`. A disabled button with `href` renders as a `<button disabled>`.

> The classes `h-control-md`, `bg-ink` and `shadow-focus` below are intended keys from `guidelines/tailwind.md`. They aren't defined in this project's Tailwind v4 theme yet, so they render unstyled until they are added. See `design-system.md` §0 "Tailwind CSS v4 compatibility".

```tsx
// Tailwind recipe from guidelines/tailwind.md (primary, md)
<button className="h-control-md px-6 rounded-full bg-ink text-white font-semibold hover:bg-gray-800 active:scale-[.97] focus-visible:shadow-focus">Continue</button>
```

How the screens use it:
- Welcome: "Continue" is `outline` while the username is invalid and `primary` once valid, at `lg`, `fullWidth`.
- Marketing claim: `primary` on light backgrounds, `brand` on dark.
- Feature CTAs override the background with the section's headline colour. This is an inline override, not a variant.

### 2.2 IconButton: Confirmed (DS addition: `label` is required)
An icon-only action.

| Prop | Values |
|---|---|
| `icon` (required) · `label` (required, used for `aria-label` and `title`) | — |
| `variant` | **`fill`** (grey chip) · `ghost` · `white` (floats on the profile canvas, `--shadow-xs`) · `inverse` |
| `size` | `sm` 36 / icon 16 · **`md` 44 / 20** · `lg` 56 / 24 |
| `shape` | **`circle`** (pill) · `rounded` (`--radius-md`) |
| `disabled` | boolean |

Hover follows the variant fill rules (`white` → `--lb-gray-50`). Press is `scale(.94)`. Focus is `--shadow-focus`. The `md` size gives a 44×44 hit target.

### 2.3 Badge: Confirmed · DS addition
A plan or status label, e.g. "Pro" or "Live". It has no interaction.

| Prop | Values |
|---|---|
| `tone` | **`neutral`** · `brand` · `success` · `warning` · `error` · `info` · `inverse` |
| `variant` | **`soft`** (tinted bg, transparent border) · `outline` (transparent bg, coloured border) |
| `size` | `sm`: height 20, padding 0 8, `--text-micro`, icon 12 · **`md`**: height 24, padding 0 10, `--text-caption`, icon 14 |

Pill radius, weight 600, gap 4. Tone colours: neutral uses `--surface-fill` / `--text-primary` / `--border-default`; brand uses `--lb-tangerine-50` / `--text-brand` / `--lb-tangerine-500`; status tones use `--status-*-bg` / `--status-*`; inverse uses `--surface-inverse` / `--text-inverse`. **No Badge appears in the kit screens.**

### 2.4 Avatar: Confirmed
A profile photo with a fallback.

| Prop | Values |
|---|---|
| `src` · `name` (used for alt text and initials) | — |
| `size` | px, default **96**. The `.d.ts` lists: profile 96 · dashboard 72 · rows 40. The kits also use 56 (mobile dashboard), 80, 88, and 79 (≈96×0.82 in the compact preview). |
| `fallback` | **`initials`** (up to 2 letters, uppercased, `@` stripped) · `icon` (`user-round`) |
| `ring` | Adds a 3px white ring |

Circle shape. Fallback background `--lb-gray-300`, white text at 600 weight, font size = round(size × 0.38).

### 2.5 Icon: Confirmed · DS addition
Inlines Lucide or Simple Icons SVG so it inherits `currentColor`.

| Prop | Values |
|---|---|
| `name` | Lucide kebab name, or a Simple Icons slug when `brand` is set |
| `brand` | boolean |
| `size` | default **20** |
| `color` | default `currentColor` |
| `label` | When set, renders `role="img"` with `aria-label`. When omitted, the icon is `aria-hidden`. |

### 2.6 Wordmark: Confirmed · DS addition (there is no logo)
"Linkbase" set in `--font-display` at weight 800, letter-spacing −0.04em, line-height 1.

| Prop | Values |
|---|---|
| `size` | default **24** |
| `color` | default `--text-primary` |

Sizes used in the kits: 30 (Welcome), 26 (SiteNav), 24 (footer), 22 (dashboard footer card), 15 (profile corner chip).

---

## 3. Forms

### 3.1 Input: Confirmed (filled input with URL prefix is Reference-observed)

| Prop | Values |
|---|---|
| `label` | Rendered as a `<label htmlFor>`: `--text-body-sm`, weight 500 |
| `prefix` | Static text such as `linkba.se/`, in `--text-secondary` |
| `iconLeft` | Lucide icon, 20px, `--text-secondary` |
| `size` | `md` (`--control-md`) · **`lg`** (`--control-lg`) |
| `helperText` · `error` · `success` · `disabled` · `trailing` · `type` (**`text`**) | — |

| State | Field background | Ring (inset box-shadow) |
|---|---|---|
| Rest | `--surface-fill` | none |
| Hover | `--surface-fill` | 1px `--border-default` |
| Focus | `--surface-card` | 2px `--border-strong` |
| Success | (as rest or focus) | 2px `--status-success`, plus `circle-check` icon |
| Error (takes priority) | (as rest or focus) | 2px `--status-error`, plus `aria-invalid` |
| Disabled | `--lb-gray-50` | none; text `--text-disabled` |

Layout and message styling:
- Field: radius `--radius-input`, padding 0 16, internal gap 8.
- Spacing: 6px between label, field and message.
- Message: `--text-body-sm`. Error messages show a 16px `circle-alert` icon in `--status-error`; success messages use `--status-success`; otherwise `--text-secondary`.

**Accessibility gap:** the helper and error text aren't linked to the input with `aria-describedby`. Proposed (impl.): give the message an `id` and reference it from the input.

### 3.2 Select: Confirmed · DS addition
A native `<select>` with `appearance: none` and a 20px `chevron-down` at right 16.

| Prop | Values |
|---|---|
| `label` · `options` (`string` or `{value,label}`) · `value` / `defaultValue` · `disabled` | — |
| `size` | `md` · **`lg`** |

Padding is 0 44 0 16, with radius `--radius-input`. On focus, the background becomes `--surface-card` and a 2px inset `--border-strong` ring appears. There are no hover, error or success states: **TBD**.

### 3.3 Switch: Confirmed (the "on" toggle in green is Reference-observed)
Uses `<button role="switch" aria-checked>`.

| Prop | Values |
|---|---|
| `checked` / `defaultChecked` · `onChange(checked)` · `disabled` · `id` | — |
| `label` | Applied as `aria-label`. **Required** when there is no visible label. |
| `size` | `sm` 36×20 · **`md` 48×28**. Thumb = height − 6, inset 3px. |

Tracks:
- On: `--status-success`.
- Off: `--lb-gray-300`.
- Disabled: `--lb-gray-200`.

The thumb is white with `--shadow-xs`. Track transition is `--duration-base --ease-standard`; thumb travel uses `--ease-out`. Focus is `--shadow-focus`. The off track has a 1.50:1 contrast ratio (see `design-system.md` §1.8), so it is **flagged for review**.

### 3.4 Checkbox: Confirmed · DS addition
Uses `<button role="checkbox" aria-checked>` inside a `<label>`.

| Prop | Values |
|---|---|
| `checked` / `defaultChecked` · `onChange` · `disabled` · `label` · `description` | — |

- **Box:** 20×20, radius 6.
- **Unchecked:** 1.5px `--lb-gray-500` border (`--lb-gray-300` when disabled), with a `--surface-card` fill.
- **Checked:** `--surface-inverse` fill and a white 14px `check` (`--lb-gray-300` fill when disabled).
- **Text:** the label is `--text-body`/22px; the description is `--text-body-sm` in `--text-secondary`. The gap is 10.
- **Focus:** `--shadow-focus`.

**Gap (verify):** the text has its own `onClick` *and* sits inside a `<label>` wrapping the button. That may toggle twice per click. Proposed (impl.): use a native `<input type="checkbox">` styled to match.

---

## 4. Navigation

### 4.1 SiteNav: Confirmed (floating pill nav is Reference-observed)
The marketing top navigation, rendered as `<nav>`.

| Prop | Values |
|---|---|
| `links` (labels) · `onLogin` · `onSignup` · `onLinkClick` | — |
| `compact` | Collapses the links into a 44px menu button. The `.d.ts` says to use it below 1024px. |

- **Bar:** height `--nav-height`, padding 0 12 0 28, white, pill radius, `--shadow-nav`, gap 24.
- **Contents:** Wordmark (26) · links · spacer · "Log in" (secondary, hidden when compact) · "Sign up free" (primary).
- **Nav links:** height 44, padding 0 14, `--radius-md`, `--text-body` at 500 weight; hover background `--surface-fill`.
- **Compact menu:** a 44px circular `--surface-fill` button showing `menu`, or `x` when open, with `aria-expanded`. It opens a panel 8px below the bar: white, `--radius-xl`, `--shadow-lg`, padding 12, gap 4. The panel holds left-aligned links and a full-width "Log in" button.
- **Placement (kit):** sticky, 16px from the top, container `--container-max`, side inset 24px (≥768) / 12px.

**Gaps:**
- Nav items are `<button>`s. Proposed (impl.): use `next/link` anchors.
- The menu has no `aria-controls`, no Escape-to-close, and doesn't close on outside click.

### 4.2 AnnouncementBar: Confirmed (dark upsell band is Reference-observed)
A full-width promo or upsell band with `role="region" aria-label="Announcement"`.

| Prop | Values |
|---|---|
| `message` · `actionLabel` · `actionIcon` (default `zap`; `null` hides it) · `onAction` · `onDismiss` (shows a close button when set) | — |
| `tone` | **`inverse`**: ink band, used for the dashboard upsell · `brand`: tangerine band, used for the marketing promo |

- **Band:** min-height `--banner-height`, padding 8 48, centred and wrapping, gap 12, `--text-body-sm` at 500 weight.
- **Action pill:** height 32, padding 0 14, pill, 1.5px border.
  - Inverse tone: tangerine-500 border and tangerine-400 text; on hover it fills tangerine-500 with ink text.
  - Brand tone: ink border; on hover it fills ink with white text.
- **Dismiss:** an 18px `x` positioned at right 12, labelled `aria-label="Dismiss"`.
- **Gap:** neither button shows the custom focus ring explicitly. The global `:focus-visible` rule applies to them.

### 4.3 Tabs: Confirmed (underline tabs are Reference-observed)
| Prop | Values |
|---|---|
| `items` (`{id,label,icon?,count?}`) · `value` / `defaultValue` · `onChange` | — |

Markup is `role="tablist"` with `role="tab"` items carrying `aria-selected`.
- Gap between tabs is 24; each tab has padding 8 0 10 and uses `--text-body` at 500 weight.
- Active: `--text-primary` plus a 2px inset bottom underline in `--border-strong`. Inactive: `--text-secondary`.
- Optional 16px icon. An optional count renders in `--text-caption` / `--text-secondary`.

**Gaps:**
1. There is no arrow-key navigation, no roving `tabindex`, and no `tabpanel` / `aria-controls`.
2. An inline `box-shadow` overrides the global focus ring, so **keyboard focus isn't visible**. Proposed (impl.): follow the WAI-ARIA Tabs pattern and combine the underline with `focus-visible:shadow-focus`.

### 4.4 SideNavItem: Confirmed (icon-chip rail with captions is Reference-observed)
A dashboard rail item. In the kit's mobile layout it is also reused in the bottom bar.

| Prop | Values |
|---|---|
| `icon` · `label` · `active` · `onClick` | — |

- **Item:** a 72px-wide column with gap 6.
- **Disc:** 52×52 circle with a 22px icon.
  - Rest: `--surface-fill`. Hover: `--surface-fill-active`.
  - Active: `--surface-inverse` with an inverse-colour icon and a `0 0 0 3px white, 0 0 0 5px ink` ring.
- **Caption:** `--text-caption`; 600 weight in `--text-primary` when active, 500 in `--text-secondary` otherwise.
- **Current page:** `aria-current="page"`.
- **Gap:** focus relies on the global ring on the `<button>`.

### 4.5 UrlPill: Confirmed (URL pill in the header is Reference-observed)
Shows the user's Linkbase URL, with an optional action.

| Prop | Values |
|---|---|
| `url` · `onClick` (on the URL text) · `onAction` | — |
| `variant` | **`fill`**: height 48, `--surface-fill`, hover `--surface-fill-hover` · `white`: height 52, white, `--shadow-sm` |
| `icon` | Leading Lucide icon, default **`link-2`** (`null` hides it), 18px |
| `action` | **`share`** · `copy` · `close` · `null`. Renders a 36px circular button with aria-label "Share" / "Copy link" / "Dismiss". |

Padding 0 8 0 20, gap 10, pill radius, `--text-body` at 500 weight.

---

## 5. Content

### 5.1 LinkButton: Confirmed (stacked full-width white link buttons are Reference-observed)
A link on the public profile, rendered as an `<a>`.

| Prop | Values |
|---|---|
| `title` · `href` (default `#`) · `thumbnail` · `onMenu` (`null` shows the kebab without a handler; `undefined` hides it) | — |
| `layout` | **`classic`** · `featured` |
| `shape` | **`rounded`** (`--radius-link`) · `pill` · `square` (`--radius-xs`) |
| `theme` | **`fill`** (white) · `outline` (transparent + 2px border in the text colour) · `shadow` (white + `0 4px 0 ink`) · `inverse` (ink background, white text) |

- **Classic:** min-height `--control-lg`, padding 8 52, centred title in `--text-body` at 600 weight, LH 1.3. An optional thumbnail sits 40×40 at left 8 with `--radius-sm`.
- **Featured:** radius `--radius-xl`, padding 10.
  - Image: 16:9 with `--radius-lg`. With no thumbnail, it shows a striped placeholder in `--lb-gray-200`/`--lb-gray-150`.
  - Title: `--text-body-sm` at 600 weight, padding 12 44 6, centred.
- **Kebab:** a 36px circular `ellipsis-vertical` button, `aria-label="More options"`.
- **Hover / press:** `scale(1.015)` on hover, `scale(.98)` on press, using `--duration-base --ease-spring`.

Themes and shapes are creator theme choices. The theme editor UI that selects them is **TBD** (the Design tab is blank).

**Gaps:**
1. The kebab `<button>` is nested inside the `<a>`, which is invalid HTML. Proposed (impl.): make them siblings in a wrapper.
2. An inline `box-shadow` overrides the global focus ring, so **focus isn't visible**. Proposed (impl.): add `focus-visible:shadow-focus`; for the `shadow` theme, combine it with the offset shadow.
3. Thumbnails use `alt=""`. That's correct because the title supplies the link text.

### 5.2 LinkCard: Confirmed (link rows with thumbnail, "N clicks · domain" and kebab are Reference-observed)
An editable link row in the dashboard.

| Prop | Values |
|---|---|
| `title` · `url` · `clicks` (default 0) | — |
| `thumbnail` · `icon` · `brandIcon` | Tile precedence: thumbnail > brandIcon > icon > `link` |
| `enabled` | When defined, renders a `sm` Switch labelled `"Show " + title`. When `false`, the row drops to opacity .6. |
| `onToggle` · `onMenu` · `dragHandle` (shows an 18px `grip-vertical` in `--text-tertiary`) | — |

- **Row:** padding 16 12 16 20 (left 8 with a handle), gap 16, radius `--radius-xl`, `--surface-card`, 1px `--border-subtle` (hover `--border-default`).
- **Tile:** 48×48, `--radius-md`, `--surface-fill`, `--shadow-xs`, 22px icon.
- **Title:** `--text-body` at 600 weight, truncated with an ellipsis.
- **Meta:** `"{n} click(s) · {domain}"` in `--text-body-sm` / `--text-secondary`. The middle dot is `aria-hidden`.
- **Menu:** a 36px circular button, `aria-label="Link options"`; it fills `--surface-fill` while the row is hovered.
- **Gaps:** drag-to-reorder and the options menu aren't implemented (**TBD**). The `.d.ts` doesn't specify keyboard reordering.

### 5.3 SocialIcon: Confirmed
A social profile link, rendered as `<a aria-label={label || network}>`.

| Prop | Values |
|---|---|
| `network` (Simple Icons slug) · `href` · `label` | — |
| `size` | Glyph size, default **28**. The hit area is size + 12 (plain) or size + 24 (circle). |
| `variant` | **`plain`**: ink glyph, opacity .65 on hover · `circle`: white glyph on an ink disc, hover `--lb-gray-800` |

On hover it also moves `translateY(-1px)` over 120ms. **Hit-target gap:** at the profile's 22–24px sizes, the plain variant's hit area is 34–36px, below 44px. TBD.

### 5.4 Card: Confirmed (24px white cards with hairline borders are Reference-observed)
| Prop | Values |
|---|---|
| `variant` | **`outlined`**: `--surface-card` + 1px `--border-subtle` · `elevated`: outlined + `--shadow-card` · `filled`: `--surface-fill` · `color`: section-colour tile, default `--lb-mint-100`, no border or shadow |
| `padding` | default **32** (the `.d.ts` says desktop 32, mobile 20) |
| `background` · `radius` (default `--radius-card`) | — |

Card is a static container. **Don't use coloured left-border accents** (readme).

### 5.5 Accordion: Confirmed (dark FAQ accordion is Reference-observed)
| Prop | Values |
|---|---|
| `items` (`{q,a}`) · `defaultOpen` (index; **-1** means none) | Only one item is open at a time |
| `tone` | **`light`**: `--surface-fill` rows · `dark`: `rgba(0,0,0,.28)` rows with white text |

- Rows are separated by a 12px gap and use `--radius-lg`.
- **Trigger:** padding 22 24, `--text-body-lg` at 600 weight, with a 22px `chevron-down` that rotates 180° when open. It carries `aria-expanded`.
- **Answer:** padding 0 24 24, `--text-body`, LH 1.6. Colour is `--text-secondary` on light, or inherited at opacity .88 on dark. It enters with `lb-fade-up`.
- **Gap:** there's no `aria-controls` / `region` linkage, and no heading wrapper on the trigger. Proposed (impl.): follow the WAI-ARIA Accordion pattern.

---

## 6. Feedback

### 6.1 Toast: Confirmed · DS addition
A transient confirmation with `role="status" aria-live="polite"`.

| Prop | Values |
|---|---|
| `message` · `actionLabel` · `onAction` · `onClose` (shows an 18px `x` button, "Dismiss") | — |
| `tone` (sets the icon and its colour) | **`neutral`** `circle-check` / white · `success` `circle-check` / `--lb-mint-200` · `error` `circle-alert` / `--lb-peach-300` · `info` `info` / `--lb-lilac-200` |

- **Shape:** min-height 52, padding 8 8 8 18, gap 12, pill radius.
- **Colour:** `--surface-inverse` background with `--text-inverse`, `--shadow-lg`.
- **Text:** `--text-body-sm` at 500 weight.
- **Action:** height 36, padding 0 14, white pill with ink text at 600 weight.
- **Entry:** `lb-fade-up` over `--duration-slow`.

How the kits place it: fixed, bottom-centre, 24–28px from the bottom (104px on mobile dashboard, above the bottom bar). They auto-dismiss after 2400–2800ms. Placement and timing aren't part of the component, so the canonical values are **TBD**.

Copy pattern (readme): past tense, e.g. "Link added" or "Copied linkba.se/maya".

### 6.2 Tooltip: Confirmed · DS addition
| Prop | Values |
|---|---|
| `content` · `children` (the trigger) | — |
| `side` | **`top`** · `bottom` (8px offset, horizontally centred) |

- **Appearance:** padding 6 10, `--radius-sm`, `--surface-inverse` background with `--text-inverse`, `--text-caption` at 500 weight, LH 1.3, `--shadow-md`, no wrapping.
- **Behaviour:** opens on hover and focus. It has `role="tooltip"`.
- **Gaps:** there is no `aria-describedby` link to the trigger, no Escape-to-dismiss, and no show delay (**TBD**). The dashboard uses Tooltip on IconButtons that already carry a `title`, which produces a double tooltip. Proposed (impl.): drop `title` when a Tooltip wraps the button.

### 6.3 Dialog: Confirmed · DS addition
| Prop | Values |
|---|---|
| `open` (default true) · `title` · `description` · `children` · `actions` (right-aligned, gap 12, wrapping, 24px top margin) | — |
| `onClose` | Shows a `sm` `fill` IconButton "Close" at top/right 20. Clicking the backdrop also closes the dialog. |
| `width` | max-width, default **480** |
| `inline` | Renders without the overlay (for documentation) |

- **Overlay:** fixed full-screen, z-index 100, padding 16, `--surface-overlay`, content centred.
- **Panel:** padding 32, `--radius-2xl`, `--surface-card`, `--shadow-overlay`. Enters with `lb-fade-up` over `--duration-slow`.
- **Title:** an `<h2>` in `--font-display` at 800, `--text-heading-md`, `--tracking-heading`.
- **Description:** `--text-secondary`, 24px bottom margin.
- **ARIA:** `role="dialog"`, `aria-modal`, `aria-label={title}`.

**Gaps:** there is no focus trap, no initial-focus management (the kit uses `autoFocus` on the first input), no Escape-to-close, no focus restore, and no scroll lock. Proposed (impl.): use the native `<dialog>` element or a headless dialog primitive with identical styling.

---

## 7. Screen patterns and responsive behaviour

Breakpoints are kit thresholds, not tokens (see `design-system.md` §6).

### 7.1 Marketing landing page (`ui_kits/marketing`): Reference-observed structure, proposed hues
Sections in order:

| # | Section | Background → headline | Layout |
|---|---|---|---|
| 1 | AnnouncementBar `brand`, dismissible | Tangerine | — |
| 2 | SiteNav (sticky, overlaid at height 0) | White pill | `compact` below 1024 |
| 3 | Hero: headline, lead, claim form, image | Tangerine-500 → Ink | 2 columns at 1.1fr/.9fr, gap 48 (≥1024); otherwise 1 column. Headline `--text-display-2xl`, 48px below 1024. Image 4:5, or 4:3 on mobile, `--radius-2xl`. |
| 4 | Feature: "Create and customise…" | Ocean-900 → Mint-200, white body | 2 columns, gap 56 (≥1024), text/visual order alternates. Headline `--text-display-lg` / 36px. CTA `lg`. |
| 5 | Feature: "Share your Linkbase…" | Plum-900 → Peach-300 | As above |
| 6 | Feature: "Analyse your audience…" | Mint-100 → Forest-800 | Visual is a 2×2 grid of `Card variant="color"` stat tiles, gap 16, aspect 1.2 |
| 7 | Bento: "The fast, friendly…" | `--surface-app` → Ink | 2 columns, rows `minmax(260px,auto)`, gap 16, the second tile spans 2 rows (≥900); otherwise 1 column |
| 8 | FAQ "Questions? Answered." | Plum-900 → Peach-300 | max-width 820, `Accordion tone="dark"` |
| 9 | CTA + footer | Lilac-800 → Lilac-200 | Claim form (`brand` button). The footer is a white card inset in the section: `--radius-2xl`, padding 40 (24 on mobile), link columns 4 (≥900) or 2. Bottom row: Log in · Get started · social circles; then Wordmark · © line above a hairline. |

- **Section shell:** padding `--section-pad-y` / `--gutter-desktop` (≥768), or `--section-pad-y-mobile` / `--gutter-mobile`. Inner max-width `--container-max`.
- **Headline style:** `--font-display` 800, LH 1.02, `--tracking-display`, `text-wrap: balance`.
- **Claim form:** a white field, height `--control-lg`, padding 0 18, `--radius-md`, `linkba.se/` prefix, plus a `lg` button. It wraps at 220px minimum field width, max-width 520.
- Imagery is placeholders only. Real photography is **TBD**.

### 7.2 Welcome / onboarding (`Welcome.jsx`): Reference-observed
- **Grid:** 2 columns (≥1024): a form column and an art panel. Below 1024: one column, no art.
- **Form column:** padding 36 (24/20 on mobile). Wordmark at 30, then a centred form (max-width 440, gap 24, top margin 72 or 48).
- **Form contents:** H1 "Welcome to Linkbase!" · lead in `--text-body-lg` / `--text-secondary` · Input with the `linkba.se/` prefix · consent line in `--text-body-sm` · full-width `lg` Continue button.
- **Validation (kit logic):**
  - Usernames match `^[a-z0-9._]{3,30}$`, case-insensitive. Whitespace is stripped as you type.
  - Reserved names ("admin", "linkbase", "help") show the error "That username is taken. Try another."
  - A valid name shows the success state with "Nice — linkba.se/{name} is available."
  - Continue is `outline` + disabled until the name is valid, then `primary`.
  - **The real availability API and rules are TBD.**
- **Art panel:** `--lb-butter-300` with rotated decorative cards: a plum profile card with peach pill LinkButtons, a white UrlPill, social circles, and a photo placeholder. It is `aria-hidden`.

### 7.3 Dashboard: content editor (`Dashboard.jsx`): Reference-observed
- **Shell:** an ink background, with an optional `AnnouncementBar` (inverse, "Upgrade", dismissible) at the top. The app canvas (`--surface-app`) sits below with radius 24 24 0 0 while the banner shows. Padding 20 24 40, or 16 16 96 on mobile.
- **Header:** a 3-column grid.
  - Left: back IconButton (ghost).
  - Centre: UrlPill (`fill`, `copy`). Clicking the URL opens the profile; the copy action shows a toast.
  - Right: "Enhance" secondary Button, or an IconButton on mobile.
- **Body:** a centred flex row. The gap is 40 when the phone preview shows (≥1100), else 24.
  1. **Rail** (≥768): a sticky column of SideNavItems (Content, Header, Design, Settings), gap 20, top padding 160.
  2. **Editor:** `Card variant="elevated"`, max-width 600, padding 36 (20 on mobile). It contains:
     - Title "Content" (`--text-heading-md`) with Reorder/Archive IconButtons wrapped in Tooltips.
     - Tabs: Links / Shop.
     - Profile row: Avatar 72 (56 on mobile), name, social icon, and an add-social IconButton.
     - A 2-column button grid: "Add" (primary, opens a Dialog) and "New collection" (secondary).
     - A LinkCard list with gap 12. Each card has a Switch; desktop shows drag handles.
     - A hairline divider, then a "Linkbase footer" toggle card.
  3. **Phone preview** (≥1100): sticky, 300×620, radius 36, `--surface-profile`, `--shadow-preview`. It renders the profile body in compact mode at 0.82 scale. Beside it sits a white tool group with Preview settings / Open profile.
- **Mobile (<768):** the rail becomes a fixed white bottom bar (border-top `--border-subtle`), and the toast sits 104px from the bottom.
- **Add link Dialog:** title "Add a link". Fields: URL (`md`, link icon, required) and Title (optional). Actions: Cancel (secondary) and "Add link" (primary, disabled until a URL is entered). Adding a link shows the toast "Link added".
- **Blank by design:** the Header, Design and Settings rail destinations, the Shop empty state beyond the placeholder, and the kebab/archive/reorder/enhance behaviours are **not in the reference. They are TBD.**

### 7.4 Public profile (`ProfilePage.jsx`): Reference-observed
- **Page:**
  - ≥640: `--surface-backdrop` behind a centred column with max-width `--profile-max`, `--surface-profile`, radius 32 32 0 0, `--shadow-lg`, 32px top offset.
  - <640: a full-bleed `--surface-profile` canvas with no radius or shadow.
- **Top bar:** a white Wordmark chip (height 44, `--radius-md`, `--shadow-xs`; links back in the kit) and a Share IconButton (`white`, `rounded`). The share button shows the toast "Copied linkba.se/{name}".
- **Body:** a centred stack with gap 16.
  - Avatar 96.
  - `@handle`: 24px, 700 weight, −0.02em.
  - Optional bio: 15px, `--text-secondary`.
  - SocialIcons (plain, gap 4).
  - Links (gap 16), in a mix of the featured and classic LinkButton layouts. Hidden links (`on: false`) are filtered out.
- **Footer links:** Cookie preferences · Report · Privacy · Explore Linkbase. 13px, separated by `·`, wrapping.
- **Claim overlay:** a bottom protection gradient (180px, transparent → 85% ink) holding a white UrlPill "linkba.se/you" with a close action, and the line "Join {name} on Linkbase today" in white, 15px. Dismissing it removes the overlay.

---

## 8. Accessibility checklist

### 8.1 Established by the system (Confirmed)
- **Focus visibility:** `--shadow-focus` (2px white + 2px ink) on `:focus-visible`. It is visible on both light and dark grounds. Inputs and selects use an inset 2px ink ring.
- **Icon-only controls** carry labels:
  - IconButton requires `label`.
  - UrlPill actions are labelled "Share" / "Copy link" / "Dismiss".
  - Dismiss buttons are labelled "Dismiss" and the Dialog close button "Close".
  - LinkCard and LinkButton menus are labelled "Link options" and "More options".
  - SocialIcon links use `label || network`.
  - Icon is `aria-hidden` unless it has a `label`.
- **ARIA roles and states:**
  - Switch: `role="switch"` + `aria-checked`. Checkbox: `role="checkbox"` + `aria-checked`.
  - Tabs: `tablist`/`tab` + `aria-selected`. SideNavItem: `aria-current="page"`.
  - Accordion and the SiteNav menu: `aria-expanded`.
  - Dialog: `role="dialog"` + `aria-modal`. Toast: `role="status"` + `aria-live="polite"`. Tooltip: `role="tooltip"`.
  - AnnouncementBar: `role="region"` + `aria-label`. Input: `aria-invalid`. Button: `aria-busy` while loading.
- **Labels:** Input and Select render a `<label htmlFor>` when `label` is set. The marketing claim input uses `aria-label="Username"`. The Switch in LinkCard is labelled "Show {title}".
- **Semantic HTML:** native `<button>`, `<a>`, `<select>` and `<nav>`; the Dialog title is an `<h2>`; the Welcome and dashboard titles are `<h1>`; marketing sections use `<section>` and the footer uses `<footer>`. Decorative separators (`·`) and the Welcome art panel are `aria-hidden`.
- **Disabled controls** use the native `disabled` attribute.
- **Hit targets:** controls are 36–56px high and the IconButton default is 44px. Inputs are 48 or 56px.
- **Contrast:** see `design-system.md` §1.8. All primary text and fill pairings pass AA.

### 8.2 Gaps found in the reference implementation (fixes are Proposed, impl.)
| # | Issue | Where | Proposed fix |
|---|---|---|---|
| 1 | Focus ring hidden because an inline `box-shadow` overrides the global `:focus-visible` rule | Tabs, LinkButton | Add `focus-visible:shadow-focus` explicitly |
| 2 | Interactive element nested inside a link | LinkButton kebab inside `<a>` | Make them sibling elements |
| 3 | Helper and error text not announced | Input | Add `aria-describedby` |
| 4 | Possible double toggle when clicking the label text | Checkbox | Use a native checkbox input |
| 5 | No keyboard model | Tabs (arrows, `tabpanel`), Accordion (`aria-controls`) | Follow the WAI-ARIA APG patterns |
| 6 | No focus trap, Escape, focus restore or scroll lock | Dialog | Native `<dialog>` or a headless primitive |
| 7 | No `aria-describedby`, no Escape; duplicates `title` | Tooltip | Link the tooltip by id and drop `title` |
| 8 | Menu doesn't close on Escape or outside click; no `aria-controls` | SiteNav compact | Add both |
| 9 | Marketing nav items are `<button>`s | SiteNav | Use `next/link` anchors |
| 10 | Avatar initials fallback has no accessible name | Avatar | `role="img"` + `aria-label={name}`, or decorative when a name sits next to it |
| 11 | `--text-tertiary` below 4.5:1; Switch off track below 3:1 | Tokens | Design decision **TBD** |
| 12 | Plain SocialIcon hit area 34–36px at profile sizes | SocialIcon | Min 44px. **TBD** (would change layout) |
| 13 | `prefers-reduced-motion` not handled | All motion | See `design-system.md` §7.3 |
| 14 | Toasts auto-dismiss in 2.4–2.8s | Kit screens | Timing for WCAG 2.2.1 compliance is **TBD** |

---

## 9. Content rules that affect UI (readme)
- **Sentence case everywhere:** "New collection", "Log in", "Sign up free".
- **Button labels:** 1–3 words, verb first: "Add", "Continue", "Upgrade", "Claim your Linkbase".
- **Address the user as "you".** The product is always "Linkbase". URLs are lowercase `linkba.se/name`.
- **Feedback:** confirmations in past tense ("Link added"). Errors say what happened and what to do ("That username is taken. Try another.").
- **Punctuation:** exclamation marks only on welcome moments. Use `·` as the meta separator. No emoji.

---

## 10. Implementation checklist for Next.js (Proposed, impl.)
1. Import `styles.css` (tokens plus base) once in `src/app/layout.tsx`. `styles.css` is not in this repository yet; see §0. Load the fonts with `next/font/google` and assign them to `--font-display` / `--font-sans`.
2. Register the tokens as Tailwind v4 theme variables (`@theme` in `src/app/globals.css`), following `design-system.md` §0 "Tailwind CSS v4 compatibility". `guidelines/tailwind.md` and `design-system.md` §9 are **legacy Tailwind v3 references**: use them only for the intended key names and don't copy their config into this project.
3. Build the 23 components with the prop names and variants above. Keep the `.d.ts` contracts as the TypeScript interfaces.
4. Fix accessibility gaps 1–10 during the port. Gaps 11–14 need design decisions.
5. Leave every TBD screen (Header, Design and Settings editors, Shop, menus, reorder) unbuilt until it is designed.
