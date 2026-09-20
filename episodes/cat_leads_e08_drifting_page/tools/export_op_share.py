"""Export an OP delivery copy with CFR H.264 and 48 kHz AAC-LC.

Resample audio at its true declared rate; do not use asetrate or atempo.
The source movie remains available for comparing a platform round trip.
"""
from pathlib import Path
import argparse
import subprocess

OP = Path(__file__).resolve().parents[1] / 'volcano/op'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=OP / 'op.mp4')
    parser.add_argument('--output', type=Path, default=OP / 'op_wechat.mp4')
    args = parser.parse_args()
    if args.source.resolve() == args.output.resolve():
        parser.error('Use a separate delivery filename.')
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(args.source),
        '-filter_complex',
        '[0:v]setpts=PTS-STARTPTS,fps=30,'
        'scale=1920:1080:in_range=full:out_range=limited:out_color_matrix=bt709,'
        'setsar=1,format=yuv420p[v];'
        '[0:a]aresample=48000,asetpts=PTS-STARTPTS[a]',
        '-map', '[v]', '-map', '[a]',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
        '-profile:v', 'main', '-level:v', '4.0', '-pix_fmt', 'yuv420p',
        '-color_range', 'tv', '-colorspace', 'bt709',
        '-maxrate', '6M', '-bufsize', '12M', '-g', '60',
        '-fps_mode', 'cfr', '-video_track_timescale', '90000',
        '-c:a', 'aac', '-profile:a', 'aac_low', '-ar', '48000', '-ac', '2', '-b:a', '192k',
        '-movflags', '+faststart', str(args.output)
    ], check=True)
    print(args.output)


if __name__ == '__main__':
    main()
