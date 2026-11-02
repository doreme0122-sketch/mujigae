/* 시작 기지 — 수호 탑 넷 (대각선, 2층 위) — 원본 사진의 결정 탑처럼
   · 장갑 받침: 팔각 세 단. 아래 단은 면마다 비스듬한 은색 장갑판 + 판 사이 세로 빛 틈, 가운데 단은 살창 두른 건메탈, 위 단은 결정을 무는 집게 받침
   · 결정 무리: 가운데 큰 결정 하나 + 둘레에 비스듬히 솟은 작은 결정 다섯. 결정은 모서리를 깎은 열두 면 기둥 + 두 단으로 깎인 머리,
     속에 더 작은 빛 결정(속 결정)이 비쳐 보여 깊이가 있다. 아래는 짙은 파랑 → 위로 갈수록 맑고 밝게.
   · 결정이 하늘의 빛을 모아 받침의 빛 틈으로 내려보내고, 그 빛이 계단의 빛길을 따라 판까지 간다(빛이 오는 이유)
   · 평소: 숨 쉬듯 은은. 태어나는 순간(fire): 결정이 확 밝아지고 빛이 받침을 타고 쏟아져 내려감
   단위는 자기장 판과 같음. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const GUARD = { r: 6.15, y: .91, DOWN: .7 };
const NI = g => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g.index ? g.toNonIndexed() : g; };
const lathe = (pts, seg = 8, phase = Math.PI / 8) => NI(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, phase));

/* 결정 하나: 모서리 깎은 열두 면 기둥(살짝 좁아짐) + 가파른 첫 머리면 + 뾰족한 끝. 높이 1 기준(밑 -.1 ~ 끝 1.25) */
export function gem(seed, w = .2) {
  const R = (() => { let s = seed * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const sec = s => { const p = []; for (let k = 0; k < 6; k++) { const c = k / 6 * Math.PI * 2, j = 1 + (R() - .5) * .12; for (const d of [-.17, .17]) p.push([Math.cos(c + d) * w * s * j, Math.sin(c + d) * w * s * j]); } return p; };
  const base = sec(1); const ring = (y, s, ox = 0, oz = 0) => base.map(([x, z]) => new THREE.Vector3(x * s + ox, y, z * s + oz));
  const ox = (R() - .5) * w * .15, oz = (R() - .5) * w * .15;
  const rs = [ring(-.1, .9), ring(.1, 1), ring(.72, .94), ring(.93, .5, ox * .5, oz * .5)], apex = new THREE.Vector3(ox, 1.22 + R() * .08, oz), foot = new THREE.Vector3(0, -.18, 0);
  const pos = [], push = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z), n = base.length;
  for (let L = 0; L < rs.length - 1; L++) for (let k = 0; k < n; k++) { const k2 = (k + 1) % n, A = rs[L][k], B = rs[L][k2], C = rs[L + 1][k2], D = rs[L + 1][k]; push(A, C, B); push(A, D, C); }
  for (let k = 0; k < n; k++) { const k2 = (k + 1) % n; push(rs[3][k], apex, rs[3][k2]); push(rs[0][k], rs[0][k2], foot); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  /* 앞뒤 맞춤: 중심축에서 바깥을 보게 */
  const P = g.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nn = new THREE.Vector3(), m = new THREE.Vector3();
  for (let i = 0; i < P.count; i += 3) { a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, i + 1); c.fromBufferAttribute(P, i + 2);
    nn.crossVectors(b.clone().sub(a), c.clone().sub(a)); m.copy(a).add(b).add(c).divideScalar(3); const ax = new THREE.Vector3(0, THREE.MathUtils.clamp(m.y, 0, .9), 0);
    if (nn.dot(m.sub(ax)) < 0) { P.setXYZ(i + 1, c.x, c.y, c.z); P.setXYZ(i + 2, b.x, b.y, b.z); } }
  g.computeVertexNormals(); return g;
}

function baseParts() {
  const P = { gun: [], silver: [], dark: [] }, slits = [];
  /* 아래 단: 팔각 건메탈 몸통 + 면마다 비스듬한 은색 장갑판 */
  P.gun.push(lathe([[0, 0], [.72, 0], [.72, .08], [.66, .1], [.62, .42], [.5, .5], [0, .5]]));
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, s = new THREE.Shape(), W = .2;
    s.moveTo(-W, 0); s.lineTo(W, 0); s.lineTo(W * .8, .34); s.lineTo(-W * .8, .34); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: .04, bevelEnabled: true, bevelThickness: .012, bevelSize: .01, bevelSegments: 1 });
    g.rotateX(-.12); g.rotateY(Math.PI / 2); g.translate(.66, .1, 0); g.rotateY(-a); P.silver.push(NI(g));
    const sa = a + Math.PI / 8; slits.push({ r: .655, a: sa, y0: .14, y1: .44 }); }               /* 판 사이 세로 빛 틈 */
  /* 가운데 단: 살창 두른 건메탈 */
  P.gun.push(lathe([[0, .5], [.48, .5], [.48, .86], [.44, .9], [0, .9]]));
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, g = new THREE.BoxGeometry(.04, .3, .045); g.translate(.49, .69, 0); g.rotateY(-a); P.silver.push(NI(g)); }
  /* 위 단: 넓어졌다 오므리는 받침 + 결정을 무는 집게 여섯 */
  P.silver.push(lathe([[0, .9], [.42, .9], [.52, 1.02], [.5, 1.1], [.36, 1.16], [0, 1.16]]));
  P.dark.push(lathe([[0, 1.161], [.3, 1.161], [.3, 1.17], [0, 1.17]], 12, 0));
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.PI / 6, pts = [];
    for (let i = 0; i <= 6; i++) { const u = i / 6; pts.push([.42 - u * .14 + Math.sin(u * Math.PI) * .06, 1.08 + u * .5]); }
    const pos = []; for (let i = 0; i < 6; i++) { const [r0, y0] = pts[i], [r1, y1] = pts[i + 1], w0 = .055 * (1 - i / 8), w1 = .055 * (1 - (i + 1) / 8);
      const c = Math.cos(a), s = Math.sin(a), Q = (r, y, o, d) => [c * (r + d) - s * o, y, s * (r + d) + c * o];
      const A = [Q(r0, y0, -w0, 0), Q(r0, y0, w0, 0), Q(r0, y0, w0, .05), Q(r0, y0, -w0, .05)], B = [Q(r1, y1, -w1, 0), Q(r1, y1, w1, 0), Q(r1, y1, w1, .04), Q(r1, y1, -w1, .04)];
      for (let j = 0; j < 4; j++) { const j2 = (j + 1) % 4; pos.push(...A[j], ...B[j], ...B[j2], ...A[j], ...B[j2], ...A[j2]); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); P.gun.push(g); }
  return { P, slits, top: 1.16 };
}

