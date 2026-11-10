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
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { flameMesh } from './sortie.js?v=11102135';
import { MAP } from './mapfloor.js?v=11102135';
import { applyShipHeat, heatVis } from './shipheat.js?v=11102135';

export const FLY = { LEN: 2, HOVER: .7, R: .8, SPEEDS: [9, 12, 15, 18], TURN: 7, ACC: .22, TURNMAX: 9,
  BASE: 9, SHIELD: 3, BOOST: 5, BOOSTK: 1.5 };   /* 기지 고리(반지름 9m)를 벗어나는 순간: 보호막 3초 · 가속 5초(1.5배) — 기지 출구 앞 매복에 바로 당하지 않게 */
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

/* 설계도 그림 → 막힘 판정
   · 벽 그림(막힘 1/지나감 0)을 아주 살짝 번지게 한 '벽 높이 지도' F를 만들고, F가 .5 넘는 곳 = 벽
   · 진짜 바위벽(walls.js)도 똑같은 F의 .5 선을 따라 세움 → 눈에 보이는 벽 밑동 = 부딪히는 자리 (한 지도에서 둘 다 나옴)
   · 번지게 하는 까닭: 계단처럼 각진 픽셀 가장자리를 바위답게 둥근 선으로 (벽 두께·문 폭은 그대로) */
export async function loadBlock(url) {
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, img.width, img.height).data, N = img.width, cell = MAP.W / N;
  const reg = new Uint8Array(N * N), raw = new Float32Array(N * N), tmp = new Float32Array(N * N), F = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) { const id = Math.round(d[i * 4] / 12); reg[i] = id; raw[i] = d[i * 4 + 1] > 127 ? 1 : 0; }
  { const K = [], s = 1; let sum = 0; for (let k = -3; k <= 3; k++) { const w = Math.exp(-k * k / (2 * s * s)); K.push(w); sum += w; } K.forEach((w, i) => K[i] = w / sum);   /* 번지기: 가로 한 번, 세로 한 번 */
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let a = 0; for (let k = -3; k <= 3; k++) a += raw[j * N + Math.min(N - 1, Math.max(0, i + k))] * K[k + 3]; tmp[j * N + i] = a; }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let a = 0; for (let k = -3; k <= 3; k++) a += tmp[Math.min(N - 1, Math.max(0, j + k)) * N + i] * K[k + 3]; F[j * N + i] = a; } }
  const fx = x => (x / MAP.SCALE + MAP.W / 2) / cell - .5, fz = z => (z / MAP.SCALE + MAP.H / 2) / cell - .5;   /* 세상 좌표 → 지도 칸 (칸 가운데 = 정수) */
  const field = (x, z) => { const u = fx(x), w = fz(z); if (u < 0 || w < 0 || u > N - 1 || w > N - 1) return 1;
    const i = Math.min(N - 2, u | 0), j = Math.min(N - 2, w | 0), a = u - i, b = w - j, k = j * N + i;
    return (F[k] * (1 - a) + F[k + 1] * a) * (1 - b) + (F[k + N] * (1 - a) + F[k + N + 1] * a) * b; };
  const at = (x, z) => { const i = Math.floor((x / MAP.SCALE + MAP.W / 2) / cell), j = Math.floor((z / MAP.SCALE + MAP.H / 2) / cell); return (i < 0 || j < 0 || i >= N || j >= N) ? -1 : j * N + i; };
  return { N, F, reg, cell, field,
    blocked: (x, z) => { const k = at(x, z); return k < 0 || reg[k] === 17 || field(x, z) > .5; },
    region: (x, z) => { const k = at(x, z); return k < 0 ? 17 : reg[k]; } };
}

/* model: 미리 만든 기체 { root, sm(모양 덩어리) } — 없으면 예전 기체를 불러 옴
   초프리미엄 스킨(forgeship.js)은 불길·번개·서리 같은 제 효과를 몸에 달고 있어서, 예전 기체용 엔진 불꽃 · 꼬리 띠 · 바닥 그림자는 만들지 않음 (2026-11-10 찌꺼기 정리) */
