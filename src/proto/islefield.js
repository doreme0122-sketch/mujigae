/* 초원 섬 하나의 모양 (2026-11-10 · 새 초원 첫 시험)
   그림을 그대로 따라 하지 않고 느낌(신비로움 · 풍성함 · 깊이)만 가져옴. 게임 규칙에 맞춘 높낮이:
   · 세 높이로 나눔 (사용자 2026-11-10): 1층 = 풀밭 바로 위(숲 · 부쉬에 숨기) · 2층 = 돌탑 · 아치 · 다리 · 고원 사이를 빠져나감 · 3층 = 위로 탁 트여 다 내려다봄
   · 높이 기준(섬 안 단위 · 게임에선 0.5배): 풀밭 −6 · 1층 −3.6 · 2층 1.4 · 고원 +5 · 돌탑 5~7 · 3층 9
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
export const Y = { MEADOW: -6, LOW: -11, PLATEAU: 5, WATER: -7.1 };
export const LAYERS = [-3.6, 1.4, 9];   /* 1층 · 2층 · 3층 나는 높이 */
export const CLEAR = 1.2;               /* 위아래로 이만큼 안에 무언가 있으면 막힘 */
/* 자리 (북쪽 = −z = 화면 위쪽) */
export const SPOT = {
  plateau: [[-20, -16, 14], [-9, -25, 9], [-29, -6, 8]],
  spires: [[10, -16, 4.6, 7], [22, -3, 2.5, 6], [-1, -9, 2.1, 5.4], [-31, 19, 2.4, 6.2], [18, -27, 2.6, 6.6], [4, 31, 2.2, 5.6]],   /* 2층 장애물: 돌탑 (자리 x, z · 반지름 · 꼭대기) */
  arches: [[-8, 13, 3, 18, 5.4], [24, -16, 32, -6, 5]],   /* 2층 장애물: 돌 아치 (양 끝 · 꼭대기) — 2층은 밑으로 빠져나감 */
  /* 부쉬 (1층 숨는 곳 · 사용자 2026-11-10: 경계가 정확해야 · 띄엄띄엄이면 개념이 어설픔) — 동그라미 몇 개를 합친 덩이 하나하나가 빈틈없는 덤불 무리.
     이 모양 하나로 보이는 덤불 가장자리 = 숨는 판정 = 시야 가림이 꼭 같음 */
  brush: [[[12, 2, 5], [16, 6, 3.5], [8, -1, 3]], [[-4, 22, 4.5], [0, 25, 3.5], [-8, 25, 3]], [[-27, 16, 3.8], [-23, 19, 3]], [[3, 11, 3.2], [6, 14, 2.6]], [[16, -9, 3], [19, -12, 2.4]]],
  low: [[27, 13, 13], [18, 23, 8]],
  pond: [-17, 1.6, 6.6],
  channel: [-17, 1.6, -40, 10],
};

