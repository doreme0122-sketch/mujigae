/* 전체 맵 — 초원 고리 (Lv1, 사용자 2026-11-06 미니맵 기준)
   · 맵 반지름 240m(우리가 정한 크기 · 사용자 2026-11-06) 중 바깥 고리 187~240m가 초원(미니맵 비율 그대로). 섬 모양은 사용자가 준 3층 월드의 초원 섬 25종(kit_meadow.glb)을 그대로 씀
   · 층: 가운데층(기체가 나는 층, 섬 윗면이 기체 아래에 깔림) · 위층 +20m(밝게, 기체를 가리지 않게 점무늬로 옅게) · 아래층 −30m(어둡게, 구름 쪽으로 흐려짐)
   · 공평하게: 기지 10곳마다 같은 몫 — 기지 앞을 가운데로 한 조각(36°)마다 몬스터 둥지 1 · 큰 섬 4 · 작은·중간 섬 26 · 층을 뚫는 기둥 2 · 발아래 바위 16 · 위층 섬 5 · 아래층 섬 7 (가벼운 섬 모델 kit_meadow_lo: 겉모습은 그대로 · 면은 원래의 15%) (섬은 받은 모델의 3분의 1 크기)
   · 보물 던전 섬 5 = 기지 사이 다섯 곳 (위층 3 · 아래층 2, 번갈아) — 가운데층엔 보물 없음
   · 막힘: 가운데층 섬 중 기체 높이를 지나는 바위·땅만 막음(위에서 단면을 1m 칸으로 찍음). 풀·나무·물은 안 막음. 위·아래층 섬은 다른 층이라 안 막음
   · 그리기: 조각마다 · 층마다 · 재질마다 한 덩어리로 합침 → 화면 밖 조각은 통째로 안 그림 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries, deinterleaveGeometry } from 'three/addons/utils/BufferGeometryUtils.js';

export const MEADOW = { R0: 187, R1: 240, UP: 20, DN: -30, TOP: -1.0, SC: 1 / 2 };   /* SC: 받은 섬 모델 크기의 2분의 1 (사용자 2026-11-06: 원래는 너무 크고 3분의 1은 너무 작음) */   /* 가운데층 섬 윗면 = 기체(높이 .7)보다 1.7m 아래 */
const SECT = 10, CELL = 1;

const rnd = seed => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

/* 섬 윗면 높이: 위를 보는 땅 면을 높이별 넓이로 모아, 위에서부터 40%가 쌓이는 높이 (평평한 섬 = 윗면 · 언덕 섬 = 언덕 중턱) */
function topOf(prims) {
  const bins = new Map(); let tot = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (const p of prims) { if (p.mat !== 'Terrain') continue; const P = p.geo.attributes.position, I = p.geo.index;
    const cnt = I ? I.count : P.count; for (let i = 0; i < cnt; i += 3) { const i0 = I ? I.getX(i) : i, i1 = I ? I.getX(i + 1) : i + 1, i2 = I ? I.getX(i + 2) : i + 2;
      a.fromBufferAttribute(P, i0); b.fromBufferAttribute(P, i1); c.fromBufferAttribute(P, i2); n.crossVectors(b.clone().sub(a), c.clone().sub(a)); const ar = n.length() / 2; if (ar < 1e-6) continue;
      if (n.y / (ar * 2) < .8) continue; const y = Math.round((a.y + b.y + c.y) / 3 * 4) / 4; bins.set(y, (bins.get(y) || 0) + ar); tot += ar; } }
  const ys = [...bins.keys()].sort((p, q) => q - p); let acc = 0; for (const y of ys) { acc += bins.get(y); if (acc >= tot * .4) return y; } return 0;
}

