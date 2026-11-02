/* 시작 기지 — 떠 있는 부활 자리를 둘러싼 바깥 고리 + 대각선 금 다리 넷
   · 금테 별과 바깥 고리 사이를 비워, 그 틈으로 아래 맵이 보인다 → 부활 자리가 공중에 떠 있다는 게 한눈에 보임
   · 별의 갈래 사이(대각선 45도 네 방향)에서 곧게 뻗은 금 다리가 틈을 건너 바깥 고리를 붙잡는다(떠 있는 판을 매단 버팀)
   · 고리: 짙은 금속 몸통 + 안쪽·바깥쪽 금 테. 바깥 테는 별처럼 바깥으로 꺾여 내려가는 비탈, 몸통은 두께가 있어 옆에서 봐도 떠 있는 판
   단위는 자기장 판과 같음. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const RING = { r0: 4.0, r1: 5.0, bridgeFrom: 1.98 };
const lathe = (pts, seg = 192) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

/* 지붕 모양 단면의 곧은 금 다리 (x축 방향, a→b) */
function beam(a, b, w, h1, h2, y0) {
  const s = new THREE.Shape(); s.moveTo(-w, 0); s.lineTo(w, 0); s.lineTo(w, h1); s.lineTo(w * .35, h2); s.lineTo(-w * .35, h2); s.lineTo(-w, h1); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: b - a, bevelEnabled: true, bevelThickness: .012, bevelSize: .01, bevelSegments: 2 });
  g.rotateY(Math.PI / 2); g.translate(a, y0, 0); return g;      /* 단면(x,y) → (z,y), 길이 방향 → +x */
}

export function makeFloatRing() {
  const G = new THREE.Group(), { r0, r1, bridgeFrom } = RING;
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe2b35c, metalness: 1, roughness: .26, clearcoat: .4, clearcoatRoughness: .2, envMapIntensity: 1.25, side: THREE.DoubleSide });
  const goldDim = new THREE.MeshPhysicalMaterial({ color: 0xb8893e, metalness: 1, roughness: .38, envMapIntensity: 1, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1f28, metalness: .85, roughness: .36, envMapIntensity: .8, side: THREE.DoubleSide });
  const under = new THREE.MeshStandardMaterial({ color: 0x0e1016, metalness: .7, roughness: .55, side: THREE.DoubleSide });
  /* 고리 몸통: 위는 짙은 판, 아래로 두께(떠 있는 판의 옆면과 배) */
  G.add(new THREE.Mesh(lathe([[r0 + .1, .12], [r1 - .14, .12]]), dark));
  G.add(new THREE.Mesh(lathe([[r1 - .1, -.34], [r0 + .2, -.34], [r0 + .06, -.22]]), under));
  /* 안쪽 금 테: 틈 쪽으로 깎인 모서리 */
  G.add(new THREE.Mesh(lathe([[r0, -.22], [r0, .06], [r0 + .07, .175], [r0 + .15, .175], [r0 + .15, .12]]), gold));
  /* 바깥 금 테: 바깥으로 꺾여 내려가는 비탈 + 마지막 모따기 */
  G.add(new THREE.Mesh(lathe([[r1 - .16, .12], [r1 - .16, .19], [r1 - .1, .19], [r1 + .14, .1], [r1 + .2, .03], [r1 + .2, -.2], [r1 - .1, -.34]]), gold));
  /* 몸통 위 가는 금 띠 두 줄 + 칸 나눔 (24칸, 대각선 다리 자리는 금 받침) */
  G.add(new THREE.Mesh(lathe([[r0 + .32, .121], [r0 + .32, .135], [r0 + .36, .135], [r0 + .36, .121]]), goldDim));
  G.add(new THREE.Mesh(lathe([[r1 - .4, .121], [r1 - .4, .135], [r1 - .36, .135], [r1 - .36, .121]]), goldDim));
  const seams = [], pads = [];
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2 + Math.PI / 24; const g = new THREE.BoxGeometry(r1 - r0 - .82, .012, .025); g.translate((r0 + r1) / 2, .126, 0); g.rotateY(-a); seams.push(g); }
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, s = new THREE.Shape(), L = .55, W = .26;      /* 다리가 붙는 금 받침 */
    s.moveTo(r0 + .05, -W); s.lineTo(r0 + .05 + L, -W * .7); s.lineTo(r0 + .05 + L + .12, 0); s.lineTo(r0 + .05 + L, W * .7); s.lineTo(r0 + .05, W); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: .04, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 2 }); g.rotateX(-Math.PI / 2); g.translate(0, .135, 0); g.rotateY(-a); pads.push(g); }
  G.add(new THREE.Mesh(mergeGeometries(seams), under)); G.add(new THREE.Mesh(mergeGeometries(pads), gold));
  /* 대각선 금 다리 넷: 별의 갈래 사이 테에서 곧게 뻗어 바깥 고리까지. 양 끝에 금 고리쇠 */
  const bs = [];
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2;
    const g = beam(bridgeFrom, r0 + .5, .055, .05, .085, .085); g.rotateY(-a); bs.push(g);
    for (const r of [bridgeFrom + .32, r0 - .12]) { const c = new THREE.CylinderGeometry(.085, .085, .1, 16); c.rotateZ(Math.PI / 2); c.translate(r, .13, 0); c.rotateY(-a); bs.push(c.toNonIndexed ? c : c); } }
  G.add(new THREE.Mesh(mergeGeometries(bs.map(g => g.index ? g.toNonIndexed() : g)), gold));
  return G;
}
