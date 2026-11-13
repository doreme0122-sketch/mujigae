/* 초원 섬 하나의 모양 (2026-11-10 · 새 초원 첫 시험)
   그림을 그대로 따라 하지 않고 느낌(신비로움 · 풍성함 · 깊이)만 가져옴. 게임 규칙에 맞춘 높낮이:
   · 세 높이로 나눔 (사용자 2026-11-10): 1층 = 풀밭 바로 위(숲 · 부쉬에 숨기) · 2층 = 돌탑 · 아치 · 다리 · 고원 사이를 빠져나감 · 3층 = 위로 탁 트여 다 내려다봄
   · 높이 기준(섬 안 단위 · 게임에선 0.5배): 풀밭 −6 · 1층 −3.6 · 2층 4.4 · 고원 +7.5 · 돌탑 8~10 · 아치 꼭대기 9.4~10 · 3층 12.4
     (사용자 2026-11-10: 층 사이를 모두 4m로 — 게임에서 땅 위 1.2m · 5.2m · 9.2m. 구조물은 2층을 확실히 막고 3층은 넘게, 아치 · 다리는 2층이 밑으로 빠져나가게)
   · 낮은 단 = −11 → 더 깊이 내려간 땅. 위아래로 겹겹이 깊어 보임
   · 고원과 큰 돌탑 사이 좁은 틈 = 길목 · 그 위로 다리 (2층은 밑으로, 3층은 위로 지나감)
   · 고원에서 폭포가 떨어져 연못 → 물길 → 섬 가장자리에서 아래 안개 속으로 다시 떨어짐
   모든 높이·자리는 이 파일 한 곳에서 정함 (땅 · 물 · 나무 · 막힘이 같은 모양을 씀) */

/* 값 잡음: 같은 씨앗이면 늘 같은 모양 */
const hash2 = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sm = t => t * t * (3 - 2 * t);
export function noise2(x, z) { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = sm(fx), v = sm(fz);
  const a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1; }
export function fbm(x, z, o = 4) { let s = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { s += a * noise2(x * f + k * 17.3, z * f - k * 9.1); f *= 2.03; a *= .5; } return s; }
export const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const smax = (a, b, k) => { const h = Math.max(0, Math.min(1, .5 + .5 * (a - b) / k)); return b + (a - b) * h + k * h * (1 - h); };
const circ = (x, z, cx, cz, r) => r - Math.hypot(x - cx, z - cz);
const capsule = (x, z, ax, az, bx, bz, r) => { const px = x - ax, pz = z - az, dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, (px * dx + pz * dz) / (dx * dx + dz * dz))); return r - Math.hypot(px - dx * t, pz - dz * t); };

/* 높이 기준 */
export const Y = { MEADOW: -6, LOW: -11, PLATEAU: 7.5, WATER: -7.1 };
export const LAYERS = [-3.6, 4.4, 12.4];   /* 1층 · 2층 · 3층 나는 높이 (층 사이 8 = 게임에서 4m) */
export const CLEAR = 1.2;               /* 위아래로 이만큼 안에 무언가 있으면 막힘 */
/* 자리 (북쪽 = −z = 화면 위쪽) */
export const SPOT = {
  plateau: [[-20, -16, 14], [-9, -25, 9], [-29, -6, 8]],
  /* 2층 장애물: 돌탑 (자리 x, z · 반지름 · 꼭대기 · 생김새 · 돌린 방향) — 사용자 2026-11-10: 같은 모양을 복붙한 듯함 → 생김새를 나눔
     fat 이끼 덮인 굵은 탑(둥근 층 · 이끼) · lean 기울어진 탑(층마다 한쪽으로 비켜 쌓임) · broken 꼭대기가 부서진 탑(들쭉날쭉한 왕관 · 한쪽이 떨어져 나감) · twin 갈라진 쌍둥이 탑(높이가 다른 두 기둥 · 사이에 좁은 틈)
     모두 2층은 막고 3층은 넘음 */
  spires: [[10, -16, 4.6, 10, 'fat', .3], [22, -3, 2.5, 8.6, 'lean', 2.1], [-1, -9, 2.1, 8, 'broken', 4], [-31, 19, 2.4, 9, 'twin', 1.2], [18, -27, 2.6, 9.6, 'broken', .9], [4, 31, 2.2, 8.2, 'lean', 5]],
  /* 2층 장애물: 돌 아치 (양 끝 · 꼭대기 · 생김새) — 2층은 밑으로 빠져나감 (사용자 2026-11-10: 2층에서 빈 곳이 3m 넘게)
     thick 두꺼운 아치 · thin 얇고 긴 아치(살짝 휘어 돎) · broken 반쯤 무너진 아치(한쪽은 높이 솟다 끊기고 맞은편은 짧은 그루터기 · 밑에 떨어진 바위) */
  arches: [[-11, 11, 5, 19, 10, 'thick'], [21, -19, 31.5, -6.5, 9.6, 'thin'], [5.9, -6.1, -5.9, 6.1, 9.4, 'broken']],
  /* 부쉬 (1층 숨는 곳 · 사용자 2026-11-10: 경계가 정확해야 · 띄엄띄엄이면 개념이 어설픔) — 동그라미 몇 개를 합친 덩이 하나하나가 빈틈없는 덤불 무리.
     이 모양 하나로 보이는 덤불 가장자리 = 숨는 판정 = 시야 가림이 꼭 같음 */
  brush: [[[12, 2, 5], [16, 6, 3.5], [8, -1, 3]], [[-4, 22, 4.5], [0, 25, 3.5], [-8, 25, 3]], [[-27, 16, 3.8], [-23, 19, 3]], [[3, 11, 3.2], [6, 14, 2.6]], [[16, -9, 3], [19, -12, 2.4]]],
  low: [[27, 13, 13], [18, 23, 8]],
  pond: [-17, 1.6, 6.6],
  channel: [-17, 1.6, -40, 10],
  /* 섬 덩이: 동그라미 무리 하나 = 섬 하나 (여럿이면 사이는 빈 하늘) · 그물 칸 범위 */
  islands: [[[0, 0, 30], [-20, -14, 22], [20, -12, 17], [26, 12, 17], [-22, 9, 19], [-4, 21, 16], [8, 16, 14]]],
  box: [-52, 52, -48, 46], bridge: true,
};

