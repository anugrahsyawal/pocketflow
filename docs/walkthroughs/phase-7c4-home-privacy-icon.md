# Phase 7C.4 — Home privacy icon resilience

Date: 2026-10-22. Prior income/transfer evidence committed/pushed as `5016bd1`.
Clean tree before this bounded continuation; new changes remain uncommitted.

## Scope

Fix the observed `visibility` text fallback when Material Symbols cannot load.
ConnectedHomeSnapshot now renders a local inline SVG eye, with a slash in hidden
mode. No new dependency, font download or image-generation asset. PR-009 and
backlog 7.1 privacy behavior preserved; iteration-5 eye location remains unchanged.
The existing button label, pressed state and 44px hit target are unchanged.
SVG is decorative (`aria-hidden`, not focusable); button retains accessible name.
No financial logic, API calls, privacy persistence or route changes.

Files: `frontend/src/features/connected/ConnectedHomeSnapshot.tsx`,
`backend/tests/browser/homeSnapshot.cjs`, docs index/current state/sprint/handoff
and this walkthrough. Other external icon/font usage is outside this fix.

## Commands / verification

```text
npx tsc --noEmit
npm run build
npm run build -- --mode connected
npm run dev -- --mode connected --host 127.0.0.1 --port 5175 --strictPort
# backend directory; existing Playwright runtime
$env:BLOCK_EXTERNAL_FONTS='1'
node tests/browser/homeSnapshot.cjs
git diff --check
```

Type-check and both builds passed (149 modules). Initial runtime attempt failed
because preview services were stopped; PostgreSQL and disposable fixture API
were restarted, then the browser test rerun. The fixture helper reseeded only
`pocketflow_test_7c1_preview`, removing earlier disposable archived test rows;
no personal or production data touched.

Browser assertions block fonts.googleapis.com/fonts.gstatic.com before navigation,
verify the SVG in both states, absence of literal fallback text, minimum target
size and existing privacy behavior. Full Home regression includes mobile widths,
keyboard carousel, unknown values, alerts, recent error/retry and budget cases.
Expected font failures/pre-login 401 are filtered; unexpected errors fail the test.
Full backend suite not rerun for this presentation-only change.

Final browser run passed with fonts blocked. Agent inspected ignored screenshot
`backend/.env.home-privacy-no-font.png`: eye is visible rather than fallback text.
Source/diff reviewed and `git diff --check` passed. Browser automation plus agent
visual review is not Product Owner manual acceptance.

## Limits / next

Review icon in both states. Other external typography/icons may still fall back;
this is not global font hardening or an offline-support implementation. Full
connected navigation/detail remains pending. No PO manual acceptance, production
cutover or full Phase 7C.4 completion claimed.
