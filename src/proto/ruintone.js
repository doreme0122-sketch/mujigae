/* 유적 색 시안 (사용자 2026-11-05: 유적 벽·바닥이 너무 어둡고 침침함 → 몇 가지 보여줘)
   주소 끝 rt=번호로 고름 · 0 지금(어두운 회갈색) · 1 햇빛 받은 사암 · 2 붉은 사암 · 3 하얀 대리석 폐허
   wall = 벽 돌 바탕색 · floor = 바닥 판 바탕색(벽보다 살짝 짙고 결이 달라 벽이 바닥에서 떠 보임) · dirt = 빠진 판 흙 · glow = 바닥 밝기 */
const T = [
  { wall: 0x2b2824, floor: [.07, .06, .05],   dirt: [.035, .028, .022], glow: .45 },
  { wall: 0xa88a62, floor: [.30, .235, .155], dirt: [.13, .095, .06],  glow: .62 },
  { wall: 0x9c6a4c, floor: [.27, .17, .115],  dirt: [.12, .07, .045],  glow: .62 },
  { wall: 0xc4beb2, floor: [.34, .325, .30],  dirt: [.12, .11, .10],   glow: .6 },
];
let k = 0; try { k = Math.max(0, Math.min(T.length - 1, +(new URLSearchParams(location.search).get('rt') || 0))); } catch (e) {}
export const RUIN_TONE = T[k], RUIN_TONE_ID = k;
