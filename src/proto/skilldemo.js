/* 스킬 맛보기 — 보석을 한 번 누르면 기체가 판 위에서 그 스킬을 실제로 한 번 써 보임 (되풀이)
   · 연습 표적: 출격로 쪽(+x)에 떠 있는 홀로그램 표적 셋 — 맞으면 번쩍하고 흔들림 (공격·방해 스킬 때만 나타남)
   · 공용 부품으로만 만듦 (스킬마다 따로 만든 그림 없음): 탄(빛 꼬리) · 광선 띠 · 번개 · 바닥 장 · 육각 벽 · 연기 · 잔상(기체 유령)
   · 모든 움직임은 원인 → 결과: 쏘기 전 코끝에 힘이 모임 → 나감 → 닿은 자리에 불꽃/표적 반응
   무게: 점 묶음 3 · 띠 2 · 표적 3 · 바닥 1 · 벽 1 · 유령 기체 3(쓸 때만) */
import * as THREE from 'three';
import * as A from '../core/audio.js?v=11121901';

const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
const sm01 = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* 점 묶음 (꼬리·불꽃·가루) — 더하는 빛 / 덮는 연기 두 가지 */
export function pointPool(n, smoke = false, PK = .2) {
  const g = new THREE.BufferGeometry(), arr = [];
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aA', new THREE.Float32BufferAttribute(new Float32Array(n), 1)); g.setAttribute('aC', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aS', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
  for (let i = 0; i < n; i++) arr.push({ p: V3(), v: V3(), c: V3(1, 1, 1), life: 0, max: 1, g: 0, s: 1, drag: 1.6, grow: 0 });
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: smoke ? THREE.NormalBlending : THREE.AdditiveBlending, uniforms: { uPx: { value: 800 } },
    vertexShader: `attribute float aA, aS; attribute vec3 aC; uniform float uPx; varying float vA; varying vec3 vC;
      void main(){ vA = aA; vC = aC; vec4 v = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * v; gl_PointSize = aA > 0. ? uPx * ${PK.toFixed(3)} * aS / max(.5, -v.z) : 0.; }`,
    fragmentShader: smoke
      ? `varying float vA; varying vec3 vC; void main(){ vec2 d = gl_PointCoord - .5; float r = length(d) * 2., k = max(0., 1. - r * r); gl_FragColor = vec4(vC, k * vA * .55); }`
      : `varying float vA; varying vec3 vC; void main(){ vec2 d = gl_PointCoord - .5; float r = length(d) * 2., k = max(0., 1. - r); vec3 c = mix(vC * vC, vec3(1.1), k * k * k * vA); gl_FragColor = vec4(c * k * k * vA, 1.); }` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = smoke ? 9 : 8;
  const emit = (f, k = 1) => { for (let j = 0, c = 0; j < arr.length && c < k; j++) if (arr[j].life <= 0) { const q = arr[j]; q.g = 0; q.s = 1; q.drag = 1.6; q.grow = 0; q.v.set(0, 0, 0); f(q); c++; } };
  const update = dt => { const P = g.attributes.position, Aa = g.attributes.aA, C = g.attributes.aC, S = g.attributes.aS; let any = false;
    arr.forEach((q, i) => { if (q.life > 0) { any = true; q.life -= dt; q.p.addScaledVector(q.v, dt); q.v.y -= q.g * dt; q.v.multiplyScalar(Math.exp(-q.drag * dt)); q.s += q.grow * dt; }
      P.setXYZ(i, q.p.x, q.p.y, q.p.z); const k = Math.max(0, q.life / q.max); Aa.setX(i, q.life > 0 ? (smoke ? Math.min(1, (1 - k) * 6) * k : k) : 0); S.setX(i, q.s * (smoke ? 1 : .4 + k)); C.setXYZ(i, q.c.x, q.c.y, q.c.z); });
    P.needsUpdate = Aa.needsUpdate = C.needsUpdate = S.needsUpdate = true; pts.visible = any; };
  const clear = () => arr.forEach(q => q.life = 0);
  return { pts, emit, update, clear, setPx: px => { m.uniforms.uPx.value = px; } };
}

/* 화면 쪽으로 눕는 빛 띠 A→B (광선): 가운데 하얀 심 + 색 몸통 + 흐르는 결 */
export function beamMesh() {
  const m = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uA: { value: V3() }, uB: { value: V3() }, uW: { value: .1 }, uI: { value: 0 }, uT: { value: 0 }, uCol: { value: V3(1, 1, 1) } },
    vertexShader: `uniform vec3 uA, uB; uniform float uW; varying vec2 vU; varying float vL;
      void main(){ vU = uv; vec3 P = mix(uA, uB, uv.y), ax = normalize(uB - uA + vec3(1e-4)); vL = length(uB - uA);
        vec3 s = cross(ax, normalize(cameraPosition - P)); s = dot(s, s) > 1e-8 ? normalize(s) : vec3(0., 1., 0.);
        gl_Position = projectionMatrix * viewMatrix * vec4(P + s * (uv.x - .5) * uW * 2., 1.); }`,
    fragmentShader: `uniform float uI, uT; uniform vec3 uCol; varying vec2 vU; varying float vL;
      void main(){ float x = abs(vU.x * 2. - 1.), y = vU.y;
        float flow = .75 + .25 * sin(y * vL * 9. - uT * 70.) * sin(y * vL * 3.1 - uT * 31.);
        float xs = vU.x * 2. - 1.;
        float s1 = xs - .55 * sin(y * vL * 5. - uT * 40.), s2 = xs + .55 * sin(y * vL * 5. - uT * 40. + 1.2);       /* 심을 감아 도는 두 가닥 */
        float strands = exp(-s1 * s1 * 60.) + exp(-s2 * s2 * 60.);
        float core = exp(-x * x * 30.), body = exp(-x * x * 3.) * .7, haze = exp(-x * x * .8) * .25, ends = smoothstep(0., .03, y) * smoothstep(1., .9, y);
        vec3 c = (vec3(1.25) * core + uCol * uCol * (body * 1.5 + haze) + mix(uCol, vec3(1.), .5) * strands * .9) * flow * ends;
        gl_FragColor = vec4(c * uI, 1.); }` });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 24).translate(.5, .5, 0), m); o.frustumCulled = false; o.renderOrder = 9; o.visible = false; return o;
}
/* 빛 띠 묶음 (탄 꼬리 · 번개): 지나온 자리를 따라 화면 쪽으로 눕는 띠. 머리는 굵고 하얗게, 꼬리로 갈수록 가늘고 색이 짙어지며 사라짐
   점을 줄줄이 찍는 대신 이어진 면 하나로 그려 '점선'처럼 보이지 않게. 모든 띠를 한 번에 그림 */
