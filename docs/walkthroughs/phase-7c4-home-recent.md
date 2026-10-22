# Phase 7C.4 — Home recent transactions

Date: 2026-10-21. Local/uncommitted, technical checks passed; PO review pending.
Continues approved 7C.4 on top of previous uncommitted carousel/attention without
committing or discarding them. Latest pushed checkpoint remains `a71e3cc`.

## Scope and requirements

Backlog 7.1 / PR-009; existing transaction read API and iteration-5 Home reference.
Three most recent active transactions, across periods, use server ordering
(occurredOn/time/createdAt descending), not a client sort or a partial-ledger sum.
Request is page 1, limit 3, includeArchived false; existing decoder enforces the
limit and rejects archived results, duplicates and malformed records.

Home-only eye control masks recent amounts as well as hero/carousel. Expense is
negative/red, income positive/green, transfer neutral/blue. Date/time are server
Jakarta values. Current/archived pocket/category metadata resolves labels, with
explicit unavailable fallback. Free-text notes are not exposed in this preview.
Loading, empty and error states are distinct. Retry is explicit. Effect cleanup
ignores late results after unmount/retry; 401 uses the existing expiration flow.
Parent refresh after resolved mutations remounts Home. Reads are not claimed to
be an atomic financial snapshot across endpoints.

History link focuses the existing connected history section without modifying
filters or transaction recovery. Individual detail navigation remains pending;
rows do not pretend to be clickable. No backend write/API/schema/dependency
change; existing local mode unchanged.

## Files changed in this continuation

- `frontend/src/features/connected/ConnectedHomeRecent.tsx` (new).
- `ConnectedHomeSnapshot.tsx`: mount and share privacy/client.
- `ConnectedPockets.tsx`: supply existing client/session callback.
- `ConnectedHistory.tsx`: focusable anchor target.
- `backend/tests/browser/homeSnapshot.cjs`: recent amount/privacy, history focus,
  malformed-response retry, empty state and recovery checks.
- Documentation index/current state/sprint/handoff and this walkthrough.

## Commands and evidence

```text
npx tsc --noEmit
npm run build
npm run build -- --mode connected
npx tsx --test tests/integration/frontendTransactionRead.test.ts
node tests/browser/homeSnapshot.cjs
git diff --check
```

Type-check and both builds passed (149 modules). Five transport tests passed on
disposable `pocketflow_test_7b4_windows`, covering pagination, query encoding,
archive/tombstone exclusion, owner isolation and malformed payloads. Full backend
suite not rerun. Existing connected Vite dev server 5175 / preview API 3000 reused.

Edge browser passed existing Home checks plus real fixture expense -Rp18,000 and
neutral Rp100,000 transfer, eleven masked Home amounts, on-page history focus,
malformed-response error/retry, empty result and reload recovery. Error/empty
fixtures intercept only the limit=3 request; no server writes. Initial one-shot
mock was consumed by Strict Mode's discarded request; test now holds each mock
until the next explicit step. Final rerun passed.

375/390/430px no document overflow and no page/unexpected console errors; expected
pre-auth 401/external font failures filtered. Agent inspected ignored screenshot
`backend/.env.home-recent.png`: readable amounts/date and neutral transfer. This
is automated interaction plus agent visual review, not PO manual acceptance.
Source and diff checked; no automatic commit/push.

## Review and limitations

Review recent order, privacy, error recovery and link destination. Lihat riwayat
keeps any existing history filter; recent cards remain independent of that filter.
Overall budget progress, full route/detail integration and mutation-to-screen
reconciliation remain outstanding. No live polling, full Home cutover or Phase
7C.4 completion claimed. Server ties on all existing sort keys retain backend
behavior; no new ordering contract invented here.
