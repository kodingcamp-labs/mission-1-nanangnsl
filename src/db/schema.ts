// Skema relasional VLM Automation — hasil redesign (Objektif 1).
//
// Prinsip:
// - Tipe ketat di level kolom: enum untuk nilai terbatas, jsonb untuk payload
//   terstruktur, numeric untuk confidence, timestamptz untuk audit.
// - Relasi eksplisit lewat foreign key dengan ON DELETE CASCADE, supaya
//   menghapus dokumen otomatis membersihkan ekstraksi & log review-nya.
// - Index dipikirkan dari pola akses nyata (lookup by FK, filter by status,
//   filter by owner), bukan ditebak.

import {
  pgEnum,
  pgTable,
  serial,
  integer,
  text,
  varchar,
  jsonb,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// --- Enum: nilai terbatas dijaga di level database, bukan string bebas. -----

export const docTypeEnum = pgEnum("doc_type", ["invoice", "ktp", "form"]);

export const documentStatusEnum = pgEnum("document_status", [
  "pending",
  "processing",
  "extracted",
  "reviewed",
  "rejected",
]);

export const reviewDecisionEnum = pgEnum("review_decision", [
  "approved",
  "rejected",
  "needs_changes",
]);

// --- documents -------------------------------------------------------------

export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    fileName: text("file_name").notNull(),
    docType: docTypeEnum("doc_type").notNull(),
    status: documentStatusEnum("status").notNull().default("pending"),
    ownerEmail: varchar("owner_email", { length: 320 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Dashboard memfilter antrian per status (mis. "pending"/"processing").
    statusIdx: index("documents_status_idx").on(table.status),
    // "Dokumen milik saya" — filter per owner, sering dikombinasi dengan status.
    ownerStatusIdx: index("documents_owner_status_idx").on(
      table.ownerEmail,
      table.status,
    ),
  }),
);

// --- extractions -----------------------------------------------------------
// Satu dokumen punya banyak field hasil ekstraksi VLM (total, tanggal, dst).

export const extractions = pgTable(
  "extractions",
  {
    id: serial("id").primaryKey(),
    documentId: integer("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    field: text("field").notNull(),
    value: text("value").notNull(),
    // Confidence VLM 0.0000–1.0000; nullable kalau model tidak melaporkannya.
    confidence: numeric("confidence", { precision: 5, scale: 4 }),
    // Payload mentah/terstruktur dari VLM — jsonb, bukan string ter-stringify.
    raw: jsonb("raw"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Akses utama: "ambil semua ekstraksi untuk dokumen X" → hindari N+1.
    documentIdx: index("extractions_document_id_idx").on(table.documentId),
  }),
);

// --- review_logs -----------------------------------------------------------
// Jejak audit keputusan reviewer manusia atas tiap ekstraksi.

export const reviewLogs = pgTable(
  "review_logs",
  {
    id: serial("id").primaryKey(),
    extractionId: integer("extraction_id")
      .notNull()
      .references(() => extractions.id, { onDelete: "cascade" }),
    reviewerEmail: varchar("reviewer_email", { length: 320 }).notNull(),
    decision: reviewDecisionEnum("decision").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Akses utama: "ambil semua log untuk ekstraksi Y" → hindari N+1.
    extractionIdx: index("review_logs_extraction_id_idx").on(
      table.extractionId,
    ),
  }),
);

// --- Tipe inferred — single source of truth untuk service layer. -----------

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Extraction = typeof extractions.$inferSelect;
export type NewExtraction = typeof extractions.$inferInsert;
export type ReviewLog = typeof reviewLogs.$inferSelect;
export type NewReviewLog = typeof reviewLogs.$inferInsert;
