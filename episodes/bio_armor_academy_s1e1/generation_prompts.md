# 生图提示词记录 — S1E01《选中者》

全部位图走 `gen_image_auto.py`(codex imagegen 优先，百炼兜底),尺寸 1672x941。
风格契约见 `STYLE_BIBLE.md`(v3 电影感，2026-08-23 定稿);角色/场景 design lock 逐字在其中第 3、4 节。

## 母版(4 张，全部通过目检)

| 文件 | 参考图 | 说明 |
|------|--------|------|
| `assets/style_master.png` | 无 | 西岸废工地黄昏全景，确立电影感风格 |
| `assets/leixiao_reference.png` | style_master | 雷晓日常态;v1 双臂都被蚀(拒)→ v2 蚀纹错到左臂(拒)→ v3 用 viewer 视角锁右臂,过 |
| `assets/bailan_reference.png` | style_master | 白岚;v1 黑长直剑道服(用户改需求:去日化)→ v2 欧系刀疤胡须混搭武者装,过 |
| `assets/leixiao_armored_reference.png` | leixiao_reference | 殖装态右臂生物刃,胸口核光,过 |

母版提示词全文 = STYLE_BIBLE §3/§4 的 design lock + §2 hardLock,载入顺序见 `tools/gen_keyframes.sh` 同款调用。

## 关键帧(13 张,全部通过目检)

提示词全文在 `tools/gen_keyframes.sh`(`$LX` / `$BL` / `$STYLE` 三个共享锁段 + 逐格构图描述)。frame_01 曾因蚀纹画到左臂返工一次(prompt 补 viewer 视角锁后过)。

## 口型/眨眼变体(27 张)

`tools/gen_variants.sh`:9 mouth rig(帧 01,02,03,04,05,06,07,09,10)× half/open、帧 01/03/05/09 补 closed(基帧嘴非闭合)、5 eye rig(帧 01,03,05,06,09)。局部编辑指令 + 逐像素锁定尾句,产物经 `lock_region_variant.py` diff 羽化锁回后才进 rig。

## 风格决策史(为什么不是网点漫画风)

1. v1 黑白网点 + v2 彩色网点:用户否决「不要网格感」。
2. v3 定稿:高清电影感帧 + 漫画语法 overlay(气泡/拟声词/翻页/冲击帧在场景层叠加)。
3. 服装去日化:剑道服 → 平行世界混搭武者装;全员混血感长相;场景无任何文字/招牌。
