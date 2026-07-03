0
00:00:00,000 --> 00:00:08,000
@NeonHighwayScene{Transition:Fade|duration=0.5}
{Music:Play|name=theme_logo|fadeIn=0.1|baseVolume=0.7|endTime=8}
{SFX:Procedural|type=engine_idle|start=0|end=35|volume=0.12}
{SFX:Procedural|type=traffic|start=0|end=35|volume=0.06}
{SFX:Procedural|type=transform_mechanical|start=0|end=1.5|volume=0.45}
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
[V1_RED]{Camera:TrackingCloseUp|characterName=V1_RED|distance=4|height=1.2} A3，你确定没导错？这条路的风景全是生锈的护栏。
{Music:Play|name=pulse_highway|fadeIn=1.0|baseVolume=0.6|endTime=44}

2
00:00:15,000 --> 00:00:22,000
[T2_BLUE]{Camera:TrackingCloseUp|characterName=T2_BLUE|distance=4|height=1.2} 知足吧，上次它把我导进一条河里，我到现在还在排水。

3
00:00:22,000 --> 00:00:29,000
[A3_WHITE]{Camera:Static|position=0,4,10|lookAt=0,1,0} 你们两个安静点。前面...有东西。不像废铁。

4
00:00:29,000 --> 00:00:35,000
[T2_BLUE]{Camera:LowAngle|distance=5|height=0.8} 终于？我的炮管都快长蜘蛛网了。

5
00:00:35,000 --> 00:00:44,000
[A3_WHITE]{Voice:excited}{Camera:FightSide|distance=6|height=2} 敌机接近！十一点方向！散开！
{SFX:Procedural|type=gunfight|start=36|end=40|density=0.6|volume=0.28}
{Combat:Attack|attacker=R4_ORANGE|defender=V1_RED|anim=SpiritGunFire|start=36}
{SFX:Play|name=energy_blast|offset=0.0|baseVolume=0.65}
{SFX:Play|name=impact_metal|offset=0.35|baseVolume=0.60}
{Combat:Attack|attacker=T2_BLUE|defender=R4_ORANGE|anim=SpiritGunFire|start=37}
{SFX:Play|name=energy_blast|offset=1.0|baseVolume=0.65}
{SFX:Play|name=impact_metal|offset=1.35|baseVolume=0.60}
{Combat:Attack|attacker=A3_WHITE|defender=X0_BLACK|anim=SpiritGunFire|start=38}
{SFX:Play|name=energy_blast|offset=2.0|baseVolume=0.65}
{SFX:Play|name=impact_metal|offset=2.35|baseVolume=0.60}
{Combat:Attack|attacker=V1_RED|defender=R4_ORANGE|anim=SpiritGunFire|start=39}
{SFX:Play|name=energy_blast|offset=3.0|baseVolume=0.65}
{SFX:Play|name=impact_metal|offset=3.35|baseVolume=0.60}
[V1_RED]{Voice:excited}{Camera:FightDynamic|distance=7|height=2.5} 别缠斗，冲过去！

6
00:00:44,000 --> 00:00:45,500
@ScrapyardSectorScene{Transition:Wipe|duration=0.6}
{SFX:Procedural|type=transform_mechanical|start=44|end=45.5|volume=0.45}
{SFX:Procedural|type=wind|start=44.5|end=94.5|intensity=0.4|volume=0.18}
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
{Music:Play|name=scrapyard_fight|fadeIn=0.5|baseVolume=0.65|endTime=94}

7
00:00:45,500 --> 00:00:54,000
[X0_BLACK]{Voice:calm}{Camera:LowAngle|distance=4|height=1} 钢铁先锋...欢迎来到我的垃圾场。你们不该停下来的。

8
00:00:54,000 --> 00:01:00,000
[V1_RED]{Voice:angry}{PointForward}{Camera:FightSide|distance=5|height=1.5} T2，左翼。A3，压制。别让它把我们分开。

9
00:01:00,500 --> 00:01:04,500
[T2_BLUE]{CrossArms}{Camera:FightImpact|distance=4|height=1.5} 早就等不及了！

10
00:01:04,500 --> 00:01:09,500
[R4_ORANGE]{Animation:FaceAngry|character=R4_ORANGE}{Camera:FightDramatic|distance=5|height=1.5} 来啊，看看谁能把谁拆成零件！

11
00:01:09,500 --> 00:01:16,500
[X0_BLACK]{Voice:calm}{StompFoot}{Camera:FightOverhead|distance=6|height=12} 有点意思...但这是我的地盘。规矩由我来定。

12
00:01:16,500 --> 00:01:20,500
[V1_RED]{LeftPunch}{Camera:FightFollow|distance=4|height=1.2} 那就按我们的规矩。碾过去。

13
00:01:20,500 --> 00:01:27,500
[A3_WHITE]{Camera:Static|position=0,5,8|lookAt=0,1,0} V1，信号在地下。快去，这里我们顶着。

14
00:01:27,500 --> 00:01:29,000
@PlasmaVaultScene{Transition:Iris|duration=0.8}
{SFX:Procedural|type=vault_hum|start=88.5|end=140|volume=0.12}
{Position:V1_RED|x=-1|y=0|z=2|face=center}
{Position:X0_BLACK|x=1|y=0|z=2|face=V1_RED}
{Camera:Static|position=0,2.5,8|lookAt=0,1.2,0}
{Music:Play|name=vault_tension|fadeIn=1.5|baseVolume=0.55|endTime=122}

15
00:01:29,000 --> 00:01:35,000
[X0_BLACK]{Voice:excited}{Camera:LowAngle|distance=4|height=1} 太慢了，V1。它在我手里了。

16
00:01:35,000 --> 00:01:42,000
[V1_RED]{Voice:worried}{HandsOnHips}{Camera:Static|position=-1,2.5,6|lookAt=0,1.2,0} X0...你曾是钢铁先锋。就为了一块发烫的金属？

17
00:01:42,000 --> 00:01:47,000
[X0_BLACK]{Voice:angry}{Animation:FaceSurprised|character=X0_BLACK}{Camera:ZoomIn|characterName=X0_BLACK|distance=3} 金属？哈...你什么都不知道。我失去的，你永远不会懂。

18
00:01:48,000 --> 00:01:55,000
[V1_RED]{Voice:worried}{PointForward}{Camera:Static|position=-1,2.5,6|lookAt=0,1.2,0} 那就告诉我。把东西放下，我们像以前一样谈。

19
00:01:55,000 --> 00:02:03,000
[X0_BLACK]{Voice:sad}{ShakeHead}{Camera:ZoomOut|distance=6|height=2} ...谈？我们之间早就没什么可谈了。后会无期，V1。

20
00:02:03,000 --> 00:02:11,000
[V1_RED]{Voice:worried}{Camera:OrbitCharacter|characterName=V1_RED|radius=3|height=1.5|duration=4|endAngle=3.14} X0走了...铁星七号安全。A3，T2，你们还好吗？
{Music:Play|name=victory_rise|fadeIn=0.5|baseVolume=0.7|endTime=139}

21
00:02:11,000 --> 00:02:14,000
{Transition:Fade|duration=1.5}
