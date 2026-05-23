1
00:00:00,000 --> 00:00:05,000
@StarSkyScene{Transition:Fade|duration=1.0}
{Position:Shiryu|x=-3|y=0|z=0|face=right}
{Position:Hyoga|x=3|y=0|z=0|face=left}
[Shiryu]{Camera:Static|position=0,3,12|lookAt=0,2,0}

2
00:00:05,000 --> 00:00:10,000
[Shiryu]{Animation:CrossArms}{Camera:Orbit|targetPos=0,2,0|radius=6|height=2|startAngle=0.3|endAngle=0.8|tilt=0.1|duration=5.0}
[Hyoga]{Animation:CrossArms}

3
00:00:10,000 --> 00:00:15,000
[Hyoga]{Animation:HandsOnHips}{Camera:Orbit|targetPos=0,2,0|radius=6|height=2|startAngle=2.5|endAngle=3.0|tilt=0.1|duration=5.0}
[Shiryu]{Animation:HandsOnHips}

4
00:00:15,000 --> 00:00:20,000
[Shiryu]{Animation:BattleStance}{Camera:Static|position=0,1.5,8|lookAt=0,2,0}
[Hyoga]{Animation:BattleStance}

5
00:00:20,000 --> 00:00:25,000
[Shiryu]{Animation:BattleStance}{Camera:ZoomIn|targetPos=0,2,0|startDistance=10|endDistance=5|duration=5.0}
[Hyoga]{Animation:BattleStance}

6
00:00:25,000 --> 00:00:30,000
[Shiryu]{Animation:BattleStance}{Camera:Static|position=0,2.5,6|lookAt=0,2,0}
[Hyoga]{Animation:BattleStance}
