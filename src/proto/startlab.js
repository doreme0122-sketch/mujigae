/* 한 조각 체험판: 내 기지 · 내 앞마당 · 양옆 보물 동굴 둘 (사용자 2026-11-11 저녁 회의 · 설계 문서 '전체 맵 다시 나눔' 참고)
   단위는 섬 안 단위 (게임에서 0.5배 = m) · 맵 가운데 = (0, 0) · 내 기지 = 6시(+z, 화면 아래) · 맵 가운데 쪽 = −z (화면 위)
   · 맵 반지름 240m (= 480) · 기지 10곳은 36°마다 테두리 위 (절반은 맵 안 · 절반은 바깥 우주) · 보물 동굴은 기지 사이 한가운데 (내 기지에서 ±18°)
   · 지역: 초원 240~160m (480~320) → 화산 160~60m (아직 안 만듦 · 땅은 초원 가장자리에서 끝남)
   · 내 앞마당: 양옆 = 동굴 산 · 뒤 = 테두리 · 화산 쪽 = 1차 산맥 (불규칙) · 산맥 양 끝과 동굴 산 사이 좁은 협곡 (부쉬로 꽉 참)으로만 나감
   · 보물 동굴: 산맥 얇게 · 골짜기 짧게 (깊이 약 79m) · 입구 하나가 맵 가운데를 봄 · 동굴마다 굽이 · 보물방 비킴 · 산 두께가 다름
   · 비밀길: 보물방 바로 앞을 가로지르는 1층 터널 (살짝 지그재그) · 위 협곡 바닥은 둔덕 (2층 아래까지 솟음) · 둔덕에 '턱과 굴' 판돌 · 입구는 부쉬로 덮임 (청록 꽃)
   새로 고침 (사용자 2026-11-12 · '적용할 것 한눈에' 그림):
   · 비밀길 입구는 남쪽(카메라 쪽)을 보는 절벽에 — 협곡 밑을 지나 옆으로 빠진 뒤 맵 가운데 쪽으로 꺾어, 동굴 산 옆에 붙은 바위 언덕(곁산) 끝 절벽으로 나옴
     절벽 밑동을 둥글게 파 낸 틈(notch) 안에 아치 입구 · 바로 앞 평평한 땅에 청록 꽃 부쉬 → 정면으로 보이되 부쉬에 덮임 · 산 밖으로 튀어나오지 않음
   · 비밀길 판정 = 터널 관 끝까지 (관은 산이 덮은 곳에서만)
   · 산 북쪽 면은 엔진이 자동으로 완만하게 (islefield) · 동굴은 지붕 + 동굴 보기 (isle) */
import { makeField } from './islefield.js?v=11140005';
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
  /* 비밀길 줄기: 협곡 밑(±8 곧게) → 옆으로 (살짝 지그재그) → 맵 가운데 쪽으로 꺾어 곁산 끝 절벽까지 (입구 = 남쪽을 봄) */
  const sec = [], SPUR = [], NOTCH = [], MOUTH = [];
  for (const sd of [-1, 1]) { const leg = [[8, 0], [14, sd * 1.5], [20, -sd * 1.5], [26, 0], [31, -4], [33, -12], [32, -22], [31, -32], [30, -42], [30, -52]].map(([u, dv]) => [uc + sd * (u + (o.spur || 0)), o.vt + dv]);
    if (sd < 0) sec.push(...leg.reverse().map(([u, v]) => W(u, v))); else { sec.push(W(uc, o.vt)); sec.push(...leg.map(([u, v]) => W(u, v))); }
    for (const [u, v, r] of [[29, -2, 10], [33, -10, 10], [32, -20, 10], [31, -30, 10]]) SPUR.push([...W(uc + sd * (u + (o.spur || 0)), o.vt + v), r]);   /* 곁산: 터널 갈래를 덮는 바위 언덕 (끝은 남쪽 절벽) */
    const mu = uc + sd * (30 + (o.spur || 0)), mv = o.vt - 52;   /* 입구: 신전 앞 큰 바위 언덕(±30)의 남쪽 절벽 */ NOTCH.push([...W(mu, mv - 4.5), 5.2]); MOUTH.push([...W(mu, mv - 8), sd]); }   /* 틈: 곁산 끝 절벽 밑동 · 입구 부쉬는 틈 앞 */
  const MB = [];   /* 동굴 산: 길 양옆 얇은 띠 · 보물방 둘레 띠 · 신전 문 양옆 */
  for (let t = .1; t <= .96; t += .05) { const rr = 7 + o.band + 5 + 2.5 * Math.sin(t * 17 + deg); if (t * TL < rr + 4) continue; const [x, z] = at(t); MB.push([x, z, rr]); }   /* 길 양옆 벽 두께 약 4~6m (얇게 · 사용자) · 신전 문 앞으로 산이 나오지 않게 들머리 근처 덩이는 뺌 (사용자 2026-11-11: 입구가 막힘) */
  for (const sd of [-1, 1]) for (let dv = 4; dv <= 26; dv += 7) MB.push([...W(sd * (7 + o.band + 3), o.cp[0][1] + dv), o.band + 2]);   /* 들머리(기둥 복도) 양옆 벽: 길 옆으로만 */
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
    secret: { pts: sec, w: 3.8, cave: deg },
    MB: [...MB, ...SPUR], ISL: [...ISL, ...SPUR.map(([x, z, r]) => [x, z, r + 10])], SITE, NOTCH, MOUTH };
}
/* 왼쪽 동굴 (−18°) · 오른쪽 동굴 (+18°): 크기는 같고 생김새는 다르게 (사용자: 같은 모양 복사 금지) */
const A = cave(-18, { cp: [[0, 322], [0, 334], [-9, 346], [7, 360], [-6, 374], [3, 386], [-6, 396]], room: [-6, 430], band: 9, vt: 377,
  lean: [[.3, 1, .3, .35, 9, 1.4], [.47, -1, .15, -.5, 12, 1.55], [.63, -1, .35, .15, 10, 1.3]], boulders: [[.38, 1], [.56, -1]], falls: [[.42, 1], [.6, -1]] });   /* cave와 같은 구성: 기댄 기둥 셋 · 바닥 바위 무더기 · 폭포 */
