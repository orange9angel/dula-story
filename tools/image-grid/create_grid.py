from PIL import Image, ImageDraw, ImageFont
import os

# 五小强信息
characters = [
    ('seiya', '星矢', '天马座', '#FF4444'),
    ('shiryu', '紫龙', '天龙座', '#44AA44'),
    ('hyoga', '冰河', '白鸟座', '#4444FF'),
    ('shun', '瞬', '仙女座', '#FF44FF'),
    ('ikki', '一辉', '凤凰座', '#FF8800'),
]

# 创建画布 - 5宫格布局 (2行: 3+2)
grid_width = 3
cell_width = 400
cell_height = 500
padding = 10

canvas_width = grid_width * cell_width + (grid_width + 1) * padding
canvas_height = 2 * cell_height + 3 * padding

# 创建白色背景
canvas = Image.new('RGB', (canvas_width, canvas_height), '#F5F5F5')
draw = ImageDraw.Draw(canvas)

# 尝试加载字体
try:
    # Windows字体
    font_name = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 32)
    font_title = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 40)
    font_small = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 24)
except:
    try:
        font_name = ImageFont.truetype("C:/Windows/Fonts/simhei.ttf", 32)
        font_title = ImageFont.truetype("C:/Windows/Fonts/simhei.ttf", 40)
        font_small = ImageFont.truetype("C:/Windows/Fonts/simhei.ttf", 24)
    except:
        font_name = ImageFont.load_default()
        font_title = font_name
        font_small = font_name

# 绘制标题
title = "圣斗士五小强"
title_bbox = draw.textbbox((0, 0), title, font=font_title)
title_width = title_bbox[2] - title_bbox[0]
title_x = (canvas_width - title_width) // 2
draw.text((title_x, 15), title, fill='#333333', font=font_title)

# 绘制每个角色
for idx, (filename, name, constellation, color) in enumerate(characters):
    # 计算位置 (第一行3个, 第二行2个居中)
    if idx < 3:
        row = 0
        col = idx
        start_y = 70
    else:
        row = 1
        col = idx - 3
        # 第二行居中
        start_y = 70
    
    x = padding + col * (cell_width + padding)
    if row == 1:
        # 第二行居中偏移
        x += (cell_width + padding) // 2
    y = start_y + row * (cell_height + padding)
    
    # 加载图片
    img_path = f'output/{filename}.jpg'
    if os.path.exists(img_path):
        img = Image.open(img_path)
        # 裁剪为正方形并缩放
        img_width, img_height = img.size
        min_dim = min(img_width, img_height)
        left = (img_width - min_dim) // 2
        top = (img_height - min_dim) // 2
        img = img.crop((left, top, left + min_dim, top + min_dim))
        img = img.resize((cell_width - 20, cell_width - 20), Image.LANCZOS)
        
        # 创建圆角遮罩
        mask = Image.new('L', (cell_width - 20, cell_width - 20), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle([0, 0, cell_width - 20, cell_width - 20], radius=20, fill=255)
        
        # 粘贴图片
        canvas.paste(img, (x + 10, y + 10), mask)
    
    # 绘制名字和星座
    name_y = y + cell_width + 15
    name_bbox = draw.textbbox((0, 0), name, font=font_name)
    name_width = name_bbox[2] - name_bbox[0]
    name_x = x + (cell_width - name_width) // 2
    draw.text((name_x, name_y), name, fill=color, font=font_name)
    
    const_y = name_y + 45
    const_bbox = draw.textbbox((0, 0), constellation, font=font_small)
    const_width = const_bbox[2] - const_bbox[0]
    const_x = x + (cell_width - const_width) // 2
    draw.text((const_x, const_y), constellation, fill='#666666', font=font_small)

# 保存
output_path = 'output/saint_seiya_grid.jpg'
canvas.save(output_path, 'JPEG', quality=95)
print(f'五宫格已保存: {output_path}')
print(f'尺寸: {canvas_width}x{canvas_height}')
