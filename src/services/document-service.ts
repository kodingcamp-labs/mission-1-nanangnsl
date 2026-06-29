// Service layer prototipe — sumber utama keluhan tim.
// Objektif 2 & 3: hilangkan N+1, perketat tipe, validasi input di boundary.

// Simulasi data store (di produksi: PostgreSQL via Drizzle).
const fakeDb = {
  async getDocumentIds(): Promise<number[]> {
    return Array.from({ length: 50 }, (_, i) => i + 1);
  },
  async getDocumentById(id: number): Promise<any> {
    return { id, fileName: `doc-${id}.pdf`, docType: "invoice", status: "pending" };
  },
  async getExtractionsForDocument(docId: number): Promise<any[]> {
    return [{ docId, field: "total", value: "1000000" }];
  },
  async getReviewLogsForExtraction(extraction: any): Promise<any[]> {
    return [{ extractionId: extraction.docId, note: "ok" }];
  },
};

// N+1 klasik tiga tingkat: 1 query daftar + N dokumen + N ekstraksi + N log.
// Dengan 10.000 dokumen, ini ±30.001 round-trip ke database.
export async function processAllDocuments(): Promise<any> {
  const ids = await fakeDb.getDocumentIds();

  const processed: any[] = [];
  for (const id of ids) {
    const doc: any = await fakeDb.getDocumentById(id);
    const extractions: any = await fakeDb.getExtractionsForDocument(doc.id);
    for (const ex of extractions) {
      const logs: any = await fakeDb.getReviewLogsForExtraction(ex);
      ex.logs = logs;
    }
    doc.extractions = extractions;
    processed.push(doc);
  }

  return { count: processed.length, documents: processed };
}

// Input dari API eksternal — tidak divalidasi sama sekali. Perbaiki dengan Zod.
export async function ingestDocument(payload: any): Promise<any> {
  return {
    fileName: payload.file_name,
    docType: payload.type ?? payload.docType ?? "unknown",
    ownerEmail: payload.email,
  };
}
