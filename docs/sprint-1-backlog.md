# Sprint 1 Backlog — PocketFlow

> **Superseded as active backlog authority (2026-07-21).** Retained temporarily
> as a historical Sprint 1 planning artifact. Use
> [`product/PRODUCT_BACKLOG.md`](product/PRODUCT_BACKLOG.md), which includes a
> legacy-ID mapping. Do not update delivery status in this file.

Version: 0.1  
Status: Approved for frontend implementation planning

## Sprint Goal

Build a mobile-first frontend foundation for PocketFlow with mock authentication, setup wizard, pocket management, category management, manual transaction input, transaction history, basic home dashboard, basic reports, and settings.

Sprint 1 should produce a usable frontend prototype with mock data and local state. Backend, real database, real auth, and full offline sync are not part of Sprint 1.

## Sprint 1 Scope Summary

### In Scope

- Project repository and docs foundation
- Frontend PWA foundation
- Mock login
- Protected routes
- Setup wizard
- Initial pocket template
- Pocket list and pocket detail
- Category management UI
- Expense, income, transfer forms
- Mock transaction state and balance updates
- Transaction history
- Home dashboard
- Basic reports
- Settings
- Sprint 2 placeholders

### Out of Scope

- Real backend
- Real database
- Real authentication server
- Google login
- OCR
- AI API
- Bank sync
- Full offline sync
- Export/backup production flow
- Deployment
- Multi-user

## EPIC 0 — Project Foundation

### Story 0.1 — Initialize Repository Structure

**User Story:**  
As a developer, I want a clean repository structure, so that multiple AI agents can work safely and consistently.

**Priority:** Must Have

**Acceptance Criteria:**

- Repository contains `README.md`.
- Repository contains `DESIGN.md`.
- Repository contains `docs/` folder.
- Repository has a planned `frontend/` folder.
- Repository has a placeholder `backend/` folder or `.gitkeep`.

**Definition of Done:**

- Structure is committed to GitHub.
- Documentation files are readable.

---

### Story 0.2 — Add Project Documentation

**User Story:**  
As a Product Owner, I want requirements and decisions documented, so that project context is not lost between AI agents.

**Priority:** Must Have

**Acceptance Criteria:**

- `docs/product-requirements.md` exists.
- `docs/decision-log.md` exists.
- `docs/ui-ux-handoff.md` exists.
- `docs/sprint-1-backlog.md` exists.
- Key product decisions are captured.

---

## EPIC 1 — Authentication & Setup

### Story 1.1 — Mock Email/Password Login

**User Story:**  
As a user, I want to log in using email/username and password, so that my financial data is not visible without authentication.

**Priority:** Must Have

**Acceptance Criteria:**

- `/login` route exists.
- Login screen uses PocketFlow branding.
- Login form has email/username input.
- Login form has password input.
- Valid mock credential logs user in.
- Invalid credential shows clear error.
- Unauthenticated users cannot access protected pages.
- Google login is not active in Sprint 1.

**Mock Credential:**

```text
email: kyune@example.com
password: pocketflow123
```

---

### Story 1.2 — Protected Routes

**User Story:**  
As a user, I want financial pages protected, so that unauthenticated access is blocked.

**Priority:** Must Have

**Acceptance Criteria:**

- Protected pages redirect unauthenticated users to `/login`.
- Logged-in users can access Home, Pockets, Transactions, Reports, and Settings.
- Logout clears mock session state.

---

### Story 1.3 — Setup Wizard

**User Story:**  
As a first-time user, I want a setup wizard, so that I can configure my budget period and initial pockets before using the app.

**Priority:** Must Have

**Acceptance Criteria:**

- Setup wizard appears after first login if setup is incomplete.
- Wizard contains Welcome screen.
- Wizard contains Budget Period screen.
- Wizard contains Pocket Template screen.
- Wizard contains Initial Balance screen.
- Wizard contains Review & Start screen.
- Completing setup routes user to Home.

---

### Story 1.4 — Default Pocket Template

**User Story:**  
As a user, I want predefined pocket allocation, so that I do not need to create all pockets manually.

**Priority:** Must Have

**Acceptance Criteria:**

- Setup includes all required pockets.
- User can review initial pockets.
- User can set initial balances.
- Monthly allocation is prefilled where applicable.
- Cash and NFC Transportation Card are included as pockets.

**Required Pocket Template:**

