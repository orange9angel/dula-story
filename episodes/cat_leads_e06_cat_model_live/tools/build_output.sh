#!/bin/bash
# E06-live final build: normalize 20 shots -> concat 57.5s -> tail extension
# -> mux with ducked bed + omni/DA own audio tracks -> 1920x1080 30fps.
# Idempotent-ish: rebuilds tmp/norm each run (cheap), skips nothing critical.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live"
A="D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live/assets"
N="tmp/norm"
mkdir -p "$N" output

norm() { # src dur out -- video only 1280x720@30, clone-pad short sources
  ffmpeg -loglevel error -y -i "$1" \
    -vf "scale=1280:720:flags=lanczos,fps=30,tpad=stop_mode=clone:stop_duration=1" \
    -t "$2" -c:v libx264 -pix_fmt yuv420p -an "$N/$3.mp4" || return 1
}

# shot list: name src dur
norm "$A/i2v/f00.mp4"        4.00 s00
norm "$A/omni/omni_boy_01.mp4"  3.05 s01
norm "$A/i2v/f02.mp4"        1.45 s02
norm "tmp/cat_talk_test.mp4" 2.50 s03
norm "$A/omni/omni_girl_04.mp4" 2.50 s04
norm "$A/i2v/f05.mp4"        2.50 s05
norm "$A/omni/omni_girl_06.mp4" 2.86 s06
norm "$A/i2v/f07.mp4"        3.14 s07
norm "$A/omni/omni_girl_08.mp4" 2.00 s08
norm "$A/omni/omni_boy_09.mp4"  2.50 s09
norm "$A/i2v/f10.mp4"        3.50 s10
norm "$A/omni/omni_girl_11.mp4" 2.50 s11
norm "$A/omni/omni_boy_12.mp4"  2.50 s12
norm "$A/i2v/f13.mp4"        3.50 s13
norm "$A/i2v/f14.mp4"        4.00 s14
norm "$A/i2v/f15.mp4"        2.50 s15
norm "$A/i2v/f16.mp4"        2.50 s16
norm "$A/omni/omni_girl_17.mp4" 3.00 s17
norm "$A/i2v/f18.mp4"        3.00 s18
norm "$A/i2v/f19.mp4"        4.00 s19 || exit 1

# #20 tail: last 2.125s of f19 at 85% speed -> 2.5s + 0.5s fade out
ffmpeg -loglevel error -y -sseof -2.125 -i "$A/i2v/f19.mp4" \
  -vf "scale=1280:720:flags=lanczos,fps=30,setpts=PTS/0.85,fade=t=out:st=2.0:d=0.5" \
  -t 2.5 -c:v libx264 -pix_fmt yuv420p -an "$N/s20.mp4" || exit 1

printf "file 's00.mp4'\nfile 's01.mp4'\nfile 's02.mp4'\nfile 's03.mp4'\nfile 's04.mp4'\nfile 's05.mp4'\nfile 's06.mp4'\nfile 's07.mp4'\nfile 's08.mp4'\nfile 's09.mp4'\nfile 's10.mp4'\nfile 's11.mp4'\nfile 's12.mp4'\nfile 's13.mp4'\nfile 's14.mp4'\nfile 's15.mp4'\nfile 's16.mp4'\nfile 's17.mp4'\nfile 's18.mp4'\nfile 's19.mp4'\nfile 's20.mp4'\n" > "$N/concat.txt"
ffmpeg -loglevel error -y -f concat -safe 0 -i "$N/concat.txt" -c copy tmp/video_60s.mp4 || exit 1

DUCK="between(t,4,7.05)+between(t,8.5,11)+between(t,11,13.5)+between(t,16,18.86)+between(t,22,24)+between(t,24,26.5)+between(t,30,32.5)+between(t,32.5,35)+between(t,47.5,50.5)"

ffmpeg -loglevel error -y -i tmp/video_60s.mp4 -i "$A/audio/bed60.wav" \
  -i "$A/omni/omni_boy_01.mp4" -i "tmp/cat_talk_test.mp4" \
  -i "$A/omni/omni_girl_04.mp4" -i "$A/omni/omni_girl_06.mp4" \
  -i "$A/omni/omni_girl_08.mp4" -i "$A/omni/omni_boy_09.mp4" \
  -i "$A/omni/omni_girl_11.mp4" -i "$A/omni/omni_boy_12.mp4" \
  -i "$A/omni/omni_girl_17.mp4" \
  -filter_complex "[1:a]volume='if($DUCK,0.15,1)':eval=frame[bed];
[2:a]adelay=4000|4000,volume=1.6[v01];
[3:a]adelay=8500|8500,volume=1.6[v03];
[4:a]adelay=11000|11000,volume=1.6[v04];
[5:a]adelay=16000|16000,volume=1.6[v06];
[6:a]adelay=22000|22000,volume=1.6[v08];
[7:a]adelay=24000|24000,volume=1.6[v09];
[8:a]adelay=30000|30000,volume=1.6[v11];
[9:a]adelay=32500|32500,volume=1.6[v12];
[10:a]adelay=47500|47500,volume=1.6[v17];
[bed][v01][v03][v04][v06][v08][v09][v11][v12][v17]amix=inputs=10:duration=first:normalize=0,atrim=0:60,alimiter=limit=0.95[a]" \
  -map 0:v -map "[a]" -vf "scale=1920:1080:flags=lanczos" -r 30 \
  -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 192k -t 60 \
  output/output.mp4 || exit 1

ffprobe -v error -show_entries format=duration -of csv=p=0 output/output.mp4
echo "== build done"
