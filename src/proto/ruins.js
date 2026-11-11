/* 고대 수호자 유적 (사용자 2026-11-11: 동굴은 고대 수호자 유적 느낌 · 입구 앞엔 가운데가 무너져 끊어진 돌다리 — 우리는 날아서 건넘 · 단순화하지 말 것)
   만드는 것 (모두 깎이고 닳고 부서진 돌 — 상자 · 원통 그대로 두지 않음):
   ① 끊어진 돌다리: 돌판을 하나하나 깐 다리 판 · 연석 · 난간 기둥과 동자 기둥 · 난간대 · 다리 밑 아치(쐐기돌을 하나씩) · 아치와 다리 판 사이를 메운 쌓은 돌
      가운데는 무너져 끊김 — 끝은 들쭉날쭉 · 빠진 돌 · 하늘에 멈춘 듯 떠 있는 돌덩이 · 끊긴 끝에서 늘어진 덩굴 · 다리 양 끝 기둥 위 작은 수호 석상(하나는 부서짐)
   ② 유적 입구: 홈 파인 큰 기둥 둘 · 받침 · 머리 장식 · 문양 띠가 새겨진 상인방 · 처마돌 · 그 위 투구 쓴 얼굴 부조(눈에 희미한 빛)
      양옆에 무릎 꿇고 칼을 땅에 꽂은 날개 기사 석상 둘 (날개는 접어 등 뒤로 · 깃털을 겹겹이 · 한쪽 날개 끝은 부러짐)
   ③ 기둥 복도 (동굴 안): 홈 파인 기둥이 양쪽에 줄지어 서고 위를 들보가 이음 (들보 밑은 3층보다 높게) · 몇 개는 부러지고 하나는 쓰러짐 · 기둥 앞면 문양이 희미하게 빛남
   막힘은 보이는 두께 그대로 (기둥 · 석상 · 난간 기둥 위 석상은 그 높이까지)
   돌려주는 것: geos (깎은 돌 칠 하나로 한 번에 그림) · glow (빛 무늬 세모 [a, b, c, 색, 위상]) · obstacles ([x, y, z, r]) · strands (늘어진 덩굴 점 줄) */
import * as THREE from 'three';
import { noise2 } from './islefield.js?v=11110913';
import { sd, sdfMesh } from './sdf.js?v=11110913';
import { MeshoptSimplifier as MO } from '../../vendor/meshopt_simplifier.module.js';
/* 빚은 석상 줄이기: 모양은 그대로 두고 평평한 곳 삼각형만 덜어 냄 (err: 허용 오차 · 크기 1 기준) */
const lighten = (g, keep, err) => { const [I] = MO.simplify(new Uint32Array(g.index.array), g.attributes.position.array, 3, Math.floor(g.index.count * keep / 3) * 3, err, ['ErrorAbsolute']); g.setIndex(Array.from(I)); return g; };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rngOf = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

/* 닳은 돌: 꼭짓점을 노이즈로 살짝 밀고 들어감 (amp: 깊이 · f: 촘촘함) — 모서리가 고르게 반듯하지 않게 */
function weather(g, amp, f, seed) { const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = noise2(x * f + seed, z * f + y * f * .7) * .7 + noise2(y * f * 2.3 - seed, x * f * 2.1 + z) * .3;
    const l = Math.hypot(x, y, z) || 1; p.setXYZ(i, x + x / l * n * amp, y + y / l * n * amp, z + z / l * n * amp); } return g; }
/* 깎은 돌덩이: 모서리를 둥글게 닳리고 군데군데 떨어져 나감 (chip) */
function block(w, h, d, seg = 2, chip = .12, seed = 0) { const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg); g.deleteAttribute('uv'); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const ex = Math.abs(x) / (w / 2), ey = Math.abs(y) / (h / 2), ez = Math.abs(z) / (d / 2), edge = (ex > .99) + (ey > .99) + (ez > .99);
    if (edge >= 2) { const k = chip * (.5 + .9 * Math.max(0, noise2(x * 3.1 + seed, y * 2.7 + z * 1.9))); x -= Math.sign(x) * k * (ex > .99); y -= Math.sign(y) * k * (ey > .99); z -= Math.sign(z) * k * (ez > .99); }   /* 모서리 · 꼭짓점이 떨어져 나감 */
    p.setXYZ(i, x, y, z); } return g; }
