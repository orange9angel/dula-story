import urllib.request
import urllib.parse
import ssl
import re

# 尝试使用Bing的图片搜索API
query = 'Saint Seiya Seiya'
encoded = urllib.parse.quote(query)

# Bing图片搜索的AJAX接口
url = f'https://www.bing.com/images/async?q={encoded}&first=0&count=20'

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
        
        # 查找图片URL - 尝试多种模式
        # 模式1: murl参数
        pattern1 = r'murl=([^&]+)'
        matches1 = re.findall(pattern1, html)
        print('Pattern1 (murl) matches:', len(matches1))
        for m in matches1[:5]:
            decoded = urllib.parse.unquote(m)
            print(' ', decoded[:100])
        
        # 模式2: 直接的http图片URL
        pattern2 = r'https?://[\w.-]+/[\w./-]+\.(?:jpg|jpeg|png|gif)'
        matches2 = re.findall(pattern2, html, re.IGNORECASE)
        print('Pattern2 (direct URL) matches:', len(matches2))
        seen = set()
        for m in matches2:
            if m not in seen and len(seen) < 10:
                seen.add(m)
                print(' ', m[:80])
        
except Exception as e:
    print('Error:', e)
