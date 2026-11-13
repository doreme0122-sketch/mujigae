/* 맵 미리보기 — 넓은 우주 맵의 멋을 한눈에
   위에서 내려다본 뷰. 화면 위쪽 = -Z, 오른쪽 = +X, 바닥 평면 XZ.
   곳마다 내 기체가 직접 날아가서 그곳의 쓰임을 보여 준다(모든 움직임에 이유가 있게).
   · 보스 터: 몇 분마다 보스가 나타나는 곳. 홀로그램이 먼저 뜨고 꼬리부터 실체로 차오른다.
   · 웜홀: 들어가면 몸이 빛 조각으로 흩어졌다가 반대편에서 다시 모인다. 목 안쪽은 반대편 하늘.
   · 성운 안개: 안에 들어가면 남의 눈에 안 보인다. 숨어 있다가 기습.
   · 프리즘 결정 숲: 반사한 빛이 지나가면 결정 속에서 색마다 다르게 꺾여 여러 갈래로 갈라진다.
   · 블랙홀: 가까울수록 끌려가며 빨라진다. 가장자리를 스쳐 돌면 확 튕겨 나간다.
   · 소행성 벽: 쏘면 금이 가고 부서진다. 잔해 벽: 안 부서지는 엄폐물 — 적 탄을 막아 준다. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11140005';
import { makePerf } from './perf.js?v=11140005';
import { buildShip, engineSpots } from '../core/ships/build.js?v=11140005';
import { makeGlow } from '../preview/glow.js?v=11140005';
import { planetShader } from '../core/planet.js?v=11140005';
import { planetFor } from '../data/planets.js?v=11140005';
import { filmMaterial, crystalMaterial } from '../preview/fxmat.js?v=11140005';
import { skyMaterial, lensMaterial, diskMaterial, fogMaterial, arenaFloorMaterial, holoMaterial, cutPatch, burnPatch, rockGeometry, crystalGeometry } from './mapfx.js?v=11140005';

const M = new URL('../../assets/models/', import.meta.url).href;
const $ = s => document.querySelector(s);
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const angD = a => THREE.MathUtils.euclideanModulo(a + Math.PI, Math.PI * 2) - Math.PI;
const rnd = (a, b) => a + Math.random() * (b - a);
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const hueRGB = h => { const f = n => { const k = (n + h * 6) % 6; return Math.max(0, Math.min(1, Math.abs(k - 3) - 1)); }; return [f(0), f(4), f(2)]; };
const yawOf = (dx, dz) => Math.atan2(-dx, -dz);

/* ───── 맵 ───── */
const MAP = { x: 120, z: 80 };
/* 판 짜임: 보스 터를 소행성 띠가 궤도처럼 감싸고, 띠의 틈 네 곳에서 빛의 길이 대각선 네 방향으로 뻗는다.
   왼쪽 위 = 성운(식은 가스가 굳어 결정 숲이 자람) · 오른쪽 아래 = 블랙홀(끌려와 부서진 함선이 잔해 벽) · 나머지 두 모서리 = 웜홀 한 쌍 */
const SP = {
  boss: { x: 0, z: 0, r: 18 },
  whA: { x: 98, z: -58, r: 4.2 }, whB: { x: -98, z: 58, r: 4.2 },
  fog: { x: -86, z: -44, r: 22 },
  forest: { x: -50, z: -58, r: 12 },
  bh: { x: 86, z: 44, r: 2.1 },
  rock: { x: 0, z: 34, r: 10 },
  wreck: { x: 52, z: 56, r: 14 }
};
const BELT = { rx: 50, rz: 34 };
const GAPS = [Math.atan2(-50, -64), Math.atan2(-58, 98) , Math.atan2(48, 70), Math.atan2(58, -98)];   /* 틈: 각 모서리 쪽 */
const ZONES = [[-62, -46], [SP.whA.x, SP.whA.z], [68, 46], [SP.whB.x, SP.whB.z]];
const REGIONS = [
  { x: 0, z: 0, r: 30, c: [.5, .44, .3] }, { x: 98, z: -58, r: 32, c: [.42, .22, .8] }, { x: -98, z: 58, r: 32, c: [.22, .36, .9] },
  { x: -86, z: -44, r: 40, c: [.08, .5, .55] }, { x: -50, z: -58, r: 26, c: [.12, .5, .8] }, { x: 86, z: 44, r: 30, c: [.85, .4, .12] },
  { x: 52, z: 56, r: 30, c: [.45, .28, .3] }, { x: 0, z: 0, r: 58, c: [.25, .18, .2], k: .5 }];
