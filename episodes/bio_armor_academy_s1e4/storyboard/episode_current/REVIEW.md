# S1E4 新角色整集预览

播放入口：[output/current.mp4](../../output/current.mp4)。
旧片保留在 `output/tripo_episode_preview_v1.mp4`。

本轮使用已认可的葵、雷晓绘制头部与现有导入身体，重做腕部、握罐、本子支托、
擦臂混合及转身支撑；剧情、对白和 82 秒时间线保留。不是重建身体或换装试验。
`viewer.js` 默认生效配置为 `cel=direct&motion=anatomical`，构建记录也保存实际配置。

## 本轮改变

- 限制手腕反折，将掌向旋转分配到前臂；叫停改为抬起前臂，并安排离开桌沿的弧线。
- 圆柱罐保持剧情轨迹，重新标定手腕与指形；拇指和四指分别处理，接触手按 4mm
  绑定空间网格抽取的实际蒙皮顶点做有限外侧修正。本子随真实掌面放置。
- 桌沿修正之后复查腕部限位带来的皮肤变化；擦臂 clip 渐入与收手节拍放缓。
- 脚踝绑定偏移按脚自身世界朝向计算，接入骨盆高度变化，减少转身漂移与腿部过伸。

## 验证记录

2026-10-17：82 秒、1280×720、30fps、2460 帧完整导出与解码通过；最终成片
trace 的动作/采样接触检查通过，57 个逆序 seek 时点通过。最大掌轴—前臂夹角
由旧控制的 169.6° 降到本轮全片 47.7°；最大支撑脚平面漂移约 1.44mm。
原 AAC 包数据、包数和时间戳摘要一致。51 项资产输入与本轮开始时一致；
接受快照中的 18 项造型载荷保持原字节，另 1 项 viewer 入口为本轮动作接入改动。

最终状态以 `verification.json`、`imported_motion_report.json`、
`imported_contact_report.json`、`seek_check.json` 和 `render_build.json` 为准。
`appearance_preservation.json` 区分未改的造型文件与本轮必须修改的 viewer 接入代码。
对比图使用同时间点、同机位；结构近景是额外检查机位，不冒充正片镜头。

数值覆盖最终腕/肘/膝/踝变换、骨长、支撑脚、桌沿与罐子采样接触，以及输出帧率
下的连续时间线和逆序跳转。画面检查包括实际成片抽帧、交接片段抽帧与手部/脚部
结构近景；不声称已由模型按正常速度看完整片。原音轨直接流复制并核对包数据。

未覆盖完整身体自碰撞、衣物全三角面相交、每根手指内部碰撞、本子全表面碰撞或
采样帧之间的连续扫掠。手和袖口仍沿用导入网格，精细造型与整体戏感待用户复看。
技术检查通过不等于艺术质量已获认可。

## 复现

在本 episode 目录执行：

```powershell
node render.mjs --q '&cel=direct&motion=anatomical&probe-surface=1' --audio-from output/tripo_episode_preview_v1.mp4 --out current.mp4 --board storyboard/episode_current --trace storyboard/episode_current/trace.json
..\..\.venv\Scripts\python.exe tools/check_imported_motion.py storyboard/episode_current/trace.json
..\..\.venv\Scripts\python.exe tools/check_imported_contact.py storyboard/episode_current/trace.json
```

自由机位清单：`config/episode_motion_review.json`，由 `render.mjs --shots` 复现。
逐帧大 trace 可在生成摘要与输入哈希后清理，不作为 Git 中的常驻资产。
