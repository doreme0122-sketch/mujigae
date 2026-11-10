/* 타겟팅 표시 디자인 시안 5가지 (사용자 2026-11-09: "고급스럽게 · 퀄리티 있게 · 5가지만") — 디자인만 크게 보는 무대
   ① 크리스탈 렌즈  ② 샴페인 골드 각인  ③ 흑요석 조각  ④ 빛의 실  ⑤ 헤일로
   원칙: 색은 한두 가지 · 재질(유리·금속·흑요석·빛)이 느껴지게 · 선은 얇고 날카롭게 · 빛은 은은히 번지게
         평소엔 천천히 숨 쉬듯 돌다가, 고정하는 순간에만 딱 떨어지는 무게감(살짝 넘쳤다 돌아옴)
   차례: 자동 조준 → 고정 → 버팀(시야 밖) → 끊김 → 다시 자동 (화면을 톡 하면 직접 고정/풀기) */
import * as THREE from 'three';
import { makeBloom } from '../core/hangar/bloom.js?v=11110142';
import { FLY, mergeShip } from './flight.js?v=11110142';
import { buildShip } from '../core/ships/build.js';

const TAU = Math.PI * 2, clamp = (x, a, b) => x < a ? a : x > b ? b : x, sm = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const eob = x => { x = clamp(x, 0, 1); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const NAMES = ['크리스탈 렌즈', '샴페인 골드 각인', '흑요석 조각', '빛의 실', '헤일로'];
const CYC = 10;   /* 자동 0–3 · 고정 3–3.4 · 유지 –6.2 · 버팀 –7.7 · 끊김 –8.5 · 쉼 –10 */

const GL_COMMON = `
  vec3 spec(float h){ return clamp(abs(mod(h * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); }
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float aa(float d, float w){ return clamp(.5 - d / w, 0., 1.); }`;
/* 화면을 향한 판: 대상 중심에 붙고, 화면에서 항상 같은 크기 비율로 보임 */
const BB_V = `varying vec2 vU; uniform float uS; void main(){ vU = position.xy; vec4 c = modelViewMatrix * vec4(0., 0., 0., 1.); c.xy += position.xy * uS; gl_Position = projectionMatrix * c; }`;

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  const world = new THREE.Scene(), fx = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, .1, 400), bloom = makeBloom(renderer, { samples: 0 });
  const base = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });

  /* ── 무대: 깊은 남색 어둠 · 바닥에 아주 옅은 빛 웅덩이 · 먼지 같은 별 ── */
  world.add(new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec3 vD; float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main(){ float y = vD.y; vec3 c = mix(vec3(.008, .007, .016), vec3(.002, .002, .005), smoothstep(-.1, .6, y)); c += vec3(.03, .018, .04) * exp(-abs(y + .05) * 7.);
        vec3 q = floor(vD * 260.); c += step(.997, h(q)) * .9 * smoothstep(-.1, .4, y); gl_FragColor = vec4(c, 1.); }` })));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec2 vP; void main(){ float d = length(vP); vec3 c = vec3(.006, .005, .012) * exp(-d * .12) + vec3(.03, .026, .05) * exp(-d * d * .05);
      float g = (1. - smoothstep(.0, .03, abs(fract(d * .5) - .5) - .47)) * exp(-d * .15) * .008; gl_FragColor = vec4(c + g, 1.); }` }));
  world.add(floor);
  world.add(new THREE.HemisphereLight(0xb8b0ff, 0x18122a, .35)); const key = new THREE.DirectionalLight(0xfff2e6, 1.6); key.position.set(-6, 9, 5); world.add(key);
  const rim = new THREE.DirectionalLight(0x9fb4ff, 1.2); rim.position.set(5, 3, -7); world.add(rim);
  /* 대상: 적 기체 (실제 게임 모델) */
  const b = await buildShip(2, 1, 'OBSIDIAN', { renderer, size: FLY.LEN }); mergeShip(b.root.children[0]); const tgt = b.root; world.add(tgt);
  onProgress(.7);
  const P = new THREE.Vector3(0, 1.3, 0), RAD = 1.25;

  /* ════ 재료 ════ */
  const bbQuad = new THREE.PlaneGeometry(2, 2);
  const BB = (frag, uni = {}) => { const m = new THREE.Mesh(bbQuad, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, uniforms: Object.assign({ uS: { value: 1 }, uA: { value: 0 }, uK: { value: 0 }, uT: { value: 0 }, uTen: { value: 0 }, uBrk: { value: 0 } }, uni),
    vertexShader: BB_V, fragmentShader: GL_COMMON + frag })); m.frustumCulled = false; fx.add(m); return m; };
  /* 빛 띠 (고리·실): 화면을 향하는 얇은 띠 · 그려지는 범위(uArc) · 흐르는 구슬 빛 */
  const ribbonMat = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uC: { value: new THREE.Color(1, 1, 1) }, uC2: { value: new THREE.Color(1, 1, 1) }, uA: { value: 0 }, uT: { value: 0 }, uArc: { value: 1 }, uOff: { value: 0 }, uBead: { value: 0 }, uSpd: { value: .2 }, uSp: { value: 0 }, uW: { value: 1 } },
    vertexShader: 'attribute float aU, aS; varying float vU, vS; void main(){ vU = aU; vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: GL_COMMON + `uniform vec3 uC, uC2; uniform float uA, uT, uArc, uOff, uBead, uSpd, uSp, uW; varying float vU, vS;
      void main(){ float u = fract(vU - uOff), core = exp(-vS * vS * 22.), halo = exp(-vS * vS * 2.5) * .22;
        float arc = smoothstep(0., .06, u) * smoothstep(uArc, uArc - .06, u) * step(u, uArc);
        float bead = 0.; for (int k = 0; k < 3; k++){ float q = fract(vU - uT * uSpd + float(k) / 3.) - .5; bead += exp(-q * q * 1600.); }
        vec3 c = mix(uC, uC2, .5 + .5 * sin(vU * 6.2832 * 2. + uT * .6)) * (core * 1.4 + halo) * (1. + bead * uBead * 3.) + spec(vU * 2. - uT) * core * uSp * 1.2;
        gl_FragColor = vec4(c * arc * uA * uW, 1.); }` });
  class Ribbon { constructor(n = 96) { this.n = n; const g = new THREE.BufferGeometry(); this.pos = new Float32Array((n + 1) * 6); const u = new Float32Array((n + 1) * 2), s = new Float32Array((n + 1) * 2), idx = [];
      for (let i = 0; i <= n; i++) { u[i * 2] = u[i * 2 + 1] = i / n; s[i * 2] = -1; s[i * 2 + 1] = 1; if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
      g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aU', new THREE.BufferAttribute(u, 1)); g.setAttribute('aS', new THREE.BufferAttribute(s, 1)); g.setIndex(idx);
      this.m = new THREE.Mesh(g, ribbonMat()); this.m.frustumCulled = false; fx.add(this.m); this.U = this.m.material.uniforms; }
    /* 원: 중심 c · 반지름 r · 면의 방향 nrm · 두께 w (화면 기준) · 떨림 */
    circle(c, r, nrm, w, wob = 0, t = 0) { const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), tmp = Math.abs(nrm.y) > .9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      e1.crossVectors(nrm, tmp).normalize(); e2.crossVectors(nrm, e1).normalize(); const cam = camera.position, p = new THREE.Vector3(), tg = new THREE.Vector3(), sd = new THREE.Vector3(), v = new THREE.Vector3();
      for (let i = 0; i <= this.n; i++) { const a = i / this.n * TAU, rr = r + Math.sin(a * 7 + t * 30) * wob; p.copy(c).addScaledVector(e1, Math.cos(a) * rr).addScaledVector(e2, Math.sin(a) * rr);
        tg.copy(e1).multiplyScalar(-Math.sin(a)).addScaledVector(e2, Math.cos(a)); v.subVectors(cam, p).normalize(); sd.crossVectors(tg, v).normalize().multiplyScalar(w);
        this.pos.set([p.x - sd.x, p.y - sd.y, p.z - sd.z, p.x + sd.x, p.y + sd.y, p.z + sd.z], i * 6); }
      this.m.geometry.attributes.position.needsUpdate = true; } }

  /* ════ ① 크리스탈 렌즈: 투명한 렌즈가 대상 앞에 떠서 뒤를 굴절시켜 보여 줌 · 고정되면 은빛 금속 테가 시계 방향으로 닫힘 ════ */
  const lens = BB(`uniform float uA, uK, uT, uTen, uBrk; uniform sampler2D uBase; uniform vec2 uRes; varying vec2 vU;
    void main(){ vec2 p = vU; float d = length(p), a = atan(p.x, p.y), R0 = .6 + .05 * uK, px = 2. / 200.;
      vec2 suv = gl_FragCoord.xy / uRes; float inL = aa(d - R0, px * 2.);
      float edge = smoothstep(R0 * .55, R0, d), mag = (.018 + .03 * uK) * (1. + edge * 1.6);
      vec2 off = p * mag * (1. - d * d / (R0 * R0) * .4);
      vec3 s = vec3(texture2D(uBase, suv - off).r, texture2D(uBase, suv - off * 1.07).g, texture2D(uBase, suv - off * 1.15).b);   /* 가장자리일수록 빛이 갈라져 무지개 테 */
      float fres = pow(d / R0, 7.) * .9, streak = exp(-pow((p.x * .8 + p.y - .35) * 7., 2.)) * .12 * (1. - d / R0);
      vec3 lensC = s * 1.02 + vec3(.85, .92, 1.) * (fres * .55 + streak * .7);
      /* 금속 테: 고정 진행만큼 위에서부터 시계 방향으로 그려짐 · 비스듬한 빛이 결을 따라 반짝 */
      float bz = aa(abs(d - (R0 + .055)) - .028, px * 2.), prog = step(fract(a / 6.2832 + 1.), uK);
      float sheen = .45 + .9 * pow(abs(cos(a - uT * .4 - .8)), 10.), grv = .82 + .18 * step(.5, fract(a / 6.2832 * 120.));
      vec3 metal = vec3(.82, .86, .92) * sheen * grv * 1.3;
      float tick = aa(abs(d - (R0 + .055)) - .03, px * 2.) * step(.985, cos(a * 4.)) * uK;   /* 3·6·9·12시 표시: 산호빛 */
      vec3 tickC = mix(vec3(1., .4, .45), vec3(1., .72, .32), uTen) * 2.2;
      float hair = aa(abs(d - (R0 + .055)) - .004, px * 1.5) * (1. - uK) * step(.18, abs(sin(a * 1.5 + uT * .5)));   /* 자동: 끊긴 실선 하나 */
      float crack = 0.; if (uBrk > 0.){ for (int i = 0; i < 7; i++){ float ca = float(i) * .9 + .3; vec2 dir = vec2(sin(ca), cos(ca)); float pr = abs(dot(p, vec2(-dir.y, dir.x))); float ln = .25 + .7 * fract(sin(float(i) * 12.7) * 43.1); vec2 o = vec2(.18, .22); vec2 q = p - o; float pr2 = abs(dot(q, vec2(-dir.y, dir.x))); crack += aa(pr2 - .0035, px) * step(0., dot(q, dir)) * step(length(q), uBrk * 2.2 * ln * R0); } }   /* 한 점에서 갈라져 퍼지는 금 */
      float aL = inL * (.85 + .15 * uK) * (1. - uBrk);
      float fb = 1. - uBrk; bz *= fb; tick *= fb;
      vec3 col = lensC * aL + metal * bz * prog + tickC * tick + vec3(.8, .85, 1.) * hair * .7 + vec3(1.) * crack * 1.5 * (1. - uBrk * .6);
      float al = max(aL, max(bz * prog, max(tick, max(hair * .7, crack))));
      gl_FragColor = vec4(col, al * uA); }`, { uBase: { value: base.texture }, uRes: { value: new THREE.Vector2(1, 1) } });

  /* ════ ② 샴페인 골드 각인: 명품 시계 베젤 · 안쪽 머리카락 같은 금선 · 분 눈금 · 바깥 톱니 테가 딸깍딸깍 돌다 멈춤 ════ */
  const gold = BB(`uniform float uA, uK, uT, uTen, uBrk, uRot; varying vec2 vU;
    void main(){ vec2 p = vU; float d = length(p) / (1. + uBrk * .35), a = atan(p.x, p.y), px = 2. / 240.;
      vec3 G = vec3(.96, .8, .52), Gd = vec3(.55, .4, .22);
      float sheen = .35 + 1.1 * pow(abs(cos(a - uT * .35 - .6)), 14.);   /* 금 위로 비스듬히 지나가는 빛 */
      float inner = aa(abs(d - .5) - .0025, px * 1.4);
      float fa = fract(a / 6.2832 * 60.), major = step(.5, fract(a / 6.2832 * 12. + .5 / 12.) ) * 0. + step(abs(fract(a / 6.2832 * 12.) - .0), .0);
      float m60 = aa(abs(fa - .5) - .5 + .035, .02) * aa(abs(d - .555) - .02, px * 1.5);                         /* 분 눈금 */
      float m12 = aa(abs(fract(a / 6.2832 * 12. + .5) - .5) - .012, .012) * aa(abs(d - .575) - .04, px * 1.5);   /* 시 눈금 (길게) */
      float m4 = aa(abs(fract(a / 6.2832 * 4. + .5) - .5) - .006, .01) * aa(abs(d - .56) - .03, px * 1.5);
      float ticks = mix(m4 * .9, max(m60 * .75, m12), sm(uK));
      float ra = a - uRot, kn = .7 + .3 * step(.5, fract(ra / 6.2832 * 96.));                                 /* 톱니 테 (돌림) */
      float band = aa(abs(d - .7) - .032, px * 1.6) * kn, bandIn = aa(abs(d - .665) - .003, px * 1.2), bandOut = aa(abs(d - .735) - .003, px * 1.2);
      float notch = aa(abs(fract(ra / 6.2832 * 12. + .5) - .5) - .012, .01) * aa(abs(d - .7) - .033, px) ;     /* 테 위 12개 홈 */
      float bez = (band * (1. - notch * .8) + bandIn + bandOut) * sm(uK);
      vec2 tp = vec2(0., .79) - p; float tri = aa(max(abs(tp.x) * 1.7 + tp.y * .9 - .045, -tp.y - .035), px * 1.2) * sm(uK * 1.4 - .4);  /* 12시: 루비 삼각 */
      vec3 ruby = mix(vec3(1., .16, .28), vec3(1., .6, .2), uTen) * 2.;
      vec3 c = G * sheen * (inner * .9 + ticks * 1.1) + mix(Gd, G, sheen) * bez * 1.25 + ruby * tri;
      float al = max(inner * .9, max(ticks, max(bez, tri))) * (1. - uBrk);
      gl_FragColor = vec4(c * (1. - uBrk), al * uA); }`, { uRot: { value: 0 } });
  gold.material.fragmentShader = gold.material.fragmentShader.replace('uniform float uA, uK, uT, uTen, uBrk, uRot;', 'uniform float uA, uK, uT, uTen, uBrk, uRot; float sm(float x){ x = clamp(x, 0., 1.); return x * x * (3. - 2. * x); }');

  /* ════ ③ 흑요석 조각: 검은 유리 조각 넷 · 가장자리만 빛남 · 고정되면 돌아 누워 다이아몬드 틀로 맞물림 ════ */
  const shardGeo = (() => { const g = new THREE.BufferGeometry(), v = [], L = 1, W = .17, T = .05;
    const tip = [0, L / 2, 0], bot = [0, -L / 2, 0], ring = [[-W, .05, 0], [-W * .35, .12, T], [W * .55, .02, T * .8], [W, -.06, 0], [W * .3, -.1, -T], [-W * .6, 0, -T * .9]];
    for (let i = 0; i < 6; i++) { const a = ring[i], b2 = ring[(i + 1) % 6]; v.push(...tip, ...a, ...b2, ...bot, ...b2, ...a); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g; })();
  const obsMat = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, uniforms: { uA: { value: 0 }, uE: { value: new THREE.Color(1, .45, .5) }, uFl: { value: 0 } },
    vertexShader: 'varying vec3 vN, vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform float uA, uFl; uniform vec3 uE; varying vec3 vN, vV;
      void main(){ vec3 n = normalize(vN), v = normalize(vV); float f = pow(1. - abs(dot(n, v)), 3.);
        vec3 l = normalize(vec3(-.5, .8, .6)), h = normalize(l + v); float sp = pow(max(dot(n, h), 0.), 90.) * 2.2;   /* 검은 유리의 날카로운 반사점 */
        vec3 env = mix(vec3(.002, .002, .004), vec3(.02, .018, .035), .5 + .5 * n.y);
        vec3 c = vec3(.001) + env + vec3(1.) * sp + uE * f * (2.6 + uFl * 4.);
        gl_FragColor = vec4(c, uA); }` });
  const shards = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(shardGeo, obsMat()); m.frustumCulled = false; m.renderOrder = 10; fx.add(m); return m; });

  /* ════ ④ 빛의 실: 아주 가는 빛의 실 일곱 가닥이 저마다의 궤도로 감쌈 · 고정되면 한 고리로 조여 매듭처럼 묶임 ════ */
  const threads = Array.from({ length: 7 }, (_, i) => { const r = new Ribbon(110); const n = new THREE.Vector3(Math.sin(i * 2.4) , Math.cos(i * 1.7) * .8 + .2, Math.cos(i * 2.4)).normalize(); return { r, n0: n, ph: i * .9, sp: .25 + (i % 3) * .08 }; });
  const knot = BB(`uniform float uA, uK, uT; varying vec2 vU; void main(){ float d = length(vU); float c = exp(-d * d * 60.) * 1.2 + exp(-d * d * 8.) * .25; vec2 q = abs(vU); float star = exp(-q.x * 70.) * exp(-q.y * 6.) + exp(-q.y * 70.) * exp(-q.x * 6.); gl_FragColor = vec4(vec3(1., .97, .92) * (c + star * .6) * uK * 1.5, uA * uK); }`);

  knot.material.blending = THREE.AdditiveBlending;
  /* ════ ⑤ 헤일로: 행성 고리 같은 얇은 고리 둘이 비스듬히 돎 · 고정되면 둘이 수평으로 누워 겹치며 하나로 잠김 ════ */
  const halos = [new Ribbon(140), new Ribbon(140), new Ribbon(140)];

  const ALL = { lens, gold, knot, shards, threads, halos };
  const hideAll = () => { lens.visible = gold.visible = knot.visible = false; shards.forEach(s => s.visible = false); threads.forEach(t => t.r.m.visible = false); halos.forEach(h => h.m.visible = false); };

  /* ════ 그리기 (디자인별) ════ */
  const camR = new THREE.Vector3(), camU = new THREE.Vector3(), toCam = new THREE.Vector3();
  const DRAW = [
    (s) => { lens.visible = true; const U = lens.material.uniforms; lens.position.copy(P).addScaledVector(toCam, 1.2); U.uS.value = RAD * (1.55 + (1 - s.k) * .25) * (1 + s.fire * -.04);
      U.uA.value = s.a; U.uK.value = s.lockA ? eob(s.k) : 0; U.uT.value = s.t; U.uTen.value = s.ten; U.uBrk.value = s.brk;
      if (s.ten > 0) lens.position.x += Math.sin(s.t * 47) * .03 * s.ten; },
    (s) => { gold.visible = true; const U = gold.material.uniforms; gold.position.copy(P).addScaledVector(toCam, .6); U.uS.value = RAD * (1.75 + (1 - eob(s.k)) * .35);
      U.uA.value = s.a; U.uK.value = s.lockA ? s.k : 0; U.uT.value = s.t; U.uTen.value = s.ten; U.uBrk.value = s.brk;
      const steps = s.lockA ? Math.floor(eob(s.k) * 6) / 6 + sm((eob(s.k) * 6) % 1 * 3) / 6 : 0; U.uRot.value = s.lockA ? steps * TAU / 12 * 3 + Math.sin(s.t * 31) * .01 * s.ten : s.t * .05; },   /* 딸깍딸깍 끊어 돌다 멈춤 */
    (s) => { const k = s.lockA ? eob(s.k) : 0, D = RAD * (1.6 - k * .12) * (1 + s.brk * 1.6) + Math.sin(s.t * 1.4) * .04 * (1 - k);
      shards.forEach((m, i) => { m.visible = true; const a = i * TAU / 4 + Math.PI / 2 + k * Math.PI / 4, dist = D * (1 - k * .293);   /* 자동: 다이아몬드 꼭짓점 · 고정: 변의 가운데로 미끄러져 네 변이 맞물림 */
        m.position.copy(P).addScaledVector(camR, Math.cos(a) * dist).addScaledVector(camU, Math.sin(a) * dist).addScaledVector(toCam, .8);
        const rad = new THREE.Vector3(Math.cos(a), Math.sin(a), 0), tan = new THREE.Vector3(-Math.sin(a), Math.cos(a), 0);
        const q0 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), rad.clone().negate()), q1 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
        const ql = q0.clone().slerp(q1, k), spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.t * (.6 + i * .1) * (1 - k) + i * (1 - k) + .5 * k + s.brk * 9 * (i % 2 ? 1 : -1));
        m.quaternion.copy(camera.quaternion).multiply(ql).multiply(spin);
        const len = RAD * .75 * (1 - k) + D * 1.414 * .97 * k; m.scale.set(RAD * .7, len, RAD * .7); const U = m.material.uniforms; U.uA.value = s.a * (1 - s.brk);
        U.uE.value.set(.75, .82, 1).lerp(new THREE.Color(1, .38, .45), s.lockA ? 1 : 0).lerp(new THREE.Color(1, .7, .3), s.ten); U.uFl.value = s.lockA ? Math.max(0, 1 - Math.abs(s.k - .95) * 5) + s.ten * (Math.sin(s.t * 30) > 0 ? .5 : 0) : 0; }); },
    (s) => { const k = s.lockA ? eob(s.k) : 0;
      threads.forEach((th, i) => { th.r.m.visible = true; const ph = s.t * th.sp + th.ph, tilt = toCam.clone().addScaledVector(camR, Math.cos(i * 2.2 + s.t * .3) * .32).addScaledVector(camU, Math.sin(i * 2.2 + s.t * .3) * .32).normalize(), n = th.n0.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ph).lerp(tilt, k).normalize();   /* 고정: 조금씩 다른 기울기로 겹쳐 엮인 고리 */
        const rr = RAD * (1.45 + Math.sin(s.t * .7 + i) * .06) * (1 - k) + RAD * (1.18 + i * .012) * k; th.r.circle(P, rr * (1 + s.brk * 1.5), n, .022 + k * .006, s.ten * .03, s.t);
        const U = th.r.U; U.uA.value = s.a * (1 - s.brk); U.uT.value = s.t; U.uArc.value = (.38 + .5 * k) * (1 - s.brk) + .02; U.uOff.value = s.t * (.06 + i * .013) * (1 - k * .8) + i * .14;
        U.uC.value.setRGB(.55, .9, 1); U.uC2.value.setRGB(.8, .65, 1); if (k > 0) { U.uC.value.lerp(new THREE.Color(1, .95, .9), k * .6); U.uC2.value.lerp(new THREE.Color(1, .5, .55), k * .5); } if (s.ten > 0) U.uC2.value.lerp(new THREE.Color(1, .7, .3), s.ten);
        U.uBead.value = .6; U.uSpd.value = .3; U.uSp.value = s.sp * .6; U.uW.value = 1; });
      knot.visible = s.lockA; if (knot.visible) { knot.position.copy(P).addScaledVector(camU, RAD * 1.1).addScaledVector(toCam, 1); const U = knot.material.uniforms; U.uS.value = .5; U.uA.value = s.a * (1 - s.brk); U.uK.value = clamp((s.k - .6) * 2.5, 0, 1) * (1 - s.brk); } },
    (s) => { const k = s.lockA ? eob(s.k) : 0, up = new THREE.Vector3(0, 1, 0);
      const nA = new THREE.Vector3(Math.sin(1.2), Math.cos(1.2), 0).applyAxisAngle(up, s.t * .25).lerp(up, k).normalize(), nB = new THREE.Vector3(0, Math.cos(-1.05), Math.sin(-1.05)).applyAxisAngle(up, -s.t * .18).lerp(up, k).normalize();
      const ex = 1 + s.brk * 1.4, tiltBrk = s.brk * .6; if (tiltBrk) { nA.applyAxisAngle(new THREE.Vector3(1, 0, 0), tiltBrk); nB.applyAxisAngle(new THREE.Vector3(0, 0, 1), -tiltBrk); }
      halos[0].circle(P, RAD * (1.6 - k * .12) * ex, nA, .02 + k * .008, s.ten * .02, s.t); halos[1].circle(P, RAD * (1.42 + k * .06) * ex, nB, .016 + k * .01, s.ten * .02, s.t);
      halos[2].circle(new THREE.Vector3(P.x, P.y - RAD * .35, P.z), RAD * 1.95 * ex, up, .03, 0, s.t);
      const warm = new THREE.Color(1, .82, .55), pearl = new THREE.Color(.9, .92, 1), pearl2 = new THREE.Color(.95, .88, 1);
      halos.forEach((h, i) => { h.m.visible = i < 2 || s.lockA; const U = h.U; U.uT.value = s.t; U.uArc.value = 1; U.uOff.value = 0; U.uBead.value = i < 2 ? .9 : 0; U.uSpd.value = i ? -.12 : .16; U.uSp.value = s.sp * .5;
        U.uC.value.copy(pearl).lerp(warm, k * .8); U.uC2.value.copy(pearl2).lerp(warm, k * .6); if (s.ten > 0) { U.uC.value.lerp(new THREE.Color(1, .6, .3), s.ten); }
        U.uA.value = s.a * (1 - s.brk) * (i < 2 ? 1 : .45 * sm(s.k)); U.uW.value = 1; }); },
  ];

  /* ════ 화면 위 ════ */
  const ui = document.getElementById('ui');
  ui.innerHTML = `<div class="tabs">${NAMES.map((n, i) => `<button data-i="${i}"${i ? '' : ' class="on"'}><em>${i + 1}</em>${n}</button>`).join('')}</div>
    <div class="state" id="st">자동 조준</div>
    <div class="bot"><button id="dist">게임 거리로 보기</button><span>화면을 톡 = 직접 고정 / 풀기</span></div>`;
  let des = 0, near = true; const st = ui.querySelector('#st');
  ui.querySelectorAll('.tabs button').forEach(b2 => b2.onclick = e => { e.stopPropagation(); des = +b2.dataset.i; ui.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b2)); t0 = clock.elapsedTime; manual = null; });
  ui.querySelector('#dist').onclick = e => { e.stopPropagation(); near = !near; e.target.textContent = near ? '게임 거리로 보기' : '가까이 보기'; };
  let manual = null, t0 = 0;   /* manual: { on, t } */
  canvas.addEventListener('pointerdown', () => { const t = clock.elapsedTime; manual = manual && manual.on ? { on: false, t } : { on: true, t }; });

  const clock = new THREE.Clock(); let W = 1, H = 1;
  const size = () => { W = innerWidth; H = innerHeight; const pr = renderer.getPixelRatio(); renderer.setSize(W, H, false); const w = Math.round(W * pr), h = Math.round(H * pr); bloom.size(w, h); base.setSize(w, h); lens.material.uniforms.uRes.value.set(w, h); camera.aspect = W / H; camera.updateProjectionMatrix(); };
  addEventListener('resize', size); size(); onProgress(1);
  let camD = 9;
  const loop = () => { requestAnimationFrame(loop); const t = clock.elapsedTime;
    /* 대상: 천천히 떠서 흔들림 */
    P.set(Math.sin(t * .4) * .25, 1.3 + Math.sin(t * .9) * .12, Math.cos(t * .33) * .2); tgt.position.copy(P); tgt.rotation.set(Math.sin(t * .7) * .06, t * .25, Math.sin(t * .9) * .08);
    camD += ((near ? 9 : 24) - camD) * .08; const ca = (near ? 34 : 50) * Math.PI / 180; camera.position.set(0, 1.3 + camD * Math.sin(ca), camD * Math.cos(ca)); camera.lookAt(0, 1.3, 0); camera.updateMatrixWorld();
    camR.setFromMatrixColumn(camera.matrixWorld, 0); camU.setFromMatrixColumn(camera.matrixWorld, 1); toCam.subVectors(camera.position, P).normalize();
    /* 단계 */
    let s = { t, a: 1, k: 0, lockA: false, ten: 0, brk: 0, sp: 0, fire: 0 }, label;
    if (manual) { const e = t - manual.t; if (manual.on) { s.lockA = true; s.k = clamp(e / .38, 0, 1); s.sp = Math.sin(Math.PI * clamp((e - .1) / .6, 0, 1)); label = '고정 (다시 톡 = 풀기)'; }
      else if (e < .4) { s.lockA = true; s.k = 1; s.a = 1 - sm(e / .4); label = '풀기'; } else { s.a = sm((e - .4) / .4); label = '자동 조준'; if (e > 6) manual = null; } }
    else { const c = (t - t0) % CYC;
      if (c < 3) { label = '자동 조준'; s.a = sm(c / .5); s.fire = (c % 1) < .12 ? 1 : 0; }
      else if (c < 6.2) { s.lockA = true; s.k = clamp((c - 3) / .38, 0, 1); s.sp = Math.sin(Math.PI * clamp((c - 3.1) / .6, 0, 1)); label = '고정'; }
      else if (c < 7.7) { s.lockA = true; s.k = 1; s.ten = clamp((c - 6.2) / 1.5, 0, 1); label = `시야 밖 · ${(7.7 - c).toFixed(1)}초 뒤 끊김`; }
      else if (c < 8.5) { s.lockA = true; s.k = 1; s.ten = 1; s.brk = sm((c - 7.7) / .8); label = '끊김'; }
      else { s.a = 0; label = '쉼'; } }
    if (st.textContent !== label) st.textContent = label; st.dataset.k = s.lockA ? (s.ten > 0 ? 'ten' : 'lock') : 'auto';
    hideAll(); if (s.a > .001) DRAW[des](s);
    /* 그리기: 바탕을 먼저 따로 그려 둠 (렌즈가 굴절시켜 보여 줄 그림) → 빛 번짐 판에 바탕 + 표시 */
    renderer.setClearColor(0x05060f, 1);
    renderer.setRenderTarget(base); renderer.clear(); renderer.render(world, camera);
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(world, camera); renderer.render(fx, camera);
    bloom.render(Math.round(W * renderer.getPixelRatio()), Math.round(H * renderer.getPixelRatio()), false); };
  window.__td = { set: i => { des = i; t0 = clock.elapsedTime; manual = null; ui.querySelectorAll('.tabs button').forEach((x, j) => x.classList.toggle('on', j === i)); }, setT0: v => { t0 = clock.elapsedTime - v; }, near: v => { near = v; } };
  loop();
}
