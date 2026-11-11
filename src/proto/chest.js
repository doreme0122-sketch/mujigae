/* 봉인된 보물 상자 (사용자 2026-11-11: 제단 가운데 · 봉인된 느낌 · 몬스터는 둘레를 배회 · 상자 위 빛기둥은 다른 게임처럼 멋지고 선명하게)
   · 상자: 오래된 돌 몸통 + 청동 테 (모서리 꺾쇠 · 위아래 띠 · 징 · 자물쇠판) · 둥근 돌 뚜껑에 룬 (빛) · 청동 갈비 · 뚜껑 틈새로 안의 빛이 샘
   · 봉인: 돌기둥 여섯에서 빛 사슬 여섯 줄이 상자 고리에 걸림 · 사슬 따라 빛이 기둥 → 상자로 흘러듦 (기둥이 힘을 모아 상자를 누름)
           상자 위에 떠서 도는 봉인 원 — 여섯 조각이 사슬 하나씩과 이어짐 · 앞 자물쇠에 작은 봉인 문양
   · 왜 풀리나: 몬스터 체력과 사슬을 이음 — 체력 1/6이 줄 때마다 사슬 하나가 끊어짐 (끊긴 자리에서 불꽃 · 고리 조각이 흩어져 떨어짐 · 봉인 원 그 조각이 꺼짐)
   · 쓰러뜨리면: 남은 사슬이 차례로 끊김 → 봉인 원이 깨짐 → 뚜껑이 떨다가 뒤로 젖혀 열림 → 안에서 빛이 터짐 (충격파) → 빛기둥이 보물 빛으로 바뀌어 남음
   · 빛기둥: 하얀 심지 (아주 밝음 · 위로 흐르는 결) + 색 빛 겉 + 위로 오르는 빛 고리 + 기둥을 감아 오르는 빛 알갱이 + 상자 위 빛 터짐 (별빛) — 멀리서도 또렷 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { noise2 } from './islefield.js?v=11111214';
import { carvedBlock, runeD } from './ruins.js?v=11111214';

const W = 4.2, D = 2.8, BOT = .75, SEAM = 2.85, R = 1.45, AX = 3.0, LL = 4.3;   /* 몸통 너비 · 깊이 · 바닥 · 뚜껑 이음 높이 · 뚜껑 반지름 · 뚜껑 축 높이 · 뚜껑 길이 (섬 안 단위 · 0.5배 = m) */
const ORDER = [0, 3, 1, 4, 2, 5];   /* 체력이 줄 때 끊기는 차례 (마주 보는 것끼리 번갈아) */
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* 위치 · 법선만 남기고 하나로 (청동은 aGlow 없음 / 돌은 aGlow 붙임) */
function merge(list, glow) { const P = [], N = [], G = [];
  for (let g of list) { g = g.index ? g.toNonIndexed() : g; if (!g.attributes.normal) g.computeVertexNormals(); P.push(...g.attributes.position.array); N.push(...g.attributes.normal.array);
    if (glow) { const a = g.attributes.aGlow; for (let i = 0; i < g.attributes.position.count; i++) G.push(a ? a.array[i] : 0); } }
  const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); b.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); if (glow) b.setAttribute('aGlow', new THREE.Float32BufferAttribute(G, 1)); return b; }
const at = (g, x, y, z, ry = 0, rx = 0, rz = 0) => { if (rz) g.rotateZ(rz); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };

