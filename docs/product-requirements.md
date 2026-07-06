# Product Requirements — PocketFlow

Version: 0.4  
Status: Approved for Sprint 1 frontend planning  
Owner: Product Owner  
Project role support: Technical PM / Tech Lead

## 1. Product Vision

PocketFlow adalah personal finance tracker berbasis PWA yang membantu user mengelola uang berdasarkan pocket bulanan, mencatat transaksi dengan cepat, memantau sisa uang aman per hari, dan mengevaluasi pengeluaran setiap periode gaji.

Aplikasi dirancang untuk penggunaan pribadi, mobile-first, playful, bebas iklan, self-hosted, aman, dan tidak bergantung pada layanan berbayar.

## 2. Problem Statement

User memiliki sistem budgeting bulanan berbasis pocket Bank Jago, tetapi membutuhkan aplikasi pribadi yang lebih fleksibel untuk mencatat pemasukan, pengeluaran, transfer, cash, kartu NFC, budget mingguan, goal tabungan, dan evaluasi bulanan.

Masalah utama yang ingin diselesaikan:

- mencegah overspending di awal periode;
- memantau pengeluaran kecil yang sering tidak terasa;
- mengetahui sisa uang total dan sisa aman per hari;
- mengevaluasi apakah alokasi budget bulanan sudah sesuai kebutuhan nyata;
- menghindari ketergantungan pada aplikasi pihak ketiga yang memiliki iklan atau keterbatasan kontrol data.

## 3. Target User

| Attribute | Description |
|---|---|
| Primary user | Single personal user |
| Persona | Young professional / early-career IT worker |
| Usage device | Smartphone-first |
| Financial method | Pocket-based budgeting |
| UI preference | Playful/fun, lightweight, practical |
| Deployment preference | Self-hosted PWA |
| Privacy expectation | Private financial data behind login |

## 4. Core Product Principles

1. **Pocket-first** — pocket adalah pusat logika aplikasi.
2. **Fast input** — input transaksi harian harus cepat dan tidak mengganggu.
3. **Daily awareness** — Home harus langsung menjawab kondisi keuangan harian.
4. **Playful but practical** — visual ramah dan fun, tapi tetap jelas untuk data keuangan.
5. **Private and self-hosted** — data pribadi tetap berada dalam kontrol user.
6. **Iterative MVP** — fitur kompleks ditunda sampai fondasi stabil.

## 5. Budget Period

Default budget period adalah tanggal **26 sampai 25** bulan berikutnya.

Contoh:

```text
Periode Juli: 26 Juli – 25 Agustus
```

Laporan default mengikuti periode budget/gaji, bukan bulan kalender 1–31.

## 6. Income and Allocation Pattern

Gaji bulanan user:

```text
Rp5.800.000
```

Gaji masuk tanggal 25 malam dan dianggap aktif/terbagi pada tanggal 26.

Untuk MVP, salary allocation diperlakukan sebagai template alokasi ke pocket. Recurring salary allocation preview masuk fase setelah fondasi transaksi stabil.

## 7. Initial Pocket Template

| Pocket | Monthly Allocation | Group |
|---|---:|---|
| Housing & Utilities | Rp866.500 | Bills |
| Personal Care | Rp133.500 | Daily Spending |
| Food & Groceries | Rp1.300.000 | Daily Spending |
| Transportation | Rp200.000 | Daily Spending |
| Entertainment | Rp200.000 | Daily Spending |
| Sinking Fund | Rp500.000 | Savings & Future |
| Self-Investment | Rp250.000 | Savings & Future |
| Investments | Rp150.000 | Savings & Future |
| Emergency Buffer | Rp200.000 | Savings & Future |
| Term Deposit | Rp2.000.000 | Savings & Future |
| Cash | configurable | Daily Spending |
| NFC Transportation Card | configurable | Daily Spending |

Total fixed allocation: **Rp5.800.000**.

## 8. Pocket Model

PocketFlow menggunakan **single Pocket/Wallet model**.

Semua money container memiliki kedudukan setara:

- Bank Jago-style pockets;
- Cash;
- NFC Transportation Card.

Tidak ada pemisahan antara “Budget Pocket” dan “Payment Wallet” pada Sprint 1.

### Expense Rule

Expense selalu mengurangi saldo pocket yang dipilih.

Contoh:

```text
Expense:
Pocket: Cash
Amount: Rp18.000
Category: Makan siang
```

### Transfer Rule

Transfer memindahkan saldo dari satu pocket ke pocket lain dan tidak dihitung sebagai income atau expense.

Contoh top up NFC:

```text
Transfer:
From: Transportation
To: NFC Transportation Card
Amount: Rp50.000
Type: Top up NFC
```

### Reimbursement Rule

