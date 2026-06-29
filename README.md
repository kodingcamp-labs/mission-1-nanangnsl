# Misi 1 — Senior VLM Automation

> **KodingCamp: The Real Engineering Simulator**
> Level: Senior Software Engineer · AI Edge & Enterprise Architecture
> Durasi sprint: **14 hari** sejak pembayaran terverifikasi.

## Konteks

Anda baru bergabung sebagai Senior Engineer di tim platform. Perusahaan ingin
mengotomasi pemrosesan dokumen visual (invoice, KTP, formulir) memakai
Vision-Language Model. Prototipe sudah ada — tapi arsitekturnya berantakan:
query N+1 di mana-mana, tipe data longgar, dan tidak ada batas modul yang jelas.

Tugas Anda **bukan menulis fitur baru** — tugas Anda merapikan fondasi supaya
tim bisa scale.

## Objektif

1. Rancang ulang skema database di `src/db/schema.ts` (Drizzle ORM + PostgreSQL):
   relasi `documents` → `extractions` → `review_logs` yang benar, dengan index
   yang dipikirkan, bukan ditebak.
2. Hilangkan pola N+1 di `src/services/document-service.ts` — ganti dengan
   query join/batch yang eksplisit.
3. Perketat semua tipe: tidak boleh ada `any`, semua input tervalidasi Zod
   di boundary.
4. Tulis keputusan arsitektur Anda di `ARCHITECTURE.md` (maksimal 1 halaman —
   senior engineer menulis ringkas).

## Cara Mulai

```bash
npm run setup   # menyiapkan .env + install dependencies
npm run dev     # jalankan entry point
```

## Cara Submit

1. Buat branch: `git checkout -b arch/redesign`
2. Kerjakan objektif di atas — commit kecil-kecil dengan pesan jelas.
3. Buka **Pull Request** ke `main`.
4. **Tech Lead AI** akan me-review PR Anda: N+1 query, ketegasan tipe,
   dan kualitas keputusan arsitektur. Perbaiki sesuai feedback sampai approved.

## Acceptance Criteria

- [ ] Skema relasional dengan foreign key + index yang beralasan
- [ ] Zero query N+1 di service layer
- [ ] Zero `any` — `npm run typecheck` lulus strict mode
- [ ] `ARCHITECTURE.md` menjelaskan trade-off, bukan hanya keputusan
- [ ] PR di-approve oleh Tech Lead AI

Selamat bekerja. Jam terus berjalan. ⏱️
