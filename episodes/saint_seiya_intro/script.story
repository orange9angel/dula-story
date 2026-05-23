1
00:00:00,000 --> 00:00:05,000
@SanctuaryIntroScene{Music:Play|name=pegasus_fantasy_full|fadeIn=0.3|fadeOut=2.0|baseVolume=0.85|endTime=82.0}{Transition:Fade|duration=0.8}
{Position:Seiya|x=0|y=0.01|z=1.0|face=forward}
{Position:Aiolos|x=0|y=12|z=-2.0|face=forward}
[Seiya]{Camera:Static|position=0,3.0,14.0|lookAt=0,1.5,-5.0}

2
00:00:05,000 --> 00:00:10,000
[Seiya]{Animation:PegasusStanceEnter}{Event:HideTitle}{Event:ExtinguishZodiacFlame|index=0}{Camera:DramaticLowAngle|targetPos=0,1.2,0|startDistance=5.5|endDistance=3.0|height=0.35|startAngle=-0.8|endAngle=-0.2|duration=5.0}

3
00:00:10,000 --> 00:00:15,000
[Seiya]{Animation:PegasusCosmosIgnite}{Event:IntensifyCosmos}{Event:ShowGroundCracks}{Event:ExtinguishZodiacFlame|index=1}{Event:ExtinguishZodiacFlame|index=2}{Camera:SlowMotionOrbit|targetPos=0,1.3,0|radius=3.5|height=1.5|startAngle=0|endAngle=0.8|tilt=0.15|duration=5.0}

4
00:00:15,000 --> 00:00:20,000
[Seiya]{Animation:PegasusClothShine}{Event:ShowTempleGlow}{Event:ExtinguishZodiacFlame|index=3}{Event:ExtinguishZodiacFlame|index=4}{Camera:Static|position=0,1.8,4.5|lookAt=0,1.3,0}

5
00:00:20,000 --> 00:00:25,000
[Seiya]{Animation:PegasusMeteorPunch}{Event:LaunchMeteors}{Event:ExtinguishZodiacFlame|index=5}{Event:ExtinguishZodiacFlame|index=6}{Camera:QuickCutZoom|targetPos=0,1.2,0|startDistance=5.5|endDistance=2.2|impactTime=0.5|shakeIntensity=0.14|duration=5.0}

6
00:00:25,000 --> 00:00:30,000
[Seiya]{Animation:PegasusDramaticPose}{Event:ShowTempleGlow}{Event:ExtinguishZodiacFlame|index=7}{Camera:SlowMotionOrbit|targetPos=0,1.3,0|radius=4.0|height=1.6|startAngle=2.5|endAngle=3.8|tilt=0.1|duration=5.0}

7
00:00:30,000 --> 00:00:36,000
[Aiolos]{Animation:SagittariusDescent}{Camera:GoldenReveal|targetPos=0,1.5,0|startDistance=8.0|endDistance=3.5|startHeight=0.2|endHeight=1.0|startAngle=-0.9|endAngle=-0.3|duration=6.0}
{Event:ExtinguishZodiacFlame|index=8}{Event:ExtinguishZodiacFlame|index=9}

8
00:00:36,000 --> 00:00:41,000
[Aiolos]{Animation:SagittariusGoldenGlow}{Camera:DramaticLowAngle|targetPos=0,1.4,0|startDistance=4.5|endDistance=2.8|height=0.4|startAngle=-0.7|endAngle=-0.2|duration=5.0}
{Event:ExtinguishZodiacFlame|index=10}

9
00:00:41,000 --> 00:00:46,000
[Seiya]{Animation:PegasusTurnAndPoint}{Camera:DuelFrame|targetPos=0,1.3,0|distance=6.0|height=1.6|angle=0.4|tilt=0.08|driftAmount=0.3|duration=5.0}
{Event:ExtinguishZodiacFlame|index=11}

10
00:00:46,000 --> 00:00:51,000
[Aiolos]{Animation:SagittariusArrowDraw}{Camera:SlowMotionOrbit|targetPos=0,1.4,0|radius=3.2|height=1.7|startAngle=0.5|endAngle=1.8|tilt=0.2|duration=5.0}

11
00:00:51,000 --> 00:00:56,000
[Seiya]{Animation:PegasusCosmosIgnite}{Event:IntensifyCosmos}{Event:ShowGroundCracks}
[Aiolos]{Animation:SagittariusGoldenGlow}{Camera:DuelFrame|targetPos=0,1.3,0|distance=5.5|height=1.5|angle=0.6|tilt=0.1|driftAmount=0.2|duration=5.0}

12
00:00:56,000 --> 00:01:00,000
[Aiolos]{Animation:SagittariusArrowDraw}{Camera:ArrowFollow|targetPos=0,1.3,0|startDistance=5.0|endDistance=12.0|height=1.5|angle=0.2|shakeIntensity=0.06|duration=4.0}
{Event:LaunchMeteors}

13
00:01:00,000 --> 00:01:05,000
[Seiya]{Animation:PegasusRising}{Camera:HeroicRise|targetPos=0,1.0,0|startHeight=0.6|endHeight=2.0|distance=3.8|angle=-0.6|duration=5.0}

14
00:01:05,000 --> 00:01:12,000
[Seiya]{Animation:PegasusDramaticPose}
[Aiolos]{Animation:SagittariusGoldenGlow}{Camera:DuelFrame|targetPos=0,1.3,0|distance=5.0|height=1.7|angle=0.3|tilt=0.12|driftAmount=0.25|duration=7.0}

15
00:01:12,000 --> 00:01:20,000
[Seiya]{Animation:PegasusCosmosIgnite}{Event:IntensifyCosmos}{Event:ShowGroundCracks}{Event:LaunchMeteors}
[Aiolos]{Animation:SagittariusGoldenGlow}{Camera:SlowMotionOrbit|targetPos=0,1.3,0|radius=2.8|height=1.5|startAngle=3.5|endAngle=5.0|tilt=0.12|duration=8.0}

16
00:01:20,000 --> 00:01:25,000
[Seiya]{Animation:PegasusDramaticPose}
[Aiolos]{Animation:SagittariusGoldenGlow}{Camera:Static|position=0,2.0,6.0|lookAt=0,1.4,0}
{Event:RevealTitle}
