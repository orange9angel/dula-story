# 风筛宫 · 不能等的半拍

最新试片：`output/stardust_clad_s1e3_windsieve_trial_r1.mp4`（26秒）。本轮按用户要求
改为独立风峡转运台、护送药篮的短回合和新生成的Suno配乐，未替换下面的136秒
实验版。制作与审片结论见 `storyboard/windsieve_r1/REVIEW.md`。人物肉体感、发型、
微表情和动作自然度仍未通过，不能作为完整新集或质量升级成功的证明。

下文保留R14历史记录；其中“沿用S1E2配乐”描述的是旧版错误，不是当前新集规则。

用户复看后再次否决角色肉体、脸、发型和打斗的提升。本轮针对头发上网学习并制作
独立双栏研究片 `output/stardust_clad_s1e3_hair_study_r6.mp4`；未替换风峡试片。
头发研究仍未获艺术批准，过程见 `storyboard/hair_study_r6/REVIEW.md`。

状态：136 秒实验版；艺术验收不通过，未达到“整体超过上一集”的目标，不作为系列认可基线。

独立剧本初审：因果与视觉潜力各 2/5，未通过。修订后文本终审：前提4、因果4、人物4、洞察4、视觉潜力3、结尾4；通过文本结构检查。55–60 秒为空镜。文字中的换手卸索、主动推箱、完整读招仍未充分落实为可读表演，不能由文本审查代替画面验收。

本次要求：新主角、新对手、新剧情；主代理按 character-attention-review 自查并修复，重点是脸、眼神、骨肉、发型、走停和发力。上一集 R27 与其音轨保留。

角色：小凿首次独立守宫；新对手缄网；新配角送药人苇禾。系列既有小凿的银蓝战壳、斜刘海和左眼下痣保留，重做近景形体与表演。F01/F02/F03 均不推进。

制作标准引用 `../../../dula-skills/direct-animation-craft/references/production-efficiency.md`；审查引用 `../../../dula-skills/character-attention-review/SKILL.md`。最终时序以 script.story 为准，编译配置不得另写台词时序。

候选 A：敌人用不可见丝弦控制桥，主角等风停却让送药人落险；先强行挣脱失败，再借银尘识弦，最后毁掉筛盘完整性把承重转到自己身上，救人并割断操纵弦。评分：前提4、因果4、角色5、洞见4、视觉4、结尾4。选用。

候选 B：主角与敌人在空中追逐逐个打断风钟。评分：前提3、因果3、角色2、洞见2、视觉4、结尾3。放弃：未把“等待绝对安全”变成有代价的选择。

故事发动机：
- 当下要送苇禾与药箱过桥。
- 小凿把精确计算当作可以推迟行动的理由。
- 丝弦听桥板振动，挣扎令绑缚更紧；风携银尘才使弦显形。
- 等待导致桥被控制；蛮力出拳导致自身被缠；不再挣扎后才观察到传播路径。
- 为救人，把完整筛盘折断卡入断索，自己承重，失去部分防御。
- 敌人的同一根操纵弦被反向牵紧而暴露，主角贴近切断；药过桥，筛孔永久损坏。

验收须区分：抽帧/密集顺序帧/实际正常速度观看。没有收到的视频帧或音频不能记作已看/已听。用户不负责逐张截图。

最终实验输出：`output/stardust_clad_s1e3_pilot_r14.mp4`。以小凿为新主视角，
新增缄网和苇禾。完整画面判断、前后证据及未解决项见
`storyboard/character_attention/REVIEW.md`；不覆盖 S1E2 R27。

本次主代理亲自审查静帧和带时刻的顺序帧，没有调用外部视觉评分模型。文本独立
批评由 story-writer 要求的文本审稿代理执行。没有正常速度视频感知或听觉验收证据。

运行链：`tools/compile_story.py` 读取 `.story` 的 Beat/Act/Cue，输出 timeline、
dialogue 和 B/T 时序。performance 的原画坐标通过这些锚点重定时；viewer 直接执行。
通用引擎的 custom-event dispatch 不用于此集，`scene_tool.py` 的 EVT001 三项错误
是该通路未接入通用调度器的限制，不能用空 handler 冒充通过。场景 schema 与实际
viewer 输入由 `tools/validate_runtime.py` 检查。

复现顺序：

```powershell
python tools/prepare_production.py
python tools/gen_dialogue.py
python tools/gen_sfx.py
python tools/mix_audio.py
python tools/validate_runtime.py
node render.mjs --check --board storyboard/recheck
node render.mjs --out candidate.mp4 --trace storyboard/candidate_trace.json
```

已有语音和音效可用本地缓存；重新生成付费音频前依照对应技能检查账户和授权。
背景、石材和刻纹复制到本集，运行时不读取另一集目录。配乐沿用 S1E2 用户认可的
两份资产；其历史来源是 Seed-Audio，本次没有声称由新配乐服务生成。三段新增环境/
断裂音效来自 Seed-Audio；19 条台词/发力音来自 Seed TTS。声音仅完成技术检查。

已知弱项：造型仍显程序拼装，脸颊/眼窝和关节体积不足；头发仍有帽壳大形；
三人表情和动作个性不够；步态前段蹲得偏低、上身与迈步脱节；出手及反应幅度小；
救援与切弦的因果、抓握和卸索仍不够可读；结尾空间收束不足。未建立完整网格碰撞
证明，不能把踝点不滑和腕点对齐称作身体接触全部自然。

R11 新增发梢运动时出现 NaN；该轮不作为有效画面验收。已修正未设姿势量的默认值，
增加有限数检查和渲染控制台错误中止。R12 完整解码发现 83–88 秒镜头沿用站立高度，
负重俯身后大量天空挤掉人物；R13 修正构图。R14 修正宫名标记后导出。
