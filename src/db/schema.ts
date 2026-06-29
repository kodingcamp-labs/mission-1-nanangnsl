// Skema warisan prototipe. Banyak yang salah di sini — disengaja.
// Objektif 1: rancang ulang dengan relasi & index yang benar.
import { pgTable, serial, text, varchar } from "drizzle-orm/pg-core";

// TODO(arsitek baru): kenapa semua kolom text? kenapa tidak ada relasi?
// kenapa status disimpan sebagai string bebas? kenapa tidak ada timestamp?

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  fileName: text("file_name"),
  // "invoice" | "ktp" | "form" ... atau apa pun yang dev lama ketik manual
  docType: text("doc_type"),
  status: text("status"),
  // JSON hasil ekstraksi disimpan sebagai string. Ya. String.
  extractionResult: text("extraction_result"),
  reviewerNotes: text("reviewer_notes"),
  ownerEmail: varchar("owner_email", { length: 500 }),
});
