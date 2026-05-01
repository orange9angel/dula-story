import whisper
model = whisper.load_model('base')
result = model.transcribe('episodes/starlight_courier/output/check_3min.wav', language='zh')
for seg in result['segments']:
    print(f"[{seg['start']:.1f}s] {seg['text']}")
