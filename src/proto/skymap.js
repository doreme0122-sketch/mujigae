/* 전체 맵 1단계 — 태어나는 곳 + 무지개 홀로그램 벽 (사용자 2026-11-06)
   · 맵 = 동그라미 · 가장자리에서 한가운데까지 보통 속도 20초 (반지름 240m)
   · 맵 끝 = 무지개 홀로그램 벽: 늘 은은하게 보임 · 닿으면 튕기지 않고 그냥 막힘 · 총을 쏘면 맞은 자리에서 무지개빛이 표면을 따라 번짐
   · 태어나는 곳 10곳 = 벽 바깥(맵 테두리 뒤) · 출구만 벽을 뚫고 맵 안으로 이어짐 · 모두 한가운데에서 같은 거리
   · 태어나는 곳 모양 = '빛의 닻'(금테 별 판 · 수호 탑 일곱 · 계단 단 · 유성이 꽂히며 태어남)을 하늘섬에 맞게 다듬음:
     검은 건메탈 → 밝은 크림빛 돌 · 은빛 → 흰 대리석 · 금과 푸른 에너지 빛은 그대로 · 풀 덮인 받침 섬 위에 앉힘
   · 태어나 출구로 튀어 나가면 바로 조이스틱 · 기지 고리(9m)를 벗어나는 순간 보호막 3초 + 가속 5초 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11061759';
import { makePad } from '../core/hangar/pad.js?v=11061759';
import { makeMag } from '../core/hangar/mag.js?v=11061759';
import { buildShip } from '../core/ships/build.js';
import { makeGoldStar } from './goldstar.js?v=11061759';
import { makeArena, SPEED, WAVE_R0 } from './arena.js?v=11061759';
import { makeGuardians, GUARD } from './guardian.js?v=11061759';
import { makeBirth, BIRTH } from './birth.js?v=11061759';
import { makePerf } from './perf.js?v=11061759';
import { makeGlow } from '../preview/glow.js';
import { makeFlight, FLY } from './flight.js?v=11061759';
import { pedestal } from './gates.js?v=11061759';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp, HOVER = FLY.HOVER;
const R = 240, NB = 10, GAPH = 5.6, BASE_D = 0;     /* 맵 반지름 · 기지 수 · 벽 틈 반 폭(= 기지 반지름) · 기지 가운데는 벽 선 위 (앞 절반은 맵 안, 뒤 절반은 맵 밖 · 사용자 2026-11-06) */
const SHIPL = 2.9, BS = 2 / SHIPL, BASE_Y = .42;     /* 기지 단위(기체 2.9) → 맵 단위(기체 2m) · 판 위 기체가 나는 높이에 오도록 */
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

