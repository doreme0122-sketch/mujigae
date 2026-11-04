/* 기본탄 열 가지 (2026-11-04 사용자 확정 비교표 · 디자인 기준 문서 '기본탄 비교표')
   · 조작(모든 탄 같음): 오른쪽 아래 버튼을 누르고만 있으면 가장 가까운 적 자동 조준 · 끌면 끈 방향 그대로 · 컴퓨터는 스페이스
     모아 쏘기만 다름: 누르고 있는 동안 모으고 손을 떼면 나감
   · 쏘는 동안 기체가 느려지고 쏘는 쪽을 바라봄 — 얼마나 느려지는지는 탄마다 (무거운 탄일수록 더)
   · 과열: 쉬지 않고 쏘면 탄마다 정한 시간에 과열 → 정한 시간만큼 식어야 다시
   · 탄 생김새(사용자: 단순한 선 금지): 탄마다 머리 모양·꼬리 결·부스러기·맞은 자리 흔적이 다름
     연발탄 연두 빛 덩어리 · 무거운 탄 녹은 쇳물 덩어리 · 모아 쏘기 하얀 빛 창 · 쌍갈래 파랑 두 줄기 · 흩뿌림 불티 알갱이
     꿰뚫는 바늘 은빛 가는 바늘 · 튕김탄 맑은 빛(튕기면 무지개) · 휘는 탄 보랏빛 활 꼬리 · 서리탄 얼음 결정 · 비추는 탄 따뜻한 흰 빛 꽃
   · 맞음: 몹 = 피해 숫자(onDamage) · 벽 = 그 벽 무늬가 빛남(rocks.hitWall) · 수정 기둥 = 튕김 · 블랙홀 = 휘고 삼켜짐
     튕긴 탄은 피해 1.5배 · 수정에 튕긴 탄은 쏜 사람도 맞음 (보스 구역 규칙)
   무게: 꼬리 한 장 · 머리 한 장 · 부스러기 한 장 · 바닥 흔적 한 장 · 모으는 빛 한 장 · 조준 고리 한 장 = 그리기 6번 (탄 종류가 늘어도 같음) */
import * as THREE from 'three';
import * as A from '../core/audio.js';
import { FLY } from './flight.js?v=11041136';
import { BH } from './blackhole.js?v=11041136';
import { hitWall } from './rocks.js?v=11041136';

/* 비교표 그대로. heatT: 쉬지 않고 쏘면 과열까지(초) · coolT: 과열 뒤 다시 쏠 때까지(초) · cryB/wallB: 수정·벽에서 튕기는 횟수
   kind: 그림 결 (0 기본 · 1 서리 · 2 따뜻한 빛 · 3 빛 창 · 4 쇳물 · 5 불티 · 6 바늘 · 7 활) */
export const SHOT = {
  rapid:   { name: '연발탄', role: '기본형', rate: 7, dmg: 4, speed: 44, range: 40, R: .20, heatT: 3, coolT: 2, n: 1, jit: 1, cryB: 3, wallB: 0, aimR: 30, fireSlow: .5, recoil: 1, col: [.62, 1, .32], tail: 3.4, W: .27, head: 1, kind: 0, snd: 'pew', look: '연두 빛 덩어리 + 가는 꼬리' },
  heavy:   { name: '무거운 탄', role: '기본형', rate: 2.5, dmg: 11, speed: 26, range: 34, R: .45, heatT: 4, coolT: 2.5, n: 1, jit: 0, cryB: 1, wallB: 0, knock: 2.5, aimR: 32, fireSlow: .6, recoil: 2, shake: .22, col: [1, .55, .2], tail: 4.4, W: .62, head: 2, kind: 4, snd: 'boom', look: '주황 쇳물 덩어리 + 굵은 꼬리' },
  charge:  { name: '모아 쏘기', role: '기본형', rate: 1.1, dmg: [6, 22], speed: 50, range: 46, R: [.25, .5], chargeT: .8, heatT: 0, heatFull: 1 / 3, coolT: 2, n: 1, jit: 0, cryB: 2, wallB: 0, pierceFull: 1, knockFull: 1, aimR: 34, fireSlow: .4, chargeSlow: .65, recoil: [.6, 2], col: [.92, .96, 1], tail: [3, 7], W: [.26, .62], head: [1, 2.3], kind: 3, snd: 'charge', look: '하얀 빛 창 (모일수록 커짐)' },
  twin:    { name: '쌍갈래 탄', role: '거리형', rate: 5, dmg: 2.8, speed: 40, range: 28, R: .18, heatT: 3, coolT: 2, n: 2, pat: 'v', ang: 8, jit: .4, cryB: 2, wallB: 0, aimR: 24, fireSlow: .5, recoil: 0.8, col: [.32, .62, 1], tail: 3, W: .22, head: .85, kind: 0, snd: 'twin', look: '파랑 두 줄기' },
  scatter: { name: '흩뿌림', role: '거리형', rate: 1.6, dmg: 3.5, speed: 34, range: 16, R: .14, heatT: 3.5, coolT: 2.5, n: 5, pat: 'fan', ang: 26, jit: 2, spd: .12, cryB: 0, wallB: 0, knock: .12, aimR: 16, fireSlow: .45, recoil: 1.6, col: [1, .86, .62], tail: 1.5, W: .16, head: .6, kind: 5, snd: 'scatter', look: '하얀 불티 알갱이' },
  needle:  { name: '꿰뚫는 바늘', role: '거리형', rate: 9, dmg: 2.8, speed: 70, range: 48, R: .10, heatT: 3, coolT: 2, n: 1, jit: .5, pierce: 1, pierceK: .7, cryB: 2, wallB: 0, aimR: 34, fireSlow: .5, recoil: 0.4, col: [.8, .88, 1], tail: 7, W: .12, head: .55, kind: 6, snd: 'needle', look: '은빛 가는 바늘 + 긴 꼬리' },
  bounce:  { name: '튕김탄', role: '머리 쓰는 형', rate: 6, dmg: 3.5, speed: 38, range: 50, R: .20, heatT: 3, coolT: 2, n: 1, jit: 1, cryB: 3, wallB: 2, aimR: 28, fireSlow: .5, recoil: 0.8, col: [.78, 1, .96], tail: 3.4, W: .24, head: .95, kind: 0, snd: 'ting', look: '맑은 빛 (튕기면 무지개 꼬리)' },
  curve:   { name: '휘는 탄', role: '머리 쓰는 형', rate: 4, dmg: 6.5, speed: 30, range: 36, R: .25, heatT: 3, coolT: 2, n: 1, jit: 0, cryB: 2, wallB: 0, knock: .5, curve: .5, aimR: 28, fireSlow: .5, recoil: 1, col: [.72, .42, 1], tail: 4.6, W: .3, head: 1.1, kind: 7, snd: 'whee', look: '보랏빛 활처럼 휘는 꼬리' },
  frost:   { name: '서리탄', role: '도움형', rate: 6, dmg: 3, speed: 40, range: 36, R: .20, heatT: 3.5, coolT: 2, n: 1, jit: 1, cryB: 2, wallB: 0, slow: .1, slowMax: .3, slowT: 2, aimR: 30, fireSlow: .5, recoil: 0.8, col: [.55, .88, 1], tail: 3, W: .24, head: 1.1, kind: 1, snd: 'ice', look: '하늘색 얼음 결정 + 서리 부스러기' },
  light:   { name: '비추는 탄', role: '도움형', rate: 6, dmg: 2.5, speed: 46, range: 44, R: .20, heatT: 4, coolT: 2, n: 1, jit: 1, cryB: 3, wallB: 0, reveal: 4, revealT: 2, aimR: 34, fireSlow: .4, recoil: 0.8, col: [1, .86, .62], tail: 3.2, W: .26, head: 1.1, kind: 2, snd: 'ding', look: '따뜻한 흰 빛 · 맞은 자리에 빛 꽃' },
};
export const SHOT_IDS = Object.keys(SHOT);
const pick = (v, k) => Array.isArray(v) ? v[0] + (v[1] - v[0]) * k : v;
const MAXB = 96, NT = 12, NP = 420, ND = 24;
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

