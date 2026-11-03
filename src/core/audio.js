/* 소리 — 첫 터치 때 깨어난다 (브라우저 규칙) */
export let ctx = null;
export let sfx = null, bgm = null, send = null;   // send = 울림(리버브) 보내기
let ready = false;

export function init(){
  if(ready) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return false;
  ctx = new AC({ latencyHint:'interactive' });

  const master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  sfx = ctx.createGain(); sfx.gain.value = 0.55; sfx.connect(master);
  bgm = ctx.createGain(); bgm.gain.value = 0.5;  bgm.connect(master);

  // 짧은 울림 공간 (파일 없이 즉석으로 만든다)
  const L = Math.floor(ctx.sampleRate * 1.8);
  const ir = ctx.createBuffer(2, L, ctx.sampleRate);
  for(let ch = 0; ch < 2; ch++){
    const d = ir.getChannelData(ch);
    for(let i = 0; i < L; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/L, 3);
  }
  const rev = ctx.createConvolver(); rev.buffer = ir;
  const rg = ctx.createGain(); rg.gain.value = 0.35;
  rev.connect(rg); rg.connect(sfx);
  send = rev;

  ctx.resume?.();
  ready = true;
  return true;
}

export const live = () => {
  if(!ready || !ctx || ctx.state === 'closed') return false;
  if(ctx.state === 'suspended') ctx.resume?.();   // 모바일은 깨는 데 시간이 걸린다
  return true;
};

/* 소리 만들 때 쓰는 작은 도구들 */
export function noise(dur){
  const b = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate*dur)), ctx.sampleRate);
  const d = b.getChannelData(0);
  for(let i = 0; i < d.length; i++) d[i] = Math.random()*2-1;
  const s = ctx.createBufferSource(); s.buffer = b; return s;
}
export function env(g, t0, atk, peak, dec){
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + atk + dec);
}
export function out(node, wet = 0){
  node.connect(sfx);
  if(wet > 0 && send){ const w = ctx.createGain(); w.gain.value = wet; node.connect(w); w.connect(send); }
}

/* 첫 입력 때 자동으로 깨우기 */
const wake = () => { init(); ctx?.resume?.(); };
addEventListener('pointerdown', wake, { once:false, passive:true });
addEventListener('visibilitychange', () => {
  if(!ready) return;
  document.hidden ? ctx.suspend?.() : ctx.resume?.();
});

/* ── 공용 효과음 ──
   버튼음은 "철컥"(기계) + "틴"(유리) + 무지개 번짐(프리즘) 세 겹이다.
   장착음과 시간이 겹치면 버튼음이 스스로 물러나 서로 뭉개지지 않는다. */

let uiBus = null, lastEquipAt = -9, lastUiAt = -9;

function bus(){
  if(uiBus || !ctx) return uiBus;
  uiBus = ctx.createGain();
  uiBus.gain.value = 0.9;
  uiBus.connect(sfx);
  return uiBus;
}

/* 철컥 — 걸쇠가 물리는 소리 */
function latch(t0, lvl){
  const b = bus();
  const n = noise(.05), bp = ctx.createBiquadFilter(), g = ctx.createGain();
  bp.type = 'bandpass'; bp.frequency.value = 3100; bp.Q.value = 1.1;
  n.connect(bp); bp.connect(g);
  g.gain.setValueAtTime(.0001, t0);
  g.gain.exponentialRampToValueAtTime(.26*lvl, t0 + .0015);
  g.gain.exponentialRampToValueAtTime(.0001, t0 + .034);
  g.connect(b); n.start(t0); n.stop(t0 + .08);

  const o = ctx.createOscillator(), og = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(190, t0);
  o.frequency.exponentialRampToValueAtTime(86, t0 + .05);
  o.connect(og);
  og.gain.setValueAtTime(.0001, t0);
  og.gain.exponentialRampToValueAtTime(.2*lvl, t0 + .003);
  og.gain.exponentialRampToValueAtTime(.0001, t0 + .07);
  og.connect(b); o.start(t0); o.stop(t0 + .1);
}

