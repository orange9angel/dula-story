0
00:00:00,000 --> 00:00:08,000
@SubwayHubScene{Transition:Fade|duration=0.8}
{SFX:Procedural|type=vault_hum|start=0|end=68|volume=0.16}
{SFX:Procedural|type=servo|start=0|end=68|volume=0.06}
{Event:MoodTransition|to=stealth|duration=1.0}
{Position:雷恩|x=-2.4|y=0|z=8.2|face=center}
{Position:布洛克|x=2.5|y=0|z=9.5|face=center}
{Position:斯凯|x=-0.6|y=0|z=10.4|face=center}
{Event:Move|character=雷恩|x=-2|z=3|duration=6.6|action=RobotSteadyWalk}
{Event:Move|character=布洛克|x=2|z=4|duration=7.5|action=RobotSteadyWalk}
{Event:Move|character=斯凯|x=0|z=6|duration=5.8|action=RobotSteadyWalk}
{Camera:Static|position=0,4.2,13|lookAt=0,1,-4}
Last Deposit S2: Silent Ledger

1
00:00:08,200 --> 00:00:14,400
[雷恩]{Voice:calm}{Camera:TrackingCloseUp|characterName=雷恩|distance=3|heightOffset=0.1} 灰狐单元，静默协议。外放归零。步频降到二十。
{Event:Animate|character=雷恩|action=FaceDetermined|duration=0.4}

2
00:00:15,000 --> 00:00:21,800
[斯凯]{Voice:worried}{Camera:Static|position=0,4.5,9|lookAt=0,1,0} 回声矩阵异常。热源无效。门禁读取声纹，不读取温度。
{Event:Animate|character=斯凯|action=LookAround|duration=2.0}

3
00:00:22,000 --> 00:00:29,700
[布洛克]{Voice:calm}{Camera:TrackingCloseUp|characterName=布洛克|distance=3|heightOffset=0.1} 顶部设备确认。不是炮塔，是双麦阵列。恐惧噪声正在采样。
{Event:Animate|character=布洛克|action=CrossArms|duration=2.0}
{Event:SetAlert|level=1}

4
00:00:30,000 --> 00:00:37,300
[雷恩]{Voice:calm}{Camera:FightWide|distance=9|height=3} 黄线行进。枪机闭锁。每台机体只输出一个低频心跳。
{Event:Animate|character=雷恩|action=PointForward|duration=1.2}

5
00:00:37,600 --> 00:00:43,200
[斯凯]{Voice:calm}{Camera:Static|position=-3,3.4,7|lookAt=0,1,-1} 地砖闪码：三短一长。S1 交货人留下冷钥。
{Event:Animate|character=斯凯|action=Crouch|duration=4.0}

6
00:00:43,500 --> 00:00:50,400
[布洛克]{Voice:calm}{Camera:TwoShot|left=布洛克|right=斯凯|distance=5|height=1.6} 我踩重拍。你们走弱拍。系统只能听见一台机器。
{Event:Animate|character=布洛克|action=Block|duration=0.8}
{Event:Animate|character=雷恩|action=Crouch|duration=4.0}
{Event:Animate|character=斯凯|action=Nod|duration=0.5}

7
00:00:50,700 --> 00:00:57,600
[雷恩]{Voice:calm}{Camera:TrackingCloseUp|characterName=雷恩|distance=3.2|heightOffset=0.1} 维克预判爆破。我们提交静默错误码。让门自己犯错。
{Event:Animate|character=雷恩|action=LookAround|duration=2.0}
{Event:Move|character=布洛克|x=1.3|z=2.5|duration=4.4|action=RobotSteadyWalk}
{Event:Move|character=斯凯|x=-0.8|z=3.2|duration=5.6|action=RobotSteadyWalk}

8
00:00:57,900 --> 00:01:04,700
[斯凯]{Voice:excited}{Camera:Static|position=0,5,8|lookAt=0,1,-4} 门禁接受。地下层不是反应堆，是声纹录音室。母带在里面。
{Event:Animate|character=斯凯|action=FaceSurprised|duration=0.3}
{Event:Animate|character=雷恩|action=FaceDetermined|duration=0.4}

9
00:01:05,000 --> 00:01:12,100
[雷恩]{Voice:calm}{Camera:FightFollow|distance=5|height=1.5} 目标更新：取母带。查证芯片交易。任何热源，忽略。
{Event:Animate|character=雷恩|action=PointForward|duration=1.0}
{Event:MoodTransition|to=alert|duration=0.8}
{Event:SetAlert|level=0}
{Transition:Fade|duration=0.6}

