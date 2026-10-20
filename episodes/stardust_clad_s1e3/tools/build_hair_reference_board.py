"""Reproduce a scoped visual comparison from reference crops and decoded R6 frames."""
from pathlib import Path
import hashlib
import json
import subprocess

from PIL import Image, ImageDraw, ImageFont, ImageOps

EP = Path(__file__).resolve().parents[1]
REF = EP / "tmp/hair_reference_compare"
OUT = EP / "storyboard/hair_reference_comparison"
OUT.mkdir(parents=True, exist_ok=True)
VIDEO = EP / "output/stardust_clad_s1e3_hair_study_r6.mp4"
FONT = "C:/Windows/Fonts/msyh.ttc"


def font(size):
    return ImageFont.truetype(FONT, size)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def text(draw, xy, value, size=22, fill="#e6edf3"):
    draw.text(xy, value, font=font(size), fill=fill)


def fit(canvas, image, box, background="#ffffff"):
    x, y, w, h = box
    tile = Image.new("RGB", (w, h), background)
    image = ImageOps.contain(image.convert("RGB"), (w, h), Image.Resampling.LANCZOS)
    tile.paste(image, ((w - image.width) // 2, (h - image.height) // 2))
    canvas.paste(tile, (x, y))


times = [0.5, 2.566666667, 7, 6.5, 5]
frames = {}
for t in times:
    path = OUT / f"frame_{t:06.3f}.png"
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(t),
         "-i", str(VIDEO), "-frames:v", "1", str(path)],
        check=True,
    )
    frames[t] = path

refs = [
    {
        "id": "A", "file": "structure_03.jpg",
        "page": "https://characterdesignreferences.com/art-of-animation-9/art-of-saint-seiya-knights-of-the-zodiac",
        "url": "https://images.squarespace-cdn.com/content/v1/54fc8146e4b02a22841f4df7/1685493854600-1BH8PNRBBVF36KOEUKG0/Art_of_Saint_Seiya_Knights_of_the_Zodiac_3.jpg",
        "scope": "Expression drawing with visible date 02 8/2. Reposted production drawing, not independently authenticated. Structure only.",
    },
    {
        "id": "B", "file": "structure_04.jpg",
        "page": "https://characterdesignreferences.com/art-of-animation-9/art-of-saint-seiya-knights-of-the-zodiac",
        "url": "https://images.squarespace-cdn.com/content/v1/54fc8146e4b02a22841f4df7/1685493876653-ZJCZV7J77LWNUY656UQP/Art_of_Saint_Seiya_Knights_of_the_Zodiac_4.jpg",
        "scope": "Training-costume drawing dated 04 3/10. Rear silhouette supplement from another drawing, not proof of an exact 2002 rear design.",
    },
    {
        "id": "C", "file": "color_03.jpg",
        "page": "https://animationdigitalnetwork.com/video/1195-saint-seiya-chapitre-hades/25530-episode-26",
        "url": "https://image.animationdigitalnetwork.com/license/saintseiyahades/tv/web/eps26_1920x1080.jpg",
        "scope": "Distributor episode-26 still, later chapter; only broad light/shadow and lock-group organization. Top of hair cropped by original shot.",
    },
]
for ref in refs:
    ref["sha256"] = digest(REF / ref["file"])
    ref["size"] = Image.open(REF / ref["file"]).size

rows = [
    ("近正面", "额前分组", 0.5, "A", (780, 35, 1260, 550)),
    ("斜侧面", "主束弧线", 2.566666667, "A", (1280, 690, 2048, 1448)),
    ("侧面", "耳前／耳后", 7, "A", (70, 650, 745, 1420)),
    ("后斜面", "后脑／颈后", 6.5, "B", (1320, 135, 1635, 430)),
]
board = Image.new("RGB", (1580, 2120), "#111c27")
draw = ImageDraw.Draw(board)
text(draw, (28, 18), "发型多角度对照：参考结构／原版／研究候选", 35)
text(draw, (28, 69), "只比较组织方法；角色、画法和摄影条件不同。保持比例裁切，无镜像、变形或重新绘制。", 22)
for x, title in zip([185, 650, 1115], ["参考线稿", "我们的原版", "我们的 R6 候选（未通过）"]):
    text(draw, (x, 116), title, 26)
