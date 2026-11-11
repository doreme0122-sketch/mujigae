/* 보물 장소 (사용자 2026-11-11: 다른 맵에도 씀 — 모양은 같고 분위기만 다르게 · 몬스터와 아이템은 따로 받음 · 장소만)
   지름 30m (섬 안 단위로 반지름 30) · 가운데 = 지키는 몬스터 자리
   · 바닥: 둥근 돌판 세 겹 (안 · 가운데 · 바깥) — 돌판마다 줄눈 · 닳은 모서리 · 군데군데 깨지고 빠지고 기움
   · 룬 고리: 가운데 겹 바깥 둘레에 룬을 새긴 돌 띠 — 상태 빛이 흐름
   · 제단: 세 단 둥근 돌 제단 (지름 약 8m) — 단마다 바깥 벽에 룬 띠 · 꼭대기 넓은 받침에 룬 원
   · 돌기둥 여섯: 가운데에서 약 11m · 위로 좁아지는 네모 기둥 (돌을 층층이 · 앞면 룬 세로 띠 · 머리 장식) — 하나는 기울고 하나는 부러져 윗동이 쓰러짐
   · 빛기둥 (멀리서 보이는 표시) · 떠오르는 빛 알갱이 · 쓰러뜨림 때 바닥으로 퍼지는 충격파
   상태: 지킴(맵 색으로 은은히 숨 쉼) → 싸움(붉게 · 빠르게 · 기둥 룬이 아래부터 깨어남 · 빛기둥 굵고 떨림) → 쓰러뜨림(빛 터짐 · 충격파 · 룬 번쩍 → 천천히 꺼짐)
   분위기(맵마다): 돌 색 · 덮개(이끼 · 재 · 서리 · 짙은 이끼) · 빛 색 · 틈 불빛(용암) · 늘어진 덩굴/뿌리(초원 · 정글) — 싸움 빨강은 모든 맵 같음 */
import * as THREE from 'three';
import { noise2 } from './islefield.js?v=11102312';
import { carvedBlock, runeD } from './ruins.js?v=11102312';