/* ── 소리: 탄마다 다른 목소리 ── */
const osc = (type, f0, f1, dur, vol, at = 0) => { const c = A.ctx, t0 = c.currentTime + at, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur * .8); o.connect(g); A.env(g, t0, .002, vol, dur); A.out(g, .12); o.start(t0); o.stop(t0 + dur + .05); };
const hiss = (ft, f, q, dur, vol, at = 0, rev = .15) => { const c = A.ctx, t0 = c.currentTime + at, n = A.noise(dur + .05), fl = c.createBiquadFilter(), g = c.createGain(); fl.type = ft; fl.frequency.value = f; fl.Q.value = q; n.connect(fl); fl.connect(g); A.env(g, t0, .002, vol, dur); A.out(g, rev); n.start(t0); };
const SND = {
  pew() { const f = 1250 + Math.random() * 160; osc('triangle', f, f * .42, .08, .1); },                                                              /* 가벼운 퓻 */
  boom() { osc('sine', 170, 55, .26, .16); hiss('lowpass', 700, .7, .16, .09, 0, .25); },                                                             /* 낮은 쿵 */
  charge(k = 1) { osc('sine', 120 + 60 * k, 45, .4, .1 + .1 * k); hiss('lowpass', 900 + 1800 * k, .8, .22, .06 + .08 * k, 0, .35); osc('triangle', 900 + 900 * k, 300, .14, .05); },   /* 쾅 (모은 만큼 큼) */
  twin() { const f = 1050 + Math.random() * 90; osc('triangle', f, f * .45, .07, .07); osc('triangle', f * 1.12, f * .5, .07, .06, .018); },             /* 겹친 퓻퓻 */
  scatter() { hiss('bandpass', 2400, .5, .14, .12, 0, .2); osc('square', 420, 160, .08, .03); },                                                       /* 넓게 퍼지는 팡 */
  needle() { const f = 3300 + Math.random() * 300; osc('sine', f, f * .72, .06, .04); osc('triangle', f * 1.5, f, .04, .02); },                          /* 높고 날카로운 칭 */
  ting() { const f = 1900 + Math.random() * 120; osc('sine', f, f * .97, .22, .05); },                                                                 /* 맑은 팅 */
  whee() { osc('sine', 520, 1150, .18, .06); osc('triangle', 780, 1500, .14, .025); },                                                                  /* 휘이 */
  ice() { hiss('highpass', 6200, .9, .05, .06); osc('sine', 2700 + Math.random() * 200, 2500, .16, .035); },                                           /* 쨍한 얼음 */
  ding() { osc('sine', 1046, 1040, .3, .04); osc('sine', 1568, 1560, .22, .02); },                                                                      /* 부드러운 띵 */
};
const play = (k, a) => { if (A.live()) SND[k]?.(a); };
function thud(vol = .05) { if (!A.live()) return; hiss('lowpass', 1400, .7, .1, vol); }
function crack() { if (!A.live()) return; hiss('highpass', 3000, .7, .07, .09, 0, .2); osc('square', 1900, 700, .06, .02); }   /* 과열: 달아오른 금속이 쩍 */
function flare() { if (!A.live()) return; osc('sine', 220, 140, .7, .08); }                                                    /* 과열: 낮게 울리는 금속 */
function bounceTing(f = 2400) { if (A.live()) osc('sine', f, f * .98, .18, .04); }
/* 모으는 소리: 모일수록 높아지는 윙 — 누르는 동안 하나가 계속 울림 */
function makeWhine() { let o = null, o2 = null, g = null;
  return { set(k) { if (!A.live()) return; const c = A.ctx;
      if (!o) { o = c.createOscillator(); o2 = c.createOscillator(); g = c.createGain(); o.type = 'sawtooth'; o2.type = 'sine'; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400; o.connect(f); o2.connect(f); f.connect(g); g.gain.value = 0; A.out(g, .2); o.start(); o2.start(); }
      const t0 = c.currentTime; o.frequency.setTargetAtTime(180 + 620 * k * k, t0, .03); o2.frequency.setTargetAtTime(360 + 1240 * k * k + (k >= 1 ? 30 * Math.sin(t0 * 40) : 0), t0, .03); g.gain.setTargetAtTime(.012 + .03 * k, t0, .04); },
    stop() { if (!o) return; const t0 = A.ctx.currentTime; g.gain.setTargetAtTime(0, t0, .02); const a = o, b = o2; setTimeout(() => { try { a.stop(); b.stop(); } catch (_) {} }, 200); o = o2 = g = null; } }; }

