"""V19 step 1: master the new song (candidate_d) and separate its stems.

Mastering chain is identical to V9 (0.3s fade-out, 0.7 normalize, ffmpeg
acompressor/shelf/limiter, 0.8 normalize). The mastered base is what Demucs
separates, so the later voice-rebuild subtraction (base - vocals + converted)
lines up sample-exactly. Nothing here touches earlier-version outputs.
"""
from pathlib import Path
import hashlib
import json
import shutil
import wave
import numpy as np
import soundfile as sf
import torch
import torchaudio
from prepare_v2 import load, SR
from prepare_v5 import master

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/audio/music/v19/candidate_d.wav'
BASE = ROOT / 'assets/audio/mixed_v19_base.wav'
STEMS = ROOT / 'assets/audio/stems_v19'


def build_base():
    y = load(SOURCE)
    duration = round(len(y) / SR, 3)
    fade = round(.3 * SR)
    y[-fade:] *= np.linspace(1, 0, fade)[:, None]
    y *= .7 / max(float(np.abs(y).max()), 1e-9)
    y = master(y)
    y *= .8 / max(float(np.abs(y).max()), 1e-9)
    with wave.open(str(BASE), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((y * 32767).astype('<i2').tobytes())
    shutil.copyfile(BASE, ROOT / 'assets/audio/music/mixed_v19_base.wav')
    print(f'V19 base master: {duration}s -> {BASE.name}')
    return duration


def separate():
    STEMS.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256(BASE.read_bytes()).hexdigest()
    meta = STEMS / 'separation.json'
    if meta.exists() and json.loads(meta.read_text())['source_sha256'] == digest:
        if all((STEMS / f'{s}.wav').exists() for s in ('vocals', 'drums')):
            print('Stems cache valid', flush=True)
            return
    torch.set_num_threads(4)
    torch.hub.set_dir(str(ROOT / 'tmp/models/torch'))
    print('Loading torchaudio Hybrid Demucs MUSDB+', flush=True)
    bundle = torchaudio.pipelines.HDEMUCS_HIGH_MUSDB_PLUS
    model = bundle.get_model()
    data, sr = sf.read(BASE, dtype='float32', always_2d=True)
    x = torch.from_numpy(data.T.copy())
    if sr != bundle.sample_rate:
        x = torchaudio.functional.resample(x, sr, bundle.sample_rate)
    sr = bundle.sample_rate
    # Overlap-add chunks, normalize consistently across the entire song.
    mean, std = x.mean(), x.std().clamp_min(1e-6)
    x = (x - mean) / std
    size, overlap = 8 * sr, sr
    result = torch.zeros((4, 2, x.shape[-1]))
    weight = torch.zeros(x.shape[-1])
    for start in range(0, x.shape[-1], size - overlap):
        end = min(start + size, x.shape[-1])
        with torch.inference_mode():
            stems = model(x[:, start:end].unsqueeze(0))[0] * std
        fade = torch.ones(end - start)
        n = min(overlap, len(fade))
        if start:
            fade[:n] *= torch.linspace(0, 1, n)
        if end < x.shape[-1]:
            fade[-n:] *= torch.linspace(1, 0, n)
        result[:, :, start:end] += stems * fade
        weight[start:end] += fade
        print(f'Separated {end / sr:.1f}s / {x.shape[-1] / sr:.1f}s', flush=True)
        if end == x.shape[-1]:
            break
    result /= weight.clamp_min(1e-8)
    for i, name in enumerate(model.sources):
        sf.write(STEMS / f'{name}.wav', result[i].numpy().T, sr, subtype='FLOAT')
    meta.write_text(json.dumps({'source_sha256': digest, 'sample_rate': sr,
        'method': 'torchaudio HDEMUCS_HIGH_MUSDB_PLUS, CPU, overlap-add 8s/1s',
        'samples': int(x.shape[-1]), 'sources': model.sources}, indent=2))
    print('Stem separation complete', flush=True)


def main():
    assert SOURCE.exists(), f'输入不存在: {SOURCE}'
    build_base()
    separate()


if __name__ == '__main__':
    main()
