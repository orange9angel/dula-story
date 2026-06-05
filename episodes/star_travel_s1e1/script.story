1
00:00:00,000 --> 00:00:05,807
@SpaceStationScene
{Music:Play|name=space_explore|fadeIn=2.0|baseVolume=0.35|endTime=30.0}
{SceneDirector:Formation|type=triangle|center=0,0,0|radius=1.5|focus=Zorak}
{SceneDirector:Gaze|mode=auto}
{Zorak}{FaceDetermined}
{Zorak}{FaceBlink}
{Zorak}{Nod}
[Zorak] 信号确认。坐标X-7749，未知星系边缘。
{Camera:Static|position=0,1.8,5|lookAt=0,1.0,0}

2
00:00:06,307 --> 00:00:09,091
[Klaw] 扫描显示...有生命反应。
{Klaw}{FaceSurprised}
{Klaw}{FaceBlink}
{Klaw}{LookAround}
{Camera:TwoShot|position=0,1.6,4|lookAt=0,1.0,0}

3
00:00:09,591 --> 00:00:13,335
[Vex] 能量读数很奇怪。不像任何已知文明。
{Vex}{FaceConfused}
{Vex}{FaceBlink}
{Vex}{Shrug}
{Camera:Static|position=2,1.5,3|lookAt=0,1.0,0}

4
00:00:13,835 --> 00:00:18,227
[Zorak] 准备登陆。我们是探险队，不是征服者。
{Zorak}{PointForward}
{Zorak}{FaceDetermined}
{Camera:CloseUp|target=Zorak|distance=2.5|height=1.6}

5
00:00:18,727 --> 00:00:21,439
[Klaw] 如果那些家伙不友好呢？
{Klaw}{CrossArms}
{Klaw}{FaceConfused}
{Klaw}{FaceBlink}
{Camera:ReactionShot|target=Klaw|distance=3|height=1.5}

6
00:00:21,939 --> 00:00:25,635
[Vex] 那我们就跑。我的翅膀可不是摆设。
{Vex}{Shrug}
{Vex}{FaceSmirk}
{Vex}{FaceBlink}
{Camera:Static|position=-2,1.5,3|lookAt=0,1.0,0}

7
00:00:26,135 --> 00:00:29,835
{Zorak}{Walk}
{Klaw}{Walk}
{Vex}{Walk}
{Event:Move|character=Zorak|x=-8|z=0|duration=3.0}
{Event:Move|character=Klaw|x=8|z=0|duration=3.0}
{Event:Move|character=Vex|x=0|z=-5|duration=3.0}
{Transition:Fade|duration=1.0}
{Camera:Pan|from=-5,2,8|to=5,2,8|duration=3.0}

8
00:00:29,835 --> 00:00:32,835
@AlienPlanetScene
{Music:Play|name=alien_mystery|fadeIn=1.5|baseVolume=0.3|endTime=15.0}
{SceneDirector:Formation|type=semicircle|center=0,0,0|radius=2|focus=Zorak}
{SceneDirector:Gaze|mode=auto}
{Event:Hide|character=Rex}
{Zorak} 空气可呼吸。重力0.92标准值。
{Zorak}{FaceBlink}
{Camera:Static|position=0,1.8,6|lookAt=0,1.0,0}

9
00:00:32,835 --> 00:00:35,307
[Klaw] 这些植物...在发光？
{Klaw}{LookAround}
{Klaw}{FaceSurprised}
{Klaw}{FaceBlink}
{Camera:LowAngle|target=Klaw|distance=4|height=0.5}

10
00:00:35,807 --> 00:00:39,960
[Vex] 生物荧光。和我家乡的森林类似。
{Vex}{HandsOnHips}
{Vex}{FaceHappy}
{Vex}{FaceBlink}
{Camera:Static|position=-3,1.5,4|lookAt=0,1.0,0}

11
00:00:40,460 --> 00:00:42,764
[Zorak] 等等。有动静。
{Zorak}{FightingStance}
{Zorak}{FaceDetermined}
{Zorak}{FaceBlink}
{Camera:FightDramatic|target=Zorak|distance=4|height=1.2}

