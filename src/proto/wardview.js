/* 와드 보기 — 부품을 하나씩 만들며 봄 (사용자 2026-11-03: 참고 그림대로, 파츠를 하나씩)
   지금: ① 받침 (wardbase.js) · ② 유리 기둥 (wardcore.js) · ③ 도는 고리 (wardring.js) · ④ 양옆 첨탑 (wardspire.js) · ⑤ 꼭대기 눈 홀로그램 (wardeye.js)
   빛 색 = 주인 색 (빈 와드 푸른 빛 · 내 와드 연두 · 남의 와드 붉은 주황) */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11040006';
import { chunk, obsidianMaterial } from './rocks.js?v=11040006';
import { makeWardBase } from './wardbase.js?v=11040006';
import { makeWardCore } from './wardcore.js?v=11040006';
import { makeWardRing } from './wardring.js?v=11040006';
import { makeWardSpires } from './wardspire.js?v=11040006';
import { makeWardEye } from './wardeye.js?v=11040006';
import { pointPool } from './skilldemo.js?v=11040006';
import { makePerf } from './perf.js?v=11040006';
import * as A from '../core/audio.js';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp, V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const sm01 = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
export const WARD = { CAP: 10, TP: 5, RING: 4, EYE: 1.85 };
const COL = { none: V(.35, .85, 1.0), mine: V(.62, 1.0, .32), foe: V(1.0, .36, .24) };

/* 소리 */
function bell(f, vol = .1, dec = 1.4, at = 0) { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime + at;
  [[1, 1], [2.76, .4], [5.4, .2]].forEach(([m, v]) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f * m; o.connect(g); A.env(g, t0, .004, vol * v, dec / Math.sqrt(m)); A.out(g, .6); o.start(t0); o.stop(t0 + dec + .1); }); }
function hum(f, vol, dur) { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * 1.03, t0 + dur); o.connect(g); A.env(g, t0, .01, vol, dur); A.out(g, .3); o.start(t0); o.stop(t0 + dur + .05); }
function crack() { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, s = A.noise(.35), hp = c.createBiquadFilter(), g = c.createGain(); hp.type = 'highpass'; hp.frequency.value = 2200; s.connect(hp); hp.connect(g); A.env(g, t0, .002, .16, .3); A.out(g, .4); s.start(t0);
  const o = c.createOscillator(), g2 = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(600, t0); o.frequency.exponentialRampToValueAtTime(90, t0 + .3); o.connect(g2); A.env(g2, t0, .003, .07, .3); A.out(g2, .2); o.start(t0); o.stop(t0 + .35); }
function rise(dur) { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, s = A.noise(dur), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.Q.value = 3; bp.frequency.setValueAtTime(400, t0); bp.frequency.exponentialRampToValueAtTime(5000, t0 + dur);
  s.connect(bp); bp.connect(g); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.09, t0 + dur * .95); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur + .05); A.out(g, .5); s.start(t0); return () => { try { g.gain.cancelScheduledValues(c.currentTime); g.gain.setTargetAtTime(.0001, c.currentTime, .03); } catch (e) {} }; }
function boom() { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(160, t0); o.frequency.exponentialRampToValueAtTime(45, t0 + .5); o.connect(g); A.env(g, t0, .004, .32, .6); A.out(g, .3); o.start(t0); o.stop(t0 + .7); }

