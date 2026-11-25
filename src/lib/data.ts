/** The dashboards' queries. Every column of an uploaded table is text, hence the casts. */
import { tableRef, tryQuery, type Row } from "./lakehouse";

const T = {
  opd: tableRef("pemdi_opd"),
  survei: tableRef("pemdi_survei"),
  aplikasi: tableRef("pemdi_aplikasi"),
  statistik: tableRef("pemdi_data_statistik"),
};

const num = (v: unknown) => (v == null || v === "" ? 0 : Number(v));
const str = (v: unknown) => (v == null ? "" : String(v));

export type Opd = { opd: string; jenis_form: string; jabatan: string; tanggal: string; status: string; pertanyaan: number; terjawab: number; dokumen: number };

export async function getOpd(): Promise<Opd[]> {
  const rows = await tryQuery(`SELECT * FROM ${T.opd} WHERE 1 ORDER BY opd`);
  return rows.map((r) => ({
    opd: str(r.opd),
    jenis_form: str(r.jenis_form),
    jabatan: str(r.jabatan_responden),
    tanggal: str(r.tanggal_pengisian),
    status: str(r.status),
    pertanyaan: num(r.jumlah_pertanyaan),
    terjawab: num(r.jumlah_terjawab),
    dokumen: num(r.jumlah_dokumen),
  }));
}

export async function getSurveiTotal() {
  const s = await tryQuery(`SELECT count() AS n, countIf(dijawab = 'ya') AS ya FROM ${T.survei} WHERE 1`);
  return { pertanyaan: num(s[0]?.n), terjawab: num(s[0]?.ya), tersedia: s.length > 0 };
}

/** Answered survey questions per indicator. */
export async function getSurveiPerIndikator(): Promise<Map<number, { pertanyaan: number; terjawab: number; opd: number }>> {
  const rows = await tryQuery(
    `SELECT indikator_no, count() AS n, countIf(dijawab = 'ya') AS ya, uniqExactIf(opd, dijawab = 'ya') AS opd
     FROM ${T.survei} WHERE indikator_no != '' GROUP BY indikator_no`,
  );
  return new Map(rows.map((r) => [num(r.indikator_no), { pertanyaan: num(r.n), terjawab: num(r.ya), opd: num(r.opd) }]));
}

export async function getTemaPerOpd() {
  const rows = await tryQuery(
    `SELECT opd, tema, count() AS n, countIf(dijawab = 'ya') AS ya FROM ${T.survei} WHERE 1 GROUP BY opd, tema`,
  );
  return rows.map((r) => ({ opd: str(r.opd), tema: str(r.tema), n: num(r.n), ya: num(r.ya) }));
}

export async function getAplikasi() {
  const [perPemilik, perKategori, ssl, total] = await Promise.all([
    tryQuery(`SELECT pemilik, count() AS n FROM ${T.aplikasi} WHERE pemilik != '' GROUP BY pemilik ORDER BY n DESC, pemilik LIMIT 15`),
    tryQuery(`SELECT kategori, count() AS n FROM ${T.aplikasi} WHERE 1 GROUP BY kategori ORDER BY n DESC`),
    tryQuery(`SELECT status_ssl, count() AS n FROM ${T.aplikasi} WHERE 1 GROUP BY status_ssl ORDER BY n DESC`),
    tryQuery(`SELECT count() AS n, uniqExact(pemilik) AS pemilik FROM ${T.aplikasi} WHERE 1`),
  ]);
  const pair = (rows: Row[], key: string) => rows.map((r) => ({ name: str(r[key]) || "(kosong)", value: num(r.n) }));
  return {
    total: num(total[0]?.n),
    pemilik: num(total[0]?.pemilik),
    perPemilik: pair(perPemilik, "pemilik"),
    perKategori: pair(perKategori, "kategori"),
    ssl: pair(ssl, "status_ssl"),
  };
}

export async function getDataStatistik() {
  const [total, perKelompok, perSumber] = await Promise.all([
    tryQuery(
      `SELECT count() AS n, countIf(data_masuk = 'ya') AS masuk, countIf(sudah_tabulasi = 'ya') AS tabulasi,
              countIf(sudah_di_website = 'ya') AS web, countIf(prioritas_pusat = 'ya') AS pusat,
              countIf(prioritas_pusat = 'ya' AND data_masuk = 'ya') AS pusat_masuk
       FROM ${T.statistik} WHERE 1`,
    ),
    tryQuery(
      `SELECT kelompok_sektoral AS k, count() AS n, countIf(data_masuk = 'ya') AS masuk, countIf(sudah_di_website = 'ya') AS web
       FROM ${T.statistik} WHERE kelompok_sektoral != '' GROUP BY k ORDER BY n DESC`,
    ),
    tryQuery(
      `SELECT sumber_data AS s, count() AS n, countIf(data_masuk = 'ya') AS masuk
       FROM ${T.statistik} WHERE sumber_data != '' GROUP BY s ORDER BY n - masuk DESC, n DESC LIMIT 12`,
    ),
  ]);
  const t = total[0] ?? {};
  return {
    total: num(t.n),
    masuk: num(t.masuk),
    tabulasi: num(t.tabulasi),
    web: num(t.web),
    pusat: num(t.pusat),
    pusatMasuk: num(t.pusat_masuk),
    perKelompok: perKelompok.map((r) => ({ name: str(r.k), n: num(r.n), masuk: num(r.masuk), web: num(r.web) })),
    perSumber: perSumber.map((r) => ({ name: str(r.s), n: num(r.n), masuk: num(r.masuk) })),
  };
}
