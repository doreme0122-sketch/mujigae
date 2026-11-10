/* 와드 한 개 (맵에 놓는 완성품) — 부품 다섯을 한데 묶고, 상태에 따라 움직임
   부품: ① 받침(wardbase) ② 유리 기둥(wardcore) ③ 도는 고리(wardring) ④ 양옆 수정탑(wardspire) ⑤ 꼭대기 눈 홀로그램(wardeye) — 모두 같은 돌, 빛만 색
   상태: own = 'none' | 'mine' | 'foe' (보는 사람 기준 색: 빈 = 푸른 · 내 것 = 초록 · 남의 것 = 빨강) · cap = 차지 정도 0~1 (차지하는 중이 아니면 -1)
   차지 완료 효과 (complete): ① 빛 원이 닫히며 하얀 빛이 한 바퀴 → ② 힘이 위로 치솟음 → ③④ 꼭대기에서 한꺼번에 눈 뜸·불꽃·빛 알갱이 (→ 땅 물결·시야는 맵 쪽에서)
   크기: 지름 약 4.5m, 높이 약 4.7m */
import * as THREE from 'three';
import * as A from '../core/audio.js';
import { makeWardBase } from './wardbase.js?v=11101813';
import { makeWardCore } from './wardcore.js?v=11101813';
import { makeWardRing } from './wardring.js?v=11101813';
import { makeWardSpires } from './wardspire.js?v=11101813';
import { makeWardEye } from './wardeye.js?v=11101813';

export const WCOL = { none: new THREE.Vector3(.35, .85, 1.0), mine: new THREE.Vector3(.62, 1.0, .32), foe: new THREE.Vector3(1.0, .36, .24) };
function bell(f, vol = .1, dec = 1.4, at = 0) { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime + at;
  [[1, 1], [2.76, .4], [5.4, .2]].forEach(([m, v]) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f * m; o.connect(g); A.env(g, t0, .004, vol * v, dec / Math.sqrt(m)); A.out(g, .6); o.start(t0); o.stop(t0 + dec + .1); }); }
function boom() { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(160, t0); o.frequency.exponentialRampToValueAtTime(45, t0 + .5); o.connect(g); A.env(g, t0, .004, .32, .6); A.out(g, .3); o.start(t0); o.stop(t0 + .7); }

export function makeWard(uT) {
  const G = new THREE.Group();
  const base = makeWardBase(uT), core = makeWardCore(uT, base.userData.top), ring = makeWardRing(uT, base.userData.top + core.userData.height * .5);
  const eye = makeWardEye(uT, base.userData.top + core.userData.height), spires = makeWardSpires(uT, [[-1.56, .96, 0], [1.56, .96, 0]]);
  G.add(base, core, ring, spires, eye);
  const S = { own: 'none', cap: -1, col: WCOL.none.clone(), power: .35, fill: .12, done: -1e9, step: 0 };   /* done: 차지 완료 시각 — 처음엔 아주 먼 옛날 (−9였을 땐 판 시작 9초 안에 모든 와드가 '완료'로 착각해 맵 곳곳 시야가 열려 버렸음) */
  const glows = [base.userData.glow, core.userData.glow, ring.userData.glow, eye.userData.glow, ...spires.userData.glows].map(m => m.uniforms);
  G.userData.S = S;
  G.userData.top = base.userData.top + core.userData.height + 1.6;
  G.userData.complete = t => { S.done = t; S.step = 0; };
  G.userData.update = (t, dt) => {
    const capping = S.cap >= 0, de = t - S.done;
    if (capping) S.fill = .12 + .88 * S.cap; else S.fill += ((S.own !== 'none' ? 1 : .12) - S.fill) * Math.min(1, dt * 2);
    const want = capping ? WCOL.none.clone().lerp(WCOL.mine, .3 + .7 * S.cap) : WCOL[S.own]; S.col.lerp(want, Math.min(1, dt * 4));
    S.power += ((S.own === 'none' ? (capping ? .35 + .5 * S.cap : .35) : 1) - S.power) * Math.min(1, dt * 2);
    const run = de >= 0 && de < .3 ? de / .3 : -1, surge = de >= .25 && de < .75 ? (de - .25) / .5 : -1, hit = de >= .75 && de < 2.4;
    if (de >= 0 && de < 1 && S.step === 0) { S.step = 1; [784, 987.8, 1174.7, 1568].forEach((f, i) => bell(f, .07, 1.2, i * .1)); }
    if (de >= .75 && de < 3 && S.step === 1) { S.step = 2; eye.userData.snap(t); boom(); bell(2093, .1, 2.4, .02); bell(1318.5, .08, 2.6, .05); G.userData.onHit?.(t); }
    const boost = hit ? Math.exp(-(de - .75) * 3) : 0, hot = de > .25 && de < 1.2 ? 1.2 : 0;
    base.userData.update(t, S.col, S.power); core.userData.update(t, S.col, S.power + hot, S.fill);
    ring.userData.update(t, dt, S.col, S.power, de > .25 && de < .9 ? 3.2 : capping ? .08 + S.cap * 1 : S.own !== 'none' ? .5 : .06);
    spires.userData.update(t, S.col, S.power, S.own !== 'none' && !capping, boost);
    eye.userData.update(t, dt, S.col, S.power, capping ? S.cap : S.own !== 'none' ? 1 : 0);
    const bg = base.userData.glow.uniforms; bg.uProg.value = capping ? S.cap : S.own !== 'none' ? 1 : 0; bg.uPCol.value.copy(capping ? WCOL.mine : WCOL[S.own]); bg.uRun.value = run;
    let rise = -9, ri = 0; if (surge >= 0) { rise = -.2 + surge * 3.9; ri = 1; } else if (hit) { rise = 9; ri = Math.max(0, 1 - (de - .75) * 1.5); }
    for (const u of glows) { u.uRise.value = rise; u.uRiseI.value = ri; } };
  return G;
}
