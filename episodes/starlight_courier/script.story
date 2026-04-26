1
00:00:00,000 --> 00:00:08,000
@NightStreetScene{Music:Play|name=night_theme|fadeIn=2.0|baseVolume=0.4|endTime=42.0}
[Xiaoyue]{Animation:SurprisedJump}{Camera:Static|position=2,2,6|lookAt=0,1.2,0}{Prop:letter|character=Xiaoyue} 星仔，你看！这封信在发光。

2
00:00:03,500 --> 00:00:08,000
[Xingzai]{Animation:PointForward}{Camera:CloseUp|characterName=Xingzai|sideAngle=10} 检测到星光信号！

3
00:00:08,000 --> 00:00:16,000
@NightRoomScene{Transition:Fade|duration=1.0}
[Xiaoyue]{Animation:Think}{Camera:Static|position=0,2,5|lookAt=0,1,0} 它在指路……

4
00:00:11,000 --> 00:00:16,000
[Xingzai]{Animation:LookUp}{Camera:CloseUp|characterName=Xingzai|sideAngle=-5} 目标在云层上方。

5
00:00:16,000 --> 00:00:24,000
@StarSkyScene{Transition:Fade|duration=1.0}{Event:SetCloudMode|mode=clear}
[Xingzai]{Animation:TandemFlight}{Camera:Static|position=0,0,10|lookAt=0,4,0} 抓紧啦，我们出发！
[Xiaoyue]{Animation:RidingPose}{Camera:Static|position=0,0,10|lookAt=0,4,0} 哇——星星在脚下！

6
00:00:24,000 --> 00:00:33,000
@StarSkyScene{Event:SetCloudMode|mode=stormy}{Transition:Fade|duration=1.5}
[Xingzai]{Animation:TandemFlight}{Camera:Orbit|target=Xingzai|distance=10|height=1} 穿越风暴层！
[Xiaoyue]{Animation:RidingPose}{Camera:Orbit|target=Xingzai|distance=10|height=1} 我找不到回家的路……

7
00:00:33,000 --> 00:00:42,000
@StarSkyScene{Event:SetCloudMode|mode=clear}{Transition:Iris|duration=1.0}
[Xiaoyue]{Animation:Celebrate}{Camera:Static|position=0,2,6|lookAt=0,1,0} 再见啦，要平安到家哦！

8
00:00:37,000 --> 00:00:42,000
[Xingzai]{Animation:ClapHands}{Camera:CloseUp|characterName=Xingzai|sideAngle=0} 任务完成！