export function makeShots({ B, crystals, bh, FS, say, mobs, onKill, onDamage, onReveal }) {
  const G = new THREE.Group(); let cfg = SHOT.rapid, cid = 'rapid';
  /* ── 꼬리: 탄마다 NT점 띠 (색·결은 탄마다 → 탄을 바꿔도 날아가던 탄은 제 모습 그대로) ── */
  const tp = new Float32Array(MAXB * NT * 2 * 3), tu = new Float32Array(MAXB * NT * 2 * 3), tc = new Float32Array(MAXB * NT * 2 * 4), ti = [];
  for (let b = 0; b < MAXB; b++) for (let i = 0; i < NT - 1; i++) { const p = (b * NT + i) * 2; ti.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3)); tg.setAttribute('aU', new THREE.BufferAttribute(tu, 3)); tg.setAttribute('aC', new THREE.BufferAttribute(tc, 4)); tg.setIndex(ti);
  const tailM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uT: { value: 0 } },
    vertexShader: 'attribute vec3 aU; attribute vec4 aC; varying vec3 vU; varying vec4 vC; void main(){ vU = aU; vC = aC; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uT; varying vec3 vU; varying vec4 vC;   /* vU: x 꼬리 위치(0 머리 → 1 끝) · y 띠 가로(-1~1) · z 밝기×100 + 튕김 · vC: 탄 색 + 결 */
      vec3 spec(float x){ return clamp(abs(fract(x + vec3(0., .33, .67)) * 6. - 3.) - 1., 0., 1.); }
      void main(){ if (vU.x < 0.) discard; float u = clamp(vU.x, 0., 1.), s = vU.y, k = fract(vU.z), al = floor(vU.z) / 100., kd = vC.w; vec3 C = vC.rgb;
        float core = exp(-s * s * 7.), body = exp(-s * s * 1.8) * .45, fade = (1. - u) * (1. - u);
        vec3 hot = mix(vec3(1.15, 1.2, 1.1), C * C * 1.4, smoothstep(.0, .55, u));                              /* 머리 가까이는 하얗게 뜨겁고 뒤로 갈수록 탄 색 */
        if (kd > .5 && kd < 1.5) { body *= .55 + .45 * pow(max(abs(sin(u * 31. - uT * 18. + s * 2.)), 0.), 6.); hot = mix(vec3(1.1, 1.18, 1.25), C * 1.1, smoothstep(0., .35, u)); }   /* 서리: 얼어붙은 마디마디가 반짝임 */
        else if (kd > 1.5 && kd < 2.5) { body = exp(-s * s * 1.1) * .6; hot = mix(vec3(1.2, 1.12, .95), C * 1.15, smoothstep(0., .6, u)); }   /* 따뜻한 빛: 넓고 부드러운 결 */
        else if (kd > 2.5 && kd < 3.5) { core = exp(-s * s * 11.) * 1.4; body = exp(-s * s * 2.6) * .35; fade = 1. - u; hot = mix(vec3(1.25), vec3(.75, .85, 1.2), smoothstep(.2, 1., u)); }   /* 빛 창: 곧고 날카로운 심 */
        else if (kd > 3.5 && kd < 4.5) { float fl = .7 + .3 * sin(u * 17. - uT * 26.) * sin(u * 7. + uT * 9.); body *= 1.3 * fl; hot = mix(vec3(1.3, 1.05, .6), vec3(1., .3, .06), smoothstep(.0, .7, u)); fade = pow(1. - u, 1.5); }   /* 쇳물: 일렁이며 식어 붉어짐 */
        else if (kd > 4.5 && kd < 5.5) { fade = pow(1. - u, 3.); hot = mix(vec3(1.3, 1.2, 1.), C * 1.1, smoothstep(0., .4, u)); }   /* 불티: 짧게 꺼짐 */
        else if (kd > 5.5 && kd < 6.5) { core = exp(-s * s * 16.) * 1.3; body = exp(-s * s * 3.) * .22; fade = 1. - u; hot = mix(vec3(1.2, 1.25, 1.3), C * C * 1.2, smoothstep(.1, .8, u)); }   /* 바늘: 가늘고 긴 은빛 */
        else if (kd > 6.5) { body *= 1.15; hot = mix(vec3(1.15, 1.05, 1.25), C * C * 1.5, smoothstep(0., .45, u)); }
        vec3 rb = spec(u * 1.3 + s * .18 - uT * .6) * 1.5;                                                       /* 튕긴 탄: 프리즘처럼 갈라진 꼬리 */
        vec3 c = mix(hot, rb * rb + .1, k * smoothstep(.05, .35, u)) * (core + body) * fade;
        gl_FragColor = vec4(c * al, 1.); }` });
  const tail = new THREE.Mesh(tg, tailM); tail.frustumCulled = false; tail.renderOrder = 9; G.add(tail);
  /* ── 머리: 탄마다 생김새 (aH: 밝기 · 튕김 · 크기 · 결) ── */
  const hp = new Float32Array(MAXB * 3), ha = new Float32Array(MAXB * 4), hc = new Float32Array(MAXB * 3);
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(hp, 3)); hg.setAttribute('aH', new THREE.BufferAttribute(ha, 4)); hg.setAttribute('aC', new THREE.BufferAttribute(hc, 3));
  const headM = new THREE.ShaderMaterial({ ...AB, uniforms: { uPx: { value: 600 }, uT: { value: 0 } },
    vertexShader: 'attribute vec4 aH; attribute vec3 aC; uniform float uPx, uT; varying vec4 vH; varying vec3 vC; void main(){ vH = aH; vC = aC; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = aH.x > 0. ? uPx * aH.z * (.9 + .08 * sin(uT * 60. + position.x * 9.)) * (.6 + .4 * aH.x) / max(.1, -mv.z) : 0.; }',
    fragmentShader: `uniform float uT; varying vec4 vH; varying vec3 vC; vec3 spec(float x){ return clamp(abs(fract(x + vec3(0., .33, .67)) * 6. - 3.) - 1., 0., 1.); }
      void main(){ vec2 q = gl_PointCoord - .5; float r2 = dot(q, q) * 4., a = atan(q.y, q.x + 1e-5), kd = vH.w; vec3 C = vC;
        float core = exp(-r2 * 26.) * 1.6, halo = exp(-r2 * 5.) * .55; vec3 cc = vec3(1.2, 1.25, 1.15);
        if (kd > .5 && kd < 1.5) { float st = pow(max(abs(cos((a + uT * 1.5) * 3.)), 0.), 10.) * exp(-r2 * 2.6); halo = halo * .6 + st * .9; cc = vec3(1.1, 1.2, 1.3); }   /* 서리: 여섯 갈래 얼음 결정이 천천히 돎 */
        else if (kd > 1.5 && kd < 2.5) { float ry = pow(max(abs(cos(a * 2.)), 0.), 24.) * exp(-r2 * 1.6) * .7; halo += ry; cc = vec3(1.25, 1.15, .95); }   /* 따뜻한 빛: 부드러운 네 갈래 빛살 */
        else if (kd > 2.5 && kd < 3.5) { float ring = exp(-(sqrt(r2) - .55) * (sqrt(r2) - .55) * 60.) * .5; halo = halo * .8 + ring; core *= 1.2; cc = vec3(1.25, 1.28, 1.35); }   /* 빛 창: 둘레 빛 고리 */
        else if (kd > 3.5 && kd < 4.5) { float fl = .75 + .25 * sin(a * 5. + uT * 17.) * sin(a * 3. - uT * 11.); halo = exp(-r2 * 3.4 / fl) * .8; core = exp(-r2 * 14.) * 1.5; cc = vec3(1.3, 1.05, .7); }   /* 쇳물: 가장자리가 일렁임 */
        else if (kd > 5.5 && kd < 6.5) { core = exp(-r2 * 60.) * 2.; float gl = pow(max(abs(cos(a)), 0.), 40.) * exp(-r2 * 2.) * .8; halo = halo * .4 + gl; cc = vec3(1.25, 1.3, 1.35); }   /* 바늘: 단단한 점 + 가로 반짝임 */
        vec3 col = mix(C * C * 1.5, spec(fract(a / 6.2832 + .1)) * 1.2 + .2, vH.y);
        gl_FragColor = vec4((cc * core + col * halo) * vH.x, 1.); }` });
  const heads = new THREE.Points(hg, headM); heads.frustumCulled = false; heads.renderOrder = 10; G.add(heads);
  /* ── 부스러기·불티·서리·모이는 빛 알갱이: 한 장 ── */
  const pp = new Float32Array(NP * 3), pc = new Float32Array(NP * 4);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('aC', new THREE.BufferAttribute(pc, 4));
  const partM = new THREE.ShaderMaterial({ ...AB, uniforms: { uPx: { value: 600 } },
    vertexShader: 'attribute vec4 aC; uniform float uPx; varying vec4 vC; void main(){ vC = aC; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = aC.w > 0. ? uPx * aC.w / max(.1, -mv.z) : 0.; }',
    fragmentShader: 'varying vec4 vC; void main(){ vec2 q = gl_PointCoord - .5; float k = exp(-dot(q, q) * 14.); gl_FragColor = vec4(vC.rgb * k, 1.); }' });
  const parts = new THREE.Points(pg, partM); parts.frustumCulled = false; parts.renderOrder = 11; G.add(parts);
  const PT = Array.from({ length: NP }, () => ({ l: 0, m: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 0, g: 0, b: 0, s: .1, grow: 0, fall: 0, drag: 2 })); let pI = 0;
  const emit = (x, y, z, vx, vy, vz, r, g, b, s, life, grow = 0, fall = 6, drag = 2) => { const p = PT[pI = (pI + 1) % NP]; Object.assign(p, { l: life, m: life, x, y, z, vx, vy, vz, r, g, b, s, grow, fall, drag }); };
  const spec = x => { const f = v => Math.min(1, Math.max(0, Math.abs(((x + v) % 1 + 1) % 1 * 6 - 3) - 1)); return [f(0), f(.33), f(.67)]; };
  /* ── 바닥 흔적: 맞은 자리 땅에 남는 빛 (비추는 탄 = 피어나는 빛 꽃 4m · 서리탄 = 얼음 결정 · 무거운 탄 = 퍼지는 충격 고리) ── */
  const dF = new Float32Array(ND * 4), dP = new Float32Array(ND * 3), dG = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(2, 2)); dG.instanceCount = ND;
  dG.setAttribute('aP', new THREE.InstancedBufferAttribute(dP, 3)); dG.setAttribute('aF', new THREE.InstancedBufferAttribute(dF, 4));
  for (let i = 0; i < ND; i++) { dF[i * 4] = -99; dF[i * 4 + 3] = 1; }
  const decM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uT: { value: 0 } },
    vertexShader: `attribute vec3 aP; attribute vec4 aF; uniform float uT; varying vec2 vU; varying vec4 vF; void main(){ vU = position.xy; vF = aF; float age = uT - aF.x, on = step(0., age) * step(age, aF.w);
      vec3 p = vec3(position.x * aF.y * on, 0., -position.y * aF.y * on) + aP; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`,
    fragmentShader: `uniform float uT; varying vec2 vU; varying vec4 vF;
      void main(){ float age = uT - vF.x, life = max(vF.w, .01), e = clamp(age / life, 0., 1.), r = length(vU), a = atan(vU.y, vU.x + 1e-5), kd = vF.z; if (r > 1.) discard; vec3 c;
        if (kd < .5) { float op = 1. - exp(-age * 9.), pet = .55 + .45 * pow(max(abs(cos(a * 3. + age * .3)), 0.), 1.6), edge = r / max(.05, pet * op);   /* 빛 꽃: 여섯 꽃잎이 0.3초에 피고 2초에 걸쳐 저묾 */
          float f = smoothstep(1., .55, edge) * (1. - e) * (1. - e), vein = exp(-sin(a * 3.) * sin(a * 3.) * 30.) * smoothstep(1., .1, r) * .35, mid = exp(-r * r * 14.) * .8;
          c = vec3(1., .82, .55) * (f * .2 + vein * .7 * (1. - e) + mid * .55 * (1. - e) * (1. - e)) + vec3(1., .95, .85) * exp(-(edge - .92) * (edge - .92) * 81.) * .25 * (1. - e); }
        else if (kd < 1.5) { float sp = pow(max(abs(cos(a * 3.)), 0.), 30.), br = pow(max(abs(cos(a * 9.)), 0.), 30.) * step(.35, r) * step(r, .7), grow = smoothstep(0., .18, age);   /* 얼음 결정: 여섯 가지 + 잔가지 */
          float f = (sp * smoothstep(grow + .02, grow - .1, r) + br * .6 * step(r, grow)) * (1. - e); c = vec3(.6, .9, 1.1) * f * .55 + vec3(.5, .8, 1.) * exp(-r * r * 8.) * .25 * (1. - e); }
        else { float w = .5 + e * .5, ring = exp(-(r - w) * (r - w) * 121.) * (1. - e) * (1. - e); c = vec3(1., .5, .18) * ring * .55 + vec3(1., .7, .3) * exp(-r * r * 10.) * (1. - e) * .3; }   /* 충격 고리 */
        gl_FragColor = vec4(c, 1.); }` });
  const decal = new THREE.Mesh(dG, decM); decal.frustumCulled = false; decal.renderOrder = 6; G.add(decal); let dI = 0;
  const stamp = (x, z, r, kind, life) => { const i = dI = (dI + 1) % ND; dP.set([x, .09 + i * .001, z], i * 3); dF.set([decM.uniforms.uT.value, r, kind, life], i * 4); dG.attributes.aP.needsUpdate = dG.attributes.aF.needsUpdate = true; };
  /* ── 모으는 빛: 기체 앞에 빛이 모여 커짐 (모아 쏘기) ── */
  const mzP = new Float32Array(3), mzG = new THREE.BufferGeometry(); mzG.setAttribute('position', new THREE.BufferAttribute(mzP, 3));
  const muzM = new THREE.ShaderMaterial({ ...AB, uniforms: { uA: { value: 0 }, uPx: { value: 600 }, uT: { value: 0 }, uFull: { value: 0 } },
    vertexShader: 'uniform float uPx, uA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uA > .01 ? uPx * (.5 + 1.9 * uA) / max(.1, -mv.z) : 0.; }',
    fragmentShader: `uniform float uA, uT, uFull; void main(){ vec2 q = gl_PointCoord - .5; float r2 = dot(q, q) * 4., a = atan(q.y, q.x + 1e-5);
      float sw = pow(max(.5 + .5 * sin(a * 4. - uT * 9. + sqrt(r2) * 14.), 0.), 3.) * exp(-r2 * 3.) * .45;                           /* 빨려 드는 소용돌이 결 */
      float pul = 1. + uFull * .35 * sin(uT * 30.), core = exp(-r2 * 22. / (.4 + uA)) * 1.5 * pul, ring = uFull * exp(-(sqrt(r2) - .7) * (sqrt(r2) - .7) * 90.) * .6;   /* 꽉 차면 떨리며 둘레 고리 */
      gl_FragColor = vec4((vec3(1.2, 1.25, 1.35) * core + vec3(.7, .85, 1.2) * (sw + exp(-r2 * 4.) * .35 + ring)) * uA, 1.); }` });
  const muz = new THREE.Points(mzG, muzM); muz.frustumCulled = false; muz.renderOrder = 12; G.add(muz);
  /* 자동 조준 표시: 몬스터 발밑 바닥에 얇은 빛 고리 (사용자 2026-11-04) — 네 곳 눈금이 천천히 돎 · 표적이 바뀌면 스르르 · 쓰러지면 오므라듦 */
  const lkM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uA: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv * 2. - 1.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uA, uT; varying vec2 vU; void main(){ float r = length(vU), a = atan(vU.y, vU.x + 1e-5) + uT * 1.2;
      float ring = exp(-(r - .82) * (r - .82) * 700.), ticks = smoothstep(.75, .97, abs(cos(a * 2.))) * exp(-(r - .9) * (r - .9) * 350.), soft = exp(-(r - .8) * (r - .8) * 40.) * .12;
      gl_FragColor = vec4(vec3(1., .95, .8) * (ring * .5 + ticks * .8 + soft) * uA, 1.); }` });
  const lk = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lkM); lk.rotation.x = -Math.PI / 2; lk.position.y = .07; lk.renderOrder = 5; lk.frustumCulled = false; lk.visible = false; G.add(lk);
  const LK = { x: 0, z: 0, sc: 0, a: 0, done: -9, dx: 0, dz: 0 };

  /* ── 버튼 ── */
  const st = document.createElement('style'); st.textContent = `
    #fireB{position:fixed;right:calc(max(16px,env(safe-area-inset-right,0px)) + 30px);bottom:calc(env(safe-area-inset-bottom,0px) + 92px);width:96px;height:96px;border-radius:50%;z-index:6;touch-action:none;user-select:none;-webkit-user-select:none;
      background:radial-gradient(circle at 50% 40%,rgba(40,52,30,.55),rgba(6,9,6,.72));box-shadow:0 0 0 1.5px rgba(var(--sc,185,255,74),.32) inset,0 6px 22px rgba(0,0,0,.45);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
    #fireB .ring{position:absolute;inset:-5px;border-radius:50%;background:conic-gradient(from 0deg,var(--hc,#b9ff4a) var(--h,0deg),rgba(255,255,255,.07) 0);
      -webkit-mask:radial-gradient(circle,transparent 47px,#000 48px,#000 52px,transparent 53px);mask:radial-gradient(circle,transparent 47px,#000 48px,#000 52px,transparent 53px);filter:drop-shadow(0 0 4px var(--hc,#b9ff4a))}
    #fireB .chg{position:absolute;inset:6px;border-radius:50%;background:conic-gradient(from 0deg,rgba(235,245,255,.85) var(--c,0deg),transparent 0);opacity:0;transition:opacity .15s;
      -webkit-mask:radial-gradient(circle,transparent 39px,#000 40px,#000 42px,transparent 43px);mask:radial-gradient(circle,transparent 39px,#000 40px,#000 42px,transparent 43px)}
    #fireB.chging .chg{opacity:1}
    #fireB .knob{position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;transition:opacity .2s;
      background:radial-gradient(circle at 50% 42%,#fff 0 3px,rgba(var(--sc,185,255,74),.95) 4px,rgba(var(--sc,185,255,74),.45) 9px,rgba(var(--sc,185,255,74),0) 20px)}
    #fireB .knob::after{content:'';position:absolute;left:50%;top:-2px;width:4px;height:16px;margin-left:-2px;border-radius:2px;background:linear-gradient(rgba(255,255,255,0),rgba(255,255,255,.8));opacity:var(--ka,.0)}
    #fireB .lab{position:absolute;left:-20px;right:-20px;bottom:-20px;text-align:center;font-size:11px;letter-spacing:.06em;color:rgba(var(--sc,185,255,74),.85);text-shadow:0 1px 3px #000;white-space:nowrap}
    #fireB.on{box-shadow:0 0 0 1.5px rgba(var(--sc,185,255,74),.7) inset,0 0 26px rgba(var(--sc,185,255,74),.25)}
    #fireB.hot{animation:fbHot .5s infinite alternate}#fireB.hot .knob{opacity:.35}#fireB.hot .lab{color:#ff9a5a}
    @keyframes fbHot{from{box-shadow:0 0 0 1.5px rgba(255,110,50,.55) inset,0 0 10px rgba(255,90,30,.2)}to{box-shadow:0 0 0 1.5px rgba(255,140,60,.9) inset,0 0 26px rgba(255,90,30,.45)}}`;
  document.head.appendChild(st);
  const btn = document.createElement('div'); btn.id = 'fireB'; btn.innerHTML = '<div class="ring"></div><div class="chg"></div><div class="knob"></div><div class="lab"></div>'; document.body.appendChild(btn);
  const knob = btn.querySelector('.knob'), lab = btn.querySelector('.lab');
  const I = { held: false, pid: null, drag: false, ang: 0, key: false };
  btn.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); if (I.pid !== null) return; I.pid = e.pointerId; I.held = true; I.drag = false; I.ang = FS.head; try { btn.setPointerCapture(e.pointerId); } catch (_) {} });
  btn.addEventListener('pointermove', e => { if (e.pointerId !== I.pid) return; const r = btn.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), l = Math.hypot(dx, dy);
    if (l > 14) { I.drag = true; I.ang = Math.atan2(-dx, -dy); } const k = Math.min(1, 30 / Math.max(l, 1)); knob.style.transform = `translate(${dx * k}px,${dy * k}px) rotate(${Math.atan2(dx, -dy)}rad)`; knob.style.setProperty('--ka', I.drag ? 1 : 0); });
  const up = e => { if (e.pointerId !== I.pid) return; I.pid = null; I.held = false; knob.style.transform = ''; knob.style.setProperty('--ka', 0); };
  btn.addEventListener('pointerup', up); btn.addEventListener('pointercancel', up);
  addEventListener('keydown', e => { if (e.code === 'Space') { I.key = true; e.preventDefault(); } }); addEventListener('keyup', e => { if (e.code === 'Space') I.key = false; });

  /* ── 탄 ── */
  const BU = Array.from({ length: MAXB }, () => ({ on: false, hist: [], hitL: [] })); let bI = 0;
  const S = { heat: 0, over: false, acc: 0, lastShot: -9, aimA: 0, ch: 0, chOk: 0, side: 1 };
  const whine = makeWhine();
  G.userData.S = S;
  let scRGB = '185,255,74';
  const setType = id => { if (!SHOT[id]) return; cid = id; cfg = SHOT[id]; S.heat = 0; S.over = false; S.ch = 0; S.acc = .999; whine.stop();
    scRGB = cfg.col.map(v => Math.min(255, Math.round(Math.sqrt(v) * 255))).join(','); btn.style.setProperty('--sc', scRGB); lab.textContent = cfg.name; };
  setType('rapid');
  G.userData.setType = setType; Object.defineProperty(G.userData, 'type', { get: () => cid });
  G.userData.input = I;
  G.userData.sparks = (x, z, r, g, b, n) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = 2 + Math.random() * 4; emit(x, FLY.HOVER, z, Math.cos(a) * sp, 1 + Math.random() * 2, Math.sin(a) * sp, r, g, b, .09, .3 + Math.random() * .3); } };
  const hitSparks = (x, z, nx, nz, n, rainbow, col) => { for (let i = 0; i < n; i++) { const a = Math.atan2(nz, nx) + (Math.random() - .5) * 2.2, sp = 4 + Math.random() * 7, [r, g, b] = rainbow ? spec(Math.random()) : col ? col : [1.4, .7 + Math.random() * .4, .25];
    emit(x, FLY.HOVER, z, Math.cos(a) * sp, 1.5 + Math.random() * 3, Math.sin(a) * sp, r * 1.2, g * 1.2, b * 1.2, .09 + Math.random() * .06, .25 + Math.random() * .3); }
    emit(x, FLY.HOVER, z, 0, 0, 0, 1.2, 1.15, 1, .8, .09, 4, 0); };                                       /* 닿은 순간 번쩍 */
  /* 한 번 쏘기: k = 모은 정도(모아 쏘기만) */
  const fire = (t, k = 1) => { const c = cfg, n = c.n || 1, base = S.aimA, sp = (c.ang || 0) * Math.PI / 180, tg = S.lock;
    for (let i = 0; i < n; i++) { const b = BU[bI = (bI + 1) % MAXB];
      let a = base + (Math.random() - .5) * (c.jit || 0) * Math.PI / 180 * 2;
      if (c.pat === 'v') a += (i ? 1 : -1) * sp / 2; else if (c.pat === 'fan') a += (i / (n - 1) - .5) * sp + (Math.random() - .5) * sp / n * .5;
      let side = 0; if (c.curve) { side = S.side; S.side = -S.side; a += side * c.curve; }                  /* 휘는 탄: 한 발씩 번갈아 왼쪽·오른쪽으로 나가서 활처럼 휘어 들어감 */
      const v = c.speed * (1 + (Math.random() - .5) * 2 * (c.spd || 0)), dx = -Math.sin(a), dz = -Math.cos(a), full = k >= .98;
      Object.assign(b, { on: true, c, x: FS.x + dx * 1.15, z: FS.z + dz * 1.15, vx: dx * v, vz: dz * v, age: 0, life: c.range / c.speed, bo: 0, cbo: 0, cry: c.cryB, wall: c.wallB, dead: -1,
        dmg: pick(c.dmg, k), R: pick(c.R, k), W: pick(c.W, k), tail: pick(c.tail, k), head: pick(c.head, k), hits: 1 + (c.pierce || (full ? c.pierceFull || 0 : 0)), knock: c.knock || (full ? c.knockFull || 0 : 0),
        tg: c.curve ? tg : null, tx: FS.x - Math.sin(base) * c.range * .55, tz: FS.z - Math.cos(base) * c.range * .55, side });
      b.hist.length = 0; b.hitL.length = 0; b.hist.push([FS.x + dx * .6, FS.z + dz * .6]); }
    const dx = -Math.sin(base), dz = -Math.cos(base), big = c.kind === 4 || c.kind === 3;
    emit(FS.x + dx * 1.1, FLY.HOVER, FS.z + dz * 1.1, FS.vx, 0, FS.vz, 1.1, 1.2, .9, big ? .9 + k * .5 : .55, big ? .1 : .06, 3, 0);   /* 쏘는 불빛 */
    if (c.kind === 5) for (let i = 0; i < 10; i++) { const a = base + (Math.random() - .5) * sp * 1.2, s = 6 + Math.random() * 8; emit(FS.x + dx * 1.2, FLY.HOVER, FS.z + dz * 1.2, -Math.sin(a) * s, .5 + Math.random(), -Math.cos(a) * s, 1.3, 1, .6, .05 + Math.random() * .04, .12 + Math.random() * .12); }   /* 흩뿌림: 총구에서 불티가 확 퍼짐 */
    if (c.kind === 4) for (let i = 0; i < 8; i++) { const a = base + Math.PI + (Math.random() - .5) * 1.6, s = 2 + Math.random() * 3; emit(FS.x + dx * .8, FLY.HOVER, FS.z + dz * .8, -Math.sin(a) * s, 1 + Math.random(), -Math.cos(a) * s, 1.2, .5, .15, .07, .3 + Math.random() * .3); }   /* 무거운 탄: 뒤로 튀는 쇳물 방울 */
    FS.rc = Math.min(2, pick(c.recoil, k)); if (c.shake) FS.shake = Math.max(FS.shake || 0, c.shake);
    if (c.kind === 3 && k > .9) FS.shake = Math.max(FS.shake || 0, .3);
    play(c.snd, k); };
  const dmgHit = (b, j, t) => { const c = b.c, first = !b.hitL.length, d = b.dmg * (b.bo > 0 ? 1.5 : 1) * (first ? 1 : c.pierceK || .7);
    const l = Math.hypot(b.vx, b.vz) || 1, killed = mobs.userData.hit(j, t, b.vx / l, b.vz / l, d, { knock: b.knock, slow: c.slow, slowMax: c.slowMax, slowT: c.slowT });
    b.hitL.push(j); onDamage?.(j, d, c, b.bo > 0); return killed; };
  const reveal = (x, z, c) => { if (!c.reveal) return; stamp(x, z, c.reveal, 0, c.revealT); onReveal?.(x, z, c.reveal, c.revealT); };

  const tmp = [0, 0];
  G.userData.update = (t, dt, px) => {
    headM.uniforms.uPx.value = px * .75; partM.uniforms.uPx.value = px; headM.uniforms.uT.value = t; tailM.uniforms.uT.value = t; muzM.uniforms.uPx.value = px; muzM.uniforms.uT.value = t; decM.uniforms.uT.value = t;
    const c = cfg, want = I.held || I.key, shooting = want && !S.over;
    /* 자동 조준 (사용자 2026-11-04): 한 번 잡은 적은 쓰러지거나 멀어질 때까지 계속 노림 → 쓰러지면 0.15초 뒤 그 바로 옆 적으로 넘어감 · 조준 거리는 탄마다 */
    { const R2 = c.aimR * c.aimR, alive = j => j && j.on && j.dieT < 0, d2 = (j, x, z) => (j.x - x) * (j.x - x) + (j.z - z) * (j.z - z);
      const near = (x, z) => { let b = null, bd = 1e18; if (mobs) for (const j of mobs.userData.list) { if (!alive(j) || d2(j, FS.x, FS.z) > R2) continue; const d = d2(j, x, z); if (d < bd) { bd = d; b = j; } } return b; };
      if (S.lock && !alive(S.lock)) { if (S.lock.dieT > 0) { LK.done = t; LK.dx = S.lock.x; LK.dz = S.lock.z; S.next = t + .15; } S.lockLost = S.lock; S.lock = null; }
      if (S.lock && d2(S.lock, FS.x, FS.z) > R2) S.lock = null;
      if (!(I.held && I.drag) && want && !S.lock && t >= (S.next || 0)) S.lock = S.lockLost && S.lockLost.dieT > 0 ? near(S.lockLost.x, S.lockLost.z) : near(FS.x, FS.z);   /* 쓰러진 적 바로 옆부터 */
      if (!want && !(S.ch > 0)) { S.lock = null; S.lockLost = null; } }
    if (want) S.aimA = I.held && I.drag ? I.ang : S.lock ? Math.atan2(-(S.lock.x - FS.x), -(S.lock.z - FS.z)) : t < (S.next || 0) ? S.aimA : (I.key ? FS.mh ?? FS.head : S.aimA0 ?? FS.head);
    if (!want) S.aimA0 = FS.head;
    FS.aim = want ? S.aimA : null; FS.fireSlow = c.fireSlow;
    const heatPer = c.heatT ? 1 / (c.heatT * c.rate) : 0, cool = .7 / (c.coolT * .8);
    if (c.chargeT) {   /* 모아 쏘기: 누르는 동안 모음(65% 느려짐) → 떼면 나감. 빨라도 1초에 1.1발 */
      if (shooting && t >= S.chOk) { const k0 = S.ch; S.ch = Math.min(1, S.ch + dt / c.chargeT); FS.fireSlow = c.chargeSlow; whine.set(S.ch);
        if (k0 < 1 && S.ch >= 1) { emit(FS.x, FLY.HOVER, FS.z, 0, 0, 0, 1, 1.1, 1.3, 1.6, .12, 6, 0); bounceTing(2900); }   /* 꽉 참: 번쩍 + 맑은 울림 */
        const nx = FS.x - Math.sin(S.aimA) * 1.3, nz = FS.z - Math.cos(S.aimA) * 1.3;
        if (Math.random() < dt * (20 + 50 * S.ch)) { const a = Math.random() * 6.283, r = 1.6 + Math.random() * 1.6; emit(nx + Math.cos(a) * r, FLY.HOVER + (Math.random() - .5), nz + Math.sin(a) * r, -Math.cos(a) * r * 4, 0, -Math.sin(a) * r * 4, .8, .9, 1.3, .06, .22, 0, 0, 0); }   /* 둘레 빛이 빨려 듦 */
        mzP[0] = nx; mzP[1] = FLY.HOVER; mzP[2] = nz; mzG.attributes.position.needsUpdate = true; }
      else if (!want && S.ch > 0) { if (!S.over) { fire(t, S.ch); S.lastShot = t; S.heat += c.heatFull * Math.max(.3, S.ch); if (S.heat >= 1) { S.heat = 1; S.over = true; FS.heatFlash = 1; FS.shake = 1; flare(); crack(); } }
        S.chOk = t + Math.max(.05, 1 / c.rate - c.chargeT); S.ch = 0; whine.stop(); }
      muzM.uniforms.uA.value += ((S.ch > 0 ? .25 + .75 * S.ch : 0) - muzM.uniforms.uA.value) * Math.min(1, dt * 20); muzM.uniforms.uFull.value = S.ch >= 1 ? 1 : 0; }
    else { muzM.uniforms.uA.value = 0;
      if (shooting) { S.acc += dt * c.rate; if (S.acc > 1.5) S.acc = 1.5; while (S.acc >= 1) { S.acc -= 1; fire(t); S.lastShot = t; S.heat += heatPer; if (S.heat >= 1) { S.heat = 1; S.over = true; S.acc = 0; FS.heatFlash = 1; FS.shake = 1; flare(); crack(); break; } } }
      else S.acc = Math.min(.999, S.acc + dt * c.rate); }                                                     /* 쉬는 동안 다음 발이 준비됨 → 누르는 순간 바로 첫 발 */
    if ((t - S.lastShot > .3 && !(S.ch > 0)) || S.over) S.heat = Math.max(0, S.heat - dt * cool * (S.over ? .8 : 1));
    if (S.over && S.heat <= .3) S.over = false;
    /* 버튼: 열 고리 · 모으는 고리 */
    { const h = S.heat, hc = S.over ? '#ff6a2a' : h > .7 ? '#ffb347' : h > .4 ? '#e8ff8a' : `rgb(${scRGB})`;
      btn.style.setProperty('--h', (h * 360).toFixed(1) + 'deg'); btn.style.setProperty('--hc', hc); btn.style.setProperty('--c', (S.ch * 360).toFixed(1) + 'deg');
      btn.classList.toggle('hot', S.over); btn.classList.toggle('on', want && !S.over); btn.classList.toggle('chging', S.ch > 0); lab.textContent = S.over ? '과열' : S.ch >= 1 ? c.name + ' · 꽉' : c.name; }
    /* 과열은 기체 금속이 달아오르는 것으로 (시안 B · shipheat.js) — 기체에는 50%부터 보임 */
    { FS.heatV = S.heat; FS.heatFlash = Math.max(0, (FS.heatFlash || 0) - dt * 2.2);
      const L = S.lock, de = t - LK.done;
      if (de < .15) { LK.x = LK.dx; LK.z = LK.dz; LK.sc *= Math.exp(-dt * 18); LK.a = 1 - de / .15; }                                     /* 쓰러진 자리에서 작게 오므라듦 */
      else if (L && (want || S.ch > 0)) { const fresh = LK.a < .05; if (fresh) { LK.x = L.x; LK.z = L.z; LK.sc = L.s * .3; }
        const k = Math.min(1, dt * 14); LK.x += (L.x - LK.x) * k; LK.z += (L.z - LK.z) * k; LK.sc += (L.s * .95 - LK.sc) * Math.min(1, dt * 10); LK.a += (1 - LK.a) * Math.min(1, dt * 10); }   /* 새 표적 발밑으로 스르르 */
      else { LK.a += (0 - LK.a) * Math.min(1, dt * 10); }
      lk.visible = LK.a > .01; lk.position.set(LK.x, .07, LK.z); lk.scale.setScalar(Math.max(.01, LK.sc)); lkM.uniforms.uA.value = LK.a; lkM.uniforms.uT.value = t; }
    /* 서리 맞은 해파리: 몸에 서리가 끼어 부스러기가 떨어짐 (느려진 만큼) */
    if (mobs) for (const j of mobs.userData.list) { if (!j.on || j.dieT > 0 || !(j.slowK > 0) || t > j.slowUntil) continue;
      if (Math.random() < dt * 40 * j.slowK) { const a = Math.random() * 6.283, r = .5 * j.s; emit(j.x + Math.cos(a) * r, j.y - .1 + (Math.random() - .3) * .6 * j.s, j.z + Math.sin(a) * r, j.vx * .6, -.2, j.vz * .6, .55, .85, 1.1, .05 + Math.random() * .04, .5 + Math.random() * .4, 0, 1.2, .5); } }
    /* 탄 움직임 */
    const P = bh?.userData.P;
    for (const b of BU) { if (!b.on) continue; const bc = b.c;
      if (b.dead >= 0) { b.dead += dt; if (b.dead > .09) b.on = false; continue; }                           /* 사라질 때 꼬리가 머리 쪽으로 따라 들어감 */
      b.age += dt; if (b.age > b.life) { b.dead = 0; if (bc.kind === 5) emit(b.x, FLY.HOVER, b.z, 0, 0, 0, .9, .7, .4, .25, .1, 0, 0); continue; }
      /* 휘는 탄: 노리는 적(없으면 조준한 쪽 앞 자리)으로 고개를 틈 — 처음엔 천천히, 갈수록 세게 */
      if (bc.curve) { if (!(b.tg && b.tg.on && b.tg.dieT < 0) && S.lock && !b.bo) b.tg = S.lock;   /* 노리던 적이 먼저 쓰러지면 지금 조준한 적으로 갈아탐 */
        const ok = b.tg && b.tg.on && b.tg.dieT < 0, tx = ok ? b.tg.x : b.tx, tz = ok ? b.tg.z : b.tz;
        const va = Math.atan2(b.vz, b.vx), ta = Math.atan2(tz - b.z, tx - b.x); let d = ta - va; d = Math.atan2(Math.sin(d), Math.cos(d));
        const sp = Math.hypot(b.vx, b.vz), dist = Math.max(.5, Math.hypot(tx - b.x, tz - b.z)), w = Math.min(9, Math.max(1.2, 2 * sp * Math.abs(Math.sin(d)) / dist)), rot = Math.sign(d) * Math.min(Math.abs(d), dt * w), na = va + rot;   /* 지금 자리에서 표적까지 꼭 닿는 활을 그리며 돎 (가까우면 더 세게) */ b.vx = Math.cos(na) * sp; b.vz = Math.sin(na) * sp; }
      /* 블랙홀이 탄을 휨 */
      if (P) { const dx = P.x - b.x, dz = P.z - b.z, d2 = dx * dx + dz * dz; if (d2 < 900) { const d = Math.sqrt(d2), g = 650 / (d2 + 9); b.vx += dx / d * g * dt; b.vz += dz / d * g * dt;
        if (d < BH.CORE) { b.dead = 0; emit(b.x, FLY.HOVER, b.z, 0, 0, 0, .6, .5, 1, .6, .2, -2, 0); continue; } } }
      const nx = b.x + b.vx * dt, nz = b.z + b.vz * dt;
      /* 몹(해파리): 지나온 한 걸음이 몸에 닿으면 맞음 · 꿰뚫는 탄은 그대로 지나감(같은 놈은 한 번만) */
      if (mobs) { let hj = null; const sx = nx - b.x, sz = nz - b.z, L2 = sx * sx + sz * sz || 1e-9;
        for (const j of mobs.userData.list) { if (!j.on || j.dieT > 0 || b.hitL.includes(j)) continue; const R = .62 * j.s * 1.15 + b.R * .5, ox = j.x - b.x, oz = j.z - b.z; if (Math.abs(ox) > 6 || Math.abs(oz) > 6) continue;
          const k = Math.max(0, Math.min(1, (ox * sx + oz * sz) / L2)), ex = ox - sx * k, ez = oz - sz * k; if (ex * ex + ez * ez < R * R) { hj = j; break; } }
        if (hj) { const killed = dmgHit(b, hj, t);
          const fc = bc.kind === 1 ? [.6, .9, 1.2] : bc.kind === 4 ? [1.3, .55, .15] : bc.kind === 2 ? [1.2, .95, .6] : [.3, .85, 1];
          for (let i = 0; i < (bc.kind === 4 ? 16 : 10); i++) { const a = Math.atan2(-b.vz, -b.vx) + (Math.random() - .5) * 2.4, sp = 2 + Math.random() * 4; emit(hj.x, hj.y - .2, hj.z, Math.cos(a) * sp, Math.random() * 2.5, Math.sin(a) * sp, fc[0], fc[1], fc[2], .08 + Math.random() * .05, .3 + Math.random() * .3); }   /* 맞은 자리 몸빛이 튐 */
          if (bc.kind === 1) stamp(hj.x, hj.z, 1.3 * hj.s, 1, .9); else if (bc.kind === 4) stamp(hj.x, hj.z, 2.6, 2, .45);
          reveal(hj.x, hj.z, bc); thud(bc.kind === 4 ? .06 : .025); onKill?.(hj, killed, t);
          if (b.hitL.length >= b.hits) { b.dead = 0; continue; } } }
      /* 수정 기둥: 튕김 */
      const hit = b.cry > 0 && crystals ? crystals.userData.cross(b.x, b.z, nx, nz, .12) : null;
      if (hit) { const vn = b.vx * hit.nx + b.vz * hit.nz; if (vn < 0) { b.vx -= 2 * vn * hit.nx; b.vz -= 2 * vn * hit.nz; }
        b.x = hit.x + hit.nx * .05; b.z = hit.z + hit.nz * .05; b.bo++; b.cbo++; b.cry--; b.life = Math.max(b.life, b.age + .5); b.hist.push([b.x, b.z]); b.tg = null;
        crystals.userData.flash(t, hit.x - hit.nx * .1, FLY.HOVER, hit.z - hit.nz * .1); hitSparks(b.x, b.z, hit.nx, hit.nz, 10, true); continue; }
      /* 벽·와드: 그 벽 무늬가 빛남 · 튕김탄은 벽에서도 튕김(두 번) */
      if (B.blocked(nx, nz)) { let lo = 0, hi = 1; for (let k = 0; k < 6; k++) { const m = (lo + hi) / 2; if (B.blocked(b.x + (nx - b.x) * m, b.z + (nz - b.z) * m)) hi = m; else lo = m; }
        b.x += (nx - b.x) * lo; b.z += (nz - b.z) * lo; const l = Math.hypot(b.vx, b.vz) || 1; hitWall(b.x + b.vx / l * .3, FLY.HOVER, b.z + b.vz / l * .3, t);   /* 벽마다 만들어 둔 맞음 빛을 깨움 */
        if (b.wall > 0) { const e = .6, gx = B.field(b.x + e, b.z) - B.field(b.x - e, b.z), gz = B.field(b.x, b.z + e) - B.field(b.x, b.z - e), gl = Math.hypot(gx, gz);   /* 벽이 보는 쪽 = 벽 지도가 옅어지는 쪽 */
          let wx = -b.vx / l, wz = -b.vz / l; if (gl > 1e-4) { wx = -gx / gl; wz = -gz / gl; }
          const vn = b.vx * wx + b.vz * wz; if (vn < 0) { b.vx -= 2 * vn * wx; b.vz -= 2 * vn * wz; } else { b.vx = -b.vx; b.vz = -b.vz; }
          b.wall--; b.bo++; b.life = Math.max(b.life, b.age + .5); b.hist.push([b.x, b.z]); b.tg = null; hitSparks(b.x, b.z, wx, wz, 9, true); bounceTing(2200 + b.bo * 300); continue; }
        hitSparks(b.x, b.z, -b.vx / l, -b.vz / l, 8, b.bo > 0, bc.kind === 1 ? [.6, .9, 1.2] : null); thud(.03);
        if (bc.kind === 1) stamp(b.x, b.z, 1.2, 1, .9); else if (bc.kind === 4) stamp(b.x, b.z, 2.2, 2, .45);
        reveal(b.x, b.z, bc); b.dead = 0; continue; }
      b.x = nx; b.z = nz;
      /* 수정에 튕긴 탄은 쏜 사람도 맞음 */
      if (b.cbo > 0 && Math.hypot(b.x - FS.x, b.z - FS.z) < FLY.R + .35) { const l = Math.hypot(b.vx, b.vz) || 1; hitSparks(FS.x, FS.z, -b.vx / l, -b.vz / l, 16, true); thud(.09); b.dead = 0; say?.('내가 쏜 탄에 맞음! (튕겨 돌아옴)'); FS.hurt = t; continue; }
      b.hist.push([b.x, b.z]); if (b.hist.length > 28) b.hist.shift();
      /* 떨어지는 부스러기: 탄마다 다름 */
      const C = bc.col, rate = bc.kind === 4 ? 46 : bc.kind === 1 ? 40 : bc.kind === 6 ? 14 : bc.kind === 5 ? 10 : 30;
      if (Math.random() < dt * rate) { let r = C[0] * C[0] * 1.3, g = C[1] * C[1] * 1.3, bb = C[2] * C[2] * 1.3, s = .05 + Math.random() * .04, life = .25 + Math.random() * .25, fall = 6;
        if (b.bo) [r, g, bb] = spec(Math.random());
        else if (bc.kind === 4) { r = 1.3; g = .45 + Math.random() * .3; bb = .1; s = .07 + Math.random() * .05; life = .4 + Math.random() * .3; fall = 9; }      /* 쇳물 방울이 떨어져 식음 */
        else if (bc.kind === 1) { r = .7; g = .95; bb = 1.2; life = .6 + Math.random() * .4; fall = 1.5; }                                              /* 서리 가루가 천천히 내려앉음 */
        else if (bc.kind === 2) { r = 1.2; g = .95; bb = .65; fall = -1; life = .5; }                                                                   /* 따뜻한 빛 가루는 위로 떠오름 */
        emit(b.x, FLY.HOVER, b.z, b.vx * .08 + (Math.random() - .5) * 1.4, .3 + Math.random(), b.vz * .08 + (Math.random() - .5) * 1.4, r, g, bb, s, life, 0, fall); } }
    /* 그리기: 꼬리 · 머리 */
    for (let bi = 0; bi < MAXB; bi++) { const b = BU[bi], o3 = bi * NT * 2 * 3;
      if (!b.on) { for (let i = 0; i < NT * 2; i++) tu[o3 + i * 3] = -1; ha[bi * 4] = 0; continue; }
      const bc = b.c, C = bc.col, lifeK = b.dead >= 0 ? 1 - b.dead / .09 : Math.min(1, (b.life - b.age) / .15), grow = Math.min(1, b.age / .05);
      const L = b.tail * grow * (b.dead >= 0 ? 1 - b.dead / .09 : 1);
      /* 지나온 길을 따라 NT점 (튕긴 곳·휜 곳을 그대로 따라옴) */
      const H = b.hist; let seg = H.length - 1, sx = b.x, sz = b.z, acc = 0;
      for (let i = 0; i < NT; i++) { const s = i / (NT - 1) * L;
        while (seg >= 0) { const [qx, qz] = H[seg], sl = Math.hypot(qx - sx, qz - sz); if (acc + sl >= s || seg === 0) { const k = sl > 1e-6 ? Math.min(1, (s - acc) / sl) : 0; tmp[0] = sx + (qx - sx) * k; tmp[1] = sz + (qz - sz) * k; break; } acc += sl; sx = qx; sz = qz; seg--; }
        if (seg < 0) { tmp[0] = sx; tmp[1] = sz; }
        const u = i / (NT - 1), w = b.W * 1.4 * (.55 + .45 * Math.sin(Math.min(1, u * 3) * Math.PI * .5)) * Math.pow(1 - u, 1.2);   /* 머리 뒤에서 굵어졌다 끝으로 가늘어짐 */
        const j = (bi * NT + i) * 2, prevx = i ? tp[(j - 2) * 3] * .5 + tp[(j - 1) * 3] * .5 : b.x + b.vx * .01, prevz = i ? tp[(j - 2) * 3 + 2] * .5 + tp[(j - 1) * 3 + 2] * .5 : b.z + b.vz * .01;
        let dx = prevx - tmp[0], dz = prevz - tmp[1], dl = Math.hypot(dx, dz); if (dl < 1e-5) { dx = b.vx; dz = b.vz; dl = Math.hypot(dx, dz) || 1; }
        const px_ = -dz / dl * w, pz_ = dx / dl * w, y = FLY.HOVER;
        tp[j * 3] = tmp[0] + px_; tp[j * 3 + 1] = y; tp[j * 3 + 2] = tmp[1] + pz_; tp[(j + 1) * 3] = tmp[0] - px_; tp[(j + 1) * 3 + 1] = y; tp[(j + 1) * 3 + 2] = tmp[1] - pz_;
        const z = Math.floor(lifeK * 100) + (b.bo ? .999 : 0);
        tu[j * 3] = u; tu[j * 3 + 1] = 1; tu[j * 3 + 2] = z; tu[(j + 1) * 3] = u; tu[(j + 1) * 3 + 1] = -1; tu[(j + 1) * 3 + 2] = z;
        tc.set([C[0], C[1], C[2], bc.kind], j * 4); tc.set([C[0], C[1], C[2], bc.kind], (j + 1) * 4); }
      hp[bi * 3] = b.x; hp[bi * 3 + 1] = FLY.HOVER; hp[bi * 3 + 2] = b.z; ha.set([b.dead >= 0 ? 0 : lifeK, b.bo ? 1 : 0, b.head, bc.kind], bi * 4); hc.set(C, bi * 3); }
    tg.attributes.position.needsUpdate = tg.attributes.aU.needsUpdate = tg.attributes.aC.needsUpdate = true; hg.attributes.position.needsUpdate = hg.attributes.aH.needsUpdate = hg.attributes.aC.needsUpdate = true;
    /* 부스러기 */
    for (let i = 0; i < NP; i++) { const p = PT[i]; if (p.l > 0) { p.l -= dt; p.vy -= p.fall * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 1 - dt * p.drag; p.vz *= 1 - dt * p.drag; if (p.y < .05) { p.y = .05; p.vy *= -.3; } p.s += p.grow * dt; }
      const k = Math.max(0, p.l / p.m); pp[i * 3] = p.x; pp[i * 3 + 1] = p.y; pp[i * 3 + 2] = p.z; pc[i * 4] = p.r * k; pc[i * 4 + 1] = p.g * k; pc[i * 4 + 2] = p.b * k; pc[i * 4 + 3] = p.l > 0 ? Math.max(.01, p.s) : 0; }
    pg.attributes.position.needsUpdate = pg.attributes.aC.needsUpdate = true;
  };
  return G;
}
