/* 기믹 (사용자 2026-11-08) — 섬·나무에 막히지 않는 대신, 지나가면 무슨 일이 생기는 곳들
   ① 숨는 숲 덤불: 나무가 빽빽이 뭉친 곳에 들어가면 숨음 → 내 화면에서 내 기체가 반투명 (통과 가능)
   (빨라지는 기믹은 나중에 지형으로 따로 만듦 — 바람길은 뺌 · 사용자 2026-11-08)
   ③ 포식 꽃 (정글 꽃섬): 다가가면 사정거리가 빨간 얇은 원으로 보임(가까울수록 진함) → 원 안에 들면 꽃 머리가 목을 쭉 늘여 기체 쪽으로 덮침 → 물고 제자리로 돌아와 씹음(체력 닳음) → 조금 뒤 멀리 퉤 뱉음
   ④ 해파리 (정글 해파리 군락): 갓에 닿으면 출렁 눌리며 기체를 위로 톡 튕겨 냄 (짧은 점프 + 옆으로 밀림)
   ⑤ 포자 늪 (정글 늪): 물 위에 들어가면 포자가 끈적하게 붙어 느려지고, 화면에 포자 안개가 낌 → 나와도 안개가 천천히 걷힘
   ⑥ 분화 첨봉 (화산 · 사용자 2026-11-09): 꽃보다 훨씬 넓은 빨간 사정거리 원 · 원을 따라 빛이 차오르고 · 터지기 직전 깜빡임 → 터지는 순간 원 안 기체를 밖으로 밀어내며 체력 10%
   ⑦ 바위 아치 홀로그램: 아치 가운데 둥근 빛 문 → 지나가면 잠깐 빨라짐 · 빛 문은 사라졌다가 잠시 뒤 다시 나타남 (남은 시간 표시는 없음)
   + 체력 100: 포식 꽃이 닳게 함 · 4초 동안 안 다치면 천천히 참 · 0이 되면 죽음 */
import * as THREE from 'three';

const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

