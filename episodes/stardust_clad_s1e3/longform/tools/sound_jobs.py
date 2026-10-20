"""Volcano environmental sources for the long episode, with content cache."""
from pathlib import Path
import hashlib,importlib.util,json,sys
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0,str(Path(__file__).parent))
from audio_jobs import ROOT,WS,setup,save
JOBS={
 'store_air':'10秒，纯环境音，无音乐无人声。厚木梁旧索仓内，极轻的空气流动和远处低沉山风，封闭木屋的柔和空间感，平稳、无阵风、无节律性涌动、音量恒定、无静默间隙，不要脚步、敲击或鸟叫。',
 'glasshouse_air':'10秒，纯环境音，无音乐无人声。高山温室内，微弱温暖气管通风声，玻璃外极远的风，细软低频空气，平稳、无阵风、无节律性涌动、音量恒定、无静默间隙，没有滴水，没有虫鸣，没有脚步。',
 'well_air':'10秒，纯环境音，无音乐无人声。巨大竖井内持续的深沉气流轰鸣，石壁有宽阔柔和混响，中低频，平稳、无阵风、无节律性涌动、音量恒定、无静默间隙，没有机械节拍，没有铃声。',
 'bell_tap':'5秒，纯音效，无音乐无人声。人用指节轻敲一个缺少铃舌的厚铜铃，两下清楚干脆的空心铜响，间隔半秒，随后很短自然余韵，近距离录音，不要连串铃铛，不要旋律。',
 'gate_grind':'7秒，纯音效，无音乐无人声。沉重铁闸在巨大压力下缓慢抬升，粗金属和齿轮短暂咬合、石灰碎屑落下，声音沉稳有重量，末尾一次清楚锁定撞击，不能像科幻电机，没有爆炸。',
 'wind_release':'8秒，纯音效，无音乐无人声。高压空气从巨大的井底闸口释放，起初短促撕开，然后宽阔厚重的风流由强渐弱，带少量细碎金属尘鸣，不要雷声，不要爆炸，不要发动机。',
 'wood_creak':'5秒，纯音效，无音乐无人声。一块旧吊桥木板承受人的重量，先低沉吱呀，再短促木纤维裂响，碎小木片落下，近处清楚质感，无脚步无风。',
 'buckle_click':'4秒，纯音效，无音乐无人声。近距离金属登山保险扣轻轻打开，穿过粗麻绳扣环，再啪地闭合一次，皮革和衣料轻擦，细小真实，不要机关枪似连响。',
 'wood_step':'5秒，纯音效，无音乐无人声。一只皮靴踩在厚实木质吊桥板上，单次清楚落脚，低沉木响伴轻微鞋底摩擦，随后安静，不要连续走路，不要风。',
}
def work(item):
 name,prompt=item;out=ROOT/'assets/audio/sfx'/f'{name}.wav';meta=out.with_suffix('.source.json')
 tag=hashlib.sha256(prompt.encode()).hexdigest()
 if out.exists() and meta.exists():
  old=json.loads(meta.read_text(encoding='utf-8'))
  if old.get('tag')==tag and old.get('sha256')==hashlib.sha256(out.read_bytes()).hexdigest():return name,'cached'
 spec=importlib.util.spec_from_file_location('seedaudio',WS/'dula-skills/volc-voice-casting/scripts/seedaudio_gen.py')
 mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);out.parent.mkdir(parents=True,exist_ok=True)
 billed=mod.generate(prompt,out)
 save(meta,{'provider':'volcano-seedaudio','prompt':prompt,'tag':tag,'billed_duration':billed,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()})
 return name,'generated'
if __name__=='__main__':
 setup()
 with ThreadPoolExecutor(max_workers=2)as pool:
  for result in pool.map(work,JOBS.items()):print(result,flush=True)
