// Tipe domain + skema Zod (Objektif 3).
//
// Zod adalah single source of truth untuk validasi di boundary: nilai enum
// di sini disinkronkan dengan enum database di `db/schema.ts`. Tipe TypeScript
// di-infer dari skema Zod (`z.infer`) supaya tidak ada drift antara
// validasi runtime dan tipe compile-time.

import { z } from "zod";

// --- Enum domain (cermin dari pgEnum di schema.ts) -------------------------

export const docTypeSchema = z.enum(["invoice", "ktp", "form"]);
export type DocType = z.infer<typeof docTypeSchema>;

export const documentStatusSchema = z.enum([
  "pending",
  "processing",
  "extracted",
  "reviewed",
  "rejected",
]);
export type DocumentStatus = z.infer<typeof documentStatusSchema>;

// --- Boundary input: payload ingest dari API eksternal ---------------------
// Payload eksternal pakai snake_case dan kadang inkonsisten; di sinilah kita
// menormalkannya menjadi bentuk internal yang ketat. Tidak ada `any` yang lolos.

export const ingestDocumentSchema = z
  .object({
    // Terima `file_name` (kanonik) atau `fileName` sebagai fallback.
    file_name: z.string().min(1).optional(),
    fileName: z.string().min(1).optional(),
    // Terima `type` atau `docType`; harus salah satu nilai enum yang valid.
    type: docTypeSchema.optional(),
    docType: docTypeSchema.optional(),
    email: z.string().email(),
  })
  .transform((raw, ctx) => {
    const fileName = raw.file_name ?? raw.fileName;
    if (!fileName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "file_name (atau fileName) wajib diisi",
        path: ["file_name"],
      });
      return z.NEVER;
    }
    const docType = raw.type ?? raw.docType;
    if (!docType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "type (atau docType) wajib diisi dan harus valid",
        path: ["type"],
      });
      return z.NEVER;
    }
    return { fileName, docType, ownerEmail: raw.email };
  });

// Bentuk input mentah (sebelum validasi) dan hasil ternormalisasi (sesudah).
export type IngestDocumentInput = z.input<typeof ingestDocumentSchema>;
export type IngestedDocument = z.output<typeof ingestDocumentSchema>;

// --- Bentuk hasil agregasi service layer -----------------------------------
// Tipe-tipe ini meng-compose row tabel dari schema.ts menjadi struktur pohon
// yang dikembalikan `processAllDocuments`, tanpa `any`.

import type { Document, Extraction, ReviewLog } from "./db/schema.js";

export interface ExtractionWithLogs extends Extraction {
  reviewLogs: ReviewLog[];
}

export interface DocumentWithExtractions extends Document {
  extractions: ExtractionWithLogs[];
}

export interface ProcessResult {
  count: number;
  documents: DocumentWithExtractions[];
}
