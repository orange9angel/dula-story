import re

content = '[Zorak]{FaceDetermined}{Camera:Static|position=1.8,1.75,5.6|lookAt=0,1.1,0} 第一节，伸展运动。'

# Simulate parse_story cleaning
dialogue = re.sub(r'^@\w+\s*', '', content)
dialogue = re.sub(r'\[\w+\]\s*', '', dialogue)
dialogue = re.sub(r'\{Camera:[^}]+\}\s*', '', dialogue)
dialogue = re.sub(r'\{Music:[^}]+\}\s*', '', dialogue)
dialogue = re.sub(r'\{Voice:[^}]+\}\s*', '', dialogue)
dialogue = re.sub(r'\{[A-Za-z]\w*:[^}]+\}\s*', '', dialogue)
dialogue = re.sub(r'\{Hitstop\|[^}]+\}\s*', '', dialogue)
dialogue = re.sub(r'\{FX\w+\|[^}]+\}\s*', '', dialogue)
dialogue = re.sub(r'\{(?!Camera:)\w+\}\s*', '', dialogue).strip()

print(f'Cleaned dialogue: "{dialogue}"')
print(f'Length: {len(dialogue)}')

# Check preprocessor
DIALOGUE_PREPROCESSOR = {
    "第一节，伸展运动。": "第一节伸展运动。",
}
result = DIALOGUE_PREPROCESSOR.get(dialogue, dialogue)
print(f'After preprocessor: "{result}"')
