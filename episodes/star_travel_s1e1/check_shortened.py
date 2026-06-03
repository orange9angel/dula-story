import re

with open('tools/generate_audio.py', 'r', encoding='utf-8') as f:
    content = f.read()

m = re.search(r'DIALOGUE_PREPROCESSOR = \{(.*?)\n\}', content, re.DOTALL)
if m:
    dict_content = m.group(1)
    pairs = re.findall(r'"(.*?)"\s*:\s*"(.*?)"', dict_content)
    print('=== 预处理映射中缩短的台词 ===\n')
    for original, shortened in pairs:
        if len(shortened) < len(original) * 0.7:
            print(f'原始 ({len(original)}字): {original}')
            print(f'缩短 ({len(shortened)}字): {shortened}')
            print()