const at = (g, x, y, z, ry = 0, rx = 0, rz = 0) => { g.rotateZ(rz); g.rotateX(rx); g.rotateY(ry); g.translate(x, y, z); return g; };
/* 홈 파인 둥근 기둥 몸통 (flutes 개의 세로 홈) */
function fluted(r, h, flutes = 16, seg = 6) { const g = new THREE.CylinderGeometry(r, r * 1.04, h, flutes * 3, seg, false); g.deleteAttribute('uv'); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), l = Math.hypot(x, z); if (l < r * .5) continue; const a = Math.atan2(z, x), k = 1 - .06 * Math.pow(Math.max(0, Math.cos(a * flutes)), 2); p.setX(i, x * k); p.setZ(i, z * k); } return g; }

/* ── 날개 기사 석상 (무릎 꿇고 칼을 땅에 꽂음 · 고개 숙임 · 날개는 접어 등 뒤로 깃털을 겹겹이) — 거리 함수로 빚어 녹여 붙인 깎은 돌 ──
   사람 키 1.9 단위로 빚고 S배 · 앞 = +z · 받침 윗면 = 0 */
function knightSDF(broken, seed) { const P = [], add = (c, R, f, k = .03, cut = false) => P.push({ c, R, f, k, cut });   /* c · R: 감싸는 공 (멀면 건너뜀) · k: 녹여 붙이는 정도 · cut: 파냄 */
  const cone = (a, b, r0, r1, k) => add([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 2 + Math.max(r0, r1), (x, y, z) => sd.cone(x, y, z, a, b, r0, r1), k);
  const ell = (c, rx, ry, rz, k) => add(c, Math.max(rx, ry, rz), (x, y, z) => sd.ell(x, y, z, c[0], c[1], c[2], rx, ry, rz), k);
  const box = (c, m, hx, hy, hz, rr, k, cut) => add(c, Math.hypot(hx, hy, hz), (x, y, z) => sd.box(x, y, z, c, m, hx, hy, hz, rr), k, cut);
  const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  /* 몸통: 엉덩이 · 허리 · 가슴판(가운데 능선) · 허리띠 */
  ell([0, .92, 0], .21, .15, .17, .05); cone([0, .95, 0], [0, 1.22, .02], .17, .2, .06); ell([0, 1.3, .05], .25, .2, .18, .06);
  box([0, 1.3, .2], I3, .014, .13, .03, .01, .02); for (let k = 0; k < 3; k++) box([0, 1.02 + k * .07, .01], I3, .2 - k * .004, .012, .175, .01, .02);   /* 가슴판 능선 · 배 갑옷 띠 */
  for (let k = 0; k < 7; k++) { const a = -1.2 + k * .4; box([Math.sin(a) * .2, .78, .04 + Math.cos(a) * .17], sd.frame([Math.sin(a) * .25, -1, Math.cos(a) * .3], a), .07, .14, .015, .01, .015); }   /* 허리 아래 늘어진 갑옷 판 */
  /* 어깨 갑옷 두 겹 · 목 · 투구 (고개 숙임) · 눈 틈 · 볏 · 옆 날개 장식 */
  for (const s of [-1, 1]) { ell([s * .27, 1.46, 0], .15, .1, .14, .03); ell([s * .31, 1.39, 0], .13, .075, .13, .02); }
  cone([0, 1.44, .02], [0, 1.56, .06], .075, .07, .03);
  ell([0, 1.63, .1], .115, .13, .13, .03); box([0, 1.6, .225], I3, .085, .009, .04, .004, .01, true);   /* 투구 · 눈 틈 (파냄) */
  box([0, 1.56, .22], I3, .012, .05, .02, .008, .015); box([0, 1.74, .07], sd.frame([0, .35, -1]), .012, .15, .06, .01, .02);   /* 코가리개 · 볏 */
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) box([s * (.12 + k * .012), 1.68 + k * .03, .02 - k * .03], sd.frame([s * .5, .8 - k * .15, -.6]), .025, .07 - k * .01, .008, .006, .01);   /* 투구 옆 작은 날개 */
  /* 팔: 두 손을 칼자루 머리에 겹쳐 얹음 · 팔꿈치 · 손 갑옷 */
  for (const s of [-1, 1]) { cone([s * .27, 1.42, .02], [s * .25, 1.16, .24], .075, .065, .03); ell([s * .25, 1.16, .24], .07, .07, .075, .02); cone([s * .25, 1.16, .24], [s * .05, 1.27, .44], .065, .055, .03); ell([s * .045, 1.27, .46], .055, .05, .07, .02); }
  /* 칼: 받침에 꽂힌 날 (끝으로 가늘게) · 코등이 · 자루 · 머리 */
  add([0, .45, .48], .5, (x, y, z) => { const t = Math.max(0, Math.min(1, (.9 - y) / .9)); return sd.box(x, y, z, [0, .45, .48], I3, .036 * (1 - t * .45), .45, .009, .003); }, .01);
  box([0, .92, .48], I3, .17, .02, .028, .01, .01); cone([0, .93, .48], [0, 1.2, .48], .022, .02, .01); ell([0, 1.25, .48], .04, .04, .04, .01);
  /* 다리: 왼무릎 세움 (발을 앞에 딛음) · 오른무릎 땅에 · 무릎 갑옷 */
  cone([-.12, .9, 0], [-.14, .82, .44], .11, .09, .05); cone([-.14, .82, .44], [-.14, .1, .48], .085, .06, .03); box([-.14, .05, .57], I3, .06, .045, .12, .02, .03); ell([-.14, .84, .5], .075, .07, .07, .02);
  cone([.12, .88, 0], [.14, .09, .22], .11, .09, .05); cone([.14, .09, .22], [.14, .1, -.3], .085, .06, .03); box([.14, .07, -.4], sd.frame([0, .3, -1]), .05, .1, .05, .02, .03); ell([.14, .1, .25], .075, .07, .075, .02);
  box([0, .7, .17], sd.frame([0, 1, .3]), .13, .24, .018, .01, .02);   /* 앞 천 자락 (다리 사이) */
  /* 날개: 등에서 솟아 어깨 위로 꺾인 손목에서 깃털이 등 뒤로 길게 접혀 내려옴 · 덮깃 · 둘째깃 · 첫째깃 (부러진 쪽은 첫째깃이 짧고 깨짐) */
  for (const s of [-1, 1]) { const root = [s * .12, 1.4, -.14], elb = [s * .32, 1.66, -.2], wr = [s * .44, 1.96, -.26];   /* 몸 옆으로 조금 벌려 앞에서도 날개가 몸을 감싸 보이게 */
    cone(root, elb, .06, .055, .04); cone(elb, wr, .055, .045, .03);
    const arm = t => t < .5 ? root.map((v, i) => v + (elb[i] - v) * t * 2) : elb.map((v, i) => v + (wr[i] - v) * (t - .5) * 2), bk = broken && s > 0;
    for (let k = 0; k < 8; k++) { const t = .15 + k / 7 * .85, p = arm(t), L = .22 + t * .12; box([p[0] + s * .02, p[1] - L * .5, p[2] - .04], sd.frame([s * .05, -1, -.12], s * .2), .055, L * .5, .016, .012, .012); }   /* 덮깃 */
    for (let k = 0; k < 9; k++) { const t = .1 + k / 8 * .9, p = arm(t), L = .55 + t * .45; box([p[0] + s * .035, p[1] - L * .5 - .05, p[2] - .06], sd.frame([s * .02, -1, -.12], s * .55), .065, L * .5, .015, .012, .012); }   /* 둘째깃 */
    for (let k = 0; k < 7; k++) { let L = 1.25 + k * .06; if (bk) L = k < 4 ? .55 + k * .08 : 0; if (!L) continue; const p = [wr[0] + s * (.02 + k * .012), wr[1] - .05, wr[2] - .1 - k * .035];
      box([p[0] - s * L * .03, p[1] - L * .5, p[2] - L * .08], sd.frame([-s * .05, -1, -.15 - k * .02], s * .6), .07 - k * .003, L * .5, .014, .012, .01); }   /* 첫째깃 (길게 · 몸 옆을 따라 내려옴) */
    if (bk) box([wr[0] + s * .05, wr[1] - .75, wr[2] - .25], sd.frame([.5, -1, -.3]), .1, .06, .05, .01, .02, true); }   /* 부러진 깃 끝: 깨진 면 */
  P.sort((a, b) => a.cut - b.cut);
  const f = (x, y, z) => { let d = 1e9; for (const p of P) { if (p.cut) { const q = p.f(x, y, z); d = Math.max(d, -q); continue; } const b = Math.hypot(x - p.c[0], y - p.c[1], z - p.c[2]) - p.R; if (b > d + p.k) continue; d = sd.smin(d, p.f(x, y, z), p.k); }
    return d + .004 * noise2(x * 37 + seed, y * 29 + z * 33) + .002 * noise2(y * 90, x * 80 - z * 70); };   /* 닳은 돌결 */
  return f; }

