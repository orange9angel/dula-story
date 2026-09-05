# 晴印（Sunprint）风格圣经 · E07 增量

继承 E04-E06 全部规则。E07 只记录新增：白天基准时段（午后），无
time-of-day override。

## 新角色设计锁：老周（OldMan）

- 68 岁，清瘦微驼背，河边钓鱼翁
- 草帽（平顶旧草帽）、卡其色多口袋钓鱼马甲、白色卷袖衬衫、深灰长裤、
  旧胶鞋；身旁一支长竹钓竿、一个铁皮水桶、一张折叠小马扎
- 面容：慈祥，笑眼眯起，皱纹只用 2-3 条克制线条表达（晴印纪律：
  线条极简，不靠细节堆老态）
- 气质：慢，稳，什么都见过一点

英文设计锁（imagegen prompt 用）：

```text
The old man: slim 68-year-old fisherman with a slight stoop, kind wrinkled
face with narrow smiling eyes (wrinkles drawn with only two or three
restrained lines), a worn flat-top straw hat, a khaki multi-pocket fishing
vest over a white shirt with rolled sleeves, dark gray trousers, old rubber
shoes. A long bamboo fishing rod, a tin bucket and a small folding stool
beside him. Slow, steady, seen-everything temperament.
```

## 环境微动变体语法（A/B 扩展到环境，E07 新增）

E06 验证了角色微动（耳朵/呼吸）的 A/B 变体。E07 扩展到环境元素：

- **柳枝摇摆变体对**：同一构图两张，仅垂柳枝条的摆动位置不同
  （"change ONLY the hanging willow branch positions, swaying gently to
  the RIGHT, keep everything else pixel-identical"），1.0s 交替。
- **光斑漂移变体对**：同一构图两张，仅地面/台阶上的洒金光斑位置偏移
  数像素（"change ONLY the dappled light spot positions, shifted slightly,
  keep everything else pixel-identical"），1.0-1.2s 交替。
- 纪律同 E06：编辑式 prompt（EDIT of reference + change ONLY +
  pixel-identical），一次只改一个元素。
- cloudDrift 程序化云允许使用（不透明平涂形状，移动不改变轮廓语义）。

## 母版链

1. `assets/style_master.png` — 沿用 E05
2. `assets/girl_reference.png` / `cat_reference.png` / `boy_reference.png` — 沿用
3. `assets/oldman_reference.png` — 本集新生成（晴印版老周）
4. `assets/scene_willow_bank_day.png` — 本集新母版：上游柳滩
   （垂柳 + 浅滩 + 远堤，午后）

## 伏笔（登记在 docs/cat_leads_series_bible.md）

- F03 河面青光：本集以老周台词埋设（无画面）。
- F02 小橘盯后山：本集 frame_21 长静帧埋设（2.9s 无运镜）。
