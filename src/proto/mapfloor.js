/* 맵 바닥 — 맵 5안을 그대로 깐 오픈월드 바닥 (지역마다 다른 바닥 · 지역 경계 = 바위 능선 · 큰길)
   · 지역 지도 그림 한 장(assets/map/v5.png): R 지역 번호, G 경계(능선) 세기, B 큰길. 한 번 읽어 지역을 알고 그 지역 바닥값으로 그린다
   · 지역 바닥은 지역 바닥 보기(floor.js)와 같은 방식: 구워 둔 구름 그림을 밀고 비틀어 읽기 + 반짝임 물결. 지역마다 색·결·반짝임이 다름
   · 경계는 짙은 바위 능선(나중에 벽이 섬). 큰길이 지나는 곳만 열려 있음
   · 큰길은 다져진 밝은 길 + 길 가운데 희미한 안내 점
   · 화면의 1/4 크기로 그려 늘려 붙임(바닥은 원래 흐릿해 티가 안 남) — 넓은 맵도 가벼움
   맵 6안(10명 개인전 · 정사각형): 그림 1px = SCALE 미터 (1000×1000 → 360×360m). 날아 보고 정함
   지역 번호: 0 앞마당 · 1–5 정글 · 6–10 중간 보스 · 11–15 보물 땅 · 16 무너진 중심부 · 17 소행성 잔해(못 지나감) */
import * as THREE from 'three';

export const MAP = { W: 1000, H: 1000, SCALE: .36 };   /* 360×360m: 구역마다 싸우고 피할 공간 (280m는 좁았음) */
export const toWorld = (px, py) => [(px - MAP.W / 2) * MAP.SCALE, (py - MAP.H / 2) * MAP.SCALE];

/* 지역 바닥값: a 짙은 색 · b 밝은 색 · g 반짝임 색 · p (짙기, 흐름 빠르기, 비틀림, 결 크기) · q (반짝임 양, 불씨, 무지개 반짝임) · wv 물결 (모양, x, z, 빠르기) */
const ST = [
  { n: '먼지 들판', a: [.09, .13, .08], b: [.22, .3, .18], g: [1, .95, .8], p: [.55, .02, .4, .05], q: [.5, 0, 0], wv: [0, .8, .6, .9] },
  { n: '떠도는 바위숲', a: [.06, .07, .09], b: [.19, .21, .25], g: [.85, .9, 1], p: [.55, .015, .6, .05], q: [.5, 0, 0], wv: [2, 0, 0, .7] },
  { n: '유성 낙하지', a: [.06, .035, .025], b: [.22, .12, .07], g: [1.3, .6, .25], p: [.65, .022, .55, .055], q: [.9, 1, 0], wv: [1, 0, 0, 1] },
  { n: '안개 늪', a: [.02, .09, .09], b: [.07, .3, .28], g: [.5, 1, .85], p: [.8, .01, 1.2, .04], q: [.4, 0, 0], wv: [2, 0, 0, .6] },
  { n: '블랙홀 협곡', a: [.09, .055, .03], b: [.3, .18, .08], g: [1.2, .8, .4], p: [.65, .03, 1.4, .05], q: [.7, 0, 0], wv: [2, 0, 0, 1.4] },
  { n: '고철 언덕', a: [.08, .075, .065], b: [.24, .21, .17], g: [1, .8, .55], p: [.6, .018, .5, .06], q: [.8, 0, 0], wv: [0, -.5, .8, 1.1] },
  { n: '얼음 성운', a: [.05, .13, .2], b: [.22, .4, .54], g: [.8, .95, 1.3], p: [.6, .015, .5, .06], q: [1.1, 0, 0], wv: [0, -.6, .8, 2.2] },
  { n: '용암 균열', a: [.06, .02, .015], b: [.2, .07, .04], g: [1.4, .45, .1], p: [.7, .025, .6, .055], q: [1, 1, 0], wv: [1, 0, 0, 1.1] },
  { n: '결정 협곡', a: [.04, .06, .14], b: [.15, .22, .42], g: [1, 1, 1], p: [.5, .012, .3, .07], q: [1.2, 0, 1], wv: [0, 1, -.2, .7] },
  { n: '함선 묘지', a: [.08, .05, .045], b: [.22, .14, .12], g: [1.1, .55, .35], p: [.6, .016, .5, .055], q: [.8, 0, 0], wv: [0, .3, .9, .9] },
  { n: '폭풍 고원', a: [.04, .05, .12], b: [.16, .2, .38], g: [.9, .95, 1.3], p: [.65, .035, .9, .06], q: [1, 0, 0], wv: [0, -.8, .2, 2.6] },
  { n: '보물 동굴', a: [.09, .07, .02], b: [.32, .25, .08], g: [1.3, 1, .4], p: [.55, .015, .5, .06], q: [1.3, 0, 0], wv: [1, 0, 0, .8] },
  { n: '웜홀 정원', a: [.06, .03, .1], b: [.22, .12, .35], g: [1, .7, 1.3], p: [.65, .03, 1.5, .05], q: [1, 0, 1], wv: [2, 0, 0, 1.2] },
  { n: '고대 금고', a: [.08, .065, .035], b: [.28, .22, .12], g: [1.2, .95, .55], p: [.5, .012, .4, .06], q: [1, 0, 0], wv: [0, .7, .7, .8] },
  { n: '별빛 광산', a: [.03, .04, .09], b: [.12, .16, .3], g: [1, 1, 1], p: [.5, .01, .4, .07], q: [1.5, 0, 1], wv: [0, -.4, .9, 1] },
  { n: '숨은 동굴', a: [.05, .04, .07], b: [.18, .14, .24], g: [.9, .8, 1.2], p: [.6, .015, .7, .05], q: [.8, 0, 0], wv: [2, 0, 0, .7] },
  { n: '무너진 중심부', a: [.1, .025, .025], b: [.32, .09, .07], g: [1.4, .5, .3], p: [.7, .02, .7, .05], q: [.9, 1, 0], wv: [1, 0, 0, 1.3] },
  { n: '소행성 잔해', a: [.02, .02, .025], b: [.07, .07, .08], g: [.6, .6, .7], p: [.8, .006, .2, .09], q: [.1, 0, 0], wv: [0, 0, 1, .5] }];

