"""Build a versioned lip calibration; preserve the current V11 body/camera edit."""
from pathlib import Path
import copy
import json
import shutil
from calibrate_v12 import calibrate,digest

ROOT=Path(__file__).resolve().parents[1]

def main():
    source=ROOT/'config/music_analysis_v10.json'
    music=json.loads(source.read_text(encoding='utf-8'))
    chars,lines,report=calibrate(music)
    baseline=copy.deepcopy(music)
    # Store the exact comparator used by the existing rendered V11, because its
    # source file was modified in-place by the earlier anchoring experiment.
    (ROOT/'config/lipsync_baseline_v11.json').write_text(json.dumps({
        'lyric_chars':baseline['lyric_chars'],'lyric_lines':baseline['lyric_lines'],
        'source_sha256':digest(source),'video_sha256':digest(ROOT/'output/yuki_beat_ad_v11.mp4')},
        ensure_ascii=False,indent=2),encoding='utf-8')
    music['lyric_chars']=chars;music['lyric_lines']=lines
    music['lyric_align']={'method':report['method'],'source':'config/lipsync_calibration_v12.json',
                         'anticipation_ms':30,'global_applied_ms':report['global']['applied_ms']}
    music['timeline_source']='script_v12.story'
    music['performance_plan']='config/performance_plan_v11.json'
    (ROOT/'config/music_analysis_v12.json').write_text(json.dumps(music,ensure_ascii=False,indent=2),encoding='utf-8')
    (ROOT/'config/lipsync_calibration_v12.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    story=(ROOT/'script_v11.story').read_text(encoding='utf-8').replace('name=mixed_v11|','name=mixed_v12|')
    (ROOT/'script_v12.story').write_text(story,encoding='utf-8')
    for target in ['assets/audio/mixed_v12.wav','assets/audio/music/mixed_v12.wav']:
        shutil.copyfile(ROOT/'assets/audio/mixed_v11.wav',ROOT/target)
    assert digest(ROOT/'assets/audio/mixed_v12.wav')==music['master_sha256']
    print(json.dumps({'characters':len(chars),'anchored':report['anchored_characters'],
        'kept_dtw':report['retained_dtw_characters'],'overlaps_fixed':len(report['inherited_overlaps']),
        'global_scan':report['global'],'master_unchanged':True},ensure_ascii=False,indent=2))

if __name__=='__main__':main()
