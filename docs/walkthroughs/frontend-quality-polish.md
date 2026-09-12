# Frontend quality polish

Date: 2026-09-12
Status: Implemented; automated checks and bounded browser verification passed;
Product Owner visual review accepted in the current delivery conversation;
commit and push authorized by the Product Owner.

## Authorization and scope

The Product Owner requested frontend refinement before continuing the proposed
free-hosting work, and explicitly asked Codex to implement this polish directly.
This is a bounded exception to the usual PM/reviewer role, not a reassignment of
all future implementation. The work started from clean checkpoint `84af8c9` on
`codex/audit-pocketflow-documentation` and was resumed without discarding changes.

References: `DESIGN.md`, canonical requirements and decisions, Home Stitch
iteration 5 screenshot, and the Reports implementation specification.

No new features, dependencies, backend changes, financial calculation changes,
storage migrations, sync, hosting, or deployment are included. The fixed 26–25
period, Cash/NFC attribution, neutral transfers, and archive/delete policies
remain unchanged. No production data was accessed.

## Delivered changes

- Home: larger independent balance headline, roomier budget summary, clearer
  period chip, consistent white cards and transaction separators. Existing
  horizontal pocket and attention carousels remain horizontal, with hidden
  scrollbars and space for focus outlines.
- Pocket list: white interactive cards, wrapping rows for longer names/amounts,
  and real links supporting keyboard navigation.
- App shell/navigation: retained 480px mobile-first shell, subtle desktop
  elevation, clearer active navigation, larger back target, safe-area-aware
  bottom spacing and elevated central add button.
- Shared cards: explicit background classes no longer compete with the default
  surface color. Green/amber badge text uses darker existing palette tokens.
- Dialogs/sheets: native modal semantics, explicit close control, Escape,
  keyboard focus loop and restoration, background scroll locking, and scrollable
  long content. Existing public component props remain compatible.
- Inputs/buttons: associated labels and error messages, invalid/busy semantics,
  visible keyboard focus and reduced-motion styles.

## Files changed

- `frontend/src/components/layout/{AppShell,BottomNav,TopBar}.tsx`
- `frontend/src/components/ui/{Badge,BottomSheet,Button,Card,Input,Modal}.tsx`
- `frontend/src/components/ui/DialogFrame.tsx` (new)
- `frontend/src/features/home/HomePage.tsx`
- `frontend/src/features/pockets/{PocketCard,PocketListPage}.tsx`
- `frontend/src/styles/globals.css`
- This walkthrough and documentation index/current-state/current-sprint notes.

## Verification actually performed

Commands executed in `frontend`:

```text
npx tsc --noEmit                       PASS
npm run build                         PASS
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Latest build: Vite 5.4.21, 107 modules; JS `index-BcMwBSSR.js` 408.39 kB
(104.07 kB gzip), CSS `index-DZHXlAaa.css` 37.83 kB (7.69 kB gzip).
`git diff --check` passed. Source/diff inspection confirmed no changes to
calculation modules, stores, API contracts, or dependencies.

Browser verification used the Codex in-app browser at `http://127.0.0.1:5173`.
The browser began without setup; the existing demo login and 12-pocket setup
were used. Two local demo expenses were entered through the UI (Transportation
Rp150,000 and Personal Care Rp100,000), with notes starting `Uji tampilan demo`.
These are browser test data, not hardcoded production values or backend records.

| Check | Observed result |
|---|---|
| Home, pockets, history, reports, expense, income, transfer | All seven routes rendered at 375, 390, and 430px viewport settings; 21 checks found no document-level horizontal overflow. Windows scrollbars reduce available content width on scrolling pages. |
| Visual review | Home at 375/390/430px, pocket list and report at 390px, transfer at 430px, and Reports at 1280px reviewed through screenshots. Desktop retained 480px frame. |
| Home empty and populated states | Empty state and populated recent transactions rendered; total changed from Rp5,800,000 to Rp5,550,000 after the two demo expenses. |
| Attention carousel | Transportation and Personal Care showed Waspada; horizontal scrolling reached the second card without page overflow. |
| Home privacy | No `Rp` amounts remained in Home main content when hidden; toggle reported its pressed state; amounts restored when shown. |
| Keyboard pocket navigation | Cash link opened using Enter. |
| Add sheet | Opened above navigation; Shift+Tab from close wrapped to the last enabled action; Escape closed it and focus returned to add trigger. |
| Pocket picker | Search for Transportation returned bank/NFC pockets; selection closed the sheet and restored body scrolling. |
| Reports | Current populated period showed Rp250,000 expense; previous period showed historical empty state; returning to current restored populated data. |
| Runtime console | No error-level messages in reviewed browser logs. Existing React Router future-flag warnings remain. |

## Limitations and handoff

- This is bounded UI verification, not a complete financial regression suite.
  Transfer/income forms were rendered, not submitted; archive/delete/restore,
  CSV contents, and backend integration were not re-tested in this polish.
- Native mobile Safari/Android devices, actual virtual keyboards/notches,
  reduced-motion OS emulation, screen readers, and every modal consumer were
  not independently tested. Native-dialog behavior requires a modern browser.
- PWA/offline shell, mock-auth replacement, sync and legacy setup period drift
  remain outside scope. No claim of production readiness is made.
- Product Owner confirmed the frontend is safe after manual review and authorized
  commit/push. Git history records the delivery commit; this does not imply
  acceptance of unfinished backend or deployment work.
- Recommended review: Home (including horizontal carousels), Pocket, Reports,
  add transaction sheet and all three entry forms. Preview data is local to the
  in-app browser origin; an external browser may require demo login/setup.
