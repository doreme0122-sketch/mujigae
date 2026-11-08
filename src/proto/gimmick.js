/* 기믹 (사용자 2026-11-08) — 섬·나무에 막히지 않는 대신, 지나가면 무슨 일이 생기는 곳들
   ① 숨는 숲 덤불: 나무가 빽빽이 뭉친 곳에 들어가면 숨음 → 내 화면에서 내 기체가 반투명 (통과 가능)
   (빨라지는 기믹은 나중에 지형으로 따로 만듦 — 바람길은 뺌 · 사용자 2026-11-08)
   ③ 포식 꽃 (정글 꽃섬): 다가가면 사정거리가 빨간 얇은 원으로 보임(가까울수록 진함) → 원 안에 들면 꽃 머리가 목을 쭉 늘여 기체 쪽으로 덮침 → 물고 제자리로 돌아와 씹음(체력 닳음) → 조금 뒤 멀리 퉤 뱉음
   ④ 해파리 (정글 해파리 군락): 갓에 닿으면 출렁 눌리며 기체를 위로 톡 튕겨 냄 (짧은 점프 + 옆으로 밀림)
   ⑤ 포자 늪 (정글 늪): 물 위에 들어가면 포자가 끈적하게 붙어 느려지고, 화면에 포자 안개가 낌 → 나와도 안개가 천천히 걷힘
   + 체력 100: 포식 꽃이 닳게 함 · 4초 동안 안 다치면 천천히 참 · 0이 되면 죽음 */
import * as THREE from 'three';

const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

