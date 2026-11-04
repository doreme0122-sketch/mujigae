/* 사냥터 잔챙이 몹 — 성운 해파리 (2026-11-04 사용자: 코드로 만든 3D 모델로 해 보기)
   · 왜 해파리: 맵이 성운·산호로 된 바다 같은 우주 → 그 안개 속을 떼 지어 떠다니는 생물. 살아 있는 느낌이라 잡을 때 감정이 생김
   · 생김새 (위에서 내려다보는 게임 → 위에서 볼 때 가장 아름답게)
     - 종 모양 몸: 반투명 둥근 지붕, 가장자리가 가장 밝음(빛이 비스듬히 지나는 곳) · 몸 위로 가는 물길 여덟 갈래가 가운데서 가장자리로 · 가운데 네 잎 모양 따뜻한 속 기관
       가장자리에 작은 감각 빛 열여섯 개가 깜빡임 · 몸을 오므릴 때마다 속빛이 밝아짐(힘을 낼 때)
     - 아래: 가는 촉수 열 가닥 + 주름진 입 팔 넷 — 늘 아래로 처지되 움직이는 반대쪽으로 끌려 흐르고, 오므렸다 펼 때 살짝 퍼졌다 모임. 빛 구슬이 촉수를 타고 내려감
   · 움직임마다 이유
     - 오므렸다 펴기: 빠르게 오므리고(물을 밀어냄) 천천히 펴짐 → 오므리는 순간 앞으로 나아감(헤엄)
     - 떼: 서로 너무 가까우면 비키고, 무리에서 너무 멀면 돌아옴. 저마다 박자가 조금씩 달라 살아 있는 떼로 보임
     - 경계: 기체가 다가오면 몸빛이 붉은 주황으로 물듦 → 기체 쪽을 향함 → 쏘기 전 몸이 부풀며 밝아짐(신호) → 느린 빛 방울을 뱉음 (잡몹은 느린 탄만 · 디자인 기준)
     - 맞음: 몸이 움찔 오그라들고 하얗게 번쩍, 맞은 반대쪽으로 밀려남
     - 쓰러짐: 몸이 풀리듯 흩어지며 사라지고, 빛 알갱이(경험치)가 기체로 빨려 들어감
     - 센 몹: 더 크고 몸 위에 결정 껍질이 덮임(단단해 보임 · 체력 많음)
   · 무게: 몸 한 장 · 촉수 한 장 · 결정 껍질 한 장 (몇 마리든 그리기 3번)
   단위 m */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const JELLY = { R: .62, Y: 2.1, MAX: 192, NT: 10, NO: 4, SEG: 18, HP: 3, HP_STRONG: 9 };
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
/* 몸 색: 바탕(차가운 청록) · 속 기관(따뜻한 살구) · 경계(붉은 주황) */
export const JCOL = { body: new THREE.Vector3(.32, .9, 1.0), core: new THREE.Vector3(1.0, .62, .42), alert: new THREE.Vector3(1.0, .32, .2) };

/* 오므림 정도 (0 펴짐 ~ 1 오므림): 박자의 앞 25%에 빠르게 오므리고 나머지에 천천히 펴짐 */
export const squeeze = ph => { ph = ((ph % 1) + 1) % 1; if (ph < .25) { const k = ph / .25; return k * k * (3 - 2 * k); } const k = (ph - .25) / .75; return 1 - k * k * (3 - 2 * k); };

const GL_COMMON = `
  attribute vec4 iA; attribute vec4 iB; attribute vec4 iC;   /* iA: 자리 xyz·크기 · iB: 속도 xz·오므림·씨앗 · iC: 경계·맞은 지 얼마·쓰러진 지 얼마·센 몹 */
  uniform float uT;
  float jh(float n){ return fract(sin(n) * 43758.5453); }
  mat3 tiltM(vec2 v){ float sp = length(v); if (sp < 1e-3) return mat3(1.); vec2 d = v / sp; float a = min(.32, sp * .07);   /* 가는 쪽으로 몸 위가 살짝 기욺 */
    vec3 ax = normalize(vec3(d.y, 0., -d.x)); float c = cos(a), s = sin(a), t = 1. - c;
    return mat3(t*ax.x*ax.x + c, t*ax.x*ax.y + s*ax.z, t*ax.x*ax.z - s*ax.y,  t*ax.x*ax.y - s*ax.z, t*ax.y*ax.y + c, t*ax.y*ax.z + s*ax.x,  t*ax.x*ax.z + s*ax.y, t*ax.y*ax.z - s*ax.x, t*ax.z*ax.z + c); }`;

