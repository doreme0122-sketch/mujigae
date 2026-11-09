/* 화산 지역 (사용자 2026-11-09 · 디자인 파일 913f7c22 "화산 지역 · 섬 모음" 12가지) — 반지름 85~136m 고리 (정글 안쪽)
   배치 (사용자 확정):
   · 불의 심장(보물) 다섯 = 위층 셋 · 아래층 둘 번갈아   · 몬스터 서식지 = 가운데층 조각마다 하나
   · 용암 협곡 · 흑요석 첨탑림 · 바위 아치 = 가운데층 비행 통로   · 칼데라 용암호 · 부서진 화산 군도 = 층과 층 사이를 메움
   · 잿불 숲섬 = 숨는 덤불 (같은 모양 반복 없이 여러 모양 · 여러 곳)   · 분화 첨봉 = 기믹 (gimmick.js: 사정거리 원 · 차오름 · 터지면 밀려남 + 체력 10%)
   · 잿불 고목섬 = 초원의 기둥 섬처럼 층을 꿰뚫고 솟음   · 흑요석 파편섬 · 현무암 왕관섬 = 빈 곳 채우기 · 정글 경계엔 섞여 들어감
   최적화 (정글에서 쓴 것부터): 종류마다 한 벌만 만들어 자리마다 같은 모양을 한 번에 그림(한 종류 = 그림 몇 번) · 멀리 · 화면 밖 · 다른 층은 안 그림 · 멀면 움직임 멈춤 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeVolcKit } from './vkit.js';
import { hideMark } from './jungle.js';

export const VOLC = { R0: 85, R1: 136, P: 12, TB: 12 - 2.4 };
const KD = { heart: 0, hab: 1, canyon: 2, spire: 3, cald: 4, forest: 5, isles: 6, peak: 7, shard: 8, tree: 9, arch: 10, crown: 11 };
const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

/* ── 한 번에 그리는 빛 무리 · 연기 · 불티 (원본은 하나하나 따로 그림 → 폰에서 그림 수가 너무 많음) ── */
const BB_V = `attribute vec3 iP; attribute vec2 iS; attribute vec4 iC; varying vec2 vU; varying vec4 vC;
  void main(){ vU = uv; vC = iC; vec4 mv = modelViewMatrix * vec4(iP, 1.); mv.xy += position.xy * iS * vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz)); gl_Position = projectionMatrix * mv; }`;
const BB_F = `uniform sampler2D map; varying vec2 vU; varying vec4 vC; void main(){ vec4 t = texture2D(map, vU); gl_FragColor = vec4(vC.rgb * t.rgb, t.a * vC.a); }`;
const SM_V = `uniform float uT; attribute vec3 iP; attribute vec4 iA; attribute vec4 iB; varying vec2 vU; varying float vO; varying float vBig;
  float h1(float n){ return fract(sin(n) * 43758.5453); }
  void main(){ vU = uv; float big = iA.z, u = iA.w + uT * (big > .5 ? .06 : .09) * iB.x, L = fract(u), lp = floor(u);   /* 원본 연기 한 줄기: 솟으며 커지고 · 옅어졌다 다시 처음부터 (돌 때마다 퍼지는 쪽이 바뀜) */
    float dx = lp < .5 ? iB.y : h1(lp * 12.9 + iB.w * 78.2 + iP.x) * 2. - 1., dz = lp < .5 ? iB.z : h1(lp * 7.3 + iB.w * 31.7 + iP.z) * 2. - 1.;
    float sc = (big > .5 ? 18. : 6.) + L * (big > .5 ? 70. : 26.) * iA.y;
    vec3 c = iP + vec3(dx * iA.x + L * (big > .5 ? 28. : 9.) * iA.y, L * (big > .5 ? 90. : 46.) * iA.y, dz * iA.x + L * 3. * iA.y);
    vec4 mv = modelViewMatrix * vec4(c, 1.); float a = iB.w * uT, ca = cos(a), sa = sin(a);
    mv.xy += vec2(position.x * ca - position.y * sa, position.x * sa + position.y * ca) * sc * vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
    gl_Position = projectionMatrix * mv; vO = sin(L * 3.14159) * (big > .5 ? .55 : .45); vBig = big; }`;
