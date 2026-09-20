# 《漂吧》片头：收尾画风修订

当前成片：[op.mp4](op.mp4)，71.070 秒，1920×1080，30 fps。

2026-09-20 按监制意见替换最后一张图：原金色夕阳、水彩纸纹与前面的
夏日日景不连续；新图沿用明亮蓝天、青绿河岸、清晰动画色块、同款拱桥，
保留柳枝与漂流画纸。画面仅保留片名“漂走的那张画”；按监制后续意见，
移除“片头曲「漂吧」”副标题，以动画片名卡收尾，不作歌曲介绍卡。

- 背景图：[endcard_matched_v2.png](endcard_matched_v2.png)。
- 采用内置 `image_gen`；完整提示词：[endcard_matched_prompt.txt](endcard_matched_prompt.txt)。
  参考来自修改前 OP 的 4s、58s 画面；68s 旧卡仅参考构图意象，不参考色调。
- 65.867s 开始 0.8s 叠化，片名卡缓慢推进至结尾。叠化的出镜画面由原片
  `volcano/output/2026_9_6_01.mp4` 重建，避免旧夕阳透入过渡。
- 前 1956 帧（65.2s）复制原视频流，逐帧解码哈希完全相同；最后 176 帧重编码。
- 全部 AAC 音频直接复制，压缩音频内容 SHA-256 相同，包含已有歌曲渐出与
  河水/虫鸣收尾。时长、2132 帧、30 fps、起始时间均保持，完整解码无错误。
- 保留源片现有 SAR 8:7；本次未调整全片显示比例。

校验记录：[endcard_replacement_review.json](endcard_replacement_review.json)。
抽查了接合点、叠化中段和片名卡，文字与漂流画纸无重叠。
修改前成片另存 `../tmp/op_before_endcard_style.mp4`（本地备份，未入库）。

从 `dula-story` 根目录可重建本次替换版本：

```powershell
.venv\Scripts\python.exe episodes\cat_leads_e08_drifting_page\tools\replace_op_endcard.py --source episodes\cat_leads_e08_drifting_page\volcano\tmp\op_before_endcard_style.mp4
```

脚本默认输出相邻 `op_endcard_v2.mp4` 供检查，避免直接覆盖输入。
完整剪辑脚本 `assemble_op_volcano.py` 的背景图引用也已更新；要保留当前已
定稿的声音，应使用本次替换脚本复制成片音轨，不能用较早的混音计划覆盖。
