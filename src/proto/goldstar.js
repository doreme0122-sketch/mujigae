/* 시작 기지 — 자기장 판을 감싸는 금테 네 갈래 별
   판 바로 바깥의 금 고리에서 네 군데가 안으로 휜 곡선을 그리며 뾰족하게 뻗는다(갈래 사이는 오목하게 파인 곡선).
   · 금 테두리(바깥 윤곽을 따라 도는 테) + 그 안에 한 단 낮게 들어간 짙은 판 + 갈래마다 가운데를 지나는 금 등뼈(지붕처럼 양쪽으로 비스듬)
   · 등뼈 양옆에 가는 빛길: 평소엔 꺼져 있고, 판이 기체를 띄우기 직전에 빛이 갈래 끝에서 고리 쪽으로 흘러 들어가 판을 깨운다
     (나중에 결정 탑이 받은 빛이 이 갈래를 타고 들어오는 길 — 빛이 오는 데는 이유가 있다)
   단위는 자기장 판과 같음(판 반지름 1.6, 판 윗면 높이 약 .155). 갈래는 x·z 축 방향(한 갈래가 출구를 가리킴). */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const STAR = { hole: 1.66, base: 2.05, tip: 3.15 };
const N = 360;
/* 바깥 윤곽: 갈래 끝(0·90·180·270도)에서 뾰족, 갈래 사이(45도)에서 고리 반지름까지 오목하게 */
const shapeR = (phi, rb, rt, p = 2.3) => rb + (rt - rb) * Math.pow(1 - Math.abs(Math.sin(2 * phi)), p);
function starPath(path, rb, rt, rev = false) { const pts = [];
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, r = shapeR(a, rb, rt); pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
  if (rev) pts.reverse(); path.setFromPoints(pts); path.closePath?.(); return path; }
function circlePath(path, r, rev = false) { const pts = []; for (let i = 0; i < 160; i++) { const a = i / 160 * Math.PI * 2; pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
  if (rev) pts.reverse(); path.setFromPoints(pts); return path; }
/* 눕혀서 y0 위로 h만큼 세운 판 */
function slab(outer, hole, y0, h, bevel) { const s = outer(new THREE.Shape()); s.holes.push(hole(new THREE.Path()));
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.001, h - bevel * 2), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * .9, bevelSegments: 3, curveSegments: 1, steps: 1 });
  g.rotateX(-Math.PI / 2); g.translate(0, y0 + bevel, 0); return g; }
/* 지붕 모양 등뼈: 고리 쪽 a에서 갈래 끝 쪽 b까지, 폭이 줄어들며 끝이 뾰족 */
function ridge(a, b, w0, y0, y1) { const pos = [], n = 24;
  for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, x0 = a + (b - a) * t0, x1 = a + (b - a) * t1, w = t => w0 * Math.pow(1 - t, .8), h = t => y0 + (y1 - y0) * (1 - t * .55);
    const L0 = [x0, y0, -w(t0)], A0 = [x0, h(t0), 0], R0 = [x0, y0, w(t0)], L1 = [x1, y0, -w(t1)], A1 = [x1, h(t1), 0], R1 = [x1, y0, w(t1)];
    pos.push(...L0, ...A0, ...A1, ...L0, ...A1, ...L1, ...A0, ...R0, ...R1, ...A0, ...R1, ...A1); }
  pos.push(a, y0, w0, a, y1, 0, a, y0, -w0);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; }

