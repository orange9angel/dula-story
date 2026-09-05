# 《伞下晴天》视觉生成契约

## 风格硬锁

原创“新工笔电影动画”：中国工笔重彩和青绿山水的色彩组织，清晰精细线稿，现代二维电影动画的面部表演与景深，矿物颜料颗粒、极轻绢本纹理、局部金箔微光。主色为青黛、孔雀蓝、月白；朱砂只作小面积点色；金色只用于伞内太阳和雨后光束。阴影保持冷青，高光为干净金色，黑位通透，禁止棕黄怀旧滤镜、低对比雾蒙感和全片统一暖色。

16:9 横构图，电影式景别变化。画面要有明显前中后景，空气可见：薄雾、柳叶、花瓣、雨线、炊烟、光束。湿石板和河面提供真实反射。人物脸部使用清秀但非幼态的原创二维动画造型。

## 身份硬锁

- Girl/小蓝：18–20 岁，琥珀金眼，深靛蓝长直发到腰，齐刘海，柔和鹅蛋脸；月白交领右衽上衣、青黛马面裙、朱砂窄滚边、深蓝发带、小金簪。活泼聪明，身体语言主动。
- Boy/阿澈：18–20 岁，暖灰褐眼，黑色柔软短碎发改为半束发，额前保留自然碎发，清瘦温和脸型；米白交领右衽长衫、青灰外褙、靛蓝腰带、简洁玉簪。少年感、无胡须、没有播音腔式老成表情。

## 场景硬锁

中国江南水乡：白墙黛瓦、木构临水廊桥、青石拱桥、石板路、窄河、柳树、画摊。没有现代物件。雨前清晨为冷青薄雾；骤雨段为深孔雀蓝与银灰；雨后为冷青阴影和强金色破云光。

## 道具状态

唯一主伞：旧深靛蓝油纸伞，竹制伞骨、木柄。外侧始终素净无大图案；内侧从空白逐步出现手绘矿物金太阳。伞不能变色、变数量或变为日式纸伞。

## 通用 Avoid

Japanese kimono, obi bow, torii, shrine, geta, katana, Japanese street, modern clothing, modern buildings, Western medieval costume, Korean hanbok, left-lapel robe, sepia filter, brown vintage palette, washed-out low contrast, 3D CGI, photorealism, extra fingers, extra limbs, duplicate umbrella, unreadable prominent text, watermark, logo.

## 动作生成纪律

每个连续动作按 setup → anticipation → action → apex/contact → recovery 生成；相邻帧只改变姿势、表情、视线、伞的位置和衣发次级运动。身份、服装、场景几何、光向、机位、屏幕运动方向保持锁定。追逐统一从画面左向右；雨中慢走统一从右向左。拒绝动作相位没有实际变化的“假中间帧”。
