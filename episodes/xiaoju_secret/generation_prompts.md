# 《小橘的秘密》生成提示词与翻车记录

130 秒日漫温情浪漫短片（中等长度故事的「前 2 分钟」），时间线衔接《雨后天台》。
画面管线复刻 `rainy_rooftop_cat` V3：codex 内置 imagegen 关键帧 + 参考图链 +
局部编辑变体（口型/眨眼）+ 程序化浮尘层（替代雨丝层）。

角色母版：小蓝/小橘沿用 `rainy_rooftop_cat/assets/{girl,cat}_reference.png`；
阿澈母版为本集新增 `tmp/gen/boy_reference.png`（正式副本见下）。

## 阿澈角色母版（boy_reference）

参考图：girl_reference（锁定画风与校服）

```text
Use case: master character reference for an anime short. Image 1 is the style and heroine
reference from the same series. Draw one original Japanese-anime-style 17-year-old boy
sitting on sunny riverside concrete steps, holding a kraft-paper cover sketchbook on his
lap and a pencil in his right hand, looking down at the sketchbook with a gentle quiet
smile. Design lock: slim build; warm light skin; short black hair with slightly messy
fringe; dark gray eyes; white short-sleeve school shirt matching the uniform in image 1;
navy-blue trousers; white sneakers; exactly one sketchbook and one pencil. Style: same
polished 2D Japanese animation as image 1, clean cel shading, crisp line art, golden
late-afternoon sunlight, sparkling river in the background, realistic anime film
lighting. Composition: 16:9 landscape, full body visible sitting on the steps at center,
eye-level three-quarter side view. Avoid: extra people, cats, duplicate limbs, text,
captions, logos, watermark, signature, photorealism, 3D render.
输出与输入完全相同的尺寸（1672x941）PNG
```

## 全集共享锁（每帧提示词均含对应段落）

- Girl lock：沿用前作逐字描述（及腰深蓝长直发/琥珀瞳/齐刘海/白衬衫/藏青格裙/及膝袜/乐福鞋/藏青书包）
- Boy lock：黑色微翘短发、深灰瞳、白衬衫（同款校服）、藏青长裤、白运动鞋、牛皮纸速写本
- Cat lock：橘虎斑 + 深条纹 + 白胸白爪 + 绿眼；本集全程干爽蓬松
- Scene lock A（家）：小公寓、木格推拉门、窗台绿植、猫碗小鱼干罐；清晨金色阳光
- Scene lock B（街巷）：居民区小巷、混凝土砌块围墙、电线杆、夕阳长影
- Scene lock C（河堤）：草地坡、水泥台阶、河面金色反光
- 银幕方向：小橘出行朝画面右方；阿澈的台阶在画面右侧
- Avoid：extra people or cats, duplicate limbs, malformed hands, text, watermark, photorealism, 3D render

## 逐帧记录（参考图链）

42 张基础关键帧（frame_00–frame_41）+ 2 张动作中间画，全部一审通过，提示词全文见
`tools/gen_actA.sh`（00–09 家中清晨）、`tools/gen_actB.sh`（10–17 街巷黄昏）、
`tools/gen_actC.sh`（18–41 河堤相遇与收尾）。参考图链：每帧携带对应角色母版 +
相邻已审帧；车道 C 以车道 B 的 frame_13（巷口）锚定街巷画风、自生成 frame_18（河堤建立帧）后链式推进。

| 段落 | 帧 | 审查 |
|------|----|------|
| 家中清晨 | frame_00–09 | 全部通过 |
| 街巷追猫 | frame_10–17 | 全部通过 |
| 河堤相遇 | frame_18–33 | 全部通过；frame_33（伞下少女速写 callback）一张过 |
| 收尾 | frame_34–41 | 全部通过 |
| 中间画 | run_alt（跑步过渡相）、catwalk_alt（猫步换相） | 通过；沿用 rainy 教训：触地相↔过渡相交替、核鞋尖方向 |

## 口型/眨眼变体（14 口型 rig + 13 眨眼 rig）

**重要翻车与管线修正**：本集第一轮整图局部编辑（prompt 声明「其余逐像素不变」）
产出 41 个变体，验收发现 **「half 系」几乎全部整图重渲染**（diff bbox 覆盖 100% 画面，
lock_region_variant.py 以 DRIFT 拒收；「open 系」约半数是合规局部编辑）。
结论：仅靠提示词约束不住 codex 的局部编辑纪律。

**修正方案（tools/variant_crop_edit.py）**：裁剪强制局部编辑——先把特征区
（嘴 ~200×140px / 眼 ~260×140px）从基帧裁出，放大 2× 单独送 codex 编辑，
再羽化贴回基帧。模型无法漂出裁剪区，局部性由构造保证。
31 项重做全部通过（diff 校验 confined + 逐张 montage 目检）。

