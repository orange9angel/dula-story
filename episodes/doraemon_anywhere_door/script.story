1
00:00:00,000 --> 00:00:04,932
@NobitaRoom{Music:Play|name=room_theme_main|fadeIn=1.0|baseVolume=0.55|endTime=200}
{Position:Nobita|x=0.0|y=0.01|z=0.5|face=center}
{Position:Doraemon|x=1.8|y=0.01|z=0.5|face=Nobita}
{Position:Shizuka|x=-2.0|y=0.01|z=0.5|face=Nobita}
{Camera:Static|position=0,3.0,7.0|lookAt=0,1.0,0}
{Nobita}{SitDown}
[Narrator]一个阳光明媚的下午，大雄坐在房间里发呆。

2
00:00:05,132 --> 00:00:10,028
{Position:Nobita|x=-1.2|y=0.01|z=0.5|face=center}
{Position:Doraemon|x=1.8|y=0.01|z=0.5|face=Nobita}
{Position:Shizuka|x=-2.8|y=0.01|z=0.5|face=Nobita}
{Camera:CloseUp|target=Nobita|distance=4.5|heightOffset=-0.1|sideAngle=25}
[Nobita]{FaceSad} {Shrug}好无聊啊，真希望今天能发生点什么刺激的事。
{Doraemon}{FaceRelaxed} {WaveHand}

3
00:00:10,228 --> 00:00:16,128
{Position:Nobita|x=-1.2|y=0.01|z=0.5|face=center}
{Position:Doraemon|x=1.8|y=0.01|z=0.5|face=Nobita}
{Position:Shizuka|x=-2.8|y=0.01|z=0.5|face=Nobita}
{Camera:TwoShot|characterA=Nobita|characterB=Shizuka|distance=6.5|height=2.2}
[Shizuka]{FaceHappy} {Walk} {WaveHand}大雄！哆啦A梦叫我过来的，你没事吧？
{Event:Move|character=Shizuka|x=1.6|z=0.5|duration=2.0}

4
00:00:16,328 --> 00:00:19,736
{Position:Nobita|x=-1.5|y=0.01|z=0.5|face=Shizuka}
{Position:Doraemon|x=0.6|y=0.01|z=0.5|face=center}
{Position:Shizuka|x=1.8|y=0.01|z=0.5|face=Nobita}
{Camera:CloseUp|target=Doraemon|distance=4.5|heightOffset=-0.1|sideAngle=-25}
[Doraemon]{FaceProud} {HandsOnHips}当然没事！看我带来了什么！
{Nobita}{FaceSurprised} {SurprisedJump}
{Shizuka}{FaceAmazed} {ClapHands}

5
00:00:19,936 --> 00:00:24,784
{Position:Nobita|x=-1.5|y=0.01|z=0.5|face=center}
{Position:Doraemon|x=0.2|y=0.01|z=0.5|face=center}
{Position:Shizuka|x=2.0|y=0.01|z=0.5|face=center}
{Camera:Static|position=0,3.0,7.0|lookAt=-0.3,1.2,-1.0}
{Event:DoorEvent|action=summon|duration=0.5}
[Doraemon]{FaceSmile} {TakeOutFromPocket}这是任意门！打开门，想去哪里都可以！
{SFX:Play|name=whoosh_fast}
{DoorOpen}
{Nobita}{FaceAmazed} {LookAround}
{Shizuka}{FaceExcited} {JumpForJoy}

6
00:00:24,984 --> 00:00:30,432
{Position:Nobita|x=-1.5|y=0.01|z=0.5|face=center}
{Position:Doraemon|x=0.2|y=0.01|z=0.5|face=center}
{Position:Shizuka|x=2.0|y=0.01|z=0.5|face=center}
{Camera:CloseUp|target=Nobita|distance=4.5|heightOffset=-0.1|sideAngle=-20}
[Nobita]{FaceExcited} {JumpForJoy}哇！我们可以去恐龙时代吗？那一定超酷！

