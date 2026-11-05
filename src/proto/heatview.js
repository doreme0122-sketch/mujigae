/* 기본탄 과열 시안 셋 (2026-11-04 사용자: 지금 과열은 촌스럽고 고급스럽지 않음 → 시안 몇 가지, 무겁지 않게)
   공통 원칙: 빛 덩어리를 덧붙이지 않고 기체 금속 자체가 달아오름 · 달군 쇠의 실제 색 순서(어두운 빨강 → 빨강 → 주황 → 노랑빛 하양)
   A 이음매가 달아오름: 총구 쪽 금속의 모서리·이음매를 따라 가는 선이 열만큼 달아오름 + 총구 앞 공기 아지랑이 · 과열 순간 선이 하얗게 확 타오르고 옆 통풍구에서 가는 김 · 식으며 틱틱 수축 소리
   B 열이 번져 감: 총구에서 시작한 열이 쏠수록 몸통 쪽으로 번져 감(얼마나 뒤까지 달아올랐나 = 열 정도) · 과열이면 몸 끝까지 닿고 기체가 파르르
   C 절제: 기체는 그대로, 총구 끝 아주 작은 점의 색만 달군 쇠 색으로 + 아지랑이만
   무게: 기체 재질에 몇 줄 더함 + 화면 마무리 단계에서 한 번 일렁임 (그리기 횟수 늘지 않음) */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11051417';
import { buildShip } from '../core/ships/build.js';
import { pointPool } from './skilldemo.js?v=11051417';
import { makePerf } from './perf.js?v=11051417';
import * as A from '../core/audio.js';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp;
const SHOT = { rate: 7, heat: .0476, cool: .44, wait: .3, lock: .3 };   /* 쉬지 않고 쏘면 약 3초에 과열 */
/* 달군 쇠 색 */
export function blackbody(h, out = new THREE.Vector3()) { const k = clamp(h, 0, 1);
  const st = [[0, .25, .015, 0], [.3, .8, .07, .01], [.6, 1.25, .38, .04], [.85, 1.45, .9, .35], [1, 1.6, 1.35, 1.]];
  for (let i = 1; i < st.length; i++) if (k <= st[i][0]) { const a = st[i - 1], b = st[i], u = (k - a[0]) / (b[0] - a[0]); return out.set(a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u); }
  return out.set(1.6, 1.35, 1); }
const BB_GLSL = `vec3 bb(float h){ h = clamp(h, 0., 1.);
  vec3 c0 = vec3(.25,.015,0.), c1 = vec3(.8,.07,.01), c2 = vec3(1.25,.38,.04), c3 = vec3(1.45,.9,.35), c4 = vec3(1.6,1.35,1.);
  return h < .3 ? mix(c0, c1, h / .3) : h < .6 ? mix(c1, c2, (h - .3) / .3) : h < .85 ? mix(c2, c3, (h - .6) / .25) : mix(c3, c4, (h - .85) / .15); }`;

