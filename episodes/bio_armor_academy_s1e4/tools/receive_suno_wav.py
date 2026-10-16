"""Retrieve the WAV link returned by the user's authorized Suno download UI."""
from pathlib import Path
import urllib.request,json,hashlib,subprocess
EP=Path(__file__).resolve().parents[1];W=EP/'tmp/romcom_revision';request=W/'wav_download_request.json'
url=json.loads(request.read_text())['url']
out=EP/'assets3d/music/romcom_suno.wav'
try:
    with urllib.request.urlopen(url,timeout=120) as r:out.write_bytes(r.read())
finally:request.unlink(missing_ok=True)
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,sample_rate,channels','-of','json',str(out)]))
assert float(info['format']['duration'])>82
receipt=json.loads((EP/'config/romcom_suno_receipt.json').read_text())
metadata={'provider':'Suno','song_id':receipt['songIds'][0],'song_url':'https://suno.com/song/'+receipt['songIds'][0],
 'title':"Tomorrow's Meeting",'format':'WAV','download':'Authorized Unlock & Download in user Pro session; no player-stream extraction',
 'prompt':receipt['prompt'],'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'media':info}
out.with_suffix('.source.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
receipt.update(status='downloaded',selectedSong=metadata['song_id'],asset=str(out.relative_to(EP)).replace('\\','/'),sha256=metadata['sha256'])
(EP/'config/romcom_suno_receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'downloaded':True,'media':info,'sha256':metadata['sha256']}))
