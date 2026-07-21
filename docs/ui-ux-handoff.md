# UI/UX Handoff — PocketFlow

Version: 0.1  
Status: Supporting Iteration 2 handoff
Source: Google Stitch Iteration 2 + DESIGN.md

> The Iteration 2 direction remains supporting evidence for non-Reports screens.
> Section 14 Reports guidance is superseded by the canonical
> [`design/google-stitch/iteration-3/REPORTS_IMPLEMENTATION_SPEC.md`](design/google-stitch/iteration-3/REPORTS_IMPLEMENTATION_SPEC.md).
> Canonical product requirements and recorded Product Owner decisions take
> precedence over examples in this handoff.

## 1. Purpose

This document summarizes the approved UI/UX direction for PocketFlow and provides implementation notes for frontend development.

Google Stitch output is approved as **visual reference**, not production code.

Frontend implementation must rebuild the interface using clean React components, TypeScript, and Tailwind CSS.

## 2. Design Direction

Core design statement:

```text
Pocket-first. Fast input. Daily awareness. Playful but practical.
```

Visual personality:

- friendly;
- playful;
- warm;
- mobile-native;
- clear;
- trustworthy;
- not childish;
- not corporate;
- not spreadsheet-like.

## 3. Design System Source

Use `DESIGN.md` as design system source of truth.

Important visual rules:

- warm cream app background;
- primary blue for main actions;
- rounded cards;
- soft shadows;
- bold amount typography;
- semantic status colors;
- pocket/card visual metaphor;
- Indonesian UI copy;
- good contrast and mobile readability.

## 4. Screen Coverage

Google Stitch produced visual references for:

- Login Screen
- Setup Welcome
- Setup Budget Period
- Setup Pocket Template
- Setup Initial Balance
- Home Dashboard Revised
- Pocket Saya Revised
- Detail Pocket
- Tambah Transaksi bottom sheet
- Catat Pengeluaran
- Tambah Pemasukan
- Tambah Transfer
- Riwayat Transaksi
- Laporan Keuangan
- Pengaturan
- Paste JSON Struk placeholder

## 5. Approved Navigation

Bottom navigation must use:

```text
Beranda / Pocket / + / Riwayat / Laporan
```

Rules:

- Add button is emphasized in the center.
- Add button opens bottom sheet.
- Settings is accessed from avatar/icon on Home.
- Task-focused pages such as Add Expense/Add Transfer can suppress bottom nav.

## 6. Home Dashboard

Home must show:

- greeting: `Hai Kyune 👋`;
- period indicator: `26 Jul – 25 Agu`;
- privacy hide/show amount icon;
- `Total Semua Pocket`;
- `Sisa Spendable`;
- `Aman per hari`;
- `Transportation + NFC` summary;
- `Pantauan Pocket` cards;
- recent transactions.

Copy example:

```text
Food & Groceries: Waspada
Pengeluaran mulai ngebut. Rem sedikit yuk.
```

Implementation corrections:

- Do not use invalid pocket names such as `Shopping`.
- Use actual pocket names from the product requirement.
- Transfer in recent transaction should be neutral, not green income.

## 7. Pocket List

Pocket list should be grouped into:

### Harian

- Food & Groceries
- Cash
- Transportation
- NFC Transportation Card
- Personal Care
- Entertainment

### Tagihan

- Housing & Utilities

### Tabungan & Masa Depan

- Sinking Fund
- Self-Investment
- Investments
- Emergency Buffer
- Term Deposit

Each pocket card should show:

- name;
- icon/emoji;
- current balance;
- monthly allocation if available;
- usage/progress bar;
- status badge.

Status labels:

- Aman
- Waspada
- Bahaya
- Overbudget

## 8. Pocket Detail

Pocket Detail must show:

- pocket name and icon;
- current balance;
- monthly allocation;
- used this period;
- remaining amount;
- weekly progress;
- daily safe amount;
- recent transactions;
- categories under this pocket;
- Edit Pocket button.

Implementation correction:

- Add a section called `Kategori di pocket ini`.

Example for Food & Groceries:

```text
Sarapan
Makan siang
Makan malam
Snack/jajan
Minuman
Groceries
Minimarket
Weekend food
Other
```

## 9. Add Transaction Bottom Sheet

Options:

- Pengeluaran
- Pemasukan
- Transfer
- Paste JSON Struk — Sprint 2

Copy:

```text
Pengeluaran — Catat uang keluar
Pemasukan — Uang masuk
Transfer — Pindah kantong
Paste JSON Struk — Import dari AI eksternal
```

