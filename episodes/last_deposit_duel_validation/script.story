0
00:00:00,000 --> 00:00:08,000
@DuelArenaScene{Transition:Fade|duration=0.8}
{Event:MoodTransition|to=stealth|duration=1.0}
{Event:SetAlert|level=1}
{Position:雷恩|x=-2.2|y=0|z=1.1|face=维克}
{Position:维克|x=2.2|y=0|z=-1.1|face=雷恩}
{Event:Animate|character=雷恩|action=FightingStance|duration=8.0}
{Event:Animate|character=维克|action=FightingStance|duration=8.0}
{Camera:Static|position=0,3.1,8.5|lookAt=0,1.35,0}
Last Deposit Duel Validation: Weapon Clash

1
00:00:08,300 --> 00:00:15,400
[雷恩]{Voice:calm}{Camera:TrackingCloseUp|characterName=雷恩|distance=3.0|heightOffset=0.05} 决斗规则确认。一对一，武器解锁，只测命中，不取核心。
{Event:Animate|character=雷恩|action=FaceDetermined|duration=0.4}

2
00:00:15,700 --> 00:00:22,600
[维克]{Voice:calm}{Camera:TrackingCloseUp|characterName=维克|distance=3.2|heightOffset=0.1} 记录清楚。你的步枪，对我的重炮。不要把故障说成礼让。
{Event:Animate|character=维克|action=FaceSmirk|duration=0.4}

3
00:00:23,900 --> 00:00:31,200
[雷恩]{Voice:calm}{Camera:FightWide|distance=8.2|height=2.4} 第一轮，慢速锁定。我要看瞄准姿态和枪口光是否对齐。
{Event:MoodTransition|to=alert|duration=0.8}
{Event:Animate|character=雷恩|action=FightingStance|duration=8.0}
{Event:Animate|character=维克|action=FightingStance|duration=8.0}
{Event:ReadableShot|attacker=雷恩|defender=维克|offset=2.0|fire=3.0|reaction=Block|block=true|knockback=0.18|color=0x55ccff|width=0.08|glowWidth=0.28|beamDuration=1.2|impactDuration=0.9|impactRadius=0.72|flash=0.18}
{SFX:Play|name=plasma_fire|offset=5.0|baseVolume=0.9}
{SFX:Play|name=shield_hit|offset=5.1|baseVolume=0.78}

4
00:00:31,500 --> 00:00:39,600
[维克]{Voice:angry}{Camera:Static|position=2.9,2.1,4.2|lookAt=0.65,1.25,-0.25}{Exaggeration:anger_aura|intensity=0.45} 命中有效。现在换我，用重炮压住你的中线。
{Event:ReadableShot|attacker=维克|defender=雷恩|offset=1.6|fire=2.8|reaction=Block|block=true|knockback=0.25|color=0xff3344|enemy=true|width=0.10|glowWidth=0.34|beamDuration=1.4|impactDuration=0.95|impactRadius=0.8|flash=0.2}
{SFX:Play|name=plasma_fire_alt|offset=4.4|baseVolume=0.92}
{SFX:Play|name=shield_hit|offset=4.5|baseVolume=0.82}

5
00:00:39,900 --> 00:00:48,000
[雷恩]{Voice:calm}{Camera:FightFollow|distance=5.2|height=1.6} 镜头切近。横移两步，检查腿部、手臂和武器同步。
{Event:Move|character=雷恩|x=-1.3|z=0.7|duration=2.0|action=RobotSteadyWalk}
{Event:Move|character=维克|x=1.35|z=-0.7|duration=2.2|action=RobotSteadyWalk}
{Event:Animate|character=雷恩|action=LookAround|duration=1.2}
{Event:Animate|character=维克|action=PointForward|duration=1.0}

