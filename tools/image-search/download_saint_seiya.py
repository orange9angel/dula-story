import sys
sys.path.insert(0, r'C:\Users\orang\AppData\Roaming\uv\tools\kimi-cli\Lib\site-packages\kimi_cli\skills\image-downloader')
from image_downloader import download_image

# 下载五小强的图片
characters = [
    ('seiya', 'https://images7.alphacoders.com/674/thumb-1920-674813.jpg'),
    ('shiryu', 'https://i.pinimg.com/originals/b5/bc/c7/b5bcc772cf2ebced328380d5668041'),
    ('hyoga', 'https://wallpapercave.com/wp/wp2149278.jpg'),
    ('shun', 'https://i.pinimg.com/originals/68/62/30/686230099ac08e07ed85a998680562'),
    ('ikki', 'https://wallpapercave.com/wp/wp2149278.jpg'),
]

results = {}
for name, url in characters:
    result = download_image(url, f'output/{name}.jpg', timeout=30)
    results[name] = result
    print(f'{name}: success={result["success"]}, size={result.get("size", 0)}')
    if not result['success']:
        print(f'  Error: {result.get("error")}')