export function makeGuardians() {
  const G = new THREE.Group(), { r: RR, y: Y0, DOWN } = GUARD;
  const gun = new THREE.MeshPhysicalMaterial({ color: 0x2a2e35, metalness: .9, roughness: .28, clearcoat: .5, clearcoatRoughness: .2, envMapIntensity: 1.05, side: THREE.DoubleSide });
  const silver = new THREE.MeshPhysicalMaterial({ color: 0xb3bac6, metalness: 1, roughness: .26, clearcoat: .5, clearcoatRoughness: .15, envMapIntensity: 1.15, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b0d12, metalness: .5, roughness: .45 });
  const uT = { value: 0 }, uOn = { value: 0 }, uFire = { value: -99 }, uGem = { value: .4 };
  /* 결정 겉: 반투명 유리 결정, 아래 짙은 파랑 → 위로 맑고 밝게(빛이 위에서 들어와 모임) */
  const gemOuter = new THREE.MeshPhysicalMaterial({ color: 0x8fb8ff, metalness: 0, roughness: .05, transparent: true, opacity: .62, clearcoat: 1, clearcoatRoughness: .03,
    iridescence: .8, iridescenceIOR: 1.35, envMapIntensity: 1.7, emissive: 0x2a5cff, emissiveIntensity: .5, flatShading: true, depthWrite: false });
  gemOuter.onBeforeCompile = sh => { sh.uniforms.uGem = uGem;
    sh.vertexShader = 'varying float vGy;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGy = position.y;');
    sh.fragmentShader = 'uniform float uGem; varying float vGy;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= mix(.35, 1.6, smoothstep(-.1, 1.2, vGy)) * uGem;\n diffuseColor.rgb *= mix(vec3(.25,.4,.9), vec3(1.), smoothstep(0., 1.1, vGy));'); };
  gemOuter.customProgramCacheKey = () => 'gemOuter';
  const gemCore = new THREE.MeshBasicMaterial({ color: 0x6aa0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  /* 받침 빛 틈: s=0 위 → 1 아래 */
  const sMat = new THREE.ShaderMaterial({ uniforms: { uT, uOn, uFire }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'attribute float aS; varying float vS; void main(){ vS=aS; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uT, uOn, uFire; varying float vS;
      void main(){ float e = uT - uFire, head = e / ${DOWN.toFixed(2)};
        float pour = exp(-pow((vS - head) * 5., 2.)) * step(0., e) * step(head, 1.3);
        float b = .25 + .1 * sin(uT * 1.3 - vS * 4.) + uOn * (.5 + .3 * sin(uT * 2. - vS * 7.)) + pour * 2.2;
        gl_FragColor = vec4(mix(vec3(.28,.58,1.35), vec3(.85,.95,1.35), pour) * b, 1.); }` });
  const { P, slits, top } = baseParts();
  const merged = l => mergeGeometries(l.map(NI));
  const gunG = merged(P.gun), silverG = merged(P.silver), darkG = merged(P.dark);
  /* 빛 틈 (받침 아래 단 판 사이 + 가운데 단 둘레 두 줄) */
  const sp = [], ss = [];
  const quad = (A, B, C, D, sa, sb) => { sp.push(...A, ...B, ...C, ...A, ...C, ...D); ss.push(sa, sb, sb, sa, sb, sa); };
  for (const { r, a, y0, y1 } of slits) { const c = Math.cos(a), s = Math.sin(a), w = .014, n = 6;
    for (let i = 0; i < n; i++) { const ya = y1 - (y1 - y0) * i / n, yb = y1 - (y1 - y0) * (i + 1) / n, ra = r - (.62 - .66) * 0, Q = (y, o) => [c * (r + .005) - s * o, y, s * (r + .005) + c * o];
      quad(Q(ya, -w), Q(yb, -w), Q(yb, w), Q(ya, w), .3 + .7 * i / n, .3 + .7 * (i + 1) / n); } }
  for (const y of [.53, .87]) for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, b = (i + 1) / 48 * Math.PI * 2, r = .485, P2 = (aa, yy) => [Math.cos(aa) * r, yy, Math.sin(aa) * r];
    quad(P2(a, y - .01), P2(b, y - .01), P2(b, y + .01), P2(a, y + .01), y > .7 ? .05 : .2, y > .7 ? .05 : .2); }
  const slitG = new THREE.BufferGeometry(); slitG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); slitG.setAttribute('aS', new THREE.Float32BufferAttribute(ss, 1));
  /* 결정 무리 모양: 큰 것 하나 + 작은 것 다섯 (뿌리에서 비스듬히) */
  const cluster = [{ s: 1.75, w: .27, tilt: 0, yaw: 0, off: 0 }];
  for (let k = 0; k < 5; k++) cluster.push({ s: .75 + (k % 3) * .2, w: .13 + (k % 2) * .03, tilt: .34 + (k % 2) * .14, yaw: k / 5 * Math.PI * 2 + .3, off: .2 });
  const outerList = [], coreList = [];
  cluster.forEach((c, i) => { const g = gem(11 + i * 7, c.w); g.scale(1, c.s, 1); g.rotateZ(c.tilt); g.rotateY(c.yaw); g.translate(Math.cos(c.yaw) * c.off, 0, -Math.sin(c.yaw) * c.off); outerList.push(g);
    const k = gem(11 + i * 7, c.w * .45); k.scale(1, c.s * .82, 1); k.translate(0, c.s * .05, 0); k.rotateZ(c.tilt); k.rotateY(c.yaw); k.translate(Math.cos(c.yaw) * c.off, 0, -Math.sin(c.yaw) * c.off); coreList.push(k); });
  const outerG = mergeGeometries(outerList.map(NI)), coreG = mergeGeometries(coreList.map(NI));
  const units = [];
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, u = new THREE.Group(); u.position.set(Math.cos(a) * RR, Y0, Math.sin(a) * RR); u.rotation.y = -a;
    u.add(new THREE.Mesh(gunG, gun), new THREE.Mesh(silverG, silver), new THREE.Mesh(darkG, dark));
    const sm = new THREE.Mesh(slitG, sMat); sm.renderOrder = 3; u.add(sm);
    const cl = new THREE.Group(); cl.position.y = top + .02; u.add(cl);
    const core = new THREE.Mesh(coreG, gemCore); core.renderOrder = 4; cl.add(core);
    const outer = new THREE.Mesh(outerG, gemOuter); outer.renderOrder = 5; cl.add(outer);
    /* 결정 둘레를 천천히 도는 작은 조각 셋 */
    const shards = []; for (let j = 0; j < 3; j++) { const sg = gem(90 + j, .05); sg.scale(1, .5, 1); const m = new THREE.Mesh(sg, gemOuter); m.renderOrder = 5; cl.add(m); shards.push(m); }
    G.add(u); units.push({ cl, shards, ph: k * 1.7 }); }
  G.userData.fire = t => { uFire.value = t; };
  G.userData.update = (t, on) => { uT.value = t; uOn.value += ((on ? 1 : 0) - uOn.value) * .05; const e = t - uFire.value, burst = e >= 0 && e < 1.6 ? Math.exp(-e * 2.4) : 0;
    const breathe = .5 + .5 * Math.sin(t * 1.1);
    uGem.value = .45 + .25 * breathe + uOn.value * .35 + burst * 3;
    const ci = .25 + .15 * breathe + uOn.value * .3 + burst * 2; gemCore.color.setRGB(.42 * ci, .63 * ci, 1.0 * ci);
    for (const U of units) U.shards.forEach((m, j) => { const a = t * (.35 + j * .08) + j * 2.1 + U.ph, r = .55 + j * .06; m.position.set(Math.cos(a) * r, 1.0 + j * .35 + Math.sin(t * .8 + j) * .06, Math.sin(a) * r); m.rotation.set(t * .5 + j, t * .7, .4); }); };
  return G;
}
