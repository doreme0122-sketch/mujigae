/* 정글 보물 성소 — 근원의 알 성소 (사용자 2026-11-08: 사용자가 준 디자인 'origin-egg-sanctum' · 크기는 지금 맵에 맞춰서)
   원래 디자인은 반지름 140m 섬 · 여기선 정글 던전 자리(반지름 약 24m)에 맞추고, 모든 것을 기체 기준 실제 미터로 다시 잡음 (기체는 땅 위 1.9m를 낢)
   ① 섬: 불규칙한 바깥선 · 절벽에 금빛 띠 둘 · 밑은 얕게(위층이라 밑을 지나는 가운데층 시야를 막지 않게 6.5m) · 짧은 돌 가시와 끝의 빛
   ② 성스러운 바닥(반지름 9.6m): 빛나는 금 고리 · 룬 띠 · 제단으로 모이는 빛살 — 숨 쉬듯 밝아졌다 어두워짐
   ③ 팔각 3단 제단(꼭대기 1.35m: 기체가 넘어감) · 모서리 금테 · 네 방향 계단 · 아래 단 모서리 화로 8개
   ④ 근원의 알(가운데 4.6m · 기체 위): 빛나는 속 + 반투명 껍질 · 금빛 요람 팔 넷 · 돌아가는 봉인 고리 셋 · 하늘로 솟는 빛기둥(멀리서도 보이는 표지) · 알로 빨려드는 빛 알갱이 · 알의 힘에 멈춰 떠 있는 유적 조각
   ⑤ 기둥 고리(반지름 13.6m · 16개 · 사이 약 3.8m로 드나듦): 홈 파인 기둥 · 몇 개는 무너지고 굴러떨어진 토막 · 선 기둥끼리 위에 돌보(룬이 빛남) · 덩굴
   ⑥ 바깥 땅: 봉인을 붙드는 오벨리스크 넷(빛 글자) · 오벨리스크에서 제단으로 흐르는 빛 줄기 · 날아서 지나는 돌 아치 둘 · 바위 가시 · 무너진 바깥 벽 · 정글(나무·풀은 jdress가 심음)
   ⑦ 섬 가장자리에서 흘러내리는 빛 폭포 + 떨어지는 불티
   빛나거나 투명한 것(빛기둥·껍질·폭포·불꽃)은 막힘 계산에서 빠짐 · 도착 문 쪽(clearA)은 큰 것들을 비켜 놓음 */
import * as THREE from 'three';
import { Builder, M4, V, taperTube, dressMat, hex, lerpC, fbm, rng } from './jdress.js?v=11081253';

const GOLD = hex('#e2b968'), GOLD2 = hex('#ffd98a'), MARB = hex('#cfc7d8'), MARB2 = hex('#9a90aa'), ROCK = hex('#2c2838'), ROCK2 = hex('#1a1622'), CYAN = hex('#7affe0'), WARM = hex('#ffcf7a');
const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const marble = (c, v, n) => { const k = fbm(v.x * .9 + v.y * .6, v.z * .9 - v.y * .4), vein = Math.abs(fbm(v.x * 2.2 + 3, v.z * 2.2 + v.y * 1.7) - .5); lerpC(c, MARB, MARB2, (k - .4) * 1.6); if (vein < .025) c.lerp(GOLD, .35); if (v.y < .9 && n.y > -.2 && fbm(v.x * 1.3, v.z * 1.3 + 9) > .55) c.lerp(hex('#2c5a46'), .5); };   /* 대리석 · 금빛 결 · 밑동 이끼 */
const gold = c => c.copy(GOLD), stone = (c, v) => lerpC(c, ROCK, hex('#3e384e'), fbm(v.x * .7, v.z * .7 + v.y * .5) * 1.4 - .3);

