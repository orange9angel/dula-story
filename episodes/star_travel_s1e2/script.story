1
00:00:00,000 --> 00:00:07,000
@DeepSpaceScene
{Music:Play|name=space_explore|fadeIn=2.0|baseVolume=0.3|endTime=45.0}
{Position:PurpleShip|x=-16|y=0|z=0|face=MonkeyShip}
{Position:MonkeyShip|x=16|y=0|z=0|face=PurpleShip}
{Position:Command|x=-1000|y=-1000|z=-1000|face=center}
{Position:Zorak|x=-1000|y=-1000|z=-1000|face=center}
{Position:Klaw|x=-1000|y=-1000|z=-1000|face=center}
{Position:Vex|x=-1000|y=-1000|z=-1000|face=center}
{Position:Rex|x=-1000|y=-1000|z=-1000|face=center}
{Position:Bai|x=-1000|y=-1000|z=-1000|face=center}
{Position:Cheng|x=-1000|y=-1000|z=-1000|face=center}
{Event:Hide|character=Command}
{Event:Hide|character=Zorak}
{Event:Hide|character=Klaw}
{Event:Hide|character=Vex}
{Event:Hide|character=Rex}
{Event:Hide|character=Bai}
{Event:Hide|character=Cheng}
[Command]{Voice:radio} 紫晶号，这里是七环总部。汇报当前位置与状态。
{Camera:Static|position=-9,4,22.4|lookAt=0,0,0}

2
00:00:07,500 --> 00:00:12,000
[Vex]{Voice:radio} 总部，我们在开普勒暗区边缘。引擎与护盾读数正常。
{Camera:Static|position=9,4,22.4|lookAt=0,0,0}

3
00:00:13,272 --> 00:00:17,772
[Command]{Voice:radio} 收到。保持频道开放，一小时后再次通联。总部完毕。
{Camera:Static|position=0,5,25.6|lookAt=0,0,0}

4
00:00:20,196 --> 00:00:24,696
@BrightSpaceStationScene
{Position:Command|x=-1000|y=-1000|z=-1000|face=center}
{Position:Zorak|x=-1.8|y=0|z=-1.0|face=forward}
{Position:Vex|x=-0.6|y=0|z=-1.0|face=forward}
{Position:Klaw|x=0.6|y=0|z=-1.0|face=forward}
{Position:Rex|x=1.8|y=0|z=-1.0|face=forward}
{Position:Bai|x=-1000|y=-1000|z=-1000|face=center}
{Position:Cheng|x=-1000|y=-1000|z=-1000|face=center}
{Event:Hide|character=Command}
{Event:Hide|character=Bai}
{Event:Hide|character=Cheng}
{Event:Show|character=Zorak}
{Event:Show|character=Vex}
{Event:Show|character=Klaw}
{Event:Show|character=Rex}
{Zorak}{FaceSmirk}
[Zorak] 每次进入这片暗区，我都觉得有东西在盯着我们。
{Camera:Static|position=-1.8,1.6,2.5|lookAt=-1.8,1.0,-1.0}

5
00:00:25,196 --> 00:00:29,196
[Vex] 雷达干净得像被擦过。船长，也许只是你的直觉。
{Vex}{FaceHappy}
{Camera:Static|position=-0.6,1.6,2.5|lookAt=-0.6,1.0,-1.0}

6
00:00:30,584 --> 00:00:34,584
[Klaw] 我的直觉也响了。你们听，引擎声有点不对劲。
{Klaw}{FaceConfused}
{Klaw}{ScratchHead}
{Camera:Static|position=0.6,1.6,2.5|lookAt=0.6,1.0,-1.0}

7
00:00:35,324 --> 00:00:39,324
[Rex] 引擎没问题，克劳。是你的胃在响，该吃早饭了。
{Rex}{CrossArms}
{Rex}{FaceSmirk}
{Camera:Static|position=1.8,1.6,2.5|lookAt=1.8,1.0,-1.0}

