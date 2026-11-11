/* 한 조각 체험판: 내 기지 · 내 앞마당 · 양옆 보물 동굴 둘 (사용자 2026-11-11 저녁 회의 · 설계 문서 '전체 맵 다시 나눔' 참고)
   단위는 섬 안 단위 (게임에서 0.5배 = m) · 맵 가운데 = (0, 0) · 내 기지 = 6시(+z, 화면 아래) · 맵 가운데 쪽 = −z (화면 위)
   · 맵 반지름 240m (= 480) · 기지 10곳은 36°마다 테두리 위 (절반은 맵 안 · 절반은 바깥 우주) · 보물 동굴은 기지 사이 한가운데 (내 기지에서 ±18°)
   · 지역: 초원 240~160m (480~320) → 화산 160~60m (아직 안 만듦 · 땅은 초원 가장자리에서 끝남)
   · 내 앞마당: 양옆 = 동굴 산 · 뒤 = 테두리 · 화산 쪽 = 1차 산맥 (불규칙) · 산맥 양 끝과 동굴 산 사이 좁은 협곡 (부쉬로 꽉 참)으로만 나감
   · 보물 동굴: 산맥 얇게 · 골짜기 짧게 (깊이 약 79m) · 입구 하나가 맵 가운데를 봄 · 동굴마다 굽이 · 보물방 비킴 · 산 두께가 다름
   · 비밀길: 보물방 바로 앞을 가로지르는 1층 터널 (살짝 지그재그) · 위 협곡 바닥은 둔덕 (2층 아래까지 솟음) · 둔덕에 '턱과 굴' 판돌 · 입구는 부쉬로 덮임 (청록 꽃) */