/* ── 종 모양 몸 ── */
function bellGeo() {
  const R = JELLY.R, pts = [];
  for (let i = 0; i <= 16; i++) { const v = i / 16, a = v * Math.PI * .5;
    pts.push(new THREE.Vector2(Math.sin(a) * R * (1 + .04 * Math.sin(v * Math.PI)), Math.cos(a) * R * .62 - .02)); }   /* 지붕: 위가 둥글고 가장자리로 내려옴 */
  pts.push(new THREE.Vector2(R * .97, -.05), new THREE.Vector2(R * .86, -.06));                                     /* 가장자리 안쪽으로 살짝 말린 얇은 막 */
  const g = new THREE.LatheGeometry(pts, 48);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, Math.min(1.1, uv.getY(i) * (pts.length - 1) / 16));   /* v: 0 꼭대기 → 1 가장자리 (막은 1 넘음) */
  return g;
}
function bellMat(uT) {
  return new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uT, uC: { value: JCOL.body }, uW: { value: JCOL.core }, uR: { value: JCOL.alert } },
    vertexShader: GL_COMMON + `
      attribute vec4 iE; varying vec2 vU; varying vec3 vN, vW; varying vec4 vB, vC; varying vec3 vL; varying float vSig;
      void main(){ vU = uv; vB = iB; vC = iC; vSig = iE.z; float v = uv.y, c = iB.z, a = uv.x * 6.2832;
        vec3 p = position;
        float hitK = exp(-iC.y * 9.) * step(0., iC.y);                                                     /* 맞은 순간 확 오그라듦 */
        float sq = clamp(c + hitK * .8, -.6, 1.2);                                                       /* 음수 = 쏘기 전 신호로 부풂 */
        float rs = 1. - .2 * sq * v * v - .05 * sq + .025 * sin(a * 8. + uT * 2.3 + iB.w * 9.) * v;        /* 오므리면 가장자리가 안쪽으로 · 늘 살짝 일렁임 */
        p.xz *= rs; p.y *= 1. + .16 * sq;
        float die = max(iC.z, 0.); if (iC.z >= 0.) { p.xz *= 1. + die * (.9 + .6 * jh(floor(a * 3.) + iB.w)); p.y -= die * die * .6; }   /* 쓰러짐: 꽃잎처럼 벌어지며 가라앉음 */
        vL = p; mat3 M = tiltM(iB.xy); vec3 w = iA.xyz + M * (p * iA.w);
        vN = normalize(M * (normal * vec3(1. / rs, 1., 1. / rs))); vW = w;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }`,
    fragmentShader: `uniform float uT; uniform vec3 uC, uW, uR; varying vec2 vU; varying vec3 vN, vW; varying vec4 vB, vC; varying vec3 vL; varying float vSig;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){ float v = min(vU.y, 1.), a = vU.x * 6.2832, c = vB.z, seed = vB.w, alert = vC.x;
        vec3 V = normalize(cameraPosition - vW); float f = 1. - abs(dot(normalize(vN), V)), rim = f * f;
        vec3 body = mix(uC, uR, alert), bc = body * body;
        /* 물길 여덟 갈래: 가운데서 가장자리로, 끝으로 갈수록 옅게 갈라짐 */
        float k8 = fract(a / 6.2832 * 8. + .5 * seed) - .5, canal = exp(-k8 * k8 * 260.) * smoothstep(.12, .35, v) * (1. - v * .5);
        /* 네 잎 속 기관: 위에서 보면 가운데 네 잎 클로버 (몸의 심장) */
        vec2 q = vL.xz / ${JELLY.R.toFixed(2)}; float r = length(q), th = atan(q.y, q.x + 1e-5) + seed * 3.;
        float leaf = .26 * (.55 + .45 * abs(cos(th * 2.))), gon = smoothstep(leaf + .06, leaf - .05, r) * smoothstep(.0, .06, r) * step(0., vL.y);
        float gonGlow = gon * (.55 + .45 * n(q * 9. + uT * .3));
        /* 가장자리 감각 빛 열여섯 */
        float k16 = fract(a / 6.2832 * 16.) - .5, dots = exp(-k16 * k16 * 400.) * smoothstep(.9, 1., vU.y) * (.5 + .5 * sin(uT * 3. + floor(a / 6.2832 * 16.) * 1.7 + seed * 9.));
        /* 몸결: 아주 옅은 얼룩 (매끈한 플라스틱이 아니라 살아 있는 막) */
        float skin = n(vL.xz * 9. + seed * 7.) * .5 + n(vL.xz * 23. - uT * .2) * .3;
        float beat = .55 + .7 * max(c, 0.) + 2.2 * max(-c, 0.);                                                 /* 오므릴 때 속빛이 밝아짐 · 쏘기 직전엔 부풀며 확 밝아짐(신호) */                                                                              /* 오므릴 때 속빛이 밝아짐 */
        vec3 col = bc * (.05 + rim * .75 + canal * .5 * beat + skin * .05) + (uW * uW) * gonGlow * .65 * beat * (1. - alert * .5) + mix(vec3(.8, 1., 1.), uR, alert) * dots * .8;
        col += vec3(1.) * exp(-max(vC.y, 0.) * 12.) * step(0., vC.y) * (.35 + rim);                       /* 맞은 순간 하얗게 번쩍 */
        if (vSig >= 0. && vSig < 1.2) { float sw = (r - vSig * 2.4) / .22, ring = exp(-sw * sw) * (1. - vSig / 1.2);   /* 떼 경보: 신호를 받는 순간 붉은 빛 고리가 몸 가운데서 가장자리로 번짐 */
          col += (uR * uR * 1.6 + .1) * ring * (.6 + rim); }
        col *= smoothstep(1.12, .95, vU.y);
        float die = vC.z; if (die >= 0.) { float nd = n(vL.xz * 14. + seed * 5.); float edge = smoothstep(die * 1.2 - .15, die * 1.2, nd); col = col * edge + bc * 1.4 * (edge - smoothstep(die * 1.2, die * 1.2 + .1, nd)) * 2. ; col *= 1. - smoothstep(.75, 1., die); }   /* 쓰러짐: 가장자리가 빛나며 녹아 사라짐 */
        gl_FragColor = vec4(col, 1.); }` });
}