export function makeField() {
  const warp = (x, z) => [x + 4.5 * fbm(x * .03, z * .03, 3), z + 4.5 * fbm(x * .03 + 31, z * .03 - 7, 3)];
  /* 섬 바깥 모양 (안쪽 +, 바깥 −, 대략 가장자리까지 거리) */
  const mask = (x, z) => { const [u, w] = warp(x, z);
    let d = circ(u, w, 0, 0, 30); for (const [cx, cz, r] of [[-20, -14, 22], [20, -12, 17], [26, 12, 17], [-22, 9, 19], [-4, 21, 16], [8, 16, 14]]) d = smax(d, circ(u, w, cx, cz, r), 6);
    return d + 2.2 * fbm(x * .09, z * .09, 3) + .7 * fbm(x * .35, z * .35, 2); };
  const plateau = (x, z) => { const [u, w] = warp(x * 1.1, z * 1.1); let d = -99; for (const [cx, cz, r] of SPOT.plateau) d = smax(d, circ(u, w, cx * 1.1, cz * 1.1, r * 1.1), 5); return d / 1.1 + .9 * fbm(x * .21, z * .21, 3); };
  const spire = (x, z, [cx, cz, r]) => { const an = Math.atan2(z - cz, x - cx); return circ(x, z, cx, cz, r) + .6 * fbm(x * .45, z * .45, 3) * r / 4 + .3 * Math.sin(an * 7 + cx) * r / 4.6 + .12 * Math.sin(an * 13 + cz) * r / 4.6; };   /* 기둥 바위가 엮인 결 */
  const low = (x, z) => { const [u, w] = warp(x, z); let d = -99; for (const [cx, cz, r] of SPOT.low) d = smax(d, circ(u, w, cx, cz, r), 5); return d + .8 * fbm(x * .17, z * .17, 3); };
  const pond = (x, z) => circ(x, z, SPOT.pond[0], SPOT.pond[1], SPOT.pond[2]) + 1.1 * fbm(x * .19, z * .19, 3);
  const chan = (x, z) => { const [ax, az, bx, bz] = SPOT.channel; return capsule(x, z, ax, az, bx, bz, 1.25 + .35 * fbm(x * .3, z * .3, 2)) + .35 * fbm(x * .4 + 5, z * .4, 2); };

  /* 절벽 결: 바위가 층층이 쌓인 턱 (턱마다 이끼가 앉음) — 그냥 매끈한 비탈이 아니라 */
  const ledges = (t, n, x, z) => { t = Math.min(1, Math.max(0, t + .06 * fbm(x * .3, z * .3, 2))); const s = t * n, i = Math.floor(s), f = s - i; return Math.min(1, (i + Math.pow(smoothstep(.35, 1, f), 1.6)) / n); };

  const meadow = (x, z) => Y.MEADOW + .55 * fbm(x * .045, z * .045, 3) + .22 * fbm(x * .19, z * .19, 2);
  /* 위 땅 높이 · 그 자리의 땅 종류 정보 */
  function top(x, z) {
    let h = meadow(x, z);
    const lo = low(x, z), kl = ledges(smoothstep(-1.2, 3.2, lo), 2, x, z);
    h += (Y.LOW + .4 * fbm(x * .08, z * .08, 2) - Y.MEADOW) * kl;
    const pd = pond(x, z), kp = smoothstep(-1.8, 2.6, pd); h -= 2.4 * kp * kp * (1 - kl);
    const ch = chan(x, z), kc = smoothstep(-.9, .7, ch) * (1 - smoothstep(-.5, 2, pd)); h = Math.min(h, h * (1 - kc) + (Y.WATER - .55) * kc);
    const pl = plateau(x, z), kP = ledges(smoothstep(-1.4, 3.6, pl), 3, x, z);
    h += (Y.PLATEAU + .7 * fbm(x * .07, z * .07, 3) - h) * kP;
    for (const S of SPOT.spires) { const sp = spire(x, z, S); if (sp < -2) continue; const kI = ledges(smoothstep(-.9, 1.5, sp), 4, x + 40 + S[0], z);   /* 깎아지른 벽 + 평평한 꼭대기 (뾰족한 고깔이 아니라 기둥 바위) */ h += (S[3] + .4 * fbm(x * .3, z * .3, 2) - h) * kI; }
    const m = mask(x, z); h -= .9 * (1 - smoothstep(0, 1.8, m));   /* 가장자리 둥근 턱 */
    return h; }
  /* 아래 바위 몸통: 가장자리에서 급히 꺾여 가운데로 갈수록 깊이 · 층진 바위 결 */
  function bottom(x, z, h, m) {
    const d = 1.6 * smoothstep(0, .7, m) + 36 * Math.pow(smoothstep(0, 30, m), .85) + 5 * smoothstep(4, 20, m) * fbm(x * .06, z * .06, 3) + 1.4 * fbm(x * .3, z * .3, 2) * smoothstep(0, 3, m);
    return h - d; }
  /* 땅 말고 공중에 걸친 것(아치 · 다리): 구슬 여럿 (x, y, z, 반지름) — 그 높이를 지나는 층만 막힘 */
  const obstacles = [];
  /* 막힘 (사용자 2026-11-10: 걸려서 멈추는 일이 없게 · 땅을 일부러 막지 않음): 그 층 높이까지 솟은 고원 · 돌탑만
     · 울퉁불퉁한 바위 결을 뺀 매끈한 모양으로 · 보이는 절벽보다 안쪽(IN)에서만 막음 → 스치면 그냥 지나가고 닿으면 미끄러짐
     · 아치 · 다리는 구슬을 줄여서 */
  const IN = .9;
  const plateauS = (x, z) => { const [u, w] = warp(x * 1.1, z * 1.1); let d = -99; for (const [cx, cz, r] of SPOT.plateau) d = smax(d, circ(u, w, cx * 1.1, cz * 1.1, r * 1.1), 5); return d / 1.1; };
  const blocked = (x, z, L = 1) => { const y = LAYERS[L];
    if (Y.PLATEAU > y - CLEAR && plateauS(x, z) > IN) return true;
    for (const S of SPOT.spires) if (S[3] > y - CLEAR && circ(x, z, S[0], S[1], S[2]) > IN * .6) return true;
    for (const o of obstacles) { const r = o[3] * .8, dx = x - o[0], dz = z - o[2]; if (dx * dx + dz * dz < r * r && Math.abs(y - o[1]) < r + CLEAR * .5) return true; } return false; };
  /* 시야를 가리는 것 (평평한 지도 위 바닥 모양만 · 3D 계산 없음): 그 층 높이에 걸리는 고원 · 돌탑 · 아치 다리
     · 고원 · 돌탑은 절벽 몸통 둘레대로 · 아치는 땅에 박힌 다리 두 곳만 (가운데 휜 부분은 바닥 모양이 아니라서 안 가림) */
  const archLegs = [];
  const sightBlock = (x, z, L) => { const y = LAYERS[L];
    if (Y.PLATEAU > y - CLEAR && plateau(x, z) > .8) return true;
    for (const S of SPOT.spires) if (S[3] > y - CLEAR && spire(x, z, S) > .4) return true;
    for (const a of archLegs) if (a[3] > y - CLEAR && (x - a[0]) ** 2 + (z - a[1]) ** 2 < a[2] * a[2]) return true; return false; };
  const brush = (x, z) => { let d = -99; for (const Z of SPOT.brush) { let e = -99; for (const [cx, cz, r] of Z) e = smax(e, circ(x, z, cx, cz, r), 2); d = Math.max(d, e); } return d + .5 * fbm(x * .6, z * .6, 2) + .2 * fbm(x * 1.7, z * 1.7, 2); };   /* 부쉬 안 + (가장자리가 덤불 뭉치처럼 물결) */
  return { mask, plateau, pond, chan, brush, top, bottom, blocked, sightBlock, obstacles, archLegs };
}
