import sys
sys.path.insert(0, r'C:\Users\orang\AppData\Roaming\uv\tools\kimi-cli\Lib\site-packages\kimi_cli\skills\image-downloader')
from image_downloader import download_image

# 下载紫龙和瞬的图片
characters = [
    ('shiryu', 'https://cdn.suwalls.com/wallpapers/anime/dragon-shiryu-saint-seiya-28520-1920x1080.jpg'),
    ('shun', 'http://fc08.deviantart.net/fs71/i/2013/150/f/5/andromeda_shun_saint_seiya_omega_by_jounai_974-d676jay.jpg'),
]

for name, url in characters:
    result = download_image(url, f'output/{name}.jpg', timeout=30)
    print(f'{name}: success={result["success"]}, size={result.get("size", 0)}')
    if not result['success']:
        print(f'  Error: {result.get("error")}')
