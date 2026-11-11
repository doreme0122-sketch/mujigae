/* 보물 장소 소리 (사용자 2026-11-11: 필요한 소리는 다섯 — 사슬 끊김 · 빛 터짐 · 아이템 날아감 · 아이템 내려앉음 · 줍기 완료 · 퀄리티 좋게)
   녹음 파일 없이 브라우저에서 만들어 냄 (Web Audio). 단순한 삐 소리가 아니라 실제 소리가 생기는 방식대로 쌓음:
   · 쇠: 짧은 충격(딸깍 + 잡음)이 쇠의 고유 울림 여러 개(서로 어긋난 높이)를 울리고, 울림마다 두 음이 살짝 어긋나 '위잉' 맥놀이 · 높은 울림일수록 빨리 사라짐
   · 줄 튕김(하프 · 류트): 잡음 한 번을 짧은 되먹임 줄에 넣어 실제 줄처럼 울리게 (카플러스-스트롱 방식) — 미리 계산해 둠
   · 종 · 반짝이: 맑은 배음 + 좌우로 흩어지는 작은 알갱이들
   · 바람 · 공기: 걸러 낸 잡음을 음역째 움직임 (날아갈 때는 다가오며 높아지고 멀어지며 낮아짐)
   · 공간: 돌 마당 울림 — 앞쪽 반사 몇 개 + 좌우가 다른 꼬리, 꼬리는 시간이 갈수록 높은 소리부터 사라짐 */
let A = null, OUT = null, VERB = null, NOISE = null, VOL = 1;
const KS = new Map();
export function audio(ctx) { if (A && !ctx) return A; A = ctx || new (window.AudioContext || window.webkitAudioContext)(); KS.clear();
  const comp = A.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = .004; comp.release.value = .2; comp.connect(A.destination);
  OUT = A.createGain(); OUT.gain.value = .85; OUT.connect(comp);
  /* 돌 마당 울림 (2.6초): 앞쪽 반사 + 좌우 다른 꼬리 · 높은 소리가 먼저 사라짐 */
  const sr = A.sampleRate, len = sr * 2.6 | 0, ir = A.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp = 0; for (let i = 0; i < len; i++) { const t = i / len, k = .5 + .45 * t; lp = lp * k + (Math.random() * 2 - 1) * (1 - k); d[i] = lp * Math.pow(1 - t, 2.6) * 2.2; }
    for (const [ms, g] of [[11, .5], [19, .35], [29, .3], [41, .22], [57, .16]]) { const j = (ms + c * 3.7) * sr / 1000 | 0; d[j] += g * (c ? -1 : 1); } }
  VERB = A.createConvolver(); VERB.buffer = ir; const pre = A.createDelay(.1); pre.delayTime.value = .018; const vg = A.createGain(); vg.gain.value = .5; pre.connect(VERB); VERB.connect(vg); vg.connect(comp); VERB.pre = pre;
  NOISE = A.createBuffer(1, sr * 3, sr); const nd = NOISE.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  return A; }

/* ── 재료 ── */
const rnd = (a, b) => a + Math.random() * (b - a);
/* 보내는 길: 크기 · 좌우 · 울림 양 */
const bus = (wet = .3, pan = 0) => { const g = A.createGain(); g.gain.value = VOL; const p = A.createStereoPanner(), s = A.createGain(); s.gain.value = wet; p.pan.value = pan; g.connect(p); p.connect(OUT); p.connect(s); s.connect(VERB.pre); return g; };
const env = (param, t, a, peak, d) => { param.setValueAtTime(.0001, t); param.linearRampToValueAtTime(peak, t + a); param.exponentialRampToValueAtTime(.0001, t + a + d); };
function osc(dst, t, f, dur, gain, { type = 'sine', a = .003, to = 0, det = 0, pan = null } = {}) { const o = A.createOscillator(), g = A.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + a + dur); o.detune.value = det;
  env(g.gain, t, a, gain, dur); o.connect(g); if (pan !== null) { const p = A.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(dst); } else g.connect(dst); o.start(t); o.stop(t + a + dur + .05); return o; }
