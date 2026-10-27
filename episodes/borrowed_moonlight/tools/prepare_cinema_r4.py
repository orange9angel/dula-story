"""Episode casting and staging. Atlas operations only slice generated cels."""
from pathlib import Path
import json,copy
from PIL import Image
import numpy as np
EP=Path(__file__).resolve().parents[1]; A=EP/'hybrid/assets'; C=EP/'hybrid/config'
def save(p,o):p.write_text(json.dumps(o,ensure_ascii=False,indent=2),encoding='utf-8')
cast=json.loads((C/'art_cast_r3b.json').read_text())
base=Image.open(A/'cinema_r4/room_cast.png').convert('RGBA')
names=['alder_attend','alder_respond','eileen_attend','eileen_bottle']
# Same-image feature windows, measured in original atlas pixels.
mouths=[[407,148,22,17],[827,140,22,17],[277,837,20,17],[768,839,23,17]]
eyes=[[424,108,36,24],[835,101,36,24],[293,810,38,24],[779,811,39,24]]
for i,name in enumerate(names):
 x=i%2*543;y=i//2*724
 cell=base.crop((x,y,x+543,y+724));ys,xs=np.where(np.array(cell.getchannel('A'))>32)
 bbox=(int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1));ox=x+bbox[0];oy=y+bbox[1]
 for state,src in [('base','room_cast'),('half','room_half'),('open','room_open'),('blink','room_blink')]:
  im=Image.open(A/f'cinema_r4/{src}.png');im.crop((ox,oy,x+bbox[2],y+bbox[3])).save(A/f'cinema_r4/{name}_{state}.png')
 variants={}
 for state,feature in [('half',mouths[i]),('open',mouths[i]),('blink',eyes[i])]:
  cx,cy,rx,ry=feature;cx-=ox;cy-=oy
  variants[state]={'img':f'cinema_r4/{name}_{state}.png','rect':[cx-rx,cy-ry,rx*2,ry*2],'feather':.25}
 actor='Alder' if i<2 else 'Eileen';key='room_'+('attend' if i%2==0 else 'respond')
 cast['characters'][actor]['cels'][key]={'img':f'cinema_r4/{name}_base.png','eyeFrac':(eyes[i][1]-oy)/(bbox[3]-bbox[1]),'faceRig':{'variants':variants,'mouth':{'half':'half','open':'open'},'blink':'blink'},'bottleFrac':[(770-ox)/(bbox[2]-bbox[0]),(954-oy)/(bbox[3]-bbox[1])] if i==3 else None}
for actor,cfg in cast['characters'].items():
 for key,v in cfg['face']['variants'].items():v['feather']=.27 if key=='blink' else .22
