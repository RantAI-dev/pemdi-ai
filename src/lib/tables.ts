/**
 * The lakehouse tables Pemdi-AI owns, with the meaning of each column.
 *
 * One list serves three readers: the seed script (which columns to write),
 * the dashboard queries, and the AI's schema context. The lakehouse copilot
 * knows its own Gold and Silver tables but not uploaded ones, so this
 * description is what teaches it their names and columns.
 */
import { tableRef } from "./lakehouse";

export type TableDef = { name: string; about: string; columns: Record<string, string> };

export const TABLES: TableDef[] = [
  {
    name: "pemdi_indikator",
    about: "20 indikator Indeks Pemdi (Permen PANRB 8/2026) beserta aspek dan bobotnya.",
    columns: {
      indikator_no: "nomor indikator 1-20",
      indikator: "nama indikator",
      bobot_indikator: "bobot indikator, pecahan (0.05 = 5%)",
      aspek_no: "nomor aspek 1-7",
      aspek: "nama aspek",
      bobot_aspek: "bobot aspek, pecahan",
      deskripsi: "",
    },
  },
  {
    name: "pemdi_kriteria",
    about: "Kriteria tiap tingkat kematangan (1-5) untuk setiap indikator, menurut Permen.",
    columns: {
      indikator_no: "nomor indikator 1-20",
      tingkat: "tingkat kematangan 1-5",
      predikat: "Kurang, Cukup, Baik, Sangat Baik, Memuaskan",
      kriteria: "teks kriteria",
    },
  },
  {
    name: "pemdi_penilaian",
    about: "Nilai tingkat kematangan per indikator (estimasi AI atau isian manual). Indikator tanpa baris belum dinilai.",
    columns: { indikator_no: "1-20", nilai: "1.00-5.00", penjelasan: "dasar penilaian", penilai: "'AI' atau 'Manual'", diperbarui: "waktu ISO" },
  },
  {
    name: "pemdi_opd",
    about: "Satu baris per perangkat daerah (OPD) yang mengisi survei kebutuhan Pemdi.",
    columns: {
      opd: "nama perangkat daerah",
      jenis_form: "form survei yang diisi",
      jabatan_responden: "",
      tanggal_pengisian: "tanggal YYYY-MM-DD",
      status: "Diverifikasi, Terkirim, atau Draft",
      jumlah_pertanyaan: "jumlah pertanyaan pada form",
      jumlah_terjawab: "pertanyaan yang dijawab",
      jumlah_dokumen: "jumlah berkas pendukung yang diserahkan",
    },
  },
  {
    name: "pemdi_survei",
    about: "Satu baris per pertanyaan survei per OPD, dengan jawabannya.",
    columns: {
      opd: "nama perangkat daerah",
      kode: "kode pertanyaan, mis. t1_1, d3_2, kes_1_tobe",
      tema: "awalan kode: t1 layanan prioritas, t2 proses bisnis, t3 aplikasi, t4 kepuasan pengguna, lainnya form khusus",
      jenis: "'To-Be' (pertanyaan kebutuhan) atau 'As-Is' (permintaan dokumen/data)",
      pertanyaan: "teks pertanyaan",
      jawaban: "teks jawaban; kosong bila tidak dijawab",
      dijawab: "'ya' atau 'tidak'",
      indikator_no: "indikator terkait",
      aspek_no: "",
    },
  },
  {
    name: "pemdi_dokumen",
    about: "Satu baris per berkas yang diserahkan OPD atau diunggah, dengan hasil pembacaan AI.",
    columns: {
      dokumen_id: "id berkas",
      opd: "perangkat daerah pemilik",
      kode: "kode pertanyaan survei yang dijawab berkas; kosong bila di luar survei",
      nama_file: "",
      jenis_file: "pdf, docx, xlsx, jpg, ...",
      ukuran_kb: "",
      sumber: "'TBB' atau 'Unggahan'",
      metode_teks: "'teks', 'ocr', atau kosong bila tak terbaca",
      jumlah_karakter: "",
      status_ai: "selesai, menunggu, gagal, tanpa teks",
      jenis_dokumen: "SOP, Laporan SKM, Peraturan, SK, ...",
      tahun: "",
      ringkasan: "ringkasan AI, atau awal teks bila belum dibaca AI",
    },
  },
  {
    name: "pemdi_temuan",
    about: "Temuan yang diekstrak AI dari dokumen: fakta kondisi saat ini yang menjadi bukti sebuah indikator.",
    columns: {
      dokumen_id: "",
      opd: "",
      nama_file: "",
      indikator_no: "1-20",
      aspek_no: "1-7",
      tingkat: "tingkat kematangan 1-5 yang didukung temuan",
      pernyataan: "isi temuan",
      kutipan: "potongan teks dokumen",
    },
  },
  {
    name: "pemdi_metrik",
    about: "Angka yang dilaporkan dokumen (nilai SKM/IKM, jumlah layanan, jumlah pengaduan, ...), diekstrak AI.",
    columns: { dokumen_id: "", opd: "", nama_metrik: "", nilai: "angka sebagai teks", satuan: "", periode: "", indikator_no: "1-20 atau kosong" },
  },
  {
    name: "pemdi_kebutuhan",
    about: "Kebutuhan data per indikator dan statusnya: dokumen/data apa yang harus ada dan mana yang masih kurang.",
    columns: {
      kebutuhan_id: "mis. 20.1",
      indikator_no: "1-20",
      kebutuhan: "nama dokumen/data yang dibutuhkan",
      lingkup: "'kabupaten' (satu dokumen) atau 'opd' (tiap OPD)",
      pemilik: "OPD yang semestinya menyediakan",
      tingkat_minimal: "tingkat kematangan terendah yang memerlukannya",
      status: "terpenuhi, sebagian, perlu dicek, belum ada",
      jumlah_berkas: "",
      opd_diminta: "",
      opd_belum: "jumlah OPD yang belum menyerahkan",
      daftar_opd_belum: "nama OPD dipisah titik koma",
    },
  },
  {
    name: "pemdi_aplikasi",
    about: "Inventaris subdomain/aplikasi Pemkab Tulang Bawang Barat 2026 (sumber: Diskominfo).",
    columns: {
      subdomain: "alamat subdomain",
      kategori: "Information, Function, OPD, ...",
      fungsi: "fungsi aplikasi",
      status_ssl: "status SSL/enkripsi",
      pemilik: "OPD pemilik aplikasi",
    },
  },
  {
    name: "pemdi_data_statistik",
    about: "Katalog tabel data statistik sektoral 2026 dan status pengumpulannya (sumber: Diskominfo/walidata).",
    columns: {
      no_tabel: "nomor tabel",
      judul: "judul tabel",
      sumber_data: "instansi produsen data",
      kelompok_sektoral: "Dasar, Sektoral Daerah, Sektoral Pusat, BUMN",
      tabel_wajib: "'ya'/'tidak'",
      prioritas_pusat: "'ya'/'tidak': masuk Daftar Data Prioritas pusat",
      prioritas_daerah: "'ya'/'tidak': masuk Daftar Data Prioritas daerah",
      data_masuk: "'ya'/'tidak': data sudah diserahkan produsen",
      sudah_tabulasi: "'ya'/'tidak'",
      sudah_di_website: "'ya'/'tidak': sudah dipublikasikan",
      pola: "Sentralisasi, Desentralisasi, Interoperabilitas, atau kosong",
    },
  },
  {
    name: "tbb_dalam_angka",
    about: "Kabupaten Tulang Bawang Barat Dalam Angka 2024 (BPS), bentuk panjang: satu baris per sel tabel.",
    columns: {
      tahun_publikasi: "2024",
      no_tabel: "nomor tabel, mis. 3.1.1",
      judul: "judul tabel",
      baris: "label baris, mis. nama kecamatan atau bulan",
      kolom: "judul kolom",
      nilai: "isi sel sebagai teks; angka memakai titik desimal",
    },
  },
];

