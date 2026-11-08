/* 크리스탈 하이브 — 3스테이지 보스 (사용자의 예전 게임 코드 그대로 조립)
   · 예전 게임에서 보스를 꾸민 방식 그대로: 본체(buildB03) + 둘레에 12개의 보조 거울(팔각 보석)이 고리로 떠 돎 + 양옆 반사 드론 둘
     - 보조 거울 고리는 천천히 돌고, 거울 하나하나는 제자리에서 앞뒤로 살짝 흔들림(떠 있는 것)
     - 드론은 제자리에서 둥실 오르내림
   · 은색·보라 (우리 편 무지개 모드는 뺌, 사용자 2026-11-03)
   · 예전 게임은 바닥 XY · 위 Z → 이 게임(위 Y)에 맞게 통째로 눕힘
   · 그리는 횟수는 크로나크와 같은 공용 방법(slim.js)으로 줄임 */
import * as THREE from 'three';
import { buildB03, buildB03FX } from './hivecode.js?v=11081833';
import { slim, countDraws } from './slim.js?v=11081833';

export function makeHive(opt = {}) {
  const ally = false, SIZE = opt.size || 12;                                  /* SIZE: 이 게임에서의 지름(m) */
  const B = buildB03(THREE, { ally }), FX = buildB03FX(THREE, { ally });
  const W = new THREE.Group(); W.name = 'HiveWorld';                               /* 예전 게임 좌표(위 Z) 그대로 조립하는 판 */
  const R = 2.75, k = R / 16.4; B.root.scale.setScalar(k); B.root.position.z = .3; W.add(B.root);
  const ring = new THREE.Group(); ring.name = 'HiveAuxRing'; ring.position.z = .55; W.add(ring);
  const AR = 2.95 * 1.32, aux = [];
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, holder = new THREE.Group(); holder.position.set(Math.cos(a) * AR, Math.sin(a) * AR, 0); holder.rotation.z = a + Math.PI / 2;
    const v = FX.O.aux.clone(); v.scale.multiplyScalar(.34); v.rotation.z = Math.PI / 2; holder.add(v); ring.add(holder); aux.push(holder); }
  const drones = [1, -1].map(s => { const d = new THREE.Group(), v = FX.O.drone.clone(); v.scale.multiplyScalar(.3); v.position.z = .2; d.add(v); d.position.set(-.2, 3.9 * 1.28 * s, .25); d.userData.y = d.position.y; W.add(d); return d; });
  const root = new THREE.Group(); root.name = 'CrystalHive'; W.rotation.x = -Math.PI / 2; root.add(W);
  const span = 2 * Math.max(AR + .6, 3.9 * 1.28 + .6); root.scale.setScalar(SIZE / span);
  let last = 0;
  const update = t => { const dt = Math.max(0, Math.min(.1, t - last)); last = t;
    B.update(t); FX.update(t); ring.rotation.z = t * .35;
    aux.forEach((h, i) => { h.rotation.x = Math.sin(t * 2 + i) * .25; });
    drones.forEach((d, i) => { d.position.z = .25 + Math.sin(t * 1.6 + i * 2) * .12; d.rotation.z = Math.sin(t * .7 + i) * .2; }); };
  update(0);
  const before = countDraws(root);
  if (!opt.noSlim) slim(root, { update });
  const after = countDraws(root);
  return { root, update, setPhase: p => B.setPhase && B.setPhase(p), stats: { before, after } };
}
