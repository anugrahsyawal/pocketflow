# Phase 7C.4 — Compact connected shell

Date: 2026-10-26
Authority: DEC-038; implementation authorized, manual PO acceptance pending
Baseline: 63c342f; no new phase, cutover, migration or deployment

## Delivered

Authenticated shell uses max-w-app, 16px safe margins, warm background, primary
blue preview badge and rounded session card. Native details/summary keeps the
session controls collapsed initially and keyboard accessible. Email, check and
logout remain inside this session area; errors remain outside the disclosure so
they cannot be hidden by collapsing it. Login/bootstrap rendering and handlers
are unchanged; ConnectedPockets still remains mounted during session checks.

Removed duplicate large brand heading in the data section and corrected stale
Home/detail, Reports and empty-state copy. Authenticated page has safe-area-aware
bottom padding beyond the fixed navigation. No external avatar/profile upload,
new dependency, router import, financial-store or API contract change.

Visual references: DESIGN.md and iteration-5/home_dashboard_revised.png. Reused
spacing, palette and rounded surfaces, not raw Stitch HTML, photo or hardcoded
money. This remains a development shell, not final production/profile UI.

## Files

- ConnectedApp.tsx: compact authenticated header/session disclosure and padding.
- ConnectedPockets.tsx: data-section heading instead of repeated brand.
- ConnectedPeriodExport.tsx and ConnectedHomeRecent.tsx: accurate navigation copy.
- backend/tests/browser/connectedShell.cjs: new auth/layout/recovery regression.
- Scope, decision log, docs index/current state/sprint/handoff and this walkthrough.

## Evidence

- `npx tsc --noEmit`: passed.
- `npm run build`: passed, 154 modules.
- `npx vite build --mode connected`: passed, 154 modules.
- Existing `npm run dev -- --mode connected --host 127.0.0.1 --port 5175
  --strictPort` preview and sessionPreview API used; no reset/restart needed.
- `node tests/browser/connectedShell.cjs`: passed invalid/valid login, collapsed
  session panel, keyboard Enter disclosure, session check, widths 375/390/430/1280,
  final pocket action above bottom navigation at page end, logout/relogin and
  retained owner-scoped create journal. Simulated GET /me 503 hides sensitive
  screens with visible session error; successful retry restores mounted content.
  Simulated 401 removes private content, and relogin exposes unchanged recovery.
- `node tests/browser/connectedNavigation.cjs`: passed screen focus/visibility,
  locks, privacy and synthetic recovery visibility.
- `node tests/browser/connectedEmptyReport.cjs`: passed current Add shortcut and
  historical return action, with no financial submissions.
- No unexpected console/page errors in these scripts. Auth requests are real;
  the pending journal and session failure/expiry responses use isolated browser
  fixtures. No financial mutation was sent; no server transaction changed.
- Agent inspected .env.connected-shell.png at 390px: compact preview header,
  collapsed session controls, readable Home card and bottom navigation.
- Source/diff review and `git diff --check` passed.

## Limits / review

Manual PO acceptance remains pending. Full backend suite and real financial
mutation replay were not rerun for this UI-only shell change; earlier evidence
belongs to 63c342f. No cross-owner account switch was exercised. Account/profile
editing, all-screen URL routing and production/offline support remain excluded.
Uncommitted local changes; review the compact shell before authorized Git delivery.

## Checkpoint review — 2026-11-01

Reviewed the accumulated source diff and DEC-038 scope; no new blocker found in
the bounded shell change. No implementation changes in this review. Backend
source, dependency manifests and lockfiles remain unchanged. Re-ran
`npx tsc --noEmit`, `npm run build`, `npx vite build --mode connected` (154
modules), `node --check backend/tests/browser/connectedShell.cjs`, and
`git diff --check`: all passed. Preview processes were not running, so browser
tests were not rerun and no database reset was performed. Runtime/screenshot
evidence above is dated 2026-10-26, not a fresh manual acceptance. Recommend
authorized checkpoint commit/push; no new phase or feature added.