8
00:00:41,264 --> 00:00:44,764
@DeepSpaceScene
{Position:PurpleShip|x=-16|y=0|z=0|face=MonkeyShip}
{Position:MonkeyShip|x=16|y=0|z=0|face=PurpleShip}
{Position:Command|x=-1000|y=-1000|z=-1000|face=center}
{Position:Zorak|x=-1000|y=-1000|z=-1000|face=center}
{Position:Klaw|x=-1000|y=-1000|z=-1000|face=center}
{Position:Vex|x=-1000|y=-1000|z=-1000|face=center}
{Position:Rex|x=-1000|y=-1000|z=-1000|face=center}
{Position:Bai|x=-1000|y=-1000|z=-1000|face=center}
{Position:Cheng|x=-1000|y=-1000|z=-1000|face=center}
{Event:Hide|character=Command}
{Event:Hide|character=Zorak}
{Event:Hide|character=Klaw}
{Event:Hide|character=Vex}
{Event:Hide|character=Rex}
{Event:Hide|character=Bai}
{Event:Hide|character=Cheng}
[Vex]{Voice:radio} 等等，雷达上有个信号正在高速靠近。
{Camera:Static|position=-9,4,22.4|lookAt=0,0,0}

9
00:00:45,452 --> 00:00:48,952
[Zorak]{Voice:radio} 标记它。如果它不回应，我们进入二级警戒。
{Camera:Static|position=9,4,22.4|lookAt=0,0,0}

10
00:00:50,744 --> 00:00:54,244
[Klaw]{Voice:radio} 是一艘飞船！造型好奇怪，像根大香蕉。
{Camera:Static|position=0,5,25.6|lookAt=0,0,0}

11
00:00:55,580 --> 00:00:59,080
[Rex]{Voice:radio} 它的能量特征不稳定，也许是武器充能。
{Camera:CloseUp|target=PurpleShip|distance=6|height=1.5}

12
00:01:00,224 --> 00:01:03,724
[Zorak]{Voice:radio} 各就各位。如果对方先开火，我们就还击。
{Camera:Static|position=-18,5,14|lookAt=0,0,0}

13
00:01:05,252 --> 00:01:08,252
[Vex]{Voice:radio} 警告无效！它要锁定我们了！
{SFX:Play|name=alarm_beep}
{Event:Move|character=PurpleShip|x=-14.4|y=0|z=4.5|duration=0.6}
{Event:Move|character=MonkeyShip|x=14.4|y=0|z=-4.5|duration=0.6}
{Camera:FollowCharacter|characterName=PurpleShip|offset=0,3,14}

14
00:01:08,752 --> 00:01:11,752
{SFX:Play|name=laser_fire}
{Event:DoorEvent|action=fire:PurpleShip:MonkeyShip:plasma:25|duration=1.0}
[Zorak]{Voice:radio} 先下手为强！等离子炮，发射！
{Event:Move|character=PurpleShip|x=-11.2|y=0|z=6|duration=0.8}
{Camera:FollowCharacter|characterName=PurpleShip|offset=0,4,11.2}

15
00:01:13,276 --> 00:01:16,776
{SFX:Play|name=shield_impact}
{Event:DoorEvent|action=explode:MonkeyShip:1.0}
{Event:Move|character=MonkeyShip|x=12.8|y=0|z=-7.5|duration=0.6}
[Klaw]{Voice:radio} 打中了！它还在机动！
{Camera:FollowCharacter|characterName=MonkeyShip|offset=0,3,12.6}

16
00:01:17,276 --> 00:01:20,776
{Music:Play|name=battle_intense|fadeIn=1.0|baseVolume=0.35|endTime=130.0|fadeOut=2.0}
{SFX:Play|name=laser_fire}
{Event:DoorEvent|action=fire:MonkeyShip:PurpleShip:plasma:25|duration=1.0}
[Vex]{Voice:radio} 它在反击！护盾读数在下降！
{Camera:Static|position=0,6,22.4|lookAt=0,0,0}

