# 角色多宫格与场景分离候选

日期：2026-10-24。用户报告R2五官透视、走路不可接受，提出恢复3D人物、先换场景；
随后提出多宫格方案，并要求增加走路格数。本轮保留两条独立小样，不修改全片交付。

## 已观察

查看方式为生成图、实际解码静帧和有序帧列，没有声称正常速度审片。

- `walk/ordered16.png`：第一版导出的16个时点。1–4脚位推进幅度很小，5–6交叉经过，
  7–10展开，11–13再次经过，14–16展开；有中间姿势，但头发及披风形状、身躯位置
  随格有偏移。第二次导出仅将整个人物向下22像素，使靴底接近试片地线。
- `final_decoded.png`：最终步态及表情视频抽帧。相同16格素材每隔一格构成左侧8格，
  右侧全部16格。不能把它当作与历史R2八格素材的同条件对比。
- 表情六格：睁眼、半闭、全闭、再睁眼可辨，五官由生成原画承担；仍有发型、肩甲
  细微重画，朝向固定，未证明长对白、转头或远近景身份一致。实际有RGBA透明通道，
  早期把工具预览底色误认成不透明底图，已纠正。
- `../scene_hybrid_r1/decoded_scene.png`：原片20.5、21.5、22.5、23.5、24.5、25.5秒，
  来自首轮视频；其后仅增加同一时点预热以稳定极少量像素，构图未改变。3D人物
  可以连续走入绘画场景，脚点落在前景地面。仍然具有原模型质感，固定背景未提供
  任意绕拍/柱后遮挡/楼梯交互。恢复原人物不等同于修复原人物所有美术问题。

## 技术检查

三个MP4均6秒、1280×720、30fps、180帧。多宫格是无声动作样片；场景试片保留
原R27对应音轨。每个配置的顺序/跳转/重复取帧9项全部通过，报告在各自目录。
场景首次严格校验失败：同一25.5秒重复图有4像素相差1级，位于人物附近；源角色
世界变换/肖像更新在同一时点预热两次后，重渲全片并通过9项。失败记录保留于
`../scene_hybrid_r1/initial_seek_failure.json`，未放宽像素容差。

原地步态循环未接根位移，也未测最终作画脚底的支撑速度，因此不能标记“正常走路
通过”。下一步若继续本路线，应先修格间身份/画幅注册，再把整格动作接回有限路径，
验收支撑脚、起停、转身；不通过时仍保留原3D人物。无需为了堆格数直接全片重制。

## 复现

```powershell
node ../../../dula-skills/draw-over-animation/scripts/capture_references.mjs --episode . --config config/walk16_reference.json
node ../../../dula-skills/draw-over-animation/scripts/pipeline.mjs --episode . --config config/walk_atlas_r1.json --step render --render
node ../../../dula-skills/draw-over-animation/scripts/pipeline.mjs --episode . --config config/expression_atlas_r1.json --step render --render
node ../../../dula-skills/draw-over-animation/scripts/pipeline.mjs --episode . --config config/scene_hybrid_r1.json --step render --render
```

图片为内置image_gen两次生成。实际返回步态1086×1448（约272×362/格），表情
1536×1024（512×512/格）；不能用提示词里的期望分辨率替代这些实际尺寸。
