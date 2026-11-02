/* 맵 날아 보기 — 기지에서 기체를 조이스틱으로 몰고 맵을 돌아다니며 크기·길·문을 몸으로 확인
   · 조이스틱: 화면 왼쪽 아무 데나 손가락을 대면 그 자리에 생김(떠 있는 조이스틱). 얼마나 밀든 같은 속도, 민 쪽으로
     컴퓨터: WASD · 방향키
   · 움직임마다 이유:
     - 바로 꺾이지 않고 머리가 돌아감(무게가 있어서) → 도는 쪽으로 기체가 기울어짐(몸을 눕혀 도는 것)
     - 미는 힘만큼 엔진 불꽃이 길고 밝아짐(힘을 내는 곳) · 놓으면 불꽃이 줄며 미끄러지듯 섬
     - 떠 있는 높이에서 살짝 오르내림 + 바닥에 옅은 그림자(땅 위에 떠 있다는 것)
     - 벽: 설계도 그대로 회색이면 막힘. 벽을 따라 미끄러짐. 세게 들이받으면 닿은 자리에서 불티가 튐
   · 판정은 맵 설계도 그림을 그대로 읽음(막힘 1 / 지나감 0) → 화면에 보이는 벽 = 부딪히는 벽
   무게: 기체 한 대 + 불꽃 띠 몇 장 + 꼬리 띠 하나 + 불티 점 묶음 하나 + 그림자 판 하나 */
import * as THREE from 'three';
import { buildShip, engineSpots } from '../core/ships/build.js';
import { flameMesh } from './sortie.js';
import { MAP } from './mapfloor.js';

export const FLY = { LEN: 2, HOVER: .7, R: .8, SPEEDS: [9, 12, 15, 18], TURN: 7, ACC: .22 };
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

/* 설계도 그림 → 막힘 판정 */
export async function loadBlock(url) {
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, img.width, img.height).data, N = img.width, cell = MAP.W / N;
  const blk = new Uint8Array(N * N), reg = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) { const id = Math.round(d[i * 4] / 12); reg[i] = id; blk[i] = (d[i * 4 + 1] > 127 || id === 17) ? 1 : 0; }
  const at = (x, z) => { const i = Math.floor((x / MAP.SCALE + MAP.W / 2) / cell), j = Math.floor((z / MAP.SCALE + MAP.H / 2) / cell); return (i < 0 || j < 0 || i >= N || j >= N) ? -1 : j * N + i; };
  return { blocked: (x, z) => { const k = at(x, z); return k < 0 || blk[k] === 1; }, region: (x, z) => { const k = at(x, z); return k < 0 ? 17 : reg[k]; } };
}

