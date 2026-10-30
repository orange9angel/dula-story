"""底图分层：放大到 painted-space 默认 1920x1080；前景椅背抠层 + 中景修补；玻璃高光层；球体标定。"""
import json, numpy as np, cv2
from PIL import Image
src = Image.open('hybrid/plates/plate_full_v1.png').convert('RGB')
img = np.asarray(src.resize((1920, 1080), Image.LANCZOS)).astype(np.float32)
H, W = img.shape[:2]
lum = img @ np.array([.299, .587, .114], np.float32)
# 前景椅背：底部带内的暗色连通区（椅背近黑，台口亮）
band = np.zeros((H, W), bool); band[int(H*.84):] = True
seat = (cv2.GaussianBlur(lum, (0, 0), 3) < 52) & band
seat = cv2.morphologyEx(seat.astype(np.uint8)*255, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
# 保留与底边相连的部分
n, lab = cv2.connectedComponents(seat)
keep = np.isin(lab, [l for l in np.unique(lab[-1]) if l]); seat = keep.astype(np.uint8)*255
alpha = cv2.GaussianBlur(seat, (0, 0), 1.5)
Image.fromarray(np.dstack([img.astype(np.uint8), alpha])).save('hybrid/plates/fg_seats.png')
inpaint = cv2.inpaint(img.astype(np.uint8)[..., ::-1], cv2.dilate(seat, np.ones((15, 15), np.uint8)), 9, cv2.INPAINT_TELEA)[..., ::-1]
Image.fromarray(inpaint).save('hybrid/plates/bg_clean.png')
# 球体标定：Hough 圆于上半幅
g = cv2.GaussianBlur(lum.astype(np.uint8), (0, 0), 2)
c = cv2.HoughCircles(g, cv2.HOUGH_GRADIENT, dp=1.5, minDist=500, param1=60, param2=40, minRadius=230, maxRadius=320)
cx, cy, r = [float(v) for v in c[0][0]]
# 玻璃高光：球内亮度高通（只取正值）
yy, xx = np.mgrid[:H, :W]; d = np.hypot(xx-cx, yy-cy)
ring = np.clip((r*1.02-d)/6, 0, 1)
hp = np.clip(img - cv2.GaussianBlur(img, (0, 0), 18), 0, 255) * 1.3
hl = (hp * ring[..., None]).clip(0, 255).astype(np.uint8)
Image.fromarray(hl).save('hybrid/plates/glass_highlights.png')
json.dump({'plate': [W, H], 'source': 'hybrid/plates/plate_full_v1.png', 'ball': {'cx': round(cx, 1), 'cy': round(cy, 1), 'r': round(r, 1)},
           'seatAlphaPixels': int((alpha > 128).sum())}, open('config/plate_calibration.json', 'w'), indent=1)
print(cx, cy, r, int((alpha > 128).sum()))
