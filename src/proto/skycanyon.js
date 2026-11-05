/* 하늘 섬 — 나는 느낌 시험 2판 (사용자 2026-11-05: 하늘 협곡 방향이 맞음 · 아바타의 하늘섬 같은 느낌이면 좋겠다 · 무겁지 않게)
   (1판 = 납작한 회색 행성 조각 + 별바다 → 높이·자유는 맞았지만 메마름)
   장면: 외계 위성 하늘에 떠 있는 바위산들. 산은 위로 솟고 아래로 길게 뾰족해지며, 꼭대기·옆면을 외계 식물이 덮고 밤빛처럼 은은히 빛남.
         산 가장자리에서 폭포가 떨어지다 아래 구름 바다로 사라짐. 산과 산 사이를 굵은 덩굴이 처져 잇고, 몇 줄은 끊겨 늘어짐.
         저 아래 구름 바다가 깔리고, 구름이 갈라진 틈으로 깊은 우주가 언뜻 보임.
   · 높이: 낮은 섬들은 기체 4~16m 아래 · 섬마다 높이가 달라 다른 빠르기로 흘러감 · 맨 아래 구름 바다(38m 아래)는 아주 천천히 흐름
           산 아래쪽은 구름 바다로 가라앉아 흐려짐 · 기체 조금 아래 엷은 구름 조각이 지나감 · 그림자는 아래 섬 위에 작게, 틈 위에선 사라짐
   · 자유: 섬 사이 틈(아래는 구름 바다)을 그냥 넘어감 · 덩굴은 걸어선 못 건넘 · 막는 건 기체보다 높이 솟은 봉우리뿐
   무게 (사용자 2026-11-05: 무겁지 않을까?):
   · 산을 덮는 식물은 표면 무늬로 그림(잎을 하나하나 세우지 않음) · 3D 나무는 낮은 섬 꼭대기에만 몇 그루(불투명)
   · 구름 바다 = 불투명 판 하나(산 아래쪽을 가려 그리기도 줄여 줌) · 폭포 = 정해진 몇 줄기 가는 띠
   · 그리기: 산 1번 · 나무 2번 · 덩굴 1번 · 폭포 1번 · 떠도는 바위 1번 · 구름 조각 1번 · 구름 바다 1번 */
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

const SEA = -38;   /* 구름 바다 높이 */
const COMMON = `
uniform sampler2D uN; uniform vec3 uSun; uniform float uT;
float nz(vec2 p){ return texture2D(uN,p).r; }
vec4 nz4(vec2 p){ return texture2D(uN,p); }
float hh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
const vec3 MIST=vec3(.27,.25,.38);
/* 아래로 갈수록 구름 바다 빛으로 흐려짐 (산 아래쪽이 구름 속으로 사라짐) */
vec3 sink(vec3 c, float y){ float k=smoothstep(-12.,${SEA.toFixed(1)}+2.,y); return mix(c,MIST*.8,k*k*.92); }
/* 생물 빛 점: 칸마다 하나(있거나 없거나) · 청록·분홍 · 저마다 다른 박자로 숨 쉬듯 */
vec3 glowDots(vec2 p, float cs, float dens){ vec2 c=floor(p/cs), f=p/cs-c; float h=hh(c); if(h>dens) return vec3(0.);
  vec2 o=vec2(hh(c+1.7),hh(c+4.3))*.6+.2; float d=length(f-o)*cs, r=cs*(.07+.07*hh(c+2.2));
  float s=smoothstep(r,r*.25,d); vec3 col=hh(c+8.8)<.62?vec3(.25,1.,.9):vec3(1.,.35,.85);
  return col*s*(.55+.45*sin(uT*(.7+h*1.3)+h*30.)); }
`;

