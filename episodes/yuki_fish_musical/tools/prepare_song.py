"""Fish musical step 1: light-master the song and separate its stems.

Same chain as yuki_beat_ad prepare_v18_song (normalize, ffmpeg master, HDEMUCS),
but reuses the beat_ad torch-hub model cache instead of re-downloading.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import wave
import numpy as np
import soundfile as sf
import torch
import torchaudio

ROOT = Path(__file__).resolve().parents[1]
BEAT_AD = ROOT.parents[0] / 'yuki_beat_ad'
SOURCE = ROOT / 'assets/audio/song_v1.wav'
BASE = ROOT / 'assets/audio/song_master.wav'
STEMS = ROOT / 'assets/audio/stems'
SR = 48000


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ar', str(SR),
                          '-ac', '2', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def master(y):
    raw = (y * 32767).astype('<i2').tobytes()
    chain = 'acompressor=threshold=-18dB:ratio=3:attack=8:release=120:makeup=3dB,equalizer=f=110:t=q:w=1:g=2.5,alimiter=limit=0.85:level=false'
    out = subprocess.run(['ffmpeg', '-v', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2',
                          '-i', 'pipe:0', '-af', chain, '-f', 'f32le', '-'],
                         input=raw, capture_output=True, check=True).stdout
    return np.frombuffer(out, np.float32).reshape(-1, 2).copy()


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
    print(f'song master: {duration}s -> {BASE.name}')
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
    torch.hub.set_dir(str(BEAT_AD / 'tmp/models/torch'))  # reuse the beat_ad model cache
    print('Loading torchaudio Hybrid Demucs MUSDB+', flush=True)
    bundle = torchaudio.pipelines.HDEMUCS_HIGH_MUSDB_PLUS
    model = bundle.get_model()
    data, sr = sf.read(BASE, dtype='float32', always_2d=True)
    x = torch.from_numpy(data.T.copy())
    if sr != bundle.sample_rate:
        x = torchaudio.functional.resample(x, sr, bundle.sample_rate)
    sr = bundle.sample_rate
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
