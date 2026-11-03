# 맵 7안 1단계 (2026-11-03): 다 비우고 '살아나는 방' 10개부터
# · 맵 360m 정사각형 안에 둥근 싸움터(반지름 168m). 바깥은 소행성 잔해(못 지나감)
# · 살아나는 방: 싸움터 가장자리에 반쯤 박힌 둥근 방(안 지름 28m). 바깥 절반은 싸움터 밖으로 튀어나가 등 뒤가 막혀 있고, 가운데 쪽으로 나가는 문 하나
#   - 기체는 방 한가운데에서 태어남 · 기지 고리(반지름 9m)를 벗어나면 보호막·가속 시작 → 문(폭 10m)을 지나 싸움터로
# · 10곳 모두 가운데에서 같은 거리, 같은 모양 (회전만, 좌우 거울 없음 — 다음 단계에서 조각을 채울 때도 회전만 씀)
# 결과: assets/map/v7.png (R 땅 번호×12 · G 벽 1/0 · B 길 없음) · assets/map/v7.json
import json, math, numpy as np
from PIL import Image
from scipy import ndimage as ndi

N = 500; M = 360 / N                                   # 칸 하나 = 0.72m
c = (np.arange(N) + .5) * M - 180; X, Z = np.meshgrid(c, c)
R = np.hypot(X, Z); TH = np.arctan2(Z, X)
A0 = -math.pi / 2; ANG = [A0 + k * 2 * math.pi / 10 for k in range(10)]
RP = 158.                                              # 싸움터 반지름
ROOM = 14.; WW = 4.3; DOOR = 10.                       # 방 안 반지름 · 벽 두께(맵 어디서나 같음) · 문 폭
play = R <= RP
rooms = np.zeros_like(play); roomWall = np.zeros_like(play); doorCut = np.zeros_like(play)
for a in ANG:
    cx, cz = math.cos(a) * RP, math.sin(a) * RP; d = np.hypot(X - cx, Z - cz)
    rooms |= d <= ROOM
    roomWall |= (d > ROOM) & (d <= ROOM + WW)
    ux, uz = -math.cos(a), -math.sin(a)                # 방에서 가운데 쪽
    along = (X - cx) * ux + (Z - cz) * uz; side = np.abs(-(X - cx) * uz + (Z - cz) * ux)
    doorCut |= (along > 0) & (side < DOOR / 2) & (d <= ROOM + WW + .5)