17
00:01:21,276 --> 00:01:24,776
{SFX:Play|name=missile_launch}
{Event:DoorEvent|action=fire:PurpleShip:MonkeyShip:missile:18|duration=2.0}
[Klaw]{Voice:radio} 尝尝追踪导弹！
{Event:Move|character=PurpleShip|x=-9.6|y=0|z=3|duration=0.7}
{Camera:Static|position=-20,5,16|lookAt=0,0,0}

18
00:01:25,276 --> 00:01:28,776
{SFX:Play|name=explosion_boom}
{Event:DoorEvent|action=explode:MonkeyShip:1.2}
{Event:Move|character=MonkeyShip|x=16|y=0|z=-6|duration=0.7}
[Rex]{Voice:radio} 好险，它躲开了。
{Camera:Static|position=0,7,25.6|lookAt=0,0,0}

19
00:01:29,276 --> 00:01:32,776
{SFX:Play|name=missile_launch}
{Event:DoorEvent|action=fire:MonkeyShip:PurpleShip:banana:16|duration=2.5}
[Vex]{Voice:radio} 那是什么？香蕉形状的导弹？
{Event:Move|character=PurpleShip|x=-12.8|y=0|z=-3|duration=0.8}
{Camera:FollowCharacter|characterName=PurpleShip|offset=0,3,11.2}

20
00:01:33,276 --> 00:01:36,776
{SFX:Play|name=shield_impact}
{Event:DoorEvent|action=explode:PurpleShip:1.0}
{Event:Move|character=PurpleShip|x=-16|y=0|z=0|duration=0.6}
{FXScreenShake|intensity=0.6|duration=0.5}
[Zorak]{Voice:radio} 护盾撑不住了！必须想办法沟通！
{Camera:Static|position=0,6,22.4|lookAt=0,0,0}

21
00:01:37,440 --> 00:01:40,940
{SFX:Play|name=alarm_beep}
[Vex]{Voice:radio} 等等，我截获到一段通讯！
{Event:Move|character=MonkeyShip|x=11.2|y=0|z=0|duration=0.8}
{Camera:CloseUp|target=MonkeyShip|distance=6|height=1.5}

22
00:01:41,440 --> 00:01:45,440
[Zorak]{Voice:radio} 对方说：它们是银河广播体操代表团，不是敌人！
{SFX:Play|name=wind_gentle}
{Event:Move|character=PurpleShip|x=-11.2|y=0|z=0|duration=1.0}
{Event:Face|character=PurpleShip|target=MonkeyShip}
{Camera:Static|position=0,4,22.4|lookAt=0,0,0}

23
00:01:46,828 --> 00:01:50,328
[Klaw]{Voice:radio} 广播体操？那是什么秘密武器？
{Camera:ReactionShot|target=MonkeyShip|distance=6|height=2}

24
00:01:50,828 --> 00:01:54,328
[Vex]{Voice:radio} 误会了。它们的飞船涂装太像侦察舰。
{Camera:Static|position=0,5,19.2|lookAt=0,0,0}

25
00:01:55,400 --> 00:01:59,400
[Zorak]{Voice:radio} 双方停火。我们请求对接，当面解释。
{Event:Move|character=PurpleShip|x=-8|y=0|z=0|duration=1.5}
{Event:Move|character=MonkeyShip|x=8|y=0|z=0|duration=1.5}
{Camera:Static|position=0,5,22.4|lookAt=0,0,0}

26
00:02:00,380 --> 00:02:04,380
{Transition:Warp|duration=1.0}
{Camera:Static|position=0,4,24|lookAt=0,0,0}
[Zorak] 对接完成。大家保持友好，但别放松警惕。

