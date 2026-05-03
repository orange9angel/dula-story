import wave, os, json, sys
import numpy as np

def analyze_wav(path):
    with wave.open(path, 'rb') as w:
        frames = w.readframes(w.getnframes())
        data = np.frombuffer(frames, dtype=np.int16)
        rms = np.sqrt(np.mean(data.astype(np.float64)**2))
        peak = np.max(np.abs(data))
        lufs = 20*np.log10(max(rms,1)/32768)
        return rms, peak, lufs

def main(episode_dir):
    audio_dir = os.path.join(episode_dir, 'assets', 'audio')
    
    # Mixed
    mixed_path = os.path.join(audio_dir, 'mixed.wav')
    if os.path.exists(mixed_path):
        rms, peak, lufs = analyze_wav(mixed_path)
        print(f'Mixed.wav: RMS={rms/32768*100:.1f}% LUFS~{lufs:.1f}dB Peak={peak/32768*100:.1f}%')
    
    # BGM files
    music_dir = os.path.join(audio_dir, 'music')
    if os.path.exists(music_dir):
        for f in os.listdir(music_dir):
            if f.endswith('.wav'):
                rms, peak, lufs = analyze_wav(os.path.join(music_dir, f))
                print(f'BGM {f}: RMS={rms/32768*100:.1f}% LUFS~{lufs:.1f}dB')
    
    # TTS files
    manifest_path = os.path.join(audio_dir, 'manifest.json')
    if os.path.exists(manifest_path):
        manifest = json.load(open(manifest_path))
        entries = manifest.get('entries', [])
        print(f'\nTTS files ({len(entries)} total):')
        for item in entries:
            fname = item.get('file', '')
            char = item.get('character', '?')
            if fname and os.path.exists(fname):
                rms, peak, lufs = analyze_wav(fname)
                print(f'  {os.path.basename(fname)} ({char}): RMS={rms/32768*100:.1f}% LUFS~{lufs:.1f}dB')

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else './episodes/she_ra')
