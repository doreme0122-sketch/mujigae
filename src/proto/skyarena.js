/* 하늘섬 난전 보기 (사용자 2026-11-06: 보내준 하늘섬 맵(v7)에 기체 10대쯤 서로 알아서 싸우게 · 지형 구조물은 뚫지 못하게
   · 내가 각도를 조절해서 볼 수 있게 · 각도 표시도)
   · 기체 높이는 가운데 넓은 섬 풀밭보다 조금 위 — 그보다 높이 솟은 지형만 막힘 (보이는 모양 그대로, glbisle.js)
   · 기체마다: 가까운 상대를 고름 → 너무 멀면 다가가고, 가까우면 옆으로 돌며 쏨 → 앞이 막혔으면 비어 있는 쪽으로 꺾음
   · 탄도 지형에 막힘 (지형 뒤에 숨으면 안 맞음) · 맞아서 쓰러지면 3초 뒤 빈 곳에서 다시 나옴
   · 지형 뒤로 간 기체는 안 보임(게임 규칙) · 따라가는 기체만 지형 너머로 윤곽이 비침 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11111359';
import { makePerf } from './perf.js?v=11111359';
import { buildShip, engineSpots } from '../core/ships/build.js';
import { makeGlow } from '../preview/glow.js';
import { makeGlbIsle } from './glbisle.js?v=11111359';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp;
const HOVER = .7, LEN = 2;
const MAPS = +(new URLSearchParams(location.search).get('s') || 1 / 3);   /* 맵 크기 = 보내준 v7의 3분의 1 (사용자 2026-11-06 확정) · 시험: 주소 끝 &s=0.5 */
/* 기체 10대: 모양·칠이 서로 다르게 · 탄 색은 기체마다 (누가 쏜 건지 보이게) */
const ROSTER = [
  [1, 1, 'ruby', '루비', [1.4, .35, .45]], [2, 1, 'AURUM', '오름', [1.4, 1.05, .35]], [3, 1, 'lime', '라임', [.6, 1.4, .4]],
  [4, 1, 'neon-black', '네온', [.45, 1.3, 1.4]], [2, 2, 'CRIMSON', '진홍', [1.4, .25, .3]], [3, 2, 'military', '수풀', [.7, 1.1, .5]],
  [4, 2, 'racing-red', '레이서', [1.4, .55, .25]], [1, 2, 'ruby', '불꽃', [1.4, .5, .9]], [2, 3, 'OBSIDIAN', '흑요', [.8, .6, 1.4]], [4, 3, 'royal-white', '백야', [1.2, 1.25, 1.4]]];

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0xbcd2ea, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, .5, 900), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .6; pm.dispose(); }
  const sunDir = new THREE.Vector3(-.45, .78, -.42).normalize(), sun = new THREE.DirectionalLight(0xfff0dc, 3); sun.position.copy(sunDir).multiplyScalar(20); scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x9fb4d8, 0x3a3020, .7));
  const glow = makeGlow(); scene.add(glow.mesh);
  onProgress(.1);
  /* 맵 */
  const GI = await new Promise(res => { const g = makeGlbIsle(HOVER, res, { url: './assets/skyislands_v7.glb', scale: MAPS, gap: 2.9 }   /* 가운데 섬 풀밭보다 2.9m 위 (사용자 2026-11-06: 기체를 1m쯤 올려 큰 섬 땅 위를 스치고 그 섬 나무는 숨는 자리로) */); scene.add(g.mesh); });
  onProgress(.6);
  const hidFrom = (o, s) => o.inTree && (o.reveal || 0) <= 0 && Math.hypot(o.x - s.x, o.z - s.z) > 3.5;   /* 나무 속 기체는 바로 곁(3.5m)이 아니면 안 보임 */
  const wall = (x, z) => GI.gridAt(x, z) || Math.abs(x) > GI.lim.x || Math.abs(z) > GI.lim.z;
  /* 두 점 사이가 트였나 (탄·시야): 0.5m마다 지형 칸을 봄 */
  const clear = (x0, z0, x1, z1) => { const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / .5); for (let i = 1; i < n; i++) { const k = i / n; if (GI.gridAt(x0 + (x1 - x0) * k, z0 + (z1 - z0) * k)) return false; } return true; };
  const freeSpot = () => { for (let i = 0; i < 400; i++) { const R = i < 250 ? .45 : .9, x = (Math.random() * 2 - 1) * (GI.lim.x - 6) * R, z = (Math.random() * 2 - 1) * (GI.lim.z - 6) * R;   /* 가운데 둘레에서 먼저 찾음 — 싸움이 한데 모이게 */
      if (!GI.blocked(x, z) && GI.groundFast(x, z) != null && S.every(o => o === S.me || o.dead || Math.hypot(o.x - x, o.z - z) > (i < 300 ? 12 * MAPS + 4 : 3))) return [x, z]; }   /* 서로 떨어진 빈 곳 · 못 찾으면 가깝더라도 빈 곳 */
    for (let i = 0; i < 2000; i++) { const x = (Math.random() * 2 - 1) * GI.lim.x, z = (Math.random() * 2 - 1) * GI.lim.z; if (!GI.blocked(x, z)) return [x, z]; }
    return [0, 0]; };
  /* 그림자: 바로 아래 지형 윗면에 · 높이 떠 있을수록 넓고 옅게 · 아래가 비면 사라짐 */
  const shM = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uA: { value: .5 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uA; varying vec2 vP; void main(){ vec2 q=vP*vec2(1.,1.6); float r=dot(q,q); gl_FragColor=vec4(0.,0.,0.,exp(-r*3.)*uA); }' });
  /* 기체들 */
  const S = [];
  for (let i = 0; i < ROSTER.length; i++) { const [id, st, pt, name, col] = ROSTER[i];
    const b = await buildShip(id, st, pt, { renderer, size: LEN }); const root = b.root, sm = root.children[0]; scene.add(root);
    const eng = engineSpots(b.ship, sm, new THREE.Box3().setFromObject(sm).getSize(new THREE.Vector3()));
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(LEN * 1.3, LEN * 1.3), shM()); sh.renderOrder = 1; scene.add(sh);
    S.push({ i, name, col, root, sm, eng, sh, x: 0, z: 0, vx: 0, vz: 0, head: 0, bank: 0, hp: 1, cool: Math.random(), think: 0, tgt: null, orbit: Math.random() < .5 ? 1 : -1,
      sp: 9 + Math.random() * 3, dead: false, back: 0, kills: 0, seen: true, phase: Math.random() * 6 });
    onProgress(.6 + .35 * (i + 1) / ROSTER.length); }
  for (const s of S) { [s.x, s.z] = freeSpot(); s.head = Math.random() * 6.28; }
  /* 지형 너머 윤곽: 따라가는 기체만 (가려진 부분을 하늘색으로 비춤) */
  const xray = new THREE.MeshBasicMaterial({ color: 0x7fe9ff, transparent: true, opacity: .55, depthWrite: false, depthFunc: THREE.GreaterDepth });
  /* 탄 */
  const bolts = [], fx = [], ST = { fire: 0, hit: 0, wall: 0, near: 0 };
  const flash = (x, z, c, big = 0) => fx.push({ x, z, c, t: 0, big });
  /* 체력 표시 */
  const css = document.createElement('style'); css.textContent = `
    .hud{position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none;white-space:nowrap}
    .hud b{font-weight:500;font-size:10.5px;color:var(--c);text-shadow:0 0 4px rgba(0,0,0,.9),0 0 8px rgba(0,0,0,.5)}
    .hud .hp{position:relative;width:40px;height:5px;background:rgba(8,10,20,.75);border:1px solid rgba(8,10,20,.85)}
    .hud .hp i{position:absolute;left:0;top:0;bottom:0;background:var(--c)}
    .hud.on b{text-decoration:underline;text-underline-offset:3px}
    .hud.hid b::after{content:' · 나무 속에 숨음';color:#d8ffb0}`;
  document.head.appendChild(css);
  for (const s of S) { const el = document.createElement('div'); el.className = 'hud'; const c = s.col.map(v => Math.min(255, v / 1.4 * 255 | 0));
    el.style.setProperty('--c', `rgb(${c})`); el.innerHTML = `<b>${s.name}</b><div class="hp"><i></i></div>`; $('#tags').appendChild(el); s.el = el; s.bar = el.querySelector('i'); }
  /* 쓰러뜨림 알림 */
  const feed = $('#feed'); const say = (a, b) => { const d = document.createElement('div'); d.innerHTML = `<b style="color:rgb(${a.col.map(v => Math.min(255, v / 1.4 * 255 | 0))})">${a.name}</b> → <span style="color:rgb(${b.col.map(v => Math.min(255, v / 1.4 * 255 | 0))})">${b.name}</span>`; feed.prepend(d); setTimeout(() => d.remove(), 4000); while (feed.children.length > 5) feed.lastChild.remove(); };

  /* ── 카메라: 각도(땅에서 몇 도) · 거리 · 따라갈 기체 (또는 자유: 화면을 끌어 옮김) ── */
  const cam = { x: 0, z: 0, ang: 45, dist: 25, follow: 0 };
  const angEl = $('#ang'), angV = $('#angv'), distEl = $('#dist'), distV = $('#distv');
  const readA = () => { cam.ang = +angEl.value; angV.textContent = cam.ang + '°'; drawGauge(); }, readD = () => { cam.dist = +distEl.value; distV.textContent = cam.dist + 'm'; };
  angEl.addEventListener('input', readA); distEl.addEventListener('input', readD);
  /* 각도 그림: 땅 선과 카메라 선이 이루는 각 */
  const gauge = $('#gauge'), drawGauge = () => { const a = cam.ang * Math.PI / 180, L = 34, x = 8 + Math.cos(a) * L, y = 44 - Math.sin(a) * L;
    gauge.innerHTML = `<line x1="4" y1="44" x2="48" y2="44" stroke="rgba(185,255,74,.45)" stroke-width="1.5"/>
      <path d="M ${8 + 14} 44 A 14 14 0 0 0 ${8 + Math.cos(a) * 14} ${44 - Math.sin(a) * 14}" fill="none" stroke="rgba(185,255,74,.7)" stroke-width="1"/>
      <line x1="8" y1="44" x2="${x}" y2="${y}" stroke="#b9ff4a" stroke-width="2" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="3.2" fill="#b9ff4a"/>`; };
  readA(); readD();
  const who = $('#who'), drawWho = () => { who.textContent = cam.follow < 0 ? '자유 보기 · 화면을 끌어 옮김' : `따라가기 · ${S[cam.follow].name}`; S.forEach((s, i) => s.el.classList.toggle('on', i === cam.follow)); setX(); };
  const setX = () => { S.forEach((s, i) => s.root.traverse(o => { if (o.isMesh) { if (i === cam.follow) o.layers.enable(1); else o.layers.disable(1); } })); };
  $('#prev').onclick = () => { cam.follow = cam.follow <= 0 ? (cam.follow < 0 ? S.length - 1 : -1) : cam.follow - 1; drawWho(); };
  $('#next').onclick = () => { cam.follow = cam.follow >= S.length - 1 ? -1 : cam.follow + 1; drawWho(); };
  drawWho();
  /* 자유 보기: 끌면 땅 위로 옮김 (따라가던 중이면 자유 보기로 바뀜) · 두 손가락 벌리기 = 거리 */
  { const pts = new Map(); let pinch = 0;
    canvas.addEventListener('pointerdown', e => { pts.set(e.pointerId, [e.clientX, e.clientY]); canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => { const p = pts.get(e.pointerId); if (!p) return;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; const d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); p[0] = e.clientX; p[1] = e.clientY; const [c, d] = [...pts.values()]; const d1 = Math.hypot(c[0] - d[0], c[1] - d[1]);
        if (pinch) { distEl.value = clamp(cam.dist * d0 / Math.max(1, d1), +distEl.min, +distEl.max); readD(); } pinch = 1; return; }
      const dx = e.clientX - p[0], dy = e.clientY - p[1]; p[0] = e.clientX; p[1] = e.clientY; if (Math.abs(dx) + Math.abs(dy) < .5) return;
      if (cam.follow >= 0) { cam.follow = -1; drawWho(); } const k = cam.dist / ch * 1.1; cam.x -= dx * k; cam.z -= dy * k / Math.max(.35, Math.sin(cam.ang * Math.PI / 180)); });
    const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => { e.preventDefault(); distEl.value = clamp(cam.dist * (1 + e.deltaY * .001), +distEl.min, +distEl.max); readD(); }, { passive: false }); }

  let Wd = 2, Hd = 2, cw = 1, ch = 1;
  const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); cw = r.width; ch = r.height; [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd);
    camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); glow.uRes.value.set(Wd, Hd); }
  addEventListener('resize', size); size(); bloom.setSamples(perf.st.aa ? 4 : 0);

  const v3 = new THREE.Vector3(), rc = new THREE.Raycaster(); const meshes = []; GI.mesh.traverse(o => { if (o.isMesh && o !== GI.sea) meshes.push(o); });
  let t = 0, last = performance.now(), occI = 0;
  const TRY = [0, .35, -.35, .7, -.7, 1.1, -1.1, 1.6, -1.6, 2.2, -2.2, 3.14];
  const fwdFree = (x, z, a, L) => { const dx = -Math.sin(a), dz = -Math.cos(a); for (const d of [1.2, 2.6, 4.2, L]) if (wall(x + dx * d, z + dz * d) || GI.blocked(x + dx * d, z + dz * d)) return false; return true; };

  renderer.setAnimationLoop(now => { try {
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt;
    /* ── 기체마다 생각하고 움직임 ── */
    for (const s of S) {
      if (s.dead) { if ((s.back -= dt) <= 0) { [s.x, s.z] = freeSpot(); s.hp = 1; s.dead = false; s.vx = s.vz = 0; s.root.visible = true; flash(s.x, s.z, [.7, 1.1, 1.4], 1); } continue; }
      if ((s.think -= dt) <= 0) { s.think = .4 + Math.random() * .4;   /* 가까운 상대를 고름 — 트인 곳에 보이는 상대를 더 좋아함 */
        let best = null, bs = 1e9; for (const o of S) { if (o === s || o.dead || hidFrom(o, s)) continue; const d = Math.hypot(o.x - s.x, o.z - s.z) * (clear(s.x, s.z, o.x, o.z) ? 1 : 1.8) * (o === s.tgt ? .8 : 1); if (d < bs) { bs = d; best = o; } }
        s.tgt = best; if (Math.random() < .08) s.orbit *= -1;
        /* 많이 맞았으면 가까운 나무 속으로 숨으러 감 · 다 낫거나 들키면 다시 나옴 */
        if (s.hp < .35 && !s.goal) { let g = null, gd = 30; for (const p of GI.treeSpots) { const d = Math.hypot(p[0] - s.x, p[1] - s.z); if (d < gd) { gd = d; g = p; } } s.goal = g; }
        if (s.goal && (s.hp > .7 || (s.inTree && s.tgt && Math.hypot(s.tgt.x - s.x, s.tgt.z - s.z) < 4))) s.goal = null; }
      if (s.tgt && (s.tgt.dead || hidFrom(s.tgt, s))) s.tgt = null;   /* 나무 속으로 사라진 상대는 놓침 */
      const o = s.tgt; let want = s.head;
      if (o) { const dx = o.x - s.x, dz = o.z - s.z, d = Math.hypot(dx, dz) || 1, toA = Math.atan2(-dx, -dz);
        want = d > 13 ? toA : d < 6 ? toA + Math.PI * .75 * s.orbit : toA + Math.PI * .5 * s.orbit * (1.2 - d / 13); }   /* 멀면 다가가고 · 가까우면 비켜 돌고 · 알맞으면 옆으로 돌며 쏨 */
      else want = s.head + Math.sin(t * .5 + s.phase) * .5;
      if (s.goal) want = Math.atan2(-(s.goal[0] - s.x), -(s.goal[1] - s.z));
      /* 앞이 막혔으면 비어 있는 쪽으로: 원하는 방향 둘레를 차례로 봐서 처음 트인 쪽 */
      let go = want; for (const k of TRY) { if (fwdFree(s.x, s.z, want + k, 6)) { go = want + k; break; } }
      const sp = s.sp * (s.goal && s.inTree ? .22 : o && Math.hypot(o.x - s.x, o.z - s.z) < 9 ? .85 : 1);   /* 숨은 동안은 잎 속에서 살살 움직임 */
      const tvx = -Math.sin(go) * sp, tvz = -Math.cos(go) * sp, ac = Math.min(1, dt * 2.6);
      s.vx += (tvx - s.vx) * ac; s.vz += (tvz - s.vz) * ac;
      /* 서로 겹치지 않게 살짝 밀어냄 */
      for (const q of S) { if (q === s || q.dead) continue; const dx = s.x - q.x, dz = s.z - q.z, d = Math.hypot(dx, dz); if (d < 2.4 && d > .01) { s.vx += dx / d * (2.4 - d) * 6 * dt; s.vz += dz / d * (2.4 - d) * 6 * dt; } }
      /* 지형은 못 뚫음: 막히면 그 축만 미끄러짐 */
      const nx = s.x + s.vx * dt, nz = s.z + s.vz * dt;
      if (!GI.blocked(nx, nz)) { s.x = nx; s.z = nz; } else if (!GI.blocked(nx, s.z)) { s.x = nx; s.vz *= .3; } else if (!GI.blocked(s.x, nz)) { s.z = nz; s.vx *= .3; } else { s.vx *= -.3; s.vz *= -.3; }
      /* 기수: 상대가 가까우면 상대를 겨눔, 아니면 가는 쪽 */
      const vh = Math.atan2(-s.vx, -s.vz), aim = o && Math.hypot(o.x - s.x, o.z - s.z) < 16 ? Math.atan2(-(o.x - s.x), -(o.z - s.z)) : vh;
      const turn = THREE.MathUtils.euclideanModulo(aim - s.head + Math.PI, Math.PI * 2) - Math.PI; s.head += turn * Math.min(1, dt * 5);
      s.bank += (clamp(-(s.vx * Math.cos(s.head) - s.vz * Math.sin(s.head)) * .045, -.55, .55) - s.bank) * Math.min(1, dt * 3);
      /* 쏨: 가까이 · 겨눈 쪽 · 사이가 트였을 때만 */
      if ((s.cool -= dt) <= 0 && o) { const dx = o.x - s.x, dz = o.z - s.z, d = Math.hypot(dx, dz); const off = Math.abs(THREE.MathUtils.euclideanModulo(Math.atan2(-dx, -dz) - s.head + Math.PI, Math.PI * 2) - Math.PI);
        if (d < 17 && off < .5 && clear(s.x, s.z, o.x, o.z)) { s.cool = .32 + Math.random() * .2; const bsp = 30, lt = d / bsp, e = (Math.random() - .5) * 2.2, lx = o.x + o.vx * lt * .7 + e, lz = o.z + o.vz * lt * .7 - e, L = Math.hypot(lx - s.x, lz - s.z) || 1;   /* 조금씩 빗나감 — 다 맞으면 싸움이 너무 짧음 */
          const mx = s.x - Math.sin(s.head) * 1.2, mz = s.z - Math.cos(s.head) * 1.2; if (!GI.gridAt(mx, mz)) { ST.fire++; s.reveal = .6; bolts.push({ x: mx, z: mz, vx: (lx - s.x) / L * bsp, vz: (lz - s.z) / L * bsp, life: 20 / bsp, own: s }); } }   /* 쏘면 잠깐 드러남 (나무 속에서도) */
        else s.cool = .08; }
      s.inTree = GI.treeAt(s.x, s.z); s.reveal = Math.max(0, (s.reveal || 0) - dt);
      const bob = Math.sin(t * 2.1 + s.phase) * .12; s.y = HOVER + .25 + bob;
      s.root.position.set(s.x, s.y, s.z); s.root.rotation.set(0, s.head, 0); s.root.rotateZ(s.bank); s.root.updateMatrixWorld(true);
      const gy = GI.groundFast(s.x, s.z); if (gy == null) s.sh.visible = false; else { const h = s.y - gy; s.sh.visible = true; s.sh.position.set(s.x, gy + .06, s.z); s.sh.rotation.set(-Math.PI / 2, 0, s.head); s.sh.scale.setScalar(.7 + h * .05); s.sh.material.uniforms.uA.value = clamp(.6 - h * .02, .18, .55); }
    }
    /* ── 탄: 지형에 막히고 · 다른 기체에 맞음 ── */
    for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i]; const px = b.x, pz = b.z; b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt;
      if (GI.gridAt(b.x, b.z) || GI.gridAt((px + b.x) / 2, (pz + b.z) / 2)) { ST.wall++; flash(b.x, b.z, [1.2, 1.0, .7]); bolts.splice(i, 1); continue; }   /* 지형에 부딪혀 튐 */
      let hit = null; for (const q of S) if (q !== b.own && !q.dead && Math.hypot(q.x - b.x, q.z - b.z) < 1.05) { hit = q; break; }
      if (hit) { ST.hit++; flash(b.x, b.z, b.own.col); hit.hp -= .085; bolts.splice(i, 1);
        if (hit.hp <= 0) { hit.dead = true; hit.back = 3; hit.root.visible = false; hit.sh.visible = false; b.own.kills++; flash(hit.x, hit.z, [1.5, .8, .4], 2); say(b.own, hit); }
        continue; }
      if (b.life <= 0) bolts.splice(i, 1); }
    for (const s of S) if (!s.dead) s.hp = Math.min(1, s.hp + dt * .02);
    /* ── 카메라 ── */
    if (cam.follow >= 0) { const f = S[cam.follow], k = Math.min(1, dt * 4); cam.x += (f.x + f.vx * .3 - cam.x) * k; cam.z += (f.z + f.vz * .3 - cam.z) * k; }
    cam.x = clamp(cam.x, -GI.lim.x, GI.lim.x); cam.z = clamp(cam.z, -GI.lim.z, GI.lim.z);
    const a = cam.ang * Math.PI / 180; camera.position.set(cam.x, HOVER + cam.dist * Math.sin(a), cam.z + cam.dist * Math.cos(a)); camera.lookAt(cam.x, HOVER, cam.z); camera.updateMatrixWorld();
    GI.sea.position.x = cam.x; GI.sea.position.z = cam.z; GI.sea.material.uniforms.uT.value = t;
    /* 지형 뒤의 기체는 숨김 (한 장면에 3대씩 돌아가며 잼) */
    for (let k = 0; k < 3; k++) { const s = S[occI++ % S.length]; if (s.dead) continue; v3.set(s.x, s.y, s.z); const d = v3.clone().sub(camera.position), L = d.length(); rc.set(camera.position, d.normalize()); rc.far = L - .8; s.seen = rc.intersectObjects(meshes, false).length === 0; }
    { const f = S[cam.follow]; if (f && f.inTree && !f.dead) GI.uSee.value.set(f.x, f.y, f.z, 1); else GI.uSee.value.w = 0; }   /* 따라가는 기체가 나무 속이면 둘레 잎을 비켜 보이게 */
    for (const s of S) { const hid = s.inTree && s.reveal <= 0, me = s.i === cam.follow, show = !s.dead && ((s.seen && !hid) || me); s.root.visible = show; s.sh.visible = s.sh.visible && show; s.el.classList.toggle('hid', me && s.inTree); v3.set(s.x, s.y + .9, s.z).project(camera);
      const on = show && v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1; s.el.style.opacity = on ? 1 : 0;
      if (on) { s.el.style.transform = `translate(${(v3.x * .5 + .5) * cw}px,${(-v3.y * .5 + .5) * ch}px) translate(-50%,-100%)`; s.bar.style.width = (Math.max(0, s.hp) * 100) + '%'; } }
    /* ── 빛: 탄 · 번쩍임 · 엔진 ── */
    glow.begin();
    for (const b of bolts) glow.add(b.x, HOVER + .3, b.z, -b.vx * .05, 0, -b.vz * .05, .2, 0, b.own.col, 1, b.x);
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i], T = f.big ? .6 : .25; f.t += dt; if (f.t > T) { fx.splice(i, 1); continue; } const k = 1 - f.t / T; glow.add(f.x, HOVER + .3, f.z, 0, 0, 0, (.5 + f.t * 3) * (1 + f.big * 1.5), 3, f.c, k); }
    for (const s of S) { if (!s.root.visible) continue; const hx = -Math.sin(s.head), hz = -Math.cos(s.head); for (const p of s.eng) { v3.copy(p).applyMatrix4(s.sm.matrixWorld); glow.add(v3.x, v3.y, v3.z, -hx * .9, 0, -hz * .9, .15, 3, s.col, .9); } }
    glow.end(); glow.uT.value = t;
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera);
    if (cam.follow >= 0 && !S[cam.follow].dead) { scene.overrideMaterial = xray; camera.layers.set(1); renderer.render(scene, camera); camera.layers.set(0); scene.overrideMaterial = null; }
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
  } catch (e) { console.error('[하늘섬 난전]', e); } });
  window.__ar = { S, cam, GI, ST, get t() { return t; }, set: (k, v) => { cam[k] = v; } };
}
