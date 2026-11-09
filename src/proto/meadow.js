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
import { makeLand, makeChunk, makePillar, makeWall, paletteFrom } from './land.js?v=11092314';
import { CLOUD_NOISE } from './clouds.js?v=11092314';
import { spiralPath } from './path.js?v=11092314';

/* 아래로 늘어진 섬 몸통 줄이기 (사용자 2026-11-07: 위층 섬 밑을 지나갈 때 몸통이 카메라와 기체 사이를 꽉 막음) — 윗면은 그대로, y0 아래만 깊이 maxD로 눌러 줌 · 빛 받는 방향도 같이 고침 */
export function squashBelow(geo, y0, maxD) { const P = geo.attributes.position, N = geo.attributes.normal; let lo = 1e9; for (let i = 0; i < P.count; i++) lo = Math.min(lo, P.getY(i));
  const k = Math.min(1, maxD / Math.max(1e-3, y0 - lo)); if (k >= 1) return geo;
  for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y >= y0) continue; P.setY(i, y0 + (y - y0) * k); if (N) { const nx = N.getX(i), ny = N.getY(i) / k, nz = N.getZ(i), l = Math.hypot(nx, ny, nz) || 1; N.setXYZ(i, nx / l, ny / l, nz / l); } }
  P.needsUpdate = true; if (N) N.needsUpdate = true; geo.computeBoundingBox(); geo.computeBoundingSphere(); return geo; }
export const MEADOW = { R0: 187, R1: 240, UP: 36, DN: -30, TOP: -1.2, SC: 1 / 2, GATE_Y: -3 };   /* TOP: 가운데층 땅 — 기체가 땅에서 살짝(1.9m) 뜨게 (사용자 2026-11-07: 높이를 낮춤 · 식물은 그냥 지나침) · GATE_Y: 문 땅은 고리가 땅에 묻히지 않게 조금 낮게 */   /* TOP: 가운데층 땅 높이 — 기체(.7)보다 3.7m 아래 → 나무 꼭대기 위로 날게 (사용자 2026-11-06: 나무에 걸림) */   /* SC: 받은 섬 모델 크기의 2분의 1 (사용자 2026-11-06: 원래는 너무 크고 3분의 1은 너무 작음) */   /* 가운데층 섬 윗면 = 기체(높이 .7)보다 1.7m 아래 */
const fillHoles = (grid, N, x0, z0, x1, z1) => {   /* 속 빈 구조물(겉면만 칸에 찍힘)의 안쪽을 채움: 상자 테두리에서 닿지 않는 빈 칸 = 안쪽 */
  x0 = Math.max(0, x0); z0 = Math.max(0, z0); x1 = Math.min(N - 1, x1); z1 = Math.min(N - 1, z1); const W = x1 - x0 + 1, Hh = z1 - z0 + 1; if (W < 3 || Hh < 3) return;
  const seen = new Uint8Array(W * Hh), st = [], at = (x, z) => grid[(z + z0) * N + x + x0];
  const wall = (x, z) => at(x, z) || (x > 0 && at(x - 1, z)) || (x < W - 1 && at(x + 1, z)) || (z > 0 && at(x, z - 1)) || (z < Hh - 1 && at(x, z + 1));   /* 한 칸 틈은 막힌 걸로 보고 흘려 봄 → 겉면 사이 작은 틈으로 새지 않음 */
  const push = (x, z) => { const k = z * W + x; if (seen[k] || wall(x, z)) return; seen[k] = 1; st.push(k); };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, Hh - 1); } for (let z = 0; z < Hh; z++) { push(0, z); push(W - 1, z); }
  while (st.length) { const k = st.pop(), x = k % W, z = (k - x) / W; if (x > 0) push(x - 1, z); if (x < W - 1) push(x + 1, z); if (z > 0) push(x, z - 1); if (z < Hh - 1) push(x, z + 1); }
  const S = (x, z) => x >= 0 && z >= 0 && x < W && z < Hh && seen[z * W + x];
  const fill = []; for (let z = 0; z < Hh; z++) for (let x = 0; x < W; x++) if (!seen[z * W + x] && !at(x, z) && !S(x - 1, z) && !S(x + 1, z) && !S(x, z - 1) && !S(x, z + 1)) fill.push((z + z0) * N + x + x0);   /* 바깥과 맞닿은 칸은 그대로 → 둘레가 부풀지 않음 */
  for (const k of fill) grid[k] = 1; };
const SECT = 10, CELL = .25;   /* 막힘 칸 25cm (사용자 2026-11-07: 선이 지형 테두리에 붙게) */

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

