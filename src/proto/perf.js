/* 성능 시험 판 — 미리보기 공용. 화면 오른쪽 위에 프레임·한 장면 시간·그리는 크기, 그리고 켜고 끄기 버튼.
   · 선명도: 한 장면에 그리는 점 수 한도 (낮음 45만 · 보통 90만 · 높음 160만). 작게 그려 화면에 맞게 늘린다.
   · 매끄럽게: 모서리 매끄럽게 하는 계산 (끔 / 4번)
   · 빛 번짐: 밝은 곳이 번지는 효과
   · 배경: 아래 행성·우주 배경 (끄면 검정 — 얼마나 무거운지 재는 용도)
   고른 값은 이 기기에 기억해 둔다. */
const BUDGET = { low: 4.5e5, mid: 9e5, high: 1.6e6 }, RES_N = { low: '낮음', mid: '보통', high: '높음' };
export function makePerf(onChange = () => {}) {
  let st = { res: 'mid', aa: false, bloom: true, bg: true };
  try { Object.assign(st, JSON.parse(localStorage.getItem('mj-perf') || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem('mj-perf', JSON.stringify(st)); } catch (e) {} };
  const css = document.createElement('style'); css.textContent = `
    #perf{position:absolute;top:calc(env(safe-area-inset-top,0px) + 30px);right:max(18px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;align-items:flex-end;gap:5px}
    #perf button{font-size:10.5px;padding:3px 9px;border:1px solid rgba(185,255,74,.3);border-radius:11px;color:rgba(185,255,74,.8);background:rgba(4,8,6,.55)}
    #perf button.off{color:rgba(185,255,74,.4);border-color:rgba(185,255,74,.15)}
    #perf .row{display:flex;gap:5px}`;
  document.head.appendChild(css);
  const ui = document.querySelector('#ui') || document.body, box = document.createElement('div'); box.id = 'perf'; ui.appendChild(box);
  const btn = (key, label) => { const b = document.createElement('button'); b.type = 'button';
    const draw = () => { b.textContent = key === 'res' ? `선명도 ${RES_N[st.res]}` : `${label} ${st[key] ? '켬' : '끔'}`; b.classList.toggle('off', key !== 'res' && !st[key]); };
    b.onclick = () => { if (key === 'res') st.res = st.res === 'low' ? 'mid' : st.res === 'mid' ? 'high' : 'low'; else st[key] = !st[key]; save(); draw(); onChange(st); }; draw(); return b; };
  const r1 = document.createElement('div'); r1.className = 'row'; r1.append(btn('res'), btn('aa', '매끄럽게'));
  const r2 = document.createElement('div'); r2.className = 'row'; r2.append(btn('bloom', '빛 번짐'), btn('bg', '배경'));
  box.append(r1, r2);
  const fpsEl = document.querySelector('#fps'); let fr = 0, ft = 0, W = 0, H = 0;
  return { st,
    /* 화면(CSS) 크기 → 실제로 그릴 크기 (점 수 한도 안에서) */
    size(cw, ch) { const d = devicePixelRatio || 1; let w = cw * d, h = ch * d; const k = Math.min(1, Math.sqrt(BUDGET[st.res] / (w * h))); W = Math.max(2, Math.round(w * k)); H = Math.max(2, Math.round(h * k)); return [W, H]; },
    tick(dt) { fr++; ft += dt; if (ft >= .5) { const f = fr / ft; if (fpsEl) fpsEl.textContent = `${Math.round(f)} fps · ${(1000 / f).toFixed(1)}ms · ${W}×${H}`; fr = 0; ft = 0; } } };
}
