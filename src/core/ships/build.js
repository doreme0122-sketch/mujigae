/* 기체 조립 — 설정 데이터(src/data/ships.js)만 보고 만든다. 기체마다 따로 쓰는 코드 없음.
   buildShip(id, styleId, paintId) → { root, materials(다이아 재질 목록), isDiamond }
   - 지금 보는 기체 파일만 받아 두고(같은 파일은 한 번만), 필요 없어진 건 release()로 비운다. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { shipById } from '../../data/ships.js?v=11121901';
import { diamondMaterial, backMat } from './diamond.js?v=11121901';
import { filmMaterial } from './film.js?v=11121901';
import { applyPrismFoil } from './foil.js?v=11121901';
import { skinSet } from './skinset.js?v=11121901';

const files = new Map();
export const UT = { value: 0 };                 /* 무지개 막이 천천히 흐르는 시간 */

const abs = u => new URL('../../../' + u, import.meta.url).href;   /* 데이터의 경로는 게임 폴더 기준 */
function load(url) { if (!files.has(url)) files.set(url, new GLTFLoader().loadAsync(abs(url))); return files.get(url); }
export function release(keep = []) { for (const k of [...files.keys()]) if (!keep.includes(k)) files.delete(k); }

export function sourceFile(ship, style, paint) {
  const id = paint.src || paint.id, from = ship.paints.find(p => p.id === id) || paint;
  return (style.files && style.files[id]) || from.file || (ship.model && ship.model.file);
}

function keepParts(root, model, style) {
  if (!model || !model.slotTag || !style.parts) return;
  const rm = [];
  root.traverse(o => { const e = o.userData || {}, slot = e[model.slotTag];
    if (slot != null && style.parts[slot] != null && String(e[model.choiceTag]) !== String(style.parts[slot])) rm.push(o); });
  rm.forEach(o => o.parent && o.parent.remove(o));
}

/* 다이아몬드: 그림에서 넓게 칠해진 색 2개까지 = 다이아 바탕 */
const cvs = document.createElement('canvas'); cvs.width = cvs.height = 24; const cx = cvs.getContext('2d', { willReadFrequently: true });
const _A = new THREE.Vector3(), _B = new THREE.Vector3(), _C = new THREE.Vector3();
function area(o) { const g = o.geometry, P = g.attributes.position, I = g.index, n = I ? I.count : P.count; let s = 0; const st = Math.max(3, Math.floor(n / 600) * 3);
  for (let i = 0; i + 2 < n; i += st) { const a = I ? I.getX(i) : i, b = I ? I.getX(i + 1) : i + 1, c = I ? I.getX(i + 2) : i + 2;
    _A.fromBufferAttribute(P, a).applyMatrix4(o.matrixWorld); _B.fromBufferAttribute(P, b).applyMatrix4(o.matrixWorld); _C.fromBufferAttribute(P, c).applyMatrix4(o.matrixWorld);
    s += _B.sub(_A).cross(_C.sub(_A)).length() * .5; } return s * st / 3; }
function bins() { const H = new Map(); return { H, add(r, g, b, w) { const k = [r, g, b].map(v => Math.min(5, Math.floor(v * 6))).join(','); const e = H.get(k) || { w: 0, r: 0, g: 0, b: 0 }; e.w += w; e.r += r * w; e.g += g * w; e.b += b * w; H.set(k, e); } }; }
function surfaces(img) { cx.clearRect(0, 0, 24, 24); cx.drawImage(img, 0, 0, 24, 24); const d = cx.getImageData(0, 0, 24, 24).data, B = bins();
  for (let i = 0; i < d.length; i += 4) B.add(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255, 1);
  const L = [...B.H.values()].sort((a, b) => b.w - a.w).filter((e, i) => i === 0 || e.w >= 576 * .25).slice(0, 2).map(e => [e.r / e.w, e.g / e.w, e.b / e.w]);
  if (L.length < 2) L.push(L[0]); return L; }
function bodyColor(root) { const B = bins(); root.updateMatrixWorld(true);
  root.traverse(o => { if (!o.isMesh) return; const m = Array.isArray(o.material) ? o.material[0] : o.material, w = area(o);
    if (m.map && m.map.image) { try { cx.clearRect(0, 0, 24, 24); cx.drawImage(m.map.image, 0, 0, 24, 24); const d = cx.getImageData(0, 0, 24, 24).data; for (let i = 0; i < d.length; i += 4) B.add(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255, w / 576); } catch (e) {} }
    else { const c = m.color.clone().convertLinearToSRGB(); B.add(c.r, c.g, c.b, w); } });
  let best = null; for (const e of B.H.values()) if (!best || e.w > best.w) best = e; return [best.r / best.w, best.g / best.w, best.b / best.w]; }
