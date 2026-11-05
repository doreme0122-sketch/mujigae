/* 하늘 협곡 — 나는 느낌 시험 (사용자 2026-11-05: 우리는 비행기 · 땅이 있더라도 날아가는 기분 · 맵은 일부러 나는 느낌을 주려고 만든다
   · 가장 중요한 둘: 1 높이(떠 있는 느낌) 2 자유(지형을 무시함))
   장면: 부서진 행성 껍질 조각(섬)들이 기체 저 아래(10~18m) 떠 있고, 섬 사이 깊은 틈 아래는 끝없는 별바다.
   · 높이: 섬 윗면이 멀리 아래 · 섬마다 높이가 달라 서로 다른 빠르기로 흘러감 · 더 아래엔 바위 조각이 떠돎 · 맨 아래 별바다는 아주 천천히 흐름
           아래로 갈수록 남보라 우주 안개로 가라앉음(깊을수록 흐림 → 깊이가 보임) · 기체보다 조금 아래 엷은 구름 조각이 흘러 섬이 보였다 가려짐
   · 자유: 땅이라면 못 건널 틈(낭떠러지 아래가 우주)을 그냥 넘어감 · 섬 사이 다리는 가운데가 끊겨 매달려 있음(땅에선 못 건넘)
           막는 건 하늘까지 솟은 바위 첨탑뿐
   무게: 섬 전부 그리기 1번 · 첨탑 1번 · 다리 2번 · 떠도는 조각 1번 · 구름 1번 · 별바다 1번 */
import * as THREE from 'three';

const rng = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
/* 이어 붙여도 이음새 없는 구름 무늬 (128칸, 한 번 구움) */
function bakeFbm(N = 128) {
  const P = 8, hs = (x, y, k) => { x = ((x % P) + P) % P; y = ((y % P) + P) % P; const v = Math.sin(x * 127.1 + y * 311.7 + k * 57.3) * 43758.5453; return v - Math.floor(v); };
  const vn = (x, y, k, p) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), H = (a, b) => hs(a * (8 / p), b * (8 / p), k);
    const a = H(ix, iy), b = H(ix + 1, iy), c = H(ix, iy + 1), d = H(ix + 1, iy + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const d = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const k = (y * N + x) * 4;
    for (let c = 0; c < 4; c++) { let s = 0, w = .5, f = 1; for (let o = 0; o < 4; o++) { const p = P * f; s += w * vn(x / N * p, y / N * p, c * 3 + o, p); w *= .5; f *= 2; } d[k + c] = Math.min(255, s / .9375 * 255); } }
  const t = new THREE.DataTexture(d, N, N); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
}

const COMMON = `
uniform sampler2D uN; uniform vec3 uSun; uniform float uT;
float nz(vec2 p){ return texture2D(uN,p).r; }
float hh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
const vec3 HAZE=vec3(.045,.035,.11);
/* 깊이 안개: 기체 높이(0)에서 아래로 갈수록 남보라 우주로 가라앉음 */
vec3 sink(vec3 c, float y, float dist){ float k=smoothstep(-11.,-75.,y); return mix(c,HAZE,k*.9+.0*dist); }
`;