Do not use:

- Auto-Scan;
- OCR;
- Scan otomatis.

## 10. Expense Form

Flow:

```text
Amount → Pocket → Category → Note optional → Date/time editable → Save
```

Required:

- Amount
- Pocket
- Date
- Time

Optional:

- Category
- Note

Quick amount chips:

```text
+3k, +5k, +10k, +15k, +20k, +25k, +50k
```

Implementation correction:

- Use label `Pocket`, not `Sumber Pocket`.
- Use actual pocket names.

## 11. Income Form

Flow:

```text
Amount → Pocket → Source/category optional → Date/time editable → Note optional → Save
```

Sources:

- Gaji
- Bonus
- Cashback
- Reimbursement
- Other

Implementation correction:

- Do not default to generic `Rekening Utama`.
- User should select from actual pocket list.

## 12. Transfer Form

Flow:

```text
From pocket → To pocket → Amount → Transfer type optional → Date/time editable → Note optional → Save
```

Transfer types:

- Normal transfer
- Tarik Tunai
- Top up NFC
- Reimbursement
- Saving allocation

Visual rule:

- Transfer must feel different from expense.
- Show clear direction: `Transportation → NFC Transportation Card`.

Validation:

- source and destination cannot be the same;
- amount must be greater than zero;
- do not allow negative balance in Sprint 1.

## 13. Transaction History

Riwayat Transaksi should show:

- search bar;
- filter chips;
- grouped transaction list by date;
- expense/income/transfer distinction.

Transaction card examples:

```text
🍜 Makan siang
Cash • Makan siang • Hari ini
-Rp18.000
```

```text
🔁 Top up NFC
Transportation → NFC Transportation Card
Rp50.000
```

## 14. Reports Basic

Sprint 1 Reports can be basic.

Show:

- period selector;
- total income;
- total expense;
- remaining/sisa saldo;
- basic insight card;
- preview/placeholder areas for budget vs actual, weekly usage, top spending, and Sinking Fund recommendation.

Mock data should be realistic:

```text
Total Masuk: Rp5.800.000
Total Keluar: Rp1.600.000
Sisa Saldo: Rp4.200.000
```

Avoid unrealistic mock values such as Rp15.4M or Rp12.1M for monthly salary context.

## 15. Settings

Settings screen should show:

- Akun
- Sembunyikan Saldo
- Periode Budget
- Kelola Pocket
- Kelola Kategori
- Ekspor CSV — Sprint 2
- Backup/Restore — Sprint 2
- Status Sinkron — Sprint 2
- Tentang Aplikasi
- Keluar

Settings copy correction:

```text
Sesuaikan preferensi dan kelola data pocket kamu.
```

## 16. Login Screen

Visual direction approved, but implementation must use email/password only in Sprint 1.

Use:

- app logo/name;
- copy: `Kelola uangmu lebih asik dengan sistem kantong.`;
- email/username input;
- password input;
- login button;
- clear error message.

Do not implement active Google login in Sprint 1.

## 17. Setup Wizard

Required setup screens:

1. Welcome
2. Budget Period
3. Pocket Template
4. Initial Balance
5. Review & Start

Budget period default:

```text
Start day: 26
Example display: 26 Jul – 25 Agu
```

Implementation correction:

- Setup Pocket Template must use final pocket list and allocations.
- Do not use generic template names like `Food`, `Transport`, `Housing` only.
- Use exact pocket names from requirements.

## 18. Placeholder Screens

Sprint 2 placeholders should look polished and intentional.

Required placeholders:

- Paste JSON Struk
- Goals
- Offline Sync
- Backup/Restore

Paste JSON Struk copy:

```text
Paste JSON Struk
Import dari AI eksternal
Akan hadir setelah fondasi transaksi stabil.
```

Avoid illustrations/copy that imply internal OCR is active.

## 19. Implementation Warnings

Do not:

- copy raw Stitch HTML;
- use external generated image URLs from Stitch;
- keep English labels mixed with Indonesian labels;
- show active Google login;
- use generic pocket names;
- treat transfer as income/expense;
- add OCR, AI API, bank sync, ads, subscription, or premium banners.

## 20. Handoff Status

Status: **Approved for Antigravity frontend implementation.**

Expected implementation approach:

- React + TypeScript + Vite;
- Tailwind CSS;
- reusable components;
- mock state;
- mock auth;
- mobile-first PWA shell;
- Sprint 2 placeholders clearly marked inactive.