inside = play | rooms                                  # 다닐 수 있는 땅 (방 바깥 절반 포함)
outerWall = play & (R > RP - WW) & ~rooms              # 싸움터 가장자리 벽 (방 자리는 뚫림)
# ── 보물 땅 10곳 (이웃 두 방 사이, 싸움터 가장자리에 등을 댐) ──
# · 모양: 가장자리 쪽은 좁고(방 옆으로 지나갈 틈을 남김) 안쪽은 불룩한 주머니, 맨 안쪽 끝은 둥글게. 테두리가 반듯하지 않게 굽이침(바위 언덕을 깎아 낸 듯)
# · 둘레는 빈틈없이 벽, 문은 셋: 왼쪽 방 쪽 · 오른쪽 방 쪽 · 가운데 쪽 (문 폭 약 6m — 길목 싸움)
# · 10곳 모두 같은 모양 (한 조각을 돌려 붙임, 거울 없음 — 왼쪽과 오른쪽 굽이가 서로 다름)
MID = [a + math.pi / 10 for a in ANG]
TDW = 6.; AREA = []; frontDoor = np.zeros(X.shape, bool); tre = np.zeros_like(play); treDoor = np.zeros_like(play); treId = np.zeros(X.shape, np.int8)
for k, m in enumerate(MID):
    ph = np.arctan2(np.sin(TH - m), np.cos(TH - m))                  # 이 보물 땅 가운데 줄에서 잰 각도
    deg = np.degrees(ph); t = np.clip((R - 112) / (RP - 112), 0, 1)
    # 곳마다 굽이·불룩한 자리·안쪽 끝 모양이 다름 (넓이·문 자리·가운데까지 거리는 거의 같게 → 공평함은 유지)
    g = np.random.default_rng(100 + k); p1, p2, p3 = g.uniform(0, 6.28, 3); lob = g.uniform(-1, 1); tilt = g.uniform(-.5, .5)
    half = 8.6 + 4.6 * np.sin(np.pi * np.clip((R - 104) / 56, 0, 1)) ** 1.3 \
        + (1.0 + .6 * g.uniform()) * np.sin(R * (.13 + .06 * g.uniform()) + p1 + np.sign(deg) * (.6 + .8 * g.uniform())) \
        + .7 * np.sin(R * (.33 + .15 * g.uniform()) + p2 * np.sign(deg)) \
        + 3.2 * lob * np.exp(-((R - 126 - 10 * tilt) / 8) ** 2) * (np.sign(deg) == np.sign(lob + 1e-9))   # 한쪽 옆구리가 불룩 (곳마다 다른 쪽·높이)
    rin = 112 + 7 * (deg / 13) ** 2 + (2.5 + 2.5 * g.uniform()) * np.sin(deg * (.35 + .3 * g.uniform()) + p3) + 7 * tilt * deg / 13
    bc, bw = g.uniform(-7, 7), g.uniform(2.5, 4.5); rin = rin + g.uniform(4, 9) * np.exp(-((deg - bc) / bw) ** 2)   # 안쪽 끝에 움푹 파인 자리 (곳마다 자리·깊이 다름)
    half = np.where(R > 141, np.minimum(half, 8.8), half)              # 방 옆은 좁게 → 방과 보물 땅 사이 틈을 늘 남김
    mk = (np.abs(deg) <= half) & (R >= rin) & play
    mk = ndi.gaussian_filter(mk.astype(float), 2.2) > .5               # 모서리를 둥글게 (깎아 낸 바위처럼)
    tre |= mk; treId[mk] = 11 + k % 5; AREA.append(mk.sum() * M * M)
    # 문 자리: 이 보물 땅의 실제 벽 위에 (모양이 곳마다 달라도 문은 늘 벽을 곧게 뚫음)
    ring_ = mk & ~ndi.binary_erosion(mk, iterations=int(round(WW / M)))
    ic = (math.cos(m) * 132, math.sin(m) * 132)                         # 보물 땅 안쪽 한가운데
    def door_at(cx_, cz_):                                             # 안쪽 한가운데 → 바깥 목표로 줄을 그어, 그 줄이 벽을 지나는 자리를 줄 방향으로 곧게 뚫음
        dx, dz = cx_ - ic[0], cz_ - ic[1]; L_ = math.hypot(dx, dz); dx /= L_; dz /= L_; hit = []
        for t_ in np.arange(0, L_ + 15, .25):
            x_, z_ = ic[0] + dx * t_, ic[1] + dz * t_; ii, jj = int((x_ + 180) / M), int((z_ + 180) / M)
            if 0 <= ii < N and 0 <= jj < N and ring_[jj, ii]: hit.append(t_)
        if not hit: return np.zeros_like(play)
        t0 = (hit[0] + hit[-1]) / 2 if hit[-1] - hit[0] < 3 * WW else hit[0] + WW / 2
        qx, qz = ic[0] + dx * t0, ic[1] + dz * t0
        along = (X - qx) * dx + (Z - qz) * dz; acr = np.abs(-(X - qx) * dz + (Z - qz) * dx)
        return (np.abs(along) < WW + 1.5) & (acr < TDW / 2)
    for side in (-1, 1):                                               # 옆문: 방 쪽 옆구리, 반지름 130m쯤
        a2 = m + side * math.radians(20); treDoor |= door_at(math.cos(a2) * 128, math.sin(a2) * 128)
    fd_ = door_at(math.cos(m) * 100, math.sin(m) * 100); treDoor |= fd_; frontDoor |= fd_   # 앞문: 가운데 쪽 끝
