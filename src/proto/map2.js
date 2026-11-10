/* 새 하늘 맵 (사용자 2026-11-09: 처음부터 다시 · 아주 가볍게 · 퀄리티 좋게)
   · 옛 하늘 맵(지금은 지움)에서 무지개 벽 · 태어나는 곳(기지 10곳 · 빛의 닻 · 태어나는 장면)만 그대로 옮김 · 초원·정글·화산·구름·생물·문·기믹은 가져오지 않음
   · 원칙: 로딩 때 미리 다 준비(칠 계산법 미리 만들기 · 조각 합치기) → 게임 중엔 가볍게 · 맵 몫 = 그림 150번 · 삼각형 30만 개
   · 화면 무게 재기 칸에서 부분마다 끄고 켜며 폰에서 프레임을 숫자로 확인 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11102301';
import { makePad } from '../core/hangar/pad.js?v=11102301';
import { makeMag } from '../core/hangar/mag.js?v=11102301';
import { makeForgeShip, forgeList } from './forgeship.js?v=11102301';
import { makeGoldStar } from './goldstar.js?v=11102301';
import { makeArena, SPEED, WAVE_R0 } from './arena.js?v=11102301';
import { makeGuardians, GUARD } from './guardian.js?v=11102301';
import { makeBirth, BIRTH } from './birth.js?v=11102301';
import { makePerf } from './perf.js?v=11102301';
import { autoMerge } from './automerge.js?v=11102301';
import { makeGlow } from '../preview/glow.js';
import { makeFlight, FLY, PADZ, padZone } from './flight.js?v=11102301';

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
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0x04060f, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(20, 1, .5, 1600), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .7; pm.dispose(); }
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.8); sun.position.set(-9, 14, -8); scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xb7c8e8, 0x3a3020, .85); scene.add(hemi);
  const glow = makeGlow(); scene.add(glow.mesh);
  /* 우주 (사용자 2026-11-09: 아래 구름 대신 우주) — 바탕·성운은 로딩 때 그림 한 장에 미리 굽고, 별은 화면 점 크기로 그려 좁은 시야에서도 또렷 · 카메라를 감싼 공 하나(그리기 1번)
     · 깊은 검푸른 바탕 · 옅은 성운(푸른 보라 · 청록 · 아주 옅은 분홍)이 번짐 · 별 크기·밝기 제각각 · 밝은 별만 은은하게 반짝 */
  const spaceTex = (() => { const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); let sd = 7;
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#060a1c'); bg.addColorStop(.5, '#04060f'); bg.addColorStop(1, '#03040b'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    const cloud = (x, y, r, col, a) => { for (const dx of [-W, 0, W]) { const gr = g.createRadialGradient(x + dx, y, 0, x + dx, y, r); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(.45, `rgba(${col},${a * .42})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x + dx - r, y - r, r * 2, r * 2); } };
    for (const [cx, cy, sp, col, n] of [[.22, .62, .16, '70,80,190', 70], [.58, .7, .2, '40,140,170', 60], [.83, .55, .13, '150,70,170', 45], [.4, .45, .1, '90,60,180', 35]])
      for (let i = 0; i < n; i++) { const a = rnd() * 6.28, d = Math.pow(rnd(), .7) * sp; cloud((cx + Math.cos(a) * d * 1.6) * W, (cy + Math.sin(a) * d) * H, (10 + rnd() * 45) * (1 - d / sp * .5), col, .035 + rnd() * .05); }   /* 성운: 옅은 빛 덩이를 겹겹이 */
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx; })();
  const space = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false, uniforms: { map: { value: spaceTex }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform sampler2D map; uniform float uT; varying vec2 vU;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      vec3 stars(vec2 N, float pr, float sz0, float br){ vec2 g = vU * N, id = floor(g), f = fract(g); if (h(id) > pr) return vec3(0.);   /* 칸마다 별 하나일 수도 · 크기는 화면 점 기준이라 좁은 시야에서도 늘 또렷 */
        vec2 p = vec2(.15) + .7 * vec2(h(id + 1.3), h(id + 7.7)); vec2 dp = (f - p) / max(fwidth(g), vec2(1e-5)); float b = pow(h(id + 3.1), 5.), sz = sz0 + b * 1.6, k = exp(-dot(dp, dp) / (sz * sz));
        float tw = 1. + .5 * sin(uT * (1. + h(id + 9.1) * 2.5) + h(id) * 60.) * step(.35, b);   /* 밝은 별만 은은하게 반짝 */
        vec3 col = mix(vec3(.75, .82, 1.), vec3(1., .88, .76), step(.85, h(id + 5.5))); return col * k * (.25 + b * 2.4) * tw * br; }
      void main(){ vec3 c = pow(texture2D(map, vU).rgb, vec3(2.2));   /* 바탕 · 성운 (그림 한 장) */
        c += stars(vec2(1300., 650.), .055, .7, .65) + stars(vec2(3000., 1500.), .025, .5, .25);   /* 별 두 겹: 드문 밝은 별 · 촘촘하고 흐린 별 */
        gl_FragColor = vec4(c, 1.); }` }));
  space.renderOrder = -10; space.frustumCulled = false; scene.add(space);
  onProgress(.1);

  /* ── 무지개 홀로그램 벽 ── */
  const HITS = Array.from({ length: 10 }, () => new THREE.Vector4(0, -999, 0, -99)); let hitI = 0;
  const wallM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uR: { value: R }, uGap: { value: GAPH }, uHit: { value: HITS }, uGapOn: { value: 1 }, uP: { value: new THREE.Vector2() } },
    vertexShader: 'varying vec3 vW; varying vec3 vN; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uT, uR, uGap, uGapOn; uniform vec2 uP; uniform vec4 uHit[10]; varying vec3 vW; varying vec3 vN;
      vec3 rb(float h){ return .5+.5*cos(6.2832*(h+vec3(0.,.33,.67))); }
      void main(){ float a=atan(vW.z,vW.x), st=6.2831853/10., k=a-st*floor(a/st+.5), arc=abs(k)*uR;
        float open=uGapOn>.5 ? smoothstep(uGap-.2,uGap+.7,arc) : 1.;                  /* 출구 틈 (통로 벽에는 틈 없음) */
        float u=a*uR, y=vW.y;
        vec3 V=normalize(cameraPosition-vW); float nv=abs(dot(normalize(vN),V)), fr=1.-nv; fr=fr*fr;
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
        /* 곧게 잘린 회색 띠 없애기 (사용자 2026-11-06): 아주 비스듬히 보이는 면은 부드럽게 사라짐 · 기체에서 먼 벽(맞은편 벽 등)은 옅어짐 */
        float graze=smoothstep(.03,.28,nv), far=smoothstep(170.,70.,distance(vW.xz,uP));
        gl_FragColor=vec4(col*1.15,clamp(al,0.,.9)*vf*open*graze*far); }` });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 90, 1080, 1, true).translate(0, -4, 0), wallM); wall.renderOrder = 20; wall.frustumCulled = false; scene.add(wall);
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
    const pad = makePad(); w.add(pad); const star = makeGoldStar(); w.add(star); const ring = makeArena(); w.add(ring); const guards = makeGuardians(); w.add(guards);   /* 뒤쪽은 덮어 쌓은 계단 없이, 보이지 않게 막기만 (사용자 2026-11-06) */
    let mag = null; if (full) { mag = makeMag(pad, { dust: false }); w.add(mag); mag.userData.setMode(1); }
    skyTone(w);
    /* 섬 대신: 기지 아래를 마감하는 받침 — 층층이 좁아지는 흰 돌 · 금 띠 · 푸른 빛 홈 · 끝에 매달린 수정 */
    const k = new THREE.Group(); k.position.y = BASE_Y - .02; k.rotation.y = w.rotation.y; root.add(k);
    const prof = [[5.46, 0], [5.3, -.28], [4.7, -.42], [4.45, -1.05], [3.6, -1.25], [3.3, -2.05], [2.3, -2.3], [1.9, -3.25], [.95, -3.6], [.55, -4.6], [0, -5.2]].map(([x, y]) => new THREE.Vector2(x, y));
    k.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 40), keelM));
    for (const [r, y] of [[5.33, -.24], [4.5, -1.02], [3.35, -2.02], [1.95, -3.2]]) { const ring2 = new THREE.Mesh(new THREE.TorusGeometry(r, .06, 6, 64), goldM); ring2.rotation.x = Math.PI / 2; ring2.position.y = y; k.add(ring2); }
    for (let q = 0; q < 12; q++) { const a = q / 12 * Math.PI * 2, sm2 = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, 1.1), seamGlow); sm2.position.set(Math.cos(a) * 4.05, -1.15, Math.sin(a) * 4.05); sm2.rotation.y = -a + Math.PI / 2; sm2.rotation.x = .1; k.add(sm2); }
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(.42, 0), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x2a4a88, roughness: .15, flatShading: true })); tip.scale.y = 2.2; tip.position.y = -6; k.add(tip);
    Object.assign(b, { root, w, pad, star, ring, guards, mag, dx, dz }); };
  for (let i = 0; i < NB; i++) mkBase(BASES[i], i === 0);
  const B0 = BASES[0];
  onProgress(.6);

  /* ── 태어나는 기체 (기지 0) ── */
  const stand = new THREE.Group(); B0.w.add(stand);
  onProgress(.4);
  /* ── 조이스틱으로 모는 기체 ── */
  /* 막힘: 맵 안은 자유 · 기지 안에선 판(계단 단 안쪽)과 출구 길만 · 무지개 벽과 그 바깥(우주)은 막힘 */
  const FL = 4.3 * BS - .25, EXH = 1.6;   /* 기지 판 반지름(계단 단 안쪽) · 출구 길 반 폭 */
  const baseAt = (x, z) => BASES.find(b => Math.hypot(x - b.x, z - b.z) < 6.2);
  const baseBlocked = (x, z) => { const b = baseAt(x, z); if (!b) return false; const lx = (x - b.x) * b.dx + (z - b.z) * b.dz, lz = -(x - b.x) * b.dz + (z - b.z) * b.dx; return !(Math.hypot(lx, lz) < FL || (lx > 0 && Math.abs(lz) < EXH)); };
  /* 파란 높이선(막힘 안내)은 없앰: 섬·바위·나무 어디에도 안 막히니 안내할 막힘이 없음 */
  const B = { blocked: (x, z) => { const b = baseAt(x, z);
      if (b) { const lx = (x - b.x) * b.dx + (z - b.z) * b.dz, lz = -(x - b.x) * b.dz + (z - b.z) * b.dx; return !(Math.hypot(lx, lz) < FL || (lx > 0 && Math.abs(lz) < EXH)); }   /* 계단 단에 묻히지 않게 */
      return Math.hypot(x, z) > R - .9; }, region: () => 0 };   /* 섬·바위·나무는 모두 통과 (기믹 도구만 몸으로 닿음) · 남는 막힘: 바깥 무지개 벽·출발 기지·길 문 돌 */
  /* 내 기체 = 초프리미엄 스킨 (사용자 2026-11-09) · 고른 스킨은 이 기기에 기억 · 처음엔 가장 무거운 블레이즈 드레이크 */
  const SKINS = forgeList(renderer, camera); let skinId = 'blazedrake'; try { skinId = localStorage.getItem('mj-skin') || skinId; } catch (e) {}
  const FG = await makeForgeShip(renderer, camera, Math.max(0, SKINS.findIndex(s => s.id === skinId)));
  { const sel = $('#skin'); if (sel) { for (const k of SKINS) { const o = document.createElement('option'); o.value = k.id; o.textContent = k.name; o.selected = k.id === FG.C.id; sel.append(o); }
      sel.onchange = () => { try { localStorage.setItem('mj-skin', sel.value); } catch (e) {} location.reload(); }; } }   /* 바꾸면 다시 불러옴: 새 스킨도 로딩 때 가볍게 바꿔 끼워야 해서 */
  const fly = await makeFlight(renderer, B, [B0.x, B0.z], 0, FG); scene.add(fly); const FS = fly.userData.S; fly.visible = false;
  /* 기체는 한 대만 (사용자 2026-11-06): 조이스틱으로 모는 그 기체가 태어나는 동안엔 기지 판 위(기지 안)에 앉아 있다가, 태어나면 그대로 이어서 몬다 */
  const bship = fly.children[0], S0 = bship.scale.x, bsm = bship.children[0];
  const shipHalf = new THREE.Box3().setFromObject(bship).getSize(new THREE.Vector3()).y / BS / 2;   /* 기지 단위로 */
  const birth = makeBirth(bship); B0.w.add(birth);
  /* 가려진 기체 (사용자 2026-11-06: 섬이 기체를 가리면 그냥 가려지게 두고 기체가 거기 있다는 걸 보여 줌 → 깊이감):
     가려진 부분만 기체 모양 그대로 은은하게 빛나는 윤곽 — 앞에 무언가 있을 때만 그려짐(깊이를 거꾸로 비교) */
  const xrayM = new THREE.ShaderMaterial({ transparent: false, blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, depthWrite: false, depthFunc: THREE.GreaterDepth,   /* 불투명 줄에서 기체보다 먼저 그림 (반투명 줄은 늘 기체 뒤에 그려져 기체가 자기 몸을 가린 곳까지 빛났음) */ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    uniforms: { uT: { value: 0 }, uH: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uT, uH; varying vec3 vN; varying vec3 vV; void main(){ float f = 1. - abs(dot(normalize(vN), normalize(vV))), rim = f * f; vec3 c = mix(vec3(1., .5, .42), vec3(1., .92, .85), rim), g = mix(vec3(.35, .9, .55), vec3(.8, 1., .85), rim); float br = (.7 + rim * 1.6) * (.9 + .1 * sin(uT * 4.)); c = mix(c * br, g * (.8 + rim * 1.6) * (.85 + .15 * sin(uT * 1.6)), uH); gl_FragColor = vec4(c, mix(.55 + rim * .45, .55 + rim * .45, uH)); }' });   /* uH: 숲에 숨으면 옅은 초록 반투명 실루엣(숨 쉬듯 천천히 일렁) · 지형 지나감은 따뜻한 빛 윤곽 — 색으로 구분 (사용자 2026-11-08) */
  FG.buildXray(xrayM);   /* 벽 너머 비침: 같이 움직이는 덩어리마다 윤곽 하나 (날개짓을 따라감) */
  onProgress(.9);

  /* ── 태어나기 → 튀어 나가기 (빛의 닻 순서 그대로: 탑 → 빛 물결 → 금테 별 → 정중앙에 모이는 순간 유성이 꽂힘) ── */
  let holdAt = 1e9, W0 = 0, onAt = 1e9, born = false, launchAt = 1e9, flying = false; const FILL = 1.62 / SPEED, tw = r => W0 + (WAVE_R0 - r) / SPEED;
  const wake = t0 => { W0 = t0 + GUARD.DOWN; B0.guards.userData.fire(t0); B0.ring.userData.wake(W0); B0.star.userData.fire(tw(2.55), (2.55 - 1.8) / SPEED); holdAt = tw(1.62); onAt = tw(0) - BIRTH.PRE; born = false;
    launchAt = onAt + BIRTH.PRE + 1.0;   /* 태어나 빛이 걷히면 바로 조이스틱 (자동으로 튀어 나가는 장면 없음 · 사용자 2026-11-06) */ flying = false; fly.visible = false; stand.add(bship); bship.scale.setScalar(S0 / BS); bship.position.set(0, 0, 0); bship.rotation.set(0, -Math.PI / 2, 0); bship.visible = false; };
  /* 출발 충격 고리 */
  const shockM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uR: { value: 0 }, uI: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uR, uI; varying vec2 vP; void main(){ float r=length(vP); vec3 c=vec3(0.); for(int i=0;i<6;i++){ float w=float(i)/5.; float q=(r-uR*(1.+(w-.5)*.12))/.05; c+=(.5+.5*cos(6.2832*(w+vec3(0.,.33,.67))))*exp(-q*q); } gl_FragColor=vec4(c/3.*uI,1.); }` });
  const shock = new THREE.Mesh(new THREE.CircleGeometry(3, 96), shockM); shock.renderOrder = 9; shock.visible = false; scene.add(shock); let shockT = 9;
  const launch = t => { bship.updateMatrixWorld(true); const p = new THREE.Vector3(), q = new THREE.Quaternion(); bship.getWorldPosition(p); bship.getWorldQuaternion(q); birth.userData.stop();
    const yaw = new THREE.Euler().setFromQuaternion(q, 'YXZ').y;   /* 판 위에 있던 그대로의 자리 · 높이 · 방향에서 이어 몬다 */
    fly.add(bship); bship.scale.setScalar(S0); bship.visible = true; fly.userData.respawn(p.x, p.z, yaw); fly.position.y = p.y - HOVER; flyY = fly.position.y; fly.visible = true; flying = true; };   /* 기지 고리 9m를 벗어나면 보호막 3초 · 가속 5초 */
  /* ── 죽음 → 기다림 → 다시 태어남 (사용자 2026-11-07):
        죽는 순간 그 자리에 카메라가 머물고 화면이 살짝 어두워짐 · 기다리는 동안 둘러보기로 맵을 자유롭게 봄
        기다리는 시간 = 5초 + 레벨당 1초 (최대 20초 · 이미 정한 규칙) · 태어나는 순서(탑 → 빛 물결 → 금테 별 → 유성)가 시작될 때 카메라가 태어나는 곳으로 바로 넘어감 */
  let LV = 1, dead = false, reviveAt = 0;
  const dim = document.createElement('div'); dim.style.cssText = 'position:fixed;inset:0;pointer-events:none;background:rgba(6,8,18,.42);opacity:0;transition:opacity .6s;z-index:2'; document.body.appendChild(dim);
  const die = () => { if (dead) return; dead = true; reviveAt = t + Math.min(20, 5 + LV); flying = false; fly.visible = false; bolts.length = 0; FS.noPad = true; dim.style.opacity = '1'; holdAt = onAt = launchAt = 1e9; };
  let flyY = 0;
  /* 플레이어 시야 (사용자 2026-11-08 · 예전 시야 가림처럼 부드럽게): 기체 둘레는 밝고 바깥으로 갈수록 어둑해짐
     · 칸칸이 끊기지 않게 둥글게 번짐 · 가장자리는 아주 느린 물결로 살짝 일렁여 눈이 어둠에 적응하는 느낌 · 화면 위 한 장(그리기 1번) */
  const sightU = { uOn: { value: 0 }, uT: { value: 0 }, uR0: { value: 9 }, uR1: { value: 24 } };
  const sight = new THREE.Mesh(new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: sightU, transparent: true, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uOn, uT, uR0, uR1; varying vec2 vP;
      void main(){ float d = length(vP), a = atan(vP.y, vP.x), wob = sin(a * 3. + uT * .35) * .9 + sin(a * 5. - uT * .23) * .6;
        float k = smoothstep(uR0 + wob, uR1 + wob, d); k = k * k * (3. - 2. * k);
        gl_FragColor = vec4(vec3(.004, .006, .018), k * .96 * uOn); }   /* 화면 밝기 다듬기(빛 번짐·노출)가 어둠을 많이 밝혀서 덮개는 진하게 */` }));
  sight.renderOrder = 5000; sight.frustumCulled = false; scene.add(sight);
  const revive = () => { dead = false; FS.noPad = false; dim.style.opacity = '0'; look.x = look.z = 0; cam.x = B0.x; cam.z = B0.z; cam.y = HOVER; camD = cfg.dist * .7 * CAMK; wake(t + .3); };   /* 카메라가 태어나는 곳으로 바로 */
  $('#again').onclick = () => die();
  /* ── 둘러보기 (이미 정한 방식 · 플레이 중에도 늘 됨): 버튼 없는 빈 화면(오른쪽)에서 끌면 지도를 밀듯이(오른쪽으로 밀면 카메라는 왼쪽으로) ·
        끄는 빠르기에 따라 움직이는 속도가 다름 · 손 떼면 내 기체(죽어 있을 땐 죽은 자리) 화면으로 저절로 돌아옴 · 죽어 있을 땐 화면 어디서 끌어도 됨 */
  const look = { x: 0, z: 0, id: null, px: 0, py: 0, pt: 0 };
  /* 칸 경계 표시: 조이스틱 칸(왼쪽 아래 네모)과 맵 둘러보기 칸(나머지 ㄱ자)을 옅은 점선으로 · 누른 칸만 잠깐 밝아짐 · 가만히 두면 거의 안 보임 */
  const zsv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); zsv.id = 'zones';
  zsv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;font:600 11px system-ui,sans-serif';
  zsv.innerHTML = '<path id="zMap" fill="rgba(140,200,255,0)" stroke="rgba(160,215,255,.55)" stroke-width="1.5" stroke-dasharray="7 6"/><rect id="zPad" rx="14" fill="rgba(185,255,74,0)" stroke="rgba(185,255,74,.6)" stroke-width="1.5" stroke-dasharray="7 6"/><text id="tPad" fill="rgba(200,255,120,.85)">이동 (조이스틱)</text><text id="tMap" fill="rgba(180,225,255,.85)">맵 둘러보기 (끌기)</text>';
  document.body.appendChild(zsv);
  const zP = zsv.querySelector('#zPad'), zM = zsv.querySelector('#zMap'), tP = zsv.querySelector('#tPad'), tM = zsv.querySelector('#tMap');
  const layZones = () => { const W = innerWidth, H = innerHeight, g = 6, pw = W * PADZ.w, ph = H * PADZ.h, y0 = H - ph;
    zP.setAttribute('x', g); zP.setAttribute('y', y0 + g); zP.setAttribute('width', pw - g * 2); zP.setAttribute('height', ph - g * 2);
    zM.setAttribute('d', `M${g},${g} H${W - g} V${H - g} H${pw + g} V${y0 - g} H${g} Z`);
    tP.setAttribute('x', g + 12); tP.setAttribute('y', y0 + g + 20); tM.setAttribute('x', pw + g + 12); tM.setAttribute('y', y0 - g - 8); };
  layZones(); addEventListener('resize', layZones);
  let zoneT = 0, zoneOn = null; const zoneHit = (k, on) => { if (on) { zoneOn = k; zoneT = performance.now(); } else zoneOn = null; };
  const zoneTick = () => { const idle = (performance.now() - zoneT) / 1000, show = zoneOn ? 1 : Math.max(.18, 1 - Math.max(0, idle - 1.2) * .6);   /* 손 떼고 1초 남짓 뒤 서서히 옅어짐 */
    zsv.style.opacity = show.toFixed(2); zsv.style.display = flying || dead ? '' : 'none';
    zP.setAttribute('fill', zoneOn === 'pad' ? 'rgba(185,255,74,.07)' : 'rgba(185,255,74,0)'); zM.setAttribute('fill', zoneOn === 'map' ? 'rgba(140,200,255,.06)' : 'rgba(140,200,255,0)'); };
  addEventListener('pointerdown', e => { if (e.target.closest('#ui') || e.target.closest('#fire')) return; if (padZone(e.clientX, e.clientY) && !dead) zoneHit('pad', true); }, true);
  addEventListener('pointerup', () => { if (look.id === null) zoneHit(null, false); }, true);
  addEventListener('pointerdown', e => { if (look.id !== null || e.target.closest('#ui') || e.target.closest('#fire')) return; if (!dead && padZone(e.clientX, e.clientY)) return;   /* 조이스틱 칸만 빼고 어디든 끌면 둘러보기 (태어나는 중에도 조이스틱 칸은 조이스틱만 · 사용자 2026-11-10: 태어날 때 조이스틱을 밀면 화면까지 같이 움직였음) */
    zoneHit(padZone(e.clientX, e.clientY) && !dead && flying ? 'pad' : 'map', true);
    look.id = e.pointerId; look.px = e.clientX; look.py = e.clientY; look.pt = performance.now(); });
  addEventListener('pointermove', e => { if (e.pointerId !== look.id) return; const now = performance.now(), dx = e.clientX - look.px, dy = e.clientY - look.py, sp = Math.hypot(dx, dy) / Math.max(1, now - look.pt) * 1000;
    const r = canvas.getBoundingClientRect(), mpp = 2 * camD * Math.tan(camera.fov * Math.PI / 360) / Math.max(1, r.height), fast = 1 + Math.min(2.5, sp / 900), a = cfg.ang * Math.PI / 180;
    look.x -= dx * mpp * fast; look.z -= dy * mpp * fast / Math.max(.35, Math.sin(a)); const l = Math.hypot(look.x, look.z); if (l > 160) { look.x *= 160 / l; look.z *= 160 / l; }
    look.px = e.clientX; look.py = e.clientY; look.pt = now; chk('둘러보기 끌기', `dx ${dx} dy ${dy} 한 칸 ${mpp.toFixed(3)} 빠르기 ${fast.toFixed(2)}`); });
  const lookUp = e => { if (e.pointerId === look.id) look.id = null; zoneHit(null, false); }; addEventListener('pointerup', lookUp); addEventListener('pointercancel', lookUp);

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
  /* 폰에서 무게 재기 — 하나씩 끄면서 오른쪽 위 프레임 숫자를 봄 (실제 게임에선 뺄 시험용) */
  { const box = document.querySelector('#view'); if (box) { const row = document.createElement('div'); row.style.cssText = 'display:flex;margin-top:4px';
      const BS = 'font-size:11px;padding:5px 7px;border:1px solid rgba(185,255,74,.4);border-radius:9px;color:#e8ffd0;background:rgba(20,40,10,.45)', head = document.createElement('button'); head.type = 'button'; head.style.cssText = BS + ';width:100%'; head.textContent = '무게 재기 ▾'; const inner = document.createElement('div'); inner.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px'; inner.hidden = true;
      head.onclick = () => { inner.hidden = !inner.hidden; head.textContent = inner.hidden ? '무게 재기 ▾' : '무게 재기 ▴'; };
      const xr = () => { const o = []; bsm.traverse(q => { if (q.name === 'xray') o.push(q); }); return o; };
      const vis = (L, v) => L.forEach(o => o.visible = v), others = () => BASES.filter(b => b !== B0).map(b => b.root || b.w.parent || b.w);
      const T = [['출발 기지', () => B0.w.visible, v => { B0.w.visible = v; }], ['다른 기지', () => others().every(o => o.visible), v => vis(others(), v)], ['무지개 벽', () => wall.visible, v => { wall.visible = v; }],
        ['우주', () => space.visible, v => { space.visible = v; }], ['빛 번짐', () => !!perf.st.bloom, v => { perf.st.bloom = v; }], ['기체 비침', () => xr().every(o => o.visible), v => xr().forEach(o => o.visible = v)], ['기체 효과', () => FG.getFx(), v => FG.setFx(v)], ['시야 어둠', () => sight.visible, v => { sight.visible = v; }]];
      /* 부분마다 끄고 켜며 오른쪽 위 프레임 숫자를 봄 (새 맵 2026-11-09) */
      for (const [label, get, set] of T) { const b = document.createElement('button'); b.type = 'button'; b.style.cssText = BS; const draw = () => { b.textContent = `${label} ${get() ? '켬' : '끔'}`; b.style.opacity = get() ? 1 : .5; }; b.onclick = () => { set(!get()); draw(); }; draw(); inner.append(b); }
      { const st = document.createElement('div'); st.style.cssText = 'font-size:10.5px;color:#e8ffd0;line-height:1.5;width:100%'; const n = o => o.toLocaleString();
        const xt = () => { let x = 0; bsm.traverse(q => { if (q.name === 'xray') { const g = q.geometry; x += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return x; };
        const s1 = FG.stats(); st.textContent = `기체 ${FG.C.kname.split(' · ')[0]}: 그리기 ${s1.draws}번 · 삼각형 ${n(s1.tris)}개 (원본 ${FG.before.meshes}번 · ${n(Math.round(FG.before.tris))}개) · 비침 삼각형 ${n(Math.round(xt()))}개`; inner.append(st); }   /* 기체 무게 (사용자 2026-11-09) */
      row.append(head); box.append(row, inner); } }
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); glow.uRes.value.set(Wd, Hd);
    B0.mag.userData.setPixel(Hd / 20); birth.userData.setPx(Hd); fly.userData.setPx?.(Hd / (2 * Math.tan(camera.fov * Math.PI / 360))); }
  addEventListener('resize', size); size(); bloom.setSamples(perf.st.aa ? 4 : 0);

  const v3 = new THREE.Vector3(), say = $('#where');
  const CAMK = Math.tan(20 * Math.PI / 180) / Math.tan(10 * Math.PI / 180);   /* 롤처럼 좁은 시야(20°) + 멀리서 (사용자 2026-11-09): 거리 막대 값은 예전 40° 때와 같은 넓이로 보이게 곱함 → 위쪽으로 가도 기체 크기가 거의 그대로 · 먼 섬이 덜 보여 가벼움 */
  let t = 0, last = performance.now(), camD = 25 * .7 * CAMK; const WARP = { r: 0, s: 0 };
  /* 기지 한 판 움직임 (게임 중 · 로딩 때 미리 돌려 보기에서 같이 씀) */
  const baseStep = (t, dt) => {
    const on = t >= onAt, filling = t >= holdAt; if (on && !born) { born = true; bship.visible = true; birth.userData.start(t); } B0.mag.userData.setHold(filling && !flying);
    for (const b of BASES) { b.pad.userData.update(t); b.star.userData.update(t); b.ring.userData.update(t); b.guards.userData.update(t, b === B0 && on && !flying); }
    B0.mag.userData.update(t, on && !flying ? bship : null, shipHalf);
    { const LU = B0.pad.userData.lampU, q = (t - holdAt) / FILL; if (filling && q < 1.1) { LU.uIn.value = Math.max(0, 1.62 * (1 - Math.min(1, q))); LU.uInHead.value = q < 1 ? 1.4 : 0; } else { LU.uIn.value = -1; LU.uInHead.value = 0; } }
    birth.userData.update(t, dt); { const S = birth.userData.S; WARP.r = S.warpR; WARP.s = S.warpS; for (const o of [B0.pad, B0.mag, B0.star, stand]) o.position.y = S.punch; B0.star.userData.burst(S.burst); B0.ring.userData.impact(S.impR, S.impK); }
  };
  /* 로딩 때 미리 합치기 (2026-11-09 · 그리기 횟수): 태어나는 장면을 미리 끝까지 돌려 보며 한 번도 안 움직인 부품만 부분(판·별·고리·탑·받침)마다 재질별로 합침 · 기체는 forgeship.js가 따로 합침 */
  { const AMS = []; for (const b of BASES) for (const o of [b.pad, b.star, b.ring, b.guards, b.mag, ...b.root.children.filter(c => c !== b.w)].filter(Boolean)) AMS.push(autoMerge(o));   /* 받침(흰 돌·금 띠·빛 홈·수정)도 */
    wake(.6); for (let ts = 0; ts < launchAt + 1.5; ts += .08) { baseStep(ts, .08); for (const A of AMS) A.watch(); }
    birth.userData.stop(); let saved = 0; for (const A of AMS) saved += A.merge().saved; console.log('[새 맵] 미리 합친 부품', saved); }
  wake(.6);
  /* 로딩 때 미리 준비 (태어날 때 끊김 원인: 태어나는 순간 처음 보이는 빛·유성·탑·기체의 칠 계산법과 모양을 폰이 그 자리에서 만들어서)
     · 합치기·태어날 준비까지 다 끝난 마지막 모습으로 함 (예전엔 합치기 전에 해서 합친 모양은 처음 보일 때 올렸음)
     · 숨은 것은 모두 꺼내되 숨은 불빛은 그대로 둠: 불빛 개수가 다르면 칠 계산법이 달라져, 숨은 불빛까지 켜고 만든 계산법은 게임에서 못 쓰고 태어날 때 21개를 새로 만들었음 (2026-11-10)
     · 계산법만 만들지 않고 한 번 실제로 그려 모양·그림까지 올려 둠 (화면 밖이라 빠지는 것도 그리게 잠깐 '화면 밖 빼기'를 끔) */
  { const hid = [], cull = []; scene.traverse(o => { if (!o.visible && !o.isLight) { hid.push(o); o.visible = true; } if (o.frustumCulled) { cull.push(o); o.frustumCulled = false; } });
    renderer.setRenderTarget(bloom.scene); renderer.compile(scene, camera); renderer.render(scene, camera); renderer.clear();
    const seen = new Set(); scene.traverse(o => { for (const m of [].concat(o.material || [])) { if (!m || seen.has(m)) continue; seen.add(m); for (const k of ['map', 'emissiveMap', 'alphaMap', 'normalMap', 'roughnessMap']) if (m[k]) renderer.initTexture(m[k]); if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u && u.value && u.value.isTexture) renderer.initTexture(u.value); } });
    renderer.setRenderTarget(null); hid.forEach(o => o.visible = false); cull.forEach(o => o.frustumCulled = true); }
  /* 깨진 숫자 찾기 (사용자 2026-11-10: 태어날 때 기체가 안 보이고 화면이 빈 채 '한가운데까지 NaNm' — 여기 시험기에선 안 생겨 폰에서 원인을 봐야 함)
     · 고치거나 가리지 않음: 숫자가 처음 깨진 순간 어디서 · 무엇이 · 그때 상태를 화면 아래에 글자로 남겨 둠 (사진 찍어 보내면 원인을 바로 앎) */
  const BAD = { el: null, prev: '' }, fin = v => typeof v !== 'number' || Number.isFinite(v);
  const snap = () => `t ${t.toFixed(2)} · 날기 ${flying ? 1 : 0} · 태어남 ${born ? 1 : 0} · 죽음 ${dead ? 1 : 0} · 둘러보기 ${look.x.toFixed(1)},${look.z.toFixed(1)}(${look.id === null ? '뗌' : '누름'}) · 카메라거리 ${camD.toFixed(1)} · 기체 ${FS.x.toFixed(1)},${FS.z.toFixed(1)} 속도 ${FS.vx.toFixed(1)},${FS.vz.toFixed(1)} 방향 ${FS.head.toFixed(2)}`;
  const chk = (where, extra = '') => { if (BAD.el) return;
    const bad = []; for (const [k, v] of Object.entries(FS)) if (!fin(v)) bad.push('기체.' + k);
    const V = { '판 위 기체 자리': bship.position, '판 위 기체 돌기': bship.quaternion, '판 위 기체 크기': bship.scale, '받침': stand.position, '나는 몸': fly.position, '카메라': camera.position };
    for (const [k, v] of Object.entries(V)) if (!fin(v.x) || !fin(v.y) || !fin(v.z) || (v.w !== undefined && !fin(v.w))) bad.push(k);
    for (const [k, v] of Object.entries({ '둘러보기x': look.x, '둘러보기z': look.z, '카메라 따라감x': cam.x, '카메라 따라감z': cam.z, '카메라 거리': camD, '시간': t })) if (!fin(v)) bad.push(k);
    if (!bad.length) { BAD.prev = snap(); return; }
    BAD.el = document.createElement('div'); BAD.el.style.cssText = 'position:fixed;left:8px;right:8px;bottom:calc(env(safe-area-inset-bottom,0px) + 8px);z-index:99;pointer-events:none;font:11px/1.45 monospace;color:#fff;background:rgba(150,10,30,.85);border-radius:8px;padding:6px 9px;white-space:pre-wrap';
    BAD.el.textContent = `숫자 깨짐 · 처음 깨진 곳: ${where}${extra ? ' (' + extra + ')' : ''}\n깨진 것: ${bad.join(', ')}\n바로 전 장면: ${BAD.prev}`; document.body.appendChild(BAD.el); console.error('[숫자 깨짐]', BAD.el.textContent); };
  const CPU = { a: 0, b: 0, n: 0, tt: 0, el: null };   /* 폰 무게 재기: 한 장면에서 계산(움직임·판정) 시간 · 그리기 명령 시간 */
  renderer.setAnimationLoop(now => { try { const c0 = performance.now();
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt;
    /* 기지들 */
    chk('장면 시작', 'dt ' + dt);
    baseStep(t, dt); chk('기지·태어나기');
    if (dead && t >= reviveAt) { revive(); chk('다시 태어나기'); }
    if (!flying && t >= launchAt) { launch(t); chk('튀어 나가기'); }
    if (look.id === null) { const k = Math.min(1, dt * 3.5); look.x -= look.x * k; look.z -= look.z * k; }   /* 손 떼면 돌아옴 */
    /* 기체 */
    if (flying) { fly.position.y = flyY; fly.updateMatrixWorld(true); fly.userData.update(t, dt); chk('기체 몰기'); }
    zoneTick();
    FG.step(dt, t, { moving: flying && Math.hypot(FS.vx, FS.vz) > 1.5, fire: flying && fireOn });   /* 기체 움직임: 날면 무빙 자세(날개짓 빨라짐) · 쏘면 입을 벌림 */
    { const sp = flying ? bship.getWorldPosition(v3) : v3.set(cam.x, cam.y, cam.z); sight.position.set(sp.x, sp.y - .2, sp.z); sightU.uOn.value += ((flying || dead ? 1 : 0) - sightU.uOn.value) * Math.min(1, dt * 1.5); sightU.uT.value = t; }
    if (shockT < .8) { shockT += dt; shock.visible = true; shockM.uniforms.uR.value = .3 + shockT * 4.5; shockM.uniforms.uI.value = Math.max(0, 1 - shockT / .8) * 1.3; } else shock.visible = false;
    /* 쏘기 · 벽에 맞으면 무지개빛이 번짐 */
    cool -= dt; if (flying && fireOn && cool <= 0) { cool = .16; const h = FS.head, x = FS.x - Math.sin(h) * 1.2, z = FS.z - Math.cos(h) * 1.2; bolts.push({ x, z, vx: -Math.sin(h) * 40 + FS.vx * .5, vz: -Math.cos(h) * 40 + FS.vz * .5, life: 1.6 }); }
    for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i], r0 = Math.hypot(b.x, b.z); b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt; const r1 = Math.hypot(b.x, b.z);
      if (B.blocked(b.x, b.z)) { if (!baseAt(b.x, b.z) && r1 > R - 1.5) { const ka = R / r1; HITS[hitI++ % HITS.length].set(b.x * ka, HOVER + .3, b.z * ka, t); fx.push({ x: b.x * ka, z: b.z * ka, t: 0 }); } else fx.push({ x: b.x, z: b.z, t: 0 }); bolts.splice(i, 1); continue; }   /* 무지개 벽에 맞으면 무지개빛이 번짐 · 기지 계단 단엔 불꽃만 */
      if (b.life <= 0) bolts.splice(i, 1); }
    wallM.uniforms.uT.value = t; seamM.uniforms.uT.value = t; xrayM.uniforms.uT.value = t; wallM.uniforms.uP.value.set(flying ? FS.x : B0.x, flying ? FS.z : B0.z);
    glow.begin();
    for (const b of bolts) glow.add(b.x, HOVER + .3, b.z, -b.vx * .04, 0, -b.vz * .04, .18, 0, [.5, 1.2, .7], 1, b.x);
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; if (f.t > .3) { fx.splice(i, 1); continue; } glow.add(f.x, HOVER + .3, f.z, 0, 0, 0, .5 + f.t * 3, 3, [1.2, 1.1, 1.3], 1 - f.t / .3); }
    glow.end(); glow.uT.value = t;
    /* 카메라 */
    let tx, tz; if (flying) { const sp = bship.position; tx = sp.x + FS.vx * .25; tz = sp.z + FS.vz * .25; } else if (dead) { tx = cam.x; tz = cam.z; } else { tx = B0.x; tz = B0.z; }   /* 죽어 있을 땐 죽은 자리에 머묾 */
    { const k = Math.min(1, dt * (flying ? 4 : 2)); cam.x += (tx - cam.x) * k; cam.z += (tz - cam.z) * k; }   /* 길 타는 동안은 travel이 카메라를 이끎 · 그 밖엔 높이만 층을 따라감 */
    if (!dead) camD += (cfg.dist * CAMK * (flying ? 1 : .7) - camD) * Math.min(1, dt * 1.2);   /* 태어나는 동안 가까이 → 몰기 시작하면 천천히 물러남 */
    const a = cfg.ang * Math.PI / 180, D = camD, vx = cam.x + look.x, vz = cam.z + look.z; camera.position.set(vx, cam.y + D * Math.sin(a), vz + D * Math.cos(a)); camera.lookAt(vx, cam.y, vz); camera.updateMatrixWorld();   /* 둘러보기만큼 옮겨 봄 */
    space.position.copy(camera.position); space.material.uniforms.uT.value = t;   /* 우주는 카메라를 늘 감쌈 */
    { const r = Math.hypot(FS.x, FS.z); say.textContent = dead ? `다시 태어나기까지 ${Math.max(1, Math.ceil(reviveAt - t))}초` : !flying ? '태어나는 중' : baseAt(FS.x, FS.z) ? '태어나는 곳 · 출구로 나가면 맵 안' : '새 하늘 맵 · 한가운데까지 ' + Math.round(r) + 'm'; }
    /* 별똥별이 꽂힐 때 공간 일그러짐 충격파 (시작 기지와 같은 효과) */
    if (WARP.s > 0) { B0.w.localToWorld(v3.set(0, .2, 0)); v3.project(camera); bloom.warp(v3.x * .5 + .5, v3.y * .5 + .5, WARP.r, WARP.s, Wd / Hd); } else bloom.warp(.5, .5, 0, 0, Wd / Hd);
    chk('카메라');
    FG.preRender(camera);   /* 기체 불빛 방향 · 빛 덩이 자리 */
    const c1 = performance.now(); renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera); CPU.calls = renderer.info.render.calls;
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
    { const c2 = performance.now(); CPU.a += c1 - c0; CPU.b += c2 - c1; CPU.n++; CPU.tt += dt; if (CPU.tt > .5) { if (!CPU.el) { CPU.el = document.createElement('div'); CPU.el.style.cssText = 'position:absolute;top:calc(env(safe-area-inset-top,0px) + 50px);left:max(18px,env(safe-area-inset-left,0px));font-size:11px;color:rgba(185,255,74,.85);pointer-events:none;font-family:monospace'; document.querySelector('#ui').append(CPU.el); }
        CPU.el.textContent = `계산 ${(CPU.a / CPU.n).toFixed(1)}ms · 그리기 명령 ${(CPU.b / CPU.n).toFixed(1)}ms · 그리기 ${CPU.calls}번`; CPU.a = CPU.b = CPU.n = CPU.tt = 0; } }
  } catch (e) { console.error('[전체 맵]', e); } });
  onProgress(1);
  window.__sm = { THREE, scene, renderer, camera, perf, info: () => ({ drawCalls: renderer.info.render.calls, gpuTris: renderer.info.render.triangles }), FS, fly, BASES, cam, cfg, HITS, get t() { return t; }, get flying() { return flying; }, wake };
}
