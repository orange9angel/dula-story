# 《画中故人·伞下晴天》

小蓝与阿澈的古装番外短片。故事直接发生在古代江南，不表现穿越过程。

- 成片：`output/output.mp4`
- 时长：128.5 秒
- 画面：1920×1080，30 fps，H.264
- 声音：AAC，44.1 kHz；27 句对白、双段古风配乐、雨景与水乡环境声
- 风格：新工笔电影动画；青绿矿物色、绢本颗粒、冷青阴影与雨后金光
- 动态：40 张主关键帧、镜头运动、重点对白口型、雨丝、花瓣、光粒与水光效果

## 常用命令

```powershell
npm run audio:huazhong_guren
npm run verify:huazhong_guren
npm run render:huazhong_guren
```

音频与素材来源记录见 `materials/SOURCES.md`。剧本以 `script.story` 为准，镜头映射见 `config/keyframe_timeline.json`。

## 复现说明

小蓝沿用 `longxiaoxia_v3`，阿澈改用更有少年感的 `longze_v3`。百炼账户在对白生成中途返回欠费状态，因此其余对白使用本地 F5-TTS 从同角色已生成样本继续克隆，避免半集突然换声线。

渲染器保留了 `storyboard/frames/` 下的 3900 张中间 PNG（约 14.1 GB）。最终 MP4 已完成，这些帧仅用于复现渲染，可在确认成片后通过文件管理器删除。
