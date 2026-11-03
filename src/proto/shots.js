/* 기본탄 (2026-11-03 사용자 확정 규칙)
   · 조작: 오른쪽 아래 기본탄 버튼에서 손가락을 대고 끌면 그 방향으로 조준, 누르고 있는 동안 계속 쏨 (자동 조준 아님)
     끌지 않고 누르기만 하면 기체가 보는 쪽으로 쏨. 끌다가 화면 가운데로 가도 조준은 그대로 (처음 댄 자리로 정함)
     컴퓨터: 스페이스를 누르고 있으면 보는 쪽으로 쏨
   · 쏘는 동안 기체가 느려지고 쏘는 쪽을 바라봄 (이동은 조이스틱 방향 그대로)
   · 과열: 쏠 때마다 열이 오르고 쉬면 식음. 가득 차면 과열 — 김을 뿜으며 한동안 못 쏨. 종류마다 다르게(아래 SHOT)
   · 탄 생김새(사용자: 단순한 선 금지): 빛 덩어리 머리 + 굵어졌다 가늘어지는 빛 꼬리 + 떨어지는 부스러기
     수정 기둥에 맞아 튕긴 탄은 꼬리가 프리즘처럼 무지개로 갈라짐 (만질 때만 무지개)
   · 맞음: 벽·와드 = 불티 튀며 사라짐 / 수정 기둥 = 튕김(결정에 무지개 물결 · 맑은 울림) / 블랙홀 = 둘레에서 휘고 가운데에 닿으면 삼켜짐
     튕긴 탄은 쏜 사람도 맞음 (보스 구역 규칙)
   무게: 꼬리 한 장 · 머리 한 장 · 부스러기 한 장 · 조준 빛 한 장 = 그리기 4번 */
import * as THREE from 'three';
import * as A from '../core/audio.js';
import { FLY } from './flight.js?v=11032352';
import { BH } from './blackhole.js?v=11032352';
import { hitWall } from './rocks.js?v=11032352';

export const SHOT = {
  basic: { name: '기본탄', rate: 7, speed: 44, life: 1.1, heat: .07, cool: .42, coolWait: .3, lock: .3, tail: 3.4, W: .27, col: [.62, 1, .32], spread: .012, bounces: 3 }
};
const MAXB = 60, NT = 12, NP = 320;
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

/* 소리 */
function pew() { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain(), f = 1250 + Math.random() * 160;
  o.type = 'triangle'; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * .42, t0 + .07); o.connect(g); A.env(g, t0, .002, .035, .08); A.out(g, .1); o.start(t0); o.stop(t0 + .12); }
function thud(vol = .05) { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, n = A.noise(.12), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.value = 1400; n.connect(f); f.connect(g); A.env(g, t0, .002, vol, .1); A.out(g, .15); n.start(t0); }
function hiss() { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, n = A.noise(1.1), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.frequency.setValueAtTime(5200, t0); f.frequency.exponentialRampToValueAtTime(1600, t0 + 1); f.Q.value = .7; n.connect(f); f.connect(g); A.env(g, t0, .03, .07, 1); A.out(g, .2); n.start(t0); }
function clunk() { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(300, t0); o.frequency.exponentialRampToValueAtTime(120, t0 + .12); o.connect(g); A.env(g, t0, .003, .06, .14); A.out(g, .1); o.start(t0); o.stop(t0 + .2); }

