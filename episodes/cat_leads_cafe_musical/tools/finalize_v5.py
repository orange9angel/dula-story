"""Update the selected candidate only after final-media verification exists."""
from pathlib import Path
import json,hashlib
EP=Path(__file__).resolve().parents[1]
def read(p):return json.loads((EP/p).read_text(encoding='utf-8-sig'))
def write(p,d):(EP/p).write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
qc=read('config/unified_delivery_qc_v5.json')
assert qc['audioUnchanged'] and all(v['fullDecode']=='passed' for v in qc['exports'])
p=read('config/production.json')
p.update(selectedVideo='output/half_beat_sunshine_craft3d_v5.mp4',pilotSeconds=27.5,status='v5 r5 candidate: original face restored; posterior fitting, blink repair, waist overlap and released arms; artistic review pending')
p['userRevisionRequest']='Original generated head size is correct; added skull too big, hair/ears doubled, waist gap and puppet-like raised arms. First V5 head reconstruction rejected for reduced attractiveness.'
p['qualityStatus'].update(animatedIdentity='Original face recipe and front hair restored; common posterior depth map retains frontal XY and source UVs. Blink skin sampling corrected.',continuousActing='Same actors for dialogue and song; low arm releases and alternating single-hand responses follow original beat grid; original foot/root curves unchanged.',finalVideo='107.5s 1080p30 V5 candidate; see final-media QC. Normal-speed audiovisual review not claimed.',skirt='Waist overlaps shirt hem; finite leg-capsule checks only. Arm-owned skin protected from old skirt clipping.')
write('config/production.json',p)
s=read('config/image_sources.json');s['selectedRender']=p['selectedVideo'];write('config/image_sources.json',s)
review={'candidate':'v5 r5 plus blink skin-sampling fix','firstHeadAttempt':'rejected by user: 两个人的颜值都急剧下降','userArtApproval':False,'normalSpeedAudiovisualReview':False,'sourceRevisions':{'assets':'c9c4e4f','skills':'76e7eee','engine':'d973335'},'reviewedEvidence':['storyboard/turns/integration_v5r5/Girl_sheet.jpg','storyboard/turns/integration_v5r5/Boy_sheet.jpg','storyboard/integration_v5/Girl_comparison.jpg','storyboard/integration_v5/Boy_comparison.jpg','storyboard/integration_v5/Boy_blink_1.jpg','storyboard/integration_v5/blink_26.8.jpg','storyboard/integration_v5/final_blink_26_8.jpg','storyboard/integration_v5/final_dialogue_4.jpg','storyboard/integration_v5/waist_comparison.jpg'],'knownLimitations':['Girl strong-profile temple/neck hair folding and seam','Boy strong-profile hair stretching and eye occlusion','Limited garment/sole proxies; not full mesh collision proof','Original wardrobe and painted shading still differ from source illustration'],'scope':'Static regional comparisons, actual-shot blink frames, decoded-video samples and numeric audits; final acceptance remains with user'}
review['evidenceSha256']={f:hashlib.sha256((EP/f).read_bytes()).hexdigest() for f in review['reviewedEvidence']}
write('config/integration_review_v5.json',review)
print('V5 selected as review candidate; rejected attempt and limits explicitly retained.')
