# 后发束生产素材试验

工具：内置 `image_gen`，透明背景；没有使用 CLI/API 回退。

参考输入：`dula-assets/characters/bioarmor/textures/lei-painted-back-v1.png`。
输出：[rear-clumps.png](rear-clumps.png)，1536×1024 RGBA；透明区域 alpha 为0。
原始输出：`C:/Users/orang/.codex/generated_images/01a144d3-fe45-7572-a3bb-7aeb4bb3b10f/exec-6488a2fc-e6ce-4caf-9eeb-68e884939426.png`。
文件哈希见 `decision.json`。保持原始生成字节，运行时以UV选取六个区域，没有重新
编辑或覆盖认可的后发图。六个图表用于16个实际曲面束，候选未采用。

以下为完整提交提示词：

```text
Use case: background-extraction / precise production asset. Input image 1 is the approved brown anime boy hairstyle paint, used as style and color reference. Create ONE transparent PNG texture atlas for the existing character's 3D rear hair. Exactly 6 separated individual broad hair clumps in a strict 3 columns x 2 rows grid, one clump centered in each cell, generous transparent margins and no overlap between cells. Every clump runs from its full broad rooted upper end down to its tapered lower end. Clump silhouettes should curve subtly sideways and split into two or three unequal finely pointed natural hair tips. They must look like the medium sized overlapping clumps extracted from the BACK and OCCIPITAL part of this haircut, NOT an entire head or a whole hairstyle. Preserve the reference's warm dark brown base, restrained amber painted highlights, thin dark ink strokes, grouped cel-shaded volume and fine directional brush texture. Top row: 3 short broad crown-to-occipital clumps, slightly different sweep. Bottom row: 3 medium length narrow occipital-to-nape clumps, slightly different sweep. The top root of each clump remains broad and solid with no transparent interior holes; it will be buried in existing hair. No scalp, face, ear, neck, shirt, labels, words, grid lines, shadows behind assets, pale fringe, or background. Do not draw a full hair whorl on each clump. The lower 2/3 should taper with graceful flowing asymmetrical silhouette, not a straight symmetric leaf. This is a clean high resolution usable color-and-alpha texture atlas, not a diagram or concept sheet.
```
