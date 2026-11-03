/* 태어나서 스킬 고르기 — 공격 · 이동 · 방해, 분류마다 기본 스킬 3개가 무작위로 나와 하나씩 고름
   순서 (한 분류)
   · 떠오름: 판 가운데에서 보석 셋이 나선을 그리며 기체 둘레로 떠오름 (기체가 태어난 그 자리에서 힘이 피어남)
   · 돌림: 보석 속 그림이 슬롯처럼 휙휙 바뀜(빠를수록 위아래로 번짐) → 하나씩 차례로 멈춤. 멈출 때 '딩' + 보석이 번쩍 + 이름표가 뜸
           (차례로 멈추는 이유: 셋이 한꺼번에 서면 무작위로 뽑혔다는 느낌이 안 남)
   · 고름: 누른 보석이 살짝 부풀었다가 기체로 빨려 들어감 → 닿는 순간 그 분류 색 빛이 기체 머리에서 꼬리로 한 번 스쳐 감 + 판에 색 고리
           고르지 않은 둘은 깎인 면 조각대로 부서져 흩어짐(보석이 실제로 깨지는 것처럼 면 하나하나가 조각)
   · 시간 제한: 다른 사람들도 동시에 고르는 중 → 분류마다 짧게. 다 되면 무작위로 골라짐
   다시 태어날 때는 같은 장면을 더 빠르게
   보석 = 둥근 브릴리언트(도색 보석과 같은 모양). 앞면·뒷면 두 번 그려 속에서 빛이 되비치는 느낌 + 빛이 갈라지는 무지개 결
   무게: 보석 하나 = 뒷면 · 속 그림 · 앞면 · 둘레 빛 4번. 조각·꼬리·불꽃은 점/면 묶음 한 번씩 */
import * as THREE from 'three';
import * as A from '../core/audio.js';

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
  first: { rise: .9, spin: 1.5, gap: .42, time: 10, rest: .55 },     /* 처음 태어날 때 */
  again: { rise: .5, spin: .7, gap: .22, time: 6, rest: .3 },        /* 다시 태어날 때: 같은 장면, 빠르게 */
};
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
const sm01 = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const ORBIT = 2.7, GEMR = .6, GEMY = 1.6;

/* ── 둥근 브릴리언트: 테이블 8각 · 별 면 8 · 마름모 면 8 · 윗 거들 면 16 · 거들 띠 · 아래 거들 면 16 · 파빌리온 면 8 ── */
function brilliant() {
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
    float s = abs(sin(atan(d.z, d.x) * 3.));
    c += vec3(.9,.95,1.1) * smoothstep(.965, .995, s) * smoothstep(-.15, .35, d.y) * smoothstep(.9, .5, d.y);
    return c; }`;
function gemMat(back) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: back ? THREE.BackSide : THREE.FrontSide,
    uniforms: { uCol: { value: new THREE.Vector3(1, 1, 1) }, uA: { value: 1 }, uFlash: { value: 0 }, uGlow: { value: 0 }, uT: { value: 0 } },
    vertexShader: `attribute float aRnd; varying vec3 vN, vW; varying float vR;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vR = aRnd; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uCol; uniform float uA, uFlash, uGlow, uT; varying vec3 vN, vW; varying float vR; ${ENV}
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

