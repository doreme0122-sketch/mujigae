/* 층 이동 연출 시안 (2026-11-10 · 사용자: 여섯 가지는 조잡함 → 공기 일렁임만 넣고 중력 렌즈처럼 · 올라가는 세로선을 고급지게)
   움직임은 넣지 않음 (사용자: 위아래 움직이는 건 모션을 넣으면 안 됨) — 이동 속도 그대로 곧게(1초에 12m · 한 층 4m) · 기수만 들고 숙임
   · 공기 렌즈: 기체가 밀어낸 공기 때문에 둘레 풍경이 렌즈처럼 휘어 보임 (화면 마무리 단계에서 · 선 · 고리 · 색 없음)
   · 세로 빛줄기: 몇 가닥만 · 양 끝이 가늘어지는 빛 · 하나하나 길이 · 밝기 · 굵기가 다름 · 공기에 남아 있다가 기체가 지나가며 스침 (올라갈 땐 아래로 · 내려갈 땐 위로 흘러 보임)
   기체는 1층 → 2층 → 3층 → 2층 → 1층을 쉬어 가며 되풀이 · 카메라는 게임처럼 기체 높이를 따라감 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11101935';
import { makePerf } from './perf.js?v=11101935';
import { makeForgeShip, forgeList } from './forgeship.js?v=11101935';
import { SUN, reedBush, vegShader } from './flora.js?v=11101935';

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
   공기 속에 잠깐 맺히는 가는 빛 (기체가 지나는 길 둘레 · 땅에 붙어 있음) → 기체를 따라가는 카메라에는 반대로 흘러 보임
   한 가닥: 위아래 끝이 가늘어지는 방추 모양 · 가운데 심은 희고 둘레는 옅은 푸른빛 · 앞쪽(기체가 가는 쪽)이 밝고 뒤로 옅어짐 · 늘 카메라를 봄(세로축은 그대로) */
