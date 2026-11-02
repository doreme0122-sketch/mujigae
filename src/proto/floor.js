/* 지역 바닥 — 발밑에 깔린 빛나는 구름층 (가볍게 만든 판)
   무게를 줄인 방법
   · 구름 무늬는 처음에 한 번 그림(256×256, 이어 붙여도 이음새 없음)으로 구워 두고, 폰은 그 그림을 밀고 비틀어 읽기만 한다.
   · 두 겹(가까운 겹 + 아래 먼 겹)을 판 하나에서 한 번에 계산 — 먼 겹은 시선이 더 아래 판에 닿는 자리를 읽어 깊이감.
   · 화면의 1/4 크기로 따로 그려 늘려 붙인다(구름은 원래 흐릿해서 티가 안 남). 느려지면 1/6로.
   · 기체가 지나간 자국은 64×64 작은 그림에 찍고 서서히 지워, 한 번만 읽는다.
   · 반짝임은 입자가 아니라 같은 판에서 칸마다 켜질 차례만 정해 물결처럼 순차적으로 켠다(늘 어딘가 흐르고 있음, 개수 한도).
   지역마다: 먼지 들판 · 얼음 서리 · 용암 재 · 결정 가루 · 안개 늪 */
import * as THREE from 'three';

/* wave: 반짝임 물결 [모양 0 한 방향 / 1 둥글게 퍼짐 / 2 소용돌이, 방향x, 방향z, 빠르기] */
export const FLOORS = [
  { id: 'dust', name: '먼지 들판', a: [.16, .15, .14], b: [.3, .27, .23], glint: [1, .95, .85], gk: .5, dens: .55, speed: .02, swirl: .4, scale: .05, wave: [0, .8, .6, .9] },
  { id: 'frost', name: '얼음 서리', a: [.05, .14, .22], b: [.22, .42, .55], glint: [.8, .95, 1.3], gk: 1.1, dens: .6, speed: .015, swirl: .5, scale: .06, wave: [0, -.6, .8, 2.2] },
  { id: 'ash', name: '용암 재', a: [.03, .02, .02], b: [.12, .07, .06], glint: [1.4, .45, .1], gk: 1, dens: .7, speed: .025, swirl: .6, scale: .055, ember: 1, wave: [1, 0, 0, 1.1] },
  { id: 'shard', name: '결정 가루', a: [.07, .04, .12], b: [.22, .14, .32], glint: [1, 1, 1], gk: 1.2, dens: .5, speed: .012, swirl: .3, scale: .07, spec: 1, wave: [0, 1, -.2, .7] },
  { id: 'bog', name: '안개 늪', a: [.02, .09, .09], b: [.07, .3, .28], glint: [.5, 1, .85], gk: .4, dens: .8, speed: .01, swirl: 1.2, scale: .04, wave: [2, 0, 0, .6] }];

/* 이어 붙여도 이음새 없는 구름 그림: R 큰 무늬, G 비틀기용, B 잔무늬 */
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

/* 기체 자국 그림: R 갈라진 정도, G 밀려난 넓은 자국 */
const TN = 64, TSPAN = 140;
function makeTrail() {
  const data = new Uint8Array(TN * TN * 4), tex = new THREE.DataTexture(data, TN, TN); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  const f = new Float32Array(TN * TN * 2);
  return { tex,
    step(dt, sx, sz) { const k = Math.exp(-dt * .55), cx = (sx / TSPAN + .5) * TN, cz = (sz / TSPAN + .5) * TN;
      for (let i = 0; i < f.length; i++) f[i] *= k;
      const r = 2.2; for (let y = Math.floor(cz - r * 2); y <= Math.ceil(cz + r * 2); y++) for (let x = Math.floor(cx - r * 2); x <= Math.ceil(cx + r * 2); x++) { if (x < 0 || y < 0 || x >= TN || y >= TN) continue;
        const d2 = (x - cx) ** 2 + (y - cz) ** 2, i = (y * TN + x) * 2; f[i] = Math.max(f[i], Math.exp(-d2 / (r * r * .35))); f[i + 1] = Math.max(f[i + 1], Math.exp(-d2 / (r * r * 1.6))); }
      for (let i = 0, j = 0; i < f.length; i += 2, j += 4) { data[j] = f[i] * 255; data[j + 1] = f[i + 1] * 255; }
      tex.needsUpdate = true; } };
}