treWall = tre & ~ndi.binary_erosion(tre, iterations=int(round(WW / M)))
print('보물 땅 넓이(m²)', [round(a_) for a_ in AREA])
# ── 사냥터 10곳 (사용자 2026-11-03): 이웃 두 보물 땅의 안쪽 면을 벽으로 이어, 방 앞 땅을 감쌈 · 그 벽 한가운데에 가운데로 나가는 통로 하나 ──
# · 이음 벽은 보물 땅 옆구리(앞문보다 뒤)에서 시작 → 보물 땅 앞문은 사냥터 밖(가운데 쪽), 옆문은 사냥터 안 → 사냥하다 옆문으로 몰래 보물 땅에
# · 이음 벽은 가운데 쪽으로 불룩 휘어(방 앞에 사냥할 넓이를 줌) 굽이침, 곳마다 굽이는 조금씩 다름(넓이·통로 자리는 같게)
HCUT = 12.; linkWall = np.zeros_like(play); huntGate = np.zeros_like(play); HLINK = []
for k, a in enumerate(ANG):
    g = np.random.default_rng(300 + k)
    m0, m1 = MID[k - 1], MID[k]                                       # 이 방 양옆 보물 땅 (왼쪽 · 오른쪽)
    pts = []
    a0, a1 = m0 + math.radians(7), m1 - math.radians(7)               # 왼쪽 보물 땅 앞쪽 끝(앞문 옆) → 오른쪽 보물 땅 앞쪽 끝 · 앞문은 두 이음 벽 사이로 가운데를 봄
    a1 = a0 + ((a1 - a0 + math.pi) % (2 * math.pi) - math.pi)
    for i in range(61):
        u = i / 60; ang_ = a0 + u * (a1 - a0)
        bul = math.sin(math.pi * u) ** .55                            # 둥근 그릇 모양 (뾰족한 V 아님)
        rr = 126 - 38 * bul + 2.4 * math.sin(u * 8 + g.uniform(0, 6.28)) * bul + 1.3 * math.sin(u * 21 + g.uniform(0, 6.28)) * bul   # 보물 땅 안에서 시작해 가운데 쪽으로 불룩
        pts.append((math.cos(ang_) * rr, math.sin(ang_) * rr))
    HLINK.append(pts)
    line = np.zeros_like(play)
    for (x0, z0), (x1, z1) in zip(pts[:-1], pts[1:]):
        n_ = int(math.hypot(x1 - x0, z1 - z0) / .3) + 1
        for t_ in range(n_ + 1):
            x_, z_ = x0 + (x1 - x0) * t_ / n_, z0 + (z1 - z0) * t_ / n_; ii, jj = int((x_ + 180) / M), int((z_ + 180) / M)
            if 0 <= ii < N and 0 <= jj < N: line[jj, ii] = True
    lw = ndi.binary_dilation(line, iterations=int(round(WW / 2 / M))) & ~ndi.binary_erosion(tre, iterations=int(round(WW / M)))   # 보물 땅 안쪽은 파고들지 않음
    cx, cz = math.cos(a), math.sin(a); sd_ = np.abs(-X * cz + Z * cx); fw_ = X * cx + Z * cz                 # 가운데 통로: 방 정면 줄 위
    gate = lw & (sd_ < HCUT / 2) & (fw_ > 0)
    linkWall |= lw; huntGate |= gate
# ── 가운데: 둥근 길 두 겹 + 그 사이 정글 10곳 (사용자 2026-11-03) · 정글 벽은 성운 산호 ──
# · 사냥터 통로(반지름 약 88m)를 나오면 바로 바깥 둥근 길(76~88m, 폭 12m) → 정글 띠(44~76m) → 안쪽 둥근 길(32~44m) → 맨 가운데(블랙홀 자리, 아직 비움)
# · 정글 띠는 정글 10곳이 빈틈없이 채우고, 보물 땅 앞문 쪽 줄(정글과 정글 사이)로만 두 둥근 길을 잇는 곧은 샛길(폭 9m, 훤히 보임)
# · 정글은 사냥터 통로 정면마다 하나(방마다 하나 → 공평) = 안쪽으로 질러가는 지름길(위험·빠름). 샛길로 돌아가면 훤하지만 멂
# · 정글 안: 한가운데 산호 덩어리(곳마다 모양·자리 다름)를 왼쪽/오른쪽으로 돌아 지나감 + 한쪽 옆 벽에 샛길로 나가는 옆문
RO_IN, RO_OUT, RJ_IN, RJ_OUT, PW = 32., 88., 44., 76., 8.
JUN = np.zeros_like(play); junWall = np.zeros_like(play); junDoor = np.zeros_like(play); JAREA = []
def cut_ray(ring, ox, oz, tx, tz, w):                                   # (ox,oz)에서 (tx,tz)로 줄을 그어 그 줄이 벽 ring을 지나는 자리를 줄 방향으로 곧게 뚫음
    dx, dz = tx - ox, tz - oz; L_ = math.hypot(dx, dz); dx /= L_; dz /= L_; hit = []
    for t_ in np.arange(0, L_ + 10, .25):
        x_, z_ = ox + dx * t_, oz + dz * t_; ii, jj = int((x_ + 180) / M), int((z_ + 180) / M)
        if 0 <= ii < N and 0 <= jj < N and ring[jj, ii]: hit.append(t_)
        elif hit: break
    if not hit: return np.zeros_like(play)
    t0 = (hit[0] + hit[-1]) / 2; qx, qz = ox + dx * t0, oz + dz * t0
    along = (X - qx) * dx + (Z - qz) * dz; acr = np.abs(-(X - qx) * dz + (Z - qz) * dx)
    return (np.abs(along) < WW + 1.5) & (acr < w / 2)
