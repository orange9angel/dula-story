0
00:00:00,000 --> 00:00:08,000
@NeonHighwayScene{Transition:Fade|duration=0.5}
{Music:Play|name=theme_logo|fadeIn=0.1|baseVolume=0.7|endTime=8}
{SFX:Procedural|type=engine_idle|start=0|end=27.2|volume=0.30}
{SFX:Procedural|type=traffic|start=0|end=27.2|volume=0.15|density=0.25}
{Event:Animate|character=雷恩|action=RobotTransform|duration=0.1}
{Event:Animate|character=布洛克|action=RobotTransform|duration=0.1}
{Event:Animate|character=斯凯|action=RobotTransform|duration=0.1}
{Event:Animate|character=雷恩|action=VehicleDrive|duration=27.0|speed=2.2|bob=0.02|roll=0.012|wheelSpeed=10}
{Event:Animate|character=布洛克|action=VehicleDrive|duration=27.0|speed=2.0|bob=0.025|roll=0.015|wheelSpeed=8}
{Event:Animate|character=斯凯|action=VehicleDrive|duration=27.0|speed=2.4|bob=0.018|roll=0.01|wheelSpeed=12}
{Position:雷恩|x=-2|y=0|z=3|face=forward}
{Position:布洛克|x=2|y=0|z=4|face=forward}
{Position:斯凯|x=-1.5|y=0|z=-6|face=forward}
{Camera:Static|position=0,3.5,14|lookAt=0,0,-5}
Last Deposit

1
00:00:08,000 --> 00:00:15,000
[雷恩]{Voice:calm} 灰狐呼叫车队。距离交货点还有三公里，保持编队。
{Music:Play|name=pulse_highway|fadeIn=1.0|baseVolume=0.6|endTime=75.0}

2
00:00:15,200 --> 00:00:22,000
[斯凯]{Voice:worried}{Camera:Static|position=0,4,10|lookAt=0,1,0} 雷恩，上空有热源！三架无人机，正从高架侧面爬升——

3
00:00:22,200 --> 00:00:27,000
[布洛克]{Voice:calm} 克洛斯公司的欢迎仪式。队长，变吗？

4
00:00:27,200 --> 00:00:30,000
[雷恩]{Voice:angry}{Camera:FightWide|distance=10|height=3}{Exaggeration:anger_aura|intensity=0.9} 变！清场，然后继续赶路！
{SFX:Play|name=transform_mechanical|offset=0.000}
{Event:Animate|character=雷恩|action=RobotRevert|duration=1.0}
{Event:Animate|character=布洛克|action=RobotRevert|duration=1.0}
{Event:Animate|character=斯凯|action=RobotRevert|duration=1.0}
{Event:Animate|character=Viper-1|action=Idle|duration=0.1}
{Event:Animate|character=Viper-2|action=Idle|duration=0.1}
{Event:Animate|character=Viper-3|action=Idle|duration=0.1}
{Position:雷恩|x=-2.2|y=0|z=-1.5|face=Viper-1}
{Position:布洛克|x=0|y=0|z=-1.5|face=Viper-2}
{Position:斯凯|x=2.2|y=0|z=-1.5|face=Viper-3}
{Position:Viper-1|x=-2.2|y=3.5|z=-6.5|face=雷恩}
{Position:Viper-2|x=0|y=2.8|z=-6.5|face=布洛克}
{Position:Viper-3|x=2.2|y=4.2|z=-6.5|face=斯凯}

5
00:00:30,200 --> 00:00:36,000
{Event:Animate|character=雷恩|action=DashForward|duration=0.500}
{Event:Animate|character=布洛克|action=Block|duration=0.600}
{Event:Animate|character=斯凯|action=Dodge|duration=0.500}
{Event:Animate|character=雷恩|action=FightingStance|duration=5.0}
{Event:Animate|character=布洛克|action=FightingStance|duration=5.0}
{Event:Animate|character=斯凯|action=FightingStance|duration=5.0}
{Event:Animate|character=Viper-1|action=FightingStance|duration=5.0}
{Event:Animate|character=Viper-2|action=FightingStance|duration=5.0}
{Event:Animate|character=Viper-3|action=FightingStance|duration=5.0}
{Position:雷恩|face=camera}
[雷恩]{Voice:angry}{Animation:FaceDetermined|character=雷恩}{Camera:TrackingCloseUp|characterName=雷恩|distance=3|heightOffset=0.1}{Exaggeration:shonen_anger|intensity=0.8} 无人机不会废话。清场！