export async function makeFlight(renderer, B, start, face) {
  const G = new THREE.Group();
  const b = await buildShip(1, 1, 'ruby', { renderer, size: FLY.LEN }); const ship = b.root, sm = ship.children[0]; G.add(ship);
  const sz = new THREE.Box3().setFromObject(sm).getSize(new THREE.Vector3()); const ENG = engineSpots(b.ship, sm, sz), K = FLY.LEN / 2.9;
  const flames = ENG.map(() => { const f = flameMesh(); G.add(f); return f; });
  /* 그림자: 떠 있는 높이가 높을수록 넓고 옅게 */
  const shM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uA: { value: .5 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uA; varying vec2 vP; void main(){ vec2 q=vP*vec2(1.,1.6); float r=dot(q,q); gl_FragColor=vec4(0.,0.,0.,exp(-r*3.)*uA); }' });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(FLY.LEN * 1.3, FLY.LEN * 1.3), shM); shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 1; G.add(shadow);
  /* 꼬리: 엔진 뒤 지난 자리 → 위에서 보는 넓은 띠, 빠를수록 오래 남음 */
  const NT = 40, tp = new Float32Array(NT * 6), ta = new Float32Array(NT * 2), ts = new Float32Array(NT * 2), ti = [];
  for (let i = 0; i < NT; i++) { ts[i * 2] = -1; ts[i * 2 + 1] = 1; if (i < NT - 1) { const p = i * 2; ti.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); } }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3)); tg.setAttribute('aA', new THREE.BufferAttribute(ta, 1)); tg.setAttribute('aS', new THREE.BufferAttribute(ts, 1)); tg.setIndex(ti);
  const trail = new THREE.Mesh(tg, new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide,
    vertexShader: 'attribute float aA, aS; varying float vA, vS; void main(){ vA=aA; vS=aS; gl_Position=projectionMatrix*viewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying float vA, vS; void main(){ float x=max(0.,1.-vS*vS); vec3 c=mix(vec3(.3,.55,1.4),vec3(.95,.97,1.3),vA*vA); gl_FragColor=vec4(c*x*vA*.8,1.); }' }));
  trail.frustumCulled = false; trail.renderOrder = 8; G.add(trail); const hist = [];
  /* 불티: 벽에 세게 닿은 자리에서 튀고, 떨어지며 식음(하양 → 주황 → 꺼짐) */
  const NS = 60, sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NS * 3), 3)); sg.setAttribute('aL', new THREE.BufferAttribute(new Float32Array(NS), 1));
  const sparks = new THREE.Points(sg, new THREE.ShaderMaterial({ ...AB, uniforms: { uPx: { value: 600 } },
    vertexShader: 'attribute float aL; uniform float uPx; varying float vL; void main(){ vL=aL; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=aL>0.?uPx*.05/max(.1,-mv.z):0.; }',
    fragmentShader: 'varying float vL; void main(){ vec2 q=gl_PointCoord-.5; float k=exp(-dot(q,q)*30.); vec3 c=mix(vec3(1.4,.45,.12),vec3(1.5,1.4,1.2),vL*vL); gl_FragColor=vec4(c*k*vL*1.6,1.); }' }));
  sparks.frustumCulled = false; sparks.renderOrder = 9; G.add(sparks); const SP = Array.from({ length: NS }, () => ({ l: 0, p: new THREE.Vector3(), v: new THREE.Vector3() })); let spI = 0;

  /* 조이스틱 */
  const pad = document.createElement('div'), knob = document.createElement('i');
  pad.style.cssText = 'position:fixed;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:1.5px solid rgba(185,255,74,.35);background:radial-gradient(rgba(185,255,74,.08),rgba(0,0,0,.25));pointer-events:none;display:none;z-index:5';
  knob.style.cssText = 'position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:radial-gradient(circle at 40% 35%,rgba(230,255,190,.9),rgba(140,210,60,.55));box-shadow:0 0 16px rgba(185,255,74,.5)';
  pad.appendChild(knob); document.body.appendChild(pad);
  const inp = { x: 0, y: 0 }, keys = new Set(); let pid = null, ox = 0, oy = 0;
  addEventListener('pointerdown', e => { if (pid !== null || e.target.closest('#ui') || e.clientX > innerWidth * .55) return; pid = e.pointerId; ox = e.clientX; oy = e.clientY;
    pad.style.left = ox + 'px'; pad.style.top = oy + 'px'; pad.style.display = 'block'; knob.style.transform = ''; });
  addEventListener('pointermove', e => { if (e.pointerId !== pid) return; let dx = e.clientX - ox, dy = e.clientY - oy; const l = Math.hypot(dx, dy), R = 52;
    if (l > R) { dx *= R / l; dy *= R / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; inp.x = dx / R; inp.y = dy / R; });
  const up = e => { if (e.pointerId !== pid) return; pid = null; inp.x = inp.y = 0; pad.style.display = 'none'; }; addEventListener('pointerup', up); addEventListener('pointercancel', up);
  addEventListener('keydown', e => keys.add(e.key.toLowerCase())); addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

  const S = { x: start[0], z: start[1], vx: 0, vz: 0, head: face, bank: 0, speed: FLY.SPEEDS[1], thr: 0, hit: 0 };
  const fw = new THREE.Vector3(), v = new THREE.Vector3(), c = new THREE.Vector3();
  const free = (x, z) => { if (B.blocked(x, z)) return false; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; if (B.blocked(x + Math.cos(a) * FLY.R, z + Math.sin(a) * FLY.R)) return false; } return true; };
  G.userData.S = S;
  G.userData.reset = () => { S.x = start[0]; S.z = start[1]; S.vx = S.vz = 0; S.head = face; hist.length = 0; };
  G.userData.setPx = px => { sparks.material.uniforms.uPx.value = px; };
  G.userData.update = (t, dt) => {
    let ix = inp.x, iy = inp.y;
    if (keys.size) { ix = (keys.has('d') || keys.has('arrowright')) - (keys.has('a') || keys.has('arrowleft')); iy = (keys.has('s') || keys.has('arrowdown')) - (keys.has('w') || keys.has('arrowup')); const l = Math.hypot(ix, iy); if (l > 1) { ix /= l; iy /= l; } }
    const m = Math.hypot(ix, iy) > .15 ? 1 : 0;                        /* 조이스틱: 조금만 밀어도 항상 같은 속도 (방향만 정함) */
    /* 머리 돌리기: 미는 쪽으로, 무게 때문에 한 번에 다 돌지 않음 */
    let turn = 0;
    if (m > .08) { const want = Math.atan2(-ix, -iy); let d = want - S.head; d = Math.atan2(Math.sin(d), Math.cos(d)); const st = Math.sign(d) * Math.min(Math.abs(d), FLY.TURN * dt); S.head += st; turn = st / Math.max(dt, 1e-4); }
    S.bank += (THREE.MathUtils.clamp(-turn * .09, -.5, .5) - S.bank) * Math.min(1, dt * 6);
    /* 속도: 바라보는 쪽 x 민 만큼. 바로 붙지 않고 스르륵 (ACC초) */
    const tx = -Math.sin(S.head) * S.speed * m * (m > .08), tz = -Math.cos(S.head) * S.speed * m * (m > .08), a = Math.min(1, dt / FLY.ACC);
    S.vx += (tx - S.vx) * a; S.vz += (tz - S.vz) * a; S.thr += (m - S.thr) * Math.min(1, dt * 8);
    /* 벽: 가로·세로 따로 막아 벽을 따라 미끄러짐. 들이받은 세기만큼 불티 */
    const nx = S.x + S.vx * dt, nz = S.z + S.vz * dt; let hitV = 0;
    if (free(nx, S.z)) S.x = nx; else { hitV += Math.abs(S.vx); S.vx *= -.15; }
    if (free(S.x, nz)) S.z = nz; else { hitV += Math.abs(S.vz); S.vz *= -.15; }
    if (hitV > 3 && t - S.hit > .08) { S.hit = t; const n = Math.min(14, 4 + hitV | 0);
      for (let i = 0; i < n; i++) { const s = SP[spI = (spI + 1) % NS]; s.l = .4 + Math.random() * .4; s.p.set(S.x - Math.sin(S.head) * FLY.R, FLY.HOVER * .6, S.z - Math.cos(S.head) * FLY.R);
        s.v.set((Math.random() - .5) * 6, 2 + Math.random() * 3, (Math.random() - .5) * 6).add(v.set(Math.sin(S.head) * hitV * .4, 0, Math.cos(S.head) * hitV * .4)); } }
    /* 기체 자세 */
    const bob = Math.sin(t * 2.1) * .06 + Math.sin(t * 3.7) * .025;
    ship.position.set(S.x, FLY.HOVER + bob, S.z); ship.rotation.set(0, S.head, 0); ship.rotateZ(S.bank); ship.rotateX(-Math.min(.12, Math.hypot(S.vx, S.vz) / S.speed * .08));
    shadow.position.set(S.x, .05, S.z); shadow.rotation.z = S.head; shM.uniforms.uA.value = .55 - bob;
    ship.updateMatrixWorld(true); fw.set(0, 0, -1).transformDirection(ship.matrixWorld);
    /* 불꽃: 미는 힘만큼 */
    const I = .35 + S.thr * 1.1, len = (.35 + S.thr * 1.1) * K;
    flames.forEach((f, i) => { v.copy(ENG[i]).applyMatrix4(sm.matrixWorld); const u = f.material.uniforms; u.uA.value.copy(v); u.uB.value.copy(v).addScaledVector(fw, -len * (.9 + .1 * Math.sin(t * 50 + i))); u.uW.value = .1 * K * (1 + S.thr * .4); u.uI.value = I; u.uT.value = t; });
    /* 꼬리 */
    c.set(0, 0, 0); ENG.forEach(p => c.add(v.copy(p).applyMatrix4(sm.matrixWorld))); c.divideScalar(ENG.length);
    hist.unshift({ p: c.clone(), t }); if (hist.length > NT) hist.pop();
    const life = .12 + .25 * Math.hypot(S.vx, S.vz) / FLY.SPEEDS[3];
    for (let i = 0; i < NT; i++) { const h = hist[Math.min(i, hist.length - 1)], al = h ? Math.max(0, 1 - (t - h.t) / life) : 0, p = h ? h.p : c, w = (.1 * (1 - i / NT) + .02) * K * 1.4;
      const sx = Math.cos(S.head) * w, sz2 = -Math.sin(S.head) * w;
      tp[i * 6] = p.x + sx; tp[i * 6 + 1] = p.y; tp[i * 6 + 2] = p.z + sz2; tp[i * 6 + 3] = p.x - sx; tp[i * 6 + 4] = p.y; tp[i * 6 + 5] = p.z - sz2; ta[i * 2] = ta[i * 2 + 1] = al * S.thr; }
    tg.attributes.position.needsUpdate = tg.attributes.aA.needsUpdate = true;
    { const P = sg.attributes.position, L = sg.attributes.aL;
      SP.forEach((s, i) => { if (s.l > 0) { s.l -= dt; s.v.y -= 14 * dt; s.p.addScaledVector(s.v, dt); if (s.p.y < .05) { s.p.y = .05; s.v.y *= -.3; s.v.x *= .6; s.v.z *= .6; } } P.setXYZ(i, s.p.x, s.p.y, s.p.z); L.setX(i, Math.max(0, s.l) * 1.6); });
      P.needsUpdate = L.needsUpdate = true; }
  };
  return G;
}
