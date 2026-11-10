/* 층 이동 연출 시안 (2026-11-10 · 사용자: 렌즈는 볼록 렌즈 같음 → 태어날 때 운석 충격파처럼 작게 · 내려갈 땐 충격파 없이 세로 빛줄기만 싹 · 빛줄기는 단순한 선 느낌이 안 나게)
   움직임은 넣지 않음 (사용자: 위아래 움직이는 건 모션을 넣으면 안 됨) — 이동 속도 그대로 곧게(1초에 12m · 한 층 4m) · 기수만 들고 숙임
   · 올라갈 때: 박차는 자리에서 작은 충격파(센 첫 물결 + 약한 물결 둘 · 기체 둘레 약 3m · 풍경만 일렁이고 기체는 안 휨) + 세로 빛줄기
   · 내려갈 때: 세로 빛줄기만 위로 싹
   · 세로 빛줄기: 바람에 찢긴 빛 조각이 끊어지며 흐름 · 아주 가는 흰 심 + 옅은 푸른 번짐 · 꼬리는 흐려짐 · 기체에 가까운 건 굵고 밝고 빠르게, 먼 건 가늘고 느리게(깊이) · 작은 빛 알갱이가 줄기를 따라 미끄러짐 · 조금씩 흔들림
   기체는 1층 → 2층 → 3층 → 2층 → 1층을 쉬어 가며 되풀이 · 카메라는 게임처럼 기체 높이를 따라감 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11102135';
import { makePerf } from './perf.js?v=11102135';
import { makeForgeShip, forgeList } from './forgeship.js?v=11102135';
import { SUN, reedBush, vegShader } from './flora.js?v=11102135';

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

const GL = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
float fb(vec2 p){ return vn(p) * .5 + vn(p * 2.07 + 3.1) * .25 + vn(p * 4.11 + 7.7) * .125 + vn(p * 8.3 + 1.3) * .0625; }
uniform vec3 uSun; uniform float uT;
const vec3 SUNC = vec3(1.55, 1.45, 1.28), SKYC = vec3(.50, .62, .80), GNDC = vec3(.20, .22, .12);
vec3 lit(vec3 al, vec3 n, float sh, float ao){ float d = max(dot(n, uSun), 0.); return al * (SUNC * d * sh + mix(GNDC, SKYC, .5 + .5 * n.y) * ao + .05); }
`;
const U = { uSun: { value: SUN }, uT: { value: 0 } };

/* ── 세로 빛줄기 ──
   공기 속에 잠깐 맺히는 빛 (기체가 지나는 길 둘레 · 땅에 붙어 있음) → 기체를 따라가는 카메라에는 반대로 흘러 보임
   한 가닥 = 바람에 찢긴 빛: 조각들이 끊어지며 흐르는 쪽으로 미끄러짐 · 가운데 아주 가는 흰 심 + 옅은 푸른 번짐 · 꼬리 쪽은 흐려짐
   빛 알갱이 하나가 줄기를 따라 빠르게 미끄러짐 · 곧은 직선 · 늘 카메라를 봄(세로축은 그대로)
   출발하는 순간 바로 가장 밝고 → 이동하는 동안 옅어져 → 도착하면 0.1초 안에 사라짐 (사용자 2026-11-10: 도착한 뒤에 나오면 의미 없음) */
