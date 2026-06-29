# Arsitektur — VLM Automation

Catatan keputusan redesign fondasi. Fokus pada *trade-off*, bukan sekadar daftar keputusan.

## 1. Skema relasional (`src/db/schema.ts`)

Prototipe menumpuk segalanya di satu tabel `documents` dengan kolom `text`
serbaguna (`extraction_result` sebagai string JSON, `reviewer_notes` lepas).
Dipecah menjadi tiga tabel dengan kardinalitas nyata:
`documents 1—N extractions 1—N review_logs`.

- **Enum, bukan `text`.** `doc_type`, `document_status`, `review_decision`
  jadi `pgEnum`. Trade-off: menambah nilai baru perlu migrasi enum (bukan
  sekadar `INSERT`). Diterima — integritas nilai terbatas > kemudahan menulis
  string bebas yang berakhir jadi `"Invoice"`/`"invoice"`/`"INV"` campur aduk.
- **`jsonb`, bukan string JSON.** `extractions.raw` queryable & terindeks;
  string yang harus `JSON.parse` di app layer tidak.
- **`numeric(5,4)` untuk confidence**, bukan `text`/`float`. Presisi pasti,
  bisa difilter (`confidence < 0.8`) tanpa galat pembulatan float.
- **FK `ON DELETE CASCADE`.** Hapus dokumen → ekstraksi & log ikut terhapus,
  tidak ada baris yatim. Trade-off: penghapusan jadi destruktif berantai;
  jika kelak butuh audit pasca-hapus, ganti ke soft-delete.
- **`timestamptz` (`created_at`/`updated_at`).** Audit & urutan kejadian.

### Index — beralasan, bukan ditebak
- `extractions(document_id)` & `review_logs(extraction_id)`: tulang punggung
  batch-fetch join (lihat §2). Tanpa ini, join jadi seq-scan.
- `documents(status)`: dashboard memfilter antrian per status.
- `documents(owner_email, status)` (komposit): query "dokumen milik saya yang
  pending". Kolom paling selektif/umum (`owner_email`) di depan.

Index tidak gratis — memperlambat tulis & makan ruang. Tiga di atas dipilih
karena memetakan ke pola baca panas yang konkret, bukan "jaga-jaga".

## 2. Menghapus N+1 (`src/services/document-service.ts`)

Sebelumnya: 1 query daftar + N dokumen + N ekstraksi + N×M log →
±30.001 round-trip untuk 10.000 dokumen.

Sekarang: **3 query, konstan**, apa pun jumlah dokumen.
1. ambil semua dokumen,
2. semua ekstraksi `WHERE document_id IN (ids)`,
3. semua log `WHERE extraction_id IN (ids)`.

Hasil dirangkai in-memory dengan `Map` (`groupBy`), kompleksitas O(n) sekali
lintas. Trade-off: seluruh hasil dimuat ke memori sekaligus — pada volume
sangat besar, perlu paginasi/cursor pada langkah (1) lalu batch (2)/(3) per
halaman. Untuk skala saat ini, kesederhanaan 3-query menang.

`relations.ts` ditambahkan agar pola yang sama bisa diekspresikan sebagai satu
query via `db.query.documents.findMany({ with: { extractions: { with: { reviewLogs: true } } } })`
saat sudah terhubung ke Postgres nyata.

## 3. Ketegasan tipe & validasi boundary

- **Zero `any`.** Tipe baris di-infer dari schema (`$inferSelect`) jadi
  *single source of truth*; service & entry point memakai tipe komposit
  (`DocumentWithExtractions`) — bukan `any`.
- **Zod di boundary.** `ingestDocument` mem-`parse` payload eksternal:
  menormalkan `file_name`/`fileName` & `type`/`docType`, memvalidasi email dan
  nilai enum. Tipe TS di-`z.infer` dari skema Zod → tidak ada drift antara
  validasi runtime dan tipe compile-time. Trade-off: enum domain dideklarasikan
  dua kali (pgEnum + z.enum); keduanya sengaja dijaga sinkron karena DB dan
  boundary API memang dua kontrak berbeda.

`npm run typecheck` lulus pada `strict` + `noImplicitAny`.
