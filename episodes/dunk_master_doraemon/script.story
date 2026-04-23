1
00:00:00,000 --> 00:00:02,000
@BasketballArenaScene{Music:Play|name=epic_theme|fadeIn=1.0|baseVolume=0.80|endTime=18.0}

2
00:00:02,000 --> 00:00:05,000
[RockLee]{Walk}{Camera:FollowCharacter|characterName=RockLee|offset=6,2,0|lookAtOffset=0,1.2,0}

3
00:00:05,000 --> 00:00:06,500
[RockLee]{Dunk:Fly|hoop=north|jumpHeight=5.0|hangTime=2.0|runUpDistance=3.0|approachAngle=15}{Camera:FollowCharacter|characterName=RockLee|offset=6,3,0|lookAtOffset=0,1.5,0}{SFX:Play|name=flash_pop|offset=0.5}

4
00:00:06,500 --> 00:00:09,500
[RockLee]{Camera:OrbitCharacter|characterName=RockLee|radius=6|height=2|startAngle=0|endAngle=6.283}{SFX:Play|name=flash_pop|offset=0.5}{SFX:Play|name=flash_pop|offset=1.1}{SFX:Play|name=flash_pop|offset=1.7}{SFX:Play|name=flash_pop|offset=2.3}{SFX:Play|name=flash_pop|offset=2.9}

5
00:00:09,500 --> 00:00:12,000
[RockLee]{Camera:FollowCharacter|characterName=RockLee|offset=0,3,8|lookAtOffset=0,1.2,0}{SFX:Play|name=crowd_cheer|offset=0.0}{SFX:Play|name=flash_pop|offset=0.5}{SFX:Play|name=dunk_slam|offset=0.5}{SFX:Play|name=flash_pop|offset=1.1}{SFX:Play|name=flash_pop|offset=1.7}{SFX:Play|name=flash_pop|offset=2.3}

6
00:00:12,000 --> 00:00:16,000
[RockLee]{Celebrate}{Camera:LowAngle|targetPos=0,2,-22|distance=6}

7
00:00:16,000 --> 00:00:18,000
[RockLee]{TurnToCamera}{Camera:CloseUp|characterName=RockLee|sideAngle=15}
