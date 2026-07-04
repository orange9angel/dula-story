import re
import sys

STORY_PATH = sys.argv[1] if len(sys.argv) > 1 else "../script.story"

with open(STORY_PATH, "r", encoding="utf-8") as f:
    content = f.read()


def parse_time(ts):
    """Parse SRT time string HH:MM:SS,mmm to seconds."""
    h, m, s = ts.split(":")
    s, ms = s.split(",")
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


lines = content.splitlines()
out_lines = []
current_block_start = 0.0

sfx_re = re.compile(r"\{SFX:Procedural\|([^}]+)\}")

for line in lines:
    # Detect SRT time line to update current block start
    time_match = re.match(
        r"(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})",
        line.strip(),
    )
    if time_match:
        current_block_start = parse_time(f"{time_match.group(1)}:{time_match.group(2)}:{time_match.group(3)},{time_match.group(4)}")
        out_lines.append(line)
        continue

    def replace_sfx(m):
        body = m.group(1)
        parts = {}
        for p in body.split("|"):
            if "=" in p:
                k, v = p.split("=", 1)
                parts[k.strip()] = v.strip()
        sfx_type = parts.get("type", "energy_blast")
        start = float(parts.get("start", current_block_start))
        offset = max(0.0, start - current_block_start)
        return f"{{SFX:Play|name={sfx_type}|offset={offset:.3f}}}"

    new_line = sfx_re.sub(replace_sfx, line)
    out_lines.append(new_line)

with open(STORY_PATH, "w", encoding="utf-8") as f:
    f.write("\n".join(out_lines))

print(f"Converted procedural SFX tags in: {STORY_PATH}")
