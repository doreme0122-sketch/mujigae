/* 빛의 길 모양 (사용자 2026-11-07: 너무 가파르게 오르면 재미없음 · 어느 정도 거리를 두고 올라가는 느낌):
   문에서 나가 → 도착 섬 둘레를 감아 돌며(약 225°) 천천히 오르거나 내려감 → 섬 가장자리 바로 밖 돌아가는 문에 수평으로 닿음
   · 높이는 문 땅을 벗어난 뒤부터 바뀌고, 도착 2.5m 앞부터는 다시 수평
   · 정글 놓기와 그리기가 같은 길을 쓰게 한곳에서 만듦 (길이 지나는 하늘은 어느 층이든 비워 둠) */
const ss = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
export const SWEEP = Math.PI * 1.25, RING = 3.5;   /* 감는 각도 · 섬 가장자리에서 길까지 */
export function spiralPath({ gx, gz, tx, tz, rad, gr = 7.5, y0 = 0, y1 = 0, dir = 1, n = 96 }) {
  const a0 = Math.atan2(gz - tz, gx - tx), D = Math.hypot(gx - tx, gz - tz), Rs = rad + RING, Re = rad + 1, P = [];
  for (let i = 0; i <= n; i++) { const u = i / n;
    const r = u < .5 ? D + (Rs - D) * ss(0, .22, u) : Rs + (Re - Rs) * ss(.86, 1, u);   /* 처음엔 섬 둘레 길로 다가가고 · 끝에선 가장자리로 */
    const a = a0 + dir * SWEEP * ss(0, 1, u * .92 + .08 * u * u);
    P.push([tx + Math.cos(a) * r, 0, tz + Math.sin(a) * r]); }
  /* 높이: 길이를 따라 (문 땅을 벗어난 뒤 ~ 도착 2.5m 앞) */
  const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][2] - P[i - 1][2]));
  const T = L[L.length - 1], s0 = Math.min(T * .3, gr + 2), s1 = Math.max(s0 + 10, T - 2.5);
  for (let i = 0; i < P.length; i++) P[i][1] = y0 + (y1 - y0) * ss(s0, s1, L[i]);
  return { pts: P, len: T };
}