for k, a in enumerate(ANG):
    g = np.random.default_rng(500 + k); p1, p2, p3 = g.uniform(0, 6.28, 3)
    ph = np.arctan2(np.sin(TH - a), np.cos(TH - a))
    m0, m1 = a - math.pi / 10, a + math.pi / 10                                                             # 양옆 샛길 줄 (보물 땅 앞문 쪽)
    d0 = R * np.sin(TH - m0); d1 = -R * np.sin(TH - m1)                                                    # 두 샛길 줄에서 잰 거리 (정글 쪽이 +)
    sideW = PW / 2 + .6 + .8 * np.sin(R * (.2 + .1 * g.uniform()) + p1)                                         # 옆 벽 굽이
    rin = RJ_IN + 2.2 * np.sin(ph * 17 + p2); rout = RJ_OUT + 2.4 * np.sin(ph * 13 + p3)                   # 안·바깥 벽 굽이
    mk = (np.abs(ph) < math.pi / 10) & (d0 >= sideW) & (d1 >= PW / 2 + .6 + .8 * np.sin(R * .23 + p2)) & (R >= rin) & (R <= rout)
    # 테두리를 산호초처럼 울퉁불퉁하게: 안팎 거리에 매끈한 무작위 굽이를 더함 (곳마다 다름)
    nz = ndi.gaussian_filter(g.normal(size=X.shape), 5); nz /= nz.std() + 1e-9
    sdist = (ndi.distance_transform_edt(mk) - ndi.distance_transform_edt(~mk)) * M
    mk = ndi.gaussian_filter(((sdist + nz * 1.7) > 0).astype(float), 1.2) > .5
    ring_ = mk & ~ndi.binary_erosion(mk, iterations=int(round(WW / M)))
    # 한가운데 산호 덩어리: 세로로 긴 덩어리를 겹쳐 곳마다 다른 모양 (양옆으로 6m 넘게 지나갈 틈을 남김)
    cr_, ca_ = g.uniform(57, 63), a + math.radians(g.uniform(-2.5, 2.5)); blob = np.zeros(X.shape)
    for q in range(3):
        rr_ = cr_ + g.uniform(-4.5, 4.5); aa_ = ca_ + math.radians(g.uniform(-1.8, 1.8)); bx, bz = math.cos(aa_) * rr_, math.sin(aa_) * rr_
        ux, uz = math.cos(aa_), math.sin(aa_); al = (X - bx) * ux + (Z - bz) * uz; ac = -(X - bx) * uz + (Z - bz) * ux
        blob = np.maximum(blob, np.exp(-(al / g.uniform(3.2, 4.4)) ** 2 - (ac / g.uniform(2.2, 2.8)) ** 2))
    for q in range(2):                                                                                    # 작은 산호 기둥 둘: 숨어 쏘고 피하는 자리 (가운데 덩어리 양옆 길 안)
        sgn = 1 if q == 0 else -1; rr_ = g.uniform(50, 70); aa_ = a + sgn * math.radians(g.uniform(6, 9)); bx, bz = math.cos(aa_) * rr_, math.sin(aa_) * rr_
        blob = np.maximum(blob, np.exp(-((X - bx) ** 2 + (Z - bz) ** 2) / g.uniform(1.6, 2.2) ** 2))
    nz2 = ndi.gaussian_filter(g.normal(size=X.shape), 2.5); nz2 /= nz2.std() + 1e-9
    clump = (blob + nz2 * .12 > .5) & ndi.binary_erosion(mk, iterations=int(round((WW + 5.5) / M)))   # 덩어리 테두리도 울퉁불퉁
    ad = lambda d_, r_: (math.cos(a + math.radians(d_)) * r_, math.sin(a + math.radians(d_)) * r_)
    od = cut_ray(ring_, *ad(g.uniform(-3, 3), 66), *ad(g.uniform(-3, 3), 94), 7.)                      # 바깥 문 (사냥터 통로 정면 쪽)
    idr = cut_ray(ring_, *ad(g.uniform(-3, 3), 54), *ad(g.uniform(-3, 3), 26), 7.)                     # 안쪽 문
    sd = 1 if g.uniform() < .5 else -1; sr = g.uniform(54, 68)
    sdr = cut_ray(ring_, *ad(sd * 6, sr), *ad(sd * 30, sr), 6.5)                                        # 옆문 (한쪽 샛길로)
    junDoor |= od | idr | sdr; JUN |= mk & ~ring_; junWall |= ring_ | clump; JAREA.append(round((mk & ~ring_ & ~clump).sum() * M * M))
