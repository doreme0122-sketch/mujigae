/* 시작 기지 — 수호 기둥 넷 (대각선, 맨 위 단)
   · 건메탈 받침 → 위로 갈수록 가늘어지는 흰 세라믹 기둥(팔각, 건메탈 띠 둘) → 결정을 받쳐 든 건메탈 발톱 → 엇갈려 도는 고리 둘 → 닿지 않고 떠 있는 결정
   · 결정이 하늘의 빛을 모아 기둥의 세로 홈으로 내려보내고, 그 빛이 계단의 빛길을 따라 판까지 간다(빛이 오는 이유)
   · 평소: 결정이 천천히 숨 쉬듯 은은. 태어나는 순간(fire): 네 결정이 함께 밝아지고 빛이 홈을 타고 쏟아져 내려감
   단위는 자기장 판과 같음. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const GUARD = { r: 6.3, y: .96, H: 3.4, DOWN: .8 };      /* 자리(반지름·단 높이), 기둥 높이, 빛이 기둥을 다 내려오는 시간 */
const lathe = (pts, seg = 8, phase = Math.PI / 8) => { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, phase); g.deleteAttribute('uv'); return g.toNonIndexed(); };

function pillarParts() {
  const { H } = GUARD, P = { gun: [], white: [], dark: [] }, grooves = [];
  /* 받침: 두 단 팔각, 모서리 깎음 */
  P.gun.push(lathe([[0, 0], [.5, 0], [.5, .12], [.46, .16], [.38, .16], [.38, .3], [.34, .34], [0, .34]]));
  /* 기둥: 아래 .27 → 위 .15, 팔각 흰 세라믹 */
  const s0 = .34, s1 = s0 + H * .78;
  P.white.push(lathe([[0, s0], [.27, s0], [.25, s0 + .5], [.15, s1], [0, s1]]));
  const rAt = y => .27 + (.15 - .27) * (y - s0) / (s1 - s0);
  /* 건메탈 띠 둘 */
  for (const f of [.3, .62]) { const y = s0 + (s1 - s0) * f, r = rAt(y) + .025; P.gun.push(lathe([[r - .03, y - .07], [r, y - .05], [r, y + .05], [r - .03, y + .07]])); }
  /* 세로 홈 넷: 짙은 홈 + 그 속 빛 (팔각 면 가운데) */
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, c = Math.cos(a), s = Math.sin(a), n = 20;
    for (let i = 0; i < n; i++) { const ya = s0 + .12 + (s1 - s0 - .3) * i / n, yb = s0 + .12 + (s1 - s0 - .3) * (i + 1) / n;
      for (const [w, list, d] of [[.04, 'dark', .002], [.016, 'glow', .006]]) {
        const ra = rAt(ya) * Math.cos(Math.PI / 8) + d, rb = rAt(yb) * Math.cos(Math.PI / 8) + d;
        const Q = (r, y, o) => [c * r - s * o, y, s * r + c * o], q = [Q(ra, ya, -w), Q(rb, yb, -w), Q(rb, yb, w), Q(ra, ya, w)];
        if (list === 'dark') { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...q[0], ...q[2], ...q[1], ...q[0], ...q[3], ...q[2]], 3)); g.computeVertexNormals(); P.dark.push(g); }
        else grooves.push({ q, ta: 1 - (ya - s0) / (s1 - s0), tb: 1 - (yb - s0) / (s1 - s0) }); } } }
  /* 머리: 넓어지는 건메탈 관 + 결정을 받쳐 든 발톱 넷 (바깥으로 휘었다 안으로 오므림) */
  P.gun.push(lathe([[0, s1], [.17, s1], [.25, s1 + .12], [.25, s1 + .2], [.2, s1 + .24], [0, s1 + .24]]));
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, pts = [];
    for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push([.2 + Math.sin(u * Math.PI) * .2 + u * .05, s1 + .18 + u * .62]); }
    const pos = []; for (let i = 0; i < 8; i++) { const [r0, y0] = pts[i], [r1, y1] = pts[i + 1], w0 = .06 * (1 - i / 9), w1 = .06 * (1 - (i + 1) / 9), t0 = .05 * (1 - i / 10), t1 = .05 * (1 - (i + 1) / 10);
      const c = Math.cos(a), s = Math.sin(a), Q = (r, y, o, d) => [c * (r + d) - s * o, y, s * (r + d) + c * o];
      const A = [Q(r0, y0, -w0, 0), Q(r0, y0, w0, 0), Q(r0, y0, w0, t0), Q(r0, y0, -w0, t0)], B = [Q(r1, y1, -w1, 0), Q(r1, y1, w1, 0), Q(r1, y1, w1, t1), Q(r1, y1, -w1, t1)];
      for (let j = 0; j < 4; j++) { const j2 = (j + 1) % 4; pos.push(...A[j], ...B[j], ...B[j2], ...A[j], ...B[j2], ...A[j2]); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); P.gun.push(g); }
  return { P, grooves, top: s1 + .24 };
}

