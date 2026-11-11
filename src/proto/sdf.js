/* 조각하듯 빚는 돌 모양 (석상용): 거리 함수(SDF)로 몸 · 갑옷 · 깃털을 부드럽게 이어 붙인 뒤 표면을 그물로 떠냄 (surface nets)
   · 상자 · 원통을 따로 붙인 티가 나지 않게 — 이음매가 녹아 붙은 깎은 돌처럼
   · 빠르게: 성긴 칸으로 먼저 재고 표면 가까운 곳만 촘촘히 다시 잼 · 꼭짓점마다 기울기로 매끈한 면 방향 */
import * as THREE from 'three';

export const sd = {
  smin: (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; },   /* 부드럽게 녹여 붙임 */
  sphere: (x, y, z, cx, cy, cz, r) => Math.hypot(x - cx, y - cy, z - cz) - r,
  ell: (x, y, z, cx, cy, cz, rx, ry, rz) => { const k0 = Math.hypot((x - cx) / rx, (y - cy) / ry, (z - cz) / rz), k1 = Math.hypot((x - cx) / rx / rx, (y - cy) / ry / ry, (z - cz) / rz / rz); return k0 * (k0 - 1) / (k1 || 1e-6); },
  /* 굵기가 변하는 몸통 (a → b, r0 → r1) */
  cone: (x, y, z, a, b, r0, r1) => { const px = x - a[0], py = y - a[1], pz = z - a[2], bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], h = Math.max(0, Math.min(1, (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz)));
    return Math.hypot(px - bx * h, py - by * h, pz - bz * h) - (r0 + (r1 - r0) * h); },
  /* 돌린 둥근 상자: m = 몸 → 상자 안 좌표로 바꾸는 3×3 (행 순서) · hx hy hz 반 크기 · rr 모서리 둥글기 */
  box: (x, y, z, c, m, hx, hy, hz, rr = 0) => { const px = x - c[0], py = y - c[1], pz = z - c[2], u = m[0] * px + m[1] * py + m[2] * pz, v = m[3] * px + m[4] * py + m[5] * pz, w = m[6] * px + m[7] * py + m[8] * pz;
    const qx = Math.abs(u) - hx + rr, qy = Math.abs(v) - hy + rr, qz = Math.abs(w) - hz + rr; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - rr; },
  /* 상자 방향: 상자의 y축을 dir 로 · roll 만큼 비틂 → 몸 → 상자 좌표 3×3 */
  frame: (dir, roll = 0) => { const d = new THREE.Vector3(...dir).normalize(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), roll));
    const M = new THREE.Matrix4().makeRotationFromQuaternion(q).invert().elements; return [M[0], M[4], M[8], M[1], M[5], M[9], M[2], M[6], M[10]]; },
  rotY: a => [Math.cos(a), 0, -Math.sin(a), 0, 1, 0, Math.sin(a), 0, Math.cos(a)],
};

