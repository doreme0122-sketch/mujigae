/* 태어나서 스킬 고르기 — 공격 · 이동 · 방해, 분류마다 기본 스킬 3개가 무작위로 나와 하나씩 고름
   순서 (한 분류)
   · 떠오름: 판 가운데에서 보석 셋이 나선을 그리며 기체 둘레로 떠오름 (기체가 태어난 그 자리에서 힘이 피어남)
   · 돌림: 보석이 빠르게 돌며 면마다 번쩍번쩍(아직 무엇인지 모름) → 하나씩 차례로 '딩' 하고 멈춤
           멈추면 그 보석이 스킬처럼 움직이기 시작함 — 보석 속에 그림을 넣지 않고 보석 자체가 스킬의 성질을 보여 줌
           (광선 = 보석을 꿰뚫는 빛, 번개 = 보석 속에서 튀는 번개, 순간 이동 = 보석이 깜빡 사라졌다 옆에 나타남 …)
   · 살펴보기(한 번 누름): 보석이 눈앞으로 다가오고 옆에 설명이 뜸. 기체가 판 위에서 그 스킬을 실제로 써 보임(되풀이)
   · 고르기(한 번 더 누름 / '이걸로 고르기'): 보석이 기체로 빨려 듦 → 분류 색 빛이 기체 머리에서 꼬리로 스침 + 판에 색 고리
           고르지 않은 둘은 깎인 면 조각대로 부서져 흩어짐
   · 시간 제한: 다른 사람들도 동시에 고르는 중 → 남은 초를 숫자로. 다 되면 살펴보던 것, 없으면 무작위
   다시 태어날 때는 같은 장면을 더 빠르게
   무게: 보석 하나 = 뒷면 · 앞면 · 둘레 빛 · 고리 4번 (+ 잔상 보석 2개는 쓸 때만) */
import * as THREE from 'three';
import * as A from '../core/audio.js';
import { pointPool, beamMesh } from './skilldemo.js?v=11100828';

/* 기본 등급 스킬 (임시 이름 — 실제 스킬은 스킬 설계 때 바뀜). 분류마다 다섯 중 셋이 무작위로 나옴 */
export const CATS = [
  { id: 'atk', name: '공격', en: 'ATTACK', col: [1.0, .26, .32], css: '255,92,104',
    list: [['무지개 산탄', '부채꼴로 다섯 발'], ['관통 광선', '벽 앞까지 꿰뚫는 빛줄기'], ['유도 결정', '가까운 적을 쫓아가는 결정'], ['연쇄 번개', '맞은 적 둘레로 옮겨붙음'], ['분열탄', '맞으면 작은 탄으로 갈라짐']] },
  { id: 'mov', name: '이동', en: 'MOVE', col: [.28, .66, 1.0], css: '92,176,255',
    list: [['순간 이동', '바라보는 쪽으로 짧게 건너뜀'], ['돌진', '짧고 빠르게 밀고 나감'], ['잔상 질주', '빨라지고 잔상이 남음'], ['반동 도약', '벽을 차고 튕겨 나감'], ['중력 미끄럼', '휘어 돌며 미끄러짐']] },
  { id: 'dis', name: '방해', en: 'DISRUPT', col: [.72, .36, 1.0], css: '184,110,255',
    list: [['거울 벽', '앞에 탄을 되받아치는 벽'], ['안개 폭탄', '떨어진 자리 시야를 가림'], ['감속 장', '안에 든 적이 느려짐'], ['끌어당김', '둘레 적을 한가운데로'], ['미끼 분신', '나를 닮은 가짜를 남김']] },
];
export const PICK = {
  first: { rise: .9, spin: 1.5, gap: .42, time: 15, rest: .55 },     /* 처음 태어날 때 */
  again: { rise: .5, spin: .7, gap: .22, time: 15, rest: .3 },       /* 다시 태어날 때: 같은 장면을 빠르게, 고르는 시간은 같게 15초 (사용자) */
};
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
const sm01 = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const ORBIT = 2.7, GEMR = .6, GEMY = 1.6;

/* ── 둥근 브릴리언트: 테이블 8각 · 별 면 8 · 마름모 면 8 · 윗 거들 면 16 · 거들 띠 · 아래 거들 면 16 · 파빌리온 면 8 ── */
export function brilliant() {
  const P = [], ID = [], CEN = [], RND = [];
  const at = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r], TAU = Math.PI * 2, th = i => i / 8 * TAU;
  const T = i => at(th(i), .54, .36), S = i => at(th(i) + TAU / 16, .76, .27), G = (k, y) => at(k / 16 * TAU, 1, y), L = i => at(th(i) + TAU / 16, .56, -.36), C = [0, -.88, 0];
  let fid = 0;
  const tri = (a, b, c) => { const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]], m = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    if (n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0) [b, c] = [c, b];                       /* 면이 늘 바깥을 보게 */
    const r = Math.random(); P.push(...a, ...b, ...c); for (let k = 0; k < 3; k++) { ID.push(fid); CEN.push(...m); RND.push(r); } fid++; };
  const quad = (a, b, c, d) => { const id = fid; tri(a, b, c); tri(a, c, d); const r = RND[RND.length - 4];   /* 한 면(삼각형 둘)은 같은 번호 · 같은 반짝임 */
    for (let k = 1; k <= 6; k++) { ID[ID.length - k] = id; if (k <= 3) RND[RND.length - k] = r; } fid = id + 1; };
  for (let i = 0; i < 8; i++) tri([0, .36, 0], T(i), T(i + 1));                                         /* 테이블 */
  for (let i = 0; i < 8; i++) tri(T(i), T(i + 1), S(i));                                                 /* 별 면 */
  for (let i = 0; i < 8; i++) quad(T(i), S(i - 1 + 8), G(2 * i, .02), S(i));                             /* 마름모(베젤) 면 */
  for (let i = 0; i < 8; i++) { tri(S(i), G(2 * i, .02), G(2 * i + 1, .02)); tri(S(i), G(2 * i + 1, .02), G(2 * i + 2, .02)); }   /* 윗 거들 면 */
  for (let k = 0; k < 16; k++) quad(G(k, .02), G(k + 1, .02), G(k + 1, -.02), G(k, -.02));               /* 거들 띠 */
  for (let i = 0; i < 8; i++) { tri(L(i), G(2 * i, -.02), G(2 * i + 1, -.02)); tri(L(i), G(2 * i + 1, -.02), G(2 * i + 2, -.02)); }   /* 아래 거들 면 */
  for (let i = 0; i < 8; i++) quad(C, L(i - 1 + 8), G(2 * i, -.02), L(i));                               /* 파빌리온 면 */
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals();
  g.setAttribute('aId', new THREE.Float32BufferAttribute(ID, 1)); g.setAttribute('aCen', new THREE.Float32BufferAttribute(CEN, 3)); g.setAttribute('aRnd', new THREE.Float32BufferAttribute(RND, 1));
  return g;
}

