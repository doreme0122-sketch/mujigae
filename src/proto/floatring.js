/* 시작 기지 — 떠 있는 부활 자리를 바짝 둘러싼 장갑 고리 + 대각선 금 다리 넷
   · 금테 별과 같은 모양 언어: 안쪽이 높고 바깥으로 비스듬히 깎여 내려간다.
   · 장갑판이 원을 따라 비늘처럼 겹쳐 이어진다(한 장의 끝이 살짝 들려 다음 장 위를 덮음). 겹친 틈 속에 파란 빛이 숨어 있다
     — 평소엔 거의 꺼져 있고, 기체가 올라와 판이 켜지면 틈마다 빛이 스며 나온다.
   · 힘은 대각선 네 곳에만: 금 다리가 들어앉는 크고 묵직한 덩어리(깎인 면 여러 개 + 금 테두리 + 짙은 판). 나머지는 이음선만 은은하게.
   · 갈래 사이(대각선)는 별이 오목하게 파여 고리와의 사이에 초승달 틈이 생기고, 그 틈으로 아래 맵이 보인다 → 공중에 떠 있음
   단위는 자기장 판과 같음. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const RING = { r0: 3.3, r1: 4.25, bridgeFrom: 1.98 };

/* 단면(r,y 다각형)을 각도 a0→a1로 돌려 만든 덩어리. lift(u): 각도 진행(0~1)에 따른 높이 더하기(비늘 들림).
   단면 모서리는 날카롭게, 둘레 방향은 매끈하게. 삼각형 앞뒤는 법선에 맞춰 자동으로 맞춘다. */
export function sweep(prof, a0, a1, lift = () => 0, n = 0, ymap = null) {   /* ymap(u, y): 각도 진행에 따라 높이를 바꿈(경사) */
  n = n || Math.max(6, Math.ceil(Math.abs(a1 - a0) / .02));
  const pos = [], nor = [], v = new THREE.Vector3(), w = new THREE.Vector3(), c = new THREE.Vector3();
  const tri = (A, B, C, N) => { v.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]); w.set(C[0] - A[0], C[1] - A[1], C[2] - A[2]); c.crossVectors(v, w);
    const flip = c.x * N[0][0] + c.y * N[0][1] + c.z * N[0][2] < 0, V = flip ? [A, C, B] : [A, B, C], NN = flip ? [N[0], N[2], N[1]] : N;
    for (let i = 0; i < 3; i++) { pos.push(...V[i]); nor.push(...NN[i]); } };
  const P = (q, a, u) => [Math.cos(a) * q[0], ymap ? ymap(u, q[1]) : q[1] + lift(u), Math.sin(a) * q[0]];
  const m = prof.length;
  /* 단면이 반시계(바깥 법선 = (dy,-dr))인지 확인 */
  let area = 0; for (let k = 0; k < m; k++) { const p = prof[k], q = prof[(k + 1) % m]; area += p[0] * q[1] - q[0] * p[1]; }
  const sgn = area > 0 ? 1 : -1;
  for (let i = 0; i < n; i++) { const u0 = i / n, u1 = (i + 1) / n, t0 = a0 + (a1 - a0) * u0, t1 = a0 + (a1 - a0) * u1;
    for (let k = 0; k < m; k++) { const p = prof[k], q = prof[(k + 1) % m], dr = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dr, dy) || 1, nr = dy / l * sgn, ny = -dr / l * sgn;
      const N0 = [Math.cos(t0) * nr, ny, Math.sin(t0) * nr], N1 = [Math.cos(t1) * nr, ny, Math.sin(t1) * nr];
      const A = P(p, t0, u0), B = P(q, t0, u0), C = P(q, t1, u1), D = P(p, t1, u1);
      tri(A, B, C, [N0, N0, N1]); tri(A, C, D, [N0, N1, N1]); } }
  /* 양 끝 마개 */
  const tris = THREE.ShapeUtils.triangulateShape(prof.map(q => new THREE.Vector2(q[0], q[1])), []);
  for (const [ai, ui, sd] of [[a0, 0, -1], [a1, 1, 1]]) { const nn = [-Math.sin(ai) * sd * Math.sign(a1 - a0), 0, Math.cos(ai) * sd * Math.sign(a1 - a0)];
    for (const [x, y, z] of tris) tri(P(prof[x], ai, ui), P(prof[y], ai, ui), P(prof[z], ai, ui), [nn, nn, nn]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return g;
}
export const posNor = g => { if (g.index) g = g.toNonIndexed(); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; };

/* 지붕 모양 단면의 곧은 금 다리 (x축 방향, a→b) */
function beam(a, b, w, h1, h2, y0) {
  const s = new THREE.Shape(); s.moveTo(-w, 0); s.lineTo(w, 0); s.lineTo(w, h1); s.lineTo(w * .35, h2); s.lineTo(-w * .35, h2); s.lineTo(-w, h1); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: b - a, bevelEnabled: true, bevelThickness: .012, bevelSize: .01, bevelSegments: 2 });
  g.rotateY(Math.PI / 2); g.translate(a, y0, 0); return posNor(g);
}