export function makeGimmicks(scene, { meadow, jungle, fly, bship, R, gates = [], bases = [], die, hoverY = .7 }) {
  const FS = fly.userData.S, wp = new THREE.Vector3(), tmp = new THREE.Vector3();
  /* ── 화면: 체력 막대 · 늪 안개 · 꽃 속 ── */
  const css = document.createElement('style'); css.textContent = `
#gimHP{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);transform:translateX(-50%);width:min(40vw,260px);z-index:30;pointer-events:none;font:600 11px/1 system-ui,sans-serif;color:#fff;text-shadow:0 1px 2px #0008;transition:opacity .4s}
#gimHP .row{display:flex;justify-content:space-between;margin-bottom:4px;opacity:.85}
#gimHP .bar{height:7px;border-radius:4px;background:#0006;box-shadow:inset 0 0 0 1px #fff3;overflow:hidden;position:relative}
#gimHP .lag{position:absolute;inset:0;background:#ff7a9a;transform-origin:left;transition:transform .6s .25s}
#gimHP .fill{position:absolute;inset:0;background:linear-gradient(90deg,#7dffb0,#c8ff7a);transform-origin:left}
#gimHP.hurt .fill{background:linear-gradient(90deg,#ff5a7a,#ffb35a)}
#gimHide{margin-top:5px;text-align:center;opacity:0;transition:opacity .35s;color:#c8ffd8}
#gimHaze,#gimMaw{position:fixed;inset:0;pointer-events:none;z-index:4;opacity:0}
#ui{z-index:5}
#gimHaze{background:radial-gradient(ellipse at 30% 35%,#b8e07a55,transparent 45%),radial-gradient(ellipse at 72% 62%,#c48aff4d,transparent 50%),radial-gradient(ellipse at 50% 50%,transparent 30%,#5a7a3acc 100%)}
#gimMaw{background:radial-gradient(circle at 50% 50%,transparent var(--o,60%),#3a0a3aee calc(var(--o,60%) + 18%),#120318 100%)}`;
  document.head.appendChild(css);
  const hpEl = document.createElement('div'); hpEl.id = 'gimHP'; hpEl.innerHTML = '<div class="row"><span>체력</span><span class="n">100</span></div><div class="bar"><div class="lag"></div><div class="fill"></div></div><div id="gimHide">🌿 숲에 숨는 중</div>'; document.body.appendChild(hpEl);
  const haze = document.createElement('div'); haze.id = 'gimHaze'; document.body.appendChild(haze);
  const maw = document.createElement('div'); maw.id = 'gimMaw'; document.body.appendChild(maw);
  const hpN = hpEl.querySelector('.n'), hpF = hpEl.querySelector('.fill'), hpL = hpEl.querySelector('.lag'), hideEl = hpEl.querySelector('#gimHide');
  let hp = 100, hurtAt = -99, shownHP = -1;
  const hurt = (n, t) => { if (hp <= 0) return; hp = Math.max(0, hp - n); hurtAt = t; if (hp <= 0) { endSwallow(t, false); die && die(); } };

  /* ── ① 숨는 곳 모으기: 정글·성소에 찍어 둔 빈 점(hideR) + 초원 숲 덩이 ── */
  const HIDES = []; let hidesAt = -1;
  const collectHides = () => { HIDES.length = 0; const seen = new Set(); scene.updateMatrixWorld(true);
    scene.traverse(o => { if (o.userData.hideR == null) return; o.getWorldPosition(tmp); const s = new THREE.Vector3(); o.getWorldScale(s); const k = Math.round(tmp.x * 2) + ',' + Math.round(tmp.z * 2) + ',' + Math.round(tmp.y); if (seen.has(k)) return; seen.add(k); HIDES.push({ x: tmp.x, y: tmp.y, z: tmp.z, r: o.userData.hideR * s.x }); });
    for (const g of meadow.GROVES || []) HIDES.push({ x: g.x, y: g.y, z: g.z, r: g.r }); };
  const inHide = (x, y, z) => { for (const h of HIDES) { const dx = x - h.x, dz = z - h.z; if (dx * dx + dz * dz < h.r * h.r && y > h.y - 2 && y < h.y + 8) return h; } return null; };

  const FL = [], JE = [], SW = [];
  for (const p of jungle.pieces) { const o = p.o; if (!o || o.t !== 'fill') continue; const s = o.s, sy = o.sy || s;
    if (o.kind === 4 && p.anim && p.anim.length) FL.push({ p, x: p.x, z: p.z, hy: p.y + 10.6 * sy, r: Math.max(4.5, 15 * s * 1.25), s, cd: -9, ring: null });   /* 움직일 수 있는 꽃만 (멀리 보는 굳은 복사본은 뺌) */
    else if (o.kind === 5) { const list = []; p.G.traverse(c => { if (c.userData.jelly != null) list.push({ g: c, r: c.userData.jelly, hitAt: -9 }); }); JE.push({ p, s, list }); }
    else if (o.kind === 3 && p.top && p.top.poolR) SW.push({ p, s, yaw: o.yaw || 0, py: p.y + (p.top.pool || 0) * sy, pr: p.top.poolR }); }

  /* 사정거리 원: 가까운 꽃 셋까지만 (빨간 얇은 선 · 이빨처럼 끊긴 마디가 천천히 돎 · 가까울수록 진하고 굵게 번짐) */
  const ringM = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uA: { value: 0 }, uR: { value: 5 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uA, uR, uT; varying vec2 vP;
      void main(){ float d = length(vP) * uR * 1.2, e = d - uR, w = .05 + uA * .05;
        float line = exp(-e * e / (w * w)), halo = exp(-e * e / (.6 * .6)) * .35, a = atan(vP.y, vP.x);
        float teeth = .55 + .45 * smoothstep(.15, .35, abs(fract(a * 36. / 6.2832 + uT * .05) - .5));   /* 마디마다 살짝 끊김 */
        float inside = (1. - smoothstep(uR - .2, uR, d)) * .07 * uA * uA;   /* 안쪽은 아주 옅게 붉음 (들어가면 위험) */
        float k = (line * teeth + halo * uA) * (.18 + .82 * uA) + inside; if (k < .003) discard;
        gl_FragColor = vec4(vec3(1., .16, .2) * (1. + line * .6), k); }` });
  const RINGS = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), ringM()); m.renderOrder = 50; m.frustumCulled = false; m.visible = false; scene.add(m); return m; });
  const lp = new THREE.Vector3();
  /* 꽃에 삼켜진 상태 */
  let sw = null;   /* { f, t0, phase, dir } */
  const endSwallow = (t, spit) => { if (!sw) return; const f = sw.f; bship.visible = true; FS.noPad = false; maw.style.opacity = '0';
    if (spit) { const a = sw.dir, sp = 30; FS.x = f.x + Math.cos(a) * 1.5; FS.z = f.z + Math.sin(a) * 1.5; bship.visible = true; FS.dashVx = Math.cos(a) * sp; FS.dashVz = Math.sin(a) * sp; FS.dashUntil = t + .6; FS.dashEndK = .35; hop = { t0: t, d: 1.1, h: 3.4 }; FS.boost = Math.max(FS.boost, 1.2); }   /* 퉤: 멀리 날아감 + 포물선으로 붕 뜸 */
    if (f.p.G.userData.bite) f.p.G.userData.bite.open = t; f.cd = t + 4; sw = null; };
  let hop = null, gooK = 0, hazeK = 0, hideOn = false;
  const api = { hop: 0, swallowed: () => !!sw, hidden: () => hideOn };
  api.reset = () => { hp = 100; hurtAt = -99; if (sw) { bship.visible = true; FS.noPad = false; sw = null; } maw.style.opacity = '0'; hop = null; api.hop = 0; FS.goo = 0; };

  api.update = (t, dt, { flying, mode, camera, pxRatio = 1 }) => {
    if (hidesAt < 0 || (t - hidesAt > 6 && HIDES.length === 0)) { collectHides(); hidesAt = t; }
    const live = flying && mode !== 'trip';
    bship.getWorldPosition(wp); const sx = FS.x, sz = FS.z, sy = wp.y - api.hop;
    /* 숨기 */
    const h = live && !sw ? inHide(sx, sy, sz) : null, on = !!h; if (on !== hideOn) { hideOn = on; fly.userData.setGhost(on); hideEl.style.opacity = on ? '1' : '0'; }
    /* 포식 꽃: 사정거리 원 · 덮치기 → 물고 돌아오기 → 씹기 → 뱉기 */
    const near = []; for (const f of FL) { const d = Math.hypot(sx - f.x, sz - f.z), same = Math.abs(sy - f.hy) < 7, G = f.p.G; f.d = d; f.same = same;
      G.userData.near = live && same && !sw ? THREE.MathUtils.smoothstep(f.r * 2.4 - d, 0, f.r * 1.2) : 0;
      if (live && same && d < f.r * 3) near.push(f);
      const B = G.userData.bite; if (B && B.open != null) { B.k = Math.max(0, 1 - (t - B.open) / .35); B.chew = false; B.ext = 0; if (B.k <= 0 && t % 7 < 4) G.userData.bite = null; }
      if (live && same && !sw && t > f.cd && d < f.r && hp > 0) { sw = { f, t0: t, caught: false }; G.userData.bite = { t0: t, k: -.4, chew: false, ext: 0, tp: [0, 10.6, 0] }; } }
    near.sort((a, b) => a.d - b.d); RINGS.forEach((m, i) => { const f = near[i]; if (!f || (sw && sw.f === f && sw.caught)) { m.visible = false; return; } m.visible = true; m.position.set(f.x, sy - .35, f.z); m.scale.setScalar(f.r * 1.2);
      const U = m.material.uniforms; U.uR.value = f.r; U.uT.value = t; U.uA.value = THREE.MathUtils.smoothstep(f.r * 3 - f.d, 0, f.r * 2) * (t > f.cd ? 1 : .35); });   /* 쉬는 꽃(방금 뱉은)은 원이 옅음 */
    if (sw) { const f = sw.f, e = t - sw.t0, G = f.p.G, B = G.userData.bite, T1 = .32, T2 = .85, T3 = 3.0;
      if (!sw.caught) { lp.set(sx, sy, sz); G.worldToLocal(lp); B.tp[0] = lp.x; B.tp[1] = lp.y; B.tp[2] = lp.z; const u = Math.min(1, e / T1); B.ext = 1 - Math.pow(1 - u, 3); B.k = e < T1 - .06 ? -.4 : Math.min(1, -.4 + (e - (T1 - .06)) / .06 * 1.4);   /* 입을 크게 벌리고 목을 쭉 늘여 기체를 따라 덮침 → 닿는 순간 콱 닫음 */
        if (e >= T1) { sw.caught = true; FS.noPad = true; FS.dashUntil = 0; bship.visible = false; B.k = 1; } }
      else { const u = Math.min(1, (e - T1) / (T2 - T1)); B.ext = 1 - u * u * (3 - 2 * u); B.k = 1; B.chew = e > T2;   /* 문 채로 제자리로 돌아와 우물우물 */
        G.userData.headW && G.userData.headW(lp); FS.x = lp.x; FS.z = lp.z; FS.vx = FS.vz = 0; if (e > T2) hurt(12 * dt, t);
        maw.style.opacity = String(Math.min(1, (e - T1) / .2)); maw.style.setProperty('--o', (22 + (B.chew ? 10 * Math.sin(e * 11) : 0)) + '%'); }   /* 꽃 속: 둘레가 닫혀 어둡고 · 씹을 때마다 오므라졌다 벌어짐 */
      if (sw && e > T3) { const a = Math.random() * 6.28; sw.dir = a; endSwallow(t, true); } }
    /* 해파리 */
    if (live && !sw) for (const J of JE) { if (Math.hypot(sx - J.p.x, sz - J.p.z) > 40 * J.s + 12) continue;
      for (const q of J.list) { q.g.getWorldPosition(tmp); const rb = q.r * J.s, dx = sx - tmp.x, dz = sz - tmp.z, dd = Math.hypot(dx, dz);
        if (t - q.hitAt > .9 && dd < rb + .9 && Math.abs(sy - tmp.y) < rb + 1.8) { q.hitAt = t; const l = dd || 1, ux = dd > .01 ? dx / l : Math.cos(FS.head), uz = dd > .01 ? dz / l : Math.sin(FS.head);
          FS.dashVx = ux * 15 + FS.vx * .3; FS.dashVz = uz * 15 + FS.vz * .3; FS.dashUntil = t + .32; FS.dashEndK = .55; hop = { t0: t, d: .8, h: 2.4 }; } } }   /* 갓에 닿으면 톡: 위로 짧게 뜨고 옆으로 밀림 */
    for (const J of JE) for (const q of J.list) { const a = t - q.hitAt; q.g.userData.sq = a < 1.2 ? Math.exp(-a * 3.5) * Math.cos(a * 16) : 0; }   /* 눌렸다 출렁출렁 돌아옴 */
    /* 포자 늪 */
    let inS = false; if (live && !sw) for (const S of SW) { const dx = sx - S.p.x, dz = sz - S.p.z; if (Math.abs(sy - S.py) > 6 || Math.abs(dx) > 30 || Math.abs(dz) > 30) continue; const c = Math.cos(S.yaw), s = Math.sin(S.yaw), lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (Math.hypot(lx, lz) < S.pr(Math.atan2(lz, lx)) * S.s) { inS = true; break; } }
    gooK += ((inS ? .85 : 0) - gooK) * Math.min(1, dt * (inS ? 3 : 1.6)); FS.goo = gooK > .01 ? gooK : 0;   /* 들어가면 끈적하게 붙고 · 나오면 서서히 떨어져 나감 */
    hazeK += ((inS ? 1 : 0) - hazeK) * Math.min(1, dt * (inS ? 1.4 : .45)); haze.style.opacity = hazeK > .005 ? (hazeK * (.82 + .18 * Math.sin(t * 1.3))).toFixed(3) : '0';   /* 포자 안개: 금방 끼고 · 천천히 걷힘 */
    /* 점프 (해파리·뱉기) */
    if (hop) { const x = (t - hop.t0) / hop.d; if (x >= 1) { hop = null; api.hop = 0; } else api.hop = 4 * hop.h * x * (1 - x); } else api.hop = 0;
    /* 체력 */
    if (hp > 0 && hp < 100 && t - hurtAt > 4) hp = Math.min(100, hp + dt * 5);
    const hr = Math.round(hp); if (hr !== shownHP) { shownHP = hr; hpN.textContent = hr; hpF.style.transform = `scaleX(${hp / 100})`; hpL.style.transform = `scaleX(${hp / 100})`; }
    hpEl.classList.toggle('hurt', t - hurtAt < .3); hpEl.style.opacity = flying ? '1' : '.35';
  };
  api.dbg = { HIDES, FL, JE, SW, RINGS, get hp() { return hp; } };
  api.status = () => sw ? '포식 꽃에 삼켜졌어요! 체력이 닳는 중…' : gooK > .3 ? '포자 늪 · 포자가 달라붙어 느려져요' : hideOn ? '숲에 숨었어요 · 밖에서는 안 보여요' : null;
  return api;
}