export function makeGuardians() {
  const G = new THREE.Group(), { r: R, y: Y0, DOWN } = GUARD;
  const gun = new THREE.MeshPhysicalMaterial({ color: 0x2a2e35, metalness: .9, roughness: .28, clearcoat: .5, clearcoatRoughness: .2, envMapIntensity: 1.05, side: THREE.DoubleSide });
  const white = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0, roughness: .8, envMapIntensity: .6, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b0d12, metalness: .5, roughness: .45, side: THREE.DoubleSide });
  const { P, grooves, top } = pillarParts();
  const uT = { value: 0 }, uOn = { value: 0 }, uFire = { value: -99 };
  /* 홈 속 빛: s=0 꼭대기 → 1 바닥. fire 뒤 빛 덩어리가 위에서 아래로 쏟아짐 */
  const gMat = new THREE.ShaderMaterial({ uniforms: { uT, uOn, uFire }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'attribute float aS; varying float vS; void main(){ vS=aS; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uT, uOn, uFire; varying float vS;
      void main(){ float e = uT - uFire, head = e / ${DOWN.toFixed(2)};
        float pour = exp(-pow((vS - head) * 6., 2.)) * step(0., e) * step(head, 1.3);          /* 쏟아지는 빛 머리 */
        float trail = step(vS, head) * exp(-(head - vS) * 3.) * step(0., e) * step(e, 2.5);
        float idle = .18 + .1 * sin(uT * 1.3 - vS * 4.);
        float b = idle + uOn * (.35 + .25 * sin(uT * 2. - vS * 9.)) + pour * 2. + trail * .6;
        gl_FragColor = vec4(mix(vec3(.28,.58,1.35), vec3(.85,.95,1.35), pour) * b, 1.); }` });
  const crystalMat = new THREE.MeshPhysicalMaterial({ color: 0xbfd9ff, metalness: 0, roughness: .06, clearcoat: 1, clearcoatRoughness: .04, iridescence: .7, iridescenceIOR: 1.4,
    emissive: 0x3d78ff, emissiveIntensity: .4, envMapIntensity: 1.4, flatShading: true });
  const haloMat = new THREE.ShaderMaterial({ uniforms: { uI: { value: .3 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN, vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform float uI; varying vec3 vN, vV; void main(){ float f=pow(1.-abs(dot(vN,vV)),2.2); gl_FragColor=vec4(vec3(.35,.6,1.3)*f*uI,1.); }' });
  const ringMat = new THREE.MeshPhysicalMaterial({ color: 0x9aa6b8, metalness: .95, roughness: .2, clearcoat: .8, envMapIntensity: 1.2 });
  const ringGlow = new THREE.MeshBasicMaterial({ color: 0x3b6fd0 });
  const merged = list => mergeGeometries(list.map(g => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g.index ? g.toNonIndexed() : g; }));
  const gunG = merged(P.gun), whiteG = merged(P.white), darkG = merged(P.dark);
  const gp = [], gs = []; for (const { q, ta, tb } of grooves) { gp.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]); gs.push(ta, tb, tb, ta, tb, ta); }
  const glowG = new THREE.BufferGeometry(); glowG.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); glowG.setAttribute('aS', new THREE.Float32BufferAttribute(gs, 1));
  const crystalG = new THREE.OctahedronGeometry(.2, 0); crystalG.scale(1, 2.1, 1);
  const units = [];
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, u = new THREE.Group(); u.position.set(Math.cos(a) * R, Y0, Math.sin(a) * R); u.rotation.y = -a;
    u.add(new THREE.Mesh(gunG, gun), new THREE.Mesh(whiteG, white), new THREE.Mesh(darkG, dark));
    const gm = new THREE.Mesh(glowG, gMat); gm.renderOrder = 3; u.add(gm);
    const cy = top + .55, cr = new THREE.Mesh(crystalG, crystalMat); cr.position.y = cy; u.add(cr);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(.42, 24, 16), haloMat); halo.position.y = cy; halo.renderOrder = 4; u.add(halo);
    const rings = [];
    for (const [rad, tilt] of [[.42, .5], [.34, -.7]]) { const p = new THREE.Group(); p.position.y = cy; p.rotation.z = tilt;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, .022, 8, 64), ringMat); ring.rotation.x = Math.PI / 2; p.add(ring);
      const rg = new THREE.Mesh(new THREE.TorusGeometry(rad - .02, .006, 4, 64), ringGlow); rg.rotation.x = Math.PI / 2; p.add(rg); u.add(p); rings.push(p); }
    G.add(u); units.push({ u, cr, halo, rings, ph: k * 1.3, cy }); }
  G.userData.fire = t => { uFire.value = t; };
  G.userData.update = (t, on) => { uT.value = t; uOn.value += ((on ? 1 : 0) - uOn.value) * .05; const e = t - uFire.value, burst = e >= 0 && e < 1.6 ? Math.exp(-e * 2.2) : 0;
    const breathe = .5 + .5 * Math.sin(t * 1.1);
    crystalMat.emissiveIntensity = .35 + .25 * breathe + uOn.value * .4 + burst * 3;
    haloMat.uniforms.uI.value = .06 + .05 * breathe + uOn.value * .08 + burst * 1.6;
    ringGlow.color.setRGB(.28 * (.3 + uOn.value + burst * 2), .58 * (.3 + uOn.value + burst * 2), 1.35 * (.3 + uOn.value + burst * 2));
    for (const U of units) { U.cr.position.y = U.cy + Math.sin(t * .9 + U.ph) * .05; U.cr.rotation.y = t * .4 + U.ph;
      U.rings[0].rotation.y = t * .5 + U.ph; U.rings[1].rotation.y = -t * .7 + U.ph; U.halo.position.y = U.cr.position.y; U.halo.scale.setScalar(1 + burst * .5); } };
  return G;
}