6
00:00:48,300 --> 00:00:57,500
[维克]{Voice:calm}{Camera:FightWide|distance=7.5|height=2.3} 第二轮同时开火。让两束光在中线交叉。
{Event:MoodTransition|to=combat|duration=0.6}
{Event:ReadableShot|attacker=雷恩|defender=维克|offset=1.2|fire=2.6|reaction=HitStagger|knockback=0.22|color=0x55ccff|width=0.09|glowWidth=0.32|beamDuration=1.6|impactDuration=1.0|impactRadius=0.82|flash=0.16}
{Event:ReadableShot|attacker=维克|defender=雷恩|offset=1.3|fire=2.6|reaction=HitStagger|knockback=0.22|color=0xff3344|enemy=true|width=0.11|glowWidth=0.36|beamDuration=1.6|impactDuration=1.0|impactRadius=0.86|flash=0.22}
{SFX:Play|name=plasma_fire|offset=3.8|baseVolume=0.88}
{SFX:Play|name=plasma_fire_alt|offset=3.9|baseVolume=0.84}
{SFX:Play|name=metal_hit|offset=4.02|baseVolume=0.78}
{SFX:Play|name=metal_hit|offset=4.12|baseVolume=0.74}

7
00:00:57,800 --> 00:01:06,300
[雷恩]{Voice:angry}{Camera:Static|position=-2.8,2.1,4.1|lookAt=-0.45,1.3,-0.25}{Exaggeration:screen_shake|intensity=0.25} 受击姿态记录。护盾没有断，表情还要能看见。
{Event:Damage|character=雷恩|amount=18}
{Event:Damage|character=维克|amount=16}
{Event:Animate|character=雷恩|action=HitStagger|duration=0.8}
{Event:Animate|character=维克|action=HitStagger|duration=0.8}

8
00:01:06,600 --> 00:01:15,300
[维克]{Voice:angry}{Camera:FightFollow|distance=5.4|height=1.7} 加速。短距离突进，武器不收回，开火节奏提前半拍。
{Event:Move|character=维克|x=0.9|z=-0.35|duration=1.3|action=DashForward}
{Event:Move|character=雷恩|x=-0.9|z=0.35|duration=1.2|action=Dodge}
{Event:ReadableShot|attacker=维克|defender=雷恩|offset=2.0|fire=1.7|reaction=Dodge|knockback=0.15|color=0xff3344|enemy=true|width=0.08|glowWidth=0.28|beamDuration=0.9|impactDuration=0.55|impactRadius=0.58|flash=0.12}
{SFX:Play|name=plasma_fire_short|offset=3.7|baseVolume=0.82}

9
00:01:15,600 --> 00:01:24,800
[雷恩]{Voice:calm}{Camera:LowAngle|distance=4.0|height=1.0} 反击。先让枪口蓄光，再把冲击落到肩炮外壳。
{Event:ReadableShot|attacker=雷恩|defender=维克|offset=1.2|fire=2.2|reaction=HitStagger|knockback=0.30|color=0x55ccff|width=0.10|glowWidth=0.35|beamDuration=1.5|impactDuration=0.9|impactRadius=0.9|flash=0.2}
{SFX:Play|name=plasma_fire|offset=3.4|baseVolume=0.94}
{SFX:Play|name=metal_hit_hard|offset=3.55|baseVolume=0.72}

10
00:01:25,100 --> 00:01:33,700
[维克]{Voice:calm}{Camera:TrackingCloseUp|characterName=维克|distance=3.1|heightOffset=0.1} 炮架偏移两度。可接受。进入近身干扰测试。
{Event:ReadableMelee|attacker=维克|defender=雷恩|offset=2.4|windup=0.9|hit=1.55|anim=Uppercut|reaction=HitStagger|knockback=0.45|color=0xff66ff|impactDuration=0.75|impactRadius=0.68|shockDuration=0.9|shockRadius=1.7}
{SFX:Play|name=melee_metal_hit|offset=3.95|baseVolume=0.86}