function bakeNoise(N = 256) {
  const hash = (x, y, p) => { x = ((x % p) + p) % p; y = ((y % p) + p) % p; const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vn = (x, y, p) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy, p), b = hash(ix + 1, iy, p), c = hash(ix, iy + 1, p), d = hash(ix + 1, iy + 1, p); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, y, base, oct, off) => { let s = 0, a = .5, f = 1; for (let i = 0; i < oct; i++) { s += a * vn(x * f + off, y * f + off * 1.7, base * f); a *= .5; f *= 2; } return s; };
  const data = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = i / N * 8, y = j / N * 8, k = (j * N + i) * 4;
    data[k] = fbm(x, y, 8, 5, 0) * 255; data[k + 1] = fbm(x, y, 8, 3, 37) * 255; data[k + 2] = fbm(x * 2, y * 2, 16, 3, 91) * 255; data[k + 3] = 255; }
  const t = new THREE.DataTexture(data, N, N); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}

/* 안개 색 지도: 땅마다 안개 색을 칠한 뒤 크게 번지게 함 → 땅 경계에서 안개 색이 칸칸이 끊기지 않고 섞이며 넘어감 (안개는 흘러 퍼지는 것) */
function fogTex(img) {
  const c = document.createElement('canvas'), N = img.width; c.width = c.height = N; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, N, N).data, A = new Float32Array(N * N * 3), B = new Float32Array(N * N * 3);
  for (let i = 0; i < N * N; i++) { const id = Math.min(17, Math.round(d[i * 4] / 12)), f = ST[id].b; A[i * 3] = f[0]; A[i * 3 + 1] = f[1]; A[i * 3 + 2] = f[2]; }
  const R = 3, blur = (src, dst, dx, dy) => { for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let r = 0, gg = 0, b = 0;
      for (let k = -R; k <= R; k++) { const x = Math.min(N - 1, Math.max(0, i + k * dx)), y = Math.min(N - 1, Math.max(0, j + k * dy)), o = (y * N + x) * 3; r += src[o]; gg += src[o + 1]; b += src[o + 2]; }
      const o = (j * N + i) * 3, w = 1 / (2 * R + 1); dst[o] = r * w; dst[o + 1] = gg * w; dst[o + 2] = b * w; } };
  blur(A, B, 1, 0); blur(B, A, 0, 1); blur(A, B, 1, 0); blur(B, A, 0, 1);              /* 두 번 번지기 = 부드러운 둥근 번짐 */
  const out = new Uint8Array(N * N * 4); for (let i = 0; i < N * N; i++) { const r = A[i * 3], gg = A[i * 3 + 1], b = A[i * 3 + 2], m = (r + gg + b) / 3; [r, gg, b].forEach((v, k) => out[i * 4 + k] = Math.min(255, Math.max(0, (m + (v - m) * 1.8) * 1.7) * 255));   /* 색을 또렷하게(채도 1.8배, 밝기 1.7배) → 땅마다 안개가 한눈에 구분 */ out[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(out, N, N); t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
}

export async function makeMapFloor(renderer, url) {
  const regTex = await new THREE.TextureLoader().loadAsync(url);
  regTex.colorSpace = THREE.NoColorSpace; regTex.magFilter = regTex.minFilter = THREE.NearestFilter; regTex.generateMipmaps = false; regTex.flipY = false;
  const regSoft = regTex.clone(); regSoft.magFilter = regSoft.minFilter = THREE.LinearFilter; regSoft.needsUpdate = true;      /* 경계·길은 부드럽게 */
  const noise = bakeNoise();
  /* 땅 색은 칠하지 않음 (사용자 결정 2026-11-03): 모든 땅이 같은 짙은 우주 바닥 색 · 같은 흰 반짝임.
     땅마다 다른 건 바닥 결이 흐르는 빠르기·비틀림·반짝임 물결 모양, 그리고 안개 색. 불씨(붉은 얼룩)·무지개 반짝임도 색이라 뺌 */
  const ONE = { a: [.045, .05, .06], b: [.16, .17, .19], g: [.9, .92, 1] }, V = k => ST.map(s => k === 'q' ? new THREE.Vector3(s.q[0], 0, 0) : new THREE.Vector3(...(ONE[k] || s[k]).slice(0, 3)));
  const WX = MAP.W * MAP.SCALE, WZ = MAP.H * MAP.SCALE;
  const mat = new THREE.ShaderMaterial({ depthWrite: false, depthTest: false,
    uniforms: { uT: { value: 0 }, uFog: { value: 1 }, uN: { value: noise }, uR: { value: regTex }, uRs: { value: regSoft }, uWf: { value: regSoft },
      uA: { value: V('a') }, uB: { value: V('b') }, uFc: { value: fogTex(regTex.image) }, uG: { value: V('g') },
      uP: { value: ST.map(s => new THREE.Vector4(...s.p)) }, uQ: { value: V('q') }, uWv: { value: ST.map(s => new THREE.Vector4(...s.wv)) } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `precision highp float; varying vec3 vW; uniform float uT, uFog; uniform sampler2D uN, uR, uRs, uWf;
      uniform vec3 uA[18], uB[18], uG[18], uQ[18]; uniform sampler2D uFc; uniform vec4 uP[18], uWv[18];
      float h2(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      vec3 hue(float h){ return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }
      vec2 layer(vec2 xz, float sc, float t, float swirl){ vec2 p=xz*sc*.125;
        vec2 w=texture2D(uN,p*.6+vec2(t,-t*.7)).gg-.5; p+=w*swirl*.25;
        vec4 n=texture2D(uN,p+vec2(t*.6,t*.3)); float d=n.r*.8+texture2D(uN,p*2.3-vec2(t*.4,0.)).b*.35;
        return vec2(d,n.b); }
      void main(){
        vec2 uv = vW.xz/vec2(${WX.toFixed(1)}, ${WZ.toFixed(1)}) + .5;
        if (uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.) { gl_FragColor=vec4(.01,.012,.02,1.); return; }
        int id = int(floor(texture2D(uR, uv).r*255./12.+.5)); id = id<0?0:(id>17?17:id);
        vec3 eg = texture2D(uRs, uv).rgb; float road = eg.b;   /* 벽 자리 = 바위벽과 같은 벽 높이 지도 */
        vec4 P = uP[id]; vec3 Q = uQ[id]; vec4 Wv = uWv[id];
        /* 안개 결(흐름 빠르기·비틀림·결 크기)은 맵 전체가 하나: 땅마다 달리 하면 경계에서 값이 칸칸이 바뀌어 무늬가 찢어짐.
           땅의 차이는 안개 색(부드러운 색 지도)으로만 → 경계에서 결은 이어지고 색만 넘어감 */
        float dens=.8, speed=.016, swirl=.7, sc=.055, t=uT*speed;
        vec2 L0=layer(vW.xz,sc,t,swirl), L1=layer(vW.xz*1.15+vec2(31.,17.),sc,t*.6,swirl);
        float a0=smoothstep(.35,.85,L0.x)*dens, a1=smoothstep(.38,.85,L1.x)*dens*.6;
        vec3 base = uA[id]*(.55+.35*L1.x);                                                       /* 맨땅: 짙은 색 위에 먼 결 */
        vec3 c0=mix(uA[id],texture2D(uFc,uv).rgb,smoothstep(.4,.95,L0.x))*(.8+.4*L0.y);                      /* 안개는 땅마다 제 색 (바닥은 칠하지 않음): 얼음 성운 푸른 안개, 용암 붉은 안개… */
        vec3 c = mix(base, c0, clamp(a0+a1*.5,0.,1.));
        /* 안개 끔: 흘러가는 구름 결 없이 땅 색 그대로 (서서히 걷힘) */
        vec3 clr = mix(uA[id],uB[id],.3)*(.72+.4*texture2D(uN,vW.xz*.05).r);
        c = mix(clr, c, uFog);
        if(Q.y>.5){ float hot=smoothstep(.55,.8,L1.x); c+=vec3(.5,.1,.02)*hot*(.6+.4*sin(uT*1.2+L0.x*9.))*(1.-L0.x*.6); }
        /* 길 그림은 그리지 않음 (사용자 결정 2026-11-03): 길은 벽 사이 열린 땅 그 자체 */
        { float dw = smoothstep(.35,.65,texture2D(uWf, uv).b);   /* 소행성 잔해 가장자리: 부드럽게 (칸칸이 계단지지 않게) */
          float rb=texture2D(uN,vW.xz*.03).r; vec3 dc = vec3(.035,.035,.04)*(.5+1.2*rb) + vec3(.06,.055,.05)*smoothstep(.55,.75,texture2D(uN,vW.xz*.11).b);
          c = mix(c, dc, dw); }   /* 소행성 잔해: 울퉁불퉁 짙은 돌 */
        /* 지역 경계 = 짙은 바위 능선 (나중에 벽이 섬) */
        /* 바위 능선(벽 자리): 바닥보다 확 밝은 돌 띠 + 짙은 그림자 테두리 + 윗면 빛 → 멀리서도 '못 지나가는 곳'이 보이게 */
        /* 벽 자리 그림은 막힘(1)/지나감(0) 둘뿐 → 보이는 돌 띠 = 실제로 부딪히는 자리. 경계 판정은 게임과 같은 .5 */
        /* 벽 밑 땅은 칠하지 않음: 벽은 바위벽 그 자체로만 보임 (사용자 결정 2026-11-03) */
        /* 바닥 반짝임 물결은 없앰 (사용자 2026-11-03: 맵에 번쩍번쩍하는 것 없앰) */
        gl_FragColor=vec4(c,1.); }` });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(WX + 200, WZ + 200), mat); plane.rotation.x = -Math.PI / 2;
  const fs = new THREE.Scene(); fs.add(plane);
  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  const comp = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { t: { value: rt.texture } },
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: 'precision highp float;varying vec2 vU;uniform sampler2D t;void main(){ gl_FragColor=vec4(texture2D(t,vU).rgb,1.); }' }));
  const cs = new THREE.Scene(); cs.add(comp); const oc = new THREE.Camera();
  let div = 3, W = 2, H = 2;
  return { mat, ST, noise,
    size(w, h) { W = w; H = h; rt.setSize(Math.max(2, W / div | 0), Math.max(2, H / div | 0)); },
    update(t) { mat.uniforms.uT.value = t; },
    render(camera, target) { renderer.setRenderTarget(rt); renderer.clear(); renderer.render(fs, camera); renderer.setRenderTarget(target); renderer.render(cs, oc); } };
}