function Streaks(scene, N) {
  const g = new THREE.InstancedBufferGeometry(), P = [], I = [], SEG = 10;
  for (let k = 0; k <= SEG; k++) { const v = k / SEG; P.push(-1, v, 0, 1, v, 0); if (k < SEG) I.push(k * 2, k * 2 + 1, k * 2 + 3, k * 2, k * 2 + 3, k * 2 + 2); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
  const iA = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4), iB = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4); [iA, iB].forEach(a => a.setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('iA', iA); g.setAttribute('iB', iB); g.instanceCount = 0;   /* iA: 아래 끝 x, y, z · 길이  /  iB: 굵기 · 밝기 · 나이(0~1) · 흐름(+1 아래로 흘러 보임 · −1 위로) */
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 iA, iB; varying vec2 vQ; varying float vB, vV;
      void main(){ float v = position.y, taper = pow(sin(v * 3.14159), .7);                                            /* 양 끝이 가늘게 */
        vec3 w = iA.xyz + vec3(0., v * iA.w, 0.); vec3 side = normalize(cross(vec3(0., 1., 0.), cameraPosition - w));   /* 세로축은 그대로 두고 카메라 쪽으로 돌림 */
        w += side * position.x * iB.x * taper;
        float ag = iB.z, life = sin(clamp(ag, 0., 1.) * 3.14159);                                                          /* 맺혔다 사라짐 */
        vB = iB.y * life; vV = iB.w > 0. ? v : 1. - v; vQ = vec2(position.x, v); gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }`,
    fragmentShader: `varying vec2 vQ; varying float vB, vV;
      void main(){ float u = vQ.x, core = exp(-u * u * 18.), halo = exp(-u * u * 3.) * .35;
        float along = pow(vV, 1.6) * smoothstep(1., .82, vV) + .08;                                                        /* 앞쪽이 밝고 뒤로 옅어짐 */
        vec3 c = mix(vec3(.55, .75, 1.), vec3(1.), core) * (core + halo) * along * vB;
        gl_FragColor = vec4(c, 1.); }` }));
  m.frustumCulled = false; m.renderOrder = 9; scene.add(m);
  const L = [];
  return {
    emit(x, y, z, len, w, b, flow, life) { if (L.length >= N) L.shift(); L.push({ x, y, z, len, w, b, flow, life, age: 0 }); },
    update(dt) { let n = 0; for (let i = L.length - 1; i >= 0; i--) { L[i].age += dt; if (L[i].age >= L[i].life) L.splice(i, 1); }
      for (const q of L) { iA.array.set([q.x, q.y, q.z, q.len], n * 4); iB.array.set([q.w, q.b, q.age / q.life, q.flow], n * 4); n++; }
      g.instanceCount = n; iA.needsUpdate = iB.needsUpdate = true; } }; }

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
  /* 공기 렌즈 (중력 렌즈처럼): 기체를 뺀 풍경을 먼저 그려 두고, 기체 둘레만 휘게 옮겨 그린 뒤 기체를 그 위에 그림 — 기체 자신은 휘지 않음
     · 깊이도 같이 옮겨 써서 기체가 갈대 뒤로 숨는 것 등은 그대로 · 둘레 풍경이 기체 쪽으로 당겨져 가운데는 살짝 커 보이고, 반지름 근처에서 가장 크게 휘며 바깥으로 풀림
     · 공기라서 둥글게 고르지 않고 조금씩 일렁임 · 휘는 가장자리에서 빛이 살짝 갈라짐(진짜 렌즈처럼) */
  FG.root.traverse(o => o.layers.set(1));
  const rtW = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(2, 2) });
  const lensU = { tC: { value: rtW.texture }, tD: { value: rtW.depthTexture }, uL: { value: new THREE.Vector4(.5, .5, .1, 0) }, uF: { value: 0 }, uT: { value: 0 }, uAsp: { value: 1 } };
  const lensQ = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: lensU, depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth,
    vertexShader: 'in vec3 position; in vec2 uv; out vec2 vU; void main(){ vU = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `precision highp float; precision highp sampler2D; in vec2 vU; out vec4 o; uniform sampler2D tC, tD; uniform vec4 uL; uniform float uF, uT, uAsp;
      void main(){ vec2 uv = vU; vec3 c;
        if (uL.w > 0.) { vec2 d = (uv - uL.xy) * vec2(uAsp, 1.); float r = length(d) + 1e-5, R = max(uL.z, 1e-3), a = atan(d.y, d.x);
          float fall = exp(-pow(r / (R * 1.9), 4.)), wob = 1. + .1 * sin(a * 3. + uT * 5.) + .06 * sin(a * 5. - uT * 7.);
          float pull = min(r * .6, R * .62 * uL.w * fall * wob * R / (r + R * .55));                           /* 1/r로 휘는 빛 (가운데는 뒤집히지 않게 눌러 줌) */
          vec2 dir = d / r; uv -= dir * pull / vec2(uAsp, 1.);
          uv.y += uF * uL.w * fall * .0025 * sin(r * 80. + uT * 16. * uF);                                    /* 렌즈 안 공기가 오르내리는 쪽으로 흐르는 잔결 */
          float ca = uL.w * fall * smoothstep(R * .25, R, r) * .003;
          c = vec3(texture(tC, uv + dir * ca / vec2(uAsp, 1.)).r, texture(tC, uv).g, texture(tC, uv - dir * ca / vec2(uAsp, 1.)).b); }
        else c = texture(tC, uv).rgb;
        o = vec4(c, 1.); gl_FragDepth = texture(tD, vU).r; }` }));
  lensQ.frustumCulled = false; const lensS = new THREE.Scene(); lensS.add(lensQ); const lensC = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  /* 단추: 시점 · 천천히 보기 */
  const cfg = { ang: 45, dist: 25, side: false, slow: 1, yaw: .9 };
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
  const M = { step: 0, L: 0, to: 0, y: LY[0], f: 1, hold: .6, dir: 0, x: 0, z: 0, air: 0, rel: 0, acc: 0 };
  const CAMK = Math.tan(20 * Math.PI / 180) / Math.tan(10 * Math.PI / 180), cf = y => { const k = clamp01((y - LY[0]) / (LY[2] - LY[0])); return .85 + .45 * k; };   /* 높을수록 물러나 넓게 */
  let camD = cfg.dist * CAMK * cf(M.y), camY = M.y, last = performance.now(), t = 0; const say = $('#where'); if (say) { say.style.bottom = 'auto'; say.style.top = 'calc(env(safe-area-inset-top,0px) + 54px)'; }   /* 지금 상태 글은 위로 (단추와 겹치지 않게) */
  renderer.setAnimationLoop(now => { const dt = Math.min(.05, (now - last) / 1000) * cfg.slow; last = now; t += dt; U.uT.value = t;
    if (M.f >= 1) { M.hold -= dt; if (M.hold <= 0) { M.step = (M.step + 1) % ORDER.length; M.to = ORDER[M.step]; M.dir = Math.sign(M.to - M.L); M.f = 0; M.y0 = M.y;
        M.air = 0; } }
    let moving = false;
    if (M.f < 1) { const dur = Math.abs(LY[M.to] - M.y0) / SPEED; M.f = Math.min(1, M.f + dt / dur); M.y = M.y0 + (LY[M.to] - M.y0) * M.f; moving = M.f < 1; if (M.f >= 1) { M.L = M.to; M.hold = HOLD; } }
    /* 세로 빛줄기: 움직이는 동안 기체가 지나갈 길 둘레에 몇 가닥씩 맺힘 (공기에 붙어 있어 기체를 따라가는 화면에선 반대로 흘러 보임) */
    if (moving) { M.acc = (M.acc || 0) + dt * 26; while (M.acc > 1) { M.acc--; const a = rnd() * 6.283, r = .9 + rnd() * 1.1, len = 1.4 + rnd() * 2.2;
      SK.emit(M.x + Math.cos(a) * r, M.y + M.dir * (rnd() * 2.2) - len * .5, M.z + Math.sin(a) * r, len, .025 + rnd() * .035, .8 + rnd() * 1.0, M.dir, .32 + rnd() * .2); } }
    SK.update(dt);
    /* 공기 렌즈 세기: 움직이기 시작하면 빠르게 맺히고 · 닿으면 한 번 출렁이며 풀림 */
    if (moving) { M.air = Math.min(1, (M.air || 0) + dt / .07); M.rel = 0; } else if (M.air > 0) { M.rel = (M.rel || 0) + dt; M.air = Math.max(0, 1 - M.rel / .45); }
    /* 기체: 그 자리에서 곧게 오르내림 · 기수만 듦/숙임 */
    const e = M.f < 1 ? Math.sin(M.f * Math.PI) : 0; FG.root.position.set(M.x, M.y, M.z); FG.root.rotation.set(0, cfg.yaw, 0); FG.root.rotateX(M.dir * .52 * e);   /* 오를 땐 기수를 듦 · 내릴 땐 숙임 (옆에서 확인) */
    FG.step(dt, t, { moving: false, fire: false });
    shU.uS.value.set(M.x + .5, M.z + .4, M.y);
    /* 카메라: 게임처럼 기체 높이를 따라감 (옆에서 보기는 높이 변화를 보이게 고정) */
    if (cfg.side) { camera.position.set(M.x + 26, 5.2, M.z + 4); camera.lookAt(M.x, 5.2, M.z); }
    else { camD += (cfg.dist * CAMK * cf(M.y) - camD) * Math.min(1, dt * 3); camY += (M.y - camY) * Math.min(1, dt * 10); const a = cfg.ang * Math.PI / 180; camera.position.set(M.x, camY + camD * Math.sin(a), M.z + camD * Math.cos(a)); camera.lookAt(M.x, camY, M.z); }
    camera.updateMatrixWorld(); sky.position.copy(camera.position);
    if (say) say.textContent = `${M.L + 1}층${M.f < 1 ? (M.dir > 0 ? ' → 올라가는 중' : ' → 내려가는 중') : ''}`;
    /* 공기 렌즈를 화면 마무리에: 기체 자리 · 반지름(기체 둘레 약 3m가 화면에서 차지하는 크기) */
    { const A = M.air || 0, ease = A * A * (3 - 2 * A), ring = M.rel ? Math.sin(Math.min(1, M.rel / .45) * Math.PI * 2) * .25 * (1 - M.rel / .45) : 0;
      const c = new THREE.Vector3(M.x, M.y - .2, M.z).project(camera), e = new THREE.Vector3(M.x, M.y - .2 + 3, M.z).project(camera), R = Math.abs(e.y - c.y) * .5;
      lensU.uL.value.set(c.x * .5 + .5, c.y * .5 + .5, R, Math.max(0, ease + ring * A)); lensU.uF.value = M.dir; lensU.uT.value = t; lensU.uAsp.value = Wd / Hd; }
    FG.preRender(camera);
    camera.layers.set(0); renderer.setRenderTarget(rtW); renderer.clear(); renderer.render(scene, camera);                    /* ① 기체를 뺀 풍경 */
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(lensS, lensC);                                   /* ② 기체 둘레만 휘게 옮겨 그림 (깊이 포함) */
    camera.layers.set(1); renderer.render(scene, camera); camera.layers.set(0);                                                /* ③ 기체는 휘지 않게 그 위에 */
    bloom.render(Wd, Hd, false); perf.tick(dt); });
  onProgress(1); window.__lift = { M, cfg, camera, THREE };
}
