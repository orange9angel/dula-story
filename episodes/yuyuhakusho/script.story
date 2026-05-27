1
00:00:00,000 --> 00:00:02,000
@SarayashikiRoofScene
{Position:Kuwabara|x=0|y=0.01|z=0|face=Yusuke}
{Position:Yusuke|x=-1.5|y=0.01|z=0|face=Kuwabara}
[Kuwabara]{FightingStance}{Camera:Static|position=0,1.5,3|lookAt=0,0.8,0}

2
00:00:02,000 --> 00:00:03,500
[Kuwabara]{SpinKick}{Camera:Static|position=0,1.5,3|lookAt=0,0.8,0}

3
00:00:03,500 --> 00:00:06,500
@SarayashikiRoofScene{Music:Play|name=roof_tension|fadeIn=2.0|baseVolume=0.15|endTime=150}
{Combat:Setup|charA=Yusuke|charB=Kuwabara|centerX=0|centerZ=0|distance=5}
{Position:Yusuke|x=-2.5|y=0.01|z=0|face=Kuwabara}
{Position:Kuwabara|x=2.5|y=0.01|z=0|face=Yusuke}
{Transition:Iris|duration=1.0}

2
00:00:03,500 --> 00:00:06,500
[Kuwabara]{FightingStance}{FaceDetermined}{Camera:Static|position=6,2.5,6|lookAt=2,1.2,0}

3
00:00:06,500 --> 00:00:09,500
[Yusuke]{FightingStance}{FaceSmirk}{Camera:Static|position=-6,2.5,6|lookAt=-2,1.2,0}

4
00:00:09,500 --> 00:00:12,000
[Kuwabara]{CounterStance}{FaceAngry}{Camera:TwoShot|characterA=Yusuke|characterB=Kuwabara|distance=10}
{SFX:Play|name=whoosh_fast|offset=0.25}

5
00:00:12,000 --> 00:00:13,100
[Kuwabara]{DashForward}{FXDustKick}{FXSpeedLines}{Camera:FightFollow}
{SFX:Play|name=dash_whoosh|offset=0.12}

6
00:00:13,100 --> 00:00:14,300
{Combat:Reaction|character=Yusuke|anim=WeaveStep}
[Kuwabara]{Punch}{FXSpeedLines}{Camera:FightFollow}
{SFX:Play|name=guard_hop|offset=0.04}
{SFX:Play|name=punch_light|offset=0.22}

7
00:00:14,300 --> 00:00:16,000
{Combat:Attack|attacker=Yusuke|defender=Kuwabara|anim=BackFist|hitFrame=0.22|sfx=punch_hit|reaction=HitStagger|hitstop=0.08|shake=0.22}
[Yusuke]{FXSpeedLines}{Camera:FightImpact}
{SFX:Play|name=punch_hit|offset=0.22|target=Kuwabara}

8
00:00:16,000 --> 00:00:18,400
{Combat:Attack|attacker=Yusuke|defender=Kuwabara|anim=ArcadeSpinKick|hitFrame=0.56|sfx=spin_kick_impact|reaction=Knockdown|hitstop=0.14|shake=0.42}
[Yusuke]{FXDustKick}{FXSpeedLines}{Camera:FightImpact}
{SFX:Play|name=spin_whoosh|offset=0.20}
{SFX:Play|name=spin_kick_impact|offset=0.56|target=Kuwabara}
{SFX:Play|name=body_drop|offset=0.94|target=Kuwabara}

9
00:00:18,400 --> 00:00:20,500
[Kuwabara]{GetUp}{Camera:ReactionShot|characterName=Kuwabara|distance=3}

10
00:00:20,500 --> 00:00:23,000
{Combat:Combo|attacker=Kuwabara|defender=Yusuke|sequence=pressure_combo}
[Kuwabara]{FXSpeedLines}{Camera:FightImpact}
{SFX:Play|name=punch_heavy|offset=0.25|target=Yusuke}
{SFX:Play|name=punch_heavy|offset=1.55|target=Yusuke}
{SFX:Play|name=body_drop|offset=1.85|target=Yusuke}

11
00:00:23,000 --> 00:00:25,000
[Yusuke]{CounterStance}{FXAfterImage}{Camera:FightFollow}
{SFX:Play|name=guard_hop|offset=0.05}

12
00:00:25,000 --> 00:00:28,000
[Kuwabara]{SpiritSwordDraw}{FaceAngry}{FXChargeGlow}{Camera:LowAngle|distance=5|height=1.2}
{SFX:Play|name=energy_charge|offset=0.05}

13
00:00:28,000 --> 00:00:31,000
{Combat:Combo|attacker=Kuwabara|defender=Yusuke|sequence=spirit_sword_combo}
[Kuwabara]{FaceAngry}{FXTrailSwipe}{FXDustKick}{Camera:FightImpact}
{SFX:Play|name=sword_slash|offset=0.32|target=Yusuke}
{SFX:Play|name=sword_slash|offset=1.42|target=Yusuke}

14
00:00:31,000 --> 00:00:33,500
[Yusuke]{WeaveStep}{FXAfterImage}{Camera:FightFollow}
{SFX:Play|name=dash_whoosh|offset=0.05}

15
00:00:33,500 --> 00:00:36,200
[Yusuke]{FightingStance}{FXEnergyAura}{Camera:Static|position=-4,2.4,5|lookAt=-1,1.1,0}

