/* 숨을 곳 — 자리·모양·규칙 (생김새는 hideviz.js: 가스 구름 속에 돌 부스러기가 맴돎)
   · 자리는 전략으로 정함 (아무 데나 두지 않음):
     ① 문 매복: 벽 틈(문) 바로 안쪽, 벽을 따라 길쭉하게 → 문을 지나 꺾는 순간 옆에서 기습. 문 하나에 한쪽만(양쪽 다 두면 문이 함정만 됨)
     ② 보스 둘레: 중간 보스 땅 가장자리 두 곳 → 보스 잡는 사람을 노리거나, 보스를 피해 숨음
     ③ 빈 들판 피난처: 벽에서 먼 넓은 땅 한가운데 → 쫓길 때 몸을 숨기고 방향을 틀 곳
     ④ 무너진 중심부: 잔해 사이에 흩어져 숨고 피하고 기습
     빼는 곳: 기지 둘레 30m(태어나자마자 매복 금지) · 막다른 구석
   · 모양·크기는 제각각: 작음(한 대가 겨우) · 중간 · 큼(여럿) × 둥긂 · 길쭉함(벽 따라) · 굽음
   · 규칙: 숨으면 바깥에서 안 보이고, 숨은 기체가 밀어내는 가스·돌 움직임도 바깥에선 안 보임(내 화면에서만).
           숨은 내 기체는 내 화면에서 반투명. 같은 숨을 곳 안이면 서로 반투명하게 보임. 안에서 쏘면 2초 드러남(적 붙일 때) */
import { MAP, toWorld } from './mapfloor.js?v=11051918';

