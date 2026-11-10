/* 정글 꾸미기 (사용자 2026-11-08: 정글이 너무 단순함 · 엉성한 발자국·뼈대·뜻 없는 가로줄은 뺌 · 뼈대는 제대로 다시 만들고 그 사이를 지나는 재미)
   ① 땅: 섬 윗면에 완만한 굴곡 + 흙 · 이끼 · 보라 지의류 · 은은하게 빛나는 갈라진 핏줄
   ② 바닥 식물(통과): 외계 풀포기 · 빛나는 버섯 무리 · 말린 고사리 · 이끼 낀 돌 — 종류마다 모양 한 벌, 자리만 여럿 (폰 부담 적게)
   ③ 정글 나무(통과): 꼬인 줄기 + 우산처럼 펼친 잎 + 잎 아래 빛나는 실 — 가장자리 쪽에 숲처럼 몰려 자람
   ④ 화석(막힘): 엎드려 죽은 큰 짐승 — 척추가 기체보다 높게 아치를 이루고 갈비가 양옆 땅에 박힘 → 갈비 사이(약 3m)로 들락날락 · 벌어진 입으로 들어가 목 아래를 지나 갈비 굴로
   모든 크기는 실제 미터 (섬 크기와 상관없이 기체 기준으로 맞춤) */
import * as THREE from 'three';
import { HC, RIBP, TEETH, boneGeo } from './jbones.js?v=11101236';
import { sanctFlora } from './jsanct.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const rng = seed => { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x, z) => { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), w = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1); return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w; };
export const fbm = (x, z) => vnoise(x, z) * .55 + vnoise(x * 2.1 + 7, z * 2.1 - 3) * .3 + vnoise(x * 4.3 - 5, z * 4.3 + 11) * .15;