11
00:01:34,000 --> 00:01:42,800
[雷恩]{Voice:angry}{Camera:Static|position=0,2.25,4.4|lookAt=0,1.25,0}{Exaggeration:impact_lines|intensity=0.45} 近身有效。现在测试格挡后反射，动作必须连得上。
{Event:ReadableShot|attacker=维克|defender=雷恩|offset=0.9|fire=2.0|reaction=Block|block=true|knockback=0.15|color=0xff3344|enemy=true|width=0.09|glowWidth=0.32|beamDuration=1.1|impactDuration=0.8|impactRadius=0.7|flash=0.15}
{Event:ReadableShot|attacker=雷恩|defender=维克|offset=3.4|fire=1.7|reaction=HitStagger|knockback=0.32|color=0x66ffcc|width=0.11|glowWidth=0.36|beamDuration=1.2|impactDuration=0.9|impactRadius=0.88|flash=0.25}
{SFX:Play|name=plasma_fire_alt|offset=2.9|baseVolume=0.9}
{SFX:Play|name=shield_hit|offset=3.0|baseVolume=0.82}
{SFX:Play|name=plasma_fire|offset=5.1|baseVolume=0.94}
{SFX:Play|name=metal_hit|offset=5.24|baseVolume=0.78}

12
00:01:43,100 --> 00:01:52,300
[维克]{Voice:angry}{Camera:FightWide|distance=8.0|height=2.5} 重炮进入过载。灯光、屏闪、爆点全部拉满。
{Event:Overdrive|character=维克}
{Event:MoodTransition|to=despair|duration=0.7}
{Event:ReadableShot|attacker=维克|defender=雷恩|offset=2.0|fire=3.2|reaction=Knockdown|knockback=0.65|color=0xff0033|enemy=true|width=0.15|glowWidth=0.48|beamDuration=2.2|impactDuration=1.3|impactRadius=1.05|flash=0.38}
{SFX:Play|name=plasma_fire_alt|offset=5.2|baseVolume=1.0}
{SFX:Play|name=metal_hit_hard|offset=5.35|baseVolume=0.86}
{SFX:Play|name=body_drop_metal|offset=5.8|baseVolume=0.72}

13
00:01:52,600 --> 00:02:02,200
[雷恩]{Voice:angry}{FXEnergyAura}{Camera:TrackingCloseUp|characterName=雷恩|distance=3.0|heightOffset=0.08} 读取完成。我的过载轮到你接。三连发，间隔必须清楚。
{Event:Damage|character=雷恩|amount=30}
{Event:Overdrive|character=雷恩}
{Event:MoodTransition|to=combat|duration=0.5}
{Event:ReadableShot|attacker=雷恩|defender=维克|offset=2.1|fire=1.4|reaction=HitStagger|knockback=0.22|color=0x55ccff|width=0.09|glowWidth=0.31|beamDuration=0.9|impactDuration=0.65|impactRadius=0.72|flash=0.18}
{Event:ReadableShot|attacker=雷恩|defender=维克|offset=4.2|fire=1.2|reaction=HitStagger|knockback=0.22|color=0x55ccff|width=0.10|glowWidth=0.34|beamDuration=0.9|impactDuration=0.7|impactRadius=0.78|flash=0.20}
{Event:ReadableShot|attacker=雷恩|defender=维克|offset=6.1|fire=1.1|reaction=Knockdown|knockback=0.55|color=0x55ccff|width=0.13|glowWidth=0.42|beamDuration=1.2|impactDuration=1.0|impactRadius=1.0|flash=0.32}
{SFX:Play|name=plasma_fire_short|offset=3.5|baseVolume=0.78}
{SFX:Play|name=metal_hit|offset=3.62|baseVolume=0.68}
{SFX:Play|name=plasma_fire_short|offset=5.4|baseVolume=0.82}
{SFX:Play|name=metal_hit|offset=5.52|baseVolume=0.7}
{SFX:Play|name=plasma_fire|offset=7.2|baseVolume=0.94}
{SFX:Play|name=metal_hit_hard|offset=7.36|baseVolume=0.84}

14
00:02:02,500 --> 00:02:11,300
[维克]{Voice:worried}{Camera:Static|position=2.4,2.05,4.0|lookAt=0.65,1.25,-0.4} 装甲记录三次受击。表情、眼灯、肩炮仍在线。
{Event:Damage|character=维克|amount=32}
{Event:Animate|character=维克|action=GetUp|duration=1.4}

