/* 보물 장소 소리 (사용자 2026-11-11: 코드로 만들어서 눌러 보며 고르게 — 순간마다 세 가지)
   녹음 파일 없이 브라우저에서 바로 만들어 냄 (Web Audio): 쇠 · 유리 · 나무 · 바람 · 빛 소리를 여러 겹으로 쌓고, 공간 울림(잔향)을 입힘
   · 쇠: 서로 어긋난 배음(종이나 쇠막대처럼 맞지 않는 음들)을 따로 줄어들게 → '챙' · '쩡'
   · 유리: 높은 음 여러 개가 아주 짧게 흩어짐 + 잘게 부서지는 잡음
   · 나무 · 경첩: 거친 톱니 소리를 좁게 걸러 음높이를 떨리게 → '끼익'
   · 바람 · 공기: 잡음을 걸러 음역을 천천히 움직임
   · 빛 · 마법: 맑은 종소리 화음 · 위로 오르는 반짝임 */
let A = null, OUT = null, VERB = null, NOISE = null, VOL = 1;   /* VOL: 소리마다 크기 맞춤 (조용한 것은 키움) */
export function audio(ctx) { if (A && !ctx) return A; A = ctx || new (window.AudioContext || window.webkitAudioContext)();
  const comp = A.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(A.destination);
  OUT = A.createGain(); OUT.gain.value = .8; OUT.connect(comp);
  /* 공간 울림: 2.4초 동안 줄어드는 잡음을 좌우 따로 → 넓은 돌 마당 느낌 */
  const len = A.sampleRate * 2.4 | 0, ir = A.createBuffer(2, len, A.sampleRate); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  VERB = A.createConvolver(); VERB.buffer = ir; const vg = A.createGain(); vg.gain.value = .55; VERB.connect(vg); vg.connect(comp);
  NOISE = A.createBuffer(1, A.sampleRate * 3, A.sampleRate); const nd = NOISE.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  return A; }

/* ── 재료 ── */
const bus = (wet = .3, pan = 0) => { const g = A.createGain(); g.gain.value = VOL; const p = A.createStereoPanner ? A.createStereoPanner() : null, s = A.createGain(); s.gain.value = wet;
  if (p) { p.pan.value = pan; g.connect(p); p.connect(OUT); p.connect(s); } else { g.connect(OUT); g.connect(s); } s.connect(VERB); return g; };
const env = (param, t, a, peak, d, floor = .0001) => { param.setValueAtTime(floor, t); param.linearRampToValueAtTime(peak, t + a); param.exponentialRampToValueAtTime(floor, t + a + d); };
function tone(dst, t, f, dur, gain, { type = 'sine', a = .004, to = 0, det = 0 } = {}) { const o = A.createOscillator(), g = A.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur); o.detune.value = det;
  env(g.gain, t, a, gain, dur); o.connect(g); g.connect(dst); o.start(t); o.stop(t + a + dur + .05); return o; }
function noise(dst, t, dur, gain, { type = 'bandpass', f = 1000, q = 1, to = 0, a = .003 } = {}) { const s = A.createBufferSource(), fl = A.createBiquadFilter(), g = A.createGain(); s.buffer = NOISE; s.loop = true; fl.type = type; fl.frequency.setValueAtTime(f, t); if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur); fl.Q.value = q;
  env(g.gain, t, a, gain, dur); s.connect(fl); fl.connect(g); g.connect(dst); s.start(t, Math.random() * 2); s.stop(t + a + dur + .05); }