import { makeField } from './islefield.js?v=11112057';
const R = 480, D2R = Math.PI / 180;
const polar = (deg, r) => [r * Math.sin(deg * D2R), r * Math.cos(deg * D2R)];
/* 동굴 하나: 바깥 방향(테두리 쪽) 기준 로컬 좌표 (u = 가로 · v = 맵 가운데에서 거리) → 섬 좌표 */
function cave(deg, o) {
  const s = Math.sin(deg * D2R), c = Math.cos(deg * D2R), W = (u, v) => [v * s + u * c, v * c - u * s];
  const CP = o.cp.map(([u, v]) => W(u, v));
  const PTS = []; for (let k = 0; k < CP.length - 1; k++) { const p0 = CP[Math.max(0, k - 1)], p1 = CP[k], p2 = CP[k + 1], p3 = CP[Math.min(CP.length - 1, k + 2)];
    for (let i = 0; i < 4; i++) { const t = i / 4, t2 = t * t, t3 = t2 * t; PTS.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } }
  PTS.push(CP[CP.length - 1]);
  const LEN = [0]; for (let k = 1; k < PTS.length; k++) LEN.push(LEN[k - 1] + Math.hypot(PTS[k][0] - PTS[k - 1][0], PTS[k][1] - PTS[k - 1][1])); const TL = LEN[LEN.length - 1];
  const at = t => { const sd = t * TL; let k = 1; while (k < LEN.length - 1 && LEN[k] < sd) k++; const f = (sd - LEN[k - 1]) / (LEN[k] - LEN[k - 1]); return [PTS[k - 1][0] + (PTS[k][0] - PTS[k - 1][0]) * f, PTS[k - 1][1] + (PTS[k][1] - PTS[k - 1][1]) * f]; };
  const SITE = W(o.room[0], o.room[1]), BR = 36;
  /* 비밀길: 보물방 바로 앞 v = vt 를 가로지름 · 협곡을 지나는 자리 찾기 (협곡 꺾은선이 v = vt 를 지나는 곳) */
  const loc = PTS.map(([x, z]) => [x * c - z * s, x * s + z * c]);   /* 섬 → 로컬 (u, v) */
  let tc = .9, uc = 0; for (let k = 1; k < loc.length; k++) { const [u0, v0] = loc[k - 1], [u1, v1] = loc[k]; if ((v0 - o.vt) * (v1 - o.vt) <= 0 && v0 !== v1) { const f = (o.vt - v0) / (v1 - v0); uc = u0 + (u1 - u0) * f; tc = (LEN[k - 1] + (LEN[k] - LEN[k - 1]) * f) / TL; break; } }
  const zig = o.zig, sec = []; for (let k = 0; k < zig.length; k++) { const [u, dv] = zig[k]; sec.push(W(uc + u, o.vt + dv)); }   /* 협곡 밑 ±8은 곧게 (zig 안에서 0) */
  const MB = [];   /* 동굴 산: 길 양옆 얇은 띠 · 보물방 둘레 띠 · 신전 문 양옆 */
  for (let t = .1; t <= .96; t += .05) { const [x, z] = at(t); MB.push([x, z, 7 + o.band + 5 + 2.5 * Math.sin(t * 17 + deg)]); }   /* 길 양옆 벽 두께 약 4~6m (얇게 · 사용자) */
  MB.push([SITE[0], SITE[1], BR + o.band + 2], [...W(-30, o.cp[0][1] + 14), 15], [...W(30, o.cp[0][1] + 14), 15]);
  const ISL = [...[.0, .2, .4, .6, .8, .95].map(t => [...at(t), 26]), [SITE[0], SITE[1], BR + o.band + 8], [...W(0, o.cp[0][1] - 14), 26], [...W(-22, o.cp[0][1] - 8), 16], [...W(22, o.cp[0][1] - 8), 16]];
  return { gorge: { pts: PTS, w: 7, floor: -6.6,
      tunnel: { to: 22 / TL, top: 18 },                                     /* 신전 입구 · 기둥 복도 (들머리만 천장) */
      basin: [SITE[0], SITE[1], BR],                                        /* 보물방 */
      ruins: { lean: o.lean, boulders: o.boulders },                        /* 골짜기: 기댄 기둥 · 바닥 바위 무더기 */
      falls: o.falls,
      hump: { t: tc, len: 34, top: 2.2 },                                   /* 비밀길 위 둔덕: 꼭대기 2.2 (2층 4.4 − 여유) → 협곡 1층은 막히고 2층으로 넘음 */
      site: { pile: { c: W(0, o.cp[0][1] - 15), w: 44, rot: deg } },        /* 신전 앞마당 무너진 기둥 무더기 */
      rune: { t: tc }, treasure: SITE },
    secret: { pts: sec, w: 5, mid: zig.findIndex(([u]) => u === 0), cave: deg },
    MB, ISL, SITE };
}
/* 왼쪽 동굴 (−18°) · 오른쪽 동굴 (+18°): 크기는 같고 생김새는 다르게 (사용자: 같은 모양 복사 금지) */
const A = cave(-18, { cp: [[0, 322], [0, 334], [-9, 346], [7, 360], [-6, 374], [3, 386], [-6, 396]], room: [-6, 430], band: 9, vt: 377,
  zig: [[-48, -1], [-40, 2], [-33, -1.5], [-26, 3], [-19, -2.5], [-12, 1.5], [-8, 0], [0, 0], [8, 0], [13, -2], [19, 2.5], [26, -1.5], [33, 2], [40, -1.5], [48, 1]],
  lean: [[.42, -1, .25, .3, 9, 1.4]], boulders: [[.3, 1], [.62, -1]], falls: [[.5, 1]] });
const B = cave(18, { cp: [[0, 322], [0, 333], [8, 344], [-8, 357], [6, 371], [-4, 383], [5, 396]], room: [5, 431], band: 7.5, vt: 378,
  zig: [[-47, 1.5], [-40, -2], [-34, 1], [-27, -2], [-20, 2.5], [-13, -1], [-8, 0], [0, 0], [8, 0], [12, 1.5], [18, -2.5], [25, 2], [32, -1], [39, 2], [47, -1.5]],
  lean: [[.38, 1, .3, -.35, 10, 1.45]], boulders: [[.55, 1], [.28, -1]], falls: [[.44, -1]] });

