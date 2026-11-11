/* 보물방 (사용자 2026-11-11: 동굴 끝 공터에 보물 장소를 붙임 · 뒤쪽까지 산맥으로 빙 둘러막음 · 천장은 일부러 뚫렸지만 동굴 같은 분위기)
   · 둘레 벽 위쪽 바위가 안쪽으로 튀어나와 천장 가장자리를 덮음 — 가운데만 하늘이 뚫린 우물 모양 (들어오는 동굴 길 위는 끊김)
       바위 턱 바깥쪽은 산 벽에 박힘 (벽이 그 높이까지 솟은 자리를 찾아 붙임) · 안쪽 끝은 들쭉날쭉 · 밑면은 울퉁불퉁 · 윗면엔 이끼
   · 튀어나온 바위 밑에 종유석이 매달림 (굵기 · 길이 제각각 · 마디가 있고 끝이 뾰족)
   · 벽 쪽은 어둡게 · 가운데는 밝게: 벽을 따라 안쪽만 보이는 얇은 그늘 막 (아래는 짙고 위로 갈수록 옅음) → 시선이 보물로 모임
   · 카메라를 가리는 바위는 정해 둔 반투명 걷기(7m)로 기체 둘레만 걷힘 */
import * as THREE from 'three';
import { noise2 } from './islefield.js?v=11111535';

const rngOf = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

