/* 층 이동 연출 시안 (2026-11-10 · 사용자: 올라가고 내려갈 때 연출이 세로줄 몇 개뿐이라 아쉬움 · 각각 세 가지 만들어 따로 페이지로)
   움직임은 넣지 않음 (사용자: 위아래 움직이는 건 모션을 넣으면 안 됨) — 이동 속도 그대로 곧게(1초에 12m · 한 층 4m) · 기수만 들고 숙임
   올라갈 때: 1 바람 기둥 · 2 추진 잔상 · 3 공기 터짐
   내려갈 때: 1 빨려드는 소용돌이 · 2 공기 가르기 · 3 내려앉는 압력
   기체는 1층 → 2층 → 3층 → 2층 → 1층을 쉬어 가며 되풀이 · 카메라는 게임처럼 기체 높이를 따라감 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11101923';
import { makePerf } from './perf.js?v=11101923';
import { makeForgeShip, forgeList } from './forgeship.js?v=11101923';
import { SUN, reedBush, vegShader } from './flora.js?v=11101923';

const $ = s => document.querySelector(s);
const hash2 = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sm = t => t * t * (3 - 2 * t);
const noise2 = (x, z) => { const i = Math.floor(x), j = Math.floor(z), u = sm(x - i), v = sm(z - j), a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1); return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1; };
const fbm = (x, z, o = 3) => { let s = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { s += a * noise2(x * f + k * 17.3, z * f - k * 9.1); f *= 2.03; a *= .5; } return s; };
const smax = (a, b, k) => { const h = Math.max(0, Math.min(1, .5 + .5 * (a - b) / k)); return b + (a - b) * h + k * h * (1 - h); };
const clamp01 = t => Math.min(1, Math.max(0, t));
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

const LY = [1.2, 5.2, 9.2], SPEED = 12, HOLD = 1.3;   /* 층 높이(땅에서 m · 사용자 2026-11-10: 층 사이 4m) · 이동 속도와 같은 오르내림 속도 · 층마다 쉬는 시간 */
const ORDER = [0, 1, 2, 1];                            /* 1 → 2 → 3 → 2 → (1) 되풀이 */
const THRUST = { fire: 0xff8a2a, ice: 0x7fdcff, thunder: 0xb6a2ff };   /* 추진체 빛: 기체 테마마다 */

const GL = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
float fb(vec2 p){ return vn(p) * .5 + vn(p * 2.07 + 3.1) * .25 + vn(p * 4.11 + 7.7) * .125 + vn(p * 8.3 + 1.3) * .0625; }
uniform vec3 uSun; uniform float uT;
const vec3 SUNC = vec3(1.55, 1.45, 1.28), SKYC = vec3(.50, .62, .80), GNDC = vec3(.20, .22, .12);
vec3 lit(vec3 al, vec3 n, float sh, float ao){ float d = max(dot(n, uSun), 0.); return al * (SUNC * d * sh + mix(GNDC, SKYC, .5 + .5 * n.y) * ao + .05); }
`;
const U = { uSun: { value: SUN }, uT: { value: 0 } };

/* ── 공용 조각 ─────────────────────────────────────────────── */
/* 알갱이 무리: 바람 · 먼지 · 불티. 한 무리 = 한 번 그림. 알갱이마다 속도 · 끌림(공기 저항) · 무게 · 소용돌이(세로 축을 따라 도는 빠르기) · 크기 변화 · 색 */
function Particles(scene, N, additive) {
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-.5, -.5, 0, .5, -.5, 0, .5, .5, 0, -.5, .5, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
  const iP = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3), iC = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4), iS = new THREE.InstancedBufferAttribute(new Float32Array(N), 1);
  [iP, iC, iS].forEach(a => a.setUsage(THREE.DynamicDrawUsage)); g.setAttribute('iP', iP); g.setAttribute('iC', iC); g.setAttribute('iS', iS); g.instanceCount = 0;
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: `attribute vec3 iP; attribute vec4 iC; attribute float iS; varying vec2 vQ; varying vec4 vC; void main(){ vQ = position.xy * 2.; vC = iC; vec4 mv = viewMatrix * vec4(iP, 1.); mv.xy += position.xy * iS; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: additive ? `varying vec2 vQ; varying vec4 vC; void main(){ float r = dot(vQ, vQ); float k = exp(-r * 3.2) + exp(-r * 18.) * .8; gl_FragColor = vec4(vC.rgb * k * vC.a, 1.); }`
      : `varying vec2 vQ; varying vec4 vC; void main(){ float r = dot(vQ, vQ); float k = smoothstep(1., .1, r) * (.75 + .25 * smoothstep(.9, 0., r)); gl_FragColor = vec4(vC.rgb, vC.a * k); }` }));
  m.frustumCulled = false; m.renderOrder = additive ? 9 : 6; scene.add(m);
  const L = [];
  return {
    emit(o) { if (L.length >= N) L.shift(); L.push({ p: o.p.clone(), v: o.v.clone(), drag: o.drag ?? 2, grav: o.grav ?? 0, life: o.life, age: 0, s0: o.s0, s1: o.s1 ?? o.s0, c: o.c, a: o.a ?? 1, sw: o.sw ?? 0, cx: o.cx ?? 0, cz: o.cz ?? 0, out: o.out ?? 0, fadeIn: o.fadeIn ?? .1 }); },
    update(dt) { let n = 0;
      for (let i = L.length - 1; i >= 0; i--) { const q = L[i]; q.age += dt; if (q.age >= q.life) { L.splice(i, 1); continue; } }
      for (const q of L) { const k = Math.exp(-q.drag * dt); q.v.multiplyScalar(k); q.v.y -= q.grav * dt; q.p.addScaledVector(q.v, dt);
        if (q.sw || q.out) { const dx = q.p.x - q.cx, dz = q.p.z - q.cz, a = q.sw * dt, c = Math.cos(a), s = Math.sin(a), ex = 1 + q.out * dt; q.p.x = q.cx + (dx * c - dz * s) * ex; q.p.z = q.cz + (dx * s + dz * c) * ex; }   /* 세로 축을 따라 돌며 퍼짐 */
        const f = q.age / q.life, al = q.a * Math.min(1, f / q.fadeIn) * (1 - f) * (1 - f);
        iP.array.set([q.p.x, q.p.y, q.p.z], n * 3); iC.array.set([q.c[0], q.c[1], q.c[2], al], n * 4); iS.array[n] = q.s0 + (q.s1 - q.s0) * Math.sqrt(f); n++; }
      g.instanceCount = n; iP.needsUpdate = iC.needsUpdate = iS.needsUpdate = true; },
    clear() { L.length = 0; g.instanceCount = 0; } }; }