export function makeGimmicks(scene, { meadow, jungle, volc, fly, bship, R, gates = [], bases = [], die, hoverY = .7 }) {
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
  /* 사정거리 원: 아주 얇은 빨간 선 하나 (사용자 2026-11-09: 진짜 단순한 선만) — 가까울수록 진해짐 */
  const LINE_F = `uniform float uA, uR, uK; varying vec2 vP;
      void main(){ float d = length(vP) * uR * 1.2, e = d - uR, w = .035, line = exp(-e * e / (w * w)) * (.25 + .75 * uA) * uK; if (line < .004) discard;
        gl_FragColor = vec4(vec3(1., .16, .16), line); }`;
  const ringM = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uA: { value: 0 }, uR: { value: 5 }, uT: { value: 0 }, uK: { value: 1 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }', fragmentShader: LINE_F });
  const RINGS = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), ringM()); m.renderOrder = 50; m.frustumCulled = false; m.visible = false; scene.add(m); return m; });
  const lp = new THREE.Vector3();
  const drops = new THREE.Group(); { const bb = new THREE.Box3().setFromObject(bship), sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3()), ws = bship.getWorldScale(new THREE.Vector3()).x || 1;
    const m = new THREE.MeshStandardMaterial({ color: 0xb8ff6a, emissive: 0x3a7a10, emissiveIntensity: .6, roughness: .08, metalness: 0, transparent: true, opacity: .82 }), R = (n => () => (n = (n * 16807) % 2147483647) / 2147483647)(7);
    bship.worldToLocal(c); for (let i = 0; i < 11; i++) { const g = new THREE.SphereGeometry(1, 10, 8); g.scale(1, .7, 1); const o = new THREE.Mesh(g, m), a = R() * 6.28, b = (R() - .3) * 1.2;
      o.position.set(c.x + Math.cos(a) * Math.cos(b) * sz.x / ws * .42, c.y + Math.sin(b) * sz.y / ws * .45 + sz.y / ws * .1, c.z + Math.sin(a) * Math.cos(b) * sz.z / ws * .42); o.userData.s = (.05 + R() * .07) / ws * Math.max(sz.x, sz.z) * .5; drops.add(o); } }
  drops.visible = false; bship.add(drops);   /* 포자 늪: 끈적한 물방울이 기체 겉에 붙음 */

  /* ── ⑥ 분화 첨봉: 사정거리 원 (꽃 원과 같은 빨간 실선 · 넓이는 훨씬 넓게) + 차오르는 빛 · 깜빡임 · 터질 때 퍼지는 충격 고리 ── */
  const PK = volc ? volc.peaks : [], AR = volc ? volc.arches : [], VP = 5, VTB = 5 - 2.4, SHOCK = .9;   /* 5초마다 (사용자 2026-11-09) · 충격파가 원 끝까지 퍼지는 데 0.9초 */
  /* 분화 첨봉 원도 같은 얇은 선 하나: 차오를수록 진해지고 · 터지기 직전 깜빡임 · 터지면 같은 선이 가운데에서 밖으로 퍼지는 충격파 (닿으면 맞음) */
  const pkM = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uA: { value: 0 }, uR: { value: 14 }, uT: { value: 0 }, uF: { value: 0 }, uW: { value: 0 }, uB: { value: 0 }, uS: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uA, uR, uT, uF, uW, uB, uS; varying vec2 vP;
      void main(){ float d = length(vP) * uR * 1.2, w = .035, e = d - uR, eb = d - uB * uR;
        float blink = mix(1., step(.5, fract(uT * (2.5 + uW * 8.))), uW);
        float k = exp(-e * e / (w * w)) * (.2 + .8 * uF) * blink * (1. - uS * .75) * (.3 + .7 * uA);
        float sh = uB > 0. && uB < 1. ? exp(-eb * eb / (.05 * .05)) * (1. - uB * .4) : 0.;
        float a = max(k, sh * (.4 + .6 * uA)); if (a < .004) discard; gl_FragColor = vec4(mix(vec3(1., .16, .16), vec3(1., .55, .2), sh), a); }` });
  const PR = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), pkM()); m.renderOrder = 50; m.frustumCulled = false; m.visible = false; scene.add(m); return m; });
  /* ── ⑦ 아치 빛 문 (둥근 홀로그램): 금빛 테 · 안쪽으로 빨려 드는 물결 · 테를 따라 도는 눈금 ── */
  const hoM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 } },
    vertexShader: 'attribute float aK; attribute float aB; varying vec2 vP; varying float vK; varying float vB; void main(){ vP = uv * 2. - 1.; vK = aK; vB = aB; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uT; varying vec2 vP; varying float vK; varying float vB;
      void main(){ float R = .78 * (.6 + .4 * vK) * (1. + vB * .9), d = length(vP), e = d - R, a = atan(vP.y, vP.x);
        float rim = exp(-e * e / .0009) * 1.3 + exp(-e * e / .012) * .45;
        float tick = step(.8, fract(a * 24. / 6.2832 + uT * .12)) * step(R + .03, d) * step(d, R + .1) * .8;
        float film = (1. - smoothstep(R - .03, R, d)) * (.07 + .07 * (sin(d * 26. + uT * 7.) * .5 + .5) * (1. - d / max(R, .01)));   /* 가운데로 빨려 드는 물결 */
        float spk = pow(max(0., sin(a * 3. - uT * 2.6)), 24.) * exp(-e * e / .004) * 1.4;   /* 테를 따라 도는 빛 셋 */
        float k = (rim + tick + film + spk) * vK * (1. - vB) + exp(-e * e / .02) * vB * (1. - vB) * 3.;
        vec3 c = mix(vec3(1., .62, .2), vec3(1., .95, .8), clamp(rim * .6 + spk, 0., 1.)); if (k < .004) discard; gl_FragColor = vec4(c * k, 1.); }` });
  for (const A of AR) { const g = new THREE.PlaneGeometry(2 * (A.R + .55), 2 * (A.R + .55)), n = g.attributes.position.count; g.setAttribute('aK', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1)); g.setAttribute('aB', new THREE.BufferAttribute(new Float32Array(n), 1));
    const m = new THREE.Mesh(g, hoM); m.position.set(A.x, hoverY, A.z); m.rotation.y = Math.atan2(A.ax, A.az); m.renderOrder = 45; m.frustumCulled = false; scene.add(m); A.m = m; A.prev = null; A.used = -99; }
  const ARCH_CD = 8; let archMsg = -99, pkWarn = 0, nowT = 0;
  /* 꽃에 삼켜진 상태 */
  let sw = null;   /* { f, t0, phase, dir } */
  const endSwallow = (t, spit) => { if (!sw) return; const f = sw.f; bship.visible = true; FS.noPad = false; maw.style.opacity = '0';
    if (spit) { const a = sw.dir; FS.x = f.x + Math.cos(a) * 1.5; FS.z = f.z + Math.sin(a) * 1.5; bship.visible = true; knock(t, Math.cos(a), Math.sin(a), 20); }   /* 퉤: 아주 빠르게 멀리 날아감 → 2초 기절 */
    if (f.p.G.userData.bite) f.p.G.userData.bite.open = t; f.cd = t + 4; sw = null; };
  let hop = null, gooK = 0, hazeK = 0, hideOn = false, stunAt = -99;
  /* 튕겨나가기 (사용자 2026-11-09): 아주 빠르게 · 날아가는 동안 조종 못 함 · 멈춘 자리에서 2초 기절 */
  const knock = (t, ux, uz, dist) => { const sp = 44, dur = Math.max(.18, dist / sp); FS.dashVx = ux * sp; FS.dashVz = uz * sp; FS.dashUntil = t + dur; FS.dashEndK = 0; FS.stunUntil = t + dur + 2; stunAt = t + dur; hop = { t0: t, d: dur + .1, h: Math.min(3.4, 1.2 + dist * .12) }; };
  const stars = new THREE.Group(); { const m = new THREE.MeshBasicMaterial({ color: 0xffe27a }); for (let i = 0; i < 4; i++) { const g = new THREE.OctahedronGeometry(.13, 0); g.scale(1, 1, .35); const o = new THREE.Mesh(g, m); stars.add(o); } } stars.visible = false; scene.add(stars);   /* 기절: 기체 위를 도는 작은 별 넷 */
  const api = { hop: 0, swallowed: () => !!sw, hidden: () => hideOn };
  api.reset = () => { FS.stunUntil = 0; stars.visible = false; hp = 100; hurtAt = -99; if (sw) { bship.visible = true; FS.noPad = false; sw = null; } maw.style.opacity = '0'; hop = null; api.hop = 0; FS.goo = 0; };

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
      const U = m.material.uniforms; U.uR.value = f.r; U.uT.value = t; U.uA.value = THREE.MathUtils.smoothstep(f.r * 3 - f.d, 0, f.r * 2); U.uK.value = t > f.cd ? 1 : .35; });   /* 쉬는 꽃(방금 뱉은)은 원이 옅음 */
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

    /* 분화 첨봉 */
    nowT = t; pkWarn = 0; const pnear = [];
    for (const k of PK) { const ph = ((t + k.off) % VP + VP) % VP, d = Math.hypot(sx - k.x, sz - k.z), same = Math.abs(sy - hoverY) < 6; k.ph = ph; k.d = d;
      if (live && same && d < k.r * 2.6) pnear.push(k);
      const cyc = Math.floor((t + k.off) / VP), front = (ph - VTB) / SHOCK * k.r;   /* 충격파 앞머리 (터진 순간 가운데 → 0.9초에 원 끝) */
      if (ph >= VTB && ph - VTB < SHOCK && k.hitN !== cyc && live && same && !sw && hp > 0 && d < k.r + .5 && d < front + .8 && d > front - 1.4) {   /* 충격파에 닿으면 맞음: 원 밖으로 튕겨나감 + 체력 10% */
        const l = d || 1, ux = d > .05 ? (sx - k.x) / l : Math.cos(FS.head), uz = d > .05 ? (sz - k.z) / l : Math.sin(FS.head); k.hitN = cyc; knock(t, ux, uz, k.r - d + 4); hurt(10, t); k.hitAt = t; }
      if (live && same && d < k.r && ph < VTB) pkWarn = Math.max(pkWarn, ph / VTB > .7 ? 2 : 1);
      k.lastPh = ph; }
    pnear.sort((a, b) => a.d - b.d); PR.forEach((m, i) => { const k = pnear[i]; if (!k) { m.visible = false; return; } m.visible = true; m.position.set(k.x, sy - .35, k.z); m.scale.setScalar(k.r * 1.2);
      const U = m.material.uniforms, ch = k.ph < VTB; U.uR.value = k.r; U.uT.value = t; U.uA.value = THREE.MathUtils.smoothstep(k.r * 2.6 - k.d, 0, k.r * 1.4);
      U.uF.value = ch ? k.ph / VTB : 0; U.uW.value = ch ? THREE.MathUtils.clamp((k.ph / VTB - .7) / .3, 0, 1) : 0; U.uB.value = ch ? 0 : Math.min(1, (k.ph - VTB) / SHOCK); U.uS.value = ch ? 0 : 1 - Math.min(1, (k.ph - VTB) / (VP - VTB)); });   /* 터진 뒤엔 원이 식어 옅음 */
    /* 아치 빛 문: 지나가면 빨라짐 → 사라짐 → 쉬었다 다시 */
    hoM.uniforms.uT.value = t;
    for (const A of AR) { const vis = !volc || A.p.vis; A.m.visible = vis; if (!vis) { A.prev = null; continue; }
      const back = t - A.used, kA = back < .7 ? 0 : THREE.MathUtils.smoothstep(back, ARCH_CD, ARCH_CD + .9), kB = back < .7 ? back / .7 : 0;
      const aK = A.m.geometry.attributes.aK, aB = A.m.geometry.attributes.aB; if (aK.array[0] !== kA || aB.array[0] !== kB) { aK.array.fill(kA); aB.array.fill(kB); aK.needsUpdate = aB.needsUpdate = true; }
      const dx = sx - A.x, dz = sz - A.z, along = dx * A.ax + dz * A.az, lat = Math.abs(-dx * A.az + dz * A.ax);
      if (live && !sw && A.prev != null && Math.sign(along) !== Math.sign(A.prev) && Math.abs(along) < 2.5 && lat < A.R && Math.abs(sy - hoverY) < 2.5 && back > ARCH_CD + .9) { A.used = t; FS.boost = Math.max(FS.boost || 0, 2.4); archMsg = t; }
      A.prev = Math.hypot(dx, dz) < 12 ? along : null; }
    /* 기절 별 */
    { const on = t < (FS.stunUntil || 0) && t >= stunAt; stars.visible = on; if (on) { const k = Math.min(1, (t - stunAt) * 4, (FS.stunUntil - t) * 3); stars.children.forEach((o, i) => { const a = t * 5 + i * Math.PI / 2; o.position.set(wp.x + Math.cos(a) * .55, wp.y + .75 + Math.sin(t * 7 + i) * .05, wp.z + Math.sin(a) * .55); o.rotation.y = t * 6 + i; o.scale.setScalar(k); }); } }
    /* 포자 물방울: 느려지는 동안만 기체에 달라붙음 */
    drops.visible = gooK > .04; if (drops.visible) drops.children.forEach((o, i) => { const q = o.userData; o.scale.setScalar(q.s * Math.min(1, gooK * 1.6) * (1 + .12 * Math.sin(t * 5 + i))); });
    /* 점프 (해파리·뱉기) */
    if (hop) { const x = (t - hop.t0) / hop.d; if (x >= 1) { hop = null; api.hop = 0; } else api.hop = 4 * hop.h * x * (1 - x); } else api.hop = 0;
    /* 체력 */
    if (hp > 0 && hp < 100 && t - hurtAt > 4) hp = Math.min(100, hp + dt * 5);
    const hr = Math.round(hp); if (hr !== shownHP) { shownHP = hr; hpN.textContent = hr; hpF.style.transform = `scaleX(${hp / 100})`; hpL.style.transform = `scaleX(${hp / 100})`; }
    hpEl.classList.toggle('hurt', t - hurtAt < .3); hpEl.style.opacity = flying ? '1' : '.35';
  };
  api.dbg = { HIDES, FL, JE, SW, RINGS, PK, AR, PR, get hp() { return hp; } };
  api.status = () => (nowT < (FS.stunUntil || 0) && nowT >= stunAt) ? '기절! 잠깐 움직일 수 없어요' : sw ? '포식 꽃에 삼켜졌어요! 체력이 닳는 중…' : PK.some(k => k.hitAt && nowT - k.hitAt < 1.6) ? '분화 첨봉이 터졌어요! 밀려나며 체력 10%' : pkWarn === 2 ? '분화 첨봉 · 곧 터져요! 원 밖으로' : pkWarn === 1 ? '분화 첨봉 사정거리 · 빛이 다 차면 터져요' : nowT - archMsg < 1.6 ? '아치 빛 문 통과 · 잠깐 빨라져요!' : gooK > .3 ? '포자 늪 · 포자가 달라붙어 느려져요' : hideOn ? '숲에 숨었어요 · 밖에서는 안 보여요' : null;
  return api;
}