6
00:00:36,200 --> 00:00:55,000
{Exaggeration:impact_lines|intensity=0.6}
{Event:Animate|character=雷恩|action=HoldPlasmaRifle|duration=18.0}
{Event:Animate|character=布洛克|action=HoldPlasmaRifle|duration=18.0}
{Event:Animate|character=斯凯|action=HoldPlasmaRifle|duration=18.0}
{Event:Animate|character=Viper-1|action=Idle|duration=18.0}
{Event:Animate|character=Viper-2|action=Idle|duration=18.0}
{Event:Animate|character=Viper-3|action=Idle|duration=18.0}
{Combat:Action|name=dashShot|attacker=雷恩|defender=Viper-1|offset=0.0|hitstop=0.02|shake=0.015|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=dashShot|attacker=布洛克|defender=Viper-2|offset=0.8|hitstop=0.02|shake=0.015|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=dashShot|attacker=斯凯|defender=Viper-3|offset=1.6|hitstop=0.02|shake=0.015|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=dropBlow|attacker=雷恩|defender=Viper-1|offset=5.0|sfx=explosion|hitstop=0.03|shake=0.02|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=dropBlow|attacker=布洛克|defender=Viper-2|offset=5.5|sfx=explosion|hitstop=0.03|shake=0.02|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=dropBlow|attacker=斯凯|defender=Viper-3|offset=6.0|sfx=explosion|hitstop=0.03|shake=0.02|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=droneShot|attacker=Viper-1|defender=雷恩|offset=9.0|hitstop=0.02|shake=0.015|noAutoCamera=true|idleAction=Idle}
{Combat:Action|name=droneShot|attacker=Viper-2|defender=布洛克|offset=9.5|hitstop=0.02|shake=0.015|noAutoCamera=true|idleAction=Idle}
{Combat:Action|name=droneShot|attacker=Viper-3|defender=斯凯|offset=10.0|hitstop=0.02|shake=0.015|noAutoCamera=true|idleAction=Idle}
{Combat:Action|name=strafeFire|attacker=雷恩|defender=Viper-1|offset=10.4|hitstop=0.02|shake=0.015|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=strafeFire|attacker=布洛克|defender=Viper-2|offset=11.0|hitstop=0.02|shake=0.015|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=strafeFire|attacker=斯凯|defender=Viper-3|offset=11.6|hitstop=0.02|shake=0.015|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=coverFire|attacker=雷恩|defender=Viper-1|offset=12.8|sfx=plasma_rifle|hitstop=0.02|shake=0.015|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=coverFire|attacker=布洛克|defender=Viper-2|offset=13.4|sfx=plasma_rifle|hitstop=0.02|shake=0.015|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=coverFire|attacker=斯凯|defender=Viper-3|offset=14.0|sfx=plasma_rifle|hitstop=0.02|shake=0.015|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=dashShot|attacker=雷恩|defender=Viper-1|offset=15.2|hitstop=0.02|shake=0.015|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=dashShot|attacker=布洛克|defender=Viper-2|offset=15.8|hitstop=0.02|shake=0.015|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=dashShot|attacker=斯凯|defender=Viper-3|offset=16.4|hitstop=0.02|shake=0.015|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Camera:FightWide|distance=10|height=3.5}

7
00:00:55,200 --> 00:01:02,000
[雷恩]{Voice:angry}{FXEnergyAura}{Camera:FightWide|distance=8|height=2.5} 布洛克，封左！斯凯，打掉敌机！全队——冲过去！
{Event:Animate|character=雷恩|action=DashForward|duration=0.500}
{Event:Animate|character=布洛克|action=DashForward|duration=0.600}
{Event:Animate|character=斯凯|action=DashForward|duration=0.500}
{Event:Animate|character=雷恩|action=HoldPlasmaRifle|duration=6.0}
{Event:Animate|character=布洛克|action=HoldPlasmaRifle|duration=6.0}
{Event:Animate|character=斯凯|action=HoldPlasmaRifle|duration=6.0}
{Event:Animate|character=Viper-1|action=Idle|duration=6.0}
{Event:Animate|character=Viper-2|action=Idle|duration=6.0}
{Event:Animate|character=Viper-3|action=Idle|duration=6.0}

