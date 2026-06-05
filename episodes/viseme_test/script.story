1
00:00:00,000 --> 00:00:00,100
@SpaceStationScene
{Position:Zorak|x=0|y=0.01|z=0|face=forward}

2
00:00:00,000 --> 00:00:01,000
{Camera:Static|position=3,2,6|lookAt=0,1.2,0}

3
00:00:01,500 --> 00:00:03,500
[Zorak] 啊！这是外星科技！
{FaceSurprised}

4
00:00:04,000 --> 00:00:08,000
[Zorak] 我们必须小心。蹲下观察。
{FaceDetermined}{Animation:Crouch|depth=0.5|lean=0|duration=3}

5
00:00:08,500 --> 00:00:10,500
[Zorak] 你明白吗？
{FaceAngry}

6
00:00:10,600 --> 00:00:12,200
[Zorak]{Animation:TurnAround|target=back|direction=right|duration=1.6}{Camera:Static|position=2.2,1.7,4.4|lookAt=0,1.2,0}

7
00:00:12,300 --> 00:00:15,300
[Zorak] 准备起跳！
{Event:Face|character=Zorak|target=back}{FaceDetermined}{Animation:CrouchJump|depth=0.3|height=0.8|duration=2.0|arms=balance}

8
00:00:15,800 --> 00:00:17,800
[Zorak] 好的，走吧。
{FaceHappy}

9
00:00:18,200 --> 00:00:19,500
[Zorak]{Animation:TurnAround|target=forward|direction=left|duration=1.3}{Camera:Static|position=3,2,6|lookAt=0,1.2,0}

10
00:00:19,800 --> 00:00:21,300
[Zorak]{Animation:GenocideCutter|duration=1.5}{Camera:Static|position=3,1.8,6|lookAt=0,1.25,0}

11
00:00:21,700 --> 00:00:23,700
[Zorak]{Animation:GalaxyWhirl|duration=2.0}{Camera:Static|position=3.8,1.9,5.4|lookAt=0,1.25,0}

12
00:00:24,100 --> 00:00:25,400
[Zorak]{Animation:HeadStomp|duration=1.3}{Camera:Static|position=3.2,2.1,6.2|lookAt=0,1.25,0}
