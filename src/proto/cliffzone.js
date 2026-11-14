/* 돌산 · 절벽 시험 구역 (사용자 2026-11-14 '작업해')
   · 받은 트라이포 돌산 조각 14개만으로 이어 만듦 (조각마다 삼각형 약 4,500 · 그림 1024 · 같은 조각은 한 번에 그림)
   · 위 평지(돌산 · 둘레 절벽) → 절벽 중간에 튀어나온 평지(14번 · 1층) → 그 위 절벽 쪽 보물방 입구(11번 아치) → 맨 아래 안개 낀 깊은 협곡(못 내려감)
   · 절벽 잇기: 조각끼리 겹치고 파고들게 · 돌리고 크기를 조금씩 바꿔 반복 티 안 나게 · 꼭대기 이끼가 평지 풀과 이어지게 · 틈은 작은 바위(9번)로
   · 조작은 게임과 같음: 왼쪽 아래 조이스틱 · 오른쪽 위 칸 위아래로 쓸어 높이 바꾸기(E · Q) — 높이 셋: 절벽 중간(1층) · 평지 · 평지 위 하늘
   · 카메라 게임과 같음 (56° · 세로 22) · 위 = 12시 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeFlight, FLY, padZone } from './flight.js?v=11141600';
import { makeForgeShip, forgeList } from './forgeship.js?v=11141600';

const $ = s => document.querySelector(s);
const fract = x => x - Math.floor(x), hash = (a, b) => fract(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
const noise = (x, y) => { const i = Math.floor(x), j = Math.floor(y), a = x - i, b = y - j, u = a * a * (3 - 2 * a), v = b * b * (3 - 2 * b); return (hash(i, j) * (1 - u) + hash(i + 1, j) * u) * (1 - v) + (hash(i, j + 1) * (1 - u) + hash(i + 1, j + 1) * u) * v; };
const pnoise = (x, y, P) => { const i = Math.floor(x), j = Math.floor(y), a = x - i, b = y - j, u = a * a * (3 - 2 * a), v = b * b * (3 - 2 * b), H = (p, q) => hash(((p % P) + P) % P, ((q % P) + P) % P); return (H(i, j) * (1 - u) + H(i + 1, j) * u) * (1 - v) + (H(i, j + 1) * (1 - u) + H(i + 1, j + 1) * u) * v; };
const fbm = (x, y) => .5 * noise(x, y) + .25 * noise(x * 2.1 + 5, y * 2.1) + .125 * noise(x * 4.3, y * 4.3 + 9);

/* ── 배치 (단위: 게임 m · y 위 · −z = 12시) ── */
const SC = .5, TOP = 0, LEDGE = -10, MIST = -22;   /* 배치는 큰 숫자로 적고 통째로 0.5배 (기체 길이 2m에 맞춘 크기) */
const PLATEAU0 = [[-50, -44], [50, -44], [57, -12], [50, 12], [26, 15], [13, 13], [-13, 13], [-26, 15], [-50, 12], [-57, -12]];
const PLATEAU = (() => { const out = []; for (let i = 0; i < PLATEAU0.length; i++) { const [ax, az] = PLATEAU0[i], [bx, bz] = PLATEAU0[(i + 1) % PLATEAU0.length], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 9)), nx = (bz - az) / L, nz = -(bx - ax) / L;
  for (let k = 0; k < n; k++) { const t = k / n, keep = Math.abs(ax + (bx - ax) * t) < 15 && az + (bz - az) * t > 10, w = keep ? 0 : (Math.sin(i * 7.1 + k * 2.3) * .5 + Math.sin(i * 3.7 + k * 5.9) * .5) * 4.5 * (k ? 1 : 0);   /* 가장자리를 굽이지게 (입구 둘레는 반듯) */
    out.push([ax + (bx - ax) * t + nx * w, az + (bz - az) * t + nz * w]); } } return out; })();   /* 위 평지 가장자리 (남쪽 가운데가 튀어나온 평지 자리) */   /* 위 평지 가장자리 (남쪽 가운데가 튀어나온 평지 자리) */