function noise(dst, t, dur, gain, { type = 'bandpass', f = 1000, q = 1, to = 0, a = .002, pan = null } = {}) { const s = A.createBufferSource(), fl = A.createBiquadFilter(), g = A.createGain(); s.buffer = NOISE; s.loop = true;
  fl.type = type; fl.frequency.setValueAtTime(f, t); if (to) fl.frequency.exponentialRampToValueAtTime(to, t + a + dur); fl.Q.value = q; env(g.gain, t, a, gain, dur); s.connect(fl); fl.connect(g);
  if (pan !== null) { const p = A.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(dst); } else g.connect(dst); s.start(t, Math.random() * 2); s.stop(t + a + dur + .05); }
/* 쇠 울림: 충격 + 고유 울림들 (울림마다 두 음이 살짝 어긋나 맥놀이) */
function strike(dst, t, f0, dur, gain, { modes = [1, 2.71, 5.18, 8.43, 12.3, 16.9], bright = 1, click = 1 } = {}) {
  noise(dst, t, .012, .5 * gain * click, { type: 'highpass', f: 3000 * bright }); osc(dst, t, f0 * 9, .004, .25 * gain * click, { type: 'square' });   /* 딸깍 */
  modes.forEach((r, i) => { const f = f0 * r * (1 + rnd(-.003, .003)), d = dur * Math.pow(.62, i) * (bright > 1 ? 1 : 1 + .2 * i * 0), g = gain * Math.pow(.62, i) * (i ? 1 : .9);
    osc(dst, t, f, d, g * .6, { a: .0015, pan: rnd(-.25, .25) }); osc(dst, t, f * 1.0035, d * .9, g * .45, { a: .0015, pan: rnd(-.25, .25) }); }); }
/* 줄 튕김 (카플러스-스트롱): 미리 계산한 소리를 재생 */
function ksBuf(f, dur = 2.2, bright = .5) { const key = f.toFixed(1) + '_' + bright; if (KS.has(key)) return KS.get(key); const sr = A.sampleRate, n = sr * dur | 0, b = A.createBuffer(1, n, sr), d = b.getChannelData(0), N = Math.max(2, Math.round(sr / f)), line = new Float32Array(N);
  for (let i = 0; i < N; i++) line[i] = (Math.random() * 2 - 1) * (1 - bright * .5 + bright * .5 * Math.sin(Math.PI * i / N)); let p = 0, prev = 0; const damp = .4985 + bright * .0013;
  for (let i = 0; i < n; i++) { const v = line[p]; d[i] = v; const nv = (v + prev) * damp; prev = v; line[p] = nv; p = (p + 1) % N; } KS.set(key, b); return b; }
function pluck(dst, t, f, gain, { dur = 2.2, bright = .5, pan = 0 } = {}) { const s = A.createBufferSource(), g = A.createGain(), p = A.createStereoPanner(); s.buffer = ksBuf(f, dur, bright); g.gain.value = gain; p.pan.value = pan; s.connect(g); g.connect(p); p.connect(dst); s.start(t); }
/* 종 · 반짝이 (맑은 배음 · 짧은 쇠 기운) */
function bell(dst, t, f, dur, gain, pan = 0) { [[1, 1, 1], [2.0, .4, .7], [2.76, .22, .5], [5.4, .1, .3], [8.93, .05, .2]].forEach(([r, k, dk]) => osc(dst, t, f * r, dur * dk, gain * k, { a: .0015, pan })); }
/* 반짝이 알갱이 구름: 좌우로 흩어지는 작은 종들 */
function glitter(dst, t, dur, n, gain, lo = 2400, hi = 6200, curve = null) { for (let i = 0; i < n; i++) { const k = i / n, tt = t + (curve ? curve(k) : k) * dur + rnd(-.02, .02), f = rnd(lo, hi); bell(dst, tt, f, rnd(.15, .45), gain * rnd(.5, 1), rnd(-.8, .8)); } }
/* 공기 덩어리 (훅 · 쏴): 잡음 두 겹을 음역째 움직임 */
function air(dst, t, dur, gain, f0, f1, a = .05) { noise(dst, t, dur, gain, { f: f0, q: .8, to: f1, a }); noise(dst, t + .01, dur * .9, gain * .6, { type: 'highpass', f: f0 * 2.5, to: f1 * 2.5, a }); }

