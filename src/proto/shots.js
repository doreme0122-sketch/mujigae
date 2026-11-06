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
import { FLY } from './flight.js?v=11061544';
import { BH } from './blackhole.js?v=11061544';
import { hitWall } from './rocks.js?v=11061544';

/* 비교표 그대로. heatT: 쉬지 않고 쏘면 과열까지(초) · coolT: 과열 뒤 다시 쏠 때까지(초) · cryB/wallB: 수정·벽에서 튕기는 횟수
   kind: 그림 결 (0 기본 · 1 서리 · 2 따뜻한 빛 · 3 빛 창 · 4 쇳물 · 5 불티 · 6 바늘 · 7 활) */
export const SHOT = {
  /* 먼거리 (20~26m): 거리를 벌리고 버팀 · 1초당 피해 약 20 */
  needle:  { name: '꿰뚫는 바늘', role: '먼거리', rate: 4, dmg: 5, speed: 52, range: 26, R: .10, heatT: 3, coolT: 2, n: 1, jit: .4, pierce: 1, pierceK: .7, cryB: 2, wallB: 0, aimR: 26, fireSlow: .5, recoil: .5, col: [.8, .88, 1], tail: 7, W: .12, head: .6, kind: 6, snd: 'needle', look: '은빛 가는 바늘 + 긴 꼬리' },
  charge:  { name: '모아 쏘기', role: '먼거리', rate: 1.1, dmg: [8, 18, 34], speed: 44, range: [13, 19, 26], R: [.25, .5], chargeT: 1.6, chargeTH: [.45, 1, 1.6], heatT: 0, heatFull: 1 / 3, coolT: 2, n: 1, jit: 0, cryB: 2, wallB: 0, pierceFull: 1, knockFull: 1, aimR: 26, fireSlow: .5, chargeSlow: .8, recoil: [.6, 2], col: [.92, .96, 1], tail: [2.8, 6], W: [.26, .62], head: [1, 2.3], kind: 3, snd: 'charge', look: '하얀 빛 창 (모일수록 커짐)' },
  beam:    { name: '빛줄기', role: '먼거리', beam: 1, dps: [14, 30], rampT: 1.5, rate: 1, dmg: 0, speed: 0, range: 22, heatT: 5, coolT: 2.5, rangeReset: 1, cryB: 3, wallB: 3, aimR: 22, fireSlow: .8, col: [.7, .95, 1.1], kind: 0, snd: 'beam', look: '이어지는 빛 · 벽·수정에서 반사 · 오래 비출수록 셈' },
  /* 중거리 (16~20m): 움직이며 싸우는 기본 거리 · 약 25 */
  rapid:   { name: '연발탄', role: '중거리', rate: 4.5, dmg: 5.5, speed: 36, range: 20, R: .20, heatT: 3, coolT: 2, n: 1, jit: 1, cryB: 3, wallB: 0, aimR: 20, fireSlow: .5, recoil: 1, col: [.62, 1, .32], tail: 3.6, W: .27, head: 1, kind: 0, snd: 'pew', look: '연두 빛 덩어리 + 가는 꼬리' },
  bounce:  { name: '튕김탄', role: '중거리', rate: 5, dmg: 4.2, speed: 34, range: 20, R: .20, heatT: 3, coolT: 2, n: 1, jit: 1, cryB: 3, wallB: 3, mobBounce: 1, rangeReset: 1, aimR: 20, fireSlow: .5, recoil: .8, col: [.78, 1, .96], tail: 3.4, W: .24, head: .95, kind: 0, snd: 'ting', look: '맑은 빛 (튕기면 무지개 꼬리)' },
  prism:   { name: '프리즘 탄', role: '중거리', rate: 4, dmg: 6, speed: 32, range: 18, R: .22, heatT: 3, coolT: 2, n: 1, jit: .6, cryB: 1, wallB: 1, prism: 1, rangeReset: 1, aimR: 18, fireSlow: .5, recoil: .8, col: [1, .97, 1], tail: 3.2, W: .26, head: 1.05, kind: 0, snd: 'ting', look: '맑은 결정 빛 · 튕기는 순간 세 갈래 무지개' },
  homing:  { name: '유도탄', role: '중거리', rate: 3, dmg: 8, speed: 18, range: 18, lifeK: 1.35, homing: 4.2, R: .25, heatT: 3, coolT: 2, n: 1, jit: 4, cryB: 2, wallB: 0, aimR: 18, fireSlow: .5, recoil: .7, col: [1, .55, .95], tail: 3.8, W: .3, head: 1.1, kind: 7, snd: 'whee', look: '분홍빛 휘는 꼬리 · 보이는 적을 쫓음' },
  /* 단거리 (6~12m): 파고들어 끝냄 · 약 32 */
  scatter: { name: '흩뿌림', role: '단거리', rate: 1.6, dmg: 4, speed: 22, range: 10, R: .14, heatT: 3.5, coolT: 2.5, n: 5, pat: 'fan', ang: 26, jit: 2, spd: .12, cryB: 0, wallB: 0, knock: .06, stun: .2, selfPush: .8, aimR: 10, fireSlow: .45, recoil: 1.6, col: [1, .86, .62], tail: 1.6, W: .16, head: .6, kind: 5, snd: 'scatter', look: '하얀 불티 알갱이' },
  heavy:   { name: '무거운 탄', role: '단거리', rate: 2.5, dmg: 13, speed: 22, range: 12, R: .45, heatT: 4, coolT: 2.5, n: 1, jit: 0, cryB: 1, wallB: 0, knock: 4, stun: .5, selfPush: 1, aimR: 12, fireSlow: .6, recoil: 2, shake: .22, col: [1, .55, .2], tail: 3.6, W: .62, head: 2, kind: 4, snd: 'boom', look: '주황 쇳물 덩어리 + 굵은 꼬리' },
  blade:   { name: '빛 칼날', role: '단거리', blade: 1, rate: 1.6, dmg: 20, range: 5.6, reach: 2.6, heatShots: 3, width: 1.5, swing: .12, windup: .18, cutDelay: .1, style: 'A', heatT: 3, coolT: 2, aimR: 0, fireSlow: .3, recoil: .6, noReflect: 1, lunge: 3, coolWait: 1.2, col: [.85, 1, 1.1], kind: 0, snd: 'swish', look: '발도: 멈췄다 번개처럼 앞으로 베며 나감 · 반사 안 됨' },
};
export const SHOT_IDS = Object.keys(SHOT);
const rngOf = (c, lv = 3) => Array.isArray(c.range) ? c.range[Math.max(0, Math.min(c.range.length, lv) - 1)] : c.range;   /* 모아 쏘기는 단계마다 사거리가 늘어남 */
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
  ding() { osc('sine', 1046, 1040, .3, .04); osc('sine', 1568, 1560, .22, .02); },
  swish() { const c = A.ctx, t0 = c.currentTime, n = A.noise(.2), fl = c.createBiquadFilter(), g = c.createGain(); fl.type = 'bandpass'; fl.Q.value = 1.6; fl.frequency.setValueAtTime(4200, t0); fl.frequency.exponentialRampToValueAtTime(700, t0 + .14); n.connect(fl); fl.connect(g); A.env(g, t0, .004, .16, .16); A.out(g, .15); n.start(t0); osc('sine', 900, 380, .1, .03); },   /* 휙: 높은 바람이 낮게 가라앉음 */                                                                      /* 부드러운 띵 */
};
const play = (k, a) => { if (A.live()) SND[k]?.(a); };
function thud(vol = .05) { if (!A.live()) return; hiss('lowpass', 1400, .7, .1, vol); }
function crack() { if (!A.live()) return; hiss('highpass', 3000, .7, .07, .09, 0, .2); osc('square', 1900, 700, .06, .02); }   /* 과열: 달아오른 금속이 쩍 */
function flare() { if (!A.live()) return; osc('sine', 220, 140, .7, .08); }                                                    /* 과열: 낮게 울리는 금속 */
function bounceTing(f = 2400) { if (A.live()) osc('sine', f, f * .98, .18, .04); }
/* 모으는 소리: 모일수록 높아지는 윙 — 누르는 동안 하나가 계속 울림 */
function makeHum() { let os = [], g = null, tr = null;   /* 빛줄기: 맑은 유리가 우는 소리 — 두 음이 맥놀이로 일렁이고, 세질수록 천천히 높아짐 (거친 지잉 소리는 뺌 · 사용자) */
  return { set(k) { if (!A.live()) return; const c = A.ctx;
      if (!g) { g = c.createGain(); g.gain.value = 0; A.out(g, .45); tr = c.createGain(); tr.gain.value = 1; tr.connect(g);
        os = [['sine', 1], ['sine', 1.502], ['triangle', 2.003]].map(([ty, m]) => { const o = c.createOscillator(), og = c.createGain(); o.type = ty; og.gain.value = m === 1 ? .6 : m < 2 ? .3 : .12; o.connect(og); og.connect(tr); o.start(); return [o, m]; }); }
      const t0 = c.currentTime, f = 660 * Math.pow(2, k * .5);   /* 세질수록 반 옥타브 위로 */
      for (const [o, m] of os) o.frequency.setTargetAtTime(f * m * (1 + .002 * Math.sin(t0 * 5 * m)), t0, .08);
      tr.gain.setTargetAtTime(.8 + .2 * Math.sin(t0 * 9), t0, .02); g.gain.setTargetAtTime(.022 + .02 * k, t0, .06); },
    stop() { if (!g) return; const t0 = A.ctx.currentTime, gg = g, oo = os; gg.gain.setTargetAtTime(0, t0, .05); setTimeout(() => { for (const [o] of oo) try { o.stop(); } catch (_) {} }, 350); g = null; os = []; } }; }
function makeWhine() { let o = null, o2 = null, g = null;
  return { set(k) { if (!A.live()) return; const c = A.ctx;
      if (!o) { o = c.createOscillator(); o2 = c.createOscillator(); g = c.createGain(); o.type = 'sawtooth'; o2.type = 'sine'; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400; o.connect(f); o2.connect(f); f.connect(g); g.gain.value = 0; A.out(g, .2); o.start(); o2.start(); }
      const t0 = c.currentTime; o.frequency.setTargetAtTime(180 + 620 * k * k, t0, .03); o2.frequency.setTargetAtTime(360 + 1240 * k * k + (k >= 1 ? 30 * Math.sin(t0 * 40) : 0), t0, .03); g.gain.setTargetAtTime(.012 + .03 * k, t0, .04); },
    stop() { if (!o) return; const t0 = A.ctx.currentTime; g.gain.setTargetAtTime(0, t0, .02); const a = o, b = o2; setTimeout(() => { try { a.stop(); b.stop(); } catch (_) {} }, 200); o = o2 = g = null; } }; }

