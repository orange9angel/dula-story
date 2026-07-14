#!/usr/bin/env python3
"""
Semantic Audio Analyzer for the F5-TTS voice skill.

Runs before the sox/ffmpeg effect chain. It inspects each line of dialogue
and produces dynamic audio-effect overrides that capture:

  - 语气 (tone / emotion)
  - 语速 (speaking pace)
  - 语调 (intonation: question, exclamation, trailing, etc.)
  - 音色 (timbre: brightness, warmth, age/formant shift)

The overrides are merged on top of the character's personality preset,
so a character keeps its base voice while still sounding emotionally
appropriate for the specific line.

Design goals:
  - Zero external dependencies (no LLM / cloud call).
  - Fast enough to run per line.
  - Language-aware: Chinese is the primary target, with English fallback.
"""

import re


class SemanticAudioAnalyzer:
    """Rule-based semantic analyzer that maps text to audio effect deltas."""

    def __init__(self, language="auto"):
        """
        Args:
            language: 'zh', 'en', or 'auto' (detect per line).
        """
        self.language = language

    # ───────────────────────────────────────────────────────────────────────
    # Public API
    # ───────────────────────────────────────────────────────────────────────

    def analyze(self, text, character_cfg=None):
        """
        Analyze a single dialogue line and return an effect-delta dict.

        The returned dict uses the same keys as the personality/effect system
        in generate_f5_voice.py.  Values are additive deltas that will be
        merged with the base personality effect.

        Args:
            text: dialogue string.
            character_cfg: optional character config dict from voice_config.json.

        Returns:
            dict of effect parameter deltas.
        """
        if not text or not text.strip():
            return {}

        lang = self._detect_language(text) if self.language == "auto" else self.language

        effect = {}
        effect.update(self._analyze_punctuation(text, lang))
        effect.update(self._analyze_emotion_keywords(text, lang))
        effect.update(self._analyze_rhythm(text, lang))
        effect.update(self._analyze_timbre(text, lang, character_cfg))

        return self._clamp_effect(effect)

    # ───────────────────────────────────────────────────────────────────────
    # Language detection
    # ───────────────────────────────────────────────────────────────────────

    @staticmethod
    def _detect_language(text):
        chinese = len(re.findall(r"[\u4e00-\u9fff]", text))
        english = len(re.findall(r"[a-zA-Z]", text))
        if chinese > english and chinese > 0:
            return "zh"
        if english > chinese and english > 0:
            return "en"
        return "zh"

    # ───────────────────────────────────────────────────────────────────────
    # Punctuation & intonation
    # ───────────────────────────────────────────────────────────────────────

    def _analyze_punctuation(self, text, lang):
        """Map terminal and internal punctuation to intonation/speed deltas."""
        effect = {}
        t = text.strip()
        if not t:
            return effect

        # Questions -> rising intonation, slight pitch lift at end
        if t[-1] in "?？" or (lang == "zh" and re.search(r"[吗呢吧嘛]$", t)):
            effect["pitch"] = self._add_semitones(effect.get("pitch", "+0st"), "+1.5st")
            effect["speed"] = effect.get("speed", 0) - 0.03  # questions often slightly slower

        # Exclamations -> emphasis, brighter, tighter compression
        if t[-1] in "!！":
            effect["compression"] = effect.get("compression", 0) + 0.12
            effect["treble"] = effect.get("treble", 0) + 2
            effect["speed"] = effect.get("speed", 0) + 0.04

        # Trailing ellipses / em-dash -> uncertainty, slower, more space
        if re.search(r"\.{3,}|…{1,}|——$", t):
            effect["speed"] = effect.get("speed", 0) - 0.06
            effect["reverb"] = effect.get("reverb", 0) + 0.12

        # Mid-sentence ellipsis -> hesitation / pause feel
        if re.search(r"\.{2,}|…{1,}", t) and not re.search(r"\.{3,}|…{1,}$", t):
            effect["speed"] = effect.get("speed", 0) - 0.04

        # Comma clusters or many short clauses -> slightly faster, more energetic
        clause_count = len(re.split(r"[，,。！!？?；;]", t))
        if clause_count >= 4:
            effect["speed"] = effect.get("speed", 0) + 0.03

        return effect

    # ───────────────────────────────────────────────────────────────────────
    # Emotion keywords
    # ───────────────────────────────────────────────────────────────────────

    EMOTION_PATTERNS_ZH = {
        "happy": {
            "words": ["哈哈", "嘿嘿", "嘻嘻", "开心", "高兴", "太好", "棒", "耶"],
            "effect": {"pitch": "+1.0st", "speed": 0.05, "treble": 2, "reverb": -0.05},
        },
        "sad": {
            "words": ["呜", "呜呜", "难过", "伤心", "哭", "眼泪", "失落", "孤单"],
            "effect": {"pitch": "-1.0st", "speed": -0.06, "reverb": 0.12, "treble": -2},
        },
        "angry": {
            "words": ["哼", "生气", "讨厌", "可恶", "混蛋", "烦", "火大", "怒"],
            "effect": {"pitch": "+0.5st", "speed": 0.07, "compression": 0.14, "bass": 2},
        },
        "surprised": {
            "words": ["哇", "哎呀", "天哪", "真的吗", "居然", "不会吧", "啊？", "啊!", "啊！"],
            "effect": {"pitch": "+2.0st", "speed": 0.06, "treble": 3, "compression": 0.08},
        },
        "worried": {
            "words": ["怎么办", "糟糕", "完了", "怕", "担心", "紧张", "万一"],
            "effect": {"pitch": "+0.5st", "speed": 0.05, "reverb": 0.08, "compression": 0.06},
        },
        "relieved": {
            "words": ["太好了", "终于", "松了一口气", "放心", "幸好", "没事了"],
            "effect": {"pitch": "-0.3st", "speed": -0.04, "reverb": 0.06, "warmth": 1},
        },
        "gentle": {
            "words": ["没关系", "别怕", "慢慢来", "没事", "小心", "温柔"],
            "effect": {"pitch": "-0.5st", "speed": -0.05, "warmth": 2, "compression": -0.05},
        },
        "proud": {
            "words": ["当然", "没问题", "交给我", "厉害", "看我的", "肯定"],
            "effect": {"pitch": "-0.3st", "speed": -0.02, "presence": 2, "compression": 0.06},
        },
    }

    EMOTION_PATTERNS_EN = {
        "happy": {
            "words": ["haha", "hehe", "yay", "great", "happy", "awesome", "wow"],
            "effect": {"pitch": "+1.0st", "speed": 0.05, "treble": 2, "reverb": -0.05},
        },
        "sad": {
            "words": ["sob", "sad", "cry", "sorry", "lonely", "upset", "tears"],
            "effect": {"pitch": "-1.0st", "speed": -0.06, "reverb": 0.12, "treble": -2},
        },
        "angry": {
            "words": ["huh", "angry", "hate", "damn", "annoying", "mad", "furious"],
            "effect": {"pitch": "+0.5st", "speed": 0.07, "compression": 0.14, "bass": 2},
        },
        "surprised": {
            "words": ["ah", "wow", "oh", "what", "really", "no way", "gosh"],
            "effect": {"pitch": "+2.0st", "speed": 0.06, "treble": 3, "compression": 0.08},
        },
        "worried": {
            "words": ["what if", "worried", "nervous", "scared", "anxious", "bad"],
            "effect": {"pitch": "+0.5st", "speed": 0.05, "reverb": 0.08, "compression": 0.06},
        },
        "relieved": {
            "words": ["finally", "relieved", "safe", "glad", "phew", "okay"],
            "effect": {"pitch": "-0.3st", "speed": -0.04, "reverb": 0.06, "warmth": 1},
        },
        "gentle": {
            "words": ["it's okay", "don't worry", "gentle", "careful", "soft"],
            "effect": {"pitch": "-0.5st", "speed": -0.05, "warmth": 2, "compression": -0.05},
        },
        "proud": {
            "words": ["of course", "leave it", "definitely", "sure", "proud"],
            "effect": {"pitch": "-0.3st", "speed": -0.02, "presence": 2, "compression": 0.06},
        },
    }

    def _analyze_emotion_keywords(self, text, lang):
        """Look up emotional keywords and accumulate their effect deltas."""
        patterns = self.EMOTION_PATTERNS_ZH if lang == "zh" else self.EMOTION_PATTERNS_EN
        merged = {}
        matched_emotions = []

        for emotion, data in patterns.items():
            score = 0
            for word in data["words"]:
                if lang == "zh":
                    # Chinese: substring match
                    count = text.count(word)
                else:
                    # English: word-boundary match
                    count = len(re.findall(rf"\b{re.escape(word)}\b", text, re.IGNORECASE))
                score += count

            if score > 0:
                matched_emotions.append((emotion, score))
                for key, value in data["effect"].items():
                    if key == "pitch":
                        merged[key] = self._add_semitones(merged.get(key, "+0st"), value)
                    else:
                        # Weight by number of keyword hits so strong emotions dominate.
                        merged[key] = merged.get(key, 0) + value * min(score, 2)

        # Normalize pitch delta so multiple emotions don't explode the value.
        if "pitch" in merged:
            merged["pitch"] = self._clamp_semitones(merged["pitch"], -2.5, 2.5)

        return merged

    # ───────────────────────────────────────────────────────────────────────
    # Rhythm (语速 + 停顿感)
    # ───────────────────────────────────────────────────────────────────────

    def _analyze_rhythm(self, text, lang):
        """Adjust pace based on sentence length and structural density."""
        effect = {}
        char_count = len(re.findall(r"[\u4e00-\u9fff]", text)) if lang == "zh" else len(text.split())

        # Long lines naturally need a hair more time to be intelligible.
        if char_count > 20:
            effect["speed"] = effect.get("speed", 0) - 0.03
        elif char_count < 6:
            # Short interjections can be a bit punchier.
            effect["speed"] = effect.get("speed", 0) + 0.02

        # Many repeated characters (e.g. "啊啊啊", "哈哈哈") -> emphasis / drawn out
        repeats = len(re.findall(r"(.)\1{2,}", text))
        if repeats:
            effect["speed"] = effect.get("speed", 0) - 0.03 * repeats
            effect["compression"] = effect.get("compression", 0) + 0.05 * repeats

        return effect

    # ───────────────────────────────────────────────────────────────────────
    # Timbre (音色)
    # ───────────────────────────────────────────────────────────────────────

    def _analyze_timbre(self, text, lang, character_cfg=None):
        """
        Fine-tune timbre (brightness/warmth/age) based on semantic cues.

        We deliberately keep timbre deltas subtle: the character's base voice
        and F5-TTS reference are responsible for the core identity.  The
        analyzer only nudges timbre to match the emotional color of the line.
        """
        effect = {}
        t = text

        # Whisper / secret / fear -> darker, more intimate, less bright
        if re.search(r"小声|秘密|悄悄|害怕|恐惧|whisper|secret|afraid", t):
            effect["treble"] = effect.get("treble", 0) - 2
            effect["warmth"] = effect.get("warmth", 0) + 1
            effect["compression"] = effect.get("compression", 0) - 0.05

        # Shout / call / cheer -> brighter, more present
        if re.search(r"叫|喊|救命|加油|快来|shout|scream|help", t):
            effect["treble"] = effect.get("treble", 0) + 2
            effect["presence"] = effect.get("presence", 0) + 2
            effect["compression"] = effect.get("compression", 0) + 0.08

        # Childish / cute register -> slightly lift formant (younger)
        if re.search(r"嘛|啦|呀|呢|哼|cute|little", t):
            effect["formant"] = self._add_semitones(effect.get("formant", "0"), "-0.5")

        # Authority / narration / teaching -> slightly lower formant (older/warmer)
        if character_cfg and character_cfg.get("role") in ("narrator", "teacher", "adult"):
            effect["formant"] = self._add_semitones(effect.get("formant", "0"), "+0.3")

        return effect

    # ───────────────────────────────────────────────────────────────────────
    # Helpers
    # ───────────────────────────────────────────────────────────────────────

    @staticmethod
    def _add_semitones(base, delta):
        """Add two semitone strings like '+1st' and '-0.5st'."""
        base_val = SemanticAudioAnalyzer._parse_semitones(base)
        delta_val = SemanticAudioAnalyzer._parse_semitones(delta)
        total = base_val + delta_val
        sign = "+" if total >= 0 else ""
        return f"{sign}{total:.1f}st"

    @staticmethod
    def _parse_semitones(value):
        if isinstance(value, (int, float)):
            return float(value)
        m = re.match(r"([+-]?\d+(?:\.\d+)?)st?", str(value).strip())
        return float(m.group(1)) if m else 0.0

    @staticmethod
    def _clamp_semitones(value, min_st, max_st):
        val = SemanticAudioAnalyzer._parse_semitones(value)
        val = max(min_st, min(max_st, val))
        sign = "+" if val >= 0 else ""
        return f"{sign}{val:.1f}st"

    @staticmethod
    def _clamp_effect(effect):
        """Clamp numeric deltas to reasonable ranges."""
        clamps = {
            "speed": (-0.25, 0.25),
            "compression": (-0.2, 0.35),
            "reverb": (-0.2, 0.3),
            "treble": (-5, 6),
            "bass": (-4, 5),
            "presence": (-3, 4),
            "warmth": (-3, 4),
            "formant": (-1.5, 1.5),  # numeric semitones
        }
        for key, (lo, hi) in clamps.items():
            if key in effect:
                if key == "formant":
                    effect[key] = max(lo, min(hi, effect[key]))
                else:
                    effect[key] = max(lo, min(hi, effect[key]))
        return effect


# ─────────────────────────────────────────────────────────────────────────
# Convenience entry point
# ─────────────────────────────────────────────────────────────────────────

def analyze_text(text, character_cfg=None, language="auto"):
    """Analyze a line of text and return effect deltas."""
    analyzer = SemanticAudioAnalyzer(language=language)
    return analyzer.analyze(text, character_cfg)


if __name__ == "__main__":
    samples = [
        "真的吗？那岂不是很厉害！",
        "不要不理我……我在这里啊……",
        "哈哈，他们真的完全没反应！太自由了！",
        "下次不要突然消失，我们会担心的。",
        "What? I can't believe it!",
    ]
    for s in samples:
        print(f"{s!r} -> {analyze_text(s)}")