10
00:01:12,400 --> 00:01:19,200
@PlasmaVaultScene{Transition:Iris|duration=0.8}
{SFX:Procedural|type=energy_hum|start=72|end=94|volume=0.18}
{Position:维克|x=1.5|y=0|z=1|face=center}
{Position:达什|x=-1.5|y=0|z=1|face=center}
{Camera:Static|position=0,2.5,8|lookAt=0,1.2,0}
[维克]{Voice:calm}{Event:Animate|character=维克|action=FaceSmirk|duration=0.4} 灰狐没有开火。静默，正好进入我的采样窗口。

11
00:01:19,500 --> 00:01:25,100
[达什]{Voice:worried}{Camera:TrackingCloseUp|characterName=达什|distance=3|heightOffset=0.1} 确认？他们自己开门了。陷阱没有咬住。
{Event:Animate|character=达什|action=FaceConfused|duration=0.3}

12
00:01:25,400 --> 00:01:34,200
[维克]{Voice:calm}{Camera:LowAngle|distance=4|height=1}{Event:Animate|character=维克|action=ShakeHead|duration=1.0} 门不是给他们开的。是我的旧声纹。假钥会带他们进管道绞架。

13
00:01:34,500 --> 00:01:39,700
@UndergroundPipeScene{Transition:Wipe|duration=0.8}
{SFX:Procedural|type=wind|start=94|end=202|volume=0.10|intensity=0.35}
{SFX:Procedural|type=energy_hum|start=94|end=202|volume=0.16}
{Event:MoodTransition|to=despair|duration=1.0}
{Position:雷恩|x=-0.8|y=0|z=0.8|face=维克}
{Position:布洛克|x=0.9|y=0|z=0.9|face=达什}
{Position:斯凯|x=-1.8|y=0|z=1.2|face=炮塔-右}
{Position:维克|x=0.8|y=0|z=-1.2|face=雷恩}
{Position:达什|x=-0.9|y=0|z=-1.0|face=布洛克}
{Position:炮塔-左|x=2.6|y=4.2|z=-1.4|face=布洛克}
{Position:炮塔-右|x=-2.6|y=4.2|z=-1.4|face=斯凯}
{Event:Animate|character=炮塔-左|action=Idle|duration=88.0}
{Event:Animate|character=炮塔-右|action=Idle|duration=88.0}
{Camera:FightWide|distance=9|height=2.5}
[斯凯]{Voice:worried} 热量零。脚步回放三次。多出第六步。
{Event:Animate|character=斯凯|action=LookAround|duration=2.0}

14
00:01:40,000 --> 00:01:46,800
[布洛克]{Voice:calm}{Camera:TrackingCloseUp|characterName=布洛克|distance=3|heightOffset=0.1} 锁定：左顶炮塔，右顶炮塔。它们等第七步开火。
{Event:Animate|character=布洛克|action=FaceDetermined|duration=0.3}
{Event:SetAlert|level=2}

15
00:01:47,100 --> 00:01:54,100
[雷恩]{Voice:calm}{Camera:TwoShot|left=雷恩|right=斯凯|distance=5|height=1.6} 布洛克，水面干扰。斯凯，切门。我复制维克停顿。
{Event:Animate|character=雷恩|action=LookAround|duration=2.0}
{Event:Animate|character=布洛克|action=Block|duration=0.8}

16
00:01:54,400 --> 00:02:01,000
[维克]{Voice:angry}{Camera:LowAngle|distance=4|height=1}{Exaggeration:vein_forehead|intensity=0.7} 错误。那个停顿就是锁扣。说完下一帧，闸门合拢。
{Event:Animate|character=维克|action=FaceAngry|duration=0.3}
{Event:MoodTransition|to=combat|duration=0.6}

