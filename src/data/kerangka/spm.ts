/**
 * Standar Pelayanan Minimal (SPM) pemerintah daerah according to Permendagri
 * 59/2021: six fields, each with its 100% target, then the services split by
 * the level of government that owns them. Tulang Bawang Barat is a kabupaten,
 * so the provincial branches are kept only as a reference.
 *
 * The source does not weight the fields, so no `bobot` is set here.
 */
import type { Kerangka, KerangkaNode } from "@/lib/kerangka";

const SUMBER = "INDIKATOR SPM PEMDA.pdf";

const PENDIDIKAN = ["Dinas Pendidikan dan Kebudayaan"];
const KESEHATAN = ["Dinas Kesehatan"];
const PU = ["Dinas Pekerjaan Umum dan Penataan Ruang"];
const PERUMAHAN = ["Dinas Perumahan, Kawasan Pemukiman dan Pertanahan"];
const SOSIAL = ["Dinas Sosial"];

/** A service leaf, so each of the thirty services stays short to declare. */
function layanan(id: string, judul: string, penjelasan: string, opd: string[]): KerangkaNode {
  return { id, judul, penjelasan, opd };
}

export const spm: Kerangka = {
  slug: "spm",
  judul: "Indikator Capaian SPM",
  dasar: `Permendagri 59/2021 — sumber: ${SUMBER}`,
  deskripsi:
    "Standar Pelayanan Minimal (SPM) pemerintah daerah berdasarkan Permendagri 59/2021. Enam bidang layanan dengan target 100%, dipilah menurut kewenangan kabupaten/kota dan provinsi. Tulang Bawang Barat adalah kabupaten, sehingga cabang provinsi ditampilkan sebagai referensi kewenangan, bukan sebagai kewajiban daerah.",
  anak: [
    {
      id: "pendidikan",
      kode: "1",
      judul: "Pendidikan",
      penjelasan:
        "Target: 100% warga usia sekolah (atau peserta didik sasaran) mendapatkan pelayanan pendidikan sesuai standar mutu minimal.\n\nKewenangan kabupaten/kota mencakup PAUD, pendidikan dasar, dan pendidikan kesetaraan; kewenangan provinsi mencakup pendidikan menengah dan pendidikan khusus.",
      opd: PENDIDIKAN,
      anak: [
        {
          id: "kabupaten-kota",
          judul: "Kabupaten/Kota",
          penjelasan: "Jenis layanan pendidikan yang menjadi kewenangan kabupaten/kota.",
          opd: PENDIDIKAN,
          anak: [
            layanan("paud", "Pendidikan Anak Usia Dini (PAUD)", "Layanan pendidikan bagi anak usia dini sebelum jenjang pendidikan dasar.", PENDIDIKAN),
            layanan("pendidikan-dasar", "Pendidikan Dasar (SD/MI dan SMP/MTs)", "Layanan pendidikan dasar sembilan tahun pada jenjang SD/MI dan SMP/MTs.", PENDIDIKAN),
            layanan("pendidikan-kesetaraan", "Pendidikan Kesetaraan (Paket A, B, C)", "Layanan pendidikan nonformal kesetaraan Paket A, B, dan C bagi peserta didik yang tidak menempuh jalur formal.", PENDIDIKAN),
          ],
        },
        {
          id: "provinsi",
          judul: "Provinsi",
          penjelasan: "Kewenangan provinsi, sebagai referensi. Tulang Bawang Barat adalah kabupaten, sehingga layanan ini tidak menjadi kewajiban daerah.",
          opd: PENDIDIKAN,
          anak: [
            layanan("pendidikan-menengah", "Pendidikan Menengah (SMA/SMK/MA)", "Layanan pendidikan menengah atas pada jenjang SMA/SMK/MA.", PENDIDIKAN),
            layanan("pendidikan-khusus", "Pendidikan Khusus (SLB)", "Layanan pendidikan khusus bagi peserta didik berkebutuhan khusus melalui SLB.", PENDIDIKAN),
          ],
        },
      ],
    },
    {
      id: "kesehatan",
      kode: "2",
      judul: "Kesehatan",
      penjelasan:
        "Target: 100% warga negara pada kelompok risiko/kelompok usia sasaran terlayani sesuai standar medis.\n\nKabupaten/kota menyelenggarakan 12 indikator layanan dasar; provinsi menangani krisis kesehatan akibat bencana dan Kejadian Luar Biasa (KLB).",
      opd: KESEHATAN,
      anak: [
        {
          id: "kabupaten-kota",
          judul: "Kabupaten/Kota",
          penjelasan: "12 indikator layanan dasar kesehatan yang menjadi kewenangan kabupaten/kota.",
          opd: KESEHATAN,
          anak: [
            layanan("ibu-hamil", "Pelayanan kesehatan ibu hamil", "Pemeriksaan kehamilan sesuai standar medis, termasuk deteksi risiko dan rujukan.", KESEHATAN),
            layanan("ibu-bersalin", "Pelayanan kesehatan ibu bersalin", "Pertolongan persalinan oleh tenaga kesehatan di fasilitas pelayanan kesehatan sesuai standar.", KESEHATAN),
            layanan("bayi-baru-lahir", "Pelayanan kesehatan bayi baru lahir", "Pelayanan kesehatan neonatal dasar, termasuk kunjungan neonatal dan deteksi dini komplikasi.", KESEHATAN),
            layanan("balita", "Pelayanan kesehatan balita", "Pemantauan pertumbuhan dan perkembangan, imunisasi, serta pelayanan kesehatan balita.", KESEHATAN),
            layanan("anak-usia-sekolah", "Pelayanan kesehatan anak usia sekolah", "Pemeriksaan kesehatan berkala dan pelayanan kesehatan dasar bagi anak usia sekolah.", KESEHATAN),
            layanan("usia-produktif", "Pelayanan kesehatan usia produktif", "Pelayanan kesehatan bagi penduduk usia produktif, termasuk skrining dan konseling.", KESEHATAN),
            layanan("usia-lanjut", "Pelayanan kesehatan usia lanjut", "Pelayanan kesehatan lanjut usia, termasuk skrining dan pemantauan penyakit degeneratif.", KESEHATAN),
            layanan("hipertensi", "Pelayanan kesehatan penderita hipertensi", "Deteksi dini, pengobatan, dan pemantauan penderita hipertensi sesuai standar.", KESEHATAN),
            layanan("diabetes-melitus", "Pelayanan kesehatan penderita diabetes melitus", "Deteksi dini, pengobatan, dan pemantauan penderita diabetes melitus sesuai standar.", KESEHATAN),
            layanan("odgj-berat", "Pelayanan kesehatan orang dengan gangguan jiwa (ODGJ) berat", "Pelayanan kesehatan jiwa bagi ODGJ berat, termasuk pengobatan dan rujukan.", KESEHATAN),
            layanan("terduga-tb", "Pelayanan kesehatan orang terduga tuberkulosis (TB)", "Penemuan kasus, pemeriksaan, dan pengobatan tuberkulosis sesuai standar program.", KESEHATAN),
            layanan("risiko-hiv", "Pelayanan kesehatan orang dengan risiko terinfeksi HIV", "Skrining, konseling, dan rujukan bagi orang dengan risiko terinfeksi HIV.", KESEHATAN),
          ],
        },
        {
          id: "provinsi",
          judul: "Provinsi",
          penjelasan: "Kewenangan provinsi, sebagai referensi. Tulang Bawang Barat adalah kabupaten, sehingga layanan ini tidak menjadi kewajiban daerah.",
          opd: KESEHATAN,
          anak: [
            layanan("krisis-kesehatan-bencana", "Pelayanan kesehatan bagi penduduk terdampak krisis kesehatan akibat bencana/potensi bencana", "Pelayanan kesehatan pada situasi krisis akibat bencana atau potensi bencana.", KESEHATAN),
            layanan("klb", "Pelayanan kesehatan bagi penduduk pada kondisi Kejadian Luar Biasa (KLB)", "Pelayanan kesehatan dan penanggulangan pada kondisi Kejadian Luar Biasa.", KESEHATAN),
          ],
        },
      ],
    },
    {
      id: "pekerjaan-umum",
      kode: "3",
      judul: "Pekerjaan Umum",
      penjelasan:
        "Target: 100% rumah tangga sasaran terpenuhi kebutuhan air minum baku dan sanitasi/limbah domestiknya.\n\nKabupaten/kota menangani kebutuhan air minum sehari-hari dan air limbah domestik di wilayahnya; provinsi menangani layanan lintas kabupaten/kota.",
      opd: PU,
      anak: [
        {
          id: "kabupaten-kota",
          judul: "Kabupaten/Kota",
          penjelasan: "Jenis layanan pekerjaan umum yang menjadi kewenangan kabupaten/kota.",
          opd: PU,
          anak: [
            layanan("air-minum-sehari-hari", "Pemenuhan kebutuhan pokok air minum sehari-hari", "Penyediaan air minum untuk memenuhi kebutuhan pokok rumah tangga sasaran.", PU),
            layanan("air-limbah-domestik", "Penyediaan pengolahan air limbah domestik", "Pengolahan air limbah rumah tangga agar tidak mencemari lingkungan.", PU),
          ],
        },
        {
          id: "provinsi",
          judul: "Provinsi",
          penjelasan: "Kewenangan provinsi, sebagai referensi. Tulang Bawang Barat adalah kabupaten, sehingga layanan ini tidak menjadi kewajiban daerah.",
          opd: PU,
          anak: [
            layanan("air-minum-antar-daerah", "Pemenuhan air minum antar-kabupaten/kota", "Penyediaan air minum baku untuk kebutuhan lintas kabupaten/kota.", PU),
            layanan("air-limbah-lintas-daerah", "Pengolahan air limbah domestik lintas kabupaten/kota", "Pengolahan air limbah domestik yang mencakup wilayah lintas kabupaten/kota.", PU),
          ],
        },
      ],
    },
    {
      id: "perumahan-rakyat",
      kode: "4",
      judul: "Perumahan Rakyat",
      penjelasan:
        "Target: 100% korban bencana dan Masyarakat Berpenghasilan Rendah (MBR) yang terdata memperoleh bantuan/fasilitasi rumah layak huni.\n\nSumber menempatkan ketiga jenis layanan ini pada kewenangan kabupaten/kota dan provinsi sekaligus.",
      opd: PERUMAHAN,
      anak: [
        {
          id: "kabupaten-kota-dan-provinsi",
          judul: "Kabupaten/Kota & Provinsi",
          penjelasan: "Jenis layanan perumahan rakyat yang diselenggarakan bersama oleh kabupaten/kota dan provinsi.",
          opd: PERUMAHAN,
          anak: [
            layanan("rumah-korban-bencana", "Penyediaan dan rehabilitasi rumah layak huni bagi korban bencana", "Bantuan penyediaan atau rehabilitasi rumah layak huni bagi korban bencana.", PERUMAHAN),
            layanan("rumah-terkena-relokasi", "Penyediaan dan rehabilitasi rumah layak huni bagi masyarakat terkena relokasi program Pemerintah Daerah", "Bantuan rumah layak huni bagi masyarakat yang terkena relokasi program pemerintah daerah.", PERUMAHAN),
            layanan("rumah-mbr", "Fasilitasi penyediaan rumah layak huni bagi MBR", "Fasilitasi penyediaan rumah layak huni bagi Masyarakat Berpenghasilan Rendah.", PERUMAHAN),
          ],
        },
      ],
    },
    {
      id: "trantibum-linmas",
      kode: "5",
      judul: "Ketenteraman, Ketertiban Umum, dan Pelindungan Masyarakat (Trantibum Linmas)",
      penjelasan:
        "Target: 100% cakupan penanganan ketenteraman masyarakat, tindakan penanggulangan bencana, dan penanganan kebakaran sesuai SPM.\n\nKabupaten/kota menangani trantibum, informasi rawan bencana, serta pencegahan dan pemadaman kebakaran; provinsi menangani trantibum dan bencana lintas kabupaten/kota.",
      opd: ["Satuan Polisi Pamong Praja", "Badan Penanggulangan Bencana Daerah", "Dinas Pemadam Kebakaran dan Penyelamatan"],
      anak: [
        {
          id: "kabupaten-kota",
          judul: "Kabupaten/Kota",
          penjelasan: "Jenis layanan trantibum linmas yang menjadi kewenangan kabupaten/kota.",
          opd: ["Satuan Polisi Pamong Praja", "Badan Penanggulangan Bencana Daerah", "Dinas Pemadam Kebakaran dan Penyelamatan"],
          anak: [
            layanan("trantibum", "Pelayanan ketenteraman dan ketertiban umum (Trantibum)", "Penegakan ketenteraman dan ketertiban umum di wilayah kabupaten/kota.", ["Satuan Polisi Pamong Praja"]),
            layanan("rawan-bencana", "Pelayanan informasi rawan bencana, pencegahan, kesiapsiagaan, serta penyelamatan dan evakuasi korban bencana", "Informasi rawan bencana, pencegahan, kesiapsiagaan, penyelamatan, dan evakuasi korban.", ["Badan Penanggulangan Bencana Daerah"]),
            layanan("kebakaran", "Pelayanan pencegahan, pemadaman kebakaran, dan penyelamatan", "Pencegahan kebakaran, pemadaman, dan penyelamatan korban kebakaran.", ["Dinas Pemadam Kebakaran dan Penyelamatan"]),
          ],
        },
        {
          id: "provinsi",
          judul: "Provinsi",
          penjelasan: "Kewenangan provinsi, sebagai referensi. Tulang Bawang Barat adalah kabupaten, sehingga layanan ini tidak menjadi kewajiban daerah.",
          opd: ["Satuan Polisi Pamong Praja", "Badan Penanggulangan Bencana Daerah"],
          anak: [
            layanan("trantibum-provinsi", "Pelayanan trantibum skala provinsi", "Penegakan ketenteraman dan ketertiban umum pada skala provinsi.", ["Satuan Polisi Pamong Praja"]),
            layanan("bencana-lintas-daerah", "Pelayanan pencegahan, kesiapsiagaan, penyelamatan, dan evakuasi bencana lintas kabupaten/kota", "Pencegahan, kesiapsiagaan, penyelamatan, dan evakuasi bencana yang mencakup lintas kabupaten/kota.", ["Badan Penanggulangan Bencana Daerah"]),
          ],
        },
      ],
    },
    {
      id: "sosial",
      kode: "6",
      judul: "Sosial",
      penjelasan:
        "Target: 100% Penyandang Masalah Kesejahteraan Sosial (PMKS) sasaran terlayani rehabilitasi dasar atau bantuan tanggap darurat.\n\nKabupaten/kota menangani layanan di luar panti; provinsi menangani layanan di dalam panti dan perlindungan korban bencana skala provinsi.",
      opd: SOSIAL,
      anak: [
        {
          id: "kabupaten-kota",
          judul: "Kabupaten/Kota",
          penjelasan: "Layanan di luar panti yang menjadi kewenangan kabupaten/kota.",
          opd: SOSIAL,
          anak: [
            layanan("disabilitas-terlantar", "Rehabilitasi sosial dasar Penyandang Disabilitas Terlantar di luar panti", "Rehabilitasi sosial dasar bagi penyandang disabilitas terlantar di luar panti.", SOSIAL),
            layanan("anak-terlantar", "Rehabilitasi sosial dasar Anak Terlantar di luar panti", "Rehabilitasi sosial dasar bagi anak terlantar di luar panti.", SOSIAL),
            layanan("lansia-terlantar", "Rehabilitasi sosial dasar Lanjut Usia Terlantar di luar panti", "Rehabilitasi sosial dasar bagi lanjut usia terlantar di luar panti.", SOSIAL),
            layanan("tuna-sosial", "Rehabilitasi sosial dasar Tuna Sosial khususnya Gelandangan dan Pengemis di luar panti", "Rehabilitasi sosial dasar bagi tuna sosial, khususnya gelandangan dan pengemis, di luar panti.", SOSIAL),
            layanan("korban-bencana", "Perlindungan dan jaminan sosial bagi korban bencana pada saat dan setelah tanggap darurat", "Perlindungan dan jaminan sosial bagi korban bencana pada saat dan setelah tanggap darurat.", ["Dinas Sosial", "Badan Penanggulangan Bencana Daerah"]),
          ],
        },
        {
          id: "provinsi",
          judul: "Provinsi",
          penjelasan: "Kewenangan provinsi, sebagai referensi. Tulang Bawang Barat adalah kabupaten, sehingga layanan ini tidak menjadi kewajiban daerah.",
          opd: SOSIAL,
          anak: [
            layanan("rehabilitasi-dalam-panti", "Rehabilitasi sosial dasar penyandang disabilitas, anak, lansia, dan tuna sosial di dalam panti", "Rehabilitasi sosial dasar bagi penyandang disabilitas, anak, lansia, dan tuna sosial di dalam panti.", SOSIAL),
            layanan("korban-bencana-provinsi", "Perlindungan dan jaminan sosial bagi korban bencana skala provinsi", "Perlindungan dan jaminan sosial bagi korban bencana pada skala provinsi.", ["Dinas Sosial", "Badan Penanggulangan Bencana Daerah"]),
          ],
        },
      ],
    },
  ],
};
