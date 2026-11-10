/* 초원 섬 하나의 모양 (2026-11-10 · 새 초원 시험) — 땅 · 물 · 나무 · 막힘이 모두 이 모양 하나를 씀
   그림을 그대로 따라 하지 않고 느낌(신비로움 · 풍성함 · 깊이)만 가져옴.
   · 세 높이 (사용자 2026-11-10): 1층 = 풀밭 바로 위 — 낮은 벽이 이어져 통로를 만들고 벽 사이로는 못 지나감 · 벽에 둘러싸인 움푹한 자리에 부쉬(숨는 곳)
                                 2층 = 돌탑 · 아치 · 다리 · 고원 사이를 빠져나감 (비행 장애물을 피하는 기분)
                                 3층 = 위로 탁 트여 다 내려다봄
   · 높이 차이를 크게 (사용자: 각 층도 맵도 높이 차이를 더 두기) — 섬 안 단위(게임에선 0.5배):
       낮은 단 −26 · 풀밭 −16 · 1층 −13 · 1층 벽 꼭대기 −9 · 2층 1.4 · 돌탑 · 고원 8.5~11 · 3층 18
   · 땅은 층층이 평평한 단 + 단 사이의 진짜 세로 벽 (비탈을 늘인 삼각형이 보이지 않게 · 사용자: 단면의 삼각형 없애기)
   · 막힘 판정은 너그럽게 (사용자: 걸려서 멈추는 일이 없어야): 보이는 바위보다 안쪽 · 울퉁불퉁함을 뺀 매끈한 모양으로만 막음 */

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
const arcPts = (cx, cz, R, a0, a1, n = 8) => Array.from({ length: n + 1 }, (_, k) => { const a = (a0 + (a1 - a0) * k / n) * Math.PI / 180; return [cx + Math.cos(a) * R, cz + Math.sin(a) * R]; });

export const Y = { LOW: -26, MEADOW: -16, WALL: -9, PLATEAU: 10, WATER: -18.2 };
export const LAYERS = [-13, 1.4, 18];   /* 1층 · 2층 · 3층 나는 높이 */
export const CLEAR = 2;                 /* 위아래로 이만큼 안에 무언가 있으면 막힘 */
/* 자리 (북쪽 = −z = 화면 위쪽 · 섬 안 단위) */
export const SPOT = {
  plateau: [[-20, -16, 14], [-9, -25, 9], [-29, -6, 8]],
  spires: [[10, -16, 4.6, 11], [22, -3, 2.8, 9], [-1, -10, 2.4, 8.5], [-33, 21, 2.6, 9.5], [18, -28, 2.8, 10], [6, 33, 2.4, 8.5]],   /* 2층 장애물: 기둥 돌탑 (x, z, 반지름, 꼭대기) */
  low: [[27, 13, 13], [18, 23, 8]],
  pond: [-17, 1.6, 6.6],
  channel: [-17, 1.6, -40, 10],
  /* 1층 벽: 이어진 낮은 바위 벽 — 통로와 막다른 곳 · 움푹한 숨는 자리(입구 한두 개) */
  walls: [
    arcPts(3, 8, 7, -150, 160, 10),                 /* 가운데 숨는 자리: 북쪽(돌탑 쪽)으로만 열림 */
    arcPts(-27, 15, 6, 100, 390, 9),                /* 서쪽 숨는 자리: 남동쪽으로 열림 */
    arcPts(-8, 30, 5.5, -60, 230, 9),               /* 남쪽 숨는 자리: 북서쪽으로 열림 */
    [[-7, -1], [-2, -4], [5, -6]],                  /* 고원 앞 길목을 좁히는 벽 */
    [[14, 6], [17, 0], [16, -7]],                   /* 동쪽 통로 벽 */
    [[-15, 12], [-12, 19], [-16, 25]],              /* 서남쪽 통로 벽 */
    [[10, 20], [9, 27]],                            /* 남동쪽 짧은 벽 */
    [[-36, -2], [-34, 6]],                          /* 서쪽 끝 벽 */
    [[10, 8.5], [14, 6]],                           /* 가운데 자리와 동쪽 벽을 이음 */
    [[-30, 9], [-33, 1]],                           /* 서쪽 자리와 고원 밑을 이음 */
    [[-13, 27], [-15, 25]],                         /* 남쪽 자리와 서남쪽 벽을 이음 */
  ],
  arches: [[-12, 12.5, -1, 20, 9], [25, -15, 33, -5, 8.5]],   /* 2층 장애물: 돌 아치 (양 끝 · 꼭대기) — 2층은 밑으로 빠져나감 */
  brush: [[3, 8, 4.6], [-27, 15, 4], [-8, 30, 3.8], [24, 5, 3], [-4, 13, 2.4]],   /* 부쉬 (1층 숨는 곳) — 대부분 벽에 둘러싸인 자리 */
  forest: [[13, -2, 6], [-24, -20, 6], [2, 24, 4.5]],
};