export const THEMES = {
  meadow: { name: '초원', a: [.36, .34, .29], b: [.58, .54, .46], cover: [.2, .36, .1], coverAmt: .85, glow: [.22, .95, .8], crack: [0, 0, 0], vines: 'vine' },
  lava: { name: '용암', a: [.13, .12, .12], b: [.27, .25, .24], cover: [.2, .18, .17], coverAmt: .45, glow: [1.2, .5, .12], crack: [1.4, .45, .08], vines: null },
  ice: { name: '얼음', a: [.62, .66, .7], b: [.86, .89, .92], cover: [.95, .97, 1], coverAmt: 1, glow: [.45, .8, 1.25], crack: [0, 0, 0], vines: null },
  jungle: { name: '정글', a: [.17, .22, .17], b: [.33, .38, .3], cover: [.1, .2, .08], coverAmt: 1, glow: [.75, .35, 1.15], crack: [0, 0, 0], vines: 'root' },
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
export function buildTreasure(isle, x0, z0, theme = 'meadow') {
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
  const S = { uSA: { value: new THREE.Color() }, uSB: { value: new THREE.Color() }, uCov: { value: new THREE.Color() }, uCovA: { value: 1 }, uGlowC: { value: new THREE.Color() }, uGlowA: { value: .6 }, uFlow: { value: 1.3 }, uWake: { value: 99 }, uCrack: { value: new THREE.Color() }, uFlash: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms: { ...U, ...S }, side: THREE.DoubleSide,
    vertexShader: `attribute float aGlow; varying vec3 vP, vN; varying float vG; void main(){ vP = position; vN = normal; vG = aGlow; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
    fragmentShader: GL + `uniform vec3 uSA, uSB, uCov, uGlowC, uCrack; uniform float uCovA, uGlowA, uFlow, uWake, uFlash; varying vec3 vP, vN; varying float vG;
      void main(){ vec3 n = normalize(vN) * (gl_FrontFacing ? 1. : -1.), an = abs(n); an /= an.x + an.y + an.z;
        float tr = fb(vP.zy * 1.3) * an.x + fb(vP.xz * 1.3) * an.y + fb(vP.xy * 1.3) * an.z, tr2 = vn(vP.zy * 6.) * an.x + vn(vP.xz * 6.) * an.y + vn(vP.xy * 6.) * an.z;
        vec3 st = mix(uSA, uSB, tr) * (.84 + .22 * tr2); st *= .82 + .18 * smoothstep(.25, .7, vn(vec2(vP.x * 1.7 + vP.z * 1.3, vP.y * .18)));
        float crack = smoothstep(.035, .0, abs(vn(vP.xz * .9 + vP.y * .4) - .5)); st *= 1. - .35 * crack;
        float cov = smoothstep(.6, .9, n.y + (tr2 - .5) * .4) * smoothstep(.4, .75, vn(vP.xz * .32 + vP.y * .1)) * uCovA; st = mix(st, uCov * (.8 + .3 * tr2), cov);   /* 이끼 · 재 · 서리 */
        float ao = .5 + .5 * smoothstep(-.7, .5, n.y); vec3 c = lit(st, n, 1., ao);
        c += uCrack * crack * (.6 + .4 * sin(uT * 2. + vP.x)) * (.3 + .7 * an.y);   /* 용암: 금 간 틈에서 불빛 */
        float d = length(vP.xz - vec2(${x0.toFixed(2)}, ${z0.toFixed(2)})), hy = vP.y - ${gy.toFixed(2)}, wake = smoothstep(uWake + .6, uWake - .6, hy);
        float flow = .35 + .65 * pow(.5 + .5 * sin(uT * uFlow - vP.y * .7 - d * .35), 3.);
        c += uGlowC * vG * (uGlowA * flow * (hy < 1.2 ? 1. : wake) + uFlash) * (.35 + .65 * seen(vP));   /* 룬 빛: 상태 색 · 바닥 룬 고리는 늘 · 기둥 · 제단 룬은 싸움 때 아래부터 깨어남 */
        gl_FragColor = vec4(fogged(c, vP), 1.); }` });
  const group = new THREE.Group(); group.name = 'treasure';
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
  /* 빛기둥 (멀리서 보이는 표시): 제단에서 하늘로 · 위로 갈수록 흐려짐 · 늘 카메라를 봄 · 시야 어둠에 안 가림 */
  const BU = { uT: U.uT, uC: { value: new THREE.Color() }, uA: { value: .6 }, uW: { value: 1 }, uShake: { value: 0 } };
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 24), new THREE.ShaderMaterial({ uniforms: BU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `uniform float uW, uShake, uT; varying vec2 vU; void main(){ vU = uv; vec3 base = vec3(${x0.toFixed(2)}, ${(gy + 4.6).toFixed(2)}, ${z0.toFixed(2)}); float h = uv.y * 120.;
      vec3 w = (modelMatrix * vec4(base, 1.)).xyz, vd = normalize(cameraPosition - w); vec3 sd = normalize(cross(vec3(0., 1., 0.), vd)); float wid = uW * (1.6 + 1.2 * (1. - uv.y)) * (1. + uShake * .25 * sin(uT * 31. + uv.y * 20.));
      vec3 p = base + vec3(0., h, 0.) + sd * (uv.x - .5) * wid; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.); }`,
    fragmentShader: `uniform vec3 uC; uniform float uA, uT; varying vec2 vU; void main(){ float x = abs(vU.x - .5) * 2., core = exp(-x * x * 9.) + .35 * exp(-x * x * 2.), fade = smoothstep(0., .04, vU.y) * pow(1. - vU.y, 1.6);
      float shimmer = .8 + .2 * sin(uT * 2.3 - vU.y * 30.); gl_FragColor = vec4(uC * core * fade * shimmer * uA, 1.); }` }));
  beam.frustumCulled = false; beam.renderOrder = 9; group.add(beam);
  /* 떠오르는 빛 알갱이 */
  const NM = 90, mp = new Float32Array(NM * 3), ms = new Float32Array(NM); for (let i = 0; i < NM; i++) { const a = r() * 6.283, d = 2 + r() * 9; mp.set([x0 + Math.cos(a) * d, gy + r() * 14, z0 + Math.sin(a) * d], i * 3); ms[i] = r(); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3)); mg.setAttribute('aS', new THREE.BufferAttribute(ms, 1));
  const MU = { uT: U.uT, uC: BU.uC, uA: { value: .6 }, uPx: isle.pxU, uY0: { value: gy } };
  const motes = new THREE.Points(mg, new THREE.ShaderMaterial({ uniforms: MU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aS; uniform float uT, uPx, uY0; varying float vA; void main(){ vec3 p = position; float t = fract(aS + uT * (.05 + aS * .04)); p.y = uY0 + 1. + t * 16.; p.x += sin(uT * .7 + aS * 20.) * .6; p.z += cos(uT * .6 + aS * 17.) * .6;
      vA = sin(t * 3.1416); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = uPx * .32 / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uC; uniform float uA; varying float vA; void main(){ vec2 q = gl_PointCoord - .5; float d = dot(q, q); if (d > .25) discard; gl_FragColor = vec4(uC * (1. - d * 4.) * vA * uA * 1.6, 1.); }` }));
  motes.frustumCulled = false; group.add(motes);
  /* 쓰러뜨림 충격파: 바닥을 따라 퍼지는 빛 고리 */
  const ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 96), new THREE.ShaderMaterial({ uniforms: { uC: BU.uC, uA: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`, fragmentShader: `uniform vec3 uC; uniform float uA; void main(){ gl_FragColor = vec4(uC * uA * 1.5, 1.); }` }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(x0, gy + .6, z0); ring.visible = false; group.add(ring);

  /* 분위기 · 상태 */
  const RED = new THREE.Color(1.35, .2, .12), base = new THREE.Color(), cur = new THREE.Color(); let TH = THEMES.meadow, state = 'guard', st = 0, dead = 0;
  const setTheme = k => { TH = THEMES[k]; S.uSA.value.setRGB(...TH.a); S.uSB.value.setRGB(...TH.b); S.uCov.value.setRGB(...TH.cover); S.uCovA.value = TH.coverAmt; S.uCrack.value.setRGB(...TH.crack); base.setRGB(...TH.glow); vm.vine.visible = TH.vines === 'vine'; vm.root.visible = TH.vines === 'root'; };
  const setState = s => { state = s; st = 0; if (s === 'dead') { dead = 0; ring.visible = true; } if (s === 'guard') ring.visible = false; };
  setTheme(theme);
  const update = (t, dt, ship) => { st += dt;
    const near = ship && Math.hypot(ship.x - x0, ship.z - z0) < 24; if (state === 'guard' && near) setState('fight'); else if (state === 'fight' && !near) setState('guard');   /* 약 12m 안이면 싸움 (몬스터가 오면 몬스터 상태를 따름) */
    let tc, ga, fl, wk, bw, ba, sh, ma;
    if (state === 'guard') { tc = base; ga = .55; fl = 1.3; wk = Math.max(-1, 99 - st * 40); bw = 1; ba = .55; sh = 0; ma = .55; }
    else if (state === 'fight') { tc = RED; ga = 1; fl = 4; wk = Math.min(18, st * 8); bw = 1.5; ba = .9; sh = 1; ma = .9; }
    else { dead += dt; const k = Math.max(0, 1 - dead / 4); tc = base; ga = .8 * k; fl = 1.3; wk = 99; bw = 1 + 2.5 * Math.exp(-dead * 3); ba = (.9 + 2 * Math.exp(-dead * 4)) * k; sh = 0; ma = k * .8;
      S.uFlash.value = 2.2 * Math.exp(-dead * 3); ring.scale.setScalar(2 + dead * 32); ring.material.uniforms.uA.value = Math.max(0, 1 - dead / .9); if (dead > 1) ring.visible = false; }
    if (state !== 'dead') S.uFlash.value = 0;
    cur.lerp(tc, Math.min(1, dt * 4)); S.uGlowC.value.copy(cur); S.uGlowA.value += (ga - S.uGlowA.value) * Math.min(1, dt * 4); S.uFlow.value = fl; S.uWake.value = state === 'guard' ? 99 : wk;
    BU.uC.value.copy(cur); BU.uW.value += (bw - BU.uW.value) * Math.min(1, dt * 5); BU.uA.value += (ba - BU.uA.value) * Math.min(1, dt * 5); BU.uShake.value = sh; MU.uA.value = ma; };
  isle.group.add(group); return { group, setTheme, setState, update, get state() { return state; }, center: [x0, gy, z0], TOPY };
}