export async function makeMeadow(scene, url, onProgress = () => {}) {
  const gl = await new GLTFLoader().loadAsync(url); onProgress(.5);
  /* 섬 종류별: 재질별 조각 · 윗면 높이 · 바닥 높이 · 둘레 반지름 */
  const KIT = {};
  gl.scene.updateMatrixWorld(true);
  for (const node of gl.scene.children) { const prims = []; const bb = new THREE.Box3();
    node.traverse(o => { if (!o.isMesh) return; const g = o.geometry.clone(); deinterleaveGeometry(g); if (!g.index) { const ix = new Uint32Array(g.attributes.position.count); for (let i = 0; i < ix.length; i++) ix[i] = i; g.setIndex(new THREE.BufferAttribute(ix, 1)); } if (g.attributes.uv) g.deleteAttribute('uv'); g.applyMatrix4(o.matrixWorld); if (!g.attributes.color) return; prims.push({ geo: g, mat: o.material.name || 'Terrain', src: o.material }); g.computeBoundingBox(); bb.union(g.boundingBox); });
    const top = topOf(prims), rad = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2;
    KIT[node.name] = { prims, top, bot: bb.min.y, hi: bb.max.y, rad }; }
  const MATS = {}; for (const k in KIT) for (const p of KIT[k].prims) MATS[p.mat] = p.src;

  /* ── 놓을 자리 정하기 (조각마다 같은 몫 · 운은 조각마다 다르게) ── */
  const { R0, R1, UP, DN, TOP, SC } = MEADOW, place = [];   /* { k, x, z, y, yaw, layer, s } */
  const deg = Math.PI / 180, SA = Math.PI * 2 / SECT;
  const at = (th, r) => [Math.cos(th) * r, Math.sin(th) * r], rf = f => R0 + f * (R1 - R0);   /* rf: 초원 띠 안쪽(0) → 바깥(1) */
  const clash = (p, q) => p === q || p === 'pillar' || q === 'pillar' || ((p === 'mid' || p === 'rock') && (q === 'mid' || q === 'rock'));   /* 기둥은 모든 층을 뚫음 · 발아래 바위는 가운데층 섬 몸통과 겹치면 안 됨 */
  const fits = (x, z, rr, layer) => { const r = Math.hypot(x, z); if (r - rr < R0 + 2 || r + rr > R1 - 6) return false;
    for (const q of place) { if (!clash(q.layer, layer)) continue; if (Math.hypot(q.x - x, q.z - z) < q.rr + rr + 1.2) return false; } return true; };
  const clearOfBase = (x, z, rr, th0) => { const th = Math.atan2(z, x), d = Math.atan2(Math.sin(th - th0), Math.cos(th - th0)) * Math.hypot(x, z); return !(Math.abs(d) < 15 + rr && Math.hypot(x, z) > rf(.4) - rr); };   /* 기지 출구 앞 길은 비워 둠 */
  const put = (k, x, z, layer, yaw, extra = {}) => { const K = KIT[k], s = (extra.s || 1) * SC, sy = layer === 'pillar' ? .9 : s;   /* 기둥만 높이는 거의 그대로 → 가늘고 높게 세 층을 뚫음 */
    const y = layer === 'up' ? UP - K.top * sy : layer === 'dn' ? DN - K.top * sy : layer === 'pillar' ? UP + 6 - K.hi * sy : layer === 'rock' ? extra.y : TOP - K.top * sy;
    place.push({ ...extra, k, x, z, y, yaw, layer, s, sy, rr: K.rad * s * .78, pillar: layer === 'pillar' }); };
  const BIG = ['Island_Plateau_Wide', 'Island_Twin_Falls', 'Island_Forest_Dense', 'Island_Bowl', 'Island_Ridge_Long', 'Island_Mushroom', 'Island_Keel', 'Island_Tilted_A', 'Island_Medium', 'Island_Flat_Low'];
  const MID = ['Island_Chunk_Round', 'Island_Small', 'Island_Crag', 'Island_Medium', 'Island_Flat_Low', 'Island_Chunk_Round'];
  const PIL = ['Island_Needle', 'Island_Spire_Crown', 'Island_Mesa_Tall', 'Island_Lean_Pillar', 'Island_Tower'];
  const ROCK = ['Rock_Floating_A', 'Rock_Mushroom_Small', 'Rock_Keel_Small'];
  const UPS = ['Island_Small', 'Island_Chunk_Round', 'Island_Medium', 'Island_Bowl', 'Island_Keel'];
  const DNS = ['Island_Flat_Low', 'Island_Ridge_Long', 'Island_Forest_Dense', 'Island_Mushroom', 'Island_Tilted_A', 'Island_Twin_Falls'];
  const TREASURE = [];
  /* 보물 던전 섬: 기지 사이 다섯 곳 · 위 → 아래 → 위 → 아래 → 위 */
  for (let j = 0; j < 5; j++) { const th = (j * 2 + .5) * SA, [x, z] = at(th, rf(.3)), up = j % 2 === 0, k = j % 2 === 0 ? 'Island_Treasure_Ruins' : 'Island_Treasure_Vault';
    put(k, x, z, up ? 'up' : 'dn', th + Math.PI / 2, { treasure: true }); TREASURE.push({ x, z, layer: up ? 'up' : 'dn', y: (up ? UP : DN), k }); }
  for (let i = 0; i < SECT; i++) { const th0 = i * SA, R = rnd(1000 + i * 77), sd = i % 2 ? 1 : -1;
    /* 몬스터 둥지 (가운데층) — 출구에서 비스듬히 보이는 자리 */
    { const th = th0 + sd * 10 * deg, [x, z] = at(th, rf(.53)); put(i % 2 ? 'Island_Lair_Arena' : 'Island_Lair_Nest', x, z, 'mid', th + R() * 6.28, { camp: true }); }
    /* 큰 섬: 둥지 반대쪽 */
    { const th = th0 - sd * 9 * deg, [x, z] = at(th, rf(.23)); put(BIG[i], x, z, 'mid', R() * 6.28); }
    { const th = th0 + sd * 3 * deg, [x, z] = at(th, rf(.2)); put(BIG[(i + 5) % BIG.length], x, z, 'mid', R() * 6.28); }   /* 큰 섬 하나 더 */
    const tryPut = (list, layer, n, rMin, rMax, ex = {}) => { let got = 0; for (let tries = 0; tries < n * 30 && got < n; tries++) {
      const k = list[Math.floor(R() * list.length)], th = th0 + (R() - .5) * SA * .96, r = rMin + R() * (rMax - rMin), [x, z] = at(th, r), K = KIT[k], s0 = ex.s ? ex.s() : 1, s = s0 * SC;
      if (layer !== 'up' && layer !== 'dn' && !clearOfBase(x, z, K.rad * s * .78, th0)) continue;
      if (!fits(x, z, K.rad * s * .78, layer)) continue; put(k, x, z, layer, R() * 6.28, { s: s0, y: ex.y ? ex.y() : 0 }); got++; } };
    tryPut(BIG, 'mid', 2, rf(.15), rf(.85));
    tryPut(MID, 'mid', 26, rf(.04), rf(.94));
    tryPut([PIL[i % PIL.length], PIL[(i + 2) % PIL.length]], 'pillar', 2, rf(.12), rf(.8));
    tryPut(ROCK, 'rock', 16, rf(.04), rf(.96), { y: () => -4 - R() * 9, s: () => 1 + R() * .8 });   /* 기체 발아래 떠 있는 바위 */
    tryPut(UPS, 'up', 5, rf(.06), rf(.9));
    tryPut(DNS, 'dn', 7, rf(.04), rf(.94)); }

  /* ── 층마다 다른 빛: 위층 = 밝게 + 점무늬로 옅게(기체·카메라 가까이선 더 옅게) · 아래층 = 어둡고 아래로 갈수록 구름빛으로 흐려짐 ── */
  const uCam = { value: new THREE.Vector3() };
  const tone = (src, layer) => { const m = src.clone(); m.vertexColors = true;
    m.onBeforeCompile = sh => { sh.uniforms.uCam = uCam;
      sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.)).xyz;');
      let f = 'uniform vec3 uCam; varying vec3 vWp;\n' + sh.fragmentShader;
      const BAY = 'float bay(vec2 p){ vec2 q=mod(floor(p),4.); int i=int(q.x)+int(q.y)*4; float m[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.); return (m[i]+.5)/16.; }\n';
      if (layer === 'pillar') f = f.replace('void main() {', BAY + 'void main() {\n { float near = smoothstep(10., 34., distance(vWp.xz, uCam.xz)), hi = smoothstep(2.5, 6., vWp.y); if (bay(gl_FragCoord.xy) > mix(1., mix(.25, 1., near), hi)) discard; }');   /* 기둥: 기체보다 높은 부분은 가까이 오면 점무늬로 비켜 줌 (화면을 가리지 않게) */
      if (layer === 'up') f = f.replace('void main() {', BAY + 'void main() {\n float near = smoothstep(14., 40., distance(vWp.xz, uCam.xz)); if (bay(gl_FragCoord.xy) > mix(.22, .55, near)) discard;')
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.,.99,.96), .22);');
      if (layer === 'dn') f = f.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n { float k = clamp((-vWp.y - 15.) / 50., 0., 1.); gl_FragColor.rgb = mix(gl_FragColor.rgb * .72, vec3(.5,.6,.78), .35 + k * .45); }');
      sh.fragmentShader = f; };
    m.customProgramCacheKey = () => 'meadow-' + layer; return m; };
  const MAT = {}; const matFor = (name, layer) => { const key = name + '|' + layer; return MAT[key] || (MAT[key] = tone(MATS[name], layer === 'rock' ? 'mid' : layer)); };

  /* ── 조각 · 층 · 재질마다 한 덩어리로 ── */
  const groups = new Map(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (const p of place) { const th = Math.atan2(p.z, p.x), sec = ((Math.round(th / SA) % SECT) + SECT) % SECT, L = p.layer === 'rock' ? 'mid' : p.layer;
    m4.compose(new THREE.Vector3(p.x, p.y, p.z), q.setFromAxisAngle(up, p.yaw), new THREE.Vector3(p.s, p.sy, p.s)); p.m = m4.clone();
    for (const pr of KIT[p.k].prims) { const key = sec + '|' + L + '|' + pr.mat; if (!groups.has(key)) groups.set(key, { list: [], mat: matFor(pr.mat, L) }); groups.get(key).list.push(pr.geo.clone().applyMatrix4(p.m)); } }
  const root = new THREE.Group(); root.name = 'meadow'; scene.add(root);
  for (const [, g] of groups) { const geo = mergeGeometries(g.list, false); g.list.forEach(x => x.dispose()); geo.computeBoundingSphere(); root.add(new THREE.Mesh(geo, g.mat)); }
  onProgress(.8);

  /* ── 막힘: 가운데층 섬 · 기둥의 바위·땅이 기체 높이(.1~1.6m)를 지나는 곳을 1m 칸으로 찍음 ── */
  const N = Math.ceil(R1 * 2 / CELL) + 2, grid = new Uint8Array(N * N), cellOf = v => Math.floor((v + R1 + 1) / CELL);
  const Y0 = .1, Y1 = 1.6, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), w = new THREE.Vector3();
  for (const p of place) { if (p.layer !== 'mid' && p.layer !== 'pillar') continue;
    if (p.y + KIT[p.k].hi * p.sy < Y0 || p.y + KIT[p.k].bot * p.sy > Y1) continue;
    for (const pr of KIT[p.k].prims) { if (pr.mat === 'Foliage' || pr.mat === 'Water') continue; const P = pr.geo.attributes.position, I = pr.geo.index, cnt = I ? I.count : P.count;
      for (let i = 0; i < cnt; i += 3) { a.fromBufferAttribute(P, I ? I.getX(i) : i).applyMatrix4(p.m); b.fromBufferAttribute(P, I ? I.getX(i + 1) : i + 1).applyMatrix4(p.m); c.fromBufferAttribute(P, I ? I.getX(i + 2) : i + 2).applyMatrix4(p.m);
        if (Math.max(a.y, b.y, c.y) < Y0 || Math.min(a.y, b.y, c.y) > Y1) continue;
        const e = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)), n = Math.max(1, Math.ceil(e / .45));
        for (let u = 0; u <= n; u++) for (let v = 0; v <= n - u; v++) { const s1 = u / n, s2 = v / n; w.set(0, 0, 0).addScaledVector(a, 1 - s1 - s2).addScaledVector(b, s1).addScaledVector(c, s2);
          if (w.y < Y0 || w.y > Y1) continue; const gx = cellOf(w.x), gz = cellOf(w.z); if (gx >= 0 && gz >= 0 && gx < N && gz < N) grid[gz * N + gx] = 1; } } } }
  onProgress(1);
  const blocked = (x, z) => { const gx = cellOf(x), gz = cellOf(z); return gx >= 0 && gz >= 0 && gx < N && gz < N && grid[gz * N + gx] === 1; };
  const update = (cam) => { uCam.value.copy(cam); };
  return { root, blocked, update, place, TREASURE, KIT };
}