/* 보석이 비추는 둘레: 위쪽 큰 조명판 + 강한 점 빛 몇 개 + 둘레 세로 조명 줄 (격납고 쇼룸 조명과 같은 느낌) */
const ENV = `vec3 env(vec3 d){
    float up = clamp(d.y * .5 + .5, 0., 1.);
    vec3 c = mix(vec3(.004,.005,.01), vec3(.10,.12,.17), up * up * up);
    float a = max(dot(d, normalize(vec3(-.45,.82,-.35))), 0.), b = max(dot(d, normalize(vec3(.72,.48,.42))), 0.), e = max(dot(d, normalize(vec3(.05,.25,.97))), 0.);
    float a2=a*a, a4=a2*a2, a8=a4*a4, a16=a8*a8; float b2=b*b, b4=b2*b2, b8=b4*b4, b16=b8*b8; float e2=e*e, e4=e2*e2, e8=e4*e4;
    c += vec3(4.2) * a16 * a16 + vec3(2.8) * b16 * b16 + vec3(1.8) * e8 * e8 * e4;
    float s = abs(sin(atan(d.z, d.x + 1e-5) * 3.));
    c += vec3(.9,.95,1.1) * smoothstep(.965, .995, s) * smoothstep(-.15, .35, d.y) * smoothstep(.9, .5, d.y);
    return c; }`;
export function gemMat(back) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: back ? THREE.BackSide : THREE.FrontSide,
    uniforms: { uCol: { value: new THREE.Vector3(1, 1, 1) }, uA: { value: 1 }, uFlash: { value: 0 }, uGlow: { value: 0 }, uT: { value: 0 }, uSw: { value: new THREE.Vector3(0, 0, 0) }, uDark: { value: 0 } },
    vertexShader: `attribute float aRnd; varying vec3 vN, vW, vL; varying float vR;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vL = w.xyz - modelMatrix[3].xyz; vN = normalize(mat3(modelMatrix) * normal); vR = aRnd; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uCol, uSw; uniform float uA, uFlash, uGlow, uT, uDark; varying vec3 vN, vW, vL; varying float vR; ${ENV}
      void main(){ vec3 N = normalize(vN) * (gl_FrontFacing ? 1. : -1.), V = normalize(cameraPosition - vW);
        float nv = clamp(dot(N, V), 0., 1.), q = 1. - nv, q2 = q * q, F = .05 + .95 * q2 * q2 * q;
        /* 빛이 갈라짐: 빨강·초록·파랑이 조금씩 다르게 꺾여 들어와 면마다 무지개 결 */
        vec3 tr = vec3(env(refract(-V, N, .40)).r, env(refract(-V, N, .417)).g, env(refract(-V, N, .435)).b);
        float lum = dot(tr, vec3(.3,.5,.2));
        float tw = .5 + .5 * sin(uT * 2.3 + vR * 40.);                                 /* 면마다 반짝임이 따로 숨 쉼 */
        ${back
        ? `vec3 deep = uCol * uCol;                                                      /* 뒷면: 속에서 되비친 빛 = 보석 색이 짙게 */
           vec3 c = deep * (.035 + lum * 1.9) + uCol * lum * .3 + tr * .05 + deep * uGlow * .45;
           float al = 1.;`
        : `vec3 body = uCol * uCol * (.03 + lum * .5) + tr * (.05 + .16 * tw) * mix(vec3(1.), uCol, .5);
           vec3 c = mix(body, env(reflect(-V, N)) * mix(vec3(1.), uCol, .25), F) + uCol * uGlow * .25;
           float al = .30 + F * .7;`}
        c += vec3(1.) * uFlash * (.6 + .8 * tw);
        c *= 1. - uDark * .85;                                                          /* 안개: 속이 흐려지며 어두워짐 */
        float sw = (dot(vL, normalize(vec3(cameraPosition.z, 0., -cameraPosition.x) + 1e-4)) - uSw.x) / .12;   /* 거울: 면을 타고 빛이 한 줄로 쓸고 지나감 */
        c += (uCol + .6) * exp(-sw * sw) * uSw.y * (.4 + tw);
        c = min(c, vec3(2.4)); c *= c;                                                  /* 화면에 보이는 색으로 맞춤(마지막에 밝게 펴지는 만큼 미리 눌러 둠 → 짙은 보석색이 분홍으로 들뜨지 않음) */
        gl_FragColor = vec4(c, al * uA); }` });
}
/* 깨짐: 같은 보석 면 하나하나가 조각이 되어 돌며 흩어지고 떨어짐 */
function shardMat() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uCol: { value: new THREE.Vector3(1, 1, 1) }, uK: { value: 0 }, uT: { value: 0 } },
    vertexShader: `attribute vec3 aCen; attribute float aRnd; uniform float uK; varying vec3 vN, vW; varying float vR, vF;
      vec3 rot(vec3 p, vec3 ax, float a){ float c = cos(a), s = sin(a); return p * c + cross(ax, p) * s + ax * dot(ax, p) * (1. - c); }
      void main(){ float r = aRnd, k = uK, kk = 1. - (1. - k) * (1. - k);
        vec3 ax = normalize(vec3(sin(r * 91.), cos(r * 53.), sin(r * 27. + 1.)) + 1e-3), dO = normalize(aCen + 1e-4);
        vec3 p = rot(position - aCen, ax, kk * (4. + r * 9.)) * (1. - k * .55);
        vec3 c = aCen + dO * kk * (1.1 + r * 1.6) + vec3(0., -k * k * 1.6 + kk * .35, 0.);
        vec4 w = modelMatrix * vec4(c + p, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * rot(normal, ax, kk * (4. + r * 9.))); vR = r; vF = k;
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uCol; uniform float uT; varying vec3 vN, vW; varying float vR, vF; ${ENV}
      void main(){ vec3 N = normalize(vN) * (gl_FrontFacing ? 1. : -1.), V = normalize(cameraPosition - vW);
        float q = 1. - clamp(dot(N, V), 0., 1.), F = .08 + .92 * q * q * q;
        vec3 c = uCol * uCol * (.06 + dot(env(refract(-V, N, .42)), vec3(.33)) * 1.6) + env(reflect(-V, N)) * F * .8;
        c += vec3(1.) * step(.82, fract(vR * 13. + uT * 3.)) * (1. - vF) * 1.4;            /* 조각이 돌며 번쩍 */
        c = min(c, vec3(2.4)); c *= c;
        gl_FragColor = vec4(c, (1. - vF) * (1. - vF) * .9); }` });
}