/* 속 그림: 분류 하나 = 세로 띠 한 줄(다섯 칸). 슬롯처럼 띠가 아래로 흘러 지나감 */
function glyphAtlas() {
  const S = 128, cv = document.createElement('canvas'); cv.width = S * 3; cv.height = S * 5; const g = cv.getContext('2d');
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#fff'; g.fillStyle = '#fff';
  const cell = (c, r, f) => { g.save(); g.translate(c * S + S / 2, r * S + S / 2); g.scale(S / 2.6, S / 2.6); g.lineWidth = .12;
    g.shadowColor = 'rgba(255,255,255,.7)'; g.shadowBlur = 5; f(); g.restore(); };
  const arrow = (x0, y0, x1, y1, h = .22) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); const a = Math.atan2(y1 - y0, x1 - x0);
    g.moveTo(x1 - Math.cos(a - .5) * h, y1 - Math.sin(a - .5) * h); g.lineTo(x1, y1); g.lineTo(x1 - Math.cos(a + .5) * h, y1 - Math.sin(a + .5) * h); g.stroke(); };
  const dot = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  const ring = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); };
  /* 공격 */
  cell(0, 0, () => { for (let i = -2; i <= 2; i++) { const a = -Math.PI / 2 + i * .32; arrow(Math.cos(a) * .25, Math.sin(a) * .25 + .55, Math.cos(a) * .95, Math.sin(a) * .95 + .55); } dot(0, .62, .1); });
  cell(0, 1, () => { g.lineWidth = .2; g.beginPath(); g.moveTo(-1, .1); g.lineTo(1, -.1); g.stroke(); g.lineWidth = .1; ring(.05, 0, .42); ring(.05, 0, .62); });
  cell(0, 2, () => { g.beginPath(); g.moveTo(-.35, -.8); g.lineTo(-.05, -.45); g.lineTo(-.35, -.1); g.lineTo(-.65, -.45); g.closePath(); g.stroke();
    g.setLineDash([.1, .12]); g.beginPath(); g.moveTo(-.3, 0); g.bezierCurveTo(-.2, .7, .55, .6, .6, .05); g.stroke(); g.setLineDash([]); ring(.62, -.15, .14); arrow(.55, .3, .62, .05, .18); });
  cell(0, 3, () => { g.beginPath(); g.moveTo(-.8, -.5); g.lineTo(-.3, -.15); g.lineTo(-.45, .1); g.lineTo(.1, .45); g.lineTo(0, .1); g.lineTo(.75, .55); g.stroke(); dot(-.82, -.52, .12); dot(.1, .45, .1); dot(.78, .57, .12); });
  cell(0, 4, () => { ring(-.35, 0, .38); for (const [x, y] of [[.45, -.45], [.62, .05], [.42, .52]]) { ring(x, y, .14); } arrow(.05, -.1, .3, -.32, .12); arrow(.08, .05, .44, .05, .12); arrow(.05, .2, .28, .4, .12); });
  /* 이동 */
  cell(1, 0, () => { g.setLineDash([.08, .1]); ring(-.55, .25, .26); g.setLineDash([]); ring(.55, -.25, .26); g.beginPath(); g.arc(0, .35, .62, Math.PI * 1.15, Math.PI * 1.8); g.stroke(); arrow(.24, -.24, .3, -.08, .16); });
  cell(1, 1, () => { for (let i = 0; i < 3; i++) { const x = -.7 + i * .5; g.globalAlpha = .45 + i * .27; g.beginPath(); g.moveTo(x, -.55); g.lineTo(x + .45, 0); g.lineTo(x, .55); g.stroke(); } g.globalAlpha = 1; });
  cell(1, 2, () => { for (let i = 0; i < 3; i++) { const x = -.75 + i * .5; g.globalAlpha = .25 + i * .37; g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x, -.32); g.lineTo(x + .1, 0); g.lineTo(x, .32); g.closePath(); i === 2 ? g.fill() : g.stroke(); } g.globalAlpha = 1; });
  cell(1, 3, () => { g.lineWidth = .18; g.beginPath(); g.moveTo(.7, -.85); g.lineTo(.7, .85); g.stroke(); g.lineWidth = .12; g.beginPath(); g.moveTo(-.8, .55); g.lineTo(.55, 0); g.stroke(); arrow(.55, 0, -.6, -.6); });
  cell(1, 4, () => { g.beginPath(); for (let k = 0; k <= 40; k++) { const u = k / 40, a = u * 4.6, r = .15 + u * .7; g.lineTo(Math.cos(a) * r - .1, Math.sin(a) * r * .75); } g.stroke(); arrow(-.25, .55, .1, .62, .16); });
  /* 방해 */
  cell(2, 0, () => { g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.PI / 6; g.lineTo(Math.cos(a) * .7, Math.sin(a) * .7); } g.closePath(); g.stroke();
    g.globalAlpha = .55; g.beginPath(); g.moveTo(-.25, -.35); g.lineTo(.25, .35); g.moveTo(-.05, -.45); g.lineTo(.35, .1); g.stroke(); g.globalAlpha = 1; });
  cell(2, 1, () => { for (const [x, y, r] of [[-.4, .15, .32], [.05, -.1, .4], [.45, .18, .3], [0, .32, .28]]) { g.beginPath(); g.arc(x, y, r, Math.PI * .9, Math.PI * 2.1); g.stroke(); } dot(-.6, -.55, .07); dot(.6, -.6, .07); });
  cell(2, 2, () => { g.globalAlpha = .4; ring(0, 0, .85); g.globalAlpha = .7; ring(0, 0, .58); g.globalAlpha = 1; ring(0, 0, .3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -.22); g.moveTo(0, 0); g.lineTo(.16, .08); g.stroke(); });
  cell(2, 3, () => { for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .3; g.beginPath(); g.arc(0, 0, .75, a, a + .9); g.stroke(); arrow(Math.cos(a + .9) * .75, Math.sin(a + .9) * .75, Math.cos(a + 1.05) * .32, Math.sin(a + 1.05) * .32, .15); } dot(0, 0, .12); });
  cell(2, 4, () => { g.beginPath(); g.moveTo(-.1, -.55); g.lineTo(-.6, .45); g.lineTo(.4, .45); g.closePath(); g.fill(); g.setLineDash([.09, .1]); g.beginPath(); g.moveTo(.35, -.65); g.lineTo(-.1, .3); g.lineTo(.8, .3); g.closePath(); g.stroke(); g.setLineDash([]); });
  const tx = new THREE.CanvasTexture(cv); tx.generateMipmaps = false; tx.minFilter = tx.magFilter = THREE.LinearFilter; tx.colorSpace = THREE.NoColorSpace; return tx;
}
function glyphMat(atlas) {
  return new THREE.ShaderMaterial({ ...AB, uniforms: { uMap: { value: atlas }, uCol: { value: new THREE.Vector3() }, uC: { value: 0 }, uPos: { value: 0 }, uBlur: { value: 0 }, uA: { value: 0 }, uS: { value: .5 } },
    vertexShader: `uniform float uS; varying vec2 vU; void main(){ vU = uv; vec4 c = modelViewMatrix * vec4(0., 0., 0., 1.); c.xy += position.xy * uS; gl_Position = projectionMatrix * c; }`,
    fragmentShader: `uniform sampler2D uMap; uniform vec3 uCol; uniform float uC, uPos, uBlur, uA; varying vec2 vU;
      float cellAt(float s, float x){ float row = mod(floor(s), 5.), fy = fract(s); return texture2D(uMap, vec2((uC + x) / 3., 1. - (row + fy) / 5.)).r; }
      void main(){ float s = uPos + (1. - vU.y), v = 0.;
        for (int i = 0; i < 6; i++) v += cellAt(s + (float(i) / 5. - .5) * uBlur, vU.x);       /* 빨리 돌수록 위아래로 번짐 */
        v /= 6.; float win = smoothstep(0., .22, vU.y) * smoothstep(1., .78, vU.y);              /* 보석 창 안에서만 보임 */
        vec3 c = mix(uCol * uCol * .75, vec3(.8), smoothstep(.75, 1., v) * .5) * v;              /* 빛 번짐에 하얗게 뭉개지지 않게 밝기를 눌러 둠 */
        gl_FragColor = vec4(c * win * uA, 1.); }` });
}
const haloMat = () => new THREE.ShaderMaterial({ ...AB, uniforms: { uCol: { value: new THREE.Vector3() }, uI: { value: 0 }, uS: { value: 1.6 } },
  vertexShader: `uniform float uS; varying vec2 vP; void main(){ vP = position.xy * 2.; vec4 c = modelViewMatrix * vec4(0.,0.,0.,1.); c.xy += position.xy * uS; gl_Position = projectionMatrix * c; }`,
  fragmentShader: `uniform vec3 uCol; uniform float uI; varying vec2 vP; void main(){ float r = length(vP), k = max(0., 1. - r); gl_FragColor = vec4(uCol * uCol * k * k * k * uI, 1.); }` });

