# 侧发绘画输入记录

使用内置 imagegen，透明背景。仅生成一张侧发层，不改已认可原画、正式贴图或 current。

参考：`storyboard/hybrid_character/archive/history/face_design_turnaround_v1/lei_nine_views.png`，中排中间朝右侧脸。

生成输出：`C:/Users/orang/.codex/generated_images/01a144d3-fe45-7572-a3bb-7aeb4bb3b10f/exec-3959e829-4094-4773-afca-8fe117e63156.png`。
项目副本：同目录 `profile-hair.png`。两侧曲面共用此图，存在镜像发流/高光的限制，未宣称左右分别恢复。

最终 prompt：

```text
Use case: background-extraction. Asset type: a transparent side-profile hair painting for a 3D anime character. Input image is the approved character nine-view sheet. Select ONLY the middle row CENTER cell: the boy in full side profile looking to the RIGHT. Extract and faithfully redraw ONLY HIS HAIR in exactly that side profile, on a square transparent RGBA canvas. Keep the exact tousled chestnut-brown hairstyle, crown shape, layered large locks flowing down and back, uneven outward flicking tips at the posterior outline, dark cool nape tips, original restrained copper highlights and thin dark line work. This is one connected complete hair mass, NOT an atlas and NOT individual scattered tufts. Remove every pixel of face, eye, ear, neck, clothes and background; preserve the natural empty ear cutout and opening for the face. The rear of the head is on the LEFT, bangs are on the RIGHT. Keep the profile painting's proportions, don't rotate toward camera. Frame the entire hair including flyaways with generous transparent padding, centered in a square image. No skin, no skull, no labels, no checkerboard, no added objects, no scenery, no glossy 3D lighting. Do not redesign this as a round helmet: the outward rear tips and layered flowing silhouette from this exact reference cell are essential.
```