function makeRibbons(maxV = 2400) {
  const g = new THREE.BufferGeometry(), P = new Float32Array(maxV * 3), C = new Float32Array(maxV * 4), UV = new Float32Array(maxV * 2), idx = new Uint16Array(maxV * 3);
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aC', new THREE.BufferAttribute(C, 4)); g.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  const m = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uT: { value: 0 } },
    vertexShader: 'attribute vec4 aC; varying vec4 vC; varying vec2 vU; void main(){ vC = aC; vU = uv; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uT; varying vec4 vC; varying vec2 vU;
      void main(){ float x = abs(vU.x * 2. - 1.), h = vU.y;                                   /* h: 1 = 머리, 0 = 꼬리 */
        float core = exp(-x * x * 18.) * (.35 + h * h * .9), body = exp(-x * x * 3.2) * .75;
        float shimmer = .8 + .2 * sin(vU.y * 40. - uT * 30.);
        vec3 c = (vec3(1.15) * core + vC.rgb * vC.rgb * body * 1.5) * shimmer;
        gl_FragColor = vec4(c * vC.a, 1.); }` });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 9;
  const strips = [];                                                     /* { pts:[V3], w:[], col, a, life, max } */
  const side = new THREE.Vector3(), dir = new THREE.Vector3(), toC = new THREE.Vector3();
  function build(cam) { let v = 0, ii = 0;
    for (const sp of strips) { const n = sp.pts.length; if (n < 2 || v + n * 2 > maxV) continue; const k = sp.max ? Math.max(0, sp.life / sp.max) : 1;
      for (let i = 0; i < n; i++) { const p = sp.pts[i], q = sp.pts[Math.min(n - 1, i + 1)], o = sp.pts[Math.max(0, i - 1)]; dir.subVectors(q, o); toC.subVectors(cam.position, p);
        side.crossVectors(dir, toC); const L = side.length(); if (L > 1e-6) side.multiplyScalar(1 / L); else side.set(0, 1, 0);
        const u = i / (n - 1), w = sp.w(u) * .5;
        for (const sg of [-1, 1]) { P[v * 3] = p.x + side.x * w * sg; P[v * 3 + 1] = p.y + side.y * w * sg; P[v * 3 + 2] = p.z + side.z * w * sg;
          C[v * 4] = sp.col.x; C[v * 4 + 1] = sp.col.y; C[v * 4 + 2] = sp.col.z; C[v * 4 + 3] = sp.a(u) * k; UV[v * 2] = sg < 0 ? 0 : 1; UV[v * 2 + 1] = u; v++; }
        if (i < n - 1) { const b = v - 2; idx[ii++] = b; idx[ii++] = b + 1; idx[ii++] = b + 2; idx[ii++] = b + 1; idx[ii++] = b + 3; idx[ii++] = b + 2; } } }
    g.setDrawRange(0, ii); g.attributes.position.needsUpdate = g.attributes.aC.needsUpdate = g.attributes.uv.needsUpdate = true; g.index.needsUpdate = true; mesh.visible = ii > 0; }
  return { mesh, strips, build, add: sp => { strips.push(sp); return sp; }, tick(dt, t) { m.uniforms.uT.value = t; for (let i = strips.length - 1; i >= 0; i--) { const sp = strips[i]; if (sp.max) { sp.life -= dt; if (sp.life <= 0) strips.splice(i, 1); } } }, clear() { strips.length = 0; } };
}
/* 연습 표적: 홀로그램 과녁 (겹 고리 + 눈금 + 가운데 마름모), 화면을 봄 */
function targetMesh() {
  const m = new THREE.ShaderMaterial({ ...AB, uniforms: { uA: { value: 0 }, uHit: { value: 0 }, uT: { value: 0 }, uS: { value: .62 } },
    vertexShader: `uniform float uS; varying vec2 vP; void main(){ vP = position.xy * 2.; vec4 c = modelViewMatrix * vec4(0.,0.,0.,1.); c.xy += position.xy * uS * 2.; gl_Position = projectionMatrix * c; }`,
    fragmentShader: `uniform float uA, uHit, uT; varying vec2 vP;
      void main(){ float r = length(vP), a = atan(vP.y, vP.x + 1e-5);
        float ring = exp(-pow(abs(r - .82) / .035, 2.)) + exp(-pow(abs(r - .56) / .025, 2.)) * .7;
        float tick = step(.9, fract(a / 6.2832 * 16.)) * smoothstep(.95, .9, r) * smoothstep(.62, .68, r) * .8;
        float spin = smoothstep(.0, .3, sin(a * 3. + uT * 2.)) * exp(-pow(abs(r - .7) / .02, 2.)) * .8;
        vec2 q = abs(vP); float dia = smoothstep(.2, .17, q.x + q.y) - smoothstep(.13, .1, q.x + q.y);
        float k = ring + tick + spin + dia;
        vec3 c = mix(vec3(1., .55, .25), vec3(1.4, 1.2, 1.), uHit) * k * (.55 + uHit * 1.6);
        gl_FragColor = vec4(c * uA, 1.); }` });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); o.frustumCulled = false; o.renderOrder = 7; return o;
}
/* 바닥 장: 0 = 느려지는 고리(감속) · 1 = 안으로 말려드는 소용돌이(끌어당김) */
function fieldMesh() {
  const m = new THREE.ShaderMaterial({ ...AB, uniforms: { uA: { value: 0 }, uT: { value: 0 }, uMode: { value: 0 }, uCol: { value: V3(1, 1, 1) } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uA, uT, uMode; uniform vec3 uCol; varying vec2 vP;
      void main(){ float r = length(vP), a = atan(vP.y, vP.x + 1e-5), edge = exp(-pow(abs(r - .97) / .025, 2.)) * 1.2, fill = smoothstep(1., .2, r) * .12;
        float k;
        if (uMode < .5) { float w = (fract(r * 3.5 - uT * .35) - .5) / .06; k = exp(-w * w) * smoothstep(1., .1, r) * .8 + step(.92, fract(a / 6.2832 * 24.)) * smoothstep(.9, .86, r) * smoothstep(.8, .84, r) * .6; }
        else { float sw = sin(a * 4. + r * 9. + uT * 6.); k = smoothstep(.55, 1., sw) * smoothstep(1., .15, r) * .9 + exp(-r * r * 30.) * 1.4; }
        vec3 c = uCol * uCol * (k + edge + fill) + vec3(1.) * edge * .3;
        gl_FragColor = vec4(c * uA * step(r, 1.), 1.); }` });
  const o = new THREE.Mesh(new THREE.CircleGeometry(1, 72), m); o.rotation.x = -Math.PI / 2; o.renderOrder = 6; o.visible = false; return o;
}
/* 육각 벽: 아래에서 솟아오름 · 맞은 자리에서 물결 */
function wallMesh() {
  const m = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uA: { value: 0 }, uT: { value: 0 }, uRise: { value: 0 }, uHit: { value: V3(0, 0, -9) }, uCol: { value: V3(1, 1, 1) } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uA, uT, uRise; uniform vec3 uHit, uCol; varying vec2 vU;
      vec2 hx(vec2 p){ vec2 s = vec2(1., 1.732), h = s * .5; vec2 a = mod(p, s) - h, b = mod(p - h, s) - h; return dot(a,a) < dot(b,b) ? a : b; }
      void main(){ vec2 p = (vU - .5) * vec2(2.6, 1.8) * 5.; vec2 c = hx(p); vec2 q = abs(c);
        float e = max(q.x * .866 + q.y * .5, q.y); float line = smoothstep(.42, .48, e);
        float shown = step(vU.y, uRise);                                                        /* 아래부터 솟아오름 */
        float ty = (vU.y - uRise) / .02, top = exp(-ty * ty) * 2.;
        float d = length((vU - uHit.xy) * vec2(1.4, 1.)), rd = (d - uHit.z * 1.2) / .05, rip = uHit.z > 0. ? exp(-rd * rd) * max(0., 1. - uHit.z * 1.6) * 2. : 0.;
        float border = smoothstep(.04, 0., min(min(vU.x, 1. - vU.x), min(vU.y, 1. - vU.y)));
        float k = (line * .55 + .06 + border * .8 + rip) * shown + top * step(uRise, .999);
        vec3 col = uCol * uCol * k + vec3(1.) * (rip + top) * .4;
        gl_FragColor = vec4(col * uA, 1.); }` });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.8), m); o.renderOrder = 8; o.visible = false; return o;
}
/* 유령 기체 (잔상·분신): 기체 모양 그대로, 가장자리만 빛나는 반투명 */
function ghostOf(ship) {
  const m = new THREE.ShaderMaterial({ ...AB, side: THREE.FrontSide, uniforms: { uA: { value: 0 }, uCol: { value: V3(1, 1, 1) } },
    vertexShader: 'varying vec3 vN, vV; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uA; uniform vec3 uCol; varying vec3 vN, vV; void main(){ float q = 1. - abs(dot(normalize(vN), vV)); float k = .12 + q * q * 1.3; gl_FragColor = vec4(uCol * uCol * k * uA, 1.); }` });
  const g = ship.clone(true); g.traverse(o => { if (o.isMesh) { o.material = m; o.renderOrder = 7; } }); g.visible = false; g.userData.m = m; return g;
}

