# R3 续作记录 · 2026-10-14

## 当前接入状态（优先于以下所有旧记录）

- 用户已授权两名 Tripo 主角接入正片，并明确采用程序动作与 Tripo 生成动作混合。
- `viewer.js` 已使用两份 16 万面 LOD；旧程序人物 viewer 备份为 `viewer_procedural_r3.js`。
  场景、82 秒时间轴、火山音轨和底部描边分色字幕保留。
- `output/tripo_dialogue_preview_v1.mp4` 被用户指出眼神无神、人偶感明显，不能当验收通过。
  已交付 13 秒 1080p `output/tripo_dialogue_preview_v2.mp4`，增加眼神和局部眉嘴/眨眼控制。
  虹膜擦除贴补产生重影，改为眼睑边界固定的局部连续纹理形变；仍是有限面部系统。
- Tripo Pro 的 Text to Motion 已真实生成并正常导出 5 秒 Rubbing Arm，20 点，2980→2960。
  任务/输出/哈希见 `tripo_motion_receipt.json`。不要重复提交收费任务。
  已在 `output/tripo_text_motion_trial_v1.mp4` 本地渲染，且接入第 7 条目的擦臂动作。
- 本地动作采用绑定姿态相对世界旋转重定向，不能直接复制 Blender 与 Tripo 的局部四元数。
  原 GLB 没有面部 morph，当前小型面部系统是本地补建，不能称为 Tripo 面部大模型。
- 递/拿罐改为外侧接近；男主握持恢复拇指朝上、增加屈指、调整腕高与肘路径。
  桌沿用实际蒙皮手采样驱动的有限软约束，保留动作节奏。最终 `tripo_validation` 以 60Hz
  检查 4920 帧，`imported_contact_report.json` 为 sampled-contact-pass；手/臂采样穿桌/罐 0，
  女主脚底最深约 0.389mm；持罐最近采样间距女主最大 4.19mm、男主 6.94mm。
  不覆盖完整自碰撞、连续时间扫掠或全部发衣交互；旧程序人物门禁不能沿用。
- 女主裙摆错误手臂权重已修正；初次盒选误伤前臂，现增加暗色衣物选择，已看图复核。
  已加入 head-weighted 马尾小幅变形，按 0.18 秒历史姿态生成确定性跟随，无状态累积。
- `output/tripo_episode_preview_v1.mp4` 已导出：82 秒、1920×1080、30fps、2460 帧、
  AAC 48k 双声道 82 秒，完整 ffmpeg 解码通过。最终片抽帧检查 26/37.1/65.7 秒；
  另检查对白新版眨眼/说话帧与 11 个风险姿势。没有声称完成全片正常速度主观审片或新一轮审听。
- 技术接入已形成完整候选，用户尚未认可新版面部观感；不能把检查通过写成审美定稿。
  详细输出哈希/验证见 `tripo_integration_report.json`。当前重点仍是减少人偶感。
- 已提交共用实现 dula-assets `679bd3c`、技能经验 dula-skills `00dbef6`；浏览器未新增收费任务。

## 最新覆盖记录（05:00 前，优先于下方较早记录）

- 用户同意后续改真正无头；当前不打断可用 Chrome 流程来强行切换。操作时用户可用
  其他标签/应用，若用户说暂停网页须停浏览器操作。
- 新实证：原始 197 万面 Aoi 在相同 720p 近景下明显平顺。问题集中于减面/重烘焙及
  导入，不能归因于 4K 不够或会员等级；降低法线只是局部诊断。已正常导出两人原高模。
- 本机 Blender 5.1 已安装，使用无窗口 CLI：保留原 UV/4K 纹理，Collapse 至 160000 面，
  从有效 walk GLB 在 REST pose 转移权重（最近表面插值），带动作导出。每人约 32 秒。
  两人 `assets3d/tripo_*_trial/*_h31_lod160k_v2.glb` 均成功，Aoi 近景/走路/抬手已看图改善。
  `prepare_rigged_lod_blender.py` 已收入 build-image-to-3d/scripts；用 --python-exit-code 1。
  动态衣物、面部口型、抓握和 E4 接入仍未完成，不能把候选版当整集已重制。
- 已生成 `output/tripo_cast_trial_v2.mp4`，12 秒、1920×1080、24fps、无音频。
  使用 `node tools/render_tripo_lab.mjs --both --lod --hd`。保存旧 v1 对比，不覆盖原始资产。
- `audit_glb_skin.py` 已确认两份 walk 和两份新 LOD 权重结构通过；Aoi skeleton-only
  导出因 99.9879% 顶点只跟 Hips 明确失败。脚本不替代动态或审美验收。
- Tripo 浏览器任务目前返回男主 Current Version，未 Restore 覆盖任何历史模型。
  Emulation.setFocusEmulationEnabled 已关闭；余额仍 2980。
- 上传临时代码已晋升 `build-image-to-3d/scripts/tripo_upload_reference.py`，实际上传验证成功，
  不提交生成；原 episode/tools/tripo_trial_upload.py 已删除。
