0
00:00:00,000 --> 00:00:08,000
@NeonHighwayScene{Transition:Fade|duration=0.5}
{Music:Play|name=theme_logo|fadeIn=0.1|baseVolume=0.7|endTime=8}
{Event:Animate|character=V1_RED|action=RobotTransform|duration=1.0}
{Event:Animate|character=T2_BLUE|action=RobotTransform|duration=1.0}
{Event:Animate|character=A3_WHITE|action=RobotTransform|duration=1.0}
{Event:Animate|character=X0_BLACK|action=RobotTransform|duration=1.0}
{Event:Animate|character=R4_ORANGE|action=RobotTransform|duration=1.0}
{Position:V1_RED|x=-2|y=0|z=3|face=forward}
{Position:T2_BLUE|x=2|y=0|z=4|face=forward}
{Position:A3_WHITE|x=-1.5|y=0|z=-6|face=forward}
{Position:X0_BLACK|x=1.5|y=0|z=-7|face=forward}
{Position:R4_ORANGE|x=0|y=2|z=-2|face=forward}

1
00:00:08,000 --> 00:00:15,000
[V1_RED]{Camera:TrackingCloseUp|characterName=V1_RED|distance=4|height=1.2} Rust Legion，你们休想带走核心。钢铁先锋队，准备战斗！
{Music:Play|name=pulse_highway|fadeIn=1.0|baseVolume=0.6|endTime=35}

2
00:00:15,000 --> 00:00:22,000
[R4_ORANGE]{Camera:TrackingCloseUp|characterName=R4_ORANGE|distance=4|height=1.2} 核心？我们要的是整座城市，小红！让你尝尝沙漠烈焰的滋味！

3
00:00:22,000 --> 00:00:29,000
[A3_WHITE]{Camera:Static|position=0,4,10|lookAt=0,1,0} V1，我已经在空中锁定他们。前方两公里就是废铁区，小心埋伏。

4
00:00:29,000 --> 00:00:35,000
[T2_BLUE]{Camera:LowAngle|distance=5|height=0.8} 收到。速战速决，为了铁星七号。

5
00:00:35,000 --> 00:00:36,500
@ScrapyardSectorScene{Transition:Wipe|duration=0.6}
{Event:Animate|character=V1_RED|action=RobotRevert|duration=1.0}
{Event:Animate|character=T2_BLUE|action=RobotRevert|duration=1.0}
{Event:Animate|character=A3_WHITE|action=RobotRevert|duration=1.0}
{Event:Animate|character=X0_BLACK|action=RobotRevert|duration=1.0}
{Event:Animate|character=R4_ORANGE|action=RobotRevert|duration=1.0}
{Position:V1_RED|x=-2|y=0|z=2|face=X0_BLACK}
{Position:T2_BLUE|x=-3.5|y=0|z=0|face=R4_ORANGE}
{Position:A3_WHITE|x=0|y=0|z=-3|face=X0_BLACK}
{Position:X0_BLACK|x=2|y=0|z=1|face=V1_RED}
{Position:R4_ORANGE|x=3.5|y=0|z=3|face=V1_RED}
{Camera:FightWide|distance=7|height=2}
{Music:Play|name=scrapyard_fight|fadeIn=0.5|baseVolume=0.65|endTime=85}

6
00:00:36,500 --> 00:00:45,000
[X0_BLACK]{Camera:LowAngle|distance=4|height=1} 钢铁先锋队。你们把勇气错当成了力量。这座废铁场，将是你们的坟场。

7
00:00:45,000 --> 00:00:50,500
[V1_RED]{PointForward}{Camera:FightSide|distance=5|height=1.5} T2，左路包抄。A3，空中压制。

8
00:00:50,500 --> 00:00:54,500
[T2_BLUE]{CrossArms}{Camera:FightImpact|distance=4|height=1.5} 终于可以松松筋骨了。

9
00:00:54,500 --> 00:00:59,500
[R4_ORANGE]{Animation:FaceAngry|character=R4_ORANGE}{Camera:FightDramatic|distance=5|height=1.5} 来啊！让我看看你们的火花是不是也一样烫！

10
00:00:59,500 --> 00:01:06,500
[X0_BLACK]{StompFoot}{Camera:FightOverhead|distance=6|height=12} 有意思。但你们忘了——这里是我的废铁场，规矩由我来定！

11
00:01:06,500 --> 00:01:10,500
[V1_RED]{LeftPunch}{Camera:FightFollow|distance=4|height=1.2} 那就按我们的规矩来——正义必胜！

12
00:01:10,500 --> 00:01:17,500
[A3_WHITE]{Camera:Static|position=0,5,8|lookAt=0,1,0} V1，核心信号在废铁场地下金库！快去，这里交给我和T2！

13
00:01:17,500 --> 00:01:19,000
@PlasmaVaultScene{Transition:Iris|duration=0.8}
{Position:V1_RED|x=-1|y=0|z=2|face=center}
{Position:X0_BLACK|x=1|y=0|z=2|face=V1_RED}
{Camera:Static|position=0,2.5,8|lookAt=0,1.2,0}
{Music:Play|name=vault_tension|fadeIn=1.5|baseVolume=0.55|endTime=118.5}

14
00:01:19,000 --> 00:01:25,000
[X0_BLACK]{Camera:LowAngle|distance=4|height=1} 你太慢了，V1。核心现在属于锈铁军团。

15
00:01:25,000 --> 00:01:32,000
[V1_RED]{HandsOnHips}{Camera:Static|position=-1,2.5,6|lookAt=0,1.2,0} 你错了，X0。核心属于每一个相信自由的生命——包括你曾经的自己。

16
00:01:32,000 --> 00:01:37,000
[X0_BLACK]{Animation:FaceSurprised|character=X0_BLACK}{Camera:ZoomIn|characterName=X0_BLACK|distance=3} 闭嘴！你根本不懂……核心的力量！

17
00:01:37,000 --> 00:01:44,000
[V1_RED]{PointForward}{Camera:Static|position=-1,2.5,6|lookAt=0,1.2,0} 放下它。否则我会让你记起，你曾经也是钢铁先锋的一员。

18
00:01:44,000 --> 00:01:52,000
[X0_BLACK]{ShakeHead}{Camera:ZoomOut|distance=6|height=2} ……这次算你赢。但锈铁军团不会就此罢休。我们走着瞧！

19
00:01:52,000 --> 00:02:00,000
[V1_RED]{Camera:OrbitCharacter|characterName=V1_RED|radius=3|height=1.5|duration=4|endAngle=3.14} 废铁会归于平静，铁星七号的天空依旧明亮。钢铁先锋队，任务完成。
{Music:Play|name=victory_rise|fadeIn=0.5|baseVolume=0.7|endTime=130}

20
00:02:00,000 --> 00:02:03,000
{Transition:Fade|duration=1.5}