/* 바위산 재질: 꼭대기 = 외계 이끼·풀 무늬 + 빛 점 · 옆면 = 보랏빛 회색 바위(물 자국 세로 결) + 위에서 늘어진 덩굴 · 아래쪽 = 구름 빛으로 흐려짐 */
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
      void main(){ vec3 n=normalize(vN); vec2 p=vW.xz; float below=vTop-vW.y;
        float top=smoothstep(.42,.72,n.y)*step(below,2.2);                                                       /* 꼭대기 */
        /* 꼭대기 식물: 짙은 청록 풀 + 보랏빛 이끼 무리 + 잔결 */
        vec4 a=nz4(p*.035), b=nz4(p*.16), c4=nz4(p*.6);
        vec3 veg=mix(vec3(.035,.16,.15),vec3(.09,.30,.22),a.r)*(.7+.6*b.g);
        veg=mix(veg,vec3(.17,.07,.24)*(.8+.4*b.b),smoothstep(.55,.7,a.g)*.85);
        veg*=.75+.5*c4.r;
        /* 옆면 덩굴: 꼭대기 끝에서 아래로 늘어짐 · 줄기마다 길이가 다름 */
        float len=1.5+9.*nz(p*.11+.3), strand=smoothstep(.42,.6,nz(p*.9+vec2(0.,vW.y*.02)));
        float vine=(1.-top)*strand*smoothstep(len,len*.6,below)*step(-.5,below);
        /* 바위: 보랏빛 회색 · 물 흘러내린 세로 자국 · 은은한 지층 */
        float stk=nz(vec2((p.x+p.y)*.35,vW.y*.015))*.6+nz(p*.25)*.4, band=smoothstep(.35,.65,fract(vW.y*.22+nz(p*.02)*2.));
        vec3 rk=mix(vec3(.12,.11,.16),vec3(.24,.21,.28),stk)*(.85+.25*band);
        vec3 base=mix(mix(rk,veg*.85,vine),veg,top);
        float dif=max(dot(n,uSun),0.), amb=.3+.2*n.y, under=max(-n.y,0.);
        vec3 col=base*(vec3(1.,.95,.88)*dif*1.2+vec3(.42,.48,.7)*amb)+MIST*.1*under;                             /* 아래 면은 구름 바다 빛을 받음 */
        col+=glowDots(p,1.3,.22)*(top+vine)*.9+glowDots(p+7.,3.1,.12)*top*1.3;                                    /* 생물 빛 점 */
        gl_FragColor=vec4(sink(col,vW.y),1.); }` });
}

export function makeSkyCanyon(uT, sun) {
  const R = rng(5521), uN = bakeFbm(), grp = new THREE.Group();
  const AX = 86, AZ = 52, v0 = new THREE.Vector3();
  /* ── 섬 자리: 20m 칸마다 하나씩 흔들어 놓음 · 섬 크기는 저마다(반지름 5~13m) · 가끔 기체보다 높이 솟은 봉우리 ── */
  const seeds = []; for (let gx = -5; gx <= 5; gx++) for (let gz = -3; gz <= 3; gz++) seeds.push({ x: gx * 19 + (R() - .5) * 11, z: gz * 19 + (R() - .5) * 11 });
  const live = seeds.filter(() => R() > .2);
  const NA = 64, isl = [];
  for (const s of live) { const rs = new Float32Array(NA), cap = 5 + R() * 8;
    for (let a = 0; a < NA; a++) { const th = a / NA * Math.PI * 2, ux = Math.cos(th), uz = Math.sin(th); let r = cap;
      for (const o of live) { if (o === s) continue; const dx = o.x - s.x, dz = o.z - s.z, D = Math.hypot(dx, dz), c = (dx * ux + dz * uz) / D; if (c <= .05) continue; r = Math.min(r, (D / 2 - 2.6) / c); }
      rs[a] = r; }
    for (let a = 0; a < NA; a++) { const th = a / NA * Math.PI * 2; rs[a] = Math.max(2.6, rs[a] * (1 - .12 * (Math.sin(th * 3 + s.x) * .5 + .5) - .06 * (Math.sin(th * 9 + s.z) * .5 + .5))); }
    const tall = Math.hypot(s.x, s.z) > 16 && R() < .09;
    isl.push({ x: s.x, z: s.z, rs, tall, top: tall ? 2.5 + R() * 3 : -6 - R() * 10 }); }
  const rAt = (I, th) => { let f = ((th / (Math.PI * 2)) % 1 + 1) % 1 * NA; const a = Math.floor(f) % NA, b = (a + 1) % NA; f -= Math.floor(f); return I.rs[a] * (1 - f) + I.rs[b] * f; };
  const meanR = I => I.rs.reduce((a, b) => a + b, 0) / NA;
  const islandAt = (x, z) => { for (const I of isl) { const dx = x - I.x, dz = z - I.z, d = Math.hypot(dx, dz); if (d < 14 && d < rAt(I, Math.atan2(dz, dx)) * .97) return I; } return null; };

  /* ── 바위산 몸: 둥근 꼭대기 → 거의 곧게 선 벼랑(세로 기둥 결 · 꼭대기 바로 아래 살짝 튀어나온 턱) → 아래로 길게 뾰족해져 구름 바다 속으로 ── */
  const pos = [], tops = [], idx = [], LV = 13;
  for (const I of isl) { const base = pos.length / 3, sd = I.x * .37 + I.z * .71, mr = meanR(I), dome = mr * (I.tall ? .5 : .18);
    I.dome = dome;
    pos.push(I.x, I.top + dome, I.z); tops.push(I.top);
    const KS = [.3, .58, .8, .94];
    for (const k of KS) for (let a = 0; a < NA; a++) { const th = a / NA * Math.PI * 2, r = I.rs[a] * k; pos.push(I.x + Math.cos(th) * r, I.top + dome * (1 - k * k) + .25 * Math.sin(th * 5 + sd + k * 3), I.z + Math.sin(th) * r); tops.push(I.top); }
    const bot = SEA - 8 - R() * 6, H = I.top - bot;
    for (let l = 0; l <= LV; l++) { const q = l / LV, dy = -Math.pow(q, 1.25) * H - .2;
      const lip = l === 1 ? 1.06 : 1, taper = (1 - THREE.MathUtils.smoothstep(q, .25, 1) * .9) * lip;
      for (let a = 0; a < NA; a++) { const th = a / NA * Math.PI * 2;
        const col = .45 * Math.sin(th * 17 + sd) + .3 * Math.sin(th * 31 + sd * 2 + q * 2);   /* 세로 기둥 결 */
        const r = Math.max(.4, I.rs[a] * taper + col * (l === 0 ? .2 : 1) * (1 - q * .6));
        pos.push(I.x + Math.cos(th) * r, I.top + dy, I.z + Math.sin(th) * r); tops.push(I.top); } }
    const tipI = pos.length / 3; pos.push(I.x + Math.sin(sd) * 1.2, bot - 4, I.z + Math.cos(sd) * 1.2); tops.push(I.top);
    const ring = k => base + 1 + k * NA, NR = KS.length + LV + 1;
    for (let a = 0; a < NA; a++) idx.push(base, ring(0) + (a + 1) % NA, ring(0) + a);
    for (let k = 0; k < NR - 1; k++) for (let a = 0; a < NA; a++) { const b = (a + 1) % NA, A = ring(k), B = ring(k + 1); idx.push(A + a, A + b, B + b, A + a, B + b, B + a); }
    for (let a = 0; a < NA; a++) idx.push(ring(NR - 1) + a, ring(NR - 1) + (a + 1) % NA, tipI); }
  const ig = new THREE.BufferGeometry(); ig.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ig.setAttribute('aTop', new THREE.Float32BufferAttribute(tops, 1)); ig.setIndex(idx); ig.computeVertexNormals();
  const rock = rockMaterial(uT, uN, sun); grp.add(new THREE.Mesh(ig, rock));
  /* 막힘: 기체보다 높이 솟은 봉우리만 (기체 높이에서의 굵기만큼) */
  const blockers = isl.filter(I => I.tall).map(I => ({ x: I.x, z: I.z, r: meanR(I) * .95 + .8 }));

  /* ── 외계 나무: 낮은 섬 꼭대기에만, 기체 높이엔 닿지 않게 · 우산처럼 펼친 잎 지붕, 밑면에 빛나는 잎맥 ── */
  { const tr = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
    for (const I of isl) { if (I.tall) continue; const n = Math.round(meanR(I) / 3.2 * R() + R());
      for (let i = 0; i < n; i++) { const th = R() * 6.28, rr = rAt(I, th) * (.15 + R() * .5), x = I.x + Math.cos(th) * rr, z = I.z + Math.sin(th) * rr, k = rr / Math.max(1, rAt(I, th) * .94);
        const gy = I.top + I.dome * (1 - k * k), h = Math.min(2.2 + R() * 3, -1.6 - gy - 1); if (h < 1.4) continue; tr.push({ x, y: gy - .1, z, h, w: 1.6 + R() * 1.8, lean: (R() - .5) * .3, yaw: R() * 6.28 }); } }
    const trunk = new THREE.CylinderGeometry(.16, .34, 1, 7, 4, true); trunk.translate(0, .5, 0);
    { const p = trunk.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y * 3) * .12 * y); } trunk.computeVertexNormals(); }
    const can = new THREE.SphereGeometry(1, 14, 7); { const p = can.attributes.position; for (let i = 0; i < p.count; i++) { v0.fromBufferAttribute(p, i); const r = Math.hypot(v0.x, v0.z), y = v0.y > 0 ? v0.y * .35 : v0.y * .12 - r * r * .18;   /* 위는 낮게 둥글고, 가장자리는 아래로 처짐 */ p.setXYZ(i, v0.x * (1 + .1 * Math.sin(Math.atan2(v0.z, v0.x) * 6)), y, v0.z * (1 + .1 * Math.sin(Math.atan2(v0.z, v0.x) * 6))); } can.computeVertexNormals(); }
    const tm = new THREE.ShaderMaterial({ uniforms: { uT, uN: { value: uN }, uSun: { value: sun }, uKind: { value: 0 } },
      vertexShader: `varying vec3 vW, vN, vL; void main(){ vL=position; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix*instanceMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: COMMON + `uniform float uKind; varying vec3 vW, vN, vL;
        void main(){ vec3 n=normalize(vN); float dif=max(dot(n,uSun),0.); vec3 c;
          if(uKind<.5){ c=vec3(.09,.07,.1)*(.6+.8*nz(vec2(atan(vL.z,vL.x)*.5,vL.y*.6)))*(.4+.8*dif); }                   /* 줄기: 짙은 보랏빛 껍질 */
          else { float r=length(vL.xz), ang=atan(vL.z,vL.x);
            float vein=smoothstep(.06,.0,abs(fract(ang*1.9+r*.4)-.5))*smoothstep(.15,.4,r);                          /* 잎맥: 가운데서 바깥으로 */
            vec3 leaf=mix(vec3(.04,.17,.15),vec3(.10,.34,.26),nz(vW.xz*.3))*(.75+.4*nz(vW.xz*1.4));
            float bot=step(n.y,-.1);
            c=leaf*(vec3(1.,.95,.88)*dif*1.15+vec3(.4,.46,.68)*(.3+.2*n.y));
            c+=mix(vec3(.25,1.,.9),vec3(1.,.4,.85),step(.6,hh(floor(vW.xz))))*vein*(.25+bot*.55)*(.7+.3*sin(uT*1.1+r*3.)); }   /* 밑면 잎맥이 은은히 빛남 */
          gl_FragColor=vec4(sink(c,vW.y),1.); }` });
    const cm = tm.clone(); cm.uniforms = { ...tm.uniforms, uKind: { value: 1 } };
    const T = new THREE.InstancedMesh(trunk, tm, tr.length), C = new THREE.InstancedMesh(can, cm, tr.length);
    tr.forEach((t, i) => { e.set(t.lean, t.yaw, t.lean * .6, 'YXZ'); q.setFromEuler(e); m4.compose(v.set(t.x, t.y, t.z), q, s.set(1, t.h, 1)); T.setMatrixAt(i, m4);
      const top = new THREE.Vector3(0, t.h, 0).applyQuaternion(q); m4.compose(v.set(t.x + top.x, t.y + top.y, t.z + top.z), q, s.set(t.w, t.w * .8, t.w)); C.setMatrixAt(i, m4); });
    grp.add(T, C); }

  /* ── 덩굴 다리: 이웃한 낮은 섬 사이를 굵은 덩굴 두세 줄이 처져 이음 · 몇 줄은 끊겨 아래로 늘어짐 ── */
  { const curves = [];
    const pairs = []; for (let i = 0; i < isl.length; i++) for (let j = i + 1; j < isl.length; j++) { const A = isl[i], B = isl[j]; if (A.tall || B.tall) continue; const dx = B.x - A.x, dz = B.z - A.z, D = Math.hypot(dx, dz); if (D > 26) continue;
      const th = Math.atan2(dz, dx), ra = rAt(A, th), rb = rAt(B, th + Math.PI), span = D - ra - rb; if (span < 3.5 || span > 11) continue; pairs.push({ A, B, th, ra, rb, span }); }
    const used = new Set(); let np = 0;
    for (const P of pairs) { if (np >= 12 || used.has(P.A) || used.has(P.B)) continue; used.add(P.A); used.add(P.B); np++;
      const ux = Math.cos(P.th), uz = Math.sin(P.th), nx = -uz, nzv = ux, ns = 2 + (R() < .5 ? 1 : 0);
      for (let k = 0; k < ns; k++) { const off = (k - (ns - 1) / 2) * 1.4 + (R() - .5) * .6, ya = P.A.top - .8 - R() * 1.2, yb = P.B.top - .8 - R() * 1.2;
        const a = new THREE.Vector3(P.A.x + ux * (P.ra - .6) + nx * off, ya, P.A.z + uz * (P.ra - .6) + nzv * off), b = new THREE.Vector3(P.B.x - ux * (P.rb - .6) + nx * off, yb, P.B.z - uz * (P.rb - .6) + nzv * off);
        const sag = 1.5 + P.span * .35 + R() * 1.5;
        if (R() < .3) { /* 끊긴 덩굴: 양쪽에서 아래로 늘어짐 */
          for (const [p0, dir] of [[a, 1], [b, -1]]) { const L = P.span * (.25 + R() * .25); const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector3(p0.x + ux * dir * L * t * (1 - t * .5), p0.y - t * t * (L * .9 + 2.5), p0.z + uz * dir * L * t * (1 - t * .5))); } curves.push({ c: new THREE.CatmullRomCurve3(pts), r: .18 + R() * .1 }); } }
        else { const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -sag * 4 * t * (1 - t), 0))); } curves.push({ c: new THREE.CatmullRomCurve3(pts), r: .2 + R() * .14 }); } } }
    const gs = curves.map(({ c, r }) => new THREE.TubeGeometry(c, 18, r, 5, false));
    if (gs.length) { const g = mergeGeos(gs), vm = new THREE.ShaderMaterial({ uniforms: { uT, uN: { value: uN }, uSun: { value: sun } },
        vertexShader: `varying vec3 vW, vN; varying vec2 vUv; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
        fragmentShader: COMMON + `varying vec3 vW, vN; varying vec2 vUv;
          void main(){ vec3 n=normalize(vN); float dif=max(dot(n,uSun),0.);
            float tw=smoothstep(.3,.7,fract(vUv.x*26.+vUv.y*2.));                                                       /* 꼬인 줄기 결 */
            vec3 c=mix(vec3(.04,.12,.10),vec3(.08,.24,.17),tw)*(vec3(1.,.95,.88)*dif*1.2+vec3(.4,.46,.68)*.35);
            float bead=smoothstep(.12,.0,abs(fract(vUv.x*9.-uT*.15)-.5))*step(.6,hh(vec2(floor(vUv.x*9.-uT*.15),floor(vW.x+vW.z))));   /* 줄기를 타고 천천히 흐르는 빛 마디 */
            c+=vec3(.3,1.,.85)*bead*.6;
            gl_FragColor=vec4(sink(c,vW.y),1.); }` });
      grp.add(new THREE.Mesh(g, vm)); } }

  /* ── 폭포: 낮은 섬 몇 곳 가장자리에서 떨어져, 내려갈수록 퍼지고 옅어지다 구름 바다로 사라짐 ── */
  { const fp = [], fu = [], fi = [], cand = isl.filter(I => !I.tall && meanR(I) > 6).slice(0, 40); let nf = 0;
    for (const I of cand) { if (nf >= 9 || R() < .55) continue; nf++;
      const th = R() * 6.28, ux = Math.cos(th), uz = Math.sin(th), tx = -uz, tz = ux, r0 = rAt(I, th), w0 = .7 + R() * .8, S = 18, y0 = I.top + .1, H = y0 - SEA;
      for (let i = 0; i <= S; i++) { const q = i / S, y = y0 - Math.pow(q, 1.1) * H, out = r0 + .5 + Math.pow(q, 1.6) * 3.5, w = w0 * (1 + q * 2.6) * (i === 0 ? .9 : 1);
        const cx = I.x + ux * out, cz = I.z + uz * out;
        fp.push(cx - tx * w, y, cz - tz * w, cx + tx * w, y, cz + tz * w); fu.push(0, q * H, 1, q * H);
        if (i < S) { const b = fp.length / 3 - 2; fi.push(b, b + 1, b + 3, b, b + 3, b + 2); } }
      /* 꼭대기 개울: 폭포가 시작되는 가장자리까지 꼭대기 위로 흐르는 물길 */
      const r1 = r0 * .35; for (let i = 0; i <= 6; i++) { const q = i / 6, rr = r1 + (r0 + .5 - r1) * q, cx = I.x + ux * rr + tx * Math.sin(q * 3 + th) * .6, cz = I.z + uz * rr + tz * Math.sin(q * 3 + th) * .6, k = rr / r0;
        const y = I.top + I.dome * (1 - Math.min(1, k * k * 1.06)) + .12, w = w0 * (.55 + q * .4);
        fp.push(cx - tx * w, y, cz - tz * w, cx + tx * w, y, cz + tz * w); fu.push(0, -1 - (1 - q) * 6, 1, -1 - (1 - q) * 6);
        if (i < 6) { const b = fp.length / 3 - 2; fi.push(b, b + 1, b + 3, b, b + 3, b + 2); } } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(fu, 2)); g.setIndex(fi);
    const wm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uT, uN: { value: uN }, uSun: { value: sun } },
      vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: COMMON + `varying vec2 vUv; varying vec3 vW;
        void main(){ float u=vUv.x, d=vUv.y, edge=smoothstep(0.,.25,u)*smoothstep(1.,.75,u);
          float fall=step(0.,d);
          vec2 sp=vec2(u*3.+vW.x*.05, d*.09-uT*mix(.12,.5,fall));
          float st=texture2D(uN,sp).r*.6+texture2D(uN,sp*vec2(2.,1.3)+.4).g*.4;                                   /* 물줄기 결이 흘러내림 */
          float foam=smoothstep(.45,.75,st);
          float a=edge*(.35+.55*foam)*mix(.9,1.,fall);
          a*=fall>.5?smoothstep(${(-SEA).toFixed(1)}*.95,4.,d)*mix(1.,.55,smoothstep(2.,20.,d)):1.;                 /* 아래로 갈수록 흩어져 옅어짐 */
          vec3 c=mix(vec3(.45,.75,.85),vec3(.9,.97,1.),foam)*(.75+.25*uSun.y);
          gl_FragColor=vec4(sink(c,vW.y),a*.8); }` });
    const wf = new THREE.Mesh(g, wm); wf.renderOrder = 3; grp.add(wf); }

  /* ── 떠도는 작은 바위: 섬 사이 아래쪽에 천천히 돌며 흘러감 ── */
  const deb = []; let debM;
  { const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { v0.fromBufferAttribute(p, i); const k = 1 + .28 * Math.sin(v0.x * 4.1 + v0.y * 2.3) * Math.cos(v0.z * 3.7); p.setXYZ(i, v0.x * k * 1.2, v0.y * k * .8, v0.z * k); }
    g.computeVertexNormals(); g.setAttribute('aTop', new THREE.Float32BufferAttribute(new Array(p.count).fill(-999), 1));
    const N = 24; debM = new THREE.InstancedMesh(g, rock, N); debM.frustumCulled = false;
    for (let i = 0; i < N; i++) deb.push({ x: (R() - .5) * AX * 2.4, z: (R() - .5) * AZ * 2.4, y: -14 - R() * 18, s: .5 + Math.pow(R(), 2.5) * 1.8, a: R() * 6, b: R() * 6, w: (R() - .5) * .25, vx: .25 + R() * .35 });
    grp.add(debM); }
  const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), ee = new THREE.Euler(), vv = new THREE.Vector3(), ss = new THREE.Vector3();

  /* ── 기체 조금 아래 엷은 구름 조각 ── */
  const clouds = [];
  { const N = 12, g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    const cm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT, uN: { value: uN }, uSun: { value: sun } },
      vertexShader: `varying vec2 vUv; varying vec3 vW; varying float vS; void main(){ vUv=uv; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; vS=fract(instanceMatrix[3].y*7.3); gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: COMMON + `varying vec2 vUv; varying vec3 vW; varying float vS;
        void main(){ vec2 q=vUv-.5; float el=1.-smoothstep(.15,.5,length(q*vec2(1.,1.25)));
          vec4 a=texture2D(uN,vW.xz*.018+vec2(uT*.004,vS)), b=texture2D(uN,vW.xz*.05-vec2(uT*.007,0.)+vS);
          float d=smoothstep(.42,.75,a.r*.65+b.g*.35+el*.35)*el;
          gl_FragColor=vec4(vec3(.78,.78,.92)*(.75+.25*smoothstep(.3,.8,b.b)),d*.38); }` });
    const im = new THREE.InstancedMesh(g, cm, N); im.frustumCulled = false; im.renderOrder = 2;
    for (let i = 0; i < N; i++) clouds.push({ x: (R() - .5) * AX * 2.3, z: (R() - .5) * AZ * 2.3, y: -2 - R() * 2.5, w: 14 + R() * 16, d: 9 + R() * 9, v: .5 + R() * .5 });
    grp.add(im); clouds.mesh = im; }

  /* ── 저 아래 구름 바다: 불투명 판 하나 · 솜 결이 천천히 흐르고, 갈라진 틈으로 깊은 우주(별·성운)가 언뜻 보임 ── */
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: { uT, uN: { value: uN }, uSun: { value: sun } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: COMMON + `varying vec3 vW;
      vec3 stars(vec2 p, float cs, float dens){ vec2 c=floor(p/cs), f=p/cs-c; float h=hh(c); if(h>dens) return vec3(0.);
        vec2 o=vec2(hh(c+1.3),hh(c+7.1))*.8+.1; float d=length((f-o)*cs), fw=fwidth(p.x)*1.1, r=max(.03*cs*(.4+hh(c+2.)), fw*.9);
        float k=hh(c+4.4); vec3 col=k<.45?vec3(1.):k<.72?vec3(1.,.8,.9):vec3(.78,.87,1.);
        return col*smoothstep(r+fw,r-fw*.5,d)*(.6+hh(c+8.)); }
      void main(){ vec2 p=vW.xz;
        vec4 a=texture2D(uN,p*.006+vec2(uT*.0012,0.)), b=texture2D(uN,p*.019-vec2(uT*.002,uT*.001)), c=texture2D(uN,p*.06+vec2(0.,uT*.003));
        float h=a.r*.55+b.g*.3+c.b*.15;                                                                            /* 구름 높낮이 */
        float hole=smoothstep(.30,.24,a.g*.7+b.r*.3);                                                               /* 갈라진 틈 */
        vec3 lo=vec3(.085,.075,.16), hi=vec3(.36,.33,.48);
        vec3 cl=mix(lo,hi,smoothstep(.25,.85,h));                                                                   /* 솜 봉우리는 밝고 골은 짙게 */
        cl+=vec3(.9,.8,.95)*smoothstep(.27,.31,a.g*.7+b.r*.3)*smoothstep(.36,.31,a.g*.7+b.r*.3)*.25;               /* 틈 가장자리 밝은 테 */
        vec3 sp=vec3(.02,.015,.05)+stars(p,6.,.3)+stars(p+31.,12.,.2)*1.2+vec3(.12,.04,.22)*smoothstep(.4,.8,c.r)*.6;
        gl_FragColor=vec4(mix(cl,sp,hole),1.); }` }));
  sea.position.y = SEA; sea.renderOrder = -1; grp.add(sea);

  return {
    mesh: grp, blockers,
    topAt: (x, z) => { const I = islandAt(x, z); if (!I) return null; const d = Math.hypot(x - I.x, z - I.z) / Math.max(1, rAt(I, Math.atan2(z - I.z, x - I.x))); return I.top + I.dome * (1 - d * d); },
    blocked: (x, z) => { if (Math.abs(x) > AX - 6 || Math.abs(z) > AZ - 6) return true; for (const b of blockers) { const dx = x - b.x, dz = z - b.z; if (dx * dx + dz * dz < b.r * b.r) return true; } return false; },
    update(t, dt, cx, cz) {
      sea.position.x = cx; sea.position.z = cz;
      for (let i = 0; i < deb.length; i++) { const d = deb[i]; d.x += d.vx * dt; if (d.x > AX * 1.2) d.x -= AX * 2.4; d.a += d.w * dt; d.b += d.w * .7 * dt;
        ee.set(d.a, d.b, d.a * .5); qq.setFromEuler(ee); m4.compose(vv.set(d.x, d.y + Math.sin(t * .2 + i) * .4, d.z), qq, ss.set(d.s, d.s, d.s)); debM.setMatrixAt(i, m4); }
      debM.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < clouds.length; i++) { const c = clouds[i]; c.x += c.v * dt; if (c.x > AX * 1.15) c.x -= AX * 2.3;
        qq.identity(); m4.compose(vv.set(c.x, c.y, c.z), qq, ss.set(c.w, 1, c.d)); clouds.mesh.setMatrixAt(i, m4); }
      clouds.mesh.instanceMatrix.needsUpdate = true; } };
}

function mergeGeos(gs) { const P = [], N = [], U = [], I = []; let o = 0;
  for (const g of gs) { const ng = g.index ? g : g; const p = ng.attributes.position, n = ng.attributes.normal, u = ng.attributes.uv;
    for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); U.push(u.getX(i), u.getY(i)); }
    const ix = ng.index.array; for (let i = 0; i < ix.length; i++) I.push(ix[i] + o); o += p.count; g.dispose(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); return g; }
