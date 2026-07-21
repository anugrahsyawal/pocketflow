# PocketFlow Reports - Google Stitch Iteration 3

Status: Approved Reports visual reference
Owner: Product Owner
Scope: Canonical Reports layout and its current, historical, and empty states

## Primary authority within this folder

1. [Reports implementation specification](REPORTS_IMPLEMENTATION_SPEC.md)
2. Current PocketFlow product requirements and recorded decisions
3. Existing PocketFlow design system and application shell
4. Stitch screenshots
5. Raw Stitch HTML

Product requirements and Product Owner decisions remain authoritative across
the repository. This order only classifies implementation material within the
Reports design set.

## Reference files

Current populated:

- `screenshots/laporan_keuangan_canonical_current-screen.png`
- `raw-export/laporan_keuangan_canonical_current-code.html`

Historical populated:

- `screenshots/laporan_keuangan_canonical_historical-screen.png`
- `raw-export/laporan_keuangan_canonical_historical-code.html`

Empty:

- `screenshots/laporan_keuangan_canonical_empty-screen.png`
- `raw-export/laporan_keuangan_canonical_empty-code.html`

All three states share one canonical React layout. Screenshots support visual
comparison; HTML exports are raw-only references.

## Do not copy from Stitch

- external CDN dependencies, remote fonts, images, or avatars;
- generated top header, visibility control, or BottomNav;
- English navigation labels;
- hardcoded amounts, dates, percentages, or chart values;
- global scrollbar hiding or unsupported Tailwind tokens.

Use the existing PocketFlow AppShell, BottomNav, components, routes, stores,
financial rules, and design tokens. Minimize external runtime font/icon
dependencies so the future offline PWA is not coupled to network availability.
