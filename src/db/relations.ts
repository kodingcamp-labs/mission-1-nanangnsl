// Relasi Drizzle — memungkinkan query `db.query.documents.findMany({ with: ... })`
// yang menghasilkan SATU query join, bukan N+1 (Objektif 2).

import { relations } from "drizzle-orm";
import { documents, extractions, reviewLogs } from "./schema.js";

export const documentsRelations = relations(documents, ({ many }) => ({
  extractions: many(extractions),
}));

export const extractionsRelations = relations(extractions, ({ one, many }) => ({
  document: one(documents, {
    fields: [extractions.documentId],
    references: [documents.id],
  }),
  reviewLogs: many(reviewLogs),
}));

export const reviewLogsRelations = relations(reviewLogs, ({ one }) => ({
  extraction: one(extractions, {
    fields: [reviewLogs.extractionId],
    references: [extractions.id],
  }),
}));
