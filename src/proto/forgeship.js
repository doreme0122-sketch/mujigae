/* 초프리미엄 스킨 → 게임판 기체 (사용자 2026-11-09: THEME_FORGE 스킨을 넣고 60프레임 유지)
   만드는 건 작업대 원본 그대로(forge.js) — 로딩 때 한 번, 겉모습은 그대로 두고 속만 가볍게 바꿔 끼움
   ① 미리 움직여 보기: 6초 동안 제자리 · 무빙 · 전투를 번갈아 돌려 보며 어느 부품이 움직이는지 기록
   ② 합치기: 같이 움직이는 덩어리(몸 · 날개 한쪽 · 턱 …) 안에서 같은 칠끼리 하나로 → 그리기 횟수가 확 줄어듦
   ③ 꼭짓점 이어 붙이기: 비늘처럼 면마다 각진 조각은 '각진 칠'로 바꿔 꼭짓점을 이어 붙임 (각진 모습 그대로, 꼭짓점은 1/3) · 삼각형 수는 원본 그대로
   ④ 빛 덩이(뿌연 후광 점) 수십 개 → 한 번에 그림 (깜빡임·크기 변화는 원본 움직임 그대로 따라감)
   ⑤ 불빛: 작업대의 불빛 셋(위 · 옆 · 아래)과 기체 안 불씨 빛을 기체 칠 안에서만 계산 → 맵 전체에 빛을 더하지 않아 맵은 그대로 가벼움
   ⑥ 색: 작업대 화면과 같은 색이 나오도록 마지막 색 곡선을 맞춤
   효과(불길 · 번개 · 구름 · 뒤꼬리)는 아직 안 넣음 — 몸 먼저 (사용자 2026-11-09) */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier as MO } from '../../vendor/meshopt_simplifier.module.js';
import { makeForge } from './forge.js';

const ERR_X = .004;   /* 벽 너머 비침(윤곽 빛)만 삼각형을 덜어냄 · 기체 몸은 덜어내지 않음 (줄여 보니 꼬리 갑옷이 일그러짐 → 원본 그대로) */
const KEYL = [[4, 9, -3, 0xfff4e6, 2.2], [-8, 1, 6, 0x6a8cff, 1.6], [5, -4, 6, 0x9fd8ff, .5]];   /* 작업대 불빛 셋: 위(주 빛) · 왼쪽 옆(푸른 테두리) · 아래(채움) */

/* 색: 작업대는 화면 색 = sRGB(ACES 곡선(빛)) · 이 맵은 마지막에 c/(1+.52c) 곡선 + 2.2 감마를 씀 → 그 곡선을 거꾸로 걸어 둬서 같은 색이 나오게 */
const TONE = `
vec3 fgRRT(vec3 v){ vec3 a = v * (v + .0245786) - .000090537, b = v * (.983729 * v + .4329510) + .238081; return a / b; }
vec3 fgACES(vec3 c){ const mat3 I = mat3(vec3(.59719,.07600,.02840), vec3(.35458,.90834,.13383), vec3(.04823,.01566,.83777));
  const mat3 O = mat3(vec3(1.60475,-.10208,-.00327), vec3(-.53108,1.10813,-.07276), vec3(-.07367,-.00605,1.07602)); return clamp(O * fgRRT(I * (c / .6)), 0., 1.); }
vec3 fgOut(vec3 a){ a = clamp(a, 0., 1.); vec3 s = mix(a * 12.92, 1.055 * pow(a, vec3(1. / 2.4)) - .055, step(.0031308, a)), T = pow(s, vec3(2.2)); return T / max(1. - .52 * T, .03); }
`;
/* 불빛 계산 (three 원래 계산 그대로 · 맵의 해·하늘빛 대신 작업대 빛만) */
const LIGHTS = n => `
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
  geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
  float dotNVi = saturate( dot( normal, geometryViewDir ) );
  if ( material.iridescenceThickness == 0.0 ) { material.iridescence = 0.0; } else { material.iridescence = saturate( material.iridescence ); }
  if ( material.iridescence > 0.0 ) { material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor ); material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi ); }
#endif
IncidentLight directLight;
#if defined( RE_Direct )
  for (int i = 0; i < 3; i++) { directLight.color = fgDC[i]; directLight.direction = fgDD[i]; directLight.visible = true;
    RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight ); }
  ${n ? `for (int i = 0; i < ${n}; i++) { vec3 lv = fgPP[i] - geometryPosition; float d = length(lv); directLight.direction = lv / max(d, 1e-6);
    directLight.color = fgPC[i] * getDistanceAttenuation( d * fgK, fgPD[i].x, fgPD[i].y ); directLight.visible = true;
    RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight ); }` : ''}
#endif
#if defined( RE_IndirectDiffuse )
  vec3 iblIrradiance = vec3( 0.0 );
  vec3 irradiance = vec3( 0.0 );
#endif
#if defined( RE_IndirectSpecular )
  vec3 radiance = vec3( 0.0 );
  vec3 clearcoatRadiance = vec3( 0.0 );
#endif
`;