print('정글 넓이(m²)', JAREA)
wall = (outerWall | roomWall | (treWall & ~treDoor) | (linkWall & ~huntGate) | (junWall & ~junDoor)) & ~doorCut
wall &= inside | ndi.binary_dilation(inside, iterations=6)   # 바깥 잔해 쪽으로 너무 나간 벽 조각은 정리
blocked = wall | ~inside
_fl, _ = ndi.label(~blocked); _sp0 = (int((math.sin(ANG[0]) * RP + 180) / M), int((math.cos(ANG[0]) * RP + 180) / M))
wall |= (~blocked) & (_fl != _fl[_sp0]); blocked = wall | ~inside                 # 어디서도 못 들어가는 작은 틈 = 바위 (애매한 자리 없음)
# 검사: 방 10곳 모두 문으로만 싸움터와 이어지는지 · 서로 다 이어지는지
free = ~blocked; lab, n = ndi.label(free)
SP = [(int((math.sin(a) * RP + 180) / M), int((math.cos(a) * RP + 180) / M)) for a in ANG]
print('다니는 땅 덩어리', n, '· 방 10곳이 한 덩어리', len({lab[j, i] for j, i in SP}) == 1)
# ── 보물 땅 양옆 숨을 곳 (사용자 2026-11-03): 보물 땅과 이웃 방 사이 좁은 틈을 가스·돌 숨을 곳으로 채움 ──
# · 틈 = 싸움터 가장자리 ~ 반지름 122m, 보물 땅 벽과 방 벽 사이의 다닐 수 있는 땅 → 보물 땅 옆문이 이 숨을 곳 안으로 열림(몰래 드나듦)
# · 한 틈이 숨을 곳 하나 (같은 숨을 곳 안이면 서로 보임). 숨을 곳 모양은 둥근 덩이를 겹쳐 틈을 빈틈없이 덮음
freeM = ~blocked; trI = ndi.binary_fill_holes(tre) | tre
BUSH = []
# 보물 땅 벽 안쪽을 따라 얇은 띠(폭 약 4m)를 숨을 곳으로 (사용자 2026-11-03: 벽 밖이 아니라 벽 안쪽 얇게)
# · 양옆 문 안쪽을 덮고, 안쪽(가운데를 보는) 면 벽을 따라 이어짐, 가운데 앞문 통로(폭 14m)에서만 끊김. 등 뒤(싸움터 가장자리) 벽 쪽은 비움
BAND = 4.
for k, m in enumerate(MID):
    me = (treId == 11 + k % 5) & (np.abs(np.arctan2(np.sin(TH - m), np.cos(TH - m))) < math.pi / 10) & freeM   # 이 보물 땅 안 (다닐 수 있는 곳)
    wd_ = ndi.distance_transform_edt(me) * M                                                              # 벽(또는 문)에서 떨어진 거리
    near_ = me & (wd_ <= BAND) & (R < RP - WW - 7)                                                         # 벽 안쪽 얇은 띠, 등 뒤 벽 쪽은 뺌
    fx_, fz_ = math.cos(m), math.sin(m); sd_ = np.abs(-X * fz_ + Z * fx_)
    fcor_ = (sd_ < 7) & (np.hypot(X - 0, Z - 0) < 1e9) & ndi.binary_dilation(frontDoor, iterations=int(12 / M))
    near_ &= ~fcor_                                                                                       # 가운데 앞문 통로는 비움 (앞문이 실제로 뚫린 자리 기준 — 곳마다 앞문 깊이가 달라서)
    gate_ = treDoor & treWall & freeM & (np.abs(np.arctan2(np.sin(TH - m), np.cos(TH - m))) < math.pi / 10) & ~fcor_
    near_ &= R < 128                                                                                     # 방을 보는 옆면(바깥쪽 절반)엔 숨을 곳 없음 (사용자 2026-11-03) — 가운데를 보는 안쪽 면만
    gfill_ = ndi.binary_dilation(gate_, iterations=2) & (treWall | me) & freeM                          # 양옆 문 틈: 숨을 곳이 꽉 메워 양옆 벽 끝을 이음 (벽—숨을 곳—벽) — 태어나 보물 땅으로 숨어 들어가는 문
    gl_, gn_ = ndi.label(gfill_)
    for gi in range(1, gn_ + 1):                                                                         # 문마다 따로 숨을 곳 하나 (띠와 붙어 있으면 띠 쪽에서도 덮임)
        zone = gl_ == gi
        if zone.sum() < 6: continue
        lobes = []; left = zone.copy(); dz = ndi.distance_transform_edt(np.pad(zone, 1))[1:-1, 1:-1] * M
        while left.sum() > 2:
            dl_ = np.where(left, dz, 0); j_, i_ = np.unravel_index(np.argmax(dl_), dl_.shape); r = max(1.6, min(3.2, dz[j_, i_] + 1.)); 
            lobes.append([round(float(X[j_, i_]), 2), round(float(Z[j_, i_]), 2), round(r, 2)]); left &= np.hypot(X - X[j_, i_], Z - Z[j_, i_]) > r * .7
        BUSH.append(dict(k=11 + k % 5, side=0, lobes=lobes, why='보물 옆문'))
    ph = np.arctan2(np.sin(TH - m), np.cos(TH - m))
    for side in (-1, 1):
        zone = ndi.binary_opening(near_ & (ph * side > 0), iterations=1)
        zl, zn = ndi.label(zone)
        if zn == 0: continue
        zone = zl == 1 + int(np.argmax(ndi.sum(zone, zl, range(1, zn + 1))))
        lobes = []; left = zone.copy(); dz = ndi.distance_transform_edt(zone) * M
        while left.sum() > 4:
            dl_ = np.where(left, dz, 0); j_, i_ = np.unravel_index(np.argmax(dl_), dl_.shape); r = max(1.8, min(4.5, dz[j_, i_] + 1.2))
            lobes.append([round(float(X[j_, i_]), 2), round(float(Z[j_, i_]), 2), round(r, 2)]); left &= np.hypot(X - X[j_, i_], Z - Z[j_, i_]) > r * .8
        BUSH.append(dict(k=11 + k % 5, side=side, lobes=lobes, why='보물 둘레'))