| Pocket | Allocation |
|---|---:|
| Housing & Utilities | Rp866.500 |
| Personal Care | Rp133.500 |
| Food & Groceries | Rp1.300.000 |
| Transportation | Rp200.000 |
| Entertainment | Rp200.000 |
| Sinking Fund | Rp500.000 |
| Self-Investment | Rp250.000 |
| Investments | Rp150.000 |
| Emergency Buffer | Rp200.000 |
| Term Deposit | Rp2.000.000 |
| Cash | configurable |
| NFC Transportation Card | configurable |

---

## EPIC 2 — Pocket Management

### Story 2.1 — View Pocket List

**User Story:**  
As a user, I want to view all pockets and balances, so that I understand where my money is allocated.

**Priority:** Must Have

**Acceptance Criteria:**

- `/pockets` route exists.
- Pockets are grouped into Harian, Tagihan, Tabungan & Masa Depan.
- All required initial pockets are visible.
- Each pocket card shows name, icon, balance, progress/status.
- Cash and NFC appear as normal pockets.

---

### Story 2.2 — Pocket Detail

**User Story:**  
As a user, I want to open a pocket detail screen, so that I can inspect balance, progress, recent transactions, and categories.

**Priority:** Must Have

**Acceptance Criteria:**

- Pocket detail route exists.
- Screen shows pocket name and icon.
- Screen shows current balance.
- Screen shows monthly allocation if available.
- Screen shows used amount and remaining amount.
- Screen shows weekly progress.
- Screen shows daily safe amount.
- Screen shows recent transactions.
- Screen shows categories under this pocket.
- Edit Pocket button is visible.

---

### Story 2.3 — Create/Edit/Archive Pocket UI

**User Story:**  
As a user, I want to create, edit, and archive pockets, so that app structure can follow my real financial setup.

**Priority:** Should Have for Sprint 1 frontend

**Acceptance Criteria:**

- Create/Edit Pocket screen or modal exists.
- User can edit name, icon/emoji, group, allocation, balance, spendable flag.
- Archive action is represented in UI.
- Full persistence can remain mock/local state.

---

## EPIC 3 — Category Management

### Story 3.1 — View Categories by Pocket

**User Story:**  
As a user, I want to view categories scoped by pocket, so that my analysis matches my spending habits.

**Priority:** Must Have

**Acceptance Criteria:**

- Category Management screen exists.
- User can select or view categories by pocket.
- Default categories appear for Food & Groceries, Transportation, and Personal Care.
- Uncategorized fallback exists.

---

### Story 3.2 — Add/Edit/Archive Category UI

**User Story:**  
As a user, I want to manage custom categories, so that I can adapt the app to my real spending patterns.

**Priority:** Should Have for Sprint 1 frontend

**Acceptance Criteria:**

- Add Category UI exists.
- Edit Category UI exists.
- Archive Category UI exists.
- Category fields include name, pocket, icon/emoji, and optional color.

---

## EPIC 4 — Transaction Management

### Story 4.1 — Add Expense

**User Story:**  
As a user, I want to record expense quickly, so that I can track spending without friction.

**Priority:** Must Have

**Acceptance Criteria:**

- Add Expense screen exists.
- Flow follows: Amount → Pocket → Category → Note optional → Date/time editable → Save.
- Amount, pocket, date, and time are required.
- Category and note are optional.
- Quick amount chips include +3k, +5k, +10k, +15k, +20k, +25k, +50k.
- Saving expense decreases selected pocket balance.
- If no category is selected, save as Uncategorized.

---

### Story 4.2 — Add Income

**User Story:**  
As a user, I want to record income, so that pocket balance reflects money coming in.

**Priority:** Must Have

**Acceptance Criteria:**

- Add Income screen exists.
- Flow follows: Amount → Pocket → Source/category optional → Date/time editable → Note optional → Save.
- Amount, pocket, date, and time are required.
- Income source options include Gaji, Bonus, Cashback, Reimbursement, Other.
- Saving income increases selected pocket balance.

---

### Story 4.3 — Add Transfer

**User Story:**  
As a user, I want to transfer money between pockets, so that PocketFlow matches real movement of money.

**Priority:** Must Have

**Acceptance Criteria:**

- Add Transfer screen exists.
- Flow follows: From pocket → To pocket → Amount → Transfer type optional → Date/time editable → Note optional → Save.
- Transfer types include Normal, Tarik Tunai, Top up NFC, Reimbursement, Saving allocation.
- Source and destination cannot be the same.
- Transfer decreases source pocket and increases destination pocket.
- Transfer is not counted as income or expense.
- Sprint 1 does not allow negative balance.

---

### Story 4.4 — Transaction History

**User Story:**  
As a user, I want to view transaction history, so that I can review recent financial activity.

**Priority:** Must Have

**Acceptance Criteria:**