/* 유리 틴 — 살짝 휘어 오르면 '반사', 내려가면 '해제' */
function ting(t0, f, lvl, dir){
  const b = bus();
  [[1,.13,.15],[1.5,.075,.11],[2.25,.042,.085]].forEach(([m, a, d], i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = i ? 'sine' : 'triangle';
    o.frequency.setValueAtTime(f*m, t0);
    o.frequency.exponentialRampToValueAtTime(f*m*(dir > 0 ? 1.03 : .955), t0 + .06);
    o.connect(g);
    g.gain.setValueAtTime(.0001, t0);
    g.gain.exponentialRampToValueAtTime(a*lvl, t0 + .0025);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    g.connect(b); o.start(t0); o.stop(t0 + d + .05);
  });
}

/* 무지개 번짐 — 일곱 빛깔처럼 살짝씩 늦게 퍼지는 아주 작은 꼬리 */
function prism(t0, f, lvl){
  const b = bus();
  [1, 1.26, 1.5, 1.68, 2, 2.52].forEach((m, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f*m*1.5;
    o.connect(g);
    const st = t0 + .012 + i*.013;
    g.gain.setValueAtTime(.0001, st);
    g.gain.exponentialRampToValueAtTime(.022*lvl, st + .004);
    g.gain.exponentialRampToValueAtTime(.0001, st + .22);
    g.connect(b);
    if(send){ const w = ctx.createGain(); w.gain.value = .5; g.connect(w); w.connect(send); }
    o.start(st); o.stop(st + .3);
  });
}

/* 버튼음 — kind: 'tap' 기본 · 'back' 돌아가기 · 'off' 해제 */
export function sfxUI(kind = 'tap'){
  if(!live()) return;
  const t0 = ctx.currentTime;
  if(t0 - lastUiAt < .035) return;          // 연타해도 뭉치지 않게
  lastUiAt = t0;

  let lvl = 1;
  if(t0 - lastEquipAt < .28) lvl = .3;      // 장착음이 울리는 중이면 물러난다

  const f = kind === 'tap' ? 1174.7 : kind === 'back' ? 880 : 740;
  const dir = kind === 'tap' ? 1 : -1;
  latch(t0, lvl);
  ting(t0 + .004, f, lvl, dir);
  if(kind === 'tap') prism(t0, f, lvl);
}

/* 예전 이름 유지 */
export const sfxTap = (ok = true) => sfxUI(ok ? 'tap' : 'off');

/* 장착 — 올라가는 세 음 + 반짝이는 꼬리 */
export function sfxEquip(){
  if(!live()) return;
  const t0 = ctx.currentTime;
  lastEquipAt = t0;
  [392, 587.33, 880].forEach((f, i) => {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o2.type = 'sine';
    o.frequency.value = f; o2.frequency.value = f*2.002;
    o.connect(g); o2.connect(g);
    const st = t0 + i*0.055;
    env(g, st, .006, .13, .5); out(g, .5);
    o.start(st); o2.start(st); o.stop(st+.7); o2.stop(st+.7);
  });
  const s = noise(.35), bp = ctx.createBiquadFilter(), g = ctx.createGain();
  bp.type = 'bandpass'; bp.Q.value = 1.6;
  bp.frequency.setValueAtTime(2200, t0);
  bp.frequency.exponentialRampToValueAtTime(9000, t0+.3);
  s.connect(bp); bp.connect(g); env(g, t0+.04, .01, .14, .3); out(g, .6); s.start(t0);

  const o = ctx.createOscillator(), g2 = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(110, t0);
  o.frequency.exponentialRampToValueAtTime(220, t0+.18);
  o.connect(g2); env(g2, t0, .004, .18, .3); out(g2, .2);
  o.start(t0); o.stop(t0+.45);
}

/* 해제 — 걸쇠가 풀리는 느낌 */
export function sfxUnequip(){
  if(!live()) return;
  const t0 = ctx.currentTime;
  lastEquipAt = t0;
  latch(t0, 1);
  [587.33, 440].forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    o.connect(g); env(g, t0 + i*.07, .005, .1, .26); out(g, .35);
    o.start(t0 + i*.07); o.stop(t0 + i*.07 + .4);
  });
}
