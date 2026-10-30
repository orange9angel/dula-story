"""《借我一小段旋律》50 秒成品装配 v6（=v5 + 哼唱保共振峰升调 + 分轨输出）。

v5 原说明：

在 v4 基础上完成三项修正：
  1. 匹普四句 snap 到器乐床实测节拍栅格（原仅摆到时隙起点）
  2. 塞蕾娜哼唱升 12 半音，使其高于诺娅主唱（原 A#3-F#4 低于主唱 C5-C#5，与导演意图相反）
  3. 补收尾句「你听，我们已经在一起」—— Suno 四次重摇均未唱出该句，
     改为诺娅与匹普在器乐尾轻声同说（音乐剧 parlando 收束）。这是在
     生成侧拿不到合唱的约束下所做的导演决定，如实记录，不冒称已唱出。

保留项：诺娅唱段与器乐为 v1b 已认可内容，不改音高与时长。
"""
import numpy as np, subprocess, json, hashlib, librosa
from pathlib import Path

SR = 48000
DUR = 50.0
N = int(DUR * SR)

BED = "tmp/demucs/htdemucs/borrow_a_melody_50s/no_vocals.wav"
VOC = "tmp/demucs/htdemucs/borrow_a_melody_50s/vocals.wav"
PD = Path("assets/audio/dialogue/pip_song")
OUT = Path("assets/audio/music/borrow_a_melody/edit/borrow_a_melody_50s_v6.wav")

PIP_SPAN = (15.69, 29.48)
SLOTS = [15.69, 19.80, 23.16, 25.76]
HUM_SPAN = (40.63, 47.08)
HUM_SHIFT = 12                      # 半音
THEATRE = "aecho=0.9:0.3:55|110|180:0.22|0.12|0.06"
FINALE_AT = 46.80
TAIL_FADE = (49.70, 50.00)


def load(path, filt=None, ch=2):
    cmd = ["ffmpeg", "-v", "error", "-i", str(path)]
    if filt:
        cmd += ["-af", filt]
    cmd += ["-ar", str(SR), "-ac", str(ch), "-f", "f32le", "-"]
    raw = subprocess.check_output(cmd)
    a = np.frombuffer(raw, np.float32).astype(np.float64)
    return a.reshape(-1, ch) if ch == 2 else a


def fit(x, n):
    out = np.zeros((n, 2))
    m = min(len(x), n)
    out[:m] = x[:m]
    return out


def rms(x):
    return float(np.sqrt((x ** 2).mean())) if len(x) else 0.0


def trim_silence(y, thr_ratio=0.02):
    env = np.abs(y).max(axis=1) if y.ndim == 2 else np.abs(y)
    thr = env.max() * thr_ratio
    idx = np.where(env > thr)[0]
    return y[idx[0]:idx[-1] + 1] if len(idx) else y


beats = np.load("tmp/beats.npy")
snap = lambda t: float(beats[np.argmin(np.abs(beats - t))])

bed = fit(load(BED), N)
voc = fit(load(VOC), N)
log = {}

# ---------- 1. 诺娅：挖掉匹普段与原哼唱段 ----------
noya = voc.copy()
fade = int(0.06 * SR)


def cut(buf, a_s, b_s):
    a, b = int(a_s * SR), int(b_s * SR)
    r = rms(buf[a:b])
    buf[a:b] = 0.0
    buf[max(0, a - fade):a] *= np.linspace(1, 0, min(fade, a))[:, None]
    buf[b:b + fade] *= np.linspace(0, 1, fade)[:, None]
    return r


pip_removed_rms = cut(noya, *PIP_SPAN)
hum_removed_rms = cut(noya, *HUM_SPAN)
log["removed"] = {"pip_span_rms": round(pip_removed_rms, 5),
                  "hum_span_rms": round(hum_removed_rms, 5)}
print(f"removed: pip rms={pip_removed_rms:.5f}  hum rms={hum_removed_rms:.5f}")

# ---------- 2. 匹普：snap 到节拍栅格 ----------
pip = np.zeros((N, 2))
placed = []
for i, s in enumerate(SLOTS, 1):
    x = load(PD / f"pip_L{i}.mp3", THEATRE)
    x = trim_silence(x)
    at = snap(s)
    off = int(at * SR)
    end = min(off + len(x), N)
    pip[off:end] += x[:end - off]
    placed.append(dict(line=i, slot_start=s, snapped_to=round(at, 3),
                       offset=round(at - s, 3), dur=round(len(x) / SR, 3)))
    print(f"  Pip L{i}: {s:.2f} -> beat {at:.3f} ({at-s:+.3f}s)  dur={len(x)/SR:.3f}s")

g = float(np.clip(pip_removed_rms / max(rms(pip[int(PIP_SPAN[0]*SR):int(PIP_SPAN[1]*SR)]), 1e-9), 0.2, 6.0))
pip *= g
log["pip"] = {"speaker": "zh_male_liangsangmengzai_uranus_bigtts",
              "lines": placed, "gain": round(g, 4), "reverb": THEATRE,
              "beat_grid_source": "librosa.beat_track on no_vocals; 0.4063s grid (eighth-note lock of ~73.8BPM real beat)"}
print(f"  pip gain x{g:.3f}")

# ---------- 3. 哼唱升 12 半音 ----------
ha, hb = int(HUM_SPAN[0] * SR), int(HUM_SPAN[1] * SR)
hum_src = voc[ha:hb]
mono = hum_src.mean(axis=1)
f0_before = librosa.pyin(librosa.resample(mono, orig_sr=SR, target_sr=22050),
                         fmin=120, fmax=1400, sr=22050, hop_length=256)[0]
