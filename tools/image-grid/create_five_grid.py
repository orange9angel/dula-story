from PIL import Image, ImageDraw, ImageFont
import os

# 角色截图路径
shots = [
    ('D:\\opensource\\movie\\dula-story\\episodes\\saint_seiya_five\\storyboard\\check_shot_02.jpg', '星矢', '天马座', '#FF4444'),
    ('D:\\opensource\\movie\\dula-story\\episodes\\saint_seiya_five\\storyboard\\check_shot_03.jpg', '紫龙', '天龙座', '#44AA44'),
    ('D:\\opensource\\movie\\dula-story\\episodes\\saint_seiya_five\\storyboard\\check_shot_04.jpg', '冰河', '白鸟座', '#4444FF'),
    ('D:\\opensource\\movie\\dula-story\\episodes\\saint_seiya_five\\storyboard\\check_shot_05.jpg', '瞬', '仙女座', '#FF44FF'),
    ('D:\\opensource\\movie\\dula-story\\episodes\\saint_seiya_five\\storyboard\\check_shot_06.jpg', '一辉', '凤凰座', '#FF8800'),
]

# 创建画布 - 5宫格布局 (2行: 3+2)
cell_width = 600
cell_height = 400
text_height = 80
padding = 15

canvas_width = 3 * cell_width + 4 * padding
canvas_height = 2 * (cell_height + text_height) + 3 * padding

# 创建深色背景
canvas = Image.new('RGB', (canvas_width, canvas_height), '#1a1a2e')
draw = ImageDraw.Draw(canvas)

# 尝试加载字体
try:
    font_name = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 32)
    font_constellation = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 22)
    font_title = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 42)
except:
    font_name = ImageFont.load_default()
    font_constellation = font_name
    font_title = font_name

# 绘制标题
title = "圣斗士五小强"
title_bbox = draw.textbbox((0, 0), title, font=font_title)
title_width = title_bbox[2] - title_bbox[0]
title_x = (canvas_width - title_width) // 2
draw.text((title_x, 12), title, fill='#FFD700', font=font_title)

# 绘制每个角色
start_y = 65
for idx, (path, name, constellation, color) in enumerate(shots):
    # 计算位置 (第一行3个, 第二行2个居中)
    if idx < 3:
        row = 0
        col = idx
    else:
        row = 1
        col = idx - 3
    
    x = padding + col * (cell_width + padding)
    if row == 1:
        # 第二行居中偏移
        x += (cell_width + padding) // 2
    y = start_y + row * (cell_height + text_height + padding)
    
    # 加载图片
    if os.path.exists(path):
        img = Image.open(path)
        # 裁剪为16:9并缩放
        img_width, img_height = img.size
        target_ratio = cell_width / cell_height
        current_ratio = img_width / img_height
        
        if current_ratio > target_ratio:
            # 太宽，裁左右
            new_width = int(img_height * target_ratio)
            left = (img_width - new_width) // 2
            img = img.crop((left, 0, left + new_width, img_height))
        else:
            # 太高，裁上下
            new_height = int(img_width / target_ratio)
            top = (img_height - new_height) // 2
            img = img.crop((0, top, img_width, top + new_height))
        
        img = img.resize((cell_width, cell_height), Image.LANCZOS)
        
        # 绘制边框
        draw.rectangle([x-2, y-2, x+cell_width+2, y+cell_height+2], outline='#FFD700', width=2)
        canvas.paste(img, (x, y))
    
    # 绘制名字和星座
    name_y = y + cell_height + 10
    name_bbox = draw.textbbox((0, 0), name, font=font_name)
    name_width = name_bbox[2] - name_bbox[0]
    name_x = x + (cell_width - name_width) // 2
    draw.text((name_x, name_y), name, fill=color, font=font_name)
    
    const_y = name_y + 42
    const_bbox = draw.textbbox((0, 0), constellation, font=font_constellation)
    const_width = const_bbox[2] - const_bbox[0]
    const_x = x + (cell_width - const_width) // 2
    draw.text((const_x, const_y), constellation, fill='#CCCCCC', font=font_constellation)

# 保存
output_path = 'output/saint_seiya_five_3d_grid.jpg'
canvas.save(output_path, 'JPEG', quality=95)
print(f'五宫格已保存: {output_path}')
print(f'尺寸: {canvas_width}x{canvas_height}')
