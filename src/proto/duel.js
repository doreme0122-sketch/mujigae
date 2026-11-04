/* 반사 시험 (사용자 2026-11-04 확정 규칙을 실제로 해 보기)
   · 반사: 기체 앞쪽 부채꼴 120°만 막음 → 돌아봐야 막음
     보통 반사 = 기체가 보는 면에 맞춰 벽처럼 각도대로 튕김 · 속도 1.3배
     크리티컬 반사 = 닿기 직전(누른 뒤 0.1초 안에 닿음)에 딱 맞춤 → 쏜 사람에게 자동으로 꽂힘 · 속도 2.5배 · 그 순간 화면이 아주 짧게 멈칫
     반사될 때마다 더 빨라지고 1.5배 세짐 → 넷째부터는 달아올라 반사 안 됨 (주고받기가 끝없이 이어지지 않게)
   · 상대 기체: 내 둘레를 돌며 박자 맞춰 쏨 · 7초마다 내 등 뒤로 돌아 들어와 쏨(뒤돌기 시험) · 내가 돌려보낸 탄은 상대도 반사해 옴(주고받기)
   · 뒤돌기 불이익: ① 천천히 돌기만 (사용자 확정 · flight 기본)
   무게: 상대 기체 한 대 · 탄 머리 한 장 · 꼬리 한 장 · 불티 한 장 · 반사 막 한 장 */
import * as THREE from 'three';
import * as A from '../core/audio.js';
import { buildShip } from '../core/ships/build.js';
import { FLY } from './flight.js?v=11041547';

export const DUEL = { WIN: .25, CRIT: .1, CD: .55, ARC: 60 * Math.PI / 180, REACH: 1.6, NORMAL: 1.3, CRITK: 2.5, DMGK: 1.5, MAXR: 3, SPEED: 20, DMG: 8, ORBIT: 14 };
const NB = 40, NT = 12, NP = 260;
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

const tone = (f0, f1, dur, vol, type = 'sine', at = 0) => { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime + at, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur * .8); o.connect(g); A.env(g, t0, .002, vol, dur); A.out(g, .25); o.start(t0); o.stop(t0 + dur + .05); };
const noiseHit = (f, dur, vol) => { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, n = A.noise(dur + .05), fl = c.createBiquadFilter(), g = c.createGain(); fl.type = 'bandpass'; fl.frequency.value = f; n.connect(fl); fl.connect(g); A.env(g, t0, .002, vol, dur); A.out(g, .2); n.start(t0); };
const SND = {
  efire() { tone(620, 300, .12, .05, 'sawtooth'); },                                                            /* 상대가 쏨: 낮고 거친 소리 (내 탄과 구별) */
  normal(n) { tone(1500 + n * 250, 1450 + n * 250, .2, .07); noiseHit(5000, .05, .05); },                       /* 보통 반사: 맑은 챙 (주고받을수록 높아짐) */
  crit(n) { tone(2400 + n * 300, 2300 + n * 300, .35, .09); tone(3600 + n * 400, 3500, .25, .05, 'triangle', .02); noiseHit(7000, .08, .08); tone(90, 50, .3, .12); },   /* 크리티컬: 높은 울림 + 묵직한 쿵 */
  miss() { noiseHit(900, .12, .1); tone(200, 90, .2, .08, 'square'); },                                          /* 맞음 */
  over() { noiseHit(2500, .15, .06); tone(400, 220, .25, .05, 'sawtooth'); },                                    /* 달아올라 반사 안 됨 */
  shield() { tone(900, 1300, .08, .025, 'triangle'); },                                                         /* 반사 막을 폄 */
};