7
00:00:30,632 --> 00:00:35,332
{Position:Nobita|x=-1.5|y=0.01|z=0.5|face=center}
{Position:Doraemon|x=0.2|y=0.01|z=0.5|face=center}
{Position:Shizuka|x=2.0|y=0.01|z=0.5|face=center}
{Camera:CloseUp|target=Doraemon|distance=4.5|heightOffset=-0.1|sideAngle=-25}
[Doraemon]{FaceWorried} {ShakeHead}等等，那很危险，我们要待在一起！

8
00:00:35,532 --> 00:00:41,580
@PrehistoricScene{Music:Play|name=prehistoric_theme|fadeIn=1.0|baseVolume=0.50|endTime=200}
{Position:Nobita|x=-2.0|y=0.01|z=1.5|face=center}
{Position:Doraemon|x=0.8|y=0.01|z=1.5|face=center}
{Position:Shizuka|x=2.2|y=0.01|z=2.0|face=center}
{Position:BigDino|x=12.0|y=0.01|z=12.0|face=center}
{Position:BabyDino|x=12.0|y=0.01|z=12.0|face=center}
{Camera:Static|position=0,3.0,8.0|lookAt=0,1.2,0}
{Event:DoorEvent|action=summon|duration=0.5}
{Transition:Fade|duration=1.0}
[Narrator]哆啦A梦转动了门把手，他们穿过门，来到了一片史前丛林。

9
00:00:41,780 --> 00:00:45,692
{Position:Nobita|x=-2.0|y=0.01|z=1.5|face=center}
{Position:Doraemon|x=0.8|y=0.01|z=1.5|face=center}
{Position:Shizuka|x=2.2|y=0.01|z=2.0|face=center}
{Position:BigDino|x=12.0|y=0.01|z=12.0|face=center}
{Position:BabyDino|x=12.0|y=0.01|z=12.0|face=center}
{Camera:Pan|offset=0,1,-2|lookAt=0,2,0}
[Nobita]{FaceAmazed} {LookAround} {HandsOnHips}看这些巨大的蕨类植物！还有火山！

10
00:00:45,892 --> 00:00:48,868
{Position:Nobita|x=-2.0|y=0.01|z=1.5|face=center}
{Position:Doraemon|x=0.8|y=0.01|z=1.5|face=center}
{Position:Shizuka|x=2.2|y=0.01|z=2.0|face=center}
{Position:BigDino|x=12.0|y=0.01|z=12.0|face=center}
{Position:BabyDino|x=12.0|y=0.01|z=12.0|face=center}
{Camera:CloseUp|target=Shizuka|distance=4.0|heightOffset=-0.1|sideAngle=25}
[Shizuka]{FaceWorried} {Tremble}好美……可是也有点可怕。
{Nobita}{FaceWorried} {Tremble}

11
00:00:49,068 --> 00:00:52,068
{Position:Nobita|x=-2.0|y=0.01|z=1.5|face=center}
{Position:Doraemon|x=0.8|y=0.01|z=1.5|face=center}
{Position:Shizuka|x=2.2|y=0.01|z=2.0|face=center}
{Position:BigDino|x=12.0|y=0.01|z=12.0|face=center}
{Position:BabyDino|x=12.0|y=0.01|z=12.0|face=center}
{Camera:CloseUp|target=Doraemon|distance=4.5|heightOffset=-0.1|sideAngle=-25}
[Doraemon]{FaceProud} {HandsOnHips}别担心，我有很多秘密道具！
{Nobita}{FaceRelaxed} {Nod}

12
00:00:52,268 --> 00:00:57,812
{Position:Nobita|x=-2.0|y=0.01|z=0.5|face=center}
{Position:Doraemon|x=0.8|y=0.01|z=0.5|face=center}
{Position:Shizuka|x=-0.6|y=0.01|z=1.5|face=center}
{Position:BigDino|x=8.0|y=0.01|z=-5.0|face=center}
{Position:BabyDino|x=12.0|y=0.01|z=12.0|face=center}
{Camera:Static|position=0,3.5,9.0|lookAt=0,1.3,0}
{Event:Move|character=BigDino|x=4.0|z=-2.0|duration=2.5}
{BigDino}{BigDinoRoar}
{Camera:Shake|intensity=0.3|duration=0.6}
{SFX:Play|name=impact_thud}
[Narrator]突然，大地震动，一只巨大的霸王龙出现了！