/** The lakehouse cuts the AI context at 6,000 characters. */
const CONTEXT_MAX = 5900;

function describe(t: TableDef): string {
  const cols = Object.entries(t.columns)
    .map(([c, d]) => (d ? `${c} (${d})` : c))
    .join("; ");
  return `- ${tableRef(t.name)}: ${t.about}\n  Kolom: ${cols}`;
}

/** The schema context sent with every AI question. Extra (user-uploaded) tables are added while they fit. */
export function schemaContext(extra: TableDef[] = []): string {
  let out = [
    "Data Pemdi-AI Kabupaten Tulang Bawang Barat ada di tabel mentah berikut (ClickHouse).",
    "Tulis nama tabel persis seperti tertulis, dengan backtick, dan selalu sertakan WHERE (pakai WHERE 1 bila tanpa filter).",
    "Semua kolom bertipe teks: gunakan toFloat64OrNull(kolom) atau toInt32OrNull(kolom) sebelum menghitung.",
    "Jawab hanya dalam Bahasa Indonesia. Jangan pernah memakai aksara Tionghoa, Jepang, atau Korea, termasuk satu kata pun.",
    "",
    ...TABLES.map(describe),
  ].join("\n");
  for (const t of extra) {
    const line = `\n${describe(t)}`;
    if (out.length + line.length > CONTEXT_MAX) break;
    out += line;
  }
  return out;
}
