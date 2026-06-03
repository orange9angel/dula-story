import re

with open('episodes/star_travel_s1e1/tools/generate_audio.py', 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('DIALOGUE_PREPROCESSOR = {')
end = content.find('}\n\n\ndef infer_emotion', start)
dict_str = content[start:end+1]

pairs = re.findall(r'"([^"]+)":\s*"([^"]+)"', dict_str)
for k, v in pairs:
    if '警告' in k or '飙升' in k:
        print('KEY: [' + k + ']')
        print('VAL: [' + v + ']')
        print()

print('Total pairs:', len(pairs))
