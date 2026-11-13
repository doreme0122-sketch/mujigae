/* 보스방 테두리: 반사되는 결정 벽 + 벽 바로 안쪽 드문드문 수정 (2026-11-03 사용자 확정 — 처음의 '벽 없이 기둥 20개'를 바꿈)
   · 벽: 보스 구역 둘레(반지름 약 31m)를 결정 기둥이 촘촘히 붙어 선 결정 벽으로 감쌈. 문 다섯 곳만 열림(너무 많으면 벽이 토막 나 보이고, 적으면 갇힌 느낌)
     문은 와드 옆 샛길이 들어오는 열 곳 가운데 하나 걸러 하나 · 문 양옆엔 키 큰 결정 문기둥(여기가 문이라는 표시)
     벽은 한 줄 곧은 담이 아니라 높낮이가 물결치고, 바깥·안쪽으로 작은 결정이 덧자라 두께가 생김. 문 쪽으로 갈수록 높아져 문기둥으로 이어짐
   · 수정 일곱: 벽 바로 안쪽(반지름 약 25~27m)에 드문드문, 일부러 고르지 않게 — 문 들어서자마자 옆에 숨는 자리 · 벽에 등을 댄 구석. 가운데는 비움(보스와 싸우는 데 집중)
   · 벽도 수정도 탄을 튕김 → 벽과 수정 사이로 탄이 이리저리 튕기는 구석이 생김. 튕긴 탄은 쏜 사람도 맞음
   · 평소엔 조용한 어두운 결정(무지개 없음 · 무지개는 만질 때만). 탄이 맞으면 맞은 자리에서 무지개 물결이 결정을 따라 퍼지고 맑은 울림
   · 기체는 부딪힘
   단위 m */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as A from '../core/audio.js?v=11140030';

const A0 = -Math.PI / 2, MID = Array.from({ length: 10 }, (_, k) => A0 + k * Math.PI / 5 + Math.PI / 10);
export const CRY = { WALL: 31, T: .95, GATE: .15, HITS: 8 };   /* WALL: 벽 반지름 · T: 벽 두께 절반 · GATE: 문 너비 절반(각도, 약 9m 문) */

function rng(seed) { let s = seed * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
/* 육각 수정 기둥: 몸통(살짝 굵기가 다름) + 끝이 비스듬히 깎인 뾰족 머리. 면마다 방향을 따로 가짐(각진 결정) */
function prism(r, h, tip, R) {
  const n = 6, rot = R() * Math.PI, rs = Array.from({ length: n }, () => r * (.85 + R() * .3)), P = [];
  const ring = (y, s) => rs.map((q, k) => { const a = rot + k / n * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * q * s, y, Math.sin(a) * q * s); });
  const b0 = ring(-.3, 1.04), b1 = ring(h * .55, 1), b2 = ring(h, .96), ax = new THREE.Vector3((R() - .5) * r * .5, h + tip, (R() - .5) * r * .5);
  const E = [], push = (a, b, c, m = [1, 1, 1]) => { P.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); for (let v = 0; v < 3; v++) E.push(v === 0 ? 1 : 0, v === 1 ? 1 : 0, v === 2 ? 1 : 0, m[0] + m[1] * 2 + m[2] * 4); };   /* 모서리 표시: 꼭짓점 무게 + 진짜 모서리(사각 면을 나눈 대각선은 뺌) */
  for (let k = 0; k < n; k++) { const k2 = (k + 1) % n;
    push(b0[k], b1[k2], b0[k2], [1, 1, 0]); push(b0[k], b1[k], b1[k2], [1, 0, 1]);      /* m[i] = i번 꼭짓점 맞은편 모서리를 그림 */
    push(b1[k], b2[k2], b1[k2], [1, 1, 0]); push(b1[k], b2[k], b2[k2], [1, 0, 1]);
    push(b2[k], ax, b2[k2]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aE', new THREE.Float32BufferAttribute(E, 4));
  /* 앞뒤 맞춤: 바깥을 보게 */
  const p = g.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), m = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) { a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    nn.subVectors(b, a).cross(c.clone().sub(a)); m.copy(a).add(b).add(c).divideScalar(3); m.y = 0;
    if (nn.x * m.x + nn.z * m.z < 0 && Math.abs(nn.y) < .99 * nn.length()) { p.setXYZ(i + 1, c.x, c.y, c.z); p.setXYZ(i + 2, b.x, b.y, b.z);
      const e = g.attributes.aE, mk = e.getW(i), m0 = mk & 1, m1 = (mk >> 1) & 1, m2 = (mk >> 2) & 1, nm = m0 + m2 * 2 + m1 * 4; for (let v = 0; v < 3; v++) e.setW(i + v, nm); } }
  g.computeVertexNormals(); return g;
}
function cluster(seed, big) {
  const R = rng(seed), parts = [], H = big ? 4.6 + R() * 1.2 : 3.4 + R() * .9, r0 = big ? .78 : .62;
  parts.push(prism(r0, H, .9 + R() * .4, R));
  const nSat = 2 + Math.floor(R() * 3);
  for (let i = 0; i < nSat; i++) { const a = R() * Math.PI * 2, d = r0 * (.8 + R() * .5), h = H * (.3 + R() * .35), g = prism(r0 * (.32 + R() * .2), h, .4 + R() * .3, R);
    g.rotateZ(-(.25 + R() * .35)); g.rotateY(-a); g.translate(Math.cos(a) * d, 0, Math.sin(a) * d); parts.push(g); }      /* 바깥으로 기운 작은 기둥 */
  for (let i = 0; i < 7; i++) { const a = R() * Math.PI * 2, d = r0 * (1.1 + R() * .9), s = .12 + R() * .16, g = prism(s, s * 1.2, s * .8, R);
    g.rotateX(R() * 1.4); g.rotateZ(R() * 1.4); g.translate(Math.cos(a) * d, -.05, Math.sin(a) * d); parts.push(g); }        /* 밑동 부스러기 */
  return { g: mergeGeometries(parts), r: r0 * 1.5, h: H };
}

