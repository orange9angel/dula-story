1
00:00:00,000 --> 00:00:04,000
@CartoonKitchenScene{Position:Tom|x=-5.0|y=0.01|z=1.8|face=center}{Position:Jerry|x=2.1|y=0.01|z=0.8|face=Tom}{Camera:Static|position=0,3.2,8.5|lookAt=0,1.25,0}{Music:Play|name=tension_theme|fadeIn=1.2|fadeOut=0.8|baseVolume=0.58|endTime=22.5}{SFX:Play|name=kitchen_roomtone|endTime=90|baseVolume=0.24}{SFX:Play|name=clock_tick|endTime=82|baseVolume=0.28}

2
00:00:04,250 --> 00:00:08,000
{Event:Move|character=Tom|x=-1.8|z=1.7|duration=3.5|action=CatSneak}{Camera:Static|position=0.8,2.7,7.2|lookAt=-0.5,1.1,0.8}

3
00:00:08,250 --> 00:00:12,250
{Event:RevealCake}{SFX:Play|name=cloche_lift|offset=0.2|baseVolume=0.72}
[Tom]{CatSneak}{Animation:FaceSmirk|character=Tom}{Voice:calm}{Camera:CloseUp|characterName=Tom|distance=4.0|sideAngle=18}只吃一口，谁也不会知道。

4
00:00:12,550 --> 00:00:16,000
{Event:JerryEntrance}
[Jerry]{MouseOffer}{Animation:FaceHappy|character=Jerry}{Voice:curious}{Camera:TwoShot|characterA=Tom|characterB=Jerry|distance=7.0}见面分一半？

5
00:00:16,300 --> 00:00:19,350
{Event:OfferCrumb}
[Tom]{ShakeHead}{Animation:FaceSmirk|character=Tom}{Voice:proud}{Camera:CloseUp|characterName=Tom|distance=4.1|sideAngle=-16}一粒，不能再多。

6
00:00:19,650 --> 00:00:22,200
[Tom]{CartoonShush}{Animation:FaceSmirk|character=Tom}{Voice:teasing}{Camera:CloseUp|characterName=Tom|distance=3.8|sideAngle=12}嘘——没你的份。

7
00:00:22,500 --> 00:00:25,700
{Music:Play|name=chaos_theme|fadeIn=0.25|fadeOut=0.6|baseVolume=0.62|endTime=53.0}
[Jerry]{MouseTaunt}{Animation:FaceDetermined|character=Jerry}{Voice:defiant}{Camera:Static|position=2.2,1.55,4.6|lookAt=2.1,0.55,0.8}那我自己拿。

8
00:00:26,000 --> 00:00:29,100
{Event:UtensilThreatOne}{Animation:SurprisedJump|character=Tom}{SFX:Play|name=utensil_tink|offset=0.35|baseVolume=0.78}{Camera:Static|position=5.2,2.4,5.2|lookAt=0.5,1.15,0.5}

9
00:00:29,400 --> 00:00:32,800
{Event:UtensilThreatTwo}{Animation:CatCatchStack|character=Tom}{SFX:Play|name=cup_tap|offset=0.3|baseVolume=0.78}{Camera:Static|position=0.4,2.8,6.8|lookAt=0,1.1,0.5}

10
00:00:33,100 --> 00:00:37,300
{Event:JerryTakesSlice}{SFX:Play|name=mouse_nibble|offset=1.2|baseVolume=0.65}
[Jerry]{MouseTaunt}{Animation:FaceSmirk|character=Jerry}{Voice:teasing}{Camera:CloseUp|characterName=Jerry|distance=3.2|sideAngle=-20}多谢款待。

11
00:00:37,600 --> 00:00:40,200
{SFX:Play|name=whoosh_fast|offset=0.3|baseVolume=0.72}
[Tom]{CatPounce}{Animation:FaceAngry|character=Tom}{Voice:angry}{Camera:CloseUp|characterName=Tom|distance=4.1|sideAngle=22}站住！

