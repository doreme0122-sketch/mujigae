/* 보물 장소 (사용자 2026-11-11: 다른 맵에도 씀 — 모양은 같고 분위기만 다르게 · 몬스터와 아이템은 따로 받음 · 장소만)
   지름 30m (섬 안 단위로 반지름 30) · 가운데 = 지키는 몬스터 자리
   · 바닥: 둥근 돌판 세 겹 (안 · 가운데 · 바깥) — 돌판마다 줄눈 · 닳은 모서리 · 군데군데 깨지고 빠지고 기움
   · 룬 고리: 가운데 겹 바깥 둘레에 룬을 새긴 돌 띠 — 상태 빛이 흐름
   · 제단: 세 단 둥근 돌 제단 (지름 약 8m) — 단마다 바깥 벽에 룬 띠 · 꼭대기 넓은 받침에 룬 원
   · 돌기둥 여섯: 가운데에서 약 11m · 위로 좁아지는 네모 기둥 (돌을 층층이 · 앞면 룬 세로 띠 · 머리 장식) — 하나는 기울고 하나는 부러져 윗동이 쓰러짐
   · 제단 꼭대기: 봉인된 보물 상자 (chest.js — 등급 넷 · 기둥 여섯에서 금빛 사슬 · 떠 도는 봉인 원 · 화면에 들어오면 별빛 + 무지개) · 몬스터는 제단 둘레를 배회 (사용자 2026-11-11)
   · 아이템 떨어질 자리: 제단 앞 바닥 (1층에서 주움) · 신비 다섯 (mystic.js) · 화면 밖 표시기 (offmark.js) · 뚜껑이 열릴 때 바닥으로 퍼지는 충격파
   상태: 지킴(맵 색으로 은은히 숨 쉼) → 싸움(붉게 · 빠르게 · 기둥 룬이 아래부터 깨어남 · 사슬 떨림 · 몬스터 체력 1/6마다 사슬 하나 끊김) → 쓰러뜨림(남은 사슬 끊김 → 봉인 원 깨짐 → 뚜껑 열림 → 빛 터짐 · 충격파 · 룬 번쩍 → 빛 덩이가 제단 앞 바닥에 떨어짐)
   분위기(맵마다): 돌 색 · 덮개(이끼 · 재 · 서리 · 짙은 이끼) · 빛 색 · 틈 불빛(용암) · 늘어진 덩굴/뿌리(초원 · 정글) — 싸움 빨강은 모든 맵 같음 */
import * as THREE from 'three';
import { noise2 } from './islefield.js?v=11111345';
import { carvedBlock, runeD } from './ruins.js?v=11111345';
import { buildChest, GRADES } from './chest.js?v=11111345';
import { buildMystic } from './mystic.js?v=11111345';
import { makeOffMark } from './offmark.js?v=11111345';