/* ── 촉수 열 가닥 + 입 팔 넷: 한 마리 몫을 한 장에 담고 마리 수만큼 찍음 ── */
function tentGeo() {
  const S = JELLY.SEG, rr = [], ss = [], idx = []; let base = 0;
  const add = (ang, rad, len, w, kind) => { for (let i = 0; i < S; i++) { const s = i / (S - 1); for (const side of [-1, 1]) { rr.push(ang, rad, len, w); ss.push(s, side, kind); } if (i < S - 1) { const p = base + i * 2; idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); } } base += S * 2; };
  for (let i = 0; i < JELLY.NT; i++) { const a = i / JELLY.NT * Math.PI * 2 + .2 * Math.sin(i * 3.1); add(a, .92, 1.35 + .55 * ((i * 7) % 5) / 4, .028, 0); }
  for (let i = 0; i < JELLY.NO; i++) { const a = i / JELLY.NO * Math.PI * 2 + .4; add(a, .18, .95 + .15 * (i % 2), .11, 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(rr.length / 4 * 3), 3));
  g.setAttribute('aR', new THREE.Float32BufferAttribute(rr, 4)); g.setAttribute('aS', new THREE.Float32BufferAttribute(ss, 3)); g.setIndex(idx); return g;
}
function tentMat(uT) {
  return new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uT, uC: { value: JCOL.body }, uW: { value: JCOL.core }, uR: { value: JCOL.alert } },
    vertexShader: GL_COMMON + `
      attribute vec4 aR; attribute vec3 aS; varying vec3 vS; varying vec4 vB, vC;
      attribute vec4 iD; attribute vec4 iE;   /* iD: 0.35초 전·0.8초 전 몸 자리(지금 자리 기준) · iE: 오므림 박자, 쏘기 신호 */
      float sqz(float ph){ ph = fract(ph); if (ph < .25) { float k = ph / .25; return k * k * (3. - 2. * k); } float k = (ph - .25) / .75; return 1. - k * k * (3. - 2. * k); }
      /* 촉수에 '기억'이 있음 (사용자: 너무 뻣뻣함):
         ① 끝으로 갈수록 몸이 조금 전에 있던 자리를 따라감 → 방향을 틀면 밧줄처럼 휘며 뒤따라옴
         ② 오므리는 힘이 뿌리에서 끝으로 시간 차를 두고 타고 내려감 → 오므릴 때마다 물결이 한 번씩 흘러내림
         ③ 뿌리는 거의 안 움직이고 끝일수록 크고 느리게 너울거림 · 멈추면 천천히 아래로 처짐 */
      vec3 P(float s){ float ang = aR.x, len = aR.z * iA.w, seed = iB.w, cS = iE.y > 0. ? iB.z : sqz(iE.x - s * .45), c0 = iB.z;
        float rad = aR.y * ${JELLY.R.toFixed(2)} * iA.w * (1. - .2 * c0);
        vec3 root = vec3(cos(ang) * rad, -.05 * iA.w, sin(ang) * rad), out_ = vec3(cos(ang), 0., sin(ang)), tang = vec3(-sin(ang), 0., cos(ang));
        float die = max(iC.z, 0.);
        vec2 lag = (2. * s * (1. - s) * iD.xy + s * s * iD.zw) * (aS.z < .5 ? 1. : .55);                     /* 끝일수록 더 오래전 자리 (입 팔은 짧고 굵어 덜 끌림) */
        float s16 = pow(s, 1.6);
        vec3 h = vec3(lag.x, 0., lag.y);
        h += out_ * len * s * (.05 + .17 * cS + .5 * die);                                                        /* 오므림 물결이 지나가는 마디에서 살짝 퍼짐 */
        h += tang * (sin(s * 3.2 - uT * 1.35 + seed * 6. + ang * 3.) * .2 + sin(s * 6.5 - uT * 2.3 + ang * 5.) * .06) * s16 * len;   /* 끝일수록 크고 느린 너울 */
        float hl = length(h.xz), drop = len * s, vy = sqrt(max(drop * drop - hl * hl * .8, drop * drop * .12));  /* 옆으로 끌린 만큼 덜 내려옴 (길이가 늘지 않게) */
        vec3 p = root + h + vec3(0., -vy, 0.) + vec3(0., 1., 0.) * sin(s * 6.5 - uT * 2.3 + ang * 5.) * .03 * s;
        p.y = max(p.y, -iA.y + .08 + s * .05);                                                                     /* 땅 아래로 파고들지 않음 */
        return p; }
      void main(){ vS = aS; vB = iB; vC = iC; float s = aS.x;
        vec3 p0 = P(s), p1 = P(min(1., s + .04)) - P(max(0., s - .04));
        vec3 w = iA.xyz + p0, V = normalize(cameraPosition - w), side = normalize(cross(p1 + vec3(1e-4), V));
        float wd = aR.w * iA.w * (aS.z < .5 ? pow(1. - s, .6) * (.7 + .3 * sin(s * 30. + iB.w)) : (.35 + .65 * sin(min(s, 1.) * 3.1416)) * (1. + .4 * sin(s * 18. - uT * 2.5 + aR.x * 4.)));   /* 촉수: 끝으로 가늘게 · 입 팔: 주름져 넓어졌다 좁아짐 */
        w += side * wd * aS.y;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }`,
    fragmentShader: `uniform float uT; uniform vec3 uC, uW, uR; varying vec3 vS; varying vec4 vB, vC;
      void main(){ float s = vS.x, x = vS.y, alert = vC.x, die = vC.z;
        float core = exp(-x * x * 3.5);
        float bq = fract(s * 2.2 - uT * .55 - vB.w * 3.) - .5, bead = exp(-bq * bq * 70.) * (.4 + .6 * vB.z);          /* 빛 구슬이 촉수를 타고 내려감 */
        vec3 body = mix(uC, uR, alert), col = mix(body * body, uW * uW, vS.z * .45);
        vec3 c = col * core * (.16 + bead * .55) * pow(1. - s, 1.1) * (vS.z > .5 ? 1.3 : 1.);
        c += vec3(1.) * exp(-max(vC.y, 0.) * 12.) * step(0., vC.y) * core * .3 * (1. - s);
        if (die >= 0.) c *= 1. - smoothstep(.5, 1., die);
        gl_FragColor = vec4(c, 1.); }` });
}

