# E09 真人实验集《就待一会儿》分镜表

系列：《猫带我去的地方》**工艺实验集**（不占晴印主线，圣经已登记例外）。
工艺：真人实拍感（photoreal live-action look），**全视频管线**——无静态帧，
5 段 I2V 720p + 1 段 OmniHuman 正脸说话段拼接。总时长 22s，
canvas 1920×1080（生成端 1280×720 统一档）。

> **V2 导演要求正脸**（2026-09-06 制作中修订，覆盖 V1「零正脸」设计）：
> seg3 改为正脸中近景（I2V），新增 seg5 槽位为 OmniHuman 正脸唇形特写，
> 原大远景顺延为 seg6（18.5–22.0）。正脸防畸变纪律见文末。

**实验目标**：
- 真人全视频管线打通（参考照 → 首帧 → I2V → OmniHuman → 拼接）
- 跨镜头角色一致性：橘猫为易锁定主体；女孩正脸两镜（seg3/omni）以同一张
  真人参考照编辑衍生
- 正脸唇形验证：VO2 由 OmniHuman 直接驱动唇形（V1 的全 VO 方案仅保留 VO1）
- 成本上限：¥35（I2V 5 段 ×¥4.02 实测价 + OmniHuman 1 段 + TTS，BGM/SFX 复用）

剧情（微型结构）：黄昏，女孩跟着橘猫沿河堤走（猫又带路了）。猫停下，
她蹲下来看它——正脸温柔微笑。河面碎金。她望着河轻声说：就待一会儿。
余韵：温柔。无暗线动作（F01/F02/F03 冷却）。

## 镜头表（V2，总时长 22s）

| # | 时间 | 类型 | 内容 | 声音 |
|---|------|------|------|------|
| 01 | 0.0–4.0 | **I2V seg1** | 黄昏河堤 establishing：金光水面、微风草浪、远桥（无人物） | 河水/晚风/鸟鸣底床，BGM 起 |
| 02 | 4.0–8.0 | **I2V seg2** | 跟拍背影：女孩（深蓝长发、校服）跟在橘猫后面沿河堤走，猫步领先 | VO Girl「小橘，今天又要去哪呀？」（~5s 起） |
| 03 | 8.0–12.0 | **I2V seg3（V2 正脸）** | 正脸中近景：女孩蹲下来，正脸朝镜头偏下方向（看猫），黄昏暖光打脸，温柔微笑，发丝轻吹；猫耳在画面下缘 | — |
| 04 | 12.0–16.0 | **I2V seg4** | 河面碎金特写，橘猫背影剪影坐在前景岸边 | — |
| 05 | 16.0–18.5 | **OmniHuman 正脸特写（V2 新增）** | 女孩正脸特写，望向画面右侧（河的方向），轻声说「就待一会儿。」唇形同步，黄昏侧光 | VO2 由 OmniHuman 自带声轨输出（不混入 mixed.wav） |
| 06 | 18.5–22.0 | **I2V seg5** | 大远景：一人一猫并排坐在河堤上看河，黄昏剪影 | BGM 收 |

## 角色/场景设计锁（真人版）

- **女孩**：16 岁清瘦，深蓝黑色长直发及腰，白色短袖校服衬衫（正脸镜有
  藏青格领结）、藏青格百褶裙、黑及膝袜、黑乐福鞋。V1：全片只出现背影/
  侧面/远景剪影；**V2：seg3 与 omni 段为正脸，其余镜头仍只给背影/剪影**
- **橘猫**：橘色虎斑、深条纹、白胸块、四白爪（同主线小橘设定）
- **场景**：黄昏河堤（金色水面、逆光、远桥、草浪），暖金+蓝紫阴影
- 英文锁（imagegen/I2V prompt 用）：

```text
Photorealistic live-action look, cinematic golden-hour dusk on a quiet
riverbank: golden sparkling water, warm rim light, soft blue-violet
shadows, gentle breeze in the grass. The girl: slim 16-year-old, long
straight deep blue-black hair to her waist, white short-sleeve school
shirt, navy plaid pleated skirt, black knee socks, black loafers.
The cat: orange tabby with darker stripes, white chest patch, four
white paws. Naturalistic color, shallow cinematic contrast, no text,
no watermark.
```

## 正脸防畸变纪律（V2 新增，执行约束）

1. **脸要够大**：seg3 首帧脸部高度 ≥ 画面 1/4；OmniHuman 底图脸部 ≥ 画面 1/3。
2. **动作极小**：seg3 I2V prompt 只许"微风拂发、极轻微呼吸感、微笑保持"，
   禁止点头/转头等头部运动描述。
3. **手部不入镜**：seg3 构图裁在胸口以上，手自然下垂不入画。
4. **OmniHuman 底图**：正脸特写、温柔微笑、黄昏侧光、视线朝画面右侧；
   omni prompt 不得提及底图中不存在的事物。
5. **目检加码**：正脸帧逐张检查——五官对称、眼珠不飘、牙齿不糊、发丝不溶
   进背景；不合格重 roll（改 seed 或微调 prompt），每镜最多 3 次。

## 验收要点

- 跨段一致性：seg2/3/5/6 的女孩发型/服装、seg2/3/4/6 的猫花色一致
- ~~无正脸~~（V2 废止）→ 正脸两镜（seg3、omni）按上方纪律逐帧目检
- 运动幅度纪律：走/坐/停，禁止大幅度动作（真人 I2V 畸变高发区）
- omni 段抽两帧确认口型开合差异
- 段与段切换处光线/色温必须连续