med_before = float(np.nanmedian(f0_before))
# v6：rubberband 保共振峰升八度（v5 的 librosa 相位声码器会连共振峰一起上移，读成"花栗鼠"）
_raw = subprocess.check_output(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
    "-af", "rubberband=pitch=2:formant=preserved:pitchq=quality", "-f", "f32le", "-"],
    input=hum_src.astype(np.float32).tobytes())
shifted = np.frombuffer(_raw, np.float32).astype(np.float64).reshape(-1, 2)
mono2 = shifted.mean(axis=1)
f0_after = librosa.pyin(librosa.resample(mono2, orig_sr=SR, target_sr=22050),
                        fmin=120, fmax=1400, sr=22050, hop_length=256)[0]
med_after = float(np.nanmedian(f0_after))
gh = float(np.clip(hum_removed_rms / max(rms(shifted), 1e-9), 0.2, 6.0))
shifted *= gh
xf = int(0.08 * SR)
shifted[:xf] *= np.linspace(0, 1, xf)[:, None]
shifted[-xf:] *= np.linspace(1, 0, xf)[:, None]
hum = np.zeros((N, 2))
hum[ha:ha + len(shifted)] = shifted[:N - ha]
log["hum"] = {"span": list(HUM_SPAN), "shift_semitones": HUM_SHIFT,
              "f0_median_before": round(med_before, 1),
              "f0_median_after": round(med_after, 1),
              "note_before": librosa.hz_to_note(med_before),
              "note_after": librosa.hz_to_note(med_after),
              "noya_lead_median_range": [514.5, 567.5],
              "now_above_lead": bool(med_after > 567.5),
              "gain": round(gh, 4)}
print(f"  hum: {med_before:.1f}Hz ({librosa.hz_to_note(med_before)}) -> "
      f"{med_after:.1f}Hz ({librosa.hz_to_note(med_after)})  gain x{gh:.3f}  "
      f"above lead(567.5): {med_after > 567.5}")

# ---------- 4. 收尾句（parlando 同说） ----------
fin = np.zeros((N, 2))
fat = snap(FINALE_AT)
fl = []
for name, delay, lvl in [("finale_noya", 0.0, 1.0), ("finale_pip", 0.085, 0.80)]:
    x = trim_silence(load(PD / f"{name}.mp3", THEATRE))
    off = int((fat + delay) * SR)
    end = min(off + len(x), N)
    fin[off:end] += x[:end - off] * lvl
    fl.append(dict(file=name, at=round(fat + delay, 3), dur=round(len(x) / SR, 3), level=lvl))
    print(f"  finale {name}: at {fat+delay:.3f}s dur={len(x)/SR:.3f}s lvl={lvl}")
gf = float(np.clip(0.55 * hum_removed_rms / max(rms(fin[int(fat*SR):]), 1e-9), 0.2, 6.0))
fin *= gf
log["finale"] = {"lyric": "你听，我们已经在一起。", "mode": "parlando spoken duet",
                 "reason": "Suno v2/v3 四次重摇均未唱出该收尾合唱句；在生成侧拿不到合唱的约束下改为同说",
                 "placed_at_beat": round(fat, 3), "clips": fl, "gain": round(gf, 4),
                 "honesty": "这是口语化念白，不是唱出来的合唱"}

# ---------- 5. 分轨（渲染器据此算口型，混音器据此做 ducking） ----------
STEMS = Path("tmp/v6/stems"); STEMS.mkdir(parents=True, exist_ok=True)
for _n, _b in dict(bed=bed, noya=noya, pip=pip, hum=hum, finale=fin).items():
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-c:a", "pcm_s24le", str(STEMS / f"{_n}.wav")], input=_b.astype(np.float32).tobytes(), check=True)

# ---------- 6. 混音 ----------
mix = bed + noya + pip + hum + fin
peak = float(np.abs(mix).max())
if peak > 0.99:
    mix *= 0.99 / peak
fa, fb = int(TAIL_FADE[0] * SR), int(TAIL_FADE[1] * SR)
mix[fa:fb] *= np.linspace(1, 0, fb - fa)[:, None]
mix[fb:] = 0.0
final_peak = float(np.abs(mix).max())
print(f"\npeak {peak:.4f} -> {final_peak:.4f}")

OUT.parent.mkdir(parents=True, exist_ok=True)
p = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(SR),
                      "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", str(OUT)],
                     stdin=subprocess.PIPE)
p.communicate(mix.astype(np.float32).tobytes())
sha = hashlib.sha256(OUT.read_bytes()).hexdigest()
print(f"wrote {OUT}\nsha256 {sha}")

log.update(artifact=str(OUT).replace("\\", "/"), sha256=sha, duration=DUR,
           format="pcm_s24le 48000Hz stereo", peak=round(final_peak, 4),
           sources={"bed": BED, "vocals": VOC, "pip_dir": str(PD).replace("\\", "/")},
           preserved="诺娅唱段与器乐为 v1b 已认可内容；v5 由 demucs 分离轨重建，"
                     "与原混音非逐比特相同（分离再合成不可逆），差异量级约满量程 0.3%",
           unresolved=["匹普念白为 seed-tts 干声加 aecho 近似空厅，非真实剧场卷积",
                       "收尾句为同说而非合唱（见 finale.honesty）",
                       "哼唱为 v1b 原声保共振峰升调（rubberband），音色仍带原唱者特征，不是第二位歌手"])
Path(str(OUT) + ".source.json").write_text(
    json.dumps(log, ensure_ascii=False, indent=1), encoding="utf-8")
print("wrote source.json")
