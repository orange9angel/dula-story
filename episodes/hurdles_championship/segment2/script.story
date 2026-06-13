1
00:00:00,000 --> 00:00:04,000
@StadiumScene
{Position:Reporter|x=7.2|z=-51.8|face=forward}
{Position:Zorak|x=-1.83|z=-50.5|face=forward}
{Position:Klaw|x=-0.61|z=-50.5|face=forward}
{Position:Vex|x=0.61|z=-50.5|face=forward}
{Position:Rex|x=1.83|z=-50.5|face=forward}
{Position:DiscoWorm|x=3.05|z=-50.5|face=forward}
{Zorak}{Crouch|level=deep}
{Klaw}{Crouch|level=deep}
{Vex}{Crouch|level=deep}
{Rex}{Crouch|level=deep}
{DiscoWorm}{WormWiggle|duration=2.0}
{DiscoWorm}{FaceHappy}
{Music:Play|name=race_chase|fadeIn=0.3|baseVolume=0.40|endTime=50.0}
{SFX:Play|name=dash_whoosh}
[Reporter] 跑！
{Zorak}{Run|frequency=4.2|legLift=high|duration=2.5}
{Klaw}{Run|frequency=3.9|legLift=high|duration=2.5}
{Vex}{Run|frequency=4.0|legLift=high|duration=2.5}
{Rex}{Run|frequency=3.1|legLift=mid|duration=2.5}
{DiscoWorm}{WormTunnel|duration=2.5}
{Event:Move|character=Zorak|x=-1.83|z=-30.0|duration=2.0|action=Run|frequency=4.2|legLift=high}
{Event:Move|character=Klaw|x=-0.61|z=-30.0|duration=2.0|action=Run|frequency=3.9|legLift=high}
{Event:Move|character=Vex|x=0.61|z=-30.0|duration=2.0|action=Run|frequency=4.0|legLift=high}
{Event:Move|character=Rex|x=1.83|z=-30.0|duration=2.0|action=Run|frequency=3.0|legLift=mid}
{Event:Move|character=DiscoWorm|x=3.05|z=-40.0|duration=2.0|action=WormTunnel}
{Camera:Static|position=5.4,3.0,-62|lookAt=0,0.8,-39}

2
00:00:04,000 --> 00:00:24,000
{Zorak}{CrouchJump|height=1.85|duration=0.9|arms=balance}
{Klaw}{CrouchJump|height=1.45|duration=0.8|arms=guard}
{Vex}{CrouchJump|height=2.05|duration=1.0|arms=balance}
{Zorak}{FaceDetermined}
{Event:HurdleRun|character=Zorak|x=-1.83|fromZ=-30.0|z=0.0|duration=19.9|jumpHeight=1.85|action=Run|frequency=4.2|legLift=high|arms=balance}
{Event:HurdleRun|character=Klaw|x=-0.61|fromZ=-30.0|z=0.0|duration=19.9|jumpHeight=1.45|action=Run|frequency=4.0|legLift=high|arms=guard}
{Event:HurdleRun|character=Vex|x=0.61|fromZ=-30.0|z=0.0|duration=19.9|jumpHeight=2.1|action=Run|frequency=4.0|legLift=high|arms=balance}
{Event:HurdleRun|character=Rex|x=1.83|fromZ=-30.0|z=0.0|duration=19.9|jumpHeight=1.55|action=Run|frequency=2.8|legLift=mid|arms=reach}
{Event:Move|character=DiscoWorm|x=3.05|z=-15.0|duration=19.9|action=WormTunnel}
{Camera:RaceSideTrack|sideX=-16.0|height=2.15|lookAtY=0.95|trackWidth=8.5|frameDepth=38|leaderBias=0.52|fov=74|duration=19.9|racers=Zorak,Klaw,Vex,Rex,DiscoWorm}

3
00:00:24,000 --> 00:00:39,000
{Zorak}{CrouchJump|height=1.85|duration=0.9|arms=balance}
{Vex}{CrouchJump|height=2.2|duration=1.0|arms=balance}
{Zorak}{FaceHappy}
{Event:HurdleRun|character=Zorak|x=-1.83|fromZ=0.0|z=30.0|duration=14.9|jumpHeight=1.85|action=Run|frequency=4.2|legLift=high|arms=balance}
{Event:HurdleRun|character=Klaw|x=-0.61|fromZ=0.0|z=30.0|duration=14.9|jumpHeight=1.45|action=Run|frequency=3.8|legLift=high|arms=guard}
{Event:HurdleRun|character=Vex|x=0.61|fromZ=0.0|z=30.0|duration=14.9|jumpHeight=2.2|action=Run|frequency=4.0|legLift=high|arms=balance}
{Event:HurdleRun|character=Rex|x=1.83|fromZ=0.0|z=30.0|duration=14.9|jumpHeight=1.55|action=Run|frequency=2.7|legLift=mid|arms=reach}
{Event:Move|character=DiscoWorm|x=3.05|z=15.0|duration=14.9|action=WormTunnel}
{Camera:Static|position=-12.0,2.5,15.0|lookAt=0,1.0,15.0}

4
00:00:39,000 --> 00:00:49,000
{Zorak}{CrouchJump|height=1.9|duration=0.9|arms=balance}
{Zorak}{FaceAngry}
{SFX:Play|name=dash_whoosh}
{Event:HurdleRun|character=Zorak|x=-1.83|fromZ=30.0|z=60.0|duration=9.9|jumpHeight=1.9|action=Run|frequency=4.3|legLift=high|arms=balance}
{Event:HurdleRun|character=Klaw|x=-0.61|fromZ=30.0|z=60.0|duration=9.9|jumpHeight=1.45|action=Run|frequency=3.5|legLift=high|arms=guard}
{Event:HurdleRun|character=Vex|x=0.61|fromZ=30.0|z=60.0|duration=9.9|jumpHeight=2.3|action=Run|frequency=3.8|legLift=high|arms=balance}
{Event:HurdleRun|character=Rex|x=1.83|fromZ=30.0|z=60.0|duration=9.9|jumpHeight=1.55|action=Run|frequency=2.5|legLift=mid|arms=reach}
{Event:Move|character=DiscoWorm|x=3.05|z=45.0|duration=9.9|action=WormTunnel}
{Camera:Static|position=0,1.8,58.4|lookAt=0,1.08,55}

5
00:00:49,000 --> 00:00:52,000
{Position:Zorak|x=-3|z=45|face=camera}
{Position:Klaw|x=-1.5|z=43|face=camera}
{Position:Vex|x=1.5|z=44|face=camera}
{Position:Rex|x=3|z=42|face=camera}
{Position:DiscoWorm|x=0|z=38|face=camera}
{Zorak}{FaceHappy}
{Klaw}{FaceHappy}
{Vex}{FaceHappy}
{Rex}{FaceSmirk}
{DiscoWorm}{FaceHappy}
{Camera:Static|position=0,1.8,58.4|lookAt=0,1.08,55}