/* ── 작은 수호 석상 (다리 난간 기둥 위): 웅크린 날개 짐승 (그리핀 같은) · 하나는 머리가 깨짐 ── */
function sentinelSDF(broken, seed) { const P = []; const add = (c, R, f, k) => P.push({ c, R, f, k });
  const cone = (a, b, r0, r1, k = .04) => add([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 2 + Math.max(r0, r1), (x, y, z) => sd.cone(x, y, z, a, b, r0, r1), k);
  const ell = (c, rx, ry, rz, k = .04) => add(c, Math.max(rx, ry, rz), (x, y, z) => sd.ell(x, y, z, c[0], c[1], c[2], rx, ry, rz), k);
  const box = (c, m, hx, hy, hz, rr, k) => add(c, Math.hypot(hx, hy, hz), (x, y, z) => sd.box(x, y, z, c, m, hx, hy, hz, rr), k);
  ell([0, .28, -.02], .2, .17, .28, .08); ell([0, .4, .16], .17, .19, .15, .06);   /* 웅크린 몸 · 가슴 */
  for (const s of [-1, 1]) { cone([s * .1, .3, .22], [s * .1, .03, .3], .06, .045); ell([s * .1, .03, .34], .05, .03, .07, .02); cone([s * .13, .22, -.18], [s * .14, .03, -.12], .08, .05); }   /* 앞다리 · 발 · 뒷다리 */
  if (!broken) { cone([0, .48, .22], [0, .66, .33], .09, .075); ell([0, .7, .37], .1, .1, .12, .03); cone([0, .69, .47], [0, .6, .58], .045, .01, .02); for (const s of [-1, 1]) box([s * .05, .79, .33], sd.frame([s * .2, 1, -.6]), .015, .06, .01, .006, .015); }   /* 목 · 머리 · 부리 · 귀깃 */
  else box([0, .52, .24], sd.frame([.3, 1, .2]), .08, .05, .07, .03, .03);   /* 깨진 목 */
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) { const a = .5 + k * .2, L = .45 - k * .04; box([s * (.18 + Math.sin(a) * L * .4), .45 + Math.cos(a) * L * .4, -.05 - k * .045], sd.frame([s * Math.sin(a), Math.cos(a), -.2]), .055, L * .5, .014, .01, .012); }   /* 반쯤 펼친 날개 */
  return (x, y, z) => { let d = 1e9; for (const p of P) { const b = Math.hypot(x - p.c[0], y - p.c[1], z - p.c[2]) - p.R; if (b > d + p.k) continue; d = sd.smin(d, p.f(x, y, z), p.k); } return d + .005 * noise2(x * 30 + seed, y * 25 + z * 28); }; }