export const THEMES = {
  meadow: { name: '초원', a: [.36, .34, .29], b: [.58, .54, .46], cover: [.2, .36, .1], coverAmt: .85, glow: [.22, .95, .8], crack: [0, 0, 0], vines: 'vine', mist: [.82, .9, .88], mistA: .3, fly: [1, .9, .45], shaft: [1, .93, .72] },
  lava: { name: '용암', a: [.13, .12, .12], b: [.27, .25, .24], cover: [.2, .18, .17], coverAmt: .45, glow: [1.2, .5, .12], crack: [1.4, .45, .08], vines: null, mist: [.3, .2, .18], mistA: .38, fly: [1.3, .5, .12], shaft: [1, .58, .3] },
  ice: { name: '얼음', a: [.62, .66, .7], b: [.86, .89, .92], cover: [.95, .97, 1], coverAmt: 1, glow: [.45, .8, 1.25], crack: [0, 0, 0], vines: null, mist: [.9, .95, 1], mistA: .36, fly: [.6, .85, 1.3], shaft: [.85, .93, 1] },
  jungle: { name: '정글', a: [.17, .22, .17], b: [.33, .38, .3], cover: [.1, .2, .08], coverAmt: 1, glow: [.75, .35, 1.15], crack: [0, 0, 0], vines: 'root', mist: [.5, .66, .5], mistA: .34, fly: [.8, 1.1, .35], shaft: [.9, 1, .7] },
};
const rngOf = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* 둥근 띠 조각 돌 (부채꼴): 윗면만 촘촘한 그물 (룬을 새길 때) · 옆면 · 모서리는 닳고 떨어져 나감 — rune: 윗면에 룬 · glow: 홈에 빛 */
function sector(r0, r1, a0, a1, h, seed, rune = false, glow = 0) {
  const arc = (a1 - a0) * (r0 + r1) / 2, nA = Math.max(3, Math.ceil(arc * (rune ? 9 : 1.2))), nR = Math.max(2, Math.ceil((r1 - r0) * (rune ? 9 : 1.2))), P = [], Gw = [], I = [];
  const at = (u, v, y) => { const a = a0 + (a1 - a0) * u, r = r0 + (r1 - r0) * v; return [Math.cos(a) * r, y, Math.sin(a) * r]; };
  const chip = (u, v) => { const e = Math.min(u * arc, (1 - u) * arc, v * (r1 - r0), (1 - v) * (r1 - r0)); return e < .25 ? (.25 - e) * (.5 + .9 * Math.max(0, noise2(u * 9 + seed, v * 7))) : 0; };
  /* 윗면 */
  for (let j = 0; j <= nR; j++) for (let i = 0; i <= nA; i++) { const u = i / nA, v = j / nR; let y = h - chip(u, v) * .55 + .03 * noise2(u * 13 + seed, v * 11); let g = 0;
    if (rune) { const rd = runeD((u - .5) * arc, (v - .5) * (r1 - r0), arc, r1 - r0, .18, seed); if (rd < .085) { y -= .09 * (rd < .055 ? 1 : (.085 - rd) / .03); if (rd < .06) g = glow; } }
    P.push(...at(u, v, y)); Gw.push(g); }
  for (let j = 0; j < nR; j++) for (let i = 0; i < nA; i++) { const a = j * (nA + 1) + i, b = a + 1, c = a + nA + 1, d = c + 1; I.push(a, c, b, b, c, d); }
  /* 옆면 네 쪽 (바깥 · 안 · 양 끝) */
  const wall = (pts) => { const base = P.length / 3; for (const [u, v] of pts) { P.push(...at(u, v, h - chip(u, v) * .55)); Gw.push(0); } for (const [u, v] of pts) { P.push(...at(u, v, -.35)); Gw.push(0); }
    const n = pts.length; for (let k = 0; k < n - 1; k++) I.push(base + k, base + k + 1, base + n + k, base + k + 1, base + n + k + 1, base + n + k); };
  const row = (v, rev) => { const p = []; for (let i = 0; i <= nA; i++) p.push([rev ? 1 - i / nA : i / nA, v]); return p; }, col = (u, rev) => { const p = []; for (let j = 0; j <= nR; j++) p.push([u, rev ? 1 - j / nR : j / nR]); return p; };
  wall(row(1, true)); wall(row(0, false)); wall(col(0, true)); wall(col(1, false));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aGlow', new THREE.Float32BufferAttribute(Gw, 1)); g.setIndex(I); g.computeVertexNormals(); return g;
}
/* 둥근 단 바깥 벽 (제단): 바깥 면에 룬 띠 · 위 가장자리 띠 장식 */
function tierWall(r, h, a0, a1, seed, glow) { const arc = (a1 - a0) * r, nA = Math.ceil(arc * 9), nY = Math.ceil(h * 9), P = [], Gw = [], I = [];
  for (let j = 0; j <= nY; j++) for (let i = 0; i <= nA; i++) { const u = i / nA, y = j / nY * h, a = a0 + (a1 - a0) * u; let rr = r, g = 0;
    const band = y > h - .28 ? .12 : y < .22 ? .08 : 0, rd = runeD((u - .5) * arc, y - h / 2, arc, h, .3, seed);   /* 위아래 띠 · 가운데 룬 */
    if (!band && rd < .085) { rr -= .09 * (rd < .055 ? 1 : (.085 - rd) / .03); if (rd < .06) g = glow; } rr += band + .03 * noise2(u * 17 + seed, y * 5);
    const e = Math.min(u * arc, (1 - u) * arc); if (e < .2) rr -= (.2 - e) * .5;
    P.push(Math.cos(a) * rr, y, Math.sin(a) * rr); Gw.push(g); }
  for (let j = 0; j < nY; j++) for (let i = 0; i < nA; i++) { const a = j * (nA + 1) + i, b = a + 1, c = a + nA + 1, d = c + 1; I.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aGlow', new THREE.Float32BufferAttribute(Gw, 1)); g.setIndex(I); g.computeVertexNormals(); return g; }

/* 보물 장소 만들기 — isle: buildIsle 결과 (GL · U · hAtL · field) · x z: 가운데 (섬 안 단위) · 돌려줌: { group, setTheme(name), setState('guard'|'fight'|'dead'), update(t, dt, shipLocal) } */
export function buildTreasure(isle, x0, z0, theme = 'meadow', { camera = null, grade = 'bronze' } = {}) {
  const anchors = [], angles = [], group = new THREE.Group(); group.name = 'treasure';
  const { GL, U } = isle, r = rngOf(911), geos = [], vines = { vine: [], root: [] }, gy = isle.hAtL(x0, z0), obstacles = isle.field.obstacles;
  const add = (g, x = 0, y = 0, z = 0, ry = 0) => { if (!g.attributes.aGlow) g.setAttribute('aGlow', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1)); g.rotateY(ry); g.translate(x0 + x, gy + y, z0 + z); geos.push(g.index ? g.toNonIndexed() : g); };
  const R_IN = 8.6, R_MID = 19, R_RUNE = 21.6, R_OUT = 30;
  /* 바닥 세 겹 + 룬 고리 */
  for (const [ra, rb, n, rows] of [[R_IN, R_MID, 18, 2], [R_RUNE, R_OUT, 30, 3]]) { const dr = (rb - ra) / rows;
    for (let k = 0; k < rows; k++) { const off = (k % 2) * .5, m = n + k * 4; for (let i = 0; i < m; i++) { const a0 = (i + off) / m * Math.PI * 2, a1 = (i + 1 + off) / m * Math.PI * 2 - .012, q = r();
      if (q < .06 && rb > 20) continue;   /* 빠진 돌판 (바깥 겹) */
      const g = sector(ra + k * dr + .04, ra + (k + 1) * dr - .04, a0, a1, .42, i * 7 + k * 31 + ra), tilt = q > .93 ? (r() - .5) * .14 : 0; if (tilt) { g.rotateX(tilt); g.rotateZ(tilt * .6); } add(g, 0, .02 + (q > .9 ? (r() - .5) * .25 : 0)); } } }
  for (let i = 0; i < 24; i++) add(sector(R_MID + .05, R_RUNE - .05, i / 24 * Math.PI * 2, (i + 1) / 24 * Math.PI * 2 - .01, .5, i * 13 + 5, true, 1), 0, .02);   /* 룬 고리 (빛이 흐름) */
  /* 세 단 제단 (지름 약 8m) */
  let y = .4; for (const [rr, h] of [[R_IN - .4, 1.25], [6.6, 1.15], [5, 1.05]]) { const n = 12; for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2 - .008;
      const w = tierWall(rr, h, a0, a1, i * 3 + rr, rr < 6 ? 1 : 0); w.translate(0, y, 0); add(w); add(sector(rr - 1.9, rr + .02, a0, a1, .001, i * 5 + rr * 3), 0, y + h - .001); } y += h; }
  add(sector(0, 4.6, 0, Math.PI * 2, .35, 77, false), 0, y - .3);   /* 꼭대기 받침 */
  for (let i = 0; i < 8; i++) add(sector(2.6, 4.1, i / 8 * Math.PI * 2, (i + 1) / 8 * Math.PI * 2 - .02, .12, i * 9 + 3, true, 1), 0, y);   /* 받침 위 룬 원 */
  const TOPY = y + .2;
  for (let a = 0; a < 6.28; a += .5) obstacles.push([x0 + Math.cos(a) * 4.5, gy + 1.8, z0 + Math.sin(a) * 4.5, 3.4]);   /* 제단 막힘 (보이는 두께) */
  /* 돌기둥 여섯 (가운데에서 약 11m) */
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + .26, px = Math.cos(a) * 22, pz = Math.sin(a) * 22, face = Math.atan2(-px, -pz), lean = k === 2 ? .2 : 0, broken = k === 4, parts = [];
    let yy = .4; parts.push([carvedBlock(3.6, .8, 3.6, 'band', .05, k * 3), yy + .4]); yy += .8; parts.push([carvedBlock(3.1, .6, 3.1, 'band', .05, k * 3 + 1), yy + .3]); yy += .6;
    for (let q = 0; q < 6; q++) { const t = q / 6, w = 2.6 - t * .7, h = 2.35; parts.push([carvedBlock(w, h, w, q % 2 ? 'runes' : 'panel', .08, k * 11 + q, q % 2 ? 1 : 0), yy + h / 2, q]); yy += h + .02; }
    const shaftTop = broken ? 1.8 + 3 * 2.37 : yy, an = V(0, shaftTop - .75, (broken ? 2.37 : 2.02) / 2 + .2).applyAxisAngle(V(0, 0, 1), lean).applyAxisAngle(V(0, 1, 0), face);   /* 사슬 거는 자리: 기둥 몸 맨 위 · 가운데를 보는 면 (부러진 기둥은 남은 동강 위) */
    anchors.push(an.add(V(x0 + px, gy, z0 + pz))); angles.push(a);
    for (const [w, h] of [[2.3, .4], [2.6, .45], [1.6, .9]]) { parts.push([carvedBlock(w, h, w, h > .8 ? 'runes' : 'band', .06, k + w, 0), yy + h / 2]); yy += h; }
    for (const [g, py, q] of parts) { if (broken && (q > 2 || q === undefined && py > 6)) continue; g.translate(0, py, 0); g.rotateZ(lean); add(g, px, 0, pz, face); }   /* 부러진 기둥은 아랫동만 */
    if (broken) { for (let q = 0; q < 3; q++) { const g = carvedBlock(2.6 - q * .12, 2.35, 2.6 - q * .12, q % 2 ? 'panel' : 'runes', .08, k * 11 + q + 3, 0); g.rotateZ(Math.PI / 2 + (r() - .5) * .2); g.rotateY(r() * .3);
        add(g, px + Math.cos(a + 1.6) * (3.4 + q * 2.4), 1.4, pz + Math.sin(a + 1.6) * (3.4 + q * 2.4), face); obstacles.push([x0 + px + Math.cos(a + 1.6) * (3.4 + q * 2.4), gy + 1.4, z0 + pz + Math.sin(a + 1.6) * (3.4 + q * 2.4), 1.5]); } }   /* 쓰러진 윗동 */
    for (let q = 1; q < (broken ? 7 : yy); q += 1.5) obstacles.push([x0 + px + Math.sin(lean) * q * Math.cos(face + Math.PI / 2), gy + q, z0 + pz, 1.7]);
    /* 늘어진 덩굴 (초원) · 굵은 뿌리 (정글) */
    for (let v = 0; v < 5; v++) { const s = (r() - .5) * 2.4, top = (broken ? 7 : yy) - r() * 2, Lh = 2 + r() * (top - 1.5), pts = [], ox = Math.cos(face) * s, oz = -Math.sin(face) * s;
      for (let e = 0; e <= 8; e++) { const t = e / 8; pts.push(V(x0 + px + ox + Math.sin(t * 4 + v) * .2 - Math.sin(face) * 1.35, gy + top - t * Lh, z0 + pz + oz + Math.cos(t * 3 + v) * .2 - Math.cos(face) * 1.35)); }
      vines.vine.push({ pts, r: .07 + r() * .05 }); vines.root.push({ pts: pts.map(p => p.clone().add(V(0, .3, 0))), r: .18 + r() * .14 }); } }
  /* 깎은 돌 칠 (분위기 · 상태 빛은 모두 값으로 바꿈) */
  const S = { uSA: { value: new THREE.Color() }, uSB: { value: new THREE.Color() }, uCov: { value: new THREE.Color() }, uCovA: { value: 1 }, uGlowC: { value: new THREE.Color() }, uGlowA: { value: .6 }, uFlow: { value: 1.3 }, uWake: { value: 99 }, uCrack: { value: new THREE.Color() }, uRel: { value: -1 } };
  const SFRAG = `uniform vec3 uSA, uSB, uCov, uGlowC, uCrack; uniform float uCovA, uGlowA, uFlow, uWake, uRel; varying vec3 vP, vN; varying float vG;
      void main(){ vec3 n = normalize(vN) * (gl_FrontFacing ? 1. : -1.), an = abs(n); an /= an.x + an.y + an.z;
        float tr = fb(vP.zy * 1.3) * an.x + fb(vP.xz * 1.3) * an.y + fb(vP.xy * 1.3) * an.z, tr2 = vn(vP.zy * 6.) * an.x + vn(vP.xz * 6.) * an.y + vn(vP.xy * 6.) * an.z;
        vec3 st = mix(uSA, uSB, tr) * (.84 + .22 * tr2); st *= .82 + .18 * smoothstep(.25, .7, vn(vec2(vP.x * 1.7 + vP.z * 1.3, vP.y * .18)));
        float crack = smoothstep(.035, .0, abs(vn(vP.xz * .9 + vP.y * .4) - .5)); st *= 1. - .35 * crack;
        float cov = smoothstep(.6, .9, n.y + (tr2 - .5) * .4) * smoothstep(.4, .75, vn(vP.xz * .32 + vP.y * .1)) * uCovA; st = mix(st, uCov * (.8 + .3 * tr2), cov);   /* 이끼 · 재 · 서리 */
        float ao = .5 + .5 * smoothstep(-.7, .5, n.y); vec3 c = lit(st, n, 1., ao);
        c += uCrack * crack * (.6 + .4 * sin(uT * 2. + vP.x)) * (.3 + .7 * an.y);   /* 용암: 금 간 틈에서 불빛 */
        float d = length(vP.xz - vec2(${x0.toFixed(2)}, ${z0.toFixed(2)})), hy = vP.y - ${gy.toFixed(2)}, wake = smoothstep(uWake + .6, uWake - .6, hy);
        float flow = .35 + .65 * pow(.5 + .5 * sin(uT * uFlow - vP.y * .7 - d * .35), 3.);
        float rf = uRel * 14., rel = uRel < 0. ? 0. : exp(-pow((d - rf) / 1.8, 2.)) * 3. + step(d, rf) * .7 * exp(-uRel * .8);   /* 상자가 열리며 풀려난 힘: 안쪽부터 바깥으로 룬이 차례로 번쩍 켜짐 */
        c += uGlowC * vG * (uGlowA * flow * (hy < 1.2 ? 1. : wake) + rel) * (.35 + .65 * seen(vP));   /* 룬 빛: 상태 색 · 바닥 룬 고리는 늘 · 기둥 · 제단 룬은 싸움 때 아래부터 깨어남 */
        gl_FragColor = vec4(fogged(c, vP), 1.); }`;
  const mat = new THREE.ShaderMaterial({ uniforms: { ...U, ...S }, side: THREE.DoubleSide,
    vertexShader: `attribute float aGlow; varying vec3 vP, vN; varying float vG; void main(){ vP = position; vN = normal; vG = aGlow; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
    fragmentShader: GL + SFRAG });
  /* 봉인된 상자 (제단 꼭대기 가운데) · 아이템 떨어질 자리: 제단 앞(카메라 쪽) 바닥 — 1층에서 주울 수 있는 높이 (사용자 2026-11-11: 높이 '나') */
  const CBr = y + .05, drop = V(x0, gy + .46, z0 + 13), chest = buildChest({ GL, U, S, pxU: isle.pxU, x0, z0, cb: gy + CBr, anchors, angles, drop, group, grade });
  const mystic = buildMystic({ GL, U, S, SFRAG, pxU: isle.pxU, x0, z0, gy, angles, group, glow: chest.C }), mark = camera && typeof document !== 'undefined' ? makeOffMark() : null;
  /* 한 번에 그리기: 모두 같은 속성 (position · normal · aGlow) */
  const P = [], N = [], Gl = []; for (const g of geos) { if (!g.attributes.normal) g.computeVertexNormals(); P.push(...g.attributes.position.array); N.push(...g.attributes.normal.array); Gl.push(...g.attributes.aGlow.array); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); bg.setAttribute('aGlow', new THREE.Float32BufferAttribute(Gl, 1));
  const stone = new THREE.Mesh(bg, mat); stone.name = 'treasureStone'; group.add(stone);
  /* 덩굴 · 뿌리 (분위기에 따라 보임) */
  const vineMat = new THREE.MeshBasicMaterial({ color: 0x2d5a1c }), rootMat = new THREE.MeshBasicMaterial({ color: 0x4a3626 }), vm = {};
  for (const k of ['vine', 'root']) { const gs = vines[k].map(({ pts, r: rr }) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, rr, 5, false)); const P2 = []; for (const g of gs) P2.push(...g.toNonIndexed().attributes.position.array);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3)); g.computeVertexNormals();
    vm[k] = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: U, vertexShader: `varying vec3 vP, vN; void main(){ vP = position; vN = normal; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
      fragmentShader: GL + `varying vec3 vP, vN; void main(){ vec3 n = normalize(vN); vec3 c = ${k === 'vine' ? 'mix(vec3(.12, .26, .07), vec3(.25, .42, .12), vn(vP.xy * 3.))' : 'mix(vec3(.2, .14, .09), vec3(.36, .27, .18), vn(vP.xy * 2.))'}; gl_FragColor = vec4(fogged(lit(c, n, 1., .8), vP), 1.); }` })); group.add(vm[k]); }

  /* 분위기 · 상태 */
  const RED = new THREE.Color(1.35, .2, .12), GOLD = new THREE.Color(1.5, 1.12, .45), base = new THREE.Color(), cur = new THREE.Color(); let TH = THEMES.meadow, state = 'guard', st = 0, hp = 1;
  const setTheme = k => { TH = THEMES[k]; S.uSA.value.setRGB(...TH.a); S.uSB.value.setRGB(...TH.b); S.uCov.value.setRGB(...TH.cover); S.uCovA.value = TH.coverAmt; S.uCrack.value.setRGB(...TH.crack); base.setRGB(...TH.glow); vm.vine.visible = TH.vines === 'vine'; vm.root.visible = TH.vines === 'root'; mystic.setTheme(TH); };
  const setState = s => { if (s === state && s !== 'guard') return; state = s; st = 0; if (s === 'dead') chest.kill(); if (s === 'guard') { hp = 1; chest.reset(); } };
  /* 몬스터 체력 (0~1): 1/6 줄 때마다 사슬 하나 끊김 · 0이면 쓰러뜨림 */
  const setHP = v => { if (state === 'dead') return; hp = Math.max(0, Math.min(1, v)); if (state === 'guard') setState('fight'); chest.setHP(hp); if (hp <= 0) setState('dead'); };
  setTheme(theme); cur.copy(base);
  const update = (t, dt, ship) => { st += dt;
    const near = ship && Math.hypot(ship.x - x0, ship.z - z0) < 24; if (state === 'guard' && near) setState('fight'); else if (state === 'fight' && !near && hp >= 1) setState('guard');   /* 약 12m 안이면 싸움 (몬스터가 오면 몬스터 상태를 따름) */
    let tc, ga, fl, wk; const bt = chest.burstT;
    if (state === 'guard') { tc = base; ga = .55; fl = 1.3; wk = 99; }
    else if (state === 'fight') { tc = RED; ga = 1; fl = 4; wk = Math.min(18, st * 8); }
    else { tc = bt >= 0 ? GOLD : RED; ga = bt >= 0 ? .8 : 1; fl = bt >= 0 ? 1.3 : 6; wk = 18; }
    const rel = state === 'dead' ? bt : -1; S.uRel.value = rel;   /* 풀려난 힘이 퍼지는 시간 (룬 · 바닥 빛줄기 · 안개 · 풀이 같이 반응) */
    if (U.uWave) U.uWave.value.set(x0, z0, rel * 14, rel >= 0 && rel < 7 ? 2.2 * Math.exp(-rel * .45) : 0);
    cur.lerp(tc, Math.min(1, dt * 4)); chest.C.copy(cur); S.uGlowC.value.copy(cur); S.uGlowA.value += (ga - S.uGlowA.value) * Math.min(1, dt * 4); S.uFlow.value = fl; S.uWake.value = state === 'guard' ? 99 : wk; 
    chest.update(t, dt, state, camera); mystic.update(t, rel);
    if (mark) { const c = chest.center.clone(); group.localToWorld(c); const n = c.clone().project(camera), back = n.z > 1;   /* 화면 밖 표시기 (카메라 뒤쪽이면 방향을 뒤집음) */
      const sx = (back ? -n.x : n.x) * innerWidth / 2 + innerWidth / 2, sy = (back ? n.y : -n.y) * innerHeight / 2 + innerHeight / 2, dm = ship ? Math.hypot(ship.x - x0, ship.z - z0) * .5 : 99;
      mark.update({ on: chest.onScreen, sx, sy, grade: chest.grade, fight: state === 'fight', open: chest.opened, near: Math.max(0, Math.min(1, 1 - dm / 160)), t }); } };
  isle.group.add(group); return { group, chest, mystic, setTheme, setState, setHP, setGrade: k => chest.setGrade(k), GRADES, get hp() { return hp; }, update, get state() { return state; }, center: [x0, gy, z0], TOPY };
}
