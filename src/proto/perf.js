/* 성능 시험 판 — 미리보기 공용. 화면 오른쪽 위에 프레임·한 장면 시간·그리는 크기, 그리고 버튼.
   · 품질: 보통 / 높음 / 최고 (게임과 같은 단계, src/core/quality.js). 처음엔 기기를 재서 추천 단계로 시작.
   · 빛 번짐 · 배경: 얼마나 무거운지 재는 시험용 켜고 끄기
   품질이 무거워도 저절로 바꾸지 않는다. */
import * as Q from '../core/quality.js?v=11021559';
export function makePerf(onChange = () => {}) {
  const st = { bloom: true, bg: true, get aa() { return Q.tier().aa > 0; }, get tier() { return Q.tier(); } };
  try { const o = JSON.parse(localStorage.getItem('mj-perf-test') || '{}'); if (o.bloom === false) st.bloom = false; if (o.bg === false) st.bg = false; } catch (e) {}
  const save = () => { try { localStorage.setItem('mj-perf-test', JSON.stringify({ bloom: st.bloom, bg: st.bg })); } catch (e) {} };
  const css = document.createElement('style'); css.textContent = `
    #perf{position:absolute;top:calc(env(safe-area-inset-top,0px) + 30px);right:max(18px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;align-items:flex-end;gap:5px}
    #perf button{font-size:10.5px;padding:3px 9px;border:1px solid rgba(185,255,74,.3);border-radius:11px;color:rgba(185,255,74,.8);background:rgba(4,8,6,.55)}
    #perf button.off{color:rgba(185,255,74,.4);border-color:rgba(185,255,74,.15)}
    #perf .row{display:flex;gap:5px} #perf .rec{font-size:10px;color:rgba(185,255,74,.6);letter-spacing:.03em}
    #perf .heavy{font-size:10px;color:#ffb08a}`;
  document.head.appendChild(css);
  const ui = document.querySelector('#ui') || document.body, box = document.createElement('div'); box.id = 'perf'; ui.appendChild(box);
  const qb = document.createElement('button'); qb.type = 'button';
  const drawQ = () => { qb.textContent = `품질 ${Q.tier().name}`; };
  qb.onclick = () => { const o = Q.ORDER, i = (o.indexOf(Q.tierId()) + 1) % o.length; Q.setTier(o[i]); drawQ(); drawRec(); onChange(st); };
  const tog = (key, label) => { const b = document.createElement('button'); b.type = 'button';
    const draw = () => { b.textContent = `${label} ${st[key] ? '켬' : '끔'}`; b.classList.toggle('off', !st[key]); };
    b.onclick = () => { st[key] = !st[key]; save(); draw(); onChange(st); }; draw(); return b; };
  const r1 = document.createElement('div'); r1.className = 'row'; r1.append(qb);
  const r2 = document.createElement('div'); r2.className = 'row'; r2.append(tog('bloom', '빛 번짐'), tog('bg', '배경'));
  const rec = document.createElement('div'), heavyEl = document.createElement('div'); rec.className = 'rec'; heavyEl.className = 'heavy'; heavyEl.hidden = true;
  const drawRec = () => { const r = Q.recommended(); rec.textContent = r ? `이 기기 추천: ${r.name}` : '기기 재는 중…'; heavyEl.hidden = !Q.heavy(); heavyEl.textContent = '지금 품질이 이 기기에 무거울 수 있어요'; };
  box.append(r1, r2, rec, heavyEl); drawQ(); drawRec();
  Q.measure().then(() => { drawQ(); drawRec(); onChange(st); });          /* 처음이면 재고 추천 단계로 시작 (이미 고른 게 있으면 그대로) */
  const fpsEl = document.querySelector('#fps'), watch = Q.watch(); let fr = 0, ft = 0, W = 0, H = 0;
  return { st,
    size(cw, ch) { [W, H] = Q.renderSize(cw, ch); return [W, H]; },
    tick(dt) { watch(dt); fr++; ft += dt; if (ft >= .5) { const f = fr / ft; if (fpsEl) fpsEl.textContent = `${Math.round(f)} fps · ${(1000 / f).toFixed(1)}ms · ${W}×${H}`; fr = 0; ft = 0; heavyEl.hidden = !Q.heavy(); } } };
}