/* '빛의 닻'을 하늘섬에 맞게: 어두운 금속 → 밝은 돌 · 은빛 → 흰 대리석 · 금·빛은 그대로 */
function skyTone(root) { root.traverse(o => { if (!o.isMesh) return; for (const m of (Array.isArray(o.material) ? o.material : [o.material])) { if (!m || !m.color || m.userData.toned || m.isShaderMaterial || m.isMeshBasicMaterial) continue;
  m.userData.toned = true; const c = m.color, L = c.r * .3 + c.g * .55 + c.b * .15, gold = c.r > c.b * 1.5 && c.r > .5;
  if (gold) continue;
  if (L < .12) { m.color.setHex(0xcfc6b3); m.metalness = .05; m.roughness = .82; }                 /* 건메탈 → 크림빛 돌 */
  else if (L < .3) { m.color.setHex(0xddd5c3); m.metalness = .05; m.roughness = .78; }
  else if (L < .7) { m.color.setHex(0xebe6da); m.metalness = .1; m.roughness = .55; }              /* 은빛 → 흰 대리석 */
  else { m.color.setHex(0xf4f1ea); m.metalness = .12; m.roughness = .45; }
  if ('clearcoat' in m) { m.clearcoat = .15; m.sheen = 0; } m.needsUpdate = true; } }); }

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0xbcd2ea, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, .3, 1600), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .7; pm.dispose(); }
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.8); sun.position.set(-9, 14, -8); scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xb7c8e8, 0x3a3020, .85));
  const glow = makeGlow(); scene.add(glow.mesh);
  /* 아래 구름 바다 */
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uT; varying vec3 vW; float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){ float rr=length(vW.xz);
        /* 하늘 → 우주: 구름 모양대로 울퉁불퉁하게 옅어지며 하늘빛이 어두워지고 별이 하나둘 · 경계를 따라 푸른 대기 빛 (사용자 2026-11-06) */
        vec2 p=vW.xz*.015+vec2(uT*.004,0.); float c=n(p)*.5+n(p*2.1)*.3+n(p*4.3)*.2;
        float edge=rr-${R}.-8.-(n(vW.xz*.02)*.6+n(vW.xz*.05)*.4)*38.;                    /* 구름 가닥이 우주 쪽으로 들쭉날쭉 */
        float k=smoothstep(-6.,34.,edge);                                                  /* 0 = 하늘 · 1 = 우주 */
        float cl=smoothstep(.3+k*.4,.8+k*.15,c)*(1.-k);                                     /* 구름이 점점 옅어져 흩어짐 */
        vec3 sky=mix(vec3(.62,.72,.9),vec3(.97,.98,1.),cl);
        vec3 space=vec3(.006,.008,.018);
        vec2 g=floor(vW.xz*.35); float st=step(.985,h(g)); float tw=.55+.45*sin(uT*1.7+h(g+3.)*40.); vec2 f=fract(vW.xz*.35)-.5; float sd=exp(-dot(f,f)*60.);
        vec3 stars=vec3(.85,.9,1.)*st*tw*sd*(.5+h(g+7.)*.8)*smoothstep(.35,1.,k);
        vec3 col=mix(sky*mix(1.,.35,k),space,smoothstep(.2,1.,k))+stars;
        col+=vec3(.35,.6,1.15)*exp(-pow((k-.32)/.16,2.))*.32;                               /* 대기 빛 띠: 은은하게 */
        gl_FragColor=vec4(col+cl*k*vec3(.15,.18,.25),1.); }` }));
  sea.position.y = -60; scene.add(sea);
  onProgress(.1);

  /* ── 무지개 홀로그램 벽 ── */
  const HITS = Array.from({ length: 10 }, () => new THREE.Vector4(0, -999, 0, -99)); let hitI = 0;
  const wallM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uR: { value: R }, uGap: { value: GAPH }, uHit: { value: HITS }, uGapOn: { value: 1 } },
    vertexShader: 'varying vec3 vW; varying vec3 vN; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uT, uR, uGap, uGapOn; uniform vec4 uHit[10]; varying vec3 vW; varying vec3 vN;
      vec3 rb(float h){ return .5+.5*cos(6.2832*(h+vec3(0.,.33,.67))); }
      void main(){ float a=atan(vW.z,vW.x), st=6.2831853/10., k=a-st*floor(a/st+.5), arc=abs(k)*uR;
        float open=uGapOn>.5 ? smoothstep(uGap-.2,uGap+.7,arc) : 1.;                  /* 출구 틈 (통로 벽에는 틈 없음) */
        float u=a*uR, y=vW.y;
        vec3 V=normalize(cameraPosition-vW); float fr=1.-abs(dot(normalize(vN),V)); fr=fr*fr;
        /* 홀로그램 결: 엇갈린 마름모 격자 · 위로 흐르는 가는 주사선 · 천천히 흐르는 무지개 */
        vec2 q=vec2(u*.5+y*.5, u*.5-y*.5)*.45; vec2 f=abs(fract(q)-.5); float grid=smoothstep(.46,.5,max(f.x,f.y));
        float scan=pow(.5+.5*sin(y*5.-uT*2.4),18.);
        float hue=fract(u/70.+y*.012+uT*.025);
        float vf=uGapOn>.5 ? smoothstep(-46.,-26.,y)*smoothstep(38.,20.,y) : smoothstep(-12.,-6.,y)*smoothstep(9.,5.,y);
        vec3 col=rb(hue); float al=(.11+.14*fr+.1*grid+.05*scan);
        /* 틈 가장자리: 또렷한 무지개 선 */
        float edge=exp(-pow((arc-uGap)/.22,2.))*uGapOn; col+=rb(hue+.3)*edge*1.2; al+=edge*.5;
        /* 맞은 자리: 무지개빛 고리가 표면을 따라 번져 나감 */
        for(int i=0;i<10;i++){ vec4 hh=uHit[i]; float age=uT-hh.w; if(age<0.||age>1.8) continue; float d=distance(vW,hh.xyz), rr=age*10.;
          float ring=exp(-pow((d-rr)/(.6+age*.6),2.))*(1.-age/1.8), core=exp(-d*d*.35)*max(0.,1.-age*3.);
          col+=rb(d*.06-age*.6)*(ring*1.6+core*2.); al+=ring*.55+core*.6; }
        gl_FragColor=vec4(col*1.15,clamp(al,0.,.9)*vf*open); }` });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 90, 720, 1, true).translate(0, -4, 0), wallM); wall.renderOrder = 20; wall.frustumCulled = false; scene.add(wall);
  /* 틈 양옆 기둥: 홀로그램을 비추는 돌기둥 (흰 돌 · 금 띠 · 틈 쪽에 무지개 줄) */
  const postM = new THREE.MeshStandardMaterial({ color: 0xe6dfcf, roughness: .7, flatShading: true }), goldM = new THREE.MeshStandardMaterial({ color: 0xe2b35c, metalness: 1, roughness: .3 });
  const seamM = new THREE.ShaderMaterial({ ...AB, uniforms: { uT: { value: 0 } }, vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uT; varying vec2 vU; void main(){ float x=abs(vU.x-.5)*2.; vec3 c=.5+.5*cos(6.2832*(vU.y*1.5-uT*.3+vec3(0.,.33,.67))); gl_FragColor=vec4(c*exp(-x*x*6.)*1.2,1.); }' });
  const BASES = [];
  for (let i = 0; i < NB; i++) { const ang = i / NB * Math.PI * 2;
    for (const s of [-1, 1]) { const a = ang + s * (GAPH + .9) / R, x = Math.cos(a) * R, z = Math.sin(a) * R, g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -a; scene.add(g);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(.5, .7, 7, 6).translate(0, -1, 0), postM); g.add(col);   /* 낮게: 기지를 가리지 않게 */
      for (const y of [-3.6, 1.2]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(.82, .82, .32, 6).translate(0, y, 0), goldM); g.add(r); }
      const cap = new THREE.Mesh(new THREE.OctahedronGeometry(.6, 0), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x223355, roughness: .15, flatShading: true })); cap.scale.y = 1.6; cap.position.y = 3.3; g.add(cap);
      const seam = new THREE.Mesh(new THREE.PlaneGeometry(.3, 6).translate(0, -1, 0), seamM); seam.position.z = -s * .62; seam.rotation.y = s * Math.PI / 2; g.add(seam);   /* 틈을 바라보는 면 */
      const bot = new THREE.Mesh(new THREE.ConeGeometry(.7, 5, 6).rotateX(Math.PI).translate(0, -7, 0), postM); g.add(bot); }
    BASES.push({ ang, x: Math.cos(ang) * (R + BASE_D), z: Math.sin(ang) * (R + BASE_D) }); }
  onProgress(.25);

  /* ── 태어나는 곳 10곳: 받침 섬 + 하늘빛 '빛의 닻' (출구가 한가운데를 바라봄) ── */
  const keelM = new THREE.MeshStandardMaterial({ color: 0xe4ddcd, roughness: .7, metalness: .05, flatShading: true }), stepM = new THREE.MeshStandardMaterial({ color: 0xe9e3d5, roughness: .62, metalness: .06 }), stepM2 = new THREE.MeshStandardMaterial({ color: 0xdcd4c2, roughness: .68, metalness: .06 });
  const seamGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(.45, .72, 1.35), toneMapped: false });
  const mkBase = (b, full) => { const root = new THREE.Group(); root.position.set(b.x, 0, b.z); scene.add(root);
    const w = new THREE.Group(); w.position.y = BASE_Y; w.scale.setScalar(BS); const dx = -Math.cos(b.ang), dz = -Math.sin(b.ang); w.rotation.y = Math.atan2(-dz, dx); root.add(w);   /* 기지의 +x(출구) → 한가운데 쪽 */
    const pad = makePad(); w.add(pad); const star = makeGoldStar(); w.add(star); const ring = makeArena(); w.add(ring); const guards = makeGuardians(); w.add(guards);
    let mag = null; if (full) { mag = makeMag(pad, { dust: false }); w.add(mag); mag.userData.setMode(1); }
    skyTone(w);
    /* 섬 대신: 기지 아래를 마감하는 받침 — 층층이 좁아지는 흰 돌 · 금 띠 · 푸른 빛 홈 · 끝에 매달린 수정 */
    const k = new THREE.Group(); k.position.y = BASE_Y - .02; k.rotation.y = w.rotation.y; root.add(k);
    const prof = [[5.46, 0], [5.3, -.28], [4.7, -.42], [4.45, -1.05], [3.6, -1.25], [3.3, -2.05], [2.3, -2.3], [1.9, -3.25], [.95, -3.6], [.55, -4.6], [0, -5.2]].map(([x, y]) => new THREE.Vector2(x, y));
    k.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 40), keelM));
    for (const [r, y] of [[5.33, -.24], [4.5, -1.02], [3.35, -2.02], [1.95, -3.2]]) { const ring2 = new THREE.Mesh(new THREE.TorusGeometry(r, .06, 6, 64), goldM); ring2.rotation.x = Math.PI / 2; ring2.position.y = y; k.add(ring2); }
    for (let q = 0; q < 12; q++) { const a = q / 12 * Math.PI * 2, sm2 = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, 1.1), seamGlow); sm2.position.set(Math.cos(a) * 4.05, -1.15, Math.sin(a) * 4.05); sm2.rotation.y = -a + Math.PI / 2; sm2.rotation.x = .1; k.add(sm2); }
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(.42, 0), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x2a4a88, roughness: .15, flatShading: true })); tip.scale.y = 2.2; tip.position.y = -6; k.add(tip);
    /* 뒤쪽은 계단 단을 더 높이 쌓아 막음 (출구 반대쪽 반원 · 양끝은 부드럽게 낮아짐) — 높은 단 위에 금 테 · 푸른 빛 홈 */
    const back = new THREE.Group(); back.position.y = BASE_Y; back.rotation.y = w.rotation.y; root.add(back);
    for (const [r0, r1, h, span] of [[3.75, 5.45, 1.25, 1.95], [4.3, 5.45, 2.05, 1.7], [4.85, 5.45, 2.85, 1.45]]) {
      const n = 26; for (let q = 0; q < n; q++) { const a0 = Math.PI - span + q / n * span * 2, a1 = a0 + span * 2 / n, mid = (q + .5) / n * 2 - 1, hh = h * Math.min(1, (1 - Math.abs(mid)) * 4.5);   /* 양끝은 낮아지며 이어짐 */
        if (hh < .05) continue; const sh = new THREE.Shape(); sh.moveTo(Math.cos(a0) * r1, Math.sin(a0) * r1); sh.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1); sh.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0); sh.lineTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
        const g = new THREE.ExtrudeGeometry(sh, { depth: hh, bevelEnabled: false }); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, q % 2 ? stepM : stepM2); back.add(m);
        const lip = new THREE.Mesh(new THREE.BoxGeometry(.06, .05, (r1 - r0)), goldM); lip.position.set(Math.cos((a0 + a1) / 2) * (r0 + r1) / 2, hh + .02, Math.sin((a0 + a1) / 2) * (r0 + r1) / 2); lip.rotation.y = -(a0 + a1) / 2; if (q % 3 === 0) back.add(lip); }
      const edgeR = new THREE.Mesh(new THREE.TorusGeometry(r0 + .02, .035, 4, 48, span * 2 * .86), seamGlow); edgeR.rotation.x = Math.PI / 2; edgeR.rotation.z = -(Math.PI - span * .86); edgeR.position.y = h * .92; back.add(edgeR); }
    Object.assign(b, { root, w, pad, star, ring, guards, mag, dx, dz }); };
  for (let i = 0; i < NB; i++) mkBase(BASES[i], i === 0);
  const B0 = BASES[0];
  onProgress(.6);

  /* ── 태어나는 기체 (기지 0) ── */
  const stand = new THREE.Group(); B0.w.add(stand);
  const sb = await buildShip(1, 1, 'ruby', { renderer, size: SHIPL }); const bship = sb.root, bsm = sb.root.children[0]; stand.add(bship); bship.rotation.y = -Math.PI / 2;
  const shipHalf = new THREE.Box3().setFromObject(bsm).getSize(new THREE.Vector3()).y * bship.scale.x / 2;
  const birth = makeBirth(bship); B0.w.add(birth);
  onProgress(.75);
  /* ── 조이스틱으로 모는 기체 ── */
  /* 막힘: 맵 안은 자유 · 기지 안에선 판(계단 단 안쪽)과 출구 길만 · 무지개 벽과 그 바깥(우주)은 막힘 */
  const FL = 4.3 * BS - .25, EXH = 1.6;   /* 기지 판 반지름(계단 단 안쪽) · 출구 길 반 폭 */
  const baseAt = (x, z) => BASES.find(b => Math.hypot(x - b.x, z - b.z) < 6.2);
  const B = { blocked: (x, z) => { const b = baseAt(x, z);
      if (b) { const lx = (x - b.x) * b.dx + (z - b.z) * b.dz, lz = -(x - b.x) * b.dz + (z - b.z) * b.dx; return !(Math.hypot(lx, lz) < FL || (lx > 0 && Math.abs(lz) < EXH)); }   /* 계단 단에 묻히지 않게 */
      return Math.hypot(x, z) > R - .9; }, region: () => 0 };
  const fly = await makeFlight(renderer, B, [B0.x, B0.z], 0); scene.add(fly); const FS = fly.userData.S; fly.visible = false;
  const oldSh = []; fly.traverse(o => { if (o.isMesh && o.renderOrder === 1 && o.geometry.type === 'PlaneGeometry') oldSh.push(o); });
  onProgress(.9);

  /* ── 태어나기 → 튀어 나가기 (빛의 닻 순서 그대로: 탑 → 빛 물결 → 금테 별 → 정중앙에 모이는 순간 유성이 꽂힘) ── */
  let holdAt = 1e9, W0 = 0, onAt = 1e9, born = false, launchAt = 1e9, flying = false; const FILL = 1.62 / SPEED, tw = r => W0 + (WAVE_R0 - r) / SPEED;
  const wake = t0 => { W0 = t0 + GUARD.DOWN; B0.guards.userData.fire(t0); B0.ring.userData.wake(W0); B0.star.userData.fire(tw(2.55), (2.55 - 1.8) / SPEED); holdAt = tw(1.62); onAt = tw(0) - BIRTH.PRE; born = false;
    launchAt = onAt + BIRTH.PRE + 1.6; flying = false; fly.visible = false; stand.add(bship); bship.position.set(0, 0, 0); bship.rotation.set(0, -Math.PI / 2, 0); bship.visible = false; };
  /* 출발 충격 고리 */
  const shockM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uR: { value: 0 }, uI: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uR, uI; varying vec2 vP; void main(){ float r=length(vP); vec3 c=vec3(0.); for(int i=0;i<6;i++){ float w=float(i)/5.; float q=(r-uR*(1.+(w-.5)*.12))/.05; c+=(.5+.5*cos(6.2832*(w+vec3(0.,.33,.67))))*exp(-q*q); } gl_FragColor=vec4(c/3.*uI,1.); }` });
  const shock = new THREE.Mesh(new THREE.CircleGeometry(3, 96), shockM); shock.renderOrder = 9; shock.visible = false; scene.add(shock); let shockT = 9;
  const launch = t => { bship.updateMatrixWorld(true); const p = new THREE.Vector3().setFromMatrixPosition(bship.matrixWorld); bship.visible = false; birth.userData.stop();
    const head = Math.atan2(-B0.dx, -B0.dz); fly.userData.moveTo(p.x, p.z, head); fly.position.y = 0; fly.visible = true; flying = true;
    FS.armed = true; FS.dashUntil = t + .28; FS.dashVx = B0.dx * 30; FS.dashVz = B0.dz * 30; FS.dashEndK = .45;   /* 확 튀어 나감 → 기지 고리 9m를 벗어나면 보호막·가속 */
    shock.position.set(p.x - B0.dx * .8, HOVER, p.z - B0.dz * .8); shock.lookAt(shock.position.x + B0.dx, HOVER, shock.position.z + B0.dz); shockT = 0; };
  $('#again').onclick = () => wake(t + .3);

  /* ── 쏘기: 버튼을 누르고 있거나 스페이스 ── */
  let fireOn = false; const fb = $('#fire'); fb.addEventListener('pointerdown', e => { e.stopPropagation(); fireOn = true; fb.setPointerCapture(e.pointerId); }); const fu = () => { fireOn = false; }; fb.addEventListener('pointerup', fu); fb.addEventListener('pointercancel', fu);
  addEventListener('keydown', e => { if (e.code === 'Space') fireOn = true; }); addEventListener('keyup', e => { if (e.code === 'Space') fireOn = false; });
  const bolts = [], fx = []; let cool = 0;

  /* ── 카메라: 게임 시점 (각도·거리 막대) ── */
  const cfg = { ang: 45, dist: 25 }; const bind = (id, key, fmt) => { const el = $('#' + id), out = $('#' + id + 'v'); const rd = () => { cfg[key] = +el.value; out.textContent = fmt(+el.value); }; el.addEventListener('input', rd); rd(); };
  bind('ang', 'ang', v => v + '°'); bind('dist', 'dist', v => v + 'm');
  const cam = { x: B0.x, y: HOVER, z: B0.z };
  let Wd = 2, Hd = 2;
  const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); glow.uRes.value.set(Wd, Hd);
    B0.mag.userData.setPixel(Hd / 20); birth.userData.setPx(Hd); fly.userData.setPx?.(Hd / (2 * Math.tan(camera.fov * Math.PI / 360))); }
  addEventListener('resize', size); size(); bloom.setSamples(perf.st.aa ? 4 : 0);

  const v3 = new THREE.Vector3(), say = $('#where');
  let t = 0, last = performance.now(); const WARP = { r: 0, s: 0 };
  wake(.6);
  renderer.setAnimationLoop(now => { try {
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt;
    /* 기지들 */
    const on = t >= onAt, filling = t >= holdAt; if (on && !born) { born = true; bship.visible = true; birth.userData.start(t); } B0.mag.userData.setHold(filling && !flying);
    for (const b of BASES) { b.pad.userData.update(t); b.star.userData.update(t); b.ring.userData.update(t); b.guards.userData.update(t, b === B0 && on && !flying); }
    B0.mag.userData.update(t, on && !flying ? bship : null, shipHalf);
    { const LU = B0.pad.userData.lampU, q = (t - holdAt) / FILL; if (filling && q < 1.1) { LU.uIn.value = Math.max(0, 1.62 * (1 - Math.min(1, q))); LU.uInHead.value = q < 1 ? 1.4 : 0; } else { LU.uIn.value = -1; LU.uInHead.value = 0; } }
    birth.userData.update(t, dt); { const S = birth.userData.S; WARP.r = S.warpR; WARP.s = S.warpS; for (const o of [B0.pad, B0.mag, B0.star, stand]) o.position.y = S.punch; B0.star.userData.burst(S.burst); B0.ring.userData.impact(S.impR, S.impK); }
    if (!flying && t >= launchAt) launch(t);
    if (!flying && born && t > launchAt - .55) { bship.rotation.z = -.05 * Math.min(1, (t - launchAt + .55) / .3); }   /* 웅크림: 머리를 숙임 */
    /* 기체 */
    if (flying) { fly.updateMatrixWorld(true); fly.userData.update(t, dt); for (const o of oldSh) o.visible = false; }
    if (shockT < .8) { shockT += dt; shock.visible = true; shockM.uniforms.uR.value = .3 + shockT * 4.5; shockM.uniforms.uI.value = Math.max(0, 1 - shockT / .8) * 1.3; } else shock.visible = false;
    /* 쏘기 · 벽에 맞으면 무지개빛이 번짐 */
    cool -= dt; if (flying && fireOn && cool <= 0) { cool = .16; const h = FS.head, x = FS.x - Math.sin(h) * 1.2, z = FS.z - Math.cos(h) * 1.2; bolts.push({ x, z, vx: -Math.sin(h) * 40 + FS.vx * .5, vz: -Math.cos(h) * 40 + FS.vz * .5, life: 1.6 }); }
    for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i], r0 = Math.hypot(b.x, b.z); b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt; const r1 = Math.hypot(b.x, b.z);
      if (B.blocked(b.x, b.z)) { if (!baseAt(b.x, b.z) && r1 > R - 1.5) { const ka = R / r1; HITS[hitI++ % HITS.length].set(b.x * ka, HOVER + .3, b.z * ka, t); fx.push({ x: b.x * ka, z: b.z * ka, t: 0 }); } else fx.push({ x: b.x, z: b.z, t: 0 }); bolts.splice(i, 1); continue; }   /* 무지개 벽에 맞으면 무지개빛이 번짐 · 기지 계단 단엔 불꽃만 */
      if (b.life <= 0) bolts.splice(i, 1); }
    wallM.uniforms.uT.value = t; seamM.uniforms.uT.value = t;
    glow.begin();
    for (const b of bolts) glow.add(b.x, HOVER + .3, b.z, -b.vx * .04, 0, -b.vz * .04, .18, 0, [.5, 1.2, .7], 1, b.x);
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; if (f.t > .3) { fx.splice(i, 1); continue; } glow.add(f.x, HOVER + .3, f.z, 0, 0, 0, .5 + f.t * 3, 3, [1.2, 1.1, 1.3], 1 - f.t / .3); }
    glow.end(); glow.uT.value = t;
    /* 카메라 */
    let tx, tz; if (flying) { const sp = fly.children[0].position; tx = sp.x + FS.vx * .25; tz = sp.z + FS.vz * .25; } else { tx = B0.x; tz = B0.z; }
    const k = Math.min(1, dt * (flying ? 4 : 2)); cam.x += (tx - cam.x) * k; cam.z += (tz - cam.z) * k;
    const a = cfg.ang * Math.PI / 180, D = cfg.dist * (flying ? 1 : .7); camera.position.set(cam.x, cam.y + D * Math.sin(a), cam.z + D * Math.cos(a)); camera.lookAt(cam.x, cam.y, cam.z); camera.updateMatrixWorld();
    sea.position.x = cam.x; sea.position.z = cam.z; sea.material.uniforms.uT.value = t;
    { const r = Math.hypot(FS.x, FS.z); say.textContent = !flying ? '태어나는 중' : baseAt(FS.x, FS.z) ? '태어나는 곳 · 출구로 나가면 맵 안' : r > R - 25 ? '무지개 벽 가까이 · 쏘면 무지개빛이 번져요' : '맵 안 · 한가운데까지 ' + Math.round(r) + 'm'; }
    /* 별똥별이 꽂힐 때 공간 일그러짐 충격파 (시작 기지와 같은 효과) */
    if (WARP.s > 0) { B0.w.localToWorld(v3.set(0, .2, 0)); v3.project(camera); bloom.warp(v3.x * .5 + .5, v3.y * .5 + .5, WARP.r, WARP.s, Wd / Hd); } else bloom.warp(.5, .5, 0, 0, Wd / Hd);
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera);
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
  } catch (e) { console.error('[전체 맵]', e); } });
  onProgress(1);
  window.__sm = { FS, fly, BASES, cam, cfg, HITS, get t() { return t; }, get flying() { return flying; }, wake };
}