27
00:02:05,816 --> 00:02:10,316
@BrightSpaceStationScene
{Music:Play|name=space_ambient|fadeIn=1.5|baseVolume=0.25|endTime=120.0}
{Position:Command|x=-1000|y=-1000|z=-1000|face=center}
{Position:Zorak|x=-2.0|y=0|z=0.3|face=forward}
{Position:Klaw|x=-1.0|y=0|z=0.1|face=forward}
{Position:Vex|x=0|y=0|z=-0.1|face=forward}
{Position:Rex|x=1.0|y=0|z=0.1|face=forward}
{Position:Bai|x=2.2|y=0|z=0.3|face=forward}
{Position:Cheng|x=3.2|y=0|z=0.3|face=forward}
{Event:Hide|character=Command}
{Event:Show|character=Zorak}
{Event:Show|character=Klaw}
{Event:Show|character=Vex}
{Event:Show|character=Rex}
{Event:Show|character=Bai}
{Event:Show|character=Cheng}
{Zorak}{FaceHappy}
[Zorak] 欢迎来到紫晶号。我是泽拉克，这些是克劳、维克斯和雷克斯。
{Camera:Static|position=0.5,1.8,5.5|lookAt=0.5,1.0,0}

28
00:02:12,980 --> 00:02:16,980
{Bai}{FaceSmirk}
[Bai] 我是白冷森，这位是橙大力。刚才真的很抱歉。
{Bai}{Bow}
{Cheng}{WaveHand}
{Camera:Static|position=2.2,1.6,3.5|lookAt=2.2,1.0,0}

29
00:02:18,680 --> 00:02:22,680
{Cheng}{FaceHappy}
[Cheng] 你们的飞船看起来像星际海盗船，我们以为要挨抢了！
{Cheng}{Shrug}
{Camera:Static|position=3.2,1.6,3.5|lookAt=3.2,1.0,0}

30
00:02:24,116 --> 00:02:28,616
{Klaw}{FaceConfused}
[Klaw] 你们的香蕉导弹才吓人！差点把紫晶号熏成黄色！
{Klaw}{ScratchHead}
{Camera:Static|position=-1.0,1.6,3.5|lookAt=-1.0,1.0,0}

31
00:02:29,264 --> 00:02:33,264
{Rex}{CrossArms}
{Rex}{FaceSmirk}
[Rex] 不打不相识。宇宙中能相遇就是缘分。
{Camera:Static|position=1.0,1.6,3.5|lookAt=1.0,1.0,0}

32
00:02:34,460 --> 00:02:38,960
{Vex}{WaveHand}
{Vex}{FaceHappy}
[Vex] 如果不介意，我们可以一起航行一段，互相有个照应。
{Camera:Static|position=0,1.6,3.5|lookAt=0,1.0,0}

33
00:02:39,460 --> 00:02:43,460
{Bai}{CrossArms}
{Bai}{FaceSmirk}
[Bai] 好。不过下次请先看清是不是香蕉再开火。
{Camera:Static|position=2.2,1.6,3.5|lookAt=2.2,1.0,0}

34
00:02:44,800 --> 00:02:48,800
{Zorak}{ReachOut}
{Zorak}{FaceHappy}
[Zorak] 成交。那么，全体注意——前方，新的朋友。
{Camera:Static|position=0,1.6,6|lookAt=0,1.0,0}

35
00:02:49,300 --> 00:02:53,800
{Cheng}{WaveHand}
{Klaw}{WaveHand}
{Vex}{WaveHand}
{Rex}{WaveHand}
{Bai}{Nod}
{SFX:Play|name=wind_gentle}
{Camera:Static|position=0,1.8,8|lookAt=0,1.0,0}

36
00:02:54,300 --> 00:02:58,800
{Music:Play|name=resolution|fadeIn=2.0|baseVolume=0.3|endTime=180.0|fadeOut=2.0}
{Transition:Fade|duration=2.0}
{Camera:Static|position=0,2,10|lookAt=0,1.0,0}
