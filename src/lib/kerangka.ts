/**
 * The generic indicator tree behind the framework pages. A node may nest
 * without a fixed depth: level 1 is a group, its children are the indicators,
 * their children the maturity criteria, and so on.
 *
 * `bobot` uses the same unit as the rest of the app: a share of 1 (0.05 = 5%).
 * `indikator` and `aspek` are optional links into the Indeks Pemdi tables, so
 * the pages can show the scores and documents already recorded for them.
 */

export type KerangkaNode = {
  /** Stable slug, unique among its siblings; it is the URL segment. */
  id: string;
  kode?: string;
  judul: string;
  penjelasan: string;
  bobot?: number;
  /** OPDs that are likely involved, using the names the app already uses. */
  opd?: string[];
  /** Nomor indikator Pemdi, when this node maps to one (for scores and documents). */
  indikator?: number;
  /** Nomor aspek Pemdi, when this node is one. */
  aspek?: number;
  anak?: KerangkaNode[];
};

export type Kerangka = {
  slug: string;
  judul: string;
  /** Legal basis or source file. Also the file named in the empty state. */
  dasar: string;
  deskripsi: string;
  anak: KerangkaNode[];
};

export type RingkasKerangka = { total: number; daun: number; kelompok: number; kedalaman: number };

/** How many nodes the tree has, how many are leaves, and how deep it goes. */
export function ringkasKerangka(k: Kerangka): RingkasKerangka {
  let total = 0;
  let daun = 0;
  let kelompok = 0;
  let kedalaman = 0;
  const jalan = (nodes: KerangkaNode[], depth: number) => {
    for (const n of nodes) {
      total++;
      kedalaman = Math.max(kedalaman, depth);
      if (n.anak?.length) {
        kelompok++;
        jalan(n.anak, depth + 1);
      } else {
        daun++;
      }
    }
  };
  jalan(k.anak, 1);
  return { total, daun, kelompok, kedalaman };
}

/**
 * Follow a path of ids from the root children. `ketemu` is false as soon as a
 * segment is unknown, so a caller can turn a stale link into a 404.
 */
export function bukaJalur(akar: KerangkaNode[], jalur: string[]): { jejak: KerangkaNode[]; node: KerangkaNode | null; ketemu: boolean } {
  let nodes = akar;
  const jejak: KerangkaNode[] = [];
  for (const id of jalur) {
    const n = nodes.find((x) => x.id === id);
    if (!n) return { jejak, node: null, ketemu: false };
    jejak.push(n);
    nodes = n.anak ?? [];
  }
  return { jejak, node: jejak.length ? jejak[jejak.length - 1] : null, ketemu: true };
}

/** Every Pemdi indicator number at or below this node. */
export function indikatorDalam(nodes: KerangkaNode[]): number[] {
  const out = new Set<number>();
  const jalan = (list: KerangkaNode[]) => {
    for (const n of list) {
      if (n.indikator != null) out.add(n.indikator);
      if (n.anak?.length) jalan(n.anak);
    }
  };
  jalan(nodes);
  return [...out].sort((a, b) => a - b);
}