/* 소리 */
function zap(f = 900, dur = .12, vol = .08, wet = .2) { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * .3, t0 + dur); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
  o.connect(lp); lp.connect(g); A.env(g, t0, .003, vol, dur); A.out(g, wet); o.start(t0); o.stop(t0 + dur + .05); }
function hiss(dur = .3, f0 = 900, f1 = 6000, vol = .1, type = 'bandpass') { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, s = A.noise(dur), bp = c.createBiquadFilter(), g = c.createGain();
  bp.type = type; bp.Q.value = 1.2; bp.frequency.setValueAtTime(f0, t0); bp.frequency.exponentialRampToValueAtTime(f1, t0 + dur); s.connect(bp); bp.connect(g); A.env(g, t0, .005, vol, dur); A.out(g, .3); s.start(t0); }
function thud(f = 90, vol = .25) { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f * 1.8, t0); o.frequency.exponentialRampToValueAtTime(f * .6, t0 + .25); o.connect(g); A.env(g, t0, .004, vol, .35); A.out(g, .2); o.start(t0); o.stop(t0 + .45); }
function crackle(n = 6) { if (!A.live()) return; for (let i = 0; i < n; i++) setTimeout(() => hiss(.05, 2500 + Math.random() * 3000, 7000, .07, 'highpass'), i * 28 + Math.random() * 20); }