12
00:00:43,264 --> 00:00:46,264
{Music:Play|name=alien_calm_loop|fadeIn=2.0|baseVolume=0.25|endTime=50.0}
{Event:Move|character=Zorak|x=-1|z=0|duration=0.8}
{Zorak}{Run}
{Event:Move|character=Klaw|x=1|z=0|duration=0.8}
{Klaw}{Run}
{Event:Move|character=Vex|x=0|z=-1|duration=0.8}
{Vex}{Run}
{Zorak}{FightingStance}
{Zorak}{FaceDetermined}
{Klaw}{LookAround}
{Klaw}{FaceSurprised}
{Vex}{HandsOnHips}
{Vex}{FaceConfused}
{SFX:Play|name=dash_whoosh}
{Camera:FightWide|distance=6|height=2}

13
00:00:46,264 --> 00:00:49,912
[Zorak] 从岩石后面出来！我们知道你在那儿！
{SceneDirector:Formation|type=line|center=0,0,-1|radius=1.5|spacing=1.5|face=back}
{Event:Hide|character=Rex}
{Zorak}{PointForward}
{Zorak}{FaceAngry}
{Zorak}{FaceBlink}
{Camera:Static|position=0,1.6,5|lookAt=0,1.0,-1.6}

14
00:00:50,412 --> 00:00:52,380
[Rex] ...你们是谁？
{Event:Show|character=Rex}
{Event:Move|character=Rex|x=0.5|z=-4|duration=0.4}
{Rex}{CrossArms}
{Rex}{FaceSmirk}
{Rex}{FaceBlink}
{Camera:FightDramaticReveal|character=Rex|side=right|startDistance=6|endDistance=2.5|startHeight=0.4|endHeight=1.2}

15
00:00:52,880 --> 00:00:56,576
[Klaw] 是晶体生物！这里居然有晶体生物！
{SceneDirector:Formation|type=semicircle|center=0,0,-1|radius=2|focus=Rex}
{SceneDirector:Gaze|mode=fixed|target=Rex}
{Klaw}{SurprisedJump}
{Klaw}{FaceSurprised}
{Klaw}{FaceBlink}
{Camera:ReactionShot|target=Klaw|distance=3|height=1.5}

16
00:00:57,076 --> 00:01:02,164
[Rex] 我叫Rex。你们这些外星人，来我的星球干嘛？
{SceneDirector:Gaze|mode=auto}
{Rex}{HandsOnHips}
{Rex}{FaceDetermined}
{Rex}{FaceBlink}
{Camera:Static|position=3,1.6,4|lookAt=0,1.0,0}

17
00:01:02,664 --> 00:01:08,400
[Zorak] 我们是星际探险队。我叫泽拉克，这是克劳和维克斯。
{SceneDirector:Formation|type=semicircle|center=0,0,-1|radius=2|focus=Rex}
{Zorak}{Bow}
{Zorak}{FaceHappy}
{Zorak}{FaceBlink}
{Camera:TwoShot|position=0,1.6,4|lookAt=0,1.0,0}

18
00:01:08,900 --> 00:01:12,884
[Vex] 我们没有敌意。只是在探索未知星系。
{Vex}{WaveHand}
{Vex}{FaceHappy}
{Vex}{FaceBlink}
{Camera:Static|position=-2,1.5,4|lookAt=0,1.0,0}

19
00:01:13,384 --> 00:01:20,632
[Rex] 探索？哼。你们最好小心点。这颗星球可不止有植物。
{Rex}{FaceSmirk}
{Rex}{FaceBlink}
{Rex}{CrossArms}
{Camera:CloseUp|target=Rex|distance=2.5|height=1.5}

20
00:01:21,132 --> 00:01:24,060
[Klaw] 什么意思？有什么危险的？
{Klaw}{ScratchHead}
{Klaw}{FaceConfused}
{Klaw}{FaceBlink}
{Camera:Static|position=2,1.5,4|lookAt=0,1.0,0}

21
00:01:24,560 --> 00:01:29,311
[Rex] 意思是...最危险的，是看起来最普通的。
{Rex}{PointForward}
{Rex}{FaceDetermined}
{Rex}{FaceBlink}
{Camera:FightDramatic|target=Rex|distance=4|height=1.2}

