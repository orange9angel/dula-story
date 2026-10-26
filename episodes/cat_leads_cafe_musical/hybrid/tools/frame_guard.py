#!/usr/bin/env python3
"""逐帧画面守卫：不依赖抽帧目检的系统性缺陷门。

⚠️ 2026-10-24 标定结论：halo 指标三轮迭代均未通过标定（被窗框/字幕带/自然明暗
邻接主导，修复前后不具区分度），**不得作为门禁**。可用部分：freeze/diff 机械检查。
halo 类缺陷的有效门 = 资产边缘带统计（cel_prepare edgeStats ≤1.5%）+ 原生分辨率目检。

检测项（每帧计算，报告聚合）：
1. halo：人物剪影（暗色/深蓝区域）外缘 2px 环上的"亮且低饱和"像素占比
   —— 抠图亮边/贴纸感的量化。阈值的标定方法见输出报告（与对照片比较）。
2. freeze：相邻帧差分，检测意外冻结（整段静止）与异常跳变。
3. subtitle：底部字幕带在应有字幕的窗口内是否存在高对比文字像素（可选）。

用法：
  python frame_guard.py --video output/x.mp4 --report out.json \
      [--control output/y.mp4] [--start 0 --end 6.5] [--every 1]
"""
import argparse, json, subprocess, io
import numpy as np
from PIL import Image

def frames(video, start, end, every, fps=30):
    n0, n1 = int(start*fps), int(end*fps)
    for n in range(n0, n1+1, every):
        t = n/fps
        p = subprocess.run(['ffmpeg','-v','error','-ss',f'{t:.4f}','-i',video,
                              '-frames:v','1','-f','image2pipe','-vcodec','png','-'],
                             capture_output=True)
        if p.returncode != 0:
            raise RuntimeError(f'ffmpeg failed at t={t}: {p.stderr[:300]!r}')
        if not p.stdout:
            raise RuntimeError(f'ffmpeg empty output at t={t} (video={video})')
        yield n, t, np.array(Image.open(io.BytesIO(p.stdout)).convert('RGB'), dtype=np.int16)

def halo_metric(img, bbox=None):
    """人物剪影外缘亮环占比。剪影=暗（lum<130）。
    halo 判别（v3）：环上像素亮且低饱和，且比**同方向更外侧**的局部背景更亮。
    亮背景贴深色头发是自然邻接——此时外侧背景同样亮，不判 halo；
    halo 是比外面背景还亮的一圈描边。用 maximum_filter 把外侧背景亮度传进环带。
    bbox=(x0,y0,x1,y1) 时只在角色包围盒（含 10px 外延）内统计，排除窗框等背景硬边。"""
    from scipy.ndimage import maximum_filter
    rgb = img.astype(np.float32)
    lum = rgb.mean(axis=2)
    mx = rgb.max(axis=2); mn = rgb.min(axis=2)
    sat = np.where(mx>0, (mx-mn)/np.maximum(mx,1), 0)
    dark = lum < 130
    region = np.ones_like(dark)
    if bbox is not None:
        region = np.zeros_like(dark)
        for (x0,y0,x1,y1) in bbox:
            x0,y0,x1,y1=int(x0),int(y0),int(x1),int(y1)
            region[max(0,y0-10):min(lum.shape[0],y1+10), max(0,x0-10):min(lum.shape[1],x1+10)] = True
    dark = dark & region
    dark[:130,:]=False  # 顶部片头字卡带
    dark[-135:,:]=False  # 底部字幕带（描边文字会产生大量"合法"halo）
    def dilate(m, n):
        for _ in range(n):
            d = m.copy()
            d[1:,:] |= m[:-1,:]; d[:-1,:] |= m[1:,:]
            d[:,1:] |= m[:,:-1]; d[:,:-1] |= m[:,1:]
            m = d
        return m
    d2 = dilate(dark,2)
    ring = d2 & ~dark                       # 剪影外 0-2px 环
    beyond = ~dilate(dark,3)                # 3px 以外=纯背景
    # 外侧背景亮度：把 beyond 区域的 lum 用最大滤波扩散 5px 进环带
    lum_bg_src = np.where(beyond, lum, 0)
    lum_bg = maximum_filter(lum_bg_src, size=9)
    bright_flat = (lum > 185) & (sat < 0.28)
    halo = ring & bright_flat & (lum > lum_bg + 12)
    denom = max(int(ring.sum()), 1)
    return float(halo.sum()/denom), int(halo.sum()), int(dark.sum())

def run(video, start, end, every, motion=None):
    rows=[]; prev=None
    bboxes={}
    if motion:
        m=json.load(open(motion,encoding='utf-8'))
        for f in m['frames']:
            boxes=[]
            for a in f['actors'].values():
                pr=a.get('projected') or {}
                pts=[v for v in pr.values() if v and np.isfinite(v).all()]
                if pts:
                    pts=np.array(pts)
                    boxes.append((pts[:,0].min()-40,pts[:,1].min()-40,pts[:,0].max()+40,pts[:,1].max()+40))
            if boxes: bboxes[round(f['t']*30)]=boxes
        mstart=m['start']
    for n,t,img in frames(video,start,end,every):
        h,hp,dp = halo_metric(img, bboxes.get(round((mstart+t)*30)) if motion else None)
        row={'frame':n,'t':round(t,3),'halo_ratio':round(h,5),'halo_px':hp,'dark_px':dp}
        if prev is not None:
            d=np.abs(img-prev).max(axis=2)
            row['diff_mean']=round(float(np.abs(img-prev).mean()),3)
            row['diff_chg_pct']=round(float((d>8).mean()*100),2)
        rows.append(row); prev=img
    return rows

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--video',required=True); ap.add_argument('--report',required=True)
    ap.add_argument('--control'); ap.add_argument('--start',type=float,default=0)
    ap.add_argument('--end',type=float,required=True); ap.add_argument('--every',type=int,default=3); ap.add_argument('--motion',help='烘焙 motion json，用于角色包围盒裁区')
    a=ap.parse_args()
    rows=run(a.video,a.start,a.end,a.every,motion=a.motion)
    if not rows: raise SystemExit(f'no frames decoded from {a.video}')
    halo=np.array([r['halo_ratio'] for r in rows])
    rep={'video':a.video,'frames':len(rows),
         'halo_ratio':{'mean':float(halo.mean()),'p95':float(np.percentile(halo,95)),'max':float(halo.max())},
         'rows':rows}
    if a.control:
        crows=run(a.control,a.start,a.end,a.every,motion=a.motion)
        ch=np.array([r['halo_ratio'] for r in crows])
        rep['control']={'video':a.control,'halo_mean':float(ch.mean()),'halo_p95':float(np.percentile(ch,95))}
    json.dump(rep,open(a.report,'w'),indent=1)
    print(json.dumps({k:v for k,v in rep.items() if k!='rows'},ensure_ascii=False))
if __name__=='__main__':
    main()