15
00:02:11,600 --> 00:02:20,800
[雷恩]{Voice:calm}{Camera:FightFollow|distance=5.6|height=1.8} 终局前换位。镜头绕中线，确认连贯性没有跳帧。
{Event:Move|character=雷恩|x=1.15|z=0.55|duration=2.4|action=RobotSteadyWalk}
{Event:Move|character=维克|x=-1.15|z=-0.55|duration=2.6|action=RobotSteadyWalk}
{Event:Animate|character=雷恩|action=FightingStance|duration=8.0}
{Event:Animate|character=维克|action=FightingStance|duration=8.0}

16
00:02:21,100 --> 00:02:31,400
[维克]{Voice:angry}{Camera:FightWide|distance=8.5|height=2.6}{Exaggeration:screen_shake|intensity=0.35} 最后一轮。双方武器全功率，谁先断线谁输。
{Event:ReadableShot|attacker=雷恩|defender=维克|offset=2.0|fire=3.0|reaction=Block|block=true|knockback=0.35|color=0x55ccff|width=0.14|glowWidth=0.46|beamDuration=2.4|impactDuration=1.3|impactRadius=1.1|flash=0.32}
{Event:ReadableShot|attacker=维克|defender=雷恩|offset=2.0|fire=3.0|reaction=Block|block=true|knockback=0.35|color=0xff0033|enemy=true|width=0.15|glowWidth=0.5|beamDuration=2.4|impactDuration=1.3|impactRadius=1.12|flash=0.38}
{SFX:Play|name=plasma_fire|offset=5.0|baseVolume=0.94}
{SFX:Play|name=plasma_fire_alt|offset=5.08|baseVolume=0.94}
{SFX:Play|name=shield_hit|offset=5.15|baseVolume=0.86}
{SFX:Play|name=shield_hit|offset=5.25|baseVolume=0.8}

17
00:02:31,700 --> 00:02:40,800
[雷恩]{Voice:angry}{Camera:Static|position=0,2.4,5.2|lookAt=0,1.35,0} 双方护盾都在。最后一击改为偏轴，测试落点和击退。
{Event:ReadableShot|attacker=雷恩|defender=维克|offset=1.3|fire=1.6|reaction=HitStagger|knockback=0.55|color=0x66ffcc|width=0.11|glowWidth=0.38|beamDuration=1.1|impactDuration=0.95|impactRadius=0.9|flash=0.22}
{Event:ReadableShot|attacker=维克|defender=雷恩|offset=2.4|fire=1.6|reaction=HitStagger|knockback=0.55|color=0xff3344|enemy=true|width=0.11|glowWidth=0.38|beamDuration=1.1|impactDuration=0.95|impactRadius=0.9|flash=0.22}
{SFX:Play|name=plasma_fire|offset=2.9|baseVolume=0.9}
{SFX:Play|name=metal_hit|offset=3.05|baseVolume=0.76}
{SFX:Play|name=plasma_fire_alt|offset=4.0|baseVolume=0.9}
{SFX:Play|name=metal_hit|offset=4.15|baseVolume=0.76}

18
00:02:41,100 --> 00:02:50,000
[维克]{Voice:calm}{Camera:TrackingCloseUp|characterName=维克|distance=3.1|heightOffset=0.1} 够了。肩炮散热正常。你的步枪也没有丢帧。
{Event:Animate|character=维克|action=CrossArms|duration=1.4}
{Event:SetAlert|level=1}

19
00:02:50,300 --> 00:03:00,000
[雷恩]{Voice:calm}{Camera:FightWide|distance=8.0|height=2.4} 记录结果：动作、表情、光效、音效和镜头全部通过下一轮主片合成测试。
{Event:Animate|character=雷恩|action=PointForward|duration=1.2}
{Event:MoodTransition|to=triumph|duration=1.0}
{Event:SetAlert|level=0}
{Transition:Fade|duration=1.5}