/* 빛 띠: 세로로 늘어선 점들을 따라 카메라 쪽을 보는 얇은 띠 (꼭짓점마다 투명도) — 추진 잔상 · 감아 오르는 바람 */
function Ribbon(scene, N, col, { core = 4, glow = 1 } = {}) {
  const P = new Float32Array(N * 2 * 3), A = new Float32Array(N * 2), S = new Float32Array(N * 2), idx = [];
  for (let i = 0; i < N; i++) { S[i * 2] = -1; S[i * 2 + 1] = 1; if (i < N - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 3, i * 2, i * 2 + 3, i * 2 + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aA', new THREE.BufferAttribute(A, 1).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aS', new THREE.BufferAttribute(S, 1)); g.setIndex(idx);
  const uC = { value: new THREE.Color(col) };
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { uC, uK: { value: core }, uG: { value: glow } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'attribute float aA, aS; varying float vA, vS; void main(){ vA = aA; vS = aS; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform vec3 uC; uniform float uK, uG; varying float vA, vS; void main(){ float k = exp(-vS * vS * uK) * uG + exp(-vS * vS * uK * 8.) * .9; gl_FragColor = vec4((uC + vec3(.35) * exp(-vS * vS * uK * 8.)) * k * vA, 1.); }' }));
  m.frustumCulled = false; m.renderOrder = 9; scene.add(m);
  const tv = new THREE.Vector3(), sd = new THREE.Vector3(), cv = new THREE.Vector3();
  return { mesh: m, uC,
    /* pts: 점 N개 · w(i): 너비 · a(i): 투명도 · cam: 카메라 자리 */
    set(pts, w, a, cam) { for (let i = 0; i < N; i++) { const p = pts[i], q = pts[Math.min(N - 1, i + 1)], o = pts[Math.max(0, i - 1)]; tv.subVectors(q, o).normalize(); cv.subVectors(cam, p).normalize(); sd.crossVectors(tv, cv).normalize().multiplyScalar(w(i));
        P.set([p.x - sd.x, p.y - sd.y, p.z - sd.z, p.x + sd.x, p.y + sd.y, p.z + sd.z], i * 6); A[i * 2] = A[i * 2 + 1] = a(i); }
      g.attributes.position.needsUpdate = g.attributes.aA.needsUpdate = true; m.visible = true; },
    hide() { m.visible = false; } }; }

