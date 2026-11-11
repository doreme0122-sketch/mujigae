/* 화면 밖 표시기 (사용자 2026-11-11 · 보물)
   · 그림체: 몬스터 어그로 표시(노란 별 + 빨간 느낌표 · 굵은 검은 테두리)와 같은 계열 — 모양은 다르게 (둥근 메달)
   · 굵은 검은 테두리 하나 · 노랑 바탕 · 가운데 상자 그림 (정가운데) · 등급마다 상자 그림: 나무 · 청동(푸른 녹 테) · 은 · 금
   · 메달은 늘 똑바로 · 바깥 작은 화살만 메달 둘레를 돌아 보물 쪽(화면 밖)을 가리킴
   · 가까워질수록 조금 커짐 · 몇 초마다 한 번 톡 반짝 · 누가 싸우는 중이면 테두리가 빨갛게 깜빡 · 열렸으면 열린 상자 그림
   · 상자가 화면에 들어오면 표시는 상자 쪽으로 날아가며 작아져 사라짐 (그 순간 상자 모서리 별빛) */
const K = '#120a05';
const CHEST = {
  wood: `<path d="M-19,-2 L-19,-9 Q-19,-22 0,-22 Q19,-22 19,-9 L19,-2 Z" fill="#a8652a" stroke="${K}" stroke-width="3"/><path d="M-19,-9 L19,-9 M-16,-15 L16,-15" stroke="#6e3d14" stroke-width="1.6"/><rect x="-19" y="-2" width="38" height="21" fill="#8a4f1e" stroke="${K}" stroke-width="3"/><path d="M-19,6 L19,6 M-19,12 L19,12" stroke="#5e3410" stroke-width="1.6"/><rect x="-19" y="-2" width="38" height="4" fill="#4a4a4a"/><rect x="-4.5" y="-4" width="9" height="10" rx="1.5" fill="#7a7a7a" stroke="${K}" stroke-width="2.2"/>`,
  bronze: `<path d="M-19,-2 L-19,-9 Q-19,-22 0,-22 Q19,-22 19,-9 L19,-2 Z" fill="#c9743a" stroke="${K}" stroke-width="3"/><path d="M-14,-14 Q-7,-19 1,-19" fill="none" stroke="#ffd2a0" stroke-width="2.4" stroke-linecap="round"/><rect x="-19" y="-2" width="38" height="21" fill="#b05f2a" stroke="${K}" stroke-width="3"/><rect x="-19" y="-2" width="38" height="5" fill="#2f9e86" stroke="${K}" stroke-width="1.5"/><rect x="-19" y="15" width="38" height="4" fill="#2f9e86" stroke="${K}" stroke-width="1.5"/><rect x="-5" y="-5" width="10" height="12" rx="1.5" fill="#2f9e86" stroke="${K}" stroke-width="2.5"/><circle cx="0" cy="1" r="1.6" fill="${K}"/><path d="M-15,6 L-15,12" stroke="#ffd2a0" stroke-width="2" stroke-linecap="round"/>`,
  silver: `<path d="M-19,-2 L-19,-9 Q-19,-22 0,-22 Q19,-22 19,-9 L19,-2 Z" fill="#dfe6ee" stroke="${K}" stroke-width="3"/><path d="M-12,-17 Q-6,-20 0,-20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><rect x="-19" y="-2" width="38" height="21" fill="#aeb9c5" stroke="${K}" stroke-width="3"/><rect x="-19" y="-2" width="38" height="5" fill="#4d5866"/><path d="M-19,13 L-13,19 L-19,19 Z M19,13 L13,19 L19,19 Z" fill="#4d5866"/><rect x="-5" y="-5" width="10" height="12" rx="1.5" fill="#3d8bff" stroke="${K}" stroke-width="2.5"/>`,
  gold: `<path d="M-19,-2 L-19,-9 Q-19,-22 0,-22 Q19,-22 19,-9 L19,-2 Z" fill="#f5a300" stroke="${K}" stroke-width="3"/><path d="M-13,-16 Q-7,-20 1,-20" fill="none" stroke="#fff6c8" stroke-width="2.4" stroke-linecap="round"/><rect x="-19" y="-2" width="38" height="21" fill="#d27d00" stroke="${K}" stroke-width="3"/><path d="M-16,3 L-16,16" stroke="#ffd257" stroke-width="2" stroke-linecap="round"/><rect x="-19" y="-2" width="38" height="5" fill="#7a3f00"/><circle cx="-12" cy="10" r="2.6" fill="#3d8bff" stroke="${K}" stroke-width="1.4"/><circle cx="12" cy="10" r="2.6" fill="#2fc46a" stroke="${K}" stroke-width="1.4"/><path d="M0,-7 L6,1 L0,9 L-6,1 Z" fill="#e8433a" stroke="${K}" stroke-width="2.2"/>`,
};
const LID = { wood: '#a8652a', bronze: '#c9743a', silver: '#dfe6ee', gold: '#f5a300' }, BODY = { wood: '#8a4f1e', bronze: '#b05f2a', silver: '#aeb9c5', gold: '#d27d00' };
/* 열린 상자: 뚜껑이 뒤로 젖혀지고 안에서 빛 */
const OPEN = g => `<path d="M-19,-6 L-15,-22 Q-1,-30 15,-22 L19,-6 Z" fill="${LID[g]}" stroke="${K}" stroke-width="3"/><path d="M-19,-2 L19,-2 L16,-8 L-16,-8 Z" fill="#fff6b0" stroke="${K}" stroke-width="2.5"/><path d="M-9,-10 L-11,-18 M0,-11 L0,-21 M9,-10 L11,-18" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><rect x="-19" y="-2" width="38" height="21" fill="${BODY[g]}" stroke="${K}" stroke-width="3"/><rect x="-19" y="-2" width="38" height="4" fill="${K}" opacity=".55"/>`;

