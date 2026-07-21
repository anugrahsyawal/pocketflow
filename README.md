# PocketFlow

PocketFlow is a single-user, mobile-first personal finance application built
around pockets, fast transaction entry, and period-based awareness.

> Pocket-first. Fast input. Daily awareness. Playful but practical.

## Current status

- Frontend foundation through Reports Phase 6D is implemented and accepted.
- Phase 6D was manually verified and accepted by the Product Owner on
  2026-07-21 at commit `9297f37`.
- Phase 6E (integrated Reports QA and frontend polish) is approved as the next
  technical phase, but must not start until this documentation checkpoint is
  reviewed, committed as one targeted docs commit, pushed, and the worktree is
  clean.
- Backend, production authentication, remote synchronization, production
  backup, and deployment are not implemented.

See [docs/README.md](docs/README.md) for the authoritative documentation map
and [docs/project/CURRENT_STATE.md](docs/project/CURRENT_STATE.md) for the
factual delivery state.

## Approved product direction

The MVP direction includes:

- one personal user;
- pockets and categories;
- expense, income, and transfer transactions;
- a fixed budget period from the 26th through the 25th;
- Goals;
- reports and CSV export;
- local/offline transaction input;
- an installable, mobile-first PWA.

Future or refinement work includes production authentication, remote sync,
JSON receipt import, JSON backup/restore, recurring enhancements, debt and
receivables, reimbursement helpers, quick PIN, and transfer templates.

## Frontend stack

- React 18
- TypeScript 5
- Vite 5
- Tailwind CSS 3
- React Router 6
- Zustand persistence

## Run the frontend

From `frontend/`:

```bash
npm install
npm run dev
```

Verification commands:

```bash
npx tsc --noEmit
npm run build
```

The project currently has no dedicated `test`, `lint`, or `typecheck` npm
script. Do not report those checks as having run unless the corresponding
command was actually executed.

## Repository map

```text
pocketflow/
|-- docs/       Canonical product, delivery, design, and evidence documents
|-- frontend/   Current React application
|-- backend/    Reserved; backend implementation has not started
|-- AGENTS.md   Repository-wide working rules
`-- DESIGN.md   Shared design-system guidance
```

Google Stitch files are visual references. Raw Stitch HTML is never production
source.
