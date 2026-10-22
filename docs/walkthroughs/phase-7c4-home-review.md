# Phase 7C.4 — Consolidated Home review

Date: 2026-10-22. Same-phase review/remediation; prior budget changes preserved.
No commit/push requested or performed. Latest pushed checkpoint: `9d8ed55`.

## Review outcome / findings

- Fixed a malformed-response gap: a positive current allocation with null ratio
  could display copy claiming the allocation was zero. The current-budget decoder
  now enforces null ratio iff allocation is zero. Two rejection cases added to
  the existing decoder test. This follows the approved Reports API contract;
  no new financial threshold or calculation rule is introduced.
- Full detail/navigation remains intentionally incomplete: attention and history
  links focus on-page connected sections. Carousel and recent rows do not provide
  dedicated detail navigation. Existing local-mode detail routes must not be
  silently used for server records. This is remaining delivery, not acceptance.
- Home privacy is scoped to Home; external report/detail stays visible. It resets
  on parent reload/remount. No persistent privacy preference is promised.
- Period changes require existing reload; no midnight timer/live subscription.
  Master-data and recent reads are separate, not an atomic snapshot.
- Payment balances remain separate from budget attribution. Template pairs do
  not alter configured owners or historical expense attribution (DEC-024).
- Complete create/edit/archive/restore-to-Home reconciliation remains outstanding;
  read-only preview fixtures are not evidence that those flows all passed.

## Review scope and files

Source reviewed: ConnectedHomeSnapshot, ConnectedHomeRecent, homeSnapshot,
masterData, reportRead and the parent refresh/anchor behavior. Requirements:
PR-003/006/007/009, backlog 7.1–7.3, Reports aggregate availability contract.
Existing iteration-5 presentation remains the visual reference.

This continuation changes `frontend/src/lib/api/reportRead.ts`,
`backend/tests/integration/frontendHomeBudget.test.ts` and review documentation
(index/current state/sprint/handoff/this file). Other dirty files belong to the
preserved budget implementation, not new unrelated edits.

## Verification commands

```text
npx tsc --noEmit
npm run build
npm run build -- --mode connected
npx tsx --test --test-concurrency=1 tests/integration/frontendHomeBudget.test.ts tests/integration/frontendHomeSnapshot.test.ts tests/integration/frontendMasterData.test.ts tests/integration/frontendTransactionRead.test.ts tests/integration/frontendReportRead.test.ts
node tests/browser/homeSnapshot.cjs
node tests/browser/reportReconciliation.cjs
node tests/browser/reportEmptyActions.cjs
git diff --check
```

Integration suites run serially against disposable `pocketflow_test_7b4_windows`;
browser uses separate fixture preview API 3000/Vite connected dev server 5175.
No production data touched. Full backend suite and PO manual acceptance are not
claimed. Browser scripts filter expected pre-login 401/external font failures;
unexpected console/page errors fail them.

Results: type-check and both builds passed (149 modules); all 27 tests across
the five targeted test files passed. Initial browser run could not reach the
stopped preview; after starting Vite and disposable fixture API, all three
browser scripts passed. This includes Home privacy/mobile/unknown/error/retry,
downloaded CSV reconciliation, and report empty-state CTA/draft/recovery guards.
Agent inspected the refreshed `.env.home-snapshot.png`: aligned paired-card
peek, readable unknown-budget state, recent expense/neutral transfer and Jakarta
daily estimate Rp383,000 (four inclusive days on October 22). No new UI layout
changes were made in this review. `git diff --check` passed. This is automated
browser interaction plus agent visual review, not PO manual acceptance.

## Product Owner review checklist

1. Check total/spendable against individual Transportation, NFC, Food and Cash
   balances; transferring between wallets must not duplicate overall money.
2. Toggle eye: hero, carousel, budget and recent amounts hide together; report
   below remains visible as stated in preview copy.
3. Check missing budget vs known zero, negative remaining and usage above 100%.
4. Swipe paired and other pockets; inspect separate wallet amounts and labels.
5. Check alert order/max-two and that unavailable allocation never implies safe.
6. Check recent expense/transfer formatting, date/time, empty/error/retry states.
7. Follow attention/history anchors and confirm their limited preview destination.

Recommendation: review this preview checkpoint; complete connected navigation/
detail and mutation reconciliation before declaring full Home/7C.4 delivery.