13
00:00:58,012 --> 00:01:01,036
{Position:Nobita|x=-2.2|y=0.01|z=1.0|face=center}
{Position:Doraemon|x=0.0|y=0.01|z=0.5|face=center}
{Position:Shizuka|x=2.2|y=0.01|z=1.0|face=center}
{Position:BigDino|x=4.0|y=0.01|z=-2.0|face=center}
{Position:BabyDino|x=12.0|y=0.01|z=12.0|face=center}
{Camera:Static|position=0,3.5,9.0|lookAt=0,1.3,0}
{Event:Move|character=BigDino|x=3.5|z=-1.5|duration=2.5}
{BigDino}{BigDinoRun}
{Camera:Shake|intensity=0.4|duration=0.8}
[Doraemon]{FaceScared} {Run}快跑！别回头！
{Nobita}{FaceScared} {Run}
{Shizuka}{FaceScared} {Run}

14
00:01:01,236 --> 00:01:05,076
{Position:Nobita|x=-2.2|y=0.01|z=1.0|face=center}
{Position:Doraemon|x=0.2|y=0.01|z=0.5|face=center}
{Position:Shizuka|x=2.4|y=0.01|z=1.0|face=center}
{Position:BigDino|x=4.0|y=0.01|z=-2.0|face=center}
{Position:BabyDino|x=12.0|y=0.01|z=12.0|face=center}
{Camera:CloseUp|target=Nobita|distance=4.5|heightOffset=-0.1|sideAngle=25}
[Nobita]{FaceCry} {Cry} {ShowTears} {Tremble}我跑不动了！腿在发抖！
{Shizuka}{FaceWorried} {Tremble}

15
00:01:05,276 --> 00:01:09,548
{Position:Nobita|x=-2.2|y=0.01|z=1.0|face=center}
{Position:Doraemon|x=0.2|y=0.01|z=0.5|face=center}
{Position:Shizuka|x=2.4|y=0.01|z=1.0|face=center}
{Position:BigDino|x=4.0|y=0.01|z=-2.0|face=center}
{Position:BabyDino|x=12.0|y=0.01|z=12.0|face=center}
{Camera:CloseUp|target=Shizuka|distance=4.0|heightOffset=-0.05|sideAngle=-20}
[Shizuka]{FaceHappy} {ReachOut}大雄，不要放弃！我们快到门那里了！

16
00:01:09,748 --> 00:01:13,876
{Position:Nobita|x=-2.2|y=0.01|z=1.0|face=center}
{Position:Doraemon|x=0.2|y=0.01|z=0.5|face=center}
{Position:Shizuka|x=2.4|y=0.01|z=1.0|face=center}
{Position:BigDino|x=4.0|y=0.01|z=-2.0|face=center}
{Position:BabyDino|x=12.0|y=0.01|z=12.0|face=center}
{Camera:CloseUp|target=Doraemon|distance=4.5|heightOffset=-0.1|sideAngle=-25}
[Doraemon]{FaceProud} {TakeOutFromPocket}竹蜻蜓！快戴上！
{SFX:Play|name=takecopter_spin}

17
00:01:14,076 --> 00:01:18,396
{Position:Nobita|x=-1.8|y=2.0|z=1.5|face=center}
{Position:Doraemon|x=0.6|y=2.2|z=1.5|face=center}
{Position:Shizuka|x=-0.6|y=2.1|z=2.5|face=center}
{Position:BigDino|x=4.0|y=0.01|z=-2.0|face=center}
{Position:BabyDino|x=12.0|y=0.01|z=12.0|face=center}
{Camera:Static|position=0,6.0,10.0|lookAt=0,2.0,0}
{Doraemon}{TakeCopter}
{Nobita}{TakeCopter}
{Shizuka}{TakeCopter}
[Narrator]他们飞上天空，霸王龙在脚下张大了嘴。
{Nobita}{FaceRelieved} {LookUp}
{Doraemon}{FaceHappy} {WaveUp}
{Shizuka}{FaceRelieved} {WaveUp}
{BigDino}{BigDinoRoar}

