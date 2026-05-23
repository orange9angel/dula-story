import urllib.request
import urllib.parse
import ssl
import json

# 尝试使用DuckDuckGo搜索
query = 'Saint Seiya Pegasus Seiya'
encoded = urllib.parse.quote(query)

# 第一步：获取vqd token
token_url = 'https://duckduckgo.com/'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

ssl_context = ssl._create_unverified_context()

try:
    req = urllib.request.Request(token_url, headers=headers)
    with urllib.request.urlopen(req, timeout=30, context=ssl_context) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        print('Got token page, length:', len(html))
        
        # 查找vqd token
        import re
        vqd_match = re.search(r'vqd=([\d-]+)', html)
        if vqd_match:
            vqd = vqd_match.group(1)
            print('Found vqd token:', vqd)
            
            # 搜索图片
            search_url = f'https://duckduckgo.com/i.js?q={encoded}&vqd={vqd}'
            headers['Referer'] = 'https://duckduckgo.com/'
            req2 = urllib.request.Request(search_url, headers=headers)
            
            with urllib.request.urlopen(req2, timeout=30, context=ssl_context) as resp2:
                data = json.loads(resp2.read().decode('utf-8'))
                results = data.get('results', [])
                print('Found results:', len(results))
                
                for r in results[:5]:
                    print('Image:', r.get('image')[:80] if r.get('image') else 'None')
                    print('Title:', r.get('title', 'No title'))
                    print('---')
        else:
            print('No vqd token found')
            
except Exception as e:
    print('Error:', e)
    import traceback
    traceback.print_exc()
