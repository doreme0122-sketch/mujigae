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
import { MeshoptSimplifier as MO } from '../../vendor/meshopt_simplifier.module.js?v=11140030';
import { makeForge } from './forge.js?v=11140030';

const ERR_X = .004;   /* 벽 너머 비침(윤곽 빛)만 삼각형을 덜어냄 · 기체 몸은 덜어내지 않음 (줄여 보니 꼬리 갑옷이 일그러짐 → 원본 그대로) */
const KEYL = [[4, 9, -3, 0xfff4e6, 2.2], [-8, 1, 6, 0x6a8cff, 1.6], [5, -4, 6, 0x9fd8ff, .5]];   /* 작업대 불빛 셋: 위(주 빛) · 왼쪽 옆(푸른 테두리) · 아래(채움) */

/* 색: 작업대는 화면 색 = sRGB(ACES 곡선(빛)) · 이 맵은 마지막에 c/(1+.52c) 곡선 + 2.2 감마를 씀 → 그 곡선을 거꾸로 걸어 둬서 같은 색이 나오게 */
const TONE = `
vec3 fgRRT(vec3 v){ vec3 a = v * (v + .0245786) - .000090537, b = v * (.983729 * v + .4329510) + .238081; return a / b; }
vec3 fgACES(vec3 c){ const mat3 I = mat3(vec3(.59719,.07600,.02840), vec3(.35458,.90834,.13383), vec3(.04823,.01566,.83777));
  const mat3 O = mat3(vec3(1.60475,-.10208,-.00327), vec3(-.53108,1.10813,-.07276), vec3(-.07367,-.00605,1.07602)); return clamp(O * fgRRT(I * (c / .6)), 0., 1.); }
vec3 fgOut(vec3 a){ a = clamp(a, 0., 1.); vec3 s = mix(a * 12.92, 1.055 * pow(a, vec3(1. / 2.4)) - .055, step(.0031308, a)), T = pow(s, vec3(2.2)); return T / max(1. - .52 * T, .03); }
vec3 fgSRGB(vec3 a){ a = clamp(a, 0., 1.); return mix(a * 12.92, 1.055 * pow(a, vec3(1. / 2.4)) - .055, step(.0031308, a)); }
/* 더하는 빛(후광 · 불꽃 알갱이): 작업대는 화면 색(sRGB)에 투명도만큼 더함 → 그 더한 결과가 같게 투명도까지 넣어 거꾸로 계산 (안 그러면 넓게 납작하고 너무 밝아짐) */
vec3 fgOutA(vec3 a, float al){ al = clamp(al, 1e-4, 1.); vec3 T = pow(clamp(al * fgSRGB(a), 0., 1.), vec3(2.2)); return T / max(1. - .52 * T, .03) / al; }
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
   · 1: 자기 자리 좌표를 값으로 넘겨 무늬를 그림(불길 · 눈동자) → 합칠 때 원래 자리 좌표를 꼭짓점마다 따로 적어 두고(fgOP) 칠이 그 값을 읽게 바꿈 → 무늬 그대로
   · 2: 자기 자리 방향으로 꼭짓점을 휨(꼬리 흔들기) → 돌리거나 키운 부품은 같은 자리끼리만 합침 (옮기기만 한 건 휘는 방향이 같아 그대로 합침)
   · 4: 자리 좌표를 그 밖의 여러 곳에 씀(불길 효과 알갱이) → 바꿔 끼우지 않고 같은 자리 부품끼리만, 그 자리 그대로 합침 */
const codeOf = m => (m.isShaderMaterial ? m.vertexShader : '') + (m.onBeforeCompile && m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile ? m.onBeforeCompile.toString() : '');
const READS_POS = /=\s*position\b|position\s*\.\s*[xyz]/, BENDS = /transformed\s*\.\s*[xyz]+\s*[+\-*]?=/;
const cnt = (s, re) => (s.match(re) || []).length;
function spaceBound(m, g) {   /* 여러 개일 수 있음 (꼬리 끝 불빛: 자리 무늬 + 꼬리 휘기) */
  const src = codeOf(m); let f = 0;
  const all = cnt(src, /\bposition\b/g), ok = cnt(src, /=\s*position\b/g) + cnt(src, /position\s*\.\s*[xyz]/g) + cnt(src, /vec4\s*\(\s*position\s*,\s*1\.?0?\s*\)/g);
  if (all > ok) f |= 4; else if (READS_POS.test(src)) f |= 1;
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
const outX = (v, a, toned, add) => { const x = toned ? `fgACES(${v})` : v; return add ? `fgOutA(${x}, ${a})` : `fgOut(${x})`; };
const sig = g => Object.keys(g.attributes).sort().map(k => { const a = g.attributes[k]; return k + a.itemSize + (a.normalized ? 'n' : '') + a.array.constructor.name; }).join(',');

/* fi: 기체 종류(0~8) · size: 게임에서 기체 가장 긴 쪽(날개폭이나 몸길이) */
export async function makeForgeShip(renderer, camera, fi, { size = 3.6 } = {}) {
  await MO.ready; const t0 = performance.now();
  F ||= makeForge(renderer, camera);
  /* 효과 움직임 가려내기: 효과 없이 한 번 만들어 몸 움직임 목록을 받아 둠 → 효과까지 넣어 만든 목록에서 나머지가 효과 움직임 */
  F.setNoFx(true); const S0 = F.buildShip(fi, 0, 0); F.scene.remove(S0.root); const bodyFx = new Set(S0.extras.map(f => f.toString()));
  F.setNoFx(false);   /* 효과 모두 켬 (사용자 2026-11-09) */
  const C = F.CATALOG[fi], S = F.buildShip(fi, 0, 0); F.scene.remove(S.root);
  /* 효과 바람: 작업대가 서 있는 기체에 '빨리 나는 중'을 흉내 내던 강한 뒷바람은 빼고 늘 '떠 있기' 바람 (사용자 2026-11-10)
     → 효과는 '지나간 자리에 남고, 나온 순서대로 사라진다' 두 가지만 · 뒤로 길게 남는 건 기체가 실제로 지나간 길이 만듦 · 날개짓 같은 몸 움직임은 무빙 자세 그대로 */
  S.extras = S.extras.map(f => bodyFx.has(f.toString()) ? f : (sh, dt, t) => { const m = sh.mode, mt = sh.mt; sh.mode = 'cruise'; sh.mt = 99; f(sh, dt, t); sh.mode = m; sh.mt = mt; });
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
  { const bb = new THREE.Box3(); S.root.updateMatrixWorld(true); S.root.traverse(o => { if (!o.isMesh) return; const g = o.geometry; if (!g.attributes.position.array.every(Number.isFinite)) return; g.computeBoundingBox(); bb.union(g.boundingBox.clone().applyMatrix4(o.matrixWorld)); });   /* 아직 자리가 안 정해진 효과 조각(숫자 아님)은 빼고 */
    const sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3()), k = size / Math.max(sz.x, sz.z); sm.scale.setScalar(k); sm.position.copy(c).multiplyScalar(-k); }
  /* ② 합치기 + ③ 꼭짓점 이어 붙이기 */
  const rigid = o => { for (let q = o.parent; q && q !== S.root; q = q.parent) if (moved.has(q)) return q; return S.root; };
  const flatMat = new Map(); S.root.traverse(o => { if (!o.isMesh) return; const f = isFlat(o.geometry); flatMat.set(o.material, (flatMat.get(o.material) ?? true) && f); });
  for (const [m, f] of flatMat) if (f) { m.flatShading = true; m.needsUpdate = true; }
  const groups = new Map(), inv = new THREE.Matrix4(), rel = new THREE.Matrix4(), I4 = new THREE.Matrix4(); S.root.updateMatrixWorld(true);
  S.root.traverse(o => { if (!o.isMesh || moved.has(o) || o.isInstancedMesh || Array.isArray(o.material) || !first.get(o)?.includes('|true|')) return;
    const R = rigid(o); inv.copy(R.matrixWorld).invert(); rel.multiplyMatrices(inv, o.matrixWorld);
    for (let q = o; q && q !== R; q = q.parent) if (!q.visible) return;
    const sb = spaceBound(o.material, o.geometry), keep = ((sb & 2) && !linIdent(rel)) || ((sb & 4) && !rel.equals(I4)), rk = keep ? rel.elements.map(e => e.toFixed(5)).join(',') : '';
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
        fragmentShader: TONE + `uniform sampler2D map; varying vec2 vU; varying vec4 vC; void main(){ vec4 c = vC; ${m0.map ? 'c *= texture2D(map, vU);' : ''} gl_FragColor = vec4(${outX('c.rgb', 'c.a', toned, m0.blending === THREE.AdditiveBlending)}, c.a); }` });
      const me = new THREE.Mesh(g, mat); me.frustumCulled = false; me.renderOrder = list[0].renderOrder; me.name = 'fgSprites'; sm.add(me);
      const rec = list.map(s => { const p = s.parent; p.remove(s); return { s, p }; }); batches.push({ me, rec, iP, iS, iC }); } }
  const mw = new THREE.Matrix4(), vp = new THREE.Vector3(), vq = new THREE.Quaternion(), vs = new THREE.Vector3(), mi = new THREE.Matrix4();
  /* 구름 덩이(기체 둘레를 떠다니는 빛 덩이 무리)도 같은 두 가지: 새로 생긴 순간의 기체 자리를 기억해 그 자리에 남김 · 사라지는 건 다른 효과와 같은 짧은 수명 */
  const bankOf = p => { let q = p; while (q && q.parent && q.parent !== S.root) q = q.parent; return q && q.parent === S.root && moved.has(q) ? q : null; };
  const banks = new Map(); for (const b of batches) b.rec.forEach(r => { r.bank = bankOf(r.p); if (r.bank && !banks.has(r.bank)) banks.set(r.bank, { last: new THREE.Vector3(1e9, 0, 0), M: new THREE.Matrix4(), t: 0 }); });
  const JUMP = .12 * C.radius, rInv = new THREE.Matrix4();
  const syncSprites = () => { rInv.copy(S.root.matrixWorld).invert();
    for (const [g, st] of banks) { if (st.last.distanceTo(g.position) > JUMP) { st.M.copy(S.root.matrixWorld); st.t = gameT; } st.last.copy(g.position); }   /* 새로 생김 (자리가 확 바뀜) */
    for (const b of batches) { mi.copy(b.me.matrixWorld).invert();
    b.rec.forEach(({ s, p, bank }, i) => { s.updateMatrix(); mw.multiplyMatrices(p.matrixWorld, s.matrix); mw.decompose(vp, vq, vs); let on = s.visible; for (let q = p; q && on; q = q.parent) on = q.visible;
      let fd = 1; if (bank) { const st = banks.get(bank); vp.applyMatrix4(rInv).applyMatrix4(st.M); fd = 1 - THREE.MathUtils.smoothstep(gameT - st.t, LIFE[0], LIFE[1]); }   /* 같은 짧은 수명 */
      vp.applyMatrix4(mi); b.iP.setXYZ(i, vp.x, vp.y, vp.z); b.iS.setXY(i, vs.x, vs.y); const c = s.material.color, a = on ? s.material.opacity * fd : 0; b.iC.setXYZW(i, c.r, c.g, c.b, a); });
    b.iP.needsUpdate = b.iS.needsUpdate = b.iC.needsUpdate = true; } };
  /* ⑤ ⑥ 칠마다 불빛 · 색 곡선 끼우기 */
  /* 효과가 '맵 방향'으로 흐르던 것 → '기체 방향'으로 (사용자 2026-11-09: 남쪽으로 내려오면 냉기가 기체 앞으로 나옴)
     작업대는 기체가 늘 한쪽을 보고 서 있어서 바람 방향을 맵 기준으로 적어 둠 · 게임에선 기체가 돌므로 그 방향을 기체가 돈 만큼 같이 돌림
     (스스로 기체 방향을 따라가는 효과는 그대로 둠: 기체를 잠깐 돌려 보고 방향 값이 따라 바뀌는지로 가려냄) */
  const ROT = { value: new THREE.Matrix4() }, WDIR = /viewMatrix\s*\*\s*vec4\(\s*(\w+)\s*,\s*0\.0?\s*\)/g;
  { const sms = []; S.root.traverse(o => { for (const m of [].concat(o.material || [])) if (m && m.isShaderMaterial && WDIR.test(m.vertexShader) && !sms.includes(m)) sms.push(m); WDIR.lastIndex = 0; });
    const names = m => [...m.vertexShader.matchAll(WDIR)].map(x => x[1]).filter(n => m.uniforms[n]);   /* 바람 방향 값만 봄 (다른 값은 매번 바뀌어도 상관없음) */
    const snap = () => sms.map(m => names(m).map(n => m.uniforms[n].value.toArray().map(v => v.toFixed(4)).join()).join('|'));
    const a = snap(); S.root.rotation.y = 1.3; S.root.updateMatrixWorld(true); S.update(1 / 60, 50); const b = snap(); S.root.rotation.y = 0; S.root.updateMatrixWorld(true); S.update(1 / 60, 50.02);
    sms.forEach((m, i) => { if (a[i] !== b[i]) return; m.vertexShader = 'uniform mat4 fgRot;\n' + m.vertexShader.replace(WDIR, 'viewMatrix * (fgRot * vec4($1, 0.))'); m.uniforms.fgRot = ROT; m.needsUpdate = true; }); }
  /* 궤적 (사용자 2026-11-10): ① 지나간 자리에 남는다 ② 나온 순서대로 사라진다 — 이 두 가지만
     · 기체가 지나온 길(자리 · 방향)을 기억 · 칸은 시계에 고정(0.1초마다 한 칸) → 칸 자리가 매 장면 밀리지 않아 놓인 알갱이가 흔들리지 않음
       (매 장면 '지금' 기준으로 칸을 다시 뽑았더니 굽은 길에서 칸 사이 오차가 매번 달라져 오래된 알갱이가 흔들렸음 · 사용자 2026-11-10)
     · 알갱이마다 '나온 지 몇 초'(효과가 스스로 아는 나이)만큼 전의 기체 자리 · 방향에 그려 넣음 → 나온 자리에 남음
     · 모든 효과 같은 짧은 수명: 나온 지 0.5초부터 흐려져 1초면 사라짐, 먼저 나온 것부터 (사용자 2026-11-10: 너무 오래 남음 · 예외 없음)
     · 나이를 모르는 효과(몸에 붙은 불꽃 혀 · 후광)는 몸을 그대로 따라감 */
  const HN = 14, HDT = .1, LIFE = [.5, 1];   /* 기억 칸 수 · 칸 간격(초) · 흐려지기 시작 · 다 사라짐(초) */
  const isFx = o => o.isPoints || (o.isMesh && o.name !== 'xray' && o.name !== 'fgSprites' && ['aC', 'aS', 'iP', 'iV'].some(a => o.geometry.attributes[a]));
  const TU = { fgVR: { value: new THREE.Matrix4() }, fgRV: { value: new THREE.Matrix4() }, fgHP: { value: Array.from({ length: HN }, () => new THREE.Vector3()) }, fgHQ: { value: Array.from({ length: HN }, () => new THREE.Vector4(0, 0, 0, 1)) }, fgDT: { value: HDT }, fgPh: { value: 0 } };
  const TRAIL = `varying float fgFd; uniform mat4 fgVR; uniform mat4 fgRV; uniform vec3 fgHP[${HN}]; uniform vec4 fgHQ[${HN}]; uniform float fgDT; uniform float fgPh;
