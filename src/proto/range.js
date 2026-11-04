/* 기본탄 시험장 (사용자 2026-11-04: "실제로 봐야 알 것 같아")
   · 같은 맵 · 같은 조작(누르면 자동 조준 · 끌면 원하는 쪽 · 과열 그대로)에서 탄 열 가지를 바꿔 가며 쏴 봄
   · 오른쪽 위: 탄 고르기 (컴퓨터는 숫자 1~0) · 왼쪽 위: 지금 탄의 숫자 + 실제로 잰 1초당 피해
   · 맞은 해파리 위에 피해 숫자가 떠오름 (튕겨서 맞으면 ×1.5 표시 · 쓰러뜨린 한 방은 크게)
   · 아래: 사냥터 / 수정 기둥 / 숨을 곳으로 바로 옮기기 · 해파리 다시 채우기 */
import * as THREE from 'three';
import { SHOT, SHOT_IDS } from './shots.js?v=11041441';
import { makeDuel } from './duel.js?v=11041441';

const css = `
#rgSel{position:fixed;top:calc(env(safe-area-inset-top,0px) + 10px);left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:flex-start;gap:4px;z-index:7;touch-action:none}
#rgSel .row{display:flex;align-items:center;gap:5px}#rgSel .row > span{width:44px;flex:none;font-size:10.5px;letter-spacing:.06em;color:rgba(220,228,240,.55);text-align:right;padding-right:2px}
#rgSel button{display:flex;align-items:center;gap:5px;padding:4px 8px 4px 6px;border-radius:12px;border:1px solid rgba(var(--c),.3);background:rgba(4,7,10,.62);color:rgba(var(--c),.85);font-size:11px;letter-spacing:0;white-space:nowrap;transition:background .2s,border-color .2s,color .2s,box-shadow .2s}
#rgSel button i{width:7px;height:7px;border-radius:50%;background:rgb(var(--c));box-shadow:0 0 6px rgba(var(--c),.8);flex:none}
#rgSel button em{display:none;font-style:normal;}@media (hover:hover){#rgSel button em{display:inline}}#rgSel button em{font-style:normal;font-family:var(--en);font-size:8.5px;opacity:.5}
#rgSel button.on{border-color:rgba(var(--c),.9);color:#fff;background:rgba(var(--c),.18);box-shadow:0 0 14px rgba(var(--c),.3)}
#rgCard{position:fixed;top:calc(env(safe-area-inset-top,0px) + 44px);left:max(16px,env(safe-area-inset-left,0px));width:min(250px,34vw);padding:10px 12px 11px;display:flex;flex-direction:column;gap:6px;pointer-events:none;
  border-left:1.5px solid rgba(var(--c),.7);background:linear-gradient(90deg,rgba(4,7,10,.78),rgba(4,7,10,.35));font-variant-numeric:tabular-nums;z-index:5}
#rgCard .nm{display:flex;align-items:baseline;gap:8px}
#rgCard .nm b{font-weight:600;font-size:15px;color:rgb(var(--c));letter-spacing:.03em;text-shadow:0 0 10px rgba(var(--c),.35)}
#rgCard .nm span{font-size:10.5px;color:#8d96ad}
#rgCard dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:11.5px}
#rgCard dt{color:#8d96ad}#rgCard dd{margin:0;color:#dfe5f2}
#rgCard .fx{font-size:11px;line-height:1.5;color:#c3cbb8;text-wrap:pretty}
#rgCard .live{display:flex;flex-direction:column;gap:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,.08)}
#rgCard .live .big{display:flex;align-items:baseline;gap:6px}
#rgCard .live .big b{font-family:var(--en);font-weight:400;font-size:20px;color:#f4f8ec}
#rgCard .live .big span{font-size:10.5px;color:#8d96ad}
#rgCard .live .sub{font-size:10.5px;color:#8d96ad}
#rgCard .bar{height:3px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden}#rgCard .bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,rgb(var(--c)),#ffb347 70%,#ff5a2a)}
#rgNums{position:fixed;inset:0;pointer-events:none;z-index:4;overflow:hidden}
#rgNums b{position:absolute;left:0;top:0;font-family:var(--en);font-weight:400;white-space:nowrap;opacity:0;will-change:transform,opacity;text-shadow:0 0 6px rgba(0,0,0,.9),0 0 12px rgba(var(--c),.6);color:rgb(var(--c))}
#rgNums b.kill{color:#fff}
#rgNums b sup{font-family:var(--kr);font-size:.6em;margin-left:2px;color:#e8d6ff}`;