const LEDGE_AREA = [[-11, 13.5], [11, 13.5], [12, 22], [6, 28], [-6, 28], [-12, 22]];   /* 튀어나온 평지 (14번 판 윗면) */
const ARCH = { x: 0, z: 16.5, w: 13 };   /* z = 절벽 앞면 */   /* 보물방 입구 (11번) — 절벽 면에 붙음 · 앞이 남쪽 */
const MOUNT = [[0, -26, 13], [-13, -18, 9], [13, -20, 9], [-24, -30, 7], [24, -32, 7]];   /* 돌산 막힘 (가운데 x · z · 반지름) */
const PILLARS = [[-34, 42, 5], [36, 46, 5], [-4, 64, 6], [62, 20, 4], [-64, 24, 4]];
export const LAYERS = [LEDGE * SC + 1.2, TOP + 1.2, TOP + 4.5], LNAME = ['절벽 중간 · 1층 (튀어나온 평지)', '평지 높이', '평지 위 하늘'], LCOL = [[.45, 1, .38], [.42, .82, 1], [1, .8, .32]];

const inPoly = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const distPoly = (P, x, z) => { let d = 1e9; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, az] = P[j], [bx, bz] = P[i], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return inPoly(P, x, z) ? -d : d; };
export function blockedAt(x, z, L) { x /= SC; z /= SC;
  if (x < -95 || x > 95 || z < -85 || z > 95) return true;
  for (const [px, pz, r] of PILLARS) if (Math.hypot(x - px, z - pz) < r) return true;
  if (L === 0) return distPoly(PLATEAU, x, z) < 1.5 && !inPoly(LEDGE_AREA, x, z);   /* 절벽 중간: 위 평지 밑은 바위 · 튀어나온 평지와 협곡 하늘만 */
  for (const [mx, mz, r] of MOUNT) if (Math.hypot(x - mx, z - mz) < r * (L === 2 ? .55 : 1)) return true;   /* 돌산 (하늘 높이에선 봉우리만) */
  return false;
}

/* 조각 크기 (높이 1로 맞춘 모양 → 게임 m) · 역할 */
const PIECE = { 1: 'ledgeCrown', 2: 'stepCliff', 3: 'peak', 4: 'vCorner', 5: 'alcove', 6: 'slope', 7: 'platform', 8: 'overhang', 9: 'boulders', 10: 'pillar', 11: 'arch', 12: 'cliffBlock', 13: 'cliffColumn', 14: 'ledgeSlab', 15: 'wideCliff' };