/* 점 묶음(꼬리·불꽃·가루): 한 번에 그림 */
function pointPool(n) {
  const g = new THREE.BufferGeometry(), arr = [];
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aA', new THREE.Float32BufferAttribute(new Float32Array(n), 1)); g.setAttribute('aC', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  for (let i = 0; i < n; i++) arr.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), c: new THREE.Vector3(), life: 0, max: 1, g: 0, s: 1 });
  const m = new THREE.ShaderMaterial({ ...AB, uniforms: { uPx: { value: 800 } },
    vertexShader: `attribute float aA; attribute vec3 aC; uniform float uPx; varying float vA; varying vec3 vC;
      void main(){ vA = aA; vC = aC; vec4 v = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * v; gl_PointSize = aA > 0. ? uPx * .035 * (.4 + aA) / max(.5, -v.z) : 0.; }`,
    fragmentShader: `varying float vA; varying vec3 vC; void main(){ vec2 d = gl_PointCoord - .5; float r = length(d) * 2., k = max(0., 1. - r); gl_FragColor = vec4(mix(vC, vec3(1.3), k * k * vA) * k * k * vA, 1.); }` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 8;
  const emit = (f, k = 1) => { for (let j = 0, c = 0; j < arr.length && c < k; j++) if (arr[j].life <= 0) { f(arr[j]); c++; } };
  const update = dt => { const P = g.attributes.position, Aa = g.attributes.aA, C = g.attributes.aC; let any = false;
    arr.forEach((q, i) => { if (q.life > 0) { any = true; q.life -= dt; q.p.addScaledVector(q.v, dt); q.v.y -= q.g * dt; q.v.multiplyScalar(Math.exp(-1.6 * dt)); }
      P.setXYZ(i, q.p.x, q.p.y, q.p.z); Aa.setX(i, q.life > 0 ? (q.life / q.max) * q.s : 0); C.setXYZ(i, q.c.x, q.c.y, q.c.z); });
    P.needsUpdate = Aa.needsUpdate = C.needsUpdate = true; pts.visible = any; };
  return { pts, emit, update, setPx: px => { m.uniforms.uPx.value = px; } };
}

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
export function makeSkillPick(ship, opt = {}) {
  const G = new THREE.Group(), atlas = glyphAtlas(), geo = brilliant();
  const ui = opt.ui, light = new THREE.PointLight(0xffffff, 0, 3.4, 2); G.add(light);           /* 빛이 기체를 스쳐 감 (처음부터 넣어 둠: 나중에 넣으면 그림 다시 짜느라 멈칫함) */
  const trail = pointPool(220), sparks = pointPool(260); G.add(trail.pts, sparks.pts);
  /* 판 위에 퍼지는 색 고리 (고른 순간) */
  const ringM = new THREE.ShaderMaterial({ ...AB, uniforms: { uR: { value: 0 }, uI: { value: 0 }, uCol: { value: new THREE.Vector3() } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uR, uI; uniform vec3 uCol; varying vec2 vP; void main(){ float r = length(vP), d = (r - uR) / .09, d2 = (r - uR * .75) / .3;
      float k = exp(-d * d) * 1.4 + exp(-d2 * d2) * .25; gl_FragColor = vec4(mix(uCol, vec3(1.2), exp(-d * d) * .4) * k * uI, 1.); }` });
  const ring = new THREE.Mesh(new THREE.CircleGeometry(4.5, 96), ringM); ring.rotation.x = -Math.PI / 2; ring.position.y = .26; ring.renderOrder = 7; G.add(ring);
  const gems = [0, 1, 2].map(i => {
    const o = new THREE.Group(), back = new THREE.Mesh(geo, gemMat(true)), front = new THREE.Mesh(geo, gemMat(false));
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glyphMat(atlas)), halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat()), sh = new THREE.Mesh(geo, shardMat());
    back.renderOrder = 4; gl.renderOrder = 5; front.renderOrder = 6; halo.renderOrder = 3; sh.renderOrder = 6; [gl, halo].forEach(m => m.frustumCulled = false); sh.frustumCulled = false;
    const body = new THREE.Group(); body.add(back, front); body.scale.setScalar(GEMR); sh.scale.setScalar(GEMR); o.add(halo, body, gl, sh); G.add(o);
    const tag = document.createElement('div'); tag.className = 'gtag'; tag.innerHTML = '<b></b><span></span>'; ui?.appendChild(tag);
    return { i, o, body, back, front, gl, halo, sh, tag, skill: 0, state: 'off', pos: 0, t0: 0, ts: 0, stopAt: 0, pa: 0, tgt: 0, last: 0, fly: 0, P0: new THREE.Vector3(), flash: 0, popAt: 0 };
  });
  /* 머리 위 안내 */
  const head = document.createElement('div'); head.id = 'pickhead'; head.innerHTML = '<div class="steps"></div><b></b><span></span><div class="bar"><i></i></div>'; ui?.appendChild(head);
  const hint = document.createElement('div'); hint.id = 'pickhint'; ui?.appendChild(hint);
  const chips = document.createElement('div'); chips.id = 'pickchips'; ui?.appendChild(chips);

  const st = { on: false, cat: 0, phase: 'idle', T: 0, P: PICK.first, picked: [], deadline: 0, done: null, phi: 0, w: 0, auto: false, chose: -1, chT: 0 };
  const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  const shipC = () => ship.getWorldPosition(tmpV).clone().add(new THREE.Vector3(0, .15, 0));
  const col = c => new THREE.Vector3(...CATS[c].col);

  function drawHead() { const C = CATS[st.cat];
    head.style.setProperty('--c', C.css);
    head.querySelector('.steps').innerHTML = CATS.map((c, i) => `<i class="${i < st.cat ? 'done' : i === st.cat ? 'now' : ''}" style="--c:${c.css}"></i>`).join('');
    head.querySelector('b').textContent = `${C.name} 스킬`; head.querySelector('span').textContent = `${C.en} · ${st.cat + 1}/3`; }
  function startCat(t, c) {
    st.cat = c; st.phase = 'rise'; st.T = t; st.chose = -1; st.auto = false; drawHead(); head.classList.add('on'); hint.classList.remove('on');
    const pool = [0, 1, 2, 3, 4].sort(() => Math.random() - .5).slice(0, 3), C = col(c);
    gems.forEach((g, i) => { g.skill = pool[i]; g.state = 'rise'; g.t0 = t + i * .12; g.o.visible = true; g.sh.visible = false; g.body.visible = true; g.gl.visible = true;
      for (const m of [g.back, g.front, g.gl, g.halo, g.sh]) m.material.uniforms.uCol.value.copy(C);
      g.gl.material.uniforms.uC.value = c; g.pos = Math.random() * 5; g.last = Math.floor(g.pos);
      g.stopAt = t + st.P.rise + st.P.spin + i * st.P.gap; g.tag.classList.remove('on', 'pick', 'gone'); g.tag.style.setProperty('--c', CATS[c].css);
      g.tag.querySelector('b').textContent = CATS[c].list[g.skill][0]; g.tag.querySelector('span').textContent = CATS[c].list[g.skill][1]; });
    st.phi = Math.random() * 6.28; st.w = 1.3; shimmer(st.P.rise + .2);
  }
  function choose(t, gi, auto = false) {
    if (st.phase !== 'pick') return; st.phase = 'absorb'; st.chT = t; st.chose = gi; st.auto = auto; hint.classList.remove('on');
    const g = gems[gi]; g.state = 'chosen'; g.t0 = t; g.P0.copy(g.o.position); g.tag.classList.add('pick');
    gems.forEach(o => { if (o !== g) { o.state = 'break'; o.t0 = t + .12; o.tag.classList.add('gone'); } });
    bell(1318.5, .1, .9); st.picked[st.cat] = g.skill;
  }
  G.userData.start = (t, again = false, done = null) => { st.on = true; st.P = again ? PICK.again : PICK.first; st.picked = []; st.done = done; chips.innerHTML = ''; chips.classList.remove('on'); startCat(t, 0); };
  G.userData.stop = () => { st.on = false; st.phase = 'idle'; gems.forEach(g => { g.o.visible = false; g.tag.classList.remove('on', 'pick', 'gone'); }); head.classList.remove('on'); hint.classList.remove('on'); light.intensity = 0; };
  G.userData.hideChips = () => chips.classList.remove('on');
  G.userData.setPx = px => { trail.setPx(px); sparks.setPx(px); };
  G.userData.st = st;
  /* 누른 자리에서 가장 가까운 보석 (화면 위 거리) */
  G.userData.tap = (x, y, cam, W, H, t) => { if (st.phase !== 'pick') return false; let best = -1, bd = 1e9;
    gems.forEach((g, i) => { if (g.state !== 'ready') return; const p = g.o.getWorldPosition(new THREE.Vector3()).project(cam), sx = (p.x * .5 + .5) * W, sy = (-p.y * .5 + .5) * H, d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = i; } });
    if (best >= 0 && bd < Math.max(70, H * .14)) { choose(t, best); return true; } return false; };
  G.userData.camFocus = () => st.on ? 1 : 0;

  G.userData.update = (t, dt, cam, W, H) => {
    trail.update(dt); sparks.update(dt);
    if (!st.on) return;
    const C = col(st.cat), sc = shipC(), cs = CATS[st.cat].css;
    /* 둘레 도는 속도: 돌릴 땐 빠르게, 다 서면 천천히 (고르기 쉽게) */
    const allStop = gems.every(g => g.state !== 'rise' && g.state !== 'spin');
    st.w += ((allStop ? .1 : 1.25) - st.w) * Math.min(1, dt * (allStop ? 1.8 : 3)); st.phi += st.w * dt;
    gems.forEach((g, i) => {
      const U = g.back.material.uniforms, Uf = g.front.material.uniforms, Ug = g.gl.material.uniforms, Uh = g.halo.material.uniforms;
      for (const u of [U, Uf]) u.uT.value = t; g.sh.material.uniforms.uT.value = t;
      const a = st.phi + i * Math.PI * 2 / 3, home = new THREE.Vector3(Math.cos(a) * ORBIT, GEMY + Math.sin(t * 1.7 + i * 2) * .07, Math.sin(a) * ORBIT);
      /* 보석 자세: 테이블이 화면 쪽을 비스듬히 보게 + 제 축으로 천천히 돌며 면마다 반짝 */
      const toCam = cam.position.clone().sub(g.o.position); toCam.y = 0; toCam.normalize().multiplyScalar(.55).add(new THREE.Vector3(0, 1, 0)).normalize();   /* 위를 보되 화면 쪽으로 30°쯤: 윗면 깎인 면과 옆 거들이 함께 보임 */
      tmpQ.setFromUnitVectors(Y, toCam); tmpQ2.setFromAxisAngle(Y, t * (g.state === 'spin' ? 2.2 : .55) + i * 2); g.body.quaternion.copy(tmpQ).multiply(tmpQ2); g.sh.quaternion.copy(g.body.quaternion);
      g.flash = Math.max(0, g.flash - dt * 3.2); let glow = 0, alpha = 1, gA = 1, gS = .62;
      if (g.state === 'rise') {                        /* 판 가운데에서 나선으로 떠오름 */
        const u = sm01((t - g.t0) / st.P.rise), aa = a - (1 - u) * 2.4, r = ORBIT * (.15 + .85 * u);
        g.o.position.set(Math.cos(aa) * r, .3 + (home.y - .3) * (1 - (1 - u) * (1 - u)), Math.sin(aa) * r);
        const s = Math.max(.001, u); g.body.scale.setScalar(GEMR * s); gA = u; alpha = u; glow = 1 - u * .5;
        if (u > 0 && u < 1) trail.emit(q => { q.p.copy(g.o.position); q.v.set((Math.random() - .5) * .3, (Math.random() - .5) * .3, (Math.random() - .5) * .3); q.max = q.life = .35 + Math.random() * .3; q.g = 0; q.c.copy(C); q.s = .9; }, 2);
        if (u >= 1) { g.state = 'spin'; g.ts = t; }
        g.pos += 9 * dt;
      } else if (g.state === 'spin') {                 /* 슬롯: 일정 속도 → 멈출 자리 정해 부드럽게 서고 살짝 튕김 */
        g.o.position.copy(home); const D = .6;
        if (t < g.stopAt - D) { g.pos += 9 * dt; g.pa = g.pos; g.paT = t;
          let n = Math.ceil(g.pa + 9 * D * .45); while (((n % 5) + 5) % 5 !== g.skill) n++; g.tgt = n; }
        else { const u = Math.min(1, (t - g.paT) / D), m0 = 9 * D, h = (2 * u ** 3 - 3 * u * u + 1) * g.pa + (u ** 3 - 2 * u * u + u) * m0 + (-2 * u ** 3 + 3 * u * u) * g.tgt; g.pos = h;
          if (u >= 1) { g.state = 'ready'; g.popAt = t; g.flash = 1; bell([1318.5, 1661.2, 1975.5][i], .13, 1.4); g.tag.classList.add('on'); } }
        glow = .55 + .25 * Math.sin(t * 18 + i);
      } else if (g.state === 'ready') {
        g.o.position.copy(home); const e = t - g.popAt; g.pos = g.tgt + Math.sin(Math.min(1, e / .45) * Math.PI * 2) * Math.exp(-e * 6) * .12;
        const left = st.deadline - t; glow = .25 + .2 * Math.sin(t * 3 + i) + (st.phase === 'pick' && left < 3 ? .35 * (.5 + .5 * Math.sin(t * 12)) : 0);
        gS = .62 + .06 * Math.exp(-e * 5);
      } else if (g.state === 'chosen') {               /* 살짝 부풀었다가 기체로 빨려 듦 (처음은 천천히, 닿을 때 가장 빠르게) */
        const e = t - g.t0, pre = .14, F = .42;
        if (e < pre) { g.o.position.copy(g.P0); g.body.scale.setScalar(GEMR * (1 + .22 * Math.sin(e / pre * Math.PI * .5))); glow = 1; g.flash = Math.max(g.flash, .6); if (e < dt * 1.5) whoosh(); }
        else { const u = Math.min(1, (e - pre) / F), k = u * u * u, mid = g.P0.clone().lerp(sc, .5).add(new THREE.Vector3(0, 1.1, 0));
          const p = g.P0.clone().multiplyScalar((1 - k) * (1 - k)).add(mid.multiplyScalar(2 * (1 - k) * k)).add(sc.clone().multiplyScalar(k * k)); g.o.position.copy(p);
          g.body.scale.setScalar(GEMR * (1.22 - .9 * k)); gS = .62 * (1 - .7 * k); glow = 1;
          trail.emit(q => { q.p.copy(p).add(new THREE.Vector3((Math.random() - .5) * .15, (Math.random() - .5) * .15, (Math.random() - .5) * .15)); q.v.set(0, 0, 0); q.max = q.life = .25 + Math.random() * .25; q.g = 0; q.c.copy(C); q.s = 1.2; }, 5);
          if (u >= 1) { g.state = 'gone'; g.o.visible = false; st.hitT = t; absorb([523.25, 392, 466.16][st.cat]);
            sparks.emit(q => { const aa = Math.random() * 6.283, up = Math.random() * 2.4, out = .8 + Math.random() * 2.8; q.p.copy(sc); q.v.set(Math.cos(aa) * out, up, Math.sin(aa) * out); q.max = q.life = .5 + Math.random() * .7; q.g = 4; q.c.copy(C); q.s = 1; }, 120);
            const ch = document.createElement('div'); ch.className = 'chip'; ch.style.setProperty('--c', cs); ch.innerHTML = `<em>${CATS[st.cat].name}</em><b>${CATS[st.cat].list[g.skill][0]}</b>`; chips.appendChild(ch); chips.classList.add('on'); } }
      } else if (g.state === 'break') {                /* 깎인 면대로 부서짐 */
        const e = t - g.t0;
        if (e >= 0) { if (g.body.visible) { g.body.visible = false; g.sh.visible = true; shatter();
            sparks.emit(q => { const v = new THREE.Vector3().randomDirection(); q.p.copy(g.o.position).addScaledVector(v, .2); q.v.copy(v).multiplyScalar(.6 + Math.random() * 1.6); q.v.y += .6; q.max = q.life = .5 + Math.random() * .6; q.g = 2.5; q.c.copy(C); q.s = .7; }, 40); }
          const k = Math.min(1, e / 1.15); g.sh.material.uniforms.uK.value = k; gA = Math.max(0, 1 - e * 5) * (Math.random() < .5 ? 1 : .4); glow = 0;
          if (k >= 1) { g.state = 'gone'; g.o.visible = false; } }
        else { g.o.position.copy(home); }
      }
      U.uA.value = Uf.uA.value = alpha; U.uGlow.value = Uf.uGlow.value = glow; U.uFlash.value = Uf.uFlash.value = g.flash * 1.6;
      Ug.uPos.value = g.pos; Ug.uBlur.value = g.state === 'spin' || g.state === 'rise' ? Math.min(.9, (g.state === 'rise' ? 9 : Math.abs(9 * (1 - Math.min(1, (t - (g.paT || t)) / .6)))) * .07) : 0;
      Ug.uA.value = gA * (g.state === 'gone' ? 0 : 1); Ug.uS.value = GEMR * 1.7 * (gS / .62) * (g.state === 'rise' ? Math.max(.001, sm01((t - g.t0) / st.P.rise)) : 1);
      Uh.uI.value = (g.state === 'gone' || g.state === 'break' && t > g.t0 ? 0 : .12 + glow * .35 + g.flash * 1.4) * alpha; Uh.uS.value = GEMR * 2.6 * (gS / .62);
      /* 이름표: 보석 위 */
      if (g.tag.classList.contains('on') && ui) { const p = g.o.position.clone().add(new THREE.Vector3(0, GEMR * 1.35, 0)).project(cam);
        g.tag.style.transform = `translate(${(p.x * .5 + .5) * W}px,${(-p.y * .5 + .5) * H}px) translate(-50%,-100%)`; }
    });
    /* 시간 제한: 셋 다 서면 시작 */
    if (st.phase === 'rise' && allStop) { st.phase = 'pick'; st.deadline = t + st.P.time; hint.textContent = '보석을 눌러 고르세요'; hint.classList.add('on'); }
    const bar = head.querySelector('.bar i');
    if (st.phase === 'pick') { const left = Math.max(0, st.deadline - t); bar.style.transform = `scaleX(${left / st.P.time})`; head.classList.toggle('hurry', left < 3);
      if (left <= 0) { const ok = gems.map((g, i) => i).filter(i => gems[i].state === 'ready'); choose(t, ok[Math.floor(Math.random() * ok.length)], true); hint.textContent = '시간이 다 돼 무작위로 골랐어요'; hint.classList.add('on'); } }
    else if (st.phase === 'rise') { bar.style.transform = 'scaleX(1)'; head.classList.remove('hurry'); }
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
#pickhead b{font-weight:500;font-size:17px;letter-spacing:.08em;color:rgb(var(--c));text-shadow:0 0 14px rgba(var(--c),.6)}
#pickhead span{font-family:var(--en);font-size:9px;letter-spacing:.24em;color:rgba(var(--c),.6)}
#pickhead .bar{width:150px;height:2px;margin-top:6px;background:rgba(var(--c),.15);overflow:hidden}
#pickhead .bar i{display:block;height:100%;background:rgb(var(--c));transform-origin:center;box-shadow:0 0 8px rgba(var(--c),.9)}
#pickhead.hurry .bar i{background:#ffb070;box-shadow:0 0 10px rgba(255,150,80,.9)}
.gtag{position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;gap:2px;white-space:nowrap;pointer-events:none;opacity:0;--c:255,255,255;transition:opacity .25s}
.gtag b{font-weight:500;font-size:13.5px;color:#fff;letter-spacing:.04em;text-shadow:0 0 10px rgba(var(--c),.9),0 0 2px rgba(var(--c),1)}
.gtag span{font-size:10.5px;color:rgba(var(--c),.95);letter-spacing:.02em;text-shadow:0 0 8px rgba(0,0,0,.9)}
.gtag.on{opacity:1;animation:gpop .35s cubic-bezier(.2,1.6,.4,1)}
.gtag.pick{opacity:0;transition:opacity .2s .1s} .gtag.gone{opacity:0;transition:opacity .12s}
@keyframes gpop{from{opacity:0;filter:blur(4px)}to{opacity:1;filter:none}}
#pickhint{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 62px);transform:translateX(-50%);font-size:12px;letter-spacing:.08em;color:rgba(230,236,250,.8);opacity:0;transition:opacity .4s;pointer-events:none;white-space:nowrap}
#pickhint.on{opacity:1;animation:hb 1.6s ease-in-out infinite}
@keyframes hb{50%{opacity:.45}}
#pickchips{position:absolute;left:max(18px,env(safe-area-inset-left,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 60px);display:flex;flex-direction:column;gap:6px;pointer-events:none;opacity:0;transition:opacity .4s}
#pickchips.on{opacity:1}
#pickchips .chip{display:flex;align-items:baseline;gap:8px;padding:5px 12px 6px 10px;border-left:2px solid rgb(var(--c));background:linear-gradient(90deg,rgba(var(--c),.18),rgba(var(--c),0));animation:chin .45s cubic-bezier(.2,1.3,.4,1)}
#pickchips em{font-style:normal;font-size:10px;letter-spacing:.1em;color:rgba(var(--c),.9)} #pickchips b{font-weight:500;font-size:12.5px;color:#f2f4fb;letter-spacing:.03em}
@keyframes chin{from{opacity:0;transform:translateX(-14px)}}
`;
