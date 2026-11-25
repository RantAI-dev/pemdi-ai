#!/usr/bin/env python3
"""Extract the 20 indicators of Permen PANRB 8/2026 (description and the
criteria of each maturity level) from `pdftotext -layout` output into
src/data/permen-kriteria.json.

Usage: pdftotext -layout permen.pdf permen.txt && scripts/extract-permen.py permen.txt
"""
import json, re, sys
from pathlib import Path

lines = Path(sys.argv[1]).read_text(encoding="utf-8").splitlines()
heads = [(i, int(m.group(1))) for i, l in enumerate(lines) if (m := re.match(r"\s*Indikator (\d+)\.\s", l))]
end = next(i for i, l in enumerate(lines) if "B. Metode Penghitungan Indeks Pemdi" in l)

LEVELS = ["Kurang", "Cukup", "Baik", "Sangat Baik", "Memuaskan"]
LEFT = re.compile(
    r"^\s*(\(?(Merintis|Membangun|Berkembang|Melembaga|Unggul)\s*/?\s*(Initiate|Leading)?\)?|/?\s*(Emerging|Developing|Embedded)\)|"
    r">?\s*\d,\d{1,2}\s*s\.d\.\s*<?\s*\d,\d{1,2}|Kurang|Cukup|Baik|Sangat Baik|Memuaskan)(?=\s{2,}|$)"
)

def clean(block, title_words):
    out, skip_title = [], False
    for l in block:
        if re.match(r"^\s*-\s*\d+\s*-\s*$", l) or not l.strip():
            continue
        if re.match(r"^\s*Aspek\s+Indikator\s+Bobot", l):
            skip_title = True
            continue
        if skip_title:
            body = re.sub(r"^\s*\d+\s+\d+\s+\d+%", "", l).strip()
            if body and all(w.strip(".,").lower() in title_words for w in body.split()):
                continue
            skip_title = False
        while True:
            new = LEFT.sub("", l, count=1)
            if new == l:
                break
            l = new
        l = re.sub(r"^\s*Kriteria:?\s*", "", l.strip())
        if l:
            out.append(l)
    text = re.sub(r"\s+", " ", " ".join(out)).strip()
    return re.sub(r"\s(\d)\. ", r"\n\1. ", " " + text).strip()

result = []
for n, (start, no) in enumerate(heads):
    stop = heads[n + 1][0] if n + 1 < len(heads) else end
    sec = lines[start:stop]
    # Stop before the next aspect's "x) Kuesioner dan Penjelasan" intro.
    for i, l in enumerate(sec):
        if i and re.match(r"\s*[a-g]\)\s+Kuesioner dan Penjelasan", l):
            sec = sec[:i]
            break
    title = re.sub(r"\s+", " ", " ".join(x.strip() for x in sec[:2] if "Aspek" not in x))
    title = re.sub(r"^Indikator \d+\.\s*", "", title).strip()
    words = {w.strip(".,").lower() for w in title.split()} | {"pemdi", "pemerintah", "digital", "kuesioner"}

    def find(pat, frm=0):
        return next((i for i in range(frm, len(sec)) if re.search(pat, sec[i])), None)

    d0, d1 = find(r"Deskripsi Indikator"), find(r"Instansi Pembina")
    desc = []
    for l in sec[d0:d1]:
        l = re.sub(r"^\s*Deskripsi Indikator:?", "", l)
        desc.append(l)
    starts = []
    pos = find(r"Peran Fungsi") or d1
    for lv in LEVELS:
        pos = find(rf"^\s{{0,12}}{lv}(\s{{2,}}|\s*$)", pos + 1 if starts else pos)
        starts.append(pos)
    levels = []
    for k, lv in enumerate(LEVELS):
        a, b = starts[k], starts[k + 1] if k + 1 < 5 else len(sec)
        levels.append({"level": k + 1, "kriteria": clean(sec[a:b], words)})
    result.append({"no": no, "judul": title, "deskripsi": clean(desc, words), "tingkat": levels})

out = Path(__file__).resolve().parents[1] / "src/data/permen-kriteria.json"
out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{len(result)} indikator -> {out}")
