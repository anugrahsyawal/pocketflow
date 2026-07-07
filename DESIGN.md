# PocketFlow Design System

Version: 1.0
Status: Production — Sprint 1
Source: Google Stitch Iteration 2 (visual reference only)

## Design Philosophy

**Pocket-first. Fast input. Daily awareness. Playful but practical.**

PocketFlow's design is built on a Playful & Practical philosophy for a mobile-first personal finance experience. It moves away from sterile, intimidating banking apps toward a "pocket-based" mental model that feels personal, approachable, and encouraging.

The visual style is a hybrid of **Minimalism** and **Tactile Modernism** — heavy whitespace and a warm base palette to reduce financial anxiety, while using rounded corners and subtle depth to make pockets feel like physical, touchable containers.

## Visual Personality

- Friendly and energetic
- Playful but not childish
- Warm and approachable
- Mobile-native
- Clear and trustworthy
- Not corporate or spreadsheet-like

---

## Color Palette

### App Backgrounds

| Token | Value | Usage |
|---|---|---|
| `background` | `#FFF8F2` | App background (warm cream) |
| `surface` | `#FFFFFF` | Cards and elevated containers |
| `surface-dim` | `#DFD9D2` | Dimmed backgrounds |
| `surface-container` | `#F4EDE6` | Input backgrounds, inactive areas |
| `surface-container-low` | `#F9F2EC` | Subtle container backgrounds |
| `surface-container-high` | `#EEE7E0` | Active containers, progress track |
| `surface-container-highest` | `#E8E1DB` | Most prominent containers |

### Primary Blue

| Token | Value | Usage |
|---|---|---|
| `primary` | `#004AC6` | Main actions, branding, active nav |
| `primary-container` | `#2563EB` | Button hover, active state |
| `on-primary` | `#FFFFFF` | Text/icons on primary |
| `on-primary-container` | `#EEEFFF` | Text on primary container |
| `primary-soft` | `#DBEAFE` | Soft blue backgrounds |
| `primary-fixed` | `#DBE1FF` | Fixed primary backgrounds |
| `primary-fixed-dim` | `#B4C5FF` | Dimmed fixed primary |
| `inverse-primary` | `#B4C5FF` | Primary on dark backgrounds |

### Secondary/Accent Orange

| Token | Value | Usage |
|---|---|---|
| `accent` | `#FD761A` | Quick-add chips, playful highlights |
| `accent-dark` | `#9D4300` | Sprint 2 labels, dark accent text |
| `on-accent` | `#FFFFFF` | Text on accent |

### Semantic Status Colors

Financial health uses a strict traffic-light system:

| Token | Value | Label | Usage |
|---|---|---|---|
| `aman` | `#16A34A` | Aman | Financials within budget |
| `aman-soft` | `#DCFCE7` | — | Aman badge background |
| `waspada` | `#F59E0B` | Waspada | Budget nearing limit |
| `waspada-soft` | `#FEF3C7` | — | Waspada badge background |
| `bahaya` | `#DC2626` | Bahaya | Immediate attention required |
| `bahaya-soft` | `#FEE2E2` | — | Bahaya badge background |
| `info` | `#0EA5E9` | Info | Informational highlights |

### Status Thresholds (Usage-Based)

| Status | Condition |
|---|---|
| Aman | used < 70% of allocation |
| Waspada | used ≥ 70% and < 90% |
| Bahaya | used ≥ 90% and < 100% |
| Overbudget | used ≥ 100% |

Pockets without monthly allocation (Cash, NFC) show as wallet/saldo pockets without budget progress.

### Error

| Token | Value | Usage |
|---|---|---|
| `error` | `#BA1A1A` | Error states |
| `error-container` | `#FFDAD6` | Error backgrounds |
| `on-error` | `#FFFFFF` | Text on error |

### Text

| Token | Value | Usage |
|---|---|---|
| `text-primary` | `#1F2937` | Primary body text |
| `text-secondary` | `#6B7280` | Secondary/supporting text |
| `text-muted` | `#9CA3AF` | Placeholder, disabled text |
| `on-surface` | `#1E1B17` | Text on any surface |
| `on-surface-variant` | `#434655` | Supporting text on surface |

### Borders & Outlines

| Token | Value | Usage |
|---|---|---|
| `border` | `#E5E7EB` | Card borders, dividers |
| `outline` | `#737686` | Focused outlines |
| `outline-variant` | `#C3C6D7` | Subtle outlines |

### Inverse (Dark)

| Token | Value | Usage |
|---|---|---|
| `inverse-surface` | `#33302C` | Overlay backdrops |
| `inverse-on-surface` | `#F6F0E9` | Text on dark overlays |

---

## Typography

Font pairing: **Nunito Sans** (display/headlines) + **Inter** (body/data).

| Token | Font | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| `headline-lg` | Nunito Sans | 32px | 800 | 38px | -0.03em |
| `headline-lg-mobile` | Nunito Sans | 28px | 800 | 34px | — |
| `headline-md` | Nunito Sans | 24px | 800 | 32px | -0.02em |
| `headline-sm` | Nunito Sans | 18px | 700 | 24px | — |
| `amount-lg` | Nunito Sans | 36px | 900 | 44px | -0.04em |
| `amount-md` | Inter | 20px | 800 | 28px | -0.02em |
| `body-lg` | Inter | 16px | 400 | 24px | — |
| `body-sm` | Inter | 14px | 400 | 20px | — |
| `label-caps` | Inter | 12px | 700 | 16px | 0.02em |

