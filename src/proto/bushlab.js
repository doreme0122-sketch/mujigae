/* 갈대 부쉬 보기 (2026-11-10 · 사용자: 갈대로 · 잎을 넓게 하고 더 줄여 · 부쉬에 들어가도 잎이 반응 안 하게)
   모양 · 칠은 flora.js (초원 섬과 똑같은 것) · 바닥 모양 가로 약 4.6m · 세로 약 3.4m · 높이 1.7m(1층 기체가 묻힘) · 게임과 같은 시점 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11110142';
import { makePerf } from './perf.js?v=11110142';
import { makeForgeShip, forgeList } from './forgeship.js?v=11110142';
import { SUN, reedBush, vegShader } from './flora.js?v=11110142';

const $ = s => document.querySelector(s);
const hash2 = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sm = t => t * t * (3 - 2 * t);
const noise2 = (x, z) => { const i = Math.floor(x), j = Math.floor(z), u = sm(x - i), v = sm(z - j), a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1); return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1; };
const fbm = (x, z, o = 3) => { let s = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { s += a * noise2(x * f + k * 17.3, z * f - k * 9.1); f *= 2.03; a *= .5; } return s; };
const smax = (a, b, k) => { const h = Math.max(0, Math.min(1, .5 + .5 * (a - b) / k)); return b + (a - b) * h + k * h * (1 - h); };
const HB = 1.7;   /* 덤불 높이(m) */

/* 바닥 모양: 동그라미 셋을 합친 덩이 (안쪽 +, 대략 가장자리까지 거리 m) */
const shape = (x, z) => { let d = -99; for (const [cx, cz, r] of [[0, 0, 1.75], [1.3, .55, 1.25], [-1.25, -.35, 1.15]]) d = smax(d, r - Math.hypot(x - cx, z - cz), .8); return d + .14 * fbm(x * 1.6, z * 1.6, 2); };