export function makeField(L = SPOT) {
  const warp = (x, z) => [x + 4.5 * fbm(x * .03, z * .03, 3), z + 4.5 * fbm(x * .03 + 31, z * .03 - 7, 3)];
  /* 섬 바깥 모양 (안쪽 +, 바깥 −, 대략 가장자리까지 거리) */
  /* 섬마다 감싸는 동그라미 (멀리 떨어진 빈 하늘은 계산을 건너뜀 · 섬 여럿인 맵이 빨리 만들어지게) */
  const hulls = L.islands.map(C => { let cx = 0, cz = 0; for (const [x, z] of C) { cx += x; cz += z; } cx /= C.length; cz /= C.length; let R = 0; for (const [x, z, r] of C) R = Math.max(R, Math.hypot(x - cx, z - cz) + r); return [cx, cz, R + 14]; });
  const mask = (x, z) => { let near = false; for (const [cx, cz, R] of hulls) if ((x - cx) ** 2 + (z - cz) ** 2 < R * R) { near = true; break; } if (!near) return -20;
    const [u, w] = warp(x, z); let d = -99;
    for (const C of L.islands) { let e = circ(u, w, C[0][0], C[0][1], C[0][2]); for (let k = 1; k < C.length; k++) e = smax(e, circ(u, w, C[k][0], C[k][1], C[k][2]), 6); d = Math.max(d, e); }
    const e = d + 2.2 * fbm(x * .09, z * .09, 3) + .7 * fbm(x * .35, z * .35, 2) + .55 * (Math.abs(fbm(x * .55 + 7, z * .55, 2)) - .22) + .25 * fbm(x * 1.4, z * 1.4, 2); return L.clipR ? Math.min(e, L.clipR - Math.hypot(x, z)) : e; };   /* clipR: 맵 테두리(무지개 벽) 밖으로 땅이 나가지 않게 */   /* 마지막 둘: 부서져 떨어져 나간 듯 오목오목한 테두리 (칼로 자른 둥근 선이 아니게) */
  const plateau = (x, z) => { const [u, w] = warp(x * 1.1, z * 1.1); let d = -99; for (const [cx, cz, r] of L.plateau) d = smax(d, circ(u, w, cx * 1.1, cz * 1.1, r * 1.1), 5); return d / 1.1 + .9 * fbm(x * .21, z * .21, 3); };
  /* 돌탑 층 쌓기: 생김새마다 층(동그라미 · 높이)을 따로 쌓음 → 높이장으로 만든 땅이라 아래 층이 위 층을 받치는 모양(넘어 튀어나온 곳 없음) */
  const tierCache = new Map();
  const tiers = S => { if (tierCache.has(S)) return tierCache.get(S); const [cx, cz, r, h, kind = 'col', rot = 0] = S, base = Y.MEADOW - 1, T = [], dx = Math.cos(rot), dz = Math.sin(rot);
    const stack = (x, z, R, H, n, shrink, drift) => { for (let i = 0; i < n; i++) T.push({ x: x + dx * drift * i, z: z + dz * drift * i, r: R * (1 - shrink * i), h: base + (H - base) * (i + 1) / n, top: i === n - 1 }); };
    if (kind === 'fat') stack(cx, cz, r * 1.12, h, 3, .11, 0);
    else if (kind === 'lean') stack(cx, cz, r, h, 4, .12, r * .3);                                  /* 층마다 한쪽으로 비켜 쌓여 기울어 보임 */
    else if (kind === 'twin') { stack(cx + dx * r * .48, cz + dz * r * .48, r * .62, h, 4, .1, 0); stack(cx - dx * r * .48, cz - dz * r * .48, r * .58, Y.MEADOW + (h - Y.MEADOW) * .84, 4, .1, 0); }
    else stack(cx, cz, r, h, 4, .1, 0);
    tierCache.set(S, T); return T; };
  const rough = (x, z, t) => { const an = Math.atan2(z - t.z, x - t.x); return .6 * fbm(x * .45, z * .45, 3) * t.r / 4 + .3 * Math.sin(an * 7 + t.x) * t.r / 4.6 + .12 * Math.sin(an * 13 + t.z) * t.r / 4.6; };   /* 기둥 바위가 엮인 결 */
  const spire = (x, z, S) => { let d = -99; for (const t of tiers(S)) d = Math.max(d, circ(x, z, t.x, t.z, t.r) + rough(x, z, t)); return d; };   /* 가장 아래 층 둘레 = 돌탑 바닥 모양 */
  const spireMoss = (x, z) => { let m = 0; for (const S of L.spires) if (S[4] === 'fat') m = Math.max(m, smoothstep(-1.5, .5, spire(x, z, S))); return m; };   /* 이끼 덮인 굵은 탑 */
  const low = (x, z) => { const [u, w] = warp(x, z); let d = -99; for (const [cx, cz, r] of L.low) d = smax(d, circ(u, w, cx, cz, r), 5); return d + .8 * fbm(x * .17, z * .17, 3); };
  const pond = (x, z) => L.pond ? circ(x, z, L.pond[0], L.pond[1], L.pond[2]) + 1.1 * fbm(x * .19, z * .19, 3) : -99;
  const chan = (x, z) => { if (!L.channel) return -99; const [ax, az, bx, bz] = L.channel; return capsule(x, z, ax, az, bx, bz, 1.25 + .35 * fbm(x * .3, z * .3, 2)) + .35 * fbm(x * .4 + 5, z * .4, 2); };

  /* 절벽 결: 바위가 층층이 쌓인 턱 (턱마다 이끼가 앉음) — 그냥 매끈한 비탈이 아니라 */
  const ledges = (t, n, x, z) => { t = Math.min(1, Math.max(0, t + .06 * fbm(x * .3, z * .3, 2))); const s = t * n, i = Math.floor(s), f = s - i; return Math.min(1, (i + Math.pow(smoothstep(.35, 1, f), 1.6)) / n); };

  /* 골짜기 (L.gorge): 꺾은선 pts를 따라 폭 w(반) · 바닥 높이 floor — 고원 · 산맥을 가르는 길 (위는 하늘이 트임 · 사용자 2026-11-11)
     tunnel: 들머리 [0, to] 구간만 3층보다 높은 바위 천장(동굴 입구 · top = 천장 밑면 높이) · basin: 길 끝 넓은 공터 [x, z, r]
     gorge(x, z) → d(안쪽 +, 벽까지 거리) · t(꺾은선 따라 얼마나 왔는지 0~1) */
  /* 골짜기 여럿 (사용자 2026-11-11 한 조각: 양옆 보물 동굴 둘) — L.gorges = [{ pts, w, floor, tunnel, basin, ruins, falls, hump }] (하나면 L.gorge)
     만들기 쪽은 F.useGorge(i)로 지금 다루는 골짜기를 고른 뒤 gorgeAt을 씀 · gorge(x, z)는 가장 가까운 골짜기 (i 포함) */
  const GS = (L.gorges || (L.gorge ? [L.gorge] : [])).map(g => { const GP = g.pts, GL = [0]; for (let k = 1; k < GP.length; k++) GL.push(GL[k - 1] + Math.hypot(GP[k][0] - GP[k - 1][0], GP[k][1] - GP[k - 1][1]));
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of GP) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } if (g.basin) { x0 = Math.min(x0, g.basin[0] - g.basin[2]); x1 = Math.max(x1, g.basin[0] + g.basin[2]); z0 = Math.min(z0, g.basin[1] - g.basin[2]); z1 = Math.max(z1, g.basin[1] + g.basin[2]); }
    return { g, GP, GL, bb: [x0, x1, z0, z1] }; });
  let CUR = 0;
  const useGorge = i => { CUR = i; };
  const gorgeAtI = (i, t) => { const { GP, GL } = GS[i], s = t * GL[GL.length - 1]; let k = 1; while (k < GL.length - 1 && GL[k] < s) k++; const f = (s - GL[k - 1]) / (GL[k] - GL[k - 1]); return [GP[k - 1][0] + (GP[k][0] - GP[k - 1][0]) * f, GP[k - 1][1] + (GP[k][1] - GP[k - 1][1]) * f]; };
  const gorgeAt = t => gorgeAtI(CUR, t);
  const gorgeI = (i, x, z) => { const { g, GP, GL } = GS[i]; let best = 1e9, bt = 0; for (let k = 1; k < GP.length; k++) { const [ax, az] = GP[k - 1], [bx, bz] = GP[k], dx = bx - ax, dz = bz - az, q = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))), d = Math.hypot(x - ax - dx * q, z - az - dz * q); if (d < best) { best = d; bt = (GL[k - 1] + (GL[k] - GL[k - 1]) * q) / GL[GL.length - 1]; } }
    return { d: g.w + .6 * fbm(x * .25, z * .25, 2) - best, t: bt, i }; };
  const far = (i, x, z, m) => { const b = GS[i].bb; return x < b[0] - m || x > b[1] + m || z < b[2] - m || z > b[3] + m; };
  const gorge = (x, z) => { let r = { d: -1e9, t: 0, i: 0 }; for (let i = 0; i < GS.length; i++) { if (GS.length > 1 && far(i, x, z, 70)) continue; const c = gorgeI(i, x, z); if (c.d > r.d) r = c; } return r; };
  const basinI = (i, x, z) => { const b = GS[i].g.basin; return b ? circ(x, z, b[0], b[1], b[2]) + 2.2 * fbm(x * .08, z * .08, 3) : -99; };
  const basinD = (x, z) => { let d = -99; for (let i = 0; i < GS.length; i++) d = Math.max(d, basinI(i, x, z)); return d; };
  /* 비밀길 입구 틈 (L.notch: [x, z, r]…): 남쪽(카메라 쪽)을 보는 절벽 밑동을 둥글게 파 낸 작은 빈터 → 터널 입구 아치가 정면으로 보임 (사용자 2026-11-12) */
  const NOT = L.notch || [], notchD = (x, z) => { let d = -99; for (const [cx, cz, r] of NOT) { if (Math.abs(x - cx) > r + 12 || Math.abs(z - cz) > r + 12) continue; d = Math.max(d, circ(x, z, cx, cz, r) + .6 * fbm(x * .4, z * .4, 2)); } return d; };
  /* 트인 길 (L.pass: { pts, w }…): 산 · 북쪽 비탈 채움이 덮지 못하는 길 — 앞마당에서 나가는 협곡 (사용자 2026-11-12: 비탈이 번져 앞마당이 갇혔음) */
  const PS = (L.pass || []).map(p => ({ ...p, bb: [Math.min(...p.pts.map(q => q[0])) - p.w - 12, Math.max(...p.pts.map(q => q[0])) + p.w + 12, Math.min(...p.pts.map(q => q[1])) - p.w - 12, Math.max(...p.pts.map(q => q[1])) + p.w + 12] }));
  const passD = (x, z) => { let d = -99; for (const p of PS) { if (x < p.bb[0] || x > p.bb[1] || z < p.bb[2] || z > p.bb[3]) continue; let m = -1e9; for (let k = 1; k < p.pts.length; k++) { const [ax, az, aw = p.w] = p.pts[k - 1], [bx, bz, bw = p.w] = p.pts[k], vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz))); m = Math.max(m, aw + (bw - aw) * t - Math.hypot(x - ax - vx * t, z - az - vz * t)); }   /* 점마다 폭이 다를 수 있음 */
    d = Math.max(d, m + 1.4 * fbm(x * .18, z * .18, 2)); } return d; };
  let noGorge = false;   /* 뚜껑 계산 중: 동굴(골짜기 · 보물방)을 파기 전의 산 모양 */
  const openX = (x, z) => Math.max(NOT.length ? notchD(x, z) : -99, PS.length ? passD(x, z) : -99);
  const openD = (x, z) => GS.length && !noGorge ? Math.max(gorge(x, z).d, basinD(x, z), openX(x, z)) : openX(x, z);   /* 골짜기 · 공터 · 입구 틈 안 (+) */
  /* 산맥 (L.mount: { blobs: [[x, z, r]…], peak }) — 3층도 못 넘는 땅의 테두리 (사용자 2026-11-11)
     · 고른 벽이 아니라 들쭉날쭉한 봉우리 · 사이사이 안장처럼 꺼진 곳 · 층진 바위 턱 · 골짜기와 공터 쪽은 깎아지른 벽 */
  const MB = L.mount;
  const mountD = (x, z, raw = false) => { let d = -99; for (const [cx, cz, r] of MB.blobs) { if (Math.abs(x - cx) > r + 20 || Math.abs(z - cz) > r + 20) continue; d = smax(d, circ(x, z, cx, cz, r), 8); } return raw ? d : d + 5 * fbm(x * .05, z * .05, 3); };
  const mountK = (x, z) => { if (!MB) return 0; const d = mountD(x, z); if (d < -2) return 0;
    return smoothstep(-2, MB.ramp || 14, d) * (1 - smoothstep(-(MB.edge || 9), .5, openD(x, z))); };   /* edge: 골짜기 · 공터 둘레를 얼마나 깎는지 (얇은 산맥이면 작게) */   /* ramp: 산이 솟는 거리 (작을수록 절벽처럼 가파름) */
  const mountHraw = (x, z) => { const k = mountK(x, z); if (k <= 0) return 0;
    const rid = Math.max(0, 1 - Math.abs(fbm(x * .03 + 3, z * .03 - 5, 4)) * 1.8), r2 = Math.max(0, 1 - Math.abs(fbm(x * .07 - 11, z * .07 + 4, 3)) * 2);   /* 능선 둘: 큰 봉우리 줄기 · 작은 뾰족 봉우리 */
    const mh = k * MB.peak * (.32 + .62 * rid * rid + .22 * r2 * r2 * rid + .1 * fbm(x * .16, z * .16, 3)), lf = MB.lowFront ? frontK(x, z) : 0;   /* 고른 벽이 아니라 솟은 봉우리와 꺼진 안장 */
    const m2 = lf > 0 && mh > FCAP ? FCAP + (mh - FCAP) * (1 - .92 * lf) : mh, nk = MB.lowFront ? nearK(x, z) * smoothstep(.3, .65, k) : 0;
    let out = Math.max(m2, MINH * nk);
    if (MB.solid) { const d = mountD(x, z, true) + .8 * fbm(x * .3, z * .3, 2), sk = smoothstep(.5, 4.5, d) * (1 - smoothstep(-(MB.edge || 9) * .5, .5, openD(x, z))); if (sk > 0) out = Math.max(out, MB.solid * sk * (1 + .12 * fbm(x * .09 + 5, z * .09, 3)) + 3 * Math.max(0, fbm(x * .2, z * .2, 2)) * sk); }   /* solid: 얇은 산맥도 3층을 못 넘는 벽으로 (한 조각 체험판 · 산맥을 얇게 하기로 해서) */
    return out; };   /* 길 둘레 벽은 3층보다 낮은 안장이 없게 (사용자 2026-11-11: 들어가자마자 왼쪽 3층으로 빠져나갈 수 있었음) */
  /* 북쪽 비탈 자동 완만 (사용자 2026-11-12 · 그림 확인): 카메라는 남쪽(+z) 위에서 45°로 내려다봄 → 산의 북쪽(−z) 면이 45°보다 가파르면 그 뒤가 가려짐
     산 높이를 격자로 한 번 구워 두고, 남쪽에서 북쪽으로 훑으며 '남쪽 이웃 높이 − 거리 × NS' 아래로는 안 떨어지게 채움 → 북쪽 면은 늘 완만한 비탈 · 남쪽 절벽은 그대로
     골짜기 · 보물방 · 비밀길 입구 틈(열린 곳)은 채우지 않음 (동굴 안은 동굴 보기 규칙이 따로 맡음) · 막힘 · 시야 · 땅 모양이 모두 같은 격자를 씀 */
  const NS = 1; let MG; const bakeMG = () => { if (!MB || !L.box || MB.north === false) return null; const [bx0, bx1, bz0, bz1] = L.box, C = .5, W = Math.ceil((bx1 - bx0) / C) + 1, D = Math.ceil((bz1 - bz0) / C) + 1, g = new Float32Array(W * D);
    for (let j = 0; j < D; j++) for (let k = 0; k < W; k++) { const x = bx0 + k * C, z = bz0 + j * C; g[j * W + k] = mountHraw(x, z); }
    const raw = g.slice(), dg = NS * C, dd = NS * C * Math.SQRT2;   /* 남쪽 세 이웃(바로 남 · 남서 · 남동)에서 부채꼴로 내려옴 → 줄무늬 없이 둥근 비탈 */
    for (let j = D - 2; j >= 0; j--) for (let k = 0; k < W; k++) { const q = j * W + k, s0 = q + W, c = Math.max(g[s0] - dg, k > 0 ? g[s0 - 1] - dd : 0, k < W - 1 ? g[s0 + 1] - dd : 0); if (c <= g[q] + .01) continue; if (openD(bx0 + k * C, bz0 + j * C) > -1.5) continue; g[q] = c; }
    for (let j = 0; j < D; j++) { const row = new Float32Array(W); for (let k = 0; k < W; k++) { let a = 0, n = 0; for (let t = -3; t <= 3; t++) { const kk = Math.min(W - 1, Math.max(0, k + t)); a += g[j * W + kk] - raw[j * W + kk]; n++; } row[k] = a / n; } for (let k = 0; k < W; k++) g[j * W + k] = raw[j * W + k] + row[k]; }   /* 채운 양만 옆으로 살짝 고르게 */
    return { g, W, D, C, bx0, bz0 }; };
  const mountH = (x, z) => { if (noGorge) return mountHraw(x, z); if (MG === undefined) MG = bakeMG(); if (!MG) return mountHraw(x, z); const u = (x - MG.bx0) / MG.C, w = (z - MG.bz0) / MG.C; if (u < 0 || w < 0 || u >= MG.W - 1 || w >= MG.D - 1) return mountHraw(x, z); const i = u | 0, j = w | 0, a = u - i, b = w - j, g = MG.g, W = MG.W, q = j * W + i;
    return (g[q] * (1 - a) + g[q + 1] * a) * (1 - b) + (g[q + W] * (1 - a) + g[q + W + 1] * a) * b; };
  /* 카메라 쪽 벽 낮추기 (사용자 2026-11-11: 길이 옆으로 휘어 벽이 카메라와 기체 사이에 오는 곳은 3층을 겨우 못 넘을 만큼만 · 먼 쪽 벽은 높고 뾰족하게 그대로)
     카메라는 +z 쪽에서 내려다봄 → 길(골짜기 · 공터)보다 +z 쪽에 있는 산은 높이를 3층 + 여유까지로 누름 */
  const FCAP = LAYERS[2] + CLEAR + 2.6 - Y.MEADOW, MINH = LAYERS[2] + CLEAR + 1.4 - Y.MEADOW;
  const nearK = (x, z) => { let k = 0; for (let i = 0; i < GS.length; i++) { if (GS.length > 1 && far(i, x, z, 60)) continue; const G = GS[i].g, g = gorgeI(i, x, z), dist = G.w - g.d; k = Math.max(k, smoothstep(G.w + 30, G.w + 18, dist)); if (G.basin) { const [bx, bz, br] = G.basin; k = Math.max(k, smoothstep(br + 26, br + 14, Math.hypot(x - bx, z - bz))); } } return k; };
  const frontK = (x, z) => { let k = 0; for (let i = 0; i < GS.length; i++) { if (GS.length > 1 && far(i, x, z, 60)) continue; const G = GS[i].g, g = gorgeI(i, x, z), [gx, gz] = gorgeAtI(i, g.t), dist = G.w - g.d; k = Math.max(k, smoothstep(1, 9, z - gz) * smoothstep(40, 24, dist));
      if (G.basin) { const [bx, bz, br] = G.basin, dd = Math.hypot(x - bx, z - bz) - br; k = Math.max(k, smoothstep(.15, .5, (z - bz) / (Math.hypot(x - bx, z - bz) + 1)) * smoothstep(34, 18, dd)); } }
    return k; };
  /* 비밀길 (사용자 2026-11-11): 동굴 산을 가로로 뚫는 1층 터널 — L.secret: [{ pts: [[x, z]…], w: 반 폭 }] · 산 속에선 땅(산) 높이와 상관없이 1층만 트임 (터널 관은 isle.js가 그림)
     둔덕 (gorge.hump: { t, len, top }): 터널이 협곡 밑을 지나는 자리 — 협곡 바닥이 2층 아래까지 솟음 → 협곡은 그 구간 1층이 막혀 2층으로 넘음 · 터널 띠 안 1층은 열림 (서로 다른 길) */
  const SEC = (L.secret || []).map(s => ({ ...s, L: s.pts.slice(1).map((p, k) => [s.pts[k], p]) }));
  const secretD = (x, z) => { let best = -99; for (const s of SEC) for (const [[ax, az], [bx, bz]] of s.L) { const dx = bx - ax, dz = bz - az, q = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); best = Math.max(best, s.w - Math.hypot(x - ax - dx * q, z - az - dz * q)); } return best; };
  const humpK = (x, z) => { let k = 0; for (let i = 0; i < GS.length; i++) { const H = GS[i].g.hump; if (!H) continue; if (far(i, x, z, 30)) continue; const g = gorgeI(i, x, z); if (g.d < -4) continue; const tl = H.len / GS[i].GL[GS[i].GL.length - 1]; k = Math.max(k, smoothstep(tl * .5 + .012, tl * .5 - .006, Math.abs(g.t - H.t))); } return k; };
  const humpTop = i => GS[i] && GS[i].g.hump ? GS[i].g.hump.top : 0;
  /* 올라가는 바닥 (gorge.rise: { t0, t1, top }): 골짜기 바닥이 t0에서 t1까지 서서히 올라 보물방은 그 높이 (사용자 2026-11-12: 보물방을 2층으로 · 밑은 비밀길) */
  const riseAt = (i, x, z) => { const R = GS[i].g.rise; if (!R) return null; if (basinI(i, x, z) > -4) return R.top; const g = gorgeI(i, x, z); if (g.d < -4) return null; const k = smoothstep(R.t0, R.t1, g.t); return GS[i].g.floor + (R.top - GS[i].g.floor) * k; };
  const riseH = (x, z) => { let h = -99; for (let i = 0; i < GS.length; i++) { if (!GS[i].g.rise || far(i, x, z, 30)) continue; const r = riseAt(i, x, z); if (r !== null && (gorgeI(i, x, z).d > -4 || basinI(i, x, z) > -4)) h = Math.max(h, r); } return h; };
  /* 계단식 단 (L.terraces: [{ pts, steps: [[너비, 높이], …] }]): 줄(산맥) 북쪽으로 높은 단부터 낮은 단 순서 · 턱은 45°보다 완만한 비탈 (사용자 2026-11-12: 앞마당 → 2층 단 → 3층 단 → 산맥) */
  const TR = (L.terraces || []).map(T => ({ ...T, bb: [Math.min(...T.pts.map(q => q[0])) - 80, Math.max(...T.pts.map(q => q[0])) + 80, Math.min(...T.pts.map(q => q[1])) - 80, Math.max(...T.pts.map(q => q[1])) + 20] }));
  /* 사냥터 단 (L.mesas: [{ c3, e3, c2, e2, h2, h3 }]): 3층 단(구석) · 그 앞으로 넓게 펼친 2층 단 — 둘 다 사냥터 (사용자 2026-11-12: 동그랗게 겹치면 2층은 지나가는 길이 됨)
     남쪽(카메라 쪽) 턱은 또렷한 바위 턱 · 북쪽 턱은 45°보다 완만 (언덕 뒤에 숨는 곳이 안 생김) · 가장자리는 들쭉날쭉 */
  const MS = L.mesas || [];
  /* 타원 거리 (안쪽 −) */
  const ellD = (x, z, c, e) => { const u = (x - c[0]) / e[0], w = (z - c[1]) / e[1]; return (Math.hypot(u, w) - 1) * Math.min(e[0], e[1]); };
  const mesaH = (x, z) => { let best = -99; for (const M of MS) { const dx = x - M.c2[0], dz = z - M.c2[1]; if (Math.abs(dx) > M.e2[0] + 60 || Math.abs(dz) > M.e2[1] + 60) continue;
      const wob = 2.6 * fbm(x * .07 + 9, z * .07, 3), d3 = ellD(x, z, M.c3, M.e3) + wob, d2 = Math.min(ellD(x, z, M.c2, M.e2) + wob, d3);
      const n3 = Math.max(0, -(z - M.c3[1]) / (Math.hypot(x - M.c3[0], z - M.c3[1]) || 1)), n2 = Math.max(0, -(z - M.c2[1]) / (Math.hypot(dx, dz) || 1));
      const w3 = 2.5 + (M.h3 - M.h2) * 1.15 * n3, w2 = 2.5 + (M.h2 - Y.MEADOW) * 1.15 * n2;   /* 턱 너비: 남쪽은 또렷한 바위 턱 · 북쪽은 45°보다 완만 */
      const k3 = 1 - smoothstep(0, w3, d3), k2 = 1 - smoothstep(0, w2, d2);
      const h = Y.MEADOW + (M.h2 - Y.MEADOW) * ledges(k2, 2, x, z) + (M.h3 - M.h2) * ledges(k3, 2, x, z) + .35 * fbm(x * .3, z * .3, 2) * k2;
      best = Math.max(best, h); } return best; };
  /* 몬스터 빈터 (L.bays: [{ c, e, rot }]): 산맥 앞 단을 파고 들어간 들쭉날쭉한 만 — 바닥은 앞마당 높이 · 앞마당 쪽(북쪽)은 트임 · 뒤(남쪽)와 양옆은 45°보다 완만하게 층층이 (사용자 2026-11-12) */
  const BY = (L.bays || []).map(B => B.pts ? { ...B, bb: [Math.min(...B.pts.map(q => q[0])) - 40, Math.max(...B.pts.map(q => q[0])) + 40, Math.min(...B.pts.map(q => q[1])) - 40, Math.max(...B.pts.map(q => q[1])) + 40] } : B);
  let bayFl = Y.MEADOW;   /* 마지막 bayK 계산의 바닥 높이 (가장 깊게 판 빈터 기준) */
  const bayK = (x, z) => { let k = 0; bayFl = Y.MEADOW; for (const B of BY) { let d, fl = Y.MEADOW;
      if (B.pts) {   /* 줄 모양 빈터: 점마다 [x, z, 반폭, 바닥 높이] — 물이 깎은 골짜기처럼 폭이 변하고 휨 */
        if (x < B.bb[0] || x > B.bb[1] || z < B.bb[2] || z > B.bb[3]) continue; let m = -1e9;
        for (let q = 1; q < B.pts.length; q++) { const [ax, az, aw, af = Y.MEADOW] = B.pts[q - 1], [bx, bz, bw, bf = Y.MEADOW] = B.pts[q], vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz))), v = aw + (bw - aw) * t - Math.hypot(x - ax - vx * t, z - az - vz * t);
          if (v > m) { m = v; fl = af + (bf - af) * t; } }
        d = -m + (B.rough || 3) * fbm(x * .08 + (B.seed || 0), z * .08, 3) + (B.rough || 3) * .4 * fbm(x * .22 + 5, z * .22, 2); }
      else { const dx = x - B.c[0], dz = z - B.c[1]; if (Math.abs(dx) > B.e[0] + 40 || Math.abs(dz) > B.e[1] + 40) continue;
        const cs = Math.cos(B.rot || 0), sn = Math.sin(B.rot || 0), u = (dx * cs - dz * sn) / B.e[0], w = (dx * sn + dz * cs) / B.e[1];
        d = (Math.hypot(u, w) - 1) * Math.min(B.e[0], B.e[1]) + (B.rough || 3.2) * fbm(x * .07 + (B.seed || 0), z * .07, 3) + (B.rough || 3.2) * .5 * fbm(x * .2 + 5, z * .2, 2); }
      const kk = 1 - smoothstep(0, B.slope || 13, d); if (kk > k) { k = kk; bayFl = fl; } } return k; };
  /* 깊은 물길 (L.chasm: { paths: [{ pts: [[x, z, 반폭]…], floor, water }], pools: [[x, z, 반지름, floor, water]] }) — 사용자 2026-11-12
     물이 오래 깎은 모양: 풀밭이 둥글게 말려 내려가다 끊김 · 벽은 곳마다 가파름이 다르고(무너진 비탈 ~ 깎아지른 절벽) 층층이 바위 턱 · 바닥은 아주 깊음 (나는 높이보다 훨씬 아래라 막지도 가리지도 않음) */
  const CHP = ((L.chasm && L.chasm.paths) || []).map(p => { const mw = Math.max(...p.pts.map(q => q[2])); return { ...p, bb: [Math.min(...p.pts.map(q => q[0])) - mw - 12, Math.max(...p.pts.map(q => q[0])) + mw + 12, Math.min(...p.pts.map(q => q[1])) - mw - 12, Math.max(...p.pts.map(q => q[1])) + mw + 12] }; });
  const CHO = (L.chasm && L.chasm.pools) || [];
  const chasmAt = (x, z) => { let best = -99, fl = 0, wl = 0, km = 4.5, lp = 5.2;
    for (const p of CHP) { if (x < p.bb[0] || x > p.bb[1] || z < p.bb[2] || z > p.bb[3]) continue;
      for (let k = 1; k < p.pts.length; k++) { const [ax, az, aw] = p.pts[k - 1], [bx, bz, bw] = p.pts[k], vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1))), d = aw + (bw - aw) * t - Math.hypot(x - ax - vx * t, z - az - vz * t);
        if (d > best) { best = d; fl = p.floor; wl = p.water; km = p.steep || 4.5; lp = p.lip || 5.2; } } }
    for (const [cx, cz, r, f2, w2] of CHO) { const an = Math.atan2(z - cz, x - cx), d = r + 2.8 * fbm(an * 2 + cx * .01, 1.7, 3) - Math.hypot(x - cx, z - cz); if (d > best) { best = d; fl = f2; wl = w2; km = 4.5; lp = 5.2; } }
    return { d: best + 2.2 * fbm(x * .1, z * .1, 3) + 1.1 * fbm(x * .35 + 4, z * .35, 2), floor: fl, water: wl, km, lp }; };
  const chasmCut = (x, z, h) => { const c = chasmAt(x, z), out = -c.d; if (out > c.lp) return h;
    if (out > 0) { const t = 1 - out / c.lp; return Math.min(h, h - 3.2 * t * t); }   /* 풀밭이 둥글게 말려 내려감 */
    const kk = c.km + 7.5 * smoothstep(-.35, .5, fbm(x * .0175, z * .0175 + 5, 2)), Ls = 4.8 + 2.4 * fbm(x * .05, z * .05), dep = -out * kk, q = Math.floor(dep / Ls), fr = dep / Ls - q;   /* 가파름 · 턱 높이가 곳마다 다름 */
    return Math.min(h, Math.max(c.floor + .6 * fbm(x * .4, z * .4, 2), h - 3.2 - (q + smoothstep(.3, .85, fr)) * Ls - 1.2 * fbm(x * .25, z * .25, 2))); };
  const terraceH = (x, z) => { let best = -99; for (const T of TR) { if (x < T.bb[0] || x > T.bb[1] || z < T.bb[2] || z > T.bb[3]) continue; let m = 1e9, side = 0, endK = 1;
      for (let k = 1; k < T.pts.length; k++) { const [ax, az] = T.pts[k - 1], [bx, bz] = T.pts[k], vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz, t = ((x - ax) * vx + (z - az) * vz) / l2, tc = Math.max(0, Math.min(1, t)), d = Math.hypot(x - ax - vx * tc, z - az - vz * tc);
        if (d < m) { m = d; side = (vx * (z - az) - vz * (x - ax)) < 0 ? 1 : -1; endK = (k === 1 && t < 0) || (k === T.pts.length - 1 && t > 1) ? 0 : 1; } }
      if (side < 0 || !endK) continue;   /* 줄의 북쪽만 · 양 끝 너머는 없음 */
      const dw = m + 5 * fbm(x * .05, z * .05, 3); let acc = 0, h = -99;
      for (const [w, top, rw = 10] of T.steps) { const k = 1 - smoothstep(acc + w - rw * .5, acc + w + rw * .5, dw); h = Math.max(h, Y.MEADOW + (top - Y.MEADOW) * k + .3 * fbm(x * .3, z * .3, 2) * k); acc += w; }
      best = Math.max(best, h); } return best; };
  /* 떠 있는 바위 (오르내리는 구역 · L.floats: [x, z, 층, 길이, 방향, 두께]) — 그 층 높이에만 걸림 */
  const floats = (L.floats || []).map(([x, z, Ly, len, rot, r]) => ({ x, z, L: Ly, len, rot, r, dx: Math.cos(rot), dz: Math.sin(rot) }));
  const floatD = (f, x, z) => { const px = x - f.x, pz = z - f.z, a = Math.max(-f.len / 2, Math.min(f.len / 2, px * f.dx + pz * f.dz)); return f.r - Math.hypot(px - f.dx * a, pz - f.dz * a); };
  const meadow = (x, z) => Y.MEADOW + .55 * fbm(x * .045, z * .045, 3) + .22 * fbm(x * .19, z * .19, 2);
  /* 위 땅 높이 · 그 자리의 땅 종류 정보 */
  function top(x, z) {
    let h = meadow(x, z);
    const lo = low(x, z), kl = ledges(smoothstep(-.7, 2.4, lo), 3, x, z);   /* 낮은 단: 흐릿한 비탈이 아니라 세 턱으로 층진 바위 벽 (사용자 2026-11-10) */
    h += (Y.LOW + .4 * fbm(x * .08, z * .08, 2) - Y.MEADOW) * kl;
    const pd = pond(x, z), kp = smoothstep(-1.8, 2.6, pd); h -= 2.4 * kp * kp * (1 - kl);
    const ch = chan(x, z), kc = smoothstep(-.9, .7, ch) * (1 - smoothstep(-.5, 2, pd)); h = Math.min(h, h * (1 - kc) + (Y.WATER - .55) * kc);
    const pl = plateau(x, z), kP = ledges(smoothstep(-1.4, 3.6, pl), 3, x, z);
    h += (Y.PLATEAU + .7 * fbm(x * .07, z * .07, 3) - h) * kP;
    if (TR.length) h = Math.max(h, terraceH(x, z));
    if (MS.length) h = Math.max(h, mesaH(x, z));
    if (GS.length) { const o = openD(x, z); if (o > -3) { const gi = gorge(x, z), GF = GS[gi.i].g, k = ledges(smoothstep(-2.2, .9, o), 3, x, z), hk = humpK(x, z), rr = GF.rise ? riseAt(gi.i, x, z) : null, og = noGorge ? -99 : Math.max(gi.d, basinD(x, z)), isPass = rr === null && openX(x, z) > og, fl = isPass ? Y.MEADOW + .25 * Math.max(0, fbm(x * .2, z * .2, 2)) : (rr !== null ? rr : GF.floor) + .35 * fbm(x * .2, z * .2, 2); if (h > fl || rr !== null) h += (fl - h) * k;   /* 올라간 바닥은 낮은 땅도 채워 올림 */   /* 길 · 입구 틈은 평지 높이까지만 (평지를 파 내려가 흔적이 남지 않게 · 사용자 2026-11-12) */ if (hk > 0) { const ht = humpTop(gi.i) + .35 * fbm(x * .5, z * .5, 2) - .5 * (1 - hk); h += (ht - h) * Math.min(1, hk * 1.4) * k; } } }   /* 둔덕: 터널 위 협곡 바닥이 바위 언덕처럼 솟음 */   /* 골짜기 · 공터: 고원을 깊게 가른 길 · 벽은 층진 바위 턱 */
    if (MB) { const mh = mountH(x, z); if (mh > .05) { const t = Math.min(1.4, mh / MB.peak), st = ledges(Math.min(1, t), 5, x, z) * MB.peak; h = Math.max(h, Y.MEADOW + mh * .45 + st * .55 * (mh / Math.max(1e-3, Math.min(1, t) * MB.peak)) + .5 * fbm(x * .3, z * .3, 2) * (1 - Math.min(1, t))); } }   /* 산맥: 비탈 반 · 층진 바위 턱 반 (계단처럼 고르지 않게 · 위로 갈수록 바위가 드러남) */
    if (MS.length) for (const M of MS) { if (!M.cut) continue; const d = ellD(x, z, M.c3, M.e3) + 2.6 * fbm(x * .07 + 9, z * .07, 3); if (d > 6) continue;
      const gd = GS.length ? Math.max(gorge(x, z).d, basinD(x, z)) : -99, keep = smoothstep(-14, -8, gd);   /* 보물 동굴 벽(골짜기에서 7m 안)은 깎지 않음 → 3층으로 동굴 위를 넘지 못함 */
      const k = (1 - smoothstep(0, 4, d)) * (1 - keep), tp = M.h3 + .35 * fbm(x * .3, z * .3, 2); if (h > tp) h += (tp - h) * k; }   /* 사냥터 자리의 산은 3층 땅 높이로 깎음 */
    if (BY.length) { const k = bayK(x, z); if (k > 0) { const fl = bayFl + .3 * Math.max(0, fbm(x * .2, z * .2, 2));   /* 평지보다 낮게는 안 팜 */ if (h > fl) h += (fl - h) * ledges(k, 3, x, z); } }   /* 빈터: 층층이 파 내려감 */
    for (const S of L.spires) { if (spire(x, z, S) < -2) continue; const g = h, soft = S[4] === 'fat';   /* 층마다 깎아지른 벽 + 평평한 턱 (굵은 탑은 둥근 어깨) */
      for (const t of tiers(S)) { const d = circ(x, z, t.x, t.z, t.r) + rough(x, z, t), k = soft ? smoothstep(-1.1, 1., d) : smoothstep(-.45, .6, d); if (k <= 0) continue;
        let H = t.h + .4 * fbm(x * .3, z * .3, 2);
        if (t.top && S[4] === 'broken') { const an = Math.atan2(z - t.z, x - t.x), da = Math.abs(((an - S[5]) % 6.283 + 9.425) % 6.283 - 3.1416);
          H += (Math.abs(fbm(x * .9, z * .9, 2)) - .25) * 1.8 - 2.4 * smoothstep(.9, .35, da); }   /* 들쭉날쭉한 왕관 · 한쪽이 떨어져 나감 */
        if (soft && t.top) H += .8 * smoothstep(0, t.r, d);   /* 굵은 탑 꼭대기는 둥글게 솟음 */
        h = Math.max(h, g + (H - g) * k); } }
    if (CHP.length || CHO.length) h = chasmCut(x, z, h);   /* 깊은 물길 */
    const m = mask(x, z), sh = 1 - smoothstep(0, 3.2, m); h -= (1.5 + .6 * fbm(x * .4, z * .4, 2)) * sh * sh;   /* 가장자리 둥근 어깨: 테두리로 갈수록 둥글게 꺾여 내려감 (칼처럼 끊기지 않게) */
    return h; }
  /* 아래 바위 몸통: 가장자리에서 급히 꺾여 가운데로 갈수록 깊이 · 층진 바위 결 */
  function bottom(x, z, h, m) {
    const d = 1.6 * smoothstep(0, .7, m) + 36 * Math.pow(smoothstep(0, 30, m), .85) + 5 * smoothstep(4, 20, m) * fbm(x * .06, z * .06, 3) + 1.4 * fbm(x * .3, z * .3, 2) * smoothstep(0, 3, m);
    return h - d; }
  /* 땅 말고 공중에 걸친 것(아치 · 다리): 구슬 여럿 (x, y, z, 보이는 반지름) — 그 높이에서 잘린 둘레만 막힘 */
  const obstacles = [];
  /* 막힘 (사용자 2026-11-10: 걸려서 멈추는 일이 없게 · 땅을 일부러 막지 않음): 그 층 높이까지 솟은 고원 · 돌탑만
     · 울퉁불퉁한 바위 결을 뺀 매끈한 모양으로 · 보이는 절벽보다 안쪽(IN)에서만 막음 → 스치면 그냥 지나가고 닿으면 미끄러짐
     · 아치 · 다리는 구슬을 줄여서 */
  const IN = .9, SHIP_H = .5;
  const inGorge = (x, z, e = .8) => openD(x, z) > e;   /* 골짜기 · 공터 안 (벽에서 조금 떨어진 곳) */   /* SHIP_H: 기체 몸 두께의 반 (위아래로 이만큼은 닿음) */
  const plateauS = (x, z) => { const [u, w] = warp(x * 1.1, z * 1.1); let d = -99; for (const [cx, cz, r] of L.plateau) d = smax(d, circ(u, w, cx * 1.1, cz * 1.1, r * 1.1), 5); return d / 1.1; };
  const blocked = (x, z, Li = 1) => { const y = LAYERS[Li];
    if (BY.length && bayK(x, z) > .05) return top(x, z) > y - .6;   /* 빈터 둘레: 파 낸 실제 땅 높이로 */
    if (Li === 0 && SEC.length && secretD(x, z) > .3) return false;   /* 비밀길 안 1층: 산 속이라도 트임 */
    if (GS.length && humpK(x, z) > .15 && openD(x, z) > -2) { const gi = gorge(x, z); if (humpTop(gi.i) > y - CLEAR - SHIP_H) return true; }   /* 둔덕: 그 높이까지 솟은 곳 */
    if (GS.length && openD(x, z) > -2 && riseH(x, z) > y - CLEAR - SHIP_H) return true;   /* 올라간 골짜기 바닥 · 보물방 */
    if (TR.length && !inGorge(x, z, -1) && terraceH(x, z) > y - .6) return true;   /* 계단식 단 */
    if (MS.length && mesaH(x, z) > y - .6) return true;   /* 사냥터 언덕 */
    if (MS.length && MS.some(M => M.cut && ellD(x, z, M.c3, M.e3) < 6)) return top(x, z) > y - .6;   /* 깎은 사냥터 자리: 실제 땅 높이로 */
    if (Y.PLATEAU > y - CLEAR && plateauS(x, z) > IN && !inGorge(x, z)) return true;
    if (MB && Y.MEADOW + mountH(x, z) > y - CLEAR + .6) return true;   /* 산맥: 그 높이까지 솟은 곳 (3층도 막힘) */
    for (const f of floats) if (f.L === Li && floatD(f, x, z) > IN * .5) return true;   /* 오르내리는 구역: 그 층 높이에 떠 있는 바위 */
    for (const S of L.spires) for (const t of tiers(S)) if (t.h > y - CLEAR && circ(x, z, t.x, t.z, t.r) > IN * .6) return true;   /* 그 높이까지 솟은 층의 둘레만 */
    for (const o of obstacles) { const R = o[3] + SHIP_H, dy = Math.abs(y - o[1]); if (dy >= R) continue; const rr = Math.sqrt(R * R - dy * dy) * .85, dx = x - o[0], dz = z - o[2]; if (dx * dx + dz * dz < rr * rr) return true; }   /* 보이는 바위 두께대로: 그 높이에서 잘린 둘레 (조금 너그럽게) */
    return false; };
  /* 시야를 가리는 것 (평평한 지도 위 바닥 모양만 · 3D 계산 없음): 그 층 높이에 걸리는 고원 · 돌탑 · 아치 다리
     · 고원 · 돌탑은 절벽 몸통 둘레대로 · 아치는 땅에 박힌 다리 두 곳만 (가운데 휜 부분은 바닥 모양이 아니라서 안 가림) */
  const archLegs = [];
  const sightBlock = (x, z, Li) => { const y = LAYERS[Li];
    if (BY.length && bayK(x, z) > .05) return top(x, z) > y - CLEAR;
    if (Li === 0 && SEC.length && secretD(x, z) > 0) return false;
    if (GS.length && humpK(x, z) > .3 && openD(x, z) > -1) { const gi = gorge(x, z); if (humpTop(gi.i) > y - CLEAR) return true; }
    if (TR.length && !inGorge(x, z, -1) && terraceH(x, z) > y - CLEAR) return true;
    if (MS.length && mesaH(x, z) > y - CLEAR) return true;
    if (Y.PLATEAU > y - CLEAR && plateau(x, z) > .8 && !inGorge(x, z, .2)) return true;
    if (MB && Y.MEADOW + mountH(x, z) > y - CLEAR) return true;
    for (const f of floats) if (f.L === Li && floatD(f, x, z) > 0) return true;
    for (const S of L.spires) for (const t of tiers(S)) if (t.h > y - CLEAR && circ(x, z, t.x, t.z, t.r) + rough(x, z, t) > .4) return true;
    for (const a of archLegs) if (a[3] > y - CLEAR && (x - a[0]) ** 2 + (z - a[1]) ** 2 < a[2] * a[2]) return true; return false; };
  const brushZ = (k, x, z) => { let e = -99; for (const [cx, cz, r] of L.brush[k]) e = smax(e, circ(x, z, cx, cz, r), 2); return e + .5 * fbm(x * .6, z * .6, 2) + .2 * fbm(x * 1.7, z * 1.7, 2); };
  const brush = (x, z) => { let d = -99; for (let k = 0; k < L.brush.length; k++) d = Math.max(d, brushZ(k, x, z)); return d; };
  const brushZone = (x, z) => { for (let k = 0; k < L.brush.length; k++) if (brushZ(k, x, z) > 0) return k; return -1; };   /* 몇 번째 부쉬 안인지 (밖이면 −1) */   /* 부쉬 안 + (가장자리가 덤불 뭉치처럼 물결) */
  /* 지금 자리가 어디인지: 동굴 입구 · 골짜기길 · 공터 */
  const where = (x, z) => { if (SEC.length && secretD(x, z) > 0 && (openD(x, z) < 0 || humpK(x, z) > .3 || riseH(x, z) > -1)) return 'secret'; if (!GS.length) return null; const c = gorge(x, z), T = GS[c.i].g.tunnel; if (c.d > 0) return T && c.t <= T.to ? 'tunnel' : 'gorge'; return basinD(x, z) > 0 ? 'basin' : null; };
  const chasmWater = (x, z) => { if (!CHP.length && !CHO.length) return null; const c = chasmAt(x, z); return c.d > -3 ? c.water : null; };
  return { chasmWater, chasmAt, mesaH, lidTop: (x, z) => { noGorge = true; try { return top(x, z); } finally { noGorge = false; } }, gorgeI, basinI, gorgeBB: i => GS[i].bb, L, mask, plateau, pond, chan, brush, brushZ, brushZone, spireMoss, top, bottom, blocked, sightBlock, obstacles, archLegs, gorge, gorgeAt, gorgeAtI, basinD, inGorge, where, mountH, floats, floatD, useGorge, gorges: GS.map(q => q.g), secretD, humpK };
}