- `storyboard/remake_r3/tripo_trial_report.json` 汇总所有输出哈希、贴图尺寸和剩余工作。
  新 LOD 两人的颜色/法线/粗糙度图均为 4K；图片检查覆盖新版两人正面、走路、抬手，
  女主新旧同机位脸部近景，原始高模和材质 A/B。v2 不含台词，未做声音审听。

- 当前实际权限已是 danger-full-access / approval never；不要重复申请命令权限。
- 用户购买 Tripo Pro 后授权男女主均制作，场景沿用 hybrid-craft-scene。
- 用户最新指出女主动作试片像低清图片；本地 A/B 已证实法线贴图引入三角块状明暗。
  `storyboard/remake_r3/tripo_lab/face_original.png` 对比 `face_normal_0.png`；
  4K 颜色贴图、2K 法线已实际解码检查。不能未比较原始模型就断言丢失面部细节。
- Aoi project ca6900e7-2829-459b-a69b-35152900959a；生成/减面/绑定共 110 点。
  `assets3d/tripo_aoi_trial/aoi_h31_walk_v1.glb` 有 19326 三角面、65 joints、walk clip。
  无动画的 rigged GLB 权重损坏：24733/24736 顶点只绑定 Hips。不能拿 skin 存在当合格。
  local lab 使用 walk GLB 克隆后 skeleton.pose() 恢复中性姿态，IK pole 已修正为方向。
- Lei project 684d5443-66df-4c38-acb0-2aa2fb08b223，生成/减面/绑定均完成，余额 2980。
  减面输入框虽显示 20000，实际请求是 10000，输出 9529 三角面，尚非质量合格资产。
  walk 已选择，正在正常 Export 对话框；下载目录 D:/Download。不要重复提交收费生成。
  两人 task receipts 已写各自 `assets3d/tripo_*_trial/trial_manifest.json`。
- Kimi daemon 127.0.0.1:10086，session aoi-tripo-trial，Chrome tab 1967558564。
  当前可用的是用户登录 Chrome 后台标签；独立 Playwright headless 仍被 CF 拦截，
  不能称为无头已通过。未保存/复述 Tripo 密码。别自动关闭用户浏览器。
- 本地服务 port4215 已运行（node render.mjs --serve）；本地 Puppeteer 无头渲染可用。
  `tripo_lab.html/js`、`tools/render_tripo_lab.mjs --quality/--stills/--both` 是试验入口。
  第一版 `output/tripo_aoi_trial_v1.mp4` 已被用户指出粗糙，不能当最终成片。
- 04:27/04:28 的 reconnect 已查 Codex logs_2.sqlite：auto_compact 因 ContextLimit 执行时
  websocket 被服务器提前关闭，retry；并非 Tripo 登录或 Python 权限。现在已恢复。
- 原 E4 R3 仍未完成。rub_arc2 局部表面穿入 0；reach11 左手入罐 1.65mm，
  但左手入躯干 18.92mm，仍失败。60Hz pose reach guard 通过不等于真实表面通过。
  最新 Aoi reach bump 已更新后，Foley/hash/full trace 需重新生成。
- Tripo 相关共用技能与脚本已提交 dula-skills `035db3a`；其他 E4/Suno/音色目录改动未混入。
  新试片经 ffprobe 确认 288 帧、12 秒、1920×1080、24fps，完整 ffmpeg 解码通过。

以下为较早存档，接触结果、权限和下一步以最新覆盖记录为准。

## 用户意图与授权

- 重制第四集，以第三集质量为基线，减少穿模，不能退化剧情、动作、角色、场景、字幕、声音。
- 文生图、必要视觉检查、必要听觉判断允许；不用收费生成视频。火山与 Suno 资源均可用。
- 用户要稳定、快速的高质量动画并迭代现有 skill。通用标准已集中到
  `dula-skills/direct-animation-craft/references/production-efficiency.md`，系列圣经只引用。
- 用户准备重启 CMD 中的 Codex 并睡觉。已经明确授权完全访问与不再询问命令审批。
  `C:/Users/orang/.codex/config.toml` 已备份并写入 `approval_policy="never"`、
  `sandbox_mode="danger-full-access"`，TOML 解析验证通过。**旧运行中的会话仍收到
  workspace-write/restricted 权限；续作必须核对实际下发权限，不凭配置文件宣称生效。**
- 为该设置临时启动过一个新 CLI，停在登录页后已退出，未修改当前会话运行权限。

## 已完成的 R3 实现

- `script.story` 已重写为 82 秒、19 条目、14 句对白；已编译 `config/timeline.json`。
  独立 story_critic_r3 已通过修订剧本：害怕被当标本→擦拭/强收反使蚀扩大→叫停→
  主动今天不试→用受影响的手帮拿标本罐。文本通过不代表画面已经通过。
- 新活动文件：`performance_remake.js`、`scenes/BiologyRoomRemakeScene.js`、`viewer.js`。
  bootstrap 指向新场景；旧 performance.js 和 BiologyRoomScene.js 留作历史参考。