export function makeRange({ shots, fly, FS, cam, hunt, jel, crystals, bushes, say, renderer, scene, B }) {
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const rgb = c => c.map(v => Math.min(255, Math.round(Math.sqrt(v) * 255))).join(',');
  /* ── 탄 고르기 ── */
  const sel = document.createElement('div'); sel.id = 'rgSel'; document.body.appendChild(sel);
  ['pointerdown', 'pointermove', 'pointerup'].forEach(e => sel.addEventListener(e, ev => ev.stopPropagation()));
  const rows = {};
  const btns = SHOT_IDS.map((id, i) => { const c = SHOT[id], b = document.createElement('button'); b.type = 'button'; b.style.setProperty('--c', rgb(c.col));
    b.innerHTML = `<i></i>${c.name}<em>${(i + 1) % 10}</em>`; b.addEventListener('pointerdown', e => { e.preventDefault(); pickT(id); });   /* click이 아니라 누르는 순간 바꿈: click은 첫 손가락에서만 생겨서, 움직이거나 쏘는 중(다른 손가락이 닿아 있을 때)엔 안 바뀌었음 */ (rows[c.role] || (rows[c.role] = (() => { const d = document.createElement('div'); d.className = 'row'; d.innerHTML = `<span>${c.role}</span>`; sel.appendChild(d); return d; })())).appendChild(b); return b; });   /* 먼거리 · 중거리 · 단거리 줄로 나눔 */
  addEventListener('keydown', e => { const n = '1234567890'.indexOf(e.key); if (n >= 0 && SHOT_IDS[n]) pickT(SHOT_IDS[n]); });
  /* ── 지금 탄 카드 ── */
  const card = document.createElement('div'); card.id = 'rgCard'; document.body.appendChild(card);
  const f1 = v => Array.isArray(v) ? (v.length === 3 ? v.join(' → ') + ' (1·2·3단계)' : `${v[0]} ~ ${v[1]}`) : `${v}`;
  const traits = c => [c.n > 1 ? `한 번에 ${c.n}발 (${c.pat === 'v' ? 'V자' : '부채꼴'} ${c.ang}°)` : '', c.chargeT ? `누르는 동안 세 단계로 모임 (${c.chargeTH.join(' · ')}초) · 단계마다 사거리 ${c.range.join(' → ')}m · 떼면 나감 · 3단계는 1마리 꿰뚫음 · 모으는 동안 나갈 길이 보임` : '',
    c.pierce ? `${c.pierce + 1}마리까지 꿰뚫음 (뒤는 ${Math.round((c.pierceK || .7) * 100)}%)` : '', c.wallB && !c.beam ? `모든 벽에서 ${c.wallB}번 튕김` : '', c.blade ? '' : c.cryB ? `수정에서 ${c.cryB}번 튕김` : '수정에서 안 튕김',
    c.knock ? `밀어내기 ${c.knock}m` : '', c.beam ? `누르는 동안 이어지는 빛 · 오래 비출수록 세짐 (${c.rampT}초에 ${c.dps[0]} → ${c.dps[1]}) · 벽·수정에서 ${c.wallB}번까지 꺾임` : '', c.prism ? '튕기는 순간 세 갈래 무지개로 갈라짐 (하나당 60%)' : '', c.homing ? '보이는 적을 쫓아감 (느림)' : '', c.blade ? `앞쪽 ${c.arc}° 반달을 한 번에 벰 · 반경 ${c.range}m 안 모두 · 반사 안 됨` : '', c.curve ? '노린 적 쪽으로 휘어 들어감 (번갈아 왼쪽·오른쪽)' : '', c.slow ? `맞을 때마다 ${c.slow * 100}% 느리게 · 최대 ${c.slowMax * 100}% · ${c.slowT}초` : '',
    c.reveal ? `맞은 둘레 ${c.reveal}m를 ${c.revealT}초 밝힘 (안개·숨을 곳)` : '', `쏠 때 ${Math.round((c.chargeSlow || c.fireSlow) * 100)}% 느려짐`].filter(Boolean).join(' · ');
  const dpsOf = c => c.beam ? `${c.dps[0]} → ${c.dps[1]}` : c.blade ? `${Math.round(c.dmg * c.rate)} (반달 안 한 마리당)` : c.chargeT ? `${Math.round(c.dmg[c.dmg.length - 1] / Math.max(c.chargeT, 1 / c.rate) * 10) / 10}` : `${Math.round(c.rate * (Array.isArray(c.dmg) ? c.dmg[1] : c.dmg) * (c.n || 1) * 10) / 10}`;
  let liveB, liveS, heatI;
  const fillCard = id => { const c = SHOT[id]; card.style.setProperty('--c', rgb(c.col));
    card.innerHTML = `<div class="nm"><b>${c.name}</b><span>${c.role}</span></div>
      <dl><dt>거리</dt><dd>${c.role}</dd>${c.beam ? '' : `<dt>연사</dt><dd>${c.chargeT ? '최대 ' : ''}${c.rate}회/초</dd><dt>한 발 피해</dt><dd>${f1(c.dmg)}${c.n > 1 ? ` × ${c.n}` : ''}</dd>`}<dt>표의 1초당 피해</dt><dd>${dpsOf(c)}${c.n > 1 ? ' (다 맞을 때)' : ''}</dd>
      <dt>${c.speed ? '탄 속도 · 사거리' : '사거리'}</dt><dd>${c.speed ? c.speed + 'm/초 · ' : ''}${f1(c.range).replace(' (1·2·3단계)', '')}m</dd><dt>과열 · 식음</dt><dd>${c.chargeT ? '꽉 3발' : c.heatT + '초'} · ${c.coolT}초</dd></dl>
      <div class="fx">${traits(c)}</div>
      <div class="live"><div class="big"><b>0</b><span>잰 1초당 피해</span></div><div class="sub">쏘기 시작하면 잽니다</div><div class="bar"><i></i></div></div>`;
    liveB = card.querySelector('.big b'); liveS = card.querySelector('.sub'); heatI = card.querySelector('.bar i'); };
  const M = { t0: -1, last: -9, sum: 0, hits: 0, kills: 0 };
  const pickT = id => { shots.userData.setType(id); btns.forEach((b, i) => b.classList.toggle('on', SHOT_IDS[i] === id)); fillCard(id); M.t0 = -1; M.sum = M.hits = M.kills = 0; };
  pickT('rapid');
  /* ── 떠오르는 피해 숫자 ── */
  const box = document.createElement('div'); box.id = 'rgNums'; document.body.appendChild(box);
  const NN = 48, nums = Array.from({ length: NN }, () => { const el = document.createElement('b'); box.appendChild(el); return { el, t0: -9, p: new THREE.Vector3(), dx: 0, big: 0 }; }); let nI = 0;
  const v = new THREE.Vector3();
  const dmg = (t, j, d, c, bounced, killed) => { if (M.t0 < 0 || t - M.last > 1.5) { M.t0 = t; M.sum = 0; M.hits = 0; M.kills = 0; } M.last = t; M.sum += d; M.hits++;
    const n = nums[nI = (nI + 1) % NN]; n.t0 = t; n.p.set(j.x, (j.y || 2) + .8 * j.s, j.z); n.dx = (Math.random() - .5) * 26; n.big = d >= 10 ? 1 : 0;
    n.el.style.setProperty('--c', rgb(c.col)); n.el.className = ''; n.el.innerHTML = (Math.round(d * 10) / 10) + (bounced ? '<sup>튕김 ×1.5</sup>' : ''); n.el.style.fontSize = (13 + Math.min(12, d * .7)) + 'px'; n.j = j; };
  const kill = (t, j) => { M.kills++; const n = nums.find(o => o.j === j && t - o.t0 < .05); if (n) { n.el.className = 'kill'; n.big = 1; } };
  /* ── 옮기기 ── */
  const tour = document.querySelector('#tour');
  for (const b of tour.querySelectorAll('button')) if (!/시야 가림/.test(b.textContent)) b.hidden = true;   /* 시험장: 쏘는 데 필요 없는 보기 버튼은 감춤 (시야 가림 켜고 끄기만 남김) */
  const flocks = hunt.flocks.filter(f => f.group < 10);                               /* 1번 방 앞 사냥터 떼들 */
  const go = (x, z, h, m) => { fly.userData.moveTo(x, z, h); cam.x = x; cam.z = z; say?.(m); };
  const spots = [
    ['사냥터', () => { const f = flocks[flocks.length - 1] || hunt.flocks[0], g = flocks[0] || f, dx = g.x - f.x, dz = g.z - f.z, l = Math.hypot(dx, dz) || 1;   /* 센 몹 낀 떼가 보이는 자리 */
      go(f.x + dx / l * 9, f.z + dz / l * 9, Math.atan2(dx, dz), '사냥터 — 센 몹이 낀 떼 앞'); }],
    ['수정 기둥', () => { const a = crystals.userData.gates[0], r = 24; go(Math.cos(a) * r, Math.sin(a) * r, Math.atan2(Math.cos(a), Math.sin(a)), '보스 구역 수정 — 튕김을 보세요 (튕긴 탄은 나도 맞음)'); }],
    ['숨을 곳', () => { const b = bushes.list.reduce((m, o) => !m || Math.hypot(o.x - FS.x, o.z - FS.z) < Math.hypot(m.x - FS.x, m.z - FS.z) ? o : m, null); if (b) go(b.x + 8, b.z, -Math.PI / 2, '숨을 곳 — 비추는 탄으로 밝혀 보세요'); }],
    ['해파리 다시', () => { hunt.refill(); say?.('쓰러진 떼를 다시 채웠어요'); }],
  ];
  /* 반사 시험: 상대 기체가 쏘는 탄을 반사로 돌려보내 봄 (누르면 켜고 · 다시 누르면 끔) */
  let duel = null, duelBusy = false;
  spots.push(['반사 시험', async b => { if (duelBusy) return; if (!duel) { duelBusy = true; b.textContent = '준비 중…'; duel = await makeDuel({ renderer, scene, B, fly, FS, cam, say, ui: document.querySelector('#ui'), avoid: (x, z) => jel.userData.list.some(j => j.on && Math.hypot(j.x - x, j.z - z) < 34) }); duelBusy = false; }
    if (duel.active) { duel.stop(); card.hidden = false; b.textContent = '반사 시험'; b.classList.remove('on'); } else { duel.start(); card.hidden = true; b.textContent = '반사 시험 끝'; b.classList.add('on'); } }]);
  spots.forEach(([n, f]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = n; b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); f(b); }); tour.appendChild(b); });
  /* ── 매 장면 ── */
  const update = (t, camera, cw, ch, dt = 0, px = 600) => {
    duel?.update(t, dt, px, camera, cw, ch);
    for (const n of nums) { const e = t - n.t0; if (e > 1) { if (n.el.style.opacity !== '0') n.el.style.opacity = 0; continue; }
      v.copy(n.p).project(camera); const k = e / 1, pop = e < .08 ? .7 + e / .08 * .5 : 1.2 - Math.min(.2, (e - .08) * 1.2) * (n.big ? .5 : 1);
      const x = (v.x * .5 + .5) * cw + n.dx * Math.sqrt(k), y = (-v.y * .5 + .5) * ch - 46 * (1 - (1 - k) * (1 - k));   /* 툭 튀어 오르며 커졌다가 천천히 떠오르며 사라짐 */
      n.el.style.opacity = (k < .65 ? 1 : 1 - (k - .65) / .35).toFixed(2); n.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) scale(${pop.toFixed(2)})`; }
    const S = shots.userData.S; heatI.style.width = (S.heat * 100).toFixed(0) + '%';
    if (M.t0 >= 0) { const span = Math.max(.5, (t - M.last > 1.5 ? M.last : t) - M.t0 + .15), dps = M.sum / span;
      liveB.textContent = dps.toFixed(1); liveS.textContent = `${span.toFixed(1)}초 · ${M.hits}번 맞힘 · 합 ${Math.round(M.sum)}${M.kills ? ` · ${M.kills}마리 쓰러뜨림` : ''}${t - M.last > 1.5 ? ' · 멈춤' : ''}`; } };
  return { dmg, kill, update, get duel() { return duel; } };
}
