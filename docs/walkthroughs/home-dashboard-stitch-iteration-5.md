# Home Dashboard Completion — Google Stitch Iteration 5 Walkthrough

## 1. Executive Summary

This walkthrough documents the implementation and verification for **Home Dashboard Completion** based on Google Stitch Iteration 5 visual design reference (`docs/design/google-stitch/iteration-5/home_dashboard_revised.png`), incorporating the latest layout, spacing, scrollbar hiding, and accessibility corrections.

The Home page (`/`) follows a clean, mobile-first hierarchy with time-based greetings, fixed 26–25 budget period label, Home-scoped privacy toggle (hiding all monetary amounts), dynamic "TOTAL SEMUA POCKET" hero card with 2-column metrics ("Sisa spendable" & "Aman per hari"), horizontal pocket summary carousel combining Transportation+NFC and Food+Cash, horizontal attention required carousel, and max 3 latest active transactions. Duplicate Quick Action cards and redundant menu lists have been removed.

---

## 2. Requirements & Business Rules Implemented

- **TypeScript Gate & Safety**:
  - Safe parsing of `period.endDate` against undefined split values (`parts[0] ?? year`, `parts[1] ?? month`, `parts[2] ?? day`).
  - Corrected `pocket.emoji` usage across all pocket cards.
  - Zero TypeScript build errors (`npx tsc --noEmit` exit 0).
- **Header & Navigation**:
  - Time-based greeting (`Selamat pagi / siang / sore / malam, [Name] 👋`).
  - Period chip displaying the fixed 26–25 active budget cycle (`period.label`).
  - Profile avatar linking to `/settings` with minimum 44px tap target (`min-h-[44px] min-w-[44px]`).
- **Privacy Mode (`isPrivate`)**:
  - Eye toggle icon in hero header card (`visibility` / `visibility_off`) with 44px tap target.
  - When enabled, masks all monetary amounts on Home with `••••••••` (Total, spendable, safe per day, budget totals, pocket card balances, and transaction amounts).
- **Hero Card "TOTAL SEMUA POCKET"**:
  - Displays total effective balance across all active pockets.
  - Overall status pill (`AMAN` / `WASPADA` / `BAHAYA`).
  - 2-column metrics:
    - `Sisa spendable`: total spendable balance.
    - `Aman per hari`: dynamically calculated as `max(0, floor(spendableBalance / remainingDaysInPeriod))` where `remainingDaysInPeriod` is inclusive of today.
  - Budget progress bar and text showing used allocation out of total monthly allocation, plus remaining budget.
- **Ringkasan Pocket Horizontal Carousel**:
  - Carousel first card aligned to the **exact same left margin** as section title and hero card (removed `-mx-4 px-4` offset).
  - Scrollbars hidden across all browsers using `[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`.
  - Horizontal swipeable carousel with `snap-x` and peekable ~85% width cards (`w-[85%] min-w-[280px] max-w-[320px] flex-shrink-0 snap-start`).
  - Card 1: Combined `Transportation + NFC` showing Transportation balance, NFC card balance, combined total available, and status badge based on Transportation budget.
  - Card 2: Combined `Food & Groceries + Cash` showing Food balance, Cash balance, combined total available, and status badge based on Food budget.
  - Cards 3..N: All other active non-archived pockets as individual cards (e.g. Housing, Personal Care, Entertainment, Sinking Fund, etc.). Cash/NFC are not duplicated.
  - Header link `Lihat semua` navigates to `/pockets`.
- **Section "Butuh Perhatian"**:
  - Displays maximum 2 active budget-owner pockets that are in `waspada`, `bahaya`, or `overbudget` status.
  - Uses the same left margin, horizontal scrollbar hiding, and peekable ~85% width cards.
  - Cash and NFC Card are excluded from standalone alert cards as their expenses are attributed to budget owners.
  - When all pockets are safe, displays a light positive state: `Semua Pocket masih aman. Lanjutkan kebiasaan baikmu. 🌟`.
