/* 보스 구역 수정 기둥 20개 (2026-11-03 음성 회의 확정)
   · 자리: 보스 구역 바깥쪽(반지름 약 27~31m). 벽으로 막지 않고 기둥 사이로 드나듦
     와드 옆 샛길이 안쪽 둥근 길로 들어오는 열 곳(MID 각도)마다 기둥 둘이 양옆에 서서 좁은 문을 만듦
     → 샛길로 들어오는 사람은 기둥 뒤에 몸을 붙여 숨고, 문과 문 사이는 넓게 트여 흐름이 지나감
   · 생김새: 땅에서 솟은 수정 무리 — 큰 육각 기둥 하나 + 바깥으로 기운 작은 기둥 둘~넷 + 밑동 부스러기
     평소엔 조용한 차가운 투명 결정(무지개 없음 · 디자인 기준: 무지개는 만질 때만). 속에서 옅은 빛이 천천히 위로 올라감(살아 있는 결정)
   · 탄이 맞으면: 그 자리에서 무지개 물결이 결정 표면을 따라 퍼지고 맑은 울림 → 탄은 튕겨 나감 (반사 = 무지개반사)
   · 몸은 부딪힘(기체도 지나가지 못함)
   단위 m */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as A from '../core/audio.js';

const A0 = -Math.PI / 2, MID = Array.from({ length: 10 }, (_, k) => A0 + k * Math.PI / 5 + Math.PI / 10);
export const CRY = { R: 29, SPREAD: .125, HITS: 8 };

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
  const G = new THREE.Group(), list = [], geos = [];
  MID.forEach((m, k) => { for (const s of [-1, 1]) { const a = m + s * CRY.SPREAD * (k % 2 ? 1.15 : .9), rr = CRY.R + (s * (k % 3 - 1)) * 1.1, big = (k + (s > 0)) % 2 === 0;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr, c = cluster(31 + k * 7 + (s > 0 ? 3 : 0), big);
    c.g.rotateY(-a + (s > 0 ? .4 : -.4)); c.g.translate(x, 0, z); geos.push(c.g); list.push({ x, z, r: c.r, h: c.h }); } });
  const mat = crystalMat(uT), mesh = new THREE.Mesh(mergeGeometries(geos), mat); mesh.renderOrder = 2; G.add(mesh);
  /* 기둥 몸은 부딪힘 */
  const blocked0 = B.blocked; B.blocked = (x, z) => { if (blocked0(x, z)) return true; for (const o of list) { const dx = x - o.x, dz = z - o.z; if (dx * dx + dz * dz < o.r * o.r) return true; } return false; };
  let hi = 0;
  G.userData.list = list;
  /* 탄이 지나간 한 걸음(ax,az → bx,bz) 사이에 기둥 테두리를 넘으면 [닿은 곳, 바깥 방향] */
  G.userData.cross = (ax, az, bx, bz, pad = .1) => { let best = null, bt = 2;
    for (const o of list) { const R = o.r + pad, dx = bx - ax, dz = bz - az, fx = ax - o.x, fz = az - o.z, a = dx * dx + dz * dz, b = 2 * (fx * dx + fz * dz), c = fx * fx + fz * fz - R * R;
      if (c < 0) { const l = Math.hypot(fx, fz) || 1; if (bt > 0) { bt = 0; best = { t: 0, x: ax, z: az, nx: fx / l, nz: fz / l, o }; } continue; }
      const disc = b * b - 4 * a * c; if (disc < 0 || a < 1e-9) continue; const t = (-b - Math.sqrt(disc)) / (2 * a); if (t < 0 || t > 1 || t >= bt) continue;
      const px = ax + dx * t, pz = az + dz * t, nx = (px - o.x) / R, nz = (pz - o.z) / R; bt = t; best = { t, x: px, z: pz, nx, nz, o }; }
    return best; };
  /* 맞은 자리 무지개 물결 */
  G.userData.flash = (t, x, y, z) => { mat.userData.hits[hi].set(x, y, z, t); hi = (hi + 1) % CRY.HITS; ping(); };
  return G;
}
