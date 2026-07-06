#!/usr/bin/env python3
"""
Download a royalty-free mecha/rock opening track from Pixabay and trim it.

Default track:
  "Strong Character (powerful fuzz action sport rock)" by LightStockMusic
  Pixabay Content License, free for commercial use.
  URL: https://pixabay.com/music/main-title-strong-character-powerful-fuzz-action-sport-rock-513742/

Outputs:
  - ../output/opening_music.mp3   (full downloaded file)
  - ../output/opening_music_15s.mp3 (trimmed to 15 seconds)
"""
import os
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parent.parent
OUTPUT_DIR = ROOT / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_PAGE_URL = "https://pixabay.com/music/main-title-strong-character-powerful-fuzz-action-sport-rock-513742/"
FULL_PATH = OUTPUT_DIR / "opening_music.mp3"
TRIM_PATH = OUTPUT_DIR / "opening_music_15s.mp3"


def extract_pixabay_cdn(page_url, timeout=30):
    from playwright.sync_api import sync_playwright
    cdn_url = None
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        context.add_init_script(
            """
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            """
        )
        page = context.new_page()
        try:
            page.goto(page_url, wait_until="load", timeout=timeout * 1000)
            page.wait_for_timeout(2500)
            html = page.content()
            matches = list(set(re.findall(r'https?://cdn\.pixabay\.com/[^\s"\'<>]+', html)))
            audio_exts = (".mp3", ".wav", ".ogg", ".flac")
            audio_matches = [m for m in matches if any(ext in m.lower() for ext in audio_exts)]
            if audio_matches:
                cdn_url = audio_matches[0]
        except Exception as e:
            print(f"Playwright error: {e}")
        finally:
            browser.close()
    return cdn_url


def download(url, dest, timeout=60):
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        with open(dest, "wb") as f:
            f.write(response.read())
    return dest.stat().st_size


def trim_to_15s(src, dst):
    # Use the loudest/most energetic 15-second segment starting after intro build.
    # The track is ~2:14; pick 0:06 -> 0:21 to skip the fade-in and hit the main riff.
    cmd = [
        "ffmpeg", "-y", "-i", str(src),
        "-ss", "00:00:06", "-t", "15",
        "-af", "afade=t=in:ss=0:d=0.3,afade=t=out:st=14.5:d=0.5,loudnorm=I=-14:TP=-1:LRA=11",
        "-c:a", "libmp3lame", "-b:a", "192k",
        str(dst),
    ]
    subprocess.run(cmd, check=True)
    return dst


def main():
    page_url = DEFAULT_PAGE_URL
    print(f"Extracting CDN URL from {page_url}...")
    cdn_url = extract_pixabay_cdn(page_url)
    if not cdn_url:
        print("Failed to extract Pixabay CDN URL.")
        return 1
    print(f"CDN URL: {cdn_url[:100]}...")

    print(f"Downloading to {FULL_PATH}...")
    size = download(cdn_url, FULL_PATH)
    print(f"Downloaded {size} bytes")

    print(f"Trimming to 15 seconds -> {TRIM_PATH}...")
    trim_to_15s(FULL_PATH, TRIM_PATH)
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
