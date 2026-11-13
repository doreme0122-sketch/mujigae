/* 층 이동 연출 시안 (2026-11-10 · 사용자: 렌즈는 볼록 렌즈 같음 → 태어날 때 운석 충격파처럼 작게 · 내려갈 땐 충격파 없이 세로 빛줄기만 싹 · 빛줄기는 단순한 선 느낌이 안 나게)
   움직임은 넣지 않음 (사용자: 위아래 움직이는 건 모션을 넣으면 안 됨) — 이동 속도 그대로 곧게(1초에 12m · 한 층 4m) · 기수만 들고 숙임
   · 올라갈 때: 박차는 자리에서 작은 충격파(센 첫 물결 + 약한 물결 둘 · 기체 둘레 약 3m · 풍경만 일렁이고 기체는 안 휨) + 세로 빛줄기
   · 내려갈 때: 세로 빛줄기만 위로 싹
   · 세로 빛줄기: 바람에 찢긴 빛 조각이 끊어지며 흐름 · 아주 가는 흰 심 + 옅은 푸른 번짐 · 꼬리는 흐려짐 · 기체에 가까운 건 굵고 밝고 빠르게, 먼 건 가늘고 느리게(깊이) · 작은 빛 알갱이가 줄기를 따라 미끄러짐 · 조금씩 흔들림
   기체는 1층 → 2층 → 3층 → 2층 → 1층을 쉬어 가며 되풀이 · 카메라는 게임처럼 기체 높이를 따라감 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11131300';
import { makePerf } from './perf.js?v=11131300';
import { makeForgeShip, forgeList } from './forgeship.js?v=11131300';
import { SUN, reedBush, vegShader } from './flora.js?v=11131300';
import { makeLiftFx } from './liftfx.js?v=11131300';

const $ = s => document.querySelector(s);
const hash2 = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sm = t => t * t * (3 - 2 * t);
const noise2 = (x, z) => { const i = Math.floor(x), j = Math.floor(z), u = sm(x - i), v = sm(z - j), a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1); return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1; };
const fbm = (x, z, o = 3) => { let s = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { s += a * noise2(x * f + k * 17.3, z * f - k * 9.1); f *= 2.03; a *= .5; } return s; };
const smax = (a, b, k) => { const h = Math.max(0, Math.min(1, .5 + .5 * (a - b) / k)); return b + (a - b) * h + k * h * (1 - h); };
const clamp01 = t => Math.min(1, Math.max(0, t));

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

  const fx = makeLiftFx(renderer, scene); fx.mine(FG.root);   /* 오르내리기 연출 (초원 섬과 같은 것) */
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
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); fx.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); }
  addEventListener('resize', size); size();

  /* 오르내림: 이동 속도 그대로 곧게 · 기수만 들고 숙임 (섬과 같은 약 30°) */
  const M = { step: 0, L: 0, to: 0, y: LY[0], f: 1, hold: .6, dir: 0, x: 0, z: 0 };
  const CAMK = Math.tan(20 * Math.PI / 180) / Math.tan(10 * Math.PI / 180), cf = y => { const k = clamp01((y - LY[0]) / (LY[2] - LY[0])); return .85 + .45 * k; };   /* 높을수록 물러나 넓게 */
  let camD = cfg.dist * CAMK * cf(M.y), camY = M.y, last = performance.now(), t = 0; const say = $('#where'); if (say) { say.style.bottom = 'auto'; say.style.top = 'calc(env(safe-area-inset-top,0px) + 54px)'; }   /* 지금 상태 글은 위로 (단추와 겹치지 않게) */
  renderer.setAnimationLoop(now => { const dt = Math.min(.05, (now - last) / 1000) * cfg.slow; last = now; t += dt; U.uT.value = t;
    if (M.f >= 1) { M.hold -= dt; if (M.hold <= 0) { M.step = (M.step + 1) % ORDER.length; M.to = ORDER[M.step]; M.dir = Math.sign(M.to - M.L); M.f = 0; M.y0 = M.y; fx.go(M.dir, M.x, M.y, M.z); } }
    let moving = false;
    if (M.f < 1) { const dur = Math.abs(LY[M.to] - M.y0) / SPEED; M.f = Math.min(1, M.f + dt / dur); M.y = M.y0 + (LY[M.to] - M.y0) * M.f; moving = M.f < 1; if (M.f >= 1) { M.L = M.to; M.hold = HOLD; } }
    fx.step(dt, { moving, f: M.f, x: M.x, y: M.y, z: M.z, left: (1 - M.f) * Math.abs(LY[M.to] - M.y0) / SPEED });
    /* 기체: 그 자리에서 곧게 오르내림 · 기수만 듦/숙임 */
    const e = M.f < 1 ? Math.sin(M.f * Math.PI) : 0; FG.root.position.set(M.x, M.y, M.z); FG.root.rotation.set(0, .9, 0); FG.root.rotateX(M.dir * .52 * e);   /* 오를 땐 기수를 듦 · 내릴 땐 숙임 (옆에서 확인) */
    FG.step(dt, t, { moving: false, fire: false });
    shU.uS.value.set(M.x + .5, M.z + .4, M.y);
    /* 카메라: 게임처럼 기체 높이를 따라감 (옆에서 보기는 높이 변화를 보이게 고정) */
    if (cfg.side) { camera.position.set(M.x + 26, 5.2, M.z + 4); camera.lookAt(M.x, 5.2, M.z); }
    else { camD += (cfg.dist * CAMK * cf(M.y) - camD) * Math.min(1, dt * 3); camY += (M.y - camY) * Math.min(1, dt * 10); const a = cfg.ang * Math.PI / 180; camera.position.set(M.x, camY + camD * Math.sin(a), M.z + camD * Math.cos(a)); camera.lookAt(M.x, camY, M.z); }
    camera.updateMatrixWorld(); sky.position.copy(camera.position);
    if (say) say.textContent = `${M.L + 1}층${M.f < 1 ? (M.dir > 0 ? ' → 올라가는 중' : ' → 내려가는 중') : ''}`;
    FG.preRender(camera);
    fx.render(camera, bloom.scene);
    bloom.render(Wd, Hd, false); perf.tick(dt); });
  onProgress(1); window.__lift = { M, cfg, camera, THREE };
}