function Streaks(scene, N) {
  const g = new THREE.InstancedBufferGeometry(), P = [], I = [], SEG = 24;
  for (let k = 0; k <= SEG; k++) { const v = k / SEG; P.push(-1, v, 0, 1, v, 0); if (k < SEG) I.push(k * 2, k * 2 + 1, k * 2 + 3, k * 2, k * 2 + 3, k * 2 + 2); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
  const iA = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4), iB = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4), iC = new THREE.InstancedBufferAttribute(new Float32Array(N * 2), 2); [iA, iB, iC].forEach(a => a.setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('iA', iA); g.setAttribute('iB', iB); g.setAttribute('iC', iC); g.instanceCount = 0;   /* iA: 아래 끝 x, y, z · 길이  /  iB: 굵기 · 밝기 · 나이(0~1) · 흐름(+1 아래로 흘러 보임 · −1 위로)  /  iC: 씨앗 · 미끄러지는 빠르기 */
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 iA, iB; attribute vec2 iC; varying vec2 vQ; varying float vB, vV, vAg, vS, vSp, vL;
      void main(){ float v = position.y, taper = pow(sin(v * 3.14159), .55);                                           /* 양 끝이 가늘게 */
        vec3 w = iA.xyz + vec3(0., v * iA.w, 0.); vec3 side = normalize(cross(vec3(0., 1., 0.), cameraPosition - w));   /* 세로축은 그대로 두고 카메라 쪽으로 돌림 */
        w += side * position.x * iB.x * (1.6 + 1.4 * taper);   /* 번짐까지 담는 폭 · 곧은 직선 (사용자 2026-11-10: 흔들림 때문에 휘어 보임 → 뺌) */
        float ag = clamp(iB.z, 0., 1.);
        vB = iB.y * smoothstep(0., .06, ag) * pow(1. - ag, 1.3) * taper; vV = iB.w > 0. ? v : 1. - v; vAg = ag; vS = iC.x; vSp = iC.y; vL = iA.w;   /* vV: 0 = 머리(흘러가는 쪽 끝 · 아래로 흐르면 아래 끝) → 1 = 꼬리 */
        vQ = vec2(position.x * (1.6 + 1.4 * taper), v); gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }`,
    fragmentShader: `varying vec2 vQ; varying float vB, vV, vAg, vS, vSp, vL;
      float h(float x){ return fract(sin(x * 127.1) * 43758.55); }
      float vn1(float x){ float i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(h(i), h(i + 1.), f); }
      void main(){ float u = vQ.x, s = vV;
        float fl = s * vL * 2.2 + vAg * vSp * 3.2;                                                                       /* 조각들이 머리 쪽(흐르는 쪽)으로 미끄러짐 */
        float piece = smoothstep(.32, .62, vn1(fl + vS * 50.)) * (.6 + .4 * vn1(fl * 2.7 + vS * 9.));                     /* 바람에 찢긴 빛 조각 (끊어짐 · 길이 제각각) */
        float tail = pow(1. - s, 1.3) * smoothstep(0., .06, s) + .05;                                                    /* 머리가 밝고 꼬리로 흐려짐 */
        float core = exp(-u * u * 60.) * piece, halo = exp(-u * u * 4.) * (.18 + .3 * piece);
        float bp = 1. - fract(vS * 7.3 + vAg * (1.6 + vSp)), bead = exp(-pow((s - bp) * vL / .09, 2.)) * exp(-u * u * 14.) * 1.8;   /* 줄기를 따라 미끄러지는 빛 알갱이 */
        vec3 c = vec3(1.) * core * 2.6 + mix(vec3(.45, .66, 1.), vec3(.62, .55, 1.), s) * halo * 1.6 + vec3(.9, .96, 1.) * bead * 1.5;
        gl_FragColor = vec4(c * tail * vB, 1.); }` }));
  m.frustumCulled = false; m.renderOrder = 9; m.layers.set(1); scene.add(m);   /* 기체와 같은 겹: 충격파에 휘지 않음 (사용자 2026-11-10) */
  const L = [];
  return {
    emit(o) { if (L.length >= N) L.shift(); L.push({ ...o, age: 0 }); },
    update(dt) { let n = 0; for (let i = L.length - 1; i >= 0; i--) { L[i].age += dt; if (L[i].age >= L[i].life) L.splice(i, 1); }
      for (const q of L) { iA.array.set([q.x, q.y, q.z, q.len], n * 4); iB.array.set([q.w, q.b, q.age / q.life, q.flow], n * 4); iC.array.set([q.seed, q.sp], n * 2); n++; }
      g.instanceCount = n; iA.needsUpdate = iB.needsUpdate = iC.needsUpdate = true; } }; }

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
  /* 기체 (지금 고른 스킨) */
  const SKINS = forgeList(renderer, camera); let skinId = 'blazedrake'; try { skinId = localStorage.getItem('mj-skin') || skinId; } catch (e) {}
  const si = Math.max(0, SKINS.findIndex(s => s.id === skinId)), FG = await makeForgeShip(renderer, camera, si); scene.add(FG.root);
  onProgress(.9);

  const SK = Streaks(scene, 40);
  /* 충격파 (태어날 때 운석 충격파를 작게): 기체를 뺀 풍경을 먼저 그려 두고, 물결 자리만 휘게 옮겨 그린 뒤 기체를 그 위에 그림 — 기체 자신은 휘지 않음
     · 깊이도 같이 옮겨 써서 기체가 갈대 뒤로 숨는 것 등은 그대로 · 박차고 떠난 높이의 수평 고리(위에서 비스듬히 보면 납작한 타원)로 퍼짐
     · 센 첫 물결 + 뒤따르는 약한 물결 둘 (운석과 같은 모양) · 물마루에서 빛이 살짝 갈라지고 밝아짐 */
  FG.root.traverse(o => o.layers.set(1));
  const rtW = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(2, 2) });
  const shockU = { tC: { value: rtW.texture }, tD: { value: rtW.depthTexture }, uS: { value: new THREE.Vector4(.5, .5, .1, .1) }, uK: { value: 0 }, uAsp: { value: 1 } };
  const shockQ = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: shockU, depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth,
    vertexShader: 'in vec3 position; in vec2 uv; out vec2 vU; void main(){ vU = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `precision highp float; precision highp sampler2D; in vec2 vU; out vec4 o; uniform sampler2D tC, tD; uniform vec4 uS; uniform float uK, uAsp;
      float g(float x, float c, float s){ return exp(-((x - c) / s) * ((x - c) / s)); }
      void main(){ vec2 uv = vU; vec3 c;
        if (uK > 0.) { vec2 e = max(uS.zw, vec2(1e-4)), d = (uv - uS.xy) / e; float r = length(d) + 1e-5, W = .16;              /* r = 1 이 물결 앞머리 (타원을 둥글게 펴서 잼) */
          float w = g(r, 1., W) - g(r, 1. - W * 1.3, W) * .6 + (g(r, .72, W * .85) - g(r, .72 - W * 1.1, W * .85) * .6) * .45 + g(r, .48, W * .7) * .2;
          vec2 dir = d / r * e; float k = uK * .5;                                                              /* 물결 앞머리는 바깥으로 · 뒤는 안으로 밀림 → 공기가 눌렸다 풀림 */
          uv -= dir * w * k; float ca = max(w, 0.) * uK * .5;
          c = vec3(texture(tC, uv + dir * ca * .02).r, texture(tC, uv).g, texture(tC, uv - dir * ca * .02).b) * (1. + .3 * max(w, 0.) * uK); }
        else c = texture(tC, uv).rgb;
        o = vec4(c, 1.); gl_FragDepth = texture(tD, vU).r; }` }));
  shockQ.frustumCulled = false; const shockS = new THREE.Scene(); shockS.add(shockQ); const shockC = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  /* 단추: 시점 · 천천히 보기 */
  const cfg = { ang: 45, dist: 25, side: false, slow: 1 };
  { const box = document.createElement('div'); box.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 12px);display:flex;gap:6px;align-items:center;max-width:calc(100% - 32px)';
    const view = document.createElement('button'); view.type = 'button'; view.textContent = '옆에서 보기'; view.style.cssText = 'font-size:11px;padding:4px 10px;border:1px solid rgba(185,255,74,.3);border-radius:10px;color:#eaffd2;background:rgba(4,10,6,.5)';
    view.onclick = () => { cfg.side = !cfg.side; view.textContent = cfg.side ? '게임 시점' : '옆에서 보기'; };
    const slow = document.createElement('button'); slow.type = 'button'; slow.textContent = '천천히 보기'; slow.style.cssText = view.style.cssText;   /* 0.33초라 한 번에 보기 어려워 5배 느리게 */
    slow.onclick = () => { cfg.slow = cfg.slow === 1 ? .2 : 1; slow.textContent = cfg.slow === 1 ? '천천히 보기' : '원래 빠르기'; };
    const sub = document.createElement('div'); sub.style.cssText = 'display:flex;gap:6px'; sub.append(view, slow);
    box.append(sub); $('#ui').append(box); }

  let Wd = 2, Hd = 2; const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); rtW.setSize(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); }
  addEventListener('resize', size); size();

  /* 오르내림: 이동 속도 그대로 곧게 · 기수만 들고 숙임 (섬과 같은 약 30°) */
  const M = { step: 0, L: 0, to: 0, y: LY[0], f: 1, hold: .6, dir: 0, x: 0, z: 0, acc: 0, shock: 9, sy: 0 };
  const CAMK = Math.tan(20 * Math.PI / 180) / Math.tan(10 * Math.PI / 180), cf = y => { const k = clamp01((y - LY[0]) / (LY[2] - LY[0])); return .85 + .45 * k; };   /* 높을수록 물러나 넓게 */
  let camD = cfg.dist * CAMK * cf(M.y), camY = M.y, last = performance.now(), t = 0; const say = $('#where'); if (say) { say.style.bottom = 'auto'; say.style.top = 'calc(env(safe-area-inset-top,0px) + 54px)'; }   /* 지금 상태 글은 위로 (단추와 겹치지 않게) */
  renderer.setAnimationLoop(now => { const dt = Math.min(.05, (now - last) / 1000) * cfg.slow; last = now; t += dt; U.uT.value = t;
    if (M.f >= 1) { M.hold -= dt; if (M.hold <= 0) { M.step = (M.step + 1) % ORDER.length; M.to = ORDER[M.step]; M.dir = Math.sign(M.to - M.L); M.f = 0; M.y0 = M.y;
        if (M.dir > 0) { M.shock = 0; M.sy = M.y - .3; } } }   /* 올라갈 때만: 박차는 자리에서 충격파 */
    let moving = false;
    if (M.f < 1) { const dur = Math.abs(LY[M.to] - M.y0) / SPEED; M.f = Math.min(1, M.f + dt / dur); M.y = M.y0 + (LY[M.to] - M.y0) * M.f; moving = M.f < 1; if (M.f >= 1) { M.L = M.to; M.hold = HOLD; } }
    /* 세로 빛줄기: 출발하는 순간 여러 가닥이 한꺼번에 맺히고, 이동 앞쪽 절반 동안 조금 더 맺힘 · 모두 도착 뒤 0.1초 안에 사라지게 수명을 맞춤
       공기에 붙어 있어 기체를 따라가는 화면에선 반대로 흘러 보임 · 기체에 가까운 건 굵고 밝고 빠르게 · 먼 건 가늘고 흐리고 느리게 (깊이) */
    if (moving) { const left = (1 - M.f) * Math.abs(LY[M.to] - M.y0) / SPEED + .1, n = M.burst ? 0 : 9; M.burst = true;   /* left: 도착 뒤 0.1초까지 남은 시간 */
      if (M.f < .55) M.acc += dt * 30; let k = n + Math.floor(M.acc); M.acc -= Math.floor(M.acc);
      for (; k > 0; k--) { const a = rnd() * 6.283, near = rnd(), r = .75 + near * 1.6, len = (2.6 - near * 1.1) * (.8 + rnd() * .5);
        SK.emit({ x: M.x + Math.cos(a) * r, y: M.y + M.dir * (rnd() * 2.4) - len * .5, z: M.z + Math.sin(a) * r, len, w: .06 - near * .03 + rnd() * .012, b: (1.5 - near * .9) * (.8 + rnd() * .4), flow: M.dir, life: left * (.85 + rnd() * .15), seed: rnd(), sp: 1.8 - near * 1.1 + rnd() * .4 }); } }
    else M.burst = false;
    SK.update(dt);
    M.shock += dt;
    /* 기체: 그 자리에서 곧게 오르내림 · 기수만 듦/숙임 */
    const e = M.f < 1 ? Math.sin(M.f * Math.PI) : 0; FG.root.position.set(M.x, M.y, M.z); FG.root.rotation.set(0, .9, 0); FG.root.rotateX(M.dir * .52 * e);   /* 오를 땐 기수를 듦 · 내릴 땐 숙임 (옆에서 확인) */
    FG.step(dt, t, { moving: false, fire: false });
    shU.uS.value.set(M.x + .5, M.z + .4, M.y);
    /* 카메라: 게임처럼 기체 높이를 따라감 (옆에서 보기는 높이 변화를 보이게 고정) */
    if (cfg.side) { camera.position.set(M.x + 26, 5.2, M.z + 4); camera.lookAt(M.x, 5.2, M.z); }
    else { camD += (cfg.dist * CAMK * cf(M.y) - camD) * Math.min(1, dt * 3); camY += (M.y - camY) * Math.min(1, dt * 10); const a = cfg.ang * Math.PI / 180; camera.position.set(M.x, camY + camD * Math.sin(a), M.z + camD * Math.cos(a)); camera.lookAt(M.x, camY, M.z); }
    camera.updateMatrixWorld(); sky.position.copy(camera.position);
    if (say) say.textContent = `${M.L + 1}층${M.f < 1 ? (M.dir > 0 ? ' → 올라가는 중' : ' → 내려가는 중') : ''}`;
    /* 충격파를 화면 마무리에: 떠난 높이의 수평 고리 → 화면에서 납작한 타원 (가로 · 세로 반지름을 따로 잼) · 0.45초에 약 3m까지 퍼지며 사라짐 */
    { const k = M.shock / .45; if (k < 1) { const e = 1 - Math.pow(1 - k, 3), rw = .3 + 2.7 * e, c = new THREE.Vector3(M.x, M.sy, M.z).project(camera), px = new THREE.Vector3(M.x + rw, M.sy, M.z).project(camera), pz = new THREE.Vector3(M.x, M.sy, M.z + rw).project(camera);
        shockU.uS.value.set(c.x * .5 + .5, c.y * .5 + .5, Math.abs(px.x - c.x) * .5, Math.max(Math.abs(pz.y - c.y) * .5, .25 * Math.abs(px.x - c.x) * .5)); shockU.uK.value = Math.pow(1 - k, 1.6) * Math.min(1, k * 12); }
      else shockU.uK.value = 0; shockU.uAsp.value = Wd / Hd; }
    FG.preRender(camera);
    camera.layers.set(0); renderer.setRenderTarget(rtW); renderer.clear(); renderer.render(scene, camera);                    /* ① 기체를 뺀 풍경 */
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(shockS, shockC);                                   /* ② 기체 둘레만 휘게 옮겨 그림 (깊이 포함) */
    camera.layers.set(1); renderer.render(scene, camera); camera.layers.set(0);                                                /* ③ 기체 · 세로 빛줄기는 휘지 않게 그 위에 */
    bloom.render(Wd, Hd, false); perf.tick(dt); });
  onProgress(1); window.__lift = { M, cfg, camera, THREE };
}
