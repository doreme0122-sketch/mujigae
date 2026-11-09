/* 전체 맵 1단계 — 태어나는 곳 + 무지개 홀로그램 벽 (사용자 2026-11-06)
   · 맵 = 동그라미 · 반지름 240m (가장자리에서 한가운데까지 20초 · 사용자 2026-11-06 다시 확정) · 바깥 고리 187~240m = 초원(meadow.js)
   · 맵 끝 = 무지개 홀로그램 벽: 늘 은은하게 보임 · 닿으면 튕기지 않고 그냥 막힘 · 총을 쏘면 맞은 자리에서 무지개빛이 표면을 따라 번짐
   · 태어나는 곳 10곳 = 벽 바깥(맵 테두리 뒤) · 출구만 벽을 뚫고 맵 안으로 이어짐 · 모두 한가운데에서 같은 거리
   · 태어나는 곳 모양 = '빛의 닻'(금테 별 판 · 수호 탑 일곱 · 계단 단 · 유성이 꽂히며 태어남)을 하늘섬에 맞게 다듬음:
     검은 건메탈 → 밝은 크림빛 돌 · 은빛 → 흰 대리석 · 금과 푸른 에너지 빛은 그대로 · 풀 덮인 받침 섬 위에 앉힘
   · 태어나 출구로 튀어 나가면 바로 조이스틱 · 기지 고리(9m)를 벗어나는 순간 보호막 3초 + 가속 5초 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11092314';
import { makePad } from '../core/hangar/pad.js?v=11092314';
import { makeMag } from '../core/hangar/mag.js?v=11092314';
import { buildShip } from '../core/ships/build.js';
import { makeGoldStar } from './goldstar.js?v=11092314';
import { makeArena, SPEED, WAVE_R0 } from './arena.js?v=11092314';
import { makeGuardians, GUARD } from './guardian.js?v=11092314';
import { makeBirth, BIRTH } from './birth.js?v=11092314';
import { makeTravel } from './travel.js?v=11092314';
import { spiralPath } from './path.js?v=11092314';
import { makePerf } from './perf.js?v=11092314';
import { makeGlow } from '../preview/glow.js';
import { makeFlight, FLY, PADZ, padZone } from './flight.js?v=11092314';
import { pedestal, gate4 } from './gates.js?v=11092314';
import { makeMeadow, MEADOW } from './meadow.js?v=11092314';
import { makeClouds } from './clouds.js?v=11092314';
import { makeLife } from './life.js?v=11092314';
import { makeJungle, jungleLayout, SANCT_TEST } from './jungle.js?v=11092314';
import { makeGimmicks } from './gimmick.js?v=11092314';
import { makeVolcano, VOLC } from './volcano.js?v=11092314';
import { autoMerge } from './automerge.js?v=11092314';

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
  const hemi = new THREE.HemisphereLight(0xb7c8e8, 0x3a3020, .85); scene.add(hemi);
  const HEMI_V = new THREE.Color(0xc8a49a).multiplyScalar(1.15), GND_V = new THREE.Color(0x4a1e10), CLR_V = new THREE.Color(0x3a1a10), SUN0C = new THREE.Color(0xfff0dc), SUN_V = new THREE.Color(0xffcfa8); let vmood = 0;   /* 화산 분위기 (원본 키트 빛: 붉은 재 하늘 · 따뜻한 해) */
  const HEMI0 = new THREE.Color(0xb7c8e8), GND0 = new THREE.Color(0x3a3020), HEMI_J = new THREE.Color(0x7a6cff), GND_J = new THREE.Color(0x3a0a4a), CLR0 = new THREE.Color(0xbcd2ea), CLR_J = new THREE.Color(0x1a1238); let mood = 0;   /* 정글 분위기 */
  const glow = makeGlow(); scene.add(glow.mesh);
  /* 아래 구름 바다 */
  /* 구름 무늬 그림 (2026-11-08 최적화: 화면 칸마다 잡음 약 29번 계산 → 미리 구운 그림 한 장에서 9번 읽기 · 무늬·흐름·겹은 그대로)
     이어 붙여도 이음매 없는 기울기 잡음(격자가 덜 드러남) · R = 다섯 겹 쌓은 구름 · G = 한 겹 */
  const seaNoise = (() => { const S = 512, P = 16, d = new Uint8Array(S * S * 4), G = [];
    for (let i = 0; i < 256 * 256; i++) { const a = Math.sin(i * 12.9898 + 78.233) * 43758.5453, an = (a - Math.floor(a)) * 6.2832; G.push(Math.cos(an), Math.sin(an)); }
    const gr = (ix, iy, per) => { ix = ((ix % per) + per) % per; iy = ((iy % per) + per) % per; let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(per, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; const k = ((h >>> 0) % 65536) * 2; return [G[k], G[k + 1]]; };
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    const pn = (x, y, per) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fade(fx), v = fade(fy);
      const dot = (gx, gy, dx, dy) => { const g = gr(ix + gx, iy + gy, per); return g[0] * dx + g[1] * dy; };
      const a = dot(0, 0, fx, fy), b = dot(1, 0, fx - 1, fy), c = dot(0, 1, fx, fy - 1), e = dot(1, 1, fx - 1, fy - 1); return (a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v) * 1.4 * .5 + .5; };
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const x = i / S * P, y = j / S * P; let s2 = 0, a = .5, f = 1, n1 = 0;
      for (let o = 0; o < 5; o++) { const v = pn(x * f + o * 3.1, y * f + o * 1.7, P * f); if (!o) n1 = v; s2 += a * v; a *= .5; f *= 2; }
      const k = (j * S + i) * 4; d[k] = Math.max(0, Math.min(255, Math.round(s2 / .97 * 255))); d[k + 1] = Math.max(0, Math.min(255, Math.round(n1 * 255))); d[k + 2] = 0; d[k + 3] = 255; }
    const t = new THREE.DataTexture(d, S, S); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t; })();
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uN: { value: seaNoise } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uT; uniform sampler2D uN; varying vec3 vW; float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      /* 구름 무늬 (사용자 2026-11-06: 네모 칸처럼 보임 → 격자가 드러나지 않는 부드러운 잡음 · 겹을 쌓고 서로 휘게 함) — 미리 구운 그림에서 읽음 */
      float n(vec2 p){ return texture2D(uN, p/16.).g; }
      float fbm(vec2 p){ return texture2D(uN, p/16.+vec2(.37,.61)).r; }
      void main(){ float rr=length(vW.xz);
        /* 하늘 → 우주: 구름 모양대로 울퉁불퉁하게 옅어지며 하늘빛이 어두워지고 별이 하나둘 · 경계를 따라 푸른 대기 빛 (사용자 2026-11-06) */
        vec2 q=vW.xz*.011; vec2 wv=vec2(fbm(q+vec2(uT*.006,0.)), fbm(q+vec2(5.2,1.3)-vec2(0.,uT*.004)));
        float c=fbm(q*1.3+wv*1.7+vec2(uT*.01,0.))*.72+fbm(q*3.3-vec2(uT*.022,uT*.012))*.28;   /* 큰 구름 덩어리는 천천히 · 잔 구름은 조금 빠르게 */
        float edge=rr-${R}.-8.-(n(vW.xz*.02)*.6+n(vW.xz*.05)*.4)*38.;                    /* 구름 가닥이 우주 쪽으로 들쭉날쭉 */
        float k=smoothstep(-6.,34.,edge);                                                  /* 0 = 하늘 · 1 = 우주 */
        float cl=smoothstep(.3+k*.4,.8+k*.15,c)*(1.-k);                                     /* 구름이 점점 옅어져 흩어짐 */
        vec3 sky=mix(vec3(.62,.72,.9),vec3(.97,.98,1.),cl);
        vec3 space=vec3(.006,.008,.018);
        vec2 g=floor(vW.xz*.35); float st=step(.985,h(g)); float tw=.55+.45*sin(uT*1.7+h(g+3.)*40.); vec2 f=fract(vW.xz*.35)-.5; float sd=exp(-dot(f,f)*60.);
        vec3 stars=vec3(.85,.9,1.)*st*tw*sd*(.5+h(g+7.)*.8)*smoothstep(.35,1.,k);
        vec3 col=mix(sky*mix(1.,.35,k),space,smoothstep(.2,1.,k))+stars;
        col+=vec3(.35,.6,1.15)*exp(-pow((k-.32)/.16,2.))*.32;                               /* 대기 빛 띠: 은은하게 */
        /* 우주 정글 아래 (반지름 약 190m 안쪽): 구름 바다가 어두운 성운빛으로 바뀜 · 구름 결 따라 빛줄기 (사용자 2026-11-07: 점점 바뀌게) */
        float jz=smoothstep(204.,150.,rr+(n(vW.xz*.018)-.5)*46.+(n(vW.xz*.06)-.5)*14.)*(1.-k);   /* 경계는 구름 결 따라 들쭉날쭉 · 넓게 번지며 바뀜 */
        vec3 neb=mix(vec3(.05,.03,.12),vec3(.32,.12,.48),cl)+vec3(.1,.55,.7)*pow(smoothstep(.55,.95,c),3.)*.6+vec3(.6,.2,.8)*pow(smoothstep(.62,.98,wv.x*c*1.6),2.)*.35;
        col=mix(col,neb,jz);
        /* 화산 지역 아래 (반지름 약 150m 안쪽): 재 구름 · 구름 틈으로 용암빛이 비침 (사용자 2026-11-09: 정글에서 화산으로 천천히) */
        float vz=smoothstep(162.,108.,rr+(n(vW.xz*.02)-.5)*40.+(n(vW.xz*.07)-.5)*12.)*(1.-k);
        vec3 ash=mix(vec3(.11,.04,.025),vec3(.38,.15,.08),cl)+vec3(1.,.32,.05)*pow(smoothstep(.45,.92,c),2.)*(.7+.3*sin(uT*.7+c*9.))+vec3(.9,.18,.03)*pow(smoothstep(.6,.98,wv.y*c*1.6),2.)*.4;
        col=mix(col,ash,vz);
        gl_FragColor=vec4(col+cl*k*vec3(.15,.18,.25)*(1.-jz),1.); }` }));
  sea.position.y = -150; scene.add(sea);   /* 아래층(−30m) 섬 밑으로 구름 바다가 깔리게 */
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
  /* ── 초원 고리 ── */
  const JL = jungleLayout({ TOP: MEADOW.TOP, UP: MEADOW.UP, DN: MEADOW.DN });   /* 정글 배치 계획을 먼저 → 초원이 경계 너머로 섬을 놓을 때 피해 감 */
  const meadow = await makeMeadow(scene, new URL('./assets/kit_meadow.glb?v=11092314', import.meta.url).href, p => onProgress(.4 + p * .4), new URL('./assets/kit_meadow_decor.glb?v=11092314', import.meta.url).href, new URL('./assets/kit_meadow_lo.glb?v=11092314', import.meta.url).href, { avoid: JL });
  const clouds = makeClouds(scene, { R0: MEADOW.R0, R1: MEADOW.R1 });   /* 층 사이 흘러가는 구름 · 기체 높이 숨는 구름 */
  const jungle = makeJungle(scene, { TOP: MEADOW.TOP, UP: MEADOW.UP, DN: MEADOW.DN, avoid: meadow.place.concat(meadow.CORR.map(c => ({ x: c[0], z: c[1], rr: c[2], layer: 'all' }))) });   /* 우주 정글 고리 (초원 안쪽) */
  const volc = /novolc/.test(location.search) ? { update() {}, setFocus() {}, blocked: () => false, peaks: [], arches: [], P: [], L: [], T: [], info: () => ({}) } : makeVolcano(scene, { jungle, TOP: MEADOW.TOP, UP: MEADOW.UP, DN: MEADOW.DN, renderer });   /* 화산 지역 고리 (정글 안쪽 85~136m · 사용자 2026-11-09) */
  /* ── 위아래 문 다섯: 흩어진 고리 문(0.8배) + 보물 던전 섬까지 뻗는 빛 띠 (위층 = 금빛 · 아래층 = 보랏빛) ── */
  const GATE_H = HOVER - MEADOW.GATE_Y, gates = [], roadMs = [];
  const roadM = () => new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uC: { value: new THREE.Color() }, uA: { value: 1 }, uT: { value: 0 }, uL: { value: 60 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 uC; uniform float uA, uT, uL; varying vec2 vU; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){ float x = vU.x * 2. - 1., s = vU.y * uL; float edge = exp(-x * x * 3.5), core = exp(-x * x * 40.);
        float flow = s - uT * 14.; float spark = step(.985, h(floor(vec2(x * 8., flow * 2.)))) * .9; float ends = smoothstep(0., .03, vU.y) * smoothstep(1., .97, vU.y);
        gl_FragColor = vec4(uC * (edge * .22 + core * .55 + spark * edge * .7) * ends * uA * .75, 1.); }` });
  const ribbon = (curve, w) => { const n = Math.ceil(curve.getLength() * 3), pos = [], uv = [], idx = [], up0 = new THREE.Vector3(0, 1, 0), T = new THREE.Vector3(), Bn = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i <= n; i++) { const u = i / n; curve.getPointAt(u, p); curve.getTangentAt(u, T); Bn.crossVectors(T, up0); if (Bn.lengthSq() < 1e-6) Bn.set(1, 0, 0); Bn.normalize();
      pos.push(p.x - Bn.x * w, p.y - .25, p.z - Bn.z * w, p.x + Bn.x * w, p.y - .25, p.z + Bn.z * w); uv.push(0, u, 1, u); if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; };
  for (const Gd of meadow.GATES.concat(jungle.GATES)) { const G = gate4(GATE_H / .8); G.g.scale.setScalar(.8); const root = new THREE.Group(); root.add(G.g); scene.add(root);
    /* 빛의 길: 문에서 나가 → 도착 섬 둘레를 감아 돌며 천천히 오르내림 → 섬 가장자리 돌아가는 문에 수평으로 닿음 (path.js · 사용자 2026-11-07: 가파르면 재미없음) */
    const y0 = HOVER, y1 = Gd.ty + (HOVER - MEADOW.TOP), SP = spiralPath({ gx: Gd.x, gz: Gd.z, tx: Gd.tx, tz: Gd.tz, rad: Gd.rad, gr: Gd.gr || 7.5, y0, y1, dir: Gd.dir || 1 });
    const pts = SP.pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), e = pts[pts.length - 1], ex = e.x, ez = e.z;
    let ax = pts[2].x - pts[0].x, az = pts[2].z - pts[0].z; { const l = Math.hypot(ax, az) || 1; ax /= l; az /= l; }
    let eax = e.x - pts[pts.length - 3].x, eaz = e.z - pts[pts.length - 3].z; { const l = Math.hypot(eax, eaz) || 1; eax /= l; eaz /= l; }   /* 도착 문이 바라볼 쪽 = 길이 들어오는 쪽 */
    root.position.set(Gd.x, MEADOW.GATE_Y, Gd.z); root.rotation.y = Math.atan2(-ax, -az);   /* 고리가 빛의 길 쪽을 바라봄 */
    const curve = new THREE.CatmullRomCurve3(pts), rm = roadM(), col = Gd.layer === 'up' ? new THREE.Color(1.15, .82, .35) : new THREE.Color(.75, .45, 1.2);
    rm.uniforms.uC.value.copy(col); rm.uniforms.uL.value = curve.getLength(); roadMs.push(rm);
    const road = new THREE.Mesh(ribbon(curve, 1.1), rm); road.renderOrder = 8; road.frustumCulled = false; scene.add(road);
    gates.push({ G, x: Gd.x, z: Gd.z, ax, az, eax, eaz, col, Gd, curve, len: curve.getLength(), y1, ex, ez, ch: 0, stay: 0 }); }   /* 문 타고 오르내리기(travel.js)가 쓰는 길 정보 */
  const gateBlocked = (x, z) => { for (const g of gates) { const dx = x - g.x, dz = z - g.z; if (dx > 4 || dx < -4 || dz > 4 || dz < -4) continue; const along = dx * g.ax + dz * g.az, lat = Math.abs(dx * -g.az + dz * g.ax); if (Math.abs(along) < .5 && lat > 1.9 && lat < 3.0) return true; } return false; };   /* 고리 돌 조각은 기체를 막음 */
  const life = makeLife(scene, meadow, { R0: MEADOW.R0, R1: MEADOW.R1 });   /* 새 떼 · 나비 · 꽃가루 · 폭포 물보라 · 떨어지는 돌 */
  onProgress(.82);
  /* ── 조이스틱으로 모는 기체 ── */
  /* 막힘: 맵 안은 자유 · 기지 안에선 판(계단 단 안쪽)과 출구 길만 · 무지개 벽과 그 바깥(우주)은 막힘 */
  const FL = 4.3 * BS - .25, EXH = 1.6;   /* 기지 판 반지름(계단 단 안쪽) · 출구 길 반 폭 */
  const baseAt = (x, z) => BASES.find(b => Math.hypot(x - b.x, z - b.z) < 6.2);
  const baseBlocked = (x, z) => { const b = baseAt(x, z); if (!b) return false; const lx = (x - b.x) * b.dx + (z - b.z) * b.dz, lz = -(x - b.x) * b.dz + (z - b.z) * b.dx; return !(Math.hypot(lx, lz) < FL || (lx > 0 && Math.abs(lz) < EXH)); };
  /* 파란 높이선(막힘 안내)은 없앰: 섬·바위·나무 어디에도 안 막히니 안내할 막힘이 없음 */
  let travel = null, visU = 0, visD = 0;
  const B = { blocked: (x, z) => { if (travel && travel.mode !== 'mid') return travel.blocked(x, z);   /* 길 타는 중엔 안 막힘 · 도착 섬에선 그 섬 땅 밖이 막힘 */ const b = baseAt(x, z);
      if (b) { const lx = (x - b.x) * b.dx + (z - b.z) * b.dz, lz = -(x - b.x) * b.dz + (z - b.z) * b.dx; return !(Math.hypot(lx, lz) < FL || (lx > 0 && Math.abs(lz) < EXH)); }   /* 계단 단에 묻히지 않게 */
      return Math.hypot(x, z) > R - .9 || gateBlocked(x, z) || (volc && volc.blocked && volc.blocked(x, z)) || jungle.blocked(x, z); }, region: () => 0 };   /* 섬·바위·나무는 모두 통과 (기믹 도구만 몸으로 닿음) · 남는 막힘: 바깥 무지개 벽·출발 기지·길 문 돌 */
  const fly = await makeFlight(renderer, B, [B0.x, B0.z], 0); scene.add(fly); const FS = fly.userData.S; fly.visible = false;
  const oldSh = []; fly.traverse(o => { if (o.isMesh && o.renderOrder === 1 && o.geometry.type === 'PlaneGeometry') oldSh.push(o); });
  /* 기체는 한 대만 (사용자 2026-11-06): 조이스틱으로 모는 그 기체가 태어나는 동안엔 기지 판 위(기지 안)에 앉아 있다가, 태어나면 그대로 이어서 몬다 */
  const bship = fly.children[0], S0 = bship.scale.x, bsm = bship.children[0];
  const shipHalf = new THREE.Box3().setFromObject(bship).getSize(new THREE.Vector3()).y / BS / 2;   /* 기지 단위로 */
  const birth = makeBirth(bship); B0.w.add(birth);
  const AM = autoMerge(B0.w); AM.done = null;
  travel = makeTravel({ scene, gates, meadow, jungle, fly, ship: bship, FS, HOVER, GATE_H });   /* 문 타고 오르내리기 */
  /* 가려진 기체 (사용자 2026-11-06: 섬이 기체를 가리면 그냥 가려지게 두고 기체가 거기 있다는 걸 보여 줌 → 깊이감):
     가려진 부분만 기체 모양 그대로 은은하게 빛나는 윤곽 — 앞에 무언가 있을 때만 그려짐(깊이를 거꾸로 비교) */
  const xrayM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthFunc: THREE.GreaterDepth, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    uniforms: { uT: { value: 0 }, uH: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uT, uH; varying vec3 vN; varying vec3 vV; void main(){ float f = 1. - abs(dot(normalize(vN), normalize(vV))), rim = f * f; vec3 c = mix(vec3(1., .5, .42), vec3(1., .92, .85), rim), g = mix(vec3(.35, .9, .55), vec3(.8, 1., .85), rim); float br = (.7 + rim * 1.6) * (.9 + .1 * sin(uT * 4.)); c = mix(c * br, g * (.8 + rim * 1.6) * (.85 + .15 * sin(uT * 1.6)), uH); gl_FragColor = vec4(c, mix(.55 + rim * .45, .55 + rim * .45, uH)); }' });   /* uH: 숲에 숨으면 옅은 초록 반투명 실루엣(숨 쉬듯 천천히 일렁) · 지형 지나감은 따뜻한 빛 윤곽 — 색으로 구분 (사용자 2026-11-08) */
  { const xr = []; bship.traverse(o => { if (o.isMesh && o.geometry && o.geometry.attributes.normal) xr.push(o); });   /* 벽 너머 비침: 기체 모양 전체를 한 덩어리로 (부품마다 따로 그리던 것 → 한 번) */
    bsm.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(bsm.matrixWorld).invert();
    const parts = xr.map(o => { const g = new THREE.BufferGeometry(), src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry; g.setAttribute('position', src.attributes.position.clone()); g.setAttribute('normal', src.attributes.normal.clone()); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); return g; });
    const mg = mergeGeometries(parts, false); parts.forEach(g => g.dispose()); const m = new THREE.Mesh(mg, xrayM); m.renderOrder = 60; m.frustumCulled = false; m.name = 'xray'; bsm.add(m); }
  onProgress(.9);

  /* ── 태어나기 → 튀어 나가기 (빛의 닻 순서 그대로: 탑 → 빛 물결 → 금테 별 → 정중앙에 모이는 순간 유성이 꽂힘) ── */
  let holdAt = 1e9, W0 = 0, onAt = 1e9, born = false, launchAt = 1e9, flying = false; const FILL = 1.62 / SPEED, tw = r => W0 + (WAVE_R0 - r) / SPEED;
  const wake = t0 => { travel?.reset(); W0 = t0 + GUARD.DOWN; B0.guards.userData.fire(t0); B0.ring.userData.wake(W0); B0.star.userData.fire(tw(2.55), (2.55 - 1.8) / SPEED); holdAt = tw(1.62); onAt = tw(0) - BIRTH.PRE; born = false;
    launchAt = onAt + BIRTH.PRE + 1.0;   /* 태어나 빛이 걷히면 바로 조이스틱 (자동으로 튀어 나가는 장면 없음 · 사용자 2026-11-06) */ flying = false; fly.visible = false; stand.add(bship); bship.scale.setScalar(S0 / BS); bship.position.set(0, 0, 0); bship.rotation.set(0, -Math.PI / 2, 0); bship.visible = false; };
  /* 출발 충격 고리 */
  const shockM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uR: { value: 0 }, uI: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uR, uI; varying vec2 vP; void main(){ float r=length(vP); vec3 c=vec3(0.); for(int i=0;i<6;i++){ float w=float(i)/5.; float q=(r-uR*(1.+(w-.5)*.12))/.05; c+=(.5+.5*cos(6.2832*(w+vec3(0.,.33,.67))))*exp(-q*q); } gl_FragColor=vec4(c/3.*uI,1.); }` });
  const shock = new THREE.Mesh(new THREE.CircleGeometry(3, 96), shockM); shock.renderOrder = 9; shock.visible = false; scene.add(shock); let shockT = 9;
  const launch = t => { bship.updateMatrixWorld(true); const p = new THREE.Vector3(), q = new THREE.Quaternion(); bship.getWorldPosition(p); bship.getWorldQuaternion(q); birth.userData.stop();
    const yaw = new THREE.Euler().setFromQuaternion(q, 'YXZ').y;   /* 판 위에 있던 그대로의 자리 · 높이 · 방향에서 이어 몬다 */
    fly.add(bship); bship.scale.setScalar(S0); bship.visible = true; fly.userData.moveTo(p.x, p.z, yaw); fly.position.y = p.y - HOVER; flyY = fly.position.y; fly.visible = true; flying = true;
    FS.armed = true; FS.vx = FS.vz = 0; };   /* 기지 고리 9m를 벗어나면 보호막 3초 · 가속 5초 */
  /* ── 죽음 → 기다림 → 다시 태어남 (사용자 2026-11-07):
        죽는 순간 그 자리에 카메라가 머물고 화면이 살짝 어두워짐 · 기다리는 동안 둘러보기로 맵을 자유롭게 봄
        기다리는 시간 = 5초 + 레벨당 1초 (최대 20초 · 이미 정한 규칙) · 태어나는 순서(탑 → 빛 물결 → 금테 별 → 유성)가 시작될 때 카메라가 태어나는 곳으로 바로 넘어감 */
  let LV = 1, dead = false, reviveAt = 0;
  const dim = document.createElement('div'); dim.style.cssText = 'position:fixed;inset:0;pointer-events:none;background:rgba(6,8,18,.42);opacity:0;transition:opacity .6s;z-index:2'; document.body.appendChild(dim);
  const die = () => { if (dead) return; dead = true; reviveAt = t + Math.min(20, 5 + LV); travel.reset(); flying = false; fly.visible = false; bolts.length = 0; FS.noPad = true; dim.style.opacity = '1'; holdAt = onAt = launchAt = 1e9; };
  const gim = makeGimmicks(scene, { meadow, jungle, volc, fly, bship, R, gates, bases: BASES, die: () => die(), hoverY: HOVER });   /* 숨는 숲 · 바람길 · 포식 꽃 · 해파리 · 포자 늪 · 체력 */
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
  const revive = () => { dead = false; FS.noPad = false; gim.reset(); dim.style.opacity = '0'; look.x = look.z = 0; cam.x = B0.x; cam.z = B0.z; cam.y = HOVER; camD = cfg.dist * .7; wake(t + .3); };   /* 카메라가 태어나는 곳으로 바로 */
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
  addEventListener('pointerdown', e => { if (e.target.closest('#ui') || e.target.closest('#fire')) return; if (padZone(e.clientX, e.clientY) && flying && !dead) zoneHit('pad', true); }, true);
  addEventListener('pointerup', () => { if (look.id === null) zoneHit(null, false); }, true);
  addEventListener('pointerdown', e => { if (look.id !== null || e.target.closest('#ui') || e.target.closest('#fire')) return; if (!dead && flying && padZone(e.clientX, e.clientY)) return;   /* 조이스틱 칸만 빼고 어디든 끌면 둘러보기 */
    zoneHit(padZone(e.clientX, e.clientY) && !dead && flying ? 'pad' : 'map', true);
    look.id = e.pointerId; look.px = e.clientX; look.py = e.clientY; look.pt = performance.now(); });
  addEventListener('pointermove', e => { if (e.pointerId !== look.id) return; const now = performance.now(), dx = e.clientX - look.px, dy = e.clientY - look.py, sp = Math.hypot(dx, dy) / Math.max(1, now - look.pt) * 1000;
    const r = canvas.getBoundingClientRect(), mpp = 2 * camD * Math.tan(camera.fov * Math.PI / 360) / Math.max(1, r.height), fast = 1 + Math.min(2.5, sp / 900), a = cfg.ang * Math.PI / 180;
    look.x -= dx * mpp * fast; look.z -= dy * mpp * fast / Math.max(.35, Math.sin(a)); const l = Math.hypot(look.x, look.z); if (l > 160) { look.x *= 160 / l; look.z *= 160 / l; }
    look.px = e.clientX; look.py = e.clientY; look.pt = now; });
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
  /* 폰에서 무게 재기 (사용자 2026-11-08: 보물 성소에서 48프레임) — 하나씩 끄면서 오른쪽 위 프레임 숫자를 봄. 실제 게임에선 뺄 시험용 */
  { const box = document.querySelector('#view'); if (box) { const row = document.createElement('div'); row.style.cssText = 'display:flex;margin-top:4px';
      const BS = 'font-size:11px;padding:5px 7px;border:1px solid rgba(185,255,74,.4);border-radius:9px;color:#e8ffd0;background:rgba(20,40,10,.45)', head = document.createElement('button'); head.type = 'button'; head.style.cssText = BS + ';width:100%'; head.textContent = '무게 재기 ▾'; const inner = document.createElement('div'); inner.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px'; inner.hidden = true;
      head.onclick = () => { inner.hidden = !inner.hidden; head.textContent = inner.hidden ? '무게 재기 ▾' : '무게 재기 ▴'; };
      const xr = () => { const o = []; bsm.traverse(q => { if (q.name === 'xray') o.push(q); }); return o; }, seaV = { on: true };
      const T = [['성소', () => SANCT_TEST.all, v => SANCT_TEST.set('all', v)], ['빛기둥', () => SANCT_TEST.shaft, v => SANCT_TEST.set('shaft', v)], ['빛 폭포', () => SANCT_TEST.fall, v => SANCT_TEST.set('fall', v)],
        ['작은 빛·안개', () => SANCT_TEST.glow, v => SANCT_TEST.set('glow', v)], ['잎·풀', () => SANCT_TEST.leaf, v => SANCT_TEST.set('leaf', v)], ['빛 계산 칸마다', () => !SANCT_TEST.vlit, v => SANCT_TEST.set('vlit', !v)],
        ['다른 섬', () => !globalThis.__HIDE_OTHER, v => { globalThis.__HIDE_OTHER = !v; }], ['기체 비침', () => xr().every(o => o.visible), v => xr().forEach(o => o.visible = v)], ['구름 바다', () => seaV.on, v => { seaV.on = v; sea.visible = v; }]];
      for (const [label, get, set] of T) { const b = document.createElement('button'); b.type = 'button'; b.style.cssText = BS; const draw = () => { b.textContent = `${label} ${get() ? '켬' : '끔'}`; b.style.opacity = get() ? 1 : .5; }; b.onclick = () => { set(!get()); draw(); }; draw(); inner.append(b); }
      row.append(head); box.append(row, inner); } }
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); glow.uRes.value.set(Wd, Hd);
    B0.mag.userData.setPixel(Hd / 20); birth.userData.setPx(Hd); fly.userData.setPx?.(Hd / (2 * Math.tan(camera.fov * Math.PI / 360))); life.setPx(Hd / (2 * Math.tan(camera.fov * Math.PI / 360))); }
  addEventListener('resize', size); size(); bloom.setSamples(perf.st.aa ? 4 : 0);

  const v3 = new THREE.Vector3(), say = $('#where');
  let t = 0, last = performance.now(), camD = 25 * .7; const WARP = { r: 0, s: 0 };
  wake(.6);
  const CPU = { a: 0, b: 0, n: 0, tt: 0, el: null };   /* 폰 무게 재기: 한 장면에서 계산(움직임·판정) 시간 · 그리기 명령 시간 */
  renderer.setAnimationLoop(now => { try { const c0 = performance.now();
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt;
    /* 기지들 */
    const on = t >= onAt, filling = t >= holdAt; if (on && !born) { born = true; bship.visible = true; birth.userData.start(t); } B0.mag.userData.setHold(filling && !flying);
    for (const b of BASES) { b.pad.userData.update(t); b.star.userData.update(t); b.ring.userData.update(t); b.guards.userData.update(t, b === B0 && on && !flying); }
    B0.mag.userData.update(t, on && !flying ? bship : null, shipHalf);
    { const LU = B0.pad.userData.lampU, q = (t - holdAt) / FILL; if (filling && q < 1.1) { LU.uIn.value = Math.max(0, 1.62 * (1 - Math.min(1, q))); LU.uInHead.value = q < 1 ? 1.4 : 0; } else { LU.uIn.value = -1; LU.uInHead.value = 0; } }
    birth.userData.update(t, dt); { const S = birth.userData.S; WARP.r = S.warpR; WARP.s = S.warpS; for (const o of [B0.pad, B0.mag, B0.star, stand]) o.position.y = S.punch; B0.star.userData.burst(S.burst); B0.ring.userData.impact(S.impR, S.impK); }
    if (dead && t >= reviveAt) revive();
    if (!flying && t >= launchAt) launch(t);
    if (look.id === null) { const k = Math.min(1, dt * 3.5); look.x -= look.x * k; look.z -= look.z * k; }   /* 손 떼면 돌아옴 */
    /* 기체 */
    if (flying) travel.update(t, dt, cam);
    { const L = travel.mode === 'dest' ? travel.dest.g.Gd.layer : null, k = Math.min(1, dt * 2); jungle.setFocus(L, L ? travel.dest.g.Gd.ty : 0); volc.setFocus(L, L ? travel.dest.g.Gd.ty : 0); visU += ((L === 'up' ? 1 : 0) - visU) * k; visD += ((L === 'dn' ? 1 : 0) - visD) * k; meadow.setVisit(visU, visD); }   /* 도착한 층은 옅은 빛을 걷어 또렷하게 */
    if (flying) { if (travel.mode !== 'trip') { flyY += (travel.yOff - flyY) * Math.min(1, dt * 1.5); fly.position.y = flyY + gim.hop; } else flyY = fly.position.y; fly.updateMatrixWorld(true); fly.userData.update(t, dt);   /* 판 위 높이에서 비행 높이로 스르륵 */ for (const o of oldSh) o.visible = false; travel.pose(); }
    gim.update(t, dt, { flying, mode: travel.mode, camera, pxRatio: renderer.getPixelRatio() }); zoneTick();
    xrayM.uniforms.uH.value += ((gim.hidden() ? 1 : 0) - xrayM.uniforms.uH.value) * Math.min(1, dt * 6); xrayM.depthFunc = xrayM.uniforms.uH.value > .5 ? THREE.AlwaysDepth : THREE.GreaterDepth;   /* 숨는 동안은 기체 전체를 초록 실루엣으로 (나무에 가린 곳도 · 안 가린 곳도) */
    { const sp = flying ? bship.getWorldPosition(v3) : v3.set(cam.x, cam.y, cam.z); sight.position.set(sp.x, sp.y - .2, sp.z); sightU.uOn.value += ((flying || dead ? 1 : 0) - sightU.uOn.value) * Math.min(1, dt * 1.5); sightU.uT.value = t; }
    if (shockT < .8) { shockT += dt; shock.visible = true; shockM.uniforms.uR.value = .3 + shockT * 4.5; shockM.uniforms.uI.value = Math.max(0, 1 - shockT / .8) * 1.3; } else shock.visible = false;
    /* 쏘기 · 벽에 맞으면 무지개빛이 번짐 */
    cool -= dt; if (flying && travel.mode !== 'trip' && fireOn && cool <= 0) { cool = .16; const h = FS.head, x = FS.x - Math.sin(h) * 1.2, z = FS.z - Math.cos(h) * 1.2; bolts.push({ x, z, vx: -Math.sin(h) * 40 + FS.vx * .5, vz: -Math.cos(h) * 40 + FS.vz * .5, life: 1.6 }); }
    for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i], r0 = Math.hypot(b.x, b.z); b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt; const r1 = Math.hypot(b.x, b.z);
      if (B.blocked(b.x, b.z)) { if (!baseAt(b.x, b.z) && r1 > R - 1.5) { const ka = R / r1; HITS[hitI++ % HITS.length].set(b.x * ka, HOVER + .3, b.z * ka, t); fx.push({ x: b.x * ka, z: b.z * ka, t: 0 }); } else fx.push({ x: b.x, z: b.z, t: 0 }); bolts.splice(i, 1); continue; }   /* 무지개 벽에 맞으면 무지개빛이 번짐 · 기지 계단 단엔 불꽃만 */
      if (b.life <= 0) bolts.splice(i, 1); }
    wallM.uniforms.uT.value = t; seamM.uniforms.uT.value = t; xrayM.uniforms.uT.value = t; for (const g of gates) g.G.update(t, 1, g.col, dt, g.ch); for (const m of roadMs) m.uniforms.uT.value = t; wallM.uniforms.uP.value.set(flying ? FS.x : B0.x, flying ? FS.z : B0.z);
    glow.begin();
    travel.glowTrail(glow, bship.position);
    for (const b of bolts) glow.add(b.x, HOVER + travel.yOff + .3, b.z, -b.vx * .04, 0, -b.vz * .04, .18, 0, [.5, 1.2, .7], 1, b.x);
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; if (f.t > .3) { fx.splice(i, 1); continue; } glow.add(f.x, HOVER + travel.yOff + .3, f.z, 0, 0, 0, .5 + f.t * 3, 3, [1.2, 1.1, 1.3], 1 - f.t / .3); }
    glow.end(); glow.uT.value = t;
    if (!AM.done) { AM.watch(); if (flying && t > launchAt + 3) { AM.done = AM.merge(); } }   /* 출발 기지: 태어나는 장면부터 지켜보고 한 번도 안 움직인 부품만 재질마다 합침 (그리기 횟수 줄이기 · 2026-11-09) */
    /* 카메라 */
    let tx, tz; if (flying) { const sp = bship.position; tx = sp.x + FS.vx * .25; tz = sp.z + FS.vz * .25; } else if (dead) { tx = cam.x; tz = cam.z; } else { tx = B0.x; tz = B0.z; }   /* 죽어 있을 땐 죽은 자리에 머묾 */
    if (!(flying && travel.camera(cam, bship.position, dt))) { const k = Math.min(1, dt * (flying ? 4 : 2)); cam.x += (tx - cam.x) * k; cam.z += (tz - cam.z) * k; }   /* 길 타는 동안은 travel이 카메라를 이끎 · 그 밖엔 높이만 층을 따라감 */
    if (!dead) camD += (cfg.dist * (flying ? 1 : .7) - camD) * Math.min(1, dt * 1.2);   /* 태어나는 동안 가까이 → 몰기 시작하면 천천히 물러남 */
    const a = cfg.ang * Math.PI / 180, D = camD, vx = cam.x + look.x, vz = cam.z + look.z; camera.position.set(vx, cam.y + D * Math.sin(a), vz + D * Math.cos(a)); camera.lookAt(vx, cam.y, vz); camera.updateMatrixWorld();   /* 둘러보기만큼 옮겨 봄 */
    { const sr = Math.hypot(flying ? FS.x : cam.x, flying ? FS.z : cam.z), jk = THREE.MathUtils.smoothstep(196 - sr, 0, 26);   /* 정글 안쪽으로 들어갈수록 */
      const vk = THREE.MathUtils.smoothstep(150 - sr, 0, 34);   /* 정글 안쪽 화산 지역으로 갈수록 (경계 150m부터 116m까지 천천히) */
      mood += (jk - mood) * Math.min(1, dt * 1.5); vmood += (vk - vmood) * Math.min(1, dt * 1.5); sun.intensity = 2.8 * (1 - mood * .6) * (1 - vmood) + 2.2 * vmood; sun.color.copy(SUN0C).lerp(SUN_V, vmood); hemi.color.copy(HEMI0).lerp(HEMI_J, mood).lerp(HEMI_V, vmood); hemi.groundColor.copy(GND0).lerp(GND_J, mood).lerp(GND_V, vmood); hemi.intensity = .85 + vmood * .55; scene.environmentIntensity = .7 - vmood * .5;
      renderer.setClearColor(CLR0.clone().lerp(CLR_J, mood).lerp(CLR_V, vmood), 1); meadow.setMood?.(mood); }
    sea.position.x = cam.x + look.x; sea.position.z = cam.z + look.z; sea.material.uniforms.uT.value = t; meadow.update(v3.set(cam.x + look.x, HOVER, cam.z + look.z), camera, t); clouds.update(t, v3.set(flying ? FS.x : cam.x, HOVER + travel.yOff, flying ? FS.z : cam.z), camera.position); jungle.update(t, dt, camera); volc.update(t, dt, camera); life.update(t, dt, v3, camera.position);
    { const r = Math.hypot(FS.x, FS.z), ts = flying && travel.status(); say.textContent = dead ? `다시 태어나기까지 ${Math.max(1, Math.ceil(reviveAt - t))}초 · 화면을 끌어 맵을 둘러보세요` : flying && gim.status() ? gim.status() : ts ? ts : !flying ? '태어나는 중' : baseAt(FS.x, FS.z) ? '태어나는 곳 · 출구로 나가면 맵 안' : r > R - 25 ? '초원 · 무지개 벽 가까이 · 쏘면 무지개빛이 번져요' : (r > MEADOW.R0 ? '초원' : r > VOLC.R1 ? '우주 정글' : r > VOLC.R0 - 4 ? '화산 지역' : '맵 안') + (clouds.inCloud(FS.x, FS.z) ? ' · 구름 속에 숨음' : '') + ' · 한가운데까지 ' + Math.round(r) + 'm'; }
    /* 별똥별이 꽂힐 때 공간 일그러짐 충격파 (시작 기지와 같은 효과) */
    if (WARP.s > 0) { B0.w.localToWorld(v3.set(0, .2, 0)); v3.project(camera); bloom.warp(v3.x * .5 + .5, v3.y * .5 + .5, WARP.r, WARP.s, Wd / Hd); } else bloom.warp(.5, .5, 0, 0, Wd / Hd);
    const c1 = performance.now(); renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera); CPU.calls = renderer.info.render.calls;
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
    { const c2 = performance.now(); CPU.a += c1 - c0; CPU.b += c2 - c1; CPU.n++; CPU.tt += dt; if (CPU.tt > .5) { if (!CPU.el) { CPU.el = document.createElement('div'); CPU.el.style.cssText = 'position:absolute;top:calc(env(safe-area-inset-top,0px) + 50px);left:max(18px,env(safe-area-inset-left,0px));font-size:11px;color:rgba(185,255,74,.85);pointer-events:none;font-family:monospace'; document.querySelector('#ui').append(CPU.el); }
        CPU.el.textContent = `계산 ${(CPU.a / CPU.n).toFixed(1)}ms · 그리기 명령 ${(CPU.b / CPU.n).toFixed(1)}ms · 그리기 ${CPU.calls}번`; CPU.a = CPU.b = CPU.n = CPU.tt = 0; } }
  } catch (e) { console.error('[전체 맵]', e); } });
  onProgress(1);
  window.__sm = { THREE, scene, renderer, camera, perf, travel, gates, meadow, clouds, life, jungle, volc, gim, info: () => ({ ...meadow.info(), drawCalls: renderer.info.render.calls, gpuTris: renderer.info.render.triangles }), FS, fly, BASES, cam, cfg, HITS, get t() { return t; }, get flying() { return flying; }, wake };
}