function fromMap(arr) {
  const S = MAP.SCALE, N = 500, grid = new Uint8Array(N * N);
  const toCell = (x, z) => [Math.floor((x / S + MAP.W / 2) / (MAP.W / N)), Math.floor((z / S + MAP.H / 2) / (MAP.H / N))];
  const list = arr.map(b => { const lobes = b.lobes, cx = lobes.reduce((a, l) => a + l[0], 0) / lobes.length, cz = lobes.reduce((a, l) => a + l[1], 0) / lobes.length;
    return { x: cx, z: cz, r: 3, lobes, k: b.k, size: 1, shape: 1, why: b.why }; });
  list.forEach((b, id) => { for (const [lx, lz, lr] of b.lobes) { const [i0, j0] = toCell(lx - lr, lz - lr), [i1, j1] = toCell(lx + lr, lz + lr);
    for (let j = Math.max(0, j0); j <= Math.min(N - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(N - 1, i1); i++) { const cx = ((i + .5) * MAP.W / N - MAP.W / 2) * S, cz = ((j + .5) * MAP.H / N - MAP.H / 2) * S;
      if (Math.hypot(cx - lx, cz - lz) <= lr * .9) grid[j * N + i] = id + 1; } } });
  const bushAt = (x, z) => { const [i, j] = toCell(x, z); return i < 0 || j < 0 || i >= N || j >= N ? 0 : grid[j * N + i]; };
  return { list, bushAt, update: (t, dt, x, z) => bushAt(x, z) > 0 };
}

export function makeBushes(B, J, opt = {}) {
  if (opt.off && !J.bushes) return { list: [], bushAt: () => 0, update: () => false };
  if (J.bushes) return fromMap(J.bushes);                                  /* 7안: 맵 설계에서 정해 준 숨을 곳 그대로 (보물 땅 양옆 틈) */   /* 7안: 평지 숨을 곳은 만들지 않음(사용자 2026-11-03) — 좁은 길 틈을 메우는 숨을 곳은 길을 만든 뒤에 */
  const S = MAP.SCALE, rnd = (() => { let s = 977; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const spawns = J.spawns.map(([x, y]) => toWorld(x, y));
  const freeAt = (x, z) => B.region(x, z) !== 17 && B.field(x, z) < .2;
  /* 막힌 방향 세기: 사방 16방향 중 r m 앞이 막힌 수 → 막다른 구석 거름 */
  const open = (x, z, r) => { let blocked = 0; for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; if (!freeAt(x + Math.cos(a) * r, z + Math.sin(a) * r)) blocked++; } return blocked; };
  const list = [];
  /* 모양: 가운데 선을 따라 덩이를 늘어놓음 (둥긂 = 한자리에 뭉침, 길쭉함 = 곧은 선, 굽음 = 휜 선) */
  function add(x, z, size, shape, dir, why) {
    const r = size === 0 ? 2.1 + rnd() * .4 : size === 1 ? 3 + rnd() * .7 : 4.2 + rnd() * 1;
    const len = shape === 0 ? r * .6 : r * (shape === 1 ? 2.4 : 2.1), bend = shape === 2 ? (rnd() < .5 ? -1 : 1) * .9 : 0;
    const n = shape === 0 ? 3 : 5, lobes = [], tx = Math.cos(dir), tz = Math.sin(dir);
    for (let i = 0; i < n; i++) { const u = i / (n - 1) - .5, along = u * len, side = bend * (1 - u * u * 4) * r * .55 + (rnd() - .5) * r * .3;
      const lx = x + tx * along - tz * side, lz = z + tz * along + tx * side, lr = r * (shape === 0 ? .62 + rnd() * .3 : (1 - Math.abs(u) * .8) * (.6 + rnd() * .25));
      if (!freeAt(lx, lz) || B.field(lx, lz) > .1) continue; lobes.push([lx, lz, lr]); }
    if (lobes.length < 2) return false;
    for (const b of list) for (const l of b.lobes) for (const m of lobes) if (Math.hypot(l[0] - m[0], l[1] - m[1]) < l[2] + m[2] + 7) return false;   /* 숨을 곳끼리 붙지 않게 */
    for (const [sx, sz] of spawns) if (Math.hypot(sx - x, sz - z) < 30) return false;
    list.push({ x, z, r, lobes, k: B.region(x, z), size, shape, why }); return true; }
  /* ① 문 매복: 문 안쪽 벽에 붙여 벽 따라 길쭉하게 */
  (J.gates || []).forEach((g, i) => { const [x, z] = toWorld(g.x, g.y), dx = Math.cos(g.a), dz = Math.sin(g.a), px = -dz, pz = dx, w = g.w / 2 * S;
    const side = (i * 7919 % 3) ? 1 : -1, size = g.k === 'road' ? 1 + (rnd() < .5 ? 1 : 0) : rnd() < .5 ? 0 : 1;
    for (const inward of [1, -1]) for (const s of [side, -side]) { const off = 3.2 + rnd() * 1.5, sd = w + 4.5 + size * 1.4;
      const bx = x + dx * inward * off + px * s * sd, bz = z + dz * inward * off + pz * s * sd;
      if (open(bx, bz, 3) < 6 && add(bx, bz, size, 1, Math.atan2(pz * s, px * s) + (rnd() - .5) * .3, '문 매복')) return; } });
  /* ② 보스 둘레 */
  J.labels.filter(o => /Lv 8/.test(o.l)).forEach(o => { const [cx, cz] = toWorld(o.x, o.y), rk = B.region(cx, cz); let put = 0;
    for (let tries = 0; tries < 60 && put < 2; tries++) { const a = rnd() * 6.28, d = 14 + rnd() * 12, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (B.region(x, z) === rk && open(x, z, 4) <= 2 && add(x, z, rnd() < .5 ? 1 : 2, rnd() < .5 ? 2 : 0, a + Math.PI / 2, '보스 둘레')) put++; } });
  /* ③ 빈 들판 피난처: 정글·보물 땅에서 벽이 가장 먼 곳 하나씩 */
  const fields = [];
  for (let z = -170; z <= 170; z += 4) for (let x = -170; x <= 170; x += 4) { const k = B.region(x, z); if (k < 1 || k > 15 || (k >= 6 && k <= 10)) continue;
    let d = 2; for (; d < 20; d += 2) if (open(x, z, d) > 0) break; if (d >= 10) fields.push([d + rnd(), x, z]); }
  fields.sort((a, b) => b[0] - a[0]);
  const perReg = {}; for (const [, x, z] of fields) { const k = B.region(x, z); if (perReg[k]) continue; if (add(x, z, Math.floor(rnd() * 3), Math.floor(rnd() * 3), rnd() * 6.28, '빈 들판')) perReg[k] = 1; }
  /* ④ 무너진 중심부 */
  for (let i = 0, tries = 0; i < 9 && tries < 300; tries++) { const a = rnd() * 6.28, d = 12 + rnd() * 38, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (B.region(x, z) === 16 && add(x, z, Math.floor(rnd() * 3), Math.floor(rnd() * 3), rnd() * 6.28, '중심부')) i++; }
  /* 칸 지도: 칸마다 몇 번 숨을 곳인지 (0 = 없음) */
  const N = 500, grid = new Uint8Array(N * N);
  const toCell = (x, z) => [Math.floor((x / S + MAP.W / 2) / (MAP.W / N)), Math.floor((z / S + MAP.H / 2) / (MAP.H / N))];
  list.forEach((b, id) => { for (const [lx, lz, lr] of b.lobes) { const [i0, j0] = toCell(lx - lr, lz - lr), [i1, j1] = toCell(lx + lr, lz + lr);
    for (let j = Math.max(0, j0); j <= Math.min(N - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(N - 1, i1); i++) { const cx = ((i + .5) * MAP.W / N - MAP.W / 2) * S, cz = ((j + .5) * MAP.H / N - MAP.H / 2) * S;
      if (Math.hypot(cx - lx, cz - lz) <= lr * .9) grid[j * N + i] = id + 1; } } });
  const bushAt = (x, z) => { const [i, j] = toCell(x, z); return i < 0 || j < 0 || i >= N || j >= N ? 0 : grid[j * N + i]; };
  return { list, bushAt, update: (t, dt, x, z) => bushAt(x, z) > 0 };
}