- E3 底部描边角色分色字幕已恢复；气泡和漫画框已撤。cel、阴影、近景和表情恢复。
- 文生图生成 1 张活动室墙面，`assets3d/textures/biology_wall_r3.png`，场景用实际桌子、
  标本罐和笔记本几何承载互动。背景 source sidecar 仍待补。
- 已生成并混合 14 句火山 Seed-TTS2 台词，1 首 Seed-Audio 音乐、3 类 Foley，复用并
  整理环境底噪。ASR/电平检查 11 green、3 timing warnings、0 fail；所有台词未截断。
- DTW 逐字对齐和 V17 拼音视素已接入；最终 PCM 静音门控。共享代码晋升到
  `dula-assets/lib/audio/known_text_alignment.py`、`viseme_core.py`。
- 新共享 `dula-assets/lib/craft3d/garment-clearance.js` 对姿势后的袖面做有限外推，
  真实表面仍经原检测，没有把袖子从检查排除。需完善资产文档、skill 经验并提交。

## 当前接触检查与修复

- `storyboard/remake_r3/physics_final/trace.json` 是 2460 帧完整采样，但**仍有失败**：
  千堂葵左前臂在递罐时入躯干最深 12.23mm、入桌面最深 22.60mm；其余 7 组
  袖臂/手与躯干配对最深 0。握罐手指穿罐已修复，两人 grip gap <0.04mm。
- 最新已修改 performance_remake.js：仅递罐期间把千堂葵肘部极点向前上方平滑过渡，
  其他动作保留自然下垂肘部。正在验证这次改动，不可直接声称通过。
- 新检查命令误用了不支持的 --start/--end，因此实际跑全片：
  `node render.mjs --physics-only --start 58.2 --end 64.2 --board storyboard/remake_r3/reach6 --trace storyboard/remake_r3/reach6/trace.json`。
  恢复后检查 reach6 trace 是否完整并分析。**正确局部参数是 `--range 58.2,64.2`。**
- 下次完善 tablePenetration 检查时，当前左/右臂集合仅 skin+hand，须包括 sleeve/cuff。
- 最新已看图 `storyboard/remake_r3/fourth/09_slide.jpg`、`10_take.jpg`：自然肘部比此前
  抬肘机械感改善，场景和字幕已明显恢复。仍需看蚀纹/叶罐关键镜头，按风险取帧。

## Suno 状态（不得写成成功生成）

- 用现有 suno-driver 登录并复用持久 profile。凭据只存 Windows DPAPI 加密的本地
  `.suno_profile/credentials.dpapi`（已 gitignore），不把密码写文档、日志、记忆。
  加密保存/读取要同一 Windows 身份与执行上下文；沙箱内保存曾导致外部读失败，已重存修复。
- 生成尝试未得到新 clip，未证明成功提交/生成。新增请求 receipt 捕获尚待验证。
- 下载已有歌 `Dusk on the Lake`（song id `3b43b3e6-a3a9-41be-83e5-09cd8c7fd4a1`）
  最初误取播放器 `sil-100.mp3` 静音占位。该文件 **不能混音**，需标记 rejected 或替换。
  suno_generate.py 已改为拒绝不含目标 song id 的源并拒绝明显过短响应，尚待实测。
- 当前可用混音仍是火山音乐，Suno 不是必须阻塞出片的唯一通道。
- 实际音频工具回报“不支持音频输入”，本代理没有完成主观听审，不能假称已听过。

## 下一步顺序

1. 核对 reach6 真实躯干/桌面穿入结果；若未修复继续调整递罐路径，保留动作。
2. 更新 `config/contact_contract.json`（旧 81 秒/R2 镜号/人物间隔不适用于 82 秒互动），
   不放宽真实穿模阈值来掩盖问题。合理区分 AABB 保守重叠和实际表面穿透。
3. 更新旧 `tools/check_story_motion.py` 的事件与几何动作断言；更新
   `tools/check_audio_sync.py` 的 12 句旧断言为当前 14 句+DTW/final PCM 门控验证。
4. 从脚接触 trace 对齐 Foley；更新 scene_contract 新场景模块、事件、位置、异步纹理
   readiness；跑 story_tool catalog/validate 与 scene_tool validate。
5. `tools/audit_inputs.mjs` 补上新 viseme/alignment/背景/共享音频源码依赖；render.mjs
   的 --shots 结尾日志错误宣称 video complete，需要修正。
6. 生成必要关键镜图并检查；完整导出 `output/craft3d_s1e4_remake_r3.mp4`（目前不存在）。
   旧 contact_preview.mp4 是较早版本，不能当成最终版本交付。
7. 完成接触、时序、素材来源、视频解码与帧率/时长验证，明确视听审查范围。
8. 回写现有 skill（共用基线、袖面修型、Suno 凭据/占位音频），验证并仅提交相关改动。
   四个仓库有大量历史/其他任务脏文件，不得 git add .、重置或覆盖。

开工仍先读 `D:/opensource/movie/dula-skills/AGENTS.md`，按对应现有 skill 接续。
