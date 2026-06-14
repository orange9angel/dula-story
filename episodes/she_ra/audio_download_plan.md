# She-Ra Episode — BGM 下载计划 (Pixabay)

## 场景匹配

### 1. BrightMoonScene — 明月城堡（希瑞变身/英雄登场）
**情绪**: 史诗、庄严、希望、英雄主义
**候选**:
- **首选**: `Flicker Flame (Emotional Inspiring Trailer Main)` — AudioAtlant
  - URL: https://pixabay.com/music/adventure-flicker-flame-emotional-inspiring-trailer-main-421529/
  - 时长: 2:13 | 标签: Cinematic, Hopeful, Adventure, Triumphant, Epic, Heroic, Fantasy
  - 理由: 情绪曲线完美匹配希瑞英雄登场，有rise感

- **备选**: `Heart Of The Sun` — Lui_Epicmusic
  - URL: https://pixabay.com/music/main-title-heart-of-the-sun-212314/
  - 时长: 2:46 | 标签: Epic, Cinematic, Orchestra, Heroes, Fantasy
  - 理由: 更偏战斗感，适合有动作戏的段落

- **短版**: `Majestic History - 30 Seconds Orchestral Music` — Sonican
  - URL: https://pixabay.com/music/modern-classical-majestic-history-30-seconds-orchestral-music-370997/
  - 时长: 0:33 | 标签: Majestic, Glory, Royal, Victorious
  - 理由: 短促有力，适合变身瞬间

### 2. FrightZoneScene — 恐惧地带（霍达克/军团阴谋）
**情绪**: 黑暗、紧张、压迫、邪恶
**候选**:
- **首选**: `Return of the Ancient Gods - Epic Dark Orchestral Soundtrack` — JoelFazhari
  - URL: https://pixabay.com/music/main-title-return-of-the-ancient-gods-epic-dark-orchestral-soundtrack-258899/
  - 时长: 2:56 | 标签: Dark, Epic, Orchestral, Mystery
  - 理由: 黑暗史诗感，完美匹配霍达克的威严与邪恶

- **备选**: `Entanglement – Epic Orchestral Masterpiece` — nickpanekAIassets
  - URL: https://pixabay.com/music/main-title-entanglement-epic-orchestral-masterpiece-335541/
  - 时长: 5:47 | 标签: Orchestral, Epic, Cinematic, Dramatic, Battle
  - 理由: 更偏战斗/冲突，适合对峙场景

### 3. WhisperingWoodsScene — 低语森林（和解/情感对话）
**情绪**: 神秘、宁静、魔法、温情
**候选**:
- **首选**: `Wizard Rider - Enchanted Fantasy Orchestral` — Sonican
  - URL: https://pixabay.com/music/fantasy-dreamy-childrens-wizard-rider-enchanted-fantasy-orchestral-369658/
  - 时长: 1:41 | 标签: Enchanted, Fantasy, Magical, Mystical Forest, Whimsical
  - 理由: 标签直接命中"Mystical Forest"，魔法森林氛围完美

- **备选**: `Orbs – Epic Orchestral Journey` — nickpanekAIassets
  - URL: https://pixabay.com/music/modern-classical-orbs-epic-orchestral-journey-335540/
  - 时长: 5:48 | 标签: Fantasy, Orchestral, Epic, Majestic, Emotional
  - 理由: 更宏大，适合森林中的史诗对话

## 下载命令

```bash
# BrightMoonScene — 英雄/变身
python pixabay_download.py --url "https://pixabay.com/music/adventure-flicker-flame-emotional-inspiring-trailer-main-421529/" --output ./episodes/she_ra/materials/bgm/brightmoon_theme.mp3

# FrightZoneScene — 黑暗/阴谋
python pixabay_download.py --url "https://pixabay.com/music/main-title-return-of-the-ancient-gods-epic-dark-orchestral-soundtrack-258899/" --output ./episodes/she_ra/materials/bgm/frightzone_theme.mp3

# WhisperingWoodsScene — 魔法/宁静
python pixabay_download.py --url "https://pixabay.com/music/fantasy-dreamy-childrens-wizard-rider-enchanted-fantasy-orchestral-369658/" --output ./episodes/she_ra/materials/bgm/whispering_theme.mp3
```

## SFX 需求（后续补充）
- 剑出鞘声 (sword_draw)
- 魔法光芒声 (magic_glow)
- 变身闪光声 (transform_flash)
- 森林环境音 (forest_ambience)
- 工业基地环境音 (industrial_ambience)
