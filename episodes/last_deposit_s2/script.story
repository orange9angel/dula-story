0
00:00:00,000 --> 00:00:08,000
@SubwayHubScene{Transition:Fade|duration=0.5}
{Position:雷恩|x=-1.2|y=0|z=4|face=forward}
{Position:布洛克|x=1.2|y=0|z=4.5|face=forward}
{Position:斯凯|x=0|y=0|z=2.5|face=forward}
{Position:炮塔-左|x=-2.5|y=4.2|z=-8|face=雷恩}
{Position:炮塔-右|x=2.5|y=4.2|z=-8|face=雷恩}
{Event:Animate|character=雷恩|action=Walk|duration=6.0}
{Event:Animate|character=布洛克|action=Walk|duration=6.0}
{Event:Animate|character=斯凯|action=Walk|duration=6.0}
{Camera:Static|position=0,2.5,10|lookAt=0,1,-2}
Last Deposit: Episode 2

1
00:00:08,200 --> 00:00:15,000
[雷恩]{Voice:calm} 旧地铁枢纽，没有无人机信号。保持目视，别靠扫描。
{Event:Animate|character=雷恩|action=LookAround|duration=2.0}
{Camera:TrackingCloseUp|characterName=雷恩|distance=3.2|heightOffset=0}

2
00:00:15,200 --> 00:00:22,000
[布洛克]{Voice:calm} 周边两公里一片黑。但天花板上有两个热源……不是灯。
{Event:Animate|character=布洛克|action=LookAround|duration=2.0}
{Camera:TrackingCloseUp|characterName=布洛克|distance=3.4|heightOffset=-0.1}
{Event:MoodTransition|to=alert|duration=1.0}

3
00:00:22,200 --> 00:00:28,000
[斯凯]{Voice:worried} 自动炮塔！散开！
{Event:Animate|character=斯凯|action=FaceSurprised|duration=0.3}
{Camera:TrackingCloseUp|characterName=斯凯|distance=3.0|heightOffset=-0.1}

4
00:00:28,200 --> 00:00:35,000
[雷恩]{Voice:angry} 先拆它们！布洛克左，斯凯右，我压正面！
{Event:Animate|character=雷恩|action=FaceAngry|duration=0.3}
{Event:MoodTransition|to=combat|duration=0.5}
{Event:SetAlert|level=2}
{SFX:Play|name=alarm_blast|offset=0.000}
{Position:雷恩|x=0|y=0|z=2|face=forward}
{Position:布洛克|x=-2.5|y=0|z=3|face=炮塔-左}
{Position:斯凯|x=2.5|y=0|z=3|face=炮塔-右}
{Camera:FightWide|distance=9|height=2.5}
{Exaggeration:shonen_anger|intensity=0.8}

5
00:00:35,200 --> 00:00:55,000
{Event:Animate|character=雷恩|action=HoldPlasmaRifle|duration=18.0}
{Event:Animate|character=布洛克|action=HoldPlasmaRifle|duration=18.0}
{Event:Animate|character=斯凯|action=HoldPlasmaRifle|duration=18.0}
{Event:Animate|character=炮塔-左|action=Idle|duration=18.0}
{Event:Animate|character=炮塔-右|action=Idle|duration=18.0}
{Combat:Action|name=spirit_gun|attacker=雷恩|defender=炮塔-左|offset=0.0|hitstop=0.03|shake=0.02|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=spirit_gun|attacker=布洛克|defender=炮塔-左|offset=2.0|hitstop=0.03|shake=0.02|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=spirit_gun|attacker=斯凯|defender=炮塔-右|offset=3.5|hitstop=0.03|shake=0.02|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=spirit_gun|attacker=雷恩|defender=炮塔-右|offset=5.5|hitstop=0.04|shake=0.025|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=spirit_gun|attacker=布洛克|defender=炮塔-右|offset=8.0|sfx=explosion|hitstop=0.05|shake=0.03|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=spirit_gun|attacker=斯凯|defender=炮塔-左|offset=10.5|sfx=explosion|hitstop=0.05|shake=0.03|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Camera:FightSide|distance=8|height=2.2}

6
00:00:55,200 --> 00:01:02,000
{Event:SetAlert|level=1}
{Event:MoodTransition|to=alert|duration=0.8}
[布洛克]{Voice:calm} 两架炮塔都下线了。但枢纽里太安静，这不正常。
{Event:Animate|character=布洛克|action=CrossArms|duration=2.0}
{Camera:TrackingCloseUp|characterName=布洛克|distance=3.2|heightOffset=0}

7
00:01:02,200 --> 00:01:08,000
[斯凯]{Voice:worried} 站台尽头有门禁，标识写着「反应堆区」。维克想让我们往那走。
{Event:Animate|character=斯凯|action=FaceWorried|duration=0.3}
{Camera:TrackingCloseUp|characterName=斯凯|distance=3.0|heightOffset=-0.1}

8
00:01:08,200 --> 00:01:14,000
[雷恩]{Voice:angry}{FXEnergyAura} 那就走。他既然摆好舞台，我们就把他的幕布一起烧掉。
{Event:Animate|character=雷恩|action=PointForward|duration=1.5}
{Camera:LowAngle|distance=4|height=1}
{Exaggeration:shonen_anger|intensity=0.9}
{Event:Overdrive|character=雷恩}