| rig 类型 | 数量 | 产物 |
|----------|------|------|
| 小蓝口型（half+open） | 7 rig / 14 图 | `assets/mouth_variants/frame_{05,16,23,28,32,34,39}_*` |
| 阿澈口型（half+open） | 6 rig / 12 图 | `assets/mouth_variants/frame_{22,27,29,31,36,38}_*` |
| 小橘喵叫口型 | 1 rig / 2 图 | `assets/mouth_variants/frame_25_meow_*` |
| 眨眼（closed） | 13 rig / 13 图 | `assets/eye_variants/frame_{04,05,09,16,21,23,26,27,29,32,35,36,39}_*` |

rig rect 由 `tools/finalize_rigs.py` 对锁定变体与基帧做像素 diff 后取 union bbox 自动生成，
同时产出 `config/mouth_rigs.json` / `config/eye_rigs.json`。

### 变体翻车记录

- frame_04 眨眼连续两 roll 单眼 wink；codex 配额耗尽后改用 V3 漂移整图变体的眼部区域
  羽化贴回（lock_mouth_variant.py --rect），目检无缝。
- frame_21 眨眼首版裁剪 rect 偏下（盖住下巴没盖住眼），变体眼睛仍睁开；按真实眼部
  坐标重裁后通过。**教训：裁剪 rect 必须在全尺寸图上核对特征位置，不能只看缩略图估算。**
- codex 会话内 PowerShell 后处理会被 sandbox 策略拦（blocked by policy），在 prompt 中
  追加「只调用 imagegen 生成图片即可，不要执行任何 shell/PowerShell 后处理」后提速明显。
- 变体尺寸常比基帧窄 1px（1671 vs 1672）：锁定前按边缘像素补齐（lock_all_variants.py
  normalize_size / variant_crop_edit.py 内建同款逻辑）。

## 程序化浮尘层（替代雨丝层）

`scenes/XiaojuSecretSequenceScene.js`：46 粒金色浮尘（1.4–3.6px、缓慢上浮、正弦摇摆、
明暗呼吸）+ 8 粒大虚化 bokeh 光斑，全部为 f(粒子序号, 绝对时间) 的确定性纯函数，
逐帧可复现。雨丝/涟漪/溅落代码整体移除。

## 音频

- 配音：DashScope CosyVoice v3 flash；小蓝 = longxiaoxia_v3（沿用前作），
  阿澈 = longshu_v3（用基频分析从 13 个候选音色中选出：f0≈161Hz 暖色少年音，pitch 1.04）
- SFX：鸟鸣/街道环境/河风/推拉门/翻页为 pixabay CC0 新素材（sources/LICENSES.md 存档），
  猫叫×2/猫呼噜×2/脚步沿用前作资产
- BGM：gentle_folk_calm_acoustic_371398（pixabay），包络：57.8s 河堤揭开小扬、
  105.4s 速写本 reveal 全扬、128s 起淡出
- 口型：语音能量→中文音节→12fps 三态 cel（build_lipsync.py 拼音表已覆盖本集全部台词汉字）

## 验收

- check_lipsync：51 beats / 14 mouth rigs / 25 cues / 72 图全过
- dula-verify：33 张 check_shot 无 PAGE ERROR
- 全片渲染 output/output.mp4（1920×1080@30fps，130.4s）
- 抽帧审查：见 REVIEW_NOTES.md

## V1.7–V1.9：图像编辑管线迁移（codex → 百炼）

codex imagegen 配额于收尾阶段锁定后，图像编辑切换至百炼 DashScope：

- `tools/wanx_crop_edit.py`：`wanx2.1-imageedit` 掩码局部重绘通路。**后经用户验收发现
  本体保持不足（猫被画成另一只），弃用于角色 cel**。
- `tools/qwen_edit.py`：`qwen-image-edit` 通路（当前正式）。构图锁定提示词 + 双模式
  （--full-frame 整图变体 / 裁剪+椭圆羽化贴回 cel）。
- `tools/transplant_blinks.py`：废案回收对齐贴回（V1.6 过渡方案，已被 qwen 通路取代）。
- `tools/synth_blinks.py`：纯程序化合成（毛色覆盖+睫毛线，应急兜底，质量最低）。
- `tools/relock_tight_rects.py` / `tools/refine_variants.py` / `tools/finalize_rigs.py`：
  变体紧锁与 rig 装配（rect 由 diff 自动派生）。
- 场景引擎 `eyeRig` 支持数组（单镜头多角色眨眼，V1.5 起）。

cel 选择优先级（本集验证）：qwen-image-edit 原生重画 > 废案 AI 内容回收 > 程序化合成。
详细教训见 `dula-skills/build-continuous-story-images/references/qwen-image-edit-local-cels.md`
与本集 `REVIEW_NOTES.md`（V1.1–V1.9 逐版记录）。
