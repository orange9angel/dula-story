1
00:00:00,000 --> 00:00:05,950
@WindSievePalaceScene
{Event:Beat|id=bridge|label=风筛宫}
{Event:Cue|name=duration|offset=136}

2
00:00:06,000 --> 00:00:09,950
{Event:Beat|id=wait|label=等风}
{Event:Act|id=l01|rate=0|context=年轻送药人隔着风声压住焦急，药箱牢牢抱在胸前。}
[Weihe]再等，药就凉了。

3
00:00:10,000 --> 00:00:14,950
{Event:Beat|id=count|label=计算|visual=苇禾已抬脚等到风弱，小凿伸手拦住，筛盘拦下飞石留下银粉；错过空档后远处弦光落到桥索上}
{Event:Act|id=l02|rate=-5|context=冷静少年观察桥索而非故作高冷，轻声阻止同伴迈步，数到二时停住。}
[Xiaozao]再等一次。我要看准。一，二……

4
00:00:15,000 --> 00:00:20,950
{Event:Beat|id=entry|label=缄网现身}
{Event:Cue|name=entry_pull|offset=2.4}

5
00:00:21,000 --> 00:00:25,950
{Event:Beat|id=enemy_line|label=静止的桥}
{Event:Act|id=l03|rate=-8|context=成熟男声非常轻，像替别人做好决定，控制欲藏在温和里，不用咆哮。}
[Jianwang]现在不晃了。你们应该谢我。

6
00:00:26,000 --> 00:00:29,950
{Event:Beat|id=step|label=试探落脚}
{Event:Cue|name=step_one|offset=.9}
{Event:Cue|name=step_two|offset=2}
{Event:Cue|name=step_three|offset=2.7}
{Event:Cue|name=snare|offset=2.9}

7
00:00:30,000 --> 00:00:33,950
{Event:Beat|id=snare_face|label=疼痛与判断}
{Event:Act|id=l04|rate=0|context=手腕突然被勒住，短促吸气后把提醒压低，目光移到对方脚下。}
[Xiaozao]别动。它在听桥板。

8
00:00:34,000 --> 00:00:38,950
{Event:Beat|id=guard|label=以拳试弦}
{Event:Act|id=l05|rate=-5|context=对少年不自量力轻微失望，语气仍温和。}
[Jianwang]越想挣开，越疼。

9
00:00:39,000 --> 00:00:44,950
{Event:Beat|id=strike|label=第一拳失败|visual=小凿先以筛盘抵住腕前的弦，右拳沿弦击向对手；桥板传来振动，弦先收紧，胸肩被拉回，盘缘银粉散落}
{Event:Cue|name=punch|offset=1.45}
{Event:Cue|name=bind_hit|offset=1.65}
{Event:Act|id=e01|rate=0|context=腹部发力的短促出拳声，随后被绳索牵住，声音只发一次不要朗读动作。}
[Xiaozao]喝！

10
00:00:45,000 --> 00:00:49,950
{Event:Beat|id=pain|label=受力停顿}
{Event:Act|id=l06|rate=-8|context=试图安抚受困者，轻声的怜悯反而显得冷酷。}
[Jianwang]我替你们停下来，就没人会掉下去。

11
00:00:50,000 --> 00:00:54,950
{Event:Beat|id=fracture|label=桥的代价|visual=缄网见桥晃动立即握紧手指试图止晃；索被拉直，旧支座开裂，苇禾抱药箱跌到桥缘，左手抓住尚未断开的承重索}
{Event:Cue|name=crack|offset=1.1}
{Event:Act|id=l07|rate=0|context=脚下桥板断裂，短促惊叫，后半句咬住牙不让药箱掉下去。}
[Weihe]小凿！桥……断了！

12
00:00:55,000 --> 00:00:59,950
{Event:Beat|id=hear|label=谷中回声|visual=空镜：一片断木越落越小，风筛宫远处的布幡停止摆动；不增加新线索，不解释规律}

13
00:01:00,000 --> 00:01:05,950
{Event:Beat|id=dust|label=银尘显弦|visual=小凿不再挣扎，翻腕抖落盘缘银粉；粉末沿一根连接承重索与缄网指套的弦停住，观众看清共用受力路径}
{Event:Cue|name=dust_release|offset=.8}
{Event:Act|id=l08|rate=-10|context=少年从憋气转为缓缓呼气，说给自己听，抓住观察到的规律而不是宣布大道理。}
[Xiaozao]不是风。是你把整座桥拉紧了。