9
00:01:14,200 --> 00:01:18,000
@PlasmaVaultScene{Transition:Wipe|direction=down|duration=0.8}
{Event:MoodTransition|to=stealth|duration=1.0}
{Position:维克|x=1.2|y=0|z=1|face=center}
{Position:达什|x=-1.2|y=0|z=1|face=center}
{Camera:Static|position=0,2.5,8|lookAt=0,1.2,0}

10
00:01:18,200 --> 00:01:24,000
[维克]{Voice:calm} 灰狐到旧地铁了。两架自动炮塔没撑过十秒。
{Event:Animate|character=维克|action=FaceDetermined|duration=0.3}
{Camera:TrackingCloseUp|characterName=维克|distance=3|heightOffset=0}

11
00:01:24,200 --> 00:01:30,000
[达什]{Voice:excited}{FXChargeGlow} 让我出去！三拳就能把队长机拆成零件！
{Event:Animate|character=达什|action=FaceHappy|duration=0.3}
{Camera:FightDramatic|distance=5|height=1.5}

12
00:01:30,200 --> 00:01:38,000
[维克]{Voice:calm} 不必。反应堆区已经超载。把他们引进去，然后封门——灰狐和芯片一起埋在下面。
{Event:Animate|character=维克|action=ShakeHead|duration=1.0}
{Camera:ZoomOut|distance=6|height=2}

13
00:01:38,200 --> 00:01:44,000
@UndergroundPipeScene{Transition:Iris|duration=0.8}
{Event:MoodTransition|to=combat|duration=1.0}
{Event:SetAlert|level=2}
{SFX:Procedural|type=energy_hum|start=0|end=60|volume=0.12}
{Position:雷恩|x=-1.5|y=0|z=2|face=forward}
{Position:布洛克|x=1.5|y=0|z=2|face=forward}
{Position:斯凯|x=0|y=0|z=0|face=forward}
{Position:维克|x=0|y=0|z=-6|face=雷恩}
{Position:达什|x=2.5|y=0|z=-5|face=雷恩}
{Event:Animate|character=雷恩|action=FightingStance|duration=10.0}
{Event:Animate|character=布洛克|action=FightingStance|duration=10.0}
{Event:Animate|character=斯凯|action=FightingStance|duration=10.0}
{Event:Animate|character=维克|action=FightingStance|duration=10.0}
{Camera:FightWide|distance=10|height=3}

14
00:01:44,200 --> 00:01:50,000
[雷恩]{Voice:angry} 热源就在这里……不是反应堆，是维克本人。
{Event:Animate|character=雷恩|action=FaceAngry|duration=0.3}
{Camera:TrackingCloseUp|characterName=雷恩|distance=3|heightOffset=0}

15
00:01:50,200 --> 00:01:56,000
[维克]{Voice:calm} 聪明。但你选错了埋骨的隧道，雷恩。
{Event:Animate|character=维克|action=FaceDetermined|duration=0.3}
{Camera:TrackingCloseUp|characterName=维克|distance=3|heightOffset=0}

16
00:01:56,200 --> 00:02:18,000
{Event:Animate|character=雷恩|action=FightingStance|duration=20.0}
{Event:Animate|character=维克|action=FightingStance|duration=20.0}
{Combat:Action|name=pressure_combo|attacker=雷恩|defender=维克|offset=0.0|hitstop=0.05|shake=0.03|noAutoCamera=true|idleAction=FightingStance}
{Combat:Action|name=spirit_gun|attacker=维克|defender=雷恩|offset=2.5|hitstop=0.04|shake=0.025|noAutoCamera=true|idleAction=FightingStance}
{Combat:Action|name=heavy_combo|attacker=雷恩|defender=维克|offset=5.0|hitstop=0.06|shake=0.04|noAutoCamera=true|idleAction=FightingStance}
{Combat:Action|name=spirit_gun|attacker=维克|defender=雷恩|offset=9.0|hitstop=0.04|shake=0.03|noAutoCamera=true|idleAction=FightingStance}
{Combat:Action|name=overloadCharge|attacker=雷恩|defender=维克|offset=12.0|sfx=explosion|hitstop=0.07|shake=0.05|noAutoCamera=true|idleAction=FightingStance}
{Event:Damage|character=维克|amount=40}
{Camera:FightSide|distance=8|height=2.5}

17
00:02:18,200 --> 00:02:24,000
[达什]{Voice:worried} 维克！反应堆要失控了，再不走我们都得埋在这！
{Event:Animate|character=达什|action=FaceSurprised|duration=0.3}
{Camera:TrackingCloseUp|characterName=达什|distance=3|heightOffset=0}

18
00:02:24,200 --> 00:02:30,000
[维克]{Voice:angry} ……撤退。但雷恩，这只是延期处决。
{Event:Animate|character=维克|action=DashForward|duration=0.5}
{Event:Animate|character=达什|action=DashForward|duration=0.5}
{Camera:FightWide|distance=10|height=3}

19
00:02:30,200 --> 00:02:38,000
[雷恩]{Voice:angry}{FXEnergyAura}{Camera:FightWide|distance=8|height=2.5} 布洛克，破门！斯凯，掩护！我们走——在克洛斯引爆之前冲出去！
{Event:Animate|character=雷恩|action=DashForward|duration=0.5}
{Event:Animate|character=布洛克|action=DashForward|duration=0.5}
{Event:Animate|character=斯凯|action=DashForward|duration=0.5}
{SFX:Play|name=explosion|offset=0.000}
{FXShockwave}
{Exaggeration:screen_shake|intensity=0.7}
{Transition:Fade|duration=1.5}