export function floorMaterial(noise, trail) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false,
    uniforms: { uT: { value: 0 }, uN: { value: noise }, uTr: { value: trail }, uA: { value: new THREE.Color() }, uB: { value: new THREE.Color() }, uG: { value: new THREE.Color() },
      uP: { value: new THREE.Vector4() }, uP2: { value: new THREE.Vector4() }, uW: { value: new THREE.Vector4() }, uGlint: { value: 1 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `precision highp float; varying vec3 vW; uniform float uT, uGlint; uniform sampler2D uN, uTr; uniform vec3 uA, uB, uG; uniform vec4 uP, uP2, uW;
      float h2(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      vec3 hue(float h){ return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }
      /* 한 겹: 구운 그림을 비틀어 읽는다 (그림 3번 읽기) */
      vec2 layer(vec2 xz, float sc, float t, float swirl){ vec2 p=xz*sc*.125;
        vec2 w=texture2D(uN,p*.6+vec2(t,-t*.7)).gg-.5; p+=w*swirl*.25;
        vec4 n=texture2D(uN,p+vec2(t*.6,t*.3)); float d=n.r*.8+texture2D(uN,p*2.3-vec2(t*.4,0.)).b*.35;
        return vec2(d,n.b); }
      void main(){
        float dens=uP.x, speed=uP.y, swirl=uP.z, sc=uP.w, gk=uP2.x, ember=uP2.y, spec=uP2.z, t=uT*speed;
        /* 먼 겹: 시선이 아래 판(1.6 더 아래)에 닿는 자리 */
        vec3 rd=normalize(vW-cameraPosition); vec2 xzD=vW.xz+rd.xz/max(-rd.y,.2)*1.6;
        vec2 L0=layer(vW.xz,sc,t,swirl), L1=layer(xzD*1.15+vec2(31.,17.),sc,t*.6,swirl);
        vec2 tr=texture2D(uTr,vW.xz/${TSPAN}.+.5).rg; float part=tr.r, push=max(0.,tr.g-tr.r);   /* 기체 자국 (한 번 읽기) */
        float a0=smoothstep(.35,.85,L0.x)*dens*(1.-part*.92)+push*smoothstep(.3,.7,L0.x)*dens*.55;
        float a1=smoothstep(.38,.85,L1.x)*dens*.6*(1.-part*.4);
        vec3 c0=mix(uA,uB,smoothstep(.4,.95,L0.x))*(.8+.4*L0.y), c1=mix(uA,uB,smoothstep(.4,.95,L1.x))*.7;
        vec3 c=mix(c1,c0,a0/(a0+a1*(1.-a0)+1e-4)); float a=a0+a1*(1.-a0);
        if(ember>.5){ float hot=smoothstep(.55,.8,L1.x); c+=vec3(.5,.1,.02)*hot*(.6+.4*sin(uT*1.2+L0.x*9.))*(1.-L0.x*.6); }
        a*=smoothstep(66.,48.,length(vW.xz));
        /* 반짝임: 칸마다 켜질 차례 → 물결이 지나갈 때 순서대로 켜짐 (늘 어딘가 흐름) */
        vec2 gq=vW.xz*2.; vec2 gc=floor(gq); float gh=h2(gc);
        if(gh>1.-.03*gk*uGlint){ vec2 gf=fract(gq)-.5, cc=(gc+.5)/2.;
          float ph = uW.x<.5 ? dot(cc,uW.yz) : (uW.x<1.5 ? length(cc) : atan(cc.y,cc.x)*6.+length(cc)*.25);
          float wave=pow(max(0.,sin(ph*.35-uT*uW.w+gh*1.3)),24.);                                  /* 물결 머리에서만 켜짐 */
          wave=max(wave,tr.g*smoothstep(.3,.0,tr.r)*.9);                                             /* 기체 둘레는 따라 켜짐 */
          vec3 gcol=spec>.5?hue(fract(gh*7.+uT*.05))*.8+.4:uG; float g=exp(-dot(gf,gf)*120.)*wave*(1.-part);
          c+=gcol*g*2.6; a=max(a,g); }
        gl_FragColor=vec4(c,clamp(a,0.,1.)); }` });
}

/* 바닥: 작은 그림판에 그리고 늘려 붙인다 */
export function makeFloor(renderer, size = 140) {
  const noise = bakeNoise(), trail = makeTrail(), mat = floorMaterial(noise, trail.tex);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat); plane.rotation.x = -Math.PI / 2; plane.position.y = -1.6;
  const fs = new THREE.Scene(); fs.add(plane);
  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  const comp = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, uniforms: { t: { value: rt.texture } },
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: 'precision highp float;varying vec2 vU;uniform sampler2D t;void main(){ vec4 c=texture2D(t,vU); gl_FragColor=vec4(c.rgb/max(c.a,.001),c.a); }' }));
  const cs = new THREE.Scene(); cs.add(comp); const oc = new THREE.Camera();
  let div = 4, W = 2, H = 2;
  const api = { mat, rt, plane,
    get div() { return div; },
    setDiv(d) { div = d; rt.setSize(Math.max(2, W / div | 0), Math.max(2, H / div | 0)); },
    size(w, h) { W = w; H = h; api.setDiv(div); },
    set(F) { const u = mat.uniforms; u.uA.value.setRGB(...F.a); u.uB.value.setRGB(...F.b); u.uG.value.setRGB(...F.glint);
      u.uP.value.set(F.dens, F.speed, F.swirl, F.scale); u.uP2.value.set(F.gk, F.ember || 0, F.spec || 0, 0); u.uW.value.set(...F.wave); },
    update(t, dt, sx, sz) { mat.uniforms.uT.value = t; trail.step(dt, sx, sz); },
    /* 바닥 그리기: 작은 판에 → 지금 그리는 화면에 덮어씀 (target = 덮을 곳) */
    render(camera, target) { renderer.setRenderTarget(rt); renderer.setClearColor(0, 0); renderer.clear(); renderer.render(fs, camera); renderer.setClearColor(0, 1);
      renderer.setRenderTarget(target); renderer.render(cs, oc); } };
  return api;
}