export async function makeFlight(renderer, B, start, face, model = null) {
  const G = new THREE.Group(), K = FLY.LEN / 2.9; let ship, sm, ENG;
  if (model) { ship = model.root; sm = model.sm; ENG = []; }
  else { const b = await buildShip(1, 1, 'ruby', { renderer, size: FLY.LEN }); ship = b.root; sm = ship.children[0];
    ENG = engineSpots(b.ship, sm, new THREE.Box3().setFromObject(sm).getSize(new THREE.Vector3()));
    mergeShip(sm); }   /* 기체 부품 145개를 칠마다 하나로 (모양·칠 그대로 · 그리는 횟수 145번 → 몇 번) */
  G.add(ship);
  const flames = ENG.map(() => { const f = flameMesh(); G.add(f); return f; });
  /* 그림자: 떠 있는 높이가 높을수록 넓고 옅게 */
  const shM = model ? null : new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uA: { value: .5 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uA; varying vec2 vP; void main(){ vec2 q=vP*vec2(1.,1.6); float r=dot(q,q); gl_FragColor=vec4(0.,0.,0.,exp(-r*3.)*uA); }' });
  const shadow = model ? null : new THREE.Mesh(new THREE.PlaneGeometry(FLY.LEN * 1.3, FLY.LEN * 1.3), shM); if (shadow) { shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 1; G.add(shadow); }
  /* 꼬리: 엔진 뒤 지난 자리 → 위에서 보는 넓은 띠, 빠를수록 오래 남음 */
  const NT = 40, tp = new Float32Array(NT * 6), ta = new Float32Array(NT * 2), ts = new Float32Array(NT * 2), ti = [];
  for (let i = 0; i < NT; i++) { ts[i * 2] = -1; ts[i * 2 + 1] = 1; if (i < NT - 1) { const p = i * 2; ti.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); } }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3)); tg.setAttribute('aA', new THREE.BufferAttribute(ta, 1)); tg.setAttribute('aS', new THREE.BufferAttribute(ts, 1)); tg.setIndex(ti);
  const trail = ENG.length ? new THREE.Mesh(tg, new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide,
    vertexShader: 'attribute float aA, aS; varying float vA, vS; void main(){ vA=aA; vS=aS; gl_Position=projectionMatrix*viewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying float vA, vS; void main(){ float x=max(0.,1.-vS*vS); vec3 c=mix(vec3(.3,.55,1.4),vec3(.95,.97,1.3),vA*vA); gl_FragColor=vec4(c*x*vA*.8,1.); }' })) : null;
  if (trail) { trail.frustumCulled = false; trail.renderOrder = 8; G.add(trail); } const hist = [];
  /* 불티: 벽에 세게 닿은 자리에서 튀고, 떨어지며 식음(하양 → 주황 → 꺼짐) */
  const NS = 60, sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NS * 3), 3)); sg.setAttribute('aL', new THREE.BufferAttribute(new Float32Array(NS), 1));
  const sparks = new THREE.Points(sg, new THREE.ShaderMaterial({ ...AB, uniforms: { uPx: { value: 600 } },
    vertexShader: 'attribute float aL; uniform float uPx; varying float vL; void main(){ vL=aL; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=aL>0.?uPx*.05/max(.1,-mv.z):0.; }',
    fragmentShader: 'varying float vL; void main(){ vec2 q=gl_PointCoord-.5; float k=exp(-dot(q,q)*30.); vec3 c=mix(vec3(1.4,.45,.12),vec3(1.5,1.4,1.2),vL*vL); gl_FragColor=vec4(c*k*vL*1.6,1.); }' }));
  sparks.frustumCulled = false; sparks.renderOrder = 9; G.add(sparks); const SP = Array.from({ length: NS }, () => ({ l: 0, p: new THREE.Vector3(), v: new THREE.Vector3() })); let spI = 0;

  /* 조이스틱 */
  /* 조이스틱 칸: 왼쪽 아래 네모 (가로 40% · 세로 아래 55%) — 그 밖은 맵 둘러보기 칸 (사용자 2026-11-08) */
  const pad = document.createElement('div'), knob = document.createElement('i');
  pad.style.cssText = 'position:fixed;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:1.5px solid rgba(185,255,74,.35);background:radial-gradient(rgba(185,255,74,.08),rgba(0,0,0,.25));pointer-events:none;display:none;z-index:5';
  knob.style.cssText = 'position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:radial-gradient(circle at 40% 35%,rgba(230,255,190,.9),rgba(140,210,60,.55));box-shadow:0 0 16px rgba(185,255,74,.5)';
  pad.appendChild(knob); document.body.appendChild(pad);
  const inp = { x: 0, y: 0 }, keys = new Set(); let pid = null, ox = 0, oy = 0;
  addEventListener('pointerdown', e => { if (pid !== null || S.noPad || e.target.closest('#ui') || !padZone(e.clientX, e.clientY)) return;   /* noPad: 죽어 있는 동안엔 조이스틱 대신 둘러보기 */ pid = e.pointerId; ox = e.clientX; oy = e.clientY;
    pad.style.left = ox + 'px'; pad.style.top = oy + 'px'; pad.style.display = 'block'; knob.style.transform = ''; });
  addEventListener('pointermove', e => { if (e.pointerId !== pid) return; let dx = e.clientX - ox, dy = e.clientY - oy; const l = Math.hypot(dx, dy), R = 52;
    if (l > R) { dx *= R / l; dy *= R / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; inp.x = dx / R; inp.y = dy / R; });
  const up = e => { if (e.pointerId !== pid) return; pid = null; inp.x = inp.y = 0; pad.style.display = 'none'; }; addEventListener('pointerup', up); addEventListener('pointercancel', up);
  addEventListener('keydown', e => keys.add(e.key.toLowerCase())); addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

  const S = { turnLimit: true, x: start[0], z: start[1], vx: 0, vz: 0, head: face, mh: face, aim: null, aimK: 0, bank: 0, speed: FLY.SPEEDS[1], thr: 0, hit: 0, armed: true, shield: 0, boost: 0, pop: 0 };
  const fw = new THREE.Vector3(), v = new THREE.Vector3(), c = new THREE.Vector3();
  /* 기체 몸 검사점: 바깥 둘레 24곳 + 안쪽 둘레 12곳 + 가운데 (사용자 2026-11-07: 8곳만 보던 때는 가는 돌기가 점 사이 틈으로 기체 안까지 들어와, 뒤로 빼면 걸려서 못 나왔음) */
  const BODY = [[0, 0]]; for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12; BODY.push([Math.cos(a) * FLY.R, Math.sin(a) * FLY.R]); } for (let k = 0; k < 12; k++) { const a = (k + .5) * Math.PI / 6; BODY.push([Math.cos(a) * FLY.R * .55, Math.sin(a) * FLY.R * .55]); }
  const free = (x, z) => { for (const o of BODY) if (B.blocked(x + o[0], z + o[1])) return false; return true; };
  /* 닿은 벽이 보는 쪽: 기체 둘레 16곳 중 막힌 곳들의 반대쪽 평균 */
  const wallN = (x, z) => { let nx = 0, nz = 0, h = 0;   /* 기체 안쪽·몸 둘레·바로 바깥까지 같이 봄 → 안에 들어온 돌기도 방향을 찾음 */
    for (const r of [FLY.R * .55, FLY.R, FLY.R + .2]) for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12, c = Math.cos(a), sn = Math.sin(a); if (B.blocked(x + c * r, z + sn * r)) { const w = 1.6 - r; nx -= c * w; nz -= sn * w; h++; } }
    const l = Math.hypot(nx, nz); return h && l > 1e-3 ? [nx / l, nz / l] : null; };
  const shieldM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uA: { value: 1 }, uT: { value: 0 } },
    vertexShader: 'varying vec3 vN, vV, vP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vP=position; vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uA, uT; varying vec3 vN, vV, vP;
      void main(){ float f=1.-abs(dot(normalize(vN),vV)); f=f*f*f;
        float band=.5+.5*sin(vP.y*7.-uT*3.+sin(vP.x*5.+uT)*1.5);                          /* 천천히 흐르는 결 */
        vec3 c=mix(vec3(.55,1.,.35),vec3(.9,1.,.85),f)*.6;
        gl_FragColor=vec4(c*(f*1.3+.012+band*.022)*uA,1.); }` });
  const shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(FLY.LEN * .85, 28, 18), shieldM); shieldMesh.scale.y = .7; shieldMesh.visible = false; shieldMesh.renderOrder = 10; G.add(shieldMesh);
  /* 숨었을 때 반투명: 기체 재질을 비치게 (내 화면에서만) */
  const heatFx = applyShipHeat(ship, { value: 0 });                                                   /* 과열: 기체 금속이 총구부터 달아오름 (시안 B) */
  const mats = []; ship.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (!mats.includes(m)) mats.push(m); }); });
  let ghost = 0, ghostT = 0;
  /* 숨은 내 기체: 화면 점을 고른 점무늬로 비워 비쳐 보이게 (사용자 2026-11-05: 무지개 결 재질을 통째로 반투명으로 바꾸면 탭에서 40프레임 → 불투명 그대로 두고 점만 비움)
     · 4×4 고른 점무늬라 서서히 옅어지고 짙어짐 · 최대 약 55%를 비워 기체 모양은 또렷이 남음 */
  const uGhost = { value: 0 };
  for (const m of mats) { const ob = m.onBeforeCompile, ok = m.customProgramCacheKey;
    m.onBeforeCompile = (sh, r) => { if (ob) ob.call(m, sh, r); sh.uniforms.uGhost = uGhost;
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', `uniform float uGhost;
float gB2(vec2 a){ a=floor(a); return fract(dot(a,vec2(.5,a.y*.75))); }
float gB4(vec2 a){ return gB2(.5*a)*.25+gB2(a); }
void main() {
  if(uGhost>.002 && gB4(gl_FragCoord.xy)+.03<uGhost*.55) discard;`); };
    m.customProgramCacheKey = () => (ok ? ok.call(m) : '') + '|ghost'; m.needsUpdate = true; }
  G.userData.setGhost = (on, k = 1) => { ghostT = on ? k : 0; };   /* k: 얼마나 비울지 (1 = 새 맵 기본 · 초원 섬 부쉬는 덜 흐리게) */
  const applyGhost = dt => { const g0 = ghost; ghost += (ghostT - ghost) * Math.min(1, dt * 6); if (Math.abs(ghost - g0) < 1e-4 && (ghost < .001 || ghost > .999)) return;
    uGhost.value = ghost; flames.forEach(f => f.visible = ghost < .65); };
  G.userData.S = S;
  G.userData.reset = () => { S.x = start[0]; S.z = start[1]; S.vx = S.vz = 0; S.head = S.mh = face; hist.length = 0; S.armed = true; S.shield = S.boost = S.pop = 0; };
  G.userData.moveTo = (x, z, h) => { S.x = x; S.z = z; S.vx = S.vz = 0; if (h != null) S.head = S.mh = h; hist.length = 0; S.armed = false; };   /* 시험장: 다른 자리로 옮김 (꼬리 자국은 지움) */
  /* 다시 태어날 때: 움직임 상태를 전부 처음으로 (사용자 2026-11-10: 자리만 새로 정하고 기울기·미는 힘 같은 값은 그대로 두어, 한 번 깨진 값이 다시 태어나도 남아 기체가 안 보였음) */
  G.userData.respawn = (x, z, h) => { Object.assign(S, { x, z, vx: 0, vz: 0, head: h, mh: h, aim: null, aimK: 0, bank: 0, thr: 0, hit: 0, armed: true, shield: 0, boost: 0, pop: 0, tacc: 0, rc: 0, turning: false,
      brakeUntil: 0, dashUntil: 0, dashOn: false, dashVx: 0, dashVz: 0, dashEndK: 1, stunUntil: 0, shake: 0, ex: 0, ez: 0, goo: 0, extraSlow: 0, heatV: 0, heatFlash: 0 });
    inp.x = inp.y = 0; hist.length = 0; SP.forEach(q => { q.l = 0; }); ghost = ghostT = 0; uGhost.value = 0; };
  G.userData.setPx = px => { sparks.material.uniforms.uPx.value = px; };
  G.userData.update = (t, dt) => {
    let ix = inp.x, iy = inp.y;
    if (keys.size) { ix = (keys.has('d') || keys.has('arrowright')) - (keys.has('a') || keys.has('arrowleft')); iy = (keys.has('s') || keys.has('arrowdown')) - (keys.has('w') || keys.has('arrowup')); const l = Math.hypot(ix, iy); if (l > 1) { ix /= l; iy /= l; } }
    const m = Math.hypot(ix, iy) > .15 ? 1 : 0;                        /* 조이스틱: 조금만 밀어도 항상 같은 속도 (방향만 정함) */
    /* 머리 돌리기: 미는 쪽으로, 무게 때문에 한 번에 다 돌지 않음 */
    let turn = 0;
    if (m > .08) { const nm = Math.atan2(-ix, -iy), dm = Math.abs(Math.atan2(Math.sin(nm - S.mh), Math.cos(nm - S.mh))); S.tacc = (S.tacc || 0) + dm; S.mh = nm; }   /* 가는 쪽 (조이스틱) */
    S.tacc = (S.tacc || 0) * Math.exp(-dt * 6);
    if (S.brakeOn && S.tacc > 1.57 && t > (S.brakeUntil || 0)) { S.brakeUntil = t + .3; S.tacc = 0; }   /* 시험 ② 크게 돌면 0.3초 40% 느려짐 (옆으로 미끄러지며 브레이크) */
    S.aimK += ((S.aim != null ? 1 : 0) - S.aimK) * Math.min(1, dt * 8);
    { const want = S.aim != null ? S.aim : (m > .08 ? S.mh : S.head); let d = want - S.head; d = Math.atan2(Math.sin(d), Math.cos(d));
      const lim = (S.turnCap ? S.turnCap : S.turnLimit ? FLY.TURNMAX : 1e4) * dt;   /* 모아 쏘기·빛줄기 중엔 더 느리게 (shots가 turnCap을 정함) */   /* 천천히 돌기 (사용자 2026-11-04 확정): 바라보는 쪽만 1초에 9라디안까지 (뒤돌기 0.35초) · 가는 쪽은 그대로 바로 바뀜 */
      if (S.aim != null) { const k = THREE.MathUtils.clamp(d * Math.min(1, dt * 16), -lim, lim); S.head += k; turn = k / Math.max(dt, .05); }   /* 쏘는 동안: 쏘는 쪽을 바라봄 (이동은 조이스틱 쪽 그대로) */
      else if (m > .08) { const k = THREE.MathUtils.clamp(d, -lim, lim); S.head += k; turn = k / Math.max(dt, .05); }
      const rem = Math.abs(Math.atan2(Math.sin(want - S.head), Math.cos(want - S.head))); S.turning = rem > .3 || Math.abs(turn) > 4; }   /* 아직 도는 중인지 (시험 ③: 도는 중엔 크리티컬 반사 안 됨) */   /* 미는 쪽으로 바로 돎 (사용자 2026-11-03). 꺾은 크기만큼 짧게 기울어 꺾었다는 느낌만 남김 */   /* 미는 쪽으로 바로 돎 (사용자 2026-11-03). 꺾은 크기만큼 짧게 기울어 꺾었다는 느낌만 남김 */
    S.bank += (THREE.MathUtils.clamp(-turn * .05, -.45, .45) - S.bank) * Math.min(1, dt * 9);
    /* 속도: 바라보는 쪽 x 민 만큼. 바로 붙지 않고 스르륵 (ACC초) */
    /* 기지를 벗어나는 순간 보호막·가속 시작. 가속은 끝나기 0.6초 전부터 스르륵 풀림(갑자기 뚝 느려지지 않게) */
    if (S.armed && Math.hypot(S.x - start[0], S.z - start[1]) > FLY.BASE) { S.armed = false; S.shield = FLY.SHIELD; S.boost = FLY.BOOST; }
    if (S.shield > 0 && (S.shield -= dt) <= 0) { S.shield = 0; S.pop = .3; }
    if (S.boost > 0) S.boost = Math.max(0, S.boost - dt);
    const bk = Math.min(1, S.boost / .6) * (1 - S.aimK), spd = S.speed * (1 + (FLY.BOOSTK - 1) * bk * bk * (3 - 2 * bk)) * (1 - .79 * (S.goo || 0)) * (t < (S.brakeUntil || 0) ? .6 : 1) * (1 - (S.extraSlow || 0));   /* 빛 칼날 자세 잡는 동안 30% 느려짐 */   /* 해파리 점액 위: 50% 느려짐 (30%는 거의 안 느껴졌음 · 사용자) */
    const sl = 1 - (S.fireSlow ?? .5) * S.aimK,   /* 쏘는 동안 느려지는 정도는 탄마다 (무거운 탄 60% · 모으는 중 65% …) */ tx = -Math.sin(S.mh) * spd * sl * m * (m > .08), tz = -Math.cos(S.mh) * spd * sl * m * (m > .08)   /* 쏘는 동안 느려짐 */, a = Math.min(1, dt / FLY.ACC);
    S.vx += (tx - S.vx) * a; S.vz += (tz - S.vz) * a;
    { const cap = S.speed * 1.9 * sl * (1 - .79 * (S.goo || 0)) + 1e-3, v = Math.hypot(S.vx, S.vz); if (v > cap && (S.aimK > .5 || (S.goo || 0) > .5)) { const k = Math.max(cap / v, 1 - dt * 6); S.vx *= k; S.vz *= k; } }   /* 쏘는 중·점액 위에선 가속 중이어도 확실히 느려짐 */
    S.rc = Math.max(0, (S.rc || 0) - dt * 9); S.thr += (m - S.thr) * Math.min(1, dt * 8);
    /* 벽: 벽을 파고드는 힘만 없애고 벽을 따라가는 힘은 남김 → 비스듬히 닿으면 벽을 타고 미끄러짐, 정면이면 거의 멈춤
       ① 가려던 곳이 막혔으면 닿기 직전까지 감 ② 닿은 벽이 보는 쪽(바깥 방향)을 구함 ③ 그 방향 속도만 빼고 남은 시간만큼 다시 감 (꺾인 벽은 세 번까지)
       들이받은 세기(벽 쪽 속도)만큼 불티 */
    if (t < (S.dashUntil || 0)) { S.vx = S.dashVx; S.vz = S.dashVz; S.dashOn = true; }
    else if (S.dashOn) { S.dashOn = false; const k = S.dashEndK ?? 1; S.vx *= k; S.vz *= k; S.dashEndK = 1; }
    if (t >= (S.dashUntil || 0) && t < (S.stunUntil || 0)) { S.vx = S.vz = 0; }   /* 기절: 튕겨나간 끝에서 2초 꼼짝 못 함 (사용자 2026-11-09) */   /* 밀림이 끝나는 순간 남은 속도를 줄여 정해 둔 거리에서 딱 멈춤 (반동 뒤 미끄러져 더 가던 것) */   /* 빛 칼날 도약: 베는 동안 앞으로 확 나감 (벽 미끄러짐은 아래 그대로) */
    const ex = S.ex || 0, ez = S.ez || 0; S.vx += ex; S.vz += ez;                                   /* 바깥 힘(블랙홀 소용돌이 흐름)을 실어 같이 움직임 — 벽 미끄러짐도 같이 적용 */
    if (!free(S.x, S.z)) { out: for (let r = .25; r <= 6; r += .25) for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, x = S.x + Math.cos(a) * r, z = S.z + Math.sin(a) * r; if (free(x, z)) { S.x = x; S.z = z; break out; } } }   /* 어쩌다 벽에 묻혀 있으면(옮겨진 자리·밀림) 가장 가까운 빈 곳으로 꺼냄 — 묻힌 채로는 어느 쪽으로도 못 움직여 갇히던 것 */
    let hitV = 0, rem = dt;
    for (let it = 0; it < 3 && rem > 1e-5; it++) {
      const tx2 = S.x + S.vx * rem, tz2 = S.z + S.vz * rem;
      if (free(tx2, tz2)) { S.x = tx2; S.z = tz2; break; }
      let lo = 0, hi = 1; for (let k = 0; k < 7; k++) { const m = (lo + hi) / 2; if (free(S.x + S.vx * rem * m, S.z + S.vz * rem * m)) lo = m; else hi = m; }
      S.x += S.vx * rem * lo; S.z += S.vz * rem * lo; rem *= 1 - lo;
      const n = wallN(S.x, S.z); if (!n) { S.vx = S.vz = 0; break; }
      if (lo === 0 && it === 2) { out2: for (let r = .1; r <= 1.6; r += .1) for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12, x = S.x + Math.cos(a) * r, z = S.z + Math.sin(a) * r; if (free(x, z) && (Math.cos(a) * S.vx + Math.sin(a) * S.vz) >= 0) { S.x = x; S.z = z; break out2; } } }   /* 세 번 다 한 걸음도 못 가면(끼임) 가려는 쪽으로 가장 가까운 빈 곳으로 살짝 빼 줌 */
      const vn = S.vx * n[0] + S.vz * n[1];
      if (vn < 0) { hitV += -vn; S.vx -= vn * n[0]; S.vz -= vn * n[1]; }
      /* 벽에서 아주 조금(3cm) 떼어 놓음: 울퉁불퉁한 벽에 걸려 미끄러지다 멈추지 않게 */
      for (const e of [.03, .08, .15]) if (free(S.x + n[0] * e, S.z + n[1] * e)) { S.x += n[0] * e; S.z += n[1] * e; break; } }
    S.vx -= ex; S.vz -= ez;                                                                              /* 바깥 힘은 내 속도에 쌓이지 않음 (흐름을 벗어나면 바로 원래 속도) */
    if (hitV > 3 && t - S.hit > .08) { S.hit = t; const n = Math.min(14, 4 + hitV | 0);
      for (let i = 0; i < n; i++) { const s = SP[spI = (spI + 1) % NS]; s.l = .4 + Math.random() * .4; s.p.set(S.x - Math.sin(S.head) * FLY.R, FLY.HOVER * .6, S.z - Math.cos(S.head) * FLY.R);
        s.v.set((Math.random() - .5) * 6, 2 + Math.random() * 3, (Math.random() - .5) * 6).add(v.set(Math.sin(S.head) * hitV * .4, 0, Math.cos(S.head) * hitV * .4)); } }
    applyGhost(dt);
    /* 기체 자세 */
    const bob = Math.sin(t * 2.1) * .06 + Math.sin(t * 3.7) * .025;
    ship.position.set(S.x + Math.sin(S.head) * S.rc * .14, FLY.HOVER + bob, S.z + Math.cos(S.head) * S.rc * .14);   /* 반동: 쏠 때마다 뒤로 살짝 밀렸다 돌아옴 */ ship.rotation.set(0, S.head, 0); ship.rotateZ(S.bank); ship.rotateX(-Math.min(.12, Math.hypot(S.vx, S.vz) / S.speed * .08));
    /* 보호막: 기체를 감싼 빛 거품. 가장자리가 밝고(빛이 비스듬히 지나는 곳) 결이 천천히 흐름. 끝나기 0.8초 전부터 점점 빨리 깜빡여 곧 꺼진다는 걸 알림 · 꺼질 땐 확 퍼지며 사라짐 */
    { const on = S.shield > 0, u = shieldM.uniforms; shieldMesh.visible = on || S.pop > 0; shieldMesh.position.set(S.x, FLY.HOVER + bob, S.z);
      let a = 1; if (on && S.shield < .8) a = .45 + .55 * (Math.sin((.8 - S.shield) * (10 + (.8 - S.shield) * 30)) > 0 ? 1 : 0);
      if (!on && S.pop > 0) { S.pop -= dt; const k = 1 - S.pop / .3; { const q = 1 + k * .9; shieldMesh.scale.set(q, q * .7, q); } a = (1 - k); } else { const q = 1 + Math.sin(t * 6) * .015; shieldMesh.scale.set(q, q * .7, q); }
      u.uA.value = a; u.uT.value = t; }
    if (shadow) { shadow.position.set(S.x, .05, S.z); shadow.rotation.z = S.head; shM.uniforms.uA.value = .55 - bob; }
    if (S.shake > 0) { S.shake = Math.max(0, S.shake - dt * 2); ship.position.x += Math.sin(t * 70) * .03 * S.shake; ship.position.z += Math.cos(t * 63) * .02 * S.shake; }   /* 과열 순간 파르르 */
    ship.updateMatrixWorld(true); fw.set(0, 0, -1).transformDirection(ship.matrixWorld);
    heatFx.update(S.heatV || 0, S.heatFlash || 0); S.nose = heatFx.nose.clone().applyMatrix4(ship.matrixWorld); S.heatVis = heatVis(S.heatV || 0);
    /* 불꽃: 미는 힘만큼 */
    const gf = (S.goo || 0) * (.5 + .5 * Math.sin(t * 23) * Math.sin(t * 7.3)), I = (.35 + S.thr * 1.1) * (1 + .5 * bk) * (1 - .45 * gf),   /* 점액에 붙잡히면 불꽃이 힘겹게 깜빡임 */ len = (.35 + S.thr * 1.1) * K * (1 + .8 * bk);   /* 가속 중엔 불꽃이 길고 밝음 (힘을 더 냄) */
    flames.forEach((f, i) => { v.copy(ENG[i]).applyMatrix4(sm.matrixWorld); const u = f.material.uniforms; u.uA.value.copy(v); u.uB.value.copy(v).addScaledVector(fw, -len * (.9 + .1 * Math.sin(t * 50 + i))); u.uW.value = .1 * K * (1 + S.thr * .4); u.uI.value = I; u.uT.value = t; });
    /* 꼬리 */
    if (ENG.length) {
    c.set(0, 0, 0); ENG.forEach(p => c.add(v.copy(p).applyMatrix4(sm.matrixWorld))); c.divideScalar(ENG.length);
    if (t < (S.dashUntil || 0) + .35) hist.length = 0;   /* 빛 칼날 도약 동안은 엔진 꼬리를 남기지 않음 (굵은 띠가 남던 것) */
    hist.unshift({ p: c.clone(), t }); if (hist.length > NT) hist.pop();
    const life = (.12 + .25 * Math.hypot(S.vx, S.vz) / FLY.SPEEDS[3]) * (1 + .8 * bk);
    for (let i = 0; i < NT; i++) { const h = hist[Math.min(i, hist.length - 1)], al = h ? Math.max(0, 1 - (t - h.t) / life) : 0, p = h ? h.p : c, w = (.1 * (1 - i / NT) + .02) * K * 1.4;
      const sx = Math.cos(S.head) * w, sz2 = -Math.sin(S.head) * w;
      tp[i * 6] = p.x + sx; tp[i * 6 + 1] = p.y; tp[i * 6 + 2] = p.z + sz2; tp[i * 6 + 3] = p.x - sx; tp[i * 6 + 4] = p.y; tp[i * 6 + 5] = p.z - sz2; ta[i * 2] = ta[i * 2 + 1] = al * S.thr; }
    tg.attributes.position.needsUpdate = tg.attributes.aA.needsUpdate = true; }
    { const P = sg.attributes.position, L = sg.attributes.aL;
      SP.forEach((s, i) => { if (s.l > 0) { s.l -= dt; s.v.y -= 14 * dt; s.p.addScaledVector(s.v, dt); if (s.p.y < .05) { s.p.y = .05; s.v.y *= -.3; s.v.x *= .6; s.v.z *= .6; } } P.setXYZ(i, s.p.x, s.p.y, s.p.z); L.setX(i, Math.max(0, s.l) * 1.6); });
      P.needsUpdate = L.needsUpdate = true; }
  };
  return G;
}

/* 기체 부품 합치기 (2026-11-08 최적화): 원본 모델은 부품마다 따로 그려 한 장면에 기체만 145번(+ 벽 너머 비침 145번) 그렸음.
   같은 칠 · 같은 정보(자리·빛 방향·그림 좌표)를 쓰는 부품끼리 한 덩어리로 합침 → 모양·칠은 그대로, 그리는 횟수만 줄어듦 (부품은 따로 움직이지 않음) */
export const PADZ = { w: .4, h: .55 };
export const padZone = (x, y) => x < innerWidth * PADZ.w && y > innerHeight * (1 - PADZ.h);
export function mergeShip(root) {
  root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), groups = new Map(), drop = [];
  root.traverse(o => { if (!o.isMesh || Array.isArray(o.material) || o.isSkinnedMesh || o.morphTargetInfluences) return; const g = o.geometry;
    const key = o.material.uuid + '|' + Object.keys(g.attributes).sort().map(k => k + g.attributes[k].itemSize + (g.attributes[k].normalized ? 'n' : '') + g.attributes[k].array.constructor.name).join(',') + (g.index ? 'i' : '') + '|' + o.renderOrder + (o.castShadow ? 's' : '');
    if (!groups.has(key)) groups.set(key, []); groups.get(key).push(o); });
  for (const list of groups.values()) { if (list.length < 2) continue;
    const parts = list.map(o => { const g = o.geometry.clone(); for (const k of Object.keys(g.attributes)) if (g.attributes[k].isInterleavedBufferAttribute) g.setAttribute(k, g.attributes[k].clone()); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); return g; });
    const mg = mergeGeometries(parts, false); if (!mg) continue; parts.forEach(g => g.dispose());
    const me = new THREE.Mesh(mg, list[0].material); me.renderOrder = list[0].renderOrder; me.castShadow = list[0].castShadow; me.receiveShadow = list[0].receiveShadow; me.name = 'merged'; root.add(me); drop.push(...list); }
  drop.forEach(o => o.parent && o.parent.remove(o)); }