const haloMat = () => new THREE.ShaderMaterial({ ...AB, uniforms: { uCol: { value: new THREE.Vector3() }, uI: { value: 0 }, uS: { value: 1.6 } },
  vertexShader: `uniform float uS; varying vec2 vP; void main(){ vP = position.xy * 2.; vec4 c = modelViewMatrix * vec4(0.,0.,0.,1.); c.xy += position.xy * uS; gl_Position = projectionMatrix * c; }`,
  fragmentShader: `uniform vec3 uCol; uniform float uI; varying vec2 vP; void main(){ float r = length(vP), k = max(0., 1. - r); gl_FragColor = vec4(uCol * uCol * k * k * k * uI, 1.); }` });

/* ── 소리: 보석 = 맑은 울림 (격납고와 같은 규칙) ── */
function bell(f, vol = .12, dec = 1.3, at = 0) { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime + at;
  [[1, 1], [2.76, .45], [5.4, .22], [8.93, .1]].forEach(([m, v]) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f * m;
    o.connect(g); A.env(g, t0, .004, vol * v, dec / Math.sqrt(m)); A.out(g, .6); o.start(t0); o.stop(t0 + dec + .1); }); }
function tick(f) { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f;
  o.connect(g); A.env(g, t0, .002, .035, .045); A.out(g, .15); o.start(t0); o.stop(t0 + .08); }
function shimmer(dur = .9) { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, s = A.noise(dur), bp = c.createBiquadFilter(), g = c.createGain();
  bp.type = 'bandpass'; bp.Q.value = 4; bp.frequency.setValueAtTime(1800, t0); bp.frequency.exponentialRampToValueAtTime(7500, t0 + dur);
  s.connect(bp); bp.connect(g); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.06, t0 + dur * .6); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); A.out(g, .7); s.start(t0); }
function whoosh() { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, s = A.noise(.5), lp = c.createBiquadFilter(), g = c.createGain();
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, t0); lp.frequency.exponentialRampToValueAtTime(5000, t0 + .42);
  s.connect(lp); lp.connect(g); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.16, t0 + .38); g.gain.exponentialRampToValueAtTime(.0001, t0 + .5); A.out(g, .3); s.start(t0); }
function absorb(base) { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime;
  const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(70, t0); o.frequency.exponentialRampToValueAtTime(150, t0 + .2); o.connect(g); A.env(g, t0, .004, .3, .45); A.out(g, .2); o.start(t0); o.stop(t0 + .6);
  [1, 1.5, 2].forEach((m, i) => bell(base * m, .09, 1.6, i * .06)); }
function shatter() { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime;
  const s = A.noise(.25), hp = c.createBiquadFilter(), g = c.createGain(); hp.type = 'highpass'; hp.frequency.value = 3500; s.connect(hp); hp.connect(g); A.env(g, t0, .002, .12, .22); A.out(g, .5); s.start(t0);
  for (let i = 0; i < 9; i++) bell(2600 + Math.random() * 4200, .025, .35, i * .03 + Math.random() * .04); }

/* ── 고르기 장면 ── */

/* 보석 둘레 고리 (감속 물결 · 튕김 바닥 · 거울 물결) — 화면을 봄 */
const ringMat = () => new THREE.ShaderMaterial({ ...AB, uniforms: { uCol: { value: new THREE.Vector3() }, uI: { value: 0 }, uR: { value: .5 }, uS: { value: 1 }, uW: { value: .05 } },
  vertexShader: `uniform float uS; varying vec2 vP; void main(){ vP = position.xy * 2.; vec4 c = modelViewMatrix * vec4(0.,0.,0.,1.); c.xy += position.xy * uS; gl_Position = projectionMatrix * c; }`,
  fragmentShader: `uniform vec3 uCol; uniform float uI, uR, uW; varying vec2 vP; void main(){ float d = (length(vP) - uR) / uW; gl_FragColor = vec4((uCol * uCol + .25) * exp(-d * d) * uI, 1.); }` });