/* 소용돌이 깔때기: 열린 원뿔 겉면에 비스듬히 감기는 바람 결이 흐름 (flow +1: 위에서 아래로 · −1: 아래에서 위로) · 가장자리일수록 또렷(공기 막의 두께가 비스듬히 보이는 곳) */
function Funnel(scene, rTop, rBot, h, { flow = 1, twist = 1.3, bands = 5, col = [.86, .94, 1] } = {}) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, 48, 12, true); g.translate(0, -h / 2, 0);   /* 위 끝이 0 (기체 쪽에 붙임) */
  const u = { uT: { value: 0 }, uA: { value: 0 }, uF: { value: flow }, uC: { value: new THREE.Vector3(...col) } };
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vU; varying vec3 vN, vV; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: GL + `uniform float uA, uF; uniform vec3 uC; varying vec2 vU; varying vec3 vN, vV;
      void main(){ float s = 1. - vU.y;                                                             /* 0 = 위 끝 · 1 = 아래 끝 */
        float p = vU.x * ${bands.toFixed(1)} + s * ${twist.toFixed(2)} - uT * 2.6 * uF;            /* 비스듬히 감기며 흐르는 바람 결 */
        float f = fract(p + .25 * fb(vec2(vU.x * 9., s * 4. - uT * 2. * uF))), band = smoothstep(0., .18, f) * smoothstep(.62, .3, f);
        float fine = .6 + .4 * vn(vec2(vU.x * 40., s * 14. - uT * 7. * uF));                        /* 결 안의 잔 바람 */
        float rim = pow(1. - abs(dot(normalize(vN), normalize(vV))), 1.6);
        float ends = smoothstep(0., .12, s) * pow(1. - s, 1.4);
        gl_FragColor = vec4(uC * (band * fine * (.3 + .7 * rim) * 1.5 + .16 * (.4 + .6 * rim)) * ends * uA, 1.); }` }));   /* 결 + 옅은 공기 덩어리(빈 원뿔이 아니라 바람 기둥으로 읽히게) */
  m.frustumCulled = false; m.renderOrder = 8; m.visible = false; scene.add(m);
  return { mesh: m, u }; }

