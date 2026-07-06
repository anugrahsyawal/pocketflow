# PocketFlow

PocketFlow adalah aplikasi pencatatan keuangan pribadi berbasis web app/PWA yang dirancang untuk membantu user mengelola uang dengan sistem pocket/kantong. Aplikasi ini dibuat untuk penggunaan pribadi, mobile-first, bebas iklan, self-hosted, dan nyaman digunakan harian dari smartphone.

> Product direction: **Pocket-first. Fast input. Daily awareness. Playful but practical.**

## Project Status

Current phase: **Sprint 1 Frontend Foundation**

Sprint 1 berfokus pada pembuatan frontend PWA mobile-first dengan mock data dan mock authentication. Backend, database, API, offline sync penuh, backup server, dan deployment akan dikerjakan pada fase berikutnya.

## Core Goals

PocketFlow bertujuan membantu user untuk:

- mencatat pemasukan, pengeluaran, dan transfer antar pocket;
- mengetahui total saldo semua pocket;
- mengetahui sisa spendable selama periode budget berjalan;
- mengetahui nominal aman per hari;
- memantau pocket yang aman, waspada, bahaya, atau overbudget;
- mengevaluasi pengeluaran berdasarkan periode gaji/budget;
- mengurangi overspending di awal periode;
- tetap punya kontrol penuh terhadap data keuangan pribadi.

## Product Scope

### Sprint 1 Scope

Sprint 1 mencakup:

- login mock menggunakan email/username + password;
- setup wizard awal;
- template pocket awal;
- manajemen pocket;
- manajemen kategori;
- input expense, income, dan transfer;
- riwayat transaksi;
- dashboard Home;
- laporan basic;
- settings basic;
- placeholder untuk fitur Sprint 2.

### Sprint 2 / Later Scope

Fitur berikut belum aktif di Sprint 1:

- Paste JSON Struk;
- Goals;
- Offline input & sync penuh;
- Export CSV;
- Backup/Restore JSON;
- PIN cepat;
- utang-piutang;
- helper reimburse;
- recurring transaction preview;
- reminder/notifikasi.

## Initial Pocket Template

Default budget period adalah tanggal **26 sampai 25** bulan berikutnya.

Initial pocket template:

| Pocket | Monthly Allocation |
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

Total monthly allocation: **Rp5.800.000**.

## Pocket Groups

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

## Transaction Types

PocketFlow mendukung tiga jenis transaksi utama:

1. **Income** — menambah saldo pocket.
2. **Expense** — mengurangi saldo pocket.
3. **Transfer** — memindahkan saldo dari satu pocket ke pocket lain dan tidak dihitung sebagai income atau expense.

## Frontend Recommended Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Zustand atau React Context untuk state ringan
- Mock data untuk Sprint 1
- PWA manifest basic

## Planned Repository Structure

```text
pocketflow/
├── README.md
├── DESIGN.md
├── docs/
│   ├── product-requirements.md
│   ├── decision-log.md
│   ├── ui-ux-handoff.md
│   ├── sprint-1-backlog.md
│   └── qa-checklist.md
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── public/
│   │   ├── manifest.webmanifest
│   │   └── icons/
│   └── src/
│       ├── app/
│       ├── components/
│       ├── features/
│       ├── data/
│       ├── lib/
│       ├── styles/
│       └── main.tsx
└── backend/
    └── .gitkeep
```

## Sprint 1 Mock Login

Sprint 1 menggunakan mock login lokal.

Recommended mock credential:

```text
email: kyune@example.com
password: pocketflow123
```

Google Login tidak masuk Sprint 1. Jika dibutuhkan, Google Login dapat menjadi optional enhancement setelah MVP lebih stabil.

## Development Notes

- Jangan menggunakan raw HTML Google Stitch sebagai kode production.
- Gunakan desain Google Stitch sebagai visual reference.
- Gunakan DESIGN.md sebagai design system source of truth.
- UI copy menggunakan Bahasa Indonesia.
- Bottom navigation harus konsisten: **Beranda / Pocket / + / Riwayat / Laporan**.
- Jangan menambahkan OCR, AI API, bank sync, ads, premium banner, atau subscription flow pada Sprint 1.

## Running Frontend

Instruksi final akan ditambahkan setelah folder `/frontend` dibuat.

Target command:

```bash
cd frontend
npm install
npm run dev
npm run build
```

## Documentation

Dokumen utama project:

- `docs/product-requirements.md`
- `docs/decision-log.md`
- `docs/ui-ux-handoff.md`
- `docs/sprint-1-backlog.md`