/* ── 고르기 장면 ── */
export function makeSkillPick(ship, opt = {}) {
  const G = new THREE.Group(), geo = brilliant(), demo = opt.demo;
  const ui = opt.ui, light = new THREE.PointLight(0xffffff, 0, 3.4, 2); G.add(light);           /* 빛이 기체를 스쳐 감 (처음부터 넣어 둠: 나중에 넣으면 그림 다시 짜느라 멈칫함) */
  const trail = pointPool(500, false, .07), sparks = pointPool(320, false, .08); G.add(trail.pts, sparks.pts);
  /* 판 위에 퍼지는 색 고리 (고른 순간) */
  const ringM = new THREE.ShaderMaterial({ ...AB, uniforms: { uR: { value: 0 }, uI: { value: 0 }, uCol: { value: new THREE.Vector3() } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uR, uI; uniform vec3 uCol; varying vec2 vP; void main(){ float r = length(vP), d = (r - uR) / .09, d2 = (r - uR * .75) / .3;
      float k = exp(-d * d) * 1.4 + exp(-d2 * d2) * .25; gl_FragColor = vec4(mix(uCol * uCol, vec3(1.2), exp(-d * d) * .4) * k * uI, 1.); }` });
  const ring = new THREE.Mesh(new THREE.CircleGeometry(4.5, 96), ringM); ring.rotation.x = -Math.PI / 2; ring.position.y = .26; ring.renderOrder = 7; G.add(ring);
  const gems = [0, 1, 2].map(i => {
    const o = new THREE.Group(), back = new THREE.Mesh(geo, gemMat(true)), front = new THREE.Mesh(geo, gemMat(false));
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat()), sh = new THREE.Mesh(geo, shardMat());
    back.renderOrder = 4; front.renderOrder = 6; halo.renderOrder = 3; sh.renderOrder = 6; [halo, sh].forEach(m => m.frustumCulled = false);
    const body = new THREE.Group(); body.add(back, front); body.scale.setScalar(GEMR); sh.scale.setScalar(GEMR); o.add(halo, body, sh); G.add(o);
    const tag = document.createElement('div'); tag.className = 'gtag'; tag.innerHTML = '<b></b><span></span>'; ui?.appendChild(tag);
    return { i, o, body, back, front, halo, sh, tag, skill: 0, state: 'off', pos: 0, t0: 0, stopAt: 0, last: 0, P0: new THREE.Vector3(), flash: 0, popAt: 0, fxT: 0, off: new THREE.Vector3(), sc: 1, spin: 1, ang: 0, focus: 0, wp: new THREE.Vector3() };
  });
  /* 머리 위 안내 · 설명 판 · 고른 스킬 */
  const head = document.createElement('div'); head.id = 'pickhead'; head.innerHTML = '<div class="steps"></div><div class="row"><b></b><em class="sec"></em></div><span></span><div class="bar"><i></i></div>'; ui?.appendChild(head);
  const hint = document.createElement('div'); hint.id = 'pickhint'; ui?.appendChild(hint);
  const card = document.createElement('div'); card.id = 'pickcard'; card.innerHTML = '<em></em><b></b><p></p><button type="button">이걸로 고르기</button><small>보석을 한 번 더 눌러도 골라져요</small>'; ui?.appendChild(card);
  const chips = document.createElement('div'); chips.id = 'pickchips'; ui?.appendChild(chips);

  const st = { on: false, cat: 0, phase: 'idle', T: 0, P: PICK.first, picked: [], deadline: 0, done: null, phi: 0, w: 0, chose: -1, focus: -1, hitT: 0, tNow: 0 };
  const tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const shipC = () => ship.getWorldPosition(V()).add(V(0, .15, 0));
  const col = c => V(...CATS[c].col);
  card.querySelector('button').onclick = e => { e.stopPropagation(); if (st.focus >= 0) choose(st.tNow, st.focus); };
  card.addEventListener('pointerdown', e => e.stopPropagation()); card.addEventListener('pointerup', e => e.stopPropagation());

  function drawHead() { const C = CATS[st.cat];
    head.style.setProperty('--c', C.css); card.style.setProperty('--c', C.css);
    head.querySelector('.steps').innerHTML = CATS.map((c, i) => `<i class="${i < st.cat ? 'done' : i === st.cat ? 'now' : ''}" style="--c:${c.css}"></i>`).join('');
    head.querySelector('b').textContent = `${C.name} 스킬 고르기`; head.querySelector('span').textContent = `${C.en} · ${st.cat + 1}/3`; head.querySelector('.sec').textContent = ''; }
  function startCat(t, c) {
    st.cat = c; st.phase = 'rise'; st.T = t; st.chose = -1; st.focus = -1; drawHead(); head.classList.add('on'); hint.classList.remove('on'); card.classList.remove('on');
    const pool = [0, 1, 2, 3, 4].sort(() => Math.random() - .5).slice(0, 3), C = col(c);
    gems.forEach((g, i) => { g.skill = pool[i]; g.state = 'rise'; g.t0 = t + i * .12; g.o.visible = true; g.sh.visible = false; g.body.visible = true; g.focus = 0; g.off.set(0, 0, 0); g.sc = 1; g.spin = 1;
      for (const m of [g.back, g.front, g.halo, g.sh]) m.material.uniforms.uCol.value.copy(C);
      g.pos = 0; g.last = 0; g.stopAt = t + st.P.rise + st.P.spin + i * st.P.gap; g.tag.classList.remove('on', 'pick', 'gone', 'side'); g.tag.style.setProperty('--c', CATS[c].css);
      g.tag.querySelector('b').textContent = CATS[c].list[g.skill][0]; g.tag.querySelector('span').textContent = CATS[c].list[g.skill][1]; });
    st.phi = Math.random() * 6.28; st.w = 1.3; shimmer(st.P.rise + .2);
  }
  /* 한 번 누름 = 살펴보기 */
  function focus(t, gi) {
    if (st.phase !== 'pick' || st.focus === gi) return; st.focus = gi; const g = gems[gi], C = CATS[st.cat];
    card.querySelector('em').textContent = `${C.name} · 기본`; card.querySelector('b').textContent = C.list[g.skill][0]; card.querySelector('p').textContent = C.list[g.skill][1];
    card.classList.remove('on'); void card.offsetWidth; card.classList.add('on'); hint.classList.remove('on');
    gems.forEach(o => { o.tag.classList.toggle('side', o !== g); o.tag.classList.toggle('on', o !== g); });   /* 줄 선 보석은 위에 이름이 크게 */
    bell([1046.5, 1174.7, 1318.5][gi], .07, .8); demo?.userData.play(st.cat, g.skill, t, col(st.cat));
  }
  function choose(t, gi, auto = false) {
    if (st.phase !== 'pick') return; st.phase = 'absorb'; st.chose = gi; hint.classList.remove('on'); card.classList.remove('on'); demo?.userData.stop();
    const g = gems[gi]; g.state = 'chosen'; g.t0 = t; g.P0.copy(g.o.position); g.tag.classList.add('pick');
    gems.forEach(o => { if (o !== g) { o.state = 'break'; o.t0 = t + .12; o.tag.classList.add('gone'); } });
    bell(1318.5, .1, .9); st.picked[st.cat] = g.skill; if (auto) { hint.textContent = st.focus >= 0 ? '시간이 다 돼 살펴보던 스킬로 골랐어요' : '시간이 다 돼 무작위로 골랐어요'; hint.classList.add('on'); }
  }
  G.userData.start = (t, again = false, done = null) => { st.on = true; st.P = again ? PICK.again : PICK.first; st.picked = []; st.done = done; chips.innerHTML = ''; chips.classList.remove('on'); startCat(t, 0); };
  G.userData.stop = () => { st.on = false; st.phase = 'idle'; demo?.userData.stop(); gems.forEach(g => { g.o.visible = false; g.tag.classList.remove('on', 'pick', 'gone', 'side'); }); head.classList.remove('on'); hint.classList.remove('on'); card.classList.remove('on'); light.intensity = 0; st.hitT = 0; ringM.uniforms.uI.value = 0; };
  G.userData.hideChips = () => chips.classList.remove('on');
  G.userData.setPx = px => { trail.setPx(px); sparks.setPx(px); };
  G.userData.st = st;
  /* 누른 자리에서 가장 가까운 보석 (화면 위 거리) */
  G.userData.tap = (x, y, cam, W, H, t) => { if (st.phase !== 'pick') return false; let best = -1, bd = 1e9;
    gems.forEach((g, i) => { if (g.state !== 'ready') return; const p = g.o.getWorldPosition(V()).project(cam), sx = (p.x * .5 + .5) * W, sy = (-p.y * .5 + .5) * H, d = Math.hypot(sx - x, sy - y) / (g.focus > .5 ? 1.6 : 1); if (d < bd) { bd = d; best = i; } });
    if (best < 0 || bd > Math.max(70, H * .13)) return false;
    if (best === st.focus) choose(t, best); else focus(t, best); return true; };
  G.userData.camFocus = () => st.on ? 1 : 0;
  G.userData.demoFocus = () => st.on && st.focus >= 0 && st.phase === 'pick' ? 1 : 0;

  G.userData.update = (t, dt, cam, W, H) => {
    st.tNow = t; trail.update(dt); sparks.update(dt);
    if (!st.on) return;
    const C = col(st.cat), sc = shipC(), cs = CATS[st.cat].css;
    const cw = ui ? ui.clientWidth : W, chh = ui ? ui.clientHeight : H;
    cam.updateMatrixWorld(); const cr = V().setFromMatrixColumn(cam.matrixWorld, 0), cu = V().setFromMatrixColumn(cam.matrixWorld, 1), cf = V().setFromMatrixColumn(cam.matrixWorld, 2).negate();
    /* 둘레 도는 속도: 돌릴 땐 빠르게, 다 서면 천천히 (고르기 쉽게), 살펴볼 땐 더 천천히 */
    const allStop = gems.every(g => g.state !== 'rise' && g.state !== 'spin');
    st.w += ((allStop ? (st.focus >= 0 ? 0 : .1) : 1.25) - st.w) * Math.min(1, dt * (allStop ? 1.8 : 3)); st.phi += st.w * dt;
    /* 살펴보는 보석이 갈 자리: 화면 왼쪽 앞 (눈앞에 들어 올린 느낌) */
    const fd = 8.5, hh = fd * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), fpos = cam.position.clone().addScaledVector(cf, fd).addScaledVector(cr, -hh * cam.aspect * .74).addScaledVector(cu, hh * .3);   /* 화면 왼쪽 위: 가운데(기체)와 오른쪽(연습 표적)을 가리지 않게 */
    const dimIdx = {}; { let k = 0; gems.forEach((g, i) => { if (i !== st.focus) dimIdx[i] = k++; }); }
    gems.forEach((g, i) => {
      const U = g.back.material.uniforms, Uf = g.front.material.uniforms, Uh = g.halo.material.uniforms;
      for (const u of [U, Uf]) u.uT.value = t; g.sh.material.uniforms.uT.value = t;
      const a = st.phi + i * Math.PI * 2 / 3, home = V(Math.cos(a) * ORBIT, GEMY + Math.sin(t * 1.7 + i * 2) * .07, Math.sin(a) * ORBIT);
      g.focus += ((st.focus === i && st.phase === 'pick' ? 1 : 0) - g.focus) * Math.min(1, dt * 5);
      const dimmed = st.focus >= 0 && st.focus !== i && st.phase === 'pick'; g.dim = (g.dim || 0) + ((dimmed ? 1 : 0) - (g.dim || 0)) * Math.min(1, dt * 4);
      /* 보석 자세: 위를 보되 화면 쪽으로 30°쯤 기울어 윗면 깎인 면과 옆 거들이 함께 보임 + 제 축으로 돌며 면마다 반짝 */
      const toCam = cam.position.clone().sub(g.o.position); toCam.y = 0; toCam.normalize().multiplyScalar(.55 + g.focus * .5).add(V(0, 1, 0)).normalize();
      g.ang += dt * (g.state === 'spin' ? 9 : .55 * g.spin); tmpQ.setFromUnitVectors(Y, toCam); tmpQ2.setFromAxisAngle(Y, g.ang + i * 2); g.body.quaternion.copy(tmpQ).multiply(tmpQ2); g.sh.quaternion.copy(g.body.quaternion);
      g.flash = Math.max(0, g.flash - dt * 3.2); let glow = 0, alpha = 1, S = 1;
            if (g.state === 'rise') {                        /* 판 가운데에서 나선으로 떠오름 */
        const u = sm01((t - g.t0) / st.P.rise), aa = a - (1 - u) * 2.4, r = ORBIT * (.15 + .85 * u);
        g.o.position.set(Math.cos(aa) * r, .3 + (home.y - .3) * (1 - (1 - u) * (1 - u)), Math.sin(aa) * r);
        S = Math.max(.001, u); alpha = u; glow = 1 - u * .5;
        if (u > 0 && u < 1) trail.emit(q => { q.p.copy(g.o.position); q.v.set((Math.random() - .5) * .3, (Math.random() - .5) * .3, (Math.random() - .5) * .3); q.max = q.life = .35 + Math.random() * .3; q.c.copy(C); q.s = .9; }, 2);
        if (u >= 1) { g.state = 'spin'; }
      } else if (g.state === 'spin') {                 /* 아직 무엇인지 모름: 빠르게 돌며 면마다 번쩍, 딸깍 소리가 점점 느려짐 → '딩' */
        g.o.position.copy(home); const left = g.stopAt - t, rate = 4 + Math.max(0, Math.min(1, left / 1.2)) * 14; g.pos += rate * dt;
        if (Math.floor(g.pos) !== g.last) { g.last = Math.floor(g.pos); tick(2200 + i * 260); g.flash = Math.max(g.flash, .35 + Math.random() * .3); }
        glow = .5 + .3 * Math.sin(t * 25 + i);
        if (left <= 0) { g.state = 'ready'; g.popAt = t; g.fxT = t + .35; g.flash = 1.2; bell([1318.5, 1661.2, 1975.5][i], .13, 1.4); g.tag.classList.add('on');
          sparks.emit(q => { q.p.copy(g.o.position); q.v.randomDirection().multiplyScalar(1.4 + Math.random()); q.max = q.life = .4 + Math.random() * .3; q.c.copy(C); q.s = .8; }, 26); }
      } else if (g.state === 'ready') {
        const e = t - g.popAt, side = fpos.clone().addScaledVector(cr, hh * cam.aspect * (.2 + .17 * (dimIdx[i] || 0))).addScaledVector(cu, -hh * .02);   /* 살펴보는 동안 나머지 둘은 왼쪽 위 보석 옆에 작게 줄 서서 기다림 → 기체·맛보기를 가리지 않음 */
        g.o.position.copy(home).lerp(side, sm01(g.dim)).lerp(fpos, sm01(g.focus));
        const left = st.deadline - t; glow = .25 + .2 * Math.sin(t * 3 + i) + (st.phase === 'pick' && left < 4 && !dimmed ? .3 * (.5 + .5 * Math.sin(t * 12)) : 0);
        S = (1 + .07 * Math.exp(-e * 5)) * (1 + g.focus * .1) * (1 - .4 * g.dim); alpha = 1 - .35 * g.dim;
      } else if (g.state === 'chosen') {               /* 살짝 부풀었다가 기체로 빨려 듦 (처음은 천천히, 닿을 때 가장 빠르게) */
        const e = t - g.t0, pre = .14, F = .5;
        if (e < pre) { g.o.position.copy(g.P0); S = (1 + g.focus * .1) * (1 + .22 * Math.sin(e / pre * Math.PI * .5)); glow = 1; g.flash = Math.max(g.flash, .6); if (e < dt * 1.5) whoosh(); }
        else { const u = Math.min(1, (e - pre) / F), k = u * u * u, mid = g.P0.clone().lerp(sc, .5).add(V(0, 1.1, 0));
          const p = g.P0.clone().multiplyScalar((1 - k) * (1 - k)).add(mid.multiplyScalar(2 * (1 - k) * k)).add(sc.clone().multiplyScalar(k * k)); g.o.position.copy(p);
          S = (1.22 + g.focus * .1) * (1 - .75 * k); glow = 1;
          trail.emit(q => { q.p.copy(p).add(V((Math.random() - .5) * .15, (Math.random() - .5) * .15, (Math.random() - .5) * .15)); q.v.set(0, 0, 0); q.max = q.life = .25 + Math.random() * .25; q.c.copy(C); q.s = 1.2; }, 5);
          if (u >= 1) { g.state = 'gone'; g.o.visible = false; st.hitT = t; absorb([523.25, 392, 466.16][st.cat]);
            sparks.emit(q => { const aa = Math.random() * 6.283, up = Math.random() * 2.4, out = .8 + Math.random() * 2.8; q.p.copy(sc); q.v.set(Math.cos(aa) * out, up, Math.sin(aa) * out); q.max = q.life = .5 + Math.random() * .7; q.g = 4; q.c.copy(C); q.s = 1; }, 120);
            const ch = document.createElement('div'); ch.className = 'chip'; ch.style.setProperty('--c', cs); ch.innerHTML = `<em>${CATS[st.cat].name}</em><b>${CATS[st.cat].list[g.skill][0]}</b>`; chips.appendChild(ch); chips.classList.add('on'); } }
      } else if (g.state === 'break') {                /* 깎인 면대로 부서짐 */
        const e = t - g.t0; S = 1 + g.focus * .1;
        if (e >= 0) { if (g.body.visible) { g.body.visible = false; g.sh.visible = true; shatter();
            sparks.emit(q => { const v = V().randomDirection(); q.p.copy(g.o.position).addScaledVector(v, .2); q.v.copy(v).multiplyScalar(.6 + Math.random() * 1.6); q.v.y += .6; q.max = q.life = .5 + Math.random() * .6; q.g = 2.5; q.c.copy(C); q.s = .7; }, 40); }
          const k = Math.min(1, e / 1.15); g.sh.material.uniforms.uK.value = k; glow = 0;
          if (k >= 1) { g.state = 'gone'; g.o.visible = false; } }
      }
      /* 스킬 움직임이 준 자리·크기 반영 */
      g.body.position.copy(g.off); g.body.scale.setScalar(GEMR * S * Math.max(.001, g.sc)); g.sh.scale.setScalar(GEMR * S); g.halo.position.copy(g.off);
      U.uA.value = Uf.uA.value = alpha; U.uGlow.value = Uf.uGlow.value = glow; U.uFlash.value = Uf.uFlash.value = Math.min(1, g.flash) * (g.state === 'ready' ? .7 : 1.3);   /* 번쩍임: 빛 번짐에 하얗게 묻히지 않을 만큼 */
      Uh.uI.value = (g.state === 'gone' || g.state === 'break' && t > g.t0 ? 0 : .12 + glow * .35 + g.flash * 1.4) * alpha * Math.max(.001, g.sc); Uh.uS.value = GEMR * 2.6 * S;
      g.wp.copy(g.o.position).add(g.off);
      /* 이름표: 보석 위 */
      if (g.tag.classList.contains('on') && ui) { const p = g.o.position.clone().add(V(0, GEMR * S * 1.35, 0)).project(cam);
        g.tag.style.transform = `translate(${(p.x * .5 + .5) * cw}px,${g.dim > .5 ? (-p.y * .5 + .5) * chh : Math.max(118, (-p.y * .5 + .5) * chh)}px) translate(-50%,-100%)`; }   /* 둘레를 돌 땐 위 안내와 겹치지 않게 · 줄 섰을 땐 바로 위 */
    });
    /* 설명 판: 살펴보는 보석 오른쪽 아래 */
    if (st.focus >= 0 && card.classList.contains('on')) { const g = gems[st.focus], p = g.o.position.clone().addScaledVector(cu, -GEMR * 1.25).project(cam), r = { width: cw, height: chh };
      const x = Math.max(12, Math.min((p.x * .5 + .5) * cw - card.offsetWidth * .3, cw * .3 - card.offsetWidth)), y = Math.max(8, Math.min(r.height - card.offsetHeight - 54, (-p.y * .5 + .5) * chh));   /* 보석 바로 아래 (화면 밖으로 안 나가게) */
      card.style.transform = `translate(${x}px,${y}px)`; }
    /* 시간 제한: 셋 다 서면 시작 */
    if (st.phase === 'rise' && allStop) { st.phase = 'pick'; st.deadline = t + st.P.time; hint.textContent = '보석을 눌러 살펴보세요'; hint.classList.add('on'); }
    const bar = head.querySelector('.bar i'), sec = head.querySelector('.sec');
    if (st.phase === 'pick') { const left = Math.max(0, st.deadline - t); bar.style.transform = `scaleX(${left / st.P.time})`; head.classList.toggle('hurry', left < 4);
      const n = Math.ceil(left); if (sec.textContent !== String(n)) { sec.textContent = n; if (left < 4 && left > 0) tick(n % 2 ? 1500 : 1300); sec.classList.remove('beat'); void sec.offsetWidth; sec.classList.add('beat'); }
      if (left <= 0) { const ok = gems.map((g, i) => i).filter(i => gems[i].state === 'ready'); choose(t, st.focus >= 0 ? st.focus : ok[Math.floor(Math.random() * ok.length)], true); } }
    else if (st.phase === 'rise') { bar.style.transform = 'scaleX(1)'; head.classList.remove('hurry'); sec.textContent = ''; }
    /* 기체에 닿은 순간: 그 분류 색 빛이 머리(+x)에서 꼬리로 스쳐 감 + 판에 색 고리 */
    if (st.hitT) { const e = t - st.hitT, u = Math.min(1, e / .42);
      light.color.setRGB(...CATS[st.cat].col); light.position.set(sc.x + 1.6 - 3.2 * sm01(u), sc.y + .55, sc.z); light.intensity = e < .5 ? Math.sin(Math.min(1, e / .42) * Math.PI) * 26 : 0;
      ringM.uniforms.uCol.value.copy(C); ringM.uniforms.uR.value = e * 4.6; ringM.uniforms.uI.value = Math.max(0, 1 - e / 1.1) * 1.2;
      if (st.phase === 'absorb' && gems.every(g => g.state === 'gone') && e > st.P.rest + .35) {
        st.hitT = 0; ringM.uniforms.uI.value = 0; light.intensity = 0;
        if (st.cat < 2) startCat(t, st.cat + 1);
        else { st.on = false; st.phase = 'idle'; head.classList.remove('on'); hint.classList.remove('on'); bell(784, .08, 2.2); bell(1174.7, .06, 2.2, .08); st.done?.(t, st.picked.slice()); } } }
  };
  return G;
}

export const PICK_CSS = `
#pickhead{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 14px);transform:translate(-50%,-8px);display:flex;flex-direction:column;align-items:center;gap:3px;opacity:0;transition:opacity .35s,transform .35s;pointer-events:none;--c:255,255,255}
#pickhead.on{opacity:1;transform:translate(-50%,0)}
#pickhead .steps{display:flex;gap:7px;margin-bottom:3px}
#pickhead .steps i{width:7px;height:7px;transform:rotate(45deg);border:1px solid rgba(var(--c),.55);transition:background .3s,box-shadow .3s}
#pickhead .steps i.done{background:rgba(var(--c),.9)} #pickhead .steps i.now{border-color:rgb(var(--c));box-shadow:0 0 10px rgba(var(--c),.8)}
#pickhead .row{display:flex;align-items:baseline;gap:10px}
#pickhead .sec{font-style:normal;font-family:var(--en);font-size:22px;color:#fff;text-shadow:0 0 12px rgba(var(--c),.9);min-width:1.4em;text-align:left}
#pickhead .sec.beat{animation:sb .35s ease-out}
@keyframes sb{from{transform:scale(1.35)}}
#pickhead.hurry .sec{color:#ffc48a;text-shadow:0 0 14px rgba(255,140,60,.9)}
#pickhead b{font-weight:500;font-size:17px;letter-spacing:.08em;color:rgb(var(--c));text-shadow:0 0 14px rgba(var(--c),.6)}
#pickhead span{font-family:var(--en);font-size:9px;letter-spacing:.24em;color:rgba(var(--c),.6)}
#pickhead .bar{width:150px;height:2px;margin-top:6px;background:rgba(var(--c),.15);overflow:hidden}
#pickhead .bar i{display:block;height:100%;background:rgb(var(--c));transform-origin:center;box-shadow:0 0 8px rgba(var(--c),.9)}
#pickhead.hurry .bar i{background:#ffb070;box-shadow:0 0 10px rgba(255,150,80,.9)}
.gtag{position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;gap:2px;white-space:nowrap;pointer-events:none;opacity:0;--c:255,255,255;transition:opacity .25s}
.gtag b{font-weight:500;font-size:13.5px;color:#fff;letter-spacing:.04em;text-shadow:0 0 10px rgba(var(--c),.9),0 0 2px rgba(var(--c),1)}
.gtag span{font-size:10.5px;color:rgba(var(--c),.95);letter-spacing:.02em;text-shadow:0 0 8px rgba(0,0,0,.9)}
.gtag.on{opacity:1;animation:gpop .35s cubic-bezier(.2,1.6,.4,1)}
.gtag.side{opacity:1;animation:none} .gtag.side b{font-size:14.5px} .gtag.side span{display:none}
.gtag.pick{opacity:0;transition:opacity .2s .1s} .gtag.gone{opacity:0;transition:opacity .12s}
@keyframes gpop{from{opacity:0;filter:blur(4px)}to{opacity:1;filter:none}}
#pickhint{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 62px);transform:translateX(-50%);font-size:12px;letter-spacing:.08em;color:rgba(230,236,250,.8);opacity:0;transition:opacity .4s;pointer-events:none;white-space:nowrap}
#pickhint.on{opacity:1;animation:hb 1.6s ease-in-out infinite}
@keyframes hb{50%{opacity:.45}}
#pickcard{position:absolute;left:0;top:0;width:min(220px,27vw);display:flex;flex-direction:column;gap:4px;padding:10px 12px 10px;border-left:2px solid rgb(var(--c));
  background:linear-gradient(90deg,rgba(6,8,16,.82),rgba(6,8,16,.55));box-shadow:-8px 0 24px -12px rgba(var(--c),.8);opacity:0;pointer-events:none;transition:opacity .25s;--c:255,255,255}
#pickcard.on{opacity:1;pointer-events:auto;animation:cin .4s cubic-bezier(.2,1.2,.4,1)}
@keyframes cin{from{opacity:0;clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
#pickcard em{font-style:normal;font-size:10px;letter-spacing:.12em;color:rgba(var(--c),.95)}
#pickcard b{font-weight:500;font-size:16px;color:#fff;letter-spacing:.04em;text-shadow:0 0 12px rgba(var(--c),.7)}
#pickcard p{margin:0;font-size:12px;line-height:1.5;color:#d5dae8}
#pickcard button{margin-top:5px;align-self:flex-start;font-size:12.5px;font-weight:500;padding:7px 14px;border:1px solid rgb(var(--c));border-radius:3px;color:#fff;background:rgba(var(--c),.22);letter-spacing:.06em;box-shadow:0 0 14px rgba(var(--c),.35) inset}
#pickcard button:active{background:rgba(var(--c),.45)}
#pickcard small{font-size:10.5px;color:rgba(213,218,232,.55)}
#pickchips{position:absolute;left:max(18px,env(safe-area-inset-left,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 60px);display:flex;flex-direction:column;gap:6px;pointer-events:none;opacity:0;transition:opacity .4s}
#pickchips.on{opacity:1}
#pickchips .chip{display:flex;align-items:baseline;gap:8px;padding:5px 12px 6px 10px;border-left:2px solid rgb(var(--c));background:linear-gradient(90deg,rgba(var(--c),.18),rgba(var(--c),0));animation:chin .45s cubic-bezier(.2,1.3,.4,1)}
#pickchips em{font-style:normal;font-size:10px;letter-spacing:.1em;color:rgba(var(--c),.9)} #pickchips b{font-weight:500;font-size:12.5px;color:#f2f4fb;letter-spacing:.03em}
@keyframes chin{from{opacity:0;transform:translateX(-14px)}}
`;