22
00:01:29,811 --> 00:01:31,756
{Music:Play|name=battle_intense|fadeIn=1.0|baseVolume=0.35|endTime=50.0}
{Zorak}{FightingStance}
{Klaw}{FightingStance}
{Vex}{FightingStance}
[Zorak] 你在威胁我们？
{Zorak}{FaceAngry}
{Zorak}{FaceBlink}
{Camera:FightWide|distance=7|height=2}

23
00:01:32,256 --> 00:01:34,992
[Rex] 不。我在警告你们。
{Rex}{FightingStance}
{Rex}{FaceDetermined}
{Rex}{FaceBlink}
{SFX:Play|name=energy_charge}
{FXPlasmaBolt|character=Rex}
{FXCrystalShards|character=Rex}
{Camera:FightDramatic|target=Rex|distance=3|height=1.0}

24
00:01:35,492 --> 00:01:37,748
[Vex] 他的能量读数...在飙升！
{Vex}{FaceSurprised}
{Vex}{FaceBlink}
{Vex}{Shrug}
{FXBioluminescentPulse|character=Vex}
{Camera:ReactionShot|target=Vex|distance=2.5|height=1.4}

25
00:01:38,248 --> 00:01:41,296
[Zorak] 等等！我们没有要战斗的意思！
{Zorak}{FaceDetermined}
{Zorak}{FaceBlink}
{Zorak}{HandsUp}
{Camera:Static|position=0,1.6,5|lookAt=0,1.0,0}

26
00:01:41,796 --> 00:01:44,028
[Rex] ...那就证明给我看。
{Combat:Setup|charA=Rex|charB=Zorak|centerX=0|centerZ=-1|distance=3}
{Combat:Attack|attacker=Rex|defender=Zorak|anim=DashForward|noAutoCamera=true}
{Rex}{FaceDetermined}
{Rex}{FaceBlink}
{SFX:Play|name=dash_whoosh}
{Camera:FightFollow|target=Rex|distance=4|height=1.2}

27
00:01:44,528 --> 00:01:47,028
[Zorak] （闪避）
{Combat:Attack|attacker=Rex|defender=Zorak|anim=LeftPunch|hitFrame=0.25|sfx=punch_light|reaction=Block|noAutoCamera=true}
{Zorak}{FaceBlink}
{Camera:FightImpact|distance=3|height=1.0}

28
00:01:47,028 --> 00:01:49,716
[Rex] 反应不错，紫晶。
{Rex}{FaceSmirk}
{Rex}{FaceBlink}
{Camera:FightSide|distance=4|height=1.2}

29
00:01:50,216 --> 00:01:52,716
[Zorak] （格挡）
{Zorak}{FaceDetermined}
{Zorak}{FaceBlink}
{SFX:Play|name=block_guard}
{Camera:FightImpact|distance=2.5|height=1.0}

30
00:01:52,716 --> 00:01:55,524
[Klaw] 嘿！别只冲着泽拉克来！
{Klaw}{Run}
{Klaw}{FaceAngry}
{Klaw}{FaceBlink}
{SFX:Play|name=dash_whoosh}
{Camera:FightWide|distance=6|height=2}

31
00:01:56,024 --> 00:01:58,524
{Combat:Attack|attacker=Klaw|defender=Rex|anim=LeftPunch|hitFrame=0.25|sfx=whoosh_fast|reaction=Dodge|noAutoCamera=true}
{Rex}{FaceBlink}
{Camera:FightFollow|target=Rex|distance=4|height=1.2}

32
00:01:58,524 --> 00:02:02,292
[Rex] 哈！鳞甲也来凑热闹？
{Combat:Attack|attacker=Rex|defender=Klaw|anim=RightPunch|hitFrame=0.25|sfx=punch_hit|reaction=HitStagger|noAutoCamera=true}
{Rex}{FaceHappy}
{Rex}{FaceBlink}
{Camera:FightImpact|distance=2.5|height=1.0}

33
00:02:02,792 --> 00:02:05,292
[Klaw] 被打中了！
{Klaw}{FacePain}
{Klaw}{FaceBlink}
{SFX:Play|name=impact_thud}
{Camera:ReactionShot|target=Klaw|distance=3|height=1.5}

