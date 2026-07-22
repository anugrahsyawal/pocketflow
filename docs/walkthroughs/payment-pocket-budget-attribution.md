# Payment Pocket Budget Attribution Walkthrough

Performer: Antigravity
Browser/version: Not captured

## 1. Executive Summary

This walkthrough documents the implementation and verification for the task **Payment Pocket Budget Attribution** (`payment-pocket-budget-attribution`).

Wallets and payment pockets like **Cash** and **NFC Transportation Card** function as equal pockets that receive neutral transfers and reduce their effective balances when paying for expenses, while attributing those expenses to their default or selected budget owner pockets (e.g. Transportation or Food & Groceries) for Budget vs Actual analytics without double counting.

---

## 2. Implemented Business Logic & Rules

- **Data Model**:
  - `Transaction` interface extended with optional `budgetPocketId?: string`.
  - `pocketId` represents the **payment pocket** (the pocket whose balance actually decreases).
  - `budgetPocketId` represents the **budget owner pocket** whose monthly budget is charged for Budget vs Actual analytics.
  - Legacy transactions without `budgetPocketId` fall back gracefully to `pocketId`.
- **Default Owners & Configuration**:
  - NFC Transportation Card -> Default budget owner is **Transportation** pocket (`transportation`).
  - Cash -> Default budget owner is **Food & Groceries** pocket (`food-groceries`).
  - Regular pockets -> Default budget owner is the payment pocket itself (`pocketId`).
  - Budget owner mapping is configured directly on the Pocket Detail page for Cash / NFC Card.
- **Form UI & Attribution Semantics**:
  - Add & Edit Expense forms do **NOT** display a "Diambil dari budget" picker. The form label remains clean ("Dari Pocket").
  - When a new expense is created from Cash or NFC Card, the app resolves the currently configured budget owner and saves `t.budgetPocketId`.
  - Legacy transactions without `budgetPocketId` fall back gracefully to `t.pocketId`.
  - Updating the budget owner configuration in Pocket Detail does **NOT** retroactively alter recorded transaction history. Editing an existing transaction preserves its stored `budgetPocketId` unless the user explicitly changes the payment pocket.
- **Reports & Disclosure Improvements**:
  - `calculatePocketBudgetActuals` attributes expenses to `t.budgetPocketId ?? t.pocketId`.
  - Zero-allocation payment pockets (like Cash / NFC Card) do not show negative remaining budget or overbudget status when expenses are charged to other pockets.
  - Generic transfer labels in expanded disclosure replaced with exact transfer type labels (e.g. *"Top up NFC masuk/keluar"*, *"Tarik tunai masuk/keluar"*).
  - Added disclosure line for payment pockets: *"Pembayaran Melalui Pocket Ini"* and *"Dicatat ke budget: Transportation / Food & Groceries"*.

---

## 3. Files Modified

- `frontend/src/types/pocket.ts` — Added `budgetOwnerPocketId?: string` to `TemplatePocket` and `Pocket` interfaces.
- `frontend/src/types/transaction.ts` — Added `budgetPocketId?: string` to `Transaction` interface.
- `frontend/src/data/defaultPockets.ts` — Set default `budgetOwnerPocketId` for Cash (`food-groceries`) and NFC Card (`transportation`).
- `frontend/src/features/pockets/usePocketStore.ts` — Added `updatePocketBudgetOwner` action and preserved `budgetOwnerPocketId` during setup.
- `frontend/src/lib/balanceCalculations.ts` — Updated `getPocketUsedAmount` and `getDefaultBudgetPocketId` to prioritize valid `pocket.budgetOwnerPocketId`.
- `frontend/src/features/pockets/PocketDetailPage.tsx` — Added "Budget untuk pengeluaran" card with bottom-sheet picker for Cash & NFC Card.
- `frontend/src/features/reports/components/BudgetVsActualPocketChart.tsx` — Updated to display specific transfer breakdown labels and attributed budget payment notes.
- `frontend/src/features/transactions/AddExpensePage.tsx` — Removed "Diambil dari budget" picker; auto-assigns budget owner on submit.
- `frontend/src/features/transactions/TransactionEditPage.tsx` — Removed "Diambil dari budget" picker; preserves stored `budgetPocketId` on submit unless payment pocket changes.
- `frontend/src/features/transactions/TransactionDetailPage.tsx` — Displayed budget attribution details when `budgetPocketId !== pocketId`.
- `frontend/src/features/transactions/TransactionHistoryPage.tsx` — Displayed budget attribution subtext on transaction items.

---

## 4. Actual Command Outputs & Verification

### 1. TypeScript Check (`npx tsc --noEmit`)
```text
$ node ./node_modules/typescript/bin/tsc --noEmit
Exit code: 0 (PASSED - zero errors)
```

### 2. Production Build (`npm run build`)
```text
$ node ./node_modules/vite/bin/vite.js build
vite v5.4.21 building for production...
transforming...
✓ 106 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.52 kB │ gzip:   0.69 kB
dist/assets/index-BamKlZuk.css   32.82 kB │ gzip:   6.69 kB
dist/assets/index-CflJYNXj.js   392.20 kB │ gzip: 100.11 kB
✓ built in 13.25s
Exit code: 0 (PASSED)
```

### 3. Runtime & Browser Verification (`http://localhost:5174/`)
- Console review: **0 errors, 0 warnings**.
- Reports page (`/reports`): Reloaded cleanly without ReferenceError or missing symbol crash.

---

## 5. Verification Matrix & Product Criteria

| Skenario Pengujian | Hasil Ekspektasi | Status |
|-------------------|------------------|--------|
| **1. Transportation → NFC Top Up Rp100.000** | Top up NFC memindahkan Rp100.000 dari Transportation ke NFC Card. Saldo Transportation -100rb, NFC +100rb. Tidak ada expense logged. | **PASSED** |
| **2. Expense MRT Rp18.000 via NFC** | Expense MRT Rp18.000 dibayar dari NFC dengan budget owner Transportation. Saldo NFC -18rb. Expense Budget vs Aktual Transportation bertambah Rp18.000. NFC tidak overbudget. | **PASSED** |
| **3. Food & Groceries → Cash Rp50.000** | Transfer Rp50.000 ke Cash. Saldo Food -50rb, Cash +50rb. Tidak ada expense logged. | **PASSED** |
| **4. Expense Makanan Rp20.000 via Cash** | Expense Rp20.000 dibayar dari Cash dengan budget owner Food & Groceries. Saldo Cash -20rb. Budget vs Aktual Food & Groceries bertambah Rp20.000. | **PASSED** |
| **5. Disclosure Transfer Labels** | Disclosure laporan menampilkan label spesifik (*"Top up NFC keluar"*, *"Top up NFC masuk"*) menggantikan "Transfer biasa keluar". | **PASSED** |
| **6. Edit, Archive, Restore, Delete** | Reaktivitas pengeditan, pengarsipan, pemulihan, atau penghapusan expense memperbarui dampak budget owner tanpa double counting. | **PASSED** |

---

## 6. Known Limitations / Catatan Backend Masa Depan

- **Penyimpanan Frontend**: Attribusikan `budgetPocketId` disimpan secara lokal di LocalStorage browser via Zustand store.
- **Kebutuhan Backend Masa Depan**: Skema payload API backend untuk pembuatan & pembaruan transaksi `expense` akan membutuhkan bidang opsional `budgetPocketId?: string`.
