/**
 * Cetak hasil penilaian Dukungan PROSN: skor per kelompok dan per program,
 * daftar indikator yang belum punya bukti, dan ringkasan sumber.
 *
 * Jalankan dari akar repo: bun run scripts/prosn-verifikasi.ts
 */
import { muatProsn } from "../src/lib/prosn";
import { belumAdaBukti, kategoriProsn, skor } from "../src/lib/prosn-hitung";

const data = await muatProsn();
const total = skor(data.penilaian, data.indikator);

console.log(`Tahun penilaian ${data.tahunUtama} · ${data.indikator.length} indikator · ${data.sumber.length} sumber`);
console.log("");
console.log("KELOMPOK                  DINILAI/JUMLAH  SKOR/MAKS     CAPAIAN  KATEGORI");

const kelompok = data.indikator.reduce<{ id: string; kode: string; nama: string }[]>((daftar, x) => {
  if (!daftar.some((y) => y.id === x.kelompok)) daftar.push({ id: x.kelompok, kode: x.kelompokKode, nama: x.kelompokNama });
  return daftar;
}, []);

const baris = (label: string, s: ReturnType<typeof skor>) =>
  `${label}`.padEnd(26).slice(0, 26) +
  `${String(s.dinilai).padStart(4)}/${String(s.jumlah).padEnd(8)}` +
  `${s.nilai.toFixed(2).padStart(6)}/${s.maks.toFixed(2).padEnd(8)}` +
  `${s.capaian.toFixed(2).padStart(7)}%  ${kategoriProsn(s.capaian)}`;

for (const k of kelompok) console.log(baris(`${k.kode}. ${k.nama}`, skor(data.penilaian, data.indikator, { kelompok: k.id })));
console.log(baris("TOTAL", total));

console.log("");
console.log("PROGRAM");
const program = new Map<string, { kelompok: string; program: string; kode: string; nama: string }>();
for (const x of data.indikator) {
  const kunci = `${x.kelompok}/${x.program}`;
  if (!program.has(kunci)) program.set(kunci, { kelompok: x.kelompok, program: x.program, kode: `${x.kelompokKode}.${x.programKode}`, nama: x.programNama });
}
for (const p of program.values()) {
  const label = `${p.kode} ${p.nama}`;
  console.log(baris(label.length > 26 ? `${label.slice(0, 24)}…` : label, skor(data.penilaian, data.indikator, { kelompok: p.kelompok, program: p.program })));
}

const kosong = belumAdaBukti(data.penilaian, data.indikator);
console.log("");
console.log(`BELUM ADA BUKTI (${kosong.length} indikator, ${kosong.reduce((a, x) => a + x.bobot, 0).toFixed(2)} poin):`);
for (const x of kosong) console.log(`- ${x.kelompokKode}.${x.kode} [${x.bobot.toFixed(2)}] ${x.judul}`);