export async function buildCliffZone(THREE_, renderer) {
  const L = new GLTFLoader(), G = new THREE.Group(), src = {};
  for (let i = 1; i <= 15; i++) { const g = await L.loadAsync(`_mf/rock/opt/R${i}.glb?v=11141600`); let m; g.scene.traverse(o => { if (o.isMesh) m = o; });
    m.material.roughness = .95; m.material.metalness = 0; m.geometry.computeBoundingBox(); src[i] = m; }
  const inst = {}; const put = (i, x, y, z, yaw, s, sy = s) => { (inst[i] ||= []).push([x, y, z, yaw, s, sy]); };
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const size = i => { const b = src[i].geometry.boundingBox; return [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z]; };

  /* 위 평지 둘레 절벽: 가장자리를 따라 걷으며 조각을 겹쳐 세움
     A줄(본 벽): 12 · 13 번갈아 · 꼭대기가 평지보다 조금 위 · 앞면이 바깥 · 조각 깊이의 절반쯤 안으로 묻음
     B줄(아래 벽): 13 · 10 · 12 · 꼭대기가 A줄 밑동보다 위 (겹침) · 바깥으로 조금 · 밑은 안개 속
     C줄(꼭대기 돌): 1 · 2 · 9 작은 것 · 평지 가장자리 위에 얹어 꼭대기 선을 들쭉날쭉하게 · 이음새 가림 */
  const ring = PLATEAU.concat([PLATEAU[0]]);
  for (let e = 0; e < ring.length - 1; e++) { const [ax, az] = ring[e], [bx, bz] = ring[e + 1], len = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / len, tz = (bz - az) / len, nx = tz, nz = -tx;   /* 바깥 방향 (시계 반대로 돈 다각형 → 오른쪽이 바깥) */
    const out = inPoly(PLATEAU, (ax + bx) / 2 + nx * 2, (az + bz) / 2 + nz * 2) ? -1 : 1, ox = nx * out, oz = nz * out, yawOut = Math.atan2(ox, oz);
    const nearLedge = (x, z) => Math.abs(x) < 14 && z > 10;
    for (let s = 0; s < len; s += 3.6 + rnd() * 1.4) {   /* 촘촘히 겹쳐 틈 없게 */ const x = ax + tx * s, z = az + tz * s, jy = yawOut + (rnd() - .5) * .35;
      /* A줄(본 벽): 앞면이 가장자리 1m 바깥 · 꼭대기 이끼가 평지와 같은 높이 (평지 풀과 이어짐) */
      const ia = rnd() < .7 ? 15 : rnd() < .5 ? 13 : 12, sa = ia === 15 ? 10 + rnd() * 2.5 : ia === 13 ? 13 + rnd() * 3 : 11 + rnd() * 2, da = size(ia)[2] * sa, ha = sa;
      put(ia, x - ox * (da / 2 - 1), TOP - .1 - ha, z - oz * (da / 2 - 1), jy, sa);   /* 꼭대기는 평지 땅 밑 · 가장자리에서만 땅이 내려가 이끼 테두리가 드러남 */
      /* B줄(아래 벽): 같은 앞면 줄 · 꼭대기가 A줄 밑동보다 2.5m 위로 겹침 → 끊김 없이 한 벽 · 밑동은 안개 속 */
      const ib = rnd() < .6 ? 15 : 13, sb = ib === 15 ? 12 + rnd() * 3 : 16 + rnd() * 4, db = size(ib)[2] * sb, hb = sb;
      put(ib, x + tx * 2.6 - ox * (db / 2 - 1.6), TOP - .1 - ha + 2.5 - hb, z + tz * 2.6 - oz * (db / 2 - 1.6), yawOut + (rnd() - .5) * .5, sb);
    } }   /* 평지 위 작은 돌 얹기는 뺌 (풀밭에 스티커처럼 떠 보였음) */

  /* 튀어나온 평지 (14번 판) · 그 밑을 받치는 바위 · 보물방 입구 (11번) */
  { const s = 5.6, [w, h, d] = size(14); put(14, 0, LEDGE - s * .82, 13 + d * s * .42, 0, s * 1.05, s); }
  put(13, -9, LEDGE - 4 - 18, 17, .3, 18); put(12, 8, LEDGE - 3 - 15, 18, -.4, 15); put(10, 0, LEDGE - 6 - 20, 24, .1, 20);   /* 판 밑 받침 (밑동은 안개 속) */
  { const s = ARCH.w / size(11)[0]; put(11, ARCH.x, LEDGE - .2, ARCH.z - size(11)[2] * s * .35, 0, s); }   /* 아치 뒤쪽은 절벽 속 · 앞만 드러남 */
  put(9, -9.5, LEDGE - .6, 24, .6, 3.2); put(9, 10, LEDGE - .6, 21, -1.1, 2.6); put(1, 11, LEDGE - .8, 15.5, -.9, 2.2);   /* 판 가장자리 돌 */

  /* 돌산 (평지 북쪽): 봉우리 3 · 몸통 12 · 4 · 비탈 6 · 무더기 9 · 전망대 7 · 동쪽 절벽 끝 돌길 턱 8 */
  put(3, 0, TOP - 1, -27, .4, 22); put(12, -12, TOP - 1, -19, 1.9, 14); put(4, 13, TOP - 1, -21, -2.2, 13); put(12, -24, TOP - 1, -31, .9, 10); put(4, 24, TOP - 1, -33, 2.6, 10);
  put(6, -22, TOP - .5, -12, 2.4, 7); put(6, 20, TOP - .5, -11, -2.3, 6); put(5, 2, TOP - .5, -12, Math.PI, 7);
  for (const [x, z, s] of [[-6, -13, 3], [9, -12, 2.6], [-17, -24, 3.4], [18, -26, 3], [-30, -24, 2.8], [30, -24, 2.6], [-2, -38, 4], [-38, -6, 2.4], [38, -2, 2.6]]) put(9, x, TOP - .4, z, rnd() * 6, s);
  put(7, -30, TOP - 1.2, 2, .7, 3); put(8, 56, TOP - 3.5, -4, -Math.PI / 2, 7);

  /* 협곡 기둥 바위 (10번 · 밑동은 안개 속) */
  for (const [x, z, r] of PILLARS) { const s = 24 + r * 2; put(10, x, TOP - 7 - s + r, z, rnd() * 6, s * .9, s); put(9, x + 1, TOP - 7.5 + r, z - 1, rnd() * 6, r * .8); }

  /* 같은 조각은 한 번에 그림 */
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3(); let tris = 0, draws = 0;
  for (const [i, list] of Object.entries(inst)) { const m = src[i], im = new THREE.InstancedMesh(m.geometry, m.material, list.length); im.name = 'rock' + i;
    list.forEach(([x, y, z, yaw, s, sy], k) => { e.set(0, yaw, 0); q.setFromEuler(e); m4.compose(pos.set(x, y, z), q, sc.set(s, sy, s)); im.setMatrixAt(k, m4); });
    im.castShadow = im.receiveShadow = true; im.computeBoundingSphere(); G.add(im); tris += m.geometry.index.count / 3 * list.length; draws++; }

  /* 위 평지 땅: 가장자리는 절벽 꼭대기 이끼 속으로 들어감 · 풀색 = 조각 이끼색 · 넓게 얼룩 · 흙길 조금 */
  { const sh = new THREE.Shape(PLATEAU.map(([x, z]) => new THREE.Vector2(x, -z))), gg = new THREE.ShapeGeometry(sh, 1); gg.rotateX(-Math.PI / 2);
    const fine = new THREE.PlaneGeometry(120, 100, 120, 100); fine.rotateX(-Math.PI / 2); fine.translate(0, 0, -15);
    const P = fine.attributes.position, keep = [], col = [];
    for (let v = 0; v < P.count; v++) { const x = P.getX(v), z = P.getZ(v), d = distPoly(PLATEAU, x, z); P.setY(v, TOP + .15 * fbm(x * .2, z * .2) - 7 * Math.max(0, Math.min(1, (d + 7) / 7)) ** 2.2);   /* 가장자리 7m에서 땅이 둥글게 내려가 절벽 꼭대기 이끼 밑으로 숨음 (땅 끝 계단이 안 보임) */
      const n = fbm(x * .06, z * .06), dirt = Math.max(0, 1 - Math.abs(fbm(x * .04 + 3, z * .04) - .5) * 9) * .55, k = .82 + .3 * n;
      const g = [128 / 255, 155 / 255, 24 / 255].map(c => Math.pow(c, 2.2)),   /* 조각 꼭대기 이끼색과 같게 */ dc = [.32, .25, .15];   /* 이끼보다 조금 깊은 풀빛 */
      col.push(...g.map((c, j) => (c * k * (1 - dirt) + dc[j] * dirt * .55))); }
    const ix = []; const W = 121; for (let j = 0; j < 100; j++) for (let i = 0; i < 120; i++) { const a = j * W + i, b = a + 1, c = a + W, d = c + 1, cx = (P.getX(a) + P.getX(d)) / 2, cz = (P.getZ(a) + P.getZ(d)) / 2; if (distPoly(PLATEAU, cx, cz) > -1.5) continue;   /* 땅 끝은 절벽 꼭대기 밑에 숨음 */ ix.push(a, c, b, b, c, d); }
    fine.setIndex(ix); fine.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); fine.computeVertexNormals();
    const ground = new THREE.Mesh(fine, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })); ground.receiveShadow = true; ground.name = 'plateau'; G.add(ground); tris += ix.length / 3; draws++; gg.dispose(); }

  /* 보물방 입구 속: 아치 안쪽이 깊은 어둠 (들어가면 보물 맵으로 바뀌니 속은 안 만듦) */
  { const [aw, ah, ad] = size(11).map(v => v * ARCH.w / size(11)[0]), w = aw * .36, h = ah * .5, sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(-w / 2, h - w / 2); sh.absarc(0, h - w / 2, w / 2, Math.PI, 0, true); sh.lineTo(w / 2, 0); sh.lineTo(-w / 2, 0);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh, 16), new THREE.MeshBasicMaterial({ color: 0x070b0d })); m.position.set(ARCH.x, LEDGE - .4, ARCH.z - ad * .5); G.add(m); draws++; }   /* 아치 구멍 모양(둥근 위)의 어둠 · 아치 틀 뒤에 숨어 가장자리가 안 보임 */

  /* 깊은 협곡: 바닥 (어두운 물빛) · 강 · 안개 세 겹 (천천히 흐름) */
  const mist = [];
  { const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: 0x2c5866 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -40; G.add(floor);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(400, 16), new THREE.MeshBasicMaterial({ color: 0x3f8fb0 })); river.rotation.x = -Math.PI / 2; river.position.set(0, -39.5, 48); river.rotation.z = .08; G.add(river);
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const id = g.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const u = x / 256, v = y / 256; let a = 0; for (let k = 0; k < 4; k++) { const f = 2 ** k * 3; a += pnoise(u * f, v * f, f) / 2 ** k; }   /* 이어지는 무늬 (네모 경계 없음) */ a = Math.max(0, a * .75 - .35) * 1.9; const p = (y * 256 + x) * 4; id.data[p] = id.data[p + 1] = id.data[p + 2] = 255; id.data[p + 3] = Math.min(255, a * 255); }
    g.putImageData(id, 0, 0); const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(5, 5);
    for (const [y, o, sp] of [[MIST - 12, .55, .004], [MIST - 5, .35, -.006], [MIST + 1, .2, .009]]) { const t = tex.clone(); t.needsUpdate = true; const m = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: o, depthWrite: false, color: 0xe6f2f4 })); m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 2; G.add(m); mist.push([t, sp]); draws++; } }

  G.scale.setScalar(SC);
  return { group: G, stats: { tris: Math.round(tris), draws, pieces: Object.fromEntries(Object.entries(inst).map(([k, v]) => [k, v.length])) }, update: (t, dt) => { for (const [tx, sp] of mist) { tx.offset.x += sp * dt; tx.offset.y += sp * .6 * dt; } } };
}

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(0x9fd0ef, 1); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(5, 1, 20, 3000);
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .25; pm.dispose(); }
  /* 맑은 판타지 낮: 하늘빛 위 · 땅빛 아래 · 해는 남동쪽 위 (카메라 쪽 절벽 면이 빛을 받게) */
  scene.add(new THREE.HemisphereLight(0xe4f2ff, 0x4a5a34, .75));
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.9); sun.position.set(40, 90, 60); sun.castShadow = true; Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 300 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0006; sun.shadow.normalBias = .4; scene.add(sun, sun.target);
  onProgress(.2);
  const Z = await buildCliffZone(THREE, renderer); scene.add(Z.group); window.__ZONE = Z; console.log('[절벽 시험 구역]', JSON.stringify(Z.stats)); onProgress(.6);

  /* 기체 (게임과 같은 고르기) */
  const SKINS = forgeList(renderer, camera); let skinId = 'blazedrake'; try { skinId = localStorage.getItem('mj-skin') || skinId; } catch (e) {}
  const FG = await makeForgeShip(renderer, camera, Math.max(0, SKINS.findIndex(s => s.id === skinId)));
  const LV = { cur: 1, to: 1, f: 1, dur: .33, dir: 0, y: LAYERS[1], y0: LAYERS[1], flash: 0 };
  const B = { blocked: (x, z) => blockedAt(x, z, LV.cur) || (LV.to !== LV.cur && blockedAt(x, z, LV.to)), region: () => 0 };
  const START = [-10, 2], fly = await makeFlight(renderer, B, START, 0, FG); scene.add(fly); const FS = fly.userData.S; fly.userData.respawn(START[0], START[1], 0); window.__FS = FS; window.__LV = LV;
  fly.traverse(o => { if (o.isMesh) o.castShadow = true; });
  onProgress(.85);

  /* 높이 바꾸기: 오른쪽 위 세로 칸 (게임과 같은 자리 · 같은 막대 셋) · E 위 · Q 아래 */
  const zone = document.createElement('div'); zone.style.cssText = 'position:absolute;right:max(12px,env(safe-area-inset-right,0px));top:calc(env(safe-area-inset-top,0px) + 76px);width:min(120px,20vw);height:42%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;pointer-events:none;filter:drop-shadow(0 0 3px rgba(0,0,0,.45))';
  const arrow = up => `<svg width="14" height="8" viewBox="0 0 14 8" aria-hidden="true"><path d="${up ? 'M1.5 6.5 7 1.5 12.5 6.5' : 'M1.5 1.5 7 6.5 12.5 1.5'}" fill="none" stroke="rgba(214,222,232,.62)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  zone.innerHTML = arrow(true) + '<span id="pips" style="display:flex;flex-direction:column-reverse;gap:6px"><i></i><i></i><i></i></span>' + arrow(false); $('#ui').append(zone);
  const pips = [...zone.querySelectorAll('#pips i')]; pips.forEach(p => p.style.cssText = 'display:block;width:28px;height:7px;border-radius:4px;background:rgba(255,255,255,.18)');
  const drawPips = () => pips.forEach((p, k) => { const c = LCOL[k].map(v => v * 255 | 0); p.style.background = k === LV.to ? `rgb(${c})` : LV.flash > 0 ? 'rgba(255,80,80,.55)' : 'rgba(255,255,255,.18)'; p.style.boxShadow = k === LV.to ? `0 0 8px rgb(${c})` : 'none'; }); drawPips();
  const say = $('#where'); const tell = () => { if (say) say.textContent = LNAME[LV.to]; }; tell();
  const bodyFree = (x, z, L) => { if (blockedAt(x, z, L)) return false; for (let k = 0; k < 8; k++) if (blockedAt(x + Math.cos(k * .785) * FLY.R * .55, z + Math.sin(k * .785) * FLY.R * .55, L)) return false; return true; };
  const tryLayer = d => { if (LV.cur !== LV.to) return; const to = LV.cur + d; if (to < 0 || to > 2 || !bodyFree(FS.x, FS.z, to)) { LV.flash = .5; drawPips(); return; }   /* 평지 위에서 아래로 = 바위 속 → 안 됨 (빨갛게 깜빡) */
    LV.to = to; LV.f = 0; LV.y0 = LV.y; LV.dir = d; drawPips(); tell(); };
  { const inZone = (x, y) => { const r = zone.getBoundingClientRect(); return x > r.left && x < r.right && y > r.top && y < r.bottom; }; let sw = null;
    addEventListener('pointerdown', e => { if (inZone(e.clientX, e.clientY)) sw = { id: e.pointerId, y: e.clientY, done: false }; });
    addEventListener('pointermove', e => { if (!sw || e.pointerId !== sw.id || sw.done) return; const dy = e.clientY - sw.y; if (Math.abs(dy) > 26) { sw.done = true; tryLayer(dy < 0 ? 1 : -1); } });
    addEventListener('pointerup', e => { if (sw && e.pointerId === sw.id) sw = null; });
    addEventListener('keydown', e => { if (e.key === 'e' || e.key === 'E') tryLayer(1); if (e.key === 'q' || e.key === 'Q') tryLayer(-1); }); }

  /* 카메라: 게임과 같음 (56° · 세로 22m · 높을수록 조금 물러남) */
  const cfg = { ang: 56, dist: 22 }, CAMK = .5 / Math.tan(2.5 * Math.PI / 180); let camD = cfg.dist * CAMK; const cam = { x: START[0], z: START[1] };
  function size() { const r = canvas.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); fly.userData.setPx?.(r.height * renderer.getPixelRatio() / (2 * Math.tan(camera.fov * Math.PI / 360))); }
  addEventListener('resize', size); size();
  const info = $('#info');
  renderer.compile(scene, camera); onProgress(1);
  let t = 0, last = performance.now(), acc = { n: 0, ms: 0, tt: 0 };
  renderer.setAnimationLoop(now => { const c0 = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
    if (LV.f < 1) { LV.f = Math.min(1, LV.f + dt / LV.dur); const k = LV.f * LV.f * (3 - 2 * LV.f); LV.y = LV.y0 + (LAYERS[LV.to] - LV.y0) * k; if (LV.f >= 1) LV.cur = LV.to; }
    if (LV.flash > 0) { LV.flash -= dt; if (LV.flash <= 0) drawPips(); }
    fly.position.y = LV.y - FLY.HOVER; fly.updateMatrixWorld(true); fly.userData.update(t, dt);
    { const S = fly.children[0], e = LV.f < 1 ? Math.sin(LV.f * Math.PI) : 0; S.rotateX(LV.dir * .52 * e); S.updateMatrixWorld(true); }
    FG.step(dt, t, { moving: Math.hypot(FS.vx, FS.vz) > 1.5, fire: false }); Z.update(t, dt);
    const sp = fly.children[0].position; { const k = Math.min(1, dt * 4); cam.x += (sp.x + FS.vx * .25 - cam.x) * k; cam.z += (sp.z + FS.vz * .25 - cam.z) * k; }
    { const f = [.95, 1, 1.25][LV.to]; camD += (cfg.dist * CAMK * f - camD) * Math.min(1, dt * 3); }
    const a = cfg.ang * Math.PI / 180, vx = cam.x, vz = cam.z - camD / CAMK * .15, cy = LV.y;
    if (window.__shotCam) { const c = window.__shotCam; camera.position.set(...c.p); camera.lookAt(...c.t); } else { camera.position.set(vx, cy + camD * Math.sin(a), vz + camD * Math.cos(a)); camera.lookAt(vx, cy, vz); }
    camera.updateMatrixWorld(); sun.position.set(cam.x + 40, 90, cam.z + 60); sun.target.position.set(cam.x, 0, cam.z); sun.target.updateMatrixWorld();
    FG.preRender?.(camera); renderer.render(scene, camera);
    acc.n++; acc.ms += performance.now() - c0; acc.tt += dt; if (acc.tt > .5 && info) { info.textContent = `그리기 ${renderer.info.render.calls}번 · 삼각형 ${renderer.info.render.triangles.toLocaleString()}개 · 계산 ${(acc.ms / acc.n).toFixed(1)}ms`; acc.n = acc.ms = acc.tt = 0; } });
}