/* x0 z0: 보물방 가운데 · R: 공터 반지름 (섬 안 단위) · floor: 바닥 높이 · gap: 들어오는 길 방향(각도) · hAt: 땅 높이 · SFRAG: 장소 돌 칠 (이끼 · 분위기 색 같이) */
export function buildCavern({ GL, U, S, SFRAG, x0, z0, R, floor, gap, hAt, group }) {
  const r = rngOf(733), RIM = floor + 26, NA = 160, P = [], I = [], prof = [];
  /* 각도마다: 벽이 RIM보다 높이 솟은 거리(바깥쪽 박힘) · 안쪽으로 튀어나온 끝 · 두께 */
  for (let i = 0; i <= NA; i++) { const a = i / NA * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), dg = Math.abs(Math.atan2(Math.sin(a - gap), Math.cos(a - gap)));
    let rOut = -1; for (let d = R - 6; d < R + 46; d += .8) if (hAt(x0 + ca * d, z0 + sa * d) > RIM + 2.5) { rOut = d + 4; break; }
    const open = dg < .42 || rOut < 0 ? 0 : Math.min(1, (dg - .42) / .3);   /* 들어오는 길 위 · 벽이 없는 자리: 바위 턱 없음 (양끝은 가늘어짐) */
    const over = (9 + 6 * Math.max(0, noise2(a * 3.1, 7.3)) + 2.5 * noise2(a * 9.7, 2.1)) * open, rIn = Math.max(R * .7, (rOut < 0 ? R : Math.min(rOut - 3, R + 4)) - over);   /* 기둥 · 사슬 위로는 안 내려옴 */
    prof.push({ ca, sa, rIn, rOut: rOut < 0 ? R + 8 : rOut, open, a }); }
  /* 단면: 바깥 밑 → 안쪽 밑 → 안쪽 끝(들쭉날쭉) → 안쪽 위 → 바깥 위 (여러 점) */
  const NS = 22;
  prof.forEach((p, i) => { for (let j = 0; j < NS; j++) { const s = j / (NS - 1); let rr, y; const w = p.rOut - p.rIn, th = (1.2 + 4.5 * Math.min(1, w / 14)) * p.open + .05;
      if (s < .45) { const k = s / .45; rr = p.rOut - w * k; y = RIM - th * (1 - k * .75) - 1.4 * Math.max(0, noise2(p.a * 14 + k * 5, k * 9)) * p.open; }   /* 밑면: 안쪽으로 갈수록 얇아짐 · 울퉁불퉁 처진 바위 */
      else if (s < .55) { const k = (s - .45) / .1; rr = p.rIn - .6 * Math.sin(k * Math.PI) * p.open + .4 * noise2(p.a * 20, 3); y = RIM - th * .25 * (1 - k) + .5 * k; }   /* 안쪽 끝: 둥글게 말린 바위 끝 */
      else { const k = (s - .55) / .45; rr = p.rIn + w * k; y = RIM + .5 + 2.2 * k * k + .8 * noise2(p.a * 8 + k * 4, 5.1); }   /* 윗면: 바깥(산) 쪽으로 솟아 벽에 이어짐 */
      P.push(x0 + p.ca * rr, y, z0 + p.sa * rr); } });
  for (let i = 0; i < NA; i++) for (let j = 0; j < NS - 1; j++) { const a = i * NS + j, b = a + 1, c = a + NS, d = c + 1; I.push(a, c, b, b, c, d); }
  const rim = new THREE.BufferGeometry(); rim.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); rim.setIndex(I); rim.computeVertexNormals();
  /* 종유석: 튀어나온 바위 밑 (마디진 원뿔 · 끝은 뾰족) */
  const parts = [rim.toNonIndexed()];
  for (let k = 0; k < 64; k++) { const p = prof[Math.floor(r() * NA)]; if (p.open < .6) continue; const rr = p.rIn + 1 + r() * Math.min(7, p.rOut - p.rIn - 2), len = 2 + r() * r() * 9, rad = .35 + len * .09 + r() * .3;
    const pts = []; for (let q = 0; q <= 8; q++) { const t = q / 8, bump = 1 + .14 * Math.sin(t * 19 + k) ; pts.push(new THREE.Vector2(Math.max(.02, rad * Math.pow(1 - t, 1.35) * bump), -t * len)); }
    const g = new THREE.LatheGeometry(pts, 7); const pp = g.attributes.position; for (let v = 0; v < pp.count; v++) pp.setX(v, pp.getX(v) + Math.sin(pp.getY(v) * .7 + k) * .12);
    const yy = RIM - (1.2 + 4.5 * Math.min(1, (p.rOut - p.rIn) / 14)) * (1 - ((rr - p.rIn) / (p.rOut - p.rIn) * .75)) * .9;   /* 밑면 높이쯤에 박음 */
    g.rotateY(r() * 6.28); g.translate(x0 + p.ca * rr, yy + .4, z0 + p.sa * rr); g.computeVertexNormals(); parts.push(g.toNonIndexed()); }
  const Pp = [], Nn = [], Gg = []; for (const g of parts) { Pp.push(...g.attributes.position.array); Nn.push(...g.attributes.normal.array); for (let i = 0; i < g.attributes.position.count; i++) Gg.push(0); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); geo.setAttribute('aGlow', new THREE.Float32BufferAttribute(Gg, 1));
  const frag = SFRAG.replace('void main(){', 'void main(){ if (cutAway(vP)) discard;');   /* 카메라와 기체 사이를 가리면 반투명 걷기 */
  const mat = new THREE.ShaderMaterial({ uniforms: { ...U, ...S }, side: THREE.DoubleSide, vertexShader: `attribute float aGlow; varying vec3 vP, vN; varying float vG; void main(){ vP = position; vN = normal; vG = aGlow; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`, fragmentShader: GL + frag });
  const rock = new THREE.Mesh(geo, mat); rock.name = 'cavernRim'; group.add(rock);

  /* 벽 그늘: 공터 둘레를 따라 안쪽만 보이는 얇은 막 · 아래는 짙고 위로 갈수록 옅음 · 들어오는 길 쪽은 옅게 */
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(R + 1, R + 1, RIM - floor + 2, 96, 1, true).translate(x0, (RIM + floor) / 2, z0), new THREE.ShaderMaterial({ uniforms: { uGap: { value: gap }, uT: U.uT }, transparent: true, depthWrite: false, side: THREE.BackSide,
    vertexShader: `varying vec2 vU; varying vec3 vP; void main(){ vU = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uGap; varying vec2 vU; varying vec3 vP; void main(){ float a = atan(vP.z - ${z0.toFixed(2)}, vP.x - ${x0.toFixed(2)}), dg = abs(atan(sin(a - uGap), cos(a - uGap))), open = smoothstep(.35, .8, dg);
      gl_FragColor = vec4(.015, .02, .035, (.55 * pow(1. - vU.y, 1.3) + .12) * open); }` }));
  shade.renderOrder = 4; group.add(shade);
  return { RIM, rock };
}
