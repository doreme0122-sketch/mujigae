/* 보물 장소의 신비한 느낌 (사용자 2026-11-11: 다섯 가지 모두)
   · 땅속 빛줄기: 돌기둥 밑에서 제단까지 바닥 틈을 따라 흐르는 빛 — 기둥이 모은 힘이 제단으로 흘러든다 (상태 빛 색 · 싸움 때 빨강)
   · 떠 도는 돌 조각: 장소 바깥을 천천히 맴도는 룬 새긴 옛 돌 부스러기 (부서진 면 · 위아래로 느리게 떠오름)
   · 낮게 깔린 안개: 바닥 위 두 겹 · 천천히 흘러감 (맵마다 색)
   · 반딧불: 느리게 떠다니며 깜빡임 (맵마다 색)
   · 비스듬한 빛줄기: 해 쪽에서 장소로 내려오는 옅은 빛 다섯 줄기 (천천히 숨 쉼) */
import * as THREE from 'three';
import { noise2 } from './islefield.js?v=11132340';
import { carvedBlock } from './ruins.js?v=11132340';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rngOf = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

/* x0 z0 gy: 장소 가운데 · angles: 돌기둥 각도 · S/SFRAG: 장소 돌 칠 (떠 도는 돌도 같은 돌) · glow: 상태 빛 색 (Color — 매 프레임 바뀜) */
export function buildMystic({ GL, U, S, SFRAG, pxU, x0, z0, gy, angles, group, glow }) {
  const r = rngOf(4242), add = { blending: THREE.AdditiveBlending, transparent: true, depthWrite: false };
  const MU = { uT: U.uT, uGlow: { value: glow }, uMist: { value: new THREE.Color() }, uFly: { value: new THREE.Color() }, uShaft: { value: new THREE.Color() }, uMistA: { value: .3 }, uRel: { value: -1 } };   /* uRel: 상자가 열린 뒤 흐른 초 (풀려난 힘이 가운데서 바깥으로 초당 14 퍼짐) */

  /* ── 땅속 빛줄기 ── 기둥마다 두 갈래 (구불구불 · 곁가지) · 바닥 높이(안쪽 겹 0.44 · 룬 고리 0.52) 위에 살짝 */
  const LP = [], LA = [], LI = [], floorY = rr => (rr > 19 ? .58 : .5);
  const strip = (pts, w, seed) => { const b = LP.length / 3, n = pts.length;
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[Math.min(n - 1, i + 1)], o = pts[Math.max(0, i - 1)], tx = q[0] - o[0], tz = q[1] - o[1], tl = Math.hypot(tx, tz) || 1, nx = -tz / tl, nz = tx / tl, t = i / (n - 1), ww = w * (1 - .55 * t) + .02;
      for (const s of [-1, 1]) { LP.push(x0 + p[0] + nx * ww * s, gy + floorY(Math.hypot(p[0], p[1])), z0 + p[1] + nz * ww * s); LA.push(s, t, seed); } }
    for (let i = 0; i < n - 1; i++) { const a = b + i * 2; LI.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } };
  angles.forEach((a, k) => { for (let s = 0; s < 2; s++) { const pts = [], off = (s - .5) * .9, ph = k * 3.1 + s * 1.7;
      for (let i = 0; i <= 60; i++) { const t = i / 60, rr = 20.4 - t * 11.4, wig = Math.sin(t * 13 + ph) * .45 + noise2(t * 7 + ph, k) * .55 + off * (1 - t), aa = a + wig / rr; pts.push([Math.cos(aa) * rr, Math.sin(aa) * rr]); }
      strip(pts, .16, k * 2 + s);
      const bi = 18 + Math.floor(r() * 20), bp = pts[bi], ba = Math.atan2(bp[1], bp[0]) + (r() < .5 ? 1 : -1) * (.5 + r() * .5), br = [];   /* 곁가지 (짧은 금) */
      for (let i = 0; i <= 10; i++) { const t = i / 10; br.push([bp[0] + Math.cos(ba) * t * 2.6 + Math.sin(t * 9) * .15, bp[1] + Math.sin(ba) * t * 2.6]); } strip(br, .08, 40 + k * 2 + s); } });
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(LP, 3)); lg.setAttribute('aA', new THREE.Float32BufferAttribute(LA, 3)); lg.setIndex(LI);
  const ley = new THREE.Mesh(lg, new THREE.ShaderMaterial({ uniforms: MU, ...add, polygonOffset: true, polygonOffsetFactor: -4,
    vertexShader: `attribute vec3 aA; varying vec3 vA; void main(){ vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform vec3 uGlow; uniform float uT, uRel; varying vec3 vA; void main(){ float x = abs(vA.x), core = exp(-x * x * 18.), soft = (1. - x) * .35;
      float rr = 20.4 - vA.y * 11.4, rel = uRel < 0. ? 0. : exp(-pow((rr - uRel * 14.) / 1.5, 2.)) * 4. + step(rr, uRel * 14.) * exp(-uRel * .7) * 1.2;   /* 풀려난 힘이 빛줄기를 타고 기둥 쪽으로 거꾸로 달려감 */
      float pulse = pow(fract(vA.y * 1.6 - uT * .22 + vA.z * .37), 10.) * 1.6, fadeEnds = smoothstep(0., .06, vA.y) * smoothstep(1., .9, vA.y);   /* 빛 덩이가 천천히 제단 쪽으로 흘러감 */
      gl_FragColor = vec4(mix(uGlow, vec3(1.), .2 + .3 * min(1., rel)) * (core * (.55 + pulse + rel) + soft * (.3 + pulse * .4 + rel * .5)) * fadeEnds, 1.); }` }));
  ley.renderOrder = 6; group.add(ley);

  /* ── 떠 도는 돌 조각 ── 룬 새긴 옛 돌 부스러기 (위쪽은 부서진 면) · 장소 바깥을 천천히 맴돎 */
  const broke = (g, seed) => { const p = g.attributes.position; let top = -9; for (let i = 0; i < p.count; i++) top = Math.max(top, p.getY(i));
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y > top * .2) { const k = (y - top * .2) / (top * .8); p.setY(i, y - k * (.25 + .9 * Math.max(0, noise2(x * 1.7 + seed, z * 1.9)))); } }   /* 부서진 윗면: 들쭉날쭉 */
    g.computeVertexNormals(); return g; };
  const VAR = [broke(carvedBlock(2.2, 1.4, 1.5, 'runes', .07, 801, .7), 1), broke(carvedBlock(1.5, 1.8, 1.2, 'panel', .06, 802), 2), broke(carvedBlock(2.8, .9, 1.7, 'band', .05, 803), 3)];
  const rocks = [], RN = 12, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = V(1, 1, 1);
  const rmat = new THREE.ShaderMaterial({ uniforms: { ...U, ...S }, side: THREE.DoubleSide,
    vertexShader: `attribute float aGlow; varying vec3 vP, vN; varying float vG; void main(){ vec4 p = instanceMatrix * vec4(position, 1.); vP = p.xyz; vN = mat3(instanceMatrix) * normal; vG = aGlow; gl_Position = projectionMatrix * viewMatrix * modelMatrix * p; }`,
    fragmentShader: GL + SFRAG });
  const inst = VAR.map(g => { const m = new THREE.InstancedMesh(g, rmat, RN / 3); m.frustumCulled = false; group.add(m); return m; });
  for (let i = 0; i < RN; i++) rocks.push({ v: i % 3, j: Math.floor(i / 3), a: i / RN * 6.283 + r() * .3, rr: 26 + r() * 9, y: 3 + r() * 9, w: (.025 + r() * .03) * (r() < .5 ? 1 : -1), ph: r() * 6.28, s: .7 + r() * .7, rx: r() * 6, ry: r() * 6, rz: r() * 6, sp: .1 + r() * .15 });

  /* ── 낮게 깔린 안개 ── 두 겹 · 천천히 흘러감 · 가장자리로 갈수록 옅어짐 */
  for (const [h, k, sp] of [[.95, 1, 1], [2.1, .7, -.7]]) { const mist = new THREE.Mesh(new THREE.CircleGeometry(38, 64).rotateX(-Math.PI / 2).translate(x0, gy + h, z0), new THREE.ShaderMaterial({ uniforms: { ...U, ...MU, uLk: { value: k }, uSp: { value: sp } }, transparent: true, depthWrite: false,
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: GL + `uniform vec3 uMist; uniform float uMistA, uLk, uSp, uRel; varying vec3 vP; void main(){ vec2 p = vP.xz - vec2(${x0.toFixed(2)}, ${z0.toFixed(2)}); float r = length(p) + .01;
        float push = uRel < 0. ? 0. : min(uRel * 14., 30.) * exp(-uRel * .25), clear = uRel < 0. ? 0. : smoothstep(uRel * 14. + 2., uRel * 14. - 6., r) * exp(-uRel * .35); p -= p / r * push * .6;   /* 바람에 안개가 바깥으로 밀려나고 가운데가 걷혔다 천천히 다시 참 */
        float n = fb(p * .07 + vec2(uT * .018, uT * .011) * uSp) * .65 + fb(p * .16 - vec2(uT * .02, -uT * .014) * uSp) * .35, a = smoothstep(.38, .78, n) * smoothstep(38., 22., r) * uMistA * uLk * (1. - clear) * (1. + .8 * (uRel < 0. ? 0. : exp(-pow((r - uRel * 14.) / 3., 2.)) * exp(-uRel * .4)));
        gl_FragColor = vec4(uMist, a); }` })); mist.renderOrder = 5; group.add(mist); }

  /* ── 반딧불 ── 느리게 떠다니며 깜빡임 */
  const NF = 60, fA = new Float32Array(NF * 4); for (let i = 0; i < NF; i++) { const a = r() * 6.283, d = 6 + r() * 24; fA.set([x0 + Math.cos(a) * d, gy + 1 + r() * 7, z0 + Math.sin(a) * d, r()], i * 4); }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NF * 3), 3)); fg.setAttribute('aF', new THREE.BufferAttribute(fA, 4));
  const flies = new THREE.Points(fg, new THREE.ShaderMaterial({ uniforms: { ...MU, uPx: pxU }, ...add,
    vertexShader: `attribute vec4 aF; uniform float uT, uPx; varying float vA; void main(){ float s = aF.w * 40.; vec3 p = aF.xyz + vec3(sin(uT * .23 + s) * 2.2 + sin(uT * .61 + s * 2.) * .7, sin(uT * .31 + s * 1.3) * 1.2, cos(uT * .19 + s) * 2.2 + cos(uT * .53 + s * 1.7) * .7);
      vA = pow(.5 + .5 * sin(uT * (.8 + aF.w) + s), 4.); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = uPx * .11 / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uFly; varying float vA; void main(){ vec2 q = gl_PointCoord - .5; float d = dot(q, q) * 4.; if (d > 1.) discard; gl_FragColor = vec4(uFly * (exp(-d * 6.) * 1.8 + (1. - d) * .25) * vA, 1.); }` }));
  flies.frustumCulled = false; group.add(flies);

  /* ── 비스듬한 빛줄기 ── 해 쪽에서 내려옴 · 땅 가까이와 하늘 쪽은 흐려짐 · 늘 카메라를 보도록 축을 따라 돎 */
  const SH = []; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283 + .4, d = i ? 6 + r() * 12 : 0; SH.push([x0 + Math.cos(a) * d, gy, z0 + Math.sin(a) * d, 2.2 + r() * 2.6, r()]); }
  const shG = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1, 1, 8).translate(0, .5, 0)); shG.instanceCount = SH.length;
  shG.setAttribute('aS', new THREE.InstancedBufferAttribute(new Float32Array(SH.map(s => [s[0], s[1], s[2], s[3]]).flat()), 4)); shG.setAttribute('aR', new THREE.InstancedBufferAttribute(new Float32Array(SH.map(s => s[4])), 1));
  const shafts = new THREE.Mesh(shG, new THREE.ShaderMaterial({ uniforms: { ...U, ...MU }, ...add, side: THREE.DoubleSide,
    vertexShader: `attribute vec4 aS; attribute float aR; uniform vec3 uSun; varying vec2 vU; varying float vR; void main(){ vU = position.xy + vec2(.5, 0.); vR = aR; vec3 ax = normalize(uSun), base = aS.xyz;
      vec3 w = (modelMatrix * vec4(base, 1.)).xyz, sd = normalize(cross(ax, cameraPosition - w)); vec3 p = base + ax * position.y * 70. + sd * position.x * aS.w; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.); }`,
    fragmentShader: `uniform vec3 uShaft; uniform float uT; varying vec2 vU; varying float vR; void main(){ float x = min(1., abs(vU.x - .5) * 2.), e = pow(max(0., 1. - x), 1.6),   /* 가장자리 계산이 1을 넘으면 검은 점선이 찍혔음 → 0 아래로 안 내려가게 */ along = smoothstep(0., .08, vU.y) * smoothstep(1., .45, vU.y);
      float br = .55 + .45 * sin(uT * (.25 + vR * .2) + vR * 20.), dust = .85 + .15 * sin(vU.y * 40. - uT * .6 + vR * 9.);
      gl_FragColor = vec4(uShaft * e * along * br * dust * .075, 1.); }` }));
  shafts.frustumCulled = false; shafts.renderOrder = 9; group.add(shafts);

  const setTheme = TH => { MU.uMist.value.setRGB(...TH.mist); MU.uFly.value.setRGB(...TH.fly); MU.uShaft.value.setRGB(...TH.shaft); MU.uMistA.value = TH.mistA; };
  const update = (t, rel = -1) => { MU.uRel.value = rel; const cnt = [0, 0, 0];
    for (const R of rocks) { const a = R.a + t * R.w, y = R.y + Math.sin(t * .45 + R.ph) * .7; e.set(R.rx + t * R.sp * .3, R.ry + t * R.sp, R.rz); q.setFromEuler(e); sc.setScalar(R.s);
      m4.compose(V(x0 + Math.cos(a) * R.rr, gy + y, z0 + Math.sin(a) * R.rr), q, sc); inst[R.v].setMatrixAt(cnt[R.v]++, m4); }
    for (const m of inst) m.instanceMatrix.needsUpdate = true; };
  update(0);
  return { setTheme, update };
}
