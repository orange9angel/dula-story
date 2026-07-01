# 第二集配乐素材说明

本集剧情：毛茸茸联盟 vs 烧烤集团争夺火花糖矿脉，节奏偏紧张动作 + 搞笑。

## 推荐来源

**Pixabay Music**（首选，免费商用，无需署名）：https://pixabay.com/music/

## 本集需要的 BGM

剧中标签：`{Music:Play|name=jungle_tension|endTime=100|baseVolume=0.4}`

所以需要一个文件名为 `jungle_tension.mp3`（或 `.wav`/`.ogg`）的配乐。

### 推荐搜索关键词

- `epic action cinematic`
- `jungle tension tribal`
- `sci-fi battle`
- `adventure dramatic`
- `robot combat`

### 推荐风格

1. **紧张丛林氛围**：带有鼓点、低音弦乐、少许部落元素，节奏 100-130 BPM。
2. **科幻动作**：电子合成器 + 重低音，适合机器人和飞船场景。
3. **滑稽反派主题**：龙总和小嗡出场时带点黑色幽默，可以选略带怪诞感的低音进行曲。

### 使用方式

1. 从 Pixabay 下载喜欢的曲目。
2. 重命名为 `jungle_tension.mp3`。
3. 放入本目录 `materials/bgm/`。
4. 运行 `npx dula-audio ./episodes/transformers_beast_wars_s1e2` 时，引擎会自动优先使用手动素材。

### 备选命名

如果同一集需要多首 BGM，可以添加更多 `.mp3` 文件并在 `script.story` 中通过 `{Music:Play|name=xxx}` 引用。本集目前只用一首 `jungle_tension`。