/* f(x, y, z) → 거리 (안쪽 −) · box: [x0, y0, z0, x1, y1, z1] · h: 칸 크기 → 매끈한 면 방향이 든 BufferGeometry */
export function sdfMesh(f, box, h) {
  const [x0, y0, z0, x1, y1, z1] = box, nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1, nz = Math.ceil((z1 - z0) / h) + 1, N = nx * ny * nz, V = new Float32Array(N), id = (i, j, k) => i + nx * (j + ny * k);
  /* 성긴 칸 (4배) 먼저 → 표면에서 먼 곳은 성긴 값을 이어 씀 */
  const S = 4, cx = Math.ceil((nx - 1) / S) + 1, cy = Math.ceil((ny - 1) / S) + 1, cz = Math.ceil((nz - 1) / S) + 1, C = new Float32Array(cx * cy * cz);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) C[i + cx * (j + cy * k)] = f(x0 + i * S * h, y0 + j * S * h, z0 + k * S * h);
  const band = S * h * 1.9;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const fi = i / S, fj = j / S, fk = k / S, i0 = Math.min(cx - 2, fi | 0), j0 = Math.min(cy - 2, fj | 0), k0 = Math.min(cz - 2, fk | 0), u = fi - i0, v = fj - j0, w = fk - k0, c = (a, b, d) => C[a + cx * (b + cy * d)];
    const iv = ((c(i0, j0, k0) * (1 - u) + c(i0 + 1, j0, k0) * u) * (1 - v) + (c(i0, j0 + 1, k0) * (1 - u) + c(i0 + 1, j0 + 1, k0) * u) * v) * (1 - w) + ((c(i0, j0, k0 + 1) * (1 - u) + c(i0 + 1, j0, k0 + 1) * u) * (1 - v) + (c(i0, j0 + 1, k0 + 1) * (1 - u) + c(i0 + 1, j0 + 1, k0 + 1) * u) * v) * w;
    V[id(i, j, k)] = Math.abs(iv) < band ? f(x0 + i * h, y0 + j * h, z0 + k * h) : iv; }
  /* 칸마다 꼭짓점 하나 (모서리에서 0이 되는 곳들의 평균) */
  const vi = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1), cid = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k), P = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]], cv = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { let neg = 0;
    for (let c = 0; c < 8; c++) { cv[c] = V[id(i + (c & 1), j + (c >> 1 & 1), k + (c >> 2 & 1))]; if (cv[c] < 0) neg++; } if (neg === 0 || neg === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0; for (const [a, b] of E) { if ((cv[a] < 0) === (cv[b] < 0)) continue; const t = cv[a] / (cv[a] - cv[b]);
      sx += (a & 1) + ((b & 1) - (a & 1)) * t; sy += (a >> 1 & 1) + ((b >> 1 & 1) - (a >> 1 & 1)) * t; sz += (a >> 2 & 1) + ((b >> 2 & 1) - (a >> 2 & 1)) * t; n++; }
    vi[cid(i, j, k)] = P.length / 3; P.push(x0 + (i + sx / n) * h, y0 + (j + sy / n) * h, z0 + (k + sz / n) * h); }
  /* 부호가 바뀌는 칸 모서리마다 둘레 네 칸의 꼭짓점을 이어 네모 하나 */
  const I = [], q = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) I.push(a, c, b, a, d, c); else I.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = V[id(i, j, k)] < 0, b = V[id(i + 1, j, k)] < 0; if (a === b) continue; q(vi[cid(i, j - 1, k - 1)], vi[cid(i, j, k - 1)], vi[cid(i, j, k)], vi[cid(i, j - 1, k)], a); }
  for (let k = 1; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const a = V[id(i, j, k)] < 0, b = V[id(i, j + 1, k)] < 0; if (a === b) continue; q(vi[cid(i - 1, j, k - 1)], vi[cid(i - 1, j, k)], vi[cid(i, j, k)], vi[cid(i, j, k - 1)], a); }
  for (let k = 0; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const a = V[id(i, j, k)] < 0, b = V[id(i, j, k + 1)] < 0; if (a === b) continue; q(vi[cid(i - 1, j - 1, k)], vi[cid(i, j - 1, k)], vi[cid(i, j, k)], vi[cid(i - 1, j, k)], a); }
  /* 면 방향: 거리 함수 기울기 · 세모 감기 방향도 바깥을 보게 맞춤 */
  const Nn = new Float32Array(P.length), e = h * .5;
  for (let v = 0; v < P.length; v += 3) { const x = P[v], y = P[v + 1], z = P[v + 2], gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e), l = Math.hypot(gx, gy, gz) || 1; Nn[v] = gx / l; Nn[v + 1] = gy / l; Nn[v + 2] = gz / l; }
  for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3, ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], wx = P[c] - P[a], wy = P[c + 1] - P[a + 1], wz = P[c + 2] - P[a + 2];
    const gx = uy * wz - uz * wy, gy = uz * wx - ux * wz, gz = ux * wy - uy * wx; if (gx * (Nn[a] + Nn[b] + Nn[c]) + gy * (Nn[a + 1] + Nn[b + 1] + Nn[c + 1]) + gz * (Nn[a + 2] + Nn[b + 2] + Nn[c + 2]) < 0) { const s = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = s; } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); g.setIndex(I); return g;
}