/* 바위 재질 (섬 · 첨탑 · 떠도는 조각 같이 씀) */
function rockMaterial(uT, uN, sun) {
  return new THREE.ShaderMaterial({
    uniforms: { uT, uN: { value: uN }, uSun: { value: sun } },
    vertexShader: `attribute float aTop; varying vec3 vW, vN; varying float vTop;
      void main(){ vec4 w=vec4(position,1.);
        #ifdef USE_INSTANCING
          w=instanceMatrix*w; vN=normalize(mat3(modelMatrix*instanceMatrix)*normal);
        #else
          vN=normalize(mat3(modelMatrix)*normal);
        #endif
        w=modelMatrix*w; vW=w.xyz; vTop=aTop; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: COMMON + `varying vec3 vW, vN; varying float vTop;
      /* 운석 구덩이 한 칸: 칸 안에 하나(있거나 없거나) · 가장자리 턱은 밝고 안쪽은 해 반대편이 그늘짐 */
      vec3 crater(vec2 p, float cs, inout float rim){ vec2 c=floor(p/cs), f=p/cs-c; float h=hh(c+3.1); if(h>.38) return vec3(0.,0.,0.);
        vec2 o=vec2(hh(c+.7),hh(c+5.3))*.3+.35; float r=.12+.18*hh(c+9.); vec2 d=(f-o)/r; float l=length(d);
        rim=max(rim,smoothstep(.75,1.,l)*smoothstep(1.35,1.,l));
        float bowl=smoothstep(1.,.2,l); return vec3(d*bowl*.9,bowl); }
      void main(){ vec3 n=normalize(vN); float dist=length(vW-cameraPosition);
        float top=smoothstep(.6,.85,n.y)*step(vTop-1.3,vW.y);                                                  /* 섬 윗면 */
        vec2 p=vW.xz;
        /* 윗면: 은회색 우주 먼지 + 운석 구덩이 두 크기 + 가는 금 */
        float rim=0.; vec3 c1=crater(p,7.,rim), c2=crater(p+13.,2.6,rim);
        vec3 tn=normalize(vec3(-(c1.x+c2.x*.7),1.,-(c1.y+c2.y*.7))); tn=normalize(mix(n,tn,top));
        float dust=nz(p*.021)*.6+nz(p*.093)*.4;
        vec3 reg=mix(vec3(.21,.215,.27),vec3(.35,.355,.41),dust)*(1.-.25*max(c1.z,c2.z))+vec3(.1)*rim;
        float crk=smoothstep(.47,.5,nz(p*.05+vec2(.3,.1)))*smoothstep(.53,.5,nz(p*.05+vec2(.3,.1)))*.6;            /* 가는 금 */
        reg*=1.-crk;
        float edge=smoothstep(vTop-.25,vTop-1.2,vW.y);                                                          /* 가장자리 부서진 턱 */
        /* 옆면·아래: 층층 지층(깊이마다 짙고 옅음이 번갈아) + 아주 희미한 광맥 */
        float sy=vW.y*.3+nz(p*.012)*1.5+nz(p*.07+vW.y*.05)*.6;
        float band=fract(sy), str=smoothstep(.0,.08,band)*smoothstep(.55,.45,band);
        vec3 cl=mix(vec3(.13,.12,.18),vec3(.19,.17,.25),str*(.5+.5*nz(p*.03+vW.y*.02)))*(.7+.6*nz(vec2(atan(n.z,n.x)*1.3,vW.y*.09)));   /* 지층은 은은하게, 세로 결로 얼룩 */
        float vein=smoothstep(.03,.0,abs(fract(sy*.5+nz(p*.07)*.6)-.5))*step(.55,nz(vec2(sy*.1,0.)+p*.02));
        vec3 base=mix(cl,reg,top*(1.-edge*.6));
        float dif=max(dot(tn,uSun),0.), amb=.22+.18*tn.y;
        float under=max(-tn.y,0.);                                                                               /* 아래쪽 면은 별바다·성운 빛을 희미하게 받음 */
        vec3 c=base*(vec3(1.,.96,.9)*dif*1.25+vec3(.45,.5,.75)*amb)+vec3(.12,.08,.25)*under*.6;
        c+=vec3(.25,.75,.95)*vein*(1.-top)*.35*(.7+.3*sin(uT*.8+vW.y*.3));
        gl_FragColor=vec4(sink(c,vW.y,dist),1.); }` });
}

export function makeSkyCanyon(uT, sun) {
  const R = rng(9137), uN = bakeFbm(), grp = new THREE.Group();
  const AX = 86, AZ = 52;
  /* ── 섬 자리: 22m 칸마다 하나씩 흔들어 놓고, 넷 중 하나쯤은 빼서 넓은 틈을 만듦 ── */
  const seeds = []; for (let gx = -4; gx <= 4; gx++) for (let gz = -2; gz <= 2; gz++) seeds.push({ x: gx * 22 + (R() - .5) * 13, z: gz * 22 + (R() - .5) * 13 });
  const live = seeds.filter(() => R() > .12);
  const NA = 72, isl = [];
  for (const s of live) { const rs = new Float32Array(NA); let ok = true;
    for (let a = 0; a < NA; a++) { const th = a / NA * Math.PI * 2, ux = Math.cos(th), uz = Math.sin(th); let r = 15;
      for (const o of seeds) { if (o === s) continue; const dx = o.x - s.x, dz = o.z - s.z, D = Math.hypot(dx, dz), c = (dx * ux + dz * uz) / D; if (c <= .05) continue;
        const gap = 5 + 6 * (Math.sin(s.x * .13 + o.z * .17) * .5 + .5);   /* 틈 폭 5~11m (짝마다 다름) */
        r = Math.min(r, (D / 2 - gap / 2) / c); }
      rs[a] = r; }
    for (let a = 0; a < NA; a++) { const th = a / NA * Math.PI * 2; rs[a] *= 1 - .1 * (Math.sin(th * 5 + s.x) * .5 + .5) - .07 * (Math.sin(th * 13 + s.z) * .5 + .5); rs[a] = Math.max(3.5, rs[a]); }   /* 가장자리 들쭉날쭉 */
    if (!ok) continue;
    isl.push({ x: s.x, z: s.z, rs, top: -10 - R() * 8, depth: 26 + R() * 22 }); }
  const rAt = (I, th) => { let f = ((th / (Math.PI * 2)) % 1 + 1) % 1 * NA; const a = Math.floor(f) % NA, b = (a + 1) % NA; f -= Math.floor(f); return I.rs[a] * (1 - f) + I.rs[b] * f; };
  const islandAt = (x, z) => { for (const I of isl) { const dx = x - I.x, dz = z - I.z, d = Math.hypot(dx, dz); if (d < 15 && d < rAt(I, Math.atan2(dz, dx)) * .97) return I; } return null; };

  /* ── 섬 몸: 윗면(가운데 → 안쪽 고리 → 가장자리) + 아래로 갈수록 뾰족하게 줄어드는 바위 뿌리 ── */
  const pos = [], top = [], idx = [];
  const LV = 11;
  for (const I of isl) { const base = pos.length / 3, sd = I.x * .37 + I.z * .71;
    pos.push(I.x, I.top + .15, I.z); top.push(I.top);
    for (const k of [.55, .85]) for (let a = 0; a < NA; a++) { const th = a / NA * Math.PI * 2, r = I.rs[a] * k; pos.push(I.x + Math.cos(th) * r, I.top + (k > .6 ? .05 : .12) * (1 + Math.sin(th * 7 + sd)), I.z + Math.sin(th) * r); top.push(I.top); }
    for (let l = 0; l <= LV; l++) { const q = l / LV, dy = l === 0 ? -.35 : -Math.pow(q, 1.15) * I.depth - .35;
      const taper = 1 - Math.pow(q, 1.5) * .93;
      for (let a = 0; a < NA; a++) { const th = a / NA * Math.PI * 2;
        const col = .55 * Math.sin(th * 23 + sd) + .35 * Math.sin(th * 41 + sd * 2. + q * 1.5);   /* 세로 기둥 결 */
        const ledge = .5 * Math.sin(q * 19 + sd) * q;                                             /* 층마다 튀어나온 턱 */
        const r = Math.max(.3, I.rs[a] * taper + (col + ledge) * (l === 0 ? .3 : 1));
        pos.push(I.x + Math.cos(th) * r, I.top + dy, I.z + Math.sin(th) * r); top.push(I.top); } }
    const tipI = pos.length / 3; pos.push(I.x + Math.sin(sd) * 1.5, I.top - I.depth - 4 - R() * 6, I.z + Math.cos(sd) * 1.5); top.push(I.top);
    const ring = k => base + 1 + k * NA;
    for (let a = 0; a < NA; a++) { const b = (a + 1) % NA; idx.push(base, ring(0) + b, ring(0) + a);
      idx.push(ring(0) + a, ring(0) + b, ring(1) + b, ring(0) + a, ring(1) + b, ring(1) + a);
      idx.push(ring(1) + a, ring(1) + b, ring(2) + b, ring(1) + a, ring(2) + b, ring(2) + a); }
    for (let l = 0; l < LV; l++) for (let a = 0; a < NA; a++) { const b = (a + 1) % NA, A = ring(2 + l), B = ring(3 + l); idx.push(A + a, A + b, B + b, A + a, B + b, B + a); }
    for (let a = 0; a < NA; a++) { const b = (a + 1) % NA, A = ring(2 + LV); idx.push(A + a, A + b, tipI); } }
  const ig = new THREE.BufferGeometry(); ig.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ig.setAttribute('aTop', new THREE.Float32BufferAttribute(top, 1)); ig.setIndex(idx); ig.computeVertexNormals();
  const rock = rockMaterial(uT, uN, sun), islands = new THREE.Mesh(ig, rock); grp.add(islands);

  /* ── 하늘까지 솟은 바위 첨탑 (이것만 길을 막음) ── 섬 가운데서 비틀리며 솟아 기체보다 훨씬 높이 */
  const spires = [], blockers = [];
  { const cand = isl.filter(I => Math.hypot(I.x, I.z) > 18).sort((a, b) => Math.abs(a.x) - Math.abs(b.x));
    const pick = [cand[1], cand[Math.floor(cand.length * .5)], cand[cand.length - 3]].filter(Boolean);
    const sp = [], st = [], si = [];
    for (const I of pick) { const base = sp.length / 3, H = 16 + R() * 8 - I.top, r0 = 2.6 + R() * 1.2, NS = 28, L = 16, sd = I.x * .21;
      for (let l = 0; l <= L; l++) { const q = l / L, y = I.top - 1 + q * H, tw = q * 1.6 + sd, rr = r0 * (1 - q * .82) * (1 + .25 * Math.sin(q * 9 + sd));
        for (let a = 0; a < NS; a++) { const th = a / NS * Math.PI * 2, rib = 1 + .22 * Math.sin(th * 5 + tw * 3) + .1 * Math.sin(th * 11 - tw); sp.push(I.x + Math.cos(th + tw) * rr * rib, y, I.z + Math.sin(th + tw) * rr * rib); st.push(-999); } }
      const tip = sp.length / 3; sp.push(I.x, I.top - 1 + H + 2.5, I.z); st.push(-999);
      for (let l = 0; l < L; l++) for (let a = 0; a < NS; a++) { const b = (a + 1) % NS, A = base + l * NS, B = A + NS; si.push(A + a, B + a, B + b, A + a, B + b, A + b); }
      for (let a = 0; a < NS; a++) si.push(base + L * NS + a, tip, base + L * NS + (a + 1) % NS);
      const qy = (FLYH - (I.top - 1)) / H, rr = r0 * (1 - qy * .82) * (1 + .25 * Math.sin(qy * 9 + sd)) * 1.15;   /* 기체 높이에서의 굵기만큼 막음 */
      blockers.push({ x: I.x, z: I.z, r: rr + .9 }); spires.push(I); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setAttribute('aTop', new THREE.Float32BufferAttribute(st, 1)); sg.setIndex(si); sg.computeVertexNormals();
    grp.add(new THREE.Mesh(sg, rock)); }

  /* ── 끊긴 다리: 이웃 섬 사이를 잇던 다리가 가운데서 끊겨, 끝 토막이 아래로 처져 매달림 ── */
  { const pairs = [];
    for (let i = 0; i < isl.length; i++) for (let j = i + 1; j < isl.length; j++) { const A = isl[i], B = isl[j], dx = B.x - A.x, dz = B.z - A.z, D = Math.hypot(dx, dz); if (D > 30 || Math.abs(A.top - B.top) > 3) continue;
      const th = Math.atan2(dz, dx), ra = rAt(A, th), rb = rAt(B, th + Math.PI), span = D - ra - rb; if (span < 6 || span > 14) continue; pairs.push({ A, B, th, ra, rb, span }); }
    pairs.sort((a, b) => Math.hypot(a.A.x + a.B.x, a.A.z + a.B.z) - Math.hypot(b.A.x + b.B.x, b.A.z + b.B.z));
    const use = []; for (const p of pairs) { if (use.length >= 6) break; if (use.some(u => u.A === p.A || u.B === p.B || u.A === p.B || u.B === p.A)) continue; use.push(p); }
    const deck = [], post = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
    for (const P of use) { const ux = Math.cos(P.th), uz = Math.sin(P.th), seg = 1.5, inA = 4, inB = 4;
      const a0 = [P.A.x + ux * (P.ra - inA), P.A.z + uz * (P.ra - inA)], len = P.span + inA + inB, yA = P.A.top + .45, yB = P.B.top + .45;
      const cutA = inA + P.span * (.25 + R() * .25), cutB = inA + P.span * (.62 + R() * .15);   /* 이 사이가 끊긴 곳 */
      for (let d = 0; d < len; d += seg) { const mid = d + seg / 2; if (mid > cutA && mid < cutB) continue;
        const fromA = mid <= cutA, k = fromA ? (cutA - mid) : (mid - cutB);                         /* 끊긴 끝에서 떨어진 거리 */
        const sag = k < seg * 2.2 ? (seg * 2.2 - k) / (seg * 2.2) : 0;                                 /* 끝 토막 둘은 아래로 처짐 */
        const y = yA + (yB - yA) * (mid / len) - sag * sag * 1.6, pitch = (fromA ? -1 : 1) * sag * .5, roll = sag * (R() - .5) * .5;
        e.set(roll, -P.th, pitch, 'YXZ'); q.setFromEuler(e);
        m4.compose(v.set(a0[0] + ux * mid, y, a0[1] + uz * mid), q, s.set(seg * .96, .32, 2.4)); deck.push(m4.clone());
        if (sag < .5) for (const side of [-1, 1]) { m4.compose(v.set(a0[0] + ux * mid - uz * side * 1.1, y + .45, a0[1] + uz * mid + ux * side * 1.1), q, s.set(.14, .9, .14)); post.push(m4.clone()); } }
      /* 끊겨 떨어진 토막: 아래 떠도는 조각 층에 */
      for (let f = 0; f < 3; f++) { const mid = cutA + (cutB - cutA) * (f + .5) / 3; e.set(R() * 1.5, R() * 6, R() * 1.5); q.setFromEuler(e);
        m4.compose(v.set(a0[0] + ux * mid + (R() - .5) * 4, P.A.top - 9 - R() * 18, a0[1] + uz * mid + (R() - .5) * 4), q, s.set(seg * .9, .3, 2.2)); deck.push(m4.clone()); } }
    const bm = new THREE.MeshStandardMaterial({ color: 0x5a6070, roughness: .55, metalness: .55, flatShading: true, envMapIntensity: .5 });
    bm.onBeforeCompile = sh => { sh.vertexShader = 'varying float vWy;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWy=(modelMatrix*instanceMatrix*vec4(transformed,1.)).y;');
      sh.fragmentShader = 'varying float vWy;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.045,.035,.11),smoothstep(-11.,-75.,vWy)*.9);'); };   /* 아래로 떨어진 토막도 우주 안개에 가라앉음 */
    bm.customProgramCacheKey = () => 'skybridge';
    const mk = (geo, list) => { const im = new THREE.InstancedMesh(geo, bm, list.length); list.forEach((m, i) => im.setMatrixAt(i, m)); im.frustumCulled = false; grp.add(im); };
    mk(new THREE.BoxGeometry(1, 1, 1), deck); mk(new THREE.BoxGeometry(1, 1, 1), post); }

  /* ── 더 아래 떠도는 바위 조각: 천천히 돌며 흘러감 (깊을수록 느리고 흐림) ── */
  const deb = []; let debM;
  { const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { v0.fromBufferAttribute(p, i); const k = 1 + .28 * Math.sin(v0.x * 4.1 + v0.y * 2.3) * Math.cos(v0.z * 3.7); p.setXYZ(i, v0.x * k * 1.2, v0.y * k * .8, v0.z * k); }
    g.computeVertexNormals(); g.setAttribute('aTop', new THREE.Float32BufferAttribute(new Array(p.count).fill(-999), 1));
    const N = 36; debM = new THREE.InstancedMesh(g, rock, N); debM.frustumCulled = false;
    for (let i = 0; i < N; i++) deb.push({ x: (R() - .5) * AX * 2.4, z: (R() - .5) * AZ * 2.4, y: -32 - R() * 40, s: .5 + Math.pow(R(), 2.5) * 2.2, a: R() * 6, b: R() * 6, w: (R() - .5) * .25, vx: .25 + R() * .35 });
    grp.add(debM); }
  const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), ee = new THREE.Euler(), vv = new THREE.Vector3(), ss = new THREE.Vector3();

  /* ── 발밑 구름: 기체보다 조금 아래 엷은 구름 조각이 천천히 흘러, 그 사이로 섬이 보였다 가려짐 ── */
  const clouds = [];
  { const N = 16, g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    const cm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT, uN: { value: uN }, uSun: { value: sun } },
      vertexShader: `varying vec2 vUv; varying vec3 vW; varying float vS; void main(){ vUv=uv; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; vS=fract(instanceMatrix[3].y*7.3); gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: COMMON + `varying vec2 vUv; varying vec3 vW; varying float vS;
        void main(){ vec2 q=vUv-.5; float el=1.-smoothstep(.15,.5,length(q*vec2(1.,1.25)));
          vec4 a=texture2D(uN,vW.xz*.018+vec2(uT*.004,vS)), b=texture2D(uN,vW.xz*.05-vec2(uT*.007,0.)+vS);
          float d=smoothstep(.42,.75,a.r*.65+b.g*.35+el*.35)*el;                                                   /* 솜결 + 가장자리로 흩어짐 */
          float lit=.75+.25*smoothstep(.3,.8,b.b);
          gl_FragColor=vec4(vec3(.62,.62,.8)*lit,d*.42); }` });
    const im = new THREE.InstancedMesh(g, cm, N); im.frustumCulled = false; im.renderOrder = 2;
    for (let i = 0; i < N; i++) clouds.push({ x: (R() - .5) * AX * 2.3, z: (R() - .5) * AZ * 2.3, y: -3 - R() * 3.5, w: 16 + R() * 18, d: 10 + R() * 10, v: .5 + R() * .5 });
    grp.add(im); clouds.mesh = im; }

  /* ── 맨 아래 끝없는 별바다: 아주 깊어 천천히 흐름 · 흰색·분홍빛 흰색·푸른빛 흰색, 또렷한 점 + 희미한 성운 ── */
  const abyss = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ depthWrite: false, uniforms: { uT, uN: { value: uN }, uSun: { value: sun } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: COMMON + `varying vec3 vW;
      vec3 stars(vec2 p, float cs, float dens){ vec2 c=floor(p/cs), f=p/cs-c; float h=hh(c); if(h>dens) return vec3(0.);
        vec2 o=vec2(hh(c+1.3),hh(c+7.1))*.8+.1; float d=length((f-o)*cs), fw=fwidth(p.x)*1.1, r=max(.028*cs*(.4+hh(c+2.)), fw*.9);
        float s=smoothstep(r+fw,r-fw*.5,d)*(r>fw*1.2?1.:r/(fw*1.2));
        float k=hh(c+4.4); vec3 col=k<.45?vec3(1.):k<.72?vec3(1.,.8,.9):vec3(.78,.87,1.);                         /* 흰 · 분홍빛 흰 · 푸른빛 흰 */
        float tw=.8+.2*sin(uT*(1.+h*3.)+h*40.);
        return col*s*(.5+1.1*hh(c+8.))*tw; }
      void main(){ vec2 p=vW.xz;
        vec3 c=stars(p,7.,.22)+stars(p+31.,13.,.14)*1.2+stars(p+71.,26.,.12)*1.6;
        float n1=texture2D(uN,p*.0021).r, n2=texture2D(uN,p*.0067+.3).g;
        float neb=smoothstep(.45,.85,n1*.7+n2*.3);
        vec3 nc=mix(vec3(.10,.04,.22),vec3(.05,.12,.28),n2)*neb*.9+vec3(.25,.08,.3)*smoothstep(.7,.95,n1)*.35;
        gl_FragColor=vec4(HAZE*.55+nc+c,1.); }` }));
  abyss.renderOrder = -1; abyss.position.y = -170; grp.add(abyss);

  return {
    mesh: grp, blockers,
    topAt: (x, z) => { const I = islandAt(x, z); return I ? I.top : null; },
    blocked: (x, z) => { if (Math.abs(x) > AX - 6 || Math.abs(z) > AZ - 6) return true; for (const b of blockers) { const dx = x - b.x, dz = z - b.z; if (dx * dx + dz * dz < b.r * b.r) return true; } return false; },
    update(t, dt, cx, cz) {
      abyss.position.x = cx; abyss.position.z = cz;
      for (let i = 0; i < deb.length; i++) { const d = deb[i]; d.x += d.vx * dt * (1 + d.y / 120); if (d.x > AX * 1.2) d.x -= AX * 2.4; d.a += d.w * dt; d.b += d.w * .7 * dt;
        ee.set(d.a, d.b, d.a * .5); qq.setFromEuler(ee); m4.compose(vv.set(d.x, d.y + Math.sin(t * .2 + i) * .4, d.z), qq, ss.set(d.s, d.s, d.s)); debM.setMatrixAt(i, m4); }
      debM.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < clouds.length; i++) { const c = clouds[i]; c.x += c.v * dt; if (c.x > AX * 1.15) c.x -= AX * 2.3;
        qq.identity(); m4.compose(vv.set(c.x, c.y, c.z), qq, ss.set(c.w, 1, c.d)); clouds.mesh.setMatrixAt(i, m4); }
      clouds.mesh.instanceMatrix.needsUpdate = true; } };
}
const FLYH = .7, v0 = new THREE.Vector3();