export function makeGoldStar() {
  const G = new THREE.Group(), { hole, base, tip } = STAR;
  /* 금: 거울처럼 비치되 결이 살짝 있는 금속 */
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe2b35c, metalness: 1, roughness: .26, clearcoat: .4, clearcoatRoughness: .2, envMapIntensity: 1.25 });
  const goldDim = new THREE.MeshPhysicalMaterial({ color: 0xb8893e, metalness: 1, roughness: .38, envMapIntensity: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x161a22, metalness: .85, roughness: .34, envMapIntensity: .8 });
  const RIM = .15, IN_TIP = tip - .46;                      /* 테 두께, 안쪽 판이 끝나는 곳(끝 부분은 통금) */
  /* 1) 비탈진 금 날개: 판 쪽 금 고리에서 높게 시작해 바깥 윤곽으로 갈수록 바닥까지 꺾여 내려간다.
        높이가 '고리에서 윤곽까지 얼마나 왔나'로 정해지므로, 뾰족한 갈래는 저절로 가운데에 등선(모서리)이 서고 양쪽이 비탈이 된다.
        가장자리 바로 앞에서 한 번 더 가파르게 꺾여(모따기) 금빛이 테두리에 선으로 맺힌다. */
  const R0 = hole + .2, YT = .2, LIP = .86;
  const height = u => u < LIP ? YT - .12 * Math.pow(u / LIP, 1.25) : (YT - .12) - (YT - .12 - .02) * Math.pow((u - LIP) / (1 - LIP), .8);
  const at = (phi, u) => { const R = shapeR(phi, base, tip), r = R0 + (R - R0) * u; return [Math.cos(phi) * r, height(u), Math.sin(phi) * r]; };
  const NA = 90, NU = 22, wings = [];
  for (let k = 0; k < 8; k++) {                 /* 갈래 끝과 갈래 사이에서 면을 나눠 등선이 날카롭게 */
    const pos = [], idx = [], a0 = k * Math.PI / 4;
    for (let i = 0; i <= NA; i++) { const ph = a0 + (Math.PI / 4) * i / NA;
      for (let j = 0; j <= NU; j++) { const u = j < NU - 4 ? (j / (NU - 4)) * LIP : LIP + (1 - LIP) * (j - (NU - 4)) / 4; pos.push(...at(ph, u)); }
      const e = at(ph, 1); pos.push(e[0], 0, e[2]); }                                  /* 바닥까지 내려가는 옆면 */
    const W = NU + 2;
    for (let i = 0; i < NA; i++) for (let j = 0; j < W - 1; j++) { const p0 = i * W + j, p1 = p0 + W; idx.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); wings.push(g); }
  G.add(new THREE.Mesh(mergeGeometries(wings), gold));
  /* 2) 모따기 꺾이는 자리 바로 안쪽의 가는 홈 (테두리를 두 줄로 보이게) */
  { const pos = []; for (let i = 0; i < N; i++) { const p0 = i / N * Math.PI * 2, p1 = (i + 1) / N * Math.PI * 2, ua = LIP - .055, ub = LIP - .035;
      const A = at(p0, ua), B = at(p0, ub), C = at(p1, ub), D = at(p1, ua); [A, B, C, D].forEach(v => v[1] += .003); pos.push(...A, ...C, ...B, ...A, ...D, ...C); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); G.add(new THREE.Mesh(g, dark)); }
  /* 3) 판을 바로 감싸는 금 고리 (두 단: 높은 안쪽 + 낮은 바깥) */
  G.add(new THREE.Mesh(slab(p => circlePath(p, hole + .13), p => circlePath(p, hole, true), 0, .23, .025), gold));
  G.add(new THREE.Mesh(slab(p => circlePath(p, R0 + .01), p => circlePath(p, hole + .125, true), 0, .205, .012), goldDim));
  /* 5) 빛길: 등뼈 양옆의 가는 홈 + 판을 감싸는 고리 홈. uFlow = 빛이 끝(1)에서 고리(0)로 오는 위치 */
  const uFlow = { value: -1 }, uRing = { value: 0 };
  const lineMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uFlow, uRing },
    vertexShader: 'attribute float aT; varying float vT; void main(){ vT=aT; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uFlow, uRing; varying float vT;
      void main(){ float head = exp(-pow((vT-uFlow)*7., 2.)); float tail = step(uFlow, vT) * exp(-(vT-uFlow)*4.) * step(-.5, uFlow);
        float ring = vT < 0. ? uRing : 0.;
        float b = vT < 0. ? ring : head*1.6 + tail*.35;
        vec3 c = mix(vec3(.25,.5,1.2), vec3(.85,.95,1.3), head);
        gl_FragColor = vec4(c*b, 1.); }` });
  const pos = [], tt = [];
  const quad = (p0, p1, p2, p3, t0, t1) => { pos.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3); tt.push(t0, t0, t1, t0, t1, t1); };
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2;
    for (const sd of [-1, 1]) { const n = 24;
      for (let i = 0; i < n; i++) { const u0 = .06 + .7 * i / n, u1 = .06 + .7 * (i + 1) / n;
        const P = (u, o) => { const R = shapeR(a, base, tip), r = R0 + (R - R0) * u, ph = a + sd * Math.asin(Math.min(.9, o / r)), p = at(ph, (r - R0) / (shapeR(ph, base, tip) - R0)); p[1] += .004; return p; };
        const off = u => .07 * (1 - u) + .025, wd = .014;
        quad(P(u0, off(u0)), P(u0, off(u0) + wd), P(u1, off(u1) + wd), P(u1, off(u1)), i / n, (i + 1) / n); } } }
  for (let i = 0; i < 160; i++) { const a0 = i / 160 * Math.PI * 2, a1 = (i + 1) / 160 * Math.PI * 2, r0 = hole + .145, r1 = hole + .19, y = .207;
    quad([Math.cos(a0) * r0, y, Math.sin(a0) * r0], [Math.cos(a0) * r1, y, Math.sin(a0) * r1], [Math.cos(a1) * r1, y, Math.sin(a1) * r1], [Math.cos(a1) * r0, y, Math.sin(a1) * r0], -1, -1); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); lg.setAttribute('aT', new THREE.Float32BufferAttribute(tt, 1));
  const lines = new THREE.Mesh(lg, lineMat); lines.renderOrder = 2; G.add(lines);
  /* 판의 자기장 주기(4.2초)에 맞춤: 판 가운데가 터지기(주기 .85초) 직전, 빛이 갈래 끝 → 고리로 흘러 들어가 고리에 불이 들어옴 */
  G.userData.update = (t, T = 4.2) => { const c = t % T, s = .3, e = .85;
    uFlow.value = c >= s && c < e + .05 ? 1 - (c - s) / (e - s) : -1;
    uRing.value = c >= e - .05 ? Math.exp(-(c - e + .05) * 2.6) * 1.4 : 0; };
  return G;
}
