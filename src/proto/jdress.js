/* 정글 꾸미기 (사용자 2026-11-08: 정글이 너무 단순함 · 엉성한 발자국·뼈대·뜻 없는 가로줄은 뺌 · 뼈대는 제대로 다시 만들고 그 사이를 지나는 재미)
   ① 땅: 섬 윗면에 완만한 굴곡 + 흙 · 이끼 · 보라 지의류 · 은은하게 빛나는 갈라진 핏줄
   ② 바닥 식물(통과): 외계 풀포기 · 빛나는 버섯 무리 · 말린 고사리 · 이끼 낀 돌 — 종류마다 모양 한 벌, 자리만 여럿 (폰 부담 적게)
   ③ 정글 나무(통과): 꼬인 줄기 + 우산처럼 펼친 잎 + 잎 아래 빛나는 실 — 가장자리 쪽에 숲처럼 몰려 자람
   ④ 화석(막힘): 엎드려 죽은 큰 짐승 — 척추가 기체보다 높게 아치를 이루고 갈비가 양옆 땅에 박힘 → 갈비 사이(약 3m)로 들락날락 · 벌어진 입으로 들어가 목 아래를 지나 갈비 굴로
   모든 크기는 실제 미터 (섬 크기와 상관없이 기체 기준으로 맞춤) */
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rng = seed => { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x, z) => { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), w = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1); return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w; };
const fbm = (x, z) => vnoise(x, z) * .55 + vnoise(x * 2.1 + 7, z * 2.1 - 3) * .3 + vnoise(x * 4.3 - 5, z * 4.3 + 11) * .15;

