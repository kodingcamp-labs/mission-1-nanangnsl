# Dev TODO

## Misi 1 — Senior VLM Automation: Redesign Fondasi — 2026-06-29










sdsdsdsdsd

**Deskripsi:** Merapikan fondasi prototipe VLM Automation tanpa menambah fitur baru.
Empat objektif: (1) rancang ulang skema Drizzle dengan relasi + index yang benar,
(2) hilangkan pola N+1 di service layer, (3) perketat tipe (zero `any`) + validasi
Zod di boundary, (4) tulis `ARCHITECTURE.md` ringkas yang menjelaskan trade-off.

**File yang terlibat:**
- `src/db/schema.ts` — rancang ulang: 3 tabel relasional (documents → extractions → review_logs), enum, FK, index, timestamp, jsonb.
- `src/db/relations.ts` (baru) — definisi relasi Drizzle untuk query join/with.
- `src/services/document-service.ts` — ganti N+1 tiga tingkat dengan batch fetch (3 query) + grouping via Map; tambah Zod untuk `ingestDocument`.
- `src/types.ts` (baru) — tipe domain + skema Zod sebagai single source of truth.
- `src/index.ts` — hapus `any`, sesuaikan dengan tipe baru.
- `ARCHITECTURE.md` (baru) — keputusan & trade-off, maksimal 1 halaman.

**Langkah-langkah:**
- [x] Clone repo, baca semua sumber & config, jalankan `npm run setup`.
- [x] Buat branch `solusi`.
- [x] Rancang ulang `src/db/schema.ts` (enum, FK cascade, index beralasan, timestamp).
- [x] Tambah `src/db/relations.ts` untuk relasi Drizzle.
- [x] Buat `src/types.ts`: tipe domain + Zod schema (DocType, Status, ingest payload).
- [x] Refactor `document-service.ts`: batch fetch (3 query) + Map grouping, Zod di `ingestDocument`, zero `any`.
- [x] Update `src/index.ts`: hapus `any`, tipe eksplisit.
- [x] Tulis `ARCHITECTURE.md` (trade-off, ringkas).
- [x] `npm run typecheck` lulus strict mode (zero error) — terverifikasi, `npm run dev` jalan.
- [ ] Commit kecil-kecil, push, buka PR ke `main`.

**Catatan:**
- README menyarankan branch `arch/redesign`, tetapi instruksi pemberi tugas memakai `solusi`. Pakai `solusi`.
- `fakeDb` adalah simulasi store; refactor N+1 dibuat mencerminkan pola batch/join Drizzle nyata (WHERE ... IN) agar acceptance criteria "zero N+1" terpenuhi secara arsitektural.
- Tech Lead AI me-review tiap push; siap iterasi sampai approved.
