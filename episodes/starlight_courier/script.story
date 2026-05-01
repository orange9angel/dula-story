1
00:00:00,000 --> 00:00:04,000
@NightStreetScene
{Position:Xiaoyue|x=-2|z=0|face=Xingzai}{Position:Xingzai|x=2|z=0|face=Xiaoyue}

2
00:00:04,000 --> 00:00:10,000
[Xiaoyue]{WaveHand}{Camera:TwoShot|left=Xiaoyue|right=Xingzai|distance=8}{Voice:happy} 星仔！我们好像……掉错地方了？

3
00:00:10,000 --> 00:00:19,000
[Xingzai]{LookUp}{Camera:CloseUp|characterName=Xingzai|sideAngle=10}{Voice:calm} 时光机显示……这里是21世纪的地球。能量只剩3%了。

4
00:00:19,000 --> 00:00:25,000
[Xiaoyue]{SurprisedJump}{Camera:CloseUp|characterName=Xiaoyue|sideAngle=0}{Voice:excited} 3%？！那我们要怎么回未来啊！

5
00:00:25,000 --> 00:00:35,000
[Xingzai]{PointForward}{Camera:OverShoulder|shooter=Xiaoyue|target=Xingzai|distance=5|height=1.2|lookAtHeight=1.0}{Voice:worried} 等等……我的探测器有反应！这附近……有另一台时光机的信号！

6
00:00:35,000 --> 00:00:41,000
[Xiaoyue]{FlailArms}{Camera:CloseUp|characterName=Xiaoyue|sideAngle=-10}{Voice:panic} 真的吗？！在哪里在哪里？！快带我去！

7
00:00:41,000 --> 00:00:52,000
[Xingzai]{ReachOut}{Camera:OverShoulder|shooter=Xiaoyue|target=Xingzai|distance=4|height=1.2|lookAtHeight=1.0}{Voice:worried} 信号来自……那边那栋房子。但是小月，我们这样冒昧拜访，会不会被当成……入侵者？

8
00:00:52,000 --> 00:01:02,000
[Xiaoyue]{ScratchHead}{Camera:CloseUp|characterName=Xiaoyue|sideAngle=-5}{Voice:defiant} 怕什么！我们可是来自3026年的星际旅行者！……虽然现在是步行旅行者。

9
00:01:02,000 --> 00:01:13,000
[Xingzai]{Think}{Camera:Static|position=0,2,6|lookAt=0,1.5,0}{Voice:exasperated} 步行旅行者……说出去会被别的星际旅行者笑一千年。
{Event:Move|character=Xiaoyue|x=-8|z=2|duration=2.0}{Event:Move|character=Xingzai|x=8|z=2|duration=2.0}

10
00:01:13,000 --> 00:01:18,000
@NightRoomScene{Transition:Fade|duration=1.5}
{Position:Xiaoyue|x=-3|z=2|face=right}{Position:Xingzai|x=3|z=2|face=left}{Position:Doraemon|x=0|z=0|face=forward}
[Xiaoyue]{Nod}{Camera:TwoShot|left=Xiaoyue|right=Doraemon|distance=7}{Voice:happy} 请问……这里是野比大雄家吗？

11
00:01:18,000 --> 00:01:25,000
[Doraemon]{SurprisedJump}{Camera:CloseUp|characterName=Doraemon|sideAngle=0}{Voice:excited} 诶？！你们是谁？！怎么知道大雄的名字？！

12
00:01:25,000 --> 00:01:35,000
[Xingzai]{TakeOutFromPocket}{Camera:CloseUp|characterName=Xingzai|sideAngle=0}{Voice:proud} 我们是来自3026年的星际旅行者！我的探测器显示，您这里有一台时光机！

13
00:01:35,000 --> 00:01:43,000
[Doraemon]{ScratchHead}{Camera:TwoShot|left=Doraemon|right=Xingzai|distance=6}{Voice:exasperated} 3026年……时光机……你们该不会是未来百货公司派来的吧？

14
00:01:43,000 --> 00:01:48,000
[Xiaoyue]{SurprisedJump}{Camera:CloseUp|characterName=Xiaoyue|sideAngle=5}{Voice:excited} 未来百货公司？！您也知道？！

15
00:01:48,000 --> 00:01:58,000
[Doraemon]{HandsOnHips}{Camera:CloseUp|characterName=Doraemon|sideAngle=5}{Voice:proud} 当然！我的时光机就是从22世纪的未来百货公司买的！说吧，你们要去哪里？

