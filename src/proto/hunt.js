/* 사냥터 해파리 떼 배치 (사용자 2026-11-03 확정 규칙)
   · 방마다 앞 사냥터(그릇 모양 땅)에 해파리 떼 셋: 방 가까이 = 잔챙이 · 가운데 = 잔챙이 · 가운데 통로 쪽 = 센 몹이 낀 떼 (통로 쪽으로 갈수록 셈)
   · 떼를 다 잡으면 1분 뒤 그 자리에 다시 생김 (사냥터 잔챙이는 타이머 없음)
   · 떼마다 무리 번호가 달라 경보는 그 떼 안에서만 퍼짐 */
import { JELLY } from './jelly.js?v=11062305';

/* 떼 자리 (사용자 2026-11-04: 태어나는 곳 바로 앞에 적이 있는 건 별로 → 방 양옆 구석 둘 + 통로 쪽 넓은 아래 땅)
   [방에서 가운데 쪽으로 떨어진 거리, 옆으로(+오른쪽), 마리 수, 센 몹 수] — 방 바로 앞 길은 비워 둠 */
export const HUNT = { RESPAWN: 60, BANDS: [[13, -18, 4, 0], [13, 18, 4, 0], [44, -7, 5, 0], [55, 7, 4, 1]] };

export function makeHunt(B, J, rooms) {
  const flocks = [];
  const okAt = (x, z) => { if (B.blocked(x, z) || B.region(x, z) !== 1) return false; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; if (B.blocked(x + Math.cos(a) * 3.5, z + Math.sin(a) * 3.5)) return false; } return true; };
  rooms.forEach(([rx, rz], k) => { const l = Math.hypot(rx, rz) || 1, ux = -rx / l, uz = -rz / l, px = -uz, pz = ux;
    HUNT.BANDS.forEach(([d, side, n, st], i) => {
      let cx = rx + ux * d + px * side, cz = rz + uz * d + pz * side, ok = okAt(cx, cz);
      for (let r = 2; r <= 10 && !ok; r += 2) for (let a = 0; a < 12 && !ok; a++) { const x = cx + Math.cos(a / 12 * Math.PI * 2) * r, z = cz + Math.sin(a / 12 * Math.PI * 2) * r; if (okAt(x, z)) { cx = x; cz = z; ok = true; } }
      if (ok) flocks.push({ x: cx, z: cz, n, st, group: k * 10 + i + 1, members: [], deadAt: -1 }); }); });
  const fill = f => { f.members = []; for (let i = 0; i < f.n; i++) { const a = i * 2.4 + f.group, r = 1.2 + (i % 3) * 1.3; f.members.push(J.userData.add(f.x + Math.cos(a) * r, f.z + Math.sin(a) * r, { group: f.group, strong: i < f.st })); } f.deadAt = -1; };
  flocks.forEach(fill);
  return { flocks,
    refill() { const L = J.userData.list; for (let i = L.length - 1; i >= 0; i--) if (!L[i].on || L[i].dieT > 0) L.splice(i, 1); for (const f of flocks) if (!f.members.some(j => j.on && j.dieT < 0)) fill(f); },   /* 시험장: 쓰러진 떼 바로 다시 */
    update(t) { for (const f of flocks) { const alive = f.members.some(j => j.on);
      if (!alive && f.deadAt < 0) f.deadAt = t;
      if (f.deadAt >= 0 && t - f.deadAt > HUNT.RESPAWN) { const L = J.userData.list; for (let i = L.length - 1; i >= 0; i--) if (!L[i].on) L.splice(i, 1); fill(f); } } } };
}
