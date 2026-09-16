"""Read the supplied public mobile share page and save its referenced media."""
from pathlib import Path
import json
import re
import urllib.request

ROOT=Path(__file__).resolve().parents[1]/'assets/reference'
ROOT.mkdir(parents=True,exist_ok=True)
url='https://www.iesdouyin.com/share/video/7683191197351606248/'
headers={'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Version/16.0 Mobile/15E148 Safari/604.1'}
try:
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=25) as r:
        html=r.read().decode('utf-8')
    (ROOT/'share_page.html').write_text(html,encoding='utf-8')
    m=re.search(r'window\._ROUTER_DATA\s*=\s*',html)
    if not m:
        print(json.dumps({'status':'No public media JSON in share page','bytes':len(html)}))
        raise SystemExit(2)
    data,_=json.JSONDecoder().raw_decode(html[m.end():])
    items=[]
    def walk(value):
        if isinstance(value,dict):
            if 'video' in value and isinstance(value['video'],dict) and 'play_addr' in value['video']:
                items.append(value)
            for v in value.values():walk(v)
        elif isinstance(value,list):
            for v in value:walk(v)
    walk(data)
    if not items:
        print(json.dumps({'status':'Public share page contains no playable video object'}))
        raise SystemExit(2)
    item=next(x for x in items if str(x.get('aweme_id'))=='7683191197351606248')
    media=item['video']['play_addr']['url_list'][0]
    with urllib.request.urlopen(urllib.request.Request(media,headers=headers),timeout=40) as r:
        content=r.read()
    (ROOT/'reference.mp4').write_bytes(content)
    meta={'source':url,'duration':item['video'].get('duration'),'description':item.get('desc'),
          'music_title':item.get('music',{}).get('title'),'use':'private reference analysis only'}
    (ROOT/'reference_metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(meta,ensure_ascii=False))
except Exception as exc:
    print(type(exc).__name__,str(exc)[:120])
    raise SystemExit(1)
