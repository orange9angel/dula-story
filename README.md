# Doula Content

This is the content repository for Doula animation episodes.

## Structure

```
episodes/
  └── bichong_qiupai/          # One directory per episode
        ├── script.story        # Animation script (dialogue + cues)
        ├── config/
        │   ├── transitions.json    # Scene transition config
        │   ├── voice_config.json   # TTS voice mapping
        │   └── choreography.json   # Ball events, placements, props
        └── assets/
            └── audio/
                ├── music/      # BGM tracks
                └── sfx/        # Sound effects
```

## Workflow

1. Write or edit `episodes/<name>/script.story`
2. Run audio generation from the engine directory:
   ```bash
   python tools/generate_audio.py ../doula-content/episodes/bichong_qiupai
   ```
3. Run video rendering from the engine directory:
   ```bash
   node generate_video.js ../doula-content/episodes/bichong_qiupai
   ```