- **Section "Transaksi Terbaru"**:
  - Displays maximum 3 latest active transactions.
  - Label, emoji/symbol, pocket subtext, and right-aligned single-line amount (`whitespace-nowrap flex-shrink-0 font-display font-bold`).
  - Transfers (including NFC Top-up) styled with neutral primary blue color (not green income color).
  - Privacy toggle masks transaction amounts.
  - Empty state directs users to use the middle `+` button.
- **Accessibility & Semantics**:
  - All interactive carousel cards and transaction rows converted to semantic `<button type="button" onClick={...}>` elements.
  - All tap targets meet or exceed minimum 44px height.
  - Text alignment set to `text-left` on all interactive buttons.
- **Cleanup of Duplicates**:
  - Removed Quick Action cards block.
  - Removed duplicate "Pocket Saya" menu card.
  - Removed duplicate "Riwayat Transaksi" menu card.

---

## 3. Files Modified

- `frontend/src/features/home/HomePage.tsx` — Complete UI update according to Google Stitch Iteration 5 layout, alignment, scrollbar hiding, and accessibility requirements.

---

## 4. Build & Type-Check Verification

### 1. TypeScript Check (`npx tsc --noEmit`)
```text
$ node ./node_modules/typescript/bin/tsc --noEmit
Exit code: 0 (PASSED - 0 errors)
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
dist/assets/index-C_8ljQzP.css   34.26 kB │ gzip:   6.96 kB
dist/assets/index-BtPRAAaL.js   403.83 kB │ gzip: 102.44 kB
✓ built in 9.45s
Exit code: 0 (PASSED)
```

### 3. Runtime & Browser Verification (`http://localhost:5173/`)
- Console review: **0 errors, 0 warnings**.

---

## 5. Manual Verification Results

| Skenario Pengujian | Perilaku & Hasil Aktual | Status |
|-------------------|-------------------------|--------|
| **1. Header & Sapaan** | Sapaan waktu ("Selamat sore, Kyune 👋"), period chip ("26 Jun – 25 Jul 2026"), dan avatar profil yang mengarah ke `/settings` dengan tap target min 44px. | **PASSED** |
| **2. Privacy Mode Toggle** | Menekan ikon mata menyembunyikan seluruh nominal pada Beranda menjadi `••••••••`. Menekan kembali membuka nominal. | **PASSED** |
| **3. Hero Card Metrics** | Hero "TOTAL SEMUA POCKET" menampilkan total saldo, status pill, `Sisa spendable`, `Aman per hari` (dinamis dengan parsing tanggal aman), dan progress bar anggaran. | **PASSED** |
| **4. Alignment & Scrollbar Carousel** | Kartu pertama sejajar dengan header section & hero card (tidak menempel tepi). Scrollbar tersembunyi bersih (`[scrollbar-width:none]`). bagian kartu berikutnya terlihat di kanan (peekable). | **PASSED** |
| **5. Butuh Perhatian** | Menampilkan maks 2 Pocket status Waspada/Bahaya dengan carousel horizontal & hidden scrollbar yang sama. Jika semua Pocket aman, menampilkan pesan positif `Semua Pocket masih aman...`. | **PASSED** |
| **6. Transaksi Terbaru** | Menampilkan maks 3 transaksi terbaru. Transfer ditampilkan dengan warna biru netral. Sembunyi nominal saat mode privacy aktif. | **PASSED** |
| **7. Aksesibilitas Semantik** | Kartu carousel dan baris transaksi menggunakan elemen semantik `<button type="button">` dengan target tap min 44px. | **PASSED** |
| **8. Mobile Viewports (375/390/430px)** | Diuji pada lebar 375px, 390px, dan 430px; seluruh komponen seimbang tanpa page-level horizontal overflow. | **PASSED** |

---

## 6. Known Limitations

- **Privacy Toggle Scope**: Toggle privacy bersifat lokal untuk tampilan Beranda.
- **Offline Shell**: Tidak ada Service Worker; aplikasi memerlukan koneksi internet untuk font/ikon eksternal.
