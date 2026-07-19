1
00:00:00,000 --> 00:00:04,000
@CartoonKitchenScene{Position:Tom|x=-4.2|y=0.02|z=2.0|face=center}{Position:Jerry|x=5.4|y=0.02|z=-4.9|face=Tom}{Camera:Static|position=0,3.1,8.2|lookAt=0,1.2,0.2}

2
00:00:04,250 --> 00:00:07,750
{Event:Move|character=Tom|x=-1.4|z=1.4|duration=3.1|action=CatSneak}{Camera:Static|position=-2.0,2.4,6.0|lookAt=-0.8,1.0,0.5}

3
00:00:08,000 --> 00:00:11,500
{Position:Tom|x=-1.4|y=0.02|z=1.4|face=camera}{Event:RevealCake}{SFX:Play|name=cloche_lift|offset=0.15|baseVolume=0.68}
[Tom]{Voice:proud}{Camera:Static|position=-1.4,2.0,4.7|lookAt=-1.4,1.55,1.35}嘿嘿，今晚这块蛋糕，全归我。

4
00:00:11,750 --> 00:00:15,250
{Event:JerryEntrance}{SFX:Play|name=slide_whoosh|offset=0.05|baseVolume=0.58}
[Jerry]{Voice:curious}{Camera:Static|position=0,1.8,5.4|lookAt=0,1.0,1.2}那最上面的樱桃，也归你？

5
00:00:15,500 --> 00:00:19,000
[Tom]{Voice:proud}{Camera:Static|position=-1.4,2.0,4.7|lookAt=-1.4,1.55,1.35}当然。连蛋糕屑都姓猫。

6
00:00:19,250 --> 00:00:23,000
{Event:Move|character=Jerry|x=0.9|z=0.85|duration=2.6|action=MouseScamper}{Event:Move|character=Tom|x=-0.6|z=1.2|duration=2.6|action=CatReachCake}{SFX:Play|name=whoosh_fast|offset=0.15|baseVolume=0.56}{Camera:Static|position=0,2.7,6.6|lookAt=0,0.9,0.6}

7
00:00:23,250 --> 00:00:27,000
{Event:CakePushJerry}{SFX:Play|name=slide_whoosh|offset=0.1|baseVolume=0.70}
[Jerry]{Voice:taunt}{Camera:Static|position=1.7,1.45,4.1|lookAt=0.8,0.75,0.75}好啊，那就让它自己选。

8
00:00:27,250 --> 00:00:31,000
{Event:CakeBounce}{Event:Move|character=Tom|x=-1.3|z=1.4|duration=2.4|action=CatGrab}{SFX:Play|name=whoosh_fast|offset=0.2|baseVolume=0.66}{Camera:Static|position=0,2.5,6.1|lookAt=-0.2,0.85,1.0}

9
00:00:31,250 --> 00:00:35,000
{Event:CakeRoll}{Event:JerryTakesCherry}{Event:Move|character=Jerry|x=1.8|z=1.0|duration=2.4|action=MouseDodge}{SFX:Play|name=plate_wobble|offset=0.1|baseVolume=0.68}{Camera:Static|position=0,2.2,5.8|lookAt=0.3,0.75,1.1}

10
00:00:35,250 --> 00:00:39,000
{Position:Tom|x=-1.3|y=0.02|z=1.4|face=right}{Event:CakeToTom}{SFX:Play|name=slide_whoosh|offset=0.1|baseVolume=0.72}
[Tom]{Voice:panic}{Camera:Static|position=0.6,2.05,4.6|lookAt=-0.35,1.30,1.30}等等——它选错了！

11
00:00:39,250 --> 00:00:42,500
{Position:Tom|x=-1.3|y=0.02|z=1.4|face=camera}{Event:CakeSplatTom}{Animation:CatPieFace|character=Tom}{Animation:FacePain|character=Tom}{SFX:Play|name=cake_splat|offset=0.1|baseVolume=0.92}{SFX:Play|name=impact_thud|offset=0.15|baseVolume=0.72}{Camera:Static|position=-1.3,1.75,5.6|lookAt=-1.3,1.05,1.4}

12
00:00:42,750 --> 00:00:46,500
{Event:DishesCrash}{Animation:FlailArms|character=Tom}{SFX:Play|name=crockery_crash|offset=0.1|baseVolume=0.92}{SFX:Play|name=pan_clatter|offset=0.3|baseVolume=0.78}{Camera:Static|position=0,2.8,6.5|lookAt=0,0.9,0.8}

13
00:00:46,750 --> 00:00:50,500
[Jerry]{Position:Jerry|x=1.8|y=0.02|z=1.0|face=camera}{Voice:teasing}{Camera:Static|position=1.8,1.08,3.25|lookAt=1.8,0.62,1.0}蛋糕归你，樱桃归我。

14
00:00:50,750 --> 00:00:54,500
{Event:Move|character=Jerry|x=5.4|z=-4.9|duration=3.2|action=MouseWaveGoodbye}{Animation:FaceSmirk|character=Jerry}{SFX:Play|name=whoosh_fast|offset=0.1|baseVolume=0.48}{Camera:FollowCharacter|characterName=Jerry|offset=2.0,1.15,0.3|lookAtOffset=0,0.5,0}

15
00:00:54,750 --> 00:00:58,500
[Tom]{Position:Tom|x=-1.3|y=0.02|z=1.4|face=camera}{Voice:despair}{Camera:Static|position=-1.3,1.90,3.55|lookAt=-1.3,1.58,1.4}下次……我先吃樱桃。

16
00:00:58,750 --> 00:00:59,500
{Transition:Fade|duration=0.4}