Reimbursement dicatat sebagai transfer antar pocket.

Contoh:

```text
Transfer:
From: Personal Care
To: Food & Groceries
Amount: Rp25.000
Type: Reimbursement
Note: Sabun dibayar pakai cash dari Food & Groceries
```

## 9. Category Model

Category digunakan untuk analisis, bukan pengganti pocket.

Rules:

- category bisa dibuat sendiri;
- category bisa diedit;
- category bisa diarsipkan;
- category scoped per pocket;
- category tidak wajib saat input cepat;
- fallback default: `Uncategorized`.

### Default Categories

#### Food & Groceries

- Sarapan
- Makan siang
- Makan malam
- Snack/jajan
- Minuman
- Groceries
- Minimarket
- Weekend food
- Other

#### Transportation

- MRT
- Ojek online
- Bus/angkot
- Top up NFC
- Weekend transport
- Other

#### Personal Care

- Laundry/deterjen
- Sabun mandi
- Skincare
- Deodoran/parfum
- Haircut
- Other

#### Entertainment

- Hangout
- Coffee/ngopi
- Movie/streaming
- Game
- Social event
- Other

#### Self-Investment

- Buku
- Course
- Certification
- Tools/software
- Learning subscription
- Other

#### Investments

- Reksa dana
- Saham
- Emas
- Learning investment
- Other

#### Housing & Utilities

- Kos
- Internet
- Listrik
- Air
- Admin/fee
- Other

## 10. Transaction Types

### Expense

Flow:

```text
Amount → Pocket → Category → Note optional → Date/time editable → Save
```

Required fields:

- Amount
- Pocket
- Date
- Time

Optional fields:

- Category
- Note
- Merchant
- Receipt group

Quick amount chips:

```text
+3k, +5k, +10k, +15k, +20k, +25k, +50k
```

### Income

Flow:

```text
Amount → Pocket → Source/category optional → Date/time editable → Note optional → Save
```

Income sources:

- Gaji
- Bonus
- Cashback
- Reimbursement
- Other

### Transfer

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

Validation:

- Source and destination cannot be the same.
- Amount must be greater than zero.
- Sprint 1 should not allow negative balance.
- Transfer must not be counted as income or expense.

## 11. Home Dashboard Requirements

Home must answer:

- Berapa total uang saya?
- Berapa sisa spendable periode ini?
- Berapa aman per hari?
- Pocket mana yang butuh perhatian?
- Apa transaksi terakhir saya?

Home must show:

- Greeting: `Hai Kyune 👋`
- Active period: `26 Jul – 25 Agu`
- Total Semua Pocket
- Sisa Spendable
- Aman per hari
- Transportation + NFC combined summary
- Pantauan Pocket
- Transaksi Terakhir
- Privacy hide/show amount button

## 12. Reports Requirements

Sprint 1 report boleh basic.

Reports should show:

- period selector 26–25;
- total income;
- total expense;
- remaining balance/spendable;
- budget vs actual preview;
- weekly usage preview;
- top spending placeholder;
- Sinking Fund recommendation placeholder;
- rule-based insight placeholder.

Mock data should be realistic for salary Rp5.800.000.

## 13. JSON Receipt Requirement

Status: Sprint 2 placeholder only in Sprint 1.

Future behavior:

- app provides “Copy AI Prompt” button;
- user sends receipt photo to external AI;
- external AI returns JSON;
- user pastes JSON into app;
- app validates JSON;
- app previews item-level transactions;
- user confirms save.

Sprint 1 must not implement OCR, scan, or AI API.

Approved placeholder copy:

```text
Paste JSON Struk
Import dari AI eksternal
Akan hadir setelah fondasi transaksi stabil.
```

## 14. Authentication Requirement

Sprint 1 uses mock email/username + password login.

Google Login is not included in Sprint 1.

Mock credential:

```text
email: kyune@example.com
password: pocketflow123
```

Auth rules:

- unauthenticated user redirected to login;
- protected pages require login;
- after login, if setup incomplete, user goes to setup wizard;
- after setup complete, user goes to Home.

## 15. PWA Requirement

Sprint 1 should include basic PWA foundation:

- manifest.webmanifest;
- app name and short name;
- standalone display mode;
- theme color primary blue;
- background color warm cream;
- placeholder icons.

Complex service worker and offline sync are not required in Sprint 1.

## 16. Non-MVP / Deferred Features

Deferred from Sprint 1:

- Google login;
- OCR receipt scanning;
- AI API integration;
- bank sync;
- multi-user;
- shared wallet;
- PIN quick unlock;
- debt/loan tracking;
- advanced recurring transactions;
- full offline sync;
- export/import production flow;
- server backup routine;
- deployment to VM.