/* 쇠: 어긋난 배음 (높은 것일수록 빨리 줄어듦) */
function metal(dst, t, f0, dur, gain, ratios = [1, 2.76, 5.4, 8.93, 13.3]) { ratios.forEach((r, i) => tone(dst, t, f0 * r * (1 + (Math.random() - .5) * .004), dur / (1 + i * .7), gain / (1 + i * .6), { a: .001 })); }
/* 종: 맑은 배음 */
function bell(dst, t, f, dur, gain) { [[1, 1], [2, .35], [3.01, .18], [4.2, .08]].forEach(([r, k], i) => tone(dst, t, f * r, dur / (1 + i * .5), gain * k, { a: .002 })); }
/* 거친 마찰 (끼익): 톱니 소리를 좁게 거르고 음높이를 떨리게 + 잘게 끊김 */
function creak(dst, t, dur, f0, f1, gain, q = 9, grain = 38) { const o = A.createOscillator(), fl = A.createBiquadFilter(), g = A.createGain(), am = A.createGain(), lfo = A.createOscillator(), lg = A.createGain();
  o.type = 'sawtooth'; const n = 40, curve = new Float32Array(n); for (let i = 0; i < n; i++) { const k = i / (n - 1); curve[i] = (f0 + (f1 - f0) * k) * (1 + (Math.random() - .5) * .08); } o.frequency.setValueCurveAtTime(curve, t, dur);
  fl.type = 'bandpass'; fl.frequency.value = f0 * 6; fl.Q.value = q; lfo.type = 'square'; lfo.frequency.value = grain; lg.gain.value = .5; am.gain.value = .5; lfo.connect(lg); lg.connect(am.gain);
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(gain, t + .06); g.gain.setValueAtTime(gain, t + dur * .7); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(fl); fl.connect(am); am.connect(g); g.connect(dst); o.start(t); lfo.start(t); o.stop(t + dur + .05); lfo.stop(t + dur + .05); }
const rnd = (a, b) => a + Math.random() * (b - a);