/* 소리 */
function pew() { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain(), f = 1250 + Math.random() * 160; o.type = 'triangle'; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * .42, t0 + .07); o.connect(g); A.env(g, t0, .002, .03, .08); A.out(g, .1); o.start(t0); o.stop(t0 + .12); }
function flare() { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime;                                         /* 과열: 낮게 울리는 금속 + 짧게 새는 김 */
  const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(220, t0); o.frequency.exponentialRampToValueAtTime(140, t0 + .6); o.connect(g); A.env(g, t0, .005, .08, .7); A.out(g, .4); o.start(t0); o.stop(t0 + .8);
  const n = A.noise(.5), bp = c.createBiquadFilter(), g2 = c.createGain(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(6000, t0); bp.frequency.exponentialRampToValueAtTime(2500, t0 + .45); bp.Q.value = 1.2; n.connect(bp); bp.connect(g2); A.env(g2, t0 + .05, .01, .05, .45); A.out(g2, .3); n.start(t0 + .05); }
function tickS() { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain(), f = 2600 + Math.random() * 1400; o.type = 'sine'; o.frequency.value = f; o.connect(g); A.env(g, t0, .001, .018, .05); A.out(g, .5); o.start(t0); o.stop(t0 + .07); }   /* 식는 금속이 틱 */

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0x020308, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, .1, 200), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .55; pm.dispose(); }
  const key = new THREE.DirectionalLight(0xfff0dc, 2.4); key.position.set(-60, 120, -40); scene.add(key);
  const fill = new THREE.DirectionalLight(0x8fb0ff, .6); fill.position.set(70, 50, 90); scene.add(fill);
  scene.add(new THREE.HemisphereLight(0x8a9ac0, 0x14100c, 1.1));
  const uT = { value: 0 };
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.ShaderMaterial({ uniforms: { uT },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uT; varying vec2 vP; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){ float g = n(vP * .12) * .6 + n(vP * .4) * .4; vec3 c = mix(vec3(.02, .025, .035), vec3(.04, .05, .06), g); c *= smoothstep(30., 6., length(vP)); c *= c * 5.; gl_FragColor = vec4(c, 1.); }` }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  onProgress(.2);
  const b = await buildShip(1, 1, 'ruby', { renderer, size: 2 }); const ship = b.root; ship.position.y = .7; scene.add(ship);
  ship.updateMatrixWorld(true);
  /* 기체 앞뒤 끝 (기체 자리 기준) */
  const inv = new THREE.Matrix4().copy(ship.matrixWorld).invert(), bx = new THREE.Box3().setFromObject(ship).applyMatrix4(inv);
  const H = { heat: { value: 0 }, flash: { value: 0 }, mode: { value: 0 }, inv: { value: inv }, z0: { value: bx.min.z }, z1: { value: bx.max.z } };
  /* 기체 재질에 열을 더함: 모서리·이음매(면 방향이 갑자기 바뀌는 곳)를 따라 달아오름 */
  ship.traverse(o => { if (!o.isMesh) return; const mats = Array.isArray(o.material) ? o.material : [o.material];
    const nm = mats.map(m0 => { const m = m0.clone(); m.userData = { ...m0.userData };
      const prev = m0.onBeforeCompile;
      m.onBeforeCompile = (sh, r) => { prev?.call(m0, sh, r); Object.assign(sh.uniforms, { uHeat: H.heat, uFlash: H.flash, uMode: H.mode, uInv: H.inv, uZ0: H.z0, uZ1: H.z1, uT });
        sh.vertexShader = 'varying vec3 vHw;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vHw = (modelMatrix * vec4(transformed, 1.)).xyz;');
        sh.fragmentShader = `varying vec3 vHw; uniform float uHeat, uFlash, uMode, uZ0, uZ1, uT; uniform mat4 uInv;\n${BB_GLSL}\n` + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          { vec3 lp = (uInv * vec4(vHw, 1.)).xyz; float zN = clamp((lp.z - uZ0) / (uZ1 - uZ0), 0., 1.);       /* 0 = 총구(앞 끝) · 1 = 엔진(뒤 끝) */
            float crease = clamp(length(fwidth(normal)) * 6. - .15, 0., 1.);                                       /* 모서리·이음매 */
            float vein = .5 + .5 * sin(lp.z * 40. + sin(lp.x * 30.) * 1.5);
            vec3 add = vec3(0.);
            if (uMode < .5) { float m = smoothstep(.42, .08, zN), h = uHeat * m;                                     /* A: 앞쪽 금속 이음매가 열만큼 */
              add = bb(h * 1.02 + uFlash * .5) * (crease * (.5 + 1.8 * h) + .22 * h * h * (.7 + .3 * vein)) * smoothstep(.05, .25, uHeat) * (1. + uFlash * 2.5); }
            else if (uMode < 1.5) { float front = .04 + uHeat * .92, m = smoothstep(front + .015, front - .09, zN);  /* B: 열이 총구에서 몸통 쪽으로 번져 감 */
              float tz = uHeat * (1. - zN / max(front, .05) * .55); add = bb(tz + uFlash * .4) * m * (crease * (.5 + 1.6 * tz) + .22 * tz * tz * (.7 + .3 * vein)) * smoothstep(.03, .15, uHeat) * (1. + uFlash * 2.); }
            totalEmissiveRadiance += add; }`); };
      m.customProgramCacheKey = () => (m0.customProgramCacheKey?.() || '') + '|heat'; return m; });
    o.material = Array.isArray(o.material) ? nm : nm[0]; });
  /* C: 총구 끝 아주 작은 점 */
  const tipP = new Float32Array(3), tipG = new THREE.BufferGeometry(); tipG.setAttribute('position', new THREE.BufferAttribute(tipP, 3));
  const tipM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uC: { value: new THREE.Vector3() }, uA: { value: 0 }, uPx: { value: 600 } },
    vertexShader: 'uniform float uPx, uA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uA > .01 ? uPx * .16 / max(.1, -mv.z) : 0.; }',
    fragmentShader: 'uniform vec3 uC; uniform float uA; void main(){ vec2 q = gl_PointCoord - .5; float r2 = dot(q, q) * 4.; gl_FragColor = vec4(uC * exp(-r2 * 7.) * uA, 1.); }' });
  const tip = new THREE.Points(tipG, tipM); tip.frustumCulled = false; tip.renderOrder = 12; scene.add(tip);
  const motes = pointPool(300, false, .14); scene.add(motes.pts);
  const steam = pointPool(120, true, .3); scene.add(steam.pts);
  onProgress(.8);
  /* 쏘기 · 시연 */
  const S = { heat: 0, over: false, acc: 0, last: -9, flash: 0, auto: true, hold: false, tickAt: 0, shake: 0 };
  const BL = [];
  const names = { 0: '시안 A — 이음매가 달아오름', 1: '시안 B (확정) — 열이 번져 감', 2: '시안 C — 절제' };
  const tips = { 0: '총구 쪽 금속의 모서리·이음매를 따라 가는 선이 열만큼 어두운 빨강 → 주황 → 하얗게 달아오름. 총구 앞 공기가 투명하게 일렁임. 과열 순간 선이 하얗게 확 타오르고 양옆 통풍구에서 가는 김이 짧게 새어 나옴. 식는 동안 틱 틱 수축 소리.',
    1: '열 50%부터 총구 끝에서 피어나 쏠수록 몸통 쪽으로 번져 감 — 얼마나 뒤까지 달아올랐나가 곧 열 정도. 앞쪽이 가장 뜨겁고 뒤로 갈수록 식은 색. 과열이면 몸 끝까지 닿고 한 번 하얗게 타오르며 파르르 떨림. 연기 없음. 쉬지 않고 쏘면 약 3초에 과열.',
    2: '기체는 그대로 두고, 총구 끝 아주 작은 점의 색만 달군 쇠 색으로 바뀜 + 총구 앞 아지랑이. 버튼 고리가 주된 표시.' };
  const tour = $('#tour'), bts = {};
  const pick = k => { H.mode.value = k; $('#tip b').textContent = names[k]; $('#tip span').textContent = tips[k]; $('#tip').hidden = false; for (const x in bts) bts[x].classList.toggle('on', x == k || (x === 'auto' && S.auto)); };
  [['시안 A', 0], ['시안 B', 1], ['시안 C', 2], ['자동 시연', 'auto']].forEach(([n, k]) => { const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = n; bts[k] = bt;
    bt.onclick = () => { if (k === 'auto') { S.auto = !S.auto; pick(H.mode.value); } else pick(k); }; tour.appendChild(bt); });
  const hb = document.createElement('button'); hb.type = 'button'; hb.textContent = '누르는 동안 쏘기'; hb.style.cssText = 'border-color:#ffb36a!important;color:#ffd2a6!important'; tour.appendChild(hb);
  const hd = e => { e.preventDefault(); S.hold = true; S.auto = false; pick(H.mode.value); }, hu = () => { S.hold = false; };
  hb.addEventListener('pointerdown', hd); addEventListener('pointerup', hu); addEventListener('pointercancel', hu);
  pick(1);
  const ring = $('#heat i');
  const cam = { h: 5.2, H: 5.2, tilt: .62, T: .62, az: .25 };
  const ptr = new Map(); let pin = 0;
  addEventListener('pointerdown', e => { if (e.target.closest('#tour')) return; ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, c] = [...ptr.values()]; pin = Math.hypot(a[0] - c[0], a[1] - c[1]); } });
  addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; const o = ptr.get(e.pointerId);
    if (ptr.size === 1) { cam.az -= (e.clientX - o[0]) * .006; cam.T = cam.tilt = clamp(cam.tilt + (e.clientY - o[1]) * .004, .15, 1.35); }
    ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, c] = [...ptr.values()], d = Math.hypot(a[0] - c[0], a[1] - c[1]); if (pin) cam.H = clamp(cam.H * pin / d, 3, 30); pin = d; } });
  const upF = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pin = 0; }; addEventListener('pointerup', upF); addEventListener('pointercancel', upF);
  addEventListener('wheel', e => { cam.H = clamp(cam.H * Math.exp(e.deltaY * .0012), 3, 30); }, { passive: true });
  let Wd = 2, Hd = 2;
  const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); }
  addEventListener('resize', size); size();
  let last = performance.now(), t = 0, cyc = 0; const v = new THREE.Vector3(), nose = new THREE.Vector3(), bbv = new THREE.Vector3();
  renderer.setAnimationLoop(now => { try {
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt; uT.value = t;
    /* 자동 시연: 쏘다가 과열 → 식을 때까지 쉼 → 다시 */
    let want = S.hold; if (S.auto) { cyc += dt; want = !S.over && cyc > 1.2; if (S.over) cyc = 0; }
    if (want && !S.over) { S.acc += dt * SHOT.rate; while (S.acc >= 1) { S.acc -= 1; S.last = t; S.heat += SHOT.heat; pew();
        BL.push({ z: bx.min.z * 2 * .5, life: .6 }); if (S.heat >= 1) { S.heat = 1; S.over = true; S.flash = 1; S.shake = 1; flare();
          if (H.mode.value < .5) for (let i = 0; i < 2; i++) { const sd = i ? 1 : -1; steam.emit(q => { q.p.set(sd * .55, .78, .1); q.v.set(sd * (2.5 + Math.random()), .6 + Math.random() * .6, (Math.random() - .5) * .8); q.max = q.life = .5 + Math.random() * .4; q.c.set(.85, .87, .9); q.s = .45; q.grow = 1.6; q.drag = 3.5; }, 14); }   /* 양옆 통풍구에서 가는 김 */
          break; } } }
    else S.acc = Math.min(.999, S.acc + dt * SHOT.rate);
    if (t - S.last > SHOT.wait || S.over) { const h0 = S.heat; S.heat = Math.max(0, S.heat - dt * SHOT.cool * (S.over ? .8 : 1));
}   /* 식는 소리는 넣지 않음 (사용자) */
    if (S.over && S.heat <= SHOT.lock) S.over = false;
    S.flash = Math.max(0, S.flash - dt * 2.2); S.shake = Math.max(0, S.shake - dt * 2);
    { const tv = H.mode.value > .5 && H.mode.value < 1.5 ? Math.max(0, (S.heat - .5) / .5) : S.heat; H.heat.value += (tv - H.heat.value) * Math.min(1, dt * 12); }   /* B(확정): 기체에는 50%부터 */ H.flash.value = H.mode.value < 1.5 ? S.flash * S.flash : 0;
    ship.position.x = H.mode.value > .5 && H.mode.value < 1.5 ? Math.sin(t * 70) * .025 * S.shake : 0;   /* B: 과열이면 파르르 */
    ship.position.y = .7 + Math.sin(t * 2.1) * .04; ship.updateMatrixWorld(true); H.inv.value.copy(ship.matrixWorld).invert();
    /* 탄 */
    nose.set(0, 0, bx.min.z).applyMatrix4(ship.matrixWorld);
    for (let i = BL.length - 1; i >= 0; i--) { const q = BL[i]; q.life -= dt; if (q.life <= 0) { BL.splice(i, 1); continue; } const z = nose.z - (0.6 - q.life) * 44;
      motes.emit(m => { m.p.set(nose.x, nose.y, z); m.v.set(0, 0, 0); m.max = m.life = .1; m.c.set(.62, 1, .32); m.s = 1; m.drag = 0; }, 1); }
    motes.update(dt); steam.update(dt);
    /* C: 총구 끝 점 */
    tipP[0] = nose.x; tipP[1] = nose.y; tipP[2] = nose.z - .05; tipG.attributes.position.needsUpdate = true; blackbody(H.heat.value, bbv); tipM.uniforms.uC.value.copy(bbv); tipM.uniforms.uA.value = H.mode.value > 1.5 ? Math.min(1, H.heat.value * 2.5) : 0;
    /* 버튼 고리 (모든 시안 공통) */
    ring.style.transform = `scaleX(${S.heat.toFixed(3)})`; ring.style.background = S.over ? '#ff7a3a' : S.heat > .7 ? '#ffb347' : '#b9ff4a'; $('#heat b').textContent = S.over ? '과열' : '열';
    cam.h += (cam.H - cam.h) * Math.min(1, dt * 3); cam.tilt += (cam.T - cam.tilt) * Math.min(1, dt * 3);
    camera.position.set(Math.sin(cam.az) * cam.h * Math.sin(cam.tilt), cam.h * Math.cos(cam.tilt) + .7, Math.cos(cam.az) * cam.h * Math.sin(cam.tilt) + .4); camera.lookAt(.35, .6, .35); camera.updateMatrixWorld();
    motes.setPx(Hd); tipM.uniforms.uPx.value = Hd / (2 * Math.tan(camera.fov * Math.PI / 360)); steam.setPx(Hd);
    /* 아지랑이: 총구 앞 공기 */
    { v.copy(nose).add(new THREE.Vector3(0, .1, -.55)).project(camera); const pr = new THREE.Vector3(.9, 0, 0).add(nose).project(camera), r = Math.abs(pr.x - v.x) * .5 * (Wd / Hd);
      const hz = H.heat.value; bloom.haze(v.x * .5 + .5, v.y * .5 + .5, Math.max(.02, r * .9), hz > .2 ? (hz - .2) * 1.25 : 0, t); }
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera); bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
  } catch (err) { console.error('[과열 시안]', err); } });
  onProgress(1);
  window.__hv = { get t() { return t; }, S, H, cam, pick };
}