- `/transactions` route exists.
- Transactions are grouped by date.
- Search bar exists.
- Filter chips exist.
- Transaction cards show type, title/note, pocket/category or transfer direction, date/time, and amount.
- New transactions appear in history after saving.

---

### Story 4.5 — Transaction Detail/Edit Basic

**User Story:**  
As a user, I want to view and edit transaction details, so that I can correct mistakes.

**Priority:** Should Have for Sprint 1 frontend

**Acceptance Criteria:**

- Transaction detail route exists.
- Detail shows type, amount, pocket/direction, category, date/time, note.
- Edit button exists.
- Delete button exists or placeholder exists.
- Edit screen uses same structure as corresponding add form.

---

## EPIC 5 — Home Dashboard

### Story 5.1 — Financial Snapshot

**User Story:**  
As a user, I want to see my financial condition on Home, so that I immediately know if I am still safe this period.

**Priority:** Must Have

**Acceptance Criteria:**

- Home route exists.
- Home shows greeting.
- Home shows budget period.
- Home shows Total Semua Pocket.
- Home shows Sisa Spendable.
- Home shows Aman per hari.
- Home shows privacy hide/show amount control.
- Home shows recent transactions.

---

### Story 5.2 — Pocket Alerts and Transport Summary

**User Story:**  
As a user, I want pocket alerts and Transportation + NFC summary, so that I know which pocket needs attention.

**Priority:** Must Have

**Acceptance Criteria:**

- Home shows Transportation + NFC combined summary.
- Home shows Pantauan Pocket section.
- Pocket alert uses real pocket names.
- Status labels use Aman, Waspada, Bahaya, or Overbudget.

---

## EPIC 6 — Reports Basic

### Story 6.1 — Basic Report Screen

**User Story:**  
As a user, I want a basic report screen, so that I can preview my period summary.

**Priority:** Must Have

**Acceptance Criteria:**

- `/reports` route exists.
- Report period selector shows 26–25 period.
- Shows total income.
- Shows total expense.
- Shows remaining/sisa balance.
- Shows at least one insight card.
- Shows placeholders for later detailed analytics.

---

## EPIC 7 — Settings and Placeholders

### Story 7.1 — Settings Screen

**User Story:**  
As a user, I want a settings screen, so that I can access account, period, pocket, category, and future data features.

**Priority:** Must Have

**Acceptance Criteria:**

- Settings route exists.
- Settings is accessed from Home avatar/icon.
- Settings includes Account, Sembunyikan Saldo, Periode Budget, Kelola Pocket, Kelola Kategori, Tentang Aplikasi, Keluar.
- Sprint 2 items are visible but disabled/placeholder.

---

### Story 7.2 — Sprint 2 Placeholder Screens

**User Story:**  
As a user, I want future features to appear as clear placeholders, so that I understand what is coming later without thinking the app is broken.

**Priority:** Must Have

**Acceptance Criteria:**

- Placeholder exists for Paste JSON Struk.
- Placeholder exists for Goals.
- Placeholder exists for Offline Sync.
- Placeholder exists for Backup/Restore.
- Placeholder copy says feature will come later.
- Placeholder does not imply active OCR/AI/API behavior.

---

## EPIC 8 — PWA and Mobile Layout

### Story 8.1 — Mobile-first Layout

**User Story:**  
As a mobile user, I want the app to feel comfortable on smartphone, so that daily input is easy.

**Priority:** Must Have

**Acceptance Criteria:**

- App layout works from 390px to 480px width.
- No horizontal scrolling.
- Primary actions are thumb-friendly.
- Cards and buttons have large tap targets.

---

### Story 8.2 — Basic PWA Manifest

**User Story:**  
As a user, I want the app to have PWA foundation, so that it can later be installed on my phone.

**Priority:** Should Have for Sprint 1

**Acceptance Criteria:**

- `manifest.webmanifest` exists.
- App name is PocketFlow.
- Display mode is standalone.
- Theme color uses primary blue.
- Background color uses warm cream.
- Placeholder icons exist or TODO is documented.

---

## Sprint 1 Definition of Done

Sprint 1 is done when:

- frontend project builds successfully;
- mock login works;
- protected routes work;
- setup wizard works;
- final pocket template is used;
- all initial pockets appear;
- pocket detail shows categories;
- category management UI exists;
- expense form works;
- income form works;
- transfer form works and includes Reimbursement;
- transfer does not count as income/expense;
- transaction history updates from mock state;
- Home dashboard reflects mock state;
- Reports basic exists;
- Settings exists;
- Sprint 2 placeholders exist;
- Google Login is not active;
- UI copy is consistently Indonesian;
- bottom navigation is consistent;
- no raw Stitch HTML is pasted as production code.