18
00:01:18,596 --> 00:01:21,936
{Position:Nobita|x=-1.8|y=2.0|z=1.5|face=center}
{Position:Doraemon|x=0.6|y=2.2|z=1.5|face=center}
{Position:Shizuka|x=-0.6|y=2.1|z=2.5|face=center}
{Position:BigDino|x=4.0|y=0.01|z=-2.0|face=center}
{Position:BabyDino|x=12.0|y=0.01|z=12.0|face=center}
{Camera:CloseUp|target=Nobita|distance=4.5|heightOffset=-0.1|sideAngle=25}
[Nobita]{FaceRelieved} {WipeForehead} {HideTears}好险……谢谢你，哆啦A梦。

19
00:01:22,136 --> 00:01:27,176
{Position:Nobita|x=-1.8|y=2.0|z=1.5|face=center}
{Position:Doraemon|x=0.6|y=2.2|z=1.5|face=center}
{Position:Shizuka|x=-0.6|y=2.1|z=2.5|face=center}
{Position:BigDino|x=4.0|y=0.01|z=-2.0|face=center}
{Position:BabyDino|x=12.0|y=0.01|z=12.0|face=center}
{Camera:CloseUp|target=Doraemon|distance=4.5|heightOffset=-0.1|sideAngle=-25}
[Doraemon]{FaceHappy} {ThumbsUp}冒险很有趣，但安全第一。好了，我们回家吧。

20
00:01:27,376 --> 00:01:32,656
{Position:Nobita|x=-1.8|y=0.01|z=1.5|face=center}
{Position:Doraemon|x=0.6|y=0.01|z=1.5|face=center}
{Position:Shizuka|x=-0.6|y=0.01|z=2.5|face=center}
{Position:BigDino|x=8.0|y=0.01|z=-5.0|face=center}
{Position:BabyDino|x=12.0|y=0.01|z=12.0|face=center}
{Camera:Static|position=0,3.0,8.0|lookAt=1.5,1.0,-1.5}
{Event:Move|character=BigDino|x=4.0|z=-2.0|duration=2.5}
{BigDino}{BigDinoRun}
{Camera:Shake|intensity=0.3|duration=0.6}
{SFX:Play|name=impact_thud}
{Doraemon}{TakeCopterOff}
{Nobita}{TakeCopterOff}
{Shizuka}{TakeCopterOff}
[Shizuka]{FaceScared} {PointForward}等等！那只大恐龙又追上来了！
{Nobita}{FaceScared} {Tremble}
{Doraemon}{FaceWorried} {LookAround}

21
00:01:32,856 --> 00:01:37,076
{Position:Nobita|x=-1.8|y=0.01|z=1.5|face=center}
{Position:Doraemon|x=0.6|y=0.01|z=1.5|face=center}
{Position:Shizuka|x=2.2|y=0.01|z=2.0|face=center}
{Position:BigDino|x=4.0|y=0.01|z=-2.0|face=center}
{Position:BabyDino|x=12.0|y=0.01|z=12.0|face=center}
{Camera:Static|position=-3.0,3.0,8.0|lookAt=2.0,1.0,-2.0}
[Nobita]{FaceScared} {Cry} {ShowTears}它还在追我们！哆啦A梦，快用任意门！
{Shizuka}{FaceScared} {Tremble}
{Doraemon}{FaceProud} {HandsOnHips}

22
00:01:37,276 --> 00:01:42,108
@NobitaRoom{Music:Play|name=ending_theme|fadeIn=1.0|baseVolume=0.45|endTime=200}
{Position:Nobita|x=-1.5|y=0.01|z=0.0|face=center}
{Position:Doraemon|x=1.5|y=0.01|z=0.0|face=center}
{Position:Shizuka|x=0.0|y=0.01|z=1.2|face=center}
{Camera:Static|position=0,3.0,7.0|lookAt=0,1.3,0}
{Event:DoorEvent|action=summon|duration=0.5}
{DoorOpen}
{Transition:Fade|duration=1.0}
[Narrator]于是，他们赶紧逃回房间，关上了任意门。
