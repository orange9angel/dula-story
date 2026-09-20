"""E08 theme: Demucs-separate the Suno song into stems (vocals/accompaniment).

Same HDEMUCS overlap-add pattern as yuki_beat_ad separate_v10, reusing that
episode's torch-hub model cache. Nothing outside this episode is written.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
import soundfile as sf
import torch
import torchaudio

ROOT = Path(__file__).resolve().parents[1]
BEAT_AD = ROOT.parents[0] / 'yuki_beat_ad'
SOURCE = ROOT / 'assets/audio/theme/suno/漂吧.wav'
STEMS = ROOT / 'assets/audio/theme/stems'


def main():
    STEMS.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    meta = STEMS / 'separation.json'
    if meta.exists() and json.loads(meta.read_text())['source_sha256'] == digest:
        if all((STEMS / f'{s}.wav').exists() for s in ('vocals', 'drums')):
            print('Stems cache valid', flush=True)
            return
    torch.set_num_threads(4)
    torch.hub.set_dir(str(BEAT_AD / 'tmp/models/torch'))
    print('Loading torchaudio Hybrid Demucs MUSDB+', flush=True)
    bundle = torchaudio.pipelines.HDEMUCS_HIGH_MUSDB_PLUS
    model = bundle.get_model()
    data, sr = sf.read(SOURCE, dtype='float32', always_2d=True)
    x = torch.from_numpy(data.T.copy())
    if sr != bundle.sample_rate:
        x = torchaudio.functional.resample(x, sr, bundle.sample_rate)
    sr = bundle.sample_rate
    mean, std = x.mean(), x.std().clamp_min(1e-6)
    x = (x - mean) / std
    size, overlap = 16 * sr, sr  # longer chunks: the song is 141s
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
        print(f'Separated {end / sr:.0f}s / {x.shape[-1] / sr:.0f}s', flush=True)
        if end == x.shape[-1]:
            break
    result /= weight.clamp_min(1e-8)
    for i, name in enumerate(model.sources):
        sf.write(STEMS / f'{name}.wav', result[i].numpy().T, sr, subtype='FLOAT')
    # Accompaniment = everything except vocals (keeps full fidelity for the mix-minus)
    acc = result[[i for i, n in enumerate(model.sources) if n != 'vocals']].sum(0)
    sf.write(STEMS / 'accompaniment.wav', acc.numpy().T, sr, subtype='FLOAT')
    meta.write_text(json.dumps({'source_sha256': digest, 'sample_rate': sr,
        'method': 'torchaudio HDEMUCS_HIGH_MUSDB_PLUS, CPU, overlap-add 16s/1s',
        'samples': int(x.shape[-1]), 'sources': model.sources}, indent=2))
    print('Stem separation complete', flush=True)


if __name__ == '__main__':
    main()