export function buildSanctum({ seed = 1, KL, clearA = null }) {
  const R = rng(seed), rnd = (a, b) => a + R() * (b - a), T = { value: 0 }, G = new THREE.Group(), anim = [], b = Builder(), block = [];
  const mat = dressMat(KL, T, false), matG = dressMat(KL, T, false, .3);
  const far = a => clearA == null ? true : Math.abs(((a - clearA + Math.PI) % 6.2832 + 6.2832) % 6.2832 - Math.PI) > .55;   /* 도착 문 쪽은 비움 */
  /* ① 섬 */
  const R0 = 22.8, ph = [R() * 6, R() * 6, R() * 6], outline = a => R0 * (1 + .05 * Math.sin(a * 3 + ph[0]) + .035 * Math.sin(a * 5 + ph[1]) + .02 * Math.sin(a * 9 + ph[2]));
  { const N = 96, L = 7, rings = []; for (let i = 0; i <= L; i++) { const t = i / L; rings.push({ t, y: -Math.pow(t, 1.1) * 6.5, sc: i ? Math.max(.12, 1 - .7 * Math.pow(t, 1.3)) : 1 }); }
    const pos = [], idx = []; rings.forEach((rg, i) => { for (let k = 0; k < N; k++) { const a = k / N * 6.2832, nz = fbm(Math.cos(a) * 3 + 7, rg.t * 6) * 2 - 1, r = outline(a) * rg.sc * (1 + (i ? .1 : 0) * nz); pos.push(Math.cos(a) * r, rg.y + (i ? nz * .5 : 0), Math.sin(a) * r); } });
    for (let i = 0; i < L; i++) for (let k = 0; k < N; k++) { const a = i * N + k, b2 = i * N + (k + 1) % N, c = (i + 1) * N + k, d = (i + 1) * N + (k + 1) % N; idx.push(a, d, b2, a, c, d); }
    const tip = pos.length / 3; pos.push(0, -7.6, 0); for (let k = 0; k < N; k++) idx.push(L * N + k, tip, L * N + (k + 1) % N);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    b.put(g, M4(), (c, v) => { const t = Math.min(1, -v.y / 6.5); lerpC(c, hex('#3a3446'), ROCK2, t * 1.3); c.multiplyScalar(.75 + .5 * fbm(Math.atan2(v.z, v.x) * 4, v.y * 2)); });
    const top = new THREE.ShapeGeometry(new THREE.Shape(Array.from({ length: N }, (_, k) => { const a = k / N * 6.2832; return new THREE.Vector2(Math.cos(a) * outline(a), -Math.sin(a) * outline(a)); }))); top.rotateX(-Math.PI / 2);
    b.put(top, M4(), c => c.set('#2a2836'));
    /* 절벽의 금빛 띠 (지층처럼 섬을 감음) */
    [[.25, 1.012, .2, GOLD], [.55, 1.008, .16, GOLD2]].forEach(([t, k, r, col], j) => { const rg = rings[Math.round(t * L)], pts = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * 6.2832, rr = outline(a) * rg.sc * k + .25; pts.push(V(Math.cos(a) * rr, rg.y + Math.sin(a * 3 + j) * .45, Math.sin(a) * rr)); }
      b.put(taperTube(pts, r, r, 140, 5), M4(), c => c.copy(col), () => .7); });
    /* 밑에 매달린 짧은 돌 가시 · 몇 개 끝에 빛 */
    for (let k = 0; k < 9; k++) { const a = R() * 6.28, rg = rings[3 + Math.floor(R() * 3)], r = outline(a) * rg.sc * rnd(.3, .8), Ls = rnd(2.5, 4.5), rs = rnd(.6, 1.2), cg = new THREE.ConeGeometry(rs, Ls, 7, 3); cg.rotateX(Math.PI);
      b.put(cg, M4(V(Math.cos(a) * r, rg.y - Ls / 2 + .4, Math.sin(a) * r)), (c, v) => stone(c, v));
      if (k % 3 === 0) b.put(new THREE.IcosahedronGeometry(.25, 0), M4(V(Math.cos(a) * r, rg.y - Ls + .3, Math.sin(a) * r)), c => c.copy(WARM), () => 1.8); } }
  /* ② 성스러운 바닥 */
  const FR = 9.6;
  { const fm = new THREE.ShaderMaterial({ uniforms: { uT: T },
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `varying vec2 vP; uniform float uT;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float t = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * t); }
        void main(){ float r = length(vP), a = atan(vP.y, vP.x); vec3 base = mix(vec3(.16, .145, .2), vec3(.24, .22, .29), h(floor(vP * 1.3)) * .5 + .25);
          float tile = smoothstep(.04, .0, abs(fract(r * .5) - .5) - .47) * .3 + smoothstep(.03, .0, abs(fract(a * 24. / 6.2832) - .5) - .48) * step(2.4, r) * .3; base *= 1. - tile;   /* 돌 판 이음새 */
          float g = 0.; for (int i = 0; i < 4; i++) { float rr = float(i) == 0. ? 2.6 : float(i) == 1. ? 5.3 : float(i) == 2. ? 7.1 : 8.9; g += smoothstep(.07, .0, abs(r - rr)); }   /* 금 고리 */
          float sp = abs(fract(a * 8. / 6.2832 + .5) - .5) * r; g += smoothstep(.06, .0, sp) * step(2.6, r) * step(r, 7.1) * .8;   /* 제단으로 모이는 빛살 여덟 */
          if (r > 7.25 && r < 8.75) { float n = 40.; float ci = floor((a + 3.1416) / 6.2832 * n); vec2 uv = vec2(fract((a + 3.1416) / 6.2832 * n), (r - 7.25) / 1.5);   /* 룬 띠: 칸마다 다른 글자 */
            vec2 q = uv * vec2(1., 1.); float d = 9.; for (int k = 0; k < 3; k++) { float fk = float(k); vec2 pa = vec2(floor(h(vec2(ci, fk)) * 3.) * .35 + .15, floor(h(vec2(ci, fk + 7.)) * 3.) * .35 + .15), pb = vec2(floor(h(vec2(ci, fk + 3.)) * 3.) * .35 + .15, floor(h(vec2(ci, fk + 11.)) * 3.) * .35 + .15); d = min(d, seg(q, pa, pb)); }
            g += smoothstep(.07, .02, d) * .9; }
          float pulse = .75 + .25 * sin(uT * 1.1 - r * .5);   /* 가운데에서 바깥으로 숨결 */
          vec3 col = base + vec3(1., .78, .42) * g * pulse * 1.2;
          gl_FragColor = linearToOutputTexel(vec4(col, 1.)); }` });
    const fl = new THREE.Mesh(new THREE.CircleGeometry(FR, 72), fm); fl.rotation.x = -Math.PI / 2; fl.position.y = .07; G.add(fl);
    const pts = []; for (let i = 0; i <= 120; i++) { const a = i / 120 * 6.2832; pts.push(V(Math.cos(a) * (FR + .1), .1, Math.sin(a) * (FR + .1))); } b.put(taperTube(pts, .13, .13, 160, 5), M4(), gold, () => .45); }   /* 바닥 금테 */
  /* ③ 제단 */
  const oct = (r, h, y, col, gl = 0) => { const s = new THREE.Shape(); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832 + Math.PI / 8; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const g = new THREE.ExtrudeGeometry(s, { depth: h - .08, bevelEnabled: true, bevelThickness: .04, bevelSize: .06, bevelSegments: 1, curveSegments: 1 }); g.rotateX(-Math.PI / 2); b.put(g, M4(V(0, y + .04, 0)), col, () => gl);
    const tp = []; for (let i = 0; i <= 8; i++) { const a = i / 8 * 6.2832 + Math.PI / 8; tp.push(V(Math.cos(a) * (r + .02), y + h, Math.sin(a) * (r + .02))); } b.put(taperTube(tp, .045, .045, 32, 4), M4(), gold, () => .5); };   /* 모서리 금테 */
  const TIER = [[4.5, 0], [3.5, .45], [2.4, .9]]; TIER.forEach(([r, y]) => oct(r, .45, y, marble));
  for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);   /* 네 방향 계단 */
    for (const [r0, y0] of [[4.5, 0], [3.5, .45], [2.4, .9]]) for (let st = 0; st < 3; st++) { const w = 1.7, d = .3, y = y0 + .15 * st, rr = r0 + .9 - st * .3 - .15;
      b.put(new THREE.BoxGeometry(d, .15, w), M4(V(ca * rr, y + .075, sa * rr), new THREE.Euler(0, -a, 0)), marble); } }
  const flames = [];
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832 + Math.PI / 8, x = Math.cos(a) * 4.05, z = Math.sin(a) * 4.05;   /* 화로 */
    b.put(new THREE.CylinderGeometry(.09, .14, .45, 8), M4(V(x, .45 + .225, z)), gold, () => .2);
    const bowl = new THREE.LatheGeometry([0, 1, 2, 3, 4].map(k => new THREE.Vector2(.05 + Math.sin(k / 4 * 1.4) * .3, k / 4 * .22)), 10); b.put(bowl, M4(V(x, .9, z)), gold, () => .35);
    b.put(new THREE.IcosahedronGeometry(.13, 0), M4(V(x, 1.08, z)), c => c.copy(WARM), () => 2.2); flames.push(V(x, 1.25, z)); }
  /* ④ 근원의 알 */
  const EY = 4.6, egg = new THREE.Group(); egg.position.y = EY; G.add(egg);
  const inner = new THREE.Mesh(new THREE.SphereGeometry(.8, 24, 18), new THREE.MeshBasicMaterial({ color: '#ffd77a' })); inner.scale.y = 1.34; egg.add(inner);
  const shellM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: T },
    vertexShader: 'varying vec3 vN, vV, vP; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `varying vec3 vN, vV, vP; uniform float uT; void main(){ float f = pow(1. - abs(dot(vN, vV)), 2.2); float sw = .5 + .5 * sin(vP.y * 9. + atan(vP.z, vP.x) * 3. - uT * 1.4);   /* 껍질 위를 감도는 금빛 결 */
      vec3 c = mix(vec3(1., .85, .5), vec3(.5, 1., .9), f); gl_FragColor = linearToOutputTexel(vec4(c, .22 + f * .7 + sw * .12)); }` });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1.28, 32, 24), shellM); shell.scale.y = 1.36; egg.add(shell);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: '#ffd98a', transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(9, 9, 1); egg.add(halo);
  for (let k = 0; k < 4; k++) { const a = k / 4 * 6.2832 + Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a), P = [[2.15, 1.35], [2.05, 2.3], [1.62, 3.3], [1.22, 4.25], [1.32, 5.05], [1.62, 5.35]].map(([r, y]) => V(ca * r, y, sa * r));   /* 요람 팔: 꼭대기 단에서 솟아 알 아래를 받치고 끝이 바깥으로 말림 */
    b.put(taperTube(P, .15, .055, 24, 6), M4(), gold, () => .3); b.put(new THREE.IcosahedronGeometry(.13, 0), M4(P[5]), c => c.copy(GOLD2), () => .9); b.put(new THREE.SphereGeometry(.2, 8, 6), M4(P[1]), gold, () => .3); }
  { const pts = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * 6.2832; pts.push(V(Math.cos(a) * 2.15, 1.38, Math.sin(a) * 2.15)); } b.put(taperTube(pts, .1, .1, 80, 5), M4(), gold, () => .3); }
  const gyro = [2.0, 2.12, 2.24].map((r, i) => { const g = Builder(); g.put(new THREE.TorusGeometry(r, .055, 6, 64), M4(), gold, () => .5);   /* 봉인 고리: 새긴 금 고리 · 각자 다르게 돎 */
    for (let k = 0; k < 24; k++) { const a = k / 24 * 6.2832; g.put(new THREE.BoxGeometry(.05, .14, .09), M4(V(Math.cos(a) * r, Math.sin(a) * r, 0), new THREE.Euler(0, 0, a)), c => c.copy(k % 6 ? GOLD : CYAN), () => k % 6 ? .4 : 1.6); }
    const m = new THREE.Mesh(g.done(), matG); egg.add(m); return m; });
  /* 빛기둥: 알 위로 하늘까지 (멀리서 보물 자리를 알려 줌) · 나선 리본 · 솟는 불티 */
  const shaftM = (c1, c2, op, sp) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uT: T },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec2 vU; uniform float uT; void main(){ float s = .6 + .4 * sin(vU.x * 6.2832 * 7. + vU.y * 9. - uT * ${sp.toFixed(2)} * 3.); float f = smoothstep(0., .18, vU.y) * pow(1. - vU.y, 1.6);
      vec3 c = mix(vec3(${c1}), vec3(${c2}), vU.y); gl_FragColor = vec4(c * s * f * ${op.toFixed(2)}, 1.); }` });
  [[1.0, .55, 42, '1.,.82,.45', '.55,1.,.9', .3, 1], [.5, .28, 50, '1.,.95,.75', '1.,.9,.6', .42, 1.6]].forEach(([rb, rt, H, c1, c2, op, sp]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, H, 16, 1, true), shaftM(c1, c2, op, sp)); m.position.y = EY + 1.6 + H / 2; m.frustumCulled = false; G.add(m); });
  const NS = 90, sg = new THREE.BufferGeometry(), sp = new Float32Array(NS * 3), sm = []; for (let i = 0; i < NS; i++) sm.push([R() * 6.28, R(), rnd(.3, 1.1), rnd(.5, 1.5)]); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sparks = new THREE.Points(sg, new THREE.PointsMaterial({ size: .35, map: dot, color: '#ffe2a0', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); sparks.frustumCulled = false; G.add(sparks);
  const NM = 70, mg = new THREE.BufferGeometry(), mp = new Float32Array(NM * 3), mm = []; for (let i = 0; i < NM; i++) mm.push([R() * 6.28, R(), rnd(.6, 1.4)]); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const motes = new THREE.Points(mg, new THREE.PointsMaterial({ size: .3, map: dot, color: '#9affea', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); motes.frustumCulled = false; G.add(motes);   /* 알로 빨려드는 빛 알갱이 */
  const frag = new THREE.Group(); G.add(frag); { const fb = Builder(); for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28 + R() * .4, r = rnd(4.2, 6.8), y = rnd(6.2, 9), g = new THREE.IcosahedronGeometry(rnd(.3, .65), 0), p = g.attributes.position;   /* 알의 힘에 멈춰 떠 있는 유적 조각 */
      for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * rnd(.7, 1.3), p.getY(i) * rnd(.6, 1.2), p.getZ(i) * rnd(.7, 1.3)); fb.put(g, M4(V(Math.cos(a) * r, y, Math.sin(a) * r), new THREE.Euler(R() * 3, R() * 3, 0)), k % 3 ? marble : stone); }
    frag.add(new THREE.Mesh(fb.done(), mat)); }
  const flameS = flames.map(p => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: '#ffb45a', transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false })); s.position.copy(p); s.scale.set(1.1, 1.5, 1); G.add(s); return s; });
  /* ⑤ 기둥 고리 */
  const NP = 16, PR = 13.6, PH = 7, ruined = new Set(); while (ruined.size < 4) { const k = Math.floor(R() * NP); if (!ruined.has((k + 1) % NP) && !ruined.has((k + NP - 1) % NP)) ruined.add(k); }
  const pillar = (a, broken) => { const x = Math.cos(a) * PR, z = Math.sin(a) * PR, h = broken ? rnd(2.4, 4.2) : PH;
    b.put(new THREE.BoxGeometry(1.5, .45, 1.5), M4(V(x, .225, z), new THREE.Euler(0, -a, 0)), marble); b.put(new THREE.TorusGeometry(.62, .09, 6, 20), M4(V(x, .5, z), new THREE.Euler(Math.PI / 2, 0, 0)), marble);
    const g = new THREE.CylinderGeometry(.5, .58, h, 20, 8), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const px = p.getX(i), pz = p.getZ(i), th = Math.atan2(pz, px), k = 1 - .07 * Math.max(0, Math.cos(th * 10)) ** 2;   /* 세로 홈 */
      let y = p.getY(i); if (broken && y > h / 2 - .01) y += (fbm(px * 3 + a, pz * 3) - .5) * 1.1; p.setXYZ(i, px * k, y, pz * k); }   /* 부러진 끝은 들쭉날쭉 */
    b.put(g, M4(V(x, .45 + h / 2, z)), marble);
    if (!broken) { b.put(new THREE.CylinderGeometry(.72, .52, .35, 16), M4(V(x, .45 + h + .17, z)), marble); b.put(new THREE.BoxGeometry(1.35, .3, 1.35), M4(V(x, .45 + h + .5, z), new THREE.Euler(0, -a, 0)), marble); }
    else for (let d = 0; d < 2; d++) { const da = a + rnd(-.25, .25), dr = PR + rnd(1.2, 3), L = rnd(.9, 1.3), dg = new THREE.CylinderGeometry(.52, .52, L, 16); dg.rotateZ(Math.PI / 2);   /* 굴러떨어진 토막 */
      b.put(dg, M4(V(Math.cos(da) * dr, .5, Math.sin(da) * dr), new THREE.Euler(0, rnd(0, 3), 0)), marble); block.push([Math.cos(da) * dr, Math.sin(da) * dr, .9]); }
    block.push([x, z, 1.0]); return { x, z, top: .45 + h + .65, broken }; };
  const PL = []; for (let i = 0; i < NP; i++) PL.push(pillar(i / NP * 6.2832, ruined.has(i)));
  for (let i = 0; i < NP; i++) { const A = PL[i], B = PL[(i + 1) % NP]; if (A.broken || B.broken) continue; const mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2, L = Math.hypot(B.x - A.x, B.z - A.z) + 1.1, yaw = Math.atan2(B.x - A.x, B.z - A.z);   /* 돌보 + 빛 룬 */
    b.put(new THREE.BoxGeometry(.8, .7, L), M4(V(mx, A.top + .35, mz), new THREE.Euler(0, yaw, 0)), marble);
    const ox = (mx / Math.hypot(mx, mz)) * .41, oz = (mz / Math.hypot(mx, mz)) * .41; for (const s2 of [1, -1]) b.put(new THREE.BoxGeometry(.04, .12, L * .8), M4(V(mx + ox * s2, A.top + .38, mz + oz * s2), new THREE.Euler(0, yaw, 0)), c => c.copy(CYAN), () => 1.4);
    if (R() < .5) { const t = rnd(.2, .8), vx = A.x + (B.x - A.x) * t, vz = A.z + (B.z - A.z) * t, Lv = rnd(1.5, 3.2);   /* 돌보에서 늘어진 덩굴 (기체 위에서 끝남) */
      const vp = [V(vx, A.top, vz), V(vx + .1, A.top - Lv * .5, vz), V(vx - .05, A.top - Lv, vz)]; b.put(taperTube(vp, .05, .03, 8, 4), M4(), c => c.set('#1e4a36'), () => 0, () => 1); b.put(new THREE.IcosahedronGeometry(.1, 0), M4(vp[2]), c => c.copy(CYAN), () => 1.5, () => 1.2); } }
  /* ⑥ 바깥 땅 */
  const angs = []; const place = (a0, minGap = .45) => { let a = a0; for (let t = 0; t < 12; t++) { if (far(a) && angs.every(q => Math.abs(((a - q + Math.PI) % 6.2832 + 6.2832) % 6.2832 - Math.PI) > minGap)) { angs.push(a); return a; } a += .37; } return null; };
  const obel = []; for (let k = 0; k < 4; k++) { const a = place(Math.PI / 4 + k * Math.PI / 2 + rnd(-.1, .1)); if (a == null) continue; const r = 19.2, x = Math.cos(a) * r, z = Math.sin(a) * r; obel.push([x, z]);   /* 봉인 오벨리스크 */
    b.put(new THREE.BoxGeometry(2.6, .6, 2.6), M4(V(x, .3, z), new THREE.Euler(0, -a, 0)), marble); b.put(new THREE.BoxGeometry(2.0, .5, 2.0), M4(V(x, .85, z), new THREE.Euler(0, -a, 0)), marble);
    const sh = new THREE.CylinderGeometry(.62, .9, 8.4, 4, 6); sh.rotateY(Math.PI / 4); b.put(sh, M4(V(x, 1.1 + 4.2, z), new THREE.Euler(0, -a, 0)), marble);
    const py = new THREE.ConeGeometry(.88, 1.2, 4); py.rotateY(Math.PI / 4); b.put(py, M4(V(x, 9.5 + .6, z), new THREE.Euler(0, -a, 0)), gold, () => .6);
    for (let f = 0; f < 4; f++) { const fa = -a + f * Math.PI / 2; for (let g2 = 0; g2 < 7; g2++) { const yy = 2 + g2 * .95, w = .707 * (.9 - (yy - 1.1) / 8.4 * .28) + .025;   /* 면마다 빛나는 글자 */
        b.put(new THREE.BoxGeometry(rnd(.18, .42), rnd(.16, .5), .05), M4(V(x, yy, z).add(V(Math.sin(fa + Math.PI / 2), 0, Math.cos(fa + Math.PI / 2)).multiplyScalar(w)), new THREE.Euler(0, fa + Math.PI / 2, 0)), c => c.copy(CYAN), () => 1.5); } }
    block.push([x, z, 1.9]);
    /* 오벨리스크에서 제단으로 흐르는 빛 줄기 (땅 위 · 기체 아래) */
    const lp = [V(x * .9, .1, z * .9), V(x * .7 + Math.sin(a) * 1.5, .12, z * .7 - Math.cos(a) * 1.5), V(x * .52, .1, z * .52)]; b.put(taperTube(lp, .09, .07, 24, 4), M4(), c => c.copy(CYAN), () => 1.1); }
  for (let k = 0; k < 2; k++) { const a = place(rnd(0, 6.28), .6); if (a == null) continue; const r = 20.5, c0 = V(Math.cos(a) * r, 0, Math.sin(a) * r), t = V(-Math.sin(a), 0, Math.cos(a));   /* 날아서 지나는 돌 아치: 안쪽 폭 약 5m · 높이 약 4.6m */
    const AP = [[-3.35, -.3], [-3.45, 2.4], [-2.7, 4.6], [0, 5.45], [2.7, 4.6], [3.45, 2.4], [3.35, -.3]].map(([u, y]) => c0.clone().addScaledVector(t, u).add(V(0, y, 0)));
    const g = taperTube(AP, .82, .82, 48, 9), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const n = fbm(p.getX(i) * .9 + k * 9, p.getZ(i) * .9 + p.getY(i) * .7) - .5; p.setXYZ(i, p.getX(i) + n * .3, p.getY(i) + n * .2, p.getZ(i) + n * .3); }
    b.put(g, M4(), (c, v) => { stone(c, v); if (v.y > 3 && fbm(v.x * 1.6, v.z * 1.6) > .5) c.lerp(hex('#2c5a46'), .6); });
    block.push([c0.x + t.x * 3.35, c0.z + t.z * 3.35, 1.2], [c0.x - t.x * 3.35, c0.z - t.z * 3.35, 1.2]); }
  for (let k = 0; k < 2; k++) { const a = place(rnd(0, 6.28), .4); if (a == null) continue; const r = rnd(21, 22.5), h = rnd(6.5, 9.5), cg = new THREE.ConeGeometry(1.3, h, 7, 6), p = cg.attributes.position;   /* 바위 가시 */
    for (let i = 0; i < p.count; i++) { const f = 1 + (fbm(p.getX(i) * .9 + k * 5, p.getY(i) * .5) - .5) * .7; p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); }
    const x = Math.cos(a) * r, z = Math.sin(a) * r; b.put(cg, M4(V(x, h / 2 - .2, z), new THREE.Euler(rnd(-.1, .1), R() * 3, rnd(-.1, .1))), (c, v) => { stone(c, v); if (Math.abs(fbm(v.y * 2, v.x + v.z) - .5) < .03) c.lerp(GOLD, .8); }, (v) => Math.abs(fbm(v.y * 2, v.x + v.z) - .5) < .03 ? .8 : 0);
    block.push([x, z, 1.6]); }
  for (let k = 0; k < 3; k++) { const a = place(rnd(0, 6.28), .3); if (a == null) continue; const len = rnd(3.5, 5.5), n = Math.round(len / .9);   /* 무너진 바깥 벽: 돌 블록이 들쭉날쭉 */
    for (let i = 0; i < n; i++) { const aa = a + (i - n / 2) * .9 / 16.8, hh = Math.max(.4, 2.6 * Math.sin((i + .5) / n * Math.PI) * rnd(.4, 1.1)), x = Math.cos(aa) * 16.8, z = Math.sin(aa) * 16.8;
      for (let y = 0; y < hh; y += .55) { const bh = Math.min(.55, hh - y); b.put(new THREE.BoxGeometry(.85, bh - .03, .6), M4(V(x, y + bh / 2, z), new THREE.Euler(0, -aa + rnd(-.06, .06), 0)), marble); }
      if (hh > 1.4) block.push([x, z, .7]); } }
  /* ⑦ 빛 폭포: 가장자리에서 바깥으로 말려 떨어짐 */
  const fallM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uT: T },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec2 vU; uniform float uT; float h(float x){ return fract(sin(x * 91.7) * 4375.5); }
      void main(){ float col = floor(vU.x * 22.), sp = .6 + h(col) * .8, s = smoothstep(.55, 1., fract(vU.y * 3. + uT * sp + h(col + 3.)));   /* 세로 줄기가 흘러내림 */
        float edge = smoothstep(0., .2, vU.x) * smoothstep(1., .8, vU.x), fade = (1. - vU.y) * smoothstep(0., .06, vU.y);
        vec3 c = mix(vec3(1., .82, .45), vec3(.5, 1., .9), vU.y); gl_FragColor = vec4(c * (.25 + s * .9) * edge * fade * .8, 1.); }` });
  for (let k = 0; k < 4; k++) { const a = place(rnd(0, 6.28), .5); if (a == null) continue; const W = rnd(4, 6.5), L = rnd(11, 16), ro = outline(a) - .4, nu = 6, nv = 24, pos = [], uv = [], idx = [];
    for (let j = 0; j <= nv; j++) { const v = j / nv, out = Math.sin(Math.min(1, v * 3) * 1.57) * 1.8 + v * 1.2, y = -v * v * L - v * .5;
      for (let i = 0; i <= nu; i++) { const u = i / nu, ta = a + (u - .5) * W / ro; pos.push(Math.cos(ta) * (ro + out), y + .05, Math.sin(ta) * (ro + out)); uv.push(u, v); } }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const q = j * (nu + 1) + i; idx.push(q, q + 1, q + nu + 2, q, q + nu + 2, q + nu + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = new THREE.Mesh(g, fallM); m.frustumCulled = false; G.add(m); }
  /* 알의 빛: 가까운 것일수록 따뜻하게 물듦 (빛을 꼭짓점에 구워 넣음 · 실제 조명 없이) */
  const geo = b.done(), C = geo.attributes.color, P = geo.attributes.position;
  for (let i = 0; i < C.count; i++) { const dx = P.getX(i), dy = P.getY(i) - EY, dz = P.getZ(i), d = Math.sqrt(dx * dx + dy * dy + dz * dz), k = .9 * Math.exp(-d / 5.5); C.setXYZ(i, C.getX(i) * (1 + k) + k * .18, C.getY(i) * (1 + k * .8) + k * .12, C.getZ(i) * (1 + k * .4)); }
  G.add(new THREE.Mesh(geo, mat));
  /* 움직임 */
  anim.push((t, dt) => { T.value = t; const pb = 1 + Math.sin(t * 1.6) * .03; inner.scale.set(pb, 1.34 * pb, pb); egg.position.y = EY + Math.sin(t * .8) * .2; halo.material.opacity = .3 + Math.sin(t * 1.6) * .08;
    gyro[0].rotation.set(t * .42, 0, 0); gyro[1].rotation.set(1.05, t * .3, 0); gyro[2].rotation.set(t * .13, 0, t * .24); frag.rotation.y = t * .04;
    for (let i = 0; i < NS; i++) { const m = sm[i]; m[1] = (m[1] + dt * .05 * m[3]) % 1; const r = m[2] * (1 - m[1] * .6), a = m[0] + m[1] * 9; sp[i * 3] = Math.cos(a) * r; sp[i * 3 + 1] = EY + 1.5 + m[1] * 30; sp[i * 3 + 2] = Math.sin(a) * r; } sg.attributes.position.needsUpdate = true;
    for (let i = 0; i < NM; i++) { const m = mm[i]; m[1] = (m[1] + dt * .12 * m[2]) % 1; const r = 7 * (1 - m[1]) + .6, a = m[0] + m[1] * 7; mp[i * 3] = Math.cos(a) * r; mp[i * 3 + 1] = EY + (1 - m[1]) * 3 * Math.sin(m[0] * 3); mp[i * 3 + 2] = Math.sin(a) * r; } mg.attributes.position.needsUpdate = true;
    flameS.forEach((s, i) => { const f = 1 + Math.sin(t * 9 + i * 2.1) * .12 + Math.sin(t * 13.7 + i) * .08; s.scale.set(1.1 * f, 1.5 * f, 1); }); });
  G.userData.outline = outline; G.userData.block = block; G.userData.top = { fn: outline, y: 0, r: R0 };
  return { G, anim, size: 26, outline, block, hole: FR + .4 }; }
