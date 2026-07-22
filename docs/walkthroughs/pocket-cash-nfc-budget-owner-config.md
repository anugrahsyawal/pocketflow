# Konfigurasi Budget Owner di Pocket Cash dan NFC Walkthrough

## 1. Executive Summary

This walkthrough documents the implementation and verification for the task **Konfigurasi Budget Owner di Pocket Cash dan NFC** (`pocket-cash-nfc-budget-owner-config`), including the pre-commit release blocker hotfix for attribution preservation on expense edit.

The "Diambil dari budget" field has been removed from the Add Expense and Edit Expense forms. Instead, budget owner mapping for Cash and NFC Transportation Card is configured directly on their respective Pocket detail pages and saved to Zustand / LocalStorage. New expenses automatically resolve their budget owner attribution based on the payment pocket's configuration.

Furthermore, editing an existing expense without changing its payment pocket preserves its stored `budgetPocketId` so that changing Cash/NFC budget owner mappings in Pocket Detail never retroactively alters stored attribution of historical expenses when edited.

---

## 2. Implemented Business Logic & Rules

- **Form UI Simplification**:
  - Completely removed "Diambil dari budget" picker, helper text, and attribution banners from `AddExpensePage` and `TransactionEditPage`.
  - Form field label reverted to clean "Dari Pocket".
- **Pocket Detail Setting (Cash & NFC)**:
  - Added dedicated section "Budget untuk pengeluaran" on `PocketDetailPage` for Cash and NFC Transportation Card.
  - Displays current budget owner pocket name and emoji with an "Ubah" action.
  - Clicking "Ubah" opens a bottom sheet pocket picker showing active non-archived budget owner options (excluding the payment pocket itself).
  - Added explanatory copy: *"Pengeluaran dari pocket ini akan mengurangi saldonya, lalu dicatat ke budget yang dipilih."*
- **Model & Defaults**:
  - `Pocket` interface extended with optional `budgetOwnerPocketId?: string`.
  - Default seeding: `nfc-card` → `transportation`, `cash` → `food-groceries`.
  - Persisted in Zustand / LocalStorage.
- **Resilience & Fallback**:
  - If a configured budget owner becomes inactive or archived, `getDefaultBudgetPocketId` falls back safely to the payment pocket itself for new expenses.
  - `PocketDetailPage` displays an informative warning if the configured budget owner is inactive.
- **Historical Attribution Preservation on Edit**:
  - Unused `budgetPocketId` state removed from `TransactionEditPage.tsx` clearing all TypeScript build errors.
  - Editing an existing transaction without changing `pocketId` preserves `transaction.budgetPocketId ?? transaction.pocketId`.
  - If the user explicitly changes `pocketId` during edit, `budgetPocketId` is updated to `getDefaultBudgetPocketId(newPocketId, pockets)`.

---

## 3. Files Modified

- `frontend/src/types/pocket.ts` — Added `budgetOwnerPocketId?: string` to `TemplatePocket` and `Pocket` interfaces.
- `frontend/src/data/defaultPockets.ts` — Added default `budgetOwnerPocketId` for Cash (`food-groceries`) and NFC Card (`transportation`).
- `frontend/src/features/pockets/usePocketStore.ts` — Added `updatePocketBudgetOwner` store action and preserved `budgetOwnerPocketId` during setup.
- `frontend/src/lib/balanceCalculations.ts` — Updated `getDefaultBudgetPocketId` helper to prioritize valid `pocket.budgetOwnerPocketId`.
- `frontend/src/features/pockets/PocketDetailPage.tsx` — Added "Budget untuk pengeluaran" card and bottom sheet modal picker for Cash and NFC Card.
- `frontend/src/features/transactions/AddExpensePage.tsx` — Removed "Diambil dari budget" UI; automatically resolves `budgetPocketId` on submit.
- `frontend/src/features/transactions/TransactionEditPage.tsx` — Removed unused `budgetPocketId` state, removed "Diambil dari budget" UI, and updated `handleSubmit` to preserve stored `budgetPocketId` on edit unless payment pocket changes.

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
dist/assets/index-DZ3-zmtr.css   32.96 kB │ gzip:   6.72 kB
dist/assets/index-jHTe205X.js   395.56 kB │ gzip: 100.73 kB
✓ built in 24.49s
Exit code: 0 (PASSED)
```

### 3. Runtime & Browser Verification (`http://localhost:5173/`)
- Console review: **0 errors, 0 warnings**.
- Mandatory 6-step scenario verification passed 100%.

---

## 5. Verification Matrix & Product Criteria

| Skenario Pengujian Wajib | Hasil Ekspektasi | Status |
|-------------------|------------------|--------|
| **a. Expense Cash Awal** | Buat expense Cash Rp25.000 saat owner Cash = Food & Groceries. `budgetPocketId` tersimpan sebagai Food & Groceries. | **PASSED** |
| **b. Ubah Owner Cash** | Ubah owner Cash di Pocket Detail menjadi Entertainment. Konfigurasi tersimpan. | **PASSED** |
| **c & d. Edit Expense Lama** | Edit catatan expense lama (misal: "Sabun mandi"). Transaksi lama TETAP tercatat ke Food & Groceries di Budget vs Aktual. | **PASSED** |
| **e & f. Expense Cash Baru** | Buat expense Cash baru (misal Rp15.000 "Cemilan"). Transaksi baru OTOMATIS tercatat ke Entertainment di Budget vs Aktual. | **PASSED** |
| **g. Ganti Payment Pocket pada Edit** | Jika user mengganti payment pocket saat edit dari Cash ke NFC Card, `budgetPocketId` baru di-resolve ke owner NFC Card (Transportation). | **PASSED** |

---

## 6. Known Limitations / Catatan Backend Masa Depan

- **Penyimpanan Frontend**: Konfigurasi `budgetOwnerPocketId` tersimpan di LocalStorage browser via Zustand store.
- **Kebutuhan Backend Masa Depan**: Endpoint Pocket CRUD backend kelak akan memerlukan kolom/property `budgetOwnerPocketId?: string`.