export async function makeMeadow(scene, url, onProgress = () => {}, decorUrl = null, loUrl = null, opt = {}) {
  const AVOID = opt.avoid || [];   /* 정글 배치 계획 — 경계를 넘나드는 섬이 정글 지형과 겹치지 않게 */
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
  const placeNearY = (x, z, rr, y) => { for (const q of place) if (q.layer === 'upgap' && Math.abs(q.y - y) < 3.5 && Math.hypot(q.x - x, q.z - z) < q.rr + rr + 1.5) return true; return false; };
  const clash = (p, q) => p !== 'deco' && q !== 'deco' && p !== 'gap' && q !== 'gap' && !(p === 'upgap' && q === 'upgap') && (p === q || (p === 'up' && q === 'upgap') || (p === 'upgap' && q === 'up') || p === 'pillar' || q === 'pillar' || ((p === 'mid' || p === 'rock') && (q === 'mid' || q === 'rock')));   /* 꾸밈은 땅 위에만 얹으므로 빼고 · 기둥은 모든 층을 뚫음 · 발아래 바위는 가운데층 섬 몸통과 겹치면 안 됨 */
  /* 빛의 길이 지나는 하늘은 비워 둠 (사용자 2026-11-07: 빛의 길이 지형을 뚫고 가면 안 됨) — 문에서 던전까지 길을 따라 원을 이어 놓고, 어느 층이든 그 안엔 아무것도 안 놓음 */
  const CORR = [...(opt.corridors || [])], inCorr = (x, z, rr) => { for (const c of CORR) if ((x - c[0]) ** 2 + (z - c[1]) ** 2 < (c[2] + rr) ** 2) return true; return false; };
  const fits = (x, z, rr, layer) => { const r = Math.hypot(x, z); if (r - rr < R0 + 2 || r + rr > R1 - 6) return false; if (inCorr(x, z, rr)) return false;
    for (const q of place) { if (!clash(q.layer, layer)) continue; if (Math.hypot(q.x - x, q.z - z) < q.rr + rr + 1.2) return false; } return true; };
  const clearOfBase = (x, z, rr, th0) => { const th = Math.atan2(z, x), d = Math.atan2(Math.sin(th - th0), Math.cos(th - th0)) * Math.hypot(x, z); return !(Math.abs(d) < 15 + rr && Math.hypot(x, z) > rf(.4) - rr); };   /* 기지 출구 앞 길은 비워 둠 */
  const put = (k, x, z, layer, yaw, extra = {}) => { const K = KIT[k], s = extra.gs || (extra.abs ? 1 : layer === 'pillar' && extra.ps ? extra.ps : (extra.s || 1) * SC), sy = layer === 'pillar' ? (extra.psy || .9) : s;   /* 기둥만 높이는 거의 그대로 → 가늘고 높게 세 층을 뚫음 */
    const y = layer === 'up' ? UP - K.top * sy : layer === 'dn' ? DN - K.top * sy : layer === 'pillar' ? (extra.ptop != null ? extra.ptop : UP + 6) - K.hi * sy : layer === 'rock' || layer === 'deco' || layer === 'gap' || layer === 'upgap' ? extra.y : TOP - K.top * sy;
    place.push({ ...extra, k, x, z, y: extra.yset != null ? extra.yset : y, yaw, layer, s, sy, rr: extra.land ? K.rad : K.rad * s * .78, pillar: layer === 'pillar' }); };
  /* ── 넓은 땅: 새 땅 판 + 받은 섬에서 떼어 낸 나무·덤불·바위·풀꽃·뿌리 ── */
  let landN = 0; const LANDS = [], GROVES = [];
  const RUIN = [], WALL = [];
  for (let i = 0; i < 6; i++) { const g = makePillar(700 + i * 17, PAL, 1.9 + (i % 3) * .45); g.computeBoundingBox(); const k = 'ruinP_' + i; KIT[k] = { prims: [{ geo: g, mat: 'Terrain', src: MATS.Terrain }], top: 0, bot: g.boundingBox.min.y, hi: g.boundingBox.max.y, rad: 1 }; RUIN.push(k); }
  for (let i = 0; i < 4; i++) { const g = makeWall(800 + i * 23, PAL, 4.5 + i); g.computeBoundingBox(); const k = 'ruinW_' + i; KIT[k] = { prims: [{ geo: g, mat: 'Terrain', src: MATS.Terrain }], top: 0, bot: g.boundingBox.min.y, hi: g.boundingBox.max.y, rad: 3 }; WALL.push(k); }
  const addLand = (x, z, radius, seed, opt = {}) => { const L = makeLand(seed, radius, PAL, opt), k = 'land_' + (landN++), R = rnd(seed * 31 + 7); if (opt.squash) { if (!L.geo.attributes.normal) L.geo.computeVertexNormals(); squashBelow(L.geo, -1.5, opt.squash); }
    const bb = new THREE.Box3().setFromBufferAttribute(L.geo.attributes.position);
    KIT[k] = { prims: [{ geo: L.geo, mat: 'Terrain', src: MATS.Terrain }], top: 0, bot: bb.min.y, hi: bb.max.y, rad: radius * 1.12 };
    const LY = opt.layer || 'mid', BY = LY === 'dn' ? DN : opt.by != null ? opt.by : TOP, rl = LY === 'dn' ? 'dn' : LY === 'up' ? 'up' : undefined, dens = opt.dens || 1;
    const yaw = R() * 6.28; put(k, x, z, LY, yaw, { abs: true, land: true, ...(opt.by != null ? { yset: opt.by } : {}) }); LANDS.push({ k, x, z, radius, layer: LY });
    /* 윗면 높이 찾기 (꾸밈을 땅에 딱 붙이려고) */
    const P = L.geo.attributes.position, topTris = []; for (let i = 0; i < P.count; i += 3) { const ay = P.getY(i), by = P.getY(i + 1), cy = P.getY(i + 2); if (Math.min(ay, by, cy) > -1.3) topTris.push(i); }
    const hAt = (lx, lz) => { for (const i of topTris) { const x0 = P.getX(i), z0 = P.getZ(i), x1 = P.getX(i + 1), z1 = P.getZ(i + 1), x2 = P.getX(i + 2), z2 = P.getZ(i + 2);
      const d = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2); if (Math.abs(d) < 1e-9) continue; const u = ((z1 - z2) * (lx - x2) + (x2 - x1) * (lz - z2)) / d, v = ((z2 - z0) * (lx - x2) + (x0 - x2) * (lz - z2)) / d, w = 1 - u - v;
      if (u >= -1e-4 && v >= -1e-4 && w >= -1e-4) return u * P.getY(i) + v * P.getY(i + 1) + w * P.getY(i + 2); } return null; };
    const cy = Math.cos(yaw), sy = Math.sin(yaw), toW = (lx, lz) => [x + lx * cy + lz * sy, z - lx * sy + lz * cy];   /* 땅을 돌린 만큼 */
    { const E = LANDS[LANDS.length - 1]; E.yAt = (wx, wz) => { const dx = wx - x, dz = wz - z, lx = dx * cy - dz * sy, lz = dx * sy + dz * cy, h = hAt(lx, lz); return h === null ? null : BY + h; };
      E.rim = L.lip.map(([lx, ly, lz]) => { const [wx, wz] = toW(lx, lz); return [wx, BY + ly, wz]; }); E.camp = !!opt.clear; E.lane = opt.lane; }
    const area = Math.PI * radius * radius, grove = (lx, lz) => .5 + .5 * Math.sin(lx * .35 + seed) * Math.cos(lz * .3 - seed * .7);
    const deco = (kind, n, sc, edgeIn = 1.4) => { for (let t = 0, got = 0; t < n * 8 && got < n; t++) { const a = R() * 6.28, rr = Math.sqrt(R()) * (L.rad(a) - edgeIn), lx = Math.cos(a) * rr, lz = Math.sin(a) * rr;
        if (opt.clear && Math.hypot(lx, lz) < opt.clear + (kind === 'tiny' ? 0 : 1.5)) continue;
        if (kind === 'tree' && GROVES.some(g => Math.hypot(g.x - toW(lx, lz)[0], g.z - toW(lx, lz)[1]) < g.r + 3)) continue;   /* 외톨이 나무는 숲 덤불과 떨어뜨림 */
        const h = hAt(lx, lz); if (h === null) continue; const [wx, wz] = toW(lx, lz), list = DECO[kind]; if (!list.length) return;
        if (opt.lane != null && kind !== 'tiny') { const o0 = opt.laneO || [0, 0], ux = wx - o0[0], uz = wz - o0[1]; if (Math.abs(-Math.sin(opt.lane) * ux + Math.cos(opt.lane) * uz) < (opt.laneW || 5) && (!opt.laneO || Math.cos(opt.lane) * ux + Math.sin(opt.lane) * uz > 0)) continue; }   /* 길(출구 길 · 빛의 길)은 비워 둠 */   /* 기지 출구 앞 길은 비워 둠 (풀꽃만) */
        const pk = list[Math.floor(R() * list.length)]; let ss = sc * (.85 + R() * .4); if (kind === 'tree' || kind === 'bush') ss = Math.min(ss, 4.5 / Math.max(.1, KIT[pk].hi * SC));   /* 나무 꼭대기가 기체 높이에 닿지 않게 */
        put(pk, wx, wz, 'deco', R() * 6.28, { s: ss, y: BY + h - .04, deco: kind, rl }); got++; } };
    /* 숲 덤불(숨을 곳): 나무를 흩뿌리지 않고 몇 무더기로 빽빽이 모음 → 그 무더기 안에 들어가면 숨음 · 외톨이 나무 한두 그루는 숨을 곳 아님 */
    const grove1 = (gx, gz, gr) => { const plant = (kind, n) => { const list = DECO[kind]; if (!list.length) return; for (let t = 0, got = 0; t < n * 6 && got < n; t++) { const a = R() * 6.28, rr = Math.sqrt(R()) * gr, lx = gx + Math.cos(a) * rr, lz = gz + Math.sin(a) * rr;
          if (Math.hypot(lx, lz) > L.rad(Math.atan2(lz, lx)) - 1.2) continue; const h = hAt(lx, lz); if (h === null) continue; const [wx, wz] = toW(lx, lz), pk = list[Math.floor(R() * list.length)];
          const edge = rr / gr, ss = Math.min(.85 + R() * .4, 4.5 / Math.max(.1, KIT[pk].hi * SC)) * (kind === 'tree' ? 1 - edge * .25 : 1);   /* 가운데는 크고 가장자리로 갈수록 낮아짐 → 둥근 숲 덩이 */
          put(pk, wx, wz, 'deco', R() * 6.28, { s: ss, y: BY + h - .04, deco: kind, rl }); got++; } };
      const A = Math.PI * gr * gr; plant('tree', Math.round(A / 2.6)); plant('bush', Math.round(A / 2.2)); };
    const okG = (lx, lz, gr) => { if (Math.hypot(lx, lz) > L.rad(Math.atan2(lz, lx)) - gr * .6 - 1) return false; if (opt.clear && Math.hypot(lx, lz) < opt.clear + gr + 1.5) return false;
      const [wx, wz] = toW(lx, lz); if (opt.lane != null) { const o0 = opt.laneO || [0, 0], ux = wx - o0[0], uz = wz - o0[1]; if (Math.abs(-Math.sin(opt.lane) * ux + Math.cos(opt.lane) * uz) < (opt.laneW || 5) + gr && (!opt.laneO || Math.cos(opt.lane) * ux + Math.sin(opt.lane) * uz > -gr)) return false; }
      for (const g of GROVES) if (Math.hypot(g.x - wx, g.z - wz) < g.r + gr + 2.5) return false; return true; };
    { const nG = Math.max(radius > 7 ? 1 : 0, Math.round(area * dens / 260)); for (let t = 0, got = 0; t < 40 && got < nG; t++) { const gr = Math.min(radius * .45, 3.4 + R() * 3), a = R() * 6.28, rr = Math.sqrt(R()) * radius * .7, lx = Math.cos(a) * rr, lz = Math.sin(a) * rr;
        if (!okG(lx, lz, gr)) continue; const h = hAt(lx, lz); if (h === null) continue; const [wx, wz] = toW(lx, lz); grove1(lx, lz, gr); GROVES.push({ x: wx, z: wz, r: gr, y: BY + h, layer: LY }); got++; } }
    deco('tree', Math.min(2, Math.round(area / 200)), 1); deco('bush', Math.round(area / 60 * dens), 1);   /* 외톨이 나무 한두 그루 · 낮은 덤불 몇 개 */ deco('rock', Math.round(area / 55 * dens), 1); deco('tiny', Math.round(area / 7 * dens), 1, .6);   /* 풀포기·꽃은 촘촘히 */
    /* 오래된 돌 유적: 돌기둥 몇 개 + 무너진 돌담 (둥지 싸움 자리 · 출구 길은 피함) */
    if (LY === 'mid' && RUIN.length && radius > 9) for (let tries = 0, done = 0; tries < 30 && done < 1; tries++) {
      const a = R() * 6.28, rr = (opt.clear ? opt.clear + 3 : 2) + R() * (radius * .75 - (opt.clear ? opt.clear + 3 : 2)), lx = Math.cos(a) * rr, lz = Math.sin(a) * rr, [wx, wz] = toW(lx, lz);
      if (opt.lane != null && Math.abs(-Math.sin(opt.lane) * wx + Math.cos(opt.lane) * wz) < 7) continue;
      const h0 = hAt(lx, lz); if (h0 === null) continue; done++;
      const np = 1 + Math.floor(R() * 3), ang = R() * 6.28;
      for (let j = 0; j < np; j++) { const ox = lx + Math.cos(ang) * j * 2.2 + (R() - .5) * .6, oz = lz + Math.sin(ang) * j * 2.2 + (R() - .5) * .6, h = hAt(ox, oz); if (h === null) continue; const [px, pz] = toW(ox, oz);
        put(RUIN[Math.floor(R() * RUIN.length)], px, pz, 'deco', R() * 6.28, { abs: true, y: BY + h - .05, deco: 'ruin' }); }
      if (R() < .75) { const ox = lx + Math.cos(ang + 1.57) * 2.6, oz = lz + Math.sin(ang + 1.57) * 2.6, h = hAt(ox, oz); if (h !== null) { const [px, pz] = toW(ox, oz); put(WALL[Math.floor(R() * WALL.length)], px, pz, 'deco', ang + yaw + (R() - .5) * .4, { abs: true, y: BY + h - .05, deco: 'ruin' }); } } }
    /* 테두리에 늘어진 뿌리·덩굴: 둘레를 따라 듬성듬성 */
    if (DECO.hang.length) for (let i = 0; i < L.lip.length; i += 2) { if (R() < .35) continue; const [lx, ly, lz] = L.lip[i], k2 = .97, [wx, wz] = toW(lx * k2, lz * k2);
      put(DECO.hang[Math.floor(R() * DECO.hang.length)], wx, wz, 'deco', R() * 6.28, { s: .9 + R() * .3, y: BY + ly + .25, deco: 'hang', rl }); }
    return k; };
  /* 가운데층은 기체를 막는 게 없어야 함 (사용자 2026-11-06: 같은 층에는 걸리는 게 없게 · 층을 뚫는 기둥만 장애물) → 땅 위로 기체 높이 가까이 솟는 섬은 가운데층에 안 씀 */
  const FLY_ROOM = 4.6,   /* 식물·언덕은 기체가 그냥 지나침 → 아주 높이 솟는 섬만 가운데층에서 뺌 */ tooTall = (k, s) => (KIT[k].hi - KIT[k].top) * s > FLY_ROOM;
  const BIG = ['Island_Plateau_Wide', 'Island_Twin_Falls', 'Island_Forest_Dense', 'Island_Bowl', 'Island_Ridge_Long', 'Island_Mushroom', 'Island_Keel', 'Island_Tilted_A', 'Island_Medium', 'Island_Flat_Low'];
  const MID = ['Island_Chunk_Round', 'Island_Small', 'Island_Crag', 'Island_Medium', 'Island_Flat_Low', 'Island_Tilted_A', 'Island_Bowl', 'Island_Mushroom', 'Island_Keel', 'Island_Ridge_Long'];   /* 종류를 넓혀 같은 모양이 덜 반복되게 */
  const PIL = ['Island_Needle', 'Island_Spire_Crown', 'Island_Mesa_Tall', 'Island_Lean_Pillar', 'Island_Tower'];
  const ROCK = ['Rock_Floating_A', 'Rock_Mushroom_Small', 'Rock_Keel_Small'];
  const UPS = ['Island_Small', 'Island_Chunk_Round', 'Island_Medium', 'Island_Bowl', 'Island_Keel'];
  const DNS = ['Island_Flat_Low', 'Island_Ridge_Long', 'Island_Forest_Dense', 'Island_Mushroom', 'Island_Tilted_A', 'Island_Twin_Falls', 'Island_Plateau_Wide', 'Island_Bowl', 'Island_Medium', 'Island_Keel', 'Island_Chunk_Round', 'Island_Small']
    .map(n => KIT['lo:' + n] ? 'lo:' + n : n);
  /* 층 사이 원근 조각: 갈 수 없는 공간 → 단순한 각진 바위 덩어리 여러 모양 (사용자 2026-11-06: 단순화해서 보여 줘도 됨) */
  const CHUNK = []; for (let i = 0; i < 8; i++) { const c = makeChunk(77 + i * 13, PAL, i % 3 === 0); const k = 'chunk_' + i; c.computeBoundingBox();
    KIT[k] = { prims: [{ geo: c, mat: 'Terrain', src: MATS.Terrain }], top: 0, bot: c.boundingBox.min.y, hi: c.boundingBox.max.y, rad: 1 }; CHUNK.push(k); }
  const TREASURE = [], GATES = [], NESTS = [];
  /* 기지 사이 열 곳마다 (사용자 2026-11-07: 둥지가 둘씩 붙어 빈 사이가 생김 · 보물 문 다섯은 한쪽으로 쏠림 → 기지 사이마다 하나씩 고르게):
     · 보물 섬 하나 (위층 · 아래층 번갈아 → 기지마다 양옆에 위 하나 · 아래 하나) — 싸울 자리로 지름 약 50m 넓은 땅 + 가운데 보물 섬 (사용자: 싸우려면 넓은 공간)
     · 그 보물 섬으로 가는 문 하나 (가운데층 작은 땅)
     · 몬스터 둥지 하나 (가운데층 · 지름 32m 땅) — 위층 보물 섬 바로 밑은 피함 (위층 섬이 싸우는 곳을 가리지 않게)
     자리(사이 한가운데 φ 기준, 모든 사이 같은 쪽): 보물 섬 φ+7°·212m · 문 φ−4°·227m · 둥지 φ−10°·205m */
  const TR = 25;
  for (let j = 0; j < SECT; j++) { const ph = (j + .5) * SA, sd = 1, up = j % 2 === 1, R = rnd(3000 + j * 59);   /* 쪽은 모든 사이에서 같게 → 기지마다 둘레가 똑같음 (번갈면 둥지가 둘씩 붙음) */
    { const th = ph + sd * 7 * deg, [x, z] = at(th, 207), k0 = up ? 'Island_Treasure_Ruins' : 'Island_Treasure_Vault', layer = up ? 'up' : 'dn';   /* 207m: 감아 도는 빛의 길이 무지개 벽 안에 들게 */
      let k = k0; if (up) { k = 'sq:' + k0; if (!KIT[k]) { const K = KIT[k0]; KIT[k] = { ...K, prims: K.prims.map(pr => ({ ...pr, geo: squashBelow(pr.geo.clone(), K.top - 1.5 / SC, 4.5 / SC) })) }; KIT[k].bot = Math.min(...KIT[k].prims.map(pr => pr.geo.boundingBox.min.y)); } }   /* 위층 보물 섬: 몸통 눌러 줌 */
      addLand(x, z, TR, 6000 + j * 41, { layer, by: up ? UP : DN, clear: 9, dens: .6, squash: up ? 6 : 0 });
      put(k, x, z, layer, th + Math.PI / 2, { treasure: true }); TREASURE.push({ x, z, layer, y: up ? UP : DN, k: k0, rad: TR }); }
    { const T = TREASURE[j], th = ph - sd * 4 * deg, [gx, gz] = at(th, 227);
      addLand(gx, gz, 7.5, 4000 + j * 37, { clear: 5.2, by: MEADOW.GATE_Y, lane: Math.atan2(T.z - gz, T.x - gx), laneO: [gx, gz], laneW: 3 });
      GATES.push({ gr: 7.5, x: gx, z: gz, tx: T.x, tz: T.z, layer: T.layer, ty: T.y, rad: TR, dir: 1 }); }
    { const th = ph - sd * 10 * deg, [x, z] = at(th, 205);   /* 몬스터 둥지: 넓은 땅 한가운데 · 가운데는 싸울 자리로 평평하게 비움 */
      addLand(x, z, 15 + R() * 2, 500 + j * 13, { clear: 6.5 }); put(j % 2 ? 'Island_Lair_Arena' : 'Island_Lair_Nest', x, z, 'mid', th + R() * 6.28, { camp: true }); NESTS.push({ x, z }); } }
  for (const G0 of GATES) { const { pts } = spiralPath({ gx: G0.x, gz: G0.z, tx: G0.tx, tz: G0.tz, rad: G0.rad, gr: G0.gr, dir: G0.dir }); let d = 0, last = -9;   /* 빛의 길(감아 도는 길) 하늘 비우기 */
    for (let i = 1; i < pts.length; i++) { d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]); if (d > G0.gr + 1.5 && d - last > 2.2) { CORR.push([pts[i][0], pts[i][2], 2.6]); last = d; } } }
  for (let i = 0; i < SECT; i++) { const th0 = i * SA, R = rnd(1000 + i * 77), sd = i % 2 ? 1 : -1;
    /* 태어나는 곳 출구 앞: 기체 아래로 깔리는 넓은 풀밭 · 길 양옆만 꾸밈 (사용자 2026-11-06: 앞이 너무 썰렁함) */
    { const [x, z] = at(th0, R1 - 20); addLand(x, z, 12.5, 300 + i * 11, { lane: th0 }); }
    /* 큰 섬: 둥지 반대쪽 */
    { const th = th0 - sd * 9 * deg, [x, z] = at(th, rf(.32)), rr = 10 + R() * 3; if (!inCorr(x, z, rr * 1.15) && fits(x, z, rr * 1.12, 'mid')) addLand(x, z, rr, 900 + i * 17); }   /* 둥지·문 땅과 겹치면 뺌 */   /* 넓은 풀밭 땅 */
    { const th = th0 + sd * 3 * deg, [x, z] = at(th, rf(.2)); let bk = (i + 5) % BIG.length; for (let q = 0; q < BIG.length && tooTall(BIG[bk], SC); q++) bk = (bk + 1) % BIG.length; if (!tooTall(BIG[bk], SC) && fits(x, z, KIT[BIG[bk]].rad * SC * .78, 'mid')) put(BIG[bk], x, z, 'mid', R() * 6.28); }   /* 큰 섬 하나 더 */
    /* 놓기 (사용자 2026-11-06: 같은 섬을 바로 옆에 붙여 넣은 티 · 빈 곳이 있음):
       · 자리 후보를 여럿 뽑아 그중 이웃과 가장 멀리 떨어진 곳(빈 곳)부터 채움 → 고르게 퍼짐
       · 같은 종류 섬은 가까이 다시 안 옴 · 크기는 0.78~1.28배로 섞고 살짝 기울여 같은 모양이 같아 보이지 않게 */
    const base = k => k.replace(/^lo:/, '');
    const gapOf = (x, z, layer) => { let m = 1e9; for (const q of place) { if (!clash(q.layer, layer)) continue; const d = Math.hypot(q.x - x, q.z - z) - q.rr; if (d < m) m = d; } return m; };
    const sameNear = (k, x, z, layer, dist) => { const b = base(k); for (const q of place) if (q.layer === layer && base(q.k) === b && Math.hypot(q.x - x, q.z - z) < dist) return true; return false; };
    const tryPut = (list, layer, n, rMin, rMax, ex = {}) => { const vary = layer === 'mid' || layer === 'dn' || layer === 'up';
      for (let got = 0; got < n; got++) { let best = null;
        for (let c = 0, tries = 0; c < 10 && tries < 80; tries++) {
          const k = list[Math.floor(R() * list.length)], th = th0 + (R() - .5) * SA * .96, r = rMin + R() * (rMax - rMin), [x, z] = at(th, r), K = KIT[k], s0 = ex.s ? ex.s() : vary ? .78 + R() * .5 : 1, s = s0 * SC, rr = K.rad * s * .78;
          if (layer !== 'up' && layer !== 'dn' && !clearOfBase(x, z, rr, th0)) continue;
          if (!fits(x, z, rr, layer)) continue;
          if (layer === 'mid' && tooTall(k, s)) continue;
          if (layer !== 'rock' && sameNear(k, x, z, layer, 13 + rr * 2)) continue;
          c++; const g = gapOf(x, z, layer) - rr; if (!best || g > best.g) best = { k, x, z, s0, g, y: ex.y ? ex.y() : 0 }; }
        if (!best) break;
        put(best.k, best.x, best.z, layer, R() * 6.28, { s: best.s0, y: best.y, tilt: vary ? [(R() - .5) * .1, (R() - .5) * .1] : null }); } };
    tryPut(BIG, 'mid', 2, rf(.15), rf(.85));
    tryPut(MID, 'mid', 26, rf(.04), rf(.94));
    /* 탑·기둥 (사용자 2026-11-07: 늘 가운데→위로만 솟을 필요 없음 · 아래층에서 솟거나 · 층 사이에 뜨거나 · 크기도 여러 가지) */
    for (let n = 0, t = 0; n < 4 && t < 120; t++) { const mode = ['full', 'low', 'float', 'small', 'floatHi'][(i + n) % 5], k = PIL[Math.floor(R() * PIL.length)], K = KIT[k], th = th0 + (R() - .5) * SA * .96, r = rf(.06) + R() * (rf(.9) - rf(.06)), [x, z] = at(th, r);
      const h = K.hi - K.bot, P = { full: [SC, .9, UP + 6], low: [SC * .8, (TOP + 4 - DN + 8) / h, TOP + 4], small: [SC * (.45 + R() * .2), (TOP + 3 - DN) / h * (.7 + R() * .3), TOP + 3 + R() * 2],
        float: [SC * (.4 + R() * .25), (7 + R() * 6) / h, -9 - R() * 3], floatHi: [SC * (.35 + R() * .2), (5 + R() * 5) / h, 0] }[mode];
      if (mode === 'floatHi') P[2] = 3 + R() * 4 + (K.hi - K.bot) * P[1];   /* 위쪽 사이에 뜬 것: 바닥이 기체 높이보다 위 */
      const rr = K.rad * P[0] * .78; if (!clearOfBase(x, z, rr, th0) || !fits(x, z, rr, 'pillar')) continue;
      put(k, x, z, 'pillar', R() * 6.28, { ps: P[0], psy: P[1], ptop: P[2], pmode: mode, rl: mode === 'float' ? 'dn' : undefined }); n++; }
    tryPut(ROCK, 'rock', 16, rf(.04), rf(.96), { y: () => -6 - R() * 9, s: () => 1 + R() * .8 });   /* 기체 발아래 떠 있는 바위 */
    tryPut(UPS, 'up', 2, rf(.06), rf(.9), { s: () => .55 + R() * .3 });   /* 위층: 지금 시점에선 잘 안 보임 → 작게 몇 개만 (보물 던전 섬은 그대로) */
    tryPut(DNS, 'dn', 22, rf(.0), rf(.98));
    /* 경계 넘어 정글 쪽으로: 초원의 작은 섬들이 정글 가장자리 안으로 번져 들어감 (사용자 2026-11-07: 땅을 섞지 말고 작은 구조물이 경계 앞뒤로 넘어가게) */
    for (let n = 0, t = 0; n < 8 && t < 160; t++) { const layer = ['mid', 'mid', 'upgap', 'dn', 'mid', 'upgap', 'dn', 'mid'][n], list = ['Island_Small', 'Island_Chunk_Round', 'Island_Flat_Low', 'Island_Tilted_A', 'Island_Mushroom'];
      const k = list[Math.floor(R() * list.length)], th = th0 + (R() - .5) * SA, r = R0 - 3 - Math.pow(R(), 1.5) * 24, [x, z] = at(th, r), s0 = .5 + R() * .45, s = s0 * SC, rr = KIT[k].rad * s * .78;
      if (layer === 'mid' && tooTall(k, s)) continue;
      if (inCorr(x, z, rr)) continue;
      let ok = true; for (const q of place) { if (!clash(q.layer, layer)) continue; if (Math.hypot(q.x - x, q.z - z) < q.rr + rr + 1.5) { ok = false; break; } }
      if (ok) for (const o of AVOID) { const same = o.layer === layer || o.layer === 'pillar' || o.layer === 'all' || (layer === 'upgap' && o.layer === 'up'); if (same && Math.hypot(o.x - x, o.z - z) < o.r + rr + 2) { ok = false; break; } }
      if (!ok) continue;
      const y = layer === 'upgap' ? Math.max(6 + R() * 8, 1.8 - KIT[k].bot * s) - KIT[k].top * s : undefined;
      put(k, x, z, layer, R() * 6.28, { s: s0, y, rl: layer === 'upgap' ? 'upgap' : undefined, tilt: [(R() - .5) * .1, (R() - .5) * .1], cross: true }); n++; }   /* 아래층을 꽉 차 보이게 (실제로 내려가는 곳은 보물 던전 몇 곳뿐) */
    for (let n = 0, t = 0; n < 2 && t < 60; t++) { const th = th0 + (R() - .5) * SA * .9, rr = 9 + R() * 5, r = rf(.1) + R() * (rf(.9) - rf(.1)), [x, z] = at(th, r);
      if (!fits(x, z, rr * 1.12, 'dn')) continue; addLand(x, z, rr, 2000 + i * 29 + t, { layer: 'dn', dens: .55 }); n++; }   /* 아래층 넓은 땅 */
    for (let n = 0; n < 45; n++) { const th = th0 + (R() - .5) * SA, r = R0 - 6 + R() * (R1 - R0 + 2), [x, z] = at(th, r), sc = .7 + Math.pow(R(), 2.4) * 3.3, y = -9 - R() * 17;
      if (!inCorr(x, z, sc)) put(CHUNK[Math.floor(R() * CHUNK.length)], x, z, 'gap', R() * 6.28, { abs: true, s: 1, y, gs: sc }); }
    /* 가운데층~위층 사이 (사용자 2026-11-06: 돌멩이 말고 제일 작은 섬과 그보다 조금 큰 섬 · 세 높이로 나눠 · 지금보다 자주 보이게) */
    for (const [tierY, n0, list, sMin, sMax] of [[6.5, 7, ['Island_Small', 'Island_Chunk_Round'], .4, .6], [10.5, 6, ['Island_Small', 'Island_Chunk_Round', 'Island_Flat_Low', 'Island_Tilted_A'], .45, .7], [14.5, 5, ['Island_Medium', 'Island_Flat_Low', 'Island_Mushroom', 'Island_Tilted_A', 'Island_Bowl'], .5, .75]])
      for (let n = 0, t = 0; n < n0 && t < n0 * 30; t++) { const k = list[Math.floor(R() * list.length)], th = th0 + (R() - .5) * SA, r = rf(.03) + R() * (rf(.94) - rf(.03)), [x, z] = at(th, r), s0 = sMin + R() * (sMax - sMin), s = s0 * SC, rr = KIT[k].rad * s * .78;
        const yTop = Math.max(tierY + (R() - .5) * 1.6, 1.8 - KIT[k].bot * s);   /* 몸통 끝은 늘 기체 높이보다 위 */
        if (!fits(x, z, rr, 'upgap') || placeNearY(x, z, rr, yTop)) continue; put(k, x, z, 'upgap', R() * 6.28, { s: s0, y: yTop - KIT[k].top * s, rl: 'upgap', tier: tierY }); n++; } }

  /* ── 칠하는 방식: 이 그림체는 면마다 평평한 색 → 빛 반사를 점마다 정밀 계산하는 무거운 방식 대신,
        꼭짓점에서 해·하늘·땅빛만 한 번 계산하고 화면 점마다는 그 색을 그대로 씀 (모양·색은 같고 계산은 훨씬 적음)
        층마다: 위층 = 밝게 + 점무늬로 옅게(기체 가까이선 더 옅게) · 아래층 = 어둡고 아래로 갈수록 구름빛 · 기둥 = 기체보다 높은 부분이 가까이 오면 점무늬로 비켜 줌 ── */
  const uCam = { value: new THREE.Vector3() };
  const LIT = { uUpC: { value: 0 }, uDnC: { value: 0 }, uT: { value: 0 },   /* uUpC·uDnC: 그 층에 가 있을 때 1 → 그 층의 옅은 하늘빛·구름빛을 걷어 또렷하게 (문 타고 도착) */ uSun: { value: new THREE.Vector3(-9, 14, -8).normalize() }, uSunC: { value: new THREE.Color(0xfff0dc).multiplyScalar(2.8 / Math.PI) },
    uSky: { value: new THREE.Color(0xb7c8e8).multiplyScalar(.85 / Math.PI + .38) }, uGnd: { value: new THREE.Color(0x3a3020).multiplyScalar(.85 / Math.PI + .38) } };
  const BAY = 'float bay(vec2 p){ vec2 q=mod(floor(p),4.); int i=int(q.x)+int(q.y)*4; float m[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.); return (m[i]+.5)/16.; }\n';
  const tone = (src, layer) => {
    const em = src.emissive ? src.emissive.clone() : new THREE.Color(0);
    const m = new THREE.ShaderMaterial({ vertexColors: true, transparent: src.transparent, depthWrite: src.depthWrite, side: src.side,
      uniforms: { ...LIT, uCam, uEm: { value: em } },
      vertexShader: `uniform vec3 uSun, uSunC, uSky, uGnd, uEm; uniform float uT; varying vec3 vC; varying float vA; varying vec3 vWp;
        ${layer === 'mid' || layer === 'pillar' || layer === 'upgap' ? CLOUD_NOISE : ''}
        void main(){ mat4 M = modelMatrix * instanceMatrix; vec4 w = M * vec4(position, 1.);
          ${src.name === 'Foliage' ? 'w.xz += vec2(sin(uT * 1.7 + w.x * .35 + w.z * .27), cos(uT * 1.3 + w.z * .31)) * .03 * clamp(position.y, 0., 6.);' : ''}   /* 풀·잎이 바람에 살랑 (위로 갈수록 더) */
          vWp = w.xyz;
          vec3 n = normalize(mat3(M) * normal);
          #ifdef USE_COLOR_ALPHA
            vec3 c = color.rgb; vA = color.a;
          #else
            vec3 c = color; vA = 1.;
          #endif
          float shd = 0.;
          ${layer === 'mid' || layer === 'pillar' || layer === 'upgap' ? 'shd = smoothstep(.2, .6, sn(w.xz * .016 + vec2(uT * .012, uT * .005)) * .5 + .5) * .62;' : ''}   /* 땅 위로 천천히 지나가는 구름 그림자 */
          vC = c * (uSunC * max(dot(n, uSun), 0.) * (1. - shd) + mix(uGnd, uSky, n.y * .5 + .5)) + uEm;
          gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 uCam; uniform float uUpC, uDnC; varying vec3 vC; varying float vA; varying vec3 vWp;
        void main(){ vec3 col = vC;
          ${layer === 'up' || layer === 'upgap' ? '{ float k = clamp((vWp.y - 2.) / 20., 0., 1.); col = mix(col, vec3(.98, .99, 1.), (.06 + k * .14) * (1. - uUpC)); }' : ''}   /* 점무늬로 비키지 않음 (사용자 2026-11-06: 그냥 가려지게, 기체는 윤곽으로) · 높을수록 살짝 하늘빛 */
          ${layer === 'dn' ? '{ float k = clamp((-vWp.y - 15.) / 50., 0., 1.); col = mix(col * mix(.72, 1., uDnC), vec3(.5, .6, .78), (.35 + k * .45) * (1. - uDnC * .9)); }' : ''}
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
    m4.compose(new THREE.Vector3(p.x, p.y, p.z), p.tilt ? q.setFromEuler(new THREE.Euler(p.tilt[0], p.yaw, p.tilt[1], 'YXZ')) : q.setFromAxisAngle(up, p.yaw), new THREE.Vector3(p.s, p.sy, p.s)); p.m = m4.clone();
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

  /* ── 막힘: 막는 구조물이 기체 높이 단면(.7m 위아래 25cm)을 지나는 곳을 25cm 칸으로 찍음 ── */
  const N = Math.ceil(R1 * 2 / CELL) + 2, grid = new Uint8Array(N * N), cellOf = v => Math.floor((v + R1 + 1) / CELL);
  const Y0 = .45, Y1 = .95, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), w = new THREE.Vector3();
  /* 막는 것 (사용자 2026-11-07): 층을 뚫는 기둥 + 돌 유적(돌기둥·돌담) + 가운데층 섬에 '우뚝 솟은' 바위
     · 받은 섬 모델은 몸통·바위·작은 돌·나무가 한 덩어리 → 초록 면(잎)은 빼고, 땅에서 2m 넘게 솟은 돌(꼭대기가 TALL 넘는 곳)만 막음 · 나무도 섬 몸통과 같은 재질이라 색(초록=잎)으로 가름
     · 작은 돌·나무줄기·낮은 바위·섬 땅·넓은 땅 언덕·풀꽃·뿌리는 통과 */
  const TALL = TOP + 2, green = (C, i, j, k) => { const r = C.getX(i) + C.getX(j) + C.getX(k), g = C.getY(i) + C.getY(j) + C.getY(k), bl = C.getZ(i) + C.getZ(j) + C.getZ(k); return g > r * 1.12 && g > bl * 1.05; };
  const solid = p => p.layer === 'pillar' || (p.layer === 'mid' && !p.k.startsWith('land_')) || (p.layer === 'deco' && p.k.startsWith('ruin'));
  const hit = new Map(), top = new Map();
  for (const p of place) { if (!solid(p)) continue;
    if (p.y + KIT[p.k].hi * p.sy < Y0 || p.y + KIT[p.k].bot * p.sy > Y1) continue;
    const isle = p.layer === 'mid'; hit.clear(); top.clear();
    for (const pr of KIT[p.k].prims) { if (pr.mat === 'Foliage' || pr.mat === 'Water') continue; const P = pr.geo.attributes.position, C = pr.geo.attributes.color, I = pr.geo.index, cnt = I ? I.count : P.count;
      for (let i = 0; i < cnt; i += 3) { const i0 = I ? I.getX(i) : i, i1 = I ? I.getX(i + 1) : i + 1, i2 = I ? I.getX(i + 2) : i + 2;
        a.fromBufferAttribute(P, i0).applyMatrix4(p.m); b.fromBufferAttribute(P, i1).applyMatrix4(p.m); c.fromBufferAttribute(P, i2).applyMatrix4(p.m);
        if (Math.max(a.y, b.y, c.y) < Y0 || (!isle && Math.min(a.y, b.y, c.y) > Y1)) continue;
        const gr = isle && C && green(C, i0, i1, i2);   /* 초록 면도 '닿는 자리'엔 넣되, '솟은 돌인가'는 돌(초록 아닌 면) 꼭대기로만 판단 → 이끼 낀 바위 탑도 잡고 나무는 안 잡음 */
        const e = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)), n = Math.max(1, Math.ceil(e / .17));
        for (let u = 0; u <= n; u++) for (let v = 0; v <= n - u; v++) { const s1 = u / n, s2 = v / n; w.set(0, 0, 0).addScaledVector(a, 1 - s1 - s2).addScaledVector(b, s1).addScaledVector(c, s2);
          if (w.y < Y0) continue; const gx = cellOf(w.x), gz = cellOf(w.z); if (gx < 0 || gz < 0 || gx >= N || gz >= N) continue; const id = gz * N + gx;
          if (!isle) { if (w.y <= Y1) grid[id] = 1; continue; }
          if (w.y <= Y1) hit.set(id, 1); if (!gr) { const cid = Math.floor(w.z + R1 + 1) * 1000 + Math.floor(w.x + R1 + 1); if (w.y > (top.get(cid) ?? -1e9)) top.set(cid, w.y); } } } }
    if (isle) for (const id of hit.keys()) { const gx = id % N, gz = (id - gx) / N, ux = Math.floor(gx * CELL), uz = Math.floor(gz * CELL); let t = -1e9;   /* 기운 바위·탑 위 나무줄기도 잡게 주변 2m(1m 칸)까지 돌 꼭대기를 봄 */
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const q = top.get((uz + dz) * 1000 + ux + dx); if (q > t) t = q; }
      if (t > TALL) grid[id] = 1; }
    { const rr = (KIT[p.k].rad || 3) * Math.max(p.s || 1, p.sy || 1) + 1; fillHoles(grid, N, cellOf(p.x - rr), cellOf(p.z - rr), cellOf(p.x + rr), cellOf(p.z + rr)); } }
  onProgress(1);
  const blocked = (x, z) => { const gx = cellOf(x), gz = cellOf(z); return gx >= 0 && gz >= 0 && gx < N && gz < N && grid[gz * N + gx] === 1; };
  /* 정글 쪽으로 들어가면 초원 섬도 햇빛이 줄고 보랏빛 하늘빛을 받음 */
  const SUN0 = LIT.uSunC.value.clone(), SKY0 = LIT.uSky.value.clone(), GND0 = LIT.uGnd.value.clone(), SKYJ = new THREE.Color(0x7a6cff).multiplyScalar(.5), GNDJ = new THREE.Color(0x3a0a4a).multiplyScalar(.5);
  const setMood = k => { LIT.uSunC.value.copy(SUN0).multiplyScalar(1 - k * .6); LIT.uSky.value.copy(SKY0).lerp(SKYJ, k); LIT.uGnd.value.copy(GND0).lerp(GNDJ, k); };
  const update = (ship, camera, t = 0) => { uCam.value.copy(ship); LIT.uT.value = t; if (camera) cull(camera); };
  const info = () => ({ shown, calls, tris: Math.round(tris), total: place.length });
  /* 폭포 끝(물 조각의 가장 낮은 곳)마다 물보라 자리 */
  const MIST = [];
  for (const p of place) { if (p.layer !== 'mid') continue; const wp = KIT[p.k].prims.find(pr => pr.mat === 'Water'); if (!wp) continue;
    const P = wp.geo.attributes.position; let lo = 1e9; for (let i = 0; i < P.count; i++) lo = Math.min(lo, P.getY(i)); const v = new THREE.Vector3(), acc = new THREE.Vector3(); let n = 0;
    for (let i = 0; i < P.count; i++) if (P.getY(i) < lo + .6) { acc.add(v.fromBufferAttribute(P, i)); n++; }
    if (n) { acc.divideScalar(n).applyMatrix4(p.m); if (acc.y < -4) MIST.push(acc.clone()); } }
  const setVisit = (u, d) => { LIT.uUpC.value = u; LIT.uDnC.value = d; };
  return { setVisit, NESTS, CORR, root, blocked, update, GROVES, setMood, info, place, TREASURE, GATES, KIT, LANDS, MIST, PAL, CHUNK };
}
