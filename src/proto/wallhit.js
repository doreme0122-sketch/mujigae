/* 벽 충돌 — 보이는 벽과 따로, 아주 단순하게 (위에서 보는 게임이라 높이는 따지지 않음)
   · 벽 = 맵 위에 그어진 굵은 띠: 길을 따라 이은 점들 + 반쪽 두께. 끝으로 갈수록 가늘어짐(보이는 벽과 같게).
   · 탄 = 이번에 움직인 짧은 선. 그 선이 띠에 처음 닿는 자리를 찾는다(빨라도 건너뛰지 않음).
   · 맵을 4m 칸으로 나눠, 탄이 지나는 칸에 걸친 벽 조각만 확인한다(벽이 많아도 가벼움). */
import * as THREE from 'three';

const CELL = 4;
export function makeWalls() {
  const segs = [], grid = new Map();
  const key = (i, j) => i * 73856093 ^ j * 19349663;
  function add(path, hw, opt = {}) {                                  /* path: 띠의 중심선 점들 [[x,z],...], hw: 반쪽 두께 */
    const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'), len = curve.getLength(), n = Math.max(8, Math.ceil(len / 1.2));
    const P = curve.getSpacedPoints(n), taper = opt.taper ?? 6;
    for (let i = 0; i < n; i++) { const a = P[i], b = P[i + 1], u = (i + .5) / n, w = hw * Math.min(1, .45 + Math.min(u, 1 - u) * len / taper);
      const s = { ax: a.x, az: a.z, bx: b.x, bz: b.z, w, id: opt.id };
      segs.push(s);
      const i0 = Math.floor((Math.min(a.x, b.x) - w) / CELL), i1 = Math.floor((Math.max(a.x, b.x) + w) / CELL), j0 = Math.floor((Math.min(a.z, b.z) - w) / CELL), j1 = Math.floor((Math.max(a.z, b.z) + w) / CELL);
      for (let x = i0; x <= i1; x++) for (let z = j0; z <= j1; z++) { const k = key(x, z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(s); } } }
  /* 점 (px,pz) 과 벽 조각 사이 거리 */
  const dist = (px, pz, s) => { const dx = s.bx - s.ax, dz = s.bz - s.az, l2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((px - s.ax) * dx + (pz - s.az) * dz) / l2)); return Math.hypot(px - s.ax - dx * t, pz - s.az - dz * t); };
  /* 탄이 (ax,az) → (bx,bz) 로 움직일 때 처음 닿는 자리. 없으면 null */
  function hit(ax, az, bx, bz, only) {
    const near = new Set(), L = Math.hypot(bx - ax, bz - az), steps = Math.max(1, Math.ceil(L / (CELL * .5)));
    for (let k = 0; k <= steps; k++) { const x = ax + (bx - ax) * k / steps, z = az + (bz - az) * k / steps, c = grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))); if (c) for (const s of c) if (!only || s.id === only) near.add(s); }
    if (!near.size) return null;
    const inside = (x, z) => { for (const s of near) if (dist(x, z, s) < s.w) return s; return null; };
    if (inside(ax, az)) return { x: ax, z: az, t: 0, s: inside(ax, az) };
    /* 선을 따라 잘게 짚어 처음 들어가는 칸을 찾고, 그 사이를 반씩 좁혀 정확한 가장자리를 찾는다 */
    const n = Math.max(2, Math.ceil(L / .25)); let prev = 0;
    for (let k = 1; k <= n; k++) { const t = k / n; if (inside(ax + (bx - ax) * t, az + (bz - az) * t)) { let lo = prev, hi = t;
        for (let r = 0; r < 6; r++) { const m = (lo + hi) / 2; if (inside(ax + (bx - ax) * m, az + (bz - az) * m)) hi = m; else lo = m; }
        const x = ax + (bx - ax) * hi, z = az + (bz - az) * hi; return { x, z, t: hi, s: inside(x, z) }; } prev = t; }
    return null; }
  /* 맞은 자리에서 벽 바깥쪽 방향 (불꽃이 튀는 방향) */
  function normal(x, z, s) { const dx = s.bx - s.ax, dz = s.bz - s.az, l2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / l2));
    const nx = x - s.ax - dx * t, nz = z - s.az - dz * t, l = Math.hypot(nx, nz) || 1; return [nx / l, nz / l]; }
  return { add, hit, normal, segs };
}
