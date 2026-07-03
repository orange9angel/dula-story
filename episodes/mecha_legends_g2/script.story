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
[V1_RED]{Camera:TrackingCloseUp|characterName=V1_RED|distance=4|height=1.2} 锈铁军团，停下。核心不是你们的。
{Music:Play|name=pulse_highway|fadeIn=1.0|baseVolume=0.6|endTime=44}

2
00:00:15,000 --> 00:00:22,000
[R4_ORANGE]{Camera:TrackingCloseUp|characterName=R4_ORANGE|distance=4|height=1.2} 核心？我们要的是整座城。先从你们身上碾过去。

3
00:00:22,000 --> 00:00:29,000
[A3_WHITE]{Camera:Static|position=0,4,10|lookAt=0,1,0} V1，前方两公里废铁区，有埋伏。数量还没确认。

4
00:00:29,000 --> 00:00:35,000
[T2_BLUE]{Camera:LowAngle|distance=5|height=0.8} 收到。速战速决。

5
00:00:35,000 --> 00:00:44,000
[A3_WHITE]{Camera:FightSide|distance=6|height=2} 敌机接近！十一点方向！
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
[V1_RED]{Camera:FightDynamic|distance=7|height=2.5} 别缠斗，突破先头，进废铁区。

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
[X0_BLACK]{Camera:LowAngle|distance=4|height=1} 钢铁先锋。勇气不能当装甲，你们走不到废铁区尽头。

8
00:00:54,000 --> 00:00:59,500
[V1_RED]{PointForward}{Camera:FightSide|distance=5|height=1.5} T2，左翼。A3，压制。

9
00:00:59,500 --> 00:01:03,500
[T2_BLUE]{CrossArms}{Camera:FightImpact|distance=4|height=1.5} 终于能活动活动了。

10
00:01:03,500 --> 00:01:08,500
[R4_ORANGE]{Animation:FaceAngry|character=R4_ORANGE}{Camera:FightDramatic|distance=5|height=1.5} 来啊，看谁的火花更烫。

11
00:01:08,500 --> 00:01:15,500
[X0_BLACK]{StompFoot}{Camera:FightOverhead|distance=6|height=12} 有点意思。但这是我的废铁场，规则由我定。

12
00:01:15,500 --> 00:01:19,500
[V1_RED]{LeftPunch}{Camera:FightFollow|distance=4|height=1.2} 那就按我们的方式。碾过去。

13
00:01:19,500 --> 00:01:26,500
[A3_WHITE]{Camera:Static|position=0,5,8|lookAt=0,1,0} V1，核心信号在地下金库。快去，这里我们挡着。

14
00:01:26,500 --> 00:01:28,000
@PlasmaVaultScene{Transition:Iris|duration=0.8}
{SFX:Procedural|type=vault_hum|start=88|end=140|volume=0.12}
{Position:V1_RED|x=-1|y=0|z=2|face=center}
{Position:X0_BLACK|x=1|y=0|z=2|face=V1_RED}
{Camera:Static|position=0,2.5,8|lookAt=0,1.2,0}
{Music:Play|name=vault_tension|fadeIn=1.5|baseVolume=0.55|endTime=127.5}

15
00:01:28,000 --> 00:01:34,000
[X0_BLACK]{Camera:LowAngle|distance=4|height=1} 太慢了，V1。核心归我了。

16
00:01:34,000 --> 00:01:41,000
[V1_RED]{HandsOnHips}{Camera:Static|position=-1,2.5,6|lookAt=0,1.2,0} X0，它只是金属。不值得你把自己搭进去。

17
00:01:41,000 --> 00:01:46,000
[X0_BLACK]{Animation:FaceSurprised|character=X0_BLACK}{Camera:ZoomIn|characterName=X0_BLACK|distance=3} 闭嘴！你根本不懂它值什么。

18
00:01:46,000 --> 00:01:53,000
[V1_RED]{PointForward}{Camera:Static|position=-1,2.5,6|lookAt=0,1.2,0} 放下。否则我会让你想起来，你曾站在我们这边。

19
00:01:53,000 --> 00:02:01,000
[X0_BLACK]{ShakeHead}{Camera:ZoomOut|distance=6|height=2} 这次你赢了。但锈铁军团还没完。

20
00:02:01,000 --> 00:02:09,000
[V1_RED]{Camera:OrbitCharacter|characterName=V1_RED|radius=3|height=1.5|duration=4|endAngle=3.14} 废铁区安静了。铁星七号安全。任务完成。
{Music:Play|name=victory_rise|fadeIn=0.5|baseVolume=0.7|endTime=139}

21
00:02:09,000 --> 00:02:12,000
{Transition:Fade|duration=1.5}
