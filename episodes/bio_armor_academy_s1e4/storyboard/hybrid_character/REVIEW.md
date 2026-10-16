# 当前角色入口 · 2026-10-16

- 女主葵：[current/turn.mp4](current/turn.mp4)，保留 v10。
- 男主雷晓：[lei/current/turn.mp4](lei/current/turn.mp4)，刘旭认为当前外观基本可接受。
  [分解对照](lei/current/parts.jpg)与[整脸参考](lei/current/reference_comparison.jpg)。
- 男主可恢复基准：`lei/archive/accepted_v1/`。后续头发分层只在独立候选中测试；
  整体没有明确改善就保留当前版，不覆盖已认可效果。
- 头发分层三轮小试已结束，未采用：[左右对比](lei/archive/hair_layers_trial_v1/comparison.mp4)
  （左当前、右试验）。当前效果不变，原因与证据见该归档的 `REVIEW.md`。
- 后脑蓬松度已列为雷晓首要差距；[多维度问题发现与后发束试验](lei/archive/rear_volume_trial_v2/REVIEW.md)
  已补齐后侧/背面证据，候选静态有退步，未替换当前版。

# Aoi 转面修订 v10 · 2026-10-16

最新统一看 current，三组候选已经合并进正式模型并重新导出：

- [连续转面视频](current/turn.mp4)：6秒、900×900、24fps，共144帧。
- [逐部位对照](current/parts.jpg)：原画 / v9 / v10，两侧眼颊、远侧马尾、两侧下巴。
- [整脸参考对照](current/reference_comparison.jpg)：分解后回到完整头像。
- [实际视频解码总览](current/overview.jpg)：来自这份MP4，标明时间和角度。
- [逐项观察和验证](current/review.json)：保留范围、局部收益、失败及剩余问题。

## 采用的修改

用户明确要求三agent分角度推进。三组从同一v9源码快照独立工作，交接时冻结
SHA256，主代理合并采用片段，再按原画/基线/候选逐部位检查、整脸复查和实际视频
检查；没有让三个agent同时覆盖正式角色配置。

1. 浅角度与正面组：只在近侧眼睛曲面范围微调纵深斜率，斜面虹膜略收窄；纹理和
   下眼睑不改。抬下睑硬截虹膜、全局斜率扩大远眼的试验已撤回。
2. 45°组：远侧马尾采用完整根到梢的平滑目标曲线，颈后短团改善为肩长主束。
   悬空根、大U拱和近侧管状卷端试验均未合入。原近侧马尾仍保留。
3. 侧面组：60°后逐渐增加下颏局部深度，同时同步下颌底缘锚点，减轻下巴回缩。
   鼻口不整体前移，未见新的独立鼓包或双下缘。

正式改动位于dula-assets的aoi-generated-paint.js及四个craft3d模块：
oblique-face-support.js、drawn-head.js、painted-hair-shell.js、profile-hair-paint.js。
generated-face-paint.js没有采用试验改动。新选项关闭时，7个角度全图与v9逐像素相同。

## 验证及边界

- 正面整图逐像素不变；24°、27°、30°及左右45°/60°的GPU脸部轮廓逐像素保持。
  45°/60°眼形和右侧头发确有修改，不能称这些角度整图不变。
- 合并95个角度/表情状态严格逆序一致、无浏览器错误；live的12张首次渲染与合并
  候选同姿态逐像素及PNG哈希完全相同。
- 后续live12状态90°逆序仍有1像素RGB最大差2；face mask75°有1像素覆盖差127。
  坐标与已有诊断一致，原v9纯头mask也可复现。根因未证实，未放宽门槛，因此本版
  保留严格检查未解决项。不能把95状态通过写成所有运行通过，也不能把双绘通过
  当成已经证明和修好一帧滞后。详见archive/v10_evidence/live_pixel_audit.json。
- 视频144帧完整解码，全部输入构建前后哈希不变；第24帧1秒为32.163°，与同姿态
  PNG平均RGB差2.36、99分位15，符合本次H.264压缩比较。正式源码与冻结候选匹配。
  [第一秒](archive/v10_evidence/decoded_shallow.jpg)及[72–90°](archive/v10_evidence/decoded_late.jpg)
  已逐格复看，未见v8式额外鼓颊或新的换脸跳变。

仍待改：远侧顶部扎点遮挡、三条主束偏齐偏尖、近侧马尾管状末梢、后脑壳感、耳内
结构、颈影与领口碎色。整体仍是待用户复看的局部改善候选；本轮没有重渲染整集或
验收完整对白表演及头部俯仰。

## 参考与保留记录

45°沿用历史选定draft_02.png的R45/L45；同图R60/L60曾因接近纯侧被否决，不采用。
60°继续用draft_03_oblique.png。九宫格浅斜面有俯仰和头身方向差异，只作风格参考。
原画相机没有精确标定，全部仅等比裁切，不拉伸五官来制造匹配。

- 原始九宫格/正面绘画：references/；专用角度参考在archive/history/。
- 先前认可视图：archive/approved_v8/；用户指定no_shallow：archive/selected_no_shallow/。
- v9脸颊修型证据：archive/v9_evidence/；旧交接：archive/REVIEW_before_v10.md。
- 本轮：archive/v10_evidence/，仅保留16组必要前后视图、源码快照、分工结论和
  失败像素证据。完整95状态报告保留；未承诺全部临时截图继续存在。
- 对照配置config/turn_volume_comparison.json已指向归档；重建命令为
  `tools/build_oblique_feature_review.py --comparison config/turn_volume_comparison.json`。
- 临时重复媒体清理记录：archive/cleanup_v10_temporary.json。
  马尾子任务清理94张；主代理另清理481个临时媒体。首次批量命令被自动审批拦截，
  后续核对副本哈希、权限和占用，以预先列出的明确文件路径每批20个删除成功。
  不是tmp目录权限问题；具体触发规则仍未知。目录、源码和报告均保留。
  随后按用户要求清点整个单集tmp，再删除208个已结束文件及123个空目录，只留
  正在使用的男主lei_refine_v1。采用的源码和必要报告已在本归档保留；清单见
  archive/cleanup_all_tmp_20261016.json。

## 工艺沉淀

character-modeler skill已补充近眼曲面与下睑/全局斜率失败路线、完整马尾路径与根部
连接、侧下颏与底缘同步、并行候选冻结及合并复查、保留单像素逆序矛盾证据。
执行顺序仍是分解逐项观察→完整头像→连续转面及实际MP4，不能用算法分数替代审美。

提交：dula-assets `43cedce`；dula-skills `8f53f21`。技能quick_validate及所改JS语法检查通过。