vec3 fgQR(vec4 q, vec3 v){ return v + 2. * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
vec4 fgBendV(vec4 v, float secs){ fgFd = 1. - smoothstep(${LIFE[0].toFixed(2)}, ${LIFE[1].toFixed(2)}, secs); if (secs <= 0.) return v; vec4 r = fgVR * v;
  /* 칸 0 = 지금 · 칸 1부터 시계에 고정된 칸 (칸 0과 1 사이만 fgPh초) */
  float u = secs < fgPh ? secs / max(fgPh, 1e-4) : 1. + (secs - fgPh) / fgDT;
  float fi = clamp(u, 0., ${HN - 1}.0 - .001); int i = int(fi); float f = fi - float(i);
  r.xyz = mix(fgHP[i], fgHP[i + 1], f) + fgQR(normalize(mix(fgHQ[i], fgHQ[i + 1], f)), r.xyz);
  return fgRV * r; }
`;
  const GLP = /gl_Position\s*=\s*projectionMatrix\s*\*\s*(\w+)\s*;/g; let nTrail = 0;
  { const done = new Set(); S.root.traverse(o => { if (!isFx(o)) return; for (const m of [].concat(o.material)) { if (!m || !m.isShaderMaterial || done.has(m)) continue; done.add(m);
      const vs = m.vertexShader, fr = vs.match(/age\s*=\s*fract\(\s*uFT\s*\/\s*([\w.]+)/);   /* 효과마다 나이(초) 적는 법 */
      const AGE = /\bT\s*=\s*age\s*\*\s*life\b/.test(vs) ? 'T' : /\bfloat\s+life\s*=/.test(vs) && /\bage\s*=/.test(vs) ? 'age * life' : fr ? `age * ${fr[1]}` : /attribute\s+vec2\s+iA\b/.test(vs) ? 'iA.x * 2.5' : /attribute\s+float\s+aA\b/.test(vs) ? 'aA * 1.2' : null;
      if (!AGE || !GLP.test(vs)) { GLP.lastIndex = 0; continue; } GLP.lastIndex = 0;
      o.frustumCulled = false; const at = vs.indexOf('void main'); let body = vs.slice(at); const X = [...body.matchAll(GLP)][0][1];
      /* 알갱이 네 귀퉁이를 펼치기 직전에 옮김 → 알갱이 하나는 한 덩어리로 같이 옮겨져 찢어지지 않음 */
      let k = -1; for (const mm of body.matchAll(new RegExp('\\b' + X + '\\.(xyz?)\\s*\\+=([^;]*);', 'g'))) if (mm[1] === 'xy' || /\baC\b/.test(mm[2])) { k = mm.index; break; }
      body = k >= 0 ? body.slice(0, k) + `${X} = fgBendV(${X}, ${AGE}); ` + body.slice(k) : body.replace(GLP, `gl_Position = projectionMatrix * fgBendV($1, ${AGE});`);
      m.vertexShader = vs.slice(0, at) + TRAIL + body;
      { const fs = m.fragmentShader, e = fs.lastIndexOf('}');   /* 흐려지는 만큼 (더하는 빛은 밝기까지) */
        m.fragmentShader = 'varying float fgFd;\n' + fs.slice(0, e) + (m.blending === THREE.AdditiveBlending ? '\n gl_FragColor *= fgFd;\n}' : '\n gl_FragColor.a *= fgFd;\n}'); }
      Object.assign(m.uniforms, TU); m.needsUpdate = true; nTrail++; } }); }
  /* 지나온 길 기억: 장면마다 기체 자리를 적고, 칸 0은 지금 · 칸 1부터는 시계에 고정된 0.1초 칸으로 뽑아 '지금 기체 기준' 상대 자리 · 방향으로 넘김 */
  const qPrev = new THREE.Quaternion(), hist = [], hP = new THREE.Vector3(), hQ = new THREE.Quaternion(), hS = new THREE.Vector3(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), pa = new THREE.Vector3();
  let gameT = 0; const trailTick = () => { const now = gameT; S.root.matrixWorld.decompose(hP, hQ, hS);
    const last = hist[hist.length - 1]; if (last && last.p.distanceTo(hP) > 40) hist.length = 0;   /* 순간이동하면 길을 새로 */
    hist.push({ t: now, p: hP.clone(), q: hQ.clone() }); while (hist.length > 2 && hist[1].t < now - HN * HDT - .2) hist.shift();
    const sc = hS.x || 1, qi = hQ.clone().invert(), g0 = Math.floor(now / HDT) * HDT; TU.fgPh.value = now - g0;
    let j = hist.length - 1; for (let i = 0; i < HN; i++) { const tt = i ? g0 - (i - 1) * HDT : now; while (j > 0 && hist[j].t > tt) j--; const A = hist[j], B = hist[Math.min(j + 1, hist.length - 1)];
      const f = B.t > A.t ? THREE.MathUtils.clamp((tt - A.t) / (B.t - A.t), 0, 1) : 0; pa.lerpVectors(A.p, B.p, f); qa.slerpQuaternions(A.q, B.q, f);
      pa.sub(hP).applyQuaternion(qi).divideScalar(sc); qb.copy(qi).multiply(qa); if (i && qb.dot(qPrev) < 0) qb.set(-qb.x, -qb.y, -qb.z, -qb.w); qPrev.copy(qb);   /* 이웃 칸과 같은 쪽 부호로 (섞을 때 뒤집혀 큰 세모가 튀던 원인) */
      TU.fgHP.value[i].copy(pa); TU.fgHQ.value[i].set(qb.x, qb.y, qb.z, qb.w); } };
  const NP = PL.length, U = { fgDD: { value: KEYL.map(() => new THREE.Vector3()) }, fgDC: { value: KEYL.map(l => new THREE.Color(l[3]).multiplyScalar(l[4])) }, fgK: { value: 1 } };
  if (NP) Object.assign(U, { fgPP: { value: PL.map(() => new THREE.Vector3()) }, fgPC: { value: PL.map(() => new THREE.Color()) }, fgPD: { value: PL.map(p => new THREE.Vector2(p.L.distance, p.L.decay)) } });
  const DECL = `uniform vec3 fgDD[3]; uniform vec3 fgDC[3]; uniform float fgK;${NP ? ` uniform vec3 fgPP[${NP}]; uniform vec3 fgPC[${NP}]; uniform vec2 fgPD[${NP}];` : ''}\n`;
  const seen = new Set(); sm.traverse(o => { if (!(o.isMesh || o.isPoints || o.isLine) || o.name === 'fgSprites') return; for (const m of [].concat(o.material)) { if (!m || seen.has(m)) continue; seen.add(m);
    if (m.isShaderMaterial) { const toned = C.fireFX || m.fragmentShader.includes('#include <tonemapping_fragment>');
      const ex = `gl_FragColor.rgb = ${outX('gl_FragColor.rgb', 'gl_FragColor.a', toned, m.blending === THREE.AdditiveBlending)};`;
      if (m.fragmentShader.includes('#include <tonemapping_fragment>')) m.fragmentShader = m.fragmentShader.replace('#include <tonemapping_fragment>', ex);
      else { const e = m.fragmentShader.lastIndexOf('}'); m.fragmentShader = m.fragmentShader.slice(0, e) + `\n ${ex}\n}`; }
      m.fragmentShader = TONE + m.fragmentShader; m.needsUpdate = true; continue; }
    const lit = 'envMap' in m && !m.isMeshBasicMaterial, toned = C.fireFX || m.toneMapped !== false;
    if (lit && !m.envMap) { m.envMap = F.ENV; m.envMapIntensity = (m.envMapIntensity ?? 1) * .75; }   /* 작업대 방 빛(장면 빛 .75)과 같게 */
    const prev = m.onBeforeCompile, pk = m.customProgramCacheKey;
    m.onBeforeCompile = (sh, r) => { prev.call(m, sh, r); Object.assign(sh.uniforms, U); if (m.userData.fgOP) sh.vertexShader = 'attribute vec3 fgOP;\n' + fgOPize(sh.vertexShader);
      let f = sh.fragmentShader.replace('void main() {', TONE + DECL + 'void main() {').replace('#include <tonemapping_fragment>', `gl_FragColor.rgb = ${outX('gl_FragColor.rgb', 'gl_FragColor.a', toned, m.blending === THREE.AdditiveBlending)};`);
      if (lit) f = f.replace('#include <lights_fragment_begin>', LIGHTS(NP)); sh.fragmentShader = f; };
    m.customProgramCacheKey = () => pk.call(m) + '|fg' + NP + (toned ? 't' : 'u'); m.needsUpdate = true; } });
  const lv = new THREE.Vector3(), wq = new THREE.Vector3();
  const preRender = cam => { sm.updateMatrixWorld(true); trailTick(); TU.fgRV.value.multiplyMatrices(cam.matrixWorldInverse, S.root.matrixWorld); TU.fgVR.value.copy(TU.fgRV.value).invert(); ROT.value.extractRotation(S.root.matrixWorld); const V = cam.matrixWorldInverse, k = sm.matrixWorld.getMaxScaleOnAxis(); U.fgK.value = 1 / k;
    KEYL.forEach((l, i) => U.fgDD.value[i].set(l[0], l[1], l[2]).normalize().transformDirection(V));
    PL.forEach((p, i) => { p.L.updateMatrix(); lv.setFromMatrixPosition(mw.multiplyMatrices(p.parent.matrixWorld, p.L.matrix)).applyMatrix4(V); U.fgPP.value[i].copy(lv); U.fgPC.value[i].copy(p.L.color).multiplyScalar(p.L.intensity); });
    syncSprites(); };
  /* 그리기 횟수 · 삼각형 수 */
  const stats = () => { let d = 0, t = 0; sm.traverse(o => { if (!o.isMesh || o.name === 'xray') return; let on = true; for (let q = o; q && on; q = q.parent) on = q.visible; if (!on) return; d++; const g = o.geometry; t += (g.index ? g.index.count : g.attributes.position.count) / 3 * (g.isInstancedBufferGeometry ? g.instanceCount : 1); }); return { draws: d, tris: Math.round(t) }; };
  /* 벽 너머 비침: 같이 움직이는 덩어리마다 윤곽 하나 (모양이 매 장면 바뀌는 부품은 그 모양을 그대로 씀) */
  const buildXray = mat => { const by = new Map(), out = []; S.root.updateMatrixWorld(true);
    S.root.traverse(o => { if (!o.isMesh || o.name === 'fgSprites' || o.name === 'xray' || o.material.blending === THREE.AdditiveBlending || (o.material.isShaderMaterial && o.material.transparent)) return;   /* 빛 껍질 · 효과 알갱이는 윤곽에서 뺌 */
      if (moved.has(o) && first.get(o) && keyOf(o).split('|').pop() !== first.get(o).split('|').pop()) { const x = new THREE.Mesh(o.geometry, mat); x.renderOrder = 60; x.frustumCulled = false; x.name = 'xray'; o.add(x); out.push(x); return; }   /* 날개 안쪽 막 · 볼 살처럼 매번 모양이 바뀜 */
      const R = moved.has(o) ? o : rigid(o); if (!by.has(R)) by.set(R, []); by.get(R).push(o); });
    for (const [R, list] of by) { inv.copy(R.matrixWorld).invert();
      const parts = list.map(o => { const g = new THREE.BufferGeometry(); g.setAttribute('position', o.geometry.attributes.position.clone()); if (o.geometry.index) g.setIndex(o.geometry.index.clone()); g.applyMatrix4(rel.multiplyMatrices(inv, o.matrixWorld)); return weld(g, true); });
      const mg = parts.length > 1 ? mergeGeometries(parts, false) : parts[0]; parts.forEach(g => g !== mg && g.dispose()); if (!mg) continue; const g = simplify(mg, ERR_X); g.computeVertexNormals();
      const x = new THREE.Mesh(g, mat); x.renderOrder = 60; x.frustumCulled = false; x.name = 'xray'; R.add(x); out.push(x); }
    /* 그리는 순서: 맵 → 비침 → 기체. 비침을 기체보다 먼저 그려야 '맵에 가려진 곳'만 빛나고, 기체가 자기 몸에 겹친 곳(비늘 아래 갑옷 등)은 안 빛남 (기체 가운데가 반투명해 보이던 원인) */
    sm.traverse(o => { if (o.isMesh && o.name !== 'xray' && !o.material.transparent) o.renderOrder += 61; });
    return out; };
  let tA = 0; const step = (dt, t, { moving = false, fire = false } = {}) => { gameT = t;   /* 길 기억은 게임 시계로 (효과 알갱이 나이와 같은 시계) */ const m = moving ? C.moving : 'cruise'; if (S.mode !== m) S.setMode(m); S.fire = fire; S.update(Math.min(dt, .05), t); F.PRISM_U.uT.value = t; };
  const s1 = stats(); console.log(`[스킨] ${C.kname} · 원본 그리기 ${stat0.meshes}번 · 삼각형 ${(stat0.tris / 1000).toFixed(0)}k → 게임판 그리기 ${s1.draws}번 · 삼각형 ${(s1.tris / 1000).toFixed(0)}k · 빛 ${NP} · 궤적 효과 ${nTrail} · ${(performance.now() - t0).toFixed(0)}ms`);
  root.userData.forge = true;
  /* 효과(불길 · 연기 · 번개 · 서리 알갱이)만 끄고 켜기 — 폰 무게 재기용 */
  const FX = []; sm.traverse(o => { if (isFx(o)) FX.push(o); }); let fxOn = true;
  const setFx = v => { fxOn = v; FX.forEach(o => o.visible = v); }, getFx = () => fxOn;
  return { root, sm, S, C, step, preRender, stats, before: stat0, buildXray, setFx, getFx };
}