for index, (angle, focus, t, ref_id, crop) in enumerate(rows):
    y = 165 + index * 465
    draw.line((20, y - 8, 1560, y - 8), fill="#3a4a59", width=2)
    text(draw, (22, y + 35), angle, 27)
    text(draw, (22, y + 85), focus, 20)
    text(draw, (22, y + 125), f"R6 {t:.3f}s", 17)
    ref = next(item for item in refs if item["id"] == ref_id)
    fit(board, Image.open(REF / ref["file"]).crop(crop), (180, y, 445, 410))
    frame = Image.open(frames[t])
    for offset, x in [(0, 645), (640, 1110)]:
        fit(board, frame.crop((15 + offset, 65, 625 + offset, 610)), (x, y, 445, 410), "#78838b")
    label = "A：图上日期 02 8/2" if ref_id == "A" else "B：04 3/10；另一版，仅补后侧轮廓"
    text(draw, (180, y + 417), label, 18)
text(draw, (28, 2040), "线稿不用于判断受光；角度为近似对应，不作精确比例拟合。背面彩色与连续动作仍缺对照。", 22)
text(draw, (28, 2080), "来源与裁切坐标见 manifest.json；本图仅用于分析，不是新造型或修复验收。", 19)
board.save(OUT / "angles.jpg", quality=95)

board = Image.new("RGB", (1580, 1080), "#111c27")
draw = ImageDraw.Draw(board)
text(draw, (25, 18), "明暗对照：亮面是否说明发束的弯曲与分组", 34)
text(draw, (25, 65), "参考 C 为后续章节的发行方剧照；光位、发色、头姿不同，不比较绝对亮度。", 22)
for x, title in zip([25, 550, 1075], ["参考：连成大块的暗部与弯曲亮面", "我们的原版：逐束圆滑亮条", "我们的候选：圆壳明暗与横带"]):
    text(draw, (x, 117), title, 21)
fit(board, Image.open(REF / "color_03.jpg").crop((235, 0, 1685, 1080)), (25, 160, 480, 440), "#08090c")
for offset, x in [(0, 550), (640, 1075)]:
    fit(board, Image.open(frames[0.5]).crop((15 + offset, 65, 625 + offset, 610)), (x, 160, 480, 440), "#78838b")
text(draw, (25, 630), "局部复查：候选侧后面的亮带在相近高度横贯多束头发", 26)
fit(board, Image.open(frames[5]).crop((685, 85, 1190, 370)), (25, 680, 720, 300), "#78838b")
fit(board, Image.open(frames[6.5]).crop((680, 75, 1240, 380)), (805, 680, 720, 300), "#78838b")
text(draw, (25, 998), "R6 5.000s，侧面", 20)
text(draw, (805, 998), "R6 6.500s，后斜面", 20)
text(draw, (25, 1040), "候选横带与球壳受光的实现原因已核对；尚未修改，也未进行灯位变化试验。", 21)
board.save(OUT / "lighting.jpg", quality=95)

manifest = {
    "date": "2026-10-20",
    "source_video": str(VIDEO.relative_to(EP)).replace("\\", "/"),
    "source_sha256": digest(VIDEO),
    "method": "still and previously inspected ordered frames; no realtime motion judgment",
    "references": refs,
    "angle_rows": [
        dict(angle=r[0], focus=r[1], time=r[2], reference=r[3], crop=r[4]) for r in rows
    ],
    "frames": [
        dict(path=path.name, at=t, sha256=digest(path)) for t, path in frames.items()
    ],
    "boards": [
        dict(path=name, sha256=digest(OUT / name)) for name in ["angles.jpg", "lighting.jpg"]
    ],
    "limitations": [
        "Different character identities, camera, lighting, color and medium; no direct aesthetic score.",
        "Rear reference is a separate dated costume drawing, not a verified same-version turnaround.",
        "No complete same-version colored turnaround or matched dynamic reference was reviewed.",
        "The new candidate remains rejected; no production asset changed in this comparison.",
    ],
}
(OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"output": str(OUT), "frames": len(frames), "boards": 2}))
