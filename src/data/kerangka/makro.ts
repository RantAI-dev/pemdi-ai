/**
 * Indikator Kinerja Makro Pemda: the six national macro indicators from the
 * Bappenas/Kemendagri list (INDIKATOR KINERJA MAKRO PEMDA.pdf). Each indicator
 * keeps the unit printed in the source; the composite IPM is broken down into
 * the three components the source names (AHH, RLS & HLS, pengeluaran per
 * kapita) so the tree can be read one level deeper.
 *
 * No weights are attached: the source orders the six indicators but does not
 * give them a share of the total.
 */
import type { Kerangka, KerangkaNode } from "@/lib/kerangka";

const SUMBER = "INDIKATOR KINERJA MAKRO PEMDA.pdf";

const KOMPONEN_IPM: KerangkaNode[] = [
  {
    id: "ahh",
    judul: "Angka Harapan Hidup (AHH)",
    penjelasan:
      "Rata-rata jumlah tahun yang diharapkan dapat dijalani seseorang sejak lahir. AHH adalah dimensi Umur Panjang & Sehat dalam IPM.",
    opd: ["Dinas Kesehatan"],
  },
  {
    id: "rls-hls",
    judul: "Rata-rata Lama Sekolah (RLS) & Harapan Lama Sekolah (HLS)",
    penjelasan:
      "Dimensi Pengetahuan dalam IPM. RLS mengukur lama pendidikan yang telah ditamatkan penduduk usia 25 tahun ke atas; HLS mengukur lama pendidikan yang diharapkan dapat dicapai anak usia 7 tahun.",
    opd: ["Dinas Pendidikan dan Kebudayaan"],
  },
  {
    id: "pengeluaran-per-kapita",
    judul: "Pengeluaran per Kapita",
    penjelasan:
      "Pengeluaran per kapita yang disesuaikan, yaitu dimensi Standar Hidup Layak dalam IPM. Angka ini menggambarkan daya beli masyarakat terhadap kebutuhan dasar.",
    opd: ["Badan Perencanaan Pembangunan Daerah", "Bagian Perekonomian"],
  },
];

export const makro: Kerangka = {
  slug: "makro",
  judul: "Indikator Kinerja Makro",
  dasar: `Bappenas & Kementerian Dalam Negeri — sumber: ${SUMBER}`,
  deskripsi:
    "Indikator Kinerja Makro Pemerintah Daerah adalah sekumpulan indikator komprehensif yang digunakan untuk mengukur pencapaian pembangunan ekonomi, sosial, dan kesejahteraan masyarakat secara keseluruhan di suatu daerah dalam periode tertentu (biasanya tahunan atau 5-tahunan). Indikator ini menjadi acuan utama dalam penyusunan RPJMD (Rencana Pembangunan Jangka Menengah Daerah), RKPD (Rencana Kerja Pemerintah Daerah), serta menjadi bagian vital dalam LPPD (Laporan Penyelenggaraan Pemerintahan Daerah) Kepala Daerah. Enam indikator di bawah ditetapkan secara nasional oleh Bappenas dan Kementerian Dalam Negeri.",
  anak: [
    {
      id: "pertumbuhan-ekonomi",
      kode: "1",
      judul: "Pertumbuhan Ekonomi",
      penjelasan:
        "Mengukur laju pertumbuhan Produk Domestik Regional Bruto (PDRB) atas dasar harga konstan. Menunjukkan dinamika aktivitas produksi barang dan jasa di daerah.\n\nSatuan: Persentase (%).",
      opd: ["Badan Perencanaan Pembangunan Daerah", "Bagian Perekonomian"],
    },
    {
      id: "tingkat-pengangguran-terbuka",
      kode: "2",
      judul: "Tingkat Pengangguran Terbuka (TPT)",
      penjelasan:
        "Mengukur persentase angkatan kerja yang tidak/belum bekerja dan sedang mencari pekerjaan. Menunjukkan daya serap pasar kerja daerah.\n\nSatuan: Persentase (%).",
      opd: ["Dinas Tenaga Kerja dan Transmigrasi", "Badan Perencanaan Pembangunan Daerah"],
    },
    {
      id: "angka-kemiskinan",
      kode: "3",
      judul: "Angka Kemiskinan",
      penjelasan:
        "Mengukur proporsi penduduk yang memiliki rata-rata pengeluaran per kapita per bulan di bawah Garis Kemiskinan (GK). Menunjukkan tingkat efektivitas penanggulangan kemiskinan.\n\nSatuan: Persentase (%).",
      opd: ["Dinas Sosial", "Badan Perencanaan Pembangunan Daerah", "Dinas Pemberdayaan Masyarakat dan Tiyuh"],
    },
    {
      id: "indeks-pembangunan-manusia",
      kode: "4",
      judul: "Indeks Pembangunan Manusia (IPM)",
      penjelasan:
        "Mengukur pencapaian pembangunan manusia berbasis 3 dimensi dasar: Umur Panjang & Sehat (AHH), Pengetahuan (RLS & HLS), dan Standar Hidup Layak (Pengeluaran per Kapita).\n\nSatuan: Skala (0–100).",
      opd: ["Badan Perencanaan Pembangunan Daerah"],
      anak: KOMPONEN_IPM,
    },
    {
      id: "gini-ratio",
      kode: "5",
      judul: "Gini Ratio / Indeks Ketimpangan",
      penjelasan:
        "Mengukur tingkat ketimpangan distribusi pendapatan masyarakat. Semakin mendekati angka 0, distribusi pendapatan semakin merata.\n\nSatuan: Skala (0–1).",
      opd: ["Badan Perencanaan Pembangunan Daerah", "Bagian Perekonomian"],
    },
    {
      id: "pendapatan-per-kapita",
      kode: "6",
      judul: "Pendapatan Per Kapita / PDRB per Kapita",
      penjelasan:
        "Mengukur rata-rata pendapatan yang diperoleh setiap penduduk di daerah tersebut dalam satu tahun (PDRB ADHB dibagi jumlah penduduk).\n\nSatuan: Rupiah (Rp).",
      opd: ["Badan Perencanaan Pembangunan Daerah", "Bagian Perekonomian"],
    },
  ],
};