/* ── 받침: 흑요석 바위 덩어리 여럿을 뭉침 (맵 벽과 같은 재질) ── */
function baseGeo() {
  const parts = [[0, .3, 0, 1.25, .75, 1.25, 61], [.95, .12, .35, .7, .5, .6, 63], [-.7, .1, .8, .62, .42, .7, 64], [-.55, .14, -.85, .75, .5, .58, 65], [.4, .08, -1.05, .5, .34, .48, 66], [1.25, .04, -.6, .42, .3, .4, 62]];
  const gs = parts.map(([x, y, z, sx, sy, sz, sd]) => { const g = chunk('obsidian', sd, 3); g.scale(sx, sy, sz); g.rotateY(sd * 1.7); g.translate(x, y, z); return g; });
  const keys = Object.keys(gs[0].attributes); gs.forEach(g => { for (const k of Object.keys(g.attributes)) if (!keys.includes(k)) g.deleteAttribute(k); });
  return mergeGeometries(gs.map(g => g.index ? g.toNonIndexed() : g));
}
/* 바닥: 길목 바닥(짙은 현무암 결) + 차지 고리 + 보이는 범위 물결 + 등대 빛이 쓴 자리 — 한 장에 그림 */
function groundMat() {
  return new THREE.ShaderMaterial({ transparent: false, uniforms: { uT: { value: 0 }, uCol: { value: V() }, uProg: { value: 0 }, uOwn: { value: 0 }, uPhi: { value: 0 }, uPulse: { value: 99 }, uHurt: { value: 0 }, uTp: { value: 0 }, uR: { value: WARD.RING }, uArr: { value: new THREE.Vector2() } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uT, uProg, uOwn, uPhi, uPulse, uHurt, uTp, uR; uniform vec3 uCol; uniform vec2 uArr; varying vec2 vP;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += n(p) * a; p *= 2.03; a *= .5; } return s; }
      void main(){ float r = length(vP), a = atan(vP.y, vP.x + 1e-5), u = fract((a / 6.2832) + .25);            /* u: 고리를 12시부터 시계 방향으로 */
        float g = fbm(vP * .45), g2 = fbm(vP * 2.1 + 7.);
        vec3 c = mix(vec3(.028, .03, .038), vec3(.06, .062, .075), g) + vec3(.02) * smoothstep(.62, .8, g2);
        c *= .7 + .3 * smoothstep(30., 6., r); c *= c * 4.;                                                 /* 바닥 바탕은 화면에 보이는 밝기로 맞춤(들뜬 회색 → 짙은 현무암) */
        /* 차지 고리: 바깥 가는 테 + 눈금 36 + 안쪽 넓은 띠(차지한 만큼 채워짐) */
        float d1 = (r - uR) / .05, d2 = (r - (uR - .38)) / .16;
        float tick = step(.82, fract(u * 36.)) * smoothstep(.2, 0., abs(r - uR - .25));
        float fill = step(u, uProg) * exp(-d2 * d2);
        float head = uProg > 0. && uProg < 1. ? exp(-pow(abs(u - uProg) * 40., 2.)) * exp(-d2 * d2 * .5) * 2. : 0.;
        vec3 rc = uCol * uCol;
        /* 땅에 눈금·선 고리는 그리지 않음 (사용자: 빛 시계 같은 선 금지) — 차지는 와드 몸의 빛 원으로 */

        /* 등대 빛이 쓰는 자리 (내 와드·남의 와드일 때) */
        float da = abs(atan(sin(a - uPhi), cos(a - uPhi)));
        c += rc * uOwn * smoothstep(.32, 0., da) * smoothstep(uR, uR + 2., r) * smoothstep(22., 6., r) * (.35 + .25 * g2);
        /* 보이는 범위 물결: 차지 순간 + 몇 초마다 한 번, 안에서 밖으로 */
        float pr = uPulse * 9., dp = (r - pr) / .5;
        c += rc * exp(-dp * dp) * max(0., 1. - uPulse / 2.4) * smoothstep(uR - 1., uR + 1., r) * (.6 + .6 * g2);
        /* 순간 이동: 고리 앞 도착 자리에 빛이 모임 */
        vec2 q = vP - uArr; float dq = length(q), dr = (dq - 1.6 * (1. - uTp)) / .08;      /* 도착 자리 = 화면 쪽(+z) 고리 앞 */

        gl_FragColor = vec4(c, 1.); }` });
}
/* 꽃잎 속 빛 (흑요석 칼날 속으로 흐르는 상태 색) */
const coreMat = () => new THREE.ShaderMaterial({ ...AB, uniforms: { uCol: { value: V() }, uI: { value: 0 }, uT: { value: 0 } },
  vertexShader: 'varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: 'uniform vec3 uCol; uniform float uI, uT; varying float vY; void main(){ float k = smoothstep(-.1, 1.2, vY); float flow = .7 + .3 * sin(vY * 9. - uT * 4.); gl_FragColor = vec4(uCol * uCol * (.25 + k * .9) * flow * uI, 1.); }' });
/* 등대 빛: 눈에서 나가 바닥으로 비스듬히 퍼지는 부드러운 빛 뿔 (선이 아니라 넓게 번지는 빛 덩이, 먼지가 흩날림) */
function beamMat() {
  return new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uCol: { value: V() }, uI: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vU; varying vec3 vN, vW; void main(){ vU = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 uCol; uniform float uI, uT; varying vec2 vU; varying vec3 vN, vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ vec3 Vd = normalize(cameraPosition - vW); float edge = abs(dot(normalize(vN), Vd)); float along = 1. - vU.y;      /* 0 = 눈, 1 = 끝 */
        float body = edge * edge * smoothstep(0., .08, along) * (1. - along) * (1. - along);
        float dust = step(.985, h(floor(vec2(vU.x * 90., along * 60. - uT * 6.)))) * (1. - along);
        gl_FragColor = vec4((uCol * uCol * .55 + .1) * (body * .5 + dust * .8) * uI, 1.); }` });
}

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0x020308, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, .1, 300), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .55; pm.dispose(); }
  const key = new THREE.DirectionalLight(0xfff0dc, 2.4); key.position.set(-6, 9, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0x8fb0ff, .7); fill.position.set(6, 4, -7); scene.add(fill);
  scene.add(new THREE.HemisphereLight(0x5a6890, 0x0e0c14, .35));
  onProgress(.2);
  const uT = { value: 0 };
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 160), groundMat()); ground.rotation.x = -Math.PI / 2; scene.add(ground); const GU = ground.material.uniforms;
  const obs = obsidianMaterial(uT);
  { const gs = []; for (let i = 0; i < 26; i++) { const a = i * 2.39996 + .4, r = 7 + (i * 37 % 17) * 1.3, s = .25 + (i * 13 % 7) * .09; const g = chunk('obsidian', 70 + i % 6, 2); g.scale(s, s * .6, s * 1.1); g.rotateY(i); g.translate(Math.cos(a) * r, s * .1, Math.sin(a) * r); gs.push(g.index ? g.toNonIndexed() : g); }
    const keys = Object.keys(gs[0].attributes); gs.forEach(g => { for (const k of Object.keys(g.attributes)) if (!keys.includes(k)) g.deleteAttribute(k); }); scene.add(new THREE.Mesh(mergeGeometries(gs), obs)); }
  const base = makeWardBase(uT); scene.add(base);
  const core = makeWardCore(uT, base.userData.top); scene.add(core);
  const ring = makeWardRing(uT, base.userData.top + core.userData.height * .5); scene.add(ring);
  const eye = makeWardEye(uT, base.userData.top + core.userData.height); scene.add(eye);
  const spires = makeWardSpires(uT, [[-1.56, .96, 0], [1.56, .96, 0]]); scene.add(spires);   /* 양옆 큰 장갑 돌 위, 도는 고리 바깥 */
  onProgress(.8);
  const motes = pointPool(400, false, .12); scene.add(motes.pts);
  /* 순간 이동 빛: 와드 몸을 감싸는 얇은 빛 껍질이 땅의 빛 원에서 탑 꼭대기까지 차오름 (기둥처럼 세우지 않고 와드 모양을 따라 감쌈) */
  const sheath = new THREE.Mesh(new THREE.LatheGeometry([[2.16, 0], [2.05, .3], [1.55, .85], [1.15, 1.25], [.78, 1.6], [.7, 2.2], [.72, 3.0], [.6, 3.45]].map(([r, y]) => new THREE.Vector2(r, y)), 64),
    new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uRise: { value: -9 }, uI: { value: 0 }, uCol: { value: V() }, uT: { value: 0 } },
      vertexShader: 'varying vec3 vW, vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uRise, uI, uT; uniform vec3 uCol; varying vec3 vW, vN;
        void main(){ vec3 Vd = normalize(cameraPosition - vW); float q = 1. - abs(dot(normalize(vN), Vd)), rim = q * q;
          float below = smoothstep(uRise + .02, uRise - .5, vW.y), d = (vW.y - uRise) / .1, front = exp(-d * d);
          float a = atan(vW.z, vW.x + 1e-5), wave = .7 + .3 * sin(a * 9. + vW.y * 6. - uT * 5.);
          vec3 c = (uCol * uCol + .2) * (below * (.06 + rim * .55) * wave + front * (.35 + rim * 1.2));
          gl_FragColor = vec4(c * uI, 1.); }` }));
  sheath.renderOrder = 10; scene.add(sheath);
  const S = { own: 'none', col: COL.none.clone(), power: .4, fill: .12, cap: -1, tp: -1, done: -9, doneStep: 0 };
  const stEl = $('#state'); const names = { none: '빈 와드 — 푸른 빛', mine: '내 와드 — 연두 빛', foe: '남의 와드 — 붉은 주황 빛' };
  const tour = $('#tour'); [['빈 와드', 'none'], ['내 와드', 'mine'], ['남의 와드', 'foe'], ['내가 차지(10초)', 'cap'], ['순간 이동(5초)', 'tp']].forEach(([n, k]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = n;
    b.onclick = () => { if (k === 'tp') { S.cap = -1; if (S.own !== 'mine') { S.own = 'mine'; S.fill = 1; } S.tp = t; stEl.textContent = '순간 이동 중 — 빛 원에서 탑 위로 빛이 차오름'; } else if (k === 'cap') { S.tp = -1; S.own = 'none'; S.cap = t; stEl.textContent = '② 유리 기둥 · 차지하는 중 — 에너지가 아래부터 차오름'; } else { S.own = k; S.cap = -1; S.fill = k === 'none' ? .12 : 1; stEl.textContent = '와드 완성 · ' + names[k]; } tour.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
    if (k === 'none') b.classList.add('on'); tour.appendChild(b); });
  stEl.textContent = '와드 완성 · ' + names.none;
  const cam = { h: 12, H: 12, tilt: 1.15, T: 1.15, az: .35 };
  const ptr = new Map(); let pin = 0;
  addEventListener('pointerdown', e => { if (e.target.closest('#tour') || e.target.closest('#perf')) return; ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, c] = [...ptr.values()]; pin = Math.hypot(a[0] - c[0], a[1] - c[1]); } });
  addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; const o = ptr.get(e.pointerId);
    if (ptr.size === 1) { cam.az -= (e.clientX - o[0]) * .006; cam.T = cam.tilt = clamp(cam.tilt + (e.clientY - o[1]) * .004, .2, 1.45); }
    ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, c] = [...ptr.values()], d = Math.hypot(a[0] - c[0], a[1] - c[1]); if (pin) cam.H = clamp(cam.H * pin / d, 3, 40); pin = d; } });
  const upF = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pin = 0; }; addEventListener('pointerup', upF); addEventListener('pointercancel', upF);
  addEventListener('wheel', e => { cam.H = clamp(cam.H * Math.exp(e.deltaY * .0012), 3, 40); }, { passive: true });
  let Wd = 2, Hd = 2;
  const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); }
  addEventListener('resize', size); size(); bloom.setSamples(perf.st.aa ? 4 : 0);
  let last = performance.now(), t = 0; motes.setPx(Hd);
  renderer.setAnimationLoop(now => { try {
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt; uT.value = t;
    if (S.cap >= 0) { const k = Math.min(1, (t - S.cap) / 10); S.fill = .12 + .88 * k; if (k >= 1) { S.cap = -1; S.own = 'mine'; S.done = t; S.doneStep = 0; stEl.textContent = '차지 완료 — ' + names.mine; } }
    const capping = S.cap >= 0, wantCol = capping ? COL.none.clone().lerp(COL.mine, .3 + .7 * (S.fill - .12) / .88) : COL[S.own];
    S.col.lerp(wantCol, Math.min(1, dt * 4)); S.power += ((S.own === 'none' ? (capping ? .35 + .5 * S.fill : .35) : 1) - S.power) * Math.min(1, dt * 2);
    base.userData.update(t, S.col, S.power); core.userData.update(t, S.col, S.power + (t - S.done > .25 && t - S.done < 1.2 ? 1.2 : 0), S.fill);
    spires.userData.update(t, S.col, S.power, S.own !== 'none' && !capping, S.boost || 0);
    eye.userData.update(t, dt, S.col, S.power, capping ? (S.fill - .12) / .88 : S.own !== 'none' ? 1 : 0);
    ring.userData.update(t, dt, S.col, S.power, S.tp >= 0 || (t - S.done > .25 && t - S.done < .9) ? 3.2 : capping ? .08 + (S.fill - .12) * 1.1 : S.own !== 'none' ? .5 : .06);
    /* 차지 완료 효과 (원인 → 결과, 약 1.5초): ① 빛 원이 닫혀 하얀 빛이 한 바퀴 → ② 그 힘이 받침 틈·홈을 타고 위로 치솟음(기둥이 끓고 고리가 휘돎)
       → ③④ 꼭대기에 닿는 순간 한꺼번에: 눈이 번쩍 떠지며 원판이 펼쳐지고 · 첨탑 불꽃이 솟고 · 땅을 따라 빛 물결이 둘레로 퍼짐 → ⑤ 소리 */
    const de = t - S.done, run = de >= 0 && de < .3 ? de / .3 : -1, surge = de >= .25 && de < .75 ? (de - .25) / .5 : -1, hit = de >= .75 && de < 2.4;
    if (de >= 0 && S.doneStep === 0) { S.doneStep = 1; [784, 987.8, 1174.7, 1568].forEach((f, i) => bell(f, .07, 1.2, i * .1)); }
    if (de >= .75 && S.doneStep === 1) { S.doneStep = 2; eye.userData.snap(t); GU.uR.value = 2.25; S.pulse = 0; boom(); bell(2093, .1, 2.4, .02); bell(1318.5, .08, 2.6, .05);
      motes.emit(q => { q.p.set(0, base.userData.top + core.userData.height + 1.6, 0); q.v.randomDirection().multiplyScalar(1.5 + Math.random() * 2.5); q.max = q.life = .7 + Math.random() * .5; q.c.copy(COL.mine); q.s = 1.1; q.g = 1.5; }, 90); }
    S.pulse = (S.pulse ?? 99) + dt; GU.uPulse.value = S.pulse;
    S.boost = hit ? Math.exp(-(de - .75) * 3) : 0;
    { const bg = base.userData.glow.uniforms, cg = core.userData.glow.uniforms;                 /* 차지 고리 · 순간 이동 빛 */
      bg.uProg.value = capping ? (t - S.cap) / 10 : S.own !== 'none' ? 1 : 0; bg.uPCol.value.copy(capping ? COL.mine : COL[S.own]);
      let rise = -9, ri = 0; if (S.tp >= 0) { const k = (t - S.tp) / 5; rise = -.2 + k * 3.9; ri = Math.min(1, k * 4); if (k >= 1) { const e = (t - S.tp - 5) / .6; ri = Math.max(0, 1 - e); rise = 9; if (e >= 1) { S.tp = -1; stEl.textContent = '도착 — ' + names.mine; } } }
      if (surge >= 0) { rise = -.2 + surge * 3.9; ri = 1; } else if (hit && S.tp < 0) { rise = 9; ri = Math.max(0, 1 - (de - .75) * 1.5); }
      bg.uRun.value = run;
      for (const u of [bg, cg, ring.userData.glow.uniforms, eye.userData.glow.uniforms, ...spires.userData.glows.map(g => g.uniforms)]) { u.uRise.value = rise; u.uRiseI.value = ri; }
      { const U = sheath.material.uniforms; U.uRise.value = rise; U.uI.value = ri; U.uCol.value.copy(COL.mine); U.uT.value = t; sheath.visible = ri > .01; }
      if (S.tp >= 0 && rise < 4) { const top = Math.max(.1, rise);                                            /* 빛 원에서 떠오른 빛 알갱이가 차오르는 높이까지 탑을 타고 오름 */
        motes.emit(q => { const a = Math.random() * 6.283, r = 2.05 - Math.random() * .2; q.p.set(Math.cos(a) * r, .05, Math.sin(a) * r); const tr = .5 + Math.random() * .3;
          q.v.set(-Math.cos(a) * (r - tr) / .9, top / .9, -Math.sin(a) * (r - tr) / .9); q.drag = 0; q.max = q.life = .9; q.c.copy(COL.mine); q.s = .8; }, 4); }
      if (S.tp >= 0 && rise === 9 && ri > .97) motes.emit(q => { q.p.set(0, 3.3, 0); q.v.randomDirection().multiplyScalar(2 + Math.random() * 2); q.max = q.life = .6; q.c.copy(COL.mine); q.s = 1.2; q.g = 2; }, 60); }
    motes.update(dt);
    GU.uT.value = t; GU.uCol.value.copy(S.col); GU.uProg.value = 0; GU.uOwn.value = 0;
    cam.h += (cam.H - cam.h) * Math.min(1, dt * 3); cam.tilt += (cam.T - cam.tilt) * Math.min(1, dt * 3);
    camera.position.set(Math.sin(cam.az) * cam.h * Math.sin(cam.tilt), cam.h * Math.cos(cam.tilt) + .6, Math.cos(cam.az) * cam.h * Math.sin(cam.tilt)); camera.lookAt(0, 2.1, 0);
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera); bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
  } catch (err) { console.error('[와드 보기]', err); } });
  onProgress(1);
  window.__wd = { get t() { return t; }, S, cam };
}