const HOLO = [.72, 1, .29];
const PLACES = [
  { id: 'all', name: '전체', h: 238, at: [0, -4] },
  { id: 'boss', name: '보스 터', en: 'CORE ARENA', h: 66, tip: '몇 분마다 보스가 나타나는 곳이에요. 홀로그램 경고가 먼저 뜨고, 보스가 꼬리부터 실체로 차올라요.' },
  { id: 'wh', name: '웜홀', en: 'WORMHOLE', h: 44, tip: '들어가면 몸이 빛 조각으로 흩어졌다가 맵 반대편에서 다시 모여요. 목 안쪽에 비치는 건 반대편 하늘이에요.' },
  { id: 'fog', name: '성운 안개', en: 'NEBULA', h: 46, tip: '안개 속에 있으면 남의 눈에 안 보여요. 숨어 있다가 지나가는 상대를 기습해요.' },
  { id: 'forest', name: '결정 숲', en: 'PRISM GROVE', h: 50, tip: '성운에서 흘러나온 가스가 식어 굳은 결정이에요. 반사한 빛이 지나가면 색마다 다르게 꺾여 여러 갈래로 갈라져요.' },
  { id: 'bh', name: '블랙홀', en: 'BLACK HOLE', h: 52, tip: '가까울수록 끌려가며 빨라져요. 가장자리를 스치듯 돌면 확 튕겨 나가요. 도망치거나 기습할 때 써요.' },
  { id: 'rock', name: '소행성 벽', en: 'ASTEROID WALL', h: 40, tip: '보스 터를 감싸고 도는 궤도 띠예요. 틈 네 곳의 빛의 길로 드나들어요. 쏘면 금이 가다가 부서져요.' },
  { id: 'wreck', name: '잔해 벽', en: 'WRECK WALL', h: 46, tip: '블랙홀에 끌려가다 부서진 함선들이에요. 안 부서지는 엄폐물이라 적 탄을 막아 주고, 틈을 봐서 나가 쏴요.' }];

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .5, 900);
  const bloom = makeBloom(renderer, { samples: 0 });   /* 굴절 판이 덮어 쓰므로 여기선 매끄럽게 계산 안 함 */
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .5; pm.dispose(); }
  const sun = new THREE.DirectionalLight(0xfff2e2, 2.8); sun.position.set(-8, 14, -5); scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8fb0ff, .8); fill.position.set(7, 5, 9); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffa060, .6); rim.position.set(4, -3, -8); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0x7080a8, 0x201828, .45));
  const U = v => ({ value: v }), UT = U(0);

  /* 깊은 우주 (반 크기로 그려서 깐다) */
  /* 바닥: 1챕터 적 행성 표면 (메인 화면과 같은 계산) — 아주 멀리 아래, 맵이 그 위 궤도에 떠 있다 */
  const PL = planetFor(1);
  const planetMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
    uniforms: { uRes: U(new THREE.Vector2(2, 2)), uT: U(0), uYaw: U(PL.yaw0), uPitch: U(PL.tilt), uS: U(0), uFade: U(.5), uR: U(1.7), uC: U(new THREE.Vector2(.5, .5)),
      uSun: U(new THREE.Vector3(...PL.sun)), uDetail: U(1), uSB: U(new THREE.Vector4(0, 0, 9, 0)), uSB2: U(new THREE.Vector4(1, 0, 1, 1)), uSC: U(new THREE.Vector4(0, 0, 9, 0)), uSC2: U(new THREE.Vector4(1, 0, 1, 1)), uStarK: U(1) },
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}', fragmentShader: planetShader(PL, { three: true }) });
  const skyMat = skyMaterial(REGIONS, true);           /* 행성 위에 걸린 구역 색 가스 */
  const skyScene = new THREE.Scene(); skyScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), planetMat)); const hz = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMat); hz.renderOrder = 1; skyScene.add(hz);
  /* 행성은 맵보다 훨씬 아래 — 확대해도 조금만 커지고, 움직이면 맵보다 훨씬 느리게 밀린다 (깊이감) */
  const planetAt = (x, z, h, res) => { const u = planetMat.uniforms; u.uRes.value.copy(res); u.uR.value = 450 / (h + 400);
    const k = .06 / (h * .73); u.uC.value.set(.5 - x * k * res.y / res.x, .5 + z * k);
    u.uYaw.value = PL.yaw0 + S.t * .006; u.uPitch.value = PL.tilt; u.uT.value = S.t; };
  const skyRT = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
  const bgMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { t: U(skyRT.texture), uPx: U(new THREE.Vector2(.002, .004)) },
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: 'precision highp float;varying vec2 vU;uniform sampler2D t;uniform vec2 uPx;void main(){ vec3 c=texture2D(t,vU).rgb*.4; c+=(texture2D(t,vU+vec2(uPx.x,uPx.y)*1.5).rgb+texture2D(t,vU-vec2(uPx.x,uPx.y)*1.5).rgb+texture2D(t,vU+vec2(uPx.x,-uPx.y)*1.5).rgb+texture2D(t,vU-vec2(uPx.x,-uPx.y)*1.5).rgb)*.15; gl_FragColor=vec4(c*.5,1.);}' });   /* 멀리 있어 살짝 흐리게 */
  const bgScene = new THREE.Scene(); bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));
  const bgCam = new THREE.Camera();
  /* 화면 전체를 한 번 그린 뒤 공간 굴절을 입힌다 */
  const rtA = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 0 });
  const lensMat = lensMaterial(); lensMat.uniforms.tS.value = rtA.texture;
  const lensScene = new THREE.Scene(); lensScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lensMat));
  /* 웜홀 목 안쪽에 비칠 반대편 */
  const PR = 256, portRT = [0, 1].map(() => new THREE.WebGLRenderTarget(PR, PR, { type: THREE.HalfFloatType }));
  lensMat.uniforms.tP0.value = portRT[0].texture; lensMat.uniforms.tP1.value = portRT[1].texture;
  const portCam = new THREE.PerspectiveCamera(56, 1, .5, 400);
  const glow = makeGlow(); scene.add(glow.mesh);

  /* ───── 모델 ───── */
  onProgress(.05);
  const loader = new GLTFLoader(), loadM = f => loader.loadAsync(M + f);
  let got = 0; const tick = r => (onProgress(.08 + .6 * (++got / 6)), r);
  const [ship, bossG, ...foeG] = await Promise.all([
    buildShip(1, 1, 'ruby', { renderer, size: 2.0 }).then(tick), loadM('s1_boss.glb').then(tick),
    loadM('s1_a.glb').then(tick), loadM('s1_b.glb').then(tick), loadM('s1_c.glb').then(tick), loadM('s1_elite.glb').then(tick)]);
  const me = new THREE.Group(); me.add(ship.root); scene.add(me);
  const shipModel = ship.root.children[0];
  const shipSz = new THREE.Box3().setFromObject(shipModel).getSize(new THREE.Vector3());
  const ENG = engineSpots(ship.ship, shipModel, shipSz);
  /* 몸을 빛 조각으로 흩을 때 쓸 점들 (기체 기준 자리) */
  const BITS = []; { me.updateMatrixWorld(true); const v = new THREE.Vector3(), all = [];
    me.traverse(o => { if (!o.isMesh) return; const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i += Math.max(1, Math.floor(p.count / 160))) all.push(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).clone()); });
    for (let i = 0; i < 300; i++) BITS.push(all[Math.floor(Math.random() * all.length)]); }

  /* 적 모델 원본: 길이를 맞추고 앞(+Z)이 앞 */
  const proto = (g, len, flip = false) => { const m = g.scene.clone(true), b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
    m.position.sub(c); const h = new THREE.Group(); h.add(m); h.scale.setScalar(len / Math.max(s.x, s.z)); if (flip) h.rotation.y = Math.PI; const o = new THREE.Group(); o.add(h); return o; };
  const cloneMats = o => { o.traverse(n => { if (n.isMesh) { n.material = n.material.clone(); } }); return o; };

  /* ───── 보스 터 ───── */
  const arena = new THREE.Group(); arena.position.set(SP.boss.x, 0, SP.boss.z); scene.add(arena);
  const floorMat = arenaFloorMaterial(SP.boss.r);
  { const f = new THREE.Mesh(new THREE.PlaneGeometry(SP.boss.r * 2.2, SP.boss.r * 2.2), floorMat); f.rotation.x = -Math.PI / 2; f.position.y = -.6; f.renderOrder = 5; arena.add(f); }
  const PYL = []; { const g = new THREE.CylinderGeometry(.32, .78, 3.4, 6), mt = new THREE.MeshStandardMaterial({ color: 0x2c303b, metalness: .9, roughness: .32 });
    const tg = new THREE.OctahedronGeometry(.5), tm = crystalMaterial();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, p = new THREE.Group(); p.position.set(Math.cos(a) * (SP.boss.r + .5), 0, Math.sin(a) * (SP.boss.r + .5));
      const b = new THREE.Mesh(g, mt); b.position.y = .4; p.add(b); const t = new THREE.Mesh(tg, tm); t.position.y = 2.75; t.scale.set(.9, 1.4, .9); p.add(t); arena.add(p); PYL.push({ p, t, a }); } }
  const cutU = { uCut: U(-2), uC: U(new THREE.Vector3()), uAx: U(new THREE.Vector3(0, 0, 1)), uLen: U(7.5) };
  const bossReal = proto(bossG, 15, true), bossHolo = proto(bossG, 15, true);
  bossReal.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); cutPatch(o.material, cutU); } });
  const holoMat = holoMaterial(); Object.assign(holoMat.uniforms, cutU);
  bossHolo.traverse(o => { if (o.isMesh) o.material = holoMat; });
  bossReal.position.y = bossHolo.position.y = 1.4; arena.add(bossReal); arena.add(bossHolo);
  const BC = { len: 26, t: 4 };              /* 보스 한 바퀴: 경고 → 홀로그램 → 실체 → 사라짐 */

  /* ───── 웜홀 둘레로 빨려 드는 빛 ───── */
  const inflow = (n, R0, R1) => Array.from({ length: n }, () => ({ a: rnd(0, 6.28), r: rnd(R0, R1), s: rnd(.6, 1.4), y: rnd(-.6, .6) }));
  const WHP = [inflow(80, 5, 13), inflow(80, 5, 13)], BHP = inflow(150, 3, 14);

  /* ───── 블랙홀 강착 원반 ───── */
  const diskM = diskMaterial(2.7, 10.5);
  const disk = new THREE.Mesh(new THREE.RingGeometry(2.7, 10.5, 160, 6), diskM); disk.rotation.x = -Math.PI / 2 + 1.12; disk.rotation.z = .35;
  disk.position.set(SP.bh.x, -.4, SP.bh.z); disk.renderOrder = 6; scene.add(disk);
  const hole = new THREE.Mesh(new THREE.SphereGeometry(SP.bh.r, 32, 16), new THREE.MeshBasicMaterial({ color: 0 })); hole.position.set(SP.bh.x, -.4, SP.bh.z); scene.add(hole);

  /* ───── 성운 안개 ───── */
  const fogMat = fogMaterial(SP.fog.x, SP.fog.z, SP.fog.r);
  const NF = 22, fogG = new THREE.PlaneGeometry(48, 48); fogG.rotateX(-Math.PI / 2);
  const aL = new Float32Array(NF); for (let i = 0; i < NF; i++) aL[i] = Math.random();
  fogG.setAttribute('aL', new THREE.InstancedBufferAttribute(aL, 1));
  const fog = new THREE.InstancedMesh(fogG, fogMat, NF); fog.renderOrder = 20; fog.frustumCulled = false;
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < NF; i++) { const a = rnd(0, 6.28), r = rnd(0, 3); q.setFromEuler(e.set(0, rnd(0, 6.28), 0));
      m4.compose(new THREE.Vector3(SP.fog.x + Math.cos(a) * r, .7 + i / NF * 4.2, SP.fog.z + Math.sin(a) * r), q, new THREE.Vector3().setScalar(rnd(1, 1.3))); fog.setMatrixAt(i, m4); } }
  scene.add(fog);
  let flashT = 2;

  /* ───── 프리즘 결정 숲 ───── */
  const CRY = []; { const F = SP.forest, E = [SP.fog.x + 15, SP.fog.z - 6];
    for (let c = 0; c < 40; c++) { const seed = c >= 28, u = seed ? Math.random() : 0;   /* 뒤쪽 12개: 안개 가장자리에서 숲까지 띄엄띄엄 자란 작은 결정 */
      const a = rnd(0, 6.28), r = Math.sqrt(Math.random()) * F.r;
      const cx = seed ? lerp(E[0], F.x - 6, u) + rnd(-3, 3) : F.x + Math.cos(a) * r, cz = seed ? lerp(E[1], F.z, u) + rnd(-4, 4) : F.z + Math.sin(a) * r * .8;
      const n = seed ? 1 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 3), big = seed ? rnd(.5, .7 + u * 1.1) : rnd(1.4, 3.6);
      for (let k = 0; k < n; k++) { const s = k === 0 ? big : big * rnd(.3, .65), off = k === 0 ? 0 : rnd(.6, 1.5), b = rnd(0, 6.28);
        CRY.push({ x: cx + Math.cos(b) * off, z: cz + Math.sin(b) * off, h: s, w: rnd(.8, 1.5) * (k === 0 ? 1.4 : 1), tx: (k === 0 ? rnd(-.1, .1) : Math.cos(b) * rnd(.18, .4)), tz: (k === 0 ? rnd(-.1, .1) : Math.sin(b) * rnd(.18, .4)), ry: rnd(0, 6.28), lit: 0 }); } } }
  const cryMat = new THREE.MeshPhysicalMaterial({ color: 0xa8dcff, metalness: .25, roughness: .06, iridescence: .55, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 480], clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 2.2, emissive: 0x1a6aa0, emissiveIntensity: .55, flatShading: true });
  const cry = new THREE.InstancedMesh(crystalGeometry(), cryMat, CRY.length); scene.add(cry);
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    CRY.forEach((c, i) => { q.setFromEuler(e.set(c.tx, c.ry, c.tz, 'YXZ')); m4.compose(new THREE.Vector3(c.x, -.8, c.z), q, new THREE.Vector3(c.w, c.h, c.w)); cry.setMatrixAt(i, m4);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q); c.tipX = c.x + up.x * c.h * 1.5; c.tipY = -.8 + up.y * c.h * 1.5; c.tipZ = c.z + up.z * c.h * 1.5; }); }

  /* ───── 빛의 길: 보스 터에서 띠의 틈을 지나 네 모서리로 ───── */
  const ellP = (th, k) => [Math.cos(th) * BELT.rx * k, Math.sin(th) * BELT.rz * k];
  const HW = GAPS.map((g, i) => { const c = new THREE.CatmullRomCurve3([[Math.cos(g) * 21, Math.sin(g) * 21], ellP(g, .8), ellP(g, 1.2), ZONES[i]].map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
    const N = 240, P = c.getSpacedPoints(N), len = c.getLength();
    return { P, N, len, F: Array.from({ length: 70 }, (_, j) => ({ u: Math.random(), dir: j % 2 ? 1 : -1, sp: rnd(9, 15), r: Math.random() })) }; });
  const hwAt = (h, u, out) => { const f = clamp(u, 0, 1) * h.N, i = Math.min(h.N - 1, Math.floor(f)), k = f - i, a = h.P[i], b = h.P[i + 1];
    out[0] = a.x + (b.x - a.x) * k; out[1] = a.z + (b.z - a.z) * k; out[2] = b.x - a.x; out[3] = b.z - a.z; const l = Math.hypot(out[2], out[3]) || 1; out[2] /= l; out[3] /= l; return out; };
  /* ───── 블랙홀로 끌려가는 잔해 줄기 ───── */
  const STR_C = new THREE.CatmullRomCurve3([[30, 62], [44, 60], [58, 57], [70, 52], [78, 47], [82, 40], [90, 39], [93, 46], [88, 51], [82, 48], [84, 43], [87, 45], [86, 44]].map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
  const STR_P = STR_C.getSpacedPoints(300);
  const debMat = new THREE.MeshStandardMaterial({ color: 0x2a2826, metalness: .85, roughness: .38, envMapIntensity: .6 }); burnPatch(debMat, UT, 9.3);
  const NS = 90, strIM = new THREE.InstancedMesh(rockGeometry(4.4, 1), debMat, NS); scene.add(strIM);
  const STR = Array.from({ length: NS }, () => ({ u: Math.random(), off: rnd(-3.5, 3.5), y: rnd(-1.2, .4), s: rnd(.12, .45), q: new THREE.Quaternion().random(), w: new THREE.Vector3().randomDirection().multiplyScalar(rnd(.3, 1.6)), em: Math.random() < .3 }));
  /* ───── 성운 가스가 흘러 나와 결정 숲으로 ───── */
  const WISP = Array.from({ length: 34 }, () => ({ u: Math.random(), off: rnd(-5, 5), r: rnd(2.2, 4.5), ph: rnd(0, 6.28), sp: rnd(.025, .05) }));


  const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: .04, envMapIntensity: .35 });
  rockMat.onBeforeCompile = sh => {                /* 표면 잔결: 작은 돌기·긁힌 결에 빛이 걸린다 */
    sh.vertexShader = 'varying vec3 vRp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vRp=position;');
    sh.fragmentShader = `varying vec3 vRp; float rh(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
      float rn(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(rh(i),rh(i+vec3(1,0,0)),f.x),mix(rh(i+vec3(0,1,0)),rh(i+vec3(1,1,0)),f.x),f.y),mix(mix(rh(i+vec3(0,0,1)),rh(i+vec3(1,0,1)),f.x),mix(rh(i+vec3(0,1,1)),rh(i+vec3(1,1,1)),f.x),f.y),f.z); }\n` + sh.fragmentShader
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec3 q=vRp*7.; float e=.02; float h0=rn(q)+rn(q*2.3)*.5; vec3 g=vec3(rn(q+vec3(e,0,0))+rn((q+vec3(e,0,0))*2.3)*.5-h0, rn(q+vec3(0,e,0))+rn((q+vec3(0,e,0))*2.3)*.5-h0, rn(q+vec3(0,0,e))+rn((q+vec3(0,0,e))*2.3)*.5-h0)/e;
          normal=normalize(normal-(mat3(viewMatrix)*g)*.035); diffuseColor.rgb*=.8+.4*rn(q*3.1); }`); };
  const RG = [0, 1, 2, 3, 4].map(i => rockGeometry(i * 3.7 + 1.3, 3)), ROCK = [], NR = 64;
  const inGap = th => GAPS.some(g => Math.abs(angD(th - g)) < .2);
  const beltAt = () => { let th; do th = rnd(-Math.PI, Math.PI); while (inGap(th)); return new THREE.Vector2(Math.cos(th) * BELT.rx, Math.sin(th) * BELT.rz); };
  const rockIM = RG.map(g => { const m = new THREE.InstancedMesh(g, rockMat, NR); scene.add(m); return m; });
  const TR = { x: -6, z: BELT.rz * Math.sqrt(1 - .0144) - .5, s: 2.4, hp: 1, broken: false, t: 0 }, RP = { x: TR.x - 1, z: TR.z + 10 };
  const inLane = (x, z, s) => { const dx = RP.x - TR.x, dz = RP.z - TR.z, l2 = dx * dx + dz * dz, u = clamp(((x - TR.x) * dx + (z - TR.z) * dz) / l2, 0, 1); return Math.hypot(x - TR.x - dx * u, z - TR.z - dz * u) < 2.6 + s; };
  for (let gi = 0; gi < RG.length; gi++) for (let i = 0; i < NR; i++) { let x, z, s;
    do { const p = beltAt(), big = Math.random() < .14, side = rnd(-1, 1) * (big ? 2.2 : 5); const l = p.length(); s = big ? rnd(2, 3.6) : rnd(.45, 1.5); x = p.x + p.x / l * side; z = p.y + p.y / l * side; } while (inLane(x, z, s));
    ROCK.push({ gi, i, x, z, s, y: rnd(-1.2, .6), q: new THREE.Quaternion().random(), w: new THREE.Vector3().randomDirection().multiplyScalar(rnd(.03, .25)) }); }
  /* 쏘아서 부술 바위 */
  const crackU = { uCrack: U(0), uHeat: U(0) };
  const tRockMat = rockMat.clone(); tRockMat.onBeforeCompile = sh => { Object.assign(sh.uniforms, crackU);
    sh.vertexShader = 'varying vec3 vOp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOp=position;');
    sh.fragmentShader = `uniform float uCrack,uHeat; varying vec3 vOp;
      float hc(vec3 p){ return fract(sin(dot(floor(p),vec3(127.1,311.7,74.7)))*43758.5453); }
      float vcell(vec3 p){ vec3 i=floor(p),f=fract(p); float a=9.,b=9.; for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){ vec3 g=vec3(x,y,z); vec3 o=vec3(hc(i+g),hc(i+g+5.3),hc(i+g+9.1)); float d=length(g+o-f); if(d<a){b=a;a=d;}else if(d<b)b=d; } return b-a; }\n` + sh.fragmentShader
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float cr=smoothstep(.09,0.,vcell(vOp*2.3))*uCrack; totalEmissiveRadiance+=vec3(1.,.42,.12)*(cr*3.+uHeat*.35);`); };
  const tRock = new THREE.Mesh(RG[0], tRockMat); tRock.position.set(TR.x, 0, TR.z); tRock.scale.setScalar(TR.s); scene.add(tRock);
  const CHUNK = []; for (let i = 0; i < 16; i++) { const o = new THREE.Mesh(RG[i % 5], rockMat); o.visible = false; scene.add(o); CHUNK.push({ o, vx: 0, vy: 0, vz: 0, w: new THREE.Vector3(), s: 1 }); }

  /* ───── 잔해 벽 ───── */
  const WRECK = [], HULL = [];
  { const W = SP.wreck, list = [[bossG, 21, 46, 52, 0, .42, -.6], [foeG[3], 12, 63, 62, .3, -.55, -.2], [foeG[0], 8.5, 32, 61, -.4, .3, -.9], [foeG[1], 9, 30, 46, .5, -.25, -.4], [foeG[2], 7, 70, 54, -.2, .7, -1.1]];
    list.forEach(([g, len, x, z, yo, roll, y], i) => { const yaw = Math.atan2(SP.bh.x - x, SP.bh.z - z) + yo, o = cloneMats(proto(g, len));   /* 머리가 블랙홀 쪽: 끌려가는 중 */ o.position.set(x, y, z); o.rotation.set(rnd(-.15, .15), yaw, roll, 'YXZ'); scene.add(o);
      o.traverse(n => { if (n.isMesh) burnPatch(n.material, UT, i * 3.1 + 1); });
      const fx = Math.sin(yaw), fz = Math.cos(yaw);                     /* 길이 방향으로 막는 동그라미 몇 개 */
      for (let k = -2; k <= 2; k++) HULL.push({ x: x + fx * k * len * .2, z: z + fz * k * len * .2, r: len * (k === 0 ? .17 : .13) });
      WRECK.push({ o, len, spin: rnd(-.01, .01) }); }); }

  /* ───── 적들 (곳마다 하나씩) ───── */
  const mkFoe = (g, len) => { const o = cloneMats(proto(g, len)); scene.add(o); const mats = []; o.traverse(n => { if (n.isMesh) { n.material.emissive = new THREE.Color(0); mats.push(n.material); } }); return { o, mats, flash: 0 }; };
  const fogBot = mkFoe(foeG[2], 2.4), grovFoe = mkFoe(foeG[3], 3.4), wreckFoe = mkFoe(foeG[1], 2.6);
  const GF = { x: SP.forest.x + 20, z: SP.forest.z + 1, hp: 3, dead: 0, ph: 'wait', t: 1.5 };
  const WF = { x: 46, z: 34, t: 0, ph: 'volley', shot: 0 };
  const FB = { a: 0, x: 0, z: 0 };

  /* 내 방패 */
  const shieldMat = filmMaterial(); shieldMat.uniforms.uArc.value = .4;
  const shield = new THREE.Mesh(new THREE.SphereGeometry(1.35, 48, 24), shieldMat); shield.renderOrder = 11; scene.add(shield);

  /* ───── 상태 ───── */
  const S = { t: 0, ts: 1, slowT: 0, stopT: 0, shake: 0, place: 'boss', prog: null, free: false,
    m: { x: 0, z: 24, yaw: -Math.PI / 2, roll: 0, v: 0, vx: 0, vz: 0, hide: false },
    path: null, hold: null, warp: null, fire: null, parts: [], bits: [], shots: [], fshots: [], bolts: [], trail: [], shI: 0 };
  const cam = { x: 0, z: 24, h: 58, H: 58, tx: 0, tz: 24 };

  /* ───── 길 따라 날기 (머리가 늘 먼저 간다) ───── */
  function fly(pts, speed, onEnd) {
    const m = S.m, P = [new THREE.Vector3(m.x, 0, m.z), new THREE.Vector3(m.x - Math.sin(m.yaw) * 5, 0, m.z - Math.cos(m.yaw) * 5), ...pts.map(p => new THREE.Vector3(p[0], 0, p[1]))];
    const c = new THREE.CatmullRomCurve3(P, false, 'centripetal'); S.path = { c, len: c.getLength(), s: 0, speed, onEnd }; S.hold = null; }
  function loopPath(pts, speed, onEnd) { const P = pts.map(p => new THREE.Vector3(p[0], 0, p[1])); const c = new THREE.CatmullRomCurve3(P, false, 'centripetal'); S.path = { c, len: c.getLength(), s: 0, speed, onEnd }; S.hold = null; }
  function hold(x, z, aim) { S.path = null; S.hold = { x, z, aim }; }
  const shipNose = () => [S.m.x - Math.sin(S.m.yaw) * 1, S.m.z - Math.cos(S.m.yaw) * 1];

  /* ───── 빛·불꽃 ───── */
  const part = o => S.parts.push(Object.assign({ y: .35, vy: 0, age: 0, drag: 1.5, tail: .03, k: 2, a: 1, r: .08, c: [1, .8, .5] }, o));
  function sparks(x, z, n, c, sp = 9, nx = 0, nz = 0) { for (let i = 0; i < n; i++) { const a = Math.atan2(nz, nx) + (nx || nz ? rnd(-1.2, 1.2) : rnd(0, 6.28)), s = sp * rnd(.3, 1);
    part({ x, z, vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: rnd(-1, 2), life: rnd(.25, .6), r: rnd(.04, .09), k: 2, c, tail: .035 }); } }
  function flash(x, z, r, c, life = .28, y = .4) { part({ x, z, y, vx: 0, vz: 0, life, r, k: 3, c, a: 1.4, grow: 1 }); }
  function boom(x, z, s = 1) { flash(x, z, 3.2 * s, [1.4, .55, .2], .45); flash(x, z, 1.3 * s, [1.6, 1.4, 1.1], .18); sparks(x, z, 30, [1.3, .6, .25], 13 * s);
    for (let i = 0; i < 10; i++) { const a = rnd(0, 6.28), sp = rnd(1, 4) * s; part({ x, z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, life: rnd(.6, 1.1), r: rnd(.5, 1.1) * s, k: 3, c: [.5, .25, .12], a: .5, drag: 2.5, grow: .6 }); } S.shake = Math.max(S.shake, .25 * s); }

  /* ───── 내 기본탄 ───── */
  function shootTwin(ax, az) { const [nx, nz] = shipNose(), rx = -az, rz = ax;
    for (const s of [-1, 1]) S.shots.push({ x: nx + rx * .32 * s, z: nz + rz * .32 * s, vx: ax * 26, vz: az * 26, life: 1.2 }); }

  /* ───── 웜홀 지나가기 ───── */
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpV = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);
  function poseBits(x, z, yaw, out) { tmpQ.setFromEuler(tmpE.set(0, yaw, 0, 'YXZ')); tmpM.compose(tmpV.set(x, .4, z), tmpQ, ONE); return BITS.map(b => b.clone().applyMatrix4(tmpM)); }
  function warp(from, to, outYaw, after) {
    const m = S.m, pts = poseBits(m.x, m.z, m.yaw, true), t0 = S.t;
    pts.forEach((p, i) => { const d = Math.hypot(p.x - from.x, p.z - from.z); S.bits.push({ x0: p.x, y0: p.y, z0: p.z, x1: from.x, y1: .2, z1: from.z, t0: t0 + d * .03 + Math.random() * .08, dur: .42 + Math.random() * .12, sw: rnd(1.5, 3) * (i % 2 ? 1 : -1), hue: i / pts.length, out: false }); });
    flash(from.x, from.z, 2.6, [.8, .7, 1.4], .35);
    S.warp = { t: 0, from, to, outYaw, after, done: false }; S.trail.length = 0; S.path = null; S.hold = null; me.visible = false; S.slowT = .25; }
  function warpStep(dt) { const W = S.warp; if (!W) return; W.t += dt;
    if (W.t > .55 && !W.spawned) { W.spawned = true; const ox = W.to.x - Math.sin(W.outYaw) * 2.2, oz = W.to.z - Math.cos(W.outYaw) * 2.2, tgt = poseBits(ox, oz, W.outYaw), t0 = S.t + .45;
      tgt.forEach((p, i) => S.bits.push({ x0: W.to.x, y0: .2, z0: W.to.z, x1: p.x, y1: p.y, z1: p.z, t0: t0 + Math.random() * .1, dur: .4 + Math.random() * .12, sw: rnd(1.5, 3) * (i % 2 ? 1 : -1), hue: i / tgt.length, out: true }));
      W.ox = ox; W.oz = oz; }
    if (W.t > 1.5 && !W.done) { W.done = true; const m = S.m; m.x = W.ox; m.z = W.oz; m.yaw = W.outYaw; m.v = 8; me.visible = true; S.trail.length = 0;
      flash(m.x, m.z, 2.2, [.8, .9, 1.4], .3); sparks(m.x, m.z, 24, [.8, .85, 1.3], 8); S.slowT = .2; S.warp = null; W.after(); } }

  /* ───── 곳마다 하는 일 ───── */
  const P = {};
  P.boss = () => { const pts = []; for (let i = 0; i <= 16; i++) { const a = Math.atan2(S.m.z, S.m.x) - i / 16 * Math.PI * 2; pts.push([Math.cos(a) * 25, Math.sin(a) * 25]); } loopPath(pts, () => 8.5, P.boss); };
  P.all = P.boss;
  const whOut = W => { const l = Math.hypot(W.x, W.z); return [-W.x / l, -W.z / l]; };
  function whDive(from, to) {           /* from 쪽으로 들어가서 to 로 나온다 */
    const [ox, oz] = whOut(from); loopPath([[S.m.x, S.m.z], [from.x + ox * 9, from.z + oz * 9], [from.x + ox * 3, from.z + oz * 3], [from.x, from.z]],
      () => { const d = Math.hypot(S.m.x - from.x, S.m.z - from.z); return 10 + 26 * clamp(1 - d / 10, 0, 1); },
      () => { const [tx, tz] = whOut(to); warp(from, to, yawOf(tx, tz), () => whSwing(to, from)); }); }
  function whSwing(at, other) { const [ox, oz] = whOut(at), sx = -oz, sz = ox;
    loopPath([[S.m.x, S.m.z], [at.x + ox * 9, at.z + oz * 9], [at.x + ox * 17 + sx * 6, at.z + oz * 17 + sz * 6], [at.x + ox * 16 + sx * 15, at.z + oz * 16 + sz * 15], [at.x + ox * 8 + sx * 13, at.z + oz * 8 + sz * 13], [at.x + ox * 12 + sx * 2, at.z + oz * 12 + sz * 2]],
      () => 11, () => whDive(at, other)); }
  P.wh = () => whDive(SP.whA, SP.whB);
  const FOGH = [[SP.fog.x - 5, SP.fog.z + 4], [SP.fog.x + 6, SP.fog.z - 3]]; let fogI = 0;
  P.fog = () => { const [hx, hz] = FOGH[fogI]; fly([[hx + 4, hz + 3], [hx, hz]], () => S.m.hide ? 4 : 12, () => {
    hold(hx, hz, null); S.prog = { kind: 'fog', t: 0 }; }); };
  const GP = { x: SP.forest.x - 20, z: SP.forest.z + 1 };
  P.forest = () => fly([[GP.x - 6, GP.z + 4], [GP.x, GP.z]], () => 12, () => { hold(GP.x, GP.z, [1, 0]); S.prog = { kind: 'forest' }; });
  P.bh = () => { const B = SP.bh, ra = 6.6, a0 = 2.75, pts = [];
    const ar = u => { const a = a0 - u * 4.4; return [B.x + Math.cos(a) * ra, B.z + Math.sin(a) * ra]; };
    const tA = [Math.sin(a0), -Math.cos(a0)], tE = (() => { const a = a0 - 4.4; return [Math.sin(a), -Math.cos(a)]; })();
    const s0 = ar(0), e0 = ar(1);
    pts.push([s0[0] - tA[0] * 26, s0[1] - tA[1] * 26], [s0[0] - tA[0] * 12, s0[1] - tA[1] * 12]);
    for (let i = 0; i <= 12; i++) pts.push(ar(i / 12));
    pts.push([e0[0] + tE[0] * 14, e0[1] + tE[1] * 14], [e0[0] + tE[0] * 30, e0[1] + tE[1] * 30]);
    const back = [[B.x - 44, B.z - 12], [B.x - 33, B.z - 28]];
    const go = () => loopPath([[S.m.x, S.m.z], ...pts, ...back], () => { const d = Math.hypot(S.m.x - B.x, S.m.z - B.z); return 12 + 170 / (d + 2.5); }, go);
    fly([pts[0]], () => 14, go); };
  P.rock = () => fly([[RP.x + 6, RP.z + 6], [RP.x, RP.z]], () => 12, () => { hold(RP.x, RP.z, [TR.x - RP.x, TR.z - RP.z]); S.prog = { kind: 'rock', t: 0 }; });
  const WH = { x: 47, z: 60 }, WP = { x: 61, z: 47 };
  P.wreck = () => fly([[WH.x + 8, WH.z + 4], [WH.x, WH.z]], () => 12, () => { hold(WH.x, WH.z, [WF.x - WH.x, WF.z - WH.z]); S.prog = { kind: 'wreck', t: 0, ph: 'cover' }; });

  function go(id) { S.place = id; S.prog = null; S.free = false; S.m.hide = false;
    const pl = PLACES.find(p => p.id === id); cam.H = pl.h;
    document.querySelectorAll('#tour button').forEach(b => b.classList.toggle('on', b.dataset.id === id));
    $('#tip').hidden = !pl.tip; if (pl.tip) { $('#tip b').textContent = pl.name; $('#tip span').textContent = pl.tip; }
    if (S.warp) return;
    const T = { boss: [0, 25], all: [0, 25], wh: [SP.whA.x - 15, SP.whA.z + 9], fog: FOGH[0], forest: [GP.x, GP.z], bh: [SP.bh.x - 20, SP.bh.z - 10], rock: [RP.x, RP.z], wreck: [WH.x, WH.z] }[id];
    const d = Math.hypot(T[0] - S.m.x, T[1] - S.m.z);
    if (d > 30) fly(route([S.m.x, S.m.z], T), () => 30, P[id]); else P[id](); }
  const inBelt = (x, z) => (x / BELT.rx) ** 2 + (z / BELT.rz) ** 2 < 1;
  const gapOf = (x, z) => { const th = Math.atan2(z / BELT.rz, x / BELT.rx); let bi = 0, bd = 9; GAPS.forEach((g, i) => { const d = Math.abs(angD(th - g)); if (d < bd) { bd = d; bi = i; } }); return GAPS[bi]; };
  function route(a, b) { const pts = [], ai = inBelt(a[0], a[1]), bi = inBelt(b[0], b[1]), ga = gapOf(a[0], a[1]), gb = gapOf(b[0], b[1]);
    if (!ai && !(!bi && ga === gb)) pts.push(ellP(ga, 1.25), ellP(ga, .75));
    if (!bi && !(!ai && ga === gb)) pts.push(ellP(gb, .75), ellP(gb, 1.25));
    pts.push(b); return pts; }

  /* ───── 한 걸음 ───── */
  const v3 = new THREE.Vector3(), v3b = new THREE.Vector3();
  function step(dt, real) {
    const t = S.t += dt, m = S.m; UT.value = t;
    /* 길 따라 */
    const px = m.x, pz = m.z, pyaw = m.yaw;
    if (S.path) { const p = S.path, want = p.speed(); m.v += clamp(want - m.v, -40 * dt, 40 * dt); p.s += m.v * dt;
      if (p.s >= p.len) { const f = p.onEnd; S.path = null; f && f(); }
      else { p.c.getPointAt(p.s / p.len, v3); p.c.getTangentAt(p.s / p.len, v3b); m.x = v3.x; m.z = v3.z; m.yaw += angD(yawOf(v3b.x, v3b.z) - m.yaw) * Math.min(1, dt * 14); } }
    else if (S.hold) { const h = S.hold; m.v *= Math.pow(.02, dt);
      m.x += (h.x + Math.sin(t * .7) * .25 - m.x) * Math.min(1, dt * 2); m.z += (h.z + Math.cos(t * .55) * .2 - m.z) * Math.min(1, dt * 2);
      if (h.aim) m.yaw += angD(yawOf(h.aim[0], h.aim[1]) - m.yaw) * Math.min(1, dt * 5); }
    m.vx = (m.x - px) / Math.max(dt, 1e-4); m.vz = (m.z - pz) / Math.max(dt, 1e-4);
    const turn = angD(m.yaw - pyaw) / Math.max(dt, 1e-4);
    if (dt > 0) m.roll += (clamp(-turn * .11, -.9, .9) - m.roll) * Math.min(1, dt * 6);
    me.rotation.order = 'YXZ'; me.position.set(m.x, .4 + Math.sin(t * 1.6) * .06, m.z); me.rotation.set(0, m.yaw, m.roll);
    warpStep(dt);
    m.hide = Math.hypot(m.x - SP.fog.x, m.z - SP.fog.z) < SP.fog.r * .62;

    /* 곳마다 */
    const pr = S.prog;
    if (pr && pr.kind === 'fog') { pr.t += dt; const [nx, nz] = [FB.x - m.x, FB.z - m.z], d = Math.hypot(nx, nz);
      if (!pr.fire && pr.t > 2.5 && d < 11) { pr.fire = true; pr.ft = 0; S.hold.aim = [nx, nz]; }
      if (pr.fire) { S.hold.aim = [nx, nz]; pr.ft += dt; if ((pr.cd = (pr.cd || 0) - dt) <= 0 && Math.abs(angD(yawOf(nx, nz) - m.yaw)) < .25) { pr.cd = .13; shootTwin(nx / d, nz / d); }
        if (pr.ft > 1.4) { fogI = 1 - fogI; S.prog = null; P.fog(); } }
      else if (pr.t > 7) { fogI = 1 - fogI; S.prog = null; P.fog(); } }
    if (pr && pr.kind === 'rock') { pr.t += dt;
      if (!TR.broken && pr.t > .8) { if ((pr.cd = (pr.cd || 0) - dt) <= 0) { pr.cd = .13; const dx = TR.x - m.x, dz = TR.z - m.z, l = Math.hypot(dx, dz); shootTwin(dx / l, dz / l); } } }
    if (pr && pr.kind === 'wreck') { pr.t += dt;
      if (pr.ph === 'cover' && pr.t > 3.2) { pr.ph = 'peek'; pr.t = 0; fly([[WH.x + 3, WH.z + 7], [WP.x, WP.z]], () => 9, () => { hold(WP.x, WP.z, [WF.x - WP.x, WF.z - WP.z]); pr.ph = 'shoot'; pr.t = 0; }); }
      if (pr.ph === 'shoot') { const dx = WF.x - m.x, dz = WF.z - m.z, l = Math.hypot(dx, dz);
        if ((pr.cd = (pr.cd || 0) - dt) <= 0 && pr.t > .35) { pr.cd = .13; shootTwin(dx / l, dz / l); }
        if (pr.t > 1.5) { pr.ph = 'back'; fly([[WH.x + 3, WH.z + 7], [WH.x, WH.z]], () => 10, () => { hold(WH.x, WH.z, [WF.x - WH.x, WF.z - WH.z]); pr.ph = 'cover'; pr.t = 0; }); } } }

    /* 보스 터: 경고 → 홀로그램 → 꼬리부터 실체 → 머물기 → 흩어짐 */
    BC.t = (BC.t + dt) % BC.len; const bt = BC.t;
    const warn = bt > 5 && bt < 8 ? .5 + .5 * Math.sin(bt * 12) : 0;
    floorMat.uniforms.uT.value = t; floorMat.uniforms.uWarn.value = bt > 5 && bt < 12 ? 1 : 0; floorMat.uniforms.uI.value = .32 + warn * .5 + (bt > 8 && bt < 21 ? .25 : 0);
    const holoI = bt < 8 ? 0 : bt < 9.5 ? (bt - 8) / 1.5 : bt < 21 ? 1 : bt < 22.5 ? 1 - (bt - 21) / 1.5 : 0;
    const cut = bt < 9.5 ? -1.2 : bt < 13 ? lerp(-1.2, 1.2, ease((bt - 9.5) / 3.5)) : bt < 19 ? 1.2 : bt < 22 ? lerp(1.2, -1.2, ease((bt - 19) / 3)) : -1.2;
    holoMat.uniforms.uI.value = holoI * (bt > 13 && bt < 19 ? .0 : 1); holoMat.uniforms.uT.value = t; cutU.uCut.value = cut;
    bossReal.visible = cut > -1.15; bossHolo.visible = holoI > .01;
    { const yaw = t * .12; bossReal.rotation.y = bossHolo.rotation.y = yaw; const hb = 1.4 + Math.sin(t * .9) * .12; bossReal.position.y = bossHolo.position.y = hb;
      cutU.uC.value.set(SP.boss.x, hb, SP.boss.z); cutU.uAx.value.set(Math.sin(yaw), 0, Math.cos(yaw));
      if (cut > -1.1 && cut < 1.1 && Math.random() < dt * 40) { const s = cut * 7.5, sx = SP.boss.x + Math.sin(yaw) * s + rnd(-1.5, 1.5) * Math.cos(yaw), sz = SP.boss.z + Math.cos(yaw) * s - rnd(-1.5, 1.5) * Math.sin(yaw); sparks(sx, sz, 2, [.8, 1.1, .5], 4); } }
    for (const p of PYL) { const b = Math.sin(t * 1.2 + p.a * 3) * .15; p.t.position.y = 2.75 + b; p.t.rotation.y = t * .6 + p.a;
      const wx = SP.boss.x + p.p.position.x, wz = SP.boss.z + p.p.position.z;
      glow.add(wx, 3.1 + b, wz, 0, 0, 0, .55 + warn * .5, 3, warn > 0 ? [1.2, .4, .2] : [.55, .8, .35], .35 + warn * .7);
      glow.add(wx, 3.1 + b, wz, 0, 0, 0, .1, 1, [1, 1, 1], .6 + warn * .5); }

    /* 웜홀·블랙홀 둘레로 빨려 드는 빛 */
    [SP.whA, SP.whB].forEach((W, wi) => { for (const p of WHP[wi]) { p.r -= dt * (1.2 + 6 / p.r) * p.s; p.a += dt * 3.2 / p.r * p.s; if (p.r < SP.whA.r * .9) { p.r = rnd(9, 13); p.a = rnd(0, 6.28); }
      const x = W.x + Math.cos(p.a) * p.r, z = W.z + Math.sin(p.a) * p.r, tx = -Math.sin(p.a) * 3.2 / p.r - Math.cos(p.a) * .3, tz = Math.cos(p.a) * 3.2 / p.r - Math.sin(p.a) * .3;
      const k = clamp((13 - p.r) / 3, 0, 1) * clamp((p.r - SP.whA.r) / 2, 0, 1);
      glow.add(x, p.y, z, -tx * .5, 0, -tz * .5, .05, 2, wi ? [.5, .7, 1.4] : [.9, .5, 1.4], k * .9); } });
    for (const p of BHP) { p.r -= dt * (.6 + 9 / p.r) * p.s; p.a += dt * 7 / Math.pow(p.r, 1.2) * p.s; if (p.r < 2.6) { p.r = rnd(9, 14); p.a = rnd(0, 6.28); }
      const x = SP.bh.x + Math.cos(p.a) * p.r, z = SP.bh.z + Math.sin(p.a) * p.r * .94, k = clamp((14 - p.r) / 4, 0, 1);
      const sp = 7 / Math.pow(p.r, 1.2), tx = -Math.sin(p.a) * sp, tz = Math.cos(p.a) * sp;
      glow.add(x, -.2 + p.y * .3, z, -tx * .12, 0, -tz * .12, .06, 2, p.r < 5 ? [1.4, 1.2, 1] : [1.4, .65, .25], k * .8); }
    diskM.uniforms.uT.value = t;

    /* 성운: 속에서 이따금 번쩍 */
    fogMat.uniforms.uT.value = t; const fl = fogMat.uniforms.uFlash.value; fl.w *= Math.pow(.02, dt);
    if ((flashT -= dt) < 0) { flashT = rnd(1.4, 4); fl.set(SP.fog.x + rnd(-12, 12), SP.fog.z + rnd(-10, 10), 0, rnd(.6, 1.2)); }
    FB.a += dt * .42; FB.x = SP.fog.x + Math.cos(FB.a) * 8.5; FB.z = SP.fog.z + Math.sin(FB.a) * 7;
    fogBot.o.position.set(FB.x, .3, FB.z); fogBot.o.rotation.y = yawOf(-Math.sin(FB.a), Math.cos(FB.a) * .82) + Math.PI;
    engine(fogBot.o, .55, [1.4, .5, .15]);

    /* 결정 숲: 신호 → 빠른 탄 → 완벽 반사 → 결정마다 갈라지는 빛 */
    grovFoe.o.visible = GF.dead <= 0;
    if (GF.dead > 0) { GF.dead -= dt; if (GF.dead <= 0) { GF.hp = 3; GF.ph = 'wait'; GF.t = 1; flash(GF.x, GF.z, 2, [1.2, .5, .25], .4); } }
    else { grovFoe.o.position.set(GF.x, .3, GF.z); grovFoe.o.rotation.y = yawOf(m.x - GF.x, m.z - GF.z) + Math.PI;
      engine(grovFoe.o, .8, [1.4, .5, .15]);
      const near = S.prog && S.prog.kind === 'forest';
      if (near) { GF.t -= dt;
        if (GF.ph === 'wait' && GF.t <= 0) { GF.ph = 'sig'; GF.t = .9; }
        if (GF.ph === 'sig') { const e = 1 - GF.t / .9, nx = GF.x - 1.9, nz = GF.z;
          glow.add(nx, .45, nz, 0, 0, 0, (.08 + .22 * e), 0, [1, .22, .12], 1, 7); glow.add(nx, .45, nz, 0, 0, 0, .3 + 1.1 * e, 3, [1.2, .35, .12], .55 + .45 * e);
          if (GF.t <= 0) { GF.ph = 'shot'; const dx = m.x - nx, dz = m.z - nz, l = Math.hypot(dx, dz); S.fshots.push({ x: nx, z: nz, vx: dx / l * 17, vz: dz / l * 17, r: .3, fast: true, life: 4 }); } } } }
    /* 잔해 벽 적: 느린 탄을 계속 쏜다 — 벽이 막아 준다 */
    { const near = S.prog && S.prog.kind === 'wreck'; wreckFoe.o.position.set(WF.x, .3, WF.z + Math.sin(t * .8) * 2); wreckFoe.o.rotation.y = yawOf(m.x - WF.x, m.z - WF.z) + Math.PI; engine(wreckFoe.o, .6, [1.4, .5, .15]);
      if (near && (WF.shot -= dt) <= 0) { WF.shot = S.prog.ph === 'cover' ? .32 : .55; const wz = WF.z + Math.sin(t * .8) * 2, dx = m.x - WF.x + rnd(-1.5, 1.5), dz = m.z - wz + rnd(-1.5, 1.5), l = Math.hypot(dx, dz);
        S.fshots.push({ x: WF.x + dx / l * 1.4, z: wz + dz / l * 1.4, vx: dx / l * 9, vz: dz / l * 9, r: .22, fast: false, life: 5 }); } }
    for (const w of WRECK) w.o.rotation.y += w.spin * dt;
    if (Math.random() < dt * 1.6) { const h = HULL[Math.floor(Math.random() * HULL.length)], a = rnd(0, 6.28); sparks(h.x + Math.cos(a) * h.r * .7, h.z + Math.sin(a) * h.r * .7, 6, [1.3, .55, .2], 3); }

    /* 소행성: 천천히 굴러간다 */
    { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
      for (const r of ROCK) { q.setFromAxisAngle(tmpV.copy(r.w).normalize(), r.w.length() * dt); r.q.premultiply(q); m4.compose(pos.set(r.x, r.y, r.z), r.q, sc.setScalar(r.s)); rockIM[r.gi].setMatrixAt(r.i, m4); }
      for (const im of rockIM) im.instanceMatrix.needsUpdate = true; }
    tRock.rotation.y += dt * .05; crackU.uHeat.value *= Math.pow(.05, dt);
    if (TR.broken) { TR.t += dt;
      if (TR.t > 5.5 && TR.t < 7.2) { const k = ease(clamp((TR.t - 5.5) / 1.5, 0, 1)); tRock.visible = true; tRock.scale.setScalar(TR.s * k); crackU.uCrack.value = 0;
        if (Math.random() < dt * 60) { const a = rnd(0, 6.28), r = rnd(4, 8); S.bits.push({ x0: TR.x + Math.cos(a) * r, y0: rnd(-1, 1), z0: TR.z + Math.sin(a) * r, x1: TR.x, y1: 0, z1: TR.z, t0: S.t, dur: .5, sw: 1, hue: -1, out: true }); } }
      if (TR.t >= 7.2) { TR.broken = false; TR.hp = 1; tRock.scale.setScalar(TR.s); if (S.prog && S.prog.kind === 'rock') S.prog.t = 0; } }
    for (const c of CHUNK) if (c.o.visible) { c.o.position.x += c.vx * dt; c.o.position.y += c.vy * dt; c.o.position.z += c.vz * dt; const dm = Math.pow(.6, dt); c.vx *= dm; c.vy *= dm; c.vz *= dm;
      c.o.rotation.x += c.w.x * dt; c.o.rotation.y += c.w.y * dt; if (TR.broken && TR.t > 4.8) { c.s *= Math.pow(.02, dt); c.o.scale.setScalar(c.s); if (c.s < .02) c.o.visible = false; } }

    /* 결정: 빛이 지나간 자리는 속에서 빛난다 */
    for (const c of CRY) { if (c.lit > 0) { c.lit -= dt * 1.4; glow.add(c.tipX, c.tipY, c.tipZ, 0, 0, 0, .9 * c.w * Math.max(0, c.lit), 3, [.6, .85, 1.4], Math.max(0, c.lit));
        glow.add((c.x + c.tipX) / 2, c.tipY * .5, (c.z + c.tipZ) / 2, 0, 0, 0, c.h * .45 * Math.max(0, c.lit), 3, [.35, .6, 1.2], Math.max(0, c.lit) * .6); }
      else if (Math.random() < dt * .05) c.lit = .35; }

    /* 내 기본탄 */
    for (let i = S.shots.length - 1; i >= 0; i--) { const b = S.shots[i]; b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt; let hit = b.life <= 0;
      if (!hit && !TR.broken && Math.hypot(b.x - TR.x, b.z - TR.z) < TR.s * .85) { hit = true; const nx = b.x - TR.x, nz = b.z - TR.z; sparks(b.x, b.z, 5, [1.3, .7, .35], 6, nx, nz); TR.hp -= .055; crackU.uCrack.value = clamp((1 - TR.hp) * 1.3, 0, 1); crackU.uHeat.value = Math.min(1.5, crackU.uHeat.value + .25);
        if (TR.hp <= 0) shatter(); }
      if (!hit && Math.hypot(b.x - FB.x, b.z - FB.z) < 1.1) { hit = true; sparks(b.x, b.z, 6, [1.3, .6, .3], 6); fogBot.flash = 1; }
      if (!hit && Math.hypot(b.x - WF.x, b.z - (WF.z + Math.sin(t * .8) * 2)) < 1.2) { hit = true; sparks(b.x, b.z, 6, [1.3, .6, .3], 6); wreckFoe.flash = 1; }
      if (!hit) for (const h of HULL) if (Math.hypot(b.x - h.x, b.z - h.z) < h.r) { hit = true; sparks(b.x, b.z, 4, [1, .8, .5], 5); break; }
      if (hit) { S.shots.splice(i, 1); continue; }
      glow.add(b.x, .38, b.z, -b.vx * .024, 0, -b.vz * .024, .08, 2, [.55, .75, 1.3], 1, i); }
    /* 적 탄 */
    for (let i = S.fshots.length - 1; i >= 0; i--) { const b = S.fshots[i]; b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt; let hit = b.life <= 0;
      if (!hit) for (const h of HULL) if (Math.hypot(b.x - h.x, b.z - h.z) < h.r) { hit = true; const nx = b.x - h.x, nz = b.z - h.z; sparks(b.x, b.z, 10, [1.4, .55, .2], 7, nx, nz); flash(b.x, b.z, .9, [1.3, .45, .15], .2); break; }
      if (!hit && b.fast && Math.hypot(b.x - m.x, b.z - m.z) < 2.3) { hit = true; reflect(b); }
      else if (!hit && Math.hypot(b.x - m.x, b.z - m.z) < 1) { hit = true; sparks(b.x, b.z, 8, [1.3, .5, .2], 6); }
      if (hit) { S.fshots.splice(i, 1); continue; }
      const sp = Math.hypot(b.vx, b.vz), tl = b.fast ? .9 : .4;
      glow.add(b.x, .35, b.z, -b.vx / sp * tl, 0, -b.vz / sp * tl, b.r, 0, [1, .22, .12], 1, i); glow.add(b.x, .35, b.z, 0, 0, 0, b.r * 2.6, 3, [1, .25, .1], .35); }
    /* 반사한 빛과 갈라진 빛 */
    for (let i = S.bolts.length - 1; i >= 0; i--) { const b = S.bolts[i]; b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt; let dead = b.life <= 0;
      for (const c of CRY) { if (b.seen.has(c)) continue; const d = Math.hypot(b.x - c.x, b.z - c.z); if (d < .55 * c.w + .35) { b.seen.add(c); c.lit = 1;
        if (b.gen === 0 && b.splits < 3) { b.splits++; const a0 = Math.atan2(b.vz, b.vx); flash(c.x, c.z, 1.8, [.9, 1, 1.3], .25);
          for (let k = 0; k < 6; k++) { const f = k / 5, a = a0 + (f - .5) * .62, sp = 30; S.bolts.push({ x: c.x, z: c.z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, gen: 1, c: hueRGB((1 - f) * .83), life: .9, seen: new Set([c]), splits: 0 }); } } } }
      if (!dead && GF.dead <= 0 && Math.hypot(b.x - GF.x, b.z - GF.z) < 1.8) { dead = true; sparks(b.x, b.z, 10, b.c || [1, 1, 1], 9); grovFoe.flash = 1; GF.hp -= b.gen ? .4 : 1.2; S.shake = Math.max(S.shake, .12);
        if (GF.hp <= 0) { boom(GF.x, GF.z, 1.3); GF.dead = 2.4; S.slowT = .35; } }
      if (dead) { S.bolts.splice(i, 1); continue; }
      const sp = Math.hypot(b.vx, b.vz);
      if (b.gen === 0) { glow.add(b.x, .45, b.z, -b.vx / sp * 2.4, 0, -b.vz / sp * 2.4, .26, 1.4, [.9, .95, 1.2], 1.2, i); glow.add(b.x, .45, b.z, 0, 0, 0, .9, 3, [.7, .8, 1.2], .4); }
      else { glow.add(b.x, .45, b.z, -b.vx / sp * 1.6, 0, -b.vz / sp * 1.6, .1, 2, b.c.map(v => v * .7 + .3), 1, i); glow.add(b.x, .45, b.z, -b.vx / sp * 1.2, 0, -b.vz / sp * 1.2, .38, 3, b.c, .75); } }

    /* 방패 */
    S.shI *= Math.pow(.02, dt); shieldMat.uniforms.uI.value = S.shI; shieldMat.uniforms.uT.value = t; shield.visible = S.shI > .02 && me.visible;
    shield.position.copy(me.position); shield.rotation.y = S.shYaw || 0;
    /* 적 맞으면 번쩍 */
    for (const f of [fogBot, grovFoe, wreckFoe]) { f.flash *= Math.pow(.01, dt); for (const mt of f.mats) mt.emissive.setRGB(f.flash * 1.5, f.flash * .6, f.flash * .3); }
    fogBot.o.visible = true;

    /* 내 엔진과 꼬리 (지나온 길을 따라 끊김 없이) */
    me.updateMatrixWorld(true);
    if (me.visible) { const hx = -Math.sin(m.yaw), hz = -Math.cos(m.yaw), fl = 1 + m.v * .03;
      for (const p of ENG) { v3.copy(p).applyMatrix4(shipModel.matrixWorld);
        glow.add(v3.x - hx * .05, v3.y, v3.z - hz * .05, -hx * .8 * fl, 0, -hz * .8 * fl, .15, 1, [.4, .6, 1.4], .9);
        glow.add(v3.x - hx * .22, v3.y, v3.z - hz * .22, -hx * .5 * fl, 0, -hz * .5 * fl, .4 * fl, 3, [.25, .45, 1.3], .7); }
      v3.set(0, 0, 0); for (const p of ENG) v3.add(p); v3.multiplyScalar(1 / ENG.length).applyMatrix4(shipModel.matrixWorld);
      const last = S.trail[0]; if (!last || Math.hypot(last[0] - v3.x, last[2] - v3.z) > .35) { S.trail.unshift([v3.x, v3.y, v3.z]); if (S.trail.length > 70) S.trail.pop(); } else { last[0] = v3.x; last[1] = v3.y; last[2] = v3.z; } }
    const tl = Math.min(S.trail.length - 1, Math.round(8 + m.v * 1.6));
    for (let i = 0; i < tl; i++) { const a = S.trail[i], b = S.trail[i + 1], k = 1 - i / tl;
      glow.add(a[0], a[1], a[2], b[0] - a[0], b[1] - a[1], b[2] - a[2], .09 + .05 * k, 3, [.3, .5, 1.3], k * k * clamp(m.v / 14, .25, 1)); }

    /* 빛 조각 (웜홀·다시 모이는 바위) */
    for (let i = S.bits.length - 1; i >= 0; i--) { const b = S.bits[i], k = (S.t - b.t0) / b.dur; if (k < 0) { if (!b.out) glow.add(b.x0, b.y0, b.z0, 0, 0, 0, .05, 2, [1, .9, .9], .8); continue; }
      if (k >= 1) { S.bits.splice(i, 1); continue; }
      const e = b.out ? 1 - Math.pow(1 - k, 3) : k * k, sw = (b.out ? 1 - e : e) * b.sw;
      let x = lerp(b.x0, b.x1, e), z = lerp(b.z0, b.z1, e); const cx = b.out ? b.x0 : b.x1, cz = b.out ? b.z0 : b.z1, dx = x - cx, dz = z - cz, cs = Math.cos(sw), sn = Math.sin(sw);
      x = cx + dx * cs - dz * sn; z = cz + dx * sn + dz * cs; const y = lerp(b.y0, b.y1, e);
      const c = b.hue < 0 ? [.75, .6, .45] : hueRGB(b.hue * .83).map(v => v * .5 + .6), a = b.out ? .4 + e * .6 : 1 - e * .5;
      glow.add(x, y, z, (b.px ?? x) - x, 0, (b.pz ?? z) - z, b.hue < 0 ? .12 : .06, 2, c, a); b.px = x; b.pz = z; }

    /* 불꽃·번쩍 */
    for (let i = S.parts.length - 1; i >= 0; i--) { const p = S.parts[i]; p.age += dt; if (p.age >= p.life) { S.parts.splice(i, 1); continue; }
      const dm = Math.exp(-p.drag * dt); p.vx *= dm; p.vz *= dm; p.vy *= dm; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const k = p.age / p.life, r = p.grow ? p.r * (.6 + k * p.grow) : p.r * (1 - k * .5), a = p.a * (p.grow ? (1 - k) * (1 - k) : 1 - k);
      glow.add(p.x, p.y, p.z, -p.vx * p.tail, -p.vy * p.tail, -p.vz * p.tail, r, p.k, p.c, a, i); }

    /* 빛의 길: 바깥으로 가는 줄은 따뜻하게, 안으로 오는 줄은 차갑게 흐른다 */
    { const o = [0, 0, 0, 0], view = cam.h * 1.3;
      for (const h of HW) {
        for (let i = 0; i <= h.N; i += 6) { const p = h.P[i]; if (Math.abs(p.x - cam.x) > view * 1.4 || Math.abs(p.z - cam.z) > view) continue;
          glow.add(p.x, -.6, p.z, 0, 0, 0, 1.5, 3, [.5, .55, .7], .05); }
        for (const f of h.F) { f.u += dt * f.sp / h.len * f.dir; if (f.u > 1) f.u -= 1; if (f.u < 0) f.u += 1;
          hwAt(h, f.u, o); const x = o[0] - o[3] * f.dir * .7, z = o[1] + o[2] * f.dir * .7; if (Math.abs(x - cam.x) > view * 1.4 || Math.abs(z - cam.z) > view) continue;
          const e = Math.min(f.u, 1 - f.u) * 8, a = clamp(e, 0, 1);
          glow.add(x, -.3, z, -o[2] * f.dir * 1.1, 0, -o[3] * f.dir * 1.1, .06 + f.r * .04, 2, f.dir > 0 ? [1.2, .95, .6] : [.6, .8, 1.3], .8 * a); } } }
    /* 잔해 줄기: 블랙홀에 가까울수록 빨라지며 빨려 든다 */
    { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
      for (let i = 0; i < NS; i++) { const d = STR[i]; d.u += dt * (.006 + .05 * d.u * d.u * d.u); if (d.u >= 1) { d.u = 0; d.off = rnd(-3.5, 3.5); }
        const f = d.u * 300, j = Math.min(299, Math.floor(f)), k = f - j, a = STR_P[j], b = STR_P[j + 1], tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1;
        const sq = 1 - d.u * d.u, x = a.x + tx * k - tz / l * d.off * sq, z = a.z + tz * k + tx / l * d.off * sq, sh = d.u > .9 ? (1 - d.u) * 10 : Math.min(1, d.u * 20);
        q.setFromAxisAngle(tmpV.copy(d.w).normalize(), d.w.length() * dt * (1 + d.u * 4)); d.q.premultiply(q);
        m4.compose(pos.set(x, d.y * sq - .2, z), d.q, sc.set(d.s * sh * (1 + d.u * .8), d.s * sh, d.s * sh * (1 - d.u * .4))); strIM.setMatrixAt(i, m4);
        if (d.em && sh > .2) glow.add(x, d.y * sq, z, -tx / l * .6 * (1 + d.u * 3), 0, -tz / l * .6 * (1 + d.u * 3), .1 * sh, 3, [1.4, .5, .15], .6); }
      strIM.instanceMatrix.needsUpdate = true; }
    /* 성운 가스: 안개 가장자리에서 흘러 나와 결정 숲 위로 옅게 퍼진다 */
    for (const w of WISP) { w.u += dt * w.sp; if (w.u > 1) { w.u = 0; w.off = rnd(-5, 5); }
      const x = lerp(SP.fog.x + 12, SP.forest.x + 8, w.u), z = lerp(SP.fog.z - 4, SP.forest.z + 2, w.u) + w.off + Math.sin(w.u * 6 + w.ph) * 2.5, a = Math.sin(w.u * Math.PI);
      glow.add(x, 1.2, z, -3, 0, .6, w.r * (1 + w.u), 3, [.12, .42, .48], .13 * a); }

    for (let x = -MAP.x; x <= MAP.x; x += 10) for (const z of [-MAP.z, MAP.z]) beacon(x, z);
    for (let z = -MAP.z + 10; z < MAP.z; z += 10) for (const x of [-MAP.x, MAP.x]) beacon(x, z);
    /* 지나가는 먼지 (가까이 볼 때만) */
    if (cam.h < 90) { const C = 5, x0 = Math.floor((cam.x - cam.h) / C), x1 = Math.ceil((cam.x + cam.h) / C), z0 = Math.floor((cam.z - cam.h * .62) / C), z1 = Math.ceil((cam.z + cam.h * .5) / C);
      for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5; const f = h - Math.floor(h), g = (h * 1.7) % 1;
        glow.add(i * C + f * C, -1.5 - g * 2, j * C + Math.abs(g) * C, 0, 0, 0, .05 + f * .05, 3, [.55, .6, .8], .2 + f * .2); } }
  }
  function beacon(x, z) { const s = .5 + .5 * Math.sin(S.t * 1.4 + x * .3 + z * .2); glow.add(x, 0, z, 0, 0, 0, .12, 1, [.7, .85, 1], .4 + s * .4); glow.add(x, 0, z, 0, 0, 0, .9, 3, [.3, .45, .8], .18 + s * .1); }
  function engine(o, s, c) { const yaw = o.rotation.y, bx = Math.sin(yaw), bz = Math.cos(yaw); const x = o.position.x - bx * s * 1.4, z = o.position.z - bz * s * 1.4;
    glow.add(x, .3, z, -bx * .6, 0, -bz * .6, .3 * s, 3, c, .8); }
  function reflect(b) { const m = S.m, dx = GF.x - m.x, dz = GF.z - m.z, l = Math.hypot(dx, dz);
    S.shI = 1.2; S.shYaw = yawOf(b.x - m.x, b.z - m.z); const hs = shieldMat.uniforms.uHit.value; hs[0].set(0, 0, -1, S.t);
    S.stopT = .06; S.slowT = .32; S.shake = Math.max(S.shake, .18);
    flash(b.x, b.z, 2.4, [1.2, 1.2, 1.3], .22); sparks(b.x, b.z, 18, [1, .95, 1.2], 10, b.x - m.x, b.z - m.z);
    S.bolts.push({ x: b.x, z: b.z, vx: dx / l * 34, vz: dz / l * 34, gen: 0, life: 2, seen: new Set(), splits: 0 });
    GF.ph = 'wait'; GF.t = 2.6; }
  function shatter() { TR.broken = true; TR.t = 0; tRock.visible = false; boom(TR.x, TR.z, .9);
    for (const c of CHUNK) { const a = rnd(0, 6.28), sp = rnd(2, 7); c.vx = Math.cos(a) * sp; c.vz = Math.sin(a) * sp; c.vy = rnd(-1, 1.5); c.s = TR.s * rnd(.16, .34); c.o.scale.setScalar(c.s);
      c.o.position.set(TR.x + Math.cos(a) * .8, 0, TR.z + Math.sin(a) * .8); c.w.set(rnd(-3, 3), rnd(-3, 3), 0); c.o.visible = true; }
    for (let i = 0; i < 26; i++) { const a = rnd(0, 6.28), sp = rnd(.5, 3); part({ x: TR.x, z: TR.z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, life: rnd(1.5, 3), r: rnd(.8, 1.8), k: 3, c: [.35, .28, .22], a: .45, drag: .8, grow: .8 }); } }

  /* ───── 이름표 ───── */
  const tagRoot = $('#tags'), TAGS = [];
  for (const [k, pl] of [['boss', 'boss'], ['whA', 'wh'], ['whB', 'wh'], ['fog', 'fog'], ['forest', 'forest'], ['bh', 'bh'], ['rock', 'rock'], ['wreck', 'wreck']]) {
    const p = PLACES.find(q => q.id === pl), el = document.createElement('div'); el.className = 'tag'; el.innerHTML = `<b>${p.name}</b><span>${p.en}</span>${k === 'boss' ? '<em></em>' : ''}`; tagRoot.appendChild(el);
    const s = SP[k], off = { boss: s.r + 4, whA: 8, whB: 8, fog: s.r * .7, forest: s.r * .9, bh: 9, rock: 5, wreck: 12 }[k];
    TAGS.push({ el, x: k === 'rock' ? TR.x : s.x, z: s.z - off, k, em: el.querySelector('em') }); }
  const hideEl = $('#hide');
  function tags() {
    { v3.set(S.m.x, .4, S.m.z).project(camera); hideEl.classList.toggle('on', S.m.hide && me.visible); hideEl.style.transform = `translate(${(v3.x * .5 + .5) * innerWidth}px,${(-v3.y * .5 + .5) * innerHeight}px)`; } for (const g of TAGS) { v3.set(g.x, 0, g.z).project(camera); const on = v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05;
      g.el.style.opacity = on ? 1 : 0; if (on) g.el.style.transform = `translate(${(v3.x * .5 + .5) * innerWidth}px,${(-v3.y * .5 + .5) * innerHeight}px) translate(-50%,-100%)`;
      g.el.classList.toggle('far', cam.h > 120);
      if (g.em) { const bt = BC.t; g.em.textContent = bt < 8 ? `출현까지 ${Math.ceil(8 - bt)}초` : bt < 13 ? '보스 출현' : bt < 21 ? '보스 전투 중' : '다음 출현 준비'; g.em.classList.toggle('warn', bt > 5 && bt < 13); } } }

  /* ───── 손 ───── */
  const ptr = new Map(); let pinch = 0;
  addEventListener('pointerdown', e => { if (e.target.closest('#ui')) return; ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
  addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; const o = ptr.get(e.pointerId), dx = e.clientX - o[0], dy = e.clientY - o[1];
    if (ptr.size === 1 && Math.hypot(dx, dy) > 1) { const k = cam.h * .73 / innerHeight; cam.x -= dx * k; cam.z -= dy * k * 1.05; S.free = true; $('#follow').hidden = false; }
    ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) cam.H = clamp(cam.H * pinch / d, 18, 260); cam.h = cam.H; pinch = d; } });
  const up = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pinch = 0; };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  addEventListener('wheel', e => { cam.H = clamp(cam.H * Math.exp(e.deltaY * .0012), 18, 260); }, { passive: true });
  const tour = $('#tour'); for (const pl of PLACES) { const b = document.createElement('button'); b.type = 'button'; b.dataset.id = pl.id; b.textContent = pl.name; b.onclick = () => go(pl.id); tour.appendChild(b); }
  $('#follow').onclick = () => { S.free = false; $('#follow').hidden = true; };

  /* ───── 화면 크기 ───── */
  let Wd = 2, Hd = 2;
  const perf = makePerf(st => { const n = st.aa ? 4 : 0; if (rtA.samples !== n) { rtA.samples = n; rtA.dispose(); } size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height);
    renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); rtA.setSize(Wd, Hd); skyRT.setSize(Wd >> 1, Hd >> 1); bgMat.uniforms.uPx.value.set(2 / Wd, 2 / Hd);
    camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); glow.uRes.value.set(Wd, Hd); lensMat.uniforms.uAsp.value = Wd / Hd; }
  addEventListener('resize', size); size(); if (perf.st.aa) { rtA.samples = 4; rtA.dispose(); }

  /* ───── 공간 굴절 자리 ───── */
  const right = new THREE.Vector3();
  function lensAt(i, W, type) { const L = lensMat.uniforms.uL.value[i]; v3.set(W.x, W === SP.bh ? -.4 : 0, W.z).project(camera);
    if (v3.z > 1 || Math.abs(v3.x) > 1.6 || Math.abs(v3.y) > 1.6) { L.w = 0; return false; }
    const cx = v3.x * .5 + .5, cy = v3.y * .5 + .5; right.setFromMatrixColumn(camera.matrixWorld, 0); v3.set(W.x, 0, W.z).addScaledVector(right, W.r).project(camera);
    L.set(cx, cy, Math.abs(v3.x * .5 + .5 - cx) * Wd / Hd, type); return true; }
  function portal(i, W) { const pc = portCam; pc.position.set(W.x, 26, W.z + 4); pc.lookAt(W.x, 0, W.z); pc.updateMatrixWorld();
    const su = skyMat.uniforms; su.uRes.value.set(PR, PR); su.uCam.value.set(W.x, W.z); su.uSpan.value = 30; planetAt(W.x, W.z, 41, su.uRes.value);
    renderer.setRenderTarget(portRT[i]); renderer.clear(); renderer.render(skyScene, bgCam); renderer.clearDepth();
    glow.uRes.value.set(PR, PR); renderer.render(scene, pc); glow.uRes.value.set(Wd, Hd); }

  /* ───── 그리기 ───── */
  let last = performance.now(), pf = 0;
  renderer.setAnimationLoop(now => {
    const real = clamp((now - last) / 1000, 0, .05); last = now;
    perf.tick(real);
    if (S.stopT > 0) S.stopT -= real; else if (S.slowT > 0) { S.slowT -= real; S.ts += (.3 - S.ts) * Math.min(1, real * 10); } else S.ts += (1 - S.ts) * Math.min(1, real * 6);
    const dt = S.stopT > 0 ? 0 : real * S.ts;
    glow.begin(); step(dt, real); glow.end(); glow.uT.value = S.t;
    /* 카메라: 기체를 따라간다 (웜홀을 지날 땐 반대편으로 미끄러진다) */
    let fx = S.m.x + S.m.vx * .3, fz = S.m.z + S.m.vz * .25;
    if (S.warp) { const k = ease(clamp((S.warp.t - .3) / .9, 0, 1)); fx = lerp(S.warp.from.x, S.warp.to.x, k); fz = lerp(S.warp.from.z, S.warp.to.z, k); }
    if (S.place === 'all' && !S.free) { fx = 0; fz = -4; }
    if (S.place === 'boss' && !S.free) { fx = lerp(SP.boss.x, fx, .18); fz = lerp(SP.boss.z + 2, fz, .18); }
    if (!S.free) { const kk = Math.min(1, real * (S.warp ? 9 : 3)); cam.x += (fx - cam.x) * kk; cam.z += (fz - cam.z) * kk; }
    cam.x = clamp(cam.x, -MAP.x - 10, MAP.x + 10); cam.z = clamp(cam.z, -MAP.z - 10, MAP.z + 10);
    cam.h += (cam.H - cam.h) * Math.min(1, real * 2.2);
    S.shake *= Math.pow(.004, real); const sx = (Math.random() - .5) * S.shake, sz = (Math.random() - .5) * S.shake;
    camera.position.set(cam.x + sx, cam.h, cam.z + cam.h * .26 + sz); camera.lookAt(cam.x + sx * .5, 0, cam.z - cam.h * .02 + sz * .5); camera.updateMatrixWorld();
    /* 굴절 자리 */
    const vb = lensAt(0, SP.bh, 1), va = lensAt(1, SP.whA, 2), vbb = lensAt(2, SP.whB, 3); lensMat.uniforms.uT.value = S.t;
    pf++; if (va && pf % 2 === 0) portal(0, SP.whB); if (vbb && pf % 2 === 1) portal(1, SP.whA); void vb;   /* 웜홀 속 반대편은 번갈아 한 장면 걸러 */
    const su = skyMat.uniforms; su.uRes.value.set(Wd >> 1, Hd >> 1); su.uCam.value.set(cam.x, cam.z); su.uSpan.value = cam.h * .73; su.uT.value = S.t; planetAt(cam.x, cam.z, cam.h, su.uRes.value);
    if (perf.st.bg && pf % 2 === 0) { renderer.setRenderTarget(skyRT); renderer.render(skyScene, bgCam); }   /* 배경은 한 장면 걸러 */
    renderer.setRenderTarget(rtA); renderer.clear(); if (perf.st.bg) renderer.render(bgScene, bgCam); renderer.clearDepth(); renderer.render(scene, camera);
    renderer.setRenderTarget(bloom.scene); renderer.render(lensScene, bgCam);
    bloom.render(Wd, Hd, !perf.st.bloom);
    tags();
  });
  onProgress(1);
  go('boss');
  const jump = id => { const T = { boss: [0, 25], all: [0, 25], wh: [SP.whA.x - 15, SP.whA.z + 9], fog: FOGH[0], forest: [GP.x, GP.z], bh: [SP.bh.x - 20, SP.bh.z - 10], rock: [RP.x, RP.z], wreck: [WH.x, WH.z] }[id];
    S.m.x = T[0]; S.m.z = T[1]; cam.x = T[0]; cam.z = T[1]; S.path = null; S.hold = null; go(id); cam.h = cam.H; };
  const until = (fn, max = 20) => { for (let i = 0; i < max * 30 && !fn(); i++) { glow.begin(); step(1 / 30, 1 / 30); glow.end(); } };
  const ff = sec => { for (let i = 0; i < sec * 30; i++) { glow.begin(); step(1 / 30, 1 / 30); glow.end(); } };
  window.__mv = { S, cam, go, SP, jump, ff, until, BC, GF };
}
