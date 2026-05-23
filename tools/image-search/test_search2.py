import urllib.request
import urllib.parse
import ssl
import re

# 搜索圣斗士星矢角色图片
query = '聖闘士星矢 星矢 ペガサス'
encoded = urllib.parse.quote(query)

# Bing图片搜索
url = f'https://www.bing.com/images/async?q={encoded}&first=0&count=30'

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': 'https://www.bing.com/images/search',
}

req = urllib.request.Request(url, headers=headers)
ssl_context = ssl._create_unverified_context()

try:
    with urllib.request.urlopen(req, timeout=30, context=ssl_context) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        print('Response length:', len(html))
        
        # 查找图片URL
        pattern = r'https?://[\w.-]+/[\w./%-]+\.(?:jpg|jpeg|png|gif)'
        matches = re.findall(pattern, html, re.IGNORECASE)
        print('Total matches:', len(matches))
        
        seen = set()
        for m in matches:
            if m not in seen and len(seen) < 15:
                seen.add(m)
                print(' ', m[:100])
        
except Exception as e:
    print('Error:', e)
