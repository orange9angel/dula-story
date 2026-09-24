import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const here=path.dirname(fileURLToPath(import.meta.url)),original=path.resolve(here,'../painted/output/output.mp4'),film=path.join(here,'output/output.mp4');
const run=(tool,args)=>execFileSync(tool,args,{encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});
const packetInfo=file=>JSON.parse(run('ffprobe',['-v','error','-select_streams','a:0','-show_packets','-show_entries','packet=pts_time,dts_time,duration_time,size,flags','-of','json',file])).packets;
const before=packetInfo(original),after=packetInfo(film);
if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Audio packet timing changed');
const info=JSON.parse(run('ffprobe',['-v','error','-show_entries','stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels,start_time,duration,nb_frames','-of','json',film]));
const v=info.streams.find(s=>s.codec_type==='video');if(Number(v.nb_frames)!==1800||Number(v.duration)!==60)throw new Error('Unexpected video duration');
for(const [name,start,duration,fps,scale,tile] of [
  ['film_sheet',0,60,'1/3','384:216','5x4'],['arrival_motion',3.5,2,'6','480:270','4x3'],
  ['page_motion',18.5,2.5,'4','384:216','5x2'],['drawing_motion',40.5,4.5,'4','320:180','6x3'],['transfer_motion',45,4.5,'4','320:180','6x3']
])run('ffmpeg',['-y','-hide_banner','-loglevel','error','-ss',String(start),'-i',film,'-t',String(duration),'-vf',`fps=${fps},scale=${scale},tile=${tile}`,'-frames:v','1',path.join(here,`storyboard/${name}.jpg`)]);
run('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',original,'-i',film,'-filter_complex','[0:v]scale=960:540[a];[1:v]scale=960:540[b];[a][b]hstack=inputs=2[v]','-map','[v]','-map','0:a:0','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',path.join(here,'output/comparison.mp4')]);
const result={audioPacketTimingIdentical:true,audioPackets:after.length,firstAudioPacket:after[0],lastAudioPacket:after.at(-1),...info};
fs.writeFileSync(path.join(here,'storyboard/media_validation.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