/* 결정 재질: 빛을 받는 차가운 투명 결정 + 속빛이 위로 흐름 + 맞은 자리에서 퍼지는 무지개 물결 */
function crystalMat(uT) {
  const m = new THREE.MeshStandardMaterial({ color: 0x142238, metalness: .4, roughness: .08, transparent: true, opacity: .9, envMapIntensity: 1.2 });   /* 깊고 어두운 맑은 결정: 둘레가 비쳐 보이고 모서리가 빛남 */
  const hits = Array.from({ length: CRY.HITS }, () => new THREE.Vector4(0, -99, 0, -99));
  m.userData.hits = hits;
  m.onBeforeCompile = sh => { sh.uniforms.uT = uT; sh.uniforms.uHit = { value: hits };
    sh.vertexShader = 'attribute vec4 aE; varying vec4 vE; varying vec3 vCw; varying vec3 vCn;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vE = aE; vCw = (modelMatrix * vec4(transformed, 1.)).xyz; vCn = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = `varying vec4 vE; varying vec3 vCw; varying vec3 vCn; uniform float uT; uniform vec4 uHit[${CRY.HITS}];
      vec3 spec(float x){ return clamp(abs(fract(x + vec3(0., .33, .67)) * 6. - 3.) - 1., 0., 1.); }\n` + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { vec3 V = normalize(cameraPosition - vCw), N = normalize(vCn); float f = 1. - abs(dot(N, V)), rim = f * f;
        float up = fract(vCw.y * .16 - uT * .07 + sin(vCw.x * .3 + vCw.z * .2) * .3), vein = exp(-(up - .5) * (up - .5) * 40.);   /* 속빛이 천천히 위로 올라감 */
        vec3 cold = vec3(.32, .55, .9);
        float mk = floor(vE.w + .5), e0 = vE.x + (mod(mk, 2.) < .5 ? 9. : 0.), e1 = vE.y + (mod(floor(mk / 2.), 2.) < .5 ? 9. : 0.), e2 = vE.z + (floor(mk / 4.) < .5 ? 9. : 0.);
        float ed = min(e0, min(e1, e2)), fw = fwidth(ed), edge = 1. - smoothstep(fw * .6, fw * 2.2 + .004, ed);                    /* 깎인 모서리를 따라 가는 빛 (화면에서 늘 같은 굵기) */
        float g1 = sin(vCw.y * 2.1 - uT * 1.6 + vCw.x * .7 + vCw.z * .5), edgeL = .25 + .75 * pow(max(g1, 0.), 6.) + .2 * sin(vCw.y * .5 + vCw.z * 1.3);   /* 모서리를 따라 빛 알갱이가 천천히 타고 오름 — 늘 같은 밝기의 선이 아니게 */                                                        /* 모서리 빛이 천천히 흐름 */
        totalEmissiveRadiance += cold * cold * (.04 + rim * .55 + vein * .14 * (.4 + rim)) + vec3(.55, .75, 1.) * edge * (.08 + .3 * edgeL) * (.5 + rim);
        for (int i = 0; i < ${CRY.HITS}; i++) { float age = uT - uHit[i].w; if (age < 0. || age > 1.6) continue;
          float d = length(vCw - uHit[i].xyz), front = age * 7.5, q = (d - front) / (.45 + age * .5), ring = exp(-q * q) * (1. - age / 1.6);   /* 맞은 자리에서 둥글게 퍼짐 */
          float core = exp(-d * d * 3.) * exp(-age * 9.) * 2.;                                                                                  /* 맞은 순간 그 자리 번쩍 */
          vec3 rb = spec(d * .35 - age * 1.4 + dot(N, vec3(.3, .2, .1)));                                                                       /* 프리즘처럼 갈라진 빛 */
          totalEmissiveRadiance += (rb * rb * 1.4 + .05) * ring * (.45 + rim) + vec3(1.) * core; } }`);
  };
  m.customProgramCacheKey = () => 'boss-crystal';
  return m;
}