14
00:01:06,000 --> 00:01:11,950
{Event:Beat|id=choice|label=迟疑的半拍|visual=小凿先看完整筛孔，再看苇禾发白的手指；风声暂低，镜头停在两人之间未被握住的那只手}
{Event:Act|id=l09|rate=0|context=悬在桥边的年轻人努力相信对方，声音发抖，却不求饶。}
[Weihe]我……还要等吗？

15
00:01:12,000 --> 00:01:16,950
{Event:Beat|id=decide|label=不再数三}
{Event:Act|id=l10|rate=-10|context=很轻很确定，目光先落到对方伸出的手，再抬眼。不要变成英雄宣言。}
[Xiaozao]不用。把手给我。

16
00:01:17,000 --> 00:01:22,950
{Event:Beat|id=brace|label=折盘承重|visual=小凿主动折下三格筛孔，弯盘卡住苇禾抓着的承重索，左臂背负索重、右手抓住她腕部，后脚踩住桥梁；碎片落入深谷}
{Event:Cue|name=disc_break|offset=1.8}
{Event:Cue|name=catch|offset=3.1}
{Event:Act|id=e02|rate=0|context=在用整条腿和背部承受拉力，先吸住气，发一个吃力的短音。}
[Xiaozao]呃！

17
00:01:23,000 --> 00:01:27,950
{Event:Beat|id=load|label=负重}
{Event:Act|id=l11|rate=0|context=第一次失去从容，质问中有真实恐惧，不是夸张嘲笑。}
[Jianwang]筛盘碎了，你拿什么挡？

18
00:01:28,000 --> 00:01:33,950
{Event:Beat|id=haul|label=救人上桥|visual=苇禾先把药箱推上桥板，再借小凿右臂翻上；小凿保持左臂拉住盘中承重索，连接缄网指套的弦被反向拉紧，对手被迫踏前一步}
{Event:Cue|name=haul_land|offset=3.5}
{Event:Act|id=l12|rate=0|context=负重呼吸中给出简短的行动指令，决心不靠提高音量。}
[Xiaozao]先让她过去。

19
00:01:34,000 --> 00:01:38,950
{Event:Beat|id=counter_prepare|label=弦的另一端|visual=苇禾将药箱推离战线并握住桥侧护索；小凿拉索迫使缄网靠近，银粉在直线弦上亮起；确认苇禾已安全后右手握住松弛承重索，左手旋出残盘，两人距离收至一步}
{Event:Act|id=l13|rate=-5|context=凝视反向绷紧的操纵弦，发现自己被迫暴露位置，声音变紧。}
[Jianwang]你故意接住那根索？

20
00:01:39,000 --> 00:01:44,950
{Event:Beat|id=counter|label=贴身切弦|visual=小凿后脚蹬地、转髋带肩，以残盘锐边切断已拉直的操纵弦；缄网手指骤然松开，肩胸随失衡下沉，先后脚着地缓冲}
{Event:Cue|name=counter_step|offset=.65}
{Event:Cue|name=counter_swing|offset=1.2}
{Event:Cue|name=thread_cut|offset=1.48}
{Event:Cue|name=enemy_land|offset=2.9}
{Event:Act|id=e03|rate=0|context=脚踩实后转髋发力，短促气声爆发，收住尾音。}
[Xiaozao]哈！

21
00:01:45,000 --> 00:01:50,950
{Event:Beat|id=release|label=桥重新呼吸|visual=缄网失衡退向远端，蹬住桥板，低头看指套的断弦；桥重新随风起伏}

22
00:01:51,000 --> 00:01:56,950
{Event:Beat|id=cost|label=缺了的筛孔}
{Event:Act|id=l14|rate=-6|context=已经安全，看到对方手臂仍抖，关切但不煽情。}
[Weihe]你的手还在抖。

23
00:01:57,000 --> 00:02:02,950
{Event:Beat|id=answer|label=仍然害怕}
{Event:Act|id=l15|rate=-8|context=少年终于承认自己的害怕，轻微气短，有一点自嘲，绝不说教。}
[Xiaozao]嗯。药还热吗？

24
00:02:03,000 --> 00:02:08,950
{Event:Beat|id=warmth|label=药箱}
{Event:Act|id=l16|rate=-5|context=打开箱盖一条缝确认后松口气，温柔而克制。}
[Weihe]还热。

25
00:02:09,000 --> 00:02:16,000
{Event:Beat|id=end|label=第一步|visual=苇禾抱药箱先走，小凿看到一阵尚未停止的风，握着缺孔筛盘迈出第一步，未再数三；缄网留在远端看着重新晃动的桥}
{Event:Cue|name=final_step|offset=2}
