# Comic Book Demo

Five generated key images are rendered as a short audio comic with page-turn motion.

Build steps:

```powershell
powershell -ExecutionPolicy Bypass -File .\build_audio.ps1
python .\build_audio_edge.py
node .\render_frames.mjs
ffmpeg -y -framerate 24 -i .\frames\frame_%05d.png -i .\assets\audio\mixed.wav -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest .\output\starlight_courier_demo.mp4
```
