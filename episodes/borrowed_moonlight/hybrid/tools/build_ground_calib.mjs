// R2 地面标定构建：把人工读数（帧时刻 + 屏幕坐标）转成底图空间地面线，写 ground_calib.json。
// 读数来源：storyboard/a4/full 采样帧与 frames_ground/ 逐帧目检（记录在每个点的 note）。
// 豁免项（none/stairs/veiled/platform）也全量登记——64 拍×可见角色全覆盖，probe 按表断言。
// 用法：node hybrid/tools/build_ground_calib.mjs  （需 4217 静态服务在跑）
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..'),storyRoot=path.resolve(root,'../..');
const require=createRequire(path.join(storyRoot,'node_modules/dula-engine/package.json')),puppeteer=require('puppeteer');

// 人工读数表：shots[shotId][actor] = {mode:'ground', pts:[[t,screenX,screenY],...], tol?}
//   ——屏幕坐标为脚底应落的底图地面线（全幅 1280×720 读数）；builder 转 plate 空间线段。
const READINGS={
  // S01 雪夜（s01_snowtown_night）
  m04:{Eileen:{mode:'ground',pts:[[27.5,818,642],[31,694,517],[34.5,640,530]],note:'走向塔门：起幅雪地→中段雪径→末幅塔门基座（末幅 bake 461 落在塔身横梁，人工改读门基 530；中段 bake 实测已贴地）'}},
  m11:{Eileen:{mode:'ground',pts:[[78.5,422,705],[81,542,651],[83.5,608,520]],note:'前景雪地→塔门台阶（三点折线：深度推进非直线）'}},
  m12:{Eileen:{mode:'ground',pts:[[87,645,516]],note:'静立于塔门前雪地'}},
  m50:{Alder:{mode:'ground',pts:[[378,690,635]],note:'塔前雪地（A4 已验证贴地）'}},
  m54:{Alder:{mode:'ground',pts:[[400.5,694,512],[406.5,698,518]],note:'塔门口地面（A4 已验证）'}},
  m56:{Alder:{mode:'ground',pts:[[412.5,518,593],[416.5,407,600]],note:'横移拍：A4 shiftXY 修正后的屋前雪院线（人工读数）'}},
  m59:{Eileen:{mode:'platform',note:'塔顶外挑阳台（世界锚 (0,21.24,-12.4)）底图无此构件——画补阳台平台'}},
  m63:{Alder:{mode:'veiled',note:'终幕黑纱下不可见'}},
  m64:{Alder:{mode:'veiled',note:'终幕黑纱下不可见'},Eileen:{mode:'veiled',note:'终幕黑纱下仅铜灯可读'}},
  // S01 春（s01_snowtown_spring）
  m58:{Alder:{mode:'ground',pts:[[425,668,545]],note:'塔门草甸线（A4 groundY 修正已验证）'}},
  m62:{Alder:{mode:'ground',pts:[[456,893,575]],note:'右房屋前草甸线（A4 groundY 修正已验证）'}},
  // S02 工坊（s02_clocktower_workshop）
  m13:{Eileen:{mode:'ground',pts:[[92,818,600],[100.5,766,700]],note:'木地板（末幅 coverage clamp 后实测：地板延伸覆盖，脚底落 700）'},
       Alder:{mode:'ground',pts:[[95,640,592]],tol:22,note:'工作台后方，脚底被台面遮挡（容差放宽）'}},
  m14:{Alder:{mode:'ground',pts:[[105,661,545]],tol:22,note:'工作台后方，桌腿间地板线'}},
  m15:{Eileen:{mode:'ground',pts:[[113.5,705,693]],tol:16,note:'蹲放灯，灯底（水彩软边）落前景地板——以画内灯底接触为准，非 bake 根（蹲姿根低于灯底）'},
       Alder:{mode:'ground',pts:[[113.5,746,496]],tol:22,note:'工作台后方'}},
  m24:{Eileen:{mode:'ground',pts:[[181,732,682]],note:'工作台右侧地板'},
       Alder:{mode:'ground',pts:[[181,640,581]],tol:22,note:'工作台后方'}},
  // S03 星阶顶（s03_star_stairs）
  m28:{Eileen:{mode:'ground',pts:[[209.5,687,636]],note:'屋顶瓦面'},Alder:{mode:'ground',pts:[[209.5,473,504]],note:'屋顶瓦面（护栏内）'}},
  m36:{Eileen:{mode:'ground',pts:[[264,546,689]],note:'屋顶走向天窗（此拍仍在屋面）'}},
  m37:{Eileen:{mode:'stairs',note:'登上悬浮星阶——脚踩 bake 台阶锚是正解，不贴底图地面'}},
  // S04 月宫（s04_moon_palace）
  m38:{Eileen:{mode:'ground',pts:[[276.5,705,520],[283.5,668,507]],note:'镜面地板走进'}},
  m40:{Eileen:{mode:'ground',pts:[[296.5,311,733],[299.5,365,662]],note:'镜面地板小心走近'}},
  m43:{LadyMoon:{mode:'ground',pts:[[320,619,680]],tol:22,note:'起身站立，裙摆罩脚+镜面反射承担接触'}},
  m44:{Eileen:{mode:'ground',pts:[[328,745,532]],note:'镜面地板（失光全景）'}},
};
// 豁免登记（probe 覆盖断言用）：其余拍=肖像/出画/无人/已锚定
const EXEMPT_REASONS={
  portrait:'肖像拍（整肖像当镜头，无地面接触）',macro:'微距/特写拍，脚底出画',
  below:'脚底在画幅下缘外',nobody:'拍内无角色落地',seated:'王座坐姿，root=座面锚（A3 已验证）',
  covered:'被肖像层遮挡',culled:'整画出画剔除',
};

const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:4217/hybrid/art_pass.html?capture=1');
  await page.waitForFunction('window.ready===true',{timeout:60000});
  const result=await page.evaluate((READINGS)=>{
    const art=window.__art;
    const W=1280,H=720,OVERSCAN=1.2,PLATE_W=1920,PLATE_H=1080;
    const shots={};
    for(const [sid,actors] of Object.entries(READINGS)){
      const out={};
      for(const [actor,e] of Object.entries(actors)){
        if(e.mode!=='ground'){out[actor]={mode:e.mode,note:e.note};continue;}
        const line=e.pts.map(([t,sx,sy])=>{
          const st=art.state(t),pt=st.plateView;
          const s=(Math.max(W/PLATE_W,H/PLATE_H)*OVERSCAN)*pt.z;
          return [+((sx-pt.cx)/s+PLATE_W/2).toFixed(1),+((sy-pt.cy)/s+PLATE_H/2).toFixed(1)];
        });
        out[actor]={mode:'ground',line,tol:e.tol??14,note:e.note,plate:art.state(e.pts[0][0]).plate};
      }
      shots[sid]=out;
    }
    return shots;
  },READINGS);
  if(errors.length)throw new Error(errors.join('\n'));
  const calib={schema:'ground-calib-v1',tolerancePx:14,
    note:'R2 地面标定：line=底图(1920×1080)像素坐标线段（人工读数经 plateTransform 反解）；每帧按脚底屏幕 x→底图 x→线插值→屏幕 gy 对齐。exempt=豁免（reason 见注）。',
    exemptions:EXEMPT_REASONS,shots:result};
  fs.writeFileSync(path.join(root,'hybrid/config/ground_calib.json'),JSON.stringify(calib,null,1));
  console.log('ground_calib.json written,',Object.keys(result).length,'shots with entries');
}finally{await browser.close();}