export function makeDemo(rig, ship) {
  const G = new THREE.Group();
  const trail = pointPool(700), spark = pointPool(400), smoke = pointPool(90, true); G.add(trail.pts, spark.pts, smoke.pts);
  const beam = beamMesh(), beam2 = beamMesh(); G.add(beam, beam2);
  const rib = makeRibbons(); G.add(rib.mesh);
  const tg = [0, 1, 2].map(() => { const o = targetMesh(); G.add(o); return { o, home: V3(), p: V3(), hit: 0, a: 0, alive: 1 }; });
  const field = fieldMesh(), wall = wallMesh(); G.add(field, wall);
  const ghosts = [0, 1, 2].map(() => { const g = ghostOf(ship); G.add(g); return g; });
  const bolts = [];                                                      /* 날아가는 탄 */
  const S = { cat: -1, idx: -1, T0: 0, col: V3(1, 1, 1), on: false, fired: {}, tAt: 0, rigP: V3(), rigR: 0 };
  const F = V3(1, 0, 0), RT = V3(0, 0, 1);                               /* 앞(출격로 쪽) · 오른쪽 */
  const shipW = () => ship.getWorldPosition(V3());
  const nose = () => shipW().addScaledVector(F, 1.45);
  const once = (k, e, at) => { if (e >= at && !S.fired[k]) { S.fired[k] = 1; return true; } return false; };
  const burst = (p, col, n = 30, sp = 2.4, g = 3) => spark.emit(q => { q.p.copy(p); q.v.randomDirection().multiplyScalar(sp * (.3 + Math.random())); q.max = q.life = .3 + Math.random() * .45; q.c.copy(col); q.g = g; q.s = 1.1; }, n);
  const charge = (p, col, n = 3) => spark.emit(q => { const d = V3().randomDirection().multiplyScalar(.6 + Math.random() * .4); q.p.copy(p).add(d); q.v.copy(d).multiplyScalar(-3.2); q.drag = 0; q.max = q.life = .2; q.c.copy(col); q.s = .9; }, n);
  const hitT = (i, col) => { const T = tg[i]; if (!T.alive) return; T.hit = 1; burst(T.p, col, 26, 2.2); burst(T.p, V3(1, .7, .4), 10, 1.5); zap(220, .12, .07); };
  const ENEMY = V3(1, .6, .3);
  function fire(p, v, col, o = {}) { bolts.push(Object.assign({ life: 1.6, home: -1, turn: 0, size: 1, split: 0, enemy: false, hitAny: true }, o, { p: p.clone(), v: v.clone(), col: col.clone(), age: 0 })); }
  /* 번개: 갈지자로 꺾인 굵은 빛 띠(가운데 굵고 끝 가늘게) + 곁가지 + 닿는 자리 불꽃. 매번 모양이 새로 꺾여 지직거림 */
  function lightning(a, b, col, life = .14, j = .35, w0 = .14, branch = true) { const n = Math.max(6, Math.floor(a.distanceTo(b) / .28)), pts = [a.clone()];
    const side = V3().subVectors(b, a).cross(V3(0, 1, 0)).normalize();
    for (let i = 1; i < n; i++) { const u = i / n, p = a.clone().lerp(b, u), w = Math.sin(u * Math.PI) * j; p.addScaledVector(side, (Math.random() - .5) * w * 2).add(V3(0, (Math.random() - .5) * w * 1.4, 0)); pts.push(p); } pts.push(b.clone());
    rib.add({ pts, col: col.clone(), life, max: life, w: u => w0 * (.35 + Math.sin(u * Math.PI) * .9) * (.7 + Math.random() * .6), a: () => 1.3 });
    if (branch) for (let k = 0; k < 2; k++) { const i0 = 1 + Math.floor(Math.random() * (n - 2)), from = pts[i0], to = from.clone().add(V3().randomDirection().multiplyScalar(.5 + Math.random() * .6)); lightning(from, to, col, life * .8, .2, w0 * .5, false); }
    if (branch) spark.emit(q => { q.p.copy(b); q.v.randomDirection().multiplyScalar(1 + Math.random() * 2); q.max = q.life = .2 + Math.random() * .2; q.c.copy(col); q.s = .8; }, 4); }

  /* 잔상: 그 순간 기체 모양 그대로 유령을 남기고 서서히 흐려짐 */
  function snap(i, e, at, col, fade) { const g = ghosts[i], U = g.userData;
    if (once('snap' + i + '_' + at, e, at)) { g.visible = true; g.position.copy(rig.getWorldPosition(V3())); g.quaternion.copy(rig.getWorldQuaternion(new THREE.Quaternion())); g.scale.copy(rig.scale); U.at = e; U.key = at; U.m.uniforms.uCol.value.copy(col); }
    if (g.visible && U.key === at) { const k = (e - U.at) / fade; U.m.uniforms.uA.value = Math.max(0, 1 - k) * 1.1; if (k > 1) g.visible = false; } }
  function placeTargets(list) { tg.forEach((T, i) => { const h = list[i]; T.alive = h ? 1 : 0; if (h) { T.home.set(h[0], h[1], h[2]); T.p.copy(T.home); } }); }
  const ATK_T = [[4.2, 1.05, -1.4], [5.2, 1.15, 0], [4.2, 1.05, 1.4]];   /* 기체 앞 4~5m: 화면 한 장에 기체와 표적이 함께 들어오게 */

  /* ── 스킬마다 맛보기 대본 (e = 시작부터 흐른 시간) ── */
  const SCRIPT = {
    'atk0': { dur: 1.6, tg: ATK_T, run(e, C) {            /* 무지개 산탄: 코끝에 힘 → 부채꼴 다섯 발(무지개 결) */
      if (e < .3) charge(nose(), C, 2); if (once('f', e, .3)) { const n = nose(); burst(n, V3(1, 1, 1), 14, 1.6, 0); thud(140, .15); zap(1200, .14, .08);
        for (let i = -2; i <= 2; i++) { const a = i * .2, c = new THREE.Color().setHSL((i + 2) / 5 * .8, 1, .6); fire(n, V3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(10), V3(c.r * 1.3, c.g * 1.3, c.b * 1.3)); } } } },
    'atk1': { dur: 1.9, tg: [[3.6, 1.05, 0], [4.6, 1.05, .05], [5.6, 1.05, -.05]], run(e, C) {    /* 관통 광선: 모음(길게) → 하나로 꿰뚫음 */
      if (e < .55) charge(nose(), C, 4); if (once('h', e, .05)) hiss(.5, 300, 3000, .06);
      const on = e > .55 && e < 1.15; beam.visible = on; if (on) { const k = (e - .55) / .6, n = nose(); beam.material.uniforms.uA.value.copy(n); beam.material.uniforms.uB.value.copy(n).addScaledVector(F, Math.min(1, k * 8) * 6.5);
        beam.material.uniforms.uW.value = .16 * (k < .1 ? 1.8 : 1) * (1 - k * .5); beam.material.uniforms.uI.value = 1.4 * (1 - sm01((k - .8) / .2)); beam.material.uniforms.uCol.value.copy(C);
        if (Math.random() < .5) burst(n, C, 2, 1, 0); }
      if (once('z', e, .55)) { zap(500, .5, .1, .4); thud(70, .2); } if (once('h0', e, .6)) hitT(0, C); if (once('h1', e, .64)) hitT(1, C); if (once('h2', e, .68)) hitT(2, C); } },
    'atk2': { dur: 2.1, tg: ATK_T, run(e, C) {            /* 유도 결정: 양옆으로 튀어나가 휘어 들어 표적을 쫓음 */
      if (once('f', e, .2)) { const p = shipW(); [[-1, 0], [1, 2]].forEach(([s, ti]) => fire(p.clone().addScaledVector(RT, s * .7), V3(1.5, 1.4, s * 5.5), C, { home: ti, turn: 4.5, life: 2, size: 1.3 })); zap(1600, .1, .06); hiss(.4, 3000, 8000, .04); }
      if (once('g', e, .55)) { fire(nose(), V3(7, .6, 0), C, { home: 1, turn: 6, life: 2, size: 1.3 }); zap(1800, .08, .05); } } },
    'atk3': { dur: 1.8, tg: ATK_T, run(e, C) {            /* 연쇄 번개: 코끝 → 표적1 → 2 → 3 차례로 옮겨붙음 */
      if (e < .25) charge(nose(), C, 2); const T = tg.map(x => x.p), ch = [[nose(), T[0], .25, 0], [T[0], T[1], .4, 1], [T[1], T[2], .55, 2]];
      ch.forEach(([a, b, at, ti], i) => { if (e > at && e < at + .32 && Math.random() < .55) lightning(a, b, C, .12, .45); if (once('c' + i, e, at)) { hitT(ti, C); crackle(7); } }); } },
    'atk4': { dur: 2, tg: ATK_T, run(e, C) {              /* 분열탄: 큰 덩이 하나 → 가운데쯤에서 여섯으로 갈라짐 */
      if (e < .3) charge(nose(), C, 2); if (once('f', e, .3)) { fire(nose(), F.clone().multiplyScalar(5), C, { size: 2.6, split: .55 }); thud(110, .2); zap(700, .2, .08); } } },
    'mov0': { dur: 2.2, run(e, C) {                       /* 순간 이동: 빛이 안으로 빨려 들며 사라짐 → 앞에서 터지며 나타남 → 다시 돌아옴 */
      const A_ = V3(), B_ = V3(3.6, 0, 0); let p = A_, vis = true, sq = 1;
      if (e < .25) { sq = 1 - sm01(e / .25) * .85; if (Math.random() < .8) charge(shipW(), C, 3); }
      else if (e < 1.25) { p = B_; vis = e > .3; sq = sm01((e - .3) / .15); } else if (e < 1.5) { p = B_; sq = 1 - sm01((e - 1.25) / .25) * .85; if (Math.random() < .8) charge(shipW(), C, 3); } else { p = A_; sq = sm01((e - 1.55) / .15); vis = e > 1.55; }
      S.rigP.copy(p); rig.scale.set(1, 1, 1).multiplyScalar(Math.max(.05, sq)); ship.visible = vis;
      if (once('a', e, .25)) { lightning(shipW(), shipW().add(B_), C, .2, .15); hiss(.25, 6000, 900, .1); }
      if (once('b', e, .3)) { burst(B_.clone().add(V3(0, 1, 0)), C, 50, 3); thud(120, .2); }
      if (once('c', e, 1.5)) { hiss(.25, 6000, 900, .1); } if (once('d', e, 1.55)) { burst(V3(0, 1, 0), C, 50, 3); thud(120, .2); } } },
    'mov1': { dur: 2.2, run(e, C) {                       /* 돌진: 웅크림(살짝 뒤로) → 확 밀고 나감(속도 선) → 미끄러지며 섬 → 천천히 돌아옴 */
      let x = 0; if (e < .2) x = -sm01(e / .2) * .35; else if (e < .45) { const u = (e - .2) / .25; x = -.35 + (4.1) * (1 - (1 - u) * (1 - u)); } else if (e < .7) x = 3.75 + Math.sin((e - .45) / .25 * Math.PI) * .12; else if (e < 1.7) x = 3.75 * (1 - sm01((e - .7) / 1));
      S.rigP.set(x, 0, 0); S.rigR = e > .2 && e < .5 ? -.12 : 0;
      [.24, .3, .36].forEach((at, i) => snap(i, e, at, C, .35));                                   /* 밀고 나가는 동안 기체 모양 잔상이 뒤에 남음 */
      if (e > .2 && e < .45) spark.emit(q => { q.p.copy(shipW()).add(V3(-1.3, (Math.random() - .5) * .3, (Math.random() - .5) * .5)); q.v.set(-2 - Math.random() * 2, (Math.random() - .5), (Math.random() - .5) * 2); q.max = q.life = .3; q.c.copy(C); q.s = 1.2; q.drag = 3; }, 3);   /* 엔진 뒤 빛 뿜음 */
      if (once('a', e, .2)) { hiss(.3, 600, 5000, .14, 'lowpass'); thud(80, .25); } if (once('b', e, .45)) burst(shipW().addScaledVector(F, 1.3), C, 20, 1.6, 1); } },
    'mov2': { dur: 2.4, run(e, C) {                       /* 잔상 질주: 빨라져 S자로 휘어 달림 → 지나간 자리에 기체 모양 잔상이 남아 흐려짐 */
      const u = Math.min(1, e / 1.5), x = Math.sin(u * Math.PI) * 3.2, z = Math.sin(u * Math.PI * 2) * 1.5; S.rigP.set(x, 0, z); S.rigR = -Math.cos(u * Math.PI * 2) * .35 * (u < 1 ? 1 : 0);
      if (once('a', e, 0)) { hiss(1.4, 800, 3000, .07, 'lowpass'); zap(400, .3, .05); }
      ghosts.forEach((g, i) => { const at = .25 + i * .38; if (once('g' + i, e, at)) { g.visible = true; g.position.copy(rig.getWorldPosition(V3())); g.quaternion.copy(rig.getWorldQuaternion(new THREE.Quaternion())); g.scale.copy(rig.scale);
          g.userData.at = e; g.userData.m.uniforms.uCol.value.copy(C); }
        if (g.visible) { const k = (e - g.userData.at) / .9; g.userData.m.uniforms.uA.value = Math.max(0, 1 - k) * 1.1; if (k > 1) g.visible = false; } });
      if (e < 1.5 && Math.random() < .6) spark.emit(q => { q.p.copy(shipW()).add(V3((Math.random() - .5) * .8, (Math.random() - .5) * .3, (Math.random() - .5) * .8)); q.max = q.life = .4; q.c.copy(C); q.s = .9; }, 1); } },
    'mov3': { dur: 2.4, run(e, C) {                       /* 반동 도약: 옆 벽으로 달려가 '찬' 순간 물결 → 비스듬히 튕겨 나감 → 돌아옴 */
      wall.visible = true; wall.position.set(1.2, 1.1, 2.6); wall.rotation.set(0, 0, 0); wall.material.uniforms.uCol.value.copy(C);
      wall.material.uniforms.uA.value = Math.min(1, e * 4) * (1 - sm01((e - 2) / .35)); wall.material.uniforms.uRise.value = sm01(e / .3);
      let p; if (e < .3) p = V3(); else if (e < .62) { const u = sm01((e - .3) / .32); p = V3(.3 * u, 0, 1.75 * u * u); } else if (e < 1.2) { const u = 1 - (1 - (e - .62) / .58) ** 2; p = V3(.3 + 3.2 * u, 0, 1.75 - 2.4 * u); } else p = V3(3.5, 0, -.65).multiplyScalar(1 - sm01((e - 1.2) / 1));
      S.rigP.copy(p); S.rigR = e > .55 && e < .75 ? .3 : 0;
      if (once('h', e, .62)) { wall.material.uniforms.uHit.value.set(.5 + .3 / 2.6, (1 - 1.1 + .55) / 1.8 + .25, .001); thud(160, .28); zap(300, .15, .06); burst(V3(1.4, 1.1, 2.4), C, 30, 2.5, 1); }
      const H = wall.material.uniforms.uHit.value; if (H.z > 0) H.z += 1 / 60; } },
    'mov4': { dur: 2.6, run(e, C) {                       /* 중력 미끄럼: 보이지 않는 중심을 축으로 휘어 돌며 미끄러짐(기울어 돎) */
      const u = Math.min(1, e / 1.8), a = sm01(u) * Math.PI * 2, P0 = V3(1.6, 0, 0), r = 1.6;
      field.visible = e < 2.2; field.position.set(1.6, .27, 0); field.scale.setScalar(.7); field.material.uniforms.uMode.value = 1; field.material.uniforms.uCol.value.copy(C); field.material.uniforms.uA.value = Math.min(1, e * 3) * (1 - sm01((e - 1.8) / .4)) * .7;
      S.rigP.set(P0.x - Math.cos(a) * r, 0, -Math.sin(a) * r); S.rigR = Math.sin(u * Math.PI) * .5; S.rigY = -a;
      [.35, .75, 1.15].forEach((at, i) => snap(i, e, at, C, .7));                                   /* 휘어 도는 길에 기울어진 잔상 */
      if (u < 1 && Math.random() < .5) spark.emit(q => { q.p.copy(shipW()).add(V3((Math.random() - .5) * .8, -.2, (Math.random() - .5) * .8)); q.v.set(0, .4, 0); q.max = q.life = .5; q.c.copy(C); q.s = .9; }, 1);
      if (once('a', e, 0)) { hiss(1.8, 400, 1800, .06, 'lowpass'); } } },
    'dis0': { dur: 2.4, tg: ATK_T, run(e, C) {           /* 거울 벽: 앞에 벽이 솟음 → 표적이 쏜 탄이 벽에 맞아 되튕겨 표적으로 */
      wall.visible = true; wall.position.set(2.2, 1.1, 0); wall.rotation.set(0, Math.PI / 2, 0); wall.material.uniforms.uCol.value.copy(C);
      wall.material.uniforms.uA.value = Math.min(1, e * 4) * (1 - sm01((e - 2.05) / .35)); wall.material.uniforms.uRise.value = sm01(e / .35);
      if (once('r', e, 0)) { hiss(.35, 400, 4000, .07); thud(100, .15); }
      [0, 1, 2].forEach(i => { if (once('s' + i, e, .45 + i * .12)) { const p = tg[i].p.clone(); fire(p, V3(2.2, 1.1, 0).sub(p).setLength(6), ENEMY, { enemy: true, life: 2, onWall: 2.2, to: i }); zap(900, .08, .04); } });
      const H = wall.material.uniforms.uHit.value; if (H.z > 0) H.z += 1 / 60; } },
    'dis1': { dur: 2.8, tg: ATK_T, run(e, C) {           /* 안개 폭탄: 둥글게 던짐 → 떨어진 자리에서 연기가 퍼져 표적을 덮음 */
      if (once('f', e, .1)) { const n = nose(); fire(n, V3(3.4, 3.2, 0), C, { life: 1.2, size: 1.8, grav: 1, hitAny: false, burstAt: .62 }); zap(500, .15, .06); }
      tg.forEach(T => { T.dim = e > .8 ? Math.max(.12, 1 - (e - .8) * 1.6) : 1; if (e > 2.3) T.dim = Math.min(1, .12 + (e - 2.3) * 2); }); } },
    'dis2': { dur: 2.8, tg: [[4.5, 1.05, -1.2], [4.8, 1.1, 1.1], [6.1, 1.05, 0]], run(e, C) {   /* 감속 장: 장이 펼쳐짐 → 안을 지나는 적 탄이 느려짐, 안의 표적도 느릿하게 흔들림 */
      field.visible = true; field.position.set(4.3, .27, 0); field.scale.setScalar(2 * sm01(e / .4)); field.material.uniforms.uMode.value = 0; field.material.uniforms.uCol.value.copy(C);
      field.material.uniforms.uA.value = (1 - sm01((e - 2.4) / .4)); if (once('a', e, 0)) { thud(60, .2); hiss(.6, 2000, 300, .06); }
      if (once('s', e, .4)) { fire(V3(7.4, 1.1, 0), V3(-6, 0, 0), ENEMY, { enemy: true, life: 3, slowZ: [4.3, 2], hitAny: false }); zap(900, .08, .04); }
      tg.forEach(T => { T.slow = T.p.distanceTo(V3(4.3, T.p.y, 0)) < 2 ? .15 : 1; }); } },
    'dis3': { dur: 2.8, tg: [[3.5, 1.05, -1.9], [6, 1.15, .4], [3.9, 1.05, 1.7]], run(e, C) {   /* 끌어당김: 덩이를 쏨 → 닿은 자리에 소용돌이 → 둘레 표적이 한가운데로 끌려옴 */
      if (once('f', e, .15)) { fire(nose(), V3(6, 0, 0), C, { life: .58, size: 1.8, hitAny: false, burstAt: .5 }); zap(600, .12, .06); }
      const on = e > .7 && e < 2.5, c0 = V3(4.6, 1.05, 0); field.visible = on; field.position.set(4.6, .27, 0); field.scale.setScalar(2); field.material.uniforms.uMode.value = 1; field.material.uniforms.uCol.value.copy(C);
      field.material.uniforms.uA.value = on ? Math.min(1, (e - .7) * 4) * (1 - sm01((e - 2.2) / .3)) : 0;
      if (once('h', e, .7)) { thud(70, .25); hiss(1.4, 3000, 300, .06, 'lowpass'); }
      if (on) { const k = sm01((e - .75) / .9); tg.forEach(T => { T.p.lerpVectors(T.home, c0.clone().add(T.home.clone().sub(c0).setLength(.55)), k); });
        trail.emit(q => { const a = Math.random() * 6.28, r = 1.8 + Math.random() * .6; q.p.set(c0.x + Math.cos(a) * r, .4 + Math.random() * 1.2, Math.sin(a) * r); q.v.set(-Math.cos(a) * 3 - Math.sin(a) * 2, 0, -Math.sin(a) * 3 + Math.cos(a) * 2); q.drag = 0; q.max = q.life = .55; q.c.copy(C); q.s = .6; }, 3); } } },
    'dis4': { dur: 3, tg: ATK_T, run(e, C) {             /* 미끼 분신: 내 자리에 가짜를 남기고 옆으로 빠짐 → 적 탄이 가짜를 쫓음 → 가짜가 깨짐 */
      const g = ghosts[0]; if (once('g', e, .1)) { g.visible = true; g.position.copy(rig.getWorldPosition(V3())); g.quaternion.copy(rig.getWorldQuaternion(new THREE.Quaternion())); g.scale.copy(rig.scale); g.userData.m.uniforms.uCol.value.copy(C); hiss(.3, 4000, 900, .08); burst(shipW(), C, 20, 1.5, 0); }
      g.userData.m.uniforms.uA.value = e < 1.7 ? .9 + .2 * Math.sin(e * 20) : 0; if (e > 1.7) g.visible = false;
      S.rigP.set(-.4 * sm01((e - .1) / .4), 0, -2.3 * sm01((e - .1) / .4) * (1 - sm01((e - 2.2) / .6))); S.ghostDim = e > .1 && e < 2.2;
      [0, 1].forEach(i => { if (once('s' + i, e, .65 + i * .2)) { fire(tg[i * 2].p, V3(-6, 0, 0), ENEMY, { enemy: true, life: 2, toGhost: g }); zap(900, .08, .04); } });
      if (once('x', e, 1.7)) { burst(g.position.clone().add(V3(0, .9, 0)), C, 70, 3, 2); thud(130, .2); hiss(.3, 8000, 2500, .1, 'highpass'); } } },
  };

  function reset() { bolts.length = 0; rib.clear(); trail.clear(); spark.clear(); smoke.clear(); beam.visible = beam2.visible = false; field.visible = wall.visible = false; wall.material.uniforms.uHit.value.set(0, 0, -9);
    ghosts.forEach(g => g.visible = false); S.rigP.set(0, 0, 0); S.rigR = 0; S.rigY = 0; S.ghostDim = false; rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); rig.scale.set(1, 1, 1); ship.visible = true; tg.forEach(T => { T.hit = 0; T.dim = 1; T.slow = 1; }); }
  G.userData.play = (cat, idx, t, col) => { reset(); S.cat = cat; S.idx = idx; S.key = ['atk', 'mov', 'dis'][cat] + idx; S.T0 = t + .25; S.col.copy(col); S.on = true; S.fired = {};
    const sc = SCRIPT[S.key]; placeTargets(sc.tg || []); };
  G.userData.stop = () => { S.on = false; reset(); tg.forEach(T => T.alive = 0); };
  G.userData.setPx = px => { trail.setPx(px); spark.setPx(px); smoke.setPx(px * 2.2); };
  G.userData.S = S;
  G.userData.update = (t, dt, cam) => {
    trail.update(dt); spark.update(dt); smoke.update(dt); rib.tick(dt, t);
    tg.forEach(T => { const U = T.o.material.uniforms; T.a += ((S.on && T.alive ? 1 : 0) - T.a) * Math.min(1, dt * 5); T.hit = Math.max(0, T.hit - dt * 3);
      const sl = T.slow ?? 1; T.o.position.copy(T.p).add(V3(0, Math.sin(t * 1.6 * sl + T.home.z) * .06 + (T.hit > 0 ? (Math.random() - .5) * T.hit * .15 : 0), 0));
      U.uA.value = T.a * (T.dim ?? 1); U.uHit.value = T.hit; U.uT.value = t * sl; T.o.visible = T.a > .01; });
    beam.material.uniforms.uT.value = t; field.material.uniforms.uT.value = t; wall.material.uniforms.uT.value = t;
    if (!S.on) { if (cam) rib.build(cam); return; }
    const e = t - S.T0, sc = SCRIPT[S.key], C = S.col;
    if (e >= 0) sc.run(e, C);
    /* 탄 움직임 */
    for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i]; b.life -= dt; let sp = 1;
      if (b.home >= 0 && tg[b.home].alive) { const want = tg[b.home].p.clone().sub(b.p).setLength(b.v.length() + dt * 4); b.v.lerp(want, Math.min(1, dt * b.turn)); }
      if (b.toGhost) { const want = b.toGhost.position.clone().add(V3(0, .9, 0)).sub(b.p).setLength(6); b.v.lerp(want, Math.min(1, dt * 5)); }
      if (b.slowZ && Math.hypot(b.p.x - b.slowZ[0], b.p.z) < b.slowZ[1]) sp = .12;
      if (b.grav) b.v.y -= 9.8 * dt;
      b.p.addScaledVector(b.v, dt * sp); b.age = (b.age || 0) + dt;
      const tc = b.enemy ? ENEMY : b.col;
      if (!b.rb) b.rb = rib.add({ pts: [], col: tc.clone(), w: u => .42 * b.size * (u * .85 + .15), a: u => u * u * 1.2 });   /* 꼬리: 지나온 자리를 이은 빛 띠 */
      b.rb.col.copy(tc); b.rb.pts.push(b.p.clone()); if (b.rb.pts.length > (sp < 1 ? 16 : 8)) b.rb.pts.shift();
      spark.emit(q => { q.p.copy(b.p); q.max = q.life = .05; q.c.copy(tc); q.s = 4 * b.size; q.drag = 0; }, 1);                           /* 머리: 하얀 심 + 색 번짐 — 빛 덩어리로 보이게 크게 */
      if (Math.random() < .35) trail.emit(q => { q.p.copy(b.p); q.v.randomDirection().multiplyScalar(.6); q.max = q.life = .25 + Math.random() * .2; q.c.copy(tc); q.s = .45; }, 1);   /* 꼬리에서 떨어지는 부스러기 */
      let dead = b.life <= 0;
      if (b.split && b.age >= b.split) { for (let k = 0; k < 6; k++) { const a = (k - 2.5) * .32; fire(b.p, V3(Math.cos(a), (Math.random() - .5) * .2, Math.sin(a)).multiplyScalar(7), b.col, { size: .9, life: 1 }); }
        burst(b.p, b.col, 30, 2.2, 0); zap(1400, .1, .06); crackle(3); dead = true; }
      if (b.burstAt && b.age >= b.burstAt) { dead = true; burst(b.p, b.col, 30, 2, 1);
        if (S.key === 'dis1') { thud(60, .25); hiss(1.2, 1500, 300, .08, 'lowpass'); smoke.emit(q => { q.p.copy(b.p).setY(.6 + Math.random() * .9).add(V3((Math.random() - .5) * 1.4, 0, (Math.random() - .5) * 2.6)).setX(4.3 + (Math.random() - .5) * 1.6);
            q.v.set((Math.random() - .5) * .8, Math.random() * .3, (Math.random() - .5) * .8); q.drag = .8; q.max = q.life = 1.6 + Math.random() * .4; q.c.set(.16 + Math.random() * .05, .13, .22); q.s = 5 + Math.random() * 3; q.grow = 2.5; }, 60); } }
      if (b.onWall && b.v.x > 0 === false && b.p.x <= b.onWall) { const W = wall.material.uniforms.uHit.value; W.set(.5 - b.p.z / 2.6, (b.p.y - 1.1) / 1.8 + .5, .001);
        b.v.x = -b.v.x; b.v.multiplyScalar(1.15); b.enemy = false; b.col = C.clone(); b.home = b.to; b.turn = 3; b.onWall = 0; burst(b.p, C, 16, 1.6, 0); zap(1500, .1, .06); }
      if (!dead && b.hitAny && !b.enemy) for (let k = 0; k < 3; k++) if (tg[k].alive && b.p.distanceTo(tg[k].p) < .42) { hitT(k, b.col); dead = true; break; }
      if (!dead && b.toGhost && b.p.distanceTo(b.toGhost.position.clone().add(V3(0, .9, 0))) < .5) { burst(b.p, ENEMY, 14, 1.4, 0); dead = true; }
      if (dead) { if (b.rb) { b.rb.max = b.rb.life = .12; b.rb.a = u => u * u; } bolts.splice(i, 1); } }
    /* 기체 움직임(맛보기용 받침) */
    rig.position.lerp(S.rigP, Math.min(1, dt * 30)); rig.rotation.x = S.rigR || 0; rig.rotation.y = S.rigY || 0;
    if (e > sc.dur + .9) { S.T0 = t + .2; S.fired = {}; reset(); placeTargets(sc.tg || []); }          /* 되풀이 */
    if (cam) rib.build(cam);
  };
  return G;
}
