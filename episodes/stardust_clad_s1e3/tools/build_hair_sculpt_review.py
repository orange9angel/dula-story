"""Make an evidence board from the encoded trial and existing reference crops."""
from pathlib import Path
import hashlib
import json
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageOps

EP = Path(__file__).resolve().parents[1]
OUT = EP / "storyboard/hair_sculpt_r10"
VIDEO = EP / "output/stardust_clad_s1e3_hair_sculpt_r10.mp4"
REF = EP / "tmp/hair_reference_compare"
FONT = "C:/Windows/Fonts/msyh.ttc"

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def write(draw, x, y, s, size=22):
    draw.text((x, y), s, font=ImageFont.truetype(FONT, size), fill="#edf0f3")

def tile(board, image, x, y, w=440, h=380, bg="#78818a"):
    panel = Image.new("RGB", (w, h), bg)
    image = ImageOps.contain(image.convert("RGB"), (w, h), Image.Resampling.LANCZOS)
    panel.paste(image, ((w-image.width)//2, (h-image.height)//2))
    board.paste(panel, (x, y))

rows = [
    ("近正面", .5, "structure_03.jpg", (780, 35, 1260, 550)),
    ("斜侧面", 2.566666667, "structure_03.jpg", (1280, 690, 2048, 1448)),
    ("侧面", 7, "structure_03.jpg", (70, 650, 745, 1420)),
    ("后斜面", 6.5, "structure_04.jpg", (1320, 135, 1635, 430)),
]
board = Image.new("RGB", (1500, 1880), "#111c27")
draw = ImageDraw.Draw(board)
write(draw, 24, 16, "头发实渲染对照：局部改变，整体尚未通过对标", 32)
write(draw, 24, 66, "本轮只改头发。参考与模型角度近似；后斜参考来自另一日期设定，不能作为精确拟合依据。", 20)
for x, title in [(140, "参考结构"), (590, "原版模型"), (1040, "本轮模型 R10")]:
    write(draw, x, 109, title, 24)
frames = []
for i, (label, t, ref, crop) in enumerate(rows):
    path = OUT / f"frame_{t:.3f}.png"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", str(VIDEO),
                    "-frames:v", "1", str(path)], check=True)
    frame = Image.open(path)
    y = 155+i*405
    write(draw, 16, y+70, label, 24)
    write(draw, 16, y+112, f"{t:.3f}s", 17)
    tile(board, Image.open(REF/ref).crop(crop), 140, y, bg="white")
    tile(board, frame.crop((15, 65, 625, 610)), 590, y)
    tile(board, frame.crop((655, 65, 1265, 610)), 1040, y)
    frames.append({"path":path.name, "at":t, "sha256":digest(path),
                   "reference":ref, "reference_sha256":digest(REF/ref), "reference_crop":crop})
write(draw, 24, 1800, "已改变：额前整块遮盖、逐束细亮纹。仍不足：中段厚重、侧后块状、发流衔接与轮廓节奏。", 22)
write(draw, 24, 1840, "图像生成设计稿没有贴入成片；设计稿质量不计作模型还原质量。动态证据另见 decoded/。", 20)
board.save(OUT/"comparison.jpg", quality=95)
prior = json.loads((EP/"storyboard/hair_reference_comparison/manifest.json").read_text(encoding="utf-8"))
manifest = {
    "source":str(VIDEO.relative_to(EP)), "sha256":digest(VIDEO),
    "viewing_method":"stills and ordered decoded frames; no native realtime video perception",
    "reference_sources":prior["references"],
    "frames":frames, "board_sha256":digest(OUT/"comparison.jpg"),
    "decision":"Not accepted for production replacement or reference-level quality.",
}
(OUT/"manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
print("Saved comparison.jpg and manifest.json")
