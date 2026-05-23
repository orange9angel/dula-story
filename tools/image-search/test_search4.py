import urllib.request
import urllib.parse
import ssl
import json

# 尝试使用Pexels API (不需要key的公开图片)
# 或者使用Lorem Picsum等占位图服务

# 方法1：尝试从维基百科获取圣斗士图片
# 维基百科有圣斗士星矢的页面和图片

wiki_images = {
    'seiya': 'https://upload.wikimedia.org/wikipedia/en/3/3e/Seiya_Pegasus.jpg',
    'shiryu': 'https://upload.wikimedia.org/wikipedia/en/5/5a/Shiryu_Dragon.jpg',
    'hyoga': 'https://upload.wikimedia.org/wikipedia/en/8/8e/Hyoga_Cygnus.jpg',
    'shun': 'https://upload.wikimedia.org/wikipedia/en/4/4e/Shun_Andromeda.jpg',
    'ikki': 'https://upload.wikimedia.org/wikipedia/en/2/2e/Ikki_Phoenix.jpg',
}

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
}

ssl_context = ssl._create_unverified_context()

for name, url in wiki_images.items():
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=20, context=ssl_context) as resp:
            data = resp.read()
            print(f'{name}: {len(data)} bytes, status: {resp.status}')
            # 检查是否是有效图片
            if data.startswith(b'\xff\xd8\xff'):  # JPEG
                print(f'  Valid JPEG image')
            elif data.startswith(b'\x89PNG'):  # PNG
                print(f'  Valid PNG image')
            else:
                print(f'  Header: {data[:20]}')
    except Exception as e:
        print(f'{name}: Error - {e}')