let styled = false;
const style = () => { if (styled) return; styled = true; const s = document.createElement('style'); s.textContent = `
.offmark{position:fixed;left:0;top:0;width:80px;height:80px;margin:-40px 0 0 -40px;pointer-events:none;z-index:4;will-change:transform,opacity}
.offmark svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.offmark .med{animation:omPop 2.6s ease-in-out infinite;transform-origin:0 0}
@keyframes omPop{0%,82%,100%{transform:scale(1)}88%{transform:scale(1.12)}94%{transform:scale(.97)}}
.offmark .rim{transition:stroke .1s}
.offmark.fight .rim{animation:omRed .5s steps(1) infinite}
@keyframes omRed{0%{stroke:#e8433a}50%{stroke:${K}}}
.offmark .glint{animation:omGlint 2.6s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 50%;opacity:0}
@keyframes omGlint{0%,84%{opacity:0;transform:scale(.4) rotate(0)}89%{opacity:1;transform:scale(1) rotate(30deg)}96%,100%{opacity:0;transform:scale(.6) rotate(60deg)}}`; document.head.append(s); };

export function makeOffMark() { style();
  const el = document.createElement('div'); el.className = 'offmark'; el.style.opacity = 0;
  el.innerHTML = `<svg viewBox="-40 -40 80 80"><g class="arw"><polygon points="34,-11 50,0 34,11" fill="#ffd21f" stroke="${K}" stroke-width="4.5" stroke-linejoin="round"/></g>
    <g class="med"><circle r="28" fill="#ffd21f" class="rim" stroke="${K}" stroke-width="6.5"/><g class="ico" transform="translate(0,-1.44) scale(.754)"></g>
    <path class="glint" d="M17,-24 L19,-19 L24,-17 L19,-15 L17,-10 L15,-15 L10,-17 L15,-19 Z" fill="#fff" stroke="${K}" stroke-width="1.2"/></g></svg>`;
  document.body.append(el);
  const arw = el.querySelector('.arw'), ico = el.querySelector('.ico'); let key = '', fly = -1, fx = 0, fy = 0, lx = 0, ly = 0, vis = false;
  /* p: { on: 상자가 화면 안 · sx sy: 상자 화면 자리 (px · 뒤쪽이면 뒤집은 방향) · grade · fight · open · near (0~1) · t } */
  const update = p => { const k = p.grade + (p.open ? 'o' : ''); if (k !== key) { key = k; ico.innerHTML = p.open ? OPEN(p.grade) : CHEST[p.grade]; } el.classList.toggle('fight', !!p.fight);
    const Wd = innerWidth, Ht = innerHeight, cx = Wd / 2, cy = Ht / 2, m = 46, s = .85 + .35 * p.near;
    if (!p.on) { const dx = p.sx - cx, dy = p.sy - cy, kk = Math.min((cx - m) / Math.max(1e-3, Math.abs(dx)), (cy - m) / Math.max(1e-3, Math.abs(dy)));
      lx = cx + dx * kk; ly = cy + dy * kk; arw.setAttribute('transform', `rotate(${Math.atan2(dy, dx) * 180 / Math.PI})`); el.style.transform = `translate(${lx}px,${ly}px) scale(${s})`; el.style.opacity = 1; vis = true; fly = -1; }
    else if (vis) { if (fly < 0) { fly = p.t; fx = lx; fy = ly; } const k2 = Math.min(1, (p.t - fly) / .32), e = k2 * k2 * (3 - 2 * k2);   /* 상자 쪽으로 날아가며 작아짐 */
      el.style.transform = `translate(${fx + (p.sx - fx) * e}px,${fy + (p.sy - fy) * e}px) scale(${s * (1 - .8 * e)})`; el.style.opacity = 1 - e; if (k2 >= 1) vis = false; }
    else el.style.opacity = 0; };
  return { el, update, remove: () => el.remove() };
}