17
00:02:01,700 --> 00:02:09,500
[达什]{Voice:angry}{Camera:Static|position=0,2.6,5.8|lookAt=0,1.45,-0.55}{Exaggeration:impact_lines|intensity=0.55} 炮塔授权。第七步，开火。
{Position:雷恩|x=-1.1|y=0|z=1.15|face=炮塔-左}
{Position:布洛克|x=0.35|y=0|z=1.05|face=炮塔-左}
{Position:斯凯|x=-1.95|y=0|z=0.85|face=炮塔-右}
{Position:维克|x=1.35|y=0|z=-1.05|face=布洛克}
{Position:达什|x=-0.15|y=0|z=-1.25|face=雷恩}
{Position:炮塔-左|x=2.55|y=3.3|z=-1.35|face=布洛克}
{Position:炮塔-右|x=-2.55|y=3.3|z=-1.35|face=斯凯}
{Event:Animate|character=雷恩|action=FightingStance|duration=7.5}
{Event:Animate|character=布洛克|action=FightingStance|duration=7.5}
{Event:Animate|character=斯凯|action=FightingStance|duration=7.5}
{Event:ReadableShot|attacker=炮塔-左|defender=布洛克|offset=1.0|fire=3.7|reaction=Block|block=true|knockback=0.25|color=0xff3344|enemy=true|width=0.10|glowWidth=0.32|beamDuration=2.0|impactDuration=1.2|impactRadius=0.78}
{Event:ReadableShot|attacker=炮塔-右|defender=斯凯|offset=2.2|fire=3.7|reaction=HitStagger|knockback=0.35|color=0xff3344|enemy=true|width=0.10|glowWidth=0.32|beamDuration=2.0|impactDuration=1.2|impactRadius=0.78}
{SFX:Play|name=energy_blast|offset=1.0}
{SFX:Play|name=energy_blast|offset=4.7}
{SFX:Play|name=energy_blast|offset=5.9}

18
00:02:09,400 --> 00:02:17,400
[布洛克]{Voice:angry}{FXEnergyAura}{Camera:Static|position=2.6,2.1,4.2|lookAt=0.25,1.25,-0.35} 装甲承压百分之六十。反击许可。重锤上线。
{Position:布洛克|x=0.35|y=0|z=1.05|face=达什}
{Position:达什|x=-0.25|y=0|z=-1.05|face=布洛克}
{Position:雷恩|x=-1.5|y=0|z=0.8|face=炮塔-左}
{Position:炮塔-左|x=2.55|y=3.3|z=-1.35|face=雷恩}
{Event:Damage|character=布洛克|amount=28}
{Event:Animate|character=布洛克|action=Block|duration=0.7}
{Event:ReadableMelee|attacker=布洛克|defender=达什|offset=3.0|windup=1.2|hit=2.05|anim=Uppercut|reaction=HitStagger|knockback=0.65|color=0xffcc55|impactDuration=1.2|impactRadius=0.78|shockDuration=1.4|shockRadius=2.0}
{Event:ReadableShot|attacker=雷恩|defender=炮塔-左|offset=4.0|fire=2.1|reaction=HitStagger|knockback=0.0|color=0x55ccff|width=0.09|glowWidth=0.3|beamDuration=1.8|impactDuration=1.1|impactRadius=0.72}
{SFX:Play|name=punch_hit|offset=5.05}
{SFX:Play|name=energy_blast|offset=6.1}

19
00:02:17,600 --> 00:02:25,400
[斯凯]{Voice:excited}{Camera:Static|position=-3.0,2.2,4.0|lookAt=-1.1,1.35,-0.65} 静音门已开。右炮塔盲区，两秒。执行切除。
{Position:斯凯|x=-1.85|y=0|z=0.9|face=炮塔-右}
{Position:炮塔-右|x=-2.55|y=3.3|z=-1.35|face=斯凯}
{Position:雷恩|x=-0.4|y=0|z=0.8|face=炮塔-左}
{Position:炮塔-左|x=2.55|y=3.3|z=-1.35|face=雷恩}
{Event:Animate|character=斯凯|action=Dodge|duration=0.5}
{Event:ReadableMelee|attacker=斯凯|defender=炮塔-右|offset=3.2|windup=1.0|hit=2.0|anim=LeftPunch|reaction=Knockdown|knockback=0.0|color=0x66ffcc|impactDuration=1.2|impactRadius=0.82|shockDuration=1.4|shockRadius=2.0}
{Event:ReadableShot|attacker=雷恩|defender=炮塔-左|offset=4.1|fire=1.9|reaction=Knockdown|knockback=0.0|color=0x55ccff|width=0.10|glowWidth=0.32|beamDuration=1.8|impactDuration=1.1|impactRadius=0.86}
{SFX:Play|name=impact_thud|offset=5.2}
{SFX:Play|name=energy_blast|offset=6.0}

