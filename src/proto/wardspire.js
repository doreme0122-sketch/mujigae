/* 와드 부품 ④ 양옆 첨탑 둘 — 사용자 참고 그림의 끝에 불이 켜진 작은 탑
   · 자리: 받침 양옆 큰 장갑 돌 위 (도는 고리 바깥 왼쪽·오른쪽). 와드가 살아 있는지 멀리서도 보이는 표시등
   · 생김새: 금속 받침 소켓 → 마디가 진 가는 금속 대(마디마다 작은 빛 테) → 끝에 꽂힌 작은 결정 → 그 위에 흔들리는 불빛
   · 빈 와드: 불빛이 희미하게 느리게 깜빡 (잠든 표시등) / 차지 중: 점점 또렷해지며 깜빡임이 빨라짐 / 주인 있음: 또렷하게 켜져 촛불처럼 흔들림
   · 불빛 색 = 주인 색 (보는 사람 기준)
   단위 m */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { stoneMaterial, solid, glowMaterial } from './wardbase.js?v=11041341';
import { gem } from './guardian.js?v=11041341';

const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
const clean = g => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g.index ? g.toNonIndexed() : g; };

/* 불빛: 위로 길쭉한 불꽃(아래 하얀 심 → 위 색, 끝이 흔들리며 가늘어짐) + 둥근 번짐 */
const flameMat = () => new THREE.ShaderMaterial({ ...AB, uniforms: { uCol: { value: new THREE.Vector3(1, 1, 1) }, uI: { value: 1 }, uT: { value: 0 }, uPh: { value: 0 } },
  vertexShader: 'varying vec2 vP; void main(){ vP = position.xy * 2.; vec4 c = modelViewMatrix * vec4(0.,0.,0.,1.); c.xy += position.xy * vec2(.34, .6); gl_Position = projectionMatrix * c; }',
  fragmentShader: `uniform vec3 uCol; uniform float uI, uT, uPh; varying vec2 vP;
    void main(){ float y = vP.y * .5 + .5, sway = sin(uT * 7. + uPh + y * 3.) * .12 * y + sin(uT * 13. + uPh * 2.) * .05 * y;
      float x = (vP.x - sway) / max(.08, (1. - y) * .55 + .06);
      float flame = exp(-x * x * 2.2) * smoothstep(1., .25, y) * smoothstep(0., .12, y);
      float core = exp(-x * x * 9.) * smoothstep(.55, .05, y) * smoothstep(0., .08, y);
      float r = length(vP * vec2(1., .7) - vec2(0., -.35)), halo = exp(-r * r * 3.) * .35;
      vec3 c = uCol * uCol * (flame * 1.3 + halo) + vec3(1.2) * core;
      gl_FragColor = vec4(c * uI, 1.); }` });

function spireGeo() {
  const parts = [], lathe = (pts, seg = 16) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  parts.push(lathe([[0, 0], [.2, 0], [.22, .06], [.18, .16], [.13, .2], [.12, .3], [.15, .34], [.1, .4], [0, .4]], 8));            /* 소켓: 팔각 */
  const segs = [[.4, .72, .075, .065], [.76, 1.06, .062, .052], [1.1, 1.36, .05, .042]];
  for (const [y0, y1, r0, r1] of segs) { parts.push(lathe([[0, y0], [r0, y0], [r1, y1], [0, y1]], 12)); parts.push(lathe([[0, y1 - .01], [r1 + .035, y1 - .01], [r1 + .04, y1 + .02], [r1 + .02, y1 + .04], [0, y1 + .04]], 12)); }   /* 마디 + 마디 고리 */
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, g = new THREE.BoxGeometry(.03, .22, .05); g.translate(0, .52, .09); g.rotateY(a); parts.push(g); }   /* 아래 마디 덧살 */
  parts.push(lathe([[0, 1.4], [.06, 1.4], [.085, 1.46], [.05, 1.5], [0, 1.5]], 12));                                               /* 결정 받침 컵 */
  return solid(mergeGeometries(parts.map(clean)));
}
export function makeWardSpires(uT, spots) {
  const G = new THREE.Group(), metal = stoneMaterial(uT), sg = spireGeo();   /* 양쪽 수정탑도 받침과 같은 돌 (사용자 2026-11-03) */
  const gemMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .05, transparent: true, opacity: .75, emissive: 0xffffff, emissiveIntensity: .6, depthWrite: false });   /* 각진 면은 면 방향을 미리 넣어 표현 (화면에서 면 방향을 구하는 방식은 아주 작게 보일 때 폰에서 빛 계산이 고장 나 번짐 얼룩이 됨) */
  const units = spots.map(([x, y, z], i) => { const u = new THREE.Group(); u.position.set(x, y, z); G.add(u);
    u.add(new THREE.Mesh(sg, metal));
    const cg = gem(91 + i * 3, .05); cg.scale(1, .2, 1); cg.deleteAttribute('normal'); cg.computeVertexNormals(); const cr = new THREE.Mesh(cg, gemMat); cr.position.y = 1.46; cr.renderOrder = 5; u.add(cr);
    /* 마디 고리 빛 */
    const p = [], uv = [], kk = []; for (const yy of [.72, 1.06, 1.36]) for (let j = 0; j < 20; j++) { const a0 = j / 20 * Math.PI * 2, a1 = (j + 1) / 20 * Math.PI * 2, r = .1, Q = (a, y_) => [Math.cos(a) * r, y_, Math.sin(a) * r];
      const A = Q(a0, yy + .005), B = Q(a1, yy + .005), C = Q(a1, yy + .025), D = Q(a0, yy + .025); p.push(...A, ...B, ...C, ...A, ...C, ...D); uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1); kk.push(yy, yy, yy, yy, yy, yy); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gg.setAttribute('aK', new THREE.Float32BufferAttribute(kk, 1));
    const gm = glowMaterial(); const gmesh = new THREE.Mesh(gg, gm); gmesh.renderOrder = 4; u.add(gmesh);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flameMat()); fl.position.y = 1.72; fl.renderOrder = 8; fl.frustumCulled = false; fl.material.uniforms.uPh.value = i * 2.3; u.add(fl);
    return { u, gm, fl, cr }; });
  G.userData.glows = units.map(o => o.gm);
  G.userData.update = (t, col, power = .4, owned = false, boost = 0) => {
    units.forEach((o, i) => { const blinkSp = 1.2 + power * 4, blink = owned ? 1 : .35 + .65 * Math.pow(.5 + .5 * Math.sin(t * blinkSp + i * 1.7), 3.);   /* 빈 와드: 느리게 깜빡 → 차지할수록 빨라지고 또렷 */
      const flick = .88 + .12 * Math.sin(t * 17 + i * 3) * Math.sin(t * 5.3 + i);
      o.fl.material.uniforms.uCol.value.copy(col); o.fl.material.uniforms.uT.value = t; o.fl.material.uniforms.uI.value = (.25 + power * .45) * blink * flick + boost * 1.4; o.fl.scale.setScalar(1 + boost * 1.4);   /* 완성 순간 불꽃이 확 솟음 */
      o.gm.uniforms.uT.value = t; o.gm.uniforms.uCol.value.copy(col); o.gm.uniforms.uI.value = .45 + power * .5;
      o.cr.material.emissive.setRGB(col.x * col.x, col.y * col.y, col.z * col.z); o.cr.material.emissiveIntensity = .3 + power * .5 * blink; o.cr.rotation.y = t * .6; }); };
  return G;
}