/* 바닥 원반 · 고리: 반지름 · 두께 · 안쪽 채움 · 물결 */
function Disc(scene, { col = [.92, .96, 1], additive = true } = {}) {
  const u = { uR: { value: 1 }, uW: { value: .1 }, uA: { value: 0 }, uFill: { value: 0 }, uRip: { value: 0 }, uT: { value: 0 }, uC: { value: new THREE.Vector3(...col) } };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: 'varying vec2 vU; void main(){ vU = (uv - .5) * 2.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: GL + `uniform float uR, uW, uA, uFill, uRip; uniform vec3 uC; varying vec2 vU;
      void main(){ float r = length(vU) * 6., a = atan(vU.y, vU.x);                                  /* 판 한 변 12m → r은 m */
        float wob = .08 * (fb(vec2(a * 3., uT * 1.5)) - .5) * uR;                                   /* 고리가 고르지 않게 (바람은 둥글지 않음) */
        float ring = exp(-pow((r - uR - wob) / uW, 2.));
        float fill = smoothstep(uR + uW, uR * .3, r) * uFill * (.7 + .3 * fb(vec2(a * 2., r * 2. - uT * 3.)));
        float rip = uRip * smoothstep(uR, 0., r) * (.5 + .5 * sin(r * 9. - uT * 18.)) * .5;         /* 눌린 공기의 잔물결 */
        float k = (ring + fill + rip) * uA * smoothstep(6., 5., r);
        gl_FragColor = ${additive ? 'vec4(uC * k, 1.)' : 'vec4(uC, k)'}; }` }));
  m.scale.setScalar(12); m.frustumCulled = false; m.renderOrder = 7; m.visible = false; scene.add(m);
  return { mesh: m, u }; }

/* ── 올라갈 때 ─────────────────────────────────────────────── */
/* 1. 바람 기둥: 박차고 오르는 힘이 아래로 쏟아짐 — 기체 밑에 반투명한 공기 원뿔이 소용돌이치며 아래로 흐르고, 결을 따라 공기 알갱이가 감겨 내려감 */
function upColumn(C) { const F = Funnel(C.scene, .45, 2.5, 4.6, { flow: 1, twist: 1.5, bands: 5 }); let A = 0, fx = 0, fz = 0, fy = 0, acc = 0;
  return { begin(s) { fx = s.x; fz = s.z; },
    update(dt, s) { A += ((s.moving ? 1 : 0) - A) * Math.min(1, dt * (s.moving ? 14 : 3.2)); F.u.uA.value = A; F.u.uT.value = s.t; F.mesh.visible = A > .01;
      if (s.moving) fy = s.y - .3; F.mesh.position.set(fx, fy, fz); F.mesh.scale.set(.75 + .25 * A, .55 + .45 * A, .75 + .25 * A);   /* 도착하면 그 자리에 남아 흐르며 옅어짐 */
      if (s.moving) { acc += dt * 90; while (acc > 1) { acc--; const a = rnd() * 6.283, r = .45 + rnd() * .2;
        C.air.emit({ p: new THREE.Vector3(fx + Math.cos(a) * r, fy - .1, fz + Math.sin(a) * r), v: new THREE.Vector3(Math.cos(a) * 1.6, -9 - rnd() * 4, Math.sin(a) * 1.6), drag: 2.2, life: .45 + rnd() * .2, s0: .14, s1: .36, c: [.85, .93, 1], a: .8, sw: 5, cx: fx, cz: fz }); } } } }; }

/* 2. 추진 잔상: 추진체 불빛이 지나온 길에 세로로 길게 남았다가, 아래부터 흩어지며 불티가 됨 · 둘레를 두 가닥 빛이 감아 오름 (색: 기체 추진체 색) */
function upTrail(C) { const N = 48, R = Ribbon(C.scene, N, C.col, { core: 5, glow: .9 }), H1 = Ribbon(C.scene, N, C.col, { core: 9, glow: .6 }), H2 = Ribbon(C.scene, N, C.col, { core: 9, glow: .6 }), pts = Array.from({ length: N }, () => new THREE.Vector3());
  let on = false, x = 0, z = 0, y0 = 0, ytop = 0, age = 9, acc = 0, ph = 0; const cc = new THREE.Color(C.col), sc = [cc.r * 1.4, cc.g * 1.4, cc.b * 1.4];
  const fadeAt = (k, ag) => clamp01(1 - (ag - (1 - k) * .35) / .45);   /* k: 아래 0 → 위 1 · 아래부터 흩어짐 */
  return { begin(s) { on = true; x = s.x; z = s.z; y0 = s.y - .25; ytop = y0; age = 0; ph = rnd() * 6.283; R.uC.value.set(C.col); H1.uC.value.set(C.col); H2.uC.value.set(C.col); },
    update(dt, s) { if (!on) { R.hide(); H1.hide(); H2.hide(); return; } if (s.moving) { ytop = s.y - .25; age = 0; } else age += dt; if (age > 1.1) { on = false; return; }
      const len = Math.max(.01, ytop - y0);
      for (let i = 0; i < N; i++) { const k = i / (N - 1), yy = y0 + len * k; pts[i].set(x + Math.sin(yy * 3.1 + s.t * 7) * .035, yy, z + Math.cos(yy * 2.7 + s.t * 6) * .035); }
      R.set(pts, i => .5 * (.55 + .45 * (i / (N - 1))), i => { const k = i / (N - 1); return fadeAt(k, age) * smoothstep01(k * len / .4) * (s.moving ? 1 : 1); }, C.camera.position);
      for (const [H, o] of [[H1, 0], [H2, Math.PI]]) { const hp = pts.map((p, i) => { const k = i / (N - 1), yy = y0 + len * k, a = ph + o + yy * 2.3 - s.t * 4, r = .55 + .25 * (1 - k); return new THREE.Vector3(x + Math.cos(a) * r, yy, z + Math.sin(a) * r); });
        H.set(hp, i => .1 + .06 * (i / (N - 1)), i => fadeAt(i / (N - 1), age) * 1.1, C.camera.position); }
      if (!s.moving && age < .8) { acc += dt * 160; while (acc > 1) { acc--; const k = clamp01((age - .05) / .35 * (1 + rnd() * .2)), yy = y0 + len * (1 - k) * rnd() ** .3;   /* 흩어지는 자리에서 불티 */
        C.glow.emit({ p: new THREE.Vector3(x + (rnd() - .5) * .2, yy, z + (rnd() - .5) * .2), v: new THREE.Vector3((rnd() - .5) * 2.4, (rnd() - .2) * 1.2, (rnd() - .5) * 2.4), drag: 2.5, grav: -.6, life: .4 + rnd() * .4, s0: .16, s1: .05, c: sc, a: 1 }); } } } }; }
const smoothstep01 = t => { t = clamp01(t); return t * t * (3 - 2 * t); };

/* 3. 공기 터짐: 박차는 순간 떠나는 자리의 공기가 확 터짐 — 두 겹 충격 고리 · 사방으로 밀려나는 바람 뭉치 · 오르는 동안 기체를 휘감아 따라 오르는 바람 세 가닥 */
function upBurst(C) { const D1 = Disc(C.scene), D2 = Disc(C.scene), N = 26, W = [0, 1, 2].map(() => Ribbon(C.scene, N, 0xeaf4ff, { core: 7, glow: .7 })), pts = Array.from({ length: N }, () => new THREE.Vector3());
  let age = 9, x = 0, z = 0, by = 0, wA = 0, ph = 0;
  return { begin(s) { age = 0; x = s.x; z = s.z; by = s.y - .5; ph = rnd() * 6.283;
      for (let i = 0; i < 46; i++) { const a = i / 46 * 6.283 + rnd() * .2, sp = 6 + rnd() * 5;   /* 사방으로 밀려나는 바람 뭉치 */
        C.mist.emit({ p: new THREE.Vector3(x + Math.cos(a) * .6, by + (rnd() - .5) * .25, z + Math.sin(a) * .6), v: new THREE.Vector3(Math.cos(a) * sp, (rnd() - .6) * 1.2, Math.sin(a) * sp), drag: 3.4, life: .7 + rnd() * .35, s0: .35, s1: 1.3, c: s.L === 0 ? [.82, .78, .66] : [.95, .97, 1], a: s.L === 0 ? .5 : .38, fadeIn: .05 }); }
      for (let i = 0; i < 30; i++) { const a = rnd() * 6.283, sp = 4 + rnd() * 6; C.air.emit({ p: new THREE.Vector3(x, by, z), v: new THREE.Vector3(Math.cos(a) * sp, rnd() * 1.5, Math.sin(a) * sp), drag: 3, life: .4 + rnd() * .3, s0: .12, s1: .05, c: [.9, .96, 1], a: .9 }); } },
    update(dt, s) { age += dt;
      for (const [D, d, sp, w] of [[D1, 0, 9, .16], [D2, .07, 6.5, .1]]) { const a = age - d, k = clamp01(a / .55), e = 1 - Math.pow(1 - k, 3); D.mesh.visible = a > 0 && k < 1; if (!D.mesh.visible) continue;
        D.mesh.position.set(x, by, z); D.u.uR.value = .4 + e * sp * .55; D.u.uW.value = w + .25 * k; D.u.uA.value = (1 - k) * (1 - k) * 1.4; D.u.uFill.value = .35 * (1 - k); D.u.uT.value = s.t; }
      wA += ((s.moving ? 1 : 0) - wA) * Math.min(1, dt * (s.moving ? 16 : 4.5));
      if (wA < .02) { W.forEach(r => r.hide()); return; }
      W.forEach((R, j) => { for (let i = 0; i < N; i++) { const k = i / (N - 1), yy = s.y + .5 - k * 2.6, a = ph + j * 2.094 + k * 4.2 - s.t * 9, r = .7 + k * .9; pts[i].set(s.x + Math.cos(a) * r, yy, s.z + Math.sin(a) * r); }   /* 위 끝이 앞장서고 아래로 풀리며 꼬리 */
        R.set(pts, i => .09 * (1 - i / (N - 1) * .7), i => { const k = i / (N - 1); return wA * Math.sin(Math.min(1, k * 4) * 1.57) * (1 - k) * 1.2; }, C.camera.position); }); } }; }

/* ── 내려갈 때 ─────────────────────────────────────────────── */
/* 1. 빨려드는 소용돌이: 빠르게 내려가는 기체를 위의 공기가 따라 내려오다 빨려 들며 감김 — 기체 위로 뒤집힌 깔때기 · 결을 따라 공기 알갱이가 돌며 위로 퍼짐 */
function downVortex(C) { const F = Funnel(C.scene, 2.6, .45, 4.6, { flow: 1, twist: -2.4, bands: 6 }); F.mesh.geometry.translate(0, 4.6, 0); let A = 0, fx = 0, fz = 0, fy = 0, acc = 0;   /* 아래 끝(좁은 쪽)이 기체 등에 붙음 */
  return { begin(s) { fx = s.x; fz = s.z; },
    update(dt, s) { A += ((s.moving ? 1 : 0) - A) * Math.min(1, dt * (s.moving ? 14 : 3.5)); F.u.uA.value = A; F.u.uT.value = s.t; F.mesh.visible = A > .01;
      if (s.moving) fy = s.y + .35; F.mesh.position.set(fx, fy, fz); F.mesh.scale.set(.8 + .2 * A, .5 + .5 * A, .8 + .2 * A);
      if (s.moving) { acc += dt * 80; while (acc > 1) { acc--; const a = rnd() * 6.283, r = 1.8 + rnd() * .8;   /* 바깥에서 돌며 빨려 듦 */
        C.air.emit({ p: new THREE.Vector3(fx + Math.cos(a) * r, fy + 2.4 + rnd() * 1.6, fz + Math.sin(a) * r), v: new THREE.Vector3(-Math.cos(a) * 3, -7, -Math.sin(a) * 3), drag: 1.6, life: .45 + rnd() * .2, s0: .22, s1: .08, c: [.86, .94, 1], a: .55, sw: -7, cx: fx, cz: fz, out: -1.2 }); } } } }; }

/* 2. 공기 가르기: 기체 밑에 공기를 가르는 얇은 막이 비치고(가장자리일수록 또렷 · 막 위로 결이 퍼져 나감), 막 가장자리에서 바람이 위로 갈라져 흩어짐 */
function downCleave(C) {
  const u = { uT: { value: 0 }, uA: { value: 0 } };
  const g = new THREE.SphereGeometry(1.55, 48, 16, 0, Math.PI * 2, Math.PI * .5, Math.PI * .5); g.scale(1, .55, 1);   /* 아래쪽 반구를 납작하게 (공기를 미는 막) */
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vU; varying vec3 vN, vV; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: GL + `uniform float uA; varying vec2 vU; varying vec3 vN, vV;
      void main(){ float lat = 1. - vU.y * 2.;                                                        /* 0 = 아래 꼭지 · 1 = 가장자리 */
        float rim = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.2);
        float lines = smoothstep(.75, 1., fract(lat * 5. - uT * 4.5 + .3 * fb(vec2(vU.x * 12., uT)))) * (.4 + .6 * lat);   /* 막 위로 퍼져 나가는 결 */
        float shimmer = .75 + .25 * vn(vec2(vU.x * 30. + uT * 3., lat * 10.));
        gl_FragColor = vec4(vec3(.82, .92, 1.) * (rim * .9 + lines * .45) * shimmer * uA * smoothstep(1.02, .8, lat + .0), 1.); }` }));
  m.frustumCulled = false; m.renderOrder = 8; m.visible = false; C.scene.add(m); let A = 0, acc = 0;
  return { begin() {},
    update(dt, s) { A += ((s.moving ? 1 : 0) - A) * Math.min(1, dt * (s.moving ? 16 : 5)); u.uA.value = A; u.uT.value = s.t; m.visible = A > .01; m.position.set(s.x, s.y - .25, s.z);
      if (s.moving) { acc += dt * 150; while (acc > 1) { acc--; const a = rnd() * 6.283, r = 1.5;   /* 가장자리에서 위로 갈라지는 바람 */
        C.air.emit({ p: new THREE.Vector3(s.x + Math.cos(a) * r, s.y - .3, s.z + Math.sin(a) * r), v: new THREE.Vector3(Math.cos(a) * 2.2, 2 + rnd() * 3, Math.sin(a) * 2.2), drag: 2.8, life: .35 + rnd() * .2, s0: .1, s1: .16, c: [.9, .96, 1], a: .7, fadeIn: .05 }); } } } }; }

/* 3. 내려앉는 압력: 다가올수록 내려앉을 높이의 공기가 눌려 옅은 원반이 맺히고, 닿는 순간 납작하게 퍼지며 가장자리에서 바람 고리와 먼지(1층) · 안개(2 · 3층)가 밀려나감 */
function downPress(C) { const P = Disc(C.scene), R = Disc(C.scene); let land = 9, x = 0, z = 0, ly = 0, L = 0, pre = 0, dusted = false;
  return { begin(s) { x = s.x; z = s.z; ly = LY[s.to] - .6; L = s.to; land = 9; pre = 0; dusted = false; },
    update(dt, s) {
      if (s.moving) { pre = smoothstep01((s.f - .45) / .55); P.mesh.visible = pre > 0; P.mesh.position.set(x, ly, z); P.u.uR.value = 1.4 - .6 * pre; P.u.uW.value = .35; P.u.uFill.value = .9; P.u.uRip.value = .6 * pre; P.u.uA.value = pre * .45; P.u.uT.value = s.t; }   /* 다가올수록 눌려 맺힘 */
      else if (land > 8 && pre > 0) { land = 0; pre = 0; }   /* 닿는 순간 */
      if (land < 8) { land += dt; const k = clamp01(land / .7), e = 1 - Math.pow(1 - k, 2.6);
        P.mesh.visible = k < 1; P.u.uR.value = .8 + e * 3.6; P.u.uW.value = .45 + e * .6; P.u.uFill.value = .9 * (1 - k); P.u.uRip.value = .8 * (1 - k); P.u.uA.value = .55 * (1 - k); P.u.uT.value = s.t;
        R.mesh.visible = k < 1; R.mesh.position.set(x, ly + .02, z); R.u.uR.value = .9 + e * 4.6; R.u.uW.value = .12 + .2 * k; R.u.uA.value = 1.3 * (1 - k) * (1 - k); R.u.uFill.value = 0; R.u.uT.value = s.t;
        if (!dusted) { dusted = true; const gnd = L === 0;
          for (let i = 0; i < (gnd ? 60 : 40); i++) { const a = i / (gnd ? 60 : 40) * 6.283 + rnd() * .2, sp = 5 + rnd() * 4;   /* 가장자리로 밀려나는 먼지 · 안개 */
            C.mist.emit({ p: new THREE.Vector3(x + Math.cos(a) * .9, gnd ? .15 + rnd() * .2 : ly + (rnd() - .5) * .2, z + Math.sin(a) * .9), v: new THREE.Vector3(Math.cos(a) * sp, gnd ? .6 + rnd() * 1.4 : (rnd() - .5) * .8, Math.sin(a) * sp), drag: 3, grav: gnd ? .4 : 0, life: .8 + rnd() * .4, s0: .3, s1: gnd ? 1.1 : 1.4, c: gnd ? [.74, .66, .5] : [.95, .97, 1], a: gnd ? .55 : .35, fadeIn: .05 }); } }
        if (k >= 1) land = 9; }
      else if (!s.moving) { P.mesh.visible = R.mesh.visible = false; } } }; }

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0x9fc3e0, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(20, 1, .5, 2000), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .7; pm.dispose(); }
  /* 바닥: 초원 섬과 같은 풀밭 · 기체 그림자(높을수록 옅고 넓게) */
  const shU = { uS: { value: new THREE.Vector3() } };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160, 1, 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: { ...U, ...shU },
    vertexShader: 'varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position, 1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.); }',
    fragmentShader: GL + `uniform vec3 uS; varying vec3 vP; void main(){ vec2 q = vP.xz; float g1 = fb(q * .14), g2 = fb(q * .8 + 4.), g3 = vn(q * 6.6);
      vec3 c = mix(vec3(.16, .36, .07), vec3(.40, .58, .12), g1); c = mix(c, vec3(.10, .27, .06), smoothstep(.5, .78, g2) * .55) * (.82 + .3 * g3);
      vec2 fc = q * 3.8, id = floor(fc), f = fract(fc) - .5, o = vec2(h21(id + 1.7), h21(id + 3.3)) - .5; float on = step(h21(id), .12 * smoothstep(.45, .72, fb(q * .1 + 9.))) * smoothstep(.13, .05, length(f - o * .6));
      c = mix(c, h21(id + 5.) < .5 ? vec3(1.1, 1.05, .95) : vec3(1.1, .9, .3), on);
      float d = length(q - uS.xy) / (1.1 + uS.z * .12), sh = 1. - .5 * exp(-d * d * 2.) * exp(-uS.z * .06);
      gl_FragColor = vec4(lit(c, vec3(0., 1., 0.), sh, sh), 1.); }` }));
  scene.add(ground);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }',
    fragmentShader: 'varying vec3 vD; void main(){ gl_FragColor = vec4(mix(vec3(.66, .78, .9), vec3(.32, .54, .84), smoothstep(-.1, .6, vD.y)), 1.); }' })); sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  /* 높이 비교용 갈대 부쉬 둘 (초원 섬과 같은 것) */
  { const vegM = new THREE.ShaderMaterial({ uniforms: U, ...vegShader(GL), side: THREE.DoubleSide });
    const shape = (x, z) => { let d = -99; for (const [cx, cz, r] of [[0, 0, 1.75], [1.3, .55, 1.25], [-1.25, -.35, 1.15]]) d = smax(d, r - Math.hypot(x - cx, z - cz), .8); return d + .14 * fbm(x * 1.6, z * 1.6, 2); };
    for (const [bx, bz, sd] of [[-6.5, -2.5, 11], [6, 3.5, 29]]) { const R = reedBush({ foot: shape, box: [-3.2, -2.5, 3.2, 2.5], seed: sd, HB: 1.7 }); const m = new THREE.Mesh(R.geo, vegM); m.position.set(bx, 0, bz); scene.add(m); } }
  onProgress(.3); await new Promise(r => setTimeout(r, 20));
  /* 기체 (지금 고른 스킨) · 추진체 빛은 기체 테마 색 */
  const SKINS = forgeList(renderer, camera); let skinId = 'blazedrake'; try { skinId = localStorage.getItem('mj-skin') || skinId; } catch (e) {}
  const si = Math.max(0, SKINS.findIndex(s => s.id === skinId)), FG = await makeForgeShip(renderer, camera, si); scene.add(FG.root);
  const col = THRUST[SKINS[si].theme] ?? 0xffffff;
  onProgress(.9);

  const C = { scene, camera, col, air: Particles(scene, 900, true), glow: Particles(scene, 500, true), mist: Particles(scene, 400, false) };
  const UP = [upColumn(C), upTrail(C), upBurst(C)], DOWN = [downVortex(C), downCleave(C), downPress(C)];
  const UPN = ['바람 기둥', '추진 잔상', '공기 터짐'], DNN = ['빨려드는 소용돌이', '공기 가르기', '내려앉는 압력'];
  const pick = { up: 0, down: 0 };

  /* 단추: 올라갈 때 1~3 · 내려갈 때 1~3 · 시점 */
  const cfg = { ang: 45, dist: 25, side: false, slow: 1, yaw: .9 };
  { const box = document.createElement('div'); box.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 10px);display:flex;flex-direction:column;gap:6px;align-items:center;max-width:calc(100% - 32px)';
    const row = (label, names, key) => { const r = document.createElement('div'); r.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;justify-content:center;align-items:center';
      const cap = document.createElement('span'); cap.textContent = label; cap.style.cssText = 'font-size:11px;color:#eaffd2;opacity:.85;margin-right:2px;text-shadow:0 0 4px rgba(0,0,0,.7)'; r.append(cap);
      const bs = names.map((n, k) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = (k + 1) + ' ' + n; b.style.cssText = 'font-size:12px;padding:6px 11px;border:1px solid rgba(185,255,74,.45);border-radius:12px;color:#eaffd2;background:rgba(4,10,6,.6)';
        b.onclick = () => { pick[key] = k; paint(); }; r.append(b); return b; });
      const paint = () => bs.forEach((b, k) => b.style.background = k === pick[key] ? 'rgba(120,180,40,.5)' : 'rgba(4,10,6,.6)'); paint(); return r; };
    const view = document.createElement('button'); view.type = 'button'; view.textContent = '옆에서 보기'; view.style.cssText = 'font-size:11px;padding:4px 10px;border:1px solid rgba(185,255,74,.3);border-radius:10px;color:#eaffd2;background:rgba(4,10,6,.5)';
    view.onclick = () => { cfg.side = !cfg.side; view.textContent = cfg.side ? '게임 시점' : '옆에서 보기'; };
    const slow = document.createElement('button'); slow.type = 'button'; slow.textContent = '천천히 보기'; slow.style.cssText = view.style.cssText;   /* 0.33초라 한 번에 보기 어려워 5배 느리게 */
    slow.onclick = () => { cfg.slow = cfg.slow === 1 ? .2 : 1; slow.textContent = cfg.slow === 1 ? '천천히 보기' : '원래 빠르기'; };
    const sub = document.createElement('div'); sub.style.cssText = 'display:flex;gap:6px'; sub.append(view, slow);
    box.append(row('올라갈 때', UPN, 'up'), row('내려갈 때', DNN, 'down'), sub); $('#ui').append(box); }

  let Wd = 2, Hd = 2; const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); }
  addEventListener('resize', size); size();

  /* 오르내림: 이동 속도 그대로 곧게 · 기수만 들고 숙임 (섬과 같은 약 30°) */
  const M = { step: 0, L: 0, to: 0, y: LY[0], f: 1, hold: .6, dir: 0, eff: null, x: 0, z: 0 };
  const CAMK = Math.tan(20 * Math.PI / 180) / Math.tan(10 * Math.PI / 180), cf = y => { const k = clamp01((y - LY[0]) / (LY[2] - LY[0])); return .85 + .45 * k; };   /* 높을수록 물러나 넓게 */
  let camD = cfg.dist * CAMK * cf(M.y), camY = M.y, last = performance.now(), t = 0; const say = $('#where'); if (say) { say.style.bottom = 'auto'; say.style.top = 'calc(env(safe-area-inset-top,0px) + 54px)'; }   /* 지금 상태 글은 위로 (단추와 겹치지 않게) */
  renderer.setAnimationLoop(now => { const dt = Math.min(.05, (now - last) / 1000) * cfg.slow; last = now; t += dt; U.uT.value = t;
    if (M.f >= 1) { M.hold -= dt; if (M.hold <= 0) { M.step = (M.step + 1) % ORDER.length; M.to = ORDER[M.step]; M.dir = Math.sign(M.to - M.L); M.f = 0; M.y0 = M.y;
        M.eff = M.dir > 0 ? UP[pick.up] : DOWN[pick.down]; M.eff.begin({ x: M.x, z: M.z, y: M.y, L: M.L, to: M.to }); } }
    let moving = false;
    if (M.f < 1) { const dur = Math.abs(LY[M.to] - M.y0) / SPEED; M.f = Math.min(1, M.f + dt / dur); M.y = M.y0 + (LY[M.to] - M.y0) * M.f; moving = M.f < 1; if (M.f >= 1) { M.L = M.to; M.hold = HOLD; } }
    const st = { x: M.x, y: M.y, z: M.z, t, f: M.f, moving, L: M.L, to: M.to };
    for (const E of [...UP, ...DOWN]) E.update(dt, E === M.eff ? st : { ...st, moving: false });
    C.air.update(dt); C.glow.update(dt); C.mist.update(dt);
    /* 기체: 그 자리에서 곧게 오르내림 · 기수만 듦/숙임 */
    const e = M.f < 1 ? Math.sin(M.f * Math.PI) : 0; FG.root.position.set(M.x, M.y, M.z); FG.root.rotation.set(0, cfg.yaw, 0); FG.root.rotateX(M.dir * .52 * e);   /* 오를 땐 기수를 듦 · 내릴 땐 숙임 (옆에서 확인) */
    FG.step(dt, t, { moving: false, fire: false });
    shU.uS.value.set(M.x + .5, M.z + .4, M.y);
    /* 카메라: 게임처럼 기체 높이를 따라감 (옆에서 보기는 높이 변화를 보이게 고정) */
    if (cfg.side) { camera.position.set(M.x + 26, 5.2, M.z + 4); camera.lookAt(M.x, 5.2, M.z); }
    else { camD += (cfg.dist * CAMK * cf(M.y) - camD) * Math.min(1, dt * 3); camY += (M.y - camY) * Math.min(1, dt * 10); const a = cfg.ang * Math.PI / 180; camera.position.set(M.x, camY + camD * Math.sin(a), M.z + camD * Math.cos(a)); camera.lookAt(M.x, camY, M.z); }
    camera.updateMatrixWorld(); sky.position.copy(camera.position);
    if (say) say.textContent = `${M.L + 1}층${M.f < 1 ? (M.dir > 0 ? ' → 올라가는 중 · ' + UPN[pick.up] : ' → 내려가는 중 · ' + DNN[pick.down]) : ''}`;
    FG.preRender(camera);
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera); bloom.render(Wd, Hd, false); perf.tick(dt); });
  onProgress(1); window.__lift = { M, pick, cfg, camera, THREE };
}