/* ── 칠: 정글 조명(KL)을 꼭짓점에서 + 꼭짓점마다 '빛남' 정도(aGlow) · 풀·잎은 위쪽일수록 바람에 흔들림(aSway) ── */
export function dressMat(KL, T, sway, rimK = 1) {   /* rimK: 분홍 가장자리 빛 세기 (뼈는 줄여서 뼈 색이 보이게) */
  return new THREE.ShaderMaterial({ vertexColors: true, side: THREE.DoubleSide, uniforms: { ...KL, uT: T, uRimK: { value: rimK } },
    vertexShader: `attribute float aGlow; attribute float aSway; uniform vec3 uKey, uKeyC, uRim, uRimC, uSky, uGnd, uAmb; uniform float uLift, uT, uRimK; varying vec3 vC;
      void main(){
        #ifdef USE_INSTANCING
          mat4 M = modelMatrix * instanceMatrix;
        #else
          mat4 M = modelMatrix;
        #endif
        vec4 w = M * vec4(position, 1.); vec3 n = normalize(mat3(M) * normal);
        ${sway ? 'float ph = w.x * .37 + w.z * .29; w.xz += vec2(sin(uT * 1.3 + ph), cos(uT * 1.1 + ph * 1.3)) * aSway * .12;' : ''}
        vec3 lit = uKeyC * max(dot(n, uKey), 0.) + uRimC * uRimK * max(dot(n, uRim), 0.) + mix(uGnd, uSky, n.y * .5 + .5) + uAmb;
        float pulse = .8 + .2 * sin(uT * .9 + w.x * .21 + w.z * .17);   /* 빛나는 것은 숨 쉬듯 천천히 (살아 있는 숲) */
        vC = color * lit * uLift + color * aGlow * 1.15 * pulse;
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: 'varying vec3 vC; void main(){ gl_FragColor = linearToOutputTexel(vec4(vC, 1.)); }' });
}

/* ── 모양 쌓기 도우미: 꼭짓점 색·빛남·흔들림을 같이 담아 하나로 합침 ── */
export function Builder() { const P = [], N = [], C = [], G = [], S = [], I = []; let n0 = 0;
  const put = (geo, mat4, colFn, glowFn = () => 0, swayFn = () => 0) => { const g = geo, keep = colFn === 'keep', gc = keep ? g.attributes.color : null; if (!keep) g.computeVertexNormals();   /* keep: 미리 만든 뼈 (빛 방향·색을 그대로) */ const p = g.attributes.position, nn = g.attributes.normal, v = new THREE.Vector3(), nv = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(mat4), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const lv = v.clone(); v.applyMatrix4(mat4); nv.fromBufferAttribute(nn, i).applyMatrix3(nm).normalize(); P.push(v.x, v.y, v.z); N.push(nv.x, nv.y, nv.z); if (keep) c.fromBufferAttribute(gc, i); else colFn(c, v, nv, lv); C.push(c.r, c.g, c.b); G.push(glowFn(v, nv, lv)); S.push(swayFn(v, nv, lv)); }
    if (g.index) for (let i = 0; i < g.index.count; i++) I.push(g.index.getX(i) + n0); else for (let i = 0; i < p.count; i++) I.push(i + n0); n0 += p.count; if (!keep) g.dispose(); };
  const done = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    g.setAttribute('aGlow', new THREE.Float32BufferAttribute(G, 1)); g.setAttribute('aSway', new THREE.Float32BufferAttribute(S, 1)); g.setIndex(I); g.computeBoundingSphere(); return g; };
  return { put, done }; }
export const M4 = (pos, rot, scl) => new THREE.Matrix4().compose(pos || V(0, 0, 0), new THREE.Quaternion().setFromEuler(rot || new THREE.Euler()), scl || V(1, 1, 1));
export const hex = h => new THREE.Color(h);
export const lerpC = (c, a, b, t) => c.copy(a).lerp(b, Math.min(1, Math.max(0, t)));

/* 가늘어지는 관 (모양 곡선 + 굵기 함수) — 갈비·줄기·덩굴·풀잎 공통 */
export function taperTube(pts, r0, r1, seg = 16, rad = 6, flat = 1) { const curve = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(curve, seg, 1, rad, false), p = g.attributes.position;
  const fr = curve.computeFrenetFrames(seg, false), v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) { const u = i / seg, r = r0 + (r1 - r0) * u; curve.getPointAt(u, c);
    for (let j = 0; j <= rad; j++) { const k = i * (rad + 1) + j; v.fromBufferAttribute(p, k).sub(c); const nx = v.dot(fr.normals[i]), bx = v.dot(fr.binormals[i]);
      v.copy(c).addScaledVector(fr.normals[i], nx * r * flat).addScaledVector(fr.binormals[i], bx * r); p.setXYZ(k, v.x, v.y, v.z); } }
  return g; }

/* ─────────────── ② 바닥 식물 · ③ 나무: 종류마다 모양 한 벌 ─────────────── */
export const SOIL = hex('#1a1428'), MOSS = hex('#163638'), MOSS2 = hex('#24564e'), LICH = hex('#2e2348'), GLOWC = hex('#46ffd6'), GLOWM = hex('#ff5ad8'), GLOWV = hex('#a77bff');
function makeTuft(seed) {   /* 풀포기: 굽은 잎 7장 · 밑동 짙은 청록 → 끝 빛나는 청록/보라 */
  const R = rng(seed), b = Builder(), tip = R() < .5 ? GLOWC : GLOWV;
  for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28 + R() * .5, h = .35 + R() * .3, lean = .12 + R() * .2, pts = [V(0, 0, 0), V(Math.cos(a) * lean * .3, h * .45, Math.sin(a) * lean * .3), V(Math.cos(a) * lean, h * .85, Math.sin(a) * lean), V(Math.cos(a) * lean * 1.5, h, Math.sin(a) * lean * 1.5)];
    b.put(taperTube(pts, .03, .004, 4, 2, .35), M4(), (c, v, n, lv) => lerpC(c, hex('#123236'), tip, v.y / h * 1.1), v => Math.max(0, v.y / h - .55) * .9, v => v.y / h); }
  return b.done(); }
function makeShrooms(seed) {   /* 버섯 무리: 3~5개 · 줄기 + 갓(위는 짙은 보라 → 가장자리 빛남 · 아래 주름은 어둡게) + 갓 위 빛 점 */
  const R = rng(seed), b = Builder(), n = 3 + Math.floor(R() * 2), cap = R() < .5 ? GLOWM : GLOWC;
  for (let k = 0; k < n; k++) { const a = R() * 6.28, d = k ? .12 + R() * .22 : 0, h = (k ? .12 + R() * .2 : .3 + R() * .12), cr = h * (.55 + R() * .25), x = Math.cos(a) * d, z = Math.sin(a) * d, tilt = (R() - .5) * .3;
    b.put(taperTube([V(x, 0, z), V(x + tilt * .3 * h, h * .5, z), V(x + tilt * h, h, z)], cr * .22, cr * .16, 3, 4), M4(), c => c.set('#cfc2e6'), () => .05);
    const capG = new THREE.SphereGeometry(cr, 8, 3, 0, 6.2832, 0, Math.PI * .5); capG.scale(1, .55, 1);
    b.put(capG, M4(V(x + tilt * h, h * .96, z), new THREE.Euler(tilt * .6, 0, -tilt * .6)), (c, v, nn, lv) => lerpC(c, hex('#2a1a46'), cap, 1 - lv.y / (cr * .55) * 1.1), (v, nn, lv) => Math.pow(Math.max(0, 1 - lv.y / (cr * .55)), 2) * .9);
    const gill = new THREE.CircleGeometry(cr * .98, 8); gill.rotateX(Math.PI / 2); b.put(gill, M4(V(x + tilt * h, h * .95, z)), c => c.set('#160d24'), () => .15);
    for (let s = 0; s < 2; s++) { const sa = R() * 6.28, sr = cr * (.25 + R() * .45), dot = new THREE.IcosahedronGeometry(cr * .09, 0);
      b.put(dot, M4(V(x + tilt * h + Math.cos(sa) * sr, h * .96 + cr * .55 * Math.sqrt(1 - (sr / cr) ** 2) * .95, z + Math.sin(sa) * sr)), c => c.set('#fff2ff'), () => 1.2); } }
  return b.done(); }
function makeFern(seed) {   /* 말린 고사리: 대가 뻗다가 끝이 소용돌이로 말림 · 줄기 따라 작은 잎 */
  const R = rng(seed), b = Builder();
  for (let k = 0; k < 2; k++) { const a = k / 2 * 6.28 + R(), pts = [], L = .55 + R() * .3; for (let i = 0; i <= 14; i++) { const u = i / 14, up = Math.sin(Math.min(1, u * 1.5) * 1.4) * L, out = u * L * .6, curl = u > .6 ? (u - .6) / .4 : 0, ca = curl * 4.2, cr = .12 * (1 - curl * .7);
      const lx = out + (curl ? Math.sin(ca) * cr : 0), ly = up - (curl ? (1 - Math.cos(ca)) * cr : 0); pts.push(V(Math.cos(a) * lx, ly, Math.sin(a) * lx)); }
    b.put(taperTube(pts, .03, .012, 12, 3), M4(), (c, v) => lerpC(c, hex('#1a3a2c'), hex('#5bd6a0'), v.y / L), v => Math.max(0, v.y / L - .6), v => v.y / L);
    for (let i = 3; i < 11; i += 2) { const p = pts[i], q = pts[i + 1], dir = q.clone().sub(p).normalize(), side = V(-dir.z, 0, dir.x).normalize();
      [1, -1].forEach(sg => { const leaf = new THREE.ConeGeometry(.035, .16 - i * .008, 3); leaf.rotateZ(-Math.PI / 2); b.put(leaf, M4(p.clone().addScaledVector(side, sg * .07), new THREE.Euler(0, Math.atan2(-side.z * sg, side.x * sg), .3)), c => c.set('#2f8f68'), () => .05, () => .6); }); } }
  return b.done(); }
function makeGlints(seed) {   /* 이끼 속 빛 알갱이 무리: 아주 작은 빛 알 7개가 땅에 흩어짐 */
  const R = rng(seed), b = Builder(); for (let k = 0; k < 5; k++) { const a = R() * 6.28, d = Math.sqrt(R()) * .5; b.put(new THREE.IcosahedronGeometry(.025 + R() * .025, 0), M4(V(Math.cos(a) * d, .03, Math.sin(a) * d)), c => c.copy(k % 3 ? GLOWC : GLOWV), () => 1.4); } return b.done(); }
function makePebble(seed) {   /* 이끼 낀 돌: 위쪽만 이끼 · 아래 짙은 돌 */
  const R = rng(seed), g = new THREE.IcosahedronGeometry(.2 + R() * .14, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = .9 + fbm(p.getX(i) * 9 + seed, p.getZ(i) * 9 + p.getY(i) * 7) * .25; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * .72, p.getZ(i) * k); }   /* 둥글게 닳은 돌 */
  const b = Builder(); b.put(g, M4(), (c, v, n) => lerpC(c, hex('#262238'), hex('#1f4440'), n.y * 1.1 - .35 + fbm(v.x * 6, v.z * 6) * .3)); return b.done(); }
function makeTree(seed) {   /* 정글 나무: 꼬인 줄기(뿌리 받침) → 가지 2~3 → 우산 잎(위 짙은 청록 · 아래 빛나는 보라) → 잎 끝에서 늘어진 빛 실 */
  const R = rng(seed), b = Builder(), H = 3.2 + R() * 1.1, lean = (R() - .5) * .5, twist = R() * 6.28;
  const trunk = []; for (let i = 0; i <= 6; i++) { const u = i / 6; trunk.push(V(Math.sin(u * 2.5 + twist) * .18 + lean * u * u, u * H, Math.cos(u * 2.1 + twist) * .18)); }
  b.put(taperTube(trunk, .2, .08, 10, 5), M4(), (c, v) => lerpC(c, hex('#1b1428'), hex('#3b2c58'), v.y / H + fbm(v.x * 5, v.y * 5) * .3), () => 0, v => Math.pow(v.y / H, 2) * .6);
  for (let k = 0; k < 3; k++) { const a = k / 3 * 6.28 + R(); b.put(taperTube([V(0, .35, 0), V(Math.cos(a) * .3, .18, Math.sin(a) * .3), V(Math.cos(a) * .55, -.05, Math.sin(a) * .55)], .09, .03, 4, 3), M4(), c => c.set('#20182e')); }   /* 뿌리 받침 */
  const top = trunk[6], nb = 2 + Math.floor(R() * 2);
  for (let k = 0; k <= nb; k++) { const a = k / (nb + 1) * 6.28 + R() * .6, L = k ? .9 + R() * .6 : 0, from = k ? trunk[4 + (k % 2)] : top, tip = k ? from.clone().add(V(Math.cos(a) * L, .35 + R() * .3, Math.sin(a) * L)) : top;
    if (k) b.put(taperTube([from, from.clone().lerp(tip, .5).add(V(0, .15, 0)), tip], .06, .035, 6, 4), M4(), c => c.set('#2a1f3e'), () => 0, () => .7);
    const cr = (k ? .75 : 1.15) + R() * .3, cap = new THREE.SphereGeometry(cr, 10, 4, 0, 6.2832, 0, Math.PI * .5); cap.scale(1, .32, 1);
    const pc = cap.attributes.position; for (let i = 0; i < pc.count; i++) { const x = pc.getX(i), z = pc.getZ(i), rr = Math.hypot(x, z) / cr, w = Math.sin(Math.atan2(z, x) * 7) * .06 * rr; pc.setY(i, pc.getY(i) + w - rr * rr * .12); }   /* 잎 가장자리가 물결치며 처짐 */
    b.put(cap, M4(tip.clone().add(V(0, .02, 0))), (c, v, n, lv) => lerpC(c, hex('#0f3a40'), hex('#1f6a5c'), lv.y / (cr * .32) + .2), () => 0, () => 1);
    const under = new THREE.CircleGeometry(cr * .96, 10); under.rotateX(Math.PI / 2); b.put(under, M4(tip.clone().add(V(0, -.06, 0))), (c, v, n, lv) => lerpC(c, hex('#2a1450'), GLOWV, Math.hypot(lv.x, lv.z) / cr), (v, n, lv) => Math.hypot(lv.x, lv.z) / cr * .8, () => 1);
    for (let s = 0; s < 5; s++) { const sa = s / 5 * 6.28 + R() * .4, L2 = .4 + R() * .7, p0 = tip.clone().add(V(Math.cos(sa) * cr * .85, -.12, Math.sin(sa) * cr * .85));
      b.put(taperTube([p0, p0.clone().add(V(0, -L2 * .5, 0)), p0.clone().add(V(.03, -L2, .02))], .012, .006, 4, 3), M4(), c => c.copy(GLOWC), () => 1.1, () => 1.3);   /* 빛 실 */
      b.put(new THREE.IcosahedronGeometry(.035, 0), M4(p0.clone().add(V(.03, -L2, .02))), c => c.set('#d8fff6'), () => 1.6, () => 1.4); } }
  return { geo: b.done(), H }; }

/* ── 섬 종류마다 다른 식물 (사용자 2026-11-08: 정글 섬 전체를 퀄리티 있게) ── */
function makeCoralBush(seed) {   /* 산호 덤불(산호 섬): 밑동에서 두세 번 갈라지는 가지 · 끝마다 빛나는 둥근 눈 · 밑은 짙은 남보라 → 끝은 분홍/청록 */
  const R = rng(seed), b = Builder(), tip = R() < .5 ? GLOWM : GLOWC;
  const br = (o, dir, len, rad, d) => { const end = o.clone().addScaledVector(dir, len), mid = o.clone().lerp(end, .5).add(V((R() - .5) * len * .25, 0, (R() - .5) * len * .25));
    b.put(taperTube([o, mid, end], rad, rad * .62, 5, 4), M4(), (c, v) => lerpC(c, hex('#241a3e'), tip, Math.pow(Math.min(1, v.y / .75), 2) * .8), v => Math.pow(Math.min(1, v.y / .8), 3) * .6);
    if (d < 2) { const n = 2 + (R() < .4 ? 1 : 0); for (let k = 0; k < n; k++) { const a = R() * 6.28, nd = dir.clone().add(V(Math.cos(a) * .7, .25, Math.sin(a) * .7)).normalize(); br(end, nd, len * (.6 + R() * .2), rad * .62, d + 1); } }
    else b.put(new THREE.IcosahedronGeometry(rad * 1.9, 0), M4(end), c => c.copy(tip).lerp(hex('#ffffff'), .25), () => 1.3); };
  for (let k = 0; k < 2; k++) br(V((R() - .5) * .15, 0, (R() - .5) * .15), V((R() - .5) * .5, 1, (R() - .5) * .5).normalize(), .32 + R() * .1, .05, 0);
  return b.done(); }
function makeReeds(seed) {   /* 갈대 무리(늪 가): 가는 대 7개가 살짝 휘어 솟고 · 끝에 빛나는 이삭 · 밑에 넓은 잎 */
  const R = rng(seed), b = Builder(), col = R() < .5 ? GLOWC : hex('#b6ff6a');
  for (let k = 0; k < 7; k++) { const a = R() * 6.28, d = Math.sqrt(R()) * .25, x = Math.cos(a) * d, z = Math.sin(a) * d, h = .8 + R() * .6, lx = (R() - .5) * .35, lz = (R() - .5) * .35, top = V(x + lx, h, z + lz);
    b.put(taperTube([V(x, 0, z), V(x + lx * .3, h * .5, z + lz * .3), top], .022, .01, 5, 3), M4(), (c, v) => lerpC(c, hex('#14302c'), hex('#3c7a5c'), v.y / h), () => 0, v => v.y / h * 1.2);
    if (k % 2 === 0) b.put(new THREE.CylinderGeometry(.03, .035, .2, 5), M4(top.clone().add(V(lx * .05, .08, lz * .05))), c => c.copy(col), () => 1.1, () => 1.3); }
  for (let k = 0; k < 3; k++) { const a = R() * 6.28, h = .5 + R() * .3; b.put(taperTube([V(0, 0, 0), V(Math.cos(a) * .15, h * .6, Math.sin(a) * .15), V(Math.cos(a) * .45, h, Math.sin(a) * .45)], .035, .004, 5, 2, .25), M4(), c => c.set('#1f4a3c'), () => 0, v => v.y / h); }
  return b.done(); }
function makeLily(seed) {   /* 물 위 잎(늪): 한쪽이 갈라진 둥근 잎 · 가장자리가 살짝 말려 오름 · 가끔 빛나는 꽃봉오리 */
  const R = rng(seed), b = Builder(), n = 2 + Math.floor(R() * 2);
  for (let k = 0; k < n; k++) { const r = .25 + R() * .25, a = R() * 6.28, d = k ? .3 + R() * .35 : 0, x = Math.cos(a) * d, z = Math.sin(a) * d, g = new THREE.CircleGeometry(r, 14, .35, 5.93); g.rotateX(-Math.PI / 2);
    const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const rr = Math.hypot(P.getX(i), P.getZ(i)) / r; P.setY(i, rr * rr * .05); }
    b.put(g, M4(V(x, .01, z), new THREE.Euler(0, R() * 6.28, 0)), (c, v, nn, lv) => lerpC(c, hex('#123a32'), hex('#2c6e54'), Math.hypot(lv.x, lv.z) / r + fbm(v.x * 9, v.z * 9) * .3 - .2));
    if (k === 0 && R() < .6) for (let q = 0; q < 5; q++) { const pa = q / 5 * 6.28, pet = new THREE.SphereGeometry(.07, 6, 4); pet.scale(.6, 1.4, .6);
      b.put(pet, M4(V(x + Math.cos(pa) * .05, .1, z + Math.sin(pa) * .05), new THREE.Euler(Math.sin(pa) * .5, 0, -Math.cos(pa) * .5)), c => c.copy(GLOWM).lerp(hex('#ffffff'), .2), () => 1.1); } }
  return b.done(); }
function makeBloom(seed) {   /* 꽃 무리(꽃 섬): 줄기 3~5 · 끝에 다섯 꽃잎 잔 (바깥 짙은 보라 → 안쪽 빛나는 분홍) · 가운데 빛 알 · 밑잎 */
  const R = rng(seed), b = Builder(), n = 3 + Math.floor(R() * 3), inC = R() < .6 ? GLOWM : GLOWV;
  for (let k = 0; k < n; k++) { const a = R() * 6.28, d = k ? .08 + R() * .2 : 0, x = Math.cos(a) * d, z = Math.sin(a) * d, h = .25 + R() * .4, lean = V((R() - .5) * .25, 0, (R() - .5) * .25), top = V(x, h, z).add(lean);
    b.put(taperTube([V(x, 0, z), V(x, h * .5, z).addScaledVector(lean, .3), top], .015, .01, 4, 3), M4(), c => c.set('#1e4a3a'), () => 0, v => v.y / h);
    const pr = .07 + R() * .05; for (let q = 0; q < 5; q++) { const pa = q / 5 * 6.28 + k, pet = new THREE.SphereGeometry(pr, 6, 4); pet.scale(.55, .18, 1); pet.translate(0, 0, pr * .9);
      b.put(pet, M4(top.clone().add(V(0, .02, 0)), new THREE.Euler(-.55, Math.PI / 2 - pa, 0, 'YXZ')), (c, v, nn, lv) => lerpC(c, hex('#3a1a5a'), inC, 1 - Math.abs(lv.z - pr * .9) / pr), (v, nn, lv) => (1 - lv.z / (pr * 1.9)) * .7, () => 1); }
    b.put(new THREE.IcosahedronGeometry(pr * .35, 0), M4(top.clone().add(V(0, .05, 0))), c => c.set('#fff0c8'), () => 1.5, () => 1); }
  for (let k = 0; k < 3; k++) { const a = R() * 6.28, L = .22 + R() * .12, leaf = new THREE.SphereGeometry(L, 6, 3); leaf.scale(.35, .08, 1);
    b.put(leaf, M4(V(Math.cos(a) * L * .8, .03, Math.sin(a) * L * .8), new THREE.Euler(0, Math.PI / 2 - a, 0)), c => c.set('#1a4a3a')); }
  return b.done(); }
function makeShards(seed) {   /* 수정 조각(해파리 섬): 밑동에서 바깥으로 기울어 솟은 가는 결정 4~6 · 밑은 어둡고 끝으로 갈수록 빛남 */
  const R = rng(seed), b = Builder(), n = 4 + Math.floor(R() * 3), col = R() < .5 ? GLOWC : GLOWV;
  for (let k = 0; k < n; k++) { const a = k / n * 6.28 + R() * .5, h = (k ? .35 : .7) + R() * .35, tilt = k ? .35 + R() * .3 : (R() - .5) * .2, g = new THREE.OctahedronGeometry(1, 0); g.scale(.06 + h * .06, h / 2, .06 + h * .06); g.translate(0, h / 2, 0);
    b.put(g, M4(V(Math.cos(a) * .06, -.03, Math.sin(a) * .06), new THREE.Euler(Math.sin(a) * tilt, R(), -Math.cos(a) * tilt)), (c, v, nn, lv) => lerpC(c, hex('#1c1a3a'), col, lv.y / h * 1.1), (v, nn, lv) => Math.pow(Math.max(0, lv.y) / h, 2) * 1.2); }
  return b.done(); }

/* ─────────────── ④ 화석: 엎드려 죽은 외계 짐승 (실제 미터 · 땅 높이 0) ───────────────
   뼈 모양은 jbones.js (깎아 만든 진짜 뼈 구조) · 여기선 맞춰 세움:
   꼬리(땅) → 엉덩이 → 갈비 굴(척추 몸통 4.6m · 등 칼날 판이 그 위로) → 목이 내려와 → 머리뼈(가운데 HC m)를 갈라진 턱 두 판이 받쳐 듦 · 입을 한껏 벌린 채
   긴 갈비 NR쌍(기체 높이에서 양옆 3.9m · 사이 3.4m로 드나듦) · 그 사이 짧게 부러진 갈비(기체 위에서 끝남) · 왼쪽 몇 개는 무릎 아래가 부러져 토막이 옆에 */
export const FOSSIL = { SPINE: 4.6, RIBX: 3.9, GAP: 3.4 };
function makeFossil(seed, NR = 4) {
  const R = rng(seed), b = Builder(), S = FOSSIL.SPINE, X = FOSSIL.RIBX, D = FOSSIL.GAP, h = D * (NR - 1) / 2, tl = NR < 4 ? 3.6 : 4.9;
  const zc = [-(h + tl), -(h + tl - 2), -(h + 1.5), -h, -h / 3, h / 3, h, h + 1.9, h + 3.4], yc = [.12, 1.4, 3.6, S, S + .22, S + .18, S, 4.15, HC - .18];
  const curve = new THREE.CatmullRomCurve3(zc.map((z, i) => V(Math.sin(z * .09) * 1.2, yc[i], z)));
  const at = z => { let lo = 0, hi = 1; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (curve.getPointAt(m).z < z) lo = m; else hi = m; } return lo; };
  const frame = (p, t, sc) => { const z = t.clone().normalize(), x = V(0, 1, 0).cross(z).normalize(), y = z.clone().cross(x); return new THREE.Matrix4().makeBasis(x.multiplyScalar(sc), y.multiplyScalar(sc), z.multiplyScalar(sc)).setPosition(p); };
  const put = (k, m) => b.put(boneGeo(k), m, 'keep');
  /* 척추뼈: 꼬리 끝은 작게(가벼운 모양) → 등은 크게 → 목은 목뼈 · 마디마다 조금씩 비틀림(죽어서 흐트러진) */
  const L = curve.getLength(); let s = .15;
  while (s < L - .3) { const u = s / L, p = curve.getPointAt(u), t = curve.getTangentAt(u), zz = p.z, neck = zz > h + .3;
    const sc = zz < -(h + 1.5) ? .38 + .62 * Math.min(1, Math.max(0, (zz + (h + tl)) / (tl - 1.5))) : neck ? 1 - .3 * Math.min(1, (zz - h) / 3.4) : 1.08;
    put(neck ? 'vc' : sc < .62 ? 'vt' : 'vd', frame(p, t, sc).multiply(new THREE.Matrix4().makeRotationZ((R() - .5) * .12))); s += .6 * sc + .06; }
  /* 긴 갈비 · 사이 짧은 갈비 · 부러진 갈비와 토막 */
  const ribs = [];
  for (let k = 0; k < NR; k++) { const z = -h + k * D, bp = curve.getPointAt(at(z));
    for (const sg of [1, -1]) { const broke = sg < 0 && (k === 1 || (k === 3 && R() < .7)); put(broke ? 'ribb' : 'rib', new THREE.Matrix4().makeScale(sg, 1, 1).setPosition(bp.x, bp.y, z)); ribs.push({ z, sg, broke, x0: bp.x, y0: bp.y });
      if (broke) put('ribp', new THREE.Matrix4().makeRotationY(sg > 0 ? 0 : Math.PI).setPosition(bp.x + sg * 4.4, .02, z + .2)); } }
  for (let k = 0; k < NR - 1; k++) for (const f of [.33, .67]) { const z = -h + (k + f) * D, bp = curve.getPointAt(at(z)); for (const sg of [1, -1]) put('ribs', new THREE.Matrix4().makeScale(sg * (.94 + R() * .06), 1, 1).setPosition(bp.x, bp.y, z)); }
  /* 머리뼈 + 갈라진 턱(양쪽) + 이빨 */
  const hp = curve.getPointAt(1), hz = hp.z + 1.45, hm = new THREE.Matrix4().setPosition(hp.x, HC, hz);
  put('skull', hm); put('jaw', hm); put('jaw', hm.clone().multiply(new THREE.Matrix4().makeScale(-1, 1, 1)));
  for (const [x, y, z, Lt, dir] of TEETH) for (const sg of [1, -1]) { const r = new THREE.Matrix4();
    if (dir < 0) r.makeRotationY(sg > 0 ? Math.PI : 0); else r.makeRotationX(Math.PI).premultiply(new THREE.Matrix4().makeRotationY(sg > 0 ? Math.PI : 0));
    r.scale(V(Lt * 1.15, Lt, Lt * 1.15)).setPosition(hp.x + sg * x, HC + y, hz + z); put('tooth', r); }
  /* 위 눈구멍 깊은 곳에 희미한 불씨 (아직 꺼지지 않은 눈) */
  for (const sg of [1, -1]) b.put(new THREE.IcosahedronGeometry(.07, 0), M4(V(hp.x + sg * .72, HC + .36, hz + 1.0)), c => c.copy(GLOWM), () => 2.2);
  /* 덩굴: 긴 갈비 몇 개를 감아 오름 + 작은 빛 잎 */
  for (const r of ribs.filter((r, i) => !r.broke && i % 3 === 0)) { const pts = []; for (let i = 0; i <= 26; i++) { const u = i / 26, f = 8 - u * 4, k = Math.floor(f), w = f - k, a = RIBP[Math.min(8, k)], c2 = RIBP[Math.min(8, k + 1)], px = a[0] + (c2[0] - a[0]) * w, py = a[1] + (c2[1] - a[1]) * w, pz = a[2] + (c2[2] - a[2]) * w;
      pts.push(V(r.x0 + r.sg * (px + Math.cos(u * 18) * .2), Math.max(.05, r.y0 + py), r.z + pz + Math.sin(u * 18) * .24)); }
    b.put(taperTube(pts, .045, .028, 40, 4), M4(), c => c.set('#1f5a3a'), () => 0, () => .3);
    for (let i = 3; i < 26; i += 3) b.put(new THREE.IcosahedronGeometry(.08, 0), M4(pts[i].clone().add(V(0, .05, 0)), null, V(1.4, .4, 1)), c => c.copy(GLOWC), () => .9); }
  const g = b.done(); g.userData.head = V(hp.x, 1.9, hz + 5.2);   /* 입 앞 (기체가 들어가는 자리) */
  const sz1 = hz + 5.2, hd = { x: hp.x };
  /* 바닥 자취: 뼈가 땅에 드리운 자리를 50cm 칸으로 (놓을 자리 찾기 · 풀 안 나게) + 들어가는 입구 자리 */
  const P = g.attributes.position, cells = new Map(); for (let i = 0; i < P.count; i++) { const kx = Math.round(P.getX(i) * 2), kz = Math.round(P.getZ(i) * 2); cells.set(kx + ',' + kz, [kx / 2, kz / 2]); }
  g.userData.cells = [...cells.values()];
  g.userData.hull = hull(g.userData.cells);
  g.userData.mouth = [[hd.x, sz1 + 1.5], [hd.x - 1, sz1 + .8], [hd.x + 1, sz1 + .8], [hd.x, sz1 + 3]];   /* 입 앞 비워 둘 곳 (섬 안 · 막힘 없음) */
  g.userData.sides = []; for (let k = 0; k < NR - 1; k++) { const z = -h + (k + .5) * D; g.userData.sides.push([X + 2.2, z], [-X - 2.2, z]); }   /* 갈비 사이로 드나드는 옆 입구 */
  return g; }
function hull(pts) { const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1)); }

/* 화석 놓을 자리 찾기 (사용자 2026-11-08: 섬 밖으로 삐져나가거나 다른 막히는 것과 겹치지 않게)
   여러 자리 · 방향을 시험해서: 뼈 전체가 섬 가장자리 안쪽 2m · 다른 막히는 것(가시·바위)과 1.5m 이상 · 입 앞과 갈비 옆 입구가 트임
   그중 가운데 싸울 자리를 덜 가리고 가장자리에서 여유 있는 곳 · 맞는 곳이 없으면 null (작은 섬은 안 놓음) */
function fitFossil(geo, outline, Rm, blocks, clear, R) {
  const U = geo.userData, inside = (x, z, m) => Math.hypot(x, z) < outline(Math.atan2(z, x)) - m, freeB = (x, z, m) => { for (const b of blocks) if ((x - b[0]) ** 2 + (z - b[1]) ** 2 < (b[2] + m) ** 2) return false; return true; };
  const cells = U.cells.filter((c, i) => i % 3 === 0), small = Rm < 20, NA = small ? 24 : 16, ST = small ? 1 : 2; let best = null;
  for (let pass = 0; pass < 3 && !best; pass++) {   /* 첫째: 옆 입구까지 트인 곳 · 둘째: 입 앞만 · 셋째(작은 섬): 가장자리 여유 1.2m */
    const HM = pass < 2 ? 2 : 1.2, MM = pass < 2 ? 1 : .4;
    for (let ai = 0; ai < NA; ai++) { const rot = ai / NA * 6.2832 + R() * .2, c = Math.cos(rot), s = Math.sin(rot), tf = (p, x0, z0) => [x0 + p[0] * c + p[1] * s, z0 - p[0] * s + p[1] * c];
      for (let gz = -Rm * .7; gz <= Rm * .7; gz += ST) for (let gx = -Rm * .7; gx <= Rm * .7; gx += ST) { let ok = true, mg = 1e9;
        for (const p of U.hull) { const [x, z] = tf(p, gx, gz), m = outline(Math.atan2(z, x)) - Math.hypot(x, z); if (m < HM) { ok = false; break; } mg = Math.min(mg, m); } if (!ok) continue;
        for (const p of U.mouth) { const [x, z] = tf(p, gx, gz); if (!inside(x, z, MM) || !freeB(x, z, 1.2)) { ok = false; break; } } if (!ok) continue;
        if (!pass) for (const p of U.sides) { const [x, z] = tf(p, gx, gz); if (!inside(x, z, 1) || !freeB(x, z, 1)) { ok = false; break; } } if (!ok) continue;
        let cen = 0; for (const p of cells) { const [x, z] = tf(p, gx, gz); if (!freeB(x, z, 1.5)) { ok = false; break; } if (x * x + z * z < clear * clear) cen++; } if (!ok) continue;
        const sc = -cen * .25 + Math.min(mg, 6) + R() * .5; if (!best || sc > best.sc) best = { sc, x: gx, z: gz, rot }; } } }
  return best; }

/* ─────────────── 섬 하나 꾸미기 ─────────────── */
/* 섬마다 종류별로 한 묶음(같은 모양을 자리만 바꿔 여러 번) → 화면 밖·먼 섬은 통째로 안 그림 */
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
function Bag() { const L = new Map(); return { add(geo, x, y, z, yaw, s, tilt = 0) { if (!L.has(geo)) L.set(geo, []); _q.setFromEuler(_e.set(tilt * .7, yaw, tilt * .4)); L.get(geo).push(_m.compose(V(x, y, z), _q, V(s, s, s)).clone()); },
  build(group, matOf) { for (const [geo, ms] of L) { const m = new THREE.InstancedMesh(geo, matOf(geo), ms.length); ms.forEach((mm, i) => m.setMatrixAt(i, mm)); m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); group.add(m); } } }; }

/* 섬 윗면 덮개: 완만한 굴곡 + 색 (흙 · 이끼 · 지의류 · 빛나는 핏줄) — 원래 평평한 윗면 바로 위에 덮어 씀
   outline(a) = 그 방향 가장자리까지(미터) · 가운데 clear(미터)는 싸울 자리로 더 평평하게 */
function groundCap(outline, Rm, seed, clear, hole) {
  const Hm = hole ? hole(0) : 0, b = Builder(), SPc = .7, NR = Math.max(hole ? 2 : 4, Math.round((Rm - Hm) / SPc)), pos = [], idx = [], col = [], glw = [], c = new THREE.Color(), ox = seed * .37, oz = seed * .61;
  const hAt = (x, z) => { const r = Math.hypot(x, z), a = Math.atan2(z, x), e = Math.min(1, Math.max(0, (outline(a) * .97 - r) / 2.2)) * (hole ? Math.min(1, Math.max(0, (r - hole(a)) / 1.5)) : 1), f = clear ? Math.min(1, Math.max(.25, (r - clear) / 4)) : 1; return (fbm(x * .09 + ox, z * .09 + oz) - .35) * .9 * Math.min(1, Rm / 10) * e * f + .06; };
  const rings = []; for (let i = 0; i <= NR; i++) { const f = i / NR, nseg = Math.max(6, Math.round((Hm + (Rm - Hm) * f) * 6.28 / SPc)), ring = [];
    for (let j = 0; j < nseg; j++) { const a = j / nseg * 6.2832, r = hole ? hole(a) + (outline(a) * .97 - hole(a)) * f : outline(a) * .97 * f, x = Math.cos(a) * r, z = Math.sin(a) * r, y = i === NR || (hole && i === 0) ? .04 : hAt(x, z);
      const m = fbm(x * .18 + ox + 9, z * .18 + oz), l = fbm(x * .11 - 4 + ox, z * .11 + 7), vein = Math.abs(fbm(x * .07 + 31 + ox, z * .07 - 17) - .5);
      lerpC(c, SOIL, MOSS, (m - .48) * 2.2); if (l > .6) c.lerp(LICH, Math.min(.7, (l - .6) * 2.5)); let gl = 0;   /* 흙 → 이끼 → 보라 지의류: 경계가 부드럽게 번짐 */
      /* 빛나는 것은 땅 색에 넣지 않음 (꼭짓점 색으로는 각진 조각처럼 보임) → 이끼 속 빛 알갱이는 따로 작은 알로 */
      ring.push(pos.length / 3); pos.push(x, y, z); col.push(c.r, c.g, c.b); glw.push(gl); } rings.push(ring); }
  for (let i = 0; i < NR; i++) { const A = rings[i], B2 = rings[i + 1], na = A.length, nb = B2.length; let ia = 0, ib = 0;
    while (ia < na || ib < nb) { const ta = (ia + .5) / na, tb = (ib + .5) / nb; if (ib >= nb || (ia < na && ta < tb)) { idx.push(A[ia % na], B2[ib % nb], A[(ia + 1) % na]); ia++; } else { idx.push(A[ia % na], B2[ib % nb], B2[(ib + 1) % nb]); ib++; } } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('aGlow', new THREE.Float32BufferAttribute(glw, 1)); g.setAttribute('aSway', new THREE.Float32BufferAttribute(new Float32Array(glw.length), 1));
  g.setIndex(idx); g.computeVertexNormals(); { const n = g.attributes.normal; for (let i = 0; i < n.count; i++) if (n.getY(i) < 0) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i)); }   /* 윗면은 늘 위를 봄 */
  return { geo: g, hAt }; }

/* 사냥터 섬 꾸미기: 땅 덮개 + 바닥 식물 + 가장자리 숲 + 화석 · 돌려주는 solid = 막힘 계산에 넣을 화석 */
export function makeDresser(scene, KL) {
  const T = { value: 0 }, mat = dressMat(KL, T, false), matS = dressMat(KL, T, true), matB = dressMat(KL, T, false, .35), solids = [];
  const P = { tuft: [0, 1, 2].map(i => makeTuft(11 + i * 7)), shroom: [0, 1, 2].map(i => makeShrooms(31 + i * 5)), fern: [0, 1].map(i => makeFern(51 + i * 9)), pebble: [0, 1, 2].map(i => makePebble(71 + i * 3)), glint: [0, 1].map(i => makeGlints(81 + i)) };
  const TREES = [0, 1, 2].map(i => makeTree(91 + i * 13).geo), SWAY = new Set([...P.tuft, ...P.fern, ...TREES]), matOf = g => SWAY.has(g) ? matS : mat, isles = [];

  /* ── 성소 식물 (사용자 2026-11-09: 정글 식물을 보물 성소에 있는 식물로 · 기존은 퀄리티가 낮음) ──
     성소 원본의 외계 나무(꼬인 줄기 + 층층 고사리 잎 지붕 + 꼬투리) · 고사리 무리 · 넓은 잎 · 풀잎을 그대로 불러 씀
     묶음(칸)마다 잎 종류별로 한 번에 그림 · 풀잎·작은 잎·꼬투리는 가까이에서만 */
  const FLO = sanctFlora(), FL_NEAR = new Set(['blade', 'fern', 'broadS', 'pod', 'pod2']);
  const Flo = () => ({ inst: {}, bark: [] });
  const floAdd = (acc, out) => { for (const k of Object.keys(out.inst)) { if (!out.inst[k].length) continue; (acc.inst[k] = acc.inst[k] || []).push(...out.inst[k]); } acc.bark.push(...out.bark); };
  const floTree = (acc, x, y, z, sc) => floAdd(acc, FLO.run(() => FLO.tree(FLO.P(x, y, z), sc)));
  const floFern = (acc, x, y, z, sc, k) => floAdd(acc, FLO.run(() => FLO.fern(FLO.P(x, y, z), sc, k)));
  const floBroad = (acc, x, y, z, sc) => floAdd(acc, FLO.run(() => FLO.broad(FLO.P(x, y, z), sc)));
  const floGrass = (acc, x, y, z, r, n) => floAdd(acc, FLO.run(() => FLO.grass(FLO.P(x, y, z), r / FLO.K, n)));
  const floBuild = (acc, near, far) => { for (const k of Object.keys(acc.inst)) { const L = acc.inst[k]; if (!L.length) continue; const im = new THREE.InstancedMesh(FLO.geo(k), FLO.mat(k), L.length);
      L.forEach((o, i) => { im.setMatrixAt(i, o.m); im.setColorAt(i, o.c || new THREE.Color(1, 1, 1)); }); im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); (FL_NEAR.has(k) ? near : far).add(im); }
    if (acc.bark.length) { const parts = acc.bark.map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); if (!g.attributes.normal) g.computeVertexNormals(); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g.index ? g : g.toNonIndexed(); });
      const ix = parts.filter(g => g.index), nx = parts.filter(g => !g.index), add = L => { if (!L.length) return; const mg = mergeGeometries(L, false); if (mg) { const m = new THREE.Mesh(mg, FLO.barkMat()); far.add(m); } }; add(ix); add(nx); } };
  const fossilGeo = makeFossil(7), fossilS = makeFossil(13, 3);   /* 큰 것(갈비 4쌍) · 작은 섬용(3쌍) */
  /* piece: 놓인 정글 조각 (x,y,z 땅 높이 · yaw) · outlineK: 조각 바깥선(키트 단위 함수) · s: 조각 배율 · opt.block: 조각 위 막히는 것 [x,z,반지름](키트 단위) */
  const hunt = (piece, outlineK, s, seed, opt = {}) => {
    const R = rng(seed), Rm = opt.Rm || 38 * s, cy = Math.cos(piece.yaw || 0), sy = Math.sin(piece.yaw || 0), grp = new THREE.Group(), bag = Bag(); scene.add(grp); isles.push({ grp, x: piece.x, y: piece.y, z: piece.z, r: Rm });
    const toW = (lx, lz) => [piece.x + lx * cy + lz * sy, piece.z - lx * sy + lz * cy];
    const OL = a => outlineK(a) * s, HO = opt.hole || 0, clear = Rm * .3, cap = groundCap(OL, Rm, seed % 97, HO ? 0 : clear, HO ? () => HO : null), capMesh = new THREE.Mesh(cap.geo, mat);
    capMesh.position.set(piece.x, piece.y, piece.z); capMesh.rotation.y = piece.yaw || 0; grp.add(capMesh);
    const ground = (lx, lz) => piece.y + cap.hAt(lx, lz);
    const blocks = (opt.block || []).map(b => [b[0] * s, b[1] * s, b[2] * s]);
    /* 화석: 맞는 자리를 찾아서 (큰 것 → 안 되면 작은 것 → 그래도 안 되면 안 놓음) */
    const occ = new Set(), ok = (x, z) => occ.has(Math.round(x) + ',' + Math.round(z));   /* 뼈가 차지한 1m 칸 (풀·나무 안 나게) */
    if (opt.fossil !== false) for (const geo of [fossilGeo, fossilS]) { const f = fitFossil(geo, OL, Rm, blocks, clear, R); if (!f) continue;
      const fm = new THREE.Mesh(geo, matB), [wx, wz] = toW(f.x, f.z); fm.position.set(wx, piece.y + Math.min(cap.hAt(f.x, f.z), .1) - .12, wz); fm.rotation.y = (piece.yaw || 0) + f.rot; grp.add(fm); fm.updateMatrixWorld(true);
      solids.push(fm); fm.userData.head = geo.userData.head.clone().applyMatrix4(fm.matrixWorld); fm.userData.fit = f;
      const c = Math.cos(f.rot), s2 = Math.sin(f.rot); for (const p of geo.userData.cells) { const x = f.x + p[0] * c + p[1] * s2, z = f.z - p[0] * s2 + p[1] * c; for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) occ.add((Math.round(x) + dx) + ',' + (Math.round(z) + dz)); }
      break; }
    const inFossil = ok;
    const spot = (fMin, fMax) => { const a = R() * 6.2832, f = Math.sqrt(fMin * fMin + R() * (fMax * fMax - fMin * fMin)), r = HO ? HO + .6 + (outlineK(a) * s - HO - .6) * f : outlineK(a) * s * f; return [Math.cos(a) * r, Math.sin(a) * r, f]; };   /* hole: 가운데 바닥(성소)은 비움 */
    const nearB = (x, z, m) => blocks.some(b => (x - b[0]) ** 2 + (z - b[1]) ** 2 < (b[2] + m) ** 2);
    const plant = (pl, lx, lz, sc, tilt = 0) => { if (inFossil(lx, lz) || nearB(lx, lz, 0)) return; const [wx, wz] = toW(lx, lz); bag.add(pl[Math.floor(R() * pl.length)], wx, ground(lx, lz) - .03, wz, R() * 6.28, sc, tilt); };
    const area = Math.PI * Rm * Rm;
    const flo = Flo(), okF = (x, z) => !inFossil(x, z) && !nearB(x, z, 0), wy = (x, z) => ground(x, z) - .03, at = (x, z, f) => { const [wx, wz] = toW(x, z); f(wx, wy(x, z), wz); };
    for (let i = 0, n = Math.round(area / 14); i < n; i++) { const [x, z, f] = spot(.05, .93); if ((f < .28 && R() < .7) || !okF(x, z)) continue; at(x, z, (a, b, c) => floGrass(flo, a, b, c, .7 + R() * .5, 10)); }   /* 풀잎: 싸울 자리 가운데는 드문드문 */
    for (let i = 0, n = Math.round(area / 45); i < n; i++) { const [x, z] = spot(.3, .9); if (!okF(x, z)) continue; at(x, z, (a, b, c) => floBroad(flo, a, b, c, .55 + R() * .45)); }
    for (let i = 0, n = Math.round(area / 30); i < n; i++) { const [x, z] = spot(.35, .92); if (!okF(x, z)) continue; at(x, z, (a, b, c) => floFern(flo, a, b, c, .7 + R() * .6, R() < .5 ? 'fern' : 'frondA')); }
    for (let i = 0, n = Math.round(area / 9); i < n; i++) { const [x, z] = spot(.08, .93); if (fbm(x * .18 + (seed % 97) * .37 + 9, z * .18 + (seed % 97) * .61) > .55) plant(P.glint, x, z, .8 + R() * .8); }   /* 이끼 자리에만 빛 알갱이 */
    for (let i = 0, n = Math.round(area / 45); i < n; i++) { const [x, z] = spot(.1, .95); plant(P.pebble, x, z, .6 + R() * 1.1, (R() - .5) * .5); }
    /* 가장자리 숲: 몇 군데에 몰려 자람 (숲 사이로 하늘이 트이게) */
    const groves = 4 + Math.floor(Rm / 8); for (let g = 0; g < groves; g++) { const ga = R() * 6.28, gf = .68 + R() * .2, [gx, gz] = [Math.cos(ga) * outlineK(ga) * s * gf, Math.sin(ga) * outlineK(ga) * s * gf], nT = 6 + Math.floor(R() * 4);   /* 숲 덩이를 더 빽빽이 → 그 안은 숨을 곳 (사용자 2026-11-08) */
      { const [hx, hz] = toW(gx, gz), m = new THREE.Object3D(); m.position.set(hx, ground(gx, gz), hz); m.userData.hideR = 3.4; m.name = 'hide'; grp.add(m); }
      for (let t = 0; t < Math.max(3, nT - 4); t++) { const x = gx + (R() - .5) * 4.6, z = gz + (R() - .5) * 4.6; if (Math.hypot(x, z) > outlineK(Math.atan2(z, x)) * s * .9 || inFossil(x, z) || nearB(x, z, 1.5)) continue; at(x, z, (a, b, c) => floTree(flo, a, b - .03, c, 1 + R() * .5)); }   /* 성소 외계 나무 */
      for (let k = 0; k < 8; k++) { const x = gx + (R() - .5) * 7, z = gz + (R() - .5) * 7; if (Math.hypot(x, z) < outlineK(Math.atan2(z, x)) * s * .92 && okF(x, z)) at(x, z, (a, b, c) => R() < .6 ? floFern(flo, a, b, c, .8 + R() * .5, R() < .5 ? 'fern' : 'frondB') : floBroad(flo, a, b, c, .6 + R() * .4)); } }
    bag.build(grp, matOf); { const near = new THREE.Group(), far = new THREE.Group(); grp.add(near, far); floBuild(flo, near, far); } };
  /* ─────────── 다른 정글 섬 전부 꾸미기 (사용자 2026-11-08) ───────────
     섬 종류마다 그 섬다운 식물: 뿌리섬=버섯·고사리 · 산호 숲=산호 덤불 · 촉수 숲=버섯 · 늪=가장자리 갈대 + 물 위 잎 · 꽃=꽃 무리 · 해파리=수정 조각 · 문 섬=가장자리 풀 · 작은 조각=빛 알갱이 조금
     + 가까운 섬끼리 늘어진 덩굴(땅보다 아래로 처져 기체를 막지 않음) + 그 아래 옅은 안개
     폰 부담: 48m 칸마다 한 묶음 (땅 덮개는 칸마다 하나로 합침 · 같은 식물은 한 번에) → 작은 풀은 70m · 큰 식물은 115m · 땅·덩굴·안개는 170m 밖이면 안 그림 */
  const Q = { coral: [0, 1].map(i => makeCoralBush(201 + i * 7)), reed: [0, 1].map(i => makeReeds(221 + i * 5)), lily: [0, 1].map(i => makeLily(241 + i * 3)), bloom: [0, 1].map(i => makeBloom(261 + i * 11)), shard: [0, 1].map(i => makeShards(281 + i * 13)) };
  [...Q.reed, ...Q.bloom].forEach(g => SWAY.add(g));
  const CELL = 80, cells = new Map(), LIST = [];   /* 묶음 칸을 크게 (48→80m · 그리기 횟수 줄임 2026-11-09) */
  const cellAt = (x, y, z) => { const k = Math.floor(x / CELL) + ',' + Math.floor(z / CELL) + ',' + Math.round(y / 20); if (!cells.has(k)) cells.set(k, { y, x: 0, z: 0, n: 0, caps: [], near: Bag(), far: Bag(), vine: Builder(), nv: 0, mist: [], flo: Flo() }); return cells.get(k); };
  const KIND = ['root', 'coral', 'tent', 'swamp', 'flower', 'jelly', 'vine'];
  const isle = o => { const t = o.top; if (!t) return; const R = rng(o.seed || 1), s = o.s, Rm = t.r * s, yaw = o.yaw || 0, cy = Math.cos(yaw), sy = Math.sin(yaw), y0 = o.y + t.y * (o.sy || s);
    const OL = a => t.fn(a) * s, hole = t.hole ? a => t.hole(a) * s : null, kind = o.gate ? 'gate' : o.single ? 'single' : KIND[o.kind] || 'root';
    const C = cellAt(o.x, y0, o.z); C.x += o.x; C.z += o.z; C.n++;
    const cap = groundCap(OL, Rm, (o.seed || 1) % 97, 0, hole); cap.geo.applyMatrix4(new THREE.Matrix4().makeRotationY(yaw).setPosition(o.x, y0, o.z)); C.caps.push(cap.geo);
    const toW = (lx, lz) => [o.x + lx * cy + lz * sy, o.z - lx * sy + lz * cy];
    const spot = (f0, f1) => { const a = R() * 6.2832, f = Math.sqrt(f0 * f0 + R() * (f1 * f1 - f0 * f0)), r = hole ? hole(a) + .3 + (OL(a) * .92 - hole(a) - .3) * f : OL(a) * f; return [Math.cos(a) * r, Math.sin(a) * r]; };
    const put = (bag, pl, f0, f1, sc, tilt = 0) => { const [lx, lz] = spot(f0, f1), [wx, wz] = toW(lx, lz); bag.add(pl[Math.floor(R() * pl.length)], wx, y0 + cap.hAt(lx, lz) - .03, wz, R() * 6.28, sc * (.8 + R() * .5), (R() - .5) * tilt); };
    const area = Math.PI * Rm * Rm * (hole ? .3 : 1), k = o.lite ? .35 : 1, n = d => Math.floor(area / d * k + R());
    const N = C.near, F = C.far, rep = (cnt, f) => { for (let i = 0; i < cnt; i++) f(); };
    if (kind === 'gate') { rep(n(9), () => put(N, P.tuft, .55, .93, 1, .3)); rep(n(10), () => put(N, P.glint, .6, .95, 1)); rep(n(45), () => put(N, P.pebble, .5, .95, 1, .5)); }
    else if (kind === 'single') { rep(n(8), () => put(N, P.glint, .2, .85, .9)); rep(n(10), () => put(N, P.tuft, .2, .85, .8, .3)); }
    else {
      const fl = C.flo, fput = (f0, f1, fn) => { const [lx, lz] = spot(f0, f1), [wx, wz] = toW(lx, lz); fn(wx, y0 + cap.hAt(lx, lz) - .03, wz); };   /* 성소 식물 */
      if (!o.lite) { rep(n(kind === 'coral' || kind === 'jelly' ? 30 : 14), () => fput(.05, .93, (a, b, c) => floGrass(fl, a, b, c, .6 + R() * .5, 9))); rep(n(10), () => put(N, P.glint, .05, .95, 1)); rep(n(45), () => put(N, P.pebble, .1, .95, 1, .5)); }
      if (kind === 'root' || kind === 'tent' || kind === 'vine') { rep(n(34), () => fput(.25, .9, (a, b, c) => floBroad(fl, a, b, c, .55 + R() * .45))); if (!o.lite) rep(n(30), () => fput(.3, .92, (a, b, c) => floFern(fl, a, b, c, .7 + R() * .6, R() < .5 ? 'fern' : 'frondA'))); }
      if (!o.lite && (kind === 'root' || kind === 'tent' || kind === 'vine' || kind === 'flower') && area > 40) rep(Math.max(1, n(70)), () => fput(.35, .8, (a, b, c) => floTree(fl, a, b, c, .9 + R() * .55)));   /* 큰 섬엔 외계 나무 몇 그루 */
      if (kind === 'coral') rep(n(7), () => put(F, Q.coral, .1, .9, 1.9, .2));
      if (kind === 'flower') { rep(n(5), () => put(F, Q.bloom, .3, .92, 1.9)); if (!o.lite) rep(n(35), () => fput(.4, .92, (a, b, c) => floFern(C.flo, a, b, c, .7 + R() * .5, 'fern'))); }
      if (kind === 'jelly') { rep(n(5), () => put(F, Q.shard, .1, .9, 1.9, .2)); }
      if (kind === 'swamp') { rep(Math.max(3, n(2)), () => put(F, Q.reed, .1, .9, 1.4)); const py = o.y + t.pool * s;   /* 늪 물 위 잎: 물가 쪽에 몰려 떠 있음 */
        rep(Math.floor(Math.PI * (16 * s) ** 2 / 9 * k), () => { const a = R() * 6.2832, r = t.poolR(a) * s * Math.sqrt(.25 + R() * .75), [wx, wz] = toW(Math.cos(a) * r, Math.sin(a) * r); F.add(Q.lily[Math.floor(R() * 2)], wx, py + .03, wz, R() * 6.28, 1.4 + R() * .8); }); } }
    if (!o.single && !o.lite) LIST.push({ x: o.x, z: o.z, y: y0, rOut: a => OL(a + yaw), layer: o.layer, C, R }); };
  /* 덩굴: 가까운 섬끼리(같은 높이 · 가장자리 사이 1.5~14m) 이어 늘어짐 — 두 가닥이 꼬여 처지고 · 빛 잎 · 가운데서 실이 늘어짐 · 빛의 길(corr) 근처는 뺌 */
  const link = (corr = []) => { const done = new Set(), V3 = THREE.Vector3;
    LIST.forEach((A, ia) => { const cand = [];
      LIST.forEach((B, ib) => { if (ia === ib || A.layer !== B.layer || Math.abs(A.y - B.y) > 1.5) return; const th = Math.atan2(B.z - A.z, B.x - A.x), d = Math.hypot(B.x - A.x, B.z - A.z), g = d - A.rOut(th) - B.rOut(th + Math.PI); if (g > 1.5 && g < 14) cand.push({ ib, th, g }); });
      cand.sort((a, b) => a.g - b.g).slice(0, 2).forEach(({ ib, th, g }) => { const key = Math.min(ia, ib) + '_' + Math.max(ia, ib); if (done.has(key)) return; done.add(key); const B = LIST[ib], R = A.R, ux = Math.cos(th), uz = Math.sin(th);
        const strands = g > 5 ? 2 : 1; for (let k = 0; k < strands; k++) { const off = strands > 1 ? (k ? 1.3 : -1.3) + (R() - .5) * .6 : (R() - .5) * 1.2, ra = A.rOut(th) * .93, rb = B.rOut(th + Math.PI) * .93;
          const p0 = new V3(A.x + ux * ra - uz * off, A.y - .25, A.z + uz * ra + ux * off), p1 = new V3(B.x - ux * rb - uz * off * (.6 + R() * .8), B.y - .25, B.z - uz * rb + ux * off * (.6 + R() * .8)), sag = 1 + g * (.28 + R() * .12);
          const mid = p0.clone().lerp(p1, .5); if (corr.some(c => Math.hypot(c.x - mid.x, c.z - mid.z) < c.r + 2.5)) continue;
          const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14, p = p0.clone().lerp(p1, u); p.y -= sag * Math.sin(Math.PI * u) * (1 - .15 * Math.sin(Math.PI * u * 2)); pts.push(p); }
          const C = A.C, tw = (ph, r) => pts.map((p, i) => p.clone().add(new V3(-uz * Math.cos(i * .9 + ph) * r, Math.sin(i * .9 + ph) * r, ux * Math.cos(i * .9 + ph) * r)));
          C.vine.put(taperTube(tw(0, .09), .085, .07, 28, 5), M4(), (c, v) => lerpC(c, hex('#1c2a2e'), hex('#2f5a46'), fbm(v.x * 2, v.z * 2)), () => 0);
          C.vine.put(taperTube(tw(Math.PI, .09), .06, .05, 28, 4), M4(), c => c.set('#3a2a52'), () => 0);
          for (let i = 1; i < 14; i++) if (R() < .55) { const p = pts[i], leaf = new THREE.SphereGeometry(.13 + R() * .08, 5, 3); leaf.scale(1, .3, .55);
            const lit = R() < .3, lc = lit ? GLOWC : hex('#2c6a52'); C.vine.put(leaf, M4(p.clone().add(new V3(0, .07, 0)), new THREE.Euler(R() - .5, R() * 6, R() - .5)), c => c.copy(lc), () => lit ? 1 : .1); }
          const lo = pts[7]; for (let h = 0; h < 3; h++) { const L = .6 + R() * 1.3, q0 = pts[5 + h * 2].clone(), q1 = q0.clone().add(new V3((R() - .5) * .2, -L, (R() - .5) * .2));   /* 늘어진 빛 실 */
            C.vine.put(taperTube([q0, q0.clone().lerp(q1, .5).add(new V3(.05, 0, 0)), q1], .02, .01, 5, 3), M4(), c => c.copy(GLOWC), () => .9); C.vine.put(new THREE.IcosahedronGeometry(.06, 0), M4(q1), c => c.set('#d8fff6'), () => 1.6); }
          C.nv++; if (R() < .7) C.mist.push([lo.x, lo.y - 1.5 - R() * 2, lo.z, 6 + g * .7 + R() * 4, R() < .5 ? 0 : 1]); } }); });
    /* 큰 섬 밑에도 안개 한 겹 (섬이 구름 위에 떠 있는 느낌) */
    LIST.forEach(A => { if (A.R() < .45) A.C.mist.push([A.x + (A.R() - .5) * 6, A.y - 4 - A.R() * 3, A.z + (A.R() - .5) * 6, 10 + A.rOut(0) * 1.2, A.R() < .5 ? 0 : 1]); }); };
  const mistMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: T },
    vertexShader: `varying vec2 vU; varying vec3 vC; varying float vF; uniform float uT;
      void main(){ vec4 c = modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.); float sc = length(instanceMatrix[0].xyz);
        c.x += sin(uT * .07 + c.z * .05) * 1.5; c.z += cos(uT * .06 + c.x * .05) * 1.5;   /* 아주 천천히 흘러감 */
        vec4 mv = viewMatrix * c; mv.xy += position.xy * sc * vec2(1., .42); vU = position.xy * 2.; vC = instanceColor; vF = (.75 + .25 * sin(uT * .3 + c.x * .1)) * smoothstep(sc * .7, sc * 2., -mv.z);   /* 카메라 가까이 오면 사라짐 (화면을 뿌옇게 가리지 않게) */
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec2 vU; varying vec3 vC; varying float vF; void main(){ float d = length(vU), a = 1. - smoothstep(.0, 1., d); gl_FragColor = linearToOutputTexel(vec4(vC, a * a * .18 * vF)); }` });
  const MISTC = [hex('#6a4cc8'), hex('#2a9aa0')], CELLS = [];
  const mergeGeos = L => { let nv = 0, ni = 0; L.forEach(g => { nv += g.attributes.position.count; ni += g.index.count; }); const g = new THREE.BufferGeometry(), I = new Uint32Array(ni);
    for (const [k, sz] of [['position', 3], ['normal', 3], ['color', 3], ['aGlow', 1], ['aSway', 1]]) { const A = new Float32Array(nv * sz); let o = 0; L.forEach(q => { A.set(q.attributes[k].array, o); o += q.attributes[k].array.length; }); g.setAttribute(k, new THREE.BufferAttribute(A, sz)); }
    let o = 0, b = 0; L.forEach(q => { const ix = q.index.array; for (let i = 0; i < ix.length; i++) I[o + i] = ix[i] + b; o += ix.length; b += q.attributes.position.count; q.dispose(); }); g.setIndex(new THREE.BufferAttribute(I, 1)); g.computeBoundingSphere(); return g; };
  const finish = () => { for (const C of cells.values()) { if (!C.n) continue; const all = new THREE.Group(), near = new THREE.Group(), far = new THREE.Group(); scene.add(all); all.add(near, far);
      all.add(new THREE.Mesh(mergeGeos(C.caps), mat)); C.near.build(near, matOf); C.far.build(far, matOf); floBuild(C.flo, near, far); if (C.nv) all.add(new THREE.Mesh(C.vine.done(), mat));
      if (C.mist.length) { const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mistMat, C.mist.length); C.mist.forEach((q, i) => { m.setMatrixAt(i, _m.makeScale(q[3], q[3], q[3]).setPosition(q[0], q[1], q[2])); m.setColorAt(i, MISTC[q[4]]); }); m.computeBoundingSphere(); m.renderOrder = 2; all.add(m); }
      CELLS.push({ x: C.x / C.n, y: C.y, z: C.z / C.n, all, near, far }); } cells.clear(); };
  /* 먼 섬(130m 밖)은 통째로 안 그림 · 화면 밖은 묶음마다 알아서 빠짐 */
  const update = (t, cam, focY = null) => { T.value = t; if (!cam) return; const off = y => focY != null && Math.abs(y - focY) > 12;   /* 다른 층 꾸미기(풀·덩굴·안개)는 도착 섬에서 안 그림 */ if (globalThis.__HIDE_OTHER) { for (const o of isles) o.grp.visible = false; for (const c of CELLS) c.all.visible = false; return; }   /* 폰 무게 재기: 성소 말고 다 끔 */ for (const o of isles) o.grp.visible = !off(o.y) && Math.hypot(o.x - cam.x, o.z - cam.z) < 105 + o.r;
    for (const c of CELLS) { const d = Math.hypot(c.x - cam.x, c.z - cam.z); c.all.visible = d < 130 && !off(c.y); c.near.visible = d < 72; c.far.visible = d < 110; }   /* 폰 그리기 횟수 (2026-11-09): 보이는 거리 줄임 · 카메라 45°에선 화면 끝이 약 70m */ };
  return { hunt, isle, link, finish, solids, update };
}
