/* 시작 기지 — 판 아래부터 이어진 바닥 + 콜로세움처럼 바깥으로 올라가는 계단 세 단 + 아치 벽
   · 바닥: 판과 금테 별 아래를 틈 없이 덮은 어두운 쇳빛 판(동심 이음선 + 방사 이음선).
   · 계단: 바깥으로 갈수록 한 단씩 높아짐. 앞면엔 세로 장식 판, 모서리엔 금 테, 금 테 아래 그늘에 숨은 파란 빛(판이 켜지면 같이 켜짐).
   · 맨 바깥 벽: 아치가 줄지어 서고, 아치 안쪽에서 빛이 난다.
   · 에너지 길: 대각선 네 방향. 아치 벽에서 시작해 계단을 타고 내려와 바닥을 건너 금테 별의 갈래 사이로 들어간다.
     빛이 바깥 → 가운데로 흘러 판에 힘을 넣는다(기체가 있는 동안 계속 흐르고, 없으면 거의 꺼짐).
   · 출구: 출구 쪽(+x, 별의 한 갈래가 가리키는 쪽) 한 곳만 계단과 벽을 모두 뚫어 길을 냄.
   단위는 자기장 판과 같음. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sweep, posNor } from './floatring.js?v=11021723';

export const ARENA = { floor: 4.3, steps: [[4.3, 5.1, .32], [5.1, 5.9, .64], [5.9, 6.7, .96]], wall: [6.7, 7.05, 2.0], exitHalf: .2 };

export function makeArena() {
  const G = new THREE.Group(), { floor: RF, steps, wall, exitHalf: EH } = ARENA;
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe2b35c, metalness: 1, roughness: .26, clearcoat: .4, clearcoatRoughness: .2, envMapIntensity: 1.25 });
  const steel = new THREE.MeshPhysicalMaterial({ color: 0x323a48, metalness: .88, roughness: .4, clearcoat: .1, clearcoatRoughness: .4, envMapIntensity: .75 });
  const steelHi = new THREE.MeshPhysicalMaterial({ color: 0x434c60, metalness: .88, roughness: .36, clearcoat: .2, clearcoatRoughness: .3, envMapIntensity: .85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0f1218, metalness: .8, roughness: .5, envMapIntensity: .6 });
  const L = { gold: [], steel: [], steelHi: [], dark: [] };
  const A0 = EH, A1 = Math.PI * 2 - EH;                           /* 출구를 뺀 각도 범위 */

  /* ── 바닥: 가운데부터 계단 앞까지, 출구 쪽은 바깥으로 길게 이어짐 ── */
  L.steel.push(sweep([[0.001, -.12], [RF, -.12], [RF, -.002], [0.001, -.002]], 0, Math.PI * 2, undefined, 128));
  L.steel.push(sweep([[RF - .05, -.12], [wall[1] + 1.2, -.12], [wall[1] + 1.2, -.002], [RF - .05, -.002]], -EH, EH, undefined, 12));   /* 출구 길 바닥 */
  for (const r of [3.45, 3.95]) L.dark.push(sweep([[r, -.002], [r + .025, -.002], [r + .025, .002], [r, .002]], 0, Math.PI * 2, undefined, 128));   /* 동심 이음선 */
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2 + Math.PI / 24; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < EH + .05) continue;
    const g = new THREE.BoxGeometry(RF - 3.3, .004, .02); g.translate((RF + 3.3) / 2, 0, 0); g.rotateY(-a); L.dark.push(posNor(g)); }

  /* ── 계단 세 단 ── */
  steps.forEach(([r0, r1, h], i) => {
    /* 단 몸통: 앞면(안쪽)은 수직, 윗면은 바깥으로 아주 살짝 올라감 */
    L[i % 2 ? 'steelHi' : 'steel'].push(sweep([[r0, -.12], [r1 + .02, -.12], [r1 + .02, h + .02], [r0 + .1, h], [r0, h - .04]], A0, A1));
    /* 금 테: 단 모서리를 따라 둥근 띠 */
    L.gold.push(sweep([[r0 - .03, h - .07], [r0 + .02, h - .075], [r0 + .12, h + .005], [r0 + .12, h + .025], [r0 + .02, h + .025], [r0 - .03, h - .02]], A0 + .004, A1 - .004));
    /* 앞면 세로 장식 판 (단마다 간격 다르게) */
    const n = 48 + i * 8; for (let k = 0; k < n; k++) { const a = A0 + (A1 - A0) * (k + .5) / n; const g = new THREE.BoxGeometry(.035, h - .16, .05); g.translate(r0 - .012, (h - .16) / 2 - .02, 0); g.rotateY(-a); L.steelHi.push(posNor(g)); }
    /* 출구 쪽 끝마개: 금 판 */
    for (const a of [A0, A1]) { const s = a === A0 ? 1 : -1; L.gold.push(sweep([[r0 - .03, -.1], [r1 + .03, -.1], [r1 + .03, h + .04], [r0 - .03, h + .04]], a - s * .002, a + s * .02, undefined, 1)); }
  });
  /* 금 테 아래 그늘에 숨은 빛 (단 앞면 꼭대기 바로 아래) */
  const uOn = { value: 0 }, uT = { value: 0 };
  const glowPos = [], glowK = [], glowS = [];
  const ring = (r, y0, y1, k) => { const n = 180; for (let i = 0; i < n; i++) { const a = A0 + (A1 - A0) * i / n, b = A0 + (A1 - A0) * (i + 1) / n;
    const P = (aa, y) => [Math.cos(aa) * r, y, Math.sin(aa) * r]; const p = [P(a, y0), P(b, y0), P(b, y1), P(a, y1)]; glowPos.push(...p[0], ...p[1], ...p[2], ...p[0], ...p[2], ...p[3]);
    for (let j = 0; j < 6; j++) { glowK.push(k); glowS.push(-1); } } };
  steps.forEach(([r0, , h], i) => ring(r0 - .036, h - .15, h - .09, i));

  /* ── 맨 바깥 아치 벽 ── */
  const [w0, w1, wh] = wall, NA = 40, da = (A1 - A0) / NA, archLight = [];
  L.steel.push(sweep([[w0, -.12], [w1, -.12], [w1, wh], [w0, wh]], A0, A1));                                  /* 벽 몸통(뒤판) */
  L.gold.push(sweep([[w0 - .06, wh - .06], [w1 + .04, wh - .06], [w1 + .04, wh + .05], [w0 - .02, wh + .08], [w0 - .06, wh + .03]], A0, A1));   /* 벽 위 금 처마 */
  for (let k = 0; k < NA; k++) { const am = A0 + da * (k + .5), a0 = am - da / 2, a1 = am + da / 2;
    /* 기둥: 아치 사이마다 반쯤 튀어나온 기둥 + 금 머리 */
    const pg = new THREE.BoxGeometry(.16, wh - .4, .1); pg.translate(w0 - .06, steps[2][2] + (wh - .4 - steps[2][2]) / 2 + .02, 0); pg.rotateY(-a0); if (k) L.steelHi.push(posNor(pg));
    const cap = new THREE.BoxGeometry(.22, .07, .16); cap.translate(w0 - .07, wh - .36, 0); cap.rotateY(-a0); if (k) L.gold.push(posNor(cap));
    /* 아치: 벽 앞에 붙은 아치 틀(금) + 안쪽 짙은 우묵한 면 + 빛 */
    const arch = new THREE.Shape(), aw = (w0 * da) * .34, ab = steps[2][2] + .06, at = wh - .55;
    arch.moveTo(-aw - .06, ab); arch.lineTo(aw + .06, ab); arch.lineTo(aw + .06, at); arch.absarc(0, at, aw + .06, 0, Math.PI, false); arch.lineTo(-aw - .06, ab);
    const hole = new THREE.Path(); hole.moveTo(-aw, ab); hole.lineTo(-aw, at); hole.absarc(0, at, aw, Math.PI, 0, true); hole.lineTo(aw, ab); hole.lineTo(-aw, ab); arch.holes.push(hole);
    const fg = new THREE.ExtrudeGeometry(arch, { depth: .04, bevelEnabled: true, bevelThickness: .01, bevelSize: .008, bevelSegments: 1, curveSegments: 10 });
    fg.rotateY(Math.PI / 2); fg.translate(w0 - .05, 0, 0); fg.rotateY(-am); L.gold.push(posNor(fg));
    const back = new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(-aw, ab); s.lineTo(aw, ab); s.lineTo(aw, at); s.absarc(0, at, aw, 0, Math.PI, false); s.lineTo(-aw, ab); return s; })(), 10);
    back.rotateY(-Math.PI / 2); back.translate(w0 + .002, 0, 0); back.rotateY(-am); archLight.push(posNor(back)); }

  /* ── 에너지 길: 아치 벽 → 계단 → 바닥 → 별의 갈래 사이. s: 바깥 1 → 안 0 ── */
  const path = [[w0 - .02, 1.2], [w0 - .02, steps[2][2] + .005], [steps[2][0] - .005, steps[2][2] + .005], [steps[2][0] - .005, steps[1][2] + .005], [steps[1][0] - .005, steps[1][2] + .005],
    [steps[1][0] - .005, steps[0][2] + .005], [steps[0][0] - .005, steps[0][2] + .005], [steps[0][0] - .005, .004], [2.0, .004]];
  const segL = []; let tot = 0; for (let i = 0; i < path.length - 1; i++) { const l = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]); segL.push(l); tot += l; }
  for (let q = 0; q < 4; q++) { const a = Math.PI / 4 + q * Math.PI / 2, c = Math.cos(a), s = Math.sin(a), nx = -s, nz = c;
    /* 홈: 바닥·계단에 파인 짙은 길 + 양옆 금 실선 */
    let acc = 0;
    for (let i = 0; i < path.length - 1; i++) { const [ra, ya] = path[i], [rb, yb] = path[i + 1], sa = 1 - acc / tot, sb = 1 - (acc + segL[i]) / tot; acc += segL[i];
      const vert = Math.abs(ra - rb) < 1e-3;
      for (const [hw, list, lift] of [[.075, 'dark', .001], [.03, 'glow', .003]]) {
        const P = (r, y, o) => [c * r + nx * o + (vert ? -c * lift : 0), y + (vert ? 0 : lift), s * r + nz * o + (vert ? -s * lift : 0)];
        const p0 = P(ra, ya, -hw), p1 = P(ra, ya, hw), p2 = P(rb, yb, hw), p3 = P(rb, yb, -hw);
        if (list === 'dark') { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...p0, ...p2, ...p1, ...p0, ...p3, ...p2], 3)); g.computeVertexNormals(); L.dark.push(g); }
        else { glowPos.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3); for (const v of [sa, sa, sb, sa, sb, sb]) { glowK.push(9); glowS.push(v); } } }
      for (const sd of [-1, 1]) { if (vert) continue; const g = new THREE.BoxGeometry(Math.abs(rb - ra), .012, .014); g.translate((ra + rb) / 2, ya + .006, sd * .09); g.rotateY(-a); L.gold.push(posNor(g)); } } }

  const add = (list, mat) => { if (list.length) G.add(new THREE.Mesh(mergeGeometries(list.map(posNor)), mat)); };
  add(L.steel, steel); add(L.steelHi, steelHi); add(L.dark, dark); add(L.gold, gold);
  /* 아치 안쪽 빛: 위로 갈수록 옅어지는 푸른 빛 */
  const archMat = new THREE.ShaderMaterial({ uniforms: { uOn, uT }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying float vY; void main(){ vY=position.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uOn,uT; varying float vY; void main(){ float k=1.-smoothstep(${(steps[2][2]).toFixed(2)}, ${(wh - .3).toFixed(2)}, vY); gl_FragColor=vec4(vec3(.22,.45,1.1)*k*(.12+uOn*.5),1.); }` });
  G.add(new THREE.Mesh(mergeGeometries(archLight), archMat));
  /* 숨은 빛 + 에너지 길 */
  const gMat = new THREE.ShaderMaterial({ uniforms: { uOn, uT }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'attribute float aK, aS; varying float vK, vS; varying vec3 vW; void main(){ vK=aK; vS=aS; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uOn,uT; varying float vK, vS; varying vec3 vW;
      void main(){
        vec3 c = vec3(.28,.58,1.35); float b;
        if (vS < -.5) { float a=atan(vW.z,vW.x); b = .05 + uOn*(.75+.25*sin(uT*1.4+a*4.+vK*2.)); }          /* 계단 숨은 빛 */
        else { float flow = fract(vS*6. + uT*.9);                                                           /* 바깥 → 안으로 흐르는 빛 덩어리 */
          float pk = smoothstep(.0,.15,flow)*smoothstep(.55,.15,flow);
          b = .06 + uOn*(.35 + 1.4*pk); c = mix(c, vec3(.85,.95,1.3), pk*uOn*.6); }
        gl_FragColor = vec4(c*b,1.); }` });
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(glowPos, 3)); gg.setAttribute('aK', new THREE.Float32BufferAttribute(glowK, 1)); gg.setAttribute('aS', new THREE.Float32BufferAttribute(glowS, 1));
  const gm = new THREE.Mesh(gg, gMat); gm.renderOrder = 3; G.add(gm);
  G.userData.update = (t, on) => { uT.value = t; uOn.value += ((on ? 1 : 0) - uOn.value) * .05; };
  return G;
}