34
00:02:05,292 --> 00:02:08,195
[Vex] 够了！我们不是来打架的！
{Vex}{DashForward}
{Vex}{FaceAngry}
{Vex}{FaceBlink}
{SFX:Play|name=dash_whoosh}
{Camera:Static|position=0,1.6,6|lookAt=0,1.0,0}

35
00:02:08,695 --> 00:02:11,195
{Combat:Attack|attacker=Rex|defender=Vex|anim=Kick|hitFrame=0.35|sfx=kick_impact|reaction=HitStagger|noAutoCamera=true}
{Rex}{FaceBlink}
{Vex}{FacePain}
{Camera:FightImpact|distance=2.5|height=1.0}

36
00:02:11,195 --> 00:02:14,579
[Rex] 三个人一起上？有意思。
{Rex}{FightingStance}
{Rex}{FaceSmirk}
{Rex}{FaceBlink}
{SFX:Play|name=energy_charge}
{Camera:FightDramatic|target=Rex|distance=3|height=1.0}

37
00:02:15,079 --> 00:02:18,223
{Music:Play|name=resolution|fadeIn=2.0|baseVolume=0.3|endTime=90.0}
{Zorak}{FightingStance}
{Klaw}{FightingStance}
{Vex}{FightingStance}
[Zorak] 停手！我们真的不想战斗！
{Zorak}{FaceDetermined}
{Zorak}{FaceBlink}
{Camera:FightWide|distance=8|height=2.5}

38
00:02:18,723 --> 00:02:22,875
{Zorak}{Walk}
{Event:Move|character=Zorak|x=0|z=0|duration=1.5}
[Zorak] 看，我放下手。我们是和平的。
{Zorak}{HandsUp}
{Zorak}{FaceHappy}
{Zorak}{FaceBlink}
{Camera:Static|position=0,1.6,5|lookAt=0,1.0,0}

39
00:02:23,375 --> 00:02:24,911
[Rex] ...哼。
{Rex}{FaceSmirk}
{Rex}{CrossArms}
{Rex}{FaceBlink}
{SFX:Play|name=wind_gentle}
{Camera:CloseUp|target=Rex|distance=2.5|height=1.5}

40
00:02:25,411 --> 00:02:31,195
[Rex] 你们三个...挺有意思的。好吧，我暂时相信你们。
{Rex}{Nod}
{Rex}{FaceSmirk}
{Rex}{FaceBlink}
{Camera:TwoShot|position=0,1.6,5|lookAt=0,1.0,0}

41
00:02:31,695 --> 00:02:33,663
[Klaw] 所以...不打了吗？
{Klaw}{ScratchHead}
{Klaw}{FaceConfused}
{Klaw}{FaceBlink}
{Camera:ReactionShot|target=Klaw|distance=3|height=1.4}

42
00:02:34,163 --> 00:02:38,459
[Rex] 暂时。但如果你们敢伤害这颗星球...
{Rex}{PointForward}
{Rex}{FaceDetermined}
{Rex}{FaceBlink}
{Camera:CloseUp|target=Rex|distance=2.5|height=1.5}

43
00:02:38,959 --> 00:02:42,127
[Vex] 我们发誓！我们只是探险家！
{Vex}{WaveHand}
{Vex}{FaceHappy}
{Vex}{FaceBlink}
{Camera:Static|position=-2,1.5,5|lookAt=0,1.0,0}

44
00:02:42,627 --> 00:02:49,035
[Zorak] 也许...我们可以互相帮助。你熟悉这里，我们有飞船和技术。
{SceneDirector:Formation|type=semicircle|center=0,0,-1|radius=2|focus=Rex}
{Zorak}{ReachOut}
{Zorak}{FaceHappy}
{Zorak}{FaceBlink}
{Camera:TwoShot|position=0,1.6,5|lookAt=0,1.0,0}

45
00:02:49,535 --> 00:02:51,503
[Rex] 互相帮助？
{Rex}{Think}
{Rex}{FaceConfused}
{Rex}{FaceBlink}
{Camera:Static|position=3,1.6,4|lookAt=0,1.0,0}

