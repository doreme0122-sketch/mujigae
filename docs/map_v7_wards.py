# 와드 10개가 밝히는 땅 그림 (wardsight.js와 같은 규칙): 앞 보물 땅 + 양옆 정글 둘 + 와드 둘레 26m 길목, 벽을 돌아 갈 수 있는 길로 닿는 곳만
import math, numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as nd
from skimage.graph import MCP_Geometric
a = np.array(Image.open('../assets/map/v7.png')).astype(float); raw = (a[..., 1] > 127).astype(float); reg = np.round(a[..., 0] / 12).astype(int)
F = nd.gaussian_filter(raw, 1, truncate=3, mode='nearest'); B = (F > .5) | (reg == 17); N = B.shape[0]; M = 360 / N
c = (np.arange(N) + .5) * M - 180; X, Z = np.meshgrid(c, c); R = np.hypot(X, Z); TH = np.arctan2(Z, X)
A0 = -math.pi / 2; ANG = [A0 + k * math.pi / 5 for k in range(10)]; MID = [x + math.pi / 10 for x in ANG]
angD = lambda t, m: np.abs(np.arctan2(np.sin(t - m), np.cos(t - m)))
COL = [(120, 255, 90), (90, 200, 255), (255, 200, 80), (255, 120, 200), (170, 140, 255), (120, 255, 220), (255, 150, 90), (200, 255, 120), (110, 170, 255), (255, 110, 120)]
img = np.zeros((N, N, 3)); img[~B] = (40, 44, 50); img[B & (reg != 17)] = (150, 150, 158); img[reg == 17] = (12, 12, 16)
cover = np.zeros((N, N), int) - 1
for k, m in enumerate(MID):
    r = 96
    while r > 80 and B[int((math.sin(m) * r + 180) / M), int((math.cos(m) * r + 180) / M)]: r -= 1
    wx, wz = math.cos(m) * r, math.sin(m) * r
    dm = angD(TH, m); sect = (dm <= math.pi / 5 + .05) & (R >= 30) & (R <= 160)
    pas = sect & ~B
    inR = ((reg >= 11) & (reg <= 15) & (dm < math.pi / 10)) | ((reg == 3) & (dm < math.pi / 5)) | (np.hypot(X - wx, Z - wz) < 26) | ((np.abs(-X * math.sin(m) + Z * math.cos(m)) < 6.5) & ((X * math.cos(m) + Z * math.sin(m)) > 30) & ((X * math.cos(m) + Z * math.sin(m)) < 100))
    s = (int((wz + 180) / M), int((wx + 180) / M)); mcp = MCP_Geometric(np.where(pas, 1., np.inf)); D, _ = mcp.find_costs([s])
    got = np.isfinite(D) & inR & pas
    cover[got & (cover < 0)] = k
    img[got] = img[got] * .35 + np.array(COL[k]) * .65
    globals().setdefault('WP', []).append((wx, wz))
Z2 = 2; pic = Image.fromarray(img.astype(np.uint8)).resize((N * Z2, N * Z2), Image.NEAREST); d = ImageDraw.Draw(pic)
f = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc', 20); fs = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc', 14)
toP = lambda x, z: ((x + 180) / M * Z2, (z + 180) / M * Z2)
for k, (wx, wz) in enumerate(WP):
    x, y = toP(wx, wz); d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=COL[k], outline=(255, 255, 255), width=2); d.text((x, y - 22), f'와드 {k + 1}', fill=(255, 255, 255), font=fs, anchor='mm')
for k, a_ in enumerate(ANG):
    x, y = toP(math.cos(a_) * 158, math.sin(a_) * 158); d.text((x, y), f'방{k + 1}', fill=(190, 255, 80), font=fs, anchor='mm')
d.text((20, 20), '와드 10개가 밝히는 땅 — 앞 보물 땅 + 양옆 정글 둘 + 둘레 길목 + 옆 샛길 끝까지', fill=(235, 240, 230), font=f)
pic.save('map_v7_wards.png'); print('ok')
