"""Run official Seed-VC V1 singing conversion in a separate Python 3.10 env.

Keep --length-adjust=1, F0 from the song, and no transposition. This writes an
audition only; it does not replace mixed_v11 or its established lip alignment.
Model downloads are automatic on first run, under tmp/seed-vc/checkpoints.
"""
from pathlib import Path
import argparse
import os
import sys

ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--steps',type=int,default=30)
    parser.add_argument('--source',default='assets/audio/voice_audition/original_vocal_6s.wav')
    parser.add_argument('--reference',default='assets/audio/voice_audition/yuki_reference.wav')
    parser.add_argument('--output',default='assets/audio/voice_audition/converted')
    parser.add_argument('--cfg',type=float,default=.7)
    args=parser.parse_args()
    upstream=ROOT/'tmp/seed-vc'
    if not (upstream/'inference.py').exists():raise SystemExit('Clone https://github.com/Plachtaa/seed-vc into tmp/seed-vc first.')
    os.chdir(upstream);sys.path.insert(0,str(upstream))
    os.environ.setdefault('HF_HUB_DISABLE_XET','1')
    os.environ.setdefault('HF_HUB_DOWNLOAD_TIMEOUT','120')
    os.environ.setdefault('HF_HOME',str(ROOT/'tmp/models/svc-hf'))
    import torch
    torch.set_num_threads(min(8,os.cpu_count() or 4))
    torch.manual_seed(20260919)
    import inference
    opts=argparse.Namespace(source=str(ROOT/args.source),
        target=str(ROOT/args.reference),
        output=str(ROOT/args.output),diffusion_steps=args.steps,
        length_adjust=1.0,inference_cfg_rate=args.cfg,f0_condition=True,auto_f0_adjust=False,
        semi_tone_shift=0,checkpoint=None,config=None,fp16=False)
    print(f'Seed-VC singing audition, device={inference.device}, steps={args.steps}',flush=True)
    inference.main(opts)

if __name__=='__main__':main()