/* 1차 산맥: 앞마당의 화산 쪽 (반지름 약 170m) · 불규칙하게 굽고 두께가 변함 · 양 끝은 동굴 산과 좁은 협곡을 남김 */
const RIDGE = []; for (let a = -6.2; a <= 6.21; a += .9) { const r = 344 + 9 * Math.sin(a * .7 + .8) + 4 * Math.sin(a * 2.3), rr = 11 + 3.5 * Math.sin(a * 1.3 + 2) + 2 * Math.cos(a * 3.1); RIDGE.push([...polar(a, r), rr]); }
/* 앞마당 출구 협곡: 산맥 끝 ↔ 동굴 산 사이 · 안은 부쉬로 꽉 참 (1층은 서로 안 보임 · 매복 자리) */
const exitBrush = sd => [0, 1, 2, 3].map(k => [...polar(sd * (8.6 + k * .25), 322 + k * 11), 5.2 - (k % 2) * .8]);
export const START = {
  box: [-250, 250, 248, 500], dens: 2.4, tile: 40, cut: 1, clipR: R - 3,
  rim: { R, base: [0, R], caves: [-18, 18], bases: [0, -36, 36] },   /* 무지개 벽 · 기지 (내 기지 6시 · 이웃은 화면 밖) */
  islands: [[...[-23, -17, -11, -5, 0, 5, 11, 17, 23].map(a => [...polar(a, 398), a % 2 ? 78 : 84]), [...polar(-26, 424), 44], [...polar(26, 426), 42], ...A.ISL, ...B.ISL]],
  mount: { peak: 42, ramp: 6, edge: 3.5, solid: 22, lowFront: true, blobs: [...A.MB, ...B.MB, ...RIDGE] },
  gorges: [A.gorge, B.gorge],
  secret: [A.secret, B.secret],
  plateau: [], spires: [[...polar(-5, 420), 2.3, 8.4, 'lean', .7], [...polar(4.5, 404), 2.1, 8, 'broken', 2.2], [...polar(1, 372), 2.4, 8.8, 'fat', 4]], arches: [], low: [],
  brush: [exitBrush(-1), exitBrush(1),
    [[...polar(-7, 438), 4.5], [...polar(-6, 444), 3.4]], [[...polar(7.5, 396), 4.2], [...polar(8.2, 404), 3.2]]],   /* 앞마당 숨을 곳 둘 */
  pond: [...polar(4, 446), 7],
  start: [0, R - 5],
  sites: [A.SITE, B.SITE],
};

/* 비밀길 입구 = 산이 끝나는 바로 그 자리 (사용자: 입구에서 떨어지면 안 됨) — 땅 높이를 재서, 터널 가운데(협곡 밑)에서 양쪽으로 걸어가며
   땅이 터널 천장보다 낮아지는 첫 자리에서 자름 → 그 자리에 부쉬를 덮음 (청록 꽃) */
{ const F0 = makeField(START), TOPY = -1.2 + 1.4;
  const BR = []; START.secretBrush = [];
  for (const S of START.secret) { const P = S.pts, fine = []; for (let k = 0; k < P.length - 1; k++) for (let i = 0; i < 8; i++) fine.push([P[k][0] + (P[k + 1][0] - P[k][0]) * i / 8, P[k][1] + (P[k + 1][1] - P[k][1]) * i / 8, k + i / 8]); fine.push([...P[P.length - 1], P.length - 1]);
    const mid = fine.findIndex(q => q[2] >= S.mid), ends = [];
    for (const dir of [-1, 1]) { let k = mid; while (k + dir >= 0 && k + dir < fine.length && (F0.top(fine[k][0], fine[k][1]) > TOPY || F0.gorge(fine[k][0], fine[k][1]).d > -3)) k += dir;   /* 협곡(둔덕) 구간은 건너뛰고 산을 지나 바깥 땅이 나오는 곳까지 */ ends.push(k); }
    const cut = fine.slice(ends[0], ends[1] + 1), pick = [cut[0]]; for (let k = 1; k < cut.length - 1; k++) if (Math.abs(cut[k][2] - Math.round(cut[k][2])) < 1e-6) pick.push(cut[k]); pick.push(cut[cut.length - 1]);
    S.pts = pick.map(q => [q[0], q[1]]);
    S.mouths = [0, S.pts.length - 1].map(k => { const p = S.pts[k], q = S.pts[k ? k - 1 : 1], dx = p[0] - q[0], dz = p[1] - q[1], l = Math.hypot(dx, dz) || 1; return [p[0], p[1], dx / l, dz / l]; });
    for (const [x, z, dx, dz] of S.mouths) { START.secretBrush.push(START.brush.length + BR.length); BR.push([[x + dx * 1.5, z + dz * 1.5, 5.2], [x + dx * 5.5 - dz * 3.2, z + dz * 5.5 + dx * 3.2, 3.8], [x + dx * 4.5 + dz * 3.6, z + dz * 4.5 - dx * 3.6, 3.4]]); } }   /* 입구를 통째로 덮음 · 덤불 모양은 입구마다 조금씩 */
  START.brush.push(...BR); }
