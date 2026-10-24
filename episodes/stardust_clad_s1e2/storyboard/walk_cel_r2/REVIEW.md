# 整人物原画步态修订 R2

2026-10-24。用户认可三路试片中第三种的整体形象，要求修反关节与抖动，并指出
前两种程序模型的大腿凸起、脸型和逐角色精修成本。以第三种美术作为本轮基准。

## 交付与实际改动

- `output/walk_cel_r2_compare.mp4`：左为原第三列，右为修订；1024×842、30fps，
  一个1.1秒周期重复四遍，共132帧、4.4秒，无声。
- `output/walk_cel_r2_solo.mp4`：修订单独画面，512×768，同一曝光与循环。
- 修订3D动作参考的膝平面；两张2×2图集修订下肢，再单独修一张错误遮挡的过渡画。
- 按头部、腰胯和最低鞋底分段配准完整人物。水平比例由素材基准显式设置；不再按
  每张画的全身包围盒重新缩放整个人物。未拆腿、未做关节纸片旋转或交叉淡化补帧。
- 同一朝向、同一表情的本段复用k0头部原画，消除生成过渡画的发型变换。
  这不是对白、转面或全片锁死表情的方案。去除低透明度背景光晕和相邻格的零散像素。

## 原因与证据

旧动作底稿骨长误差虽接近零，但66个双腿采样中15个膝点朝后，最严重偏移约
0.194米。局部+Z膝向约束后，反向样本为0，骨长误差仍接近零；5次seek与顺序输出一致。
这些数字只验证3D底稿，不能替生成原画作解剖学认证。

旧原画归一化会随抬脚改变整个身体比例。八张画脸部色块中心的位置范围约横向8.66、
纵向15.35像素。本轮头区直接复用，配准后该区像素完全一致；这证明头区稳定，
不证明整个人物没有任何帧间跳变。详见`audit.json`与注册记录。

额外检查b0/b2时发现原b0与新图集的b0都把直立支撑小腿放在前面，破坏两次过腿的
遮挡区别。单独按3D底稿修b0，使近侧弯曲小腿横过远侧竖直支撑腿前方；b2保留
近侧直立、远侧小腿抬起。实际查看了两张全尺寸图与最终有序帧。不能仅以“左右脚
3D数据不同”声称二维图也换对了腿。

## 实际复看与限制

本轮观察方式为完整原画、连续有序帧和最终MP4解码帧列，未声称正常速度观看。
可见k0/k2后腿原来的明显后折被修成向后伸展的腿形；b0/b2遮挡能区分两腿阶段；
头部外形、尺寸与腰胯基准更稳定，保住生成原画的脸和人体轮廓。

仍存在有限原画的步相跳切、摆臂及武器形状变化；这轮没有解决全片近景表情、
转身、起停或世界空间脚底接触。最低鞋底对齐不是支撑锁定，灰底跟拍不能证明
放进场景后不滑步。此版本为局部修订候选，不是自然步态或整集完成证明。

当前优先路线：3D提供动作与空间约束，生成图承担最终人物设计和关键画，算法承担
配准、稳定区复用、曝光、遮挡合成和确定性检查。角色适配和精修由agent完成；
尚无跨新角色的全自动质量证据。沿用现有场景、音频、粒子特效；R27未被覆盖。

## 复现

在本集目录、原4250本地服务运行时：

```powershell
node ../../../dula-skills/draw-over-animation/scripts/capture_guided_paint.mjs --episode . --config config/walk_cel_r2_reference.json
python ../../../dula-skills/draw-over-animation/scripts/stabilize_cel_anchors.py --episode . --config config/walk_cel_r2_registration.json
python ../../../dula-skills/draw-over-animation/scripts/compare_cel_revision.py --episode . --config config/walk_cel_r2_compare.json
ffmpeg -y -framerate 30 -i storyboard/walk_cel_r2/comparison/frames/%04d.png -c:v libx264 -crf 18 -pix_fmt yuv420p output/walk_cel_r2_cycle.mp4
ffmpeg -y -stream_loop 3 -i output/walk_cel_r2_cycle.mp4 -c copy -movflags +faststart output/walk_cel_r2_compare.mp4
ffmpeg -y -framerate 30 -i storyboard/walk_cel_r2/comparison/revised/%04d.png -c:v libx264 -crf 18 -pix_fmt yuv420p output/walk_cel_r2_solo_cycle.mp4
ffmpeg -y -stream_loop 3 -i output/walk_cel_r2_solo_cycle.mp4 -c copy -movflags +faststart output/walk_cel_r2_solo.mp4
```

生成方式为内置image_gen，共3次图片编辑。原图与完整提示词在
`assets3d/walk_cel_r2/generation.json`；没有调用视频生成，实际token/费用工具未返回。
通用执行代码归入draw-over-animation与walk-director，剧集保留配置、适配和证据。