/* ── 결정 껍질 (센 몹): 몸 위를 덮은 각진 결정 판 여럿 ── */
function shellGeo() {
  const parts = [], R = JELLY.R, rnd = (() => { let s = 11; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const plate = (cx, cz, s) => { const g = new THREE.CylinderGeometry(s * .55, s, s * .5, 6, 1); g.rotateY(rnd() * 3); g.translate(0, s * .25, 0); return g; };
  for (let ring = 0; ring < 3; ring++) { const n = [1, 6, 10][ring], rr = [0, .38, .7][ring];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + ring * .4 + rnd() * .2, x = Math.cos(a) * rr * R, z = Math.sin(a) * rr * R, v = rr, y = Math.cos(v * Math.PI * .5) * R * .62 - .02;
      const g = plate(x, z, (.2 - ring * .035) * (.8 + rnd() * .4)).toNonIndexed(); const up = new THREE.Vector3(x / R * 1.1, 1, z / R * 1.1).normalize();
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up)); g.translate(x * 1.02, y + .01, z * 1.02); parts.push(g); } }
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g;
}
function shellMat(uT) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT, uR: { value: JCOL.alert } },
    vertexShader: GL_COMMON + `varying vec3 vN, vW; varying vec4 vB, vC;
      void main(){ vB = iB; vC = iC; float c = iB.z, hitK = exp(-max(iC.y, 0.) * 9.) * step(0., iC.y), sq = clamp(c + hitK * .8, -.6, 1.2);
        vec3 p = position; float v = clamp(length(p.xz) / ${JELLY.R.toFixed(2)}, 0., 1.); p.xz *= 1. - .2 * sq * v * v - .05 * sq; p.y *= 1. + .16 * sq;
        if (iC.z >= 0.) { p.xz *= 1. + iC.z * 1.4; p.y -= iC.z * iC.z * .9; }
        mat3 M = tiltM(iB.xy); vec3 w = iA.xyz + M * (p * iA.w); vW = w; vN = normalize(M * normal);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }`,
    fragmentShader: `uniform float uT; uniform vec3 uR; varying vec3 vN, vW; varying vec4 vB, vC;
      void main(){ vec3 N = normalize(vN), V = normalize(cameraPosition - vW), L = normalize(vec3(-.5, 1., .4));
        float f = 1. - abs(dot(N, V)), d = max(dot(N, L), 0.), sp = pow(max(dot(reflect(-L, N), V), 0.), 24.);
        vec3 base = vec3(.05, .09, .14) * (.35 + .65 * d) + vec3(.5, .75, 1.) * sp * .6 + vec3(.3, .7, 1.) * f * f * .5;   /* 어두운 맑은 결정 판: 면마다 밝기가 달라 각져 보임 */
        base = mix(base, base + uR * uR * .25 * f, vC.x);
        base += vec3(1.) * exp(-max(vC.y, 0.) * 14.) * step(0., vC.y) * .5;
        float a = .92; if (vC.z >= 0.) a *= 1. - smoothstep(.3, .8, vC.z);
        gl_FragColor = vec4(base, a); }` });
}