/* ── 순간마다 세 가지 (가 · 나 · 다) ── 길이(초)는 미리 듣기 길이 */
export const SFX = [
  { id: 'hum', name: '봉인 울림 (평소 · 계속)', loop: true, len: 4, v: [
    { n: '낮은 울림', d: '땅속에서 웅웅 · 두 음이 맞물려 천천히 일렁임', f(t) { const b = bus(.25); [55, 55.6, 110.3].forEach((f, i) => tone(b, t, f, 4, i < 2 ? .16 : .05, { a: 1.2 })); noise(b, t, 4, .05, { type: 'lowpass', f: 300, a: 1.2 }); } },
    { n: '맑은 합창', vol: 1.6, d: '먼 데서 들리는 사람 목소리 같은 화음', f(t) { const b = bus(.6); [220, 277.2, 329.6, 440].forEach((f, i) => { const o = tone(b, t, f, 4, .045, { type: 'sawtooth', a: 1.4, det: (i - 1.5) * 7 }); }); noise(b, t, 4, .02, { f: 900, q: 6, a: 1.4 }); } },
    { n: '수정 떨림', vol: 1.5, d: '높고 투명한 음이 잔잔히 반짝임', f(t) { const b = bus(.7); for (let i = 0; i < 9; i++) bell(b, t + i * .42, [1318, 1568, 1760, 2093][i % 4] * (1 + rnd(-.003, .003)), 1.6, .035); tone(b, t, 82.4, 4, .08, { a: 1 }); } } ] },
  { id: 'wind', name: '바람 (평소 · 계속)', loop: true, len: 4, v: [
    { n: '잔잔한 바람', vol: 2.5, d: '부드럽게 스치는 바람', f(t) { const b = bus(.2); noise(b, t, 4, .12, { f: 500, q: .7, to: 900, a: 1.5 }); noise(b, t + 1, 3, .06, { f: 1400, q: 1.5, to: 700, a: 1 }); } },
    { n: '돌 사이 바람', vol: 6, d: '기둥 사이로 휘감기는 낮은 휘파람', f(t) { const b = bus(.4); noise(b, t, 4, .14, { f: 320, q: 4, to: 520, a: 1.2 }); noise(b, t + .5, 3.4, .05, { f: 1200, q: 12, to: 1500, a: 1 }); } },
    { n: '높은 하늘 바람', d: '높은 곳의 맑고 먼 바람', f(t) { const b = bus(.35); noise(b, t, 4, .1, { type: 'highpass', f: 2200, q: .5, a: 1.6 }); noise(b, t, 4, .06, { f: 700, q: 2, to: 1100, a: 1.6 }); } } ] },
  { id: 'snap', name: '사슬 끊김', len: 1.2, v: [
    { n: '쇠 끊김 (챙)', d: '팽팽한 쇠가 끊어지며 맑게 울림', f(t) { const b = bus(.35); noise(b, t, .06, .5, { type: 'highpass', f: 2500 }); metal(b, t, 780, .9, .22); metal(b, t + .012, 1170, .5, .1); } },
    { n: '무거운 쇠 (쩡)', d: '굵은 사슬이 묵직하게 끊어짐', f(t) { const b = bus(.4); noise(b, t, .1, .45, { f: 1800, q: .8 }); metal(b, t, 330, 1.1, .3); tone(b, t, 70, .35, .35, { to: 45 }); } },
    { n: '봉인 끊김 (마법)', d: '쇠 소리에 맑은 봉인 소리가 섞임', f(t) { const b = bus(.6); noise(b, t, .05, .45, { type: 'highpass', f: 3000 }); metal(b, t, 620, .7, .2); bell(b, t + .03, 1568, 1.1, .12); bell(b, t + .09, 2093, .9, .07); } } ] },
  { id: 'clatter', name: '사슬 고리 떨어짐', len: 1.6, v: [
    { n: '가벼운 고리', vol: 1.6, d: '작은 고리들이 돌바닥에 짤랑짤랑', f(t) { const b = bus(.25); for (let i = 0; i < 9; i++) { const tt = t + .25 + i * rnd(.05, .14) + i * i * .006; metal(b, tt, rnd(1800, 2600), .18, .08 * (1 - i / 11), [1, 2.76, 5.4]); noise(b, tt, .02, .06, { type: 'highpass', f: 4000 }); } } },
    { n: '무거운 고리', d: '굵은 고리가 쿵 떨어지고 덜그럭', f(t) { const b = bus(.3); for (let i = 0; i < 6; i++) { const tt = t + .3 + i * rnd(.08, .18); metal(b, tt, rnd(600, 900), .25, .12 * (1 - i / 8)); tone(b, tt, 90, .12, .12, { to: 60 }); } } },
    { n: '튀며 흩어짐', vol: 1.5, d: '바닥에 튕겨 여러 번 통통 튀다 멈춤', f(t) { const b = bus(.3); let tt = t + .25, gap = .22; for (let i = 0; i < 10; i++) { metal(b, tt, 1500 + i * 60, .15, .1 * Math.pow(.8, i), [1, 2.76, 5.4]); tt += gap; gap *= .72; } } } ] },
  { id: 'seal', name: '봉인 원 깨짐', len: 2, v: [
    { n: '유리 깨짐', d: '맑은 유리가 와장창 부서짐', f(t) { const b = bus(.5); noise(b, t, .25, .35, { type: 'highpass', f: 3500, to: 6000 }); for (let i = 0; i < 26; i++) tone(b, t + rnd(0, .35), rnd(2500, 7000), rnd(.05, .25), .05, { a: .001 }); } },
    { n: '마법 깨짐', d: '빛 조각이 흩어지며 아래로 내려가는 반짝임', f(t) { const b = bus(.7); noise(b, t, .15, .3, { type: 'highpass', f: 3000 }); [2637, 2349, 2093, 1760, 1568, 1319, 1175].forEach((f, i) => bell(b, t + .05 + i * .07, f, .8, .07)); } },
    { n: '깊은 깨짐', d: '쿵 울리고 수정 조각이 흩어짐', f(t) { const b = bus(.6); tone(b, t, 90, 1.2, .5, { to: 38 }); noise(b, t, .4, .25, { type: 'lowpass', f: 600 }); for (let i = 0; i < 14; i++) bell(b, t + .08 + rnd(0, .4), rnd(1800, 4200), .4, .035); } } ] },
  { id: 'tremble', name: '뚜껑 떨림', len: 1, v: [
    { n: '덜덜 떨림', vol: 3.5, d: '뚜껑이 들썩이며 빠르게 덜그럭', f(t) { const b = bus(.2); for (let i = 0; i < 16; i++) { const tt = t + i * .045; noise(b, tt, .025, .12 + i * .01, { f: rnd(400, 700), q: 3 }); } } },
    { n: '힘이 차오름', d: '안에서 웅웅 힘이 차오르며 떨림', f(t) { const b = bus(.4); tone(b, t, 110, .9, .2, { type: 'sawtooth', to: 220, a: .3 }); noise(b, t, .9, .1, { f: 300, q: 2, to: 1200, a: .4 }); } },
    { n: '쇠 테 떨림', d: '청동 테가 잘게 울리며 떨림', f(t) { const b = bus(.3); for (let i = 0; i < 12; i++) metal(b, t + i * .06, 900 + i * 25, .08, .06, [1, 2.76]); tone(b, t, 120, .8, .1, { a: .2 }); } } ] },
  { id: 'open', name: '뚜껑 열림', len: 1.6, v: [
    { n: '나무 끼익', d: '오래된 경첩이 끼이익 열림', f(t) { const b = bus(.3); creak(b, t, 1.1, 120, 70, .25); tone(b, t + 1.05, 80, .3, .25, { to: 50 }); } },
    { n: '무거운 돌 · 쇠', d: '묵직하게 그르릉 밀려 열림', f(t) { const b = bus(.4); creak(b, t, 1.3, 55, 40, .3, 4, 22); noise(b, t, 1.3, .08, { type: 'lowpass', f: 400, a: .2 }); tone(b, t + 1.25, 60, .4, .35, { to: 38 }); } },
    { n: '가볍게 탁', vol: 1.6, d: '짧게 열리며 공기가 훅 빠짐', f(t) { const b = bus(.35); creak(b, t, .35, 180, 140, .15, 7, 50); noise(b, t + .2, .5, .18, { f: 800, q: .7, to: 2500 }); tone(b, t + .3, 140, .2, .15); } } ] },
  { id: 'burst', name: '빛 터짐 (열린 순간)', len: 2.5, v: [
    { n: '화음 쏟아짐', d: '밝은 화음이 와아 하고 펼쳐짐', f(t) { const b = bus(.7); noise(b, t, .6, .2, { f: 600, q: .6, to: 4000, a: .05 }); [523, 659, 784, 1047, 1319].forEach((f, i) => tone(b, t + i * .03, f, 2, .06, { type: 'triangle', a: .15 })); } },
    { n: '반짝 오름', d: '종소리가 위로 또르르 올라감', f(t) { const b = bus(.7); [784, 988, 1175, 1568, 1976, 2349, 3136].forEach((f, i) => bell(b, t + i * .06, f, 1.3, .08)); noise(b, t, .4, .12, { type: 'highpass', f: 3000, to: 8000 }); } },
    { n: '쿵 + 빛', d: '낮게 쿵 울리고 맑은 화음이 길게', f(t) { const b = bus(.7); tone(b, t, 65, 1, .5, { to: 40 }); noise(b, t, .5, .2, { type: 'lowpass', f: 500 }); [392, 523, 659, 784].forEach(f => tone(b, t + .1, f, 2.2, .05, { type: 'triangle', a: .3 })); } } ] },
  { id: 'wave', name: '풀려난 힘이 퍼짐', len: 2.5, v: [
    { n: '훅 퍼지는 바람', d: '가운데서 바깥으로 바람이 훅 밀려남', f(t) { const b = bus(.4, 0); noise(b, t, 1.8, .25, { f: 300, q: .6, to: 2400, a: .08 }); tone(b, t, 55, .9, .2, { to: 35 }); } },
    { n: '땅 울림', d: '땅이 우르르 떨리며 퍼짐', f(t) { const b = bus(.5); noise(b, t, 2, .3, { type: 'lowpass', f: 180, to: 90, a: .1 }); tone(b, t, 48, 1.6, .3, { a: .1 }); } },
    { n: '맑은 물결', d: '반짝이는 소리가 물결처럼 번짐', f(t) { const b = bus(.8); noise(b, t, 1.5, .1, { type: 'highpass', f: 2500, to: 7000, a: .1 }); for (let i = 0; i < 8; i++) bell(b, t + i * .09, 1047 * Math.pow(1.122, i % 5), .9, .04); } } ] },
  { id: 'fly', name: '아이템 날아감', len: 2, v: [
    { n: '반짝이 꼬리', vol: 2.2, d: '작은 반짝임이 꼬리처럼 따라감', f(t) { const b = bus(.6); for (let i = 0; i < 16; i++) { const k = i / 15, f = 1800 + Math.sin(k * Math.PI) * 1600; bell(b, t + k * 1.6, f * rnd(.97, 1.03), .35, .04); } } },
    { n: '포물선 휘익', vol: 3.5, d: '올라갔다 내려오는 바람 소리', f(t) { const b = bus(.4); noise(b, t, .9, .18, { f: 700, q: 3, to: 2200, a: .2 }); noise(b, t + .8, .9, .16, { f: 2200, q: 3, to: 600, a: .05 }); } },
    { n: '하프 미끄럼', d: '하프를 위로 쓸고 아래로 쓸어 내림', f(t) { const b = bus(.6); const s = [523, 587, 659, 784, 880, 1047, 1175, 1319]; s.forEach((f, i) => tone(b, t + i * .07, f, .6, .07, { type: 'triangle' })); s.slice().reverse().forEach((f, i) => tone(b, t + .9 + i * .08, f, .6, .06, { type: 'triangle' })); } } ] },
  { id: 'land', name: '아이템 내려앉음', len: 1.6, v: [
    { n: '사뿐 + 종', d: '가볍게 톡 닿고 맑은 종 한 번', f(t) { const b = bus(.5); tone(b, t, 160, .15, .25, { to: 90 }); bell(b, t + .02, 1319, 1.3, .12); } },
    { n: '마법 딩', d: '두 음 딩동 · 여기 있다는 알림', f(t) { const b = bus(.6); bell(b, t, 1047, 1, .12); bell(b, t + .14, 1568, 1.3, .12); } },
    { n: '반짝 가라앉음', d: '반짝이가 내려앉으며 사르르', f(t) { const b = bus(.6); noise(b, t, .6, .12, { type: 'highpass', f: 5000, to: 2500 }); for (let i = 0; i < 6; i++) bell(b, t + i * .05, 2637 / (1 + i * .12), .6, .05); tone(b, t, 140, .12, .2, { to: 90 }); } } ] },
  { id: 'glint', name: '상자 보임 (반짝)', len: 1.2, v: [
    { n: '딩 하나', vol: 1.6, d: '맑은 반짝 한 번', f(t) { const b = bus(.6); bell(b, t, 2093, .9, .1); noise(b, t, .1, .06, { type: 'highpass', f: 6000 }); } },
    { n: '두 음 반짝', vol: 1.6, d: '또로링 두 음', f(t) { const b = bus(.6); bell(b, t, 1568, .7, .08); bell(b, t + .1, 2349, .9, .08); } },
    { n: '스윽 반짝', vol: 1.8, d: '빛이 스윽 지나가며 반짝 (무지개가 지나가는 느낌)', f(t) { const b = bus(.6); noise(b, t, .5, .08, { f: 2000, q: 4, to: 8000, a: .2 }); bell(b, t + .35, 2637, .8, .07); } } ] },
];
export const play = (id, k, t0 = 0) => { audio(); if (A.state === 'suspended') A.resume(); const s = SFX.find(x => x.id === id); VOL = s.v[k].vol || 1; s.v[k].f(A.currentTime + .03 + t0); VOL = 1; };
/* 검수용: 소리 하나를 화면 밖에서 만들어 크기를 잼 (가장 큰 소리 · 평균 크기) */
export async function measure(id, k) { const keep = [A, OUT, VERB, NOISE], s = SFX.find(x => x.id === id), oc = new OfflineAudioContext(2, 44100 * (s.len + 2.5), 44100); audio(oc); VOL = s.v[k].vol || 1; s.v[k].f(.05); VOL = 1;
  const buf = await oc.startRendering(); [A, OUT, VERB, NOISE] = keep; let pk = 0, ss = 0; const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > pk) pk = v; ss += v * v; } return { pk: +pk.toFixed(3), rms: +Math.sqrt(ss / d.length).toFixed(4) }; }
