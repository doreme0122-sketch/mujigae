# 맵 6안 벽 줄기 뽑기 — 벽 지도(v6.png G)에서 벽 한가운데 선(뼈대)을 따라 이은 길을 만들어 v6.json 'ridges'에 넣는다
# · 벽 지도는 게임과 똑같이 번지게(가우스 1칸) 한 뒤 .5 넘는 곳 = 벽 (flight.js loadBlock과 같음)
# · 길마다 벽 종류: 그 벽이 닿은 땅을 보고 정함 (얼음 성운 → 빙하 얼음, 결정 협곡 → 자수정, 폭풍 고원 → 고대 유적, 안개 늪 → 성운 산호, 나머지 → 용암 흑요석)
# · 갈림길에서는 가장 곧게 이어지는 가지끼리 한 길로 이음(갈림길마다 벽이 끊겨 가늘어지지 않게)
import json, numpy as np
from PIL import Image
from scipy import ndimage as nd
from skimage.morphology import skeletonize

a = np.array(Image.open('../assets/map/v6.png')).astype(float)
raw = (a[..., 1] > 127).astype(float); reg = np.round(a[..., 0] / 12).astype(int)
F = nd.gaussian_filter(raw, 1, truncate=3, mode='nearest'); M = F > .5
N = M.shape[0]
THEME = {6: 'ice', 8: 'crystal', 10: 'ruins', 3: 'coral'}
# 벽 칸마다 종류: 둘레 6칸 안에 닿은 땅 중 테마 땅이 있으면 그 벽, 없으면 흑요석
kind = np.zeros(M.shape, int)            # 0 흑요석, 1.. THEME 순서
TK = list(THEME.keys())
cnt = np.stack([nd.uniform_filter((reg == k).astype(float), 13) for k in TK])
best = cnt.argmax(0); has = cnt.max(0) > .02
kind = np.where(has, best + 1, 0)
NAMES = ['obsidian'] + [THEME[k] for k in TK]

sk = skeletonize(M)
nb = nd.convolve(sk.astype(int), np.ones((3, 3), int), mode='constant') - 1
nb = np.where(sk, nb, 0)
OFF = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
def nbrs(y, x):
    for dy, dx in OFF:
        yy, xx = y + dy, x + dx
        if 0 <= yy < N and 0 <= xx < N and sk[yy, xx]: yield yy, xx
# 가지 따라가기
node = sk & (nb != 2)
seen_e = set(); paths = []
def walk(y0, x0, y1, x1):
    p = [(y0, x0), (y1, x1)]; py, px = y0, x0; y, x = y1, x1
    while not node[y, x]:
        nxt = [q for q in nbrs(y, x) if q != (py, px) and q not in p[-3:]]
        if not nxt: break
        py, px = y, x; y, x = nxt[0]; p.append((y, x))
        if (y, x) == p[0]: break
    return p
for y, x in zip(*np.nonzero(node)):
    for q in nbrs(y, x):
        e = frozenset([(y, x), q])
        if e in seen_e: continue
        p = walk(y, x, *q)
        for i in range(len(p) - 1): seen_e.add(frozenset([p[i], p[i + 1]]))
        paths.append(p)
# 고리(갈림길 없는 닫힌 벽)
left = sk.copy()
for p in paths:
    for q in p: left[q] = False
lab, n = nd.label(left, np.ones((3, 3)))
for i in range(1, n + 1):
    ys, xs = np.nonzero(lab == i); s = (ys[0], xs[0]); p = [s]; prev = None; cur = s
    while True:
        nx_ = [q for q in nbrs(*cur) if lab[q] == i and q != prev and q not in p[-3:]]
        if not nx_: break
        prev, cur = cur, nx_[0]
        if cur == s: break
        p.append(cur)
    if len(p) > 4: paths.append(p + [p[0]])
# 짧은 잔가지 버림 (끝이 막다른 5칸 미만)
deg_end = lambda q: nb[q] == 1
paths = [p for p in paths if not (len(p) < 6 and (deg_end(p[0]) or deg_end(p[-1])))]
# 갈림길에서 가장 곧은 짝끼리 잇기
def dirv(p, at_start):
    q = p if at_start else p[::-1]; k = min(len(q) - 1, 5)
    return np.array([q[k][0] - q[0][0], q[k][1] - q[0][1]], float)
changed = True
while changed:
    changed = False
    ends = {}
    for i, p in enumerate(paths):
        if p[0] == p[-1]: continue
        ends.setdefault(p[0], []).append((i, True)); ends.setdefault(p[-1], []).append((i, False))
    best_ = None
    for j, lst in ends.items():
        for a_ in range(len(lst)):
            for b_ in range(a_ + 1, len(lst)):
                (i, sa), (k, sb) = lst[a_], lst[b_]
                if i == k: continue
                da, db = dirv(paths[i], sa), dirv(paths[k], sb)
                c = -(da @ db) / (np.linalg.norm(da) * np.linalg.norm(db) + 1e-9)    # 1 = 곧게 이어짐
                if c > .5 and (best_ is None or c > best_[0]): best_ = (c, i, sa, k, sb)
    if best_:
        _, i, sa, k, sb = best_
        A = paths[i] if not sa else paths[i][::-1]      # A 끝이 갈림길
        B = paths[k] if sb else paths[k][::-1]          # B 시작이 갈림길
        paths[i] = A + B[1:]; paths.pop(k); changed = True
# 종류별로 자르기 (한 종류가 8칸 넘게 이어질 때만 나눔)
out = []
for p in paths:
    ks = [kind[q] for q in p]
    runs = []; s = 0
    for i in range(1, len(p) + 1):
        if i == len(p) or ks[i] != ks[s]: runs.append([s, i, ks[s]]); s = i
    m = []
    for r in runs:
        if m and (r[1] - r[0] < 8 or m[-1][1] - m[-1][0] < 8): m[-1][1] = r[1]; m[-1][2] = m[-1][2] if m[-1][1] - m[-1][0] >= r[1] - r[0] else r[2]
        else: m.append(r)
    for s, e, k in m:
        q = p[max(0, s - 1):e + 1]
        if len(q) < 3: continue
        pts = q[::3] + ([q[-1]] if (len(q) - 1) % 3 else [])
        out.append({'k': NAMES[k], 'p': [[int(x) * 2 + 1, int(y) * 2 + 1] for y, x in pts]})
J = json.load(open('../assets/map/v6.json')); J['ridges'] = out
json.dump(J, open('../assets/map/v6.json', 'w'), ensure_ascii=False, separators=(',', ':'))
from collections import Counter
print(len(out), 'ridges', Counter(r['k'] for r in out), 'pts', sum(len(r['p']) for r in out))