16
00:01:58,000 --> 00:02:06,000
[Xingzai]{FlyPose}{Camera:Orbit|center=0,1.5,0|radius=8|height=2|startAngle=0|endAngle=6.28}{Voice:excited} 我们要回3026年的仙女座星际港！能量快用完了！

17
00:02:06,000 --> 00:02:15,000
[Doraemon]{ReachOut}{Camera:FollowCharacter|characterName=Doraemon|offset=3,2,6|lookAtOffset=0,1,0}{Voice:happy} 没问题！跟我来！时光机就在大雄房间的抽屉里！

18
00:02:15,000 --> 00:02:21,000
@DrawerScene{Transition:Fade|duration=1.5}
{Position:Doraemon|x=-1.5|z=1|face=forward}{Position:Xiaoyue|x=0|z=1|face=forward}{Position:Xingzai|x=1.5|z=1|face=forward}
[Doraemon]{PointForward}{Camera:ZoomIn|targetPos=0,1.6,-2|distance=5}{Voice:happy} 时光机就在这个抽屉里！看我的！

19
00:02:21,000 --> 00:02:24,000
{Event:OpenDrawer}
[Doraemon]{PullOpenDrawer}{Camera:CloseUp|characterName=Doraemon|sideAngle=0}{SFX:Play|name=slide_wood|offset=0.0} （拉开抽屉——）

20
00:02:24,000 --> 00:02:32,000
[Xiaoyue]{SurprisedJump}{Camera:CloseUp|characterName=Xiaoyue|sideAngle=0}{Voice:excited} 抽屉？！这么小？！里面在发光？！

21
00:02:32,000 --> 00:02:40,000
[Xingzai]{Nod}{Camera:CloseUp|characterName=Xingzai|sideAngle=0}{Voice:calm} 小月，时光机是四次元道具……里面比外面大得多。

22
00:02:40,000 --> 00:02:43,000
[Doraemon]{JumpIntoDrawer}{Event:Move|character=Doraemon|x=0|y=1.5|z=-2|duration=0.8}{Camera:ZoomIn|targetPos=0,1.5,-2|distance=3}{SFX:Play|name=whoosh_fast|offset=0.2} 那我先跳了！

23
00:02:43,000 --> 00:02:50,000
[Xiaoyue]{JumpIntoDrawer}{Event:Move|character=Xiaoyue|x=0|y=1.5|z=-2|duration=0.8}{Voice:happy} 哇——！等等我！

24
00:02:50,000 --> 00:03:01,000
[Xingzai]{JumpIntoDrawer}{Event:Move|character=Xingzai|x=0|y=1.5|z=-2|duration=0.8}{Voice:exasperated} 哆啦A梦先生……您的时光机……
{Event:Move|character=Doraemon|x=0|y=1.5|z=-2|duration=0.8}

25
00:03:01,000 --> 00:03:07,000
@TimeTunnelScene{Transition:Fade|duration=1.0}
{Position:Doraemon|x=-1.5|y=0.1|z=0|face=forward}{Position:Xiaoyue|x=0|y=0.1|z=0|face=forward}{Position:Xingzai|x=1.5|y=0.1|z=0|face=forward}
[Xiaoyue]{Celebrate}{Camera:Static|position=0,3,8|lookAt=0,1,0}{SFX:Play|name=flash|offset=0.3}{Voice:happy} 我们在穿越时空！星星变成线条了！

26
00:03:07,000 --> 00:03:19,000
[Xingzai]{ClapHands}{Camera:CloseUp|characterName=Xingzai|sideAngle=0}{Voice:exasperated} 哆啦A梦先生……您的时光机……好像比我们的快十倍……我要晕机了……
{Event:Move|character=Xingzai|y=10|duration=2.0}

27
00:03:19,000 --> 00:03:28,000
@FutureCityScene{Transition:Fade|duration=2.0}
{Position:Xiaoyue|x=-2|z=2|face=right}{Position:Xingzai|x=2|z=2|face=left}{Position:Doraemon|x=0|z=2|face=forward}
[Xiaoyue]{WaveHand}{Camera:Static|position=0,4,12|lookAt=0,1.5,0}{Voice:happy} 星仔快看！我们到3026年了！仙女座星际港！

28
00:03:28,000 --> 00:03:36,000
[Doraemon]{WaveHand}{Camera:Static|position=0,3,8|lookAt=0,1.5,0}{Voice:happy} 那我回去了！下次来22世纪玩啊！
{Event:Move|character=Xingzai|y=10|duration=2.0}{Event:Move|character=Xiaoyue|x=-8|z=2|duration=2.0}