export function makeFloatRing() {
  const G = new THREE.Group(), { r0, r1, bridgeFrom } = RING;
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe2b35c, metalness: 1, roughness: .26, clearcoat: .4, clearcoatRoughness: .2, envMapIntensity: 1.25 });
  const steel = new THREE.MeshPhysicalMaterial({ color: 0x3d4656, metalness: .9, roughness: .3, clearcoat: .35, clearcoatRoughness: .25, envMapIntensity: 1.1 });   /* 어두운 푸른 쇳빛 */
  const steelHi = new THREE.MeshPhysicalMaterial({ color: 0x4a5466, metalness: .9, roughness: .26, clearcoat: .5, clearcoatRoughness: .2, envMapIntensity: 1.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x10131a, metalness: .8, roughness: .5, envMapIntensity: .6 });
  const uOn = { value: 0 }, uT = { value: 0 };
  const glowMat = new THREE.ShaderMaterial({ uniforms: { uOn, uT }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float aK; varying float vK; varying vec3 vW; void main(){ vK=aK; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uOn,uT; varying float vK; varying vec3 vW;
      void main(){ float a=atan(vW.z,vW.x); float breathe=.8+.2*sin(uT*1.6+a*3.);
        float edge=smoothstep(0.,.35,vK)*smoothstep(1.,.65,vK);           /* 틈 가운데가 가장 밝고 양 끝은 스러짐 */
        gl_FragColor=vec4(vec3(.28,.58,1.35)*edge*(.04+uOn*1.2*breathe),1.); }` });
  const L = { gold: [], steel: [], steelHi: [], dark: [] }, glowPos = [], glowK = [];

  /* 바닥 몸통: 이어진 짙은 고리 + 아래 배 (옆에서 봐도 떠 있는 두께) */
  L.dark.push(sweep([[r0 + .02, -.3], [r1 - .05, -.3], [r1 + .03, -.18], [r1 + .03, .02], [r0 + .02, .02]], 0, Math.PI * 2, undefined, 160));

  /* 비늘 장갑판: 대각선 덩어리 사이 네 구간, 구간마다 다섯 장 */
  const BLK = .26;                                         /* 대각선 덩어리 반폭(라디안) */
  const plate = [[r0, -.04], [r1 + .01, -.04], [r1 + .01, .03], [r1 - .14, .1], [r0 + .3, .2], [r0 + .07, .24], [r0, .19]];
  const yAt = r => r < r0 + .07 ? .19 + (r - r0) / .07 * .05 : r < r0 + .3 ? .24 - (r - r0 - .07) / .23 * .04 : r < r1 - .14 ? .2 - (r - r0 - .3) / (r1 - .14 - r0 - .3) * .1 : .1 - (r - r1 + .14) / .15 * .07;
  for (let q = 0; q < 4; q++) { const s0 = Math.PI / 4 + q * Math.PI / 2 + BLK, s1 = Math.PI / 4 + (q + 1) * Math.PI / 2 - BLK, NP = 5, span = (s1 - s0) / NP, OV = .03;
    for (let i = 0; i < NP; i++) { const a0 = s0 + i * span, a1 = Math.min(s1, a0 + span + (i < NP - 1 ? OV : 0));
      L[i % 2 ? 'steelHi' : 'steel'].push(sweep(plate, a0, a1, u => .028 * Math.pow(u, 2)));     /* 끝으로 갈수록 살짝 들려 다음 장을 덮음 */
      if (i > 0) { /* 겹친 틈 속 빛: 아래 장 윗면을 따라 반지름 방향으로 */
        const a = a0 + .006, n = 14; for (let j = 0; j < n; j++) { const ra = r0 + .12 + (r1 - .22 - r0 - .12) * j / n, rb = r0 + .12 + (r1 - .22 - r0 - .12) * (j + 1) / n, w = .022;
          const Q = (r, d) => [Math.cos(a + d / r) * r, yAt(r) + .003, Math.sin(a + d / r) * r];
          const A = Q(ra, 0), B = Q(rb, 0), C = Q(rb, w), D = Q(ra, w); glowPos.push(...A, ...B, ...C, ...A, ...C, ...D); const ka = j / n, kb = (j + 1) / n; glowK.push(ka, kb, kb, ka, kb, ka); } } } }

  /* 대각선 덩어리: 깎인 면 여럿 + 금 테두리 + 짙은 판. 가운데 홈에 금 다리가 들어앉음 */
  const blk = [[r0 - .03, -.06], [r1 + .04, -.06], [r1 + .04, .05], [r1 - .1, .15], [r0 + .62, .3], [r0 + .46, .38], [r0 + .07, .38], [r0 - .03, .3]];
  const trimIn = [[r0 + .05, .375], [r0 + .15, .375], [r0 + .15, .4], [r0 + .07, .4]];
  const trimOut = [[r0 + .44, .375], [r0 + .5, .372], [r0 + .5, .395], [r0 + .45, .4]];
  const inset = [[r0 + .19, .376], [r0 + .4, .376], [r0 + .4, .388], [r0 + .19, .388]];
  const slope = [[r0 + .64, .3], [r1 - .12, .155], [r1 - .12, .17], [r0 + .64, .315]];       /* 비탈면 가운데 금 띠 */
  for (let q = 0; q < 4; q++) { const am = Math.PI / 4 + q * Math.PI / 2, GAP = .055;
    for (const [b0, b1] of [[am - BLK - .015, am - GAP], [am + GAP, am + BLK + .015]]) {
      L.steelHi.push(sweep(blk, b0, b1));
      L.gold.push(sweep(trimIn, b0 + .01, b1 - .01)); L.gold.push(sweep(trimOut, b0 + .01, b1 - .01)); L.gold.push(sweep(slope, b0 + .03, b1 - .03));
      L.dark.push(sweep(inset, b0 + .03, b1 - .03));
      /* 홈 쪽 벽에 금 판 (다리를 감싸는 문틀) */
      const wa = b0 > am ? b0 + .002 : b1 - .002; L.gold.push(sweep([[r0 - .01, .02], [r0 + .66, .02], [r0 + .66, .31], [r0 + .46, .39], [r0 - .01, .39]], wa, wa + (b0 > am ? .012 : -.012), undefined, 1)); }
    L.dark.push(sweep([[r0 - .02, -.05], [r1, -.05], [r1, .06], [r0 - .02, .06]], am - GAP, am + GAP)); }   /* 홈 바닥 */

  /* 대각선 금 다리: 별의 갈래 사이 테에서 곧게 뻗어 덩어리 홈 속까지 */
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2;
    const g = beam(bridgeFrom, r0 + .6, .05, .05, .085, .14); g.rotateY(-a); L.gold.push(g);
    const c = new THREE.CylinderGeometry(.08, .08, .1, 16); c.rotateZ(Math.PI / 2); c.translate(bridgeFrom + .3, .19, 0); c.rotateY(-a); L.gold.push(posNor(c)); }

  const add = (list, mat) => { if (list.length) G.add(new THREE.Mesh(mergeGeometries(list.map(posNor)), mat)); };
  add(L.steel, steel); add(L.steelHi, steelHi); add(L.dark, dark); add(L.gold, gold);
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(glowPos, 3)); gg.setAttribute('aK', new THREE.Float32BufferAttribute(glowK, 1));
  const gm = new THREE.Mesh(gg, glowMat); gm.renderOrder = 3; G.add(gm);
  G.userData.update = (t, on) => { uT.value = t; uOn.value += ((on ? 1 : 0) - uOn.value) * .06; };
  return G;
}