export async function makeDuel({ renderer, scene, B, fly, FS, cam, say, ui, avoid }) {
  const G = new THREE.Group(); scene.add(G); G.visible = false;
  /* ── 상대 기체 ── */
  const b = await buildShip(4, 2, 'neon-black', { renderer, size: FLY.LEN }); const foe = b.root; G.add(foe);
  const fmats = []; foe.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (!fmats.includes(m)) { m.userData.e0 = m.emissive ? m.emissive.clone() : null; fmats.push(m); } }); });
  const E = { x: 0, z: 0, vx: 0, vz: 0, head: 0, bank: 0, hp: 100, hitT: -9, fireT: 0, burst: 0, mode: 'orbit', modeT: 0, oa: 0, dead: -9 };
  /* 상대 그림자 · 몸 둘레 붉은 빛(적이라는 표시) */
  const shM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uA: { value: .5 } }, vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uA; varying vec2 vP; void main(){ vec2 q=vP*vec2(1.,1.6); float r=dot(q,q); gl_FragColor=vec4(0.,0.,0.,exp(-r*3.)*uA); }' });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(FLY.LEN * 1.3, FLY.LEN * 1.3), shM); shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 1; G.add(shadow);
  const auM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uT: { value: 0 }, uHit: { value: 0 } }, vertexShader: 'varying vec2 vU; void main(){ vU = uv * 2. - 1.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uT, uHit; varying vec2 vU; void main(){ float r = length(vU), a = atan(vU.y, vU.x + 1e-5);
      float ring = exp(-(r - .78) * (r - .78) * 300.) * (.5 + .5 * pow(max(abs(sin(a * 3. - uT * 2.)), 0.), 2.)), inner = exp(-r * r * 3.) * .08;
      gl_FragColor = vec4(mix(vec3(1., .22, .3), vec3(1.3, 1.2, 1.1), uHit) * (ring * .45 + inner) , 1.); }` });
  const aura = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), auM); aura.rotation.x = -Math.PI / 2; aura.position.y = .05; aura.renderOrder = 3; G.add(aura);
  /* ── 탄: 머리 + 꼬리 띠 (상대 탄 = 붉은 자홍 · 내가 돌려보낸 탄 = 연두 · 크리티컬 = 무지개 · 달아오른 탄 = 하얗게 타는 주황) ── */
  const BU = Array.from({ length: NB }, () => ({ on: false, hist: [] }));
  const tp = new Float32Array(NB * NT * 2 * 3), tu = new Float32Array(NB * NT * 2 * 4), ti = [];
  for (let k = 0; k < NB; k++) for (let i = 0; i < NT - 1; i++) { const p = (k * NT + i) * 2; ti.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3)); tg.setAttribute('aU', new THREE.BufferAttribute(tu, 4)); tg.setIndex(ti);
  const COLS = 'vec3 colOf(float k, float u, float s, float t){ vec3 e = vec3(1., .25, .5), p = vec3(.62, 1., .32), sp = clamp(abs(fract(u * 1.4 + s * .2 - t * .9 + vec3(0., .33, .67)) * 6. - 3.) - 1., 0., 1.) * 1.4; vec3 hot = vec3(1.3, .7, .3) * (.8 + .2 * sin(u * 30. - t * 40.));\n'
    + '  return k < .5 ? e : k < 1.5 ? p : k < 2.5 ? sp : hot; }';
  const tailM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uT: { value: 0 } },
    vertexShader: 'attribute vec4 aU; varying vec4 vU; void main(){ vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uT; varying vec4 vU; ${COLS}
      void main(){ if (vU.x < 0.) discard; float u = clamp(vU.x, 0., 1.), s = vU.y, k = vU.z, al = vU.w;   /* x 꼬리 위치 · y 띠 가로 · z 색 종류(0 상대 · 1 나 · 2 크리티컬 · 3 달아오름) · w 밝기 */
        float core = exp(-s * s * 8.), body = exp(-s * s * 1.8) * .45, fade = (1. - u) * (1. - u);
        vec3 c = mix(vec3(1.2, 1.15, 1.1), colOf(k, u, s, uT), smoothstep(0., .4, u)) * (core + body) * fade;
        gl_FragColor = vec4(c * al, 1.); }` });
  const tail = new THREE.Mesh(tg, tailM); tail.frustumCulled = false; tail.renderOrder = 9; G.add(tail);
  const hp = new Float32Array(NB * 3), ha = new Float32Array(NB * 3), hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(hp, 3)); hg.setAttribute('aH', new THREE.BufferAttribute(ha, 3));
  const headM = new THREE.ShaderMaterial({ ...AB, uniforms: { uPx: { value: 600 }, uT: { value: 0 } },
    vertexShader: 'attribute vec3 aH; uniform float uPx; varying vec3 vH; void main(){ vH = aH; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = aH.x > 0. ? uPx * aH.z / max(.1, -mv.z) : 0.; }',
    fragmentShader: `uniform float uT; varying vec3 vH; ${COLS}
      void main(){ vec2 q = gl_PointCoord - .5; float r2 = dot(q, q) * 4., a = atan(q.y, q.x + 1e-5); float core = exp(-r2 * 24.) * 1.6, halo = exp(-r2 * 4.5) * .6;
        float spike = vH.y > 2.5 ? pow(max(abs(cos(a * 2. + uT * 9.)), 0.), 20.) * exp(-r2 * 1.5) * .8 : 0.;   /* 달아오른 탄: 불꽃 가시가 튐 */
        gl_FragColor = vec4((vec3(1.25, 1.2, 1.15) * core + colOf(vH.y, .3, 0., uT) * (halo + spike)) * vH.x, 1.); }` });
  const heads = new THREE.Points(hg, headM); heads.frustumCulled = false; heads.renderOrder = 10; G.add(heads);
  /* 불티 */
  const pp = new Float32Array(NP * 3), pc = new Float32Array(NP * 4), pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('aC', new THREE.BufferAttribute(pc, 4));
  const partM = new THREE.ShaderMaterial({ ...AB, uniforms: { uPx: { value: 600 } }, vertexShader: 'attribute vec4 aC; uniform float uPx; varying vec4 vC; void main(){ vC = aC; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = aC.w > 0. ? uPx * aC.w / max(.1, -mv.z) : 0.; }',
    fragmentShader: 'varying vec4 vC; void main(){ vec2 q = gl_PointCoord - .5; gl_FragColor = vec4(vC.rgb * exp(-dot(q, q) * 14.), 1.); }' });
  const parts = new THREE.Points(pg, partM); parts.frustumCulled = false; parts.renderOrder = 11; G.add(parts);
  const PT = Array.from({ length: NP }, () => ({ l: 0 })); let pI = 0;
  const emit = (x, y, z, vx, vy, vz, r, g, bb, s, life, fall = 5) => { Object.assign(PT[pI = (pI + 1) % NP], { l: life, m: life, x, y, z, vx, vy, vz, r, g, b: bb, s, fall }); };
  const spec = x => { const f = v => Math.min(1, Math.max(0, Math.abs(((x + v) % 1 + 1) % 1 * 6 - 3) - 1)); return [f(0), f(.33), f(.67)]; };
  const burst = (x, z, n, kind, sp = 6) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = sp * (.4 + Math.random()), [r, g, bb] = kind === 2 ? spec(Math.random()) : kind === 1 ? [.7, 1.1, .4] : kind === 3 ? [1.4, .7, .3] : [1.3, .35, .55];
    emit(x, FLY.HOVER, z, Math.cos(a) * v, 1 + Math.random() * 2, Math.sin(a) * v, r, g, bb, .07 + Math.random() * .05, .25 + Math.random() * .3); } };
  /* ── 반사 막: 기체 앞 부채꼴 (누르면 0.25초 · 처음 0.1초는 크리티컬 구간이라 더 하얗고 단단하게) ── */
  const shM2 = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uA: { value: 0 }, uK: { value: 0 }, uT: { value: 0 }, uFlash: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uA, uK, uT, uFlash; varying vec2 vU;
      void main(){ float r = length(vU), a = atan(vU.x, vU.y + 1e-5), half_ = ${(DUEL.ARC).toFixed(4)};   /* a: 기체 앞(0)에서 벌어진 각 */
        float inA = smoothstep(half_ + .06, half_ - .06, abs(a)), band = exp(-(r - ${DUEL.REACH.toFixed(2)}) * (r - ${DUEL.REACH.toFixed(2)}) * 40.), fill = smoothstep(${(DUEL.REACH + .1).toFixed(2)}, .6, r) * smoothstep(.4, 1.1, r) * .18;
        float hex = .7 + .3 * pow(max(abs(sin(a * 9. + r * 6. - uT * 4.)), 0.), 6.), edge = exp(-pow(max(abs(a) - half_ + .05, 0.) * 30., 2.)) * band * .8;   /* 결이 흐르는 막 · 양 끝이 또렷 */
        vec3 c = mix(vec3(.55, .95, 1.1), vec3(1.3, 1.3, 1.25), uK) * (band * hex + fill + edge) * inA + vec3(1.2, 1.15, 1.3) * uFlash * band * inA * 2.;
        gl_FragColor = vec4(c * uA, 1.); }` });
  const shield = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), shM2); shield.rotation.x = -Math.PI / 2; shield.renderOrder = 7; shield.frustumCulled = false; G.add(shield);
  /* ── 글자 띄우기 (보통 · 크리티컬 · 늦음 · 뒤에서 맞음 · 달아오름) ── */
  const st = document.createElement('style'); st.textContent = `
    #duelP{position:absolute;top:calc(env(safe-area-inset-top,0px) + 44px);left:max(16px,env(safe-area-inset-left,0px));width:min(250px,34vw);display:flex;flex-direction:column;gap:7px;padding:10px 12px 11px;border-left:1.5px solid rgba(255,90,130,.75);background:linear-gradient(90deg,rgba(6,4,10,.82),rgba(6,4,10,.35));z-index:5;touch-action:none}
    #duelP b{font-weight:600;font-size:15px;color:#ff8fb0;letter-spacing:.03em}
    #duelP .r{font-size:11px;line-height:1.55;color:#c9c3d4}
    #duelP .hp{display:grid;grid-template-columns:auto 1fr auto;gap:4px 8px;align-items:center;font-size:11px;color:#a99fb8}
    #duelP .hp i{height:4px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden;display:block}#duelP .hp i s{display:block;height:100%;width:100%;transition:width .2s}
    #duelP .tg{display:flex;flex-direction:column;gap:5px}
    #duelP .tg button{display:flex;align-items:center;gap:8px;text-align:left;font-size:11.5px;padding:6px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.14);color:#cfc8dc;background:rgba(10,8,16,.6)}
    #duelP .tg button i{width:22px;height:12px;border-radius:6px;background:rgba(255,255,255,.12);position:relative;flex:none;transition:background .2s}
    #duelP .tg button i::after{content:'';position:absolute;left:2px;top:2px;width:8px;height:8px;border-radius:50%;background:#8a8399;transition:transform .2s,background .2s}
    #duelP .tg button.on{border-color:rgba(255,143,176,.6);color:#fff}#duelP .tg button.on i{background:rgba(255,120,160,.45)}#duelP .tg button.on i::after{transform:translateX(10px);background:#fff}
    #duelP .ct{font-size:11px;color:#a99fb8}#duelP .ct em{font-style:normal;font-family:var(--en);font-size:16px;color:#fff;margin-right:4px}
    #refB{position:fixed;right:calc(max(16px,env(safe-area-inset-right,0px)) + 142px);bottom:calc(env(safe-area-inset-bottom,0px) + 80px);width:74px;height:74px;border-radius:50%;z-index:6;touch-action:none;user-select:none;-webkit-user-select:none;display:none;
      background:radial-gradient(circle at 50% 38%,rgba(30,40,60,.6),rgba(6,8,14,.75));box-shadow:0 0 0 1.5px rgba(140,220,255,.4) inset,0 6px 20px rgba(0,0,0,.45)}
    #refB::before{content:'';position:absolute;inset:14px 16px 26px;border-radius:50% 50% 8px 8px / 70% 70% 8px 8px;border-top:2.5px solid rgba(170,235,255,.9);filter:drop-shadow(0 0 4px rgba(140,220,255,.8))}
    #refB .cd{position:absolute;inset:-4px;border-radius:50%;background:conic-gradient(rgba(140,220,255,.85) var(--cd,360deg),rgba(255,255,255,.06) 0);-webkit-mask:radial-gradient(circle,transparent 36px,#000 37px,#000 40px,transparent 41px);mask:radial-gradient(circle,transparent 36px,#000 37px,#000 40px,transparent 41px)}
    #refB span{position:absolute;left:0;right:0;bottom:12px;text-align:center;font-size:11px;color:rgba(190,240,255,.9);letter-spacing:.08em}
    #refB.on{box-shadow:0 0 0 2px rgba(220,250,255,.95) inset,0 0 26px rgba(140,220,255,.5)}
    #duelW{position:fixed;inset:0;pointer-events:none;z-index:4;overflow:hidden}
    #duelW b{position:absolute;left:0;top:0;white-space:nowrap;font-weight:600;opacity:0;letter-spacing:.06em;text-shadow:0 0 8px rgba(0,0,0,.9),0 0 16px currentColor}
    #duelRally{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 96px);transform:translateX(-50%);pointer-events:none;font-family:var(--en);font-size:26px;color:#fff;opacity:0;transition:opacity .3s;text-shadow:0 0 14px rgba(255,140,180,.8)}
    #duelRally small{display:block;text-align:center;font-family:var(--kr);font-size:11px;letter-spacing:.12em;color:#ffc9da}`;
  document.head.appendChild(st);
  const P = document.createElement('div'); P.id = 'duelP'; P.hidden = true; ui.appendChild(P);
  P.innerHTML = `<b>반사 시험</b><div class="r">반사 버튼(컴퓨터: E · 시프트)을 누르면 기체 앞쪽 120°에 0.25초 막이 생겨요. 닿기 직전 0.1초 안에 누르면 크리티컬 — 상대에게 꽂혀요. 넷째 반사부터는 달아올라 반사가 안 돼요.</div>
    <div class="hp"><span>나</span><i><s class="me" style="background:linear-gradient(90deg,#7dff9a,#b9ff4a)"></s></i><span class="meN">100</span><span>상대</span><i><s class="fo" style="background:linear-gradient(90deg,#ff5a8a,#ff9ab8)"></s></i><span class="foN">100</span></div>
    <div class="ct"><em class="nC">0</em>크리티컬 · <em class="nN">0</em>보통 · <em class="nM">0</em>맞음 · 가장 긴 주고받기 <em class="nR">0</em></div>`;
  ['pointerdown', 'pointermove', 'pointerup'].forEach(e => P.addEventListener(e, ev => ev.stopPropagation()));
  const OPT = { critTurn: false };   /* 뒤돌기 불이익은 ① 천천히 돌기만 (flight 기본) */
  const meS = P.querySelector('.me'), foS = P.querySelector('.fo'), meN = P.querySelector('.meN'), foN = P.querySelector('.foN'), nC = P.querySelector('.nC'), nN = P.querySelector('.nN'), nM = P.querySelector('.nM'), nR = P.querySelector('.nR');
  const W = document.createElement('div'); W.id = 'duelW'; document.body.appendChild(W);
  const words = Array.from({ length: 14 }, () => { const el = document.createElement('b'); W.appendChild(el); return { el, t0: -9, p: new THREE.Vector3(), big: 0 }; }); let wI = 0;
  const word = (t, x, z, txt, col, big = 0) => { const w = words[wI = (wI + 1) % words.length]; w.t0 = t; w.p.set(x, FLY.HOVER + 1.2, z); w.big = big; w.el.textContent = txt; w.el.style.color = col; w.el.style.fontSize = (big ? 20 : 13) + 'px'; };
  const rally = document.createElement('div'); rally.id = 'duelRally'; document.body.appendChild(rally); let rallyT = -9;
  /* ── 반사 버튼 ── */
  const rb = document.createElement('div'); rb.id = 'refB'; rb.innerHTML = '<div class="cd"></div><span>반사</span>'; document.body.appendChild(rb);
  const R = { on: -9, cd: -9, lastHit: -9, lastHitLate: false };
  const press = t => { if (t < R.cd) return; R.on = t; R.cd = t + DUEL.CD; SND.shield(); if (t - R.lastHit < .15 && R.lastHitLate) word(t, FS.x, FS.z, '늦음', '#ffb36a'); };
  let tNow = 0;
  rb.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); press(tNow); });
  addEventListener('keydown', e => { if (!G.visible || e.repeat) return; if (e.code === 'KeyE' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') press(tNow); });
  /* ── 시합 자리: 둘레 20m가 막힘 없이 트인 곳 ── */
  let spot = null;
  const findSpot = () => { let best = null, bs = -1;
    for (let x = -172; x <= 172; x += 4) for (let z = -172; z <= 172; z += 4) { if (B.blocked(x, z) || B.region(x, z) === 17 || Math.hypot(x, z) < 75 || (avoid && avoid(x, z))) continue;   /* 보스 구역(블랙홀)·몹 떼 근처는 뺌 */
      let ok = 0, n = 0, rFree = 0;
      for (let r = 3; r <= 24; r += 3) { let ringOk = true; for (let k = 0; k < 24; k++) { n++; const a = k / 24 * 6.283; if (!B.blocked(x + Math.cos(a) * r, z + Math.sin(a) * r)) ok++; else ringOk = false; } if (ringOk && rFree === r - 3) rFree = r; }
      const sc = rFree * 10 + ok / n; if (sc > bs) { bs = sc; best = [x, z]; } }   /* 막힘 없이 트인 반지름이 가장 큰 곳 */
    return best; };
  /* ── 탄 쏘기 ── */
  let bI = 0, maxRally = 0, cnt = { c: 0, n: 0, m: 0 };
  const shoot = (x, z, ang, sp, dmg, owner, rc = 0, kind = 0) => { const k = BU[bI = (bI + 1) % NB]; Object.assign(k, { on: true, x, z, vx: Math.sin(ang) * sp, vz: Math.cos(ang) * sp, owner, rc, kind, dmg, tried: 0, age: 0, life: 30 / sp + .3, dead: -1, w: .22 + rc * .05 });
    k.hist.length = 0; k.hist.push([x, z]); };
  const aimLead = (sx, sz, tx, tz, tvx, tvz, sp) => { const dx = tx - sx, dz = tz - sz, d = Math.hypot(dx, dz), tt = d / sp; return Math.atan2(tx + tvx * tt * .7 - sx, tz + tvz * tt * .7 - sz); };
  const reflectTo = (k, nx, nz, mul) => { const v = Math.hypot(k.vx, k.vz) * mul, vn = k.vx * nx + k.vz * nz; let rx = k.vx - 2 * vn * nx, rz = k.vz - 2 * vn * nz; const l = Math.hypot(rx, rz) || 1; k.vx = rx / l * v; k.vz = rz / l * v; };
  /* ── 시작 · 끝 ── */
  const api = { active: false, BU, E, R };
  api.start = () => { if (!spot) spot = findSpot(); const [x, z] = spot; fly.userData.moveTo(x, z + 6, 0); cam.x = x; cam.z = z + 6; E.x = x; E.z = z - 10; E.hp = 100; E.oa = Math.atan2(E.x - FS.x, E.z - FS.z); E.mode = 'orbit'; E.modeT = 0; E.fireT = 1.5;
    FS.hp = 100; cnt = { c: 0, n: 0, m: 0 }; maxRally = 0; G.visible = true; P.hidden = false; rb.style.display = 'block'; api.active = true;
    say?.('반사 시험 — 상대가 쏘는 탄을 반사 버튼으로 돌려보내세요'); };
  api.stop = () => { G.visible = false; P.hidden = true; rb.style.display = 'none'; api.active = false; for (const k of BU) k.on = false; };
  /* ── 매 장면 ── */
  const v3 = new THREE.Vector3(), tmp = [0, 0];
  api.update = (t, dt, px, camera, cw, ch) => { tNow = t; if (!api.active) return;
    headM.uniforms.uPx.value = px * .8; partM.uniforms.uPx.value = px; headM.uniforms.uT.value = tailM.uniforms.uT.value = shM2.uniforms.uT.value = auM.uniforms.uT.value = t;
    /* 상대 움직임: 내 둘레를 돎 → 7초마다 내 등 뒤로 돌아 들어옴 */
    E.modeT += dt; if (E.dead > 0 && t - E.dead > 2) { E.dead = -9; E.hp = 100; }
    if (E.mode === 'orbit' && E.modeT > 7) { E.mode = 'flank'; E.modeT = 0; E.fa = FS.head + Math.PI; }
    if (E.mode === 'flank' && E.modeT > 3.2) { E.mode = 'orbit'; E.modeT = 0; E.oa = Math.atan2(E.x - FS.x, E.z - FS.z); }
    let gx, gz; if (E.mode === 'orbit') { E.oa += dt * .32; gx = FS.x + Math.sin(E.oa) * DUEL.ORBIT; gz = FS.z + Math.cos(E.oa) * DUEL.ORBIT; }
    else { gx = FS.x + Math.sin(FS.head) * 11; gz = FS.z + Math.cos(FS.head) * 11; }   /* 내 등 뒤 11m */
    for (let q = 0; q < 6 && B.blocked(gx, gz); q++) { gx = FS.x + (gx - FS.x) * .8; gz = FS.z + (gz - FS.z) * .8; }   /* 가려는 자리가 벽이면 나에게 조금씩 당겨 옴 */
    { const dx = gx - E.x, dz = gz - E.z, d = Math.hypot(dx, dz), sp = Math.min(E.mode === 'flank' ? 16 : 9, d * 2.5); E.vx += ((dx / (d || 1)) * sp - E.vx) * Math.min(1, dt * 3); E.vz += ((dz / (d || 1)) * sp - E.vz) * Math.min(1, dt * 3);
      const nx = E.x + E.vx * dt, nz = E.z + E.vz * dt; if (!B.blocked(nx, nz)) { E.x = nx; E.z = nz; } else if (!B.blocked(nx, E.z)) { E.x = nx; E.vz *= .3; } else if (!B.blocked(E.x, nz)) { E.z = nz; E.vx *= .3; } else { E.vx *= -.3; E.vz *= -.3; } }   /* 벽을 따라 미끄러짐 */
    const fh = Math.atan2(-(FS.x - E.x), -(FS.z - E.z)); let dh = Math.atan2(Math.sin(fh - E.head), Math.cos(fh - E.head)); E.head += dh * Math.min(1, dt * 8); E.bank += (THREE.MathUtils.clamp(-dh * 1.5, -.4, .4) - E.bank) * Math.min(1, dt * 6);
    const bob = Math.sin(t * 2.1) * .08, alive = E.dead < 0;
    foe.visible = alive || Math.floor(t * 12) % 2 === 0 && t - E.dead < .6; foe.position.set(E.x, FLY.HOVER + bob, E.z); foe.rotation.set(0, E.head, 0); foe.rotateZ(E.bank);
    shadow.position.set(E.x, .04, E.z); aura.position.set(E.x, .05, E.z); auM.uniforms.uHit.value = Math.max(0, 1 - (t - E.hitT) / .25);
    for (const m of fmats) if (m.emissive && m.userData.e0) m.emissive.copy(m.userData.e0).lerp(new THREE.Color(1, .9, .9), Math.max(0, 1 - (t - E.hitT) / .15));   /* 맞으면 하얗게 번쩍 */
    /* 상대 쏘기: 1.4초마다 한 발 · 가끔 세 발 연속 · 등 뒤로 돌아 들어오면 자리 잡고 바로 쏨 */
    if (alive) { E.fireT -= dt; if (E.fireT <= 0) { const a = aimLead(E.x, E.z, FS.x, FS.z, FS.vx, FS.vz, DUEL.SPEED); shoot(E.x + Math.sin(a) * 1.2, E.z + Math.cos(a) * 1.2, a, DUEL.SPEED, DUEL.DMG, 'e'); SND.efire();
        burst(E.x + Math.sin(a) * 1.2, E.z + Math.cos(a) * 1.2, 4, 0, 3);
        if (E.burst > 0) { E.burst--; E.fireT = .22; } else { E.fireT = E.mode === 'flank' ? .9 : 1.4; if (Math.random() < .25) E.burst = 2; } } }
    /* 반사 막 */
    const on = t - R.on < DUEL.WIN, crit = t - R.on < DUEL.CRIT;
    shield.position.set(FS.x, FLY.HOVER - .1, FS.z); shield.rotation.set(-Math.PI / 2, 0, FS.head);
    shM2.uniforms.uA.value += ((on ? 1 : 0) - shM2.uniforms.uA.value) * Math.min(1, dt * (on ? 40 : 12)); shM2.uniforms.uK.value = crit ? 1 : 0; shM2.uniforms.uFlash.value = Math.max(0, shM2.uniforms.uFlash.value - dt * 5);
    { const k = Math.max(0, (R.cd - t) / DUEL.CD); rb.style.setProperty('--cd', ((1 - k) * 360).toFixed(0) + 'deg'); rb.classList.toggle('on', on); }
    /* 탄 */
    const hx = -Math.sin(FS.head), hz = -Math.cos(FS.head);
    for (const k of BU) { if (!k.on) continue;
      if (k.dead >= 0) { k.dead += dt; if (k.dead > .08) k.on = false; continue; }
      k.age += dt; if (k.age > k.life) { k.dead = 0; continue; }
      const nx = k.x + k.vx * dt, nz = k.z + k.vz * dt;
      if (B.blocked(nx, nz)) { burst(k.x, k.z, 8, k.kind, 5); k.dead = 0; continue; }
      k.x = nx; k.z = nz; k.hist.push([k.x, k.z]); if (k.hist.length > 26) k.hist.shift();
      /* 나에게 오는 탄 */
      if (k.owner === 'e') { const dx = k.x - FS.x, dz = k.z - FS.z, d = Math.hypot(dx, dz);
        if (d < DUEL.REACH) { const front = Math.acos(Math.max(-1, Math.min(1, (dx * hx + dz * hz) / (d || 1)))) <= DUEL.ARC, closing = k.vx * dx + k.vz * dz < 0;
          if (on && front && closing) {
            if (k.rc >= DUEL.MAXR) { word(t, k.x, k.z, '달아오름 — 반사 안 됨', '#ff9a5a'); SND.over(); }
            else { const turnBad = OPT.critTurn && FS.turning, isCrit = crit && !turnBad; k.rc++; k.dmg *= DUEL.DMGK; k.owner = 'p'; k.age = 0; k.tried = 0;
              if (isCrit) { const sp = Math.hypot(k.vx, k.vz) * DUEL.CRITK, a = aimLead(k.x, k.z, E.x, E.z, E.vx, E.vz, sp); k.vx = Math.sin(a) * sp; k.vz = Math.cos(a) * sp; k.kind = 2; cnt.c++;
                FS.stopUntil = performance.now() + 70; FS.shake = Math.max(FS.shake || 0, .6); shM2.uniforms.uFlash.value = 1; word(t, k.x, k.z, '크리티컬!', '#ffffff', 1); SND.crit(k.rc); burst(k.x, k.z, 26, 2, 9); }
              else { reflectTo(k, hx, hz, DUEL.NORMAL); k.kind = k.rc >= DUEL.MAXR ? 3 : 1; cnt.n++; word(t, k.x, k.z, turnBad && crit ? '보통 (도는 중)' : '보통 반사', '#bff6ff'); SND.normal(k.rc); burst(k.x, k.z, 12, 1, 6); }
              if (k.rc >= DUEL.MAXR) k.kind = 3;
              k.life = 30 / Math.hypot(k.vx, k.vz) + .3; k.w = .22 + k.rc * .06; k.hist.push([k.x, k.z]);
              if (k.rc > 1) { rally.innerHTML = `${k.rc}<small>번째 반사</small>`; rally.style.opacity = 1; rallyT = t; } maxRally = Math.max(maxRally, k.rc); continue; } }
        }
        if (d < FLY.R + .35) { const lateish = !on; R.lastHit = t; R.lastHitLate = lateish;
          const behind = d > 0 && (dx * hx + dz * hz) / (d || 1) < Math.cos(DUEL.ARC);
          word(t, FS.x, FS.z, on && behind ? '옆·뒤에서 맞음' : k.rc >= DUEL.MAXR && on ? '달아올라 못 막음' : '맞음  -' + Math.round(k.dmg), '#ff7a7a'); SND.miss(); burst(k.x, k.z, 16, k.kind, 7);
          FS.hp = Math.max(0, (FS.hp ?? 100) - k.dmg); FS.hurt = t; FS.shake = Math.max(FS.shake || 0, .5); cnt.m++; if (FS.hp <= 0) { FS.hp = 100; say?.('격추! 다시 시작'); } k.dead = 0; continue; } }
      /* 상대에게 가는 탄: 상대도 반사해 옴 (주고받기) */
      if (k.owner === 'p' && alive) { const dx = k.x - E.x, dz = k.z - E.z, d = Math.hypot(dx, dz);
        if (d < DUEL.REACH && k.rc < DUEL.MAXR && !k.tried && Math.random() < .7) {
          const c2 = Math.random() < .4, sp = Math.hypot(k.vx, k.vz) * (c2 ? DUEL.CRITK : DUEL.NORMAL), a = aimLead(k.x, k.z, FS.x, FS.z, FS.vx, FS.vz, sp) + (c2 ? 0 : (Math.random() - .5) * .35);
          k.vx = Math.sin(a) * sp; k.vz = Math.cos(a) * sp; k.rc++; k.dmg *= DUEL.DMGK; k.owner = 'e'; k.kind = k.rc >= DUEL.MAXR ? 3 : 0; k.age = 0; k.life = 30 / sp + .3; k.w = .22 + k.rc * .06; k.hist.push([k.x, k.z]);
          word(t, E.x, E.z, c2 ? '상대 크리티컬' : '상대 반사', '#ff9ab8'); (c2 ? SND.crit : SND.normal)(k.rc); burst(k.x, k.z, c2 ? 20 : 10, c2 ? 2 : 0, 7);
          if (c2) FS.stopUntil = performance.now() + 50;
          rally.innerHTML = `${k.rc}<small>번째 반사</small>`; rally.style.opacity = 1; rallyT = t; maxRally = Math.max(maxRally, k.rc); continue; }
        if (d < DUEL.REACH) k.tried = 1;
        if (d < FLY.R + .45) { E.hp -= k.dmg; E.hitT = t; word(t, E.x, E.z, '-' + Math.round(k.dmg), k.kind === 2 ? '#ffffff' : '#c8ff9a', k.dmg > 20 ? 1 : 0); SND.miss(); burst(k.x, k.z, 18, k.kind, 8);
          if (E.hp <= 0) { E.dead = t; burst(E.x, E.z, 40, 2, 10); say?.('상대 격추!'); } k.dead = 0; continue; } } }
    if (t - rallyT > 1.4) rally.style.opacity = 0;
    /* 그리기 */
    for (let bi = 0; bi < NB; bi++) { const k = BU[bi], o = bi * NT * 2 * 4;
      if (!k.on) { for (let i = 0; i < NT * 2; i++) tu[o + i * 4] = -1; ha[bi * 3] = 0; continue; }
      const al = k.dead >= 0 ? 1 - k.dead / .08 : 1, L = (2.6 + k.rc * 1.6) * Math.min(1, k.age / .05 + (k.rc ? 1 : 0)) * (k.kind === 2 ? 1.8 : 1);   /* 반사될수록 꼬리가 길어짐 · 크리티컬은 길게 찢어지듯 */
      const H = k.hist; let seg = H.length - 1, sx = k.x, sz = k.z, acc = 0;
      for (let i = 0; i < NT; i++) { const s = i / (NT - 1) * L;
        while (seg >= 0) { const [qx, qz] = H[seg], sl = Math.hypot(qx - sx, qz - sz); if (acc + sl >= s || seg === 0) { const f = sl > 1e-6 ? Math.min(1, (s - acc) / sl) : 0; tmp[0] = sx + (qx - sx) * f; tmp[1] = sz + (qz - sz) * f; break; } acc += sl; sx = qx; sz = qz; seg--; }
        if (seg < 0) { tmp[0] = sx; tmp[1] = sz; }
        const u = i / (NT - 1), w = k.w * 1.4 * (.55 + .45 * Math.sin(Math.min(1, u * 3) * Math.PI * .5)) * Math.pow(1 - u, 1.1), j = (bi * NT + i) * 2;
        const px_ = i ? tp[(j - 2) * 3] * .5 + tp[(j - 1) * 3] * .5 : k.x + k.vx * .01, pz_ = i ? tp[(j - 2) * 3 + 2] * .5 + tp[(j - 1) * 3 + 2] * .5 : k.z + k.vz * .01;
        let dx = px_ - tmp[0], dz = pz_ - tmp[1], dl = Math.hypot(dx, dz); if (dl < 1e-5) { dx = k.vx; dz = k.vz; dl = Math.hypot(dx, dz) || 1; }
        const ox = -dz / dl * w, oz = dx / dl * w, y = FLY.HOVER;
        tp.set([tmp[0] + ox, y, tmp[1] + oz, tmp[0] - ox, y, tmp[1] - oz], j * 3); tu.set([u, 1, k.kind, al, u, -1, k.kind, al], j * 4); }
      hp.set([k.x, FLY.HOVER, k.z], bi * 3); ha.set([k.dead >= 0 ? 0 : 1, k.kind, 1.1 + k.rc * .25], bi * 3); }
    tg.attributes.position.needsUpdate = tg.attributes.aU.needsUpdate = true; hg.attributes.position.needsUpdate = hg.attributes.aH.needsUpdate = true;
    for (let i = 0; i < NP; i++) { const p = PT[i]; if (p.l > 0) { p.l -= dt; p.vy -= p.fall * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 1 - dt * 2; p.vz *= 1 - dt * 2; if (p.y < .05) { p.y = .05; p.vy *= -.3; } }
      const f = p.l > 0 ? p.l / p.m : 0; pp.set([p.x || 0, p.y || 0, p.z || 0], i * 3); pc.set([(p.r || 0) * f, (p.g || 0) * f, (p.b || 0) * f, p.l > 0 ? p.s : 0], i * 4); }
    pg.attributes.position.needsUpdate = pg.attributes.aC.needsUpdate = true;
    /* 글자 */
    for (const w of words) { const e = t - w.t0; if (e > .9) { if (w.el.style.opacity !== '0') w.el.style.opacity = 0; continue; }
      v3.copy(w.p).project(camera); const x = (v3.x * .5 + .5) * cw, y = (-v3.y * .5 + .5) * ch - 36 * Math.sqrt(e / .9), sc = e < .08 ? .7 + e / .08 * .5 : 1.2 - Math.min(.2, e);
      w.el.style.opacity = (e < .6 ? 1 : 1 - (e - .6) / .3).toFixed(2); w.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) scale(${sc.toFixed(2)})`; }
    /* 표 */
    meS.style.width = (FS.hp ?? 100) + '%'; meN.textContent = Math.round(FS.hp ?? 100); foS.style.width = Math.max(0, E.hp) + '%'; foN.textContent = Math.max(0, Math.round(E.hp));
    nC.textContent = cnt.c; nN.textContent = cnt.n; nM.textContent = cnt.m; nR.textContent = maxRally; };
  return api;
}
