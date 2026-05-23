1
00:00:00,000 --> 00:00:03,000
@FeudalForestScene{Music:Play|name=wonder_theme|fadeIn=1.5|baseVolume=0.12|endTime=70}
{Position:Kagome|x=-1.4|y=0.01|z=1.4|face=Inuyasha}
{Position:Inuyasha|x=1.1|y=0.01|z=0.6|face=Kagome}
{Position:Yokai|x=0|y=0.01|z=-6|face=Kagome}
{Transition:Iris|duration=0.9}

2
00:00:04,000 --> 00:00:08,000
[Kagome]{Position:Kagome|x=-1.4|y=0.01|z=1.4|face=Inuyasha}{Animation:LookAround}{Voice:worried}{Camera:CloseUp|characterName=Kagome|distance=3.0|sideAngle=25} 气味不对...碎片就在御神木附近。

3
00:00:09,000 --> 00:00:14,000
[Inuyasha]{Position:Inuyasha|x=1.1|y=0.01|z=0.6|face=Kagome}{Animation:GuardStance}{Voice:determined}{Camera:TwoShot|characterA=Kagome|characterB=Inuyasha|distance=5} 少啰嗦，我早闻到了。站到我后面。

4
00:00:15,000 --> 00:00:19,000
{Event:ShowMiasma|pulse=1}
{Event:SetWeather|type=fog}
[Yokai]{Position:Yokai|x=0|y=0.01|z=-6|face=Kagome}{Animation:Tremble}{Voice:angry}{Camera:LowAngle|distance=5|height=1.2} 碎片...交出来...

5
00:00:20,000 --> 00:00:25,000
[Kagome]{Animation:ArcheryAim}{Voice:focused}{Camera:Static|position=-3.4,2.0,3.6|lookAt=-1.3,1.35,0.7} 犬夜叉，瘴气太厚！先破开黑雾！

6
00:00:26,000 --> 00:00:30,000
[Inuyasha]{Animation:DrawTessaiga}{Voice:angry}{Camera:LowAngle|distance=4.2|height=1.1} 看我的。铁碎牙，醒过来！

7
00:00:31,000 --> 00:00:33,000
{Event:Move|character=Inuyasha|x=0.1|y=0.01|z=-1.8|duration=1.0|action=Run}
{Event:WindScarTrail|pulse=1}
{Transition:Flash|duration=0.5|flashColor=0xfff1aa}

8
00:00:33,000 --> 00:00:38,000
[Inuyasha]{Animation:WindScar}{Voice:angry}{Camera:Shake|intensity=0.35|duration=1.0} 风之伤！

9
00:00:39,000 --> 00:00:44,000
{Event:PurifyMiasma|pulse=1}
[Kagome]{Animation:ArcheryAim}{Voice:focused}{Camera:Static|position=-3.3,2.1,3.2|lookAt=-1.0,1.35,-1.6} 现在！破魔之箭，净化它！

10
00:00:45,000 --> 00:00:50,000
{Event:Move|character=Yokai|x=0|y=0.01|z=-9|duration=1.4|action=Run}
{Event:ShardGlow|pulse=1}
[Yokai]{Animation:FlailArms}{Voice:scared} 光...太亮了！

11
00:00:51,000 --> 00:00:56,000
[Inuyasha]{Animation:PointForward}{Camera:Static|position=-2.4,2.0,1.4|lookAt=0,1.2,-1.8} 哼，没什么了不起。戈薇，碎片呢？

12
00:00:57,000 --> 00:01:02,000
[Kagome]{Animation:Nod}{Voice:worried}{Camera:CloseUp|characterName=Kagome|distance=2.8|sideAngle=25} 没事。可我看见了另一道影子。

13
00:01:03,000 --> 00:01:08,000
[Inuyasha]{Animation:CrossArms}{Voice:determined}{Camera:TwoShot|characterA=Kagome|characterB=Inuyasha|distance=5} 那就追。天亮前，我把它揪出来。