let F = null;
export function forgeList(renderer, camera) { F ||= makeForge(renderer, camera); return F.CATALOG.map((c, i) => ({ i, id: c.id, name: c.kname.split(' · ')[0], theme: c.theme })); }

/* 재질이 '부품 자기 자리' 좌표를 쓰는지
   · 1: 자기 자리 좌표로 무늬를 그림(불길 · 눈동자) → 합칠 때 원래 자리 좌표를 꼭짓점마다 따로 적어 두고(fgOP) 칠이 그 값을 읽게 바꿈 → 무늬 그대로
   · 2: 자기 자리 방향으로 꼭짓점을 휨(꼬리 흔들기) → 돌리거나 키운 부품은 같은 자리끼리만 합침 (옮기기만 한 건 휘는 방향이 같아 그대로 합침) */
const codeOf = m => (m.isShaderMaterial ? m.vertexShader : '') + (m.onBeforeCompile && m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile ? m.onBeforeCompile.toString() : '');
const READS_POS = /=\s*position\b|position\s*\.\s*[xyz]/, BENDS = /transformed\s*\.\s*[xyz]+\s*[+\-*]?=/;
function spaceBound(m, g) {   /* 둘 다일 수 있음 (꼬리 끝 불빛: 자리 무늬 + 꼬리 휘기) */
  const src = codeOf(m); let f = READS_POS.test(src) ? 1 : 0;
  if (BENDS.test(src)) { const at = [...src.matchAll(/attribute\s+float\s+(\w+)/g)].map(a => a[1]); if (at.length === 0 || at.some(a => g.attributes[a])) f |= 2; }
  return f;
}
const fgOPize = sh => sh.replace(/=\s*position\b/g, '= fgOP').replace(/position\s*\.\s*([xyz]+)/g, 'fgOP.$1');
const linIdent = M => { const e = M.elements; return Math.abs(e[0] - 1) + Math.abs(e[5] - 1) + Math.abs(e[10] - 1) + Math.abs(e[1]) + Math.abs(e[2]) + Math.abs(e[4]) + Math.abs(e[6]) + Math.abs(e[8]) + Math.abs(e[9]) < 1e-5; };
const isFlat = g => { if (g.index || !g.attributes.normal) return false; const n = g.attributes.normal.array, c = n.length / 9, st = Math.max(1, Math.floor(c / 400));
  for (let t = 0; t < c; t += st) { const o = t * 9; for (let k = 0; k < 3; k++) if (Math.abs(n[o + k] - n[o + 3 + k]) > 1e-4 || Math.abs(n[o + k] - n[o + 6 + k]) > 1e-4) return false; } return true; };
