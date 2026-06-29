// Entry point prototipe VLM Automation.
// PERINGATAN DARI TIM SEBELUMNYA: "jalan sih, tapi tolong jangan tanya kenapa."
// Tugas Anda: lihat README.md — rapikan arsitektur ini.

import { processAllDocuments } from "./services/document-service.js";

async function main() {
  console.log("=== VLM Automation Pipeline ===");
  const result: any = await processAllDocuments();
  console.log(`Selesai memproses ${result.count} dokumen.`);
}

main().catch((err) => {
  console.error("pipeline crash:", err);
  process.exit(1);
});
