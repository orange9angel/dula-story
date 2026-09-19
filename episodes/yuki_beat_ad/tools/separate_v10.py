"""Local Hybrid Demucs stems for analysis; keep the original mix in the video."""
from pathlib import Path
import hashlib
import json
import numpy as np
import soundfile as sf
import torch
import torchaudio

ROOT = Path(__file__).resolve().parents[1]


def main():
    source = ROOT / 'assets/audio/mixed_v10.wav'
    target = ROOT / 'assets/audio/stems_v10'
    target.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    meta = target / 'separation.json'
    if meta.exists() and json.loads(meta.read_text())['source_sha256'] == digest:
        if all((target / f'{s}.wav').exists() for s in ('vocals', 'drums')):
            print('Stems cache valid', flush=True)
            return
    torch.set_num_threads(4)
    torch.hub.set_dir(str(ROOT / 'tmp/models/torch'))
    print('Loading torchaudio Hybrid Demucs MUSDB+', flush=True)
    bundle = torchaudio.pipelines.HDEMUCS_HIGH_MUSDB_PLUS
    model = bundle.get_model()
    data, sr = sf.read(source, dtype='float32', always_2d=True)
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
        sf.write(target / f'{name}.wav', result[i].numpy().T, sr, subtype='FLOAT')
    meta.write_text(json.dumps({'source_sha256': digest, 'sample_rate': sr,
        'method': 'torchaudio HDEMUCS_HIGH_MUSDB_PLUS, CPU, overlap-add 8s/1s',
        'samples': int(x.shape[-1]), 'sources': model.sources}, indent=2))
    print('Stem separation complete', flush=True)


if __name__ == '__main__':
    main()
