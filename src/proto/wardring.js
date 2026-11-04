/* 와드 부품 ③ 도는 고리 — 사용자 참고 그림의 보라 빛 고리 + 박힌 돌 조각
   · 유리 기둥 가운데 높이를 둘러 떠 있는 보라 빛 고리 (기둥 속 심장과 같은 보라 — 심장의 힘이 밖으로 흘러나와 도는 것)
     고리는 가는 선이 아니라 굵은 빛 관: 하얀 심 + 보라 몸 + 바깥 번짐, 관 속을 빛 덩이가 흘러 돎
   · 돌 조각 여섯: 고리에 끼워진 고대 돌 물림쇠(받침과 같은 돌). 바깥 면에 주인 색 빛 홈 — 고리와 함께 돎
   · 빈 와드 = 거의 멈춤(잠든 듯 천천히) → 차지할수록 빨라짐 → 내 것/남의 것 = 꾸준히 돎 → 순간 이동 = 빠르게
   · 살짝 기울어 흔들리며 돎(떠 있는 고리라는 느낌)
   단위 m */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { stoneMaterial, solid, glowMaterial } from './wardbase.js?v=11041547';

const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
const clean = g => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g.index ? g.toNonIndexed() : g; };
function block(w, h, d, b = .03) {
  const s = new THREE.Shape(), x = w / 2 - b, y = h / 2 - b; s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 1 }); g.translate(0, 0, -(d - 2 * b) / 2); return g;
}
/* 빛 관: 관 둘레 방향(v)으로 심이 하얗고, 둘레 길이 방향(u)으로 빛 덩이가 흘러 돎 */
function tubeMat(halo) {
  return new THREE.ShaderMaterial({ ...AB, side: halo ? THREE.BackSide : THREE.FrontSide, uniforms: { uT: { value: 0 }, uI: { value: 1 }, uSp: { value: .2 } },
    vertexShader: 'varying vec2 vU; varying vec3 vN, vW; void main(){ vU = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uT, uI, uSp; varying vec2 vU; varying vec3 vN, vW;
      void main(){ vec3 V = normalize(cameraPosition - vW); float f = abs(dot(normalize(vN), V));
        float u = vU.x, flow = fract(u * 4. - uT * uSp * .6), blob = exp(-(flow - .5) * (flow - .5) * 26.), fine = .8 + .2 * sin(u * 120. - uT * uSp * 9.);
        ${halo
        ? 'float k = pow(f, 1.6) * .45; vec3 c = vec3(.45, .16, .95) * k * (.6 + blob * .8);'
        : 'float core = pow(f, 6.), body = pow(f, 1.4); vec3 c = (vec3(1.05, .85, 1.3) * core * (.6 + blob * 1.2) + vec3(.62, .26, 1.15) * body * (.5 + blob * .7)) * fine;'}
        gl_FragColor = vec4(c * uI, 1.); }` });
}

export function makeWardRing(uT, y) {
  const G = new THREE.Group(); G.position.y = y;
  const spin = new THREE.Group(); G.add(spin);
  const R = 1.02;
  const t1 = new THREE.Mesh(new THREE.TorusGeometry(R, .055, 14, 160), tubeMat(false)); t1.rotation.x = Math.PI / 2; t1.renderOrder = 7;
  const t2 = new THREE.Mesh(new THREE.TorusGeometry(R, .15, 12, 160), tubeMat(true)); t2.rotation.x = Math.PI / 2; t2.renderOrder = 6;   /* 바깥 번짐 */
  spin.add(t1, t2);
  /* 돌 물림쇠 여섯: 관을 위아래·바깥에서 감싸 문 모양 (가운데가 파인 ㄷ자) + 바깥 면 빛 홈 */
  const st = [], gl = [];
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + .26, big = k % 2 === 0, w = big ? .3 : .22, h = big ? .3 : .24;
    const parts = [block(w, .08, .34), block(w, .08, .34), block(w * .9, h, .09)];
    parts[0].translate(0, h / 2 - .04, 0); parts[1].translate(0, -h / 2 + .04, 0); parts[2].translate(0, 0, .14);                       /* 위 · 아래 · 바깥 판 */
    for (const g of parts) { g.rotateY(Math.PI / 2 - a); g.translate(Math.cos(a) * R, 0, Math.sin(a) * R); st.push(g); }
    const ro = R + .19, ca = Math.cos(a), sa = Math.sin(a), tx = -sa, tz = ca, ww = w * .28, hh = h * .3, P = (o, yy) => [ca * ro + tx * o, yy, sa * ro + tz * o];
    gl.push([P(-ww, -hh), P(ww, -hh), P(ww, hh), P(-ww, hh)]); }
  const stone = new THREE.Mesh(solid(mergeGeometries(st.map(clean))), stoneMaterial(uT)); spin.add(stone);
  const p = [], uv = [], kk = []; for (const [A, B, C, D] of gl) { p.push(...A, ...B, ...C, ...A, ...C, ...D); uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1); kk.push(0, 0, 1, 0, 1, 1); }
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gg.setAttribute('aK', new THREE.Float32BufferAttribute(kk, 1));
  const gMat = glowMaterial(), gm = new THREE.Mesh(gg, gMat); gm.renderOrder = 5; spin.add(gm);
  let ang = 0, sp = .1;
  G.userData.glow = gMat;
  G.userData.update = (t, dt, col, power = .4, want = .1) => {
    sp += (want - sp) * Math.min(1, dt * 2); ang += sp * dt; spin.rotation.y = ang;
    spin.rotation.x = Math.sin(t * .7) * .035; spin.rotation.z = Math.cos(t * .55) * .035; spin.position.y = Math.sin(t * .9) * .03;   /* 떠 있는 고리: 살짝 기울며 흔들림 */
    for (const m of [t1, t2]) { const U = m.material.uniforms; U.uT.value = t; U.uSp.value = .3 + sp * 2.5; U.uI.value = .3 + power * .4; }
    gMat.uniforms.uT.value = t; gMat.uniforms.uCol.value.copy(col); gMat.uniforms.uI.value = .5 + power * .5; };
  return G;
}
