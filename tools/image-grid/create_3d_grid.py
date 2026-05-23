from PIL import Image
import os

# Load the 6 verify screenshots
base = r"D:\opensource\movie\dula-story\episodes\saint_seiya_five\storyboard"
shots = [f"check_shot_{i:02d}.jpg" for i in range(1, 7)]
images = [Image.open(os.path.join(base, s)) for s in shots]

# Each shot is 1920x1080. Extract a close-up of each character.
# Characters are spaced at x=-4,-2,0,2,4, camera at z=5.
# At 1920x1080, each character occupies roughly 1/5 of the width.
# We'll crop centered regions for each character.

w, h = 1920, 1080
# Character positions in pixels (approximate center x)
char_centers = [340, 760, 1080, 1400, 1720]  # approximate
char_names = ["Seiya", "Shiryu", "Hyoga", "Shun", "Ikki"]

# For each character, pick the best shot where they're most centered
# Shot 01: all 5, Shot 02: Shiryu center, Shot 03: Hyoga center, Shot 04: Shun center, Shot 05: Ikki center, Shot 06: Ikki close
# Actually let's use the shots where each character is most prominent:
# Seiya: shot 01 (leftmost), Shiryu: shot 02, Hyoga: shot 03, Shun: shot 04, Ikki: shot 06
# Use shot 01 with precise character positions from visual inspection:
# Seiya~380, Shiryu~640, Hyoga~960, Shun~1200, Ikki~1520
shot = images[0]
char_x = [440, 680, 960, 1160, 1480]

# Crop size - narrow enough to avoid overlap, wide enough for full body
crop_w, crop_h = 280, 520

thumbnails = []
for i, (name, cx) in enumerate(zip(char_names, char_x)):
    left = max(0, cx - crop_w // 2)
    top = max(0, h // 2 - crop_h // 2 - 30)
    right = min(w, left + crop_w)
    bottom = min(h, top + crop_h)
    
    crop = shot.crop((left, top, right, bottom))
    # Resize to uniform size
    crop = crop.resize((360, 480), Image.LANCZOS)
    thumbnails.append(crop)

# Create 5-panel grid: 1 row, 5 columns
panel_w, panel_h = 360, 480
margin = 15
label_h = 40

total_w = panel_w * 5 + margin * 6
total_h = panel_h + label_h + margin * 2

grid = Image.new('RGB', (total_w, total_h), (30, 30, 40))

from PIL import ImageDraw, ImageFont
draw = ImageDraw.Draw(grid)

try:
    font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 24)
except:
    font = ImageFont.load_default()

for i, (thumb, name) in enumerate(zip(thumbnails, char_names)):
    x = margin + i * (panel_w + margin)
    y = margin
    grid.paste(thumb, (x, y))
    
    # Label
    bbox = draw.textbbox((0, 0), name, font=font)
    text_w = bbox[2] - bbox[0]
    text_x = x + (panel_w - text_w) // 2
    text_y = y + panel_h + 8
    draw.text((text_x, text_y), name, fill=(255, 255, 255), font=font)

out_path = r"D:\opensource\movie\output\saint_seiya_five_3d_grid.jpg"
os.makedirs(os.path.dirname(out_path), exist_ok=True)
grid.save(out_path, quality=95)
print(f"Saved: {out_path} ({total_w}x{total_h})")
