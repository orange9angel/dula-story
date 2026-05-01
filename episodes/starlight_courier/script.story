1
00:00:00,000 --> 00:00:04,000
@NightStreetScene
{Position:Xiaoyue|x=-2|z=0|face=Xingzai}{Position:Xingzai|x=2|z=0|face=Xiaoyue}

2
00:00:04,000 --> 00:00:08,000
[Xiaoyue]{WaveHand}{Camera:TwoShot|left=Xiaoyue|right=Xingzai|distance=8}{Voice:happy} 星仔！我们好像掉错地方了？

3
00:00:08,000 --> 00:00:13,000
[Xingzai]{LookUp}{Camera:CloseUp|characterName=Xingzai|sideAngle=10}{Voice:calm} 时光机显示，这里是21世纪的地球。能量只剩3%了。

4
00:00:13,000 --> 00:00:16,500
[Xiaoyue]{SurprisedJump}{Camera:CloseUp|characterName=Xiaoyue|sideAngle=0}{Voice:excited} 3%？！那我们要怎么回未来啊！

5
00:00:16,500 --> 00:00:22,000
[Xingzai]{PointForward}{Camera:CloseUp|characterName=Xingzai|sideAngle=10}{Voice:worried} 等等，我的探测器有反应！这附近有另一台时光机的信号！

6
00:00:22,000 --> 00:00:27,000
[Xiaoyue]{FlailArms}{Camera:CloseUp|characterName=Xiaoyue|sideAngle=-10}{Voice:panic} 真的吗？！在哪里在哪里？！快带我去！

7
00:00:26,000 --> 00:00:33,000
[Xingzai]{ReachOut}{Camera:CloseUp|characterName=Xingzai|sideAngle=-5}{Voice:worried} 信号来自那边那栋房子。但是小月，我们这样冒昧拜访，会不会被当成入侵者？

8
00:00:33,000 --> 00:00:42,000
[Xiaoyue]{ScratchHead}{Camera:CloseUp|characterName=Xiaoyue|sideAngle=-5}{Voice:defiant} 怕什么！我们可是来自3026年的星际旅行者！虽然现在是步行旅行者。

9
00:00:40,000 --> 00:00:45,000
[Xingzai]{Think}{Camera:Static|position=0,2,8|lookAt=0,1.5,0}{Voice:exasperated} 步行旅行者，说出去会被别的星际旅行者笑一千年。
{Event:Move|character=Xiaoyue|x=-4|z=0|duration=3.0}{Event:Move|character=Xingzai|x=4|z=0|duration=3.0}

10
00:00:45,000 --> 00:00:49,000
@NightRoomScene{Transition:Fade|duration=1.5}
{Position:Xiaoyue|x=-3|z=2|face=right}{Position:Xingzai|x=3|z=2|face=left}{Position:Doraemon|x=0|z=0|face=forward}
[Xiaoyue]{Nod}{Camera:TwoShot|left=Xiaoyue|right=Doraemon|distance=7}{Voice:happy} 请问，这里是野比大雄家吗？

11
00:00:49,000 --> 00:00:53,000
[Doraemon]{SurprisedJump}{Camera:CloseUp|characterName=Doraemon|sideAngle=0}{Voice:excited} 诶？！你们是谁？！怎么知道大雄的名字？！

12
00:00:53,000 --> 00:00:59,000
[Xingzai]{TakeOutFromPocket}{Camera:CloseUp|characterName=Xingzai|sideAngle=0}{Voice:proud} 我们是来自3026年的星际旅行者！我的探测器显示，您这里有一台时光机！

13
00:00:59,000 --> 00:01:05,000
[Doraemon]{ScratchHead}{Camera:TwoShot|left=Doraemon|right=Xingzai|distance=6}{Voice:exasperated} 3026年，时光机，你们该不会是未来百货公司派来的吧？

14
00:01:05,000 --> 00:01:08,500
[Xiaoyue]{SurprisedJump}{Camera:CloseUp|characterName=Xiaoyue|sideAngle=5}{Voice:excited} 未来百货公司？！您也知道？！

15
00:01:08,500 --> 00:01:15,000
[Doraemon]{HandsOnHips}{Camera:CloseUp|characterName=Doraemon|sideAngle=5}{Voice:proud} 当然！我的时光机就是从22世纪的未来百货公司买的！说吧，你们要去哪里？

