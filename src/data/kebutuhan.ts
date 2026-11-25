/**
 * Kebutuhan data: the documents and data a kabupaten needs in hand to score
 * each indicator of the Indeks Pemdi.
 *
 * This catalogue is Pemdi-AI's own reading of the level criteria of Permen
 * PANRB 8/2026 (src/data/permen-kriteria.json); the regulation does not list
 * evidence item by item. `tingkat` is the lowest maturity level whose
 * criteria the item is evidence for. `kode` are the survey questions that
 * ask OPDs for it, and `kata` is how a file is recognised as that item when
 * no AI reading of it is available.
 */
export type Kebutuhan = {
  id: string;
  indikator: number;
  nama: string;
  tingkat: number;
  pemilik: string;
  /** "kabupaten": one document for the whole government. "opd": every service-owning OPD should hold one. */
  lingkup: "kabupaten" | "opd";
  kode?: string[];
  kata: RegExp;
};

const k = (id: string, nama: string, tingkat: number, pemilik: string, lingkup: Kebutuhan["lingkup"], kata: RegExp, kode?: string[]): Kebutuhan => ({
  id,
  indikator: Number(id.split(".")[0]),
  nama,
  tingkat,
  pemilik,
  lingkup,
  kata,
  kode,
});

export const KEBUTUHAN: Kebutuhan[] = [
  // 1. Tata Kelola Pemdi
  k("1.1", "Rencana Aksi Pemdi daerah (atau Rencana Induk/Peta Rencana SPBE)", 2, "Diskominfo, Bappeda", "kabupaten", /rencana aksi (pemdi|pemerintah digital)|rencana induk spbe|peta rencana spbe/i),
  k("1.2", "Arsitektur Pemdi/SPBE pemerintah daerah", 2, "Diskominfo", "kabupaten", /arsitektur (pemdi|spbe|pemerintah digital)/i),
  k("1.3", "RPJMD/RPJPD yang memuat arah transformasi digital", 2, "Bappeda", "kabupaten", /\brpjmd\b|\brpjpd\b|rencana pembangunan jangka/i, ["b1_3"]),
  k("1.4", "Rincian alokasi belanja TIK dalam APBD", 3, "Bappeda, BKAD", "kabupaten", /belanja tik|pembiayaan digital|anggaran (tik|teknologi informasi)/i, ["b2_3"]),
  k("1.5", "Laporan reviu Rencana Aksi dan Arsitektur Pemdi", 4, "Diskominfo, Inspektorat", "kabupaten", /reviu (rencana aksi|arsitektur)|evaluasi (rencana induk|arsitektur) spbe/i),

  // 2. Manajemen Layanan Digital
  k("2.1", "Pedoman manajemen risiko layanan digital", 2, "Diskominfo, Bagian Organisasi", "kabupaten", /manajemen risiko/i),
  k("2.2", "Kebijakan manajemen perubahan dan budaya kerja digital", 2, "BKPSDM, Bagian Organisasi", "kabupaten", /manajemen perubahan|budaya kerja/i, ["k2_3", "o3_4"]),
  k("2.3", "SOP manajemen keberlangsungan layanan", 2, "Bagian Organisasi, Diskominfo", "kabupaten", /keberlangsungan layanan|kelangsungan layanan|business continuity/i, ["o2_4"]),
  k("2.4", "Peraturan SOTK dan pembagian peran pengelola layanan digital", 2, "Bagian Organisasi", "kabupaten", /susunan organisasi dan tata kerja|\bsotk\b|tugas pokok|tupoksi/i, ["o2_3", "k4_2"]),
  k("2.5", "Laporan reviu pelaksanaan manajemen layanan digital", 4, "Inspektorat, Diskominfo", "kabupaten", /reviu manajemen layanan/i),

  // 3. SDM Pemdi
  k("3.1", "Peta kompetensi digital ASN", 1, "BKPSDM", "kabupaten", /peta kompetensi|kompetensi digital/i, ["k1_5"]),
  k("3.2", "Data sebaran ASN berlatar belakang TIK per perangkat daerah", 2, "BKPSDM", "kabupaten", /pranata komputer|asn.{0,40}\btik\b|profil.{0,30}kompetensi/i, ["k1_4"]),
  k("3.3", "Laporan pelatihan atau sertifikasi kompetensi digital ASN", 2, "BKPSDM", "kabupaten", /(pelatihan|sertifikasi|bimtek).{0,40}(digital|tik|komputer)/i, ["k1_5"]),

  // 4. Kolaborasi Pemdi
  k("4.1", "SK Tim Koordinasi Pemdi/SPBE atau forum kolaborasi lintas sektor", 2, "Bagian Organisasi, Diskominfo", "kabupaten", /tim koordinasi (spbe|pemdi)|forum koordinasi/i, ["o3_3"]),
  k("4.2", "Perjanjian kerja sama digital dengan perguruan tinggi, swasta, atau instansi lain", 3, "Bagian Tata Pemerintahan, Diskominfo", "kabupaten", /perjanjian kerja ?sama|nota kesepahaman|\bmou\b|\bpks\b/i),
  k("4.3", "Laporan reviu kegiatan kolaborasi Pemdi", 4, "Diskominfo", "kabupaten", /reviu.{0,30}kolaborasi/i),

  // 5. Tata Kelola Data
  k("5.1", "SK Walidata dan regulasi Satu Data Indonesia tingkat daerah", 2, "Diskominfo", "kabupaten", /walidata|satu data|\bsdi\b/i, ["d4_3"]),
  k("5.2", "Daftar metadata, standar data, dan master data", 3, "Diskominfo", "kabupaten", /metadata|master[- ]data|standar data/i, ["d4_4"]),
  k("5.3", "Daftar data prioritas dan kebutuhan data perencanaan", 2, "Bappeda", "kabupaten", /data prioritas|kebutuhan (data|indikator)/i, ["b3_3"]),
  k("5.4", "Nilai indeks Satu Data Indonesia (SDI) dari Bappenas", 1, "Diskominfo, Bappeda", "kabupaten", /(indeks|nilai|skor|evaluasi).{0,20}(satu data indonesia|\bsdi\b)/i),

  // 6. Informasi Geospasial
  k("6.1", "Peta dasar, tata ruang, atau data infrastruktur geospasial", 1, "Dinas PUPR", "kabupaten", /peta (dasar|administrasi|tata ruang|sebaran)|geospasial|sistem informasi tata ruang/i, ["ling_2_asis", "dik_2_asis"]),
  k("6.2", "SK simpul jaringan/penyelenggara informasi geospasial dan geoportal", 2, "Dinas PUPR, Diskominfo", "kabupaten", /simpul jaringan|geoportal|penyelenggara(an)? informasi geospasial/i),
  k("6.3", "Nilai evaluasi Simpul Jaringan Informasi Geospasial (SJIG) dari BIG", 1, "Dinas PUPR, Diskominfo", "kabupaten", /\bsjig\b|evaluasi simpul jaringan/i),

  // 7. Pembangunan Statistik
  k("7.1", "Katalog data statistik sektoral dan status pengumpulannya", 2, "Diskominfo", "kabupaten", /statistik sektoral|dalam angka|daftar data|tabel wajib/i),
  k("7.2", "Nilai Evaluasi Penyelenggaraan Statistik Sektoral (EPSS) dari BPS", 1, "Diskominfo", "kabupaten", /\bepss\b|indeks pembangunan statistik|evaluasi penyelenggaraan statistik/i),
  k("7.3", "SOP/pedoman penyelenggaraan statistik sektoral dan rekomendasi kegiatan statistik", 3, "Diskominfo", "kabupaten", /rekomendasi (kegiatan )?statistik|romantik|(sop|pedoman).{0,40}statistik/i),

  // 8. Pelindungan Data Pribadi
  k("8.1", "Kebijakan internal pemrosesan dan pelindungan data pribadi", 2, "Diskominfo", "kabupaten", /pe(r)?lindungan data pribadi|pemrosesan data pribadi|\bpdp\b/i, ["d3_4"]),
  k("8.2", "SK penunjukan Pejabat/Petugas Pelindung Data Pribadi (PPDP)", 2, "BKPSDM, Diskominfo", "kabupaten", /pelindung data pribadi|\bppdp\b|pengelola data.{0,20}keamanan informasi/i, ["k3_3"]),
  k("8.3", "Laporan evaluasi penerapan PDP pada layanan digital", 4, "Diskominfo, Inspektorat", "kabupaten", /evaluasi.{0,40}(data pribadi|\bpdp\b)/i),

  // 9. Audit Keamanan dan Teknologi
  k("9.1", "SK tim audit dan rencana audit keamanan/teknologi Pemdi", 1, "Inspektorat, Diskominfo", "kabupaten", /tim audit|rencana audit|audit (tik|spbe|teknologi)/i),
  k("9.2", "Laporan audit keamanan dan teknologi (internal)", 2, "Inspektorat, Diskominfo", "kabupaten", /laporan (hasil )?audit.{0,40}(keamanan|tik|aplikasi|infrastruktur|spbe)/i, ["d3_3"]),
  k("9.3", "Laporan audit eksternal dan tindak lanjutnya", 4, "Diskominfo", "kabupaten", /audit eksternal|itsa|penilaian kerentanan/i),

  // 10. Keamanan Pemdi
  k("10.1", "Kebijakan/pedoman manajemen keamanan informasi (SMKI)", 2, "Diskominfo", "kabupaten", /keamanan informasi|\bsmki\b|iso ?27001/i),
  k("10.2", "Daftar Infrastruktur Informasi Vital yang teridentifikasi", 2, "Diskominfo", "kabupaten", /infrastruktur informasi vital|\biiv\b/i),
  k("10.3", "Materi sosialisasi atau modul literasi keamanan siber untuk ASN", 2, "BKPSDM, Diskominfo", "kabupaten", /(sosialisasi|literasi|awareness).{0,40}(keamanan|siber)/i, ["k3_4"]),
  k("10.4", "Hasil pengukuran kematangan keamanan siber (CSM/Indeks KAMI)", 3, "Diskominfo", "kabupaten", /indeks kami|cyber security maturity|\bcsm\b|kematangan keamanan siber/i),

  // 11. Kriptografi
  k("11.1", "Inventaris aplikasi dengan status enkripsi/SSL", 2, "Diskominfo", "kabupaten", /\bssl\b|enkripsi|subdomain/i, ["d2_3"]),
  k("11.2", "Bukti penerapan sertifikat elektronik/tanda tangan elektronik", 3, "Diskominfo", "kabupaten", /sertifikat elektronik|tanda tangan elektronik|\btte\b|\bbsre\b/i),
  k("11.3", "Nilai IKASANDI atau evaluasi penyelenggaraan persandian", 4, "Diskominfo", "kabupaten", /ikasandi|persandian/i),

  // 12. Penanganan Insiden Siber
  k("12.1", "SK pembentukan Tim Tanggap Insiden Siber (TTIS/CSIRT)", 2, "Diskominfo", "kabupaten", /\bttis\b|\bcsirt\b|tanggap insiden/i),
  k("12.2", "SOP penanganan insiden siber", 2, "Diskominfo", "kabupaten", /(sop|prosedur).{0,40}insiden siber|penanganan insiden/i, ["d3_4"]),
  k("12.3", "Log atau riwayat insiden keamanan siber dan penanganannya", 3, "Diskominfo", "kabupaten", /(log|riwayat|laporan).{0,30}insiden/i, ["d3_3"]),

  // 13. Aplikasi Pemdi
  k("13.1", "Katalog seluruh aplikasi dan sistem informasi pemerintah daerah", 2, "Diskominfo", "kabupaten", /(katalog|daftar|inventaris).{0,40}(aplikasi|subdomain|sistem informasi)/i, ["d2_3"]),
  k("13.2", "SOP/panduan pembangunan dan pengembangan aplikasi (SDLC)", 3, "Diskominfo", "kabupaten", /\bsdlc\b|(pembangunan|pengembangan) aplikasi|pengelolaan sistem informasi/i, ["d2_4"]),
  k("13.3", "Laporan reviu pembangunan/pengembangan aplikasi", 4, "Diskominfo", "kabupaten", /reviu.{0,40}aplikasi/i),

  // 14. Infrastruktur Pemdi
  k("14.1", "Inventaris infrastruktur TIK (server, jaringan, perangkat)", 2, "Diskominfo", "kabupaten", /inventaris.{0,30}(tik|infrastruktur|server|perangkat)|pusat data|data center/i, ["d1_3"]),
  k("14.2", "Topologi Jaringan Intra Pemerintah daerah", 2, "Diskominfo", "kabupaten", /topologi|jaringan intra/i, ["d1_4"]),
  k("14.3", "Bukti pemanfaatan komputasi awan/Pusat Data Nasional", 2, "Diskominfo", "kabupaten", /pusat data nasional|\bpdn\b|komputasi awan|cloud/i),

  // 15. Keterpaduan Proses Bisnis
  k("15.1", "Peta proses bisnis pemerintah daerah", 2, "Bagian Organisasi", "kabupaten", /peta proses bisnis|proses bisnis/i, ["o1_3"]),
  k("15.2", "SOP penyelenggaraan layanan publik tiap OPD", 2, "Seluruh OPD pemilik layanan", "opd", /\bsop\b|standar operasional prosedur|standar pelayanan|prosedur baku/i, ["t2_3", "pub_2_asis", "dik_1_asis", "ling_1_asis"]),
  k("15.3", "Laporan reviu keterpaduan proses bisnis lintas OPD", 4, "Bagian Organisasi", "kabupaten", /reviu.{0,40}proses bisnis/i),

  // 16. Integrasi Aplikasi
  k("16.1", "Daftar aplikasi layanan masyarakat tiap OPD", 2, "Seluruh OPD pemilik layanan", "opd", /(daftar|tampilan)?.{0,20}aplikasi|sistem informasi/i, ["t3_3", "kes_1_asis"]),
  k("16.2", "Dokumentasi integrasi antaraplikasi (API, SPLP, single sign-on)", 3, "Diskominfo", "kabupaten", /\bsplp\b|integrasi aplikasi|single sign|\bapi\b|interoperabilitas/i),
  k("16.3", "Rekap transaksi pembayaran digital penerimaan daerah", 2, "Bapenda", "kabupaten", /\bqris\b|pembayaran digital|non ?tunai|transaksi digital/i, ["pub_3_asis"]),

  // 17. Portal Layanan
  k("17.1", "Katalog layanan prioritas tiap OPD beserta target penggunanya", 2, "Seluruh OPD pemilik layanan", "opd", /(katalog|daftar).{0,30}layanan|layanan prioritas|standar pelayanan/i, ["t1_4"]),
  k("17.2", "Data demografi pengguna layanan, termasuk kelompok rentan", 2, "Seluruh OPD pemilik layanan", "opd", /demografi|kelompok rentan|pengguna layanan|disabilitas/i, ["t1_5"]),
  k("17.3", "Bukti portal layanan terpadu daerah (satu pintu digital)", 3, "Diskominfo, DPMPTSP", "kabupaten", /portal layanan|mal pelayanan publik|\bmpp\b|super ?app/i),

  // 18. Interoperabilitas Data
  k("18.1", "Basis data sektoral yang dikelola OPD (UMKM, petani, bansos, kesehatan)", 2, "OPD sektoral", "opd", /basis data|data (usaha|umkm|koperasi|kelompok tani|penggilingan)|\bdtsen\b|\bdtks\b/i, ["eko_1_asis"]),
  k("18.2", "Perjanjian atau mekanisme berbagi pakai data antar-OPD", 3, "Diskominfo", "kabupaten", /berbagi pakai|bagi pakai|pertukaran data/i),
  k("18.3", "Laporan capaian layanan berbasis data terpadu (mis. cakupan IKD)", 3, "Disdukcapil", "kabupaten", /identitas kependudukan digital|\bikd\b|kinerja dukcapil/i, ["pub_1_asis"]),

  // 19. Fasilitas Dukungan Pengguna
  k("19.1", "SOP penanganan pengaduan/gangguan layanan tiap OPD", 2, "Seluruh OPD pemilik layanan", "opd", /pengaduan|penanganan aduan|gangguan layanan|umpan balik|\bdumas\b/i, ["t4_4", "o2_4"]),
  k("19.2", "Kanal helpdesk/dukungan pengguna yang beroperasi (bukti kanal dan log)", 2, "Seluruh OPD pemilik layanan", "opd", /helpdesk|call center|whatsapp|kanal pengaduan|\bsp4n\b|lapor/i, ["t4_4"]),
  k("19.3", "SLA layanan digital dan laporan pemantauan pemenuhannya", 2, "Diskominfo", "kabupaten", /\bsla\b|service level|waktu (penyelesaian|layanan)|standar waktu/i),

  // 20. Kepuasan Pengguna
  k("20.1", "Laporan Survei Kepuasan Masyarakat (SKM/IKM) tiap OPD", 1, "Seluruh OPD pemilik layanan", "opd", /survei kepuasan|survey kepuasan|\bskm\b|\bikm\b|indeks kepuasan/i, ["t4_3", "pub_4_asis"]),
  k("20.2", "Bukti tindak lanjut hasil SKM untuk perbaikan layanan", 2, "Seluruh OPD pemilik layanan", "opd", /tindak lanjut.{0,60}(skm|survei|kepuasan|pengaduan)|rencana tindak lanjut/i),
  k("20.3", "SK tim pengelola kepuasan/pengalaman pengguna", 3, "Seluruh OPD pemilik layanan", "opd", /tim (pengelola|pelaksana).{0,20}(skm|survei|kepuasan|pengaduan)/i),
  k("20.4", "Publikasi hasil SKM secara daring (dasbor atau situs)", 3, "Diskominfo, OPD pemilik layanan", "kabupaten", /publikasi.{0,40}(skm|ikm|kepuasan)|dasbor kepuasan/i),
  k("20.5", "Berita acara Forum Konsultasi Publik", 4, "Bagian Organisasi, OPD pemilik layanan", "kabupaten", /forum konsultasi publik|\bfkp\b/i),
];

export const KEBUTUHAN_BY_ID = new Map(KEBUTUHAN.map((x) => [x.id, x]));
