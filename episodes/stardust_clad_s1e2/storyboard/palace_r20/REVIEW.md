# R20：圣衣金属与宫殿通行

后续反馈：用户指出本版肩甲像折纸、盾背透明，并追加铠甲角色参考。以下为R20当时
的制作记录；这两项不能记为已认可或未发现问题。修订见[R21](../palace_r21/REVIEW.md)。

2026-10-19 用户指出宫门透天、身体轮廓像人偶、圣衣无金属纹理、入场穿柱和战斗粒子
仍可提升；随后明确优先圣衣，保留当前程序模型、动作自由度与脸，暂不接 Tripo。
本轮遵守后续优先级。R19 的分宫故事、时间轴、22 句对白、音乐和战斗接触时点保留。
新外观待用户审美评价，不能继承 R19 的认可。

## 制作结果

- 阿鏊铜金、夜刈紫钢：生成细刻纹底色，MeshPhysicalMaterial 金属反射、不同粗糙度的
  甲面/边条和独立 PMREM 反射光。实际转换 183 / 145 个网格，脸、披风、宝石和伤痕
  不改为金属。甲片稍弯，浮雕与铆钉跟随曲面；第一轮埋掉肩纹的问题已修复。
- 现有连续四肢补大腿、小腿肌腹与膝踝收束，护胫横截面相应适配；骨长、末端目标
  与战斗姿势保持。属于局部轮廓改善，不声称达到新生成身体或完整人体变形的水平。
- 宫门补石墙、门框、内殿地面/侧壁/顶板/后墙和暗柱；后方不再是天空。结尾街景
  镜头移到新建筑外，避免新增遮挡挡住复火结果。
- 入场改走前侧柱间通道并落脚转身，退场改走后侧柱间并停在栏杆内。真实障碍随
  几何登记，检测不靠手抄另一套柱子尺寸。
- 战斗光效保留原时点与接触核，增加按冲击方向发散的 96 个实例化拖尾火星、柔边
  冲击波和短烟尘；旧硬圆环降低权重。绝对时间求值，无累计随机模拟。

## 证据与限制

- `delivery_report.json`：213秒正片、262.2秒带原OP版、6390正片帧，完整解码通过；
  12个最终解码画面与实际渲染源对照通过，5个音画窗口偏移均为0ms。
  常用入口已更新，R19固定版本仍保留。

- `palace_checks.json`：213 秒，60Hz，12,780 帧，70 个导航障碍，1,641,010 个
  可见角色—障碍配对全部包围盒分离。固定槽口最大偏差 4.18mm；骨长、支撑脚和
  命中光核检查通过。范围是声明的导航实体，非连续时间、自碰撞、地面支撑或全部衣物保证。
- `collision_before/trace.json`（大文件留本地）：原路线在20.43–22.30秒失败57帧，
  最深339.53mm。`stage_negative_probe.json` 用最终实际模型放回柱心，再次触发窄筛；
  恢复路线通过，空障碍拒绝。最终全片没有窄筛候选不代表窄筛本身无测试。
- `upgrade_probe.json`：3个观察位置共27条穿门射线命中内殿实体，无射线穿到后景。
- `physics_final/seek_check.json`：姿态/环境数字顺序与逆序 seek 一致。
  `particle_seek/seek_check.json`：148–174秒16个关键画面逐像素容差检查通过。
- `audio_preservation.json`：50次旧脚步改为48次实际落脚，其余所有音频资产复用；
  20–28、191–199秒之外的混音 PCM 逐样本相同。10个战斗音效窗口检查通过，峰值0.767。
- 画面审查：同机位前后图、两角色转面 A/B 解码帧、宫门、格挡、反击与结尾抽帧。
  未声称人耳全片重听或人工正常速度全片审看。R19 的 p07 读音观察项继续保留。

## 光效选型

本轮继续扩展现有轻量系统：命中事件少、必须直接跳到任意时刻，固定种子与绝对年龄
便于离线渲染和一致性检查，不需要为这组招式引入新模拟依赖。
[three.quarks](https://github.com/Alchemist0823/three.quarks) 提供完整粒子/VFX系统，
可在未来大量不同发射器或编辑器需求出现时另做兼容与 seek 试验；本轮未安装或测速，
不声称它优于/劣于当前方案。Three.js 本地版本0.183.2未升级。

## 复现

在本集目录：

```powershell
node --import ./tools/register_loader.mjs render.mjs --serve --port 4235
node tools/review_palace_upgrade.mjs
node tools/probe_stage_negative.mjs
node --import ./tools/register_loader.mjs render.mjs --physics-only --fps 60 --board storyboard/palace_r20/physics_final
../../.venv/Scripts/python.exe tools/check_palace.py
node --import ./tools/register_loader.mjs render.mjs --out stardust_clad_s1e2_palace_r20.mp4 --trace storyboard/palace_r20/render_trace.json --board storyboard/palace_r20/render
../../.venv/Scripts/python.exe tools/package_palace.py --version r20 --publish-aliases
```

服务命令会持续运行，其余命令另开终端。A/B 的旧材质开关为
`?metal=0&anatomy=0&particles=0`；它仅比较当前场景中的材质，不冒充旧 R19 整片。
R19 固定命名 MP4 与原始混音备份继续保留。