16
00:01:15,000 --> 00:01:22,000
[Xingzai]{FlyPose}{Camera:Orbit|center=0,1.5,0|radius=8|height=2|startAngle=0|endAngle=6.28}{Voice:excited} 哆啦A梦先生，您能送我们去3026年的仙女座星际港吗？我们的能量快用完了！

17
00:01:22,000 --> 00:01:29,500
[Doraemon]{ReachOut}{Camera:FollowCharacter|characterName=Doraemon|offset=3,2,6|lookAtOffset=0,1,0}{Voice:happy} 没问题！跟我来！时光机就在大雄房间的抽屉里！坐我的时光机送你们回去！

18
00:01:29,500 --> 00:01:33,500
@DrawerScene{Transition:Fade|duration=1.5}
{Position:Doraemon|x=-1.5|z=1|face=back}{Position:Xiaoyue|x=0|z=1|face=back}{Position:Xingzai|x=1.5|z=1|face=back}
[Doraemon]{PointForward}{Camera:Static|position=0,3,6|lookAt=0,1.5,0}{Voice:happy} 时光机就在这个抽屉里！看我的！

19
00:01:33,500 --> 00:01:35,500
{Event:OpenDrawer}
[Doraemon]{PullOpenDrawer}{Camera:CloseUp|characterName=Doraemon|sideAngle=0}{SFX:Play|name=slide_wood|offset=0.0} （拉开抽屉——）

20
00:01:35,500 --> 00:01:39,500
[Xiaoyue]{SurprisedJump}{Camera:CloseUp|characterName=Xiaoyue|sideAngle=0}{Voice:excited} 抽屉？！这么小？！里面在发光？！

21
00:01:39,500 --> 00:01:43,500
[Xingzai]{Nod}{Camera:CloseUp|characterName=Xingzai|sideAngle=0}{Voice:calm} 小月，时光机是四次元道具，里面比外面大得多。

22
00:01:43,500 --> 00:01:46,000
[Doraemon]{JumpIntoDrawer}{Event:Move|character=Doraemon|x=0|y=1.5|z=-2|duration=0.8}{Camera:ZoomIn|targetPos=0,1.5,-2|distance=3}{SFX:Play|name=whoosh_fast|offset=0.2} 那我先跳了！

23
00:01:46,000 --> 00:01:48,500
[Xiaoyue]{JumpIntoDrawer}{Event:Move|character=Xiaoyue|x=0|y=1.5|z=-2|duration=0.8}{Voice:happy} 哇——！等等我！

24
00:01:48,500 --> 00:01:51,500
[Xingzai]{JumpIntoDrawer}{Event:Move|character=Xingzai|x=0|y=1.5|z=-2|duration=0.8}{Voice:exasperated} 等等我！这时光机……
{Event:Move|character=Doraemon|x=0|y=1.5|z=-2|duration=0.8}

25
00:01:51,500 --> 00:01:57,000
@TimeTunnelScene{Transition:Fade|duration=1.0}
{Position:Doraemon|x=-1.5|y=0.1|z=0|face=forward}{Position:Xiaoyue|x=0|y=0.1|z=0|face=forward}{Position:Xingzai|x=1.5|y=0.1|z=0|face=forward}
[Xiaoyue]{Celebrate}{Camera:Static|position=0,3,8|lookAt=0,1,0}{Voice:happy} 哇！星星变成面条了！不对，是线条！

26
00:01:57,000 --> 00:02:03,000
[Xingzai]{ClapHands}{Camera:CloseUp|characterName=Xingzai|sideAngle=0}{Voice:exasperated} 哆啦A梦先生，您的时光机好像比我们的快十倍，我要晕机了……
{Event:Move|character=Xingzai|y=10|duration=2.0}

27
00:02:03,000 --> 00:02:12,000
@FutureCityScene{Transition:Fade|duration=2.0}
{Position:Xiaoyue|x=-1.5|z=4|face=forward}{Position:Xingzai|x=1.5|z=4|face=forward}{Position:Doraemon|x=0|z=4|face=forward}
[Xiaoyue]{WaveHand}{Camera:Static|position=0,2,10|lookAt=0,1.5,0}{Voice:happy} 星仔快看！我们到3026年了！仙女座星际港！比我想象的还要大！

28
00:02:12,000 --> 00:02:16,500
[Doraemon]{WaveHand}{Camera:Static|position=0,3,8|lookAt=0,1.5,0}{Voice:happy} 那我回去了！记得给五星好评啊！
{Event:Move|character=Xingzai|y=10|duration=2.0}{Event:Move|character=Xiaoyue|x=-8|z=2|duration=2.0}