print('숨을 곳', len(BUSH), '· 덩이 수', [len(b['lobes']) for b in BUSH][:6])
# 사냥터 = 이음 벽 바깥(방 쪽) 땅. 통로를 잠시 막고 방 앞에서 퍼져 닿는 곳
_closed = blocked | huntGate | treDoor; _hl, _ = ndi.label(~_closed); hunt = np.zeros_like(play); HAREA = []
for a in ANG:
    j, i = int((math.sin(a) * (RP - 30) + 180) / M), int((math.cos(a) * (RP - 30) + 180) / M); h_ = (_hl == _hl[j, i]) & ~rooms & ~tre
    hunt |= h_; HAREA.append(round(h_.sum() * M * M))
print('사냥터 넓이(m²)', HAREA, '· 사냥터끼리 떨어짐', len({_hl[int((math.sin(a) * (RP - 30) + 180) / M), int((math.cos(a) * (RP - 30) + 180) / M)] for a in ANG}) == 10)
JUNR = ndi.binary_dilation(JUN | junWall, iterations=1)                       # 정글 땅(벽 포함) = 3번 땅 → 벽 덩어리 종류가 성운 산호로 잡힘
ids = np.where(inside, np.where(tre, treId, np.where(hunt, 1, np.where(JUNR, 3, 0))), 17).astype(np.uint8)
# 검사: 정글을 지나는 길 vs 둥근 길·샛길로 돌아가는 길 (사냥터 통로 앞 → 안쪽 둥근 길)
from skimage.graph import MCP_Geometric
freeA = ~ndi.binary_dilation(blocked, iterations=1); RT = []
def route(fm, s_, t_):
    m_ = MCP_Geometric(np.where(fm, 1., np.inf)); cst, _ = m_.find_costs([s_], [t_]); return cst[t_] * M