/* ── 다섯 순간 × 세 가지 (가 · 나 · 다) ── */
export const SFX = [
  { id: 'snap', name: '사슬 끊김', len: 1.6, v: [
    { n: '쇠사슬 끊김', d: '팽팽한 쇠가 탁 끊기며 맑게 울리고, 끊긴 고리가 짤랑 떨어짐', f(t) { const b = bus(.32); noise(b, t - .06, .07, .18, { type: 'highpass', f: 5000, to: 2500, a: .05 });   /* 끊기기 직전 끼기긱 당기는 소리 */
        strike(b, t, 740, 1.1, .3); strike(b, t + .004, 1105, .6, .14, { click: .3 }); osc(b, t, 120, .18, .3, { to: 60 });
        for (let i = 0; i < 4; i++) strike(b, t + .32 + i * rnd(.07, .13), rnd(2100, 2900), .16, .05 * (1 - i / 5), { modes: [1, 2.71, 5.18], click: .3 }); } },
    { n: '굵은 사슬 (쩡)', d: '무거운 사슬이 묵직하게 끊기며 낮게 오래 울림', vol: 1.1, f(t) { const b = bus(.4); noise(b, t, .09, .35, { f: 1600, q: .7 }); strike(b, t, 310, 1.6, .34, { bright: .8 });
        osc(b, t, 72, .5, .42, { to: 42 }); noise(b, t, .3, .12, { type: 'lowpass', f: 300 }); for (let i = 0; i < 3; i++) strike(b, t + .45 + i * rnd(.12, .2), rnd(800, 1100), .25, .06, { click: .4 }); } },
    { n: '봉인 사슬 (마법)', d: '쇠 끊기는 소리 뒤로 봉인이 풀리는 맑은 울림이 흩어짐', vol: 1.1, f(t) { const b = bus(.55); strike(b, t, 660, .9, .25); osc(b, t, 100, .15, .25, { to: 55 });
        bell(b, t + .03, 1568, 1.4, .1, -.3); bell(b, t + .07, 2349, 1.1, .07, .3); glitter(b, t + .05, .5, 12, .035, 3000, 7000, k => Math.sqrt(k)); noise(b, t + .04, .6, .05, { type: 'highpass', f: 6000, to: 9000, a: .02 }); } } ] },
  { id: 'burst', name: '빛 터짐 (상자가 열린 순간)', len: 3.2, v: [
    { n: '빛이 쏟아짐', d: '숨을 들이켜듯 차오르다 밝은 화음과 반짝이가 와아 펼쳐짐', vol: 1.1, f(t) { const b = bus(.65);
        noise(b, t, .35, .12, { f: 400, q: .8, to: 3000, a: .33 });   /* 차오름 */
        const T = t + .35; osc(b, T, 60, .8, .45, { to: 40 }); air(b, T, 1.4, .14, 3000, 900, .01);
        [261.6, 329.6, 392, 523.3, 659.3, 784].forEach((f, i) => { osc(b, T + i * .015, f, 2.6, .045, { type: 'sawtooth', a: .08, det: -7 }); osc(b, T + i * .015, f, 2.6, .045, { type: 'sawtooth', a: .08, det: 7 }); });   /* 넓은 화음 (두 겹 어긋나 풍성하게) */
        glitter(b, T, 1.6, 34, .03, 2600, 7600, k => k * k); } },
    { n: '종이 피어남', d: '맑은 종들이 아래에서 위로 차례로 피어나며 반짝임', f(t) { const b = bus(.7); osc(b, t, 70, .6, .35, { to: 45 }); air(b, t, .9, .12, 1200, 5000, .03);
        [523.3, 659.3, 784, 1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) => bell(b, t + .02 + i * .075, f, 1.8 - i * .1, .085, (i % 2 ? .35 : -.35) * (i / 8)));
        [130.8, 196, 261.6].forEach(f => pluck(b, t, f, .35, { dur: 2.6, bright: .3 })); glitter(b, t + .5, 1.4, 20, .025, 3500, 8000); } },
    { n: '깊은 울림 + 빛', d: '쿵 하고 땅이 울린 뒤 따뜻한 빛 화음이 길게 남음', vol: 1.1, f(t) { const b = bus(.6); osc(b, t, 52, 1.4, .55, { to: 34 }); noise(b, t, .5, .22, { type: 'lowpass', f: 380, to: 120 });
        strike(b, t, 196, 1.8, .12, { bright: .6, click: .2 });
        [196, 246.9, 293.7, 392, 587.3].forEach((f, i) => { const o = osc(b, t + .12, f, 3, .05, { type: 'triangle', a: .45, det: (i - 2) * 4 }); });
        glitter(b, t + .25, 1.8, 18, .025, 2000, 5200, k => Math.sqrt(k)); } } ] },
  { id: 'fly', name: '아이템 날아감 (떠올라 둥글게 넘어감 · 약 1.7초)', len: 2.4, v: [
    { n: '반짝이 꼬리', vol: 4, d: '빛 덩이가 떠오르며 작은 반짝이가 꼬리처럼 따라붙고, 올라갔다 내려옴', f(t) { const b = bus(.5);
        for (let i = 0; i < 26; i++) { const k = i / 25, h = Math.sin(k * Math.PI), f = (1500 + h * 2200) * rnd(.96, 1.04); bell(b, t + k * 1.7, f, .3 + h * .2, .03 + h * .015, -.6 + k * 1.2); }   /* 높이에 따라 음이 오르내리고 · 왼쪽 → 오른쪽 */
        noise(b, t, .9, .05, { f: 1500, q: 2, to: 4000, a: .3, pan: -.4 }); noise(b, t + .85, .85, .05, { f: 4000, q: 2, to: 1500, a: .05, pan: .4 }); } },
    { n: '휘이익 (공기)', d: '공기를 가르며 다가올수록 높아지고 멀어지며 낮아지는 바람 소리', vol: 3, f(t) { const b = bus(.35);
        const s = A.createBufferSource(), fl = A.createBiquadFilter(), fl2 = A.createBiquadFilter(), g = A.createGain(), p = A.createStereoPanner(); s.buffer = NOISE; s.loop = true; fl.type = 'bandpass'; fl.Q.value = 3; fl2.type = 'bandpass'; fl2.Q.value = 9;
        fl.frequency.setValueAtTime(500, t); fl.frequency.exponentialRampToValueAtTime(2600, t + .85); fl.frequency.exponentialRampToValueAtTime(700, t + 1.7); fl2.frequency.setValueAtTime(900, t); fl2.frequency.exponentialRampToValueAtTime(4200, t + .85); fl2.frequency.exponentialRampToValueAtTime(1100, t + 1.7);
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.35, t + .8); g.gain.exponentialRampToValueAtTime(.0001, t + 1.75); p.pan.setValueAtTime(-.7, t); p.pan.linearRampToValueAtTime(.7, t + 1.7);
        s.connect(fl); s.connect(fl2); fl.connect(g); fl2.connect(g); g.connect(p); p.connect(b); s.start(t); s.stop(t + 1.8); glitter(b, t + .2, 1.3, 8, .02, 3000, 6000); } },
    { n: '하프 둥글게', vol: 1.3, d: '하프를 위로 쓸어 올렸다 부드럽게 쓸어 내림 (진짜 줄 튕김)', f(t) { const b = bus(.55); const up = [392, 440, 523.3, 587.3, 659.3, 784, 880, 1046.5];
        up.forEach((f, i) => pluck(b, t + i * .085, f, .32, { bright: .55, pan: -.5 + i * .08 })); up.slice(0, 6).reverse().forEach((f, i) => pluck(b, t + .9 + i * .12, f * 1.335, .22, { bright: .45, pan: .1 + i * .08 }));
        glitter(b, t + .6, .8, 6, .018, 3000, 6000); } } ] },
  { id: 'land', name: '아이템 내려앉음', len: 2.2, v: [
    { n: '사뿐 + 맑은 종', vol: 1.6, d: '바닥에 톡 닿고, 맑은 종이 한 번 울리며 반짝이가 가라앉음', f(t) { const b = bus(.5); osc(b, t, 180, .14, .3, { to: 85 }); noise(b, t, .05, .12, { f: 900, q: 1.2 });
        bell(b, t + .015, 1318.5, 1.8, .12); bell(b, t + .02, 1975.5, 1.2, .05, .3); glitter(b, t + .05, .7, 9, .02, 2500, 5500, k => Math.sqrt(k)); } },
    { n: '딩동 (여기 있어요)', d: '두 음으로 딩동 · 아이템이 놓였다는 알림', f(t) { const b = bus(.55); osc(b, t, 160, .12, .25, { to: 90 });
        bell(b, t, 1046.5, 1.3, .12, -.2); bell(b, t + .16, 1568, 1.7, .12, .2); pluck(b, t, 261.6, .3, { bright: .35 }); pluck(b, t + .16, 392, .25, { bright: .35 }); } },
    { n: '빛이 스며듦', d: '부드럽게 닿으며 빛이 땅에 스며드는 따뜻한 울림', vol: 1.1, f(t) { const b = bus(.6); osc(b, t, 120, .3, .3, { to: 70 }); noise(b, t, .5, .08, { type: 'lowpass', f: 900, to: 300 });
        [523.3, 659.3, 784].forEach((f, i) => osc(b, t + .02 + i * .03, f, 1.6, .05, { type: 'triangle', a: .06 })); glitter(b, t, .9, 14, .02, 2000, 6000, k => 1 - Math.pow(1 - k, 2)); } } ] },
  { id: 'pick', name: '줍기 완료 (내 것이 됨)', len: 2, v: [
    { n: '반짝 획득', vol: 2.2, d: '빠르게 또로롱 올라가 마지막 음이 반짝 맺힘 (게임에서 보물 얻을 때)', f(t) { const b = bus(.45); [784, 987.8, 1174.7, 1568].forEach((f, i) => { bell(b, t + i * .065, f, i === 3 ? 1.6 : .5, i === 3 ? .13 : .08, -.3 + i * .2); pluck(b, t + i * .065, f / 2, .18, { bright: .6, pan: -.3 + i * .2 }); });
        glitter(b, t + .2, .8, 12, .022, 3000, 7500); noise(b, t + .19, .4, .05, { type: 'highpass', f: 5000, to: 9000 }); } },
    { n: '빨려 들어옴', d: '빛이 내 쪽으로 훅 빨려 들어오고 묵직하게 딱 맺힘', vol: 1.1, f(t) { const b = bus(.4); noise(b, t, .32, .16, { f: 3500, q: 1.5, to: 500, a: .28 }); osc(b, t, 900, .3, .05, { to: 300, a: .25 });   /* 빨려 들어옴 */
        const T = t + .3; osc(b, T, 110, .3, .4, { to: 70 }); strike(b, T, 880, .9, .1, { click: .4 }); bell(b, T, 1318.5, 1.3, .1); pluck(b, T, 220, .35, { bright: .5 }); } },
    { n: '승리 화음', d: '밝은 세 음 화음이 힘차게 울리고 반짝이가 흩어짐', vol: 1.05, f(t) { const b = bus(.55); [523.3, 659.3, 784, 1046.5].forEach((f, i) => { pluck(b, t + i * .025, f / 2, .3, { bright: .7, pan: -.4 + i * .27 }); bell(b, t + i * .025, f * 2, 1.2, .06, -.4 + i * .27); osc(b, t + i * .025, f, 1.4, .05, { type: 'triangle', a: .01 }); });
        osc(b, t, 130.8, .5, .3, { type: 'triangle' }); glitter(b, t + .1, 1, 16, .022, 3000, 7000, k => Math.sqrt(k)); } } ] },
];
export const play = (id, k, t0 = 0, amp = 1) => { audio(); if (A.state === 'suspended') A.resume(); const s = SFX.find(x => x.id === id); VOL = (s.v[k].vol || 1) * amp; s.v[k].f(A.currentTime + .08 + t0); VOL = 1; };   /* amp: 멀리 있으면 작게 */
/* 브라우저는 화면을 한 번 눌러야 소리를 냄 → 처음 누를 때 소리 장치를 깨움 */
export function unlock() { const go = () => { audio(); if (A.state === 'suspended') A.resume(); removeEventListener('pointerdown', go); removeEventListener('keydown', go); }; addEventListener('pointerdown', go); addEventListener('keydown', go); }
/* 검수용: 소리 하나를 화면 밖에서 만들어 크기를 잼 (가장 큰 소리 · 평균 크기) */
export async function measure(id, k) { const keep = [A, OUT, VERB, NOISE], s = SFX.find(x => x.id === id), oc = new OfflineAudioContext(2, 44100 * (s.len + 2.8), 44100); audio(oc); VOL = s.v[k].vol || 1; s.v[k].f(.12); VOL = 1;
  const buf = await oc.startRendering(); [A, OUT, VERB, NOISE] = keep; KS.clear(); let pk = 0, ss = 0; const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > pk) pk = v; ss += v * v; } return { pk: +pk.toFixed(3), rms: +Math.sqrt(ss / d.length).toFixed(4), buf }; }
