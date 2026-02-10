from pathlib import Path
from PIL import Image

SRC_DIR = Path("bg/master")     # ← ここ
DST_DIR = Path("bg/runtime")    # ← ここ
QUALITY = 82
MAX_HEIGHT = 1920

DST_DIR.mkdir(parents=True, exist_ok=True)

for png_path in SRC_DIR.glob("*.png"):
    with Image.open(png_path) as img:
        img = img.convert("RGB")

        if img.height > MAX_HEIGHT:
            ratio = MAX_HEIGHT / img.height
            img = img.resize(
                (int(img.width * ratio), MAX_HEIGHT),
                Image.LANCZOS
            )

        out_path = DST_DIR / (png_path.stem + ".webp")
        img.save(
            out_path,
            format="WEBP",
            quality=QUALITY,
            method=6
        )

        print(f"Converted: {png_path.name} -> {out_path.name}")

print("Done.")
