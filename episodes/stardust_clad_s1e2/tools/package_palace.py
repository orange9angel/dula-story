"""Verify the palace master, preserve the accepted OP, then publish local aliases."""
from pathlib import Path
import argparse,json,shutil,subprocess
import numpy as np
from scipy.signal import correlate,correlation_lags
from PIL import Image
from package_release import probe,digest,read,OPENING
EP=Path(__file__).resolve().parents[1];BOARD=EP/'storyboard/palace_r19'
BODY=EP/'output/stardust_clad_s1e2_palace_r19.mp4';TV=EP/'output/stardust_clad_s1e2_palace_tv_r19.mp4'
def main():
    global BOARD,BODY,TV
    p=argparse.ArgumentParser();p.add_argument('--publish-aliases',action='store_true');p.add_argument('--version',choices=['r19','r20','r21'],default='r19');a=p.parse_args()
    version='palace_'+a.version;BOARD=EP/'storyboard'/version;BODY=EP/f'output/stardust_clad_s1e2_palace_{a.version}.mp4';TV=EP/f'output/stardust_clad_s1e2_palace_tv_{a.version}.mp4'
    for file in [BOARD/'palace_checks.json',BOARD/'physics_final/seek_check.json',EP/'assets3d/audio_sync_report.json']:assert read(file)['passed'],file
    for item in read(BOARD/'render_trace.json')['build']['inputs']:assert digest(Path(item['path']))==item['sha256'],item['path']
    body=probe(BODY,213);opening=probe(OPENING,49.2)
    shots=read(EP/'config/palace_review_shots.json');decoded=BOARD/'decoded';decoded.mkdir(exist_ok=True)
    picture=[]
    for s in shots:
        out=decoded/(s['name']+'.png')
        subprocess.run(['ffmpeg','-y','-v','error','-ss',str(s['t']),'-i',str(BODY),'-frames:v','1',str(out)],check=True)
        ref=np.asarray(Image.open(BOARD/'final_shots'/f"{s['name']}.jpg").convert('RGB'),dtype=float)
        img=np.asarray(Image.open(out).convert('RGB'),dtype=float);d=np.abs(ref-img)
        mae=float(d.mean());bad=float(np.mean(d.max(axis=2)>24));assert mae<5 and bad<.04,(s,mae,bad)
        picture.append({'t':s['t'],'frame':str(out.relative_to(EP)),'sourceMeanPixelError':round(mae,4),'largeErrorFraction':round(bad,5)})
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(BODY),'-vn','-ac','1','-ar','12000','-f','f32le','-'])
    decoded_audio=np.frombuffer(raw,np.float32)
    raw_ref=subprocess.check_output(['ffmpeg','-v','error','-i',str(EP/'assets3d/mixed.wav'),'-ac','1','-ar','12000','-f','f32le','-'])
    pcm=np.frombuffer(raw_ref,np.float32);sync=[]
    for t in [7,57,103,168,202]:
        i=round(t*12000);n=3*12000;v=decoded_audio[i:i+n];r=pcm[i:i+n];corr=correlate(v,r,method='fft');lags=correlation_lags(len(v),len(r));near=abs(lags)<=720;lag=int(lags[near][np.argmax(corr[near])]);assert abs(lag)<=12,(t,lag)
        sync.append({'t':t,'shiftMs':lag/12})
    prior=read(BOARD/'delivery_report.json') if (BOARD/'delivery_report.json').exists() else {}
    reuse_tv=TV.exists() and prior.get('body',{}).get('sha256')==body['sha256'] and prior.get('opening',{}).get('sha256')==opening['sha256'] and prior.get('mixSha256')==digest(EP/'assets3d/mixed.wav')
    if not reuse_tv:
        filters='[0:v]trim=duration=49.2,setpts=PTS-STARTPTS,setsar=1[v0];[1:v]trim=duration=213,setpts=PTS-STARTPTS,setsar=1[v1];[0:a]atrim=duration=49.2,asetpts=PTS-STARTPTS[a0];[2:a]atrim=duration=213,asetpts=PTS-STARTPTS[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]'
        subprocess.run(['ffmpeg','-y','-v','error','-i',str(OPENING),'-i',str(BODY),'-i',str(EP/'assets3d/mixed.wav'),'-filter_complex',filters,'-map','[v]','-map','[a]','-c:v','libx264','-preset','medium','-crf','18','-r','30','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',str(TV)],check=True)
    tv=probe(TV,262.2)
    report={'version':version,'body':body,'opening':opening,'tv':tv,'sourceStorySha256':digest(EP/'script.story'),'mixSha256':digest(EP/'assets3d/mixed.wav'),'pictureSamples':picture,'audioSyncSamples':sync,'aliasesPublished':False,'limits':'Decoded-frame samples and numerical checks. Not human full-film listening or aesthetic approval.'}
    if a.publish_aliases:
        archive=EP/'output/archive'/('pre_'+version);archive.mkdir(parents=True,exist_ok=True)
        for source,name in [(BODY,'craft3d_full.mp4'),(TV,'craft3d_tv_s1e2.mp4')]:
            target=EP/'output'/name;backup=archive/name
            if target.exists() and digest(target)!=digest(source):
                if backup.exists():assert digest(backup)==digest(target),'Different prior archive'
                else:shutil.copy2(target,backup)
            shutil.copy2(source,target);assert digest(source)==digest(target)
        report['aliasesPublished']=True
    (BOARD/'delivery_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'bodySeconds':213,'tvSeconds':262.2,'frames':body['frames'],'sampleChecks':len(picture),'audioSync':sync,'aliasesPublished':a.publish_aliases}))
if __name__=='__main__':main()