/* 꼭짓점 이어 붙이기: 모든 값이 같은 꼭짓점을 하나로 (flat이면 빛 방향 값은 빼고 비교 — 각진 칠이 면마다 다시 계산) */
function weld(g, dropNormal) {
  const names = Object.keys(g.attributes).filter(k => !(dropNormal && k === 'normal')), n = g.attributes.position.count, map = new Map(), remap = new Uint32Array(n); let m = 0; const keep = [];
  for (let i = 0; i < n; i++) { let key = ''; for (const k of names) { const a = g.attributes[k]; for (let c = 0; c < a.itemSize; c++) key += Math.round(a.array[i * a.itemSize + c] * 1e5) + ','; }
    let j = map.get(key); if (j === undefined) { j = m++; map.set(key, j); keep.push(i); } remap[i] = j; }
  const out = new THREE.BufferGeometry();
  for (const k of names) { const a = g.attributes[k], A = new a.array.constructor(m * a.itemSize); keep.forEach((src, d) => { for (let c = 0; c < a.itemSize; c++) A[d * a.itemSize + c] = a.array[src * a.itemSize + c]; }); out.setAttribute(k, new THREE.BufferAttribute(A, a.itemSize, a.normalized)); }
  const idx = g.index ? g.index.array : null, cnt = idx ? idx.length : n, I = new Uint32Array(cnt); for (let i = 0; i < cnt; i++) I[i] = remap[idx ? idx[i] : i]; out.setIndex(new THREE.BufferAttribute(I, 1));
  return out;
}
/* 삼각형 줄이기 (벽 너머 비침 윤곽에만 씀) + 안 쓰는 꼭짓점 정리 */
function simplify(g, err) {
  if (!g.index || g.index.count < 900) return g;
  const P = g.attributes.position, pos = P.array instanceof Float32Array && P.itemSize === 3 && !P.isInterleavedBufferAttribute ? P.array : Float32Array.from({ length: P.count * 3 }, (_, i) => P.getComponent(i / 3 | 0, i % 3));
  const [I] = MO.simplify(new Uint32Array(g.index.array), pos, 3, 0, err, ['ErrorAbsolute']);
  const used = new Int32Array(P.count).fill(-1); let m = 0; for (let i = 0; i < I.length; i++) if (used[I[i]] < 0) used[I[i]] = m++;
  const out = new THREE.BufferGeometry();
  for (const k of Object.keys(g.attributes)) { const a = g.attributes[k], A = new a.array.constructor(m * a.itemSize); for (let i = 0; i < P.count; i++) if (used[i] >= 0) for (let c = 0; c < a.itemSize; c++) A[used[i] * a.itemSize + c] = a.getComponent(i, c); out.setAttribute(k, new THREE.BufferAttribute(A, a.itemSize, a.normalized)); }
  const J = new Uint32Array(I.length); for (let i = 0; i < I.length; i++) J[i] = used[I[i]]; out.setIndex(new THREE.BufferAttribute(J, 1)); return out;
}
const sig = g => Object.keys(g.attributes).sort().map(k => { const a = g.attributes[k]; return k + a.itemSize + (a.normalized ? 'n' : '') + a.array.constructor.name; }).join(',');