function ping(vol = .08) { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, f = 1900 + Math.random() * 700;
  [[1, 1], [1.5, .45], [2.76, .25], [4.1, .12]].forEach(([k, v]) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f * k; o.connect(g); A.env(g, t0, .002, vol * v, .9 / Math.sqrt(k)); A.out(g, .5); o.start(t0); o.stop(t0 + 1); }); }

export function makeBossCrystals(B, uT) {
  const G = new THREE.Group(), list = [], geos = [], R = rng(5), W = CRY.WALL;
  const gates = [0, 2, 4, 6, 8].map(k => MID[k]);
  const angD = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const gateD = a => Math.min(...gates.map(g => Math.abs(angD(a, g))));                 /* 가장 가까운 문까지 각도 */
  /* 벽: 문과 문 사이 다섯 토막. 결정 기둥을 촘촘히 세움 */
  const arcs = gates.map((g, i) => { const g2 = gates[(i + 1) % 5]; return [g + CRY.GATE, g + CRY.GATE + (((angD(g2, g) + Math.PI * 2) % (Math.PI * 2)) - CRY.GATE * 2)]; });
  for (const [a0, a1] of arcs) { const L = (a1 - a0) * W, n = Math.round(L / 1.05);
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n + (R() - .5) * .008, ed = Math.min(i, n - i) / n;            /* ed: 토막 끝(문)에서 얼마나 떨어졌나 */
      const rise = Math.exp(-ed * 16) * 1.6, wave = Math.sin(a * 7.3) * .35 + Math.sin(a * 17.1 + 1.3) * .2;                     /* 문 쪽으로 높아짐 + 높낮이 물결 */
      const h = 2.3 + wave + rise + R() * .5, r = .55 + R() * .22, g = prism(r, h, .45 + R() * .35, R);
      g.rotateX((R() - .5) * .12); g.rotateZ((R() - .5) * .1 - .05);
      const rr = W + (R() - .5) * .35; g.rotateY(-a); g.translate(Math.cos(a) * rr, 0, Math.sin(a) * rr); geos.push(g);
      if (R() < .55) { const side = R() < .5 ? -1 : 1, sh = h * (.3 + R() * .3), sg = prism(r * (.4 + R() * .25), sh, .3 + R() * .2, R);   /* 안팎으로 덧자란 작은 결정 */
        sg.rotateZ(side * -(.3 + R() * .3)); sg.rotateY(-a); const d = rr + side * (r + .2); sg.translate(Math.cos(a) * d, 0, Math.sin(a) * d); geos.push(sg); }
      if (R() < .4) { const s2 = .1 + R() * .14, rg = prism(s2, s2 * 1.2, s2 * .8, R); rg.rotateX(R() * 1.4); rg.rotateZ(R() * 1.4); const d = rr + (R() - .5) * 2.6, aa = a + (R() - .5) * .03; rg.translate(Math.cos(aa) * d, -.05, Math.sin(aa) * d); geos.push(rg); } } }   /* 밑동 부스러기 */
  /* 문기둥: 문 양옆에 키 큰 결정 무리 */
  gates.forEach((g, k) => { for (const s of [-1, 1]) { const a = g + s * (CRY.GATE + .02), x = Math.cos(a) * W, z = Math.sin(a) * W, c = cluster(70 + k * 5 + (s > 0 ? 2 : 0), true);
    c.g.scale(1.15, 1.2, 1.15); c.g.rotateY(-a); c.g.translate(x, 0, z); geos.push(c.g); list.push({ x, z, r: c.r * 1.15, h: c.h * 1.2 }); } });
  /* 안쪽 수정 일곱: [문 번호, 문에서 각도, 반지름, 큰 것] — 일부러 고르지 않게 */
  [[0, .36, 26.6, 1], [1, -.27, 27.2, 0], [1, .64, 25.4, 1], [2, -.42, 26.2, 0], [3, .22, 27, 1], [3, .78, 26.4, 0], [4, -.33, 25.8, 1]].forEach(([k, da, rr, big], i) => {
    const a = gates[k] + da, x = Math.cos(a) * rr, z = Math.sin(a) * rr, c = cluster(31 + i * 7, !!big);
    c.g.rotateY(-a + (i % 2 ? .5 : -.4)); c.g.translate(x, 0, z); geos.push(c.g); list.push({ x, z, r: c.r, h: c.h }); });
  const inWall = (x, z) => { const r = Math.hypot(x, z); return Math.abs(r - W) < CRY.T && gateD(Math.atan2(z, x)) > CRY.GATE; };
  const mat = crystalMat(uT), mesh = new THREE.Mesh(mergeGeometries(geos), mat); mesh.renderOrder = 2; G.add(mesh);
  /* 기둥 몸은 부딪힘 */
  const blocked0 = B.blocked; B.blocked = (x, z) => { if (blocked0(x, z) || inWall(x, z)) return true; for (const o of list) { const dx = x - o.x, dz = z - o.z; if (dx * dx + dz * dz < o.r * o.r) return true; } return false; };
  let hi = 0;
  G.userData.list = list; G.userData.gates = gates;
  /* 탄이 지나간 한 걸음(ax,az → bx,bz) 사이에 기둥 테두리를 넘으면 [닿은 곳, 바깥 방향] */
  G.userData.cross = (ax, az, bx, bz, pad = .1) => { let best = null, bt = 2;
    for (const o of list) { const R = o.r + pad, dx = bx - ax, dz = bz - az, fx = ax - o.x, fz = az - o.z, a = dx * dx + dz * dz, b = 2 * (fx * dx + fz * dz), c = fx * fx + fz * fz - R * R;
      if (c < 0) { const l = Math.hypot(fx, fz) || 1; if (bt > 0) { bt = 0; best = { t: 0, x: ax, z: az, nx: fx / l, nz: fz / l, o }; } continue; }
      const disc = b * b - 4 * a * c; if (disc < 0 || a < 1e-9) continue; const t = (-b - Math.sqrt(disc)) / (2 * a); if (t < 0 || t > 1 || t >= bt) continue;
      const px = ax + dx * t, pz = az + dz * t, nx = (px - o.x) / R, nz = (pz - o.z) / R; bt = t; best = { t, x: px, z: pz, nx, nz, o }; }
    /* 벽: 안쪽 면(반지름 W-T)이나 바깥 면(W+T)을 넘는 곳. 문 자리는 지나감 */
    { const rA = Math.hypot(ax, az), dx = bx - ax, dz = bz - az, a = dx * dx + dz * dz;
      for (const [Rf, sgn] of [[W - CRY.T - pad, -1], [W + CRY.T + pad, 1]]) { if (sgn < 0 ? rA > Rf : rA < Rf) continue;   /* 그 면 쪽에 있을 때만 */
        const b = 2 * (ax * dx + az * dz), c = ax * ax + az * az - Rf * Rf, disc = b * b - 4 * a * c; if (disc < 0 || a < 1e-9) continue;
        const sq = Math.sqrt(disc), t1 = (-b - sq) / (2 * a), t2 = (-b + sq) / (2 * a), t = sgn < 0 ? t2 : t1; if (t < 0 || t > 1 || t >= bt) continue;
        const px = ax + dx * t, pz = az + dz * t; if (gateD(Math.atan2(pz, px)) <= CRY.GATE) continue;
        const l = Math.hypot(px, pz); bt = t; best = { t, x: px, z: pz, nx: sgn * px / l, nz: sgn * pz / l, wall: true }; } }
    return best; };
  /* 맞은 자리 무지개 물결 */
  G.userData.flash = (t, x, y, z) => { mat.userData.hits[hi].set(x, y, z, t); hi = (hi + 1) % CRY.HITS; ping(); };
  return G;
}
