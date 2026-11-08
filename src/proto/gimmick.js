/* 기믹 (사용자 2026-11-08) — 섬·나무에 막히지 않는 대신, 지나가면 무슨 일이 생기는 곳들
   ① 숨는 숲 덤불: 나무가 빽빽이 뭉친 곳에 들어가면 숨음 → 내 화면에서 내 기체가 반투명 (통과 가능)
   ② 바람길 (초원): 기지 사이를 고리 따라 흐르는 바람 → 올라타면 잠깐 빨라지고 바람 쪽으로 밀림 (기지 사이를 빨리 도는 지름길)
   ③ 포식 꽃 (정글 꽃섬): 가까이 가면 꽃잎이 군침 흘리듯 벌어지며 떨림 → 들어오면 콱 삼킴 → 씹는 동안 체력이 닳음 → 정해진 시간 뒤 멀리 퉤 뱉음
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

  /* ── ② 바람길: 기지 사이마다 하나, 고리를 따라 흐름 ── */
  const WINDS = [], NS = 3, SEG = 56, CORR = meadow.CORR || [];
  const clear = (x, z) => { for (const b of bases) if (Math.hypot(x - b.x, z - b.z) < 26) return false; for (const g of gates) if (Math.hypot(x - g.x, z - g.z) < 12) return false; for (const c of CORR) if (Math.hypot(x - c[0], z - c[1]) < c[2] + 3) return false; return true; };
  const NB = Math.max(1, bases.length);
  for (let i = 0; i < NB; i++) { for (let tr = 0; tr < 12; tr++) { const s = i * 31 + tr * 7, th = (i + .5) / NB * Math.PI * 2 + (hash(s) - .5) * .16, r = 198 + hash(s + 1) * 26, dir = hash(s + 2) < .5 ? 1 : -1, L = 24 + hash(s + 3) * 8, bend = (hash(s + 4) - .5) * 5;
      const pts = []; let ok = true; for (let k = 0; k <= SEG; k++) { const u = k / SEG, a = th + dir * (u - .5) * L / r, rr = r + Math.sin(u * Math.PI) * bend + Math.sin(u * 6.28 + s) * .8; const x = Math.cos(a) * rr, z = Math.sin(a) * rr; if (!clear(x, z) || rr > R - 6) { ok = false; break; } pts.push([x, z]); }
      if (!ok) continue; WINDS.push({ pts, L, seed: hash(s + 5) * 10, hit: 0, inside: false, last: -9 }); break; } }
  let windMesh = null, windU = null, petals = null, petalU = null;
  if (WINDS.length) {
    const pos = [], att = [], idx = []; const Y = 0;   /* 높이는 기체가 실제로 나는 높이에 맞춤 (처음 날 때 잼) */
    WINDS.forEach((w, wi) => { for (let st = 0; st < NS; st++) { const base = pos.length / 3, W = 1.05 - st * .15;
        for (let k = 0; k <= SEG; k++) { const u = k / SEG, [x, z] = w.pts[k], [x2, z2] = w.pts[Math.min(SEG, k + 1)], [x0, z0] = w.pts[Math.max(0, k - 1)]; let tx = x2 - x0, tz = z2 - z0; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l; const nx = -tz, nz = tx;
          const off = Math.sin(u * 7 + st * 2.1 + w.seed) * .7, y = Y - .25 + st * .22 + Math.sin(u * 5 + st) * .12;   /* 세 가닥이 서로 감기듯 꼬여 흐름 */
          for (const v of [-1, 1]) { pos.push(x + nx * (off + v * W), y, z + nz * (off + v * W)); att.push(u * w.L, v, wi + st * .31, w.L); } if (k < SEG) { const a = base + k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } } } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aW', new THREE.Float32BufferAttribute(att, 4)); g.setIndex(idx);
    windU = { uT: { value: 0 }, uHit: { value: new Float32Array(16) }, uMood: { value: 0 } };
    windMesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: windU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `attribute vec4 aW; varying vec4 vW; uniform float uT; void main(){ vW=aW; vec3 p=position; p.y+=sin(aW.x*.35-uT*2.4+aW.z*3.)*.1; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
      fragmentShader: `varying vec4 vW; uniform float uT; uniform float uHit[16];
        float h1(float n){return fract(sin(n*91.7)*43758.5);}
        void main(){ float u=vW.x, v=vW.y, L=vW.w; int wi=int(floor(vW.z+.001)); float hit=0.; for(int i=0;i<16;i++){ if(i==wi) hit=uHit[i]; }
          float edge=1.-smoothstep(.35,1.,abs(v)), ends=smoothstep(0.,4.,u)*smoothstep(L,L-5.,u);
          float lane=floor((v*.5+.5)*6.), hs=h1(lane+vW.z*7.), s=fract(u*.07-uT*(.55+hs*.45)*(1.+hit*1.5)+hs*5.);
          float streak=smoothstep(0.,.08,s)*(1.-smoothstep(.12,.7,s));   /* 바람결: 가닥마다 다른 빠르기로 흘러가는 빛 꼬리 */
          float gust=.55+.45*sin(u*.18-uT*1.3+vW.z*4.);
          vec3 c=mix(vec3(.62,1.,.86),vec3(1.,.96,.78),hs); float a=edge*ends*(streak*.75+.12)*gust*(.6+hit*.9);
          gl_FragColor=vec4(c*a,1.); }` }));
    windMesh.frustumCulled = false; windMesh.renderOrder = 6; scene.add(windMesh);
    /* 바람에 실려 가는 꽃잎·잎 (바람이 있다는 걸 몸으로 보여 줌) */
    const NP = WINDS.length * 26, pp = new Float32Array(NP * 3), pa = new Float32Array(NP * 3);
    for (let i = 0; i < NP; i++) { pa[i * 3] = Math.floor(i / 26); pa[i * 3 + 1] = hash(i + .3); pa[i * 3 + 2] = hash(i + .7); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('aP', new THREE.BufferAttribute(pa, 3));
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; { const c = cv.getContext('2d'); c.translate(32, 32); c.rotate(.6); const gr = c.createLinearGradient(-20, 0, 20, 0); gr.addColorStop(0, '#fff6e8'); gr.addColorStop(1, '#ffd0e4'); c.fillStyle = gr; c.beginPath(); c.moveTo(-22, 0); c.quadraticCurveTo(0, -13, 22, 0); c.quadraticCurveTo(0, 13, -22, 0); c.fill(); c.strokeStyle = '#ffb8d088'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-18, 0); c.lineTo(18, 0); c.stroke(); }
    petalU = { uT: { value: 0 }, uMap: { value: new THREE.CanvasTexture(cv) }, uPx: { value: 1 } };
    petals = new THREE.Points(pg, new THREE.ShaderMaterial({ uniforms: petalU, transparent: true, depthWrite: false,
      vertexShader: `attribute vec3 aP; varying float vA; varying float vR; uniform float uT; uniform float uPx; void main(){ vA=aP.z; vR=uT*(2.+aP.y*3.)+aP.y*9.; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=uPx*(9.+aP.z*7.)*(30./-mv.z); }`,
      fragmentShader: `uniform sampler2D uMap; varying float vA; varying float vR; void main(){ vec2 p=gl_PointCoord-.5; float c=cos(vR),s=sin(vR); p=mat2(c,-s,s,c)*p*vec2(1.,1.6+sin(vR*1.7)*.6); vec4 t=texture2D(uMap,p+.5); if(t.a<.1) discard; gl_FragColor=vec4(t.rgb,t.a*(.7+vA*.3)); }` }));   /* 꽃잎이 팔랑이며 뒤집힘 */
    petals.frustumCulled = false; petals.renderOrder = 7; scene.add(petals); petals.userData.Y = 0; windMesh.position.y = petals.position.y = hoverY; }
  const windAt = (x, z) => { for (let i = 0; i < WINDS.length; i++) { const w = WINDS[i]; const [ax, az] = w.pts[0], [bx, bz] = w.pts[SEG >> 1], [cx, cz] = w.pts[SEG]; if (Math.hypot(x - bx, z - bz) > w.L * .6 + 3) continue;
      for (let k = 0; k < SEG; k++) { const [x0, z0] = w.pts[k], [x1, z1] = w.pts[k + 1], dx = x1 - x0, dz = z1 - z0, l2 = dx * dx + dz * dz, q = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / l2)), ex = x0 + dx * q - x, ez = z0 + dz * q - z;
        if (ex * ex + ez * ez < 2.1 * 2.1 && k > 2 && k < SEG - 3) { const l = Math.sqrt(l2); return { i, dx: dx / l, dz: dz / l }; } } } return null; };

  /* ── ③④⑤ 정글 기믹 자리 ── */
  const FL = [], JE = [], SW = [];
  for (const p of jungle.pieces) { const o = p.o; if (!o || o.t !== 'fill') continue; const s = o.s, sy = o.sy || s;
    if (o.kind === 4) FL.push({ p, x: p.x, z: p.z, hy: p.y + 10.6 * sy, r: 15 * s * .5, s, cd: -9 });
    else if (o.kind === 5) { const list = []; p.G.traverse(c => { if (c.userData.jelly != null) list.push({ g: c, r: c.userData.jelly, hitAt: -9 }); }); JE.push({ p, s, list }); }
    else if (o.kind === 3 && p.top && p.top.poolR) SW.push({ p, s, yaw: o.yaw || 0, py: p.y + (p.top.pool || 0) * sy, pr: p.top.poolR }); }

  /* 꽃에 삼켜진 상태 */
  let sw = null;   /* { f, t0, phase, dir } */
  const endSwallow = (t, spit) => { if (!sw) return; const f = sw.f; bship.visible = true; FS.noPad = false; maw.style.opacity = '0';
    if (spit) { const a = sw.dir, sp = 30; FS.x = f.x + Math.cos(a) * 1.5; FS.z = f.z + Math.sin(a) * 1.5; FS.dashVx = Math.cos(a) * sp; FS.dashVz = Math.sin(a) * sp; FS.dashUntil = t + .6; FS.dashEndK = .35; hop = { t0: t, d: 1.1, h: 3.4 }; FS.boost = Math.max(FS.boost, 1.2); }   /* 퉤: 멀리 날아감 + 포물선으로 붕 뜸 */
    if (f.p.G.userData.bite) f.p.G.userData.bite.open = t; f.cd = t + 4; sw = null; };
  let hop = null, gooK = 0, hazeK = 0, hideOn = false, measured = false;
  const api = { hop: 0, swallowed: () => !!sw, hidden: () => hideOn };
  api.reset = () => { hp = 100; hurtAt = -99; if (sw) { bship.visible = true; FS.noPad = false; sw = null; } maw.style.opacity = '0'; hop = null; api.hop = 0; FS.goo = 0; };

  api.update = (t, dt, { flying, mode, camera, pxRatio = 1 }) => {
    if (hidesAt < 0 || (t - hidesAt > 6 && HIDES.length === 0)) { collectHides(); hidesAt = t; }
    if (windU) { windU.uT.value = t; petalU.uT.value = t; petalU.uPx.value = pxRatio;
      const P = petals.geometry.attributes.position, A = petals.geometry.attributes.aP.array, Y = petals.userData.Y;
      for (let i = 0; i < P.count; i++) { const w = WINDS[A[i * 3]], sp = .045 * (1 + w.hit * 1.2), u = (A[i * 3 + 1] + t * sp * (.7 + A[i * 3 + 2] * .6)) % 1, k = u * SEG, k0 = Math.floor(k), f = k - k0, a = w.pts[k0], b = w.pts[Math.min(SEG, k0 + 1)];
        const sw2 = Math.sin(t * 2 + i) * .9; P.setXYZ(i, a[0] + (b[0] - a[0]) * f + Math.sin(u * 9 + i) * sw2, Y - .3 + Math.sin(t * 1.7 + i * 1.3) * .5 + A[i * 3 + 2] * .5, a[1] + (b[1] - a[1]) * f + Math.cos(u * 8 + i) * sw2); }
      P.needsUpdate = true; for (let i = 0; i < WINDS.length && i < 16; i++) { WINDS[i].hit = Math.max(0, WINDS[i].hit - dt * .7); windU.uHit.value[i] = WINDS[i].hit; } }
    const live = flying && mode !== 'trip';
    bship.getWorldPosition(wp); const sx = FS.x, sz = FS.z, sy = wp.y - api.hop;
    if (windMesh && live && mode === 'mid' && !measured) { measured = true; windMesh.position.y = petals.position.y = sy; }
    /* 숨기 */
    const h = live && !sw ? inHide(sx, sy, sz) : null, on = !!h; if (on !== hideOn) { hideOn = on; fly.userData.setGhost(on); hideEl.style.opacity = on ? '1' : '0'; }
    /* 바람길 */
    if (live && mode === 'mid' && !sw) { const w = windAt(sx, sz); for (const q of WINDS) if (!w || WINDS[w.i] !== q) q.inside = false;
      if (w) { const q = WINDS[w.i]; if (!q.inside) { q.inside = true; FS.boost = Math.max(FS.boost, 1.9); const along = FS.vx * w.dx + FS.vz * w.dz, dirS = along >= 0 ? 1 : -1; FS.vx += w.dx * 5 * dirS; FS.vz += w.dz * 5 * dirS; q.hit = 1; } else { FS.boost = Math.max(FS.boost, .9); q.hit = Math.min(1, q.hit + dt * 2); } } }   /* 올라탄 순간 확 빨라지고 · 타고 있는 동안 계속 바람을 받음 · 바람은 흐르는 쪽으로 밀어 줌 */
    /* 포식 꽃 */
    for (const f of FL) { const d = Math.hypot(sx - f.x, sz - f.z), same = Math.abs(sy - f.hy) < 7, G = f.p.G;
      G.userData.near = live && same && !sw ? THREE.MathUtils.smoothstep(f.r * 3.2 - d, 0, f.r * 2) : 0;
      const B = G.userData.bite; if (B) { if (B.open != null) { B.k = Math.max(0, 1 - (t - B.open) / .35); B.chew = false; if (B.k <= 0 && t % 7 < 4) G.userData.bite = null; } else B.k = Math.min(1, (t - B.t0) / .2); }
      if (live && same && !sw && t > f.cd && d < f.r && hp > 0) { const a = Math.atan2(FS.vz, FS.vx) + (Math.random() - .5) * 1.4, dir = Math.hypot(FS.vx, FS.vz) > .5 ? a : Math.random() * 6.28;
        sw = { f, t0: t, dir, x0: sx, z0: sz }; G.userData.bite = { t0: t, k: 0, chew: false }; FS.noPad = true; FS.dashUntil = 0; } }
    if (sw) { const f = sw.f, e = t - sw.t0, B = f.p.G.userData.bite;
      if (e < .22) { const k = e / .22; FS.x = sw.x0 + (f.x - sw.x0) * k * k; FS.z = sw.z0 + (f.z - sw.z0) * k * k; }   /* 꽃 입으로 쑥 빨려 들어감 */
      else { FS.x = f.x; FS.z = f.z; bship.visible = false; if (B) B.chew = true; hurt(11 * dt, t); }   /* 씹는 동안 체력이 닳음 */
      FS.vx = FS.vz = 0; maw.style.opacity = String(Math.min(1, e / .2)); maw.style.setProperty('--o', (22 + 10 * Math.sin(e * 11)) + '%');   /* 꽃 속: 꽃잎이 닫혀 둘레가 어둡고 · 씹을 때마다 오므라졌다 벌어짐 */
      if (sw && e > 2.6) endSwallow(t, true); }
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
  api.dbg = { HIDES, WINDS, FL, JE, SW, get hp() { return hp; } };
  api.status = () => sw ? '포식 꽃에 삼켜졌어요! 체력이 닳는 중…' : gooK > .3 ? '포자 늪 · 포자가 달라붙어 느려져요' : hideOn ? '숲에 숨었어요 · 밖에서는 안 보여요' : null;
  return api;
}
