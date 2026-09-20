"""Replace only E08 OP's closing still; preserve the original AAC and leading GOPs.

The input is the reviewed 2132-frame OP. The last clean keyframe is 65.2 s;
the 0.8 s closing dissolve begins at frame 1976 (65.866667 s). Reconstruct
its outgoing river shot from the source film so the old sunset cannot bleed
through the new transition. Output is a sibling for verification before use.
"""
from pathlib import Path
import argparse
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OP = ROOT / 'volcano/op'
TMP = ROOT / 'volcano/tmp/op_endcard_style'
FONT = 'C\\:/Windows/Fonts/STKAITI.TTF'


def run(args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)


def probe(path):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)
    ]))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=OP / 'op.mp4')
    parser.add_argument('--output', type=Path, default=OP / 'op_endcard_v2.mp4')
    args = parser.parse_args()
    assert args.source.resolve() != args.output.resolve(), 'Verify the sibling output first.'
    info = probe(args.source)
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    assert (video['width'], video['height'], video['r_frame_rate'], int(video['nb_frames'])) == (1920, 1080, '30/1', 2132)
    assert video['sample_aspect_ratio'] == '8:7'
    TMP.mkdir(parents=True, exist_ok=True)
    prefix, tail = TMP / 'prefix.mp4', TMP / 'tail.mp4'
    # Copy the 1956 frames before the last keyframe without changing their pixels.
    run(['-i', str(args.source), '-map', '0:v:0', '-frames:v', '1956',
         '-an', '-c:v', 'copy', str(prefix)])
    assert int(probe(prefix)['streams'][0]['nb_frames']) == 1956
    filters = [
        '[0:v]trim=start_frame=1956:end_frame=1976,setpts=PTS-STARTPTS,settb=AVTB,format=yuvj420p[clean]',
        '[1:v]trim=start=58.2:end=59,setpts=PTS-STARTPTS,fps=30,'
        'crop=1920:945:0:0,scale=1920:1080:flags=lanczos:out_range=full,'
        'setsar=8/7,settb=AVTB,format=yuvj420p[river]',
        '[2:v]scale=3840:2160:flags=lanczos,'
        "zoompan=z='1+0.00035*on':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps=30,"
        'setsar=8/7,settb=AVTB,'
        f"drawtext=fontfile='{FONT}':text='漂走的那张画':fontcolor=white:fontsize=92:"
        'shadowcolor=0x14202e99:shadowx=2:shadowy=3:x=(w-text_w)/2:y=740,'
        'format=yuvj420p[card]',
        '[river][card]xfade=transition=fade:duration=0.8:offset=0[closing]',
        '[clean][closing]concat=n=2:v=1:a=0,setsar=8/7,format=yuvj420p[tail]',
    ]
    (TMP / 'tail_filter.txt').write_text(';\n'.join(filters), encoding='utf-8')
    run(['-i', str(args.source), '-i', str(ROOT / 'volcano/output/2026_9_6_01.mp4'),
         '-loop', '1', '-framerate', '30', '-t', '5.2', '-i', str(OP / 'endcard_matched_v2.png'),
         '-filter_complex', ';'.join(filters), '-map', '[tail]', '-frames:v', '176',
         '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-profile:v', 'high',
         '-pix_fmt', 'yuvj420p', '-color_range', 'pc', '-r', '30', '-video_track_timescale', '15360', str(tail)])
    assert int(probe(tail)['streams'][0]['nb_frames']) == 176
    concat = TMP / 'video.ffconcat'
    concat.write_text("ffconcat version 1.0\n" + ''.join(f"file '{p.as_posix()}'\n" for p in (prefix, tail)), encoding='utf-8')
    run(['-f', 'concat', '-safe', '0', '-i', str(concat), '-i', str(args.source),
         '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-movflags', '+faststart', str(args.output)])
    result = probe(args.output)
    assert int(next(s for s in result['streams'] if s['codec_type'] == 'video')['nb_frames']) == 2132
    print(json.dumps({'output': str(args.output), 'duration': result['format']['duration'],
                      'copied_video_frames': 1956, 'reencoded_tail_frames': 176,
                      'audio': 'original AAC stream copied'}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