/* 칠 공통 (초원 섬과 같은 빛: 해 · 하늘빛 · 땅 반사) */
const GL = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
float fb(vec2 p){ return vn(p) * .5 + vn(p * 2.07 + 3.1) * .25 + vn(p * 4.11 + 7.7) * .125 + vn(p * 8.3 + 1.3) * .0625; }
uniform vec3 uSun; uniform float uT;
const vec3 SUNC = vec3(1.55, 1.45, 1.28), SKYC = vec3(.50, .62, .80), GNDC = vec3(.20, .22, .12);
vec3 lit(vec3 al, vec3 n, float sh, float ao){ float d = max(dot(n, uSun), 0.); return al * (SUNC * d * sh + mix(GNDC, SKYC, .5 + .5 * n.y) * ao + .05); }
`;
const U = { uSun: { value: SUN }, uT: { value: 0 } };
const vegM = new THREE.ShaderMaterial({ uniforms: U, ...vegShader(GL), side: THREE.DoubleSide });

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0x9fc3e0, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(20, 1, .5, 2000), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .7; pm.dispose(); }
  /* 바닥: 초원 섬과 같은 풀밭 (풀결 · 들꽃 · 덤불 밑 그늘 — 해 반대쪽으로 살짝 비켜 드리움) */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 34, 1, 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: 'varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position, 1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.); }',
    fragmentShader: GL + `varying vec3 vP; void main(){ vec2 q = vP.xz; float g1 = fb(q * .14), g2 = fb(q * .8 + 4.), g3 = vn(q * 6.6);
      vec3 c = mix(vec3(.16, .36, .07), vec3(.40, .58, .12), g1); c = mix(c, vec3(.10, .27, .06), smoothstep(.5, .78, g2) * .55) * (.82 + .3 * g3);
      vec2 fc = q * 3.8, id = floor(fc), f = fract(fc) - .5, o = vec2(h21(id + 1.7), h21(id + 3.3)) - .5; float on = step(h21(id), .12 * smoothstep(.45, .72, fb(q * .1 + 9.))) * smoothstep(.13, .05, length(f - o * .6));
      c = mix(c, h21(id + 5.) < .5 ? vec3(1.1, 1.05, .95) : vec3(1.1, .9, .3), on);
      float sh = 1. - .45 * smoothstep(1.1, .35, length((q - vec2(.25, -.25)) / vec2(3.1, 2.4)));
      gl_FragColor = vec4(lit(c, vec3(0., 1., 0.), sh, sh), 1.); }` }));
  scene.add(ground);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }',
    fragmentShader: 'varying vec3 vD; void main(){ gl_FragColor = vec4(mix(vec3(.66, .78, .9), vec3(.32, .54, .84), smoothstep(-.1, .6, vD.y)), 1.); }' })); sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  onProgress(.2); await new Promise(r => setTimeout(r, 20));
  const NAMES = ['갈대 부쉬'], X = () => 0, info = [];
  { const t0 = performance.now(), R = reedBush({ foot: shape, box: [-3.2, -2.5, 3.2, 2.5], cx: 0, cz: 0, seed: 11, HB }); scene.add(new THREE.Mesh(R.geo, vegM));
    info.push({ tris: R.tris, top: R.top, clumps: R.clumps, ms: Math.round(performance.now() - t0) }); onProgress(.8); }
  /* 크기 비교용 기체 (지금 고른 스킨) — 1층 높이(땅 위 1.2m)에서 덤불 옆에 떠 있음 */
  const SKINS = forgeList(renderer, camera); let skinId = 'blazedrake'; try { skinId = localStorage.getItem('mj-skin') || skinId; } catch (e) {}
  const FG = await makeForgeShip(renderer, camera, Math.max(0, SKINS.findIndex(s => s.id === skinId))); scene.add(FG.root); FG.root.position.set(-3.2, 1.2, 2.7); FG.root.rotation.y = .4;
  onProgress(.95);

  /* 카메라: 게임과 같은 시점 (시야각 20° · 45° 내려봄) · 단추로 하나씩 · 끌어서 옆으로 */
  const cfg = { ang: 45, dist: 20, focus: -1 }; const cam = { x: 0, z: 0, d: 60 };
  { const bar = document.createElement('div'); bar.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 12px);display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-width:calc(100% - 32px)';
    const mk = (label, k) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.style.cssText = 'font-size:12px;padding:6px 11px;border:1px solid rgba(185,255,74,.45);border-radius:12px;color:#eaffd2;background:rgba(4,10,6,.6)';
      b.onclick = () => { cfg.focus = k; [...bar.children].forEach(c => c.style.background = 'rgba(4,10,6,.6)'); b.style.background = 'rgba(120,180,40,.45)'; }; bar.append(b); return b; };
    mk('멀리', -1).style.background = 'rgba(120,180,40,.45)'; mk('가까이', 0); $('#ui').append(bar); }
  const labels = NAMES.map(n => { const d = document.createElement('div'); d.textContent = n; d.style.cssText = 'position:absolute;transform:translate(-50%,-100%);font-size:12px;color:#fff;padding:3px 8px;border-radius:9px;background:rgba(4,8,16,.55);pointer-events:none;white-space:nowrap'; $('#ui').append(d); return d; });
  const drag = { id: null, x: 0, off: 0 }; addEventListener('pointerdown', e => { if (e.target.closest('#ui')) return; drag.id = e.pointerId; drag.x = e.clientX; });
  addEventListener('pointermove', e => { if (e.pointerId !== drag.id) return; drag.off -= (e.clientX - drag.x) * cam.d * .0016; drag.x = e.clientX; }); addEventListener('pointerup', () => { drag.id = null; });
  let Wd = 2, Hd = 2; const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); }
  addEventListener('resize', size); size();
  const say = $('#where'), v = new THREE.Vector3();
  renderer.setAnimationLoop(now => { const t = now / 1000; U.uT.value = t;
    const tx = drag.off, td = cfg.focus < 0 ? 34 : cfg.dist; cam.x += (tx - cam.x) * .08; cam.d += (td - cam.d) * .08;
        const a = cfg.ang * Math.PI / 180; camera.position.set(cam.x, 1.6 + cam.d * Math.sin(a), cam.z + cam.d * Math.cos(a)); camera.lookAt(cam.x, 1.6, cam.z); camera.updateMatrixWorld(); sky.position.copy(camera.position);
    info.forEach((I, k) => { v.set(X(k), I.top + .4, 0).project(camera); const L = labels[k]; L.style.left = ((v.x * .5 + .5) * 100) + '%'; L.style.top = ((-v.y * .5 + .5) * 100) + '%'; L.style.display = v.z < 1 ? '' : 'none'; });
    if (say) say.style.display = 'none'; labels.forEach((L, k) => { L.textContent = `${NAMES[k]} · 포기 ${info[k].clumps}개 · 삼각형 ${info[k].tris.toLocaleString()}개`; });
    FG.step(.016, t, { moving: false, fire: false }); FG.preRender(camera);
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera); bloom.render(Wd, Hd, false); perf.tick(1 / 60); });
  onProgress(1); console.log('[갈대 부쉬]', JSON.stringify(info.map(I => ({ tris: I.tris, clumps: I.clumps, ms: I.ms }))));
  window.__bush = { cfg, info, camera, THREE };
}