export function makeShots({ B, crystals, bh, FS, say, mobs, onKill, onDamage, onReveal, canSee, ship }) {
  const G = new THREE.Group(); let cfg = SHOT.rapid, cid = 'rapid';
  /* ── 꼬리: 탄마다 NT점 띠 (색·결은 탄마다 → 탄을 바꿔도 날아가던 탄은 제 모습 그대로) ── */
  const tp = new Float32Array(MAXB * NT * 2 * 3), tu = new Float32Array(MAXB * NT * 2 * 3), tc = new Float32Array(MAXB * NT * 2 * 4), ti = [];
  for (let b = 0; b < MAXB; b++) for (let i = 0; i < NT - 1; i++) { const p = (b * NT + i) * 2; ti.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3)); tg.setAttribute('aU', new THREE.BufferAttribute(tu, 3)); tg.setAttribute('aC', new THREE.BufferAttribute(tc, 4)); tg.setIndex(ti);
  const tailM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uT: { value: 0 } },
    vertexShader: 'attribute vec3 aU; attribute vec4 aC; varying vec3 vU; varying vec4 vC; void main(){ vU = aU; vC = aC; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uT; varying vec3 vU; varying vec4 vC;   /* vU: x 꼬리 위치(0 머리 → 1 끝) · y 띠 가로(-1~1) · z 밝기 · vC: 탄 색 + 결(+16 = 튕김) */
      vec3 spec(float x){ return clamp(abs(fract(x + vec3(0., .33, .67)) * 6. - 3.) - 1., 0., 1.); }
      void main(){ if (vU.x < 0.) discard; float u = clamp(vU.x, 0., 1.), s = vU.y, k = step(15.5, vC.w), al = clamp(vU.z, 0., 1.), kd = vC.w - 16. * k;   /* 튕김은 결 칸에 16을 더해 담음 (소수 자리에 담으면 그래픽 카드에 따라 반올림이 틀어져 안 튕긴 탄도 무지개가 됨) */ vec3 C = vC.rgb;
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
  /* ── 모으는 빛 3단계 (사용자 2026-11-04: 모으는 단계를 셋으로 나눠 보여 줄 것 · 단순하지 않게)
     1단계 '씨앗': 둘레 빛 알갱이가 소용돌이치며 빨려 들어 작은 빛 구슬이 맺힘
     2단계 '고리': 구슬 둘레에 기울어진 빛 고리 둘이 엇갈려 돎 (힘이 갇혀 맴도는 느낌)
     3단계 '창': 두 고리가 쏘는 쪽으로 접혀 들어가며 구슬이 앞뒤로 길어져 빛 창이 되고, 넘치는 힘에 파르르 떪
     uSt: 0~3 (단계가 오를 때마다 0.12초에 걸쳐 넘어감) · uDir: 화면에서 쏘는 쪽 */
  const mzP = new Float32Array(3), mzG = new THREE.BufferGeometry(); mzG.setAttribute('position', new THREE.BufferAttribute(mzP, 3));
  const muzM = new THREE.ShaderMaterial({ ...AB, uniforms: { uA: { value: 0 }, uPx: { value: 600 }, uT: { value: 0 }, uSt: { value: 0 }, uDir: { value: new THREE.Vector2(0, 1) }, uPop: { value: 0 }, uSz: { value: 1 } },
    vertexShader: 'uniform float uPx, uA, uSt, uSz; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uA > .01 ? uPx * uSz / max(.1, -mv.z) : 0.; }',   /* 크기는 단계로 정함 (아래 용수철) */
    fragmentShader: `uniform float uA, uT, uSt, uPop; uniform vec2 uDir;
      void main(){ vec2 q = (gl_PointCoord - .5) * 2.; q.y = -q.y; float r = length(q), a = atan(q.y, q.x + 1e-5);
        float s1 = clamp(uSt, 0., 1.), s2 = clamp(uSt - 1., 0., 1.), s3 = clamp(uSt - 2., 0., 1.);
        vec2 d = normalize(uDir + vec2(1e-5, 0.)); float al = dot(q, d), sd = dot(q, vec2(-d.y, d.x));
        /* 1단계: 소용돌이 결 + 맺히는 구슬 */
        float sw = pow(max(.5 + .5 * sin(a * 3. - uT * 7. + r * 16.), 0.), 4.) * smoothstep(1., .25, r) * smoothstep(.05, .3, r) * (.25 + .35 * s1) * (1. - .7 * s3);
        float orb = exp(-r * r * mix(90., 26., s1) * (1. + 2. * s3)) * (.6 + 1.1 * s1);
        /* 2단계: 기울어진 빛 고리 둘 (앞쪽 반은 밝고 뒤쪽 반은 옅게 → 도는 입체감) */
        float rings = 0.;
        for (int i = 0; i < 2; i++) { float th = uT * (i == 0 ? 2.6 : -3.1) + float(i) * 1.7, c = cos(th), sn = sin(th);
          vec2 v = vec2(c * q.x - sn * q.y, sn * q.x + c * q.y); float sq = mix(.32, .08, s3), rr = mix(.5, .26, s3);
          float e = length(vec2(v.x, v.y / sq)), band = exp(-(e - rr) * (e - rr) * 260.), front = .45 + .55 * step(0., v.y);
          rings += band * front; }
        rings *= s2 * (1. - .8 * s3) * .9;
        /* 3단계: 쏘는 쪽으로 길어진 빛 창 + 떨림 + 끝이 뾰족 */
        float jt = sin(uT * 61.) * .02 * s3, L = mix(.2, .85, s3), al2 = al - jt;
        float spear = exp(-sd * sd * mix(200., 70., s3)) * smoothstep(L, L * .2, abs(al2 - .12 * s3)) * s3 * 1.3;
        float tip = exp(-((al2 - L * .9) * (al2 - L * .9) * 300. + sd * sd * 400.)) * s3 * .8;
        float glow = exp(-r * r * 3.) * (.12 + .15 * uSt / 3.), pop = uPop * exp(-(r - .7 * (1. - uPop)) * (r - .7 * (1. - uPop)) * 60.) * .9;   /* 단계가 오르는 순간 퍼지는 빛 고리 */
        vec3 c = vec3(1.25, 1.28, 1.35) * (orb + spear + tip) + vec3(.65, .82, 1.25) * (sw + rings + glow) + vec3(.9, .95, 1.3) * pop;
        gl_FragColor = vec4(c * uA, 1.); }` });
  const muz = new THREE.Points(mzG, muzM); muz.frustumCulled = false; muz.renderOrder = 12; G.add(muz);
  /* 자동 조준 표시: 몬스터 발밑 바닥에 얇은 빛 고리 (사용자 2026-11-04) — 네 곳 눈금이 천천히 돎 · 표적이 바뀌면 스르르 · 쓰러지면 오므라듦 */
  const lkM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uA: { value: 0 }, uT: { value: 0 }, uOut: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv * 2. - 1.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uA, uT, uOut; varying vec2 vU; void main(){ float r = length(vU), a = atan(vU.y, vU.x + 1e-5) + uT * 1.2;
      float ring = exp(-(r - .82) * (r - .82) * 700.), ticks = smoothstep(.75, .97, abs(cos(a * 2.))) * exp(-(r - .9) * (r - .9) * 350.), soft = exp(-(r - .8) * (r - .8) * 40.) * .12;
      float dots = mix(1., step(.5, fract(a * 3.8197)) * .55, uOut);   /* 사거리 밖: 흐린 점선 (탄이 안 닿음) */
      gl_FragColor = vec4(vec3(1., .95, .8) * (ring * .5 + ticks * .8 + soft) * dots * uA, 1.); }` });
  const lk = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lkM); lk.rotation.x = -Math.PI / 2; lk.position.y = .07; lk.renderOrder = 5; lk.frustumCulled = false; lk.visible = false; G.add(lk);
  const LK = { x: 0, z: 0, sc: 0, a: 0, done: -9, dx: 0, dz: 0 };
  /* ── 사거리 원 (사용자 2026-11-04): 쏘기 버튼을 누르는 동안 기체 둘레 땅에 얇은 빛 원 = 이 탄이 닿는 끝
     탄 색 빛이 원을 따라 천천히 흐름 · 과열이 오르면 원도 주황으로 달아오름 · 원 안에 보이는 적이 있는 쪽은 원이 살짝 밝아짐
     눈금 24개는 아주 옅게 (거리를 가늠하는 자 느낌) · 누르면 0.15초에 걸쳐 바깥에서 제자리로 오므라들며 나타남 */
  const rgM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uA: { value: 0 }, uT: { value: 0 }, uR: { value: 10 }, uC: { value: new THREE.Vector3(1, 1, 1) }, uHeat: { value: 0 }, uE: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) } },
    vertexShader: 'uniform float uR; varying vec2 vP; void main(){ vP = position.xy * (uR + 1.2); gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy * (uR + 1.2), 0., 1.); }',
    fragmentShader: `uniform float uA, uT, uR, uHeat; uniform vec3 uC; uniform vec4 uE[6]; varying vec2 vP;
      void main(){ float r = length(vP), a = atan(vP.y, vP.x + 1e-5), e = r - uR; vec2 dv = vP / max(r, 1e-3);
        float line = exp(-e * e * 420.), halo = exp(-e * e * 9.) * .1, inner = smoothstep(-2.2, 0., e) * step(e, 0.) * .035;
        float flow = .55 + .45 * pow(max(.5 + .5 * sin(a * 3. - uT * 1.4), 0.), 3.);                 /* 원을 따라 흐르는 빛 */
        float tick = pow(max(abs(cos(a * 12.)), 0.), 160.) * exp(-(e + .25) * (e + .25) * 90.) * .5;
        float en = 0.; for (int i = 0; i < 6; i++) { float k = max(dot(dv, uE[i].xy), 0.); en += pow(k, 60.) * uE[i].z; }   /* 적이 있는 쪽 */
        vec3 col = mix(uC * uC * 1.2 + .15, vec3(1.2, .5, .15), smoothstep(.5, 1., uHeat));
        float k = line * (.35 + .4 * flow + 1.1 * min(en, 1.)) + halo * (.6 + en) + inner + tick;
        gl_FragColor = vec4(col * k * uA, 1.); }` });
  const rg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), rgM); rg.rotation.x = -Math.PI / 2; rg.position.y = .06; rg.renderOrder = 4; rg.frustumCulled = false; rg.visible = false; G.add(rg);
  let rgA = 0, rgR = 10;
  /* ── 예상 경로 (모아 쏘기): 모으는 동안 나갈 길을 바닥 위에 빛 점선으로 · 수정에 튕기면 꺾여서 · 벽에서 멈춤
     점선은 쏘는 쪽으로 흘러가고, 모은 단계만큼 밝고 촘촘해짐 · 끝에 작은 표적 점 · 꺾이는 곳마다 작은 빛 */
  const NPP = 64, ppP = new Float32Array(NPP * 2 * 3), ppU = new Float32Array(NPP * 2 * 2), ppI = [];
  for (let i = 0; i < NPP - 1; i++) { const p = i * 2; ppI.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
  const ppG = new THREE.BufferGeometry(); ppG.setAttribute('position', new THREE.BufferAttribute(ppP, 3)); ppG.setAttribute('aU', new THREE.BufferAttribute(ppU, 2)); ppG.setIndex(ppI);
  const ppM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uA: { value: 0 }, uT: { value: 0 }, uL: { value: 1 }, uSt: { value: 0 }, uBk: { value: new THREE.Vector4(-9, -9, -9, -9) } },
    vertexShader: 'attribute vec2 aU; varying vec2 vU; void main(){ vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uA, uT, uL, uSt; uniform vec4 uBk; varying vec2 vU;
      void main(){ float s = vU.x, w = vU.y, end = uL - s;
        float dash = smoothstep(.15, .5, fract(s * (1.1 + .35 * uSt) - uT * 2.6)) * smoothstep(.95, .6, fract(s * (1.1 + .35 * uSt) - uT * 2.6));
        float core = exp(-w * w * 9.), fade = smoothstep(0., 1.2, s) * smoothstep(-.2, .8, end);
        float tipm = exp(-end * end * 6.) * 1.4, bk = 0.; for (int i = 0; i < 4; i++) bk += exp(-(s - uBk[i]) * (s - uBk[i]) * 30.);   /* 끝 점 · 꺾이는 곳 */
        float k = core * (dash * (.35 + .25 * uSt) * fade + tipm + bk * .9);
        gl_FragColor = vec4(vec3(.8, .9, 1.25) * k * uA, 1.); }` });
  const pth = new THREE.Mesh(ppG, ppM); pth.frustumCulled = false; pth.renderOrder = 8; pth.visible = false; G.add(pth);
  /* 길 그리기: 지금 자리에서 쏘는 쪽으로 사거리만큼 걸어 보며 수정 튕김·벽을 그대로 따짐 */
  const drawPath = (x0, z0, ang, len, cry, sta) => { let x = x0, z = z0, vx = -Math.sin(ang), vz = -Math.cos(ang), s = 0, n = 0, bk = [-9, -9, -9, -9], nb = 0; const step = len / (NPP - 1), pts = [];
    pts.push([x, z, s]);
    while (pts.length < NPP && s < len) { let nx = x + vx * step, nz = z + vz * step;
      const h = cry > 0 && crystals ? crystals.userData.cross(x, z, nx, nz, .12) : null;
      if (h) { const vn = vx * h.nx + vz * h.nz; if (vn < 0) { vx -= 2 * vn * h.nx; vz -= 2 * vn * h.nz; } s += Math.hypot(h.x - x, h.z - z); x = h.x + h.nx * .05; z = h.z + h.nz * .05; cry--; if (nb < 4) bk[nb++] = s; pts.push([x, z, s]); continue; }
      if (B.blocked(nx, nz)) { let lo = 0, hi = 1; for (let k = 0; k < 6; k++) { const m = (lo + hi) / 2; if (B.blocked(x + (nx - x) * m, z + (nz - z) * m)) hi = m; else lo = m; } s += step * lo; x += (nx - x) * lo; z += (nz - z) * lo; pts.push([x, z, s]); break; }
      x = nx; z = nz; s += step; pts.push([x, z, s]); }
    while (pts.length < NPP) pts.push(pts[pts.length - 1]);
    const W = .1 + .05 * sta;
    for (let i = 0; i < NPP; i++) { const [px_, pz_, ps] = pts[i], [qx, qz] = pts[Math.min(NPP - 1, i + 1)], [ox, oz] = pts[Math.max(0, i - 1)]; let dx = qx - ox, dz = qz - oz, l = Math.hypot(dx, dz); if (l < 1e-5) { dx = vx; dz = vz; l = 1; }
      const sx = -dz / l * W, sz = dx / l * W, y = FLY.HOVER - .25;
      ppP.set([px_ + sx, y, pz_ + sz, px_ - sx, y, pz_ - sz], i * 6); ppU.set([ps, 1, ps, -1], i * 4); }
    ppG.attributes.position.needsUpdate = ppG.attributes.aU.needsUpdate = true; ppM.uniforms.uL.value = s; ppM.uniforms.uBk.value.set(...bk); };

  /* ── 빛줄기 (먼거리): 누르는 동안 기체가 보는 쪽으로 끊기지 않는 빛 · 벽·수정에서 반사(세 번까지) · 오래 비출수록 세짐(1.5초에 14 → 30)
     생김새: 하얗게 단단한 심 + 탄 색으로 일렁이는 겉빛 + 앞으로 흘러가는 빛 마디(힘이 실려 나가는 결) · 꺾이는 곳마다 번쩍 · 끝에 닿은 자리 불꽃
     켤 때 0.12초에 걸쳐 앞으로 뻗어 나감 · 세질수록 굵고 하얗게 · 끌 때 심부터 가늘어지며 꺼짐 */
  const NBM = 48, bmP = new Float32Array(NBM * 2 * 3), bmU = new Float32Array(NBM * 2 * 2), bmI = [];
  for (let i = 0; i < NBM - 1; i++) { const p = i * 2; bmI.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
  const bmG = new THREE.BufferGeometry(); bmG.setAttribute('position', new THREE.BufferAttribute(bmP, 3)); bmG.setAttribute('aU', new THREE.BufferAttribute(bmU, 2)); bmG.setIndex(bmI);
  const bmM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uA: { value: 0 }, uT: { value: 0 }, uL: { value: 1 }, uP: { value: 0 }, uC: { value: new THREE.Vector3(.7, .95, 1.1) }, uBk: { value: new THREE.Vector4(-9, -9, -9, -9) } },
    vertexShader: 'attribute vec2 aU; varying vec2 vU; void main(){ vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uA, uT, uL, uP; uniform vec3 uC; uniform vec4 uBk; varying vec2 vU;
      void main(){ float s = vU.x, w = vU.y, wob = 1. + .12 * sin(s * 3.1 - uT * 23.) + .08 * sin(s * 7.3 + uT * 17.);
        float core = exp(-w * w * mix(26., 14., uP) * wob), body = exp(-w * w * 2.6 * wob) * (.35 + .25 * uP);
        float pulse = .6 + .4 * pow(max(.5 + .5 * sin(s * 2.2 - uT * 26.), 0.), 3.);                                 /* 앞으로 흘러가는 빛 마디 */
        float bk = 0.; for (int i = 0; i < 4; i++) bk += exp(-(s - uBk[i]) * (s - uBk[i]) * 4.);                     /* 꺾이는 곳 번쩍 */
        float end = exp(-(uL - s) * (uL - s) * 2.5) * 1.2, start = smoothstep(0., .6, s);
        vec3 c = (vec3(1.25, 1.28, 1.3) * core * (.8 + .4 * uP) + uC * uC * 1.3 * body * pulse) * start + vec3(1.2, 1.2, 1.3) * (bk * .8 + end) * exp(-w * w * 1.5);
        gl_FragColor = vec4(c * uA, 1.); }` });
  const beamM = new THREE.Mesh(bmG, bmM); beamM.frustumCulled = false; beamM.renderOrder = 9; beamM.visible = false; G.add(beamM);
  const hum = makeHum(); const BMS = { on: 0, len: 0, T: 0, wallT: 0 };
  const beamStep = (t, dt, on, c) => { const goal = on ? 1 : 0; bmM.uniforms.uA.value += (goal - bmM.uniforms.uA.value) * Math.min(1, dt * (on ? 30 : 12)); beamM.visible = bmM.uniforms.uA.value > .01; bmM.uniforms.uT.value = t;
    if (!on) { BMS.T = 0; BMS.len = Math.max(0, BMS.len - dt * 60); hum.stop(); if (!beamM.visible) return; } else BMS.T += dt;
    const cc = on ? c : SHOT.beam, P = Math.min(1, BMS.T / cc.rampT), dps = cc.dps[0] + (cc.dps[1] - cc.dps[0]) * P; bmM.uniforms.uP.value = P; if (on) { hum.set(P); BMS.len = Math.min(cc.range * (cc.wallB + 1), BMS.len + dt * cc.range / .12); }   /* 0.12초에 22m씩 앞으로 뻗음 (꺾이면 그 자리부터 다시 22m) */
    /* 길: 기체가 보는 쪽(천천히 도는 몸 방향)으로 · 벽·수정에서 각도대로 꺾임 */
    let x = FS.x - Math.sin(FS.head) * 1.2, z = FS.z - Math.cos(FS.head) * 1.2, vx = -Math.sin(FS.head), vz = -Math.cos(FS.head), sAcc = 0, seg0 = 0, cry = cc.cryB, wall = cc.wallB, nb = 0; const bk = [-9, -9, -9, -9], pts = [[x, z, 0]], step = .45, segs = [];
    while (sAcc < BMS.len && sAcc - seg0 < cc.range && pts.length < 400) { let nx = x + vx * step, nz = z + vz * step;
      const h = cry > 0 && crystals ? crystals.userData.cross(x, z, nx, nz, .1) : null;
      if (h) { const vn = vx * h.nx + vz * h.nz; if (vn < 0) { vx -= 2 * vn * h.nx; vz -= 2 * vn * h.nz; } sAcc += Math.hypot(h.x - x, h.z - z); segs.push([x, z, h.x, h.z]); x = h.x + h.nx * .05; z = h.z + h.nz * .05; cry--; seg0 = sAcc; if (nb < 4) bk[nb++] = sAcc; pts.push([x, z, sAcc]); if (on && Math.random() < dt * 30) crystals.userData.flash(t, h.x, FLY.HOVER, h.z); continue; }
      if (B.blocked(nx, nz)) { let lo = 0, hi = 1; for (let k = 0; k < 6; k++) { const m = (lo + hi) / 2; if (B.blocked(x + (nx - x) * m, z + (nz - z) * m)) hi = m; else lo = m; } const ex = x + (nx - x) * lo, ez = z + (nz - z) * lo; sAcc += step * lo; segs.push([x, z, ex, ez]); x = ex; z = ez; pts.push([x, z, sAcc]);
        if (on && t - BMS.wallT > .09) { BMS.wallT = t; hitWall(x + vx * .3, FLY.HOVER, z + vz * .3, t); }
        if (wall > 0) { const e = .6, gx = B.field(x + e, z) - B.field(x - e, z), gz = B.field(x, z + e) - B.field(x, z - e), gl = Math.hypot(gx, gz); let wx = -vx, wz = -vz; if (gl > 1e-4) { wx = -gx / gl; wz = -gz / gl; }
          const vn = vx * wx + vz * wz; if (vn < 0) { vx -= 2 * vn * wx; vz -= 2 * vn * wz; } else { vx = -vx; vz = -vz; } x += wx * .06; z += wz * .06; wall--; seg0 = sAcc; if (nb < 4) bk[nb++] = sAcc; continue; }
        break; }
      segs.push([x, z, nx, nz]); x = nx; z = nz; sAcc += step; if (pts.length % 2 === 0 || sAcc >= BMS.len) pts.push([x, z, sAcc]); }
    if (pts[pts.length - 1][2] < sAcc) pts.push([x, z, sAcc]);
    /* 띠로 펴기 (NBM점에 고르게) */
    const W = .22 + .16 * P, L = sAcc; let pi = 0;
    for (let i = 0; i < NBM; i++) { const s = i / (NBM - 1) * L; while (pi < pts.length - 2 && pts[pi + 1][2] < s) pi++; const a = pts[pi], b = pts[Math.min(pts.length - 1, pi + 1)], f = b[2] > a[2] ? (s - a[2]) / (b[2] - a[2]) : 0, px_ = a[0] + (b[0] - a[0]) * f, pz_ = a[1] + (b[1] - a[1]) * f;
      let dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 1e-5) { dx = vx; dz = vz; l = 1; } const ox = -dz / l * W, oz = dx / l * W, y = FLY.HOVER;
      bmP.set([px_ + ox, y, pz_ + oz, px_ - ox, y, pz_ - oz], i * 6); bmU.set([s, 1, s, -1], i * 4); }
    bmG.attributes.position.needsUpdate = bmG.attributes.aU.needsUpdate = true; bmM.uniforms.uL.value = L; bmM.uniforms.uBk.value.set(...bk);
    if (on && nb > (BMS.nb || 0) && A.live()) { osc('sine', 2500 + nb * 400, 2450 + nb * 400, .25, .035); } BMS.nb = on ? nb : 0;   /* 새로 꺾일 때마다 맑은 팅 */ bmM.uniforms.uC.value.set(...cc.col);
    if (!on) return;
    /* 끝 불꽃 · 비추는 동안 몸 둘레 빛 알갱이 */
    if (Math.random() < dt * 40) { const a = Math.random() * 6.283, v = 2 + Math.random() * 4; emit(x, FLY.HOVER, z, Math.cos(a) * v - vx * 2, 1 + Math.random() * 2, Math.sin(a) * v - vz * 2, 1.1, 1.15, 1.3, .07, .2 + Math.random() * .2); }
    /* 피해: 빛 위에 있는 적 (0.25초마다 모아서 숫자로) */
    if (mobs) for (const j of mobs.userData.list) { if (!j.on || j.dieT > 0) continue; const R = .62 * j.s + .25 + W; let hitS = false;
      for (const [ax, az, bx, bz] of segs) { const sx = bx - ax, sz = bz - az, L2 = sx * sx + sz * sz || 1e-9, k = Math.max(0, Math.min(1, ((j.x - ax) * sx + (j.z - az) * sz) / L2)), ex = j.x - ax - sx * k, ez = j.z - az - sz * k; if (ex * ex + ez * ez < R * R) { hitS = true; break; } }
      if (!hitS) continue; j._ba = (j._ba || 0) + dps * dt; if (t - (BMS.sz || 0) > .12 && A.live()) { BMS.sz = t; hiss('highpass', 5200 + Math.random() * 2000, .6, .05, .012); }   /* 맞는 자리 작게 지글 */ if (Math.random() < dt * 25) emit(j.x, j.y - .2, j.z, (Math.random() - .5) * 4, Math.random() * 2.5, (Math.random() - .5) * 4, .8, 1, 1.25, .07, .3);
      if (t - (j._bt || 0) > .25) { const d = j._ba; j._ba = 0; j._bt = t; const killed = mobs.userData.hit(j, t, vx, vz, d, { knock: 0 }); onDamage?.(j, d, cc, false); onKill?.(j, killed, t); } } };
  /* ── 빛 칼날 = 발도 (단거리 · 사용자 2026-11-04 다시): 자동 조준·끌기 없음 — 조이스틱으로 정한 기체 앞쪽으로만 (균형: 가장 세고 여럿을 베는 대신 실력으로 방향을 잡고, 멈추는 틈이 위험)
     ① 멈춤 0.18초: 움직이던 중이어도 그 자리에 딱 섬 · 기체 앞코에서 빛 칼이 칼집에서 뽑히듯 길어지고 둘레 빛이 칼로 빨려 듦 · 화면 가장자리가 살짝 어두워짐(숨을 참음)
     ② 베며 나감 0.12초: 번개처럼 앞으로 3m · 지나간 자리에 기체 잔상 셋 · 지나간 길에 공간을 가르는 가는 하얀 선
     ③ 0.1초 뒤 '쩡': 선이 벌어지며 하얀 빛이 터지고 선 위(폭 1.5m) + 끝 앞 1.8m의 적이 한꺼번에 베임 · 화면이 아주 짧게 멈칫
     ④ 끝자리 바닥에 초승달 빛 자국이 남았다가 식음 */
  /* 가르는 선: 띠 한 장 (지나간 길을 따라) */
  const NCL = 12, clP = new Float32Array(NCL * 2 * 3), clU = new Float32Array(NCL * 2 * 2), clI = []; for (let i = 0; i < NCL - 1; i++) { const p = i * 2; clI.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
  const clG = new THREE.BufferGeometry(); clG.setAttribute('position', new THREE.BufferAttribute(clP, 3)); clG.setAttribute('aU', new THREE.BufferAttribute(clU, 2)); clG.setIndex(clI);
  const clM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uA: { value: 0 }, uOpen: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'attribute vec2 aU; varying vec2 vU; void main(){ vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uA, uOpen, uT; varying vec2 vU;   /* x 길 따라 0 → 1 · y 가로 · uOpen: 0 가는 선 → 1 벌어져 터짐 */
      void main(){ float u = vU.x, v = vU.y, taper = pow(max(sin(3.1416 * u), 0.), .5);
        float w = mix(.06, .9, uOpen) * taper + .001, core = exp(-v * v / (w * w) * 3.), halo = exp(-v * v / (w * w + .02) * .5) * .35 * uOpen;
        vec3 fr = clamp(abs(fract(v * .8 + u * .5 - uT * 2. + vec3(0., .33, .67)) * 6. - 3.) - 1., 0., 1.);
        vec3 c = vec3(1.4, 1.42, 1.45) * core * (1.2 + uOpen) + mix(vec3(.6, .9, 1.25), fr * 1.3, .5 * uOpen) * halo;
        gl_FragColor = vec4(c * uA, 1.); }` });
  const cutL = new THREE.Mesh(clG, clM); cutL.frustumCulled = false; cutL.renderOrder = 10; cutL.visible = false; G.add(cutL);
  /* 칼: 기체 앞코에서 뻗은 빛 날 (뿌리 가늘고 끝으로 넓어지다 뾰족 · 날은 하얗게) */
  const bdP = new Float32Array(10 * 2 * 3), bdU = new Float32Array(10 * 2 * 2), bdI = []; for (let i = 0; i < 9; i++) { const p = i * 2; bdI.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
  const bdG = new THREE.BufferGeometry(); bdG.setAttribute('position', new THREE.BufferAttribute(bdP, 3)); bdG.setAttribute('aU', new THREE.BufferAttribute(bdU, 2)); bdG.setIndex(bdI);
  const bdM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uA: { value: 0 }, uT: { value: 0 }, uRev: { value: 1 } },
    vertexShader: 'attribute vec2 aU; varying vec2 vU; void main(){ vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uA, uT, uRev; varying vec2 vU; void main(){ float u = vU.x, v = vU.y; if (u > uRev + .001) discard;   /* 홀로그램 칼날: 가는 푸른·초록 선으로 그린 칼 · 속은 거의 비침 · 뿌리부터 한 줄씩 그려지며 나타남 */
      float rim = exp(-(abs(v) - .9) * (abs(v) - .9) * 700.), mid = exp(-v * v * 500.) * .55, fr = fract(u * 16. - uT * 2.), rung = exp(-(fr - .5) * (fr - .5) * 900.) * .35 * step(abs(v), .9);   /* 테두리 두 줄 · 가운데 등줄 · 가로 눈금 */
      float fill = .05 * (1. - v * v) * (.7 + .3 * sin(u * 80. - uT * 40.)), gl = step(.9, fract(sin(floor(uT * 22.) * 43.7) * 917.3));
      float front = exp(-(u - uRev) * (u - uRev) * 900.) * step(uRev, .995) * 1.2, guard = exp(-(u - .07) * (u - .07) * 2000.) * .9;   /* 그려지는 줄 · 손잡이 쪽 가로날 */
      vec3 cyan = vec3(.35, .95, 1.25), green = vec3(.45, 1.25, .7);
      vec3 c = mix(cyan, green, .35 + .25 * sin(u * 6. + uT * 3.)) * (rim * 1.4 + mid + rung + fill + guard) * (1. - .5 * gl) + cyan * front;
      gl_FragColor = vec4(c * smoothstep(0., .04, u) * uA, 1.); }` });
  const bladeM = new THREE.Mesh(bdG, bdM); bladeM.frustumCulled = false; bladeM.renderOrder = 9; bladeM.visible = false; G.add(bladeM);
  /* 칼: 살짝 휜 곡도. bend = 휘두르는 반대쪽으로 끝이 휘는 정도(힘이 실림) · edgeSide = 날이 향한 쪽(+1/-1) */
  const drawBlade = (x, z, a, len, wid, al, bend = .12, edgeSide = 1) => { const dx = -Math.sin(a), dz = -Math.cos(a), px_ = -dz, pz_ = dx, y = FLY.HOVER + .05;
    for (let i = 0; i < 10; i++) { const q = i / 9, r = .7 + len * q, w = .02 + wid * (q < .08 ? .55 : q < .8 ? .6 + .4 * Math.sin(q * 2.2) : (1 - q) / .2 * .95), off = -bend * q * q * len * edgeSide;   /* 끝으로 갈수록 휨 */
      const cx = x + dx * r + px_ * off, cz = z + dz * r + pz_ * off, e = edgeSide;
      bdP.set([cx + px_ * w * e, y, cz + pz_ * w * e, cx - px_ * w * e, y, cz - pz_ * w * e], i * 6); bdU.set([q, 1, q, -1], i * 4); }
    bdG.attributes.position.needsUpdate = bdG.attributes.aU.needsUpdate = true; bdM.uniforms.uA.value = al; bladeM.visible = al > .01; };
  /* 휘두르는 잔상: 칼이 지난 0.06초 동안의 면을 부채꼴로 채움 (칼끝 쪽이 가장 밝고 뒤쪽은 빠르게 사라짐) */
  const NF = 14, fnP = new Float32Array(NF * 2 * 3), fnU = new Float32Array(NF * 2 * 2), fnI = []; for (let i = 0; i < NF - 1; i++) { const p = i * 2; fnI.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
  const fnG = new THREE.BufferGeometry(); fnG.setAttribute('position', new THREE.BufferAttribute(fnP, 3)); fnG.setAttribute('aU', new THREE.BufferAttribute(fnU, 2)); fnG.setIndex(fnI);
  const fnM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uA: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'attribute vec2 aU; varying vec2 vU; void main(){ vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uA, uT; varying vec2 vU; void main(){ float q = vU.x, r = vU.y;   /* q: 0 지금 칼 → 1 뒤쪽 · r: 0 뿌리 → 1 칼끝 */
      float fade = pow(1. - q, 2.2), rad = smoothstep(.05, .5, r) * (.35 + .65 * r * r), lines = .7 + .3 * pow(max(sin(r * 34. + q * 3. - uT * 30.) * .5 + .5, 0.), 3.);
      vec3 c = mix(vec3(.45, .7, 1.1), vec3(1.2, 1.25, 1.35), r * r) * fade * rad * lines * .55;
      gl_FragColor = vec4(c * uA, 1.); }` });
  const fan = new THREE.Mesh(fnG, fnM); fan.frustumCulled = false; fan.renderOrder = 8; fan.visible = false; G.add(fan);
  const drawFan = (x, z, a, span, rr, al) => { const y = FLY.HOVER - .02; for (let i = 0; i < NF; i++) { const q = i / (NF - 1), aa = a - span * q, dx = -Math.sin(aa), dz = -Math.cos(aa); fnP.set([x + dx * .9, y, z + dz * .9, x + dx * rr, y, z + dz * rr], i * 6); fnU.set([q, 0, q, 1], i * 4); }
    fnG.attributes.position.needsUpdate = fnG.attributes.aU.needsUpdate = true; fnM.uniforms.uA.value = al; fan.visible = al > .01; };
  /* 바닥 초승달 자국 */
  const NSA = 40, saP = new Float32Array(NSA * 2 * 3), saU = new Float32Array(NSA * 2 * 2), saI = [];
  for (let i = 0; i < NSA - 1; i++) { const p = i * 2; saI.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
  const saG = new THREE.BufferGeometry(); saG.setAttribute('position', new THREE.BufferAttribute(saP, 3)); saG.setAttribute('aU', new THREE.BufferAttribute(saU, 2)); saG.setIndex(saI);
  const saM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uA: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'attribute vec2 aU; varying vec2 vU; void main(){ vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uA, uT; varying vec2 vU; void main(){ float u = vU.x, v = vU.y;
      float edge = exp(-(v - .8) * (v - .8) * 60.), body = smoothstep(-1., .3, v) * smoothstep(1.05, .7, v) * .35, ember = .6 + .4 * sin(u * 40. + uT * 3.);
      vec3 c = vec3(1.2, 1.25, 1.35) * edge * .9 + vec3(.5, .8, 1.15) * body * ember;
      gl_FragColor = vec4(c * uA, 1.); }` });
  const arc = new THREE.Mesh(saG, saM); arc.frustumCulled = false; arc.renderOrder = 6; arc.visible = false; G.add(arc);
  const drawCrescent = (x, z, a, R) => { const A2 = 150 * Math.PI / 180, y = .1;
    for (let i = 0; i < NSA; i++) { const q = i / (NSA - 1), aa = a + (q - .5) * A2, th = Math.pow(Math.sin(Math.PI * q), .75) * .9, rO = R, rI = R - th, dx = -Math.sin(aa), dz = -Math.cos(aa);
      saP.set([x + dx * rO, y, z + dz * rO, x + dx * rI, y, z + dz * rI], i * 6); saU.set([q, 1, q, -1], i * 4); }
    saG.attributes.position.needsUpdate = saG.attributes.aU.needsUpdate = true; };
  /* 잔상: 기체를 본뜬 빛 셋 */
  const ghosts = [];
  if (ship) for (let i = 0; i < 3; i++) { const g = ship.clone(true), m = new THREE.ShaderMaterial({ ...AB, uniforms: { uA: { value: 0 } },
      vertexShader: 'varying vec3 vN, vV; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform float uA; varying vec3 vN, vV; void main(){ float f = 1. - abs(dot(normalize(vN), vV)); gl_FragColor = vec4(vec3(.55, .85, 1.25) * (f * f * 1.4 + .12) * uA, 1.); }' });
    g.traverse(o => { if (o.isMesh) { o.material = m; o.renderOrder = 8; } }); g.visible = false; G.add(g); ghosts.push({ g, m, t0: -9 }); }
  /* 숨 참기: 화면 가장자리 어둡게 (글 한 장) */
  const vig = document.createElement('div'); vig.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 45%,rgba(0,2,8,.55) 100%)'; document.body.appendChild(vig);
  /* ── 휘두른 자국 (시안 A·B·C): 칼끝이 실제로 지나간 자리(기체가 앞으로 나가며 휘두르므로 휘어진 초승달)를 기록해 띠로 그림 · 두 장 (B는 두 번 벰) ── */
  const NTR = 36, trails = [0, 1].map(() => { const P = new Float32Array(NTR * 2 * 3), U = new Float32Array(NTR * 2 * 2), I = []; for (let i = 0; i < NTR - 1; i++) { const p = i * 2; I.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aU', new THREE.BufferAttribute(U, 2)); g.setIndex(I);
    const m = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uA: { value: 0 }, uT: { value: 0 }, uB: { value: 0 }, uHead: { value: 1 } },
      vertexShader: 'attribute vec2 aU; varying vec2 vU; void main(){ vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `uniform float uA, uT, uB, uHead; varying vec2 vU;   /* x: 자국 따라 0(시작) → 1(칼끝) · y: 안쪽 -1 → 바깥 날 1 · uB: '쩡' 터짐 0 → 1 */
        void main(){ float u = vU.x, v = vU.y, o = v * .5 + .5;
          float edge = exp(-(v - .8) * (v - .8) * mix(70., 12., uB)) * (1.5 + 1.5 * uB), body = smoothstep(-1., .2, v) * smoothstep(1.05, .7, v) * (.4 + .5 * uB);
          float streak = .55 + .45 * pow(max(sin(u * 44. - uT * 20. + v * 5.) * .5 + .5, 0.), 4.), hot = smoothstep(uHead - .35, uHead, u) * step(u, uHead + .001);   /* 찢기듯 흐르는 결 · 칼끝 가까이가 가장 뜨거움 */
          vec3 fr = clamp(abs(fract(o * .9 + u * .3 + uT * .5 + vec3(0., .33, .67)) * 6. - 3.) - 1., 0., 1.);
          float fringe = exp(-(v - 1.) * (v - 1.) * 30.) * (.6 + .8 * uB);
          float wind = 0.; for (int i = 0; i < 4; i++) { float vk = -.35 + float(i) * .27, dash = smoothstep(.25, .6, fract(u * 3.5 - uT * 7. + float(i) * .37)) * smoothstep(1., .7, fract(u * 3.5 - uT * 7. + float(i) * .37)); wind += exp(-(v - vk) * (v - vk) * 900.) * dash * (1. - uB); }   /* 안쪽 바람 줄: 칼이 간 쪽으로 흘러감 */
          float sp1 = exp(-(v - .8 - .22 * uB) * (v - .8 - .22 * uB) * 220.), sp2 = exp(-(v - .8 + .4 * uB) * (v - .8 + .4 * uB) * 220.), gap = exp(-(v - .7) * (v - .7) * 18.) * uB * (1. - uB) * 4.;   /* 쩡: 날 자국이 두 줄로 갈라지며 가운데가 하얗게 터짐 */
          edge = mix(edge, (sp1 + sp2) * 2.2, step(.001, uB));
          vec3 c = vec3(1.35, 1.38, 1.42) * (edge * (.55 + .6 * hot + .4 * uB) + gap) + vec3(.5, .85, 1.2) * (body * streak * (.5 + .6 * hot) + wind * .9) + fr * fringe;
          gl_FragColor = vec4(c * uA, 1.); }` });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 8; mesh.visible = false; G.add(mesh); return { P, U, g, m, mesh, pts: [] }; });
  const drawTrail = (tr, wid) => { const n = tr.pts.length; if (n < 2) { tr.mesh.visible = false; return; } tr.mesh.visible = true;
    for (let i = 0; i < NTR; i++) { const q = i / (NTR - 1), f = q * (n - 1), k = Math.min(n - 2, Math.floor(f)), r = f - k, a = tr.pts[k], b = tr.pts[k + 1];
      const ox = a[0] + (b[0] - a[0]) * r, oz = a[1] + (b[1] - a[1]) * r, ix = a[2] + (b[2] - a[2]) * r, iz = a[3] + (b[3] - a[3]) * r, th = Math.pow(Math.sin(Math.PI * q), .7) * wid;   /* 가운데 두껍고 양 끝 뾰족 */
      const y = FLY.HOVER - .05, tx = ox + (ix - ox) * th, tz = oz + (iz - oz) * th; tr.P.set([ox, y, oz, tx, y, tz], i * 6); tr.U.set([q, 1, q, -1], i * 4); }
    tr.g.attributes.position.needsUpdate = tr.g.attributes.aU.needsUpdate = true; };
  /* 휘두르는 빛 판 (맨 처음 판의 표현 · 사용자 2026-11-04 '이게 제일 좋음'): 칼끝이 지나는 자리에 날카로운 빛 띠(바깥 테두리가 가장 밝음) → 지나간 자리는 잔상으로 식음
     지금은 멈췄다 앞으로 튀어 나가는 동안 기체를 따라오며 휘둘러짐 · '쩡'에 판 전체가 한 번 하얗게 번쩍 */
  const secM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uA0: { value: 0 }, uSg: { value: 1 }, uP: { value: 0 }, uFade: { value: 0 }, uR: { value: 3 }, uArc: { value: 2.8 }, uT: { value: 0 }, uFl: { value: 0 } },
    vertexShader: 'uniform float uR; varying vec2 vP; void main(){ vP = position.xy * (uR + .6); gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy * (uR + .6), 0., 1.); }',
    fragmentShader: `uniform float uA0, uSg, uP, uFade, uR, uArc, uT, uFl; varying vec2 vP;   /* 사용자 참고 그림: 여러 겹 휜 빛 막 · 하얗게 타는 심 · 푸른·보라 번개 실 · 주황 불티 · 속도선 */
      void main(){ float r = length(vP), a = atan(vP.y, vP.x + 1e-5), d = uSg * atan(sin(a - uA0), cos(a - uA0)), p = (d + uArc * .5) / uArc;
        if (p < -.03 || p > 1.03 || r > uR + .8) discard;
        vec3 col = vec3(0.);
        for (int i = 0; i < 3; i++) { float fi = float(i), Ri = uR * (.68 + .16 * fi), beh = uP - fi * .07 - p; if (beh < 0.) continue;   /* 세 겹: 바깥 겹이 조금씩 늦게 따라옴 */
          float lead = exp(-beh * beh * 700.), tr = exp(-beh * 9.), e = r - Ri;   /* 지나간 자리는 빨리 식음 */
          float edge = exp(-e * e * 420.) * (lead * 1.1 + tr * .35);   /* 가는 날 자국 */
          float inner = smoothstep(Ri - 1.3, Ri, r) * step(r, Ri + .05) * (lead * .22 + tr * .06) * (.55 + .45 * sin(r * 6. + a * 5. - uT * 11. + fi * 1.7));   /* 투명한 푸른 결 */
          float jag = Ri - .22 + .1 * sin(a * 37. + uT * 41. + fi * 2.) + .05 * sin(a * 93. - uT * 67.);
          float el = exp(-(r - jag) * (r - jag) * 1800.) * (lead * .8 + tr * .25) * step(.45, fract(a * 4.7 + uT * 3.1 + fi * .31));   /* 번개 실: 들쭉날쭉 지직 */
          col += vec3(.3, .7, 1.1) * inner * .7 + mix(vec3(.35, .95, 1.25), vec3(.45, 1.2, .7), fi * .45) * edge * (1. - .25 * fi) + vec3(.55, .5, 1.3) * el * .8; }   /* 홀로그램: 가는 푸른·초록 선 */
        float bo = uP - p, core = exp(-bo * bo * 6000.) * smoothstep(uR * .3, uR, r) * step(r, uR + .08) * step(0., bo + .01) * 1.1;   /* 맨 앞 하얗게 타는 심 */
        float hotO = exp(-bo * bo * 14000.) * smoothstep(uR * .6, uR, r) * step(r, uR + .08) * .55;                                       /* 심 바로 앞 주황 열기 */
        float f = fract(r * 2.6 + .3) - .5, spl = exp(-f * f * 900.) * step(0., bo) * exp(-bo * 14.) * .25 * smoothstep(.6, uR, r) * step(r, uR);   /* 속도선 */
        col += vec3(.45, 1.05, 1.3) * core * .5 + vec3(1.2, .6, .25) * hotO * .3 + vec3(.4, .85, 1.1) * spl;   /* 흰 굵은 심은 뺌 */
        col *= 1. - uFade;   /* 다 휘두르면 0.1초 안에 함께 사라짐 */
        col += uFl * (vec3(.5, 1.1, 1.3) * exp(-(r - uR) * (r - uR) * 60.) * .7) * step(r, uR + .4);   /* 쩡: 날 자리만 한 번 하얗게 */
        gl_FragColor = vec4(col, 1.); }` });
  const sec = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), secM); sec.rotation.x = -Math.PI / 2; sec.renderOrder = 8; sec.frustumCulled = false; sec.visible = false; G.add(sec);
  /* 벨 자리 미리 보기 (사용자 2026-11-04 확정): 누르고 있는 동안 바라보는 방향 3m 앞 바닥에 실제로 베일 반달을 옅은 선으로 · 방향을 바꾸면 따라 돎 */
  /* 범위 = 기체에서 시작해 튀어 나가는 길을 덮고 끝에서 반달로 벌어지는 물방울 모양 (사용자: 지나가는 곳도 베이니 기체에 이어져야 함) · 실제 맞음 판정(bladeIn)과 같은 식 */
  const pvM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uA: { value: 0 }, uS: { value: new THREE.Vector2() }, uE: { value: new THREE.Vector2(0, -1) }, uL: { value: 3 }, uR: { value: 3 }, uCot: { value: .18 }, uT: { value: 0 }, uRdy: { value: 0 } },
    vertexShader: 'varying vec2 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uA, uL, uR, uCot, uT, uRdy; uniform vec2 uS, uE; varying vec2 vW;
      void main(){ vec2 q = vW - uS, pe = vec2(-uE.y, uE.x); float x = dot(q, uE), y = dot(q, pe), ay = abs(y);
        /* 기체 끝(0,0)에서 출발해 튀어 나가는 길(0~L)을 덮으며 벌어지다가 끝(L)에서 반지름 R 반달로 닫히는 물방울 · sd = 안쪽으로 잰 둘레까지 거리 */
        float sd = x >= uL ? uR - length(vec2(x - uL, y)) : x >= 0. ? (uR * x - uL * ay) / length(vec2(uR, uL)) : -length(q);
        float inside = step(0., sd), e = exp(-sd * sd * 70.);
        float spine = exp(-y * y * 140.) * step(0., x) * step(x, uL) * step(.45, fract(x * 2.2 - uT * 3.));   /* 가운데 점선 = 기체가 튀어 나갈 길 */
        if (inside < .5 && e < .02) discard;
        float flow = .75 + .25 * sin(x * 5. - uT * 9.), fill = inside * (.06 + .05 * smoothstep(0., uL + uR, x)) * flow;   /* 끝으로 갈수록 살짝 진해짐 = 칼날이 닿는 쪽 */
        float dash = .65 + .35 * step(.5, fract((x + ay) * 1.1 - uT * 1.6));
        vec3 c = mix(vec3(.35, .9, 1.2), vec3(.5, 1.2, .75), uRdy) * (e * dash * (.55 + .45 * uRdy) + fill + spine * inside * .35);
        gl_FragColor = vec4(c * uA, 1.); }` });
  const pv = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), pvM); pv.rotation.x = -Math.PI / 2; pv.scale.setScalar(9); pv.renderOrder = 5; pv.frustumCulled = false; pv.visible = false; G.add(pv);
  const bladeIn = (qx, qz, sx, sz, dir, L, R, cot, pad) => { const ex = -Math.sin(dir), ez = -Math.cos(dir), x = (qx - sx) * ex + (qz - sz) * ez, y = Math.abs((qx - sx) * -ez + (qz - sz) * ex); return x >= L ? Math.hypot(x - L, y) <= R + pad : x >= -pad && (R * x - L * y) / Math.hypot(R, L) >= -pad; };   /* 미리 보기 물방울과 같은 식 (pad = 적 몸 반지름) */
  /* 시안별 휘두름: [시작 각, 끝 각, 시작 시점, 끝 시점, 반경 더하기] (각은 기체 앞 기준 · 왼쪽 +) */
  const D2R = Math.PI / 180, STY = {
    A: { name: '반달 휘두르기', sw: .14, lunge: 3, sweeps: sg => [[sg * 80, -sg * 80, 0, 1, 0]] },                                          /* 한 번 크게 휘둘러 반달 */
    B: { name: '두 번 베기', sw: .24, lunge: 3, sweeps: sg => [[sg * 75, -sg * 75, 0, .52, 0], [-sg * 70, sg * 70, .44, 1, .35]] },          /* 왼→오, 곧바로 오→왼 · 두 초승달이 겹침 */
    C: { name: '회전 베기', sw: .22, lunge: 2, sweeps: sg => [[0, sg * 360, 0, 1, -.6]] },                                                 /* 한 바퀴 돌며 둘레를 다 벰 (반경 조금 작게) */
    D: { name: '일자 발도', sw: .12, lunge: 3, sweeps: () => [] } };                                                                      /* 찌르듯 지나가며 일자로 가름 (이전 판) */
  SHOT.blade.styles = Object.fromEntries(Object.entries(STY).map(([k, v]) => [k, v.name]));
  const SL = { st: 0, t0: -9, ang: 0, x0: 0, z0: 0, hit: [], pend: [], sg: 1 };
  const slash = t => { if (SL.st) return; const c = cfg; SL.st = 1; SL.touched = 0; SL.t0 = t; SL.ang = FS.head; SL.c = c; SL.hit.length = 0; SL.pend.length = 0; SL.sty = STY[c.style] || STY.A;
    for (const tr of trails) { tr.pts.length = 0; tr.mesh.visible = false; tr.m.uniforms.uB.value = 0; }
    FS.dashUntil = t + (c.windup || .18); FS.dashVx = 0; FS.dashVz = 0;   /* 움직이던 중이어도 딱 멈춤 */
    if (A.live()) { const cc = A.ctx, t0 = cc.currentTime, o = cc.createOscillator(), g = cc.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(420, t0); o.frequency.exponentialRampToValueAtTime(1600, t0 + .18); o.connect(g); A.env(g, t0, .02, .035, .2); A.out(g, .3); o.start(t0); o.stop(t0 + .25); } };   /* 칼 뽑는 소리: 쇳소리가 올라감 */
  const cutHit = (j, t, c) => { const killed = mobs.userData.hit(j, t, -Math.sin(SL.ang), -Math.cos(SL.ang), c.dmg, { knock: .8 }); onDamage?.(j, c.dmg, c, false); onKill?.(j, killed, t);
    const ta = Math.atan2(j.x - FS.x, j.z - FS.z) + Math.PI / 2, tx = Math.sin(ta), tz = Math.cos(ta);   /* 칼자국: 칼이 지나간 결(접선)로 몸을 가로지름 */
    for (let i = 0; i < 16; i++) { const k = (i / 15 - .5) * 1.8 * j.s; emit(j.x + tx * k, j.y - .1, j.z + tz * k, (Math.random() - .5) * 2, .4 + Math.random(), (Math.random() - .5) * 2, 1.3, 1.35, 1.45, .07, .2 + Math.random() * .1, 0, 0, 3); }
    for (let i = 0; i < 10; i++) { const a = Math.random() * 6.283, v = 3 + Math.random() * 5; emit(j.x, j.y - .2, j.z, Math.cos(a) * v, Math.random() * 2.5, Math.sin(a) * v, .7, 1, 1.3, .07, .3); } };
  const angIn = (a, a0, a1) => { const d = a1 - a0, t = Math.atan2(Math.sin(a - a0), Math.cos(a - a0)); if (Math.abs(d) >= 6.28) return true; return d >= 0 ? t >= -.02 && t <= d + .02 : t <= .02 && t >= d - .02; };   /* a가 a0 → a1 사이를 칼이 지난 자리인지 */
  const slashStep = (t, dt) => { const c = SL.c || SHOT.blade, sty = SL.sty || STY.A, e = t - SL.t0, W = c.windup || .18, SW = sty.sw, CD = c.cutDelay || .1, dir = SL.ang, dx = -Math.sin(dir), dz = -Math.cos(dir);
    clM.uniforms.uT.value = bdM.uniforms.uT.value = saM.uniforms.uT.value = fnM.uniforms.uT.value = t; for (const tr of trails) tr.m.uniforms.uT.value = t;
    for (const g of ghosts) { const k = 1 - (t - g.t0) / .28; g.g.visible = k > 0; if (k > 0) g.m.uniforms.uA.value = k * k * .9; }
    { const ce = t - (SL.tc || -9), k = Math.max(0, 1 - ce / .7); arc.visible = k > 0 && sty === STY.D; saM.uniforms.uA.value = k * k; }
    if (!SL.st) { bladeM.visible = false; fan.visible = false; const ce = t - (SL.tc || -9);
      sec.visible = false;   /* 쩡 때 반달 선을 다시 번쩍이지 않음 — 불티·칼날 조각만 */
      if (ce < .45) { const k = ce / .45; if (sty === STY.D) { cutL.visible = true; clM.uniforms.uOpen.value = Math.min(1, k * 3); clM.uniforms.uA.value = Math.max(0, 1 - k) ** 1.5; } for (const tr of trails) { tr.m.uniforms.uB.value = Math.min(1, k * 4); tr.m.uniforms.uA.value = Math.max(0, 1 - k) ** 1.3; tr.m.uniforms.uHead.value = 1; } }
      else { cutL.visible = false; for (const tr of trails) tr.mesh.visible = false; }
      vig.style.opacity = 0; return; }
    FS.turnCap = .001;   /* 멈췄다 베는 동안 방향은 누른 순간 그대로 */
    const R = c.reach + .6;
    if (SL.st === 1) { sec.visible = false; fan.visible = false; cutL.visible = false; for (const tr of trails) tr.mesh.visible = false;   /* 새로 벨 준비: 지난 자국은 모두 지움 */
      const k = Math.min(1, e / W); FS.dashUntil = t + dt * 2; FS.dashVx = 0; FS.dashVz = 0;   /* ① 멈춤: 칼을 뽑음 (휘두를 시안이면 칼이 시작 쪽으로 당겨짐) */
      const sw0 = sty.sweeps(SL.sg)[0], a = sw0 ? dir + sw0[0] * D2R * (.6 + .4 * k) : dir;
      drawBlade(FS.x, FS.z, a, c.reach + 1, .32, .7 + .3 * k, .04); bdM.uniforms.uRev.value = Math.min(1, k * 1.25); vig.style.opacity = (.8 * k).toFixed(2);
      if (Math.random() < dt * 70) { const bx = -Math.sin(a), bz = -Math.cos(a), r = .8 + Math.random() * (c.reach + .8) * k, a2 = Math.random() * 6.283, px_ = FS.x + bx * r, pz_ = FS.z + bz * r, sx = px_ + Math.cos(a2) * 1.6, sz = pz_ + Math.sin(a2) * 1.6; emit(sx, FLY.HOVER, sz, (px_ - sx) * 7, 0, (pz_ - sz) * 7, .7, .95, 1.3, .05, .14, 0, 0, 0); }   /* 둘레 빛이 칼로 빨려 듦 */
      if (e >= W) { bdM.uniforms.uRev.value = 1; SL.st = 2; SL.t1 = t; SL.x0 = FS.x; SL.z0 = FS.z; FS.dashUntil = t + SW; FS.dashVx = dx * sty.lunge / SW; FS.dashVz = dz * sty.lunge / SW; FS.rc = 1.2; play('swish'); SL.gi = 0; SL.prevA = null; } return; }
    if (SL.st === 2) { const k = Math.min(1, (t - SL.t1) / SW);   /* ② 앞으로 튀어 나가며 벰 · 잔상 */
      if (SL.gi < ghosts.length && k >= SL.gi / ghosts.length && ship) { const g = ghosts[SL.gi++]; g.g.position.copy(ship.position); g.g.quaternion.copy(ship.quaternion); g.g.scale.copy(ship.scale); g.t0 = t; }
      vig.style.opacity = (.8 * (1 - k)).toFixed(2);
      const sws = sty.sweeps(SL.sg);
      if (!sws.length) {   /* 시안 D: 일자로 가르는 선 */
        drawBlade(FS.x, FS.z, dir, c.reach + .6, .2, 1);
        const ex = FS.x + dx * c.reach, ez = FS.z + dz * c.reach, sx0 = SL.x0 - dx * .8, sz0 = SL.z0 - dz * .8;
        for (let i = 0; i < NCL; i++) { const q = i / (NCL - 1), x = sx0 + (ex - sx0) * q, z = sz0 + (ez - sz0) * q; clP.set([x - dz, FLY.HOVER, z + dx, x + dz, FLY.HOVER, z - dx], i * 6); clU.set([q, -1, q, 1], i * 4); }
        clG.attributes.position.needsUpdate = clG.attributes.aU.needsUpdate = true; cutL.visible = true; clM.uniforms.uOpen.value = 0; clM.uniforms.uA.value = 1;
        if (mobs) for (const j of mobs.userData.list) { if (!j.on || j.dieT > 0 || SL.hit.includes(j)) continue; const qx = j.x - sx0, qz = j.z - sz0, L = Math.hypot(ex - sx0, ez - sz0) || 1, al = (qx * dx + qz * dz), sd = Math.abs(qx * -dz + qz * dx);
          if (al >= -.3 && al <= L + .3 && sd <= c.width + .5 * j.s) { SL.hit.push(j); SL.pend.push(j); } } }
      else { let bladeA = null;   /* 시안 A·B·C: 칼이 정해진 각을 따라 휘둘러지고 칼끝 자리를 기록 */
        const useSec = sty === STY.A; if (useSec) { const [a0, a1] = sws[0]; sec.visible = true; sec.position.set(FS.x, FLY.HOVER - .15, FS.z); secM.uniforms.uA0.value = dir + Math.PI / 2; secM.uniforms.uSg.value = Math.sign(a1 - a0);
          secM.uniforms.uArc.value = Math.abs(a1 - a0) * D2R; secM.uniforms.uR.value = R; secM.uniforms.uP.value = 1 - Math.pow(1 - k, 2.2); secM.uniforms.uFade.value = 0; secM.uniforms.uFl.value = 0; secM.uniforms.uT.value = t; SL.secX = FS.x; SL.secZ = FS.z; }
        sws.forEach(([a0, a1, u0, u1, dr], si) => { if (k < u0) return; const kk = Math.min(1, (k - u0) / (u1 - u0)), ease = 1 - Math.pow(1 - kk, 2.2), off = (a0 + (a1 - a0) * ease) * D2R, a = dir + off, rr = R + dr, bx = -Math.sin(a), bz = -Math.cos(a), tr = trails[si];
          if (!useSec && (kk < 1 || tr.pts.length < 2)) { tr.pts.push([FS.x + bx * rr, FS.z + bz * rr, FS.x + bx * .9, FS.z + bz * .9]); drawTrail(tr, .85); tr.m.uniforms.uA.value = 1; tr.m.uniforms.uHead.value = 1; }
          if (kk < 1) bladeA = [a, rr, a1 - a0];
          /* 맞음: 이번 장면에 칼이 지난 각 사이 + 반경 안 */
          const pa = tr.prevA ?? (dir + a0 * D2R); if (mobs) for (const j of mobs.userData.list) { if (!j.on || j.dieT > 0 || SL.hit.includes(j)) continue; const jx = j.x - FS.x, jz = j.z - FS.z, d = Math.hypot(jx, jz);
            const ok = useSec ? bladeIn(j.x, j.z, SL.x0, SL.z0, dir, sty.lunge, R, 1 / Math.tan(80 * D2R), .62 * j.s) : d <= rr + .62 * j.s && (angIn(Math.atan2(-jx, -jz), pa, a) || d < 1.2);   /* A: 미리 보여 준 물방울 범위 안이면 맞음 (가장자리에 있는데 안 맞던 것 고침) */
            if (ok) { SL.hit.push(j); SL.pend.push(j);
              for (let i = 0; i < 12; i++) { const s2 = Math.sign(a1 - a0), v = 4 + Math.random() * 6, sa = a + s2 * 1.57 + (Math.random() - .5) * 1.2; emit(j.x, j.y - .15, j.z, -Math.sin(sa) * v, Math.random() * 2, -Math.cos(sa) * v, 1.3, 1.2, .9, .06 + Math.random() * .04, .2 + Math.random() * .15); }   /* 닿는 순간 불꽃: 칼이 간 쪽으로 튐 */
              if (!SL.touched) { SL.touched = 1; FS.stopUntil = performance.now() + 35; thud(.05); }   /* 첫 닿음에 아주 잠깐 멈칫 */
              const ka = a + Math.sign(a1 - a0) * 1.57; FS.kx = -Math.sin(ka) * .45; FS.kz = -Math.cos(ka) * .45; FS.kT = performance.now(); } }   /* 화면이 칼 간 쪽으로 한 번 밀렸다 돌아옴 */
          tr.prevA = a;
          if (kk < 1) for (let q = 0; q < (useSec ? 3 : 1); q++) if (Math.random() < dt * 120) { const hot = useSec && Math.random() < .6, v = (5 + Math.random() * 6) * Math.sign(a1 - a0), out = 1 + Math.random() * 4;   /* 칼끝 불티: 주황 불티(뜨거움)와 푸른 빛(차가움)이 섞여 바깥으로 */
            emit(FS.x + bx * rr, FLY.HOVER, FS.z + bz * rr, -bz * v + bx * out, Math.random() * 1.5, bx * v + bz * out, hot ? 1.45 : 1.1, hot ? .62 : 1.2, hot ? .22 : 1.35, hot ? .05 + Math.random() * .05 : .06, .2 + Math.random() * .2, 0, hot ? 3 : 1); } });   /* 칼끝 불티 */
        if (bladeA) { const sgn = Math.sign(bladeA[2] || 1); drawBlade(FS.x, FS.z, bladeA[0], bladeA[1] - .3, useSec ? .32 : .24, 1, useSec ? .04 : .14, -sgn); SL.lastBlade = bladeA;
          const H = SL.ah || (SL.ah = []); H.push([t, bladeA[0]]); while (H.length > 2 && H[0][0] < t - .06) H.shift(); const span = bladeA[0] - H[0][1];   /* 지난 0.06초 동안 칼이 지난 각 */
          if (!useSec) drawFan(FS.x, FS.z, bladeA[0], span, bladeA[1], 1); } else { bladeM.visible = false; fan.visible = false; } }
      if (k >= 1) { FS.vx *= .2; FS.vz *= .2; SL.st = 3; SL.t2 = t; bladeM.visible = false; fan.visible = false; SL.ah = null; for (const tr of trails) tr.prevA = null; } return; }
    if (SL.st === 3) { const ce = t - SL.t2; bladeM.visible = false; fan.visible = false; vig.style.opacity = 0; sec.visible = sty === STY.A && ce < .05; if (sec.visible) { secM.uniforms.uP.value = 1; secM.uniforms.uFade.value = Math.min(1, ce / .05); secM.uniforms.uT.value = t; }   /* 다 휘두르면 0.05초 안에 바로 사라짐 (사용자: 끝난 뒤 선이 남으면 안 됨) */
      if (ce >= CD) {   /* ③ '쩡': 자국(또는 선)이 벌어지며 터짐 · 한꺼번에 베임 · 짧게 멈칫 */
        SL.st = 0; SL.tc = t; for (const j of SL.pend) if (j.on && j.dieT < 0) cutHit(j, t, c); if (SL.pend.length) FS.stopUntil = performance.now() + 60;
        if (sty === STY.D) drawCrescent(FS.x, FS.z, dir, c.reach + .4); else { const sw0 = sty.sweeps(SL.sg)[0], ka = dir + Math.sign(sw0[1] - sw0[0]) * 1.57 * D2R * 57.3; FS.kx = -Math.sin(ka) * .6; FS.kz = -Math.cos(ka) * .6; FS.kT = performance.now(); }
        for (const tr of trails) for (let i = 0; i < 14 && tr.pts.length > 1; i++) { const p = tr.pts[Math.floor(Math.random() * tr.pts.length)], a = Math.random() * 6.283, v = 2 + Math.random() * 5; emit(p[0], FLY.HOVER, p[1], Math.cos(a) * v, .5 + Math.random() * 1.5, Math.sin(a) * v, 1.2, 1.25, 1.4, .06 + Math.random() * .04, .25 + Math.random() * .2); }
        if (SL.lastBlade && sty === STY.A) { const [ba, br] = SL.lastBlade, bx = -Math.sin(ba), bz = -Math.cos(ba); for (let i = 0; i < 26; i++) { const r = .8 + Math.random() * (br - .6), px_ = FS.x + bx * r, pz_ = FS.z + bz * r, a = Math.random() * 6.283, v = 1.5 + Math.random() * 4; emit(px_, FLY.HOVER, pz_, Math.cos(a) * v, .5 + Math.random() * 2, Math.sin(a) * v, .5, .95, 1.35, .05 + Math.random() * .05, .35 + Math.random() * .3, 0, 1.5); } SL.lastBlade = null; }   /* 홀로그램 칼날이 조각나 흩어짐 */
        if (A.live()) { hiss('highpass', 4500, .7, .12, .12, 0, .35); osc('sine', 2900, 2800, .3, .05); osc('sine', 120, 60, .25, .1); } } } };   /* 쩡: 높은 쇳소리 + 묵직한 울림 */
  /* ── 버튼 ── */
  const st = document.createElement('style'); st.textContent = `
    #fireB{position:fixed;right:calc(max(16px,env(safe-area-inset-right,0px)) + 30px);bottom:calc(env(safe-area-inset-bottom,0px) + 92px);width:96px;height:96px;border-radius:50%;z-index:6;touch-action:none;user-select:none;-webkit-user-select:none;
      background:radial-gradient(circle at 50% 40%,rgba(40,52,30,.55),rgba(6,9,6,.72));box-shadow:0 0 0 1.5px rgba(var(--sc,185,255,74),.32) inset,0 6px 22px rgba(0,0,0,.45);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
    #fireB .ring{position:absolute;inset:-5px;border-radius:50%;background:conic-gradient(from 0deg,var(--hc,#b9ff4a) var(--h,0deg),rgba(255,255,255,.07) 0);
      -webkit-mask:radial-gradient(circle,transparent 47px,#000 48px,#000 52px,transparent 53px);mask:radial-gradient(circle,transparent 47px,#000 48px,#000 52px,transparent 53px);filter:drop-shadow(0 0 4px var(--hc,#b9ff4a))}
    #fireB .chg{position:absolute;inset:6px;border-radius:50%;background:conic-gradient(from 0deg,rgba(235,245,255,.85) var(--c,0deg),transparent 0);opacity:0;transition:opacity .15s;
      -webkit-mask:radial-gradient(circle,transparent 39px,#000 40px,#000 42px,transparent 43px);mask:radial-gradient(circle,transparent 39px,#000 40px,#000 42px,transparent 43px)}
    #fireB.chging .chg{opacity:1}
    #fireB .seg{position:absolute;inset:6px;border-radius:50%;opacity:0;transition:opacity .15s;background:conic-gradient(from -2deg,#05070c 0 4deg,transparent 4deg 120deg,#05070c 120deg 124deg,transparent 124deg 240deg,#05070c 240deg 244deg,transparent 244deg);   /* 세 칸으로 나눈 틈 */
      -webkit-mask:radial-gradient(circle,transparent 38px,#000 39px,#000 43px,transparent 44px);mask:radial-gradient(circle,transparent 38px,#000 39px,#000 43px,transparent 44px)}
    #fireB.chging .seg{opacity:1}
    #fireB.st1 .chg{filter:drop-shadow(0 0 3px rgba(200,225,255,.6))}#fireB.st2 .chg{filter:drop-shadow(0 0 5px rgba(200,225,255,.85))}#fireB.st3 .chg{filter:drop-shadow(0 0 8px #fff);animation:stF .09s infinite alternate}
    @keyframes stF{from{transform:translate(-.6px,0)}to{transform:translate(.6px,.4px)}}
    #fireB .knob{position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;transition:opacity .2s;
      background:radial-gradient(circle at 50% 42%,#fff 0 3px,rgba(var(--sc,185,255,74),.95) 4px,rgba(var(--sc,185,255,74),.45) 9px,rgba(var(--sc,185,255,74),0) 20px)}
    #fireB .knob::after{content:'';position:absolute;left:50%;top:-2px;width:4px;height:16px;margin-left:-2px;border-radius:2px;background:linear-gradient(rgba(255,255,255,0),rgba(255,255,255,.8));opacity:var(--ka,.0)}
    #fireB .lab{position:absolute;left:-20px;right:-20px;bottom:-20px;text-align:center;font-size:11px;letter-spacing:.06em;color:rgba(var(--sc,185,255,74),.85);text-shadow:0 1px 3px #000;white-space:nowrap}
    #fireB.on{box-shadow:0 0 0 1.5px rgba(var(--sc,185,255,74),.7) inset,0 0 26px rgba(var(--sc,185,255,74),.25)}
    #fireB.hot{animation:fbHot .5s infinite alternate}#fireB.hot .knob{opacity:.35}#fireB.hot .lab{color:#ff9a5a}
    @keyframes fbHot{from{box-shadow:0 0 0 1.5px rgba(255,110,50,.55) inset,0 0 10px rgba(255,90,30,.2)}to{box-shadow:0 0 0 1.5px rgba(255,140,60,.9) inset,0 0 26px rgba(255,90,30,.45)}}`;
  document.head.appendChild(st);
  const btn = document.createElement('div'); btn.id = 'fireB'; btn.innerHTML = '<div class="ring"></div><div class="chg"></div><div class="seg"></div><div class="knob"></div><div class="lab"></div>'; document.body.appendChild(btn);
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
  const setType = id => { if (!SHOT[id]) return; cid = id; cfg = SHOT[id]; S.ch = 0; S.stage = 0; S.acc = .999; whine.stop(); try { SL.aim = 0; pv.visible = false; } catch (_) {} FS.extraSlow = 0;   /* 열은 그대로 이어짐 (바꿔서 식히는 꼼수 막음) */
    scRGB = cfg.col.map(v => Math.min(255, Math.round(Math.sqrt(v) * 255))).join(','); btn.style.setProperty('--sc', scRGB); lab.textContent = cfg.name; };
  setType('rapid');
  G.userData.setType = setType; Object.defineProperty(G.userData, 'type', { get: () => cid });
  G.userData.input = I;
  G.userData.sparks = (x, z, r, g, b, n) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = 2 + Math.random() * 4; emit(x, FLY.HOVER, z, Math.cos(a) * sp, 1 + Math.random() * 2, Math.sin(a) * sp, r, g, b, .09, .3 + Math.random() * .3); } };
  const hitSparks = (x, z, nx, nz, n, rainbow, col) => { for (let i = 0; i < n; i++) { const a = Math.atan2(nz, nx) + (Math.random() - .5) * 2.2, sp = 4 + Math.random() * 7, [r, g, b] = rainbow ? spec(Math.random()) : col ? col : [1.4, .7 + Math.random() * .4, .25];
    emit(x, FLY.HOVER, z, Math.cos(a) * sp, 1.5 + Math.random() * 3, Math.sin(a) * sp, r * 1.2, g * 1.2, b * 1.2, .09 + Math.random() * .06, .25 + Math.random() * .3); }
    emit(x, FLY.HOVER, z, 0, 0, 0, 1.2, 1.15, 1, .8, .09, 4, 0); };                                       /* 닿은 순간 번쩍 */
  /* 한 번 쏘기: k = 모은 정도(모아 쏘기만) */
  const fire = (t, k = 1, lv = 3) => { const c = cfg; if (c.blade) return; S.nFired = (S.nFired || 0) + (c.n || 1); const n = c.n || 1, base = S.aimA, sp = (c.ang || 0) * Math.PI / 180, tg = S.lock;
    for (let i = 0; i < n; i++) { const b = BU[bI = (bI + 1) % MAXB];
      let a = base + (Math.random() - .5) * (c.jit || 0) * Math.PI / 180 * 2;
      if (c.pat === 'v') a += (i ? 1 : -1) * sp / 2; else if (c.pat === 'fan') a += (i / (n - 1) - .5) * sp + (Math.random() - .5) * sp / n * .5;
      const side = 0;
      const v = c.speed * (1 + (Math.random() - .5) * 2 * (c.spd || 0)), vk = v / c.speed, dx = -Math.sin(a), dz = -Math.cos(a), full = c.chargeT ? lv >= 3 : k >= .98;
      Object.assign(b, { on: true, c, x: FS.x + dx * 1.15, z: FS.z + dz * 1.15, vx: dx * v, vz: dz * v, age: 0, life: Math.max(.5, rngOf(c, lv) - 1.15) / v * (vk < 1 ? vk : 1) * (c.lifeK || 1), bo: 0, cbo: 0, cry: c.cryB, wall: c.wallB, dead: -1,
        dmg: Array.isArray(c.dmg) && c.dmg.length === 3 ? c.dmg[lv - 1] : pick(c.dmg, k), R: pick(c.R, k), W: pick(c.W, k), tail: pick(c.tail, k), head: pick(c.head, k), hits: 1 + (c.pierce || (full ? c.pierceFull || 0 : 0)), knock: c.knock || (full ? c.knockFull || 0 : 0),
        hm: c.homing ? tg : null, split: 0, col: null, tg: null, tx: FS.x - Math.sin(base) * rngOf(c, lv) * .55, tz: FS.z - Math.cos(base) * rngOf(c, lv) * .55, side });
      b.hist.length = 0; b.hitL.length = 0; b.hist.push([FS.x + dx * .6, FS.z + dz * .6]); }
    const dx = -Math.sin(base), dz = -Math.cos(base), big = c.kind === 4 || c.kind === 3;
    emit(FS.x + dx * 1.1, FLY.HOVER, FS.z + dz * 1.1, FS.vx, 0, FS.vz, 1.1, 1.2, .9, big ? .9 + k * .5 : .55, big ? .1 : .06, 3, 0);   /* 쏘는 불빛 */
    if (c.kind === 5) for (let i = 0; i < 10; i++) { const a = base + (Math.random() - .5) * sp * 1.2, s = 6 + Math.random() * 8; emit(FS.x + dx * 1.2, FLY.HOVER, FS.z + dz * 1.2, -Math.sin(a) * s, .5 + Math.random(), -Math.cos(a) * s, 1.3, 1, .6, .05 + Math.random() * .04, .12 + Math.random() * .12); }   /* 흩뿌림: 총구에서 불티가 확 퍼짐 */
    if (c.kind === 4) for (let i = 0; i < 8; i++) { const a = base + Math.PI + (Math.random() - .5) * 1.6, s = 2 + Math.random() * 3; emit(FS.x + dx * .8, FLY.HOVER, FS.z + dz * .8, -Math.sin(a) * s, 1 + Math.random(), -Math.cos(a) * s, 1.2, .5, .15, .07, .3 + Math.random() * .3); }   /* 무거운 탄: 뒤로 튀는 쇳물 방울 */
    if (c.selfPush) { FS.dashUntil = t + .1; FS.dashVx = -dx * c.selfPush / .1; FS.dashVz = -dz * c.selfPush / .1; FS.dashEndK = .1; FS.rc = 2;   /* 근접탄: 쏘는 순간 0.1초 동안 조이스틱보다 먼저 뒤로 확 밀림 */
      for (let i = 0; i < 8; i++) { const a = base + (Math.random() - .5) * 1.4, v = 2 + Math.random() * 3; emit(FS.x + Math.sin(base) * .9, .25, FS.z + Math.cos(base) * .9, Math.sin(a) * v, .4 + Math.random(), Math.cos(a) * v, .55, .5, .45, .08 + Math.random() * .05, .35 + Math.random() * .25, 0, 3); } }   /* 엔진 쪽 바닥 먼지 */   /* 근접탄: 쏜 사람도 뒤로 밀려남 → 쏠수록 거리가 벌어져 넉백만 계속 거는 게 저절로 막힘 */
    FS.rc = Math.min(2, pick(c.recoil, k)); if (c.shake) FS.shake = Math.max(FS.shake || 0, c.shake);
    if (c.kind === 3 && lv >= 3) FS.shake = Math.max(FS.shake || 0, .3);
    play(c.snd, k); };
  const dmgHit = (b, j, t) => { const c = b.c, first = !b.hitL.length, d = b.dmg * (b.bo > 0 ? 1.5 : 1) * (first ? 1 : c.pierceK || .7);
    const l = Math.hypot(b.vx, b.vz) || 1, killed = mobs.userData.hit(j, t, b.vx / l, b.vz / l, d, { knock: b.knock, stun: c.stun, slow: c.slow, slowMax: c.slowMax, slowT: c.slowT });
    b.hitL.push(j); onDamage?.(j, d, c, b.bo > 0); return killed; };
  /* 프리즘: 튕기는 순간 세 갈래 무지개로 갈라짐 (빨강·초록·파랑 결 · 하나당 피해 60%) */
  const PC = [[1.25, .38, .42], [.45, 1.2, .5], [.45, .6, 1.3]];
  const split = (b, t) => { if (!b.c.prism || b.split) return; b.split = 1; b.dmg *= .6; b.col = PC[1]; const sp = Math.hypot(b.vx, b.vz), a0 = Math.atan2(b.vz, b.vx);
    for (const sg of [-1, 1]) { const k = BU[bI = (bI + 1) % MAXB]; if (k === b) continue; const a = a0 + sg * .32;
      Object.assign(k, { on: true, c: b.c, x: b.x, z: b.z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, age: 0, life: rngOf(b.c) / sp, bo: b.bo, cbo: b.cbo, cry: 0, wall: 0, dead: -1, dmg: b.dmg, R: b.R, W: b.W * .85, tail: b.tail * .85, head: b.head * .8, hits: 1, knock: 0, hm: null, split: 1, col: PC[sg < 0 ? 0 : 2] });
      k.hist.length = 0; k.hist.push([b.x - Math.cos(a) * .05, b.z - Math.sin(a) * .05]); k.hitL.length = 0; }
    b.cry = 0; b.wall = 0; b.age = 0; b.life = rngOf(b.c) / sp; for (let i = 0; i < 14; i++) { const a = a0 + (Math.random() - .5) * 1.2, v = 3 + Math.random() * 5, [r, g, bb] = spec(Math.random()); emit(b.x, FLY.HOVER, b.z, Math.cos(a) * v, .5 + Math.random() * 1.5, Math.sin(a) * v, r * 1.3, g * 1.3, bb * 1.3, .06, .3 + Math.random() * .2); }
    if (A.live()) { osc('sine', 2600, 2550, .25, .04); osc('sine', 3300, 3250, .2, .03, .02); osc('sine', 3900, 3850, .18, .025, .04); } };   /* 세 음이 차례로 울림 */
  const reveal = (x, z, c) => { if (!c.reveal) return; stamp(x, z, c.reveal, 0, c.revealT); onReveal?.(x, z, c.reveal, c.revealT); };

  const tmp = [0, 0];
  G.userData.update = (t, dt, px) => {
    headM.uniforms.uPx.value = px * .75; partM.uniforms.uPx.value = px; headM.uniforms.uT.value = t; tailM.uniforms.uT.value = t; muzM.uniforms.uPx.value = px; muzM.uniforms.uT.value = t; decM.uniforms.uT.value = t;
    const c = cfg, want = I.held || I.key, shooting = want && !S.over;
    /* 자동 조준 (사용자 2026-11-04): 한 번 잡은 적은 쓰러지거나 멀어질 때까지 계속 노림 → 쓰러지면 0.15초 뒤 그 바로 옆 적으로 넘어감 · 조준 거리는 탄마다 */
    { const R2 = c.aimR * c.aimR, alive = j => j && j.on && j.dieT < 0, d2 = (j, x, z) => (j.x - x) * (j.x - x) + (j.z - z) * (j.z - z);
      const vis = j => !canSee || canSee(j.x, j.z);   /* 안 보이는 곳(안개·벽 뒤)의 적은 자동 조준 안 함 (사용자 2026-11-04) */
      const near = (x, z) => { let b = null, bd = 1e18; if (mobs) for (const j of mobs.userData.list) { if (!alive(j) || d2(j, FS.x, FS.z) > R2 || !vis(j)) continue; const d = d2(j, x, z); if (d < bd) { bd = d; b = j; } } return b; };
      if (S.lock && !alive(S.lock)) { if (S.lock.dieT > 0) { LK.done = t; LK.dx = S.lock.x; LK.dz = S.lock.z; S.next = t + .15; } S.lockLost = S.lock; S.lock = null; }
      const KEEP2 = R2 * 2.25;   /* 한 번 잡은 적은 사거리 1.5배까지 놓지 않음 (사용자 2026-11-04: 밀려나거나 움직여도 다른 적으로 넘어가지 않게) */
      if (S.lock && (d2(S.lock, FS.x, FS.z) > KEEP2 || !vis(S.lock))) { S.lock = null; S.noAuto = true; }   /* 쓰러진 게 아니라 놓친 거면 — 다시 누르기 전엔 새로 안 잡음 */
      S.lockOut = !!(S.lock && d2(S.lock, FS.x, FS.z) > R2);
      if (!(I.held && I.drag) && want && !S.lock && !S.noAuto && t >= (S.next || 0)) S.lock = S.lockLost && S.lockLost.dieT > 0 ? near(S.lockLost.x, S.lockLost.z) : near(FS.x, FS.z);   /* 쓰러진 적 바로 옆부터 */
      if (!want && !(S.ch > 0)) { S.lock = null; S.lockLost = null; S.noAuto = false; } }
    if (want) S.aimA = I.held && I.drag ? I.ang : S.lock ? Math.atan2(-(S.lock.x - FS.x), -(S.lock.z - FS.z)) : t < (S.next || 0) ? S.aimA : (Math.hypot(FS.vx, FS.vz) > 1.5 ? FS.mh ?? FS.head : FS.head);   /* 노릴 적이 없으면: 움직이는 중엔 가는 쪽 · 서 있으면 바라보는 앞쪽 (예전 방향으로 계속 쏘던 것 고침) */
    if (!want) S.aimA0 = FS.head;
    if (c.blade) { S.aimA = FS.head; S.lock = null; }   /* 빛 칼날: 늘 기체 앞쪽만 벰 — 끌어도 방향이 안 바뀌고 자동 조준도 없음 (사용자 2026-11-04) */
    FS.aim = want && !c.blade ? S.aimA : null; FS.fireSlow = c.fireSlow;
    const heatPer = c.heatShots ? 1 / c.heatShots : c.heatT ? 1 / (c.heatT * c.rate) : 0,   /* 빛 칼날: 세 번 베면 과열 */ cool = .7 / (c.coolT * .8);
    FS.turnCap = (c.chargeT && S.ch > 0) || (c.beam && shooting) ? 1.22 : null;   /* 빛 칼날은 slashStep에서 다시 정함 */   /* 모으는 동안·비추는 동안 조준이 아주 느리게 돎 (1초에 70°) */
    if (!c.blade) pv.visible = false;
    beamStep(t, dt, !!(c.beam && shooting), c); slashStep(t, dt);
    if (c.beam) { muzM.uniforms.uA.value = 0; pth.visible = false; if (shooting) { S.lastShot = t; S.heat += dt / c.heatT; if (S.heat >= 1) { S.heat = 1; S.over = true; FS.heatFlash = 1; FS.shake = 1; flare(); crack(); } } }   /* 빛줄기: 비추는 동안 열이 차오름 */
    else if (c.chargeT) {   /* 모아 쏘기: 누르는 동안 모음(65% 느려짐) → 떼면 나감. 세 단계 (0.25초 · 0.55초 · 0.8초) — 피해 6 → 13 → 22 */
      const TH = c.chargeTH.map(x => x / c.chargeT);
      if (shooting && t >= S.chOk) { S.ch = Math.min(1, S.ch + dt / c.chargeT); FS.fireSlow = c.chargeSlow; whine.set(S.ch);
        const st = S.ch >= TH[2] ? 3 : S.ch >= TH[1] ? 2 : S.ch >= TH[0] ? 1 : 0;
        if (st > (S.stage || 0)) { S.stage = st; S.stT = t; const nx = FS.x - Math.sin(FS.head) * 1.3, nz = FS.z - Math.cos(FS.head) * 1.3;   /* 단계가 오름: 빛 고리가 퍼지고 · 알갱이가 튐 · 한 단계 높은 맑은 울림 */
          for (let i = 0; i < 8 + st * 6; i++) { const a = Math.random() * 6.283, v = 2 + st * 1.5 + Math.random() * 2; emit(nx, FLY.HOVER, nz, Math.cos(a) * v, Math.random() * 1.5, Math.sin(a) * v, .8, .9, 1.3, .05 + .02 * st, .25 + Math.random() * .2, 0, 2); }
          bounceTing([0, 1900, 2500, 3200][st]); FS.vx *= .35; FS.vz *= .35; FS.rc = Math.max(FS.rc || 0, .8);   /* 단계가 오르는 순간 기체가 짧게 멈칫 (힘이 차오르는 손맛) */ if (st === 3) { emit(nx, FLY.HOVER, nz, 0, 0, 0, 1, 1.1, 1.3, 1.6, .12, 6, 0); FS.shake = Math.max(FS.shake || 0, .15); } }
        const nx = FS.x - Math.sin(FS.head) * 1.3, nz = FS.z - Math.cos(FS.head) * 1.3;
        if (Math.random() < dt * (24 + 40 * S.ch) * (S.stage >= 3 ? .4 : 1)) { const a = Math.random() * 6.283, r = 1.4 + Math.random() * 1.8; emit(nx + Math.cos(a) * r, FLY.HOVER + (Math.random() - .5), nz + Math.sin(a) * r, -Math.cos(a) * r * 4 - Math.sin(a) * 2, 0, -Math.sin(a) * r * 4 + Math.cos(a) * 2, .8, .9, 1.3, .06, .22, 0, 0, 0); }   /* 둘레 빛이 소용돌이치며 빨려 듦 */
        if (S.stage >= 3 && Math.random() < dt * 30) { const a = FS.head + Math.PI + (Math.random() - .5) * .8, v = 3 + Math.random() * 3; emit(nx, FLY.HOVER, nz, -Math.sin(a) * v, Math.random(), -Math.cos(a) * v, .9, 1, 1.3, .04, .18, 0, 1); }   /* 넘치는 힘: 뒤로 새는 불티 */
        mzP[0] = nx; mzP[1] = FLY.HOVER; mzP[2] = nz; mzG.attributes.position.needsUpdate = true;
        drawPath(nx, nz, FS.head, rngOf(c, Math.max(1, S.stage || 0)) - 1.3, c.cryB, S.stage); }
      else if (!want && S.ch > 0) { const lv = Math.max(1, S.stage || 0); if (!S.over) { S.aimA = FS.head; fire(t, lv / 3, lv);   /* 나가는 쪽 = 느리게 돌아온 몸 방향 */ S.lastShot = t; S.heat += c.heatFull * lv / 3; if (S.heat >= 1) { S.heat = 1; S.over = true; FS.heatFlash = 1; FS.shake = 1; flare(); crack(); } }
        S.chOk = t + Math.max(.05, 1 / c.rate - c.chargeT); S.ch = 0; S.stage = 0; whine.stop(); muzM.uniforms.uPop.value = 0; }
      { const SZ = [1.2, 2.2, 3.6, 5.6], goal = S.ch > 0 ? SZ[S.stage || 0] * (S.stage ? 1 : .6 + .4 * Math.min(1, S.ch / TH[0])) : 0;   /* 에너지 크기 = 단계: 손톱만 → 기체 반만 → 기체만. 단계가 오르면 용수철처럼 '툭' 넘치게 부풀었다 자리 잡음 */
        S.szV = (S.szV || 0) + ((goal - (S.sz || 0)) * 260 - (S.szV || 0) * 16) * dt; S.sz = Math.max(0, (S.sz || 0) + S.szV * dt); if (!(S.ch > 0)) { S.sz = 0; S.szV = 0; } muzM.uniforms.uSz.value = S.sz; }
      const on = S.ch > 0, stv = (S.stage || 0) - Math.max(0, 1 - (t - (S.stT || 0)) / .12) * (S.stage ? 1 : 0);   /* 단계 사이를 0.12초에 걸쳐 넘어감 */
      muzM.uniforms.uA.value += ((on ? .55 + .45 * S.ch : 0) - muzM.uniforms.uA.value) * Math.min(1, dt * 20); muzM.uniforms.uSt.value = on ? Math.max(S.ch / TH[0] * .6, stv) : 0;
      muzM.uniforms.uPop.value = on ? Math.max(0, 1 - (t - (S.stT || -9)) / .3) : 0; muzM.uniforms.uDir.value.set(-Math.sin(FS.head), Math.cos(FS.head));
      ppM.uniforms.uA.value += ((on ? 1 : 0) - ppM.uniforms.uA.value) * Math.min(1, dt * 14); ppM.uniforms.uSt.value = S.stage || 0; ppM.uniforms.uT.value = t; pth.visible = ppM.uniforms.uA.value > .01; }
    else if (c.blade) { muzM.uniforms.uA.value = 0; pth.visible = false;   /* 빛 칼날: 누르고 있는 동안 자세 잡기 → 떼면 바라보는 쪽으로 베며 나감 */
      const W = c.windup || .18, sty = STY[c.style] || STY.A, R0 = c.reach + .6;
      if (want && !S.over && !SL.st && !SL.aim && t >= (S.bladeOk || 0)) { SL.aim = 1; SL.h0 = t; SL.sg = -SL.sg; }
      if (SL.aim) { const k = Math.min(1, (t - SL.h0) / W), sw0 = sty.sweeps(SL.sg)[0], a = sw0 ? FS.head + sw0[0] * D2R * (.6 + .4 * k) : FS.head;
        FS.extraSlow = .3; drawBlade(FS.x, FS.z, a, c.reach + 1, .32, .7 + .3 * k, .04); bdM.uniforms.uRev.value = Math.min(1, k * 1.25); bdM.uniforms.uT.value = t;
        pv.visible = true; pv.position.set(FS.x - Math.sin(FS.head) * sty.lunge * .5, .08, FS.z - Math.cos(FS.head) * sty.lunge * .5);
        pvM.uniforms.uS.value.set(FS.x, FS.z); pvM.uniforms.uE.value.set(-Math.sin(FS.head), -Math.cos(FS.head)); pvM.uniforms.uL.value = sty.lunge; pvM.uniforms.uR.value = R0; pvM.uniforms.uCot.value = 1 / Math.tan(80 * D2R); pvM.uniforms.uT.value = t; pvM.uniforms.uRdy.value = k >= 1 ? 1 : 0; pvM.uniforms.uA.value += (1 - pvM.uniforms.uA.value) * Math.min(1, dt * 14);
        if (Math.random() < dt * 40 * k) { const bx = -Math.sin(a), bz = -Math.cos(a), r = .8 + Math.random() * (c.reach + 1), a2 = Math.random() * 6.283, px_ = FS.x + bx * r, pz_ = FS.z + bz * r, sx = px_ + Math.cos(a2) * 1.4, sz = pz_ + Math.sin(a2) * 1.4; emit(sx, FLY.HOVER, sz, (px_ - sx) * 7, 0, (pz_ - sz) * 7, .6, .95, 1.25, .045, .14, 0, 0, 0); }   /* 칼로 빛이 빨려 듦 */
        if (S.over) { SL.aim = 0; }
        else if (!want && t - SL.h0 >= W) { SL.aim = 0; pv.visible = false; FS.extraSlow = 0; slash(t); SL.t0 = t - W - 1e-4;   /* 떼는 순간: 준비는 끝난 셈 → 곧바로 튀어 나가며 벰 */
          S.nFired = (S.nFired || 0) + 1; S.lastShot = t; S.heat += 1 / (c.heatShots || 3); S.bladeOk = t + 1 / c.rate; if (S.heat >= 1) { S.heat = 1; S.over = true; FS.heatFlash = 1; FS.shake = 1; flare(); crack(); } } }
      else { FS.extraSlow = 0; pvM.uniforms.uA.value = Math.max(0, pvM.uniforms.uA.value - dt * 10); pv.visible = pvM.uniforms.uA.value > .01 && false; } }
    else { muzM.uniforms.uA.value = 0; pth.visible = false;
      if (shooting) { S.acc += dt * c.rate; if (S.acc > 1.5) S.acc = 1.5; while (S.acc >= 1) { S.acc -= 1; fire(t); S.lastShot = t; S.heat += heatPer; if (S.heat >= 1) { S.heat = 1; S.over = true; S.acc = 0; FS.heatFlash = 1; FS.shake = 1; flare(); crack(); break; } } }
      else S.acc = Math.min(.999, S.acc + dt * c.rate); }                                                     /* 쉬는 동안 다음 발이 준비됨 → 누르는 순간 바로 첫 발 */
    if ((t - S.lastShot > (c.coolWait ?? .3) && !(S.ch > 0) && !SL.aim) || S.over) S.heat = Math.max(0, S.heat - dt * cool * (S.over ? .8 : 1));
    if (S.over && S.heat <= .3) S.over = false;
    /* 버튼: 열 고리 · 모으는 고리 */
    { const h = S.heat, hc = S.over ? '#ff6a2a' : h > .7 ? '#ffb347' : h > .4 ? '#e8ff8a' : `rgb(${scRGB})`;
      btn.style.setProperty('--h', (h * 360).toFixed(1) + 'deg'); btn.style.setProperty('--hc', hc); btn.style.setProperty('--c', (S.ch * 360).toFixed(1) + 'deg');
      btn.classList.toggle('hot', S.over); btn.classList.toggle('on', want && !S.over); btn.classList.toggle('chging', S.ch > 0); for (let k = 1; k <= 3; k++) btn.classList.toggle('st' + k, S.ch > 0 && (S.stage || 0) === k); lab.textContent = S.over ? '과열' : S.ch > 0 && S.stage ? c.name + ' · ' + S.stage + '단계' : c.name; }
    /* 사거리 원: 누르는 동안 (모아 쏘기는 모으는 동안) */
    { const on = (want || S.ch > 0) && !c.blade; rgA += ((on ? 1 : 0) - rgA) * Math.min(1, dt * (on ? 12 : 6)); rg.visible = rgA > .01;
      if (rg.visible) { const goal = c.chargeT ? rngOf(c, Math.max(1, S.stage || 0)) : c.range, k0 = on && rgA < .5 ? 1.25 : 1; rgR += (goal * k0 - rgR) * Math.min(1, dt * (c.chargeT && S.ch > 0 ? 6 : 14));   /* 모아 쏘기: 단계가 오르면 원이 스르르 넓어짐 */ rg.position.set(FS.x, .06, FS.z);
        rgM.uniforms.uR.value = rgR; rgM.uniforms.uA.value = rgA; rgM.uniforms.uT.value = t; rgM.uniforms.uHeat.value = S.heat; rgM.uniforms.uC.value.set(...c.col);
        const E = rgM.uniforms.uE.value, cand = []; if (mobs) for (const j of mobs.userData.list) { if (!j.on || j.dieT > 0) continue; const dx = j.x - FS.x, dz = j.z - FS.z, d = Math.hypot(dx, dz); if (d > c.range || d < .5 || (canSee && !canSee(j.x, j.z))) continue; cand.push([d, dx / d, -dz / d, j === S.lock]); }
        cand.sort((a, b) => a[0] - b[0]); for (let i = 0; i < 6; i++) { const q = cand[i]; if (q) E[i].set(q[1], q[2], q[3] ? 1 : .5, 0); else E[i].set(0, 0, 0, 0); } } }
    /* 과열은 기체 금속이 달아오르는 것으로 (시안 B · shipheat.js) — 기체에는 50%부터 보임 */
    { FS.heatV = S.heat; FS.heatFlash = Math.max(0, (FS.heatFlash || 0) - dt * 2.2);
      const L = S.lock, de = t - LK.done;
      if (de < .15) { LK.x = LK.dx; LK.z = LK.dz; LK.sc *= Math.exp(-dt * 18); LK.a = 1 - de / .15; }                                     /* 쓰러진 자리에서 작게 오므라듦 */
      else if (L && (want || S.ch > 0)) { const fresh = LK.a < .05; if (fresh) { LK.x = L.x; LK.z = L.z; LK.sc = L.s * .3; }
        const k = Math.min(1, dt * 14); LK.x += (L.x - LK.x) * k; LK.z += (L.z - LK.z) * k; LK.sc += (L.s * .95 - LK.sc) * Math.min(1, dt * 10); LK.a += (1 - LK.a) * Math.min(1, dt * 10); }   /* 새 표적 발밑으로 스르르 */
      else { LK.a += (0 - LK.a) * Math.min(1, dt * 10); }
      lk.visible = LK.a > .01; lk.position.set(LK.x, .07, LK.z); lk.scale.setScalar(Math.max(.01, LK.sc)); lkM.uniforms.uA.value = LK.a; lkM.uniforms.uT.value = t; lkM.uniforms.uOut.value += ((S.lockOut ? 1 : 0) - lkM.uniforms.uOut.value) * Math.min(1, dt * 10); }
    /* 크게 밀려나는 해파리: 밀려나는 길에 빛 자국 */
    if (mobs) for (const j of mobs.userData.list) { if (!j.on || !(t < (j.kbUntil || 0))) continue; const v = Math.hypot(j.vx, j.vz); if (v > 5 && Math.random() < dt * 60) emit(j.x + (Math.random() - .5) * .4 * j.s, j.y - .2 + (Math.random() - .5) * .5, j.z + (Math.random() - .5) * .4 * j.s, -j.vx * .15, .3, -j.vz * .15, .9, .55, .35, .07 + Math.random() * .04, .35 + Math.random() * .2, 0, .5, 3); }
    /* 서리 맞은 해파리: 몸에 서리가 끼어 부스러기가 떨어짐 (느려진 만큼) */
    if (mobs) for (const j of mobs.userData.list) { if (!j.on || j.dieT > 0 || !(j.slowK > 0) || t > j.slowUntil) continue;
      if (Math.random() < dt * 40 * j.slowK) { const a = Math.random() * 6.283, r = .5 * j.s; emit(j.x + Math.cos(a) * r, j.y - .1 + (Math.random() - .3) * .6 * j.s, j.z + Math.sin(a) * r, j.vx * .6, -.2, j.vz * .6, .55, .85, 1.1, .05 + Math.random() * .04, .5 + Math.random() * .4, 0, 1.2, .5); } }
    /* 탄 움직임 */
    const P = bh?.userData.P;
    for (const b of BU) { if (!b.on) continue; const bc = b.c;
      if (b.dead >= 0) { b.dead += dt; if (b.dead > .09) b.on = false; continue; }                           /* 사라질 때 꼬리가 머리 쪽으로 따라 들어감 */
      b.age += dt; if (b.age > b.life) { b.dead = 0; const C = bc.col; for (let i = 0; i < 5; i++) { const a = Math.random() * 6.283, v = .6 + Math.random() * 1.2; emit(b.x, FLY.HOVER, b.z, Math.cos(a) * v + b.vx * .04, .2 + Math.random() * .6, Math.sin(a) * v + b.vz * .04, C[0] * C[0], C[1] * C[1], C[2] * C[2], .04 + Math.random() * .03, .3 + Math.random() * .25, 0, 2); }   /* 힘이 다한 탄: 남은 빛이 작은 불티로 흩어짐 */
        continue; }
      /* 유도탄: 보이는 적을 쫓음 (초당 4.2라디안까지 돎 · 노리던 적이 쓰러지거나 안 보이면 10m 안의 다른 보이는 적으로) */
      if (bc.homing && mobs) { const ok = j => j && j.on && j.dieT < 0 && (!canSee || canSee(j.x, j.z));
        if (!ok(b.hm)) { b.hm = null; let bd = 100; for (const j of mobs.userData.list) { if (!ok(j)) continue; const d = (j.x - b.x) * (j.x - b.x) + (j.z - b.z) * (j.z - b.z); if (d < bd) { bd = d; b.hm = j; } } }
        if (b.hm) { const va = Math.atan2(b.vz, b.vx), ta = Math.atan2(b.hm.z - b.z, b.hm.x - b.x); let d = Math.atan2(Math.sin(ta - va), Math.cos(ta - va)); const rot = Math.sign(d) * Math.min(Math.abs(d), dt * bc.homing * Math.min(1, .3 + b.age * 3)), sp = Math.hypot(b.vx, b.vz); b.vx = Math.cos(va + rot) * sp; b.vz = Math.sin(va + rot) * sp; } }
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
          if (bc.mobBounce && b.wall > 0) {   /* 튕김탄: 맞힌 몹에서도 맞은 면에 맞춰 튕김 · 그 자리부터 사거리 다시 · 벽과 합쳐 세 번까지 */
            const ox = b.x - hj.x, oz = b.z - hj.z, ol = Math.hypot(ox, oz) || 1, wx = ox / ol, wz = oz / ol, vn = b.vx * wx + b.vz * wz; if (vn < 0) { b.vx -= 2 * vn * wx; b.vz -= 2 * vn * wz; } else { b.vx = -b.vx; b.vz = -b.vz; }
            b.wall--; b.bo++; b.age = 0; b.life = rngOf(bc) / Math.hypot(b.vx, b.vz); b.hist.push([b.x, b.z]); hitSparks(b.x, b.z, wx, wz, 9, true); bounceTing(2200 + b.bo * 300); b.hits = b.hitL.length + 1; continue; }
          if (b.hitL.length >= b.hits) { b.dead = 0; continue; } } }
      /* (튕김 공통) 튕김탄·프리즘·빛줄기는 튕기는 자리부터 사거리를 다시 셈 */
      /* 수정 기둥: 튕김 */
      const hit = b.cry > 0 && crystals ? crystals.userData.cross(b.x, b.z, nx, nz, .12) : null;
      if (hit) { const vn = b.vx * hit.nx + b.vz * hit.nz; if (vn < 0) { b.vx -= 2 * vn * hit.nx; b.vz -= 2 * vn * hit.nz; }
        b.x = hit.x + hit.nx * .05; b.z = hit.z + hit.nz * .05; b.bo++; b.cbo++; b.cry--; b.hist.push([b.x, b.z]); b.tg = null; if (bc.rangeReset) { b.age = 0; b.life = Math.max(.5, rngOf(bc) ) / Math.hypot(b.vx, b.vz); }
        crystals.userData.flash(t, hit.x - hit.nx * .1, FLY.HOVER, hit.z - hit.nz * .1); hitSparks(b.x, b.z, hit.nx, hit.nz, 10, true); split(b, t); continue; }
      /* 벽·와드: 그 벽 무늬가 빛남 · 튕김탄은 벽에서도 튕김(두 번) */
      if (B.blocked(nx, nz)) { let lo = 0, hi = 1; for (let k = 0; k < 6; k++) { const m = (lo + hi) / 2; if (B.blocked(b.x + (nx - b.x) * m, b.z + (nz - b.z) * m)) hi = m; else lo = m; }
        b.x += (nx - b.x) * lo; b.z += (nz - b.z) * lo; const l = Math.hypot(b.vx, b.vz) || 1; hitWall(b.x + b.vx / l * .3, FLY.HOVER, b.z + b.vz / l * .3, t);   /* 벽마다 만들어 둔 맞음 빛을 깨움 */
        if (b.wall > 0) { const e = .6, gx = B.field(b.x + e, b.z) - B.field(b.x - e, b.z), gz = B.field(b.x, b.z + e) - B.field(b.x, b.z - e), gl = Math.hypot(gx, gz);   /* 벽이 보는 쪽 = 벽 지도가 옅어지는 쪽 */
          let wx = -b.vx / l, wz = -b.vz / l; if (gl > 1e-4) { wx = -gx / gl; wz = -gz / gl; }
          const vn = b.vx * wx + b.vz * wz; if (vn < 0) { b.vx -= 2 * vn * wx; b.vz -= 2 * vn * wz; } else { b.vx = -b.vx; b.vz = -b.vz; }
          b.wall--; b.bo++; b.hist.push([b.x, b.z]); b.tg = null; if (bc.rangeReset) { b.age = 0; b.life = Math.max(.5, rngOf(bc)) / Math.hypot(b.vx, b.vz); } hitSparks(b.x, b.z, wx, wz, 9, true); if (b.c.prism) split(b, t); else bounceTing(2200 + b.bo * 300); continue; }
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
      const bc = b.c, C = b.col || bc.col, fk = Math.max(0, Math.min(1, (b.life - b.age) / (b.life * .28))), fe = fk * fk * (3 - 2 * fk), lifeK = b.dead >= 0 ? 0 : Math.max(.02, fe), grow = Math.min(1, b.age / .05);   /* 사거리 끝 28% 동안 힘이 빠짐: 머리가 작아지고 흐려지며 꼬리가 따라 들어옴 */
      const L = b.tail * grow * (b.dead >= 0 ? 0 : .25 + .75 * fe);
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
        const z = lifeK, kw = bc.kind + (b.bo && !b.col ? 16 : 0);
        tu[j * 3] = u; tu[j * 3 + 1] = 1; tu[j * 3 + 2] = z; tu[(j + 1) * 3] = u; tu[(j + 1) * 3 + 1] = -1; tu[(j + 1) * 3 + 2] = z;
        tc.set([C[0], C[1], C[2], kw], j * 4); tc.set([C[0], C[1], C[2], kw], (j + 1) * 4); }
      hp[bi * 3] = b.x; hp[bi * 3 + 1] = FLY.HOVER; hp[bi * 3 + 2] = b.z; ha.set([b.dead >= 0 ? 0 : lifeK, b.bo && !b.col ? 1 : 0, b.head * (.45 + .55 * fe), bc.kind], bi * 4); hc.set(C, bi * 3); }
    tg.attributes.position.needsUpdate = tg.attributes.aU.needsUpdate = tg.attributes.aC.needsUpdate = true; hg.attributes.position.needsUpdate = hg.attributes.aH.needsUpdate = hg.attributes.aC.needsUpdate = true;
    /* 부스러기 */
    for (let i = 0; i < NP; i++) { const p = PT[i]; if (p.l > 0) { p.l -= dt; p.vy -= p.fall * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 1 - dt * p.drag; p.vz *= 1 - dt * p.drag; if (p.y < .05) { p.y = .05; p.vy *= -.3; } p.s += p.grow * dt; }
      const k = Math.max(0, p.l / p.m); pp[i * 3] = p.x; pp[i * 3 + 1] = p.y; pp[i * 3 + 2] = p.z; pc[i * 4] = p.r * k; pc[i * 4 + 1] = p.g * k; pc[i * 4 + 2] = p.b * k; pc[i * 4 + 3] = p.l > 0 ? Math.max(.01, p.s) : 0; }
    pg.attributes.position.needsUpdate = pg.attributes.aC.needsUpdate = true;
  };
  return G;
}
