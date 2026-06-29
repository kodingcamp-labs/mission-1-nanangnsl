// sync-env.js — dijalankan oleh `npm run setup`.
// Menyalin .env.example → .env kalau belum ada, supaya workspace langsung jalan.
import { copyFileSync, existsSync } from "node:fs";

if (existsSync(".env")) {
  console.log("[sync-env] .env sudah ada — dilewati.");
} else if (existsSync(".env.example")) {
  copyFileSync(".env.example", ".env");
  console.log("[sync-env] .env dibuat dari .env.example. Isi nilainya sebelum npm run dev.");
} else {
  console.warn("[sync-env] .env.example tidak ditemukan — lewati.");
}