/* fi: 기체 종류(0~8) · size: 게임에서 기체 가장 긴 쪽(날개폭이나 몸길이) */
export async function makeForgeShip(renderer, camera, fi, { size = 2.4, patch = true } = {}) {   /* patch: false = 칠을 바꾸지 않음 (원본과 비교 시험용) */
  await MO.ready; const t0 = performance.now();
  F ||= makeForge(renderer, camera); F.setNoFx(true);
  const C = F.CATALOG[fi], S = F.buildShip(fi, 0, 0); F.scene.remove(S.root);
  /* 몸 전체 흔들림(좌우 기울기 · 위아래 출렁임)은 게임 비행이 따로 줌 → 작업대 것은 끔 (두 번 흔들리면 붕 떠 보임) · 날개짓 · 꼬리 · 턱은 그대로 */
  const upd0 = S.update.bind(S); S.update = (dt, t) => { upd0(dt, t); S.body.position.set(0, 0, 0); S.body.rotation.set(0, 0, 0); };
  const root = new THREE.Group(), sm = new THREE.Group(); root.add(sm); sm.add(S.root);
  /* 불빛: 기체 안 불씨 빛은 장면에서 떼어 기체 칠 안에서만 계산 (밝기 깜빡임은 원본 움직임이 그대로 바꿈) */
  const PL = []; S.root.traverse(o => { if (o.isPointLight) PL.push({ L: o, parent: o.parent }); }); PL.forEach(p => p.parent.remove(p.L));
  /* ① 미리 움직여 보기 */
  const nodes = [], first = new Map(), moved = new Set(); S.root.traverse(o => nodes.push(o));
  const keyOf = o => { o.updateMatrix(); let k = o.matrix.elements.map(e => e.toFixed(4)).join(',') + '|' + o.visible; if (o.isMesh) k += '|' + o.material.uuid + '|' + (o.material.opacity ?? 1) + '|' + o.geometry.uuid + '|' + o.geometry.attributes.position.version; return k; };
  const watch = () => { for (const o of nodes) { if (moved.has(o)) continue; const k = keyOf(o), f = first.get(o); if (f == null) first.set(o, k); else if (f !== k) moved.add(o); } };
  { let t = 0; for (const [m, fire] of [['cruise', 0], ['boost', 0], ['cruise', 1], ['boost', 1], ['cruise', 0]]) { if (S.mode !== m) S.setMode(m); S.fire = !!fire; for (let i = 0; i < 36; i++) { S.update(1 / 30, t); t += 1 / 30; S.root.updateMatrixWorld(true); watch(); } } S.setMode('cruise'); S.fire = false; }
  const stat0 = { meshes: 0, tris: 0 }; S.root.traverse(o => { if (o.isMesh) { stat0.meshes++; const g = o.geometry; stat0.tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
  /* 겉 크기(빛 덩이 빼고 몸만)로 게임 크기 맞춤 */
  { const bb = new THREE.Box3(); S.root.updateMatrixWorld(true); S.root.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); bb.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
    const sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3()), k = size / Math.max(sz.x, sz.z); sm.scale.setScalar(k); sm.position.copy(c).multiplyScalar(-k); }
  /* ② 합치기 + ③ 꼭짓점 이어 붙이기 */
  const rigid = o => { for (let q = o.parent; q && q !== S.root; q = q.parent) if (moved.has(q)) return q; return S.root; };
  const flatMat = new Map(); S.root.traverse(o => { if (!o.isMesh) return; const f = isFlat(o.geometry); flatMat.set(o.material, (flatMat.get(o.material) ?? true) && f); });
  for (const [m, f] of flatMat) if (f) { m.flatShading = true; m.needsUpdate = true; }
  const groups = new Map(), inv = new THREE.Matrix4(), rel = new THREE.Matrix4(), I4 = new THREE.Matrix4(); S.root.updateMatrixWorld(true);
  S.root.traverse(o => { if (!o.isMesh || moved.has(o) || o.isInstancedMesh || Array.isArray(o.material) || !first.get(o)?.includes('|true|')) return;
    const R = rigid(o); inv.copy(R.matrixWorld).invert(); rel.multiplyMatrices(inv, o.matrixWorld);
    for (let q = o; q && q !== R; q = q.parent) if (!q.visible) return;
    const sb = spaceBound(o.material, o.geometry), keep = (sb & 2) && !linIdent(rel), rk = keep ? rel.elements.map(e => e.toFixed(5)).join(',') : '';
    const k = R.uuid + '|' + o.material.uuid + '|' + o.renderOrder + '|' + rk; if (!groups.has(k)) groups.set(k, { R, list: [], at: keep ? rel.clone() : null }); groups.get(k).list.push(o); });
  /* 자기 자리 좌표로 무늬를 그리는 칠: 그 칠을 쓰는 모든 부품에 원래 자리 좌표(fgOP)를 붙임 (안 합치는 부품은 자리 값 그대로 같이 씀 → 매번 모양이 바뀌는 부품도 그대로 따라감) */
  const opMats = new Set(); S.root.traverse(o => { if (o.isMesh && spaceBound(o.material, o.geometry) & 1) opMats.add(o.material); });
  S.root.traverse(o => { if (o.isMesh && opMats.has(o.material) && !o.geometry.attributes.fgOP) o.geometry.setAttribute('fgOP', o.geometry.attributes.position); });
  for (const m of opMats) { if (m.isShaderMaterial) { m.vertexShader = 'attribute vec3 fgOP;\n' + fgOPize(m.vertexShader); m.needsUpdate = true; } else m.userData.fgOP = true; }
  for (const { R, list, at } of groups.values()) { inv.copy(R.matrixWorld).invert(); const flat = flatMat.get(list[0].material);
    const parts = list.map(o => { let g = o.geometry.clone(); for (const k of Object.keys(g.attributes)) if (g.attributes[k].isInterleavedBufferAttribute || k === 'fgOP') g.setAttribute(k, g.attributes[k].clone()); for (const k of Object.keys(g.morphAttributes)) delete g.morphAttributes[k];
      if (!at) g.applyMatrix4(rel.multiplyMatrices(inv, o.matrixWorld)); g = weld(g, flat); return g; });
    const bySig = new Map(); parts.forEach((g, i) => { const s = sig(g); if (!bySig.has(s)) bySig.set(s, []); bySig.get(s).push(i); });
    for (const ids of bySig.values()) { const mg = ids.length > 1 ? mergeGeometries(ids.map(i => parts[i]), false) : parts[ids[0]]; if (!mg) continue; const g = mg; g.computeBoundingSphere();
      const me = new THREE.Mesh(g, list[ids[0]].material); me.renderOrder = list[ids[0]].renderOrder; me.frustumCulled = ids.every(i => list[i].frustumCulled); me.name = 'fgMerged'; if (at) at.decompose(me.position, me.quaternion, me.scale); R.add(me);
      for (const i of ids) list[i].parent.remove(list[i]); }
    parts.forEach(g => g.dispose()); }
  /* ④ 빛 덩이 한 번에 그리기 */
  const batches = []; { const byK = new Map(); S.root.traverse(o => { if (!o.isSprite) return; const m = o.material, k = (m.map?.uuid || '') + m.blending + m.depthTest + m.depthWrite + o.renderOrder + m.toneMapped; if (!byK.has(k)) byK.set(k, []); byK.get(k).push(o); });
    for (const list of byK.values()) { const n = list.length, m0 = list[0].material, toned = C.fireFX || m0.toneMapped !== false;
      const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-.5, -.5, 0, .5, -.5, 0, .5, .5, 0, -.5, .5, 0], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
      const iP = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3), iS = new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2), iC = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4); [iP, iS, iC].forEach(a => a.setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('iP', iP); g.setAttribute('iS', iS); g.setAttribute('iC', iC); g.instanceCount = n;
      const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: m0.map } }, transparent: true, blending: m0.blending, depthTest: m0.depthTest, depthWrite: m0.depthWrite,
        vertexShader: 'attribute vec3 iP; attribute vec2 iS; attribute vec4 iC; varying vec2 vU; varying vec4 vC; void main(){ vU = uv; vC = iC; vec4 mv = modelViewMatrix * vec4(iP, 1.); mv.xy += position.xy * iS; gl_Position = projectionMatrix * mv; }',
        fragmentShader: TONE + `uniform sampler2D map; varying vec2 vU; varying vec4 vC; void main(){ vec4 c = vC; ${m0.map ? 'c *= texture2D(map, vU);' : ''} gl_FragColor = vec4(fgOut(${toned ? 'fgACES(c.rgb)' : 'c.rgb'}), c.a); }` });
      const me = new THREE.Mesh(g, mat); me.frustumCulled = false; me.renderOrder = list[0].renderOrder; me.name = 'fgSprites'; sm.add(me);
      const rec = list.map(s => { const p = s.parent; p.remove(s); return { s, p }; }); batches.push({ me, rec, iP, iS, iC }); } }
  const mw = new THREE.Matrix4(), vp = new THREE.Vector3(), vq = new THREE.Quaternion(), vs = new THREE.Vector3(), mi = new THREE.Matrix4();
  const syncSprites = () => { for (const b of batches) { mi.copy(b.me.matrixWorld).invert();
    b.rec.forEach(({ s, p }, i) => { s.updateMatrix(); mw.multiplyMatrices(p.matrixWorld, s.matrix); mw.decompose(vp, vq, vs); let on = s.visible; for (let q = p; q && on; q = q.parent) on = q.visible;
      vp.applyMatrix4(mi); b.iP.setXYZ(i, vp.x, vp.y, vp.z); b.iS.setXY(i, vs.x, vs.y); const c = s.material.color, a = on ? s.material.opacity : 0; b.iC.setXYZW(i, c.r, c.g, c.b, a); });
    b.iP.needsUpdate = b.iS.needsUpdate = b.iC.needsUpdate = true; } };
  /* ⑤ ⑥ 칠마다 불빛 · 색 곡선 끼우기 */
  const NP = PL.length, U = { fgDD: { value: KEYL.map(() => new THREE.Vector3()) }, fgDC: { value: KEYL.map(l => new THREE.Color(l[3]).multiplyScalar(l[4])) }, fgK: { value: 1 } };
  if (NP) Object.assign(U, { fgPP: { value: PL.map(() => new THREE.Vector3()) }, fgPC: { value: PL.map(() => new THREE.Color()) }, fgPD: { value: PL.map(p => new THREE.Vector2(p.L.distance, p.L.decay)) } });
  const DECL = `uniform vec3 fgDD[3]; uniform vec3 fgDC[3]; uniform float fgK;${NP ? ` uniform vec3 fgPP[${NP}]; uniform vec3 fgPC[${NP}]; uniform vec2 fgPD[${NP}];` : ''}\n`;
  const seen = new Set(); if (patch) sm.traverse(o => { if (!(o.isMesh || o.isPoints || o.isLine) || o.name === 'fgSprites') return; for (const m of [].concat(o.material)) { if (!m || seen.has(m)) continue; seen.add(m);
    if (m.isShaderMaterial) { const toned = C.fireFX || m.fragmentShader.includes('#include <tonemapping_fragment>');
      if (m.fragmentShader.includes('#include <tonemapping_fragment>')) m.fragmentShader = m.fragmentShader.replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb = fgOut(fgACES(gl_FragColor.rgb));');
      else { const e = m.fragmentShader.lastIndexOf('}'); m.fragmentShader = m.fragmentShader.slice(0, e) + `\n gl_FragColor.rgb = fgOut(${toned ? 'fgACES(gl_FragColor.rgb)' : 'gl_FragColor.rgb'});\n}`; }
      m.fragmentShader = TONE + m.fragmentShader; m.needsUpdate = true; continue; }
    const lit = 'envMap' in m && !m.isMeshBasicMaterial, toned = C.fireFX || m.toneMapped !== false;
    if (lit && !m.envMap) { m.envMap = F.ENV; m.envMapIntensity = (m.envMapIntensity ?? 1) * .75; }   /* 작업대 방 빛(장면 빛 .75)과 같게 */
    const prev = m.onBeforeCompile, pk = m.customProgramCacheKey;
    m.onBeforeCompile = (sh, r) => { prev.call(m, sh, r); Object.assign(sh.uniforms, U); if (m.userData.fgOP) sh.vertexShader = 'attribute vec3 fgOP;\n' + fgOPize(sh.vertexShader);
      let f = sh.fragmentShader.replace('void main() {', TONE + DECL + 'void main() {').replace('#include <tonemapping_fragment>', `gl_FragColor.rgb = fgOut(${toned ? 'fgACES(gl_FragColor.rgb)' : 'gl_FragColor.rgb'});`);
      if (lit) f = f.replace('#include <lights_fragment_begin>', LIGHTS(NP)); sh.fragmentShader = f; };
    m.customProgramCacheKey = () => pk.call(m) + '|fg' + NP + (toned ? 't' : 'u'); m.needsUpdate = true; } });
  const lv = new THREE.Vector3(), wq = new THREE.Vector3();
  const preRender = cam => { sm.updateMatrixWorld(true); const V = cam.matrixWorldInverse, k = sm.matrixWorld.getMaxScaleOnAxis(); U.fgK.value = 1 / k;
    KEYL.forEach((l, i) => U.fgDD.value[i].set(l[0], l[1], l[2]).normalize().transformDirection(V));
    PL.forEach((p, i) => { p.L.updateMatrix(); lv.setFromMatrixPosition(mw.multiplyMatrices(p.parent.matrixWorld, p.L.matrix)).applyMatrix4(V); U.fgPP.value[i].copy(lv); U.fgPC.value[i].copy(p.L.color).multiplyScalar(p.L.intensity); });
    syncSprites(); };
  /* 그리기 횟수 · 삼각형 수 */
  const stats = () => { let d = 0, t = 0; sm.traverse(o => { if (!o.isMesh || o.name === 'xray') return; let on = true; for (let q = o; q && on; q = q.parent) on = q.visible; if (!on) return; d++; const g = o.geometry; t += (g.index ? g.index.count : g.attributes.position.count) / 3 * (g.isInstancedBufferGeometry ? g.instanceCount : 1); }); return { draws: d, tris: Math.round(t) }; };
  /* 벽 너머 비침: 같이 움직이는 덩어리마다 윤곽 하나 (모양이 매 장면 바뀌는 부품은 그 모양을 그대로 씀) */
  const buildXray = mat => { const by = new Map(), out = []; S.root.updateMatrixWorld(true);
    S.root.traverse(o => { if (!o.isMesh || o.name === 'fgSprites' || o.name === 'xray' || o.material.blending === THREE.AdditiveBlending) return;   /* 빛 껍질(더하는 빛)은 윤곽에서 뺌 */
      if (moved.has(o) && first.get(o) && keyOf(o).split('|').pop() !== first.get(o).split('|').pop()) { const x = new THREE.Mesh(o.geometry, mat); x.renderOrder = 60; x.frustumCulled = false; x.name = 'xray'; o.add(x); out.push(x); return; }   /* 날개 안쪽 막 · 볼 살처럼 매번 모양이 바뀜 */
      const R = moved.has(o) ? o : rigid(o); if (!by.has(R)) by.set(R, []); by.get(R).push(o); });
    for (const [R, list] of by) { inv.copy(R.matrixWorld).invert();
      const parts = list.map(o => { const g = new THREE.BufferGeometry(); g.setAttribute('position', o.geometry.attributes.position.clone()); if (o.geometry.index) g.setIndex(o.geometry.index.clone()); g.applyMatrix4(rel.multiplyMatrices(inv, o.matrixWorld)); return weld(g, true); });
      const mg = parts.length > 1 ? mergeGeometries(parts, false) : parts[0]; parts.forEach(g => g !== mg && g.dispose()); if (!mg) continue; const g = simplify(mg, ERR_X); g.computeVertexNormals();
      const x = new THREE.Mesh(g, mat); x.renderOrder = 60; x.frustumCulled = false; x.name = 'xray'; R.add(x); out.push(x); }
    /* 그리는 순서: 맵 → 비침 → 기체. 비침을 기체보다 먼저 그려야 '맵에 가려진 곳'만 빛나고, 기체가 자기 몸에 겹친 곳(비늘 아래 갑옷 등)은 안 빛남 (기체 가운데가 반투명해 보이던 원인) */
    sm.traverse(o => { if (o.isMesh && o.name !== 'xray' && !o.material.transparent) o.renderOrder += 61; });
    return out; };
  let tA = 0; const step = (dt, t, { moving = false, fire = false } = {}) => { const m = moving ? C.moving : 'cruise'; if (S.mode !== m) S.setMode(m); S.fire = fire; S.update(Math.min(dt, .05), t); F.PRISM_U.uT.value = t; };
  const s1 = stats(); console.log(`[스킨] ${C.kname} · 원본 그리기 ${stat0.meshes}번 · 삼각형 ${(stat0.tris / 1000).toFixed(0)}k → 게임판 그리기 ${s1.draws}번 · 삼각형 ${(s1.tris / 1000).toFixed(0)}k · 빛 ${NP} · ${(performance.now() - t0).toFixed(0)}ms`);
  root.userData.forge = true;
  return { root, sm, S, C, step, preRender, stats, before: stat0, buildXray, engines: [] };
}