const SM_F = `uniform sampler2D map; uniform vec3 cS, cB; varying vec2 vU; varying float vO; varying float vBig;
  void main(){ vec4 t = texture2D(map, vU); gl_FragColor = vec4(mix(cS, cB, vBig) * t.rgb, t.a * vO); }`;
const EM_V = `uniform float uT, uPS; attribute vec2 aY; attribute vec2 aS; varying float vA;
  void main(){ vec3 p = position; float H = max(.1, aY.y - aY.x); p.y = aY.x + mod(p.y - aY.x + uT * 3.5 * aS.x, H); p.x -= 1.5 * cos(uT * .6 + aS.y);   /* 원본: 위로 오르다 꼭대기에서 바닥으로 · 옆으로 살랑 */
    vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = 1.1 * length(modelMatrix[0].xyz) * uPS / -mv.z; vA = smoothstep(0., .08, (p.y - aY.x) / H) * (1. - smoothstep(.85, 1., (p.y - aY.x) / H)); }`;
const EM_F = `uniform sampler2D map; varying float vA; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vec3(1., .54, .23) * t.rgb, t.a * .9 * vA); }`;

export function makeVolcano(scene, { jungle, TOP = -1.2, UP = 36, DN = -30, sect = 10, renderer } = {}) {
  const K = makeVolcKit(), TU = K.TU, R0 = VOLC.R0, R1 = VOLC.R1;
  const LY = { up: UP, ug: 22, m: TOP, g: -14, d: DN };   /* 층 높이: 위 · 위 사이(가운데층 카메라보다 위) · 가운데 · 아래 사이(가운데층 섬 몸통 6m 아래) · 아래 */
  const uPS = { value: 400 };
  const glowM = new THREE.ShaderMaterial({ uniforms: { map: { value: K.dot } }, vertexShader: BB_V, fragmentShader: BB_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const smokeM = new THREE.ShaderMaterial({ uniforms: { uT: TU, map: { value: K.SMK }, cS: { value: new THREE.Color(0x4a3430) }, cB: { value: new THREE.Color(0x3a2a28) } }, vertexShader: SM_V, fragmentShader: SM_F, transparent: true, depthWrite: false });
  const emberM = new THREE.ShaderMaterial({ uniforms: { uT: TU, uPS, map: { value: K.dot } }, vertexShader: EM_V, fragmentShader: EM_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  { const cm = THREE.ColorManagement.enabled; THREE.ColorManagement.enabled = false; smokeM.uniforms.cS.value.set(0x4a3430); smokeM.uniforms.cB.value.set(0x3a2a28); THREE.ColorManagement.enabled = cm; }   /* 원본 색 그대로 */
  const quad = new THREE.PlaneGeometry(1, 1);

  /* ── 섬 한 벌 만들기: 원본 키트로 짓고 → 땅 밑 눌러 줄이기 → 움직이는 것 / 멈춘 것 가르기 → 멈춘 것은 재질마다 하나로 합침 ── */
  const placeMats = new Map();
  const placeMat = m => { if (!m.userData.crk) return m; let c = placeMats.get(m); if (!c) { c = m.clone(); c.defines = { ...(c.defines || {}), VK_PLACE: '' }; const k = m.userData.crk; K.addCracks(c, k[0], k[1], k[2], m.__crkU); placeMats.set(m, c); } return c; };   /* 균열 빛은 섬 안 좌표로 (자리마다 같은 무늬) */
  const T_ALL = [];
  function template(kind, o) { const tq0 = performance.now();
    const b = K.build(kind, o), W = b.W; W.updateMatrixWorld(true);
    /* 땅 밑 줄이기: 층 사이를 막지 않게 섬 몸통·폭포·밑 가시를 o.gref 아래 maxD만큼으로 */
    if (o.maxD != null) { const g = o.gref, dep = Math.max(...b.ISL.map(I => g - I.cy + I.depth + 8)), k = Math.min(1, o.maxD / dep), sq = y => y < g ? g + (y - g) * k : y, v = new THREE.Vector3(), inv = new THREE.Matrix4(), seen = new Set();
      W.traverse(m => { if (m.isInstancedMesh) { const M = new THREE.Matrix4(); for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, M); const ty = M.elements[13]; if (ty < g) { M.elements[13] = sq(ty); m.setMatrixAt(i, M); } } m.instanceMatrix.needsUpdate = true; return; }
        if (m.isSprite) { if (m.position.y < g && m.parent === W) m.position.y = sq(m.position.y); return; }
        if (!m.isMesh || !m.geometry?.attributes.position || seen.has(m.geometry)) return; seen.add(m.geometry); const P = m.geometry.attributes.position; inv.copy(m.matrixWorld).invert(); let ch = false;
        for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); if (v.y >= g) continue; v.y = sq(v.y); v.applyMatrix4(inv); P.setXYZ(i, v.x, v.y, v.z); ch = true; }
        if (ch) { P.needsUpdate = true; m.geometry.computeVertexNormals(); m.geometry.computeBoundingSphere(); } });
      for (const q of b.puffs) if (q.p.y < g) q.p.y = sq(q.p.y); for (const d of b.drips) { if (d.p.y < g) d.p.y = sq(d.p.y); d.fall *= k; } }
    /* 움직이는 것 찾기: 키트 움직임을 여러 순간 돌려 보고 자리·크기·보임·투명도가 바뀌는 것 */
    const objs = []; W.traverse(x => objs.push(x)); const rec = () => { W.updateMatrixWorld(true); return objs.map(x => [x.matrixWorld.elements.slice(), x.visible, x.material && !Array.isArray(x.material) ? x.material.opacity : 0]); };
    const moving = new Set(); let prev = null; for (const ts of [1.37, 4.3, 7.77, 9.9, 10.4, 11.3]) { for (const f of b.anim) f(ts, .016); const s = rec(); if (prev) s.forEach((r, i) => { const p = prev[i]; if (r[1] !== p[1] || Math.abs(r[2] - p[2]) > 1e-4 || r[0].some((e, j) => Math.abs(e - p[0][j]) > 1e-5)) moving.add(objs[i]); }); prev = s; }
    const under = x => { for (let q = x.parent; q && q !== W; q = q.parent) if (moving.has(q)) return true; return false; };
    const live = [], glows = [], groups = new Map(), insts = [];
    for (const x of objs) { if (x === W) continue; if (under(x)) continue;
      if (moving.has(x) || x.isPoints || x.isLine) { live.push(x); continue; }
      if (x.isSprite) { const c = x.material.color, op = x.material.opacity, e = x.matrixWorld.elements; if (op > .002 && x.visible) glows.push([e[12], e[13], e[14], x.scale.x, x.scale.y, c.r, c.g, c.b, op]); continue; }
      if (x.isInstancedMesh) { const Ms = []; for (let i = 0; i < x.count; i++) { const M = new THREE.Matrix4(); x.getMatrixAt(i, M); Ms.push(M.premultiply(x.matrixWorld)); } const C = x.instanceColor ? Array.from({ length: x.count }, (_, i) => { const c = new THREE.Color(); x.getColorAt(i, c); return c; }) : null; insts.push({ geo: x.geometry, mat: x.material, Ms, C }); continue; }
      if (x.isMesh && x.geometry?.attributes.position) { const m = x.material, key = m.uuid; if (!groups.has(key)) groups.set(key, { m, list: [] }); groups.get(key).list.push(x); } }
    const statics = [];
    for (const { m, list } of groups.values()) { const keys = ['position', 'normal']; if (m.map || m.emissiveMap || m.isShaderMaterial || list.some(x => x.geometry.attributes.uv && m.map)) keys.push('uv'); if (m.vertexColors) keys.push('color');
      const parts = list.map(x => { const g = x.geometry.clone(); if (!g.attributes.normal) g.computeVertexNormals(); for (const k of Object.keys(g.attributes)) if (!keys.includes(k)) g.deleteAttribute(k);
        for (const k of keys) if (!g.attributes[k]) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * (k === 'uv' ? 2 : 3)).fill(k === 'color' ? 1 : 0), k === 'uv' ? 2 : 3));
        if (!g.index) { const n = g.attributes.position.count, ix = new (n > 65535 ? Uint32Array : Uint16Array)(n); for (let i = 0; i < n; i++) ix[i] = i; g.setIndex(new THREE.BufferAttribute(ix, 1)); } g.applyMatrix4(x.matrixWorld); return g; });
      const mg = parts.length > 1 ? mergeGeometries(parts, false) : parts[0]; if (parts.length > 1) parts.forEach(g => g.dispose()); if (mg) statics.push({ geo: mg, mat: m, ro: list[0].renderOrder }); }
    let glowG = null; if (glows.length) { glowG = new THREE.InstancedBufferGeometry(); glowG.index = quad.index; glowG.setAttribute('position', quad.attributes.position); glowG.setAttribute('uv', quad.attributes.uv);
      glowG.setAttribute('iP', new THREE.InstancedBufferAttribute(new Float32Array(glows.flatMap(g => [g[0], g[1], g[2]])), 3)); glowG.setAttribute('iS', new THREE.InstancedBufferAttribute(new Float32Array(glows.flatMap(g => [g[3], g[4]])), 2));
      glowG.setAttribute('iC', new THREE.InstancedBufferAttribute(new Float32Array(glows.flatMap(g => [g[5], g[6], g[7], g[8]])), 4)); glowG.instanceCount = glows.length; }
    let smokeG = null; if (b.puffs.length) { const P = b.puffs; smokeG = new THREE.InstancedBufferGeometry(); smokeG.index = quad.index; smokeG.setAttribute('position', quad.attributes.position); smokeG.setAttribute('uv', quad.attributes.uv);
      smokeG.setAttribute('iP', new THREE.InstancedBufferAttribute(new Float32Array(P.flatMap(q => [q.p.x, q.p.y, q.p.z])), 3)); smokeG.setAttribute('iA', new THREE.InstancedBufferAttribute(new Float32Array(P.flatMap(q => [q.r, q.s, q.big ? 1 : 0, q.life])), 4));
      smokeG.setAttribute('iB', new THREE.InstancedBufferAttribute(new Float32Array(P.flatMap(q => [q.sp, q.dx, q.dz, q.rot])), 4)); smokeG.instanceCount = P.length; }
    let embG = null; if (b.embers.length) { const R = mulberry32((o.seed || 1) * 7 + 3), pos = [], aY = [], aS = []; for (const e of b.embers) for (let i = 0; i < e.n; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * e.r; pos.push(e.cx + Math.cos(a) * d, e.y0 + R() * (e.y1 - e.y0), e.cz + Math.sin(a) * d); aY.push(e.y0, e.y1); aS.push(.5 + R(), i); }
      embG = new THREE.BufferGeometry(); embG.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); embG.setAttribute('aY', new THREE.Float32BufferAttribute(aY, 2)); embG.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 2)); }
    const T = { kind, o, W, anim: b.anim, I: b.ISL[0], ISL: b.ISL, view: b.view, statics, insts, live, glowG, smokeG, embG, P: [], meshes: [], off: o.off || 0, ranAt: -1 };
    T_ALL.push(T); globalThis.__vlog && __vlog('tpl', kind, Math.round(performance.now() - tq0)); return T; }

  /* ── 자리 정하기 ── */
  const VAR = { heart: [{}], hab: [{}, {}], canyon: [{}, {}], spire: [{}, {}], cald: [{}, {}], isles: [{}, {}], forest: [{ v: { rk: .78, tk: .34 } }, { v: { rk: 1, tk: .3 } }, { v: { rk: .9, tk: .36 } }, { v: { rk: 1.12, tk: .28 } }],
    peak: [{ off: 0 }, { off: 4.1 }, { off: 8.3 }], shard: [{}, {}, {}], tree: [{}, {}], arch: [{}, {}], crown: [{}, {}, {}] };
  const SA = Math.PI * 2 / sect, deg = Math.PI / 180, at = (th, r) => [Math.cos(th) * r, Math.sin(th) * r], Rn = mulberry32(8521), L = [];
  const clash = (a, b) => a === '*' || b === '*' || a === b;   /* 층마다 따로 (가운데층 몸통은 6m로 눌러 아래 사이 섬과 높이가 안 겹침) */
  const JB = { mid: 'm', gap: 'g', upgap: 'ug', up: 'up', dn: 'd', pillar: '*', all: '*', rock: 'g' };
  const AV = []; for (const p of (jungle ? jungle.pieces : [])) { const l = p.o ? JB[p.o.layer] || 'm' : 'm'; if (Math.hypot(p.x, p.z) - p.rad < R1 + 14) AV.push({ x: p.x, z: p.z, r: p.rad * .8, b: l }); }
  for (let i = 0; i < sect; i++) { const [x, z] = at((i + .5) * SA, 136); AV.push({ x, z, r: 8, b: '*' }); }   /* 정글 와드 자리 (기지 사이 한가운데 136m) 비움 */
  const gapOf = (x, z, r, b) => { let m = 1e9; for (const q of AV.concat(L)) { if (!clash(q.b, b)) continue; const d = Math.hypot(q.x - x, q.z - z) - q.r - r; if (d < m) m = d; } return m; };
  const put = (o, x, z) => { const q = { ...o, x, z }; L.push(q); return q; };
  const add = (i, o, rMin, rMax, tries = 30, pref) => { let best = null; const th0 = i * SA;
    if (pref) { const [x, z] = at(pref[0], pref[1]); const g = gapOf(x, z, o.r, o.b); if (g > -1) return put(o, x, z); }
    for (let c = 0; c < tries; c++) { const th = th0 + Rn() * SA, rr = rMin + o.r + Rn() * Math.max(0, rMax - rMin - 2 * o.r), [x, z] = at(th, rr), g = gapOf(x, z, o.r, o.b); if (g < -1.2) continue; if (!best || g > best.g) best = { x, z, g }; }
    if (!best) globalThis.__vlog && __vlog('fail', i, o.t, o.b, o.r.toFixed(1)); return best ? put(o, best.x, best.z) : null; };
  const SPEC = {   /* s = 크기 · sy = 높이 배율 · gref = 원본 땅 높이 기준 · maxD = 땅 밑 깊이(m) */
    heart: { s: .115, gref: 5, maxD: 8 }, hab: { s: .075, gref: 5, maxD: 6 }, canyon: { s: .07, sy: .19, gref: 6.3, maxD: 6 }, spire: { s: .075, gref: 8, maxD: 6 },
    cald: { s: .085, gref: 7.5, maxD: 5 }, isles: { s: .065, gref: 6, maxD: 5 }, forest: { s: .065, sy: .11, gref: 10, maxD: 6 }, peak: { s: .16, gref: 3, maxD: 6 },
    shard: { s: .13, gref: 5.3, maxD: 4 }, tree: { s: .3, sy: 1.4, gref: 10.9, maxD: 7 }, arch: { s: .16, gref: 8, maxD: 5 }, crown: { s: .16, gref: 7, maxD: 5 } };
  const KR = { heart: 186, hab: 186, canyon: 140, spire: 128, cald: 145, forest: 132, isles: 172, peak: 36, shard: 24, tree: 30, arch: 34, crown: 29 };   /* 원본 섬 둘레 (가장자리 출렁임 포함) */
  const item = (t, b, v = 0, ex = {}) => { const S = SPEC[t], s = ex.s || S.s; return { t, b, v, s, sy: ex.sy || (S.sy ? S.sy * s / S.s : s), yaw: ex.yaw != null ? ex.yaw : Rn() * 6.28, r: KR[t] * s * (ex.rk || 1) * (ex.sx ? Math.max(ex.sx, ex.sz) : 1), ...ex }; };
  for (let i = 0; i < sect; i++) { const th0 = i * SA, thg = (i + .5) * SA;
    if (i % 2 === 1) add(i, item('tree', '*', i % 4 === 1 ? 0 : 1), R0, R1, 30, [th0, 128]);   /* 고목 기둥 다섯 (홀수 조각 · 정글 쪽 가장자리) */
    if (i % 2 === 0) add(i, item('heart', i % 4 === 0 ? 'up' : 'd', 0, { yaw: thg * 2.1 }), R0, R1, 30, [thg, 111]);   /* 보물 다섯: 위 셋 · 아래 둘 번갈아 */
    add(i, item('hab', 'm', i % 2, { yaw: thg + 2.4 }), R0, R1, 30, [thg - 8 * deg, 106]);
    add(i, item(i % 2 ? 'spire' : 'canyon', 'm', (i >> 1) % 2, { yaw: i % 4 < 2 ? thg + Math.PI / 2 : thg }), R0, R1, 30, [thg + 10 * deg, 108]);   /* 협곡: 고리를 따라 · 또는 가운데를 향해 */
    for (let n = 0; n < 3; n++) { const v = (i * 3 + n) % 4, sx = .85 + Rn() * .35; add(i, item('forest', 'm', v, { s: .055 + Rn() * .02, sx, sz: 1 / sx * (.9 + Rn() * .25), rk: VAR.forest[v].v.rk }), R0, R1, 40); }   /* 숲: 네 가지 모양 × 크기 · 길쭉함 · 방향 제각각 */
    add(i, item('peak', 'm', i % 3), R0, R1, 40);
    add(i, item('arch', 'm', i % 2, { yaw: thg + Math.PI / 2 + (Rn() - .5) * .8 }), R0, R1, 40);   /* 아치 문은 고리를 따라 나는 방향으로 */
    add(i, item(i % 2 ? 'isles' : 'cald', 'ug', (i >> 1) % 2), R0, R1, 30, [thg + 10 * deg, 109]);
    add(i, item(i % 2 ? 'cald' : 'isles', 'g', ((i >> 1) + 1) % 2), R0, R1, 40);
    for (let n = 0; n < 3; n++) add(i, item(n % 2 ? 'crown' : 'shard', 'm', n % 3, { s: (n % 2 ? .13 : .11) + Rn() * .05 }), R0, R1, 24);
    for (let n = 0; n < 2; n++) add(i, item('shard', 'ug', n + 1, { s: .1 + Rn() * .07 }), R0, R1, 24);
    for (let n = 0; n < 2; n++) add(i, item(n ? 'crown' : 'shard', 'g', n, { s: .1 + Rn() * .06 }), R0, R1, 24);
    for (let n = 0; n < 3; n++) add(i, item(n % 2 ? 'crown' : 'shard', n === 1 ? 'g' : 'ug', n % 3, { s: .09 + Rn() * .05, border: true }), R1 - 8, R1 + 12, 30);   /* 정글 경계에 섞여 들어가는 작은 화산 섬 */
  }

  /* ── 종류마다 한 벌씩 만들기 (분화 첨봉은 터지는 때를 세 갈래로 나눠 세 벌) ── */
  const QOF = { heart: { q: .45, qt: .22, td: 1, tq: .5, v: { gk: .45 } }, hab: { q: .36, qt: .2, td: 1, v: { gk: .35 } }, canyon: { q: .42, qt: .22, td: 1, v: { gk: .5 } }, spire: { q: .45 }, cald: { q: .42, qt: .22, td: 1, v: { gk: .5 } }, isles: { q: .45, qt: .24, td: 1 }, forest: { q: .4, qt: .2, td: 1 },
    peak: { q: .55 }, shard: { q: .55 }, tree: { q: .55, qt: .42, td: 2 }, arch: { q: .55, qt: .3, td: 1 }, crown: { q: .55 } };
  const TPL = {}; let seedN = 300;
  for (const t of Object.keys(VAR)) TPL[t] = VAR[t].map((x, v) => { const S = SPEC[t], q = QOF[t]; if (!L.some(o => o.t === t && o.v % VAR[t].length === v)) return null;
    return template(KD[t], { seed: seedN += 17, pq: .22, minb: .22 / S.s, ...q, ...x, v: { ...(q.v || {}), ...(x.v || {}) }, gref: S.gref, maxD: S.maxD / (S.sy || S.s) }); });

  /* ── 자리마다 놓기 ── */
  const P = [];
  for (const o of L) { const T = TPL[o.t][o.v % TPL[o.t].length] || TPL[o.t].find(Boolean); if (!T) continue; const S = SPEC[o.t];
    const y = (o.t === 'tree' ? DN + 2 : LY[o.b === '*' ? 'm' : o.b]) - S.gref * o.sy, root = new THREE.Group(); root.position.set(o.x, y, o.z); root.rotation.y = o.yaw; root.scale.set(o.s * (o.sx || 1), o.sy, o.s * (o.sz || 1)); scene.add(root); root.updateMatrixWorld(true); root.visible = false;
    const p = { o, T, x: o.x, z: o.z, y, top: y + S.gref * o.sy, root, M: root.matrixWorld.clone(), rad: o.r * 1.15 + 4, vis: false, near: false, pairs: [], fine: [], fz: false };
    if (T.glowG) root.add(Object.assign(new THREE.Mesh(T.glowG, glowM), { frustumCulled: false, renderOrder: 3 }));
    const fine = []; if (T.smokeG) fine.push(root.add(Object.assign(new THREE.Mesh(T.smokeG, smokeM), { frustumCulled: false, renderOrder: 4 })).children.at(-1));
    if (T.embG) fine.push(root.add(Object.assign(new THREE.Points(T.embG, emberM), { frustumCulled: false, renderOrder: 4 })).children.at(-1));
    for (const src of T.live) { const c = src.clone(true), wrap = new THREE.Group(); src.parent.updateMatrixWorld(true); wrap.matrixAutoUpdate = false; wrap.matrix.copy(src.parent.matrixWorld); wrap.add(c); root.add(wrap);   /* 움직이는 것은 자리마다 복사 (모양·재질은 나눠 씀) → 키트 움직임을 따라 함 */
      const a = [], bb = []; src.traverse(x => a.push(x)); c.traverse(x => bb.push(x)); a.forEach((x, i) => { const d = bb[i]; if (d.isPoints && d.material.size) { d.material = d.material.clone(); d.material.size *= o.s; } d.frustumCulled = false; p.pairs.push([x, d]); }); }
    p.fine = fine; for (const f of fine) f.visible = false;
    if (o.t === 'forest') hideMark(root, 0, S.gref, 0, KR.forest * (T.o.v?.rk || 1) * .72 * Math.min(o.sx || 1, o.sz || 1) / (o.sx || 1));   /* 숲 = 숨는 곳 (가장 짧은 쪽 반지름) */
    T.P.push(p); P.push(p); }
  /* 종류마다 멈춘 부분을 한 번에 그리는 판 (자리 수만큼) */
  for (const T of T_ALL) { const n = T.P.length; if (!n) continue;
    for (const st of T.statics) { const im = new THREE.InstancedMesh(st.geo, placeMat(st.mat), n); im.frustumCulled = false; im.count = 0; im.renderOrder = st.ro || 0; im.visible = false; scene.add(im); T.meshes.push({ im, kit: null }); }
    for (const it of T.insts) { const im = new THREE.InstancedMesh(it.geo, placeMat(it.mat), it.Ms.length * n); im.frustumCulled = false; im.count = 0; im.visible = false; if (it.C) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(it.Ms.length * n * 3), 3); scene.add(im); T.meshes.push({ im, kit: it }); } }
  for (const m of new Set([...placeMats.values()])) if (m.isMeshStandardMaterial) m.envMapIntensity = .25;
  T_ALL.forEach(T => T.W.traverse(x => { if (x.material?.isMeshStandardMaterial) x.material.envMapIntensity = .25; }));

  /* ── 매 판: 보일 자리만 · 가까운 것만 움직임 ── */
  const sph = new THREE.Sphere(), fr = new THREE.Frustum(), pv = new THREE.Matrix4(), tmpM = new THREE.Matrix4(), dsz = new THREE.Vector2();
  let FOC = null, FOCY = 0; const setFocus = (Lr, y) => { FOC = Lr; FOCY = y; };
  const update = (t, dt, camera) => { TU.value = t; if (renderer) { renderer.getDrawingBufferSize(dsz); uPS.value = dsz.y * .5; }
    pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); fr.setFromProjectionMatrix(pv); const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
    for (const T of T_ALL) { let changed = false, run = false;
      for (const p of T.P) { const d = Math.hypot(p.x - cx, p.z - cz); sph.center.set(p.x, p.top, p.z); sph.radius = p.rad * (p.o.t === 'tree' ? 3 : 1);
        const other = FOC && Math.abs(p.top - FOCY) > 9 && p.o.b !== '*', vis = d < (other ? 75 : 100) + p.rad && fr.intersectsSphere(sph);
        if (vis !== p.vis) { p.vis = vis; p.root.visible = vis; changed = true; } if (!vis) continue;
        const d3 = Math.hypot(d, p.top - cy); p.near = d3 < 70 + p.rad && !other; if (p.near) run = true;
        const fz = d3 < 48 + p.rad * .6 && !other; if (fz !== p.fz) { p.fz = fz; for (const f of p.fine) f.visible = fz; } }   /* 연기·불티는 가까이에서만 */
      if (changed) { let k = 0; const vp = T.P.filter(p => p.vis);
        for (const { im, kit } of T.meshes) { if (!kit) { vp.forEach((p, i) => im.setMatrixAt(i, p.M)); im.count = vp.length; }
          else { let j = 0; for (const p of vp) for (let i = 0; i < kit.Ms.length; i++) { im.setMatrixAt(j, tmpM.multiplyMatrices(p.M, kit.Ms[i])); if (kit.C) im.setColorAt(j, kit.C[i]); j++; } im.count = j; if (kit.C && im.instanceColor) im.instanceColor.needsUpdate = true; }
          im.instanceMatrix.needsUpdate = true; im.visible = im.count > 0; k++; } }
      if (run && T.ranAt !== t) { T.ranAt = t; const tt = t + T.off; for (const f of T.anim) f(tt, dt);   /* 키트 움직임은 종류마다 한 번 → 가까운 자리들이 따라 함 */
        for (const p of T.P) if (p.vis && p.near) for (const [a, b] of p.pairs) { b.position.copy(a.position); b.quaternion.copy(a.quaternion); b.scale.copy(a.scale); b.visible = a.visible; } } } };
  /* 기믹이 쓸 자리 정보 */
  const peaks = P.filter(p => p.o.t === 'peak').map(p => ({ p, x: p.x, z: p.z, y: LY.m, off: p.T.off, r: 14, cd: -9, lastPh: 0 }));
  const arches = P.filter(p => p.o.t === 'arch').map(p => { const c = new THREE.Vector3(1, 0, 0).applyMatrix4(p.M), ax = Math.cos(p.o.yaw), az = -Math.sin(p.o.yaw); return { p, x: c.x, z: c.z, ax, az, y: LY.m, R: 1.35, off: -99 }; });   /* 아치 가운데 · 지나가는 방향 = 섬의 x축 */
  return { update, setFocus, P, L, T: T_ALL, peaks, arches, LY, info: () => ({ placements: P.length, templates: T_ALL.length, draws: T_ALL.reduce((a, T) => a + T.meshes.filter(m => m.im.visible).length, 0) + P.filter(p => p.vis).reduce((a, p) => a + p.root.children.length, 0) }) };
}
