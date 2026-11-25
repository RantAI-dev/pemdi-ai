#!/usr/bin/env python3
"""OCR for files without a text layer: scanned PDFs and photos.

Usage: uv run -q --with rapidocr-onnxruntime python scripts/ocr.py <file> [max_pages]
Prints the recognised text to stdout. PDF pages are rendered with pdftoppm.
"""
import subprocess, sys, tempfile
from pathlib import Path
from rapidocr_onnxruntime import RapidOCR

src = Path(sys.argv[1])
max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 6
engine = RapidOCR()

def read(image: Path) -> str:
    result, _ = engine(str(image))
    if not result:
        return ""
    # One text line per row of boxes: boxes whose tops are close share a row.
    rows, current, top = [], [], None
    for box, text, _score in sorted(result, key=lambda r: (r[0][0][1], r[0][0][0])):
        y = box[0][1]
        if top is not None and abs(y - top) > 12:
            rows.append(current); current = []
        if not current:
            top = y
        current.append((box[0][0], text))
    rows.append(current)
    return "\n".join(" ".join(t for _, t in sorted(r)) for r in rows)

if src.suffix.lower() == ".pdf":
    with tempfile.TemporaryDirectory() as d:
        subprocess.run(["pdftoppm", "-r", "110", "-f", "1", "-l", str(max_pages), "-png", str(src), f"{d}/p"], check=True)
        for page in sorted(Path(d).glob("p-*.png")):
            print(read(page)); print()
else:
    print(read(src))
