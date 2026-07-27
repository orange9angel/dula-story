import base64, json, os, sys, time, urllib.request, urllib.error

API_KEY = os.environ["DASHSCOPE_API_KEY"]
BASE = "https://dashscope.aliyuncs.com/api/v1"

def http_json(url, payload=None, headers=None, timeout=120):
    h = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    if headers: h.update(headers)
    data = json.dumps(payload).encode() if payload else None
    req = urllib.request.Request(url, data=data, headers=h, method="POST" if data else "GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode(errors=chr(39)+chr(39))}")

def enc(p):
    return "data:image/png;base64," + base64.b64encode(open(p, "rb").read()).decode()

content = [
    {"image": enc("frames/frame_04_rgb.png")},
    {"text": "保持图1中完全相同的女孩（面孔、马尾发夹、07号球衣、只有左手一只红色腕带）、"
             "相同的球馆、光线、画风和篮架位置。"
             "改变：她已经落地，双脚站回地板，右臂保持出手后的跟随动作、手腕下压，"
             "目光追随篮球；篮球已经飞到画面右侧的篮筐处、正在接近篮网，不在她手边。"},
]
payload = {"model": "wan2.7-image-pro",
           "input": {"messages": [{"role": "user", "content": content}]},
           "parameters": {"n": 1, "size": "2K", "watermark": False}}
rsp = http_json(f"{BASE}/services/aigc/image-generation/generation", payload,
                {"X-DashScope-Async": "enable"})
tid = rsp["output"]["task_id"]
print("task:", tid, flush=True)
for _ in range(120):
    time.sleep(5)
    st = http_json(f"{BASE}/tasks/{tid}")["output"]
    if st["task_status"] == "SUCCEEDED":
        url = st["choices"][0]["message"]["content"][0]["image"]
        with urllib.request.urlopen(url, timeout=180) as r, open("frames/frame_05_v2.png", "wb") as f:
            f.write(r.read())
        print("saved frames/frame_05_v2.png"); break
    if st["task_status"] in ("FAILED", "CANCELED"):
        print("FAILED:", json.dumps(st, ensure_ascii=False)); sys.exit(1)
