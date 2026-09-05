# E04《夏夜流萤》BGM 出处

## 正片（2026-08-29 深夜切换）

| 文件 | 说明 |
|------|------|
| seedaudio_night_lullaby.wav | 火山 Seed-Audio 1.0 生成（`tools/seedaudio_gen.py`，单要素纯配乐模式：指弹木吉他+钢琴点缀、夏夜萤火虫氛围、结尾渐弱），60.0s / 48kHz；电平 Peak -3.0dB / RMS -19.7dB，无削波 |

## Fallback（备用，已移至 materials/bgm/）

| 文件 | 曲名 | 作者 | 时长 | 来源 |
|------|------|------|------|------|
| forest_lullaby.mp3 | Forest Lullaby | FreeMusicForVideo | 2:38（158.4s） | https://pixabay.com/music/solo-guitar-forest-lullaby-524065/ |

- 风格：指弹木吉他摇篮曲（Solo Guitar / Lullaby），纯音乐无人声，安静治愈，贴合夏夜萤火虫氛围。
- 许可：**Pixabay Content License** —— 免费商用、无需署名（https://pixabay.com/service/license-summary/ ）。
- 首选目标 LesFM《Forest Lullaby》在 Pixabay 已不可获取（LesFM 已更名 music_for_video，站内搜索及作者页均无该曲），故按 fallback 规则选用同名指弹吉他版本。
- 电平验收（ffmpeg astats）：Peak -0.25 dB（未削波），RMS ≈ -15.3 dB，响度正常。
- 下载方式：`tools/pixabay_download.py`（Playwright 绕过 Cloudflare 提取 CDN 直链），256 kbps MP3 / 48 kHz / 立体声。
