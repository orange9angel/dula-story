import urllib.request
import ssl

# 尝试从Unsplash获取一些动漫风格的图片作为替代
# Unsplash有免费API

# 使用Unsplash Source (已废弃，但可能还能用)
# 或者使用picsum.photos

test_urls = [
    ('random', 'https://picsum.photos/400/400'),
    ('random2', 'https://picsum.photos/seed/anime1/400/400'),
]

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
}

ssl_context = ssl._create_unverified_context()

for name, url in test_urls:
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=20, context=ssl_context) as resp:
            data = resp.read()
            print(f'{name}: {len(data)} bytes')
            # 检查是否是图片
            if data.startswith(b'\xff\xd8\xff'):
                print('  Valid JPEG')
            elif data.startswith(b'\x89PNG'):
                print('  Valid PNG')
    except Exception as e:
        print(f'{name}: Error - {e}')

# 尝试从GitHub raw获取图片
print('\n--- GitHub test ---')
github_urls = [
    ('github', 'https://raw.githubusercontent.com/github/explore/main/topics/python/python.png'),
]

for name, url in github_urls:
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=20, context=ssl_context) as resp:
            data = resp.read()
            print(f'{name}: {len(data)} bytes')
    except Exception as e:
        print(f'{name}: Error - {e}')