export function makeShots({ B, crystals, bh, FS, say }) {
  const G = new THREE.Group(), cfg = SHOT.basic;
  const C = new THREE.Vector3(...cfg.col);
  /* ── 꼬리: 탄마다 NT점 띠. 머리 쪽에서 굵어졌다가 끝으로 가늘어짐 ── */
  const tp = new Float32Array(MAXB * NT * 2 * 3), tu = new Float32Array(MAXB * NT * 2 * 3), ti = [];
  for (let b = 0; b < MAXB; b++) for (let i = 0; i < NT - 1; i++) { const p = (b * NT + i) * 2; ti.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3)); tg.setAttribute('aU', new THREE.BufferAttribute(tu, 3)); tg.setIndex(ti);
  const tailM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uC: { value: C }, uT: { value: 0 } },
    vertexShader: 'attribute vec3 aU; varying vec3 vU; void main(){ vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 uC; uniform float uT; varying vec3 vU;   /* vU: x = 꼬리 위치(0 머리 → 1 끝, 음수면 없음) · y = 띠 가로(-1~1) · z = 튕김(0~1) × 밝기 */
      vec3 spec(float x){ return clamp(abs(fract(x + vec3(0., .33, .67)) * 6. - 3.) - 1., 0., 1.); }
      void main(){ if (vU.x < 0.) discard; float u = vU.x, s = vU.y, k = fract(vU.z), al = floor(vU.z) / 100.;
        float core = exp(-s * s * 7.), body = exp(-s * s * 1.8) * .45;
        float fade = (1. - u) * (1. - u);
        vec3 hot = mix(vec3(1.15, 1.2, 1.1), uC * uC * 1.4, smoothstep(.0, .55, u));                         /* 머리 가까이는 하얗게 뜨겁고 뒤로 갈수록 탄 색 */
        vec3 rb = spec(u * 1.3 + s * .18 - uT * .6) * 1.5;                                                       /* 튕긴 탄: 프리즘처럼 갈라진 꼬리 */
        vec3 c = mix(hot, rb * rb + .1, k * smoothstep(.05, .35, u)) * (core + body) * fade;
        gl_FragColor = vec4(c * al, 1.); }` });
  const tail = new THREE.Mesh(tg, tailM); tail.frustumCulled = false; tail.renderOrder = 9; G.add(tail);
  /* ── 머리: 빛 덩어리 (하얀 심 + 탄 색 번짐, 살짝 떨림) ── */
  const hp = new Float32Array(MAXB * 3), ha = new Float32Array(MAXB * 2);
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(hp, 3)); hg.setAttribute('aA', new THREE.BufferAttribute(ha, 2));
  const headM = new THREE.ShaderMaterial({ ...AB, uniforms: { uC: { value: C }, uPx: { value: 600 }, uT: { value: 0 } },
    vertexShader: 'attribute vec2 aA; uniform float uPx, uT; varying vec2 vA; void main(){ vA = aA; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = aA.x > 0. ? uPx * (.9 + .08 * sin(uT * 60. + position.x * 9.)) * (.6 + .4 * aA.x) / max(.1, -mv.z) : 0.; }',
    fragmentShader: `uniform vec3 uC; varying vec2 vA; vec3 spec(float x){ return clamp(abs(fract(x + vec3(0., .33, .67)) * 6. - 3.) - 1., 0., 1.); }
      void main(){ vec2 q = gl_PointCoord - .5; float r2 = dot(q, q) * 4.; float core = exp(-r2 * 26.) * 1.6, halo = exp(-r2 * 5.) * .55;
        vec3 col = mix(uC * uC * 1.5, spec(fract(atan(q.y, q.x + 1e-5) / 6.2832 + .1)) * 1.2 + .2, vA.y);
        gl_FragColor = vec4((vec3(1.2, 1.25, 1.15) * core + col * halo) * vA.x, 1.); }` });
  const heads = new THREE.Points(hg, headM); heads.frustumCulled = false; heads.renderOrder = 10; G.add(heads);
  /* ── 부스러기·불티·김·쏘는 불빛: 한 장 ── */
  const pp = new Float32Array(NP * 3), pc = new Float32Array(NP * 4);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('aC', new THREE.BufferAttribute(pc, 4));
  const partM = new THREE.ShaderMaterial({ ...AB, uniforms: { uPx: { value: 600 } },
    vertexShader: 'attribute vec4 aC; uniform float uPx; varying vec4 vC; void main(){ vC = aC; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = aC.w > 0. ? uPx * aC.w / max(.1, -mv.z) : 0.; }',
    fragmentShader: 'varying vec4 vC; void main(){ vec2 q = gl_PointCoord - .5; float k = exp(-dot(q, q) * 14.); gl_FragColor = vec4(vC.rgb * k, 1.); }' });
  const parts = new THREE.Points(pg, partM); parts.frustumCulled = false; parts.renderOrder = 11; G.add(parts);
  const PT = Array.from({ length: NP }, () => ({ l: 0, m: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 0, g: 0, b: 0, s: .1, grow: 0, fall: 0 })); let pI = 0;
  const emit = (x, y, z, vx, vy, vz, r, g, b, s, life, grow = 0, fall = 6) => { const p = PT[pI = (pI + 1) % NP]; Object.assign(p, { l: life, m: life, x, y, z, vx, vy, vz, r, g, b, s, grow, fall }); };
  const spec = x => { const f = v => Math.min(1, Math.max(0, Math.abs(((x + v) % 1 + 1) % 1 * 6 - 3) - 1)); return [f(0), f(.33), f(.67)]; };
  /* ── 조준 빛: 기체 앞 땅에 부채꼴로 깔린 옅은 빛, 쏘는 쪽으로 결이 흘러감 (어디로 나갈지 보여 줌) ── */
  const aimM = new THREE.ShaderMaterial({ ...AB, uniforms: { uC: { value: C }, uA: { value: 0 }, uT: { value: 0 }, uHot: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 uC; uniform float uA, uT, uHot; varying vec2 vP;
      void main(){ float L = 11., y = vP.y / L; if (y < 0. || y > 1.) discard; float hw = .06 + y * .22, x = vP.x / (L * hw);
        float fan = exp(-x * x * 2.2) * smoothstep(0., .08, y) * (1. - y) * (1. - y);
        float flow = .55 + .45 * sin(y * 26. - uT * 14.);                                                       /* 쏘는 쪽으로 흘러감 */
        vec3 col = mix(uC * uC, vec3(1., .35, .12), uHot);
        gl_FragColor = vec4(col * fan * (.16 + .14 * flow) * uA, 1.); }` });
  const aim = new THREE.Mesh(new THREE.PlaneGeometry(8, 11).translate(0, 5.5, 0), aimM); aim.rotation.x = -Math.PI / 2; aim.position.y = .08; aim.renderOrder = 4; aim.frustumCulled = false; G.add(aim);

  /* ── 버튼 ── */
  const st = document.createElement('style'); st.textContent = `
    #fireB{position:fixed;right:calc(max(16px,env(safe-area-inset-right,0px)) + 30px);bottom:calc(env(safe-area-inset-bottom,0px) + 92px);width:96px;height:96px;border-radius:50%;z-index:6;touch-action:none;user-select:none;-webkit-user-select:none;
      background:radial-gradient(circle at 50% 40%,rgba(40,52,30,.55),rgba(6,9,6,.72));box-shadow:0 0 0 1.5px rgba(185,255,74,.32) inset,0 6px 22px rgba(0,0,0,.45);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
    #fireB .ring{position:absolute;inset:-5px;border-radius:50%;background:conic-gradient(from 0deg,var(--hc,#b9ff4a) var(--h,0deg),rgba(255,255,255,.07) 0);
      -webkit-mask:radial-gradient(circle,transparent 47px,#000 48px,#000 52px,transparent 53px);mask:radial-gradient(circle,transparent 47px,#000 48px,#000 52px,transparent 53px);filter:drop-shadow(0 0 4px var(--hc,#b9ff4a))}
    #fireB .knob{position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;transition:opacity .2s;
      background:radial-gradient(circle at 50% 42%,#fff 0 3px,rgba(220,255,170,.95) 4px,rgba(160,230,70,.5) 9px,rgba(120,200,40,0) 20px)}
    #fireB .knob::after{content:'';position:absolute;left:50%;top:-2px;width:4px;height:16px;margin-left:-2px;border-radius:2px;background:linear-gradient(rgba(220,255,170,0),rgba(220,255,170,.8));opacity:var(--ka,.0)}
    #fireB .lab{position:absolute;left:0;right:0;bottom:-20px;text-align:center;font-size:11px;letter-spacing:.08em;color:rgba(200,255,140,.75);text-shadow:0 1px 3px #000}
    #fireB.on{box-shadow:0 0 0 1.5px rgba(185,255,74,.7) inset,0 0 26px rgba(185,255,74,.25)}
    #fireB.hot{animation:fbHot .5s infinite alternate}#fireB.hot .knob{opacity:.35}#fireB.hot .lab{color:#ff9a5a}
    @keyframes fbHot{from{box-shadow:0 0 0 1.5px rgba(255,110,50,.55) inset,0 0 10px rgba(255,90,30,.2)}to{box-shadow:0 0 0 1.5px rgba(255,140,60,.9) inset,0 0 26px rgba(255,90,30,.45)}}`;
  document.head.appendChild(st);
  const btn = document.createElement('div'); btn.id = 'fireB'; btn.innerHTML = '<div class="ring"></div><div class="knob"></div><div class="lab">' + cfg.name + '</div>'; document.body.appendChild(btn);
  const knob = btn.querySelector('.knob'), lab = btn.querySelector('.lab');
  const I = { held: false, pid: null, drag: false, ang: 0, key: false };
  btn.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); if (I.pid !== null) return; I.pid = e.pointerId; I.held = true; I.drag = false; I.ang = FS.head; try { btn.setPointerCapture(e.pointerId); } catch (_) {} });
  btn.addEventListener('pointermove', e => { if (e.pointerId !== I.pid) return; const r = btn.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), l = Math.hypot(dx, dy);
    if (l > 14) { I.drag = true; I.ang = Math.atan2(-dx, -dy); } const k = Math.min(1, 30 / Math.max(l, 1)); knob.style.transform = `translate(${dx * k}px,${dy * k}px) rotate(${Math.atan2(dx, -dy)}rad)`; knob.style.setProperty('--ka', I.drag ? 1 : 0); });
  const up = e => { if (e.pointerId !== I.pid) return; I.pid = null; I.held = false; knob.style.transform = ''; knob.style.setProperty('--ka', 0); };
  btn.addEventListener('pointerup', up); btn.addEventListener('pointercancel', up);
  addEventListener('keydown', e => { if (e.code === 'Space') { I.key = true; e.preventDefault(); } }); addEventListener('keyup', e => { if (e.code === 'Space') I.key = false; });

  /* ── 탄 ── */
  const BU = Array.from({ length: MAXB }, () => ({ on: false, x: 0, z: 0, vx: 0, vz: 0, age: 0, life: 1, bo: 0, dead: -1, hist: [] })); let bI = 0;
  const S = { heat: 0, over: false, acc: 0, lastShot: -9, aimA: 0 };
  G.userData.S = S;
  const hitSparks = (x, z, nx, nz, n, rainbow) => { for (let i = 0; i < n; i++) { const a = Math.atan2(nz, nx) + (Math.random() - .5) * 2.2, sp = 4 + Math.random() * 7, [r, g, b] = rainbow ? spec(Math.random()) : [1.4, .7 + Math.random() * .4, .25];
    emit(x, FLY.HOVER, z, Math.cos(a) * sp, 1.5 + Math.random() * 3, Math.sin(a) * sp, r * 1.2, g * 1.2, b * 1.2, .09 + Math.random() * .06, .25 + Math.random() * .3); }
    emit(x, FLY.HOVER, z, 0, 0, 0, 1.2, 1.15, 1, .8, .09, 4, 0); };                                       /* 닿은 순간 번쩍 */
  const fire = t => { const b = BU[bI = (bI + 1) % MAXB], a = S.aimA + (Math.random() - .5) * cfg.spread * 2, dx = -Math.sin(a), dz = -Math.cos(a);
    Object.assign(b, { on: true, x: FS.x + dx * 1.15, z: FS.z + dz * 1.15, vx: dx * cfg.speed, vz: dz * cfg.speed, age: 0, life: cfg.life, bo: 0, dead: -1 }); b.hist.length = 0; b.hist.push([FS.x + dx * .6, FS.z + dz * .6]);
    emit(FS.x + dx * 1.1, FLY.HOVER, FS.z + dz * 1.1, FS.vx, 0, FS.vz, 1.1, 1.2, .9, .55, .06, 3, 0);            /* 쏘는 불빛 */
    pew(); };

  const tmp = [0, 0];
  G.userData.update = (t, dt, px) => {
    headM.uniforms.uPx.value = px * .75; partM.uniforms.uPx.value = px; headM.uniforms.uT.value = t; tailM.uniforms.uT.value = t; aimM.uniforms.uT.value = t;
    /* 조준·쏘기 */
    const want = I.held || I.key, shooting = want && !S.over;
    if (want) S.aimA = I.held && I.drag ? I.ang : (I.key ? FS.mh ?? FS.head : I.ang);
    FS.aim = want ? S.aimA : null;
    if (shooting) { S.acc += dt * cfg.rate; if (S.acc > 1.5) S.acc = 1.5; while (S.acc >= 1) { S.acc -= 1; fire(t); S.lastShot = t; S.heat += cfg.heat; if (S.heat >= 1) { S.heat = 1; S.over = true; S.acc = 0; hiss(); clunk(); break; } } }
    else S.acc = Math.min(.999, S.acc + dt * cfg.rate);                                                        /* 쉬는 동안 다음 발이 준비됨 → 누르는 순간 바로 첫 발 */
    if (t - S.lastShot > cfg.coolWait || S.over) S.heat = Math.max(0, S.heat - dt * cfg.cool * (S.over ? .8 : 1));
    if (S.over && S.heat <= cfg.lock) S.over = false;
    /* 과열 김: 기체 양옆에서 뿜어져 오름 */
    if (S.over && Math.random() < dt * 30) { const s = Math.random() < .5 ? 1 : -1, hx = Math.cos(FS.head) * .55 * s, hz = -Math.sin(FS.head) * .55 * s;
      emit(FS.x + hx, FLY.HOVER + .1, FS.z + hz, hx * 2 + FS.vx * .5, 1.4 + Math.random(), hz * 2 + FS.vz * .5, .32, .3, .3, .35, .8 + Math.random() * .4, .9, -1.2); }
    /* 버튼: 열 고리 */
    { const h = S.heat, hc = S.over ? '#ff6a2a' : h > .7 ? '#ffb347' : h > .4 ? '#e8ff8a' : '#b9ff4a';
      btn.style.setProperty('--h', (h * 360).toFixed(1) + 'deg'); btn.style.setProperty('--hc', hc); btn.classList.toggle('hot', S.over); btn.classList.toggle('on', want && !S.over); lab.textContent = S.over ? '과열' : cfg.name; }
    /* 조준 빛 */
    { const u = aimM.uniforms; u.uA.value += ((want ? 1 : 0) - u.uA.value) * Math.min(1, dt * 10); u.uHot.value += ((S.over ? 1 : 0) - u.uHot.value) * Math.min(1, dt * 6);
      aim.visible = u.uA.value > .01; aim.position.x = FS.x; aim.position.z = FS.z; aim.rotation.z = S.aimA; }
    /* 탄 움직임 */
    const P = bh?.userData.P;
    for (const b of BU) { if (!b.on) continue;
      if (b.dead >= 0) { b.dead += dt; if (b.dead > .09) b.on = false; continue; }                           /* 사라질 때 꼬리가 머리 쪽으로 따라 들어감 */
      b.age += dt; if (b.age > b.life) { b.dead = 0; continue; }
      /* 블랙홀이 탄을 휨 */
      if (P) { const dx = P.x - b.x, dz = P.z - b.z, d2 = dx * dx + dz * dz; if (d2 < 900) { const d = Math.sqrt(d2), g = 650 / (d2 + 9); b.vx += dx / d * g * dt; b.vz += dz / d * g * dt;
        if (d < BH.CORE) { b.dead = 0; emit(b.x, FLY.HOVER, b.z, 0, 0, 0, .6, .5, 1, .6, .2, -2, 0); continue; } } }
      const nx = b.x + b.vx * dt, nz = b.z + b.vz * dt;
      /* 수정 기둥: 튕김 */
      const hit = b.bo < cfg.bounces && crystals ? crystals.userData.cross(b.x, b.z, nx, nz, .12) : null;
      if (hit) { const vn = b.vx * hit.nx + b.vz * hit.nz; if (vn < 0) { b.vx -= 2 * vn * hit.nx; b.vz -= 2 * vn * hit.nz; }
        b.x = hit.x + hit.nx * .05; b.z = hit.z + hit.nz * .05; b.bo++; b.life = Math.max(b.life, b.age + .5); b.hist.push([b.x, b.z]);
        crystals.userData.flash(t, hit.x - hit.nx * .1, FLY.HOVER, hit.z - hit.nz * .1); hitSparks(b.x, b.z, hit.nx, hit.nz, 10, true); continue; }
      /* 벽·와드: 불티 튀며 사라짐 */
      if (B.blocked(nx, nz)) { let lo = 0, hi = 1; for (let k = 0; k < 6; k++) { const m = (lo + hi) / 2; if (B.blocked(b.x + (nx - b.x) * m, b.z + (nz - b.z) * m)) hi = m; else lo = m; }
        b.x += (nx - b.x) * lo; b.z += (nz - b.z) * lo; const l = Math.hypot(b.vx, b.vz) || 1; hitSparks(b.x, b.z, -b.vx / l, -b.vz / l, 8, b.bo > 0); hitWall(b.x + b.vx / l * .3, FLY.HOVER, b.z + b.vz / l * .3, t); thud(.03); b.dead = 0; continue; }   /* 벽마다 만들어 둔 맞음 빛(흑요석 무늬가 달아오름·산호 동그라미·유적 문양…)을 깨움 */
      b.x = nx; b.z = nz;
      /* 튕긴 탄은 쏜 사람도 맞음 */
      if (b.bo > 0 && Math.hypot(b.x - FS.x, b.z - FS.z) < FLY.R + .35) { const l = Math.hypot(b.vx, b.vz) || 1; hitSparks(FS.x, FS.z, -b.vx / l, -b.vz / l, 16, true); thud(.09); b.dead = 0; say?.('내가 쏜 탄에 맞음! (튕겨 돌아옴)'); FS.hurt = t; continue; }
      b.hist.push([b.x, b.z]); if (b.hist.length > 24) b.hist.shift();
      /* 떨어지는 부스러기 */
      if (Math.random() < dt * 34) { const [r, g, bb] = b.bo ? spec(Math.random()) : [C.x * C.x * 1.3, C.y * C.y * 1.3, C.z * C.z * 1.3];
        emit(b.x, FLY.HOVER, b.z, b.vx * .08 + (Math.random() - .5) * 1.4, .3 + Math.random(), b.vz * .08 + (Math.random() - .5) * 1.4, r, g, bb, .05 + Math.random() * .04, .25 + Math.random() * .25); } }
    /* 그리기: 꼬리 · 머리 */
    for (let bi = 0; bi < MAXB; bi++) { const b = BU[bi], o3 = bi * NT * 2 * 3;
      if (!b.on) { for (let i = 0; i < NT * 2; i++) tu[o3 + i * 3] = -1; ha[bi * 2] = 0; continue; }
      const lifeK = b.dead >= 0 ? 1 - b.dead / .09 : Math.min(1, (b.life - b.age) / .15), grow = Math.min(1, b.age / .05);
      const L = cfg.tail * grow * (b.dead >= 0 ? 1 - b.dead / .09 : 1);
      /* 지나온 길을 따라 NT점 (튕긴 곳에선 꺾여 따라옴) */
      const H = b.hist; let seg = H.length - 1, sx = b.x, sz = b.z, acc = 0;
      for (let i = 0; i < NT; i++) { const s = i / (NT - 1) * L;
        while (seg >= 0) { const [qx, qz] = H[seg], sl = Math.hypot(qx - sx, qz - sz); if (acc + sl >= s || seg === 0) { const k = sl > 1e-6 ? Math.min(1, (s - acc) / sl) : 0; tmp[0] = sx + (qx - sx) * k; tmp[1] = sz + (qz - sz) * k; break; } acc += sl; sx = qx; sz = qz; seg--; }
        if (seg < 0) { tmp[0] = sx; tmp[1] = sz; }
        const u = i / (NT - 1), w = cfg.W * 1.4 * (.55 + .45 * Math.sin(Math.min(1, u * 3) * Math.PI * .5)) * Math.pow(1 - u, 1.2);   /* 머리 뒤에서 굵어졌다 끝으로 가늘어짐 */
        /* 진행 방향에 수직 */
        const j = (bi * NT + i) * 2, prevx = i ? tp[(j - 2) * 3] * .5 + tp[(j - 1) * 3] * .5 : b.x + b.vx * .01, prevz = i ? tp[(j - 2) * 3 + 2] * .5 + tp[(j - 1) * 3 + 2] * .5 : b.z + b.vz * .01;
        let dx = prevx - tmp[0], dz = prevz - tmp[1], dl = Math.hypot(dx, dz); if (dl < 1e-5) { dx = b.vx; dz = b.vz; dl = Math.hypot(dx, dz) || 1; }
        const px_ = -dz / dl * w, pz_ = dx / dl * w, y = FLY.HOVER;
        tp[j * 3] = tmp[0] + px_; tp[j * 3 + 1] = y; tp[j * 3 + 2] = tmp[1] + pz_; tp[(j + 1) * 3] = tmp[0] - px_; tp[(j + 1) * 3 + 1] = y; tp[(j + 1) * 3 + 2] = tmp[1] - pz_;
        const z = Math.floor(lifeK * 100) + Math.min(.999, b.bo ? 1 : 0) * .999;
        tu[j * 3] = u; tu[j * 3 + 1] = 1; tu[j * 3 + 2] = z; tu[(j + 1) * 3] = u; tu[(j + 1) * 3 + 1] = -1; tu[(j + 1) * 3 + 2] = z; }
      hp[bi * 3] = b.x; hp[bi * 3 + 1] = FLY.HOVER; hp[bi * 3 + 2] = b.z; ha[bi * 2] = b.dead >= 0 ? 0 : lifeK; ha[bi * 2 + 1] = b.bo ? 1 : 0; }
    tg.attributes.position.needsUpdate = tg.attributes.aU.needsUpdate = true; hg.attributes.position.needsUpdate = hg.attributes.aA.needsUpdate = true;
    /* 부스러기 */
    for (let i = 0; i < NP; i++) { const p = PT[i]; if (p.l > 0) { p.l -= dt; p.vy -= p.fall * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 1 - dt * 2; p.vz *= 1 - dt * 2; if (p.y < .05) { p.y = .05; p.vy *= -.3; } p.s += p.grow * dt; }
      const k = Math.max(0, p.l / p.m); pp[i * 3] = p.x; pp[i * 3 + 1] = p.y; pp[i * 3 + 2] = p.z; pc[i * 4] = p.r * k; pc[i * 4 + 1] = p.g * k; pc[i * 4 + 2] = p.b * k; pc[i * 4 + 3] = p.l > 0 ? Math.max(.01, p.s) : 0; }
    pg.attributes.position.needsUpdate = pg.attributes.aC.needsUpdate = true;
  };
  return G;
}