/* 둥근 뚜껑 (반원통) — 앞(+z)에서 뒤(-z)로 넘어가는 면 · 가운데 띠에 룬을 파고 홈에 빛 · 양 끝은 닳음 */
function dome() { const nU = 44, nV = 40, P = [], Gw = [], I = [], arc = Math.PI * R;
  for (let j = 0; j <= nV; j++) for (let i = 0; i <= nU; i++) { const u = i / nU, v = j / nV, x = (u - .5) * LL, th = v * Math.PI, s = (v - .5) * arc;
    let rr = R + .02 * noise2(x * 3.1, s * 2.7); const e = Math.min(u, 1 - u) * LL; if (e < .2) rr -= (.2 - e) * .35; let g = 0;
    const inBand = Math.abs(s) < 1.05 && Math.abs(x) < 1.25;   /* 룬 띠: 가운데 두 갈비 사이 */
    if (inBand) { const rd = runeD(x, s, 2.5, 2.1, .16, 41); if (rd < .085) { rr -= .07 * (rd < .055 ? 1 : (.085 - rd) / .03); if (rd < .06) g = 1; } }
    else if (Math.abs(Math.abs(s) - 1.18) < .05 && Math.abs(x) < 1.25) rr -= .04;   /* 띠 테두리 홈 */
    P.push(x, AX + Math.sin(th) * rr, Math.cos(th) * rr); Gw.push(g); }
  for (let j = 0; j < nV; j++) for (let i = 0; i < nU; i++) { const a = j * (nU + 1) + i, b = a + 1, c = a + nU + 1, d = c + 1; I.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aGlow', new THREE.Float32BufferAttribute(Gw, 1)); g.setIndex(I); g.computeVertexNormals(); return g; }
/* 뚜껑 양 끝 반원 (안쪽으로 살짝 들어간 판 · 가운데 꽃무늬 돋을새김) */
function cap(sx) { const n = 28, rings = 6, P = [], I = [];
  for (let k = 0; k <= rings; k++) for (let i = 0; i <= n; i++) { const rr = R * k / rings, th = i / n * Math.PI, petal = rr < .75 ? .05 * Math.max(0, Math.cos(th * 8)) * Math.sin(rr / .75 * Math.PI) : 0, rim = rr > R - .16 ? 0 : -.05;
    P.push(sx * (LL / 2 + rim + petal), AX + Math.sin(th) * Math.max(rr, .001), Math.cos(th) * rr); }
  for (let k = 0; k < rings; k++) for (let i = 0; i < n; i++) { const a = k * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1; if (sx > 0) I.push(a, c, b, b, c, d); else I.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); return g; }

/* 청동 칠: 닳은 청동 + 홈과 아래쪽에 푸른 녹 · 햇빛 반짝임 · 봉인 빛이 비침 · uM: 뚜껑처럼 움직이는 것 */
const BRONZE_V = `uniform mat4 uM; varying vec3 vP, vN, vW; void main(){ vec4 p = uM * vec4(position, 1.); vP = p.xyz; vN = mat3(uM) * normal; vW = (modelMatrix * p).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.); }`;
const BRONZE_F = `uniform vec3 uGlowC; uniform float uSeal; varying vec3 vP, vN, vW;
  void main(){ vec3 n = normalize(vN) * (gl_FrontFacing ? 1. : -1.), an = abs(n); an /= an.x + an.y + an.z;
    float tr = vn(vP.zy * 4.) * an.x + vn(vP.xz * 4.) * an.y + vn(vP.xy * 4.) * an.z, tr2 = vn(vP.zy * 13.) * an.x + vn(vP.xz * 13.) * an.y + vn(vP.xy * 13.) * an.z;
    float pat = smoothstep(.5, .8, tr * .7 + tr2 * .3 + (.5 - .5 * n.y) * .25);   /* 푸른 녹 */
    vec3 al = mix(mix(vec3(.36, .22, .09), vec3(.72, .5, .24), tr2), vec3(.2, .46, .38), pat * .8);
    vec3 c = lit(al, n, 1., .85), v = normalize(cameraPosition - vW), h = normalize(uSun + v);
    c += vec3(1., .86, .6) * pow(max(dot(n, h), 0.), 36.) * (1. - pat) * 1.1;   /* 햇빛 반짝임 */
    c += uGlowC * uSeal * (.12 + .3 * pow(1. - abs(dot(n, v)), 3.));   /* 봉인 빛이 테에 비침 */
    gl_FragColor = vec4(fogged(c, vP), 1.); }`;

/* x0 z0: 제단 가운데 · cb: 상자 바닥 높이 (섬 안) · anchors: 기둥 여섯 사슬 거는 자리 (섬 안 좌표 · 기둥 각도 순) · stoneMat: 보물 장소 돌 칠 · add: 돌 조각을 장소 돌에 합침 */
export function buildChest({ GL, U, S, pxU, x0, z0, cb, anchors, angles, stoneFrag, add, group })   /* add(g): 상자 바닥 기준 조각을 장소 돌에 합침 */ {
  const cs = (g, x, y, z, ry = 0) => { at(g, x, y, z, ry); add(g); };   /* 상자 돌 → 장소 돌에 합침 (상자 바닥 기준) */
  const bz = [], bl = [], sl = [];   /* 청동 (가만히) · 청동 (뚜껑) · 돌 (뚜껑) */
  /* ── 몸통 ── */
  cs(carvedBlock(4.9, .4, 3.5, 'band', .05, 51), 0, .2, 0);                                  /* 받침 */
  cs(carvedBlock(W, SEAM - BOT, D, 'panel', .07, 52), 0, (SEAM + BOT) / 2, 0);              /* 몸통 */
  cs(carvedBlock(3.0, 1.15, .16, 'runes', .05, 53, .9), 0, 1.6, D / 2 + .06);              /* 앞 룬판 (빛) */
  cs(carvedBlock(3.0, 1.45, .16, 'lozenge', .05, 54), 0, 1.75, -D / 2 - .06, Math.PI);     /* 뒤 마름모 */
  for (const s of [-1, 1]) cs(carvedBlock(2.0, 1.45, .16, 'rosette', .05, 55 + s), s * (W / 2 + .06), 1.75, 0, s * Math.PI / 2);   /* 옆 꽃무늬 */
  /* 청동: 발 · 위아래 띠 · 모서리 꺾쇠 · 징 · 자물쇠판 */
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { bz.push(at(carvedBlock(.72, .36, .72, 'band', .04, 60 + sx + sz * 2), sx * 1.85, .58, sz * 1.15));
    bz.push(at(new RoundedBoxGeometry(.5, SEAM - BOT + .06, .1, 2, .03), sx * (W / 2 - .22), (SEAM + BOT) / 2, sz * (D / 2 + .05)));
    bz.push(at(new RoundedBoxGeometry(.1, SEAM - BOT + .06, .5, 2, .03), sx * (W / 2 + .05), (SEAM + BOT) / 2, sz * (D / 2 - .22))); }
  for (const yy of [BOT + .14, SEAM - .13]) { for (const sz of [-1, 1]) bz.push(at(new RoundedBoxGeometry(W + .12, .2, .08, 2, .03), 0, yy, sz * (D / 2 + .04)));
    for (const sx of [-1, 1]) bz.push(at(new RoundedBoxGeometry(.08, .2, D + .12, 2, .03), sx * (W / 2 + .04), yy, 0)); }
  const stud = (list, x, y, z) => list.push(at(new THREE.IcosahedronGeometry(.065, 1), x, y, z));
  for (const yy of [BOT + .14, SEAM - .13]) { for (let i = -4; i <= 4; i++) for (const sz of [-1, 1]) stud(bz, i * .46, yy, sz * (D / 2 + .1));
    for (let i = -2; i <= 2; i++) for (const sx of [-1, 1]) stud(bz, sx * (W / 2 + .1), yy, i * .5); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let q = 0; q < 4; q++) stud(bz, sx * (W / 2 - .22), BOT + .5 + q * .45, sz * (D / 2 + .11));
  bz.push(at(new RoundedBoxGeometry(1.05, .74, .12, 2, .04), 0, 2.42, D / 2 + .13));   /* 자물쇠판 */
  for (const [x, y] of [[-.4, 2.13], [.4, 2.13], [-.4, 2.71], [.4, 2.71]]) stud(bz, x, y, D / 2 + .2);
  /* 사슬 고리: 기둥 쪽을 보는 몸통 벽 위쪽 (기둥 각도로 벽에 닿는 자리) */
  const hooks = angles.map(a => { const dx = Math.cos(a), dz = Math.sin(a), side = Math.abs(dx) * (D / 2) > Math.abs(dz) * (W / 2), s = Math.min((W / 2 + .12) / Math.abs(dx || 1e-6), (D / 2 + .12) / Math.abs(dz || 1e-6));
    const hx = side ? Math.sign(dx) * (W / 2 + .12) : Math.sign(dx) * 1.75, hz = side ? dz * s : Math.sign(dz) * (D / 2 + .12), out = side ? V(Math.sign(dx), 0, 0) : V(0, 0, Math.sign(dz));   /* 앞뒤 면은 자물쇠 · 룬판을 피해 모서리 꺾쇠 위 */
    const ring = new THREE.TorusGeometry(.22, .055, 6, 16); if (side) ring.rotateY(Math.PI / 2); bz.push(at(ring, hx + out.x * .1, 2.3, hz + out.z * .1));   /* 고리 */
    bz.push(at(new RoundedBoxGeometry(side ? .08 : .44, .36, side ? .44 : .08, 2, .03), hx, 2.6, hz));   /* 고리판 */
    return V(x0 + hx + out.x * .1, cb + 2.3, z0 + hz + out.z * .1); });
  /* ── 뚜껑 (뒤쪽 아래 모서리를 축으로 젖혀짐) ── */
  sl.push(dome()); for (const sx of [-1, 1]) sl.push(cap(sx));
  sl.push(at(carvedBlock(LL + .06, AX - SEAM, R * 2 + .04, 'band', .03, 71), 0, (AX + SEAM) / 2, 0));   /* 뚜껑 아래 테 */
  for (const x of [-1.42, 1.42, -2.06, 2.06]) { const rib = new THREE.TorusGeometry(R + .05, Math.abs(x) > 2 ? .1 : .085, 6, 28, Math.PI); rib.rotateY(Math.PI / 2); rib.rotateX(0); at(rib, x, AX, 0);   /* 갈비 (앞 → 꼭대기 → 뒤) */
    bl.push(rib); for (let q = 1; q < 8; q++) { const th = q / 8 * Math.PI; stud(bl, x, AX + Math.sin(th) * (R + .13), Math.cos(th) * (R + .13)); } }
  for (const sz of [-1, 1]) bl.push(at(new RoundedBoxGeometry(LL + .14, .14, .09, 2, .03), 0, SEAM + .08, sz * (R + .04)));
  for (const sx of [-1, 1]) bl.push(at(new RoundedBoxGeometry(.09, .14, R * 2 + .14, 2, .03), sx * (LL / 2 + .05), SEAM + .08, 0));
  bl.push(at(new RoundedBoxGeometry(.56, .62, .1, 2, .03), 0, SEAM - .1, R + .14));   /* 걸쇠 (자물쇠판 위로 내려옴) */
  bl.push(at(new THREE.TorusGeometry(.16, .045, 6, 14), 0, SEAM - .36, R + .22));
  for (const sx of [-1, 1]) bl.push(at(new THREE.CylinderGeometry(.11, .11, .5, 10), sx * 1.4, SEAM, -R - .02, 0, 0, Math.PI / 2));   /* 경첩 */

  /* 칠 */
  const mk = (frag, vert, extra) => new THREE.ShaderMaterial({ uniforms: { ...U, ...S, ...extra }, side: THREE.DoubleSide, vertexShader: vert, fragmentShader: GL + frag });
  const lidM = { uM: { value: new THREE.Matrix4() } }, still = { uM: { value: new THREE.Matrix4().makeTranslation(x0, cb, z0) } }, CU = { uSeal: { value: 1 } };
  const stoneLidV = `attribute float aGlow; uniform mat4 uM; varying vec3 vP, vN; varying float vG; void main(){ vec4 p = uM * vec4(position, 1.); vP = p.xyz; vN = mat3(uM) * normal; vG = aGlow; gl_Position = projectionMatrix * viewMatrix * modelMatrix * p; }`;
  const bronzeStill = new THREE.Mesh(merge(bz), mk(BRONZE_F, BRONZE_V, { ...still, ...CU })), bronzeLid = new THREE.Mesh(merge(bl), mk(BRONZE_F, BRONZE_V, { ...lidM, ...CU })), stoneLid = new THREE.Mesh(merge(sl, true), mk(stoneFrag, stoneLidV, lidM));
  for (const m of [bronzeStill, bronzeLid, stoneLid]) { m.frustumCulled = false; group.add(m); }

  /* ── 빛 (모두 더하는 빛 · 깊이 안 씀) ── */
  const C = { uC: { value: new THREE.Color() }, uT: U.uT };
  const glowMat = (vert, frag, uni = {}) => new THREE.ShaderMaterial({ uniforms: { ...C, ...uni }, vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  /* 뚜껑 틈새로 새는 빛 (닫혀 있을 때 · 숨 쉬듯) */
  const seamG = merge([at(new THREE.BoxGeometry(W - .1, .07, .02), 0, SEAM + .02, D / 2 + .005), at(new THREE.BoxGeometry(W - .1, .07, .02), 0, SEAM + .02, -D / 2 - .005), at(new THREE.BoxGeometry(.02, .07, D - .1), W / 2 + .005, SEAM + .02, 0), at(new THREE.BoxGeometry(.02, .07, D - .1), -W / 2 - .005, SEAM + .02, 0)]);
  seamG.translate(x0, cb, z0); const SA = { uA: { value: 1 } };
  const seam = new THREE.Mesh(seamG, glowMat(`varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    `uniform vec3 uC; uniform float uA, uT; varying vec3 vP; void main(){ float f = .7 + .3 * sin(uT * 2.2 + vP.x * 1.3) ; gl_FragColor = vec4(mix(uC, vec3(1.), .5) * 2.2 * f * uA, 1.); }`, SA)); group.add(seam);
  /* 열렸을 때 안에서 쏟아지는 빛 (위를 보는 판 + 짧은 빛 막) */
  const OA = { uA: { value: 0 } };
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(W - .3, D - .3, 1, 1).rotateX(-Math.PI / 2).translate(x0, cb + SEAM + .03, z0), glowMat(`varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    `uniform vec3 uC; uniform float uA, uT; varying vec2 vU; void main(){ vec2 q = abs(vU - .5) * 2.; float e = (1. - pow(q.x, 6.)) * (1. - pow(q.y, 6.)); gl_FragColor = vec4(mix(uC, vec3(1.), .65) * e * uA * (2.4 + .3 * sin(uT * 9.)), 1.); }`, OA)); group.add(inner);
  const sheet = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.1, 5, 24, 1, true).translate(x0, cb + SEAM + 2.5, z0), glowMat(`varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    `uniform vec3 uC; uniform float uA, uT; varying vec2 vU; void main(){ float s = .55 + .45 * sin(vU.x * 60. + uT * 3.) * sin(vU.x * 23. - uT * 2.); gl_FragColor = vec4(mix(uC, vec3(1.), .4) * pow(1. - vU.y, 2.) * s * uA * .8, 1.); }`, OA)); group.add(sheet);

  /* 봉인 원: 상자 위에 떠서 천천히 돎 · 여섯 조각 = 사슬 여섯 (끊기면 그 조각이 깜빡이다 꺼짐) · 다 끊기면 깨짐 */
  const SEC = { uSec: { value: [1, 1, 1, 1, 1, 1] }, uA: { value: 1 }, uRot: { value: 0 }, uA0: { value: angles[0] } };
  const SY = cb + AX + R + .75, seal = new THREE.Mesh(new THREE.PlaneGeometry(8, 8).rotateX(-Math.PI / 2).translate(x0, SY, z0), glowMat(`varying vec2 vQ; void main(){ vQ = (uv - .5) * 2.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    `uniform vec3 uC; uniform float uA, uT, uRot, uA0; uniform float uSec[6]; varying vec2 vQ;
     float h1(float n){ return fract(sin(n * 91.7) * 43758.5); }
     float ln(vec2 p, vec2 a, vec2 b, float w){ vec2 pa = p - a, ba = b - a; float t = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return smoothstep(w, w * .3, length(pa - ba * t)); }
     void main(){ float r = length(vQ); if (r > 1.) discard; float a = atan(vQ.y, vQ.x);
       float am = a + uRot, k = floor(mod((-a - uA0) / 6.2832 * 6. + .5, 6.)); float sec = uSec[0]; for (int i = 1; i < 6; i++) if (float(i) == k) sec = uSec[i];   /* 이 자리가 어느 사슬 조각인지 (기둥 각도 기준 · 원은 돌아도 조각은 기둥에 붙음) */
       float m = 0.;
       m += smoothstep(.012, .0, abs(r - .97)) + smoothstep(.008, .0, abs(r - .9)) + smoothstep(.006, .0, abs(r - .62)) * .8 + smoothstep(.01, .0, abs(r - .34));   /* 고리 넷 */
       float cell = floor(am / 6.2832 * 36.), fu = fract(am / 6.2832 * 36.), fv = (r - .905) / .06;   /* 바깥 띠: 룬 36자 (칸마다 다른 획) */
       if (fv > 0. && fv < 1.) { float s1 = h1(cell), s2 = h1(cell + 7.), s3 = h1(cell + 13.);
         m += smoothstep(.16, .05, abs(fu - .5)) * step(.3, s1) + smoothstep(.12, .03, abs(fv - (.25 + .5 * s2))) * step(.25, fu) * step(fu, .75) + smoothstep(.12, .04, abs(fu - fv * (s3 > .5 ? 1. : -1.) - (s3 > .5 ? 0. : 1.))) * step(.6, s3) * .9; }
       mat2 R2 = mat2(cos(uRot), -sin(uRot), sin(uRot), cos(uRot)); vec2 p = R2 * vQ;   /* 안쪽 육각별 (돎) */
       for (int i = 0; i < 6; i++) { float t0 = float(i) * 1.0472, t1 = t0 + 2.0944; m += ln(p, vec2(cos(t0), sin(t0)) * .62, vec2(cos(t1), sin(t1)) * .62, .012) * .9; }
       for (int i = 0; i < 6; i++) { float t0 = float(i) * 1.0472 + .5236; vec2 c = vec2(cos(t0), sin(t0)) * .76; m += smoothstep(.012, .0, abs(length(p - c) - .09)) * .9 + smoothstep(.05, .0, length(p - c)) * .6; }   /* 작은 원 여섯 */
       m += smoothstep(.2, .0, r) * .5 + smoothstep(.012, .0, abs(r - .2)) * .8;
       float fl = sec > .99 ? 1. : sec * (.5 + .5 * step(.5, fract(uT * 9. + k * .37)));   /* 끊긴 조각은 깜빡이다 꺼짐 */
       float halo = smoothstep(1., .85, r) * smoothstep(.25, .9, r) * .07;
       gl_FragColor = vec4(mix(uC, vec3(1.), .35) * (m * 1.25 + halo) * fl * uA * (.85 + .15 * sin(uT * 1.7)), 1.); }`, SEC)); seal.renderOrder = 8; group.add(seal);
  /* 앞 자물쇠 봉인 문양 (작은 원 · 열쇠 구멍 빛) */
  const lock = new THREE.Mesh(new THREE.PlaneGeometry(.95, .95).translate(x0, cb + 2.42, z0 + D / 2 + .2), glowMat(`varying vec2 vQ; void main(){ vQ = (uv - .5) * 2.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    `uniform vec3 uC; uniform float uA, uT; varying vec2 vQ; void main(){ float r = length(vQ), a = atan(vQ.y, vQ.x); if (r > 1.) discard;
      float m = smoothstep(.05, .0, abs(r - .8)) + smoothstep(.04, .0, abs(r - .62)) * step(.5, fract(a / 6.2832 * 12. + uT * .3)) + smoothstep(.12, .0, length(vQ - vec2(0., .12))) * 1.4 + smoothstep(.06, .0, abs(vQ.x)) * step(-.35, vQ.y) * step(vQ.y, .1) * 1.2;
      gl_FragColor = vec4(mix(uC, vec3(1.), .5) * m * uA * (.9 + .2 * sin(uT * 3.)), 1.); }`, { uA: SEC.uA })); group.add(lock);

  /* ── 빛 사슬 여섯 ── 고리를 엇갈려 꿴 사슬 · 처짐 · 기둥에서 상자로 빛이 흘러듦 · 끊기면 고리가 흩어지며 떨어짐 */
  const chains = anchors.map((A, c) => { const B = hooks[c], L = A.distanceTo(B), sag = .6 + L * .05; return { A, B, L, sag, P: t => A.clone().lerp(B, t).add(V(0, -sag * 4 * t * (1 - t), 0)) }; });
  const SP = .46, links = []; chains.forEach((ch, c) => { const n = Math.ceil(ch.L / SP); for (let i = 0; i < n; i++) links.push([c, (i + .5) / n, i]); });
  const NL = links.length, link = new THREE.TorusGeometry(.26, .07, 5, 12); link.scale(1.45, 1, 1);
  const iA = new Float32Array(NL * 3), mats = [], m4 = new THREE.Matrix4(), X = V(), Y = V(), Z = V(), up = V(0, 1, 0);
  links.forEach(([c, t, i], k) => { const ch = chains[c], p = ch.P(t), q = ch.P(Math.min(1, t + .01)).sub(ch.P(Math.max(0, t - .01))).normalize(); X.copy(q); Y.crossVectors(q, up).normalize(); Z.crossVectors(X, Y);
    if (i % 2) { const tmp = Y.clone(); Y.copy(Z); Z.copy(tmp).negate(); } m4.makeBasis(X, Y, Z).setPosition(p); mats.push(m4.clone()); iA.set([c, t, i], k * 3); });
  const ig = new THREE.InstancedBufferGeometry().copy(link); ig.instanceCount = NL; ig.setAttribute('aI', new THREE.InstancedBufferAttribute(iA, 3));
  const BR = { uBrk: { value: [-1, -1, -1, -1, -1, -1] }, uShake: { value: 0 }, uFlow: { value: 1 } };
  const chainM = new THREE.InstancedMesh(ig, new THREE.ShaderMaterial({ uniforms: { ...U, ...C, ...BR },
    vertexShader: `attribute vec3 aI; uniform float uBrk[6]; uniform float uShake, uT; varying vec3 vP, vN; varying float vT, vB;
      float h1(float n){ return fract(sin(n * 127.1) * 43758.5); }
      void main(){ int c = int(aI.x + .5); float b = -1.; for (int i = 0; i < 6; i++) if (i == c) b = uBrk[i];
        vec3 p = position, n = normal; vT = aI.y; vB = -1.;
        vec4 w = instanceMatrix * vec4(p, 1.); vec3 nn = mat3(instanceMatrix) * n;
        w.xyz += vec3(sin(uT * 23. + aI.z * .9), sin(uT * 19. + aI.z * 1.3), cos(uT * 21. + aI.z)) * .05 * uShake * sin(aI.y * 3.1416);   /* 싸움: 사슬이 팽팽히 떨림 */
        if (b >= 0.) { float snap = .5 + (h1(aI.x * 7.) - .5) * .4, bl = b - abs(aI.y - snap) * .35; vB = bl;   /* 끊긴 자리에서 양쪽으로 차례로 흩어짐 */
          if (bl > 0.) { float s = h1(aI.z + aI.x * 31.), s2 = h1(aI.z * 1.7 + aI.x * 13.); vec3 ctr = (instanceMatrix * vec4(0., 0., 0., 1.)).xyz;
            vec3 v = vec3(s - .5, .4 + s2 * .8, s2 - .5) * 5.; float ang = bl * (4. + s * 8.), ca = cos(ang), sa = sin(ang);   /* 튕겨 나가며 돎 · 떨어짐 */
            vec3 lp = w.xyz - ctr; lp = vec3(lp.x * ca - lp.y * sa, lp.x * sa + lp.y * ca, lp.z); float k = max(0., 1. - bl / 1.6);
            w.xyz = ctr + lp * k + v * bl + vec3(0., -9.8 * bl * bl, 0.); } }
        vP = w.xyz; vN = nn; gl_Position = projectionMatrix * viewMatrix * modelMatrix * w; }`,
    fragmentShader: GL + `uniform vec3 uC; uniform float uFlow; varying vec3 vP, vN; varying float vT, vB;
      void main(){ if (vB > 1.6) discard; vec3 n = normalize(vN); float pulse = pow(fract(vT * 2.6 - uT * .55 * uFlow), 7.);   /* 기둥 → 상자로 흘러드는 빛 */
        vec3 c = lit(vec3(.1, .1, .12), n, 1., .8) + uC * (.42 + .5 * smoothstep(.2, .9, n.y) + 2.4 * pulse) + vec3(1.) * pulse * .5;   /* 어두운 쇠 고리 속으로 빛이 흐름 (흐르는 빛 덩이는 하얗게) */
        if (vB >= 0.) c += vec3(1.) * 3. * exp(-vB * 5.);   /* 끊기는 순간 하얗게 번쩍 */
        gl_FragColor = vec4(fogged(c, vP), 1.); }` }), NL);
  mats.forEach((m, k) => chainM.setMatrixAt(k, m)); chainM.frustumCulled = false; group.add(chainM);
  /* 사슬 둘레 번짐 (얇은 빛 띠 · 늘 카메라를 봄) */
  const HP = [], HT = [], HS = [], HI = []; chains.forEach((ch, c) => { const n = 40, b0 = HP.length / 3; for (let i = 0; i <= n; i++) { const t = i / n, p = ch.P(t), q = ch.P(Math.min(1, t + .02)).sub(ch.P(Math.max(0, t - .02))).normalize(); for (const s of [-1, 1]) { HP.push(p.x, p.y, p.z); HT.push(q.x, q.y, q.z, t); HS.push(s, c); } }
    for (let i = 0; i < n; i++) { const a = b0 + i * 2; HI.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(HP, 3)); hg.setAttribute('aT', new THREE.Float32BufferAttribute(HT, 4)); hg.setAttribute('aS', new THREE.Float32BufferAttribute(HS, 2)); hg.setIndex(HI);
  const halo = new THREE.Mesh(hg, glowMat(`attribute vec4 aT; attribute vec2 aS; uniform float uBrk[6]; varying float vS, vT, vK; void main(){ int c = int(aS.y + .5); float b = -1.; for (int i = 0; i < 6; i++) if (i == c) b = uBrk[i];
      vec3 w = (modelMatrix * vec4(position, 1.)).xyz, sd = normalize(cross(aT.xyz, cameraPosition - w)); vS = aS.x; vT = aT.w; vK = b < 0. ? 1. : max(0., 1. - b * 4.);
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position + sd * aS.x * .55, 1.); }`,
    `uniform vec3 uC; uniform float uT; varying float vS, vT, vK; void main(){ float x = 1. - abs(vS), pulse = pow(fract(vT * 2.6 - uT * .55), 7.); gl_FragColor = vec4(uC * x * x * (.28 + .7 * pulse) * vK, 1.); }`, BR)); halo.frustumCulled = false; group.add(halo);
  /* 기둥 쪽 걸쇠: 기둥 안쪽 면에 빛나는 룬 고리 */
  const anch = new THREE.Mesh(merge(anchors.map((A, c) => { const d = V(x0 - A.x, 0, z0 - A.z).normalize(), g = new THREE.TorusGeometry(.42, .1, 6, 18); g.rotateY(Math.atan2(d.x, d.z)); return at(g, A.x, A.y, A.z); })), mk(BRONZE_F, BRONZE_V, { uM: { value: new THREE.Matrix4() }, ...CU })); anch.frustumCulled = false; group.add(anch);

  /* 불꽃 (사슬이 끊길 때 · 봉인이 깨질 때 · 뚜껑이 열릴 때) */
  const NS = 360, sP = new Float32Array(NS * 3), sV = new Float32Array(NS * 3), sT = new Float32Array(NS).fill(-99); let sk = 0;
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sP, 3)); sg.setAttribute('aV', new THREE.BufferAttribute(sV, 3)); sg.setAttribute('aT0', new THREE.BufferAttribute(sT, 1));
  const sparks = new THREE.Points(sg, new THREE.ShaderMaterial({ uniforms: { ...C, uPx: pxU }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aV; attribute float aT0; uniform float uT, uPx; varying float vA; void main(){ float age = uT - aT0; vA = age < 0. || age > 1.2 ? 0. : 1. - age / 1.2;
      vec3 p = position + aV * age + vec3(0., -7. * age * age, 0.); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = vA > 0. ? uPx * .22 / -mv.z * (.6 + vA) : 0.; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uC; varying float vA; void main(){ vec2 q = gl_PointCoord - .5; float d = dot(q, q); if (d > .25 || vA <= 0.) discard; gl_FragColor = vec4(mix(uC, vec3(1.), .6) * (1. - d * 4.) * vA * 2., 1.); }` }));
  sparks.frustumCulled = false; group.add(sparks);
  const burst = (p, n, spd, t0) => { for (let i = 0; i < n; i++) { const k = sk++ % NS, a = Math.random() * 6.283, e = Math.random() * 2 - .5, s = spd * (.4 + Math.random() * .8);
      sP.set([p.x, p.y, p.z], k * 3); sV.set([Math.cos(a) * s * Math.cos(e), Math.sin(e) * s + spd * .3, Math.sin(a) * s * Math.cos(e)], k * 3); sT[k] = t0; }
    sg.attributes.position.needsUpdate = sg.attributes.aV.needsUpdate = sg.attributes.aT0.needsUpdate = true; };

  /* ── 빛기둥 (다른 게임의 보물 빛처럼) ── 상자 위에서 하늘로 */
  const B0 = V(x0, cb + AX + R + .2, z0), BH = 170, BU = { uW: { value: 1 }, uA: { value: 1 }, uShake: { value: 0 }, uB0: { value: B0 } };
  const beamV = (wid) => `uniform float uW, uShake, uT; uniform vec3 uB0; varying vec2 vU; void main(){ vU = uv; float h = uv.y * ${BH}.;
      vec3 w = (modelMatrix * vec4(uB0, 1.)).xyz, sd = normalize(cross(vec3(0., 1., 0.), cameraPosition - w)); float wid = uW * ${wid} * (1. + .35 * (1. - smoothstep(0., .08, uv.y))) * (1. + uShake * .2 * sin(uT * 31. + uv.y * 40.));
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(uB0 + vec3(0., h, 0.) + sd * (uv.x - .5) * wid, 1.); }`;
  /* 겉 빛 (색 · 넓고 부드러움) */
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 60).translate(0, .5, 0), glowMat(beamV('6.5'), `uniform vec3 uC; uniform float uA, uT; varying vec2 vU; void main(){ float x = abs(vU.x - .5) * 2.;
      float g = exp(-x * x * 5.) * .55 + exp(-x * x * 18.) * .7, fade = smoothstep(0., .015, vU.y) * pow(1. - vU.y, 1.3), wave = .8 + .2 * sin(vU.y * 70. - uT * 4.);
      gl_FragColor = vec4(uC * g * fade * wave * uA, 1.); }`, BU));
  /* 하얀 심지 (아주 밝음 · 위로 흐르는 결) */
  const core = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 60).translate(0, .5, 0), glowMat(beamV('1.1'), `uniform vec3 uC; uniform float uA, uT; varying vec2 vU; void main(){ float x = abs(vU.x - .5) * 2.;
      float g = exp(-x * x * 7.), fade = smoothstep(0., .025, vU.y) * pow(1. - vU.y, .9), streak = .7 + .3 * sin(vU.y * 260. - uT * 14.) * sin(vU.y * 90. - uT * 7.);
      gl_FragColor = vec4(mix(uC, vec3(1.), .78) * g * fade * streak * uA * 2.6, 1.); }`, BU));
  /* 오르는 빛 고리 (다섯 · 위로 갈수록 넓어지며 흐려짐) */
  const rgeo = new THREE.InstancedBufferGeometry().copy(new THREE.RingGeometry(.86, 1, 64).rotateX(-Math.PI / 2)); rgeo.instanceCount = 5; rgeo.setAttribute('aPh', new THREE.InstancedBufferAttribute(new Float32Array([0, .2, .4, .6, .8]), 1));
  const rings = new THREE.Mesh(rgeo, glowMat(`attribute float aPh; uniform float uT, uW, uA; uniform vec3 uB0; varying float vA; varying vec2 vQ; void main(){ float ph = fract(aPh + uT * .28); vA = smoothstep(0., .08, ph) * pow(1. - ph, 1.5) * uA; vQ = position.xz;
      vec3 p = uB0 + vec3(position.x * (1.7 + ph * 2.6) * uW, ph * 34., position.z * (1.7 + ph * 2.6) * uW); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.); }`,
    `uniform vec3 uC; varying float vA; varying vec2 vQ; void main(){ float r = length(vQ), e = 1. - abs(r - .93) / .07; gl_FragColor = vec4(mix(uC, vec3(1.), .4) * e * e * vA * 1.6, 1.); }`, BU));
  /* 감아 오르는 빛 알갱이 */
  const NSP = 110, spA = new Float32Array(NSP * 2); for (let i = 0; i < NSP; i++) spA.set([Math.random(), Math.random()], i * 2);
  const spg = new THREE.BufferGeometry(); spg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NSP * 3), 3)); spg.setAttribute('aS', new THREE.BufferAttribute(spA, 2));
  const spiral = new THREE.Points(spg, new THREE.ShaderMaterial({ uniforms: { ...C, ...BU, uPx: pxU }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec2 aS; uniform float uT, uPx, uW, uA; uniform vec3 uB0; varying float vA; void main(){ float ph = fract(aS.x * 7.31 + uT * (.07 + aS.y * .05)), a = aS.x * 6.283 + ph * 14. + uT * .4, r = (.9 + aS.y * 1.6) * (1. - ph * .55) * uW;
      vec3 p = uB0 + vec3(cos(a) * r, ph * 52., sin(a) * r); vA = sin(ph * 3.1416) * uA; vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = uPx * .26 / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uC; varying float vA; void main(){ vec2 q = gl_PointCoord - .5; float d = dot(q, q); if (d > .25) discard; gl_FragColor = vec4(mix(uC, vec3(1.), .55) * (1. - d * 4.) * vA * 1.8, 1.); }` }));
  /* 상자 위 빛 터짐 (별빛 · 천천히 돎) */
  const FL = { uF: { value: 1 } };
  const flare = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat(`uniform vec3 uB0; uniform float uW, uF; varying vec2 vQ; void main(){ vQ = (uv - .5) * 2.; vec3 w = (modelMatrix * vec4(uB0, 1.)).xyz, f = normalize(cameraPosition - w), sd = normalize(cross(vec3(0., 1., 0.), f)), uu = cross(f, sd);
      float s = (2.2 + 3.2 * (uF - 1.)) * uW; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(uB0 + vec3(0., 1.4, 0.) + (sd * position.x + uu * position.y) * s, 1.); }`,
    `uniform vec3 uC; uniform float uA, uT, uF; varying vec2 vQ; void main(){ float r = length(vQ), a = atan(vQ.y, vQ.x) + uT * .15;
      float ray = pow(abs(cos(a * 2.)), 40.) * (1. - r) * 1.3 + pow(abs(cos(a * 2. + .785)), 60.) * (1. - r) * .6, g = exp(-r * r * 14.) * 1.6 + exp(-r * r * 4.) * .35;
      gl_FragColor = vec4(mix(uC, vec3(1.), .7) * max(0., ray + g) * smoothstep(1., .7, r) * uA * (.45 + .45 * uF), 1.); }`, { ...BU, ...FL }));
  for (const m of [outer, core, rings, spiral, flare]) { m.frustumCulled = false; m.renderOrder = 9; group.add(m); }

  /* ── 상태 ── */
  const brk = BR.uBrk.value, sec = SEC.uSec.value; let left = 6, open = -1, now = 0;
  const lidAt = (ang, jit) => { const piv = V(0, SEAM, -R - .02); lidM.uM.value.makeTranslation(x0, cb, z0).multiply(new THREE.Matrix4().makeTranslation(piv.x, piv.y, piv.z)).multiply(new THREE.Matrix4().makeRotationX(-ang)).multiply(new THREE.Matrix4().makeRotationZ(jit)).multiply(new THREE.Matrix4().makeTranslation(-piv.x, -piv.y, -piv.z)); };
  lidAt(0, 0);
  const snap = c => { if (brk[c] >= 0) return; brk[c] = 0; sec[c] = .999; left--; const ch = chains[c]; burst(ch.P(.5), 50, 6, now); burst(ch.B, 18, 3, now); burst(ch.A, 18, 3, now); };
  const reset = () => { for (let c = 0; c < 6; c++) { brk[c] = -1; sec[c] = 1; } left = 6; open = -1; lidAt(0, 0); SEC.uA.value = 1; OA.uA.value = 0; SA.uA.value = 1; FL.uF.value = 1; };
  /* hp: 0~1 → 남는 사슬 수 (체력 1/6 줄 때마다 하나) */
  const setHP = hp => { const keep = Math.max(0, Math.ceil(hp * 6 - 1e-6)); for (let k = 0; k < 6 - keep; k++) snap(ORDER[k]); };
  /* 쓰러뜨림 차례 (dead: 쓰러뜨린 뒤 흐른 초) */
  let lastLeft = []; const kill = () => { lastLeft = ORDER.filter(c => brk[c] < 0); open = 0; };
  const update = (t, dt, st) => { now = t; SEC.uRot.value = t * .12;
    for (let c = 0; c < 6; c++) if (brk[c] >= 0) { brk[c] += dt; sec[c] = Math.max(0, sec[c] - dt * .9); }
    BR.uShake.value = st === 'fight' ? 1 : 0; BR.uFlow.value = st === 'fight' ? 2.4 : 1;
    let bw = 1, ba = .85, bs = 0;
    if (st === 'fight') { bw = 1.25; ba = 1; bs = 1; }
    if (open >= 0) { open += dt; const o = open;
      lastLeft.forEach((c, i) => { if (o > i * .16) snap(c); });   /* 남은 사슬이 차례로 끊김 */
      const tBreak = lastLeft.length * .16 + .25;   /* 봉인 원이 깨짐 */
      if (o > tBreak && SEC.uA.value === 1) { SEC.uA.value = .999; burst(V(x0, SY, z0), 90, 9, now); }
      if (o > tBreak) SEC.uA.value = Math.max(0, 1.6 * Math.exp(-(o - tBreak) * 6) * (o - tBreak < .08 ? 1 : .6));
      const t1 = tBreak + .35, t2 = t1 + .55, t3 = t2 + .7;   /* 떨림 → 열림 */
      let ang = 0, jit = 0;
      if (o > t1 && o < t2) { const k = (o - t1) / (t2 - t1); jit = Math.sin(o * 70) * .025 * k; ang = Math.max(0, Math.sin(o * 55)) * .04 * k; }
      if (o >= t2) { const k = Math.min(1, (o - t2) / (t3 - t2)), e = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2); ang = 1.95 * e; if (!kill.opened) { kill.opened = true; burst(V(x0, cb + SEAM + .4, z0), 120, 8, now); } }
      lidAt(ang, jit); SA.uA.value = o < t2 ? 1 + (o > t1 ? 1.5 * (o - t1) / (t2 - t1) : 0) : Math.max(0, 1 - (o - t2) * 3);
      OA.uA.value = o < t2 ? 0 : Math.min(1, (o - t2) * 4) * (1 + 1.5 * Math.exp(-(o - t2) * 3));
      const b = o < t2 ? 0 : Math.exp(-(o - t2) * 2.2); bw = 1.15 + 2.6 * b; ba = 1.15 + 2.5 * b; FL.uF.value = 1 + 3 * b;
      kill.burstT = o >= t2 ? o - t2 : -1; }
    else kill.opened = false;
    BU.uW.value += (bw - BU.uW.value) * Math.min(1, dt * 6); BU.uA.value += (ba - BU.uA.value) * Math.min(1, dt * 6); BU.uShake.value = bs; };
  return { C: C.uC.value, update, setHP, kill, reset, get left() { return left; }, get opened() { return kill.opened; }, get burstT() { return open >= 0 ? kill.burstT : -1; }, SY, hooks };
}