cell = lambda x, z: (int((z + 180) / M), int((x + 180) / M))
for k, a in enumerate(ANG):
    s_ = cell(math.cos(a) * 80, math.sin(a) * 80); t_ = cell(math.cos(a) * 38, math.sin(a) * 38)
    lj = route(freeA, s_, t_); lw = route(freeA & ~JUN, s_, t_); RT.append((round(lj), round(lw)))
print('통로 앞→안쪽 둥근 길 (정글로 / 돌아서) m', RT)
img = np.stack([ids * 12, np.where(wall & inside | wall & (ids < 17), 255, 0).astype(np.uint8), np.zeros_like(ids)], -1)
img[..., 1] = np.where(wall, 255, 0)
img[~inside & ~wall, 0] = 17 * 12
Image.fromarray(img.astype(np.uint8), 'RGB').save('../assets/map/v7.png')
toPx = lambda x, z: [round((x + 180) / .36, 1), round((z + 180) / .36, 1)]   # 세상 좌표 → 1000칸 그림 좌표 (예전 json과 같은 단위)
spawns = [toPx(math.cos(a) * RP, math.sin(a) * RP) for a in ANG]
NAMES = ['싸움터', '사냥터', '-', '산호 정글'] + ['-'] * 7 + ['보물 동굴', '웜홀 정원', '고대 금고', '별빛 광산', '숨은 동굴'] + ['무너진 중심부', '소행성 잔해']
JUN_LAB = lambda: [dict(x=toPx(math.cos(a) * 61, math.sin(a) * 61)[0], y=toPx(math.cos(a) * 61, math.sin(a) * 61)[1], n='산호 정글', l='좁은 지름길', k='jun') for a in ANG]
TRE_LAB = [dict(x=toPx(math.cos(m) * 136, math.sin(m) * 136)[0], y=toPx(math.cos(m) * 136, math.sin(m) * 136)[1], n=NAMES[11 + k % 5], l='보물 땅', k='tre') for k, m in enumerate(MID)]
_old = json.load(open("../assets/map/v7.json")) if __import__("os").path.exists("../assets/map/v7.json") else {}
json.dump(dict(W=1000, H=1000, labels=TRE_LAB + JUN_LAB(), spawns=spawns, gates=[], names=NAMES, rooms=dict(r=ROOM, wall=WW, door=DOOR, rp=RP), bushes=BUSH), open('../assets/map/v7.json', 'w'), ensure_ascii=False)
# 그림
Z2 = 2; im = np.zeros((N, N, 3), np.uint8); im[inside] = (52, 62, 58); im[hunt] = (58, 80, 52); im[rooms] = (40, 70, 52); im[tre] = (88, 74, 36); im[JUN] = (40, 70, 92)
for b in BUSH:
    for x_, z_, r_ in b['lobes']: im[np.hypot(X - x_, Z - z_) < r_ * .9] = (40, 120, 80)
im[wall] = (150, 150, 158); im[wall] = (150, 150, 158); im[~inside & ~wall] = (14, 14, 18)
pic = Image.fromarray(im).resize((N * Z2, N * Z2), Image.NEAREST)
from PIL import ImageDraw, ImageFont
d = ImageDraw.Draw(pic); f = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc', 18)
for k, a in enumerate(ANG):
    x, z = toPx(math.cos(a) * RP, math.sin(a) * RP); r = 9 / .36
    d.ellipse([x - r, z - r, x + r, z + r], outline=(190, 255, 80), width=3); d.text((x - math.cos(a) * 70, z - math.sin(a) * 70), str(k + 1), fill=(190, 255, 80), font=f, anchor='mm')
d.text((20, 20), '맵 7안 4단계 — 방 10 · 보물 땅 10 · 사냥터 10 · 둥근 길 두 겹 + 산호 정글 10', fill=(185, 255, 74), font=f)
fs = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc', 13)
for o in TRE_LAB: d.text((o['x'], o['y']), o['n'], fill=(255, 220, 140), font=fs, anchor='mm')
pic.save('map_v7_rooms.png')
import subprocess, os; subprocess.run(['python3', 'map_v6_ridges.py'], env={**os.environ, 'MAPV': 'v7'})   # 벽 덩어리 자리(ridges)도 함께 다시 만듦
