1
00:00:00,000 --> 00:00:03,000
@NightStreetScene{Music:Play|name=night_theme|fadeIn=2.0|baseVolume=0.4|endTime=56.0}
{Position:Xiaoyue|x=-2|z=0|face=forward}{Position:Xingzai|x=2|z=0|face=forward}

2
00:00:03,000 --> 00:00:07,000
[Xiaoyue]{WaveHand}{Camera:TwoShot|left=Xiaoyue|right=Xingzai|distance=8} 星仔，今晚的星星好亮啊！

3
00:00:07,000 --> 00:00:11,000
[Xingzai]{PointForward}{Camera:CloseUp|characterName=Xingzai|sideAngle=10} 小心！前面有星光信号在闪烁。

4
00:00:11,000 --> 00:00:15,000
[Xiaoyue]{SurprisedJump}{Camera:Shake|intensity=0.3|duration=0.5}{SFX:Play|name=flash|offset=0.2} 啊！那封信在发光！

5
00:00:15,000 --> 00:00:20,000
[Xingzai]{Think}{Camera:OverShoulder|shooter=Xingzai|target=Xiaoyue|distance=5} 这是……来自星空的求救信？

6
00:00:20,000 --> 00:00:25,000
@NightRoomScene{Transition:Fade|duration=1.0}
{Position:Xiaoyue|x=-1|z=0|face=center}{Position:Xingzai|x=1|z=0|face=center}
[Xiaoyue]{LookUp}{Camera:Static|position=0,2,6|lookAt=0,1.5,0} 信上说，有一颗星星迷路了……

7
00:00:25,000 --> 00:00:30,000
[Xingzai]{Nod}{Camera:CloseUp|characterName=Xingzai|sideAngle=-5} 我们必须把它送回家。

8
00:00:30,000 --> 00:00:35,000
@StarSkyScene{Transition:Fade|duration=1.5}{Event:SetCloudMode|mode=clear}
{Position:Xiaoyue|x=-2|y=3|z=0|face=forward}{Position:Xingzai|x=2|y=3|z=0|face=forward}
[Xingzai]{ReachOut}{TandemFlight}{Camera:Orbit|center=0,3,0|radius=12|height=2|startAngle=0.785|endAngle=6.283} 抓紧啦，起飞！

9
00:00:35,000 --> 00:00:40,000
[Xiaoyue]{LookUp}{Camera:FollowCharacter|characterName=Xiaoyue|offset=3,2,6|lookAtOffset=0,1,0} 哇——星星在脚下流动！

10
00:00:40,000 --> 00:00:45,000
[Xingzai]{ReachOut}{Camera:LowAngle|targetPos=0,3,0|distance=6}{Event:SetCloudMode|mode=stormy}{SFX:Play|name=wind_strong|offset=0.0} 风暴层！抓紧我！

11
00:00:45,000 --> 00:00:50,000
[Xiaoyue]{Celebrate}{Camera:ZoomIn|targetPos=-1,3,0|distance=5}{Event:SetCloudMode|mode=clear}{SFX:Play|name=flash|offset=0.5} 我们到了！星星回家啦！

12
00:00:50,000 --> 00:00:55,000
[Xingzai]{ClapHands}{Camera:CloseUp|characterName=Xingzai|sideAngle=0} 任务完成，又一颗星星平安到家。