12
00:00:40,500 --> 00:00:45,800
{Event:Move|character=Jerry|x=-2.6|z=1.0|duration=4.5|action=MouseScamper}{Event:Move|character=Tom|x=-1.1|z=1.5|duration=4.8|action=CatSneak}{Event:RattleRack}{SFX:Play|name=spin_whoosh|offset=0.25|baseVolume=0.72}{SFX:Play|name=plate_wobble|offset=2.7|baseVolume=0.82}{Camera:Static|position=0,3.4,8.4|lookAt=-0.5,1.1,0.5}

13
00:00:46,100 --> 00:00:50,400
{Event:SecondSlice}{Animation:CatCatchStack|character=Tom}{SFX:Play|name=pan_clatter|offset=0.35|baseVolume=0.88}{Camera:Static|position=-0.8,2.8,6.7|lookAt=-0.7,1.1,0.5}

14
00:00:50,700 --> 00:00:53,800
{Event:Move|character=Tom|x=1.0|z=0.9|duration=2.8|action=CatPounce}{SFX:Play|name=dash_whoosh|offset=0.2|baseVolume=0.76}{Camera:Static|position=0,3.0,7.4|lookAt=0,1.0,0.8}

15
00:00:54,100 --> 00:00:57,200
{Music:Play|name=chaos_theme|fadeIn=0.15|fadeOut=0.7|baseVolume=0.64|endTime=82.0}{Event:BowlTrap}{Event:Face|character=Tom|target=forward}{SFX:Play|name=bowl_drop|offset=0.2|baseVolume=0.9}
[Tom]{CatTrapPress}{Animation:FaceSmirk|character=Tom}{Voice:triumphant}{Camera:Static|position=-3.8,2.2,2.8|lookAt=0.1,0.9,0.8}这回看你往哪跑！

16
00:00:57,500 --> 00:01:01,500
{Event:BowlCrawl}{SFX:Play|name=spin_whoosh|offset=0.4|baseVolume=0.62}{Camera:Static|position=0.3,2.7,6.6|lookAt=0.7,0.8,0.4}

17
00:01:01,800 --> 00:01:05,700
{Event:RestackDishes}{Animation:CatCatchStack|character=Tom}{SFX:Play|name=plate_wobble|offset=0.35|baseVolume=0.72}{Camera:CloseUp|characterName=Tom|distance=4.2|sideAngle=-18}

18
00:01:06,000 --> 00:01:10,200
{Event:TimerEscape}{Animation:CatTrapPress|character=Tom}{SFX:Play|name=utensil_tink|offset=0.8|baseVolume=0.7}{Camera:Static|position=1.3,2.8,6.8|lookAt=0.8,0.9,0.3}

19
00:01:10,500 --> 00:01:14,300
{Event:TimerRoll}{SFX:Play|name=whoosh_fast|offset=0.4|baseVolume=0.54}{Camera:Pan|offset=3.0,0,0|lookAt=2.2,0.7,0.2|duration=3.0}

20
00:01:14,600 --> 00:01:18,100
{Event:TimerDing}{Event:Face|character=Tom|target=forward}{Animation:CatDoom|character=Tom}{SFX:Play|name=timer_ding|offset=0.2|baseVolume=0.98}{Camera:Static|position=-2.8,2.2,3.6|lookAt=0.8,0.9,0.8}

21
00:01:18,400 --> 00:01:22,600
{Event:CrockeryCrash}{Animation:FlailArms|character=Tom}{SFX:Play|name=crockery_crash|offset=0.25|baseVolume=1.0}{SFX:Play|name=cake_splat|offset=1.05|baseVolume=0.84}{Camera:Shake|intensity=0.4|duration=1.1}

22
00:01:22,900 --> 00:01:26,200
{Event:FinalCrumb}
[Jerry]{CartoonShush}{Animation:FaceSmirk|character=Jerry}{Voice:teasing}{Camera:CloseUp|characterName=Jerry|distance=3.1|sideAngle=16}嘘——

23
00:01:26,500 --> 00:01:29,500
{SFX:Play|name=footsteps_approach|offset=0|baseVolume=0.8}
[Tom]{CatDoom}{Animation:FaceSurprised|character=Tom}{Voice:worried}{Camera:CloseUp|characterName=Tom|distance=3.9|sideAngle=-10}喵……完了。

24
00:01:29,650 --> 00:01:30,000
{Transition:Fade|duration=0.35}