### Typography Rules

- Financial amounts are first-class citizens. Use `amount-lg` and `amount-md` with heavier weights.
- Headlines use bold/tightly spaced Nunito Sans for an app-centric feel.
- All microcopy in Indonesian, short conversational tone.

---

## Spacing

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Minimal gaps |
| `sm` | 8px | Tight spacing |
| `md` | 12px | Standard inner spacing |
| `lg` | 16px | Section padding, safe margins |
| `xl` | 24px | Card vertical spacing |
| `2xl` | 32px | Large section gaps |
| `3xl` | 40px | Page-level spacing |
| `safe-margin` | 16px | Screen edge padding |
| `gutter` | 12px | Grid gutter |

---

## Layout

Mobile-first, fluid layout for PWA smartphone usage.

| Property | Value |
|---|---|
| Max app width | 480px |
| Outer margin | 16px (safe-margin) |
| Grid | 4-column fluid |
| Card vertical spacing | 24px (xl) |
| Inner card spacing | 8–12px (sm/md) |
| Thumb zone | Bottom 30% for primary actions |
| Bottom nav height | 64px (h-16) |
| Top bar height | 56px (h-14) |

---

## Shapes & Border Radius

| Element | Radius | Token |
|---|---|---|
| Standard cards | 24px | `rounded-card` |
| Pocket cards | 32px | `rounded-pocket` |
| Buttons & chips | 9999px | `rounded-pill` |
| Input fields | 18px | `rounded-input` |

Shape language is defined by extreme roundedness — friendly, "squishy" tactile feel.

---

## Elevation & Shadows

Visual hierarchy through tonal layers and ambient shadows. Always tint shadows with primary blue, never use harsh black.

| Level | Element | Shadow |
|---|---|---|
| 0 | Background | None (warm cream `#FFF8F2`) |
| 1 | Cards | `0 2px 8px rgba(0, 74, 198, 0.06)` |
| 2 | Active/Interactive | `0 4px 12px rgba(0, 74, 198, 0.08)` |
| 3 | Bottom nav | `0 -2px 10px rgba(0, 74, 198, 0.08)` |
| 4 | Bottom sheets | `0 -8px 32px rgba(0, 74, 198, 0.12)` |

---

## Components

### Pocket Cards

Core visual metaphor. Each card must include:
- Top-right emoji or icon badge
- Clear balance in `amount-md`
- Status pill (Aman/Waspada/Bahaya) using semantic colors
- Progress bar (height 8px) showing budget usage

### Buttons

| Variant | Background | Text | Usage |
|---|---|---|---|
| Primary | `primary` | `on-primary` | Save, Transfer, main CTA |
| Secondary | `primary-soft` | `primary` | Cancel, Edit |
| Ghost | transparent | `text-primary` | Subtle actions |
| Danger | `bahaya` | white | Delete actions |

All buttons: pill-shaped (`rounded-pill`), font-semibold, transition-all.

### Quick-Add Chips

Small orange-accented pill buttons for rapid amount entry: +3k, +5k, +10k, +15k, +20k, +25k, +50k.

### Transaction Inputs

- Amount input: extremely large, centered (`amount-lg`), no border, subtle bottom divider
- Date/time: always editable, defaults to current

### Bottom Navigation

- Fixed 5-item bar: Beranda / Pocket / + / Riwayat / Laporan
- Center "+" is elevated with primary blue background and white icon
- Labels are mandatory (don't rely on icons alone)
- Active state: primary color + filled icon

### Empty States

Use soft emoji with conversational Indonesian copy:
- "🌱 Belum ada transaksi hari ini."
- "📝 Belum ada catatan di pocket ini."

### Privacy Masking

When "Sembunyikan Saldo" is active, all financial amounts display as `••••••` across:
- Home dashboard
- Pocket list and detail
- Transaction history
- Reports
- Related financial summaries

---

## Icons

Use **Material Symbols Rounded** (Google Font) as primary icon set.
Supplement with emoji for pocket icons and decorative elements.

Do not use external image URLs from Google Stitch or other generated sources.

---

## Animations

| Name | Duration | Easing | Usage |
|---|---|---|---|
| `slide-up` | 300ms | ease-out | Bottom sheets |
| `fade-in` | 200ms | ease-out | Overlays, modals |
| `scale-in` | 200ms | ease-out | Centered dialogs |

Micro-animations enhance interactivity: `active:scale-[0.98]` on buttons, smooth transitions on nav state changes.

---

## Constraints

- Do not copy raw Google Stitch HTML as production code
- Do not use external generated image URLs from Stitch
- Product requirements and ui-ux-handoff.md take precedence over Stitch visuals
- No English copy in user-facing UI (except product name and intentional English pocket names)
- Bottom navigation must consistently use: **Beranda / Pocket / + / Riwayat / Laporan**