export function makeJellies(uT) {
  const G = new THREE.Group(), MAX = JELLY.MAX;
  const iA = new Float32Array(MAX * 4), iB = new Float32Array(MAX * 4), iC = new Float32Array(MAX * 4);
  const sA = new Float32Array(MAX * 4), sB = new Float32Array(MAX * 4), sC = new Float32Array(MAX * 4);   /* 껍질용 (센 몹만) */
  const mk = (geo, A, B, C) => { const g = new THREE.InstancedBufferGeometry(); g.index = geo.index; for (const k in geo.attributes) g.setAttribute(k, geo.attributes[k]);
    g.setAttribute('iA', new THREE.InstancedBufferAttribute(A, 4)); g.setAttribute('iB', new THREE.InstancedBufferAttribute(B, 4)); g.setAttribute('iC', new THREE.InstancedBufferAttribute(C, 4)); g.instanceCount = 0; return g; };
  const bg = mk(bellGeo(), iA, iB, iC), tg = mk(tentGeo(), iA, iB, iC), sg = mk(shellGeo(), sA, sB, sC);
  const iD = new Float32Array(MAX * 4), iE = new Float32Array(MAX * 4); const aD = new THREE.InstancedBufferAttribute(iD, 4), aE = new THREE.InstancedBufferAttribute(iE, 4); tg.setAttribute('iD', aD); tg.setAttribute('iE', aE); bg.setAttribute('iE', aE);
  const tent = new THREE.Mesh(tg, tentMat(uT)); tent.frustumCulled = false; tent.renderOrder = 6;
  const bell = new THREE.Mesh(bg, bellMat(uT)); bell.frustumCulled = false; bell.renderOrder = 7;
  const shell = new THREE.Mesh(sg, shellMat(uT)); shell.frustumCulled = false; shell.renderOrder = 8;
  G.add(tent, bell, shell);
  /* 안개 속 등불 (사용자 2026-11-04): 해파리는 스스로 빛을 내서 시야 밖 안개 속에서도 희미하게 보임 → 시야 덮개 뒤에 따로 그림(G.userData.beacon) */
  const bP = new Float32Array(MAX * 3), bA = new Float32Array(MAX * 2), bGeo = new THREE.BufferGeometry(); bGeo.setAttribute('position', new THREE.BufferAttribute(bP, 3)); bGeo.setAttribute('aA', new THREE.BufferAttribute(bA, 2));
  const beacon = new THREE.Points(bGeo, new THREE.ShaderMaterial({ ...AB, uniforms: { uPx: { value: 600 }, uC: { value: JCOL.body }, uR: { value: JCOL.alert }, uT },
    vertexShader: 'attribute vec2 aA; uniform float uPx; varying vec2 vA; void main(){ vA = aA; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = aA.x > 0. ? uPx * 2.2 * aA.x / max(.1, -mv.z) : 0.; }',
    fragmentShader: 'uniform vec3 uC, uR; varying vec2 vA; void main(){ vec2 q = gl_PointCoord - .5; float r2 = dot(q, q) * 4.; vec3 c = mix(uC, uR, vA.y); gl_FragColor = vec4(c * c * (exp(-r2 * 9.) * .22 + exp(-r2 * 2.5) * .06), 1.); }' }));
  beacon.frustumCulled = false; G.userData.beacon = beacon; G.userData.setPx = px => { beacon.material.uniforms.uPx.value = px; };
  const list = [];
  G.userData.list = list;
  /* 한 마리 넣기 */
  G.userData.add = (x, z, o = {}) => { const j = { on: true, x, z, y: JELLY.Y + (Math.random() - .5) * .5, vx: 0, vz: 0, ph: Math.random(), rate: .72 + Math.random() * .22, seed: Math.random() * 10,
    s: o.strong ? 1.75 : .85 + Math.random() * .3, strong: !!o.strong, hp: o.strong ? JELLY.HP_STRONG : JELLY.HP, alert: 0, hitT: -9, dieT: -9, head: Math.random() * 6.28, home: [x, z], ...o };
    j.maxHp = j.hp; list.push(j); return j; };
  /* 그리기 값 채우기 (움직임은 밖에서) */
  G.userData.draw = (t, cx = 0, cz = 0, R = 1e9) => { let n = 0, m = 0;
    for (const j of list) { if (!j.on || n >= MAX) continue; if (Math.abs(j.x - cx) > R || Math.abs(j.z - cz) > R) { j.hist = null; continue; }   /* 화면 밖 먼 해파리는 그리지 않음 */ const c = j.tell > 0 ? -Math.min(1, (t - j.tell) / .6) * .5 : squeeze(j.ph), hitA = t - j.hitT, dieA = j.dieT > 0 ? (t - j.dieT) / 1.3 : -1;
      const yb = j.y + Math.sin(t * .7 + j.seed) * .12 + c * .1;
      const put = (A, B, C, k) => { A.set([j.x, yb, j.z, j.s], k * 4); B.set([j.vx, j.vz, c, j.seed], k * 4); C.set([j.alert, hitA < 2 ? hitA : -1, dieA, j.strong ? 1 : 0], k * 4); };
      /* 몸이 지나온 자리 기억 (촉수가 따라감) */
      const H = j.hist || (j.hist = []); H.push(t, j.x, j.z); while (H.length > 6 && H[0] < t - 1.1) H.splice(0, 3);
      const at = d => { const tt = t - d; for (let i = H.length - 3; i >= 0; i -= 3) if (H[i] <= tt) { const i2 = Math.min(H.length - 3, i + 3), k = H[i2] > H[i] ? (tt - H[i]) / (H[i2] - H[i]) : 0; return [H[i + 1] + (H[i2 + 1] - H[i + 1]) * k - j.x, H[i + 2] + (H[i2 + 2] - H[i + 2]) * k - j.z]; } return [H[1] - j.x, H[2] - j.z]; };
      const d1 = at(.35), d2 = at(.8), lim = 1.6 * j.s; const cl = v => { const l = Math.hypot(v[0], v[1]); return l > lim ? [v[0] / l * lim, v[1] / l * lim] : v; };
      const [a1, b1] = cl(d1), [a2, b2] = cl(d2); iD.set([a1, b1, a2, b2], n * 4); iE.set([j.ph, j.tell > 0 ? 1 : 0, j.sigT > 0 && t - j.sigT < 1.2 ? t - j.sigT : -1, 0], n * 4);
      bP.set([j.x, yb, j.z], n * 3); bA[n * 2] = j.dieT > 0 ? Math.max(0, 1 - dieA) * j.s : j.s * (.85 + .3 * Math.max(0, c)); bA[n * 2 + 1] = j.alert;
      put(iA, iB, iC, n++); if (j.strong) put(sA, sB, sC, m++); }
    for (const g of [bg, tg]) { g.instanceCount = n; for (const k of ['iA', 'iB', 'iC']) g.attributes[k].needsUpdate = true; } tg.attributes.iD.needsUpdate = tg.attributes.iE.needsUpdate = true; for (let k = n; k < MAX; k++) bA[k * 2] = 0; bGeo.attributes.position.needsUpdate = bGeo.attributes.aA.needsUpdate = true;
    sg.instanceCount = m; for (const k of ['iA', 'iB', 'iC']) sg.attributes[k].needsUpdate = true; };
  /* 움직임 한 걸음: 떼 짓기 · 오므려 헤엄 · 경계 · 쏘기 신호 · 맞음 · 쓰러짐
     ctx: { sx, sz (내 기체), blocked(x,z), spit(j, dx, dz) 빛 방울 뱉기, died(j) } */
  G.userData.step = (t, dt, ctx) => {
    for (const j of list) { if (!j.on) continue;
      if (j.dieT > 0) { const e = t - j.dieT; j.vx *= Math.exp(-dt * 3); j.vz *= Math.exp(-dt * 3); j.x += j.vx * dt; j.z += j.vz * dt; j.y -= dt * .2; j.ph += dt * j.rate * .5; if (e > 1.3) { j.on = false; ctx.died?.(j); } continue; }
      if (j.alarmAt && t >= j.alarmAt) { j.alarmAt = 0; j.alarmUntil = t + 8; j.sigT = t; j.alert = Math.max(j.alert, .7); ctx.alarmed?.(j); }   /* 떼 경보가 닿음 */
      const dsx = ctx.sx - j.x, dsz = ctx.sz - j.z, ds = Math.hypot(dsx, dsz), sees = (ds < (j.strong ? 14 : 11) || t < (j.alarmUntil || 0)) && (!ctx.canChase || ctx.canChase(j));   /* 제 사냥터 밖까지는 쫓지 않음 (사용자: 태어나는 방까지 올라오면 안 됨) */
      j.alert += ((sees ? 1 : 0) - j.alert) * Math.min(1, dt * (sees ? 2.2 : .6));                          /* 다가오면 서서히 붉게 물듦, 멀어지면 천천히 가라앉음 */
      /* 가고 싶은 쪽 */
      let ax = 0, az = 0;
      j.wan = (j.wan ?? Math.random() * 6.28) + (Math.random() - .5) * dt * 1.6;                               /* 저마다 천천히 떠도는 쪽 */
      ax += Math.cos(j.wan) * .5; az += Math.sin(j.wan) * .5;
      const hx = j.home[0] - j.x, hz = j.home[1] - j.z, hd = Math.hypot(hx, hz); if (hd > 3.5) { ax += hx / hd * (hd - 3.5) * .45; az += hz / hd * (hd - 3.5) * .45; }   /* 제 무리 자리를 크게 벗어나지 않음 */
      for (const o of list) { if (o === j || !o.on || o.group !== j.group) continue; const dx = j.x - o.x, dz = j.z - o.z, d = Math.hypot(dx, dz) || 1, keep = (j.s + o.s) * .95;
        if (d < keep) { ax += dx / d * (keep - d) * 2.2; az += dz / d * (keep - d) * 2.2; } }                  /* 서로 부딪히지 않게 비킴 */
      if (j.alert > .5) { const want = j.strong ? 8 : 7; ax += dsx / (ds || 1) * (ds - want) * .25 * j.alert; az += dsz / (ds || 1) * (ds - want) * .25 * j.alert; }   /* 경계: 기체 쪽을 향해 알맞은 거리를 둠 */
      /* 오므림 박자: 경계하면 빨라짐. 오므리는 순간 가고 싶은 쪽으로 밀어냄(헤엄) */
      const rate = j.rate * (1 + .55 * j.alert), pc = squeeze(j.ph); j.ph += dt * rate; const nc = squeeze(j.ph), push = Math.max(0, nc - pc);
      const al = Math.hypot(ax, az) || 1, thrust = Math.min(1.6, al) * (j.strong ? 2.4 : 3.2);
      j.vx += ax / al * thrust * push * 2.2; j.vz += az / al * thrust * push * 2.2;
      j.vx *= Math.exp(-dt * 1.1); j.vz *= Math.exp(-dt * 1.1);
      const nx = j.x + j.vx * dt, nz = j.z + j.vz * dt; if (!ctx.blocked || !ctx.blocked(nx, nz)) { j.x = nx; j.z = nz; } else { j.vx *= -.4; j.vz *= -.4; }
      /* 쏘기: 신호(몸이 부풀며 밝아짐 0.6초) → 느린 빛 방울 */
      if (j.alert > .8 && ds < 16) { j.cd = (j.cd ?? 1.5 + Math.random() * 2) - dt;
        if (j.cd <= .6 && !j.tell) { j.tell = t; }
        if (j.cd <= 0) { j.cd = (j.strong ? 2.2 : 3.2) + Math.random() * 1.5; j.tell = 0; ctx.spit?.(j, dsx / (ds || 1), dsz / (ds || 1)); j.ph = 0; } }
      else { j.tell = 0; } } };
  /* 맞음: 밀려나고 움찔 · 체력 다 하면 쓰러짐 */
  /* 떼가 같이 화냄 (사용자 2026-11-04): 한 마리가 맞으면 빛 신호가 떼 안에서 물결처럼 퍼짐(초속 약 9m) → 닿는 차례대로 붉어지며 덤벼듦
     → 무작정 쏘면 떼 전체와 싸움, 가장자리 한 마리만 살살 떼어 잡는 요령이 생김. signals: 그림용 (보낸 해파리, 받는 해파리, 닿는 시각) */
  const signals = []; G.userData.signals = signals;
  const alarm = (j, t) => { for (const o of list) { if (o === j || !o.on || o.dieT > 0 || o.group !== j.group) continue; const d = Math.hypot(o.x - j.x, o.z - j.z), at = t + .15 + d / 9;
      if (!o.alarmAt || at < o.alarmAt) { if (t < (o.alarmUntil || 0) - 6) continue; o.alarmAt = at; signals.push({ a: j, b: o, t0: t, t1: at }); } } };
  /* 해파리 빛이 이 자리를 얼마나 비추나 (0~1): 숨을 곳에 있어도 해파리 빛 안이면 드러남 (사용자 2026-11-04) */
  G.userData.litAt = (x, z) => { let L = 0; for (const j of list) { if (!j.on || j.dieT > 0) continue; const r = (4.5 + 2.5 * j.alert) * j.s, d = Math.hypot(x - j.x, z - j.z); if (d < r) L = Math.max(L, 1 - (d / r) * (d / r)); } return L; };
  G.userData.hit = (j, t, dx, dz, dmg = 1) => { if (!j.on || j.dieT > 0) return false; if (t - (j.sigT || -9) > 1.5) { j.sigT = t; alarm(j, t); } j.alarmUntil = t + 8; j.hitT = t; j.vx += dx * (j.strong ? 1.2 : 2.6); j.vz += dz * (j.strong ? 1.2 : 2.6); j.alert = 1; j.hp -= dmg;
    if (j.hp <= 0) { j.dieT = t; return true; } return false; };
  return G;
}