cast['characters']['Eileen']['face']['variants']['blink']={'img':'cinema_r4/eileen_blink_clean.png','rect':[410,325,510,220],'islands':[[530,451,116,90],[792,421,116,90]],'feather':.22}
body_names=['eileen_hold_bottle','eileen_offer_lamp','eileen_hold_lamp_close','alder_touch_watch','alder_stand_hope','ladymoon_sit_throne','ladymoon_slow_raise','eileen_stand']
mouth_points=[[507,270,31,21],[510,238,31,22],[517,256,32,22],[538,252,34,23],[540,202,33,23],[507,257,26,18],[522,196,26,18],[513,241,33,23]]
eye_points=[[[487,213,33,23],[556,228,32,23]],[[472,179,34,27],[548,178,34,27]],[[473,214,34,25],[547,198,34,25]],[[527,182,28,20],[575,198,26,20]],[[500,140,28,21],[552,135,28,21]],[[466,213,30,20],[524,211,30,20]],[[496,158,30,20],[548,150,30,20]],[[474,185,34,27],[550,185,34,27]]]
for i,name in enumerate(body_names):
 a,key=name.split('_',1);actor={'eileen':'Eileen','alder':'Alder','ladymoon':'LadyMoon'}[a]
 variants={}
 for state in ['half','open','blink']:
  islands=eye_points[i] if state=='blink' else [mouth_points[i]]
  x=min(v[0]-v[2] for v in islands);y=min(v[1]-v[3] for v in islands);w=max(v[0]+v[2] for v in islands)-x;h=max(v[1]+v[3] for v in islands)-y
  variants[state]={'img':f'cinema_r4/body_{state}.png','rect':[x,y,w,h],'sourceRect':[i%4*400+x-300,i//4*400+y,w,h],'sourceSize':[1600,800],'islands':islands,'feather':.3}
 cast['characters'][actor]['cels'][key]['faceRig']={'variants':variants,'mouth':{'half':'half','open':'open'},'blink':'blink'}
save(C/'art_cast_r4.json',cast)
cast['shots'].setdefault('m48',{})['Eileen']={'cel':'portrait','emotionTimeline':[[352,'worried'],[355.7,'determined'],[359.5,'sad']]}
cast['shots'].setdefault('m05',{})['Eileen']={'cel':'portrait','emotionTimeline':[[35,'curious'],[39,'worried']]}
save(C/'art_cast_r4.json',cast)
s=json.loads((C/'cinema_staging.json').read_text())
old=lambda cel='room_attend':{'cel':cel,'at':[700,925,402]}
girl=lambda cel='room_attend':{'cel':cel,'at':[1230,930,274]}
for key,sh in s['shots'].items():
 if sh['scene']!='clocktower':continue
 sh.pop('portrait',None)
 if key=='m13':
  sh['actors']['Alder']=old();sh['actors']['Eileen']['to']=[1230,930,274]
  sh['camera']={'from':[960,700,1.18],'to':[960,640,1.22]}
 elif key=='m14':sh.update(actors={'Alder':old()},camera={'from':[777,680,2.3],'to':[777,670,2.48]})
 elif key=='m15':sh.update(actors={'Alder':old(),'Eileen':girl()},camera={'from':[958,710,1.68],'to':[958,710,1.73]})
 elif key=='m16':sh.update(actors={'Alder':old(),'Eileen':girl()},camera={'from':[756,658,3.0],'to':[756,658,3.08]})
 elif key=='m18':
  sh.update(actors={'Alder':old(),'Eileen':girl()},camera={'from':[1112,744,2.35],'to':[1112,736,2.5]})
  sh['actors']['Eileen'].update(at=[1230,930,274],to=[1200,914,274],walk={'steps':2,'start':132.2,'end':133.8},cel='walk')
 elif key=='m19':sh.update(actors={'Alder':old(),'Eileen':girl()},camera={'from':[768,657,3.02],'to':[780,665,3.02]})
 elif key=='m20':sh.update(actors={'Eileen':girl('room_respond')},camera={'from':[1195,782,4.0],'to':[1195,782,4.18]})
 elif key=='m21':sh.update(actors={'Eileen':girl('room_respond')},camera={'from':[1210,745,3.8],'to':[1210,742,3.72]})
 elif key=='m22':sh.update(actors={'Alder':old('room_respond'),'Eileen':girl('room_respond')},camera={'from':[775,650,3.05],'to':[775,646,3.15]})
 elif key=='m23':sh.update(actors={'Alder':old('room_respond'),'Eileen':girl('room_respond')},camera={'from':[1133,733,3.12],'to':[1133,733,3.22]})
 elif key=='m24':sh.update(actors={'Alder':old('room_respond'),'Eileen':girl('room_respond')},camera={'from':[960,655,1.38],'to':[960,610,1.12]})
s['shots']['m45']['actors']['Eileen']['at']=[650,1100,1060]
save(C/'cinema_staging_r4.json',s)
src=(EP/'hybrid/art_pass_r3b.js').read_text(encoding='utf-8')
src=src.replace("import {createLockedVariantFace} from './assets/draw_over_runtime/locked-variant-face.js';","import {createFeatheredVariantFace as createLockedVariantFace} from './assets/draw_over_runtime/feathered-variant-face.js';\nimport {directRoomActor,roomComposite,storyParticles,performanceMotion} from './cinema_direction_r4.js';")
src=src.replace('cinema_staging.json','cinema_staging_r4.json').replace('art_cast_r3b.json','art_cast_r4.json').replace('manifest_r3b.json','manifest_r4.json')
src=src.replace("variants[k]={src:'./assets/'+v.img,rect:v.rect}","variants[k]={...v,src:'./assets/'+v.img}")
src=src.replace('cels.register(celKey,trimmed);',"""if(def.faceRig){
      const vr={};for(const [k,v] of Object.entries(def.faceRig.variants))vr[k]={...v,src:'./assets/'+v.img};
      meta.face=await createLockedVariantFace({id:celKey,base:'./assets/'+def.img,variants:vr,mouth:def.faceRig.mouth,blink:def.faceRig.blink});
    }
    cels.register(celKey,trimmed,{dynamic:!!meta.face});""")
src=src.replace('for(const [actor,spec] of Object.entries(sd.actors)){','for(const [actor,authored] of Object.entries(sd.actors)){\n    const spec=directRoomActor(actor,authored,t,shot);')
src=src.replace("const color=shot.scene==='clocktower'?[1,.90,.76]", "const color=shot.scene==='clocktower'?[.84,.75,.63]")
src=src.replace('b.w=meta.canvas.width/meta.canvas.height*b.h;',"""b.w=meta.canvas.width/meta.canvas.height*b.h;
      if(meta.face){
        const state=meta.face.paint({jaw:jawFor(actor,t),blink:blinkFor(actor,t)});
        const q=meta.canvas.getContext('2d');q.clearRect(0,0,meta.canvas.width,meta.canvas.height);q.drawImage(meta.face.canvas,-meta.bbox[0],-meta.bbox[1]);
        b.facial=state;b.eyeScreen=[b.x,b.y-b.h*(1-meta.eyeFrac)];
      }
      b.bottleFrac=meta.def.bottleFrac;""")
src=src.replace("cels.render();g.drawImage(celRenderer.domElement,0,0);", "cels.render();g.drawImage(celRenderer.domElement,0,0);\n  roomComposite(g,{t,shot,sd,camera,bodies,canvas:celRenderer.domElement});",1)
src=src.replace('particles(g,t,sd,true);','particles(g,t,sd,true);\n  storyParticles(g,{t,shot,camera,bodies,faceStates,getLamp});')
src=src.replace('function paintedFX(t,f,bodies,faceStates,camera){return drawRegisteredFX',"function paintedFX(t,f,bodies,faceStates,camera){if(segAt(t).scene==='clocktower')return{scene:'clocktower',replacedBy:'story-particles'};return drawRegisteredFX")
src=src.replace("const b=((t+BLINK_PHASE[actor])%4.7);return b<.16?Math.sin(b/.16*Math.PI):0;", "const b=((t+BLINK_PHASE[actor])%4.31);return b<.24?Math.sin(b/.24*Math.PI):0;")
src=src.replace('time:t,breath:.55,order:', 'time:t,breath:.55,...performanceMotion(actor,t,shot),order:')
src=src.replace('const cfg=JAW_CFG[line.speaker]??{half:.085,open:.31};', '''const preset=JAW_CFG[line.speaker]??{half:.085,open:.31};
  const positive=line.jaw.filter(v=>v>.008).sort((a,b)=>a-b),p80=positive[Math.floor(positive.length*.8)]??.4;
  const k=Math.max(.40,Math.min(1,p80/.48));
  const cfg={half:Math.max(.025,preset.half*k),open:Math.max(.09,preset.open*k)};''')
# A deterministic schedule responds to phrase endings and also covers listening.
begin=src.index('const BLINK_PHASE=');end=src.index('function emotionFor(',begin)
src=src[:begin]+'''const blinkTimes={};
for(const [i,actor] of ['Eileen','Alder','LadyMoon'].entries()){
  const times=[];let at=1.3+i*1.1,n=0;
  while(at<END){times.push(at);at+=3.0+((Math.sin(++n*8.12+i*3.7)+1)/2)*2.7;}
  for(const l of envs.lines.filter(l=>l.character===actor))times.push(l.t0+l.dur+.15);
  times.sort((a,b)=>a-b);blinkTimes[actor]=times.filter((v,j)=>!j||v-times[j-1]>.65);
}
function blinkFor(actor,t){for(const at of blinkTimes[actor]??[]){const u=(t-at)/.23;if(u>=0&&u<=1)return Math.sin(u*Math.PI);}return 0;}
function snapToBlink(actor,t0){const at=(blinkTimes[actor]??[]).find(v=>v>=t0&&v-t0<.65);return at===undefined?t0:at+.115;}
''' +src[end:]
src=src.replace('window.__motion=motion;', 'window.__motion=motion;\nwindow.__r4={faces,celMeta,envs,blinkTimes,jawFor};')
src=src.replace('Math.floor((t-line.t0)/line.dt)','Math.floor((Math.floor((t-line.t0)*15)/15)/line.dt)')
(EP/'hybrid/art_pass_r4.js').write_text(src,encoding='utf-8')
(EP/'hybrid/art_pass_r4.html').write_text((EP/'hybrid/art_pass_r3b.html').read_text().replace('art_pass_r3b.js','art_pass_r4.js'),encoding='utf-8')
manifest=json.loads((A/'manifest_r3b.json').read_text());paths={v['path'] for v in manifest['assets']}
for p in (A/'cinema_r4').glob('*.png'):
 rel=p.relative_to(A).as_posix()
 if rel not in paths:manifest['assets'].append({'path':rel})
save(A/'manifest_r4.json',manifest)
cfg=json.loads((C/'cinema_r3_full.json').read_text());p=cfg['pilot']
p.update(viewer='hybrid/art_pass_r4.html?capture=1',board='storyboard/cinema_r4/preview',output='output/borrowed_moonlight_cinema_r4.mp4',samples=[95,104,110,112,118,120,134,142,151,156,163,172,180,38,65,71,214,332,346,354,370,465])
p['repeatSamples']=[110,172,354]
p['sourceFiles']+=['hybrid/art_pass_r4.js','hybrid/cinema_direction_r4.js','hybrid/config/art_cast_r4.json','hybrid/config/cinema_staging_r4.json','hybrid/assets/manifest_r4.json']
p['assetDirectories']+=['hybrid/assets/cinema_r4']
save(C/'cinema_r4_preview.json',cfg)
print('R4 cast, contact-preserving room staging, and runtime prepared')