export function buildRuins({ F, hAt, LAYERS, Y, LO, TUN }) {
  const geos = [], glow = [], obstacles = [], strands = [], r = rngOf(131), add = (...g) => g.flat().forEach(q => geos.push(q.index ? q.toNonIndexed() : q));
  const R = LO.ruins; if (!R) return { geos, glow, obstacles, strands };
  const SENT = [false, true].map((br, i) => { const g = lighten(sdfMesh(sentinelSDF(br, 7 + i), [-.75, -.05, -.5, .75, .95, .75], .024), .3, .004); g.scale(2.4, 2.4, 2.4); return g; });   /* 작은 수호 석상 (온전한 것 · 머리 깨진 것) */
  const glyph = (c, ax, up, s, col, ph) => { const tri = (a, b, d) => glow.push([a, b, d, col, ph]);   /* 문양 하나: 고리 + 획 몇 개 (평면 ax · up 위에 · 크기 s) */
    const P = (u, v) => c.clone().addScaledVector(ax, u * s).addScaledVector(up, v * s);
    for (let e = 0; e < 12; e++) { const a0 = e / 12 * 6.283, a1 = (e + 1) / 12 * 6.283; if ((e + Math.round(ph * 7)) % 5 === 0) continue; const p = (a, R2) => P(Math.cos(a) * R2, Math.sin(a) * R2); tri(p(a0, .38), p(a0, .48), p(a1, .48)); tri(p(a0, .38), p(a1, .48), p(a1, .38)); }
    const bar = (u0, v0, u1, v1) => { const dx = u1 - u0, dv = v1 - v0, l = Math.hypot(dx, dv), nx = -dv / l * .05, nv = dx / l * .05; tri(P(u0 + nx, v0 + nv), P(u1 + nx, v1 + nv), P(u1 - nx, v1 - nv)); tri(P(u0 + nx, v0 + nv), P(u1 - nx, v1 - nv), P(u0 - nx, v0 - nv)); };
    const k = Math.floor(ph * 97) % 4; bar(0, -.3, 0, .3); if (k > 0) bar(-.22, .1, .22, .1); if (k > 1) bar(-.15, -.18, .15, -.3); if (k > 2) bar(-.3, .3, .3, -.3); };

  /* ① 끊어진 돌다리 ─────────────────────────────────────────── */
  { const { a, b, w, gap } = R.bridge, A = V(a[0], 0, a[1]), B = V(b[0], 0, b[1]), dir = B.clone().sub(A), L = dir.length(); dir.normalize(); const side = V(-dir.z, 0, dir.x), ry = Math.atan2(dir.x, dir.z);
    const deckY = Y.MEADOW + .35, at2 = (u, s, y) => A.clone().addScaledVector(dir, u).addScaledVector(side, s).setY(y), broke = u => u > gap[0] * L && u < gap[1] * L;
    const ragged = (u, s) => { const e0 = gap[0] * L + (noise2(s * .9, 1) * 1.6 + .6), e1 = gap[1] * L - (noise2(s * .9, 7) * 1.6 + .6); return u > e0 && u < e1; };   /* 무너진 끝은 들쭉날쭉 */
    /* 다리 판: 돌판을 엇갈려 깔고 (줄눈) 군데군데 기울거나 빠짐 */
    for (let u = .6; u < L; u += 1.3) for (let s = -w / 2 + .9, row = 0; s < w / 2 - .5; s += 1.6, row++) { const uu = u + (row % 2) * .65; if (ragged(uu, s) || uu > L - .2) continue;
      const nearGap = Math.min(Math.abs(uu - gap[0] * L), Math.abs(uu - gap[1] * L)) < 2.6; if (nearGap && r() < .25) continue;
      const p = at2(uu, s, deckY + (nearGap ? (r() - .6) * .35 : (r() - .5) * .06)), g = block(1.22, .34, 1.52, 2, .07, u * 3 + s); at(g, p.x, p.y, p.z, ry + (r() - .5) * (nearGap ? .25 : .03), (r() - .5) * (nearGap ? .2 : .02)); add(g); }
    /* 연석 · 다리 판 밑 두꺼운 바닥돌 · 다리 밑 아치 (쐐기돌을 하나씩) · 아치와 판 사이 쌓은 돌 */
    for (const sd of [-1, 1]) for (let u = .5; u < L; u += 1.8) { if (ragged(u, sd * w / 2)) continue; const p = at2(u, sd * (w / 2 - .25), deckY + .25), g = block(1.7, .55, .55, 2, .08, u + sd); at(g, p.x, p.y, p.z, ry - Math.PI / 2); add(g); }
    for (let u = .5; u < L; u += 2.1) for (const s of [-w / 4, w / 4]) { if (ragged(u, s)) continue; const p = at2(u, s, deckY - .65), g = block(2, .9, w / 2 - .05, 2, .1, u * 1.7 + s); at(g, p.x, p.y, p.z, ry - Math.PI / 2); add(g); }
    const archY = u => deckY - 1.3 - 9 * Math.pow(1 - Math.sin(Math.PI * u / L), 1.6);   /* 아치 밑면: 양 끝(섬 절벽)에서 낮게 솟아 가운데에서 다리 판 가까이 */
    for (let k = 0; k < 34; k++) { const u0 = L * k / 34, u1 = L * (k + 1) / 34, um = (u0 + u1) / 2; if (ragged(um, 0) || broke(um) && r() < .7) continue;
      const y0 = archY(um), p = at2(um, 0, y0), t = Math.atan2(archY(u1) - archY(u0), u1 - u0), g = block(u1 - u0 - .08, 1.5, w - .4, 2, .12, k * 5.1);   /* 쐐기돌 */
      g.rotateZ(-t); g.rotateY(ry - Math.PI / 2); g.translate(p.x, p.y, p.z); add(g);
      for (let y = y0 + 1, row = 0; y < deckY - 1.15; y += .85, row++) { const q = at2(um + (row % 2) * .4 - .2, 0, y + .4); if (r() < .06) continue; const g2 = block(u1 - u0 + .3, .8, w - .9, 2, .1, k * 3 + row); at(g2, q.x, q.y, q.z, ry - Math.PI / 2); add(g2); } }   /* 쌓은 돌 (엇갈림) */
    /* 하늘에 멈춘 듯 떠 있는 무너진 돌덩이 (사이 하늘) */
    for (let k = 0; k < 9; k++) { const u = (gap[0] + (gap[1] - gap[0]) * (.1 + r() * .8)) * L, p = at2(u, (r() - .5) * w * 1.3, deckY - 2 - r() * 7), s2 = .6 + r() * 1.1, g = block(s2 * 1.4, s2, s2 * 1.6, 2, .25, k * 9);
      at(g, p.x, p.y, p.z, r() * 6, (r() - .5) * 1.2, (r() - .5) * 1.2); add(weather(g, .06, 1.4, k)); }
    /* 난간: 기둥(받침 · 몸 · 머리) 사이 동자 기둥 줄 · 위에 난간대 — 무너진 곳 근처는 끊기고 기울어짐 */
    for (const sd of [-1, 1]) { const posts = []; for (let u = 1.2; u < L - .6; u += 4.2) if (!ragged(u, sd * w / 2) && !broke(u)) posts.push(u);
      for (const u of posts) { const p = at2(u, sd * (w / 2 - .3), deckY + .5); add(at(block(.95, .3, .95, 2, .06, u), p.x, p.y + .15, p.z, ry), at(block(.7, 1.6, .7, 2, .06, u + 1), p.x, p.y + 1.1, p.z, ry), at(block(.95, .28, .95, 2, .06, u + 2), p.x, p.y + 2.04, p.z, ry)); }
      for (let i = 0; i + 1 < posts.length; i++) { const u0 = posts[i], u1 = posts[i + 1]; if (u1 - u0 > 5) continue; const tilt = (broke(u1 + 2) || broke(u0 - 2)) ? (r() - .5) * .15 : 0;
        for (let u = u0 + .7; u < u1 - .5; u += .62) { const p = at2(u, sd * (w / 2 - .3), deckY + .5), lp = [[.13, 0], [.2, .1], [.12, .3], [.18, .55], [.1, .85], [.14, 1.05], [.16, 1.12]].map(([a2, y]) => new THREE.Vector2(a2, y));   /* 동자 기둥 (깎아 돌린 모양) */
          const g = new THREE.LatheGeometry(lp, 8); g.deleteAttribute('uv'); at(g, p.x, p.y + .3, p.z, 0, 0, tilt); add(g); }
        const m = at2((u0 + u1) / 2, sd * (w / 2 - .3), deckY + 1.95), g = block(u1 - u0 - .5, .26, .42, 3, .05, u0 * 2); at(g, m.x, m.y, m.z, ry + Math.PI / 2, 0, tilt); add(g); }
      /* 다리 양 끝 기둥 위 작은 수호 석상 (짐승) — 한쪽은 머리가 깨짐 */
      for (const [u, br] of [[posts[0], sd > 0], [posts[posts.length - 1], false]]) { if (u === undefined) continue; const p = at2(u, sd * (w / 2 - .3), deckY + 2.2), sg = (br ? SENT[1] : SENT[0]).clone();
        sg.rotateY(ry + (u < L / 2 ? Math.PI : 0)); sg.translate(p.x, p.y, p.z); add(sg); obstacles.push([p.x, p.y + .9, p.z, 1.3], [p.x, p.y - .9, p.z, .8]); } }
    /* 끊긴 끝에서 늘어진 덩굴 */
    for (const g0 of gap) for (let k = 0; k < 16; k++) { const u = g0 * L + (g0 === gap[0] ? -.6 : .6) + (r() - .5) * 1.2, s = (r() - .5) * w, P0 = at2(u, s, deckY - .2), Lh = 1.5 + r() * r() * 7, pts = [];
      for (let e = 0; e <= 8; e++) { const f = e / 8; pts.push(V(P0.x + Math.sin(f * 3 + k) * .25, P0.y - f * Lh, P0.z + Math.cos(f * 2.2 + k) * .25)); } strands.push(pts); } }

  /* ② 유적 입구 ───────────────────────────────────────────── */
  if (TUN) { const f0 = TUN.frame(0), fwd = V(-f0.fx, 0, -f0.fz), sd = V(f0.sx, 0, f0.sz), ry = Math.atan2(fwd.x, fwd.z), fl = LO.gorge.floor, top = TUN.top, W = TUN.wi + .4;
    const P = (s, y, f = 0) => V(f0.x, y, f0.z).addScaledVector(sd, s).addScaledVector(fwd, f);
    /* 홈 파인 큰 기둥 둘: 두 단 받침 · 몸 · 머리 장식 (세 단) */
    for (const s of [-1, 1]) { const c = P(s * (W + 1.5), 0, .6);
      add(at(block(4.4, 1.2, 4, 3, .15, s), c.x, fl + .6, c.z, ry), at(block(3.7, .9, 3.4, 3, .12, s + 1), c.x, fl + 1.65, c.z, ry));
      const sh = fluted(1.45, top - fl - 3.4, 18, 8); sh.translate(c.x, (fl + 2.1 + top - 1.3) / 2, c.z); add(weather(sh, .05, 1.1, s * 3));
      add(at(block(3.5, .7, 3.3, 3, .12, s + 2), c.x, top - 1, c.z, ry), at(block(4.2, .8, 3.9, 3, .14, s + 3), c.x, top - .25, c.z, ry));
      for (let y = fl + 3; y < top - 2; y += 1.5) obstacles.push([c.x, y, c.z, 1.7]);
      for (let k = 0; k < 4; k++) glyph(P(s * (W + 1.5), fl + 5.5 + k * 2.6, 2.1), sd, V(0, 1, 0), 1, [.3, 1.05, .9], k * .17 + (s > 0 ? .5 : 0)); }   /* 기둥 앞면 문양 (아래부터 차례로 숨 쉬듯) */
    /* 상인방 (문양 띠) · 처마돌 */
    { const c = P(0, top + 1.4, .6), g = block(2 * (W + 3.6), 2.6, 3.4, 6, .22, 9); at(g, c.x, c.y, c.z, ry); add(weather(g, .08, .9, 2));
      const k2 = P(0, top + 3.1, .9), g2 = block(2 * (W + 4.4), .9, 4.2, 6, .18, 10); at(g2, k2.x, k2.y, k2.z, ry); add(g2);
      for (let k = -5; k <= 5; k++) glyph(P(k * 1.75, top + 1.4, 2.35), sd, V(0, 1, 0), .9, [.35, 1, .95], (k + 5) / 11); }
    /* 투구 쓴 얼굴 부조 (상인방 위 · 바위에 새김): 이마 · 눈두덩 · 눈구멍 · 코 · 다문 입 · 투구 테 · 양옆 날개 깃 */
    { const NX = 64, NY = 46, FW = 2 * (W + 2), FH = 15, c0 = P(0, top + 4 + FH / 2, -.4), pos = [], idx = [];
      const d = (x, y) => { const ex = x / (FW * .38), ey = y / (FH * .5), dome = Math.sqrt(Math.max(0, 1 - ex * ex * .9 - ey * ey * .85)) * 2.6;
        const g = (cx, cy, rx, ry2) => Math.exp(-((x - cx) ** 2 / (rx * rx) + (y - cy) ** 2 / (ry2 * ry2)));
        let h = dome + .9 * g(0, 1.6, 6, 1) - 1.5 * (g(-2.6, .7, 1.25, .8) + g(2.6, .7, 1.25, .8)) + 1.1 * g(0, -1.2, .75, 2.3) - .5 * g(0, -4.1, 2.2, .22) + .35 * g(0, -5.2, 2.6, .9);
        const helm = Math.abs(ey - .75 + .1 * ex * ex) < .06 ? .35 : 0; h += helm + .4 * Math.max(0, Math.cos(x * 1.6)) * smooth(Math.abs(ex), .62, .95) * (ey > -.3 ? 1 : 0);   /* 투구 테 · 옆 날개 깃 결 */
        h -= .25 * Math.max(0, .06 - Math.abs(noise2(x * .3 + 4, y * .5) - .1)) * 12;   /* 금 */
        return h * smooth(1.05, .8, Math.max(Math.abs(ex) * .85, Math.abs(ey))); };
      for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { const x = (i / NX - .5) * FW, y = (j / NY - .5) * FH, q = c0.clone().addScaledVector(sd, x).addScaledVector(fwd, d(x, y) + .4 * noise2(x * .7, y * .7)); q.y = c0.y + y; pos.push(q.x, q.y, q.z); }
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, e = c + 1; idx.push(a, b, c, b, e, c); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); add(g);
      for (const s of [-1, 1]) { const e = c0.clone().addScaledVector(sd, s * 2.6).addScaledVector(fwd, .9).setY(c0.y + .7); for (let k = 0; k < 10; k++) { const a0 = k / 10 * 6.283, a1 = (k + 1) / 10 * 6.283;
        glow.push([e, e.clone().addScaledVector(sd, Math.cos(a0) * .55).setY(e.y + Math.sin(a0) * .4), e.clone().addScaledVector(sd, Math.cos(a1) * .55).setY(e.y + Math.sin(a1) * .4), [.45, 1.1, 1], .9]); } } }   /* 눈에 남은 희미한 빛 */
    /* 무릎 꿇은 날개 기사 석상 둘 (입구 양옆 · 앞을 봄 · 한쪽 날개 끝은 부러짐) */
    for (const s of [-1, 1]) { const c = P(s * (W + 10.5), 0, 3), gy = hAt(c.x, c.z), S = 13.5, kn = lighten(sdfMesh(knightSDF(s > 0, 300 + s * 11), [-.72, -.05, -.85, .72, 2.12, .72], .0145), .22, .0025), b0 = gy + 1.5;
      kn.scale(S, S, S); kn.rotateY(ry - s * .12); kn.translate(c.x, b0 + 1.2, c.z); add(kn);
      add(at(weather(block(13.5, 1.6, 15.5, 4, .3, s), .12, .5, s), c.x, b0 - .2, c.z + 1.2, ry - s * .12), at(weather(block(11.5, 1.3, 13, 4, .25, s + 1), .1, .6, s), c.x, b0 + 1.1 - .55, c.z + 1.2, ry - s * .12));   /* 두 단 받침 */
      for (let y = 0; y < 28; y += 2.2) obstacles.push([c.x, b0 + y, c.z, y < 4 ? 7 : y < 18 ? 4.6 : 4]); }   /* 막힘: 받침 · 몸 · 날개 (3층까지) */
    /* ③ 기둥 복도: 양쪽에 홈 파인 기둥 · 위를 잇는 들보 (들보 밑은 3층보다 높게) · 하나는 부러져 쓰러짐 */
    { const n = 4; for (let k = 0; k < n; k++) { const t = TUN.to * (.18 + k / n * .78), f = TUN.frame(t), hh = top - .3 - fl, fallen = k === 2;
      for (const s of [-1, 1]) { const c = V(f.x + f.sx * s * (LO.gorge.w - .9), 0, f.z + f.sz * s * (LO.gorge.w - .9)), bry = Math.atan2(f.fx, f.fz);
        add(at(block(2.8, .8, 2.8, 2, .12, k * 7 + s), c.x, fl + .4, c.z, bry));
        if (fallen && s > 0) { const sh = fluted(1, hh * .62, 16, 6); sh.rotateZ(Math.PI / 2 - .08); sh.rotateY(bry + .5); sh.translate(c.x - f.sx * 3.2, fl + 1.1, c.z - f.sz * 3.2 + 2); add(weather(sh, .05, 1.3, k)); add(at(block(1.6, 2, 1.6, 2, .25, k), c.x, fl + 1.6, c.z, bry)); continue; }   /* 쓰러진 기둥 · 부러진 밑동 */
        const broken = (k === 1 && s < 0), H2 = broken ? hh * .55 : hh - 1.4, sh = fluted(1, H2, 16, 8); sh.translate(c.x, fl + .8 + H2 / 2, c.z); add(weather(sh, .05, 1.2, k * 3 + s));
        if (!broken) add(at(block(2.6, .7, 2.6, 2, .1, k + s * 5), c.x, fl + .8 + H2 + .35, c.z, bry)); else add(at(block(1.5, .8, 1.5, 2, .4, k), c.x, fl + .8 + H2 + .2, c.z, bry + .4, .3));
        for (let y = fl + 1.5; y < fl + .8 + H2; y += 1.4) obstacles.push([c.x, y, c.z, 1.25]);
        if (!broken) for (let q = 0; q < 3; q++) glyph(V(c.x - f.sx * s * 1.02, fl + 4 + q * 2.4, c.z - f.sz * s * 1.02), V(f.fx, 0, f.fz), V(0, 1, 0), .7, [.3, .95, .85], k * .2 + q * .1 + (s > 0 ? .4 : 0)); }
      if (k !== 2) { const a2 = V(f.x, top + .2, f.z), g = block(2 * (LO.gorge.w + .4), 1.3, 1.9, 6, .15, k * 13); at(g, a2.x, a2.y, a2.z, Math.atan2(f.fx, f.fz)); add(weather(g, .05, 1, k)); } } } }   /* 들보 */
  return { geos, glow, obstacles, strands };
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
