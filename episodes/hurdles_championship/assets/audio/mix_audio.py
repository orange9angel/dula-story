import json
import subprocess
import os

with open('manifest.json') as f:
    data = json.load(f)

entries = data['entries']
print(f'Total entries: {len(entries)}')

# Build ffmpeg command with filter_complex
inputs = []
filter_parts = []

for i, e in enumerate(entries):
    file = e['file']
    start_ms = int(e['startTime'] * 1000)
    inputs.append(f'-i "{file}"')
    filter_parts.append(f'[{i}:a]atrim=start=0.2,adelay=delays={start_ms}|{start_ms},volume=1.0[d{i}];')

# Mix all dialogues
mix_inputs = ''.join(f'[d{i}]' for i in range(len(entries)))
filter_parts.append(f'{mix_inputs}amix=inputs={len(entries)}:duration=longest:normalize=0[dialogue];')

# Add BGM
bgm_path = '_temp_bgm.wav'
if os.path.exists(bgm_path):
    bgm_idx = len(entries)
    inputs.append(f'-i "{bgm_path}"')
    filter_parts.append(f'[{bgm_idx}:a]volume=0.35[bgm];')
    filter_parts.append(f'[dialogue][bgm]amix=inputs=2:duration=longest:normalize=0[out]')
    map_out = '[out]'
else:
    filter_parts.append(f'[dialogue]volume=1.0[out]')
    map_out = '[out]'

filter_complex = ''.join(filter_parts)

# Write filter_complex to file
with open('filter_complex.txt', 'w') as f:
    f.write(filter_complex)

cmd = f'ffmpeg -y {" ".join(inputs)} -/filter_complex filter_complex.txt -map "{map_out}" -ac 2 -ar 48000 -c:a pcm_s16le mixed.wav'
print(f'Command length: {len(cmd)}')
print('Running ffmpeg...')
subprocess.run(cmd, shell=True, check=True)
print('Mixed audio generated successfully!')
