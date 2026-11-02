/* 시작 기지 — 떠 있는 부활 자리를 바짝 둘러싼 기계 고리 + 대각선 금 다리 넷
   · 금테 별 바로 바깥을 장갑 덩어리들이 이어 붙은 기계 고리가 감싼다. 갈래 끝 쪽은 고리와 거의 닿고,
     갈래 사이(대각선)는 오목하게 파여 있어 그 초승달 모양 틈으로 아래 맵이 보인다 → 공중에 떠 있음
   · 고리 조각 (16칸, 한 칸 = 22.5도)
     - 갈래 끝 앞: 별 끝을 물고 있는 잠금 덩어리(금 이빨이 별 끝을 향함)
     - 대각선: 금 다리를 붙잡는 무거운 집게 덩어리(금 테두리)
     - 그 사이: 장갑판 — 윗면에 한 단 파인 판, 통풍 살창, 볼트
     - 조각 사이: 낮은 이음 마디 — 가로 관 두 줄, 파란 빛 틈(기체가 있어 판이 켜진 동안만 켜짐)
   단위는 자기장 판과 같음. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const RING = { r0: 3.3, r1: 4.3, bridgeFrom: 1.98 };
const D2 = Math.PI / 8;                       /* 한 칸 22.5도 */
const NI = g => g.index ? g.toNonIndexed() : g;
const strip = g => { g.deleteAttribute('uv'); return NI(g); };

/* 부채꼴 덩어리 (r0~r1, a0~a1, 바닥 y0, 높이 h, 모서리 깎기) — 틈 폭이 어디서나 같게 */
function sector(r0, r1, a0, a1, y0, h, bev = .03, gap = .04) {
  const s = new THREE.Shape(), N = 14, da = r => Math.asin(Math.min(.9, gap / 2 / r));
  for (let i = 0; i <= N; i++) { const a = a0 + da(r1) + (a1 - a0 - 2 * da(r1)) * i / N; i ? s.lineTo(Math.cos(a) * r1, -Math.sin(a) * r1) : s.moveTo(Math.cos(a) * r1, -Math.sin(a) * r1); }
  for (let i = N; i >= 0; i--) { const a = a0 + da(r0) + (a1 - a0 - 2 * da(r0)) * i / N; s.lineTo(Math.cos(a) * r0, -Math.sin(a) * r0); }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.002, h - 2 * bev), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev * .9, bevelSegments: 2, curveSegments: 1 });
  g.rotateX(-Math.PI / 2); g.translate(0, y0 + bev, 0);       /* 눕힘 (모양을 -sin으로 그려 각도 방향을 맞춤) */
  return strip(g);
}
const at = (g, r, a, y = 0, yaw = 0) => { g.rotateY(-a + yaw); g.translate(Math.cos(a) * r, y, Math.sin(a) * r); return strip(g); };
function box(w, h, d, r, a, y) { return at(new THREE.BoxGeometry(w, h, d), r, a, y + h / 2); }       /* w: 반지름 방향, d: 둘레 방향 */
function cyl(rad, len, r, a, y) { const g = new THREE.CylinderGeometry(rad, rad, len, 12); g.rotateX(Math.PI / 2); return at(g, r, a, y); }   /* 둘레 방향으로 누운 관 */
function bolt(r, a, y) { const g = new THREE.CylinderGeometry(.028, .032, .025, 8); return at(g, r, a, y + .012); }

/* 지붕 모양 단면의 곧은 금 다리 (x축 방향, a→b) */
function beam(a, b, w, h1, h2, y0) {
  const s = new THREE.Shape(); s.moveTo(-w, 0); s.lineTo(w, 0); s.lineTo(w, h1); s.lineTo(w * .35, h2); s.lineTo(-w * .35, h2); s.lineTo(-w, h1); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: b - a, bevelEnabled: true, bevelThickness: .012, bevelSize: .01, bevelSegments: 2 });
  g.rotateY(Math.PI / 2); g.translate(a, y0, 0); return strip(g);
}