const B = cave(18, { cp: [[0, 322], [0, 333], [8, 344], [-8, 357], [6, 371], [-4, 383], [5, 396]], room: [5, 431], band: 7.5, vt: 378,
  lean: [[.28, -1, .3, -.3, 9.5, 1.45], [.45, 1, .2, .45, 12.5, 1.5], [.62, 1, .3, -.2, 10, 1.3]], boulders: [[.36, -1], [.54, 1]], falls: [[.4, -1], [.58, 1]] });

/* 1차 산맥: 앞마당의 화산 쪽 (반지름 약 170m) · 불규칙하게 굽고 두께가 변함 · 양 끝은 동굴 산과 좁은 협곡을 남김 */
let MOUTHS = [];
const RIDGE = []; for (let a = -6.2; a <= 6.21; a += .9) { const r = 344 + 9 * Math.sin(a * .7 + .8) + 4 * Math.sin(a * 2.3), rr = 11 + 3.5 * Math.sin(a * 1.3 + 2) + 2 * Math.cos(a * 3.1); RIDGE.push([...polar(a, r), rr]); }
/* 앞마당 출구 협곡: 산맥 끝 ↔ 동굴 산 사이 · 안은 부쉬로 꽉 참 (1층은 서로 안 보임 · 매복 자리) */
const exitBrush = sd => [0, 1, 2, 3].map(k => [...polar(sd * (8.6 + k * .25), 322 + k * 11), 5.2 - (k % 2) * .8]);
export const START = {
  box: [-250, 250, 248, 500], dens: 2.4, tile: 40, clipR: R - 3,
  rim: { R, base: [0, R], caves: [-18, 18], bases: [0, -36, 36] },   /* 무지개 벽 · 기지 (아래에서 12시로 뒤집음 · 이웃은 화면 밖) */
  islands: [[...[-23, -17, -11, -5, 0, 5, 11, 17, 23].map(a => [...polar(a, 398), a % 2 ? 78 : 84]), [...polar(-26, 424), 44], [...polar(26, 426), 42], ...A.ISL, ...B.ISL]],
  mount: { peak: 28, ramp: 6, edge: 3.5, solid: 22, lowFront: true, blobs: [...A.MB, ...B.MB, ...RIDGE] },   /* 봉우리를 조금 낮춤: 북쪽 비탈이 자동으로 완만해지니 너무 높으면 비탈이 길어짐 */
  notch: [...A.NOTCH, ...B.NOTCH],
  gorges: [A.gorge, B.gorge],
  secret: [A.secret, B.secret],
  plateau: [], spires: [[...polar(-5, 420), 2.3, 8.4, 'lean', .7], [...polar(4.5, 404), 2.1, 8, 'broken', 2.2], [...polar(1, 372), 2.4, 8.8, 'fat', 4]], arches: [], low: [],
  brush: [exitBrush(-1), exitBrush(1),
    [[...polar(-7, 438), 4.5], [...polar(-6, 444), 3.4]], [[...polar(7.5, 396), 4.2], [...polar(8.2, 404), 3.2]]],   /* 앞마당 숨을 곳 둘 */
  pond: [...polar(4, 446), 7],
  start: [0, R - 5],
  sites: [A.SITE, B.SITE],
};
/* 12시로 뒤집기 (사용자 2026-11-11: 모든 플레이어 시야는 12시 · 6시로 만들어 동굴 입구가 카메라 반대쪽을 봤음)
   위에서 6시(+z)로 만든 것을 z만 뒤집어 12시(−z)로 → 내 기지는 위쪽 테두리 · 동굴 입구는 아래(맵 가운데 · 카메라 쪽)를 봄 */
{ const fz = p => [p[0], -p[1], ...p.slice(2)];
  START.box = [START.box[0], START.box[1], -START.box[3], -START.box[2]];
  START.rim.base = fz(START.rim.base); START.start = fz(START.start); START.face = Math.PI;   /* 처음 방향: 맵 가운데(화면 아래) */
  START.islands = START.islands.map(C => C.map(fz)); START.mount.blobs = START.mount.blobs.map(fz);
  START.spires = START.spires.map(fz); START.brush = START.brush.map(Z => Z.map(fz)); START.pond = fz(START.pond); START.sites = START.sites.map(fz);
  START.gorges = START.gorges.map(G => ({ ...G, pts: G.pts.map(fz), basin: fz(G.basin), treasure: fz(G.treasure), site: { pile: { ...G.site.pile, c: fz(G.site.pile.c), rot: -G.site.pile.rot - 180 } } }));   /* 무더기 방향도 (돌림 각 = −동굴 각) */
  START.secret = START.secret.map(S => ({ ...S, pts: S.pts.map(fz) })); START.notch = START.notch.map(fz); MOUTHS = [...A.MOUTH, ...B.MOUTH].map(fz); }