46
00:02:52,003 --> 00:02:55,651
[Rex] ...好吧。但有一个条件。
{Rex}{HandsOnHips}
{Rex}{FaceSmirk}
{Rex}{FaceBlink}
{Camera:CloseUp|target=Rex|distance=2.5|height=1.5}

47
00:02:56,151 --> 00:02:57,903
[Zorak] 什么条件？
{Zorak}{Nod}
{Zorak}{FaceConfused}
{Zorak}{FaceBlink}
{Camera:Static|position=0,1.6,5|lookAt=0,1.0,0}

48
00:02:58,403 --> 00:03:00,659
[Rex] 教我开你们的飞船。
{Rex}{FaceSmirk}
{Rex}{FaceBlink}
{Rex}{LookAround}
{SFX:Play|name=wind_gentle}
{Camera:FightDramatic|target=Rex|distance=3|height=1.0}

49
00:03:01,159 --> 00:03:04,399
[Klaw] 什么？！让晶体生物开飞船？
{Klaw}{FaceSurprised}
{Klaw}{SurprisedJump}
{Klaw}{FaceBlink}
{Camera:ReactionShot|target=Klaw|distance=3|height=1.4}

50
00:03:04,899 --> 00:03:08,499
[Vex] 如果先用模拟驾驶，我觉得...挺有趣的。
{Vex}{FaceHappy}
{Vex}{FaceBlink}
{Vex}{Shrug}
{Camera:Static|position=-2,1.5,4|lookAt=0,1.0,0}

51
00:03:08,999 --> 00:03:15,767
[Zorak] ...成交。先学模拟驾驶。欢迎暂时同行，Rex。
{SceneDirector:Formation|type=semicircle|center=0,0,-1|radius=2|focus=Rex}
{Zorak}{ReachOut}
{Zorak}{FaceHappy}
{Zorak}{FaceBlink}
{Camera:TwoShot|position=0,1.6,5|lookAt=0,1.0,0}

52
00:03:16,267 --> 00:03:21,763
[Rex] 暂时同行也行。星际探险队...听起来挺酷的。
{Rex}{WaveHand}
{Rex}{FaceHappy}
{Rex}{FaceBlink}
{Camera:Static|position=0,1.6,6|lookAt=0,1.0,0}

53
00:03:22,263 --> 00:03:25,263
{Zorak}{Walk}
{Klaw}{Walk}
{Vex}{Walk}
{Rex}{Walk}
{Event:Move|character=Zorak|x=-3|z=2|duration=2.5}
{Event:Move|character=Klaw|x=3|z=2|duration=2.5}
{Event:Move|character=Vex|x=0|z=3|duration=2.5}
{Event:Move|character=Rex|x=0|z=1|duration=2.5}
{Transition:Fade|duration=2.0}
{Camera:Pan|from=-5,2,8|to=5,2,8|duration=3.0}

54
00:03:25,263 --> 00:03:29,583
[Zorak] 那么，Rex。带我们去看看你的星球吧。
{Zorak}{PointForward}
{Zorak}{FaceHappy}
{Zorak}{FaceBlink}
{Camera:Static|position=0,2,8|lookAt=0,1.0,0}

55
00:03:30,083 --> 00:03:34,811
[Rex] 跟紧了，外星人们。旅程才刚刚开始。
{Rex}{Run}
{Rex}{FaceHappy}
{Rex}{FaceBlink}
{SFX:Play|name=dash_whoosh}
{Camera:FightFollow|target=Rex|distance=5|height=1.5}

56
00:03:35,311 --> 00:03:38,311
{Zorak}{Run}
{Klaw}{Run}
{Vex}{Run}
{Zorak}{FaceBlink}
{Klaw}{FaceBlink}
{Vex}{FaceBlink}
{SFX:Play|name=dash_whoosh}
{Camera:Pan|from=0,3,10|to=0,5,15|duration=3.0}

57
00:03:38,311 --> 00:03:40,811
{Transition:Fade|duration=2.0}
{Camera:Static|position=0,5,20|lookAt=0,0,0}

58
00:03:40,811 --> 00:03:43,311
{FXCrystalShards|character=Rex}
{SFX:Play|name=energy_charge}
