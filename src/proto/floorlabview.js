/* 바닥 시험장 — 실제 게임 카메라·조명·기체로 바닥만 바꿔 가며 본다 (사용자 2026-11-04: 작은 바닥 시험장)
   · 내 기체는 조이스틱(컴퓨터 WASD·방향키)으로 몰고, 상대 기체가 둘레를 돌며 서로 쏜다 → 탄이 바닥 위에서 잘 보이는지
   · 발밑 표시(정한 C안): 체력 막대 10칸 · 반사 과열 · 왼쪽 네모 레벨 · 금·은 왕관 → 바닥 위에서 읽히는지
   · 그림자: 기체가 둥실 오르면 작고 옅게, 해 반대쪽으로 살짝 비켜 떨어짐 → 떠 있는 느낌 (보스존 유리 위에도)
   무게: 바닥 판 하나 + 기체 둘 + 빛 알갱이 한 묶음 + 그림자 판 둘 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11051918';
import { makePerf } from './perf.js?v=11051918';
import { buildShip, engineSpots } from '../core/ships/build.js';
import { makeGlow } from '../preview/glow.js';
import { makeFlight, FLY } from './flight.js?v=11051918';
import { makeFloorLab, LAB, JOIN, sdBlob, sdRoad, blobR } from './floorlab.js?v=11051918';
import { makeMassWall, STYLES } from './wallmass.js?v=11051918';
import { makeIceWall } from './icewall.js?v=11051918';
import { SNOW_U } from './snowtone.js?v=11051918';
import { iceWallMaterial, snowMaterial } from './icewall.js?v=11051918';
import { makeRuinWall, ruinMaterial } from './ruins.js?v=11051918';
import { makeCoralWall, coralMaterial, coral } from './coral.js?v=11051918';
import { makeTrailMap } from './trailmap.js?v=11051918';
import { makeThemedHide } from './hidetheme.js?v=11051918';
import { makePlantBush } from './plantbush.js?v=11051918';
import { makeCrystalWall, crystalMaterial } from './crystal.js?v=11051918';
import { makeLavaWall, lavaWallMaterial } from './lavawall.js?v=11051918';
import { makeSkyCanyon } from './skycanyon.js?v=11051918';
import { makeSkyIsle, makeCloudSea } from './skyisle.js?v=11051918';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp;
const VIEWS = [{ id: 'game', name: '게임 시점', h: 42, tilt: .38 }, { id: 'near', name: '가까이', h: 18, tilt: .6 }, { id: 'far', name: '멀리', h: 90, tilt: .3 }];
const AREA = 70;

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, .5, 900), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .6; pm.dispose(); }
  const sunDir = new THREE.Vector3(-.45, .78, -.42).normalize(), sun = new THREE.DirectionalLight(0xfff0dc, 3); sun.position.copy(sunDir).multiplyScalar(20); scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x7080a8, 0x2a1810, .5));
  const lab = makeFloorLab(); scene.add(lab.mesh); let K = 0;
  const glow = makeGlow(); scene.add(glow.mesh);
  onProgress(.3);
  /* 내 기체: 맵과 같은 비행 (둘레 AREA m 밖은 막힘) */
  const sdI = (x, z) => sdBlob(x, z, JOIN.ice, 0), sdL = (x, z) => sdBlob(x, z, JOIN.lava, 2.1);
  const onRoad = (x, z) => sdRoad(x, z) < 0, inLand = (x, z) => Math.min(sdI(x, z), sdL(x, z)) < 0;
  /* 못 지나가는 자리: 벽마다 넘겨준 동그라미(벽 몸통 · 바위 · 결정 · 기둥 · 쓰러진 토막)를 2m 칸에 나눠 둠 → 보이는 벽 모양 그대로 막힘 (사용자 2026-11-05: 벽 근처 빈 곳에서 막히고, 돌·얼음은 그냥 뚫고 지나감) */
  const BLK = {}, addBlk = (k, grp) => { const G = BLK[k] || (BLK[k] = new Map()); for (const c of grp.userData.blockers || []) { if (c.top != null && c.top < FLY.HOVER - .2) continue;   /* 기체(0.7m 높이로 뜸) 배 밑보다 낮은 건 위로 넘어감 — 보이는 그대로 */ const x0 = Math.floor((c.x - c.r) / 2), x1 = Math.floor((c.x + c.r) / 2), z0 = Math.floor((c.z - c.r) / 2), z1 = Math.floor((c.z + c.r) / 2);
      for (let a = x0; a <= x1; a++) for (let b = z0; b <= z1; b++) { const key = a * 4096 + b; let L = G.get(key); if (!L) G.set(key, L = []); L.push(c); } } };
  const hitBlk = (k, x, z) => { const G = BLK[k]; if (!G) return false; const L = G.get(Math.floor(x / 2) * 4096 + Math.floor(z / 2)); if (!L) return false; for (const c of L) { const dx = x - c.x, dz = z - c.z; if (dx * dx + dz * dz < c.r * c.r) return true; } return false; };
  const B = { blocked: (x, z) => { if (K === 14) return Math.abs(x) > 50 || Math.abs(z) > 34; if (K === 13) return SKY ? SKY.blocked(x, z) : false; if (K === 12) { if (!zoneReg) return false; const r = zoneReg(x, z); return r === 17 || hitBlk(12, x, z); } if (K >= 6) { if (Math.abs(x) > 90 || z > 30 || z < -30) return true; return hitBlk(K, x, z); }
      if (K !== 5) return Math.hypot(x, z) > AREA;
      if (hitBlk(5, x, z)) return true; if (onRoad(x, z)) return false; const sd = Math.min(sdI(x, z), sdL(x, z)); return sd > -1.4; },   /* 이음 시험: 땅 밖(우주)·벽 띠는 막힘, 큰길은 벽 틈(문)으로 지나감 */
    region: () => 0 };
  const fly = await makeFlight(renderer, B, [0, 8], 0); scene.add(fly); const FS = fly.userData.S;
  fly.traverse(o => { if (o.isMesh && o.renderOrder === 1 && o.geometry.type === 'PlaneGeometry') o.userData.oldShadow = true; });
  onProgress(.6);
  /* 상대 기체 */
  const fb = await buildShip(4, 2, 'neon-black', { renderer, size: FLY.LEN }); const foe = fb.root; scene.add(foe);
  const fsm = foe.children[0], FENG = engineSpots(fb.ship, fsm, new THREE.Box3().setFromObject(fsm).getSize(new THREE.Vector3()));
  /* 벽: 얼음 땅 둘레 = 빙하 얼음 · 용암 땅 둘레 = 흑요석. 큰길이 지나는 자리만 비움(벽 틈 = 문) */
  const UT = { value: 0 }, walls = new THREE.Group(); scene.add(walls); walls.visible = false;
  const ring = (c, ph, gapAt) => { const pts = [], ag = .27; for (let a = gapAt + ag; a <= gapAt + Math.PI * 2 - ag + 1e-6; a += .045) { const r = blobR(Math.cos(a), Math.sin(a), JOIN.R, ph); pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); } return pts; };
  const outOf = c => (x, z, nx, nz) => ((x - c[0]) * nx + (z - c[1]) * nz) > 0 ? 1 : -1;
  const iceRing = ring(JOIN.ice, 0, 0); let joinIce = null;
  walls.add(makeLavaWall(ring(JOIN.lava, 2.1, Math.PI), { uT: UT, seed: 3, out: outOf(JOIN.lava) }));   /* 용암 땅 둘레 = 용암 바위 벽 (참고 그림 2026-11-05) */
  /* 빙하 얼음 벽 보기: 가운데 문이 있는 벽 한 줄 + 오른쪽에 토막 셋을 따로 (낮은 · 높은 · 문 옆) */
  const GAL = { z: -12, xs: [-12, 12], kinds: [] }, gal = new THREE.Group(); scene.add(gal); gal.visible = false;
  const north = (x, z, nx, nz) => nz < 0 ? 1 : -1, galTags = [], iceM = iceWallMaterial(UT), snowM = snowMaterial(UT);
  const line = (a, b, ph) => { const pts = []; for (let x = a; x <= b + 1e-6; x += 1) pts.push([x, GAL.z + Math.sin(x * .12 + ph) * 1.2]); return pts; };
  /* 입구 시안: 고를 때마다 얼음 벽(이음 장면 + 벽 칸)을 새 입구로 다시 지음 · 바닥 문턱 자리도 알려 줌 */
  const L1 = line(-34, -4, 0), L2 = line(4, 34, 1); let galW = [];
  const GATES = [['입구 · 결정 문기둥', 'pillar'], ['입구 · 부서진 아치', 'arch'], ['입구 · 깨져 벌어진 틈', 'breach'], ['입구 · 빛나는 문턱', 'sill']];
  const drop = o => { o.parent && o.parent.remove(o); o.traverse(m => m.isMesh && m.geometry.dispose()); };
  const buildGate = gi => { const gate = GATES[gi][1];
    if (joinIce) drop(joinIce); joinIce = makeIceWall(iceRing, { uT: UT, mat: iceM, smat: snowM, seed: 4, out: outOf(JOIN.ice), gate }); walls.add(joinIce);
    galW.forEach(drop); galW = [makeIceWall(L1, { uT: UT, mat: iceM, smat: snowM, seed: 11, out: north, doors: [false, true], gate }), makeIceWall(L2, { uT: UT, mat: iceM, smat: snowM, seed: 12, out: north, doors: [true, false], gate })]; galW.forEach(w => gal.add(w));
    lab.mat.uniforms.uGate.value = gi; const D = lab.mat.uniforms.uDoor.value, e = iceRing[iceRing.length - 1], s0 = iceRing[0];
    D[0].set(e[0], e[1], s0[0], s0[1]); D[1].set(L1[L1.length - 1][0], L1[L1.length - 1][1], L2[0][0], L2[0][1]); };
  buildGate(0);
  /* 용암 바위 벽 보기: 얼음 벽 칸과 같은 자리·같은 모양 줄 (가운데 문) */
  const lgal = new THREE.Group(); scene.add(lgal); lgal.visible = false; { const lm = lavaWallMaterial(UT);
    lgal.add(makeLavaWall(L1, { uT: UT, mat: lm, seed: 21, out: north, doors: [false, true] }), makeLavaWall(L2, { uT: UT, mat: lm, seed: 22, out: north, doors: [true, false] })); }
  /* 고대 유적 벽 보기: 기존 고대 유적 돌로 쌓은 성벽(ruins.js makeRuinWall) · 떠 있는 고리 조각 없음 · 같은 자리 줄 (가운데 문) — 참고 그림 시안은 폐기 (사용자 2026-11-05) */
  const rgal = new THREE.Group(); scene.add(rgal); rgal.visible = false; { const rm = ruinMaterial(UT);
    rgal.add(makeRuinWall(L1, { uT: UT, mat: rm, seed: 31, doors: [false, true] }), makeRuinWall(L2, { uT: UT, mat: rm, seed: 32, doors: [true, false] })); }
  /* 성운 산호 벽 보기 */
  const cgal = new THREE.Group(); scene.add(cgal); cgal.visible = false; { const cm = coralMaterial(UT), big = [1, 2, 3, 4].map(q => coral(q, true, 3)), small = [5, 6, 7].map(q => coral(q, true, 2));
    cgal.add(makeCoralWall(L1, { uT: UT, mat: cm, big, small, seed: 41, doors: [false, true] }), makeCoralWall(L2, { uT: UT, mat: cm, big, small, seed: 42, doors: [true, false] })); }
  cgal.children.forEach(w => addBlk(9, w));
  /* 자수정 꽃 무리 보기 */
  const xgal = new THREE.Group(); scene.add(xgal); xgal.visible = false; { const xm = crystalMaterial(UT);
    xgal.add(makeCrystalWall(L1, { uT: UT, mat: xm, seed: 51, doors: [false, true] }), makeCrystalWall(L2, { uT: UT, mat: xm, seed: 52, doors: [true, false] })); }
  xgal.children.forEach(w => addBlk(10, w));
  /* 용암 폭포 자리를 바닥에 넘김 (0~11 벽 칸 · 12~23 이음 장면) → 바닥이 폭포 아래 웅덩이·흘러나가는 개울을 그림 */
  { const LF = lab.mat.uniforms.uLF.value, LW = lab.mat.uniforms.uLFw.value, fill = (ws, o) => { let k = 0; for (const w of ws) for (const F of w.userData.fallsW || []) if (k < 12) { LF[o + k].set(F.x, F.z, F.dx, F.dz); LW[o + k].set(F.w, F.reach); k++; } };
    fill(lgal.children, 0); fill(walls.children, 12); }
  /* 숨을 곳 보기 (사용자 2026-11-05: 땅마다 다른 생김새) — 벽 칸마다 벽 앞에 셋: 벽 따라 길쭉 · 문 옆 · 둥근 덩이 */
  const HIDE = {}; { const wz = x => -12 + Math.sin(x * .12) * 1.2, ang = x => Math.atan2(Math.cos(x * .12) * .144, 1);   /* 벽 줄을 따라 기울인 네모 */
    const spots = [[-19.5, wz(-19.5) + 3.4, 5, 2, ang(-19.5)], [9.5, wz(9.5) + 3.1, 3, 1.8, ang(9.5)], [22, -2, 3, 2.4, .35]];
    for (const [k, th] of [[6, 'ice'], [7, 'lava'], [8, 'ruin'], [9, 'coral']]) { const h = makeThemedHide(spots.map(rect => ({ rect, theme: th })), lab.mat.uniforms.uN.value); h.mesh.visible = false; scene.add(h.mesh); HIDE[k] = h; } }
  /* 숨을 곳 시안: 미지의 우주 식물 셋 (A 빛잎 · B 깃털 · C 빛버섯) */
  const PL = new THREE.Group(); scene.add(PL); PL.visible = false; const plants = []; { const Rp = (() => { let s = 31337; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
    [['A', -22], ['B', -7.5], ['C', 7.5], ['M', 22]].forEach(([kd, x]) => { const b = makePlantBush([x, -9, 3.4, 2.2, 0], kd, UT, Rp); PL.add(b.mesh); plants.push(b); }); }   /* 맨 오른쪽 = 셋을 섞은 것 */
  /* ── 맵 1구역 (2026-11-05: 맵 7안 방 1 둘레를 실제로 깔아 폰에서 무게 확인) ──
     벽 줄기(v7.json ridges)를 각도 창(방 1 쪽 ±42°) 안 토막으로 잘라 벽 종류대로 세움:
     유적 = 보물 땅 둘레 · 맵 테두리(158m 근처) · 방 둘레 / 산호 = 정글 / 나머지(사냥터 벽) = 방 1 사냥터는 얼음 · 이웃 사냥터는 방 번호 짝에 따라 얼음·용암
     보스존 둘레 = 자수정 꽃 무리(반지름 31m, 문 10곳) · 숨을 곳 = 우주 식물 덤불 · 막힘 = 벽이 넘겨준 자리 + 맵 밖 */
  const NOGH = /[?&]gh=0/.test(location.search);   /* 시험: 숨을 때 내 기체 반투명 끄기 (프레임 원인 찾기) */
  /* 하늘 협곡 (나는 느낌 시험, 2026-11-05) */
  const SKY = makeSkyCanyon(UT, sunDir); scene.add(SKY.mesh); SKY.mesh.visible = false;
  /* 하늘 섬 하나 (섬 부품 1단계, 2026-11-05) — 처음 열 때 만듦 */
  let ISLE = null, ISEA = null; const isleGrp = new THREE.Group(); scene.add(isleGrp); isleGrp.visible = false;
  const mkIsle = () => { if (ISLE) return; ISLE = makeSkyIsle(UT, sunDir, { seed: 777, size: 11, top: -9 }); ISEA = makeCloudSea(UT, sunDir, ISLE.uN, [...ISLE.spots].sort((a, b) => b.r - a.r).slice(0, 16)); isleGrp.add(ISLE.mesh, ISEA); };
  const ZONE = new THREE.Group(); scene.add(ZONE); ZONE.visible = false; let zoneReady = null, zoneReg = null, zonePlants = [];
  const buildZone = async () => {
    const J = await (await fetch('./assets/map/v7.json')).json(), tex = await new THREE.TextureLoader().loadAsync('./assets/map/v7.png');
    tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.flipY = false; lab.mat.uniforms.uReg.value = tex;
    { const img = tex.image, c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, img.width, img.height).data, N = img.width;
      zoneReg = (x, z) => { const i = Math.floor((x + 180) / 360 * N), j = Math.floor((z + 180) / 360 * N); return i < 0 || j < 0 || i >= N || j >= N ? 17 : Math.round(d[(j * N + i) * 4] / 12); }; }
    const A0 = -Math.PI / 2, WIN = .73, inWin = (x, z) => Math.abs(Math.atan2(Math.sin(Math.atan2(z, x) - A0), Math.cos(Math.atan2(z, x) - A0))) < WIN;
    const sec = (x, z) => ((Math.round((Math.atan2(z, x) - A0) / (Math.PI / 5)) % 10) + 10) % 10;
    const im = iceWallMaterial(UT), sm = snowMaterial(UT), lm = lavaWallMaterial(UT), rm = ruinMaterial(UT), cm = coralMaterial(UT), xm = crystalMaterial(UT);
    const cbig = [1, 2, 3, 4].map(q => coral(q, true, 2)), csmall = [5, 6, 7].map(q => coral(q, true, 1));   /* 맵: 큰 산호 갈래 2단 · 앞뒤 작은 산호는 갈래 1단 (위에서 보면 같은 덤불, 삼각형 1/4) */
    const toW = ([px, py]) => [(px - 500) * .36, (py - 500) * .36]; let seed = 100;
    for (const rd of J.ridges) { const P = rd.p.map(toW); let run = [];
      const flush = () => { if (run.length < 4) { run = []; return; } const pts = run.filter((q, i) => i === 0 || Math.hypot(q[0] - run[i - 1][0], q[1] - run[i - 1][1]) > .3); run = []; if (pts.length < 3) return;
        const m = pts[pts.length >> 1], R = Math.hypot(m[0], m[1]); let kind = rd.k === 'coral' ? 'coral' : rd.k === 'ruins' ? 'ruin' : R > 150 ? 'ruin' : (sec(m[0], m[1]) % 2 ? 'lava' : 'ice');
        /* 앞(눈밭·바위가 놓이는 쪽) = 사냥터 쪽 */
        const out = (x, z, nx, nz) => zoneReg(x - nx * 4, z - nz * 4) === 1 ? 1 : -1; seed++;
        let w = null;
        if (kind === 'ice') w = makeIceWall(pts, { uT: UT, mat: im, smat: sm, seed, out, doors: [false, false] });
        else if (kind === 'lava') w = makeLavaWall(pts, { uT: UT, mat: lm, seed, out, doors: [false, false] });
        else if (kind === 'ruin') w = makeRuinWall(pts, { uT: UT, mat: rm, seed, doors: [false, false] });
        else w = makeCoralWall(pts, { uT: UT, mat: cm, big: cbig, small: csmall, seed, doors: [false, false] });
        ZONE.add(w); addBlk(12, w); };
      for (const q of P) { if (inWin(q[0], q[1])) run.push(q); else flush(); } flush(); }
    /* 보스존 둘레 자수정: 문 사이 호를 토막마다 */
    for (let k = 0; k < 10; k++) { const a0 = A0 + (k + .5) * Math.PI / 5 + .16, a1 = A0 + (k + 1.5) * Math.PI / 5 - .16, pts = []; for (let a = a0; a <= a1 + 1e-6; a += .05) pts.push([Math.cos(a) * 31, Math.sin(a) * 31]);
      const mx = Math.cos((a0 + a1) / 2) * 31, mz = Math.sin((a0 + a1) / 2) * 31; if (!inWin(mx, mz)) continue;
      const w = makeCrystalWall(pts, { uT: UT, mat: xm, seed: 200 + k, doors: [true, true] }); ZONE.add(w); addBlk(12, w); }
    /* 숨을 곳: 맵이 정한 자리(덩이들) → 곧은 네모로 (덩이 무리의 긴 쪽 방향) */
    const Rp = (() => { let s2 = 777; return () => (s2 = (s2 * 9301 + 49297) % 233280) / 233280; })();
    for (const b of J.bushes || []) { const L = b.lobes, cx = L.reduce((a, l) => a + l[0], 0) / L.length, cz = L.reduce((a, l) => a + l[1], 0) / L.length; if (!inWin(cx, cz)) continue;
      let sxx = 0, szz = 0, sxz = 0; for (const [x, z] of L) { sxx += (x - cx) ** 2; szz += (z - cz) ** 2; sxz += (x - cx) * (z - cz); } const an = .5 * Math.atan2(2 * sxz, sxx - szz), ca = Math.cos(an), sa = Math.sin(an);
      let hl = 1, hw = 1; for (const [x, z, r] of L) { const u = (x - cx) * ca + (z - cz) * sa, v = -(x - cx) * sa + (z - cz) * ca; hl = Math.max(hl, Math.abs(u) + r * .8); hw = Math.max(hw, Math.abs(v) + r * .8); }
      const pb = makePlantBush([cx, cz, Math.min(hl, 5.5), Math.min(hw, 2.6), an], 'M', UT, Rp);   /* 너무 큰 네모는 덤불이 성겨 보여 줄임 */ ZONE.add(pb.mesh); zonePlants.push(pb); }
    ZONE.traverse(o => { if (o.isMesh) o.frustumCulled = true; }); };
  walls.children.forEach(w => addBlk(5, w)); galW.forEach(w => addBlk(6, w)); lgal.children.forEach(w => addBlk(7, w)); rgal.children.forEach(w => addBlk(8, w));
  const tagAt = (txt, x, y, z) => { const el = document.createElement('div'); el.className = 'tag'; el.innerHTML = `<b>${txt}</b>`; el.style.opacity = 0; $('#tags').appendChild(el); galTags.push({ el, p: new THREE.Vector3(x, y, z) }); };
  tagAt('빙하 얼음 벽 · 한 덩어리 절벽', -19, 10, GAL.z); tagAt('문', 0, 4, GAL.z);

  onProgress(.85);
  /* 그림자: 해 반대쪽으로 살짝 비켜, 높을수록 넓고 옅게 */
  const shM = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uA: { value: .5 }, uS: { value: 1 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uA, uS; varying vec2 vP; void main(){ vec2 q=vP*vec2(1.,1.7)/uS; float r=dot(q,q); float core=exp(-r*4.), soft=exp(-r*1.3); gl_FragColor=vec4(0.,0.,0.,min(1.,(core*.85+soft*.35)*uA)); }' });
  const mkSh = () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(FLY.LEN * 2.2, FLY.LEN * 2.2), shM()); m.renderOrder = 1; scene.add(m); return m; };
  const shMe = mkSh(), shFoe = mkSh();
  const ground = (x, z) => K === 4 || (K === 10 && z < -12 + Math.sin(x * .12 + (x > 0 ? 1 : 0)) * 1.2 - (Math.abs(x) > 3 ? 0 : 1.5)) ? 0 :   /* 우주(보스존)엔 그림자 없음 */ K !== 5 ? 1 : onRoad(x, z) ? clamp(.12 + (sdRoad(x, z) + 1) * .2, .12, .3) : inLand(x, z) ? clamp(sdRoad(x, z) / 2.5, .3, 1) : 0;   /* 우주엔 그림자 없음 · 유리 위는 옅게 */
  const placeShadow = (m, x, z, y, head) => { const hh = y * 2.4, ox = -sunDir.x / sunDir.y * hh * .55, oz = -sunDir.z / sunDir.y * hh * .55;
    m.position.set(x + ox, .03, z + oz); m.rotation.set(-Math.PI / 2, 0, head);
    const u = m.material.uniforms; u.uS.value = .55 + y * .35; u.uA.value = clamp(.95 - y * .3, .35, .9) * ground(x + ox, z + oz); m.visible = u.uA.value > .01; };
  /* 하늘 협곡 그림자: 저 아래 섬 윗면에 작고 흐릿하게(해 반대쪽으로 비켜) · 틈 위에선 떨어질 곳이 없어 사라짐 → 아래가 비었다는 게 느껴짐 */
  const skyShadow = (m, x, z, y, head, SRC = SKY) => { let ox = 0, oz = 0, tp = null; for (let it = 0; it < 2; it++) { const hgt = y - (tp ?? -14); ox = -sunDir.x / sunDir.y * hgt * .35; oz = -sunDir.z / sunDir.y * hgt * .35; tp = SRC.topAt(x + ox, z + oz); if (tp == null) break; }
    if (tp == null) { m.visible = false; return; } const hgt = y - tp; m.position.set(x + ox, tp + .06, z + oz); m.rotation.set(-Math.PI / 2, 0, head);
    const u = m.material.uniforms; u.uS.value = 1.1 + hgt * .06; u.uA.value = clamp(.5 - hgt * .012, .22, .45); m.visible = true; };
  /* 탄: 빛 알갱이 */
  const bolts = []; const fire = (x, z, tx, tz, mine) => { const d = Math.hypot(tx - x, tz - z) || 1, sp = mine ? 36 : 26; bolts.push({ x, z, vx: (tx - x) / d * sp, vz: (tz - z) / d * sp, life: 22 / sp, mine }); };
  const fx = []; const flash = (x, z, c) => fx.push({ x, z, c, t: 0 });
  /* 발밑 표시 (C안) */
  const css = document.createElement('style'); css.textContent = `
    .hud{position:absolute;left:0;top:0;display:flex;align-items:flex-start;gap:2px;pointer-events:none;transform-origin:0 0}
    .hud .lv{position:relative;width:13px;height:13px;border-radius:2px;background:rgba(8,10,20,.85);border:1px solid var(--c);color:var(--c);font:500 9px/11px 'Audiowide',sans-serif;text-align:center}
    .hud .lv svg{position:absolute;left:50%;bottom:100%;margin-left:-6px;width:12px;height:9px;filter:drop-shadow(0 0 2px rgba(0,0,0,.8))}
    .hud .bars{display:flex;flex-direction:column;gap:1.5px;padding:1px;background:rgba(8,10,20,.8);border-radius:1.5px}
    .hud .hp{position:relative;width:44px;height:6px;background:rgba(255,255,255,.08)}
    .hud .hp i{position:absolute;left:0;top:0;bottom:0} .hud .hp .lag{background:rgba(255,255,255,.9)} .hud .hp .now{background:var(--c)}
    .hud .hp .tick{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 3.9px,rgba(8,10,20,.75) 3.9px 4.4px)}
    .hud .ht{position:relative;width:44px;height:3px;background:rgba(255,255,255,.08)} .hud .ht i{position:absolute;left:0;top:0;bottom:0}`;
  document.head.appendChild(css);
  const crown = c => `<svg viewBox="0 0 12 9"><path d="M1 8 L1.5 2.5 L4 5 L6 1 L8 5 L10.5 2.5 L11 8 Z" fill="${c}" stroke="rgba(10,8,0,.85)" stroke-width=".8" stroke-linejoin="round"/></svg>`;
  const mkHud = (col, lv, cr) => { const el = document.createElement('div'); el.className = 'hud'; el.style.setProperty('--c', col);
    el.innerHTML = `<div class="lv">${lv}${cr ? crown(cr) : ''}</div><div class="bars"><div class="hp"><i class="lag"></i><i class="now"></i><i class="tick"></i></div><div class="ht"><i></i></div></div>`;
    $('#tags').appendChild(el); return { el, now: el.querySelector('.now'), lag: el.querySelector('.lag'), ht: el.querySelector('.ht i'), hp: 1, lagv: 1, heat: 0 }; };
  const HM = mkHud('rgb(120,235,150)', 7, '#c9d2dc'), HF = mkHud('rgb(255,95,95)', 12, '#ffcf4a');
  const drawHud = (h, x, y, z, dt) => { h.lagv += (h.hp - h.lagv) * Math.min(1, dt * (h.lagv > h.hp + .002 ? 2.2 : 50)); h.heat = Math.max(0, h.heat - dt * .18);
    const v = new THREE.Vector3(x, y, z).project(camera); h.el.style.opacity = v.z < 1 ? 1 : 0;
    h.el.style.transform = `translate(${(v.x * .5 + .5) * cw - 30}px,${(-v.y * .5 + .5) * ch + 20}px)`;
    h.now.style.width = (h.hp * 100) + '%'; h.lag.style.width = (h.lagv * 100) + '%'; const k = Math.min(1, h.heat);
    h.ht.style.width = (k * 100) + '%'; h.ht.style.background = k > .98 ? `rgba(255,60,60,${.6 + .4 * Math.sin(t * 20)})` : `rgb(255,${200 - 150 * k | 0},${80 - 60 * k | 0})`; };
  /* 버튼 */
  const trail = makeTrailMap(renderer), trail2 = makeTrailMap(renderer, { cx: 0, cz: -62, span: 104 }); lab.mat.uniforms.uTrO.value.copy(trail.origin); lab.mat.uniforms.uTrail.value = trail.tex;
  const cam = { x: 0, z: 8, h: 42, H: 42, tilt: .38, T: .38 };
  const tip = () => { $('#tip').hidden = false; $('#tip b').textContent = LAB[K].name; $('#tip span').textContent = LAB[K].tip; $('#head b').textContent = '바닥 시험장 · ' + LAB[K].name; };
  const tour = $('#tour');
  LAB.forEach((f, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = f.name; b.className = 'fl';
    b.addEventListener('pointerdown', e => { e.stopPropagation(); const was = K; K = i; lab.set(i); walls.visible = i === 5; gal.visible = i === 6; lgal.visible = i === 7; rgal.visible = i === 8; cgal.visible = i === 9; xgal.visible = i === 10; ZONE.visible = i === 12; SKY.mesh.visible = i === 13; if (i === 14) mkIsle(); isleGrp.visible = i === 14; lab.mesh.visible = i !== 13 && i !== 14; if (i === 12) { (zoneReady ||= buildZone()).then(() => { fly.userData.moveTo(0, -166.5, 0); E.x = 0; E.z = -150; lab.mat.uniforms.uTrO.value.copy(trail2.origin); }); } else lab.mat.uniforms.uTrO.value.copy(trail.origin); if (i === 5 && was !== 5) { fly.userData.moveTo(-40, 0, -Math.PI / 2); E.x = -30; E.z = 12; } else if (i >= 6 && was < 6) { fly.userData.moveTo(0, 4, 0); E.x = 10; E.z = 14; } else if (was >= 5 && i < 5) fly.userData.moveTo(0, 8, 0); tour.querySelectorAll('.fl').forEach(x => x.classList.toggle('on', x === b)); tip(); }); tour.appendChild(b); });
  { const sep = document.createElement('i'); sep.style.cssText = 'width:1px;align-self:stretch;background:rgba(185,255,74,.25);margin:0 4px'; tour.appendChild(sep); }
  /* 비교 버튼(얼음 땅 눈 양 · 눈 결 · 입구 시안)은 모두 정해져서 없앰 (2026-11-05): 바닥 눈 없음 · 눈 결 물결 · 입구 결정 문기둥 */
  VIEWS.forEach(v => { const b = document.createElement('button'); b.type = 'button'; b.textContent = v.name; b.className = 'vw';
    b.addEventListener('pointerdown', e => { e.stopPropagation(); cam.H = v.h; cam.T = v.tilt; tour.querySelectorAll('.vw').forEach(x => x.classList.toggle('on', x === b)); }); tour.appendChild(b); });
  tour.querySelector('.vw').classList.add('on');
  addEventListener('wheel', e => { cam.H = clamp(cam.H * Math.exp(e.deltaY * .0012), 12, 160); }, { passive: true });
  let Wd = 2, Hd = 2, cw = 1, ch = 1;
  const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); cw = r.width; ch = r.height; [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd);
    camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); glow.uRes.value.set(Wd, Hd); fly.userData.setPx?.(Hd / (2 * Math.tan(camera.fov * Math.PI / 360))); }
  addEventListener('resize', size); size(); bloom.setSamples(perf.st.aa ? 4 : 0);
  var E = { a: 0, x: 0, z: -12, head: 0, cool: 0, bank: 0 }; let myCool = 0, t = 0, last = performance.now(); const v3 = new THREE.Vector3();
  renderer.setAnimationLoop(now => { try {
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt;
    fly.userData.update(t, dt); fly.traverse(o => { if (o.userData.oldShadow) o.visible = false; });
    /* 상대: 내 둘레를 크게 돌며 가끔 방향을 바꿈 */
    { const R = 13 + 4 * Math.sin(t * .23), w = .32 * (Math.sin(t * .11) > -.3 ? 1 : -1); E.a += w * dt;
      const tx = FS.x + Math.cos(E.a) * R, tz = FS.z + Math.sin(E.a) * R, nx = E.x + (tx - E.x) * Math.min(1, dt * 1.4), nz = E.z + (tz - E.z) * Math.min(1, dt * 1.4);
      const vx = (nx - E.x) / Math.max(dt, 1e-3), vz = (nz - E.z) / Math.max(dt, 1e-3); E.x = nx; E.z = nz;
      const want = Math.atan2(-(FS.x - E.x), -(FS.z - E.z)), turn = THREE.MathUtils.euclideanModulo(want - E.head + Math.PI, Math.PI * 2) - Math.PI; E.head += turn * Math.min(1, dt * 4);
      E.bank += (clamp(-(vx * Math.cos(E.head) - vz * Math.sin(E.head)) * .04, -.5, .5) - E.bank) * Math.min(1, dt * 3);
      const bob = Math.sin(t * 2.1) * .12; foe.position.set(E.x, FLY.HOVER + .25 + bob, E.z); foe.rotation.set(0, E.head, 0); foe.rotateZ(E.bank); foe.updateMatrixWorld(true);
      placeShadow(shFoe, E.x, E.z, FLY.HOVER + .25 + bob, E.head); if (K === 13) skyShadow(shFoe, E.x, E.z, FLY.HOVER + .25 + bob, E.head); if (K === 14) skyShadow(shFoe, E.x, E.z, FLY.HOVER + .25 + bob, E.head, ISLE);
      if ((E.cool -= dt) <= 0) { E.cool = .55; fire(E.x - Math.sin(E.head) * 1.2, E.z - Math.cos(E.head) * 1.2, FS.x, FS.z, false); } }
    { const hy = fly.children[0]?.position.y ?? FLY.HOVER; placeShadow(shMe, FS.x, FS.z, Math.max(.4, hy), FS.head); if (K === 13) skyShadow(shMe, FS.x, FS.z, hy, FS.head); if (K === 14) skyShadow(shMe, FS.x, FS.z, hy, FS.head, ISLE);
      if ((myCool -= dt) <= 0) { myCool = .22; fire(FS.x - Math.sin(FS.head) * 1.2, FS.z - Math.cos(FS.head) * 1.2, E.x, E.z, true); } }
    /* 탄 움직임 · 맞음 */
    for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i]; b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt;
      const [hx, hz] = b.mine ? [E.x, E.z] : [FS.x, FS.z];
      if (Math.hypot(b.x - hx, b.z - hz) < 1.1) { flash(b.x, b.z, b.mine ? [.6, 1.3, .7] : [1.4, .5, .5]); if (b.mine) { HF.hp = Math.max(.05, HF.hp - .018); HF.heat += .07; } else HM.hp = Math.max(.05, HM.hp - .03); bolts.splice(i, 1); continue; }
      if (b.life <= 0) bolts.splice(i, 1); }
    HM.hp = Math.min(1, HM.hp + dt * .03); HF.hp = Math.min(1, HF.hp + dt * .05);
    if (K === 13) SKY.update(t, dt, cam.x, cam.z); if (K === 14 && ISEA) { ISEA.position.x = cam.x; ISEA.position.z = cam.z; }
    UT.value = t; { let inH = false; for (const k in HIDE) { const h = HIDE[k]; h.mesh.visible = +k === K; if (+k === K) inH = h.update(t, dt, FS.x, FS.z); } if (K === 11) for (const b of plants) inH = b.update(t, dt, FS.x, FS.z) || inH; if (K === 12) for (const b of zonePlants) inH = b.update(t, dt, FS.x, FS.z) || inH; PL.visible = K === 11; if (!NOGH) fly.userData.setGhost?.(inH); }   /* 숨으면 내 기체 반투명 */
    for (const g of galTags) { v3.copy(g.p).project(camera); const on = gal.visible && v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1; g.el.style.opacity = on ? 1 : 0; if (on) g.el.style.transform = `translate(${(v3.x * .5 + .5) * cw}px,${(-v3.y * .5 + .5) * ch}px) translate(-50%,-50%)`; }
    lab.ships[0].set(FS.x, 0, FS.z, 1); lab.ships[1].set(E.x, 0, E.z, 2); lab.update(t);
    /* 빛 길: 기체가 지난 토막을 빛 길 지도에 칠함 (기체 수와 상관없이 바닥은 한 번만 읽음) — 숨었는지와 상관없이 남김 */
    if (K === 9) { trail.mark(0, FS.x, FS.z); trail.mark(1, E.x, E.z); trail.update(dt); lab.mat.uniforms.uTrail.value = trail.tex; }
    if (K === 12) { trail2.mark(0, FS.x, FS.z); trail2.mark(1, E.x, E.z); trail2.update(dt); lab.mat.uniforms.uTrail.value = trail2.tex; }   /* 맵 1구역: 정글 쪽 빛 길 지도 */   /* 빛 길 지도에 칠함 (산호 칸에서만) */
    glow.begin();
    for (const b of bolts) glow.add(b.x, FLY.HOVER + .3, b.z, -b.vx * .05, 0, -b.vz * .05, .2, 0, b.mine ? [.45, 1.25, .6] : [1.35, .35, .45], 1, b.x);
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; if (f.t > .25) { fx.splice(i, 1); continue; } const k = 1 - f.t / .25; glow.add(f.x, FLY.HOVER + .3, f.z, 0, 0, 0, .5 + f.t * 3, 3, f.c, k); }
    { const hx = -Math.sin(E.head), hz = -Math.cos(E.head); for (const p of FENG) { v3.copy(p).applyMatrix4(fsm.matrixWorld); glow.add(v3.x, v3.y, v3.z, -hx * .9, 0, -hz * .9, .15, 3, [1.3, .35, .5], .9); } }
    glow.end(); glow.uT.value = t;
    /* 카메라: 내 기체를 따라감 */
    { const lx = FS.x + FS.vx * .35, lz = FS.z + FS.vz * .35, k = Math.min(1, dt * 5); cam.x += (lx - cam.x) * k; cam.z += (lz - cam.z) * k; }
    cam.h += (cam.H - cam.h) * Math.min(1, dt * 3); cam.tilt += (cam.T - cam.tilt) * Math.min(1, dt * 3);
    camera.position.set(cam.x, cam.h * Math.cos(cam.tilt), cam.z + cam.h * Math.sin(cam.tilt)); camera.lookAt(cam.x, 0, cam.z); const ov = window.__camOv; if (ov) { camera.position.set(ov[0], ov[1], ov[2]); camera.lookAt(ov[3], ov[4], ov[5]); }   /* 시험용: 원하는 자리에서 보기 */ camera.updateMatrixWorld();
    lab.mesh.position.set(Math.round(cam.x / 4) * 4, 0, Math.round(cam.z / 4) * 4);
    drawHud(HM, FS.x, FLY.HOVER, FS.z, dt); drawHud(HF, E.x, FLY.HOVER, E.z, dt);
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera);
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
  } catch (e) { console.error('[바닥 시험장]', e); } });
  { const v = (import.meta.url.match(/v=(\d+)/) || [])[1] || '개발'; const el = document.createElement('div'); el.textContent = '판 번호 ' + v;
    el.style.cssText = 'position:fixed;left:max(18px,env(safe-area-inset-left,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 14px);font-size:11px;color:rgba(185,255,74,.7);pointer-events:none'; document.body.appendChild(el); }
  tour.querySelectorAll('.fl')[5].dispatchEvent(new PointerEvent('pointerdown'));   /* 처음엔 새 이음 시험부터 */
  onProgress(1);
  window.__fl = { renderer, SKY, get ISLE() { return ISLE; }, G: { ZONE, xgal, cgal, rgal, lgal, gal, walls }, blk: (k, x, z) => hitBlk(k, x, z), cam, set: i => tour.querySelectorAll('.fl')[i].dispatchEvent(new PointerEvent('pointerdown')), FS, E };
}