/* 비밀길 끝 맞춤 (사용자 2026-11-12: 터널 끝을 넘었는데도 비밀길 안이었음): 땅 높이를 재서, 산이 덮지 않는 끝 부분은 잘라 냄 → 판정 = 관 끝
   입구 부쉬: 틈 앞 평평한 땅에 (청록 꽃) · 덩이 셋이 입구 앞을 가림 */
{ const F0 = makeField(START), TOPC = -1.2 + 1.4, BR = []; START.secretBrush = [];
  const cov = (P, k, n, w) => { const p = P[k], q = P[n], dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1, sx = -dz / l, sz = dx / l, r = w + 3.6; return [0, -1, 1, -.5, .5].every(u => F0.top(p[0] + sx * r * u, p[1] + sz * r * u) > TOPC); };
  for (const S of START.secret) { const P = []; for (let k = 0; k < S.pts.length - 1; k++) for (let i = 0; i < 4; i++) P.push([S.pts[k][0] + (S.pts[k + 1][0] - S.pts[k][0]) * i / 4, S.pts[k][1] + (S.pts[k + 1][1] - S.pts[k][1]) * i / 4]); P.push(S.pts[S.pts.length - 1]);
    while (P.length > 4 && !cov(P, 0, 1, S.w)) P.shift(); while (P.length > 4 && !cov(P, P.length - 1, P.length - 2, S.w)) P.pop();
    S.pts = P; S.cover = P.every((_, k) => k === 0 || k === P.length - 1 || cov(P, k, k + 1 < P.length ? k + 1 : k - 1, S.w)); }   /* cover: 끝 말고 모두 산이 덮는지 (검사용) */
  const flatOK = (x, z, r) => { if (F0.top(x, z) > -5) return false; for (let a = 0; a < 6.283; a += .4) if (F0.top(x + Math.cos(a) * r, z + Math.sin(a) * r) > -4.4) return false; return true; };
  const place = (x, z, r) => { for (let o = 0; o < 10; o += .4) { let rr = r; while (rr > r * .7 && !flatOK(x, z + o, rr)) rr -= .25; if (flatOK(x, z + o, rr)) return [x, z + o, rr]; } return [x, z + 10, r * .7]; };   /* 남쪽(+z)으로 밀며 평평한 곳 찾기 */
  for (const [x, z, sd] of MOUTHS) { START.secretBrush.push(START.brush.length + BR.length); const b0 = place(x, z, 4.4);
    BR.push([b0, place(b0[0] - 3.8 * sd, b0[1] + 1.5, 3.2), place(b0[0] + 3.4 * sd, b0[1] + 2.2, 2.9)]); }
  START.brush.push(...BR); }
