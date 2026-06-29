// Service layer — hasil redesign (Objektif 2 & 3).
//
// Objektif 2: N+1 tiga tingkat diganti dengan 3 batch query (daftar dokumen,
//   semua ekstraksi via WHERE document_id IN (...), semua review log via
//   WHERE extraction_id IN (...)) lalu di-stitch in-memory pakai Map. Jumlah
//   round-trip ke DB konstan (3), tidak tumbuh dengan jumlah dokumen.
// Objektif 3: zero `any` — semua tipe eksplisit dari schema.ts/types.ts,
//   input `ingestDocument` divalidasi Zod di boundary.

import type { Document, Extraction, ReviewLog } from "../db/schema.js";
import {
  ingestDocumentSchema,
  type IngestDocumentInput,
  type IngestedDocument,
  type DocumentWithExtractions,
  type ExtractionWithLogs,
  type ProcessResult,
} from "../types.js";

// Simulasi data store (di produksi: PostgreSQL via Drizzle).
//
// Catatan: di Drizzle nyata, tiga method di bawah berkorespondensi dengan:
//   db.select().from(documents)
//   db.select().from(extractions).where(inArray(extractions.documentId, ids))
//   db.select().from(reviewLogs).where(inArray(reviewLogs.extractionId, ids))
// — masing-masing SATU round-trip, apa pun jumlah barisnya.
const fakeDb = {
  async getAllDocuments(): Promise<Document[]> {
    const now = new Date();
    return Array.from({ length: 50 }, (_, i): Document => ({
      id: i + 1,
      fileName: `doc-${i + 1}.pdf`,
      docType: "invoice",
      status: "pending",
      ownerEmail: "owner@example.com",
      createdAt: now,
      updatedAt: now,
    }));
  },

  // Satu query untuk SEMUA dokumen sekaligus (WHERE document_id IN (...)).
  async getExtractionsForDocuments(
    documentIds: readonly number[],
  ): Promise<Extraction[]> {
    const now = new Date();
    return documentIds.map((documentId): Extraction => ({
      id: documentId,
      documentId,
      field: "total",
      value: "1000000",
      confidence: "0.9800",
      raw: { currency: "IDR" },
      createdAt: now,
    }));
  },

  // Satu query untuk SEMUA ekstraksi sekaligus (WHERE extraction_id IN (...)).
  async getReviewLogsForExtractions(
    extractionIds: readonly number[],
  ): Promise<ReviewLog[]> {
    const now = new Date();
    return extractionIds.map((extractionId): ReviewLog => ({
      id: extractionId,
      extractionId,
      reviewerEmail: "reviewer@example.com",
      decision: "approved",
      note: "ok",
      createdAt: now,
    }));
  },
};

/** Mengelompokkan baris menjadi Map<key, baris[]> dalam satu lintasan. */
function groupBy<T, K>(rows: readonly T[], keyOf: (row: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}

// Tepat 3 round-trip ke DB, terlepas dari jumlah dokumen (bukan lagi 30.001).
export async function processAllDocuments(): Promise<ProcessResult> {
  // (1) Ambil semua dokumen.
  const docs = await fakeDb.getAllDocuments();
  const documentIds = docs.map((doc) => doc.id);

  // (2) Ambil semua ekstraksi untuk seluruh dokumen dalam satu query.
  const extractions = await fakeDb.getExtractionsForDocuments(documentIds);
  const extractionIds = extractions.map((ex) => ex.id);

  // (3) Ambil semua review log untuk seluruh ekstraksi dalam satu query.
  const reviewLogs = await fakeDb.getReviewLogsForExtractions(extractionIds);

  // Stitch in-memory: kelompokkan sekali, lalu rangkai pohon hasil.
  const extractionsByDoc = groupBy(extractions, (ex) => ex.documentId);
  const logsByExtraction = groupBy(reviewLogs, (log) => log.extractionId);

  const documents: DocumentWithExtractions[] = docs.map((doc) => {
    const docExtractions: ExtractionWithLogs[] = (
      extractionsByDoc.get(doc.id) ?? []
    ).map((ex) => ({
      ...ex,
      reviewLogs: logsByExtraction.get(ex.id) ?? [],
    }));
    return { ...doc, extractions: docExtractions };
  });

  return { count: documents.length, documents };
}

// Input dari API eksternal divalidasi di boundary — payload yang tidak valid
// ditolak di sini, sebelum menyentuh logika domain.
export function ingestDocument(payload: IngestDocumentInput): IngestedDocument {
  return ingestDocumentSchema.parse(payload);
}
