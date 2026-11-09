/* 자동 합치기 (2026-11-09 · 폰 그리기 횟수 줄이기): 한동안 지켜보며 한 번도 움직이지 않은 부품만 재질마다 하나로 합침
   · watch(): 매 판 불러 자리·크기·보임·재질이 바뀌는 부품을 기록 · merge(): 안 바뀐 것만 묶음 (움직이는 부품은 그대로 둠) */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function autoMerge(root) {
  const first = new Map(), moved = new Set(), inv = new THREE.Matrix4(), rel = new THREE.Matrix4();
  const watch = () => { root.updateMatrixWorld(true); inv.copy(root.matrixWorld).invert();
    root.traverse(o => { if (!o.isMesh || moved.has(o)) return; rel.multiplyMatrices(inv, o.matrixWorld); let vis = true; for (let q = o; q && q !== root; q = q.parent) if (!q.visible) vis = false;
      const k = rel.elements.map(e => e.toFixed(4)).join(',') + '|' + vis + '|' + o.material?.uuid + '|' + (o.material?.opacity ?? 1);
      const f = first.get(o); if (f == null) first.set(o, k); else if (f !== k) moved.add(o); }); };
  const merge = () => { root.updateMatrixWorld(true); inv.copy(root.matrixWorld).invert(); const groups = new Map(); let n0 = 0, n1 = 0;
    root.traverse(o => { if (!o.isMesh) return; n0++; if (o.isInstancedMesh || o.isSkinnedMesh || moved.has(o) || !first.has(o) || first.get(o).includes('|false|') || Array.isArray(o.material) || !o.geometry?.attributes.position || o.geometry.morphAttributes?.position) return;
      for (let q = o.parent; q && q !== root; q = q.parent) if (moved.has(q)) return;
      const g = o.geometry, key = o.material.uuid + '|' + Object.keys(g.attributes).sort().join(',') + '|' + (g.index ? 1 : 0) + '|' + o.renderOrder + '|' + o.frustumCulled;
      if (!groups.has(key)) groups.set(key, []); groups.get(key).push(o); });
    for (const list of groups.values()) { if (list.length < 2) continue;
      const parts = list.map(o => { const g = o.geometry.clone(); for (const k of Object.keys(g.attributes)) if (g.attributes[k].isInterleavedBufferAttribute) g.setAttribute(k, g.attributes[k].clone()); g.applyMatrix4(rel.multiplyMatrices(inv, o.matrixWorld)); return g; });
      const mg = mergeGeometries(parts, false); parts.forEach(g => g.dispose()); if (!mg) continue;
      const m = new THREE.Mesh(mg, list[0].material); m.renderOrder = list[0].renderOrder; m.frustumCulled = list[0].frustumCulled; m.name = 'merged'; root.add(m);
      for (const o of list) o.parent.remove(o); n1 += list.length - 1; }
    return { before: n0, saved: n1 }; };
  return { watch, merge };
}