export function makeFloatRing() {
  const G = new THREE.Group(), { r0, r1, bridgeFrom } = RING;
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe2b35c, metalness: 1, roughness: .26, clearcoat: .4, clearcoatRoughness: .2, envMapIntensity: 1.25, side: THREE.DoubleSide });
  const armor = new THREE.MeshStandardMaterial({ color: 0x8c95a6, metalness: .82, roughness: .34, envMapIntensity: 1 });      /* 푸른 기 도는 은회색 장갑 */
  const armor2 = new THREE.MeshStandardMaterial({ color: 0x5d6575, metalness: .85, roughness: .4, envMapIntensity: .9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x161a22, metalness: .8, roughness: .45, envMapIntensity: .7, side: THREE.DoubleSide });
  const uOn = { value: 0 };
  const slitMat = new THREE.ShaderMaterial({ uniforms: { uOn, uT: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: 'uniform float uOn,uT; varying vec3 vW; void main(){ float a=atan(vW.z,vW.x); float run=.75+.25*sin(a*8.-uT*2.); gl_FragColor=vec4(vec3(.3,.6,1.3)*(.06+uOn*1.1*run),1.); }' });
  const P = { gold: [], armor: [], armor2: [], dark: [], slit: [] };

  /* 바닥 몸통: 이어진 짙은 고리 (아래로 두께 → 옆에서 봐도 떠 있는 판) */
  P.dark.push(strip(new THREE.LatheGeometry([[r0 + .06, -.32], [r1 - .1, -.32], [r1 + .02, -.2], [r1 + .02, .06], [r0 + .02, .06], [r0 - .02, -.2], [r0 + .06, -.32]].map(([r, y]) => new THREE.Vector2(r, y)), 160)));
  /* 안·바깥 가는 금 테 */
  P.gold.push(strip(new THREE.LatheGeometry([[r0 - .05, -.18], [r0 - .05, .08], [r0 + .02, .12], [r0 + .06, .12], [r0 + .06, .05]].map(([r, y]) => new THREE.Vector2(r, y)), 160)));
  P.gold.push(strip(new THREE.LatheGeometry([[r1 - .04, .05], [r1 - .04, .11], [r1 + .02, .11], [r1 + .1, .03], [r1 + .1, -.18]].map(([r, y]) => new THREE.Vector2(r, y)), 160)));

  for (let k = 0; k < 16; k++) {
    const a0 = k * D2 - D2 / 2, a1 = a0 + D2, am = k * D2, kind = k % 4;   /* 0: 갈래 끝 앞 잠금 · 2: 대각선 집게 · 1,3: 장갑판 */
    const m0 = a0 + .055, m1 = a1 - .055;                                   /* 덩어리 본체 (양옆은 이음 마디) */
    /* 이음 마디: 낮은 받침 + 둘레로 누운 관 두 줄 + 파란 빛 틈 */
    const jA = a0 - .055, jB = a0 + .055;
    P.armor2.push(sector(r0 + .1, r1 - .1, jA, jB, .06, .09, .015, 0));
    for (const rr of [r0 + .35, r1 - .35]) P.dark.push(cyl(.04, .16, rr, a0, .19));
    P.slit.push(sector(r0 + .5, r1 - .5, a0 - .012, a0 + .012, .151, .004, 0, 0));
    if (kind === 0) {
      /* 잠금 덩어리: 별 끝을 향해 금 이빨 둘, 윗면 두 단 */
      P.armor.push(sector(r0 + .04, r1 - .02, m0, m1, .06, .26, .035));
      P.armor2.push(sector(r0 + .22, r1 - .18, m0 + .04, m1 - .04, .32, .06, .015));
      for (const s of [-1, 1]) { const g = new THREE.CylinderGeometry(.0, .07, .34, 4, 1); g.rotateZ(Math.PI / 2); g.rotateX(Math.PI / 4); P.gold.push(at(g, r0 - .02, am + s * .06, .2)); }
      P.gold.push(sector(r1 - .2, r1 - .1, m0 + .02, m1 - .02, .3, .03, .008, 0));
      for (const s of [-1, 1]) P.dark.push(bolt(r1 - .3, am + s * .1, .38));
    } else if (kind === 2) {
      /* 집게 덩어리: 금 다리를 양옆에서 물고 있음 — 높고 무거움, 금 테두리 */
      P.armor.push(sector(r0 + .04, r1 - .02, m0, am - .045, .06, .34, .035));
      P.armor.push(sector(r0 + .04, r1 - .02, am + .045, m1, .06, .34, .035));
      P.gold.push(sector(r0 + .02, r0 + .12, m0, am - .045, .4, .03, .008, 0)); P.gold.push(sector(r0 + .02, r0 + .12, am + .045, m1, .4, .03, .008, 0));
      P.gold.push(sector(r1 - .14, r1 - .04, m0, m1, .4, .03, .008, 0));
      P.dark.push(sector(r0 + .2, r1 - .2, am - .045, am + .045, .06, .08, .01, 0));             /* 다리가 들어앉는 홈 */
      for (const s of [-1, 1]) for (const rr of [r0 + .35, r1 - .35]) P.dark.push(bolt(rr, am + s * .11, .4));
    } else {
      /* 장갑판: 몸통 + 윗면에 파인 판 + 통풍 살창 + 볼트 넷 */
      P.armor.push(sector(r0 + .04, r1 - .02, m0, m1, .06, .2, .03));
      P.dark.push(sector(r0 + .2, r1 - .2, m0 + .05, m1 - .05, .245, .02, 0, 0));               /* 파인 바닥 */
      const n = 7; for (let i = 0; i < n; i++) { const aa = m0 + .09 + (m1 - m0 - .18) * (i + .5) / n; P.armor2.push(box(r1 - r0 - .5, .03, .018, (r0 + r1) / 2, aa, .245)); }   /* 살창 */
      for (const s of [-1, 1]) for (const rr of [r0 + .12, r1 - .12]) P.armor2.push(bolt(rr, am + s * (D2 / 2 - .085), .26));
    }
  }
  /* 대각선 금 다리: 별의 갈래 사이 테에서 곧게 뻗어 집게 홈까지 (짧고 단단하게) */
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2;
    const g = beam(bridgeFrom, r0 + .7, .05, .05, .085, .14); P.gold.push(at(g, 0, a));
    const c = new THREE.CylinderGeometry(.08, .08, .1, 16); c.rotateZ(Math.PI / 2); c.translate(bridgeFrom + .3, .19, 0); P.gold.push(at(c, 0, a)); }

  const add = (list, mat, order) => { if (!list.length) return; const m = new THREE.Mesh(mergeGeometries(list.map(g => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; })), mat); if (order) m.renderOrder = order; G.add(m); };
  add(P.armor, armor); add(P.armor2, armor2); add(P.dark, dark); add(P.gold, gold); add(P.slit, slitMat, 3);
  G.userData.update = (t, on) => { slitMat.uniforms.uT.value = t; uOn.value += ((on ? 1 : 0) - uOn.value) * .08; };
  return G;
}