16
00:00:36,200 --> 00:00:39,150
{Combat:Attack|attacker=Yusuke|defender=Kuwabara|anim=AirTatsumaki|hitFrame=0.38|sfx=kick_impact|reaction=Knockdown|hitstop=0.14|shake=0.42}
[Yusuke]{FXDustKick}{FXSpeedLines}{Camera:FightImpact}
{SFX:Play|name=dash_whoosh|offset=0.15}
{SFX:Play|name=spin_whoosh|offset=0.32}
{SFX:Play|name=kick_impact|offset=0.38|target=Kuwabara}
{SFX:Play|name=body_drop|offset=0.85|target=Kuwabara}

17
00:00:39,000 --> 00:00:41,500
[Kuwabara]{GetUp}{FacePain}{Camera:ReactionShot|characterName=Kuwabara|distance=3}

18
00:00:41,500 --> 00:00:44,500
[Yusuke]{FightingStance}{FaceDetermined}{FXEnergyAura}{Camera:Static|position=-4,2.5,5|lookAt=-1,1.2,0}

19
00:00:44,500 --> 00:00:48,000
[Yusuke]{SpiritGunCharge}{FaceDetermined}{FXChargeGlow}{FXEnergyAura}{Camera:SpiritGunCloseUp}
{SFX:Play|name=energy_charge|offset=0.05}

20
00:00:48,000 --> 00:00:52,500
{Combat:BulletTime|start=0.2|duration=2.0|scale=0.12|easeIn=0.15|easeOut=0.25}
{Combat:Override|camera=FightBulletTimeTrack|duration=2.0|characterA=Yusuke|characterB=Kuwabara|radius=5|height=2.5}
{Combat:Attack|attacker=Yusuke|defender=Kuwabara|anim=SpiritGunFire|hitFrame=0.15|sfx=energy_blast|reaction=HitStagger|hitstop=0.1|shake=0.3|noAutoCamera=true}
{Transition:Flash|duration=0.2|flashColor=0x88ccff}
[Yusuke]{FaceAngry}{FXEnergyAura}
{SFX:Play|name=energy_blast|offset=0.15|target=Kuwabara}

21
00:00:52,500 --> 00:00:56,000
[Kuwabara]{HitStagger}{FacePain}{Camera:ReactionShot|characterName=Kuwabara|distance=3}

22
00:00:56,000 --> 00:00:59,000
{Event:Face|character=Yusuke|target=Kuwabara}
{Event:Face|character=Kuwabara|target=Yusuke}
[Yusuke]{FightingStance}{FaceSmirk}{Camera:Static|position=-4,2.5,5|lookAt=-1,1.2,0}

23
00:00:59,000 --> 00:01:02,000
{Event:Face|character=Yusuke|target=Kuwabara}
{Event:Face|character=Kuwabara|target=Yusuke}
[Kuwabara]{CounterStance}{FaceAngry}{Camera:Static|position=4,2.5,5|lookAt=2,1.2,0}

24
00:01:02,000 --> 00:01:05,000
{Event:SetWeather|type=fog}
{Event:Face|character=Yusuke|target=Kuwabara}
{Event:Face|character=Kuwabara|target=Yusuke}
[Yusuke]{FightingStance}{FaceSmirk}{Camera:Static|position=-4,2.5,5|lookAt=-1,1.2,0}

25
00:01:05,000 --> 00:01:08,000
{Event:Face|character=Yusuke|target=Kuwabara}
{Event:Face|character=Kuwabara|target=Yusuke}
[Kuwabara]{SpiritSwordDraw}{FaceDetermined}{Camera:TwoShot|characterA=Yusuke|characterB=Kuwabara|distance=10}

26
00:01:08,000 --> 00:01:09,200
{Event:Face|character=Yusuke|target=Kuwabara}
{Event:Face|character=Kuwabara|target=Yusuke}
[Kuwabara]{DashForward}{FXDustKick}{FXSpeedLines}{Camera:FightFollow}
{SFX:Play|name=dash_whoosh|offset=0.08}

27
00:01:09,200 --> 00:01:11,200
{Combat:Attack|attacker=Kuwabara|defender=Yusuke|anim=SpinKick|hitFrame=0.40|sfx=kick_impact|reaction=HitStagger|hitstop=0.10|shake=0.28}
[Kuwabara]{SpinKick}{FXSpeedLines}{Camera:FightImpact}
{SFX:Play|name=spin_whoosh|offset=0.15}
{SFX:Play|name=kick_impact|offset=0.40|target=Yusuke}

28
00:01:11,200 --> 00:01:14,000
{Event:Face|character=Yusuke|target=Kuwabara}
{Event:Face|character=Kuwabara|target=Yusuke}
[Yusuke]{HitStagger}{FacePain}{Camera:ReactionShot|characterName=Yusuke|distance=3}

29
00:01:14,000 --> 00:01:17,000
{Event:Face|character=Yusuke|target=Kuwabara}
{Event:Face|character=Kuwabara|target=Yusuke}
[Yusuke]{FightingStance}{FaceSmirk}{Camera:TwoShot|characterA=Yusuke|characterB=Kuwabara|distance=8}

30
00:01:17,000 --> 00:01:20,000
{Event:Face|character=Yusuke|target=Kuwabara}
{Event:Face|character=Kuwabara|target=Yusuke}
[Kuwabara]{FightingStance}{FaceHappy}{Camera:Static|position=4,2.5,6|lookAt=3,1.2,0}
