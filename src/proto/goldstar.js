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
  const inR = a => shapeR(a, base - RIM, IN_TIP);
  /* 1) 바깥 금테: 별 윤곽에서 안쪽 판 윤곽까지 (끝은 통으로 뾰족한 금) */
  G.add(new THREE.Mesh(slab(p => starPath(p, base, tip), p => starPath(p, base - RIM, IN_TIP, true), 0, .17, .03), gold));
  /* 2) 안쪽 짙은 판: 한 단 낮게 */
  G.add(new THREE.Mesh(slab(p => starPath(p, base - RIM + .005, IN_TIP + .005), p => circlePath(p, hole + .13, true), 0, .11, .012), dark));
  /* 3) 판을 바로 감싸는 금 고리 (두 단: 높은 안쪽 + 낮은 바깥) */
  G.add(new THREE.Mesh(slab(p => circlePath(p, hole + .13), p => circlePath(p, hole, true), 0, .19, .025), gold));
  G.add(new THREE.Mesh(slab(p => circlePath(p, hole + .2), p => circlePath(p, hole + .125, true), 0, .135, .015), goldDim));
  /* 4) 갈래마다 지붕 모양 금 등뼈 + 갈래 사이 오목한 곳의 리벳 셋 */
  const rg = [], rv = [];
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, g = ridge(hole + .2, tip - .5, .2, .11, .19); g.rotateY(-a); rg.push(g);
    for (let j = -1; j <= 1; j++) { const b = a + Math.PI / 4 + j * .09, r = base - RIM * .5, s = new THREE.CylinderGeometry(.022, .026, .02, 10); s.translate(Math.cos(b) * r, .175, Math.sin(b) * r); rv.push(s); } }
  G.add(new THREE.Mesh(mergeGeometries(rg), gold)); G.add(new THREE.Mesh(mergeGeometries(rv), goldDim));
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
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
    for (const sd of [-1, 1]) { const n = 20, r0 = hole + .25, r1 = tip - .62;
      for (let i = 0; i < n; i++) { const u0 = i / n, u1 = (i + 1) / n, ra = r0 + (r1 - r0) * u0, rb = r0 + (r1 - r0) * u1;
        const off = u => .2 * Math.pow(1 - u, .8) + .014, wd = .012;
        const P = (r, o) => [c * r - s * o * sd, .113, s * r + c * o * sd];
        quad(P(ra, off(u0)), P(ra, off(u0) + wd), P(rb, off(u1) + wd), P(rb, off(u1)), u0, u1); } } }
  for (let i = 0; i < 160; i++) { const a0 = i / 160 * Math.PI * 2, a1 = (i + 1) / 160 * Math.PI * 2, r0 = hole + .145, r1 = hole + .175, y = .137;
    quad([Math.cos(a0) * r0, y, Math.sin(a0) * r0], [Math.cos(a0) * r1, y, Math.sin(a0) * r1], [Math.cos(a1) * r1, y, Math.sin(a1) * r1], [Math.cos(a1) * r0, y, Math.sin(a1) * r0], -1, -1); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); lg.setAttribute('aT', new THREE.Float32BufferAttribute(tt, 1));
  const lines = new THREE.Mesh(lg, lineMat); lines.renderOrder = 2; G.add(lines);
  /* 판의 자기장 주기(4.2초)에 맞춤: 판 가운데가 터지기(주기 .85초) 직전, 빛이 갈래 끝 → 고리로 흘러 들어가 고리에 불이 들어옴 */
  G.userData.update = (t, T = 4.2) => { const c = t % T, s = .3, e = .85;
    uFlow.value = c >= s && c < e + .05 ? 1 - (c - s) / (e - s) : -1;
    uRing.value = c >= e - .05 ? Math.exp(-(c - e + .05) * 2.6) * 1.4 : 0; };
  return G;
}
