# 针对厚块问题的补学与局部实验

本轮用户提醒：对比看出不对、解释或修不好时，可以上网学习对应的日漫头发画法。
此前已读通用教程，却围绕同一几何路线反复调参，没有及时补查当前障碍；这是执行问题。

实际读取并查看：

1. [发际线与带状主束步骤](https://tips.clip-studio.com/ja-jp/articles/6015)：
   前额发际线、分缝、宽窄带状曲线、前后层发流的图。
2. [多角度发际线与起点步骤](https://tips.clip-studio.com/en-us/articles/6051)：
   前额、耳周、后颈，方向箭头和先定大分组再清线的图。
3. [双轮廓曲面方法](https://perso.liris.cnrs.fr/victor.ostromoukhov/publications/pdf/GraphiCon_hair.pdf)：
   查看第 2—3 页图示，读取其边界曲线生成曲面的说明。

下载的学习材料只留在 `../../tmp/hair_tutorial_20261020/`，不作为成片素材；
没有声称看过这些作者的完整演示视频。

制作假设：仅靠中心线和统一截面难以控制主束内外弧的不同转折。
从教程的带状发束、论文的双边界表示出发，为中央刘海独立指定两条三维弧线，
在两条边界之间生成浅曲面，保持其余头发、材质、脸与衣甲相同。
这是工程推论，不是教程已经保证结果。

R1 正面形成了连续宽中段，但末端盖到眼睛；保留该失败图。
R2 抬高末端，正面恢复露眼。可以看到弧线更连续，中央刘海不再只读成孤立细尖。
斜侧面仍有与邻束衔接不顺，侧后厚块仍属原候选问题，没有由局部实验修好。
头发整体尚未达到对标目标，未替换正片。

对照：左为 `hair_sculpt_r10`；右仅替换中央刘海。影片为 12 秒，包含转头、
停头、转台及头发换光。图片与连续抽帧分别记录，不把它称作正常速度感知。
最终导出文件为 `../../output/stardust_clad_s1e3_hair_boundary_r2.mp4`。

复现命令：

```powershell
node render.mjs --viewer trials/hair-boundary/viewer.html --audio trials/hair-study/silence.wav --out stardust_clad_s1e3_hair_boundary_r2.mp4 --board storyboard/hair_boundary_r2/render --trace storyboard/hair_boundary_r2/trace.json
```

代码选项：`installSculptedHair(actor, {contourFringe:true})`；
默认仍为上一候选；所有候选均只供隔离试片使用。
