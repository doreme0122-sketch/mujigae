/* 맵 바닥 — 맵 5안을 그대로 깐 오픈월드 바닥 (지역마다 다른 바닥 · 지역 경계 = 바위 능선 · 큰길)
   · 지역 지도 그림 한 장(assets/map/v5.png): R 지역 번호, G 경계(능선) 세기, B 큰길. 한 번 읽어 지역을 알고 그 지역 바닥값으로 그린다
   · 지역 바닥은 지역 바닥 보기(floor.js)와 같은 방식: 구워 둔 구름 그림을 밀고 비틀어 읽기 + 반짝임 물결. 지역마다 색·결·반짝임이 다름
   · 경계는 짙은 바위 능선(나중에 벽이 섬). 큰길이 지나는 곳만 열려 있음
   · 큰길은 다져진 밝은 길 + 길 가운데 희미한 안내 점
   · 화면의 1/4 크기로 그려 늘려 붙임(바닥은 원래 흐릿해 티가 안 남) — 넓은 맵도 가벼움
   맵 6안(10명 개인전 · 정사각형): 그림 1px = SCALE 미터 (1000×1000 → 400×400m). 날아 보고 정함
   지역 번호: 0 앞마당 · 1–5 정글 · 6–10 중간 보스 · 11–15 보물 땅 · 16 무너진 중심부 · 17 소행성 잔해(못 지나감) */
import * as THREE from 'three';

export const MAP = { W: 1000, H: 1000, SCALE: .4 };
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

export async function makeMapFloor(renderer, url) {
  const regTex = await new THREE.TextureLoader().loadAsync(url);
  regTex.colorSpace = THREE.NoColorSpace; regTex.magFilter = regTex.minFilter = THREE.NearestFilter; regTex.generateMipmaps = false; regTex.flipY = false;
  const regSoft = regTex.clone(); regSoft.magFilter = regSoft.minFilter = THREE.LinearFilter; regSoft.needsUpdate = true;      /* 경계·길은 부드럽게 */
  const noise = bakeNoise(), V = (k, n) => ST.map(s => new THREE.Vector3(...s[k].slice(0, 3)));
  const WX = MAP.W * MAP.SCALE, WZ = MAP.H * MAP.SCALE;
  const mat = new THREE.ShaderMaterial({ depthWrite: false, depthTest: false,
    uniforms: { uT: { value: 0 }, uN: { value: noise }, uR: { value: regTex }, uRs: { value: regSoft },
      uA: { value: V('a') }, uB: { value: V('b') }, uG: { value: V('g') },
      uP: { value: ST.map(s => new THREE.Vector4(...s.p)) }, uQ: { value: ST.map(s => new THREE.Vector3(...s.q)) }, uWv: { value: ST.map(s => new THREE.Vector4(...s.wv)) } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `precision highp float; varying vec3 vW; uniform float uT; uniform sampler2D uN, uR, uRs;
      uniform vec3 uA[18], uB[18], uG[18], uQ[18]; uniform vec4 uP[18], uWv[18];
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
        vec3 eg = texture2D(uRs, uv).rgb; float ridge = eg.g, road = eg.b;
        vec4 P = uP[id]; vec3 Q = uQ[id]; vec4 Wv = uWv[id];
        float dens=P.x, speed=P.y, swirl=P.z, sc=P.w, t=uT*speed;
        vec2 L0=layer(vW.xz,sc,t,swirl), L1=layer(vW.xz*1.15+vec2(31.,17.),sc,t*.6,swirl);
        float a0=smoothstep(.35,.85,L0.x)*dens, a1=smoothstep(.38,.85,L1.x)*dens*.6;
        vec3 base = uA[id]*(.55+.35*L1.x);                                                       /* 맨땅: 짙은 색 위에 먼 결 */
        vec3 c0=mix(uA[id],uB[id],smoothstep(.4,.95,L0.x))*(.8+.4*L0.y);
        vec3 c = mix(base, c0, clamp(a0+a1*.5,0.,1.));
        if(Q.y>.5){ float hot=smoothstep(.55,.8,L1.x); c+=vec3(.5,.1,.02)*hot*(.6+.4*sin(uT*1.2+L0.x*9.))*(1.-L0.x*.6); }
        /* 큰길: 다져진 밝은 길 + 가운데 희미한 안내 점 */
        float rd = smoothstep(.6,.9,road), side = smoothstep(.18,.42,road)*(1.-rd);              /* 큰길 · 샛길 */
        vec3 roadC = mix(uB[id], vec3(.34,.32,.27), .5)*(.7+.3*L0.y);
        c = mix(c, roadC, rd*.55);
        c = mix(c, mix(uB[id], vec3(.3,.29,.25), .35)*(.75+.3*L0.y), side*.4);
        if (id==17) { float rb=texture2D(uN,vW.xz*.03).r; c = vec3(.035,.035,.04)*(.5+1.2*rb) + vec3(.06,.055,.05)*smoothstep(.55,.75,texture2D(uN,vW.xz*.11).b); }   /* 소행성 잔해: 울퉁불퉁 짙은 돌 */
        /* 지역 경계 = 짙은 바위 능선 (나중에 벽이 섬) */
        float rk = smoothstep(.15,.6,ridge);
        vec3 rockC = vec3(.05,.055,.065)*(.5+.9*texture2D(uN,vW.xz*.06).b) + vec3(.09,.09,.1)*smoothstep(.6,.8,texture2D(uN,vW.xz*.15).r);
        c = mix(c, rockC, rk);
        /* 반짝임 물결 (지역마다) */
        vec2 gq=vW.xz*.5; vec2 gc=floor(gq); float gh=h2(gc);
        if(gh>1.-.03*Q.x && rk<.3 && id!=17){ vec2 gf=fract(gq)-.5, cc=(gc+.5)*2.;
          float ph = Wv.x<.5 ? dot(cc,Wv.yz) : (Wv.x<1.5 ? length(cc) : atan(cc.y,cc.x)*6.+length(cc)*.25);
          float wv=max(0.,sin(ph*.09-uT*Wv.w+gh*1.3)); wv=wv*wv; wv=wv*wv; wv=wv*wv; wv=wv*wv;   /* 물결 머리에서만 켜짐 (음수 거듭제곱 없이) */
          vec3 gcol=Q.z>.5?hue(fract(gh*7.+uT*.05))*.8+.4:uG[id]; float g=exp(-dot(gf,gf)*120.)*wv;
          c+=gcol*g*2.2; }
        gl_FragColor=vec4(c,1.); }` });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(WX + 200, WZ + 200), mat); plane.rotation.x = -Math.PI / 2;
  const fs = new THREE.Scene(); fs.add(plane);
  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  const comp = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { t: { value: rt.texture } },
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: 'precision highp float;varying vec2 vU;uniform sampler2D t;void main(){ gl_FragColor=vec4(texture2D(t,vU).rgb,1.); }' }));
  const cs = new THREE.Scene(); cs.add(comp); const oc = new THREE.Camera();
  let div = 3, W = 2, H = 2;
  return { mat, ST,
    size(w, h) { W = w; H = h; rt.setSize(Math.max(2, W / div | 0), Math.max(2, H / div | 0)); },
    update(t) { mat.uniforms.uT.value = t; },
    render(camera, target) { renderer.setRenderTarget(rt); renderer.clear(); renderer.render(fs, camera); renderer.setRenderTarget(target); renderer.render(cs, oc); } };
}
