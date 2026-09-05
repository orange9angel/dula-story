# 《伞下晴天》素材来源

## 配乐

两首曲目均按 Pixabay Content License 使用，下载于 2026-08-21：

- `assets/audio/music/umbrella_sun_theme.mp3` — ET11LX，
  “Chinese ancient style music love（丰富配器推高潮版）”，古筝为主，
  用于晨市、作画和追伞段。
  https://pixabay.com/music/world-chinese-ancient-style-music-love-et%E5%8D%81%E4%B8%80lx-%E5%8F%A4%E9%A3%8E-%E6%8A%92%E6%83%85-%E8%AF%86%E4%B8%B0%E5%AF%8C%E9%85%8D%E5%99%A8%E6%8E%A8%E9%AB%98%E6%BD%AE%E7%89%88-247345/
- `assets/audio/music/rain_gold_theme.mp3` — ET11LX，
  “Ripple / 涟漪”，古筝古风抒情曲，用于落雨、伞内金光和放晴段。
  https://pixabay.com/music/china-ripple-chinese-ancient-style-music-romantic-love-et11lx-%E5%8F%A4%E9%A3%8E-%E6%8A%92%E6%83%85-%E6%B6%9F%E6%BC%AA-155927/

许可摘要：https://pixabay.com/service/license-summary/

## 环境声与拟音

从同仓库已审核、保留来源记录的 `xiaoju_secret` 与
`rainy_rooftop_cat` 音频素材中复用并重新命名：

- `canal_morning.wav` ← `river_wind.wav`，风吹树叶与水巷底噪。
- `inkstone_grind.wav` ← `paper_page.wav`，截取为细小研墨/笔触质感。
- `umbrella_snap.wav`、`umbrella_open.wav` ← `umbrella_rustle.wav`。
- `running_stone.wav` ← `footsteps_concrete.wav`，石桥追跑脚步。
- `canal_rain.wav`、`cloth_rain.wav` ← `rain_loop.wav`。
- `rain_easing.wav` ← `rain_fadeout.wav`。
- `canal_after_rain.wav` ← `birds_after_rain.wav`。
- `wind_gust.wav` ← 仓库程序化强风素材 `anime_girl_basketball_5s`。

原始 Pixabay 作者、页面及转换记录见：

- `episodes/xiaoju_secret/assets/audio/sfx/sources/LICENSES.md`
- `episodes/rainy_rooftop_cat/assets/audio/sfx/sources/LICENSES.md`

## 角色语音

- 小蓝：百炼 CosyVoice `longxiaoxia_v3`。
- 阿澈：百炼 CosyVoice `longze_v3`，替换上一集偏叙事腔的男声。
- 百炼在本集生成途中因账户状态停止服务；后续台词使用本地
  F5-TTS，以本集已经生成的同角色 CosyVoice 片段为参考补齐，避免换人感。

## 图像

角色现代参考来自本仓库相邻集；古装母版及连续关键帧为本集新生成。
所有图像提示词和硬锁条件记录在 `generation_prompts.md`，包含汉服、
江南木构、水巷与禁止和服/鸟居等连续性约束。