20
00:02:25,600 --> 00:02:33,400
[维克]{Voice:angry}{Camera:Static|position=0,2.0,4.6|lookAt=0,1.2,-0.45}{Exaggeration:anger_aura|intensity=0.75} 你们仍在我的管道里。达什，截断队长。
{Position:雷恩|x=-1.2|y=0|z=0.9|face=达什}
{Position:布洛克|x=0.95|y=0|z=0.75|face=维克}
{Position:维克|x=1.15|y=0|z=-1.05|face=布洛克}
{Position:达什|x=-1.15|y=0|z=-1.05|face=雷恩}
{Event:Animate|character=维克|action=PointForward|duration=1.0}
{Event:ReadableMelee|attacker=达什|defender=雷恩|offset=3.2|windup=1.0|hit=2.0|anim=LeftPunch|reaction=HitStagger|knockback=0.55|color=0xffcc55|impactDuration=1.2|impactRadius=0.68|shockDuration=1.4|shockRadius=1.9}
{Event:ReadableMelee|attacker=维克|defender=布洛克|offset=4.3|windup=1.0|hit=2.0|anim=Uppercut|reaction=Knockdown|knockback=0.65|color=0xff66ff|impactDuration=1.2|impactRadius=0.82|shockDuration=1.4|shockRadius=2.1}
{SFX:Play|name=punch_hit|offset=5.2}
{SFX:Play|name=punch_hit|offset=6.3}

21
00:02:33,600 --> 00:02:43,000
[雷恩]{Voice:angry}{FXEnergyAura}{Camera:Static|position=1.8,2.0,4.1|lookAt=0.05,1.25,-0.45}{Exaggeration:screen_shake|intensity=0.55} 损伤接收。过载协议。最后存款：维克声纹，退回原户。
{Position:雷恩|x=-1.1|y=0|z=0.75|face=维克}
{Position:维克|x=1.1|y=0|z=-0.95|face=雷恩}
{Position:布洛克|x=0.15|y=0|z=1.05|face=达什}
{Position:达什|x=-0.55|y=0|z=-0.75|face=布洛克}
{Event:Damage|character=雷恩|amount=35}
{Event:Overdrive|character=雷恩}
{Event:ReadableShot|attacker=雷恩|defender=维克|offset=4.8|fire=2.0|reaction=Knockdown|knockback=0.85|color=0x55ccff|width=0.14|glowWidth=0.42|beamDuration=2.0|impactDuration=1.3|impactRadius=1.05|flash=0.35}
{Event:ReadableMelee|attacker=布洛克|defender=达什|offset=5.7|windup=1.0|hit=1.7|anim=Uppercut|reaction=Knockdown|knockback=0.7|color=0xffcc55|impactDuration=1.2|impactRadius=0.85|shockDuration=1.4|shockRadius=2.2}
{SFX:Play|name=energy_blast|offset=4.8}
{SFX:Play|name=energy_blast|offset=6.8}
{SFX:Play|name=impact_thud|offset=7.4}

22
00:02:43,200 --> 00:02:50,200
[达什]{Voice:worried}{Camera:TrackingCloseUp|characterName=达什|distance=3|heightOffset=0.1} 警告！站台把维克判为入侵源。锁链反向。
{Event:Animate|character=达什|action=FaceSurprised|duration=0.3}
{Event:SetAlert|level=3}

23
00:02:50,500 --> 00:02:58,500
[维克]{Voice:angry}{Camera:LowAngle|distance=4|height=1} 切断母带。撤离。放出黑盒坐标。让买家先找到他们。
{Event:Animate|character=维克|action=DashForward|duration=0.5}
{Event:Animate|character=达什|action=DashForward|duration=0.5}
{Event:SetAlert|level=1}
{Event:MoodTransition|to=alert|duration=0.8}

24
00:02:58,800 --> 00:03:05,800
[斯凯]{Voice:worried}{Camera:Static|position=0,4.2,7|lookAt=0,1,-1} 母带只取回前半段。后半段正在远程上传。
{Event:Animate|character=斯凯|action=FaceWorried|duration=0.3}

25
00:03:06,100 --> 00:03:13,300
[布洛克]{Voice:calm}{Camera:TrackingCloseUp|characterName=布洛克|distance=3|heightOffset=0.1} 上传目标：海上货柜城。发送签名，不是维克。
{Event:Animate|character=布洛克|action=CrossArms|duration=1.0}

26
00:03:13,600 --> 00:03:22,000
[雷恩]{Voice:calm}{Camera:FightWide|distance=8|height=2.5} 下一集目标确认：货柜城。维克只是守门人，真正买家上线。
{Event:Animate|character=雷恩|action=PointForward|duration=1.2}
{Event:MoodTransition|to=triumph|duration=1.0}
{Transition:Fade|duration=1.5}
