/* 빛 알갱이 — 탄·불꽃·번쩍임을 한 번에 그리는 공용 블록 (그리기 1번)
   선이나 면으로 흉내 내지 않고, 화면에서 알갱이마다 "뜨거운 중심 + 퍼지는 빛무리"를 계산한다.
   움직이는 알갱이는 지나온 길만큼 늘어나 보인다(눈에 남는 잔상).
   k(종류) 0 적 탄: 뜨거운 흰 심 + 짙은 색 테두리, 숨 쉬듯 일렁임
          1 프리즘 탄: 흰빛이 가장자리에서 무지개로 갈라짐 (칠한 무지개가 아니라 퍼짐 정도가 색마다 다름)
          2 불티: 가늘고 날카로움
          3 번짐: 심 없이 부드럽게 퍼지는 빛 (폭발·섬광·엔진) */
import * as THREE from 'three';

const MAX = 4096;

export function makeGlow() {
  const quad = new THREE.PlaneGeometry(2, 2);
  const g = new THREE.InstancedBufferGeometry();
  g.index = quad.index; g.setAttribute('position', quad.getAttribute('position'));
  const A = (n) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(MAX * n), n); a.setUsage(THREE.DynamicDrawUsage); return a; };
  const aP = A(3), aT = A(3), aS = A(4), aC = A(4);
  g.setAttribute('iP', aP); g.setAttribute('iT', aT); g.setAttribute('iS', aS); g.setAttribute('iC', aC);
  g.instanceCount = 0;
  const uRes = { value: new THREE.Vector2(1, 1) }, uT = { value: 0 };
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
    uniforms: { uRes, uT },
    vertexShader: `
      attribute vec3 iP; attribute vec3 iT; attribute vec4 iS; attribute vec4 iC;
      uniform vec2 uRes;
      varying vec2 vQ; varying float vL, vR, vK, vSeed, vA, vM; varying vec3 vC;
      void main(){
        mat4 VP = projectionMatrix * viewMatrix;
        vec4 c0 = VP * vec4(iP, 1.), c1 = VP * vec4(iP + iT, 1.);
        vec2 s0 = c0.xy / c0.w * uRes * .5, s1 = c1.xy / c1.w * uRes * .5;
        float r = max(iS.x * projectionMatrix[1][1] * uRes.y * .5 / c0.w, .7);   /* 화면에서의 반지름(픽셀) */
        vec2 d = s1 - s0; float L = length(d); vec2 ax = L > .01 ? d / L : vec2(1., 0.), pr = vec2(-ax.y, ax.x);
        float m = r * (iS.y > 2.5 ? 2.2 : 3.6);                                 /* 빛무리가 닿는 곳까지 */
        float a = mix(-m, L + m, position.x * .5 + .5), p = position.y * m;
        vec2 s = s0 + ax * a + pr * p;
        vQ = vec2(a, p); vM = m; vL = L; vR = r; vK = iS.y; vSeed = iS.z; vA = iS.w; vC = iC.rgb;
        gl_Position = vec4(s / (uRes * .5) * c0.w, c0.z, c0.w);
      }`,
    fragmentShader: `
      precision highp float;
      uniform float uT;
      varying vec2 vQ; varying float vL, vR, vK, vSeed, vA, vM; varying vec3 vC;
      vec3 hue(float h){ return clamp(abs(mod(h * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); }
      void main(){
        float a = clamp(vQ.x, 0., vL), t = vL > .01 ? a / vL : 0.;              /* t: 머리 0 → 꼬리 1 */
        float w = vR * mix(1., .28, t);                                          /* 꼬리로 갈수록 가늘어짐 */
        vec2 q = vec2(vQ.x - a, vQ.y);
        float d = length(q) / w, fade = mix(1., .0, t * t);
        vec3 col;
        if (vK < .5) {                                    /* 적 탄 */
          float br = .85 + .15 * sin(uT * 18. + vSeed * 40.);
          float core = exp(-d * d * 7.) * 2.6, rim = exp(-d * 2.4) * .9, edge = exp(-pow(d - .62, 2.) * 40.) * .7;
          col = (vec3(1., .96, .9) * core + vC * (rim + edge)) * br * fade;
        } else if (vK < 1.5) {                            /* 프리즘 탄: 파장마다 퍼짐 반경이 달라 가장자리에서 갈라짐 */
          col = vec3(0.);
          float sp = clamp((vK - 1.) / .4, 0., 1.);       /* 꺾인 만큼 더 갈라짐 (1.0 보통 ~ 1.4 최대) */
          for (int i = 0; i < 7; i++) { float f = float(i) / 6.;
            float s = 1. + (f - .5) * (.55 + sp * 1.3);   /* 빨강은 넓게, 보라는 좁게 퍼진다 */
            vec2 sq = vec2(q.x, q.y - (f - .5) * sp * w * .9);   /* 많이 꺾이면 색마다 길이 살짝 어긋난다 */
            float ds = length(sq) / w;
            col += hue(f * .83) * exp(-pow(ds / s, 2.) * 5.) * (.42 + sp * .38); }
          col += vec3(1.) * exp(-d * d * 14.) * 1.9;
          col += vC * exp(-d * 1.9) * .22;
          col *= fade;
        } else if (vK < 2.5) {                            /* 불티 */
          col = (vec3(1.) * exp(-d * d * 10.) * 1.4 + vC * exp(-d * 2.2) * .8) * mix(1., .2, t);
        } else {                                          /* 번짐 */
          col = vC * (exp(-d * d * 1.6) * .9 + exp(-d * 1.1) * .25) * mix(1., .5, t);
        }
        float win = 1. - smoothstep(.55, 1., length(q) / vM);          /* 사각 테두리가 보이지 않게 끝에서 0으로 */
        gl_FragColor = vec4(col * vA * win, 1.);
      }`
  });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 10;

  let n = 0;
  return {
    mesh, uRes, uT,
    begin() { n = 0; },
    /* p: 위치, t: 꼬리 방향·길이(머리→꼬리), r: 반지름, k: 종류, c: 색 [r,g,b], a: 밝기 */
    add(px, py, pz, tx, ty, tz, r, k, c, a = 1, seed = 0) {
      if (n >= MAX) return; const i = n++;
      aP.array[i * 3] = px; aP.array[i * 3 + 1] = py; aP.array[i * 3 + 2] = pz;
      aT.array[i * 3] = tx; aT.array[i * 3 + 1] = ty; aT.array[i * 3 + 2] = tz;
      aS.array[i * 4] = r; aS.array[i * 4 + 1] = k; aS.array[i * 4 + 2] = seed; aS.array[i * 4 + 3] = a;
      aC.array[i * 4] = c[0]; aC.array[i * 4 + 1] = c[1]; aC.array[i * 4 + 2] = c[2];
    },
    end() {
      g.instanceCount = n;
      for (const a of [aP, aT, aS, aC]) { a.needsUpdate = true; a.clearUpdateRanges?.(); a.addUpdateRange?.(0, n * a.itemSize); }
    }
  };
}
