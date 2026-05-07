"""把 To_change/story/ 內 7 份 PDF 的每一頁渲染成 JPG，
存入 To_change/images/stories/<slug>_p<NN>.jpg。"""
import fitz  # PyMuPDF
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT.parent / "images" / "stories"
OUT.mkdir(parents=True, exist_ok=True)

# PDF 檔名 → slug
PDFS = {
    "Becoming Bigfoot.pdf": "becoming_bigfoot",
    "Candied_Blood.pdf": "candied_blood",
    "No Better Team.pdf": "no_better_team",
    "Six Gossamer Rings.pdf": "six_gossamer_rings",
    "The Estivating Subsumption.pdf": "estivating_subsumption",
    "Watching the Loch.pdf": "watching_the_loch",
    "Whence All Monsters Come.pdf": "whence_all_monsters",
}

for filename, slug in PDFS.items():
    src = ROOT / filename
    if not src.exists():
        print(f"!! missing: {src}")
        continue
    doc = fitz.open(src)
    print(f"== {filename}: {len(doc)} pages")
    for i in range(len(doc)):
        page = doc[i]
        # 150 DPI 以提供合理檔大小／品質平衡
        pix = page.get_pixmap(dpi=150)
        out = OUT / f"{slug}_p{i+1:02d}.jpg"
        pix.save(out)
        print(f"  -> {out.name} ({pix.width}x{pix.height})")
    doc.close()

print("done.")
