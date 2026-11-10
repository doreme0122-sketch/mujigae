/* 선입력 (사용자 2026-11-10: 위아래 두 번 연달아 쓸면 바로 아래로 · 스킬도 같은 개념으로 바로 실행)
   공용 블록 — 층 바꾸기 · 스킬 모두 이것 하나로:
   · 지금 동작이 끝나 있으면 바로 실행
   · 동작 중이면 다음 입력 하나만 기억해 두었다가, 끝나는 순간 이어서 실행 (새로 누르면 기억한 것을 바꿈 — 쌓이지 않음)
   · lead: 끝나기 몇 초 전부터 받을지 — 그보다 일찍 누른 것은 버림 (실수로 누른 것이 한참 뒤에 튀어나오지 않게)
   쓰는 법: const buf = makeInputBuffer(); buf.press(실행할 일, 남은 시간 s, 받을 시간 s) · 매 장면 buf.tick(남은 시간 s) */
export function makeInputBuffer() {
  let next = null;
  return {
    press(act, remain, lead = .3) { if (remain <= 0) { next = null; act(); return; } if (remain <= lead) next = act; },
    tick(remain) { if (next && remain <= 0) { const a = next; next = null; a(); } },
    clear() { next = null; },
    get waiting() { return !!next; } };
}
