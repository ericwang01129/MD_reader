import pdfplumber
import sys

pdf_path = "d:/帶團用/MD_reader/Ragnarok/少女戦線ラグナロク20250430.pdf"
out_path = "d:/帶團用/MD_reader/Ragnarok/raw_plumber.txt"

with pdfplumber.open(pdf_path) as pdf:
    print(f"Total pages: {len(pdf.pages)}", file=sys.stderr)
    with open(out_path, "w", encoding="utf-8") as f:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            f.write(f"\n===== PAGE {i+1} =====\n")
            if text:
                f.write(text)
            f.write("\n")
            if i < 3:
                print(f"--- Page {i+1} ---", file=sys.stderr)
                print(text[:500] if text else "(no text)", file=sys.stderr)
