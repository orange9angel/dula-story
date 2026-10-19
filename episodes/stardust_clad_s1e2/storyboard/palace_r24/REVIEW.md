# R24 · 连肩胸背甲、臀腿体积与接触修订

本轮承接R23，源正片SHA256为
`9bea073c47164ccc37274daa5a17775eefe02c82bd15d9bd63cb5a32a0f56e2f`。
用户补充胸肩应像整件穿入的铠甲、右手反关节、脚穿墩座、敌我装备应各有特点，
以及臀部和较粗的大腿。第9秒按26秒实战预览解释，即正片157秒；尚未收到用户
对视频时钟的单独回答，不把这一解释写成用户确认。

## 造型与动作

| 部位 | 阿鏊 | 夜刈 |
|---|---|---|
| 胸背甲 | 宽圆弧、炉心圆徽、曲面胸缘 | 不对称收束、斜向刃脊、月纹 |
| 腰带 | 盾形带扣、短圆弧髋片 | 偏心尖扣、斜下沿、尖髋片 |
| 护手 | 圆润手背、低圆徽 | 隆起背脊、尖长肘侧翼 |
| 护腿靴 | 圆膝、双弧筋、圆头分节靴面 | 尖膝、收束双筋、延长尖靴面 |

胸背壳具有封内壁的领口、臂孔和肩桥，外肩轮廓保持；手指仍随原骨开合。
骨盆补圆弧臀形和腰臀过渡，大腿上段丰满、向膝盖收窄。新增体积后重新包合腰带
背面，替换旧低垂菱形裙叶。正片披风保留；对照中的无披风图专用于暴露臀背结构。
腰腿之间仍能看到程序化曲面接缝；本轮不宣称达到完整人体美术或用户已认可。

旧手架把前向投影至前臂法平面，抬臂后拇指轴向下；新手架从垂臂参考旋转而来。
旧70件导航检查缺少四件近景锁座实体，新配对检查实际腿、臀、护腿与靴。
脚点移出仍不足：半蹲护腿曾扫入墩角，摆动脚的条件修正曾跳位约14厘米。
最终调整站位、臀部后坐、膝向与连续世界落脚，并把滑舌推向墩座前侧，保留压盾点。

## 证据与范围

- `body_clad_probe.json`：26件封闭装备壳；4,264次腕轴和靴面/旧鞋底采样；
  157秒右拇指朝上；四个时间点逆序像素一致；关闭足位修正的负例确实检出穿墩。
- `palace_checks.json` / `physics_final/seek_check.json`：全片60Hz、12,780帧，
  70件导航实体及4件锁座实体分开统计；腿、臂骨长、盾槽距离和脚位连续性。
  逐帧真值和输入指纹在本地 `physics_final/trace.json`，不把大型trace提交Git。
- `audio_preservation.json`：当前路线重新计算48个脚步事件，时点和音量完全相同；
  原混音SHA保持 `2e6c5218ba2d28db62998a58a1c09155691cac148e54c958a2a37d4ce9056fe1`。
- `delivery_report.json`：成片解码、12个画面对照及5个音频对位窗口。

最终结果：12,780帧采样通过；导航1,641,010组、锁座93,772组配对未检出相交。
盾沿/槽口最大距离4.18毫米，臂腿骨长误差为浮点量级；相邻60Hz帧的阿鏊足位
最大变化22.43毫米。26件闭壳检查通过，恢复旧手架时157秒拇指轴Y=-0.847，
新手架Y=+0.887。正片6,390帧，带OP版7,866帧，5个音频对位窗口均为0ms。

已查看正常镜头大小、胸前/背侧、腰臀侧背、深蹲、迈步和157秒手部对照。
输出20秒连续转面对照和26秒实战预览供用户复看；数值通过不代表全身自碰撞、
连续时间CCD、整片人工听审或用户美术认可。

## 复现

在本集目录执行：

```powershell
node --import ./tools/register_loader.mjs render.mjs --serve --port 4235
# 另一个终端，使用上面的本地viewer
node --import ./tools/register_loader.mjs tools/check_body_clad.mjs
node --import ./tools/register_loader.mjs tools/review_body_clad.mjs --video
node --import ./tools/register_loader.mjs render.mjs --physics-only --fps 60 --board storyboard/palace_r24/physics_final
../../.venv/Scripts/python.exe tools/check_palace.py storyboard/palace_r24/physics_final/trace.json --out storyboard/palace_r24/palace_checks.json
node --import ./tools/register_loader.mjs render.mjs --shots config/palace_review_shots.json --board storyboard/palace_r24/final_shots
node --import ./tools/register_loader.mjs render.mjs --out stardust_clad_s1e2_palace_r24.mp4 --trace storyboard/palace_r24/render_trace.json --board storyboard/palace_r24/render
../../.venv/Scripts/python.exe tools/package_palace.py --version r24 --publish-aliases
```

对照前版通过 `cuirass=0&pelvis=0&identities=0&jointfix=0&footfix=0` 重现R23造型与
原动作分支。固定R23视频另行保留，R24不覆盖它。runtime冻结后再跑最终采样和封装。
