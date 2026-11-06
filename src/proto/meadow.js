/* 전체 맵 — 초원 고리 (Lv1, 사용자 2026-11-06 미니맵 기준)
   · 맵 반지름 240m(우리가 정한 크기 · 사용자 2026-11-06) 중 바깥 고리 187~240m가 초원(미니맵 비율 그대로). 섬 모양은 사용자가 준 3층 월드의 초원 섬 25종(kit_meadow.glb)을 그대로 씀
   · 층: 가운데층(기체가 나는 층, 섬 윗면이 기체 아래에 깔림) · 위층 +20m(밝게, 기체를 가리지 않게 점무늬로 옅게) · 아래층 −30m(어둡게, 구름 쪽으로 흐려짐)
   · 공평하게: 기지 10곳마다 같은 몫 — 기지 앞을 가운데로 한 조각(36°)마다 몬스터 둥지 1 · 큰 섬 4 · 작은·중간 섬 26 · 층을 뚫는 기둥 2 · 발아래 바위 16 · 위층 섬 5 · 아래층 섬 7 (가벼운 섬 모델 kit_meadow_lo: 겉모습은 그대로 · 면은 원래의 15%) (섬은 받은 모델의 3분의 1 크기)
   · 보물 던전 섬 5 = 기지 사이 다섯 곳 (위층 3 · 아래층 2, 번갈아) — 가운데층엔 보물 없음
   · 막힘: 가운데층 섬 중 기체 높이를 지나는 바위·땅만 막음(위에서 단면을 1m 칸으로 찍음). 풀·나무·물은 안 막음. 위·아래층 섬은 다른 층이라 안 막음
   · 그리기 (사용자 2026-11-06: 단순화 말고 진짜 최적화로): 원래 섬 모델 그대로 · 같은 섬은 한 번에(인스턴싱) · 섬 하나 단위로 화면 밖은 빼고 · 가까운 것부터 · 가벼운 칠 방식 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { deinterleaveGeometry } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeLand, makeChunk, paletteFrom } from './land.js?v=11062058';

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

export async function makeMeadow(scene, url, onProgress = () => {}, decorUrl = null, loUrl = null) {
  const LD = new GLTFLoader(), [gl, gd, glo] = await Promise.all([LD.loadAsync(url), decorUrl ? LD.loadAsync(decorUrl) : null, loUrl ? LD.loadAsync(loUrl) : null]); onProgress(.5);
  /* 섬 종류별: 재질별 조각 · 윗면 높이 · 바닥 높이 · 둘레 반지름 */
  const KIT = {};
  gl.scene.updateMatrixWorld(true);
  const DECO = { tree: [], bush: [], rock: [], tiny: [], hang: [] };
  if (glo) { glo.scene.updateMatrixWorld(true); for (const c of [...glo.scene.children]) { c.name = 'lo:' + c.name; gl.scene.add(c); } }   /* 아래층 섬: 30m 아래 · 구름빛으로 흐려지는 거리라 면을 줄인 모양을 씀 (가운데층은 원래 모양) */
  if (gd) { gd.scene.updateMatrixWorld(true); for (const c of [...gd.scene.children]) { const kd = c.name.split('_')[0]; if (DECO[kd]) DECO[kd].push(c.name); gl.scene.add(c); } gl.scene.updateMatrixWorld(true); }
  for (const node of gl.scene.children) { const prims = []; const bb = new THREE.Box3();
    node.traverse(o => { if (!o.isMesh) return; const g = o.geometry.clone(); deinterleaveGeometry(g); if (!g.index) { const ix = new Uint32Array(g.attributes.position.count); for (let i = 0; i < ix.length; i++) ix[i] = i; g.setIndex(new THREE.BufferAttribute(ix, 1)); } if (g.attributes.uv) g.deleteAttribute('uv'); g.applyMatrix4(o.matrixWorld); if (!g.attributes.color) return; prims.push({ geo: g, mat: o.material.name || 'Terrain', src: o.material }); g.computeBoundingBox(); bb.union(g.boundingBox); });
    const top = DECO[node.name.split('_')[0]] ? 0 : node.name.startsWith('lo:') ? null : topOf(prims), rad = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2;
    KIT[node.name] = { prims, top, bot: bb.min.y, hi: bb.max.y, rad }; }
  for (const k in KIT) if (k.startsWith('lo:') && KIT[k.slice(3)]) { const F = KIT[k.slice(3)]; KIT[k].top = F.top; }   /* 윗면 높이는 원래 모양 기준 */
  const MATS = {}; for (const k in KIT) for (const p of KIT[k].prims) MATS[p.mat] = p.src;
  const PAL = paletteFrom(KIT['Island_Plateau_Wide'].prims.concat(KIT['Island_Forest_Dense'].prims));

  /* ── 놓을 자리 정하기 (조각마다 같은 몫 · 운은 조각마다 다르게) ── */
  const { R0, R1, UP, DN, TOP, SC } = MEADOW, place = [];   /* { k, x, z, y, yaw, layer, s } */
  const deg = Math.PI / 180, SA = Math.PI * 2 / SECT;
  const at = (th, r) => [Math.cos(th) * r, Math.sin(th) * r], rf = f => R0 + f * (R1 - R0);   /* rf: 초원 띠 안쪽(0) → 바깥(1) */
  const clash = (p, q) => p !== 'deco' && q !== 'deco' && p !== 'gap' && q !== 'gap' && (p === q || p === 'pillar' || q === 'pillar' || ((p === 'mid' || p === 'rock') && (q === 'mid' || q === 'rock')));   /* 꾸밈은 땅 위에만 얹으므로 빼고 · 기둥은 모든 층을 뚫음 · 발아래 바위는 가운데층 섬 몸통과 겹치면 안 됨 */
  const fits = (x, z, rr, layer) => { const r = Math.hypot(x, z); if (r - rr < R0 + 2 || r + rr > R1 - 6) return false;
    for (const q of place) { if (!clash(q.layer, layer)) continue; if (Math.hypot(q.x - x, q.z - z) < q.rr + rr + 1.2) return false; } return true; };
  const clearOfBase = (x, z, rr, th0) => { const th = Math.atan2(z, x), d = Math.atan2(Math.sin(th - th0), Math.cos(th - th0)) * Math.hypot(x, z); return !(Math.abs(d) < 15 + rr && Math.hypot(x, z) > rf(.4) - rr); };   /* 기지 출구 앞 길은 비워 둠 */
  const put = (k, x, z, layer, yaw, extra = {}) => { const K = KIT[k], s = extra.gs || (extra.abs ? 1 : (extra.s || 1) * SC), sy = layer === 'pillar' ? .9 : s;   /* 기둥만 높이는 거의 그대로 → 가늘고 높게 세 층을 뚫음 */
    const y = layer === 'up' ? UP - K.top * sy : layer === 'dn' ? DN - K.top * sy : layer === 'pillar' ? UP + 6 - K.hi * sy : layer === 'rock' || layer === 'deco' || layer === 'gap' ? extra.y : TOP - K.top * sy;
    place.push({ ...extra, k, x, z, y, yaw, layer, s, sy, rr: extra.land ? K.rad : K.rad * s * .78, pillar: layer === 'pillar' }); };
  /* ── 넓은 땅: 새 땅 판 + 받은 섬에서 떼어 낸 나무·덤불·바위·풀꽃·뿌리 ── */
  let landN = 0; const LANDS = [];
  const addLand = (x, z, radius, seed, opt = {}) => { const L = makeLand(seed, radius, PAL, opt), k = 'land_' + (landN++), R = rnd(seed * 31 + 7);
    const bb = new THREE.Box3().setFromBufferAttribute(L.geo.attributes.position);
    KIT[k] = { prims: [{ geo: L.geo, mat: 'Terrain', src: MATS.Terrain }], top: 0, bot: bb.min.y, hi: bb.max.y, rad: radius * 1.12 };
    const LY = opt.layer || 'mid', BY = LY === 'dn' ? DN : TOP, rl = LY === 'dn' ? 'dn' : undefined, dens = opt.dens || 1;
    const yaw = R() * 6.28; put(k, x, z, LY, yaw, { abs: true, land: true }); LANDS.push({ k, x, z, radius, layer: LY });
    /* 윗면 높이 찾기 (꾸밈을 땅에 딱 붙이려고) */
    const P = L.geo.attributes.position, topTris = []; for (let i = 0; i < P.count; i += 3) { const ay = P.getY(i), by = P.getY(i + 1), cy = P.getY(i + 2); if (Math.min(ay, by, cy) > -.6) topTris.push(i); }
    const hAt = (lx, lz) => { for (const i of topTris) { const x0 = P.getX(i), z0 = P.getZ(i), x1 = P.getX(i + 1), z1 = P.getZ(i + 1), x2 = P.getX(i + 2), z2 = P.getZ(i + 2);
      const d = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2); if (Math.abs(d) < 1e-9) continue; const u = ((z1 - z2) * (lx - x2) + (x2 - x1) * (lz - z2)) / d, v = ((z2 - z0) * (lx - x2) + (x0 - x2) * (lz - z2)) / d, w = 1 - u - v;
      if (u >= -1e-4 && v >= -1e-4 && w >= -1e-4) return u * P.getY(i) + v * P.getY(i + 1) + w * P.getY(i + 2); } return null; };
    const cy = Math.cos(yaw), sy = Math.sin(yaw), toW = (lx, lz) => [x + lx * cy + lz * sy, z - lx * sy + lz * cy];   /* 땅을 돌린 만큼 */
    const area = Math.PI * radius * radius, grove = (lx, lz) => .5 + .5 * Math.sin(lx * .35 + seed) * Math.cos(lz * .3 - seed * .7);
    const deco = (kind, n, sc, edgeIn = 1.4) => { for (let t = 0, got = 0; t < n * 8 && got < n; t++) { const a = R() * 6.28, rr = Math.sqrt(R()) * (L.rad(a) - edgeIn), lx = Math.cos(a) * rr, lz = Math.sin(a) * rr;
        if (opt.clear && Math.hypot(lx, lz) < opt.clear + (kind === 'tiny' ? 0 : 1.5)) continue;
        if ((kind === 'tree' || kind === 'bush') && R() > grove(lx, lz) + .25) continue;   /* 나무는 숲처럼 몰려 자람 */
        const h = hAt(lx, lz); if (h === null) continue; const [wx, wz] = toW(lx, lz), list = DECO[kind]; if (!list.length) return;
        if (opt.lane != null && kind !== 'tiny' && Math.abs(-Math.sin(opt.lane) * wx + Math.cos(opt.lane) * wz) < 5) continue;   /* 기지 출구 앞 길은 비워 둠 (풀꽃만) */
        put(list[Math.floor(R() * list.length)], wx, wz, 'deco', R() * 6.28, { s: sc * (.85 + R() * .4), y: BY + h - .04, deco: kind, rl }); got++; } };
    deco('tree', Math.round(area / 30 * dens), 1); deco('bush', Math.round(area / 24 * dens), 1); deco('rock', Math.round(area / 55 * dens), 1); deco('tiny', Math.round(area / 18 * dens), 1, .6);
    /* 테두리에 늘어진 뿌리·덩굴: 둘레를 따라 듬성듬성 */
    if (DECO.hang.length) for (let i = 0; i < L.lip.length; i += 2) { if (R() < .35) continue; const [lx, ly, lz] = L.lip[i], k2 = .97, [wx, wz] = toW(lx * k2, lz * k2);
      put(DECO.hang[Math.floor(R() * DECO.hang.length)], wx, wz, 'deco', R() * 6.28, { s: .9 + R() * .3, y: BY + ly + .25, deco: 'hang', rl }); }
    return k; };
  const BIG = ['Island_Plateau_Wide', 'Island_Twin_Falls', 'Island_Forest_Dense', 'Island_Bowl', 'Island_Ridge_Long', 'Island_Mushroom', 'Island_Keel', 'Island_Tilted_A', 'Island_Medium', 'Island_Flat_Low'];
  const MID = ['Island_Chunk_Round', 'Island_Small', 'Island_Crag', 'Island_Medium', 'Island_Flat_Low', 'Island_Chunk_Round'];
  const PIL = ['Island_Needle', 'Island_Spire_Crown', 'Island_Mesa_Tall', 'Island_Lean_Pillar', 'Island_Tower'];
  const ROCK = ['Rock_Floating_A', 'Rock_Mushroom_Small', 'Rock_Keel_Small'];
  const UPS = ['Island_Small', 'Island_Chunk_Round', 'Island_Medium', 'Island_Bowl', 'Island_Keel'];
  const DNS = ['Island_Flat_Low', 'Island_Ridge_Long', 'Island_Forest_Dense', 'Island_Mushroom', 'Island_Tilted_A', 'Island_Twin_Falls', 'Island_Plateau_Wide', 'Island_Bowl', 'Island_Medium', 'Island_Keel', 'Island_Chunk_Round', 'Island_Small']
    .map(n => KIT['lo:' + n] ? 'lo:' + n : n);
  /* 층 사이 원근 조각: 갈 수 없는 공간 → 단순한 각진 바위 덩어리 여러 모양 (사용자 2026-11-06: 단순화해서 보여 줘도 됨) */
  const CHUNK = []; for (let i = 0; i < 8; i++) { const c = makeChunk(77 + i * 13, PAL, i % 3 === 0); const k = 'chunk_' + i; c.computeBoundingBox();
    KIT[k] = { prims: [{ geo: c, mat: 'Terrain', src: MATS.Terrain }], top: 0, bot: c.boundingBox.min.y, hi: c.boundingBox.max.y, rad: 1 }; CHUNK.push(k); }
  const TREASURE = [];
  /* 보물 던전 섬: 기지 사이 다섯 곳 · 위 → 아래 → 위 → 아래 → 위 */
  for (let j = 0; j < 5; j++) { const th = (j * 2 + .5) * SA, [x, z] = at(th, rf(.3)), up = j % 2 === 0, k = j % 2 === 0 ? 'Island_Treasure_Ruins' : 'Island_Treasure_Vault';
    put(k, x, z, up ? 'up' : 'dn', th + Math.PI / 2, { treasure: true }); TREASURE.push({ x, z, layer: up ? 'up' : 'dn', y: (up ? UP : DN), k }); }
  for (let i = 0; i < SECT; i++) { const th0 = i * SA, R = rnd(1000 + i * 77), sd = i % 2 ? 1 : -1;
    /* 태어나는 곳 출구 앞: 기체 아래로 깔리는 넓은 풀밭 · 길 양옆만 꾸밈 (사용자 2026-11-06: 앞이 너무 썰렁함) */
    { const [x, z] = at(th0, R1 - 20); addLand(x, z, 12.5, 300 + i * 11, { lane: th0 }); }
    /* 몬스터 둥지 (가운데층) — 출구에서 비스듬히 보이는 자리 */
    /* 몬스터 둥지: 지름 32m쯤 넓은 땅 한가운데 · 가운데는 싸울 자리로 평평하게 비움 (사용자 2026-11-06: 몬스터 있는 곳은 대지가 넓어야 함) */
    { const th = th0 + sd * 10 * deg, [x, z] = at(th, rf(.5)); addLand(x, z, 15 + R() * 2, 500 + i * 13, { clear: 6.5 });
      put(i % 2 ? 'Island_Lair_Arena' : 'Island_Lair_Nest', x, z, 'mid', th + R() * 6.28, { camp: true }); }
    /* 큰 섬: 둥지 반대쪽 */
    { const th = th0 - sd * 9 * deg, [x, z] = at(th, rf(.32)); addLand(x, z, 10 + R() * 3, 900 + i * 17); }   /* 넓은 풀밭 땅 */
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
    tryPut(DNS, 'dn', 22, rf(.0), rf(.98));   /* 아래층을 꽉 차 보이게 (실제로 내려가는 곳은 보물 던전 몇 곳뿐) */
    for (let n = 0, t = 0; n < 2 && t < 60; t++) { const th = th0 + (R() - .5) * SA * .9, rr = 9 + R() * 5, r = rf(.1) + R() * (rf(.9) - rf(.1)), [x, z] = at(th, r);
      if (!fits(x, z, rr * 1.12, 'dn')) continue; addLand(x, z, rr, 2000 + i * 29 + t, { layer: 'dn', dens: .55 }); n++; }   /* 아래층 넓은 땅 */
    for (let n = 0; n < 45; n++) { const th = th0 + (R() - .5) * SA, r = R0 - 6 + R() * (R1 - R0 + 2), [x, z] = at(th, r), sc = .7 + Math.pow(R(), 2.4) * 3.3, y = -6 - R() * 20;
      put(CHUNK[Math.floor(R() * CHUNK.length)], x, z, 'gap', R() * 6.28, { abs: true, s: 1, y, gs: sc }); } }

  /* ── 칠하는 방식: 이 그림체는 면마다 평평한 색 → 빛 반사를 점마다 정밀 계산하는 무거운 방식 대신,
        꼭짓점에서 해·하늘·땅빛만 한 번 계산하고 화면 점마다는 그 색을 그대로 씀 (모양·색은 같고 계산은 훨씬 적음)
        층마다: 위층 = 밝게 + 점무늬로 옅게(기체 가까이선 더 옅게) · 아래층 = 어둡고 아래로 갈수록 구름빛 · 기둥 = 기체보다 높은 부분이 가까이 오면 점무늬로 비켜 줌 ── */
  const uCam = { value: new THREE.Vector3() };
  const LIT = { uSun: { value: new THREE.Vector3(-9, 14, -8).normalize() }, uSunC: { value: new THREE.Color(0xfff0dc).multiplyScalar(2.8 / Math.PI) },
    uSky: { value: new THREE.Color(0xb7c8e8).multiplyScalar(.85 / Math.PI + .38) }, uGnd: { value: new THREE.Color(0x3a3020).multiplyScalar(.85 / Math.PI + .38) } };
  const BAY = 'float bay(vec2 p){ vec2 q=mod(floor(p),4.); int i=int(q.x)+int(q.y)*4; float m[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.); return (m[i]+.5)/16.; }\n';
  const tone = (src, layer) => {
    const em = src.emissive ? src.emissive.clone() : new THREE.Color(0);
    const m = new THREE.ShaderMaterial({ vertexColors: true, transparent: src.transparent, depthWrite: src.depthWrite, side: src.side,
      uniforms: { ...LIT, uCam, uEm: { value: em } },
      vertexShader: `uniform vec3 uSun, uSunC, uSky, uGnd, uEm; varying vec3 vC; varying float vA; varying vec3 vWp;
        void main(){ mat4 M = modelMatrix * instanceMatrix; vec4 w = M * vec4(position, 1.); vWp = w.xyz;
          vec3 n = normalize(mat3(M) * normal);
          #ifdef USE_COLOR_ALPHA
            vec3 c = color.rgb; vA = color.a;
          #else
            vec3 c = color; vA = 1.;
          #endif
          vC = c * (uSunC * max(dot(n, uSun), 0.) + mix(uGnd, uSky, n.y * .5 + .5)) + uEm;
          gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 uCam; varying vec3 vC; varying float vA; varying vec3 vWp;
        ${layer === 'up' || layer === 'pillar' ? BAY : ''}
        void main(){ vec3 col = vC;
          ${layer === 'pillar' ? '{ float near = smoothstep(10., 34., distance(vWp.xz, uCam.xz)), hi = smoothstep(2.5, 6., vWp.y); if (bay(gl_FragCoord.xy) > mix(1., mix(.25, 1., near), hi)) discard; }' : ''}
          ${layer === 'up' ? '{ float near = smoothstep(14., 40., distance(vWp.xz, uCam.xz)); if (bay(gl_FragCoord.xy) > mix(.22, .55, near)) discard; col = mix(col, vec3(1., .99, .96), .22); }' : ''}
          ${layer === 'dn' ? '{ float k = clamp((-vWp.y - 15.) / 50., 0., 1.); col = mix(col * .72, vec3(.5, .6, .78), .35 + k * .45); }' : ''}
          ${layer === 'gap' ? '{ float k = clamp((-vWp.y - 3.) / 26., 0., 1.); col = mix(col * (1. - k * .25), vec3(.55, .64, .8), .12 + k * .5); }' : ''}
          gl_FragColor = linearToOutputTexel(vec4(col, vA)); }` });
    return m; };
  const MAT = {}; const matFor = (name, layer) => { const key = name + '|' + layer; return MAT[key] || (MAT[key] = tone(MATS[name], layer)); };

  /* ── 같은 섬은 한 번에 그리기: 섬 종류 × 층마다 모양은 한 벌만 두고 '여기·여기·여기'(자리 목록)만 넘김 ──
        그리고 매 장면: 섬 하나하나를 화면 안에 드는지 보고 든 것만 · 가까운 것부터 차례로 넘김(뒤에 가려지는 부분은 칠하지 않게) */
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sph = new THREE.Sphere(), bs = new THREE.Box3();
  for (const k in KIT) { const K = KIT[k]; bs.makeEmpty(); for (const p of K.prims) { p.geo.computeBoundingBox(); bs.union(p.geo.boundingBox); } K.sph = bs.getBoundingSphere(new THREE.Sphere()); }
  const root = new THREE.Group(); root.name = 'meadow'; scene.add(root);
  const SETS = new Map();
  for (const p of place) { const L = p.rl || (p.layer === 'rock' || p.layer === 'deco' ? 'mid' : p.layer);
    m4.compose(new THREE.Vector3(p.x, p.y, p.z), q.setFromAxisAngle(up, p.yaw), new THREE.Vector3(p.s, p.sy, p.s)); p.m = m4.clone();
    const c = KIT[p.k].sph.center.clone().applyMatrix4(p.m); p.c = c; p.r = KIT[p.k].sph.radius * Math.max(p.s, p.sy);
    const key = p.k + '|' + L; if (!SETS.has(key)) SETS.set(key, { k: p.k, L, list: [] }); SETS.get(key).list.push(p); }
  let tris = 0, calls = 0, shown = 0;
  for (const S of SETS.values()) { const n = S.list.length; S.attr = new THREE.InstancedBufferAttribute(new Float32Array(n * 16), 16); S.attr.setUsage(THREE.DynamicDrawUsage); S.meshes = [];
    for (const pr of KIT[S.k].prims) { const im = new THREE.InstancedMesh(pr.geo, matFor(pr.mat, S.L), n); im.instanceMatrix = S.attr; im.frustumCulled = false; im.count = 0;
      root.add(im); S.meshes.push(im); }
    S.tri = KIT[S.k].prims.reduce((a, pr) => a + (pr.geo.index ? pr.geo.index.count : pr.geo.attributes.position.count) / 3, 0); }
  const fr = new THREE.Frustum(), pv = new THREE.Matrix4(), tmp = [];
  const cull = camera => { pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); fr.setFromProjectionMatrix(pv); const cp = camera.position; tris = 0; calls = 0; shown = 0;
    for (const S of SETS.values()) { tmp.length = 0;
      for (const p of S.list) { sph.center.copy(p.c); sph.radius = p.r; if (fr.intersectsSphere(sph)) { p.d = p.c.distanceToSquared(cp); tmp.push(p); } }
      tmp.sort((a, b) => a.d - b.d); const A = S.attr.array; for (let i = 0; i < tmp.length; i++) tmp[i].m.toArray(A, i * 16);
      if (tmp.length) { S.attr.clearUpdateRanges(); S.attr.addUpdateRange(0, tmp.length * 16); S.attr.needsUpdate = true; }
      for (const im of S.meshes) { im.count = tmp.length; im.visible = tmp.length > 0; } if (tmp.length) { calls += S.meshes.length; shown += tmp.length; tris += S.tri * tmp.length; }
      S.near = tmp.length ? tmp[0].d : 1e12; }
    /* 섬 종류끼리도 가까운 것부터 */
    const order = [...SETS.values()].sort((a, b) => a.near - b.near); order.forEach((S, i) => { for (const im of S.meshes) im.renderOrder = im.material.transparent ? 1000 + i : 1 + i * .001; });
  };
  onProgress(.8);

  /* ── 막힘: 가운데층 섬 · 기둥의 바위·땅이 기체 높이(.1~1.6m)를 지나는 곳을 1m 칸으로 찍음 ── */
  const N = Math.ceil(R1 * 2 / CELL) + 2, grid = new Uint8Array(N * N), cellOf = v => Math.floor((v + R1 + 1) / CELL);
  const Y0 = .1, Y1 = 1.6, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), w = new THREE.Vector3();
  for (const p of place) { if (p.layer !== 'mid' && p.layer !== 'pillar' && !(p.layer === 'deco' && p.deco === 'rock')) continue;   /* 나무·덤불·풀꽃·뿌리는 안 막음 */
    if (p.y + KIT[p.k].hi * p.sy < Y0 || p.y + KIT[p.k].bot * p.sy > Y1) continue;
    for (const pr of KIT[p.k].prims) { if (pr.mat === 'Foliage' || pr.mat === 'Water') continue; const P = pr.geo.attributes.position, I = pr.geo.index, cnt = I ? I.count : P.count;
      for (let i = 0; i < cnt; i += 3) { a.fromBufferAttribute(P, I ? I.getX(i) : i).applyMatrix4(p.m); b.fromBufferAttribute(P, I ? I.getX(i + 1) : i + 1).applyMatrix4(p.m); c.fromBufferAttribute(P, I ? I.getX(i + 2) : i + 2).applyMatrix4(p.m);
        if (Math.max(a.y, b.y, c.y) < Y0 || Math.min(a.y, b.y, c.y) > Y1) continue;
        const e = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)), n = Math.max(1, Math.ceil(e / .45));
        for (let u = 0; u <= n; u++) for (let v = 0; v <= n - u; v++) { const s1 = u / n, s2 = v / n; w.set(0, 0, 0).addScaledVector(a, 1 - s1 - s2).addScaledVector(b, s1).addScaledVector(c, s2);
          if (w.y < Y0 || w.y > Y1) continue; const gx = cellOf(w.x), gz = cellOf(w.z); if (gx >= 0 && gz >= 0 && gx < N && gz < N) grid[gz * N + gx] = 1; } } } }
  onProgress(1);
  const blocked = (x, z) => { const gx = cellOf(x), gz = cellOf(z); return gx >= 0 && gz >= 0 && gx < N && gz < N && grid[gz * N + gx] === 1; };
  const update = (ship, camera) => { uCam.value.copy(ship); if (camera) cull(camera); };
  const info = () => ({ shown, calls, tris: Math.round(tris), total: place.length });
  return { root, blocked, update, info, place, TREASURE, KIT };
}