8
00:01:02,200 --> 00:01:08,000
{Exaggeration:screen_shake|intensity=0.7}
{Event:Animate|character=雷恩|action=HoldPlasmaRifle|duration=6.0}
{Event:Animate|character=布洛克|action=HoldPlasmaRifle|duration=6.0}
{Event:Animate|character=斯凯|action=HoldPlasmaRifle|duration=6.0}
{Event:Animate|character=Viper-1|action=Idle|duration=6.0}
{Event:Animate|character=Viper-2|action=Idle|duration=6.0}
{Event:Animate|character=Viper-3|action=Idle|duration=6.0}
{Combat:Action|name=jumpShot|attacker=雷恩|defender=Viper-1|offset=0.0|hitstop=0.03|shake=0.02|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=dashShot|attacker=布洛克|defender=Viper-2|offset=1.0|hitstop=0.03|shake=0.02|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=strafeFire|attacker=斯凯|defender=Viper-3|offset=2.0|hitstop=0.03|shake=0.02|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=dropBlow|attacker=雷恩|defender=Viper-1|offset=3.5|sfx=explosion|hitstop=0.03|shake=0.02|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=dropBlow|attacker=布洛克|defender=Viper-2|offset=4.0|sfx=explosion|hitstop=0.03|shake=0.02|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{Combat:Action|name=dropBlow|attacker=斯凯|defender=Viper-3|offset=4.5|sfx=explosion|hitstop=0.03|shake=0.02|noAutoCamera=true|idleAction=HoldPlasmaRifle}
{FXHitSpark}
{Camera:FightWide|distance=8|height=2.5}

9
00:01:08,200 --> 00:01:15,000
[斯凯]{Voice:excited}{Camera:Static|position=0,5,8|lookAt=0,1,0}{Exaggeration:chibi_deform|intensity=0.8} 敌机全灭！队长，道路清空。

10
00:01:15,200 --> 00:01:22,000
[雷恩]{Voice:calm}{Camera:FightFollow|distance=4|height=1.2} 很好。变形，继续赶路。克洛斯公司不会只派这一批。
{SFX:Play|name=transform_mechanical|offset=0.000}
{Event:Animate|character=雷恩|action=RobotTransform|duration=1.0}
{Event:Animate|character=布洛克|action=RobotTransform|duration=1.0}
{Event:Animate|character=斯凯|action=RobotTransform|duration=1.0}
{SFX:Procedural|type=engine_idle|start=76|end=82|volume=0.30}
{SFX:Procedural|type=traffic|start=76|end=82|volume=0.12|density=0.25}
{Event:Animate|character=雷恩|action=VehicleDrive|duration=6.8|speed=2.2|bob=0.02|roll=0.012|wheelSpeed=10}
{Event:Animate|character=布洛克|action=VehicleDrive|duration=6.8|speed=2.0|bob=0.025|roll=0.015|wheelSpeed=8}
{Event:Animate|character=斯凯|action=VehicleDrive|duration=6.8|speed=2.4|bob=0.018|roll=0.01|wheelSpeed=12}

11
00:01:22,200 --> 00:01:30,000
@PlasmaVaultScene{Transition:Iris|duration=0.8}
{SFX:Play|name=vault_hum|offset=1.000}
{Position:维克|x=1.5|y=0|z=1|face=center}
{Position:达什|x=-1.5|y=0|z=1|face=center}
{Camera:Static|position=0,2.5,8|lookAt=0,1.2,0}
{Music:Play|name=vault_tension|fadeIn=1.5|baseVolume=0.55|endTime=90.0}

12
00:01:30,200 --> 00:01:37,000
[维克]{Voice:angry}{Animation:FaceAngry|character=维克}{Camera:LowAngle|distance=4|height=1}{Exaggeration:vein_forehead|intensity=0.8} 三架 Viper，全毁。灰狐这次派来的人不简单。

13
00:01:37,200 --> 00:01:44,000
[达什]{Voice:excited}{FXChargeGlow}{Camera:FightDramatic|distance=5|height=1.5}{Exaggeration:eyebrow_fly|intensity=0.7} 要我去追吗？那点废铁我还没拆够。

14
00:01:44,200 --> 00:01:52,000
[维克]{Voice:calm}{ShakeHead}{Camera:ZoomOut|distance=6|height=2} 不。让他们先交货。等芯片到了买家手里——我们再抢现成的。通知买家，计划不变。

15
00:01:52,200 --> 00:02:00,000
@ScrapyardSectorScene{Transition:Wipe|duration=0.6}
{SFX:Play|name=wind|offset=0.500}
{SFX:Play|name=engine_idle|offset=1.000}
{SFX:Play|name=transform_mechanical|offset=2.000}
{Event:Animate|character=雷恩|action=RobotRevert|duration=1.0}
{Event:Animate|character=布洛克|action=RobotRevert|duration=1.0}
{Event:Animate|character=斯凯|action=RobotRevert|duration=1.0}
{Position:雷恩|x=-2|y=0|z=2|face=center}
{Position:布洛克|x=2|y=0|z=2|face=center}
{Position:斯凯|x=0|y=0|z=-2|face=center}
{Camera:FightWide|distance=8|height=2}
{Music:Play|name=scrapyard_fight|fadeIn=0.5|baseVolume=0.65|endTime=90.0}

16
00:02:00,200 --> 00:02:07,000
{Position:雷恩|face=camera}
[雷恩]{Voice:calm}{Camera:TrackingCloseUp|characterName=雷恩|distance=3|heightOffset=0.1} 临时据点。布洛克，扫描周边。斯凯，检查交货路线。

17
00:02:07,200 --> 00:02:13,000
{Position:布洛克|face=forward}
[布洛克]{Voice:calm}{CrossArms}{Camera:TrackingCloseUp|characterName=布洛克|distance=3|heightOffset=0.1|sideAngle=0} 周边两公里干净。但这地方撑不过一轮空袭。

18
00:02:13,200 --> 00:02:20,000
[斯凯]{Voice:worried}{Camera:Static|position=0,5,8|lookAt=0,1,0} 交货路线被克洛斯公司监控了。队长，我们硬闯吗？

19
00:02:20,200 --> 00:02:28,000
[雷恩]{Voice:angry}{FXEnergyAura}{PointForward}{Camera:FightSide|distance=5|height=1.5} 不硬闯。我们换路——走旧城区地下管道。克洛斯公司追不上来的地方，才是我们的路。

20
00:02:28,200 --> 00:02:35,000
{Transition:Fade|duration=1.5}