const raws = new Map();
function raw(map) { if (!map) return null; if (!raws.has(map)) { const t = map.clone(); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; raws.set(map, t); } return raws.get(map); }

function diamondize(root, paint, ctx) {
  const body = paint.body || bodyColor(root), cell = 16 / 2.6, mats = [];
  backMat.uniforms.uCell.value = cell;
  const line = paint.line ? new RegExp(paint.line, 'i') : null;
  root.traverse(o => { if (!o.isMesh) return; const om = Array.isArray(o.material) ? o.material[0] : o.material;
    const role = line && line.test(om.name || '') ? 1 : 0;
    const sf = om.map && om.map.image ? surfaces(om.map.image) : [body, body];
    const dm = diamondMaterial({ env: ctx.env, back: ctx.back, map: raw(om.map), cell, role, tint: body, base: [om.color.r, om.color.g, om.color.b], body: sf[0] });
    dm.uniforms.uBody2.value.set(...sf[1]); dm.uniforms.uScale.value = .33; mats.push(dm); o.material = dm; });
  return mats;
}

/* ctx: { env(다이아용 큐브), back(다이아 뒷면 그림판), renderer, size(화면에서의 기체 길이, 기본 2.6) } */
export async function buildShip(id, styleId, paintId, ctx) {
  const ship = shipById(id), style = ship.styles.find(s => s.id === styleId) || ship.styles[0];
  const paint = ship.paints.find(p => p.id === paintId) || ship.paints[0];
  const url = sourceFile(ship, style, paint), gltf = await load(url);
  const sk = paint.kind === 'skinset' ? await skinSet(gltf, abs(ship.skins), paint, ctx.renderer) : null;
  const m = gltf.scene.clone(true); keepParts(m, ship.model, style);
  const box = new THREE.Box3().setFromObject(m), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  const md = Math.max(sz.x, sz.y, sz.z), UF = { value: 1.6 / md };
  m.position.sub(c); const root = new THREE.Group(); root.scale.setScalar((ctx.size || 2.6) / md); root.add(m);
  let materials = [];
  if (paint.kind === 'diamond') materials = diamondize(m, paint, ctx);
  else m.traverse(o => { if (!o.isMesh) return; const om = o.material, fx = paint.fx;
    if (sk) o.material = Array.isArray(om) ? om.map(a => sk.get(a) || a) : (sk.get(om) || om);
    else if (fx && fx.type === 'film') o.material = filmMaterial(om, fx, UF, UT);
    else if (fx && fx.type === 'foil') { const c2 = om.clone(); c2.userData = { ...om.userData }; applyPrismFoil(c2); o.material = c2; } });
  return { root, materials, isDiamond: paint.kind === 'diamond', ship, style, paint, file: url };
}

/* 엔진 빛 자리: 데이터에 자리가 있으면 그대로, 이름이 있으면 그 부품들의 뒤끝을 좌우로 묶어서 */
export function engineSpots(ship, model, sz) {
  const E = ship.engines || {};
  if (E.at) return E.at.map(([x, y, z]) => new THREE.Vector3(sz.x * x, sz.y * y, sz.z * z));
  const re = new RegExp(E.match || 'engine|nozzle|exhaust|thruster', 'i'), groups = [];
  model.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
  model.traverse(o => { if (!o.isMesh || !re.test(o.name + ' ' + (o.parent?.name || ''))) return;
    const b = new THREE.Box3().setFromObject(o).applyMatrix4(inv), c = b.getCenter(new THREE.Vector3());
    let g = groups.find(g => Math.abs(g.x - c.x) < sz.x * .06); if (!g) groups.push(g = { x: c.x, y: c.y, z: b.max.z, n: 0, sy: 0 });
    g.z = Math.max(g.z, b.max.z); g.sy += c.y; g.n++; });
  if (!groups.length) return [new THREE.Vector3(0, 0, sz.z * .47)];
  groups.sort((a, b) => Math.abs(a.x) - Math.abs(b.x));
  return groups.slice(0, 3).map(g => new THREE.Vector3(g.x, g.sy / g.n, g.z));
}