export function makeField() {
  const warp = (x, z) => [x + 4.5 * fbm(x * .03, z * .03, 3), z + 4.5 * fbm(x * .03 + 31, z * .03 - 7, 3)];
  const mask = (x, z) => { const [u, w] = warp(x, z);   /* 섬 바깥 모양 (안쪽 +) */
    let d = circ(u, w, 0, 0, 30); for (const [cx, cz, r] of [[-20, -14, 22], [20, -12, 17], [26, 12, 17], [-22, 9, 19], [-4, 21, 16], [8, 16, 14]]) d = smax(d, circ(u, w, cx, cz, r), 6);
    return d + 2.2 * fbm(x * .09, z * .09, 3) + .7 * fbm(x * .35, z * .35, 2); };
  /* 단마다 모양 (안쪽 +) — 보이는 모양은 울퉁불퉁 · 판정(…S)은 매끈한 쪽만 */
  const plateauS = (x, z) => { const [u, w] = warp(x * 1.1, z * 1.1); let d = -99; for (const [cx, cz, r] of SPOT.plateau) d = smax(d, circ(u, w, cx * 1.1, cz * 1.1, r * 1.1), 5); return d / 1.1; };
  const plateau = (x, z) => plateauS(x, z) + .9 * fbm(x * .21, z * .21, 3);
  const spireS = (x, z, S) => circ(x, z, S[0], S[1], S[2]);
  const spire = (x, z, S) => { const an = Math.atan2(z - S[1], x - S[0]); return spireS(x, z, S) + .6 * fbm(x * .45, z * .45, 3) * S[2] / 4 + .3 * Math.sin(an * 7 + S[0]) * S[2] / 4.6; };
  const wallS = (x, z) => { let d = -99; for (const L of SPOT.walls) for (let k = 0; k + 1 < L.length; k++) d = Math.max(d, capsule(x, z, ...L[k], ...L[k + 1], 1.7)); return d; };
  const wall = (x, z) => wallS(x, z) + .55 * fbm(x * .3, z * .3, 3) + .25 * fbm(x * 1.1, z * 1.1, 2);
  const lowS = (x, z) => { const [u, w] = warp(x, z); let d = -99; for (const [cx, cz, r] of SPOT.low) d = smax(d, circ(u, w, cx, cz, r), 5); return d; };
  const low = (x, z) => lowS(x, z) + .8 * fbm(x * .17, z * .17, 3);
  const pond = (x, z) => circ(x, z, SPOT.pond[0], SPOT.pond[1], SPOT.pond[2]) + 1.1 * fbm(x * .19, z * .19, 3);
  const chan = (x, z) => { const [ax, az, bx, bz] = SPOT.channel; return capsule(x, z, ax, az, bx, bz, 1.25 + .35 * fbm(x * .3, z * .3, 2)) + .35 * fbm(x * .4 + 5, z * .4, 2); };
  const lip = (x, z) => .9 * (1 - smoothstep(0, 1.8, mask(x, z)));   /* 섬 가장자리 둥근 턱 */

  const meadowH = (x, z) => { let h = Y.MEADOW + .5 * fbm(x * .045, z * .045, 3) + .2 * fbm(x * .19, z * .19, 2);
    const pd = pond(x, z), kp = smoothstep(-1.8, 2.6, pd); h -= 4 * kp * kp;   /* 연못 우묵 */
    const ch = chan(x, z), kc = smoothstep(-.9, .7, ch) * (1 - smoothstep(-.5, 2, pd)); h = h * (1 - kc) + (Y.WATER - .6) * kc;
    return h - lip(x, z); };
  /* 단: 위에 있는 순서대로 (먼저 나온 것이 그 자리의 땅) · 높이는 거의 평평 (작은 너울만) */
  const TIERS = [
    ...SPOT.spires.map((S, k) => ({ name: 'spire' + k, sd: (x, z) => spire(x, z, S), sdS: (x, z) => spireS(x, z, S), h: (x, z) => S[3] + .35 * fbm(x * .3 + k, z * .3, 2), top: S[3], box: [S[0] - S[2] - 3, S[1] - S[2] - 3, S[0] + S[2] + 3, S[1] + S[2] + 3] })),
    { name: 'plateau', sd: plateau, sdS: plateauS, h: (x, z) => Y.PLATEAU + .6 * fbm(x * .07, z * .07, 3) - lip(x, z), top: Y.PLATEAU },
    { name: 'wall', sd: wall, sdS: wallS, h: (x, z) => Y.WALL + 1.4 * fbm(x * .09 + 3, z * .09, 2) + .4 * fbm(x * .3, z * .3, 2), top: Y.WALL + 1.6 },   /* 벽 높이가 들쭉날쭉 (사람이 쌓은 담처럼 반듯하지 않게) */
    { name: 'low', sd: low, sdS: lowS, h: (x, z) => Y.LOW + .5 * fbm(x * .08, z * .08, 2) - lip(x, z), top: Y.LOW, lower: true },
    { name: 'meadow', sd: mask, sdS: mask, h: meadowH, top: Y.MEADOW },
  ];
  const tierAt = (x, z) => { if (mask(x, z) < 0) return null; for (const T of TIERS) { if (T.box && (x < T.box[0] || z < T.box[1] || x > T.box[2] || z > T.box[3])) continue; if (T.sd(x, z) >= 0) return T; } return null; };
  const top = (x, z) => { const T = tierAt(x, z); return T ? T.h(x, z) : -60; };
  /* 아래 바위 몸통: 가장자리에서 급히 꺾여 가운데로 갈수록 깊이 */
  const bottom = (x, z, h, m) => h - (1.6 * smoothstep(0, .7, m) + 40 * Math.pow(smoothstep(0, 30, m), .85) + 6 * smoothstep(4, 20, m) * fbm(x * .06, z * .06, 3) + 1.6 * fbm(x * .3, z * .3, 2) * smoothstep(0, 3, m));
  const obstacles = [];   /* 공중에 걸친 것 (아치 · 다리): 구슬 (x, y, z, 반지름) */
  /* 막힘: 그 층 높이 근처까지 솟은 단 — 판정은 매끈한 모양으로 보이는 바위보다 안쪽(IN)에서 · 아치·다리는 구슬을 줄여서 */
  const IN = .9;
  const blocked = (x, z, L = 1) => { const y = LAYERS[L];
    for (const T of TIERS) { if (T.lower || T.name === 'meadow' || T.top <= y - CLEAR) continue; if (T.box && (x < T.box[0] || z < T.box[1] || x > T.box[2] || z > T.box[3])) continue; if (T.sdS(x, z) > IN) return true; }
    for (const o of obstacles) { const r = o[3] * .8, dx = x - o[0], dz = z - o[2]; if (dx * dx + dz * dz < r * r && Math.abs(y - o[1]) < r + CLEAR * .5) return true; } return false; };
  return { mask, plateau, spire, wall, low, pond, chan, TIERS, tierAt, top, bottom, H: top, blocked, obstacles };
}