/* ── 칠: 정글 조명(KL)을 꼭짓점에서 + 꼭짓점마다 '빛남' 정도(aGlow) · 풀·잎은 위쪽일수록 바람에 흔들림(aSway) ── */
function dressMat(KL, T, sway) {
  return new THREE.ShaderMaterial({ vertexColors: true, side: THREE.DoubleSide, uniforms: { ...KL, uT: T },
    vertexShader: `attribute float aGlow; attribute float aSway; uniform vec3 uKey, uKeyC, uRim, uRimC, uSky, uGnd, uAmb; uniform float uLift, uT; varying vec3 vC;
      void main(){
        #ifdef USE_INSTANCING
          mat4 M = modelMatrix * instanceMatrix;
        #else
          mat4 M = modelMatrix;
        #endif
        vec4 w = M * vec4(position, 1.); vec3 n = normalize(mat3(M) * normal);
        ${sway ? 'float ph = w.x * .37 + w.z * .29; w.xz += vec2(sin(uT * 1.3 + ph), cos(uT * 1.1 + ph * 1.3)) * aSway * .12;' : ''}
        vec3 lit = uKeyC * max(dot(n, uKey), 0.) + uRimC * max(dot(n, uRim), 0.) + mix(uGnd, uSky, n.y * .5 + .5) + uAmb;
        float pulse = .8 + .2 * sin(uT * .9 + w.x * .21 + w.z * .17);   /* 빛나는 것은 숨 쉬듯 천천히 (살아 있는 숲) */
        vC = color * lit * uLift + color * aGlow * 1.15 * pulse;
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: 'varying vec3 vC; void main(){ gl_FragColor = linearToOutputTexel(vec4(vC, 1.)); }' });
}

/* ── 모양 쌓기 도우미: 꼭짓점 색·빛남·흔들림을 같이 담아 하나로 합침 ── */
function Builder() { const P = [], N = [], C = [], G = [], S = [], I = []; let n0 = 0;
  const put = (geo, mat4, colFn, glowFn = () => 0, swayFn = () => 0) => { const g = geo.index ? geo : geo; g.computeVertexNormals(); const p = g.attributes.position, nn = g.attributes.normal, v = new THREE.Vector3(), nv = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(mat4), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const lv = v.clone(); v.applyMatrix4(mat4); nv.fromBufferAttribute(nn, i).applyMatrix3(nm).normalize(); P.push(v.x, v.y, v.z); N.push(nv.x, nv.y, nv.z); colFn(c, v, nv, lv); C.push(c.r, c.g, c.b); G.push(glowFn(v, nv, lv)); S.push(swayFn(v, nv, lv)); }
    if (g.index) for (let i = 0; i < g.index.count; i++) I.push(g.index.getX(i) + n0); else for (let i = 0; i < p.count; i++) I.push(i + n0); n0 += p.count; g.dispose(); };
  const done = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    g.setAttribute('aGlow', new THREE.Float32BufferAttribute(G, 1)); g.setAttribute('aSway', new THREE.Float32BufferAttribute(S, 1)); g.setIndex(I); g.computeBoundingSphere(); return g; };
  return { put, done }; }
const M4 = (pos, rot, scl) => new THREE.Matrix4().compose(pos || V(0, 0, 0), new THREE.Quaternion().setFromEuler(rot || new THREE.Euler()), scl || V(1, 1, 1));
const hex = h => new THREE.Color(h);
const lerpC = (c, a, b, t) => c.copy(a).lerp(b, Math.min(1, Math.max(0, t)));

/* 가늘어지는 관 (모양 곡선 + 굵기 함수) — 갈비·줄기·덩굴·풀잎 공통 */
function taperTube(pts, r0, r1, seg = 16, rad = 6, flat = 1) { const curve = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(curve, seg, 1, rad, false), p = g.attributes.position;
  const fr = curve.computeFrenetFrames(seg, false), v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) { const u = i / seg, r = r0 + (r1 - r0) * u; curve.getPointAt(u, c);
    for (let j = 0; j <= rad; j++) { const k = i * (rad + 1) + j; v.fromBufferAttribute(p, k).sub(c); const nx = v.dot(fr.normals[i]), bx = v.dot(fr.binormals[i]);
      v.copy(c).addScaledVector(fr.normals[i], nx * r * flat).addScaledVector(fr.binormals[i], bx * r); p.setXYZ(k, v.x, v.y, v.z); } }
  return g; }

/* ─────────────── ② 바닥 식물 · ③ 나무: 종류마다 모양 한 벌 ─────────────── */
const SOIL = hex('#1a1428'), MOSS = hex('#163638'), MOSS2 = hex('#24564e'), LICH = hex('#2e2348'), GLOWC = hex('#46ffd6'), GLOWM = hex('#ff5ad8'), GLOWV = hex('#a77bff');
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

/* ─────────────── ④ 화석: 엎드려 죽은 큰 짐승 (실제 미터 · 땅 높이 0) ─────────────── */
export const FOSSIL = { SPINE: 4.6, RIBX: 3.9, GAP: 3.4 };   /* 갈비 굴 꼭대기 높이 · 기체 높이(1.9m)에서 갈비 벌어진 폭 · 갈비 간격 */
function boneCol(c, v, n) { const crack = fbm(v.x * 3.1, v.y * 3.1 + v.z * 2.3); lerpC(c, hex('#e4dccb'), hex('#8a8098'), (crack - .45) * 2.2 + (n.y < -.2 ? .35 : 0));
  if (n.y > .55 && fbm(v.x * 1.7 + 4, v.z * 1.7) > .5) c.lerp(MOSS2, .55); }   /* 위로 향한 면에 이끼 */
function makeFossil(seed) {
  const R = rng(seed), b = Builder(), S = FOSSIL.SPINE, X = FOSSIL.RIBX, D = FOSSIL.GAP, NR = 4;
  /* 척추 곡선: 꼬리(땅) → 엉덩이 → 갈비 굴(가장 높음) → 목(내려옴) → 머리 (z축 방향, 살짝 굽음) */
  const zc = [-10, -8, -6.6, -D * 1.5, -D * .5, D * .5, D * 1.5, 6.9, 8.6], yc = [.15, 1.5, 3.7, S, S + .25, S + .2, S, 4.0, 3.2];   /* 꼬리 끝 −10m ~ 주둥이 끝 약 +14.6m */
  const sp = zc.map((z, i) => V(Math.sin(z * .09) * 1.4, yc[i], z)), curve = new THREE.CatmullRomCurve3(sp);
  const at = z => { let lo = 0, hi = 1; for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (curve.getPointAt(m).z < z) lo = m; else hi = m; } return lo; };
  /* 척추뼈 마디: 몸통(납작한 원통) + 위로 솟은 가시 + 양옆 가로 돌기 — 꼬리·목 쪽은 작게 */
  for (let i = 0; i <= 30; i++) { const u = i / 30, p = curve.getPointAt(u), t = curve.getTangentAt(u), sz = .55 + .45 * Math.sin(Math.min(1, u * 1.25) * Math.PI) - (u < .2 ? (.2 - u) * 1.2 : 0), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), t);
    const cen = new THREE.CylinderGeometry(.55 * sz, .6 * sz, .55, 8); b.put(cen, new THREE.Matrix4().compose(p, q, V(1, 1, .8)), boneCol);
    const spn = new THREE.ConeGeometry(.16 * sz, 1.1 * sz, 5); const up = V(0, 1, 0).sub(t.clone().multiplyScalar(t.y)).normalize(); b.put(spn, new THREE.Matrix4().compose(p.clone().addScaledVector(up, .65 * sz), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), up.clone().addScaledVector(t, -.35).normalize()), V(1, 1, 1)), boneCol);
    const side = V(-t.z, 0, t.x).normalize(); [1, -1].forEach(sg => { const tp = new THREE.ConeGeometry(.1 * sz, .7 * sz, 4); tp.rotateZ(-sg * Math.PI / 2); b.put(tp, M4(p.clone().addScaledVector(side, sg * .5 * sz)), boneCol); }); }
  /* 갈비: 척추 꼭대기에서 바깥으로 휘어 내려와 땅에 박힘 (기체 높이에서 양옆으로 RIBX만큼 벌어짐) · 한쪽 몇 개는 부러져 끝이 짧음 */
  const ribs = [];
  for (let k = 0; k < NR; k++) { const z = -D * (NR - 1) / 2 + k * D, u = at(z), base = curve.getPointAt(u);
    [1, -1].forEach(sg => { const broke = sg < 0 && (k === 1 || (k === 3 && R() < .5)), x0 = base.x, pts = [V(x0 + sg * .3, base.y - .05, z), V(x0 + sg * 2.3, base.y + .2, z - .25), V(x0 + sg * (X - .1), 3.1, z - .45), V(x0 + sg * (X + .05), 1.2, z - .5), V(x0 + sg * (X - .45), -.6, z - .4)];
      const use = broke ? pts.slice(0, 4).map((p, i) => i === 3 ? pts[2].clone().lerp(pts[3], .45) : p) : pts;
      b.put(taperTube(use, .4, broke ? .26 : .22, 18, 7, .65), M4(), boneCol); ribs.push({ z, sg, broke });
      if (broke) { const piece = taperTube([V(x0 + sg * (X + .6), .15, z + .3), V(x0 + sg * (X + 1.5), .3, z + .9), V(x0 + sg * (X + 2.3), .1, z + 1.4)], .17, .13, 6, 6, .7); b.put(piece, M4(), boneCol); } }); }   /* 부러진 조각은 옆에 떨어져 있음 */
  /* 머리뼈 (긴 주둥이의 사냥꾼): 정수리 돔은 높이 · 광대 아치 둘이 양옆 · 아래턱은 땅에 벌어져 놓임 → 입으로 날아 들어가 목 아래를 지나 갈비 굴로 */
  const hd = curve.getPointAt(1), fw = V(0, 0, 1);
  /* 머리뼈 (긴 주둥이의 사냥꾼) — 뇌머리 · 눈두덩 · 정수리 볏 · 뒤로 뻗은 뿔과 목 장식 · 콧등 · 옆구멍 · 콧구멍 · 이빨 (정수리·콧등 아래 끝은 약 2.3m: 기체 위) */
  const H0 = 2.75, cz0 = hd.z + 1.2;
  const brain = new THREE.SphereGeometry(1, 18, 12, 0, 6.2832, 0, Math.PI * .58); { const p = brain.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setXYZ(i, x * (1.35 - Math.max(0, z) * .25), y * (1.05 - Math.max(0, -z) * .15), z * 1.75); } }
  b.put(brain, M4(V(hd.x, H0 - .35, cz0)), boneCol);   /* 뇌머리: 뒤는 넓고 앞으로 좁아짐 */
  b.put(taperTube([V(hd.x, H0 + .9, cz0 - 1.8), V(hd.x, H0 + 1.25, cz0 - .4), V(hd.x, H0 + 1.0, cz0 + 1.0)], .09, .05, 10, 4, 3.5), M4(), boneCol);   /* 정수리 볏 (얇은 지느러미) */
  const snoutG = new THREE.CylinderGeometry(.42, 1.0, 4.2, 8, 4, true); snoutG.rotateX(Math.PI / 2); { const p = snoutG.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y > 0 ? y * .62 : y * .38); } }   /* 위는 둥근 콧등 · 아래는 납작한 입천장 */
  b.put(snoutG, M4(V(hd.x, H0 - .05, hd.z + 4.4)), boneCol);
  [1, -1].forEach(sg => {
    b.put(taperTube([V(hd.x + sg * .55, H0 + .55, cz0 + .2), V(hd.x + sg * 1.25, H0 + .7, cz0 + .8), V(hd.x + sg * 1.35, H0 + .45, cz0 + 1.5)], .22, .12, 10, 6, .6), M4(), boneCol);   /* 눈두덩 */
    const sock = new THREE.SphereGeometry(.42, 12, 8); sock.scale(.5, .75, .95); b.put(sock, M4(V(hd.x + sg * .9, H0 + .1, cz0 + 1.05)), c => c.set('#140c1e'));   /* 눈구멍: 깊고 어두운 오목 */
    b.put(new THREE.IcosahedronGeometry(.06, 0), M4(V(hd.x + sg * 1.06, H0 + .08, cz0 + 1.05)), c => c.copy(GLOWM), () => 2.2);   /* 눈구멍 속 희미한 불씨 */
    b.put(taperTube([V(hd.x + sg * 1.2, H0 - .1, cz0 - .1), V(hd.x + sg * 1.62, H0 - .75, cz0 + 1.2), V(hd.x + sg * 1.25, H0 - .35, cz0 + 2.7)], .2, .15, 12, 6, .7), M4(), boneCol);   /* 광대 아치 (입 양옆 · 기체 높이를 지나 막음) */
    const fen = new THREE.SphereGeometry(.34, 10, 6); fen.scale(.3, .55, 1.4); b.put(fen, M4(V(hd.x + sg * .62, H0 - .02, hd.z + 3.6)), c => c.set('#2a2036'));   /* 콧등 옆구멍 */
    b.put(new THREE.SphereGeometry(.12, 8, 6), M4(V(hd.x + sg * .18, H0 + .16, hd.z + 6.35), null, V(1, .6, 1.3)), c => c.set('#2a2036'));   /* 콧구멍 */
    const horn = taperTube([V(hd.x + sg * .85, H0 + .75, cz0 - .9), V(hd.x + sg * 1.35, H0 + 1.7, cz0 - 1.9), V(hd.x + sg * 1.15, H0 + 2.3, cz0 - 3.4), V(hd.x + sg * .75, H0 + 2.25, cz0 - 4.3)], .3, .04, 16, 7); b.put(horn, M4(), boneCol);   /* 뒤로 휜 뿔 */
    for (let k = 0; k < 4; k++) { const sp = taperTube([V(hd.x + sg * (.4 + k * .3), H0 + .2 + k * .12, cz0 - 1.6), V(hd.x + sg * (.6 + k * .42), H0 + .45 + k * .2, cz0 - 2.5 - k * .1)], .1, .02, 4, 4); b.put(sp, M4(), boneCol); } });   /* 목 장식 가시 */
  for (let i = 0; i < 9; i++) { const zz = hd.z + 2.4 + i * .42, xx = (i % 2 ? 1 : -1) * (.9 - i * .05); const tooth = new THREE.ConeGeometry(.08, .38 - i * .018, 5); tooth.rotateX(Math.PI); b.put(tooth, M4(V(hd.x + xx, H0 - .5, zz)), c => c.set('#f2ecff')); }   /* 윗니: 끝 약 2.1m */
  const jaw = taperTube([V(hd.x - 1.15, .45, hd.z + .8), V(hd.x - .7, .35, hd.z + 4.6), V(hd.x, .4, hd.z + 6.0), V(hd.x + .7, .35, hd.z + 4.6), V(hd.x + 1.15, .45, hd.z + .8)], .26, .26, 24, 7, .6); b.put(jaw, M4(), boneCol);   /* 아래턱: 땅에 (위 약 0.7m) */
  for (let i = 0; i < 8; i++) { const zz = hd.z + 2.4 + i * .42, xx = (i % 2 ? 1 : -1) * (.85 - i * .05); b.put(new THREE.ConeGeometry(.08, .38, 5), M4(V(hd.x + xx, .85, zz)), c => c.set('#f2ecff')); }   /* 아랫니: 끝 약 1.05m */
  /* 덩굴: 갈비 몇 개를 감아 오름 + 작은 빛 잎 */
  for (const r of ribs.filter((r, i) => !r.broke && i % 3 === 0)) { const pts = []; for (let i = 0; i <= 26; i++) { const u = i / 26, x = r.sg * (X + .05) + Math.cos(u * 18) * .38 * r.sg, y = .05 + u * 3.6, z = r.z - .45 + Math.sin(u * 18) * .38; pts.push(V(x, y, z)); }
    b.put(taperTube(pts, .05, .03, 40, 4), M4(), c => c.set('#1f5a3a'), () => 0, () => .3);
    for (let i = 3; i < 26; i += 3) { const p = pts[i]; b.put(new THREE.IcosahedronGeometry(.08, 0), M4(p.clone().add(V(0, .05, 0)), null, V(1.4, .4, 1)), c => c.copy(GLOWC), () => .9); } }
  const g = b.done(); g.userData.head = V(hd.x, 2.75, hd.z + 2); return g; }

/* ─────────────── 섬 하나 꾸미기 ─────────────── */
/* 섬마다 종류별로 한 묶음(같은 모양을 자리만 바꿔 여러 번) → 화면 밖·먼 섬은 통째로 안 그림 */
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
function Bag() { const L = new Map(); return { add(geo, x, y, z, yaw, s, tilt = 0) { if (!L.has(geo)) L.set(geo, []); _q.setFromEuler(_e.set(tilt * .7, yaw, tilt * .4)); L.get(geo).push(_m.compose(V(x, y, z), _q, V(s, s, s)).clone()); },
  build(group, matOf) { for (const [geo, ms] of L) { const m = new THREE.InstancedMesh(geo, matOf(geo), ms.length); ms.forEach((mm, i) => m.setMatrixAt(i, mm)); m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); group.add(m); } } }; }

/* 섬 윗면 덮개: 완만한 굴곡 + 색 (흙 · 이끼 · 지의류 · 빛나는 핏줄) — 원래 평평한 윗면 바로 위에 덮어 씀
   outline(a) = 그 방향 가장자리까지(미터) · 가운데 clear(미터)는 싸울 자리로 더 평평하게 */
function groundCap(outline, Rm, seed, clear) {
  const b = Builder(), SPc = .7, NR = Math.max(4, Math.round(Rm / SPc)), pos = [], idx = [], col = [], glw = [], c = new THREE.Color(), ox = seed * .37, oz = seed * .61;
  const hAt = (x, z) => { const r = Math.hypot(x, z), a = Math.atan2(z, x), e = Math.min(1, Math.max(0, (outline(a) * .97 - r) / 2.2)), f = clear ? Math.min(1, Math.max(.25, (r - clear) / 4)) : 1; return (fbm(x * .09 + ox, z * .09 + oz) - .35) * .9 * e * f + .06; };
  const rings = []; for (let i = 0; i <= NR; i++) { const f = i / NR, nseg = Math.max(6, Math.round(f * Rm * 6.28 / SPc)), ring = [];
    for (let j = 0; j < nseg; j++) { const a = j / nseg * 6.2832, r = outline(a) * .97 * f, x = Math.cos(a) * r, z = Math.sin(a) * r, y = i === NR ? .04 : hAt(x, z);
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
  const T = { value: 0 }, mat = dressMat(KL, T, false), matS = dressMat(KL, T, true), solids = [];
  const P = { tuft: [0, 1, 2].map(i => makeTuft(11 + i * 7)), shroom: [0, 1, 2].map(i => makeShrooms(31 + i * 5)), fern: [0, 1].map(i => makeFern(51 + i * 9)), pebble: [0, 1, 2].map(i => makePebble(71 + i * 3)), glint: [0, 1].map(i => makeGlints(81 + i)) };
  const TREES = [0, 1, 2].map(i => makeTree(91 + i * 13).geo), SWAY = new Set([...P.tuft, ...P.fern, ...TREES]), matOf = g => SWAY.has(g) ? matS : mat, isles = [];
  const fossilGeo = makeFossil(7);
  /* piece: 놓인 정글 조각 (x,y,z 땅 높이 · yaw) · outlineK: 조각 바깥선(키트 단위 함수) · s: 조각 배율 */
  const hunt = (piece, outlineK, s, seed, opt = {}) => {
    const R = rng(seed), Rm = 38 * s, cy = Math.cos(piece.yaw || 0), sy = Math.sin(piece.yaw || 0), grp = new THREE.Group(), bag = Bag(); scene.add(grp); isles.push({ grp, x: piece.x, z: piece.z, r: Rm });
    const outline = a => outlineK(a - (piece.yaw || 0) * -1) * s;   /* 조각을 돌린 만큼 */
    const toW = (lx, lz) => [piece.x + lx * cy + lz * sy, piece.z - lx * sy + lz * cy];
    const clear = Rm * .3, cap = groundCap(a => outlineK(a) * s, Rm, seed % 97, clear), capMesh = new THREE.Mesh(cap.geo, mat);
    capMesh.position.set(piece.x, piece.y, piece.z); capMesh.rotation.y = piece.yaw || 0; grp.add(capMesh);
    const ground = (lx, lz) => piece.y + cap.hAt(lx, lz);
    /* 화석: 가운데에서 비켜 놓고 섬 방향에 맞춰 둠 (싸울 자리 가운데는 비움) */
    let fz = null; if (opt.fossil !== false) { const fa = R() * 6.28, fd = Rm < 20 ? Rm * .42 : Rm * .25, rot = fa + Math.PI / 2 + (Rm < 20 ? 0 : (R() - .5) * .6), sh = -2.3;   /* 작은 섬은 가장자리 쪽에 둘레 따라 눕힘 · 가운데 싸울 자리는 비움 */
      const fx = Math.cos(fa) * fd + Math.sin(rot) * sh, fzl = Math.sin(fa) * fd + Math.cos(rot) * sh;
      const fm = new THREE.Mesh(fossilGeo, mat), [wx, wz] = toW(fx, fzl); fm.position.set(wx, piece.y + cap.hAt(fx, fzl) - .1, wz); fm.rotation.y = (piece.yaw || 0) + rot; grp.add(fm); fm.updateMatrixWorld(true); solids.push(fm); fm.userData.head = fossilGeo.userData.head.clone().applyMatrix4(fm.matrixWorld); piece.extra = (piece.extra || []).concat([fm]);
      fz = { x: fx, z: fzl, r: 14, rot }; }
    const inFossil = (lx, lz) => { if (!fz) return false; const dx = lx - fz.x, dz = lz - fz.z, c = Math.cos(fz.rot), s2 = Math.sin(fz.rot), ax = dx * c - dz * s2, az = dx * s2 + dz * c; return Math.abs(ax) < 5.2 && az > -10.5 && az < 15; };
    const spot = (fMin, fMax) => { const a = R() * 6.2832, f = Math.sqrt(fMin * fMin + R() * (fMax * fMax - fMin * fMin)), r = outlineK(a) * s * f; return [Math.cos(a) * r, Math.sin(a) * r, f]; };
    const plant = (pl, lx, lz, sc, tilt = 0) => { const [wx, wz] = toW(lx, lz); bag.add(pl[Math.floor(R() * pl.length)], wx, ground(lx, lz) - .03, wz, R() * 6.28, sc, tilt); };
    const area = Math.PI * Rm * Rm;
    for (let i = 0, n = Math.round(area / 5); i < n; i++) { const [x, z, f] = spot(.05, .93); if (f < .28 && R() < .7) continue; plant(P.tuft, x, z, .8 + R() * .7, (R() - .5) * .3); }   /* 풀포기: 싸울 자리 가운데는 드문드문 */
    for (let i = 0, n = Math.round(area / 40); i < n; i++) { const [x, z, f] = spot(.3, .9); if (inFossil(x, z)) continue; plant(P.shroom, x, z, .9 + R() * 1.3); }
    for (let i = 0, n = Math.round(area / 30); i < n; i++) { const [x, z] = spot(.35, .92); plant(P.fern, x, z, .8 + R() * .8); }
    for (let i = 0, n = Math.round(area / 9); i < n; i++) { const [x, z] = spot(.08, .93); if (fbm(x * .18 + (seed % 97) * .37 + 9, z * .18 + (seed % 97) * .61) > .55) plant(P.glint, x, z, .8 + R() * .8); }   /* 이끼 자리에만 빛 알갱이 */
    for (let i = 0, n = Math.round(area / 45); i < n; i++) { const [x, z] = spot(.1, .95); plant(P.pebble, x, z, .6 + R() * 1.1, (R() - .5) * .5); }
    /* 가장자리 숲: 몇 군데에 몰려 자람 (숲 사이로 하늘이 트이게) */
    const groves = 4 + Math.floor(Rm / 8); for (let g = 0; g < groves; g++) { const ga = R() * 6.28, gf = .68 + R() * .2, [gx, gz] = [Math.cos(ga) * outlineK(ga) * s * gf, Math.sin(ga) * outlineK(ga) * s * gf], nT = 3 + Math.floor(R() * 4);
      for (let t = 0; t < nT; t++) { const x = gx + (R() - .5) * 5, z = gz + (R() - .5) * 5; if (Math.hypot(x, z) > outlineK(Math.atan2(z, x)) * s * .9 || inFossil(x, z)) continue; const [wx, wz] = toW(x, z); bag.add(TREES[Math.floor(R() * TREES.length)], wx, ground(x, z) - .05, wz, R() * 6.28, .85 + R() * .3, (R() - .5) * .15); }
      for (let k = 0; k < 14; k++) { const x = gx + (R() - .5) * 7, z = gz + (R() - .5) * 7; if (Math.hypot(x, z) < outlineK(Math.atan2(z, x)) * s * .92) plant(R() < .5 ? P.fern : P.shroom, x, z, .9 + R() * .8); } }
    bag.build(grp, matOf); };
  /* 먼 섬(130m 밖)은 통째로 안 그림 · 화면 밖은 묶음마다 알아서 빠짐 */
  const update = (t, cam) => { T.value = t; if (cam) for (const o of isles) o.grp.visible = Math.hypot(o.x - cam.x, o.z - cam.z) < 130 + o.r; };
  return { hunt, solids, update };
}
