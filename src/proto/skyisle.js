/* 하늘 섬 부품 세트 — 1단계 (사용자 2026-11-05: 우리의 제일 큰 문제는 맵의 퀄리티 · 섬을 정말 잘 만들면 역할은 별로 안 중요 · 밝고 아름다운 낮 하늘
   · 방법: 잘 만든 부품을 먼저 만들고, 섬은 부품을 쌓고 흩뿌려 조립 (같은 부품을 되풀이해 써서 가벼움)
   부품:
   · 바위 덩이: 층층이 쌓인 바위판(층마다 턱이 지고, 아래로 갈수록 좁아져 뾰족한 뿌리로) · 깎인 면이 또렷한 손으로 깎은 듯한 각
   · 풀 덮개: 바위 덩이 윗면마다 풀이 덮이고, 가장자리로 넘쳐 벼랑 위로 늘어짐(물결진 끝) → 덩이마다 층층 계단 같은 풀 언덕
   · 나무: 굽은 줄기 + 가지 + 뭉게뭉게 뭉친 잎 덩이(아래는 그늘, 위는 햇빛) · 초록 / 분홍 꽃나무
   · 덤불: 잎 덩이를 작게 · 풀 가장자리를 따라
   · 매달린 뿌리: 풀 끝 아래로 늘어진 덩굴 뿌리
   · 구름 바다: 밝은 낮 하늘 아래 몽글몽글한 흰 구름 (불투명 판 하나, 높낮이로 그늘) */
import * as THREE from 'three';

const rng = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
function bakeFbm(N = 256, P = 8) {
  const hs = (x, y, k) => { x = ((x % P) + P) % P; y = ((y % P) + P) % P; const v = Math.sin(x * 127.1 + y * 311.7 + k * 57.3) * 43758.5453; return v - Math.floor(v); };
  const vn = (x, y, k, p) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * fx * (fx * (fx * 6 - 15) + 10), v = fy * fy * fy * (fy * (fy * 6 - 15) + 10), H = (a, b) => hs(a * (P / p), b * (P / p), k);
    const a = H(ix, iy), b = H(ix + 1, iy), c = H(ix, iy + 1), d = H(ix + 1, iy + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const d = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const k = (y * N + x) * 4;
    for (let c = 0; c < 4; c++) { let s = 0, w = .5, f = 1; for (let o = 0; o < 5; o++) { const p = P * f; s += w * vn(x / N * p, y / N * p, c * 5 + o, p); w *= .5; f *= 2; } d[k + c] = Math.min(255, s / .96875 * 255); } }
  const t = new THREE.DataTexture(d, N, N); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
}

export const SEA = -34;
const SKY = `
uniform sampler2D uN; uniform vec3 uSun; uniform float uT;
float nz(vec2 p){ return texture2D(uN,p).r; }
float hh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
const vec3 SUNC=vec3(1.,.93,.80), SKYC=vec3(.46,.58,.86), CLOUD=vec3(.80,.84,.95);
/* 아래로 갈수록 구름 바다의 흰 안개에 묻힘 */
vec3 sink(vec3 c, float y){ float k=smoothstep(-14.,${SEA.toFixed(1)}+1.,y); return mix(c,CLOUD*.92,k*k); }
/* 감싸는 빛: 해 반대쪽도 완전히 까맣지 않게 (그림 같은 부드러운 그늘) */
float wrapL(vec3 n, float w){ return max((dot(n,uSun)+w)/(1.+w),0.); }
`;

/* ─────────── 바위 덩이 ─────────── 층(tier)마다 판 하나: 윗변이 살짝 넓고 아랫변이 좁아 층 사이에 턱이 짐 · 아래 층일수록 좁아지고 마지막엔 뾰족 */
function rockChunk(R, { r = 6, h = 10, tiers = 4, sides = 10, tip = 6 } = {}) {
  const P = [], C = [], tops = [];
  const ang = []; for (let i = 0; i < sides; i++) ang.push((i + (R() - .5) * .55) / sides * Math.PI * 2);
  const jit = () => .88 + R() * .24;
  let y = 0, rr = r; const th = h / tiers, rings = [];
  for (let t = 0; t < tiers; t++) { const hT = th * (.8 + R() * .45), rt = rr * (1 + .04 + R() * .05), rb = rr * (.86 + R() * .06);
    const top = ang.map(a => { const k = jit(); return [Math.cos(a) * rt * k, y, Math.sin(a) * rt * k]; });
    const bot = ang.map((a, i) => { const k = (.92 + R() * .16); return [top[i][0] * rb / rt * k, y - hT, top[i][2] * rb / rt * k]; });
    rings.push({ top, bot, t }); y -= hT; rr = rr * (.7 + R() * .18); }
  const col = (yy, kind, t) => { const g = .5 + .5 * Math.sin(t * 2.1 + yy * .3); /* 층마다 결이 살짝 다른 따뜻한 회색 ~ 연보라 회색 */
    let c = [.46 + g * .06, .42 + g * .04, .45 + g * .07]; if (kind === 'side_lo') c = c.map(v => v * .45); if (kind === 'ledge') c = [c[0] * .9, c[1] * .95, c[2] * .85]; return c; };
  const tri = (a, b, c, ca, cb, cc) => { P.push(...a, ...b, ...c); C.push(...ca, ...cb, ...cc); };
  /* 맨 윗면 */
  { const T = rings[0].top, cy = T[0][1], cen = [0, cy + .15, 0]; for (let i = 0; i < sides; i++) { const j = (i + 1) % sides; const c = col(cy, 'top', 0); tri(cen, T[j], T[i], c, c, c); } }
  for (const g of rings) { const { top, bot, t } = g;
    for (let i = 0; i < sides; i++) { const j = (i + 1) % sides, ct = col(top[i][1], 'side', t), cb = col(bot[i][1], 'side_lo', t);   /* 층 아래쪽은 그늘져 짙게 → 턱이 또렷 */
      tri(top[i], top[j], bot[j], ct, ct, cb); tri(top[i], bot[j], bot[i], ct, cb, cb); }
    const nx = rings[t + 1]; if (nx) for (let i = 0; i < sides; i++) { const j = (i + 1) % sides, c = col(bot[i][1], 'ledge', t);   /* 층 사이 턱 아랫면 (위층이 더 넓어 아래로 향함) */
      tri(bot[i], bot[j], nx.top[j], c, c, col(nx.top[j][1], 'side', t + 1)); tri(bot[i], nx.top[j], nx.top[i], c, col(nx.top[j][1], 'side', t + 1), col(nx.top[i][1], 'side', t + 1)); } }
  { const B = rings[rings.length - 1].bot, tp = [(R() - .5) * r * .3, B[0][1] - tip * (.7 + R() * .6), (R() - .5) * r * .3]; for (let i = 0; i < sides; i++) { const j = (i + 1) % sides, c = col(B[i][1], 'side_lo', 9); tri(B[i], B[j], tp, c, c, c.map(v => v * .8)); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeVertexNormals();
  /* 풀 덮개용: 층마다 윗변 둘레(맨 위층 + 넓게 튀어나온 아래층 턱) */
  for (const gr of rings) tops.push(gr.top);
  return { geo: g, tops };
}

function rockMat(uT, uN, sun) {
  return new THREE.ShaderMaterial({ vertexColors: true, uniforms: { uT, uN: { value: uN }, uSun: { value: sun } },
    vertexShader: `varying vec3 vW, vN, vC; void main(){ vC=color; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: SKY + `varying vec3 vW, vN, vC;
      void main(){ vec3 n=normalize(vN);
        float st=nz(vec2((vW.x+vW.z)*.08,vW.y*.25))*.6+nz(vW.xz*.15+vW.y*.05)*.4;                                  /* 바위 결 · 얼룩 */
        float crack=smoothstep(.05,.0,abs(nz(vec2((vW.x-vW.z)*.11,vW.y*.04))-.5))*.65;                               /* 세로 금 */
        vec3 base=vC*(.8+.4*st)*(1.-crack);
        base=mix(base,vec3(.34,.42,.26),smoothstep(.55,.85,n.y)*.35);                                               /* 위를 보는 턱엔 이끼 기운 */
        vec3 c=base*(SUNC*wrapL(n,.15)*1.2+SKYC*(.22+.12*n.y))+CLOUD*.25*max(-n.y,0.)*base;                        /* 아랫면은 구름 바다가 비춰 밝힘 */
        gl_FragColor=vec4(sink(c,vW.y),1.); }` });
}

/* ─────────── 풀 덮개 ─────────── 윗변 둘레를 따라: 가운데 살짝 볼록한 풀밭 + 바깥으로 넘쳐 늘어진 풀 끝(물결) */
function grassCap(ring, R, P, N, A) {
  const n = ring.length, cy = ring[0][1], cx = ring.reduce((s, p) => s + p[0], 0) / n, cz = ring.reduce((s, p) => s + p[2], 0) / n;
  const pts = []; for (let i = 0; i < n * 2; i++) { const a = ring[Math.floor(i / 2)], b = ring[(Math.floor(i / 2) + 1) % n], t = (i % 2) * .5; pts.push([a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t]); }
  const m = pts.length, base = P.length / 3, push = (x, y, z, a) => { P.push(x, y, z); A.push(a); };
  push(cx, cy + .35, cz, 0);
  for (const k of [.5, .85]) for (const [x, z] of pts) push(cx + (x - cx) * k, cy + .3 * (1 - k * k) + .1, cz + (z - cz) * k, 0);
  for (const [x, z] of pts) push(cx + (x - cx) * 1.06, cy + .08, cz + (z - cz) * 1.06, .3);   /* 가장자리 턱 */
  for (let i = 0; i < m; i++) { const [x, z] = pts[i], hang = .25 + R() * .7 + .25 * Math.sin(i * 1.7) + (R() < .12 ? 1.2 : 0);   /* 넘쳐 늘어진 풀 끝 (물결) */ push(cx + (x - cx) * 1.1, cy - hang, cz + (z - cz) * 1.1, 1); }
  const rI = k => base + 1 + k * m;
  for (let i = 0; i < m; i++) { const j = (i + 1) % m; N.push(base, rI(0) + j, rI(0) + i); for (let k = 0; k < 3; k++) N.push(rI(k) + i, rI(k) + j, rI(k + 1) + j, rI(k) + i, rI(k + 1) + j, rI(k + 1) + i); }
  return [cx, cy, cz];
}
function grassMat(uT, uN, sun) {
  return new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { uT, uN: { value: uN }, uSun: { value: sun } },
    vertexShader: `attribute float aEdge; varying vec3 vW, vN; varying float vE; void main(){ vE=aEdge; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: SKY + `varying vec3 vW, vN; varying float vE;
      void main(){ vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n; vec2 p=vW.xz;
        float a=nz(p*.045), b=nz(p*.21+3.), c=nz(p*.9);
        vec3 g=mix(vec3(.10,.27,.06),vec3(.36,.58,.13),a)*(.75+.4*b);                                               /* 햇빛 받은 연두 ~ 짙은 초록 무리 */
        g=mix(g,vec3(.22,.44,.09),smoothstep(.6,.75,c)*.5);
        float dirt=smoothstep(.62,.74,nz(p*.07+7.))*(.5+.5*smoothstep(.0,.3,vE));                                     /* 흙이 드러난 자리 (가장자리 쪽에 더) */
        g=mix(g,vec3(.36,.27,.17)*(.8+.4*c),dirt*.8);
        float rk=smoothstep(.70,.78,nz(p*.12+2.))*step(vE,.25);                                                    /* 풀 사이로 드러난 바위 */
        g=mix(g,vec3(.42,.39,.42)*(.8+.3*b),rk);
        vec2 fc=floor(p*2.3), fo=fract(p*2.3)-.5-(vec2(hh(fc+.3),hh(fc+.9))-.5)*.5; float fl=step(.975,hh(fc))*step(vE,.2)*smoothstep(.16,.1,length(fo));   /* 작은 둥근 꽃 */                                                          /* 작은 꽃 */
        g=mix(g,mix(vec3(1.,.62,.82),vec3(1.,.95,.75),hh(fc+.5)),fl);
        g*=mix(1.,.55,smoothstep(.3,1.,vE));                                                                        /* 늘어진 끝은 그늘져 짙게 */
        vec3 col=g*(SUNC*wrapL(n,.3)*1.15+SKYC*(.25+.12*n.y));
        gl_FragColor=vec4(sink(col,vW.y),1.); }` });
}

/* ─────────── 나무 ─────────── 줄기(굽음) + 가지 2~3 + 잎 덩이 뭉치 · 모양 몇 가지를 만들어 되풀이 */
function treeGeo(R, blossom) {
  const T = [], L = [];
  const trunk = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3((R() - .5) * .5, 1.2, (R() - .5) * .5), new THREE.Vector3((R() - .5) * .9, 2.4, (R() - .5) * .9), new THREE.Vector3((R() - .5) * .6, 3.2, (R() - .5) * .6)]);
  T.push(taper(new THREE.TubeGeometry(trunk, 10, .3, 7, false), trunk, .45));
  const tops = [trunk.getPoint(1)];
  const nb = 2 + (R() < .5 ? 1 : 0);
  for (let b = 0; b < nb; b++) { const s = trunk.getPoint(.45 + R() * .35), a = R() * 6.28, l = 1.1 + R() * .8, e = new THREE.Vector3(s.x + Math.cos(a) * l, s.y + .6 + R() * .7, s.z + Math.sin(a) * l);
    const bc = new THREE.CatmullRomCurve3([s, new THREE.Vector3().lerpVectors(s, e, .5).add(new THREE.Vector3(0, .25, 0)), e]); T.push(taper(new THREE.TubeGeometry(bc, 6, .14, 5, false), bc, .4)); tops.push(e); }
  /* 잎 덩이: 가지 끝마다 큰 덩이 + 둘레 작은 덩이 */
  const blob = new THREE.IcosahedronGeometry(1, 2);
  for (const tp of tops) { const nb2 = tp === tops[0] ? 6 : 3;
    for (let i = 0; i < nb2; i++) { const g = blob.clone(), s = (tp === tops[0] ? 1.25 : .9) * (.75 + R() * .4), off = i === 0 ? new THREE.Vector3() : new THREE.Vector3((R() - .5) * 1.6, (R() - .3) * .8, (R() - .5) * 1.6);
      const p = g.attributes.position; for (let k = 0; k < p.count; k++) { v0.fromBufferAttribute(p, k); const w = 1 + .22 * Math.sin(v0.x * 4 + i * 1.3) * Math.sin(v0.y * 3.3 + i) * Math.sin(v0.z * 4.7 + b0) + .08 * Math.sin(v0.x * 11 + v0.z * 9);
        p.setXYZ(k, v0.x * s * w + tp.x + off.x, v0.y * s * w * .78 + tp.y + off.y + .3, v0.z * s * w + tp.z + off.z); }
      L.push(g); } }
  return { trunk: merge(T), leaves: merge(L), blossom };
}
const v0 = new THREE.Vector3(), b0 = 1.7;
function taper(g, curve, k) { const p = g.attributes.position, uv = g.attributes.uv, c = new THREE.Vector3();   /* 끝으로 갈수록 가늘게: 길이 방향 위치마다 고리 중심 쪽으로 당김 */
  for (let i = 0; i < p.count; i++) { const u = uv.getX(i); curve.getPointAt(Math.min(1, u), c); v0.fromBufferAttribute(p, i).sub(c).multiplyScalar(1 - u * (1 - k)).add(c); p.setXYZ(i, v0.x, v0.y, v0.z); }
  g.computeVertexNormals(); return g; }
function merge(gs) { const P = [], Nn = [], I = []; let o = 0;
  for (const g of gs) { const p = g.attributes.position, n = g.attributes.normal; for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); Nn.push(n.getX(i), n.getY(i), n.getZ(i)); }
    if (g.index) { const ix = g.index.array; for (let i = 0; i < ix.length; i++) I.push(ix[i] + o); } else for (let i = 0; i < p.count; i++) I.push(i + o); o += p.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); g.setIndex(I); return g; }

function leafMat(uT, uN, sun, kind) {
  return new THREE.ShaderMaterial({ uniforms: { uT, uN: { value: uN }, uSun: { value: sun }, uK: { value: kind } },
    vertexShader: `uniform float uT; varying vec3 vW, vN, vL; void main(){ vL=position; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.);
        w.xz+=vec2(sin(uT*.9+w.x*.3+w.z*.2),cos(uT*.7+w.z*.3))*.05*max(position.y-1.5,0.);                          /* 바람에 잎이 살랑 */
        vW=w.xyz; vN=normalize(mat3(modelMatrix*instanceMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: SKY + `uniform float uK; varying vec3 vW, vN, vL;
      void main(){ vec3 n=normalize(vN);
        float cl=nz(vW.xz*.55+vW.y*.3)*.6+nz(vW.xz*1.7-vW.y*.5)*.4;                                                 /* 잎 뭉치 결 */
        float hi=smoothstep(.0,3.,vL.y-1.);                                                                          /* 위쪽 잎일수록 햇빛 */
        vec3 a=uK<.5?vec3(.04,.15,.04):uK<1.5?vec3(.45,.13,.30):vec3(.04,.14,.10), b=uK<.5?vec3(.34,.58,.12):uK<1.5?vec3(1.,.58,.80):vec3(.20,.46,.30);
        vec3 lf=mix(a,b,smoothstep(.2,.85,cl*.7+hi*.5));
        float l=wrapL(n,.35)*(.55+.45*smoothstep(.3,.7,cl));                                                    /* 잎 뭉치 안쪽은 그늘 */
        vec3 c=lf*(SUNC*l*1.15+SKYC*(.2+.12*n.y));
        c+=b*.25*pow(1.-abs(dot(n,normalize(cameraPosition-vW))),3.)*l;                                            /* 가장자리 빛 (잎 사이로 비친 햇빛) */
        if(uK>.5&&uK<1.5) c+=vec3(1.,.9,.95)*step(.93,hh(floor(vW.xz*3.+vW.y*2.)))*.25;                            /* 꽃잎 반짝 */
        gl_FragColor=vec4(sink(c,vW.y),1.); }` });
}
function barkMat(uT, uN, sun) {
  return new THREE.ShaderMaterial({ uniforms: { uT, uN: { value: uN }, uSun: { value: sun } },
    vertexShader: `varying vec3 vW, vN; void main(){ vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix*instanceMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: SKY + `varying vec3 vW, vN; void main(){ vec3 n=normalize(vN); float s=nz(vec2((vW.x+vW.z)*.9,vW.y*.12));
        vec3 c=mix(vec3(.24,.16,.12),vec3(.42,.31,.24),s)*(SUNC*wrapL(n,.3)+SKYC*.45); gl_FragColor=vec4(sink(c,vW.y),1.); }` });
}

/* ─────────── 섬 하나 조립 ─────────── 큰 몸통 + 둘레에 높이가 다른 바위 덩이 + 아래 매달린 덩이 → 덩이마다 풀 덮개 → 나무·덤불 */
export function makeSkyIsle(uT, sun, opt = {}) {
  const R = rng(opt.seed || 777), uN = opt.uN || bakeFbm(), grp = new THREE.Group();
  const S = opt.size || 11, topY = opt.top ?? -9, cx = opt.x || 0, cz = opt.z || 0;
  const rocks = [], caps = [];
  const add = (x, y, z, o) => { const ch = rockChunk(R, o); ch.geo.translate(x, y, z); rocks.push(ch.geo); caps.push(ch.tops[0].map(p => [p[0] + x, p[1] + y, p[2] + z])); };
  add(cx, topY, cz, { r: S, h: S * 1.5, tiers: 5, sides: 12, tip: S * 1.1 });
  const ns = 6 + Math.floor(R() * 3);
  for (let i = 0; i < ns; i++) { const a = i / ns * 6.28 + R() * .5, d = S * (.75 + R() * .3), rr = S * (.32 + R() * .25), dy = -(.12 + R() * .6) * S;
    add(cx + Math.cos(a) * d, topY + dy, cz + Math.sin(a) * d, { r: rr, h: rr * (1.6 + R()), tiers: 3 + Math.floor(R() * 2), sides: 8 + Math.floor(R() * 3), tip: rr * 1.4 }); }
  for (let i = 0; i < 3; i++) { const a = R() * 6.28, d = S * R() * .5, rr = S * (.22 + R() * .15); add(cx + Math.cos(a) * d, topY - S * (1.6 + R() * .6), cz + Math.sin(a) * d, { r: rr, h: rr * 1.5, tiers: 2, sides: 8, tip: rr * 1.8 }); }
  const rg = mergeColor(rocks); grp.add(new THREE.Mesh(rg, rockMat(uT, uN, sun)));
  /* 풀 덮개: 위를 보는 넓은 면(덩이 맨 윗면 + 바깥으로 넓게 튀어나온 층 턱)마다 */
  const GP = [], GI = [], GA = [], spots = [];
  for (const ring of caps) { const y = ring[0][1]; if (y < topY - S * 1.3) continue;
    const c = grassCap(ring, R, GP, GI, GA); const rr = Math.hypot(ring[0][0] - c[0], ring[0][2] - c[2]); spots.push({ x: c[0], y: c[1], z: c[2], r: rr }); }
  { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(GP, 3)); g.setAttribute('aEdge', new THREE.Float32BufferAttribute(GA, 1)); g.setIndex(GI); g.computeVertexNormals(); grp.add(new THREE.Mesh(g, grassMat(uT, uN, sun))); }
  /* 나무·덤불 */
  const kinds = [treeGeo(rng(11), 0), treeGeo(rng(23), 0), treeGeo(rng(37), 1)], place = [[], [], []], bush = [];
  for (const s of spots) { if (s.r < 2) continue; const n = Math.round(s.r * s.r * .045 + R());
    for (let i = 0; i < n; i++) { const a = R() * 6.28, d = s.r * Math.sqrt(R()) * .7, x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d, k = R() < .22 ? 2 : (R() < .5 ? 0 : 1), sc = .8 + R() * .5;
      if (s.y + 3.8 * sc > (opt.ceil ?? -1.5)) continue;   /* 기체 높이엔 안 닿게 */ place[k].push([x, s.y + .2, z, sc, R() * 6.28]); }
    const nb = Math.round(s.r * 1.1); for (let i = 0; i < nb; i++) { const a = R() * 6.28, d = s.r * (.75 + R() * .25); bush.push([s.x + Math.cos(a) * d, s.y + .25, s.z + Math.sin(a) * d, .35 + R() * .4, R() * 6.28, R() < .2 ? 1 : 0]); } }
  const bark = barkMat(uT, uN, sun), leafG = leafMat(uT, uN, sun, 0), leafP = leafMat(uT, uN, sun, 1), leafB = leafMat(uT, uN, sun, 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s3 = new THREE.Vector3();
  kinds.forEach((K, ki) => { const L = place[ki]; if (!L.length) return; const Tm = new THREE.InstancedMesh(K.trunk, bark, L.length), Lm = new THREE.InstancedMesh(K.leaves, K.blossom ? leafP : leafG, L.length);
    L.forEach(([x, y, z, sc, yaw], i) => { e.set(0, yaw, 0); q.setFromEuler(e); m4.compose(v.set(x, y, z), q, s3.set(sc, sc, sc)); Tm.setMatrixAt(i, m4); Lm.setMatrixAt(i, m4); }); grp.add(Tm, Lm); });
  if (bush.length) { const bg = kinds[0].leaves.clone(); bg.translate(0, -3.4, 0); const Bm = new THREE.InstancedMesh(bg, leafB, bush.length);
    bush.forEach(([x, y, z, sc, yaw], i) => { e.set(0, yaw, 0); q.setFromEuler(e); m4.compose(v.set(x, y, z), q, s3.set(sc * 1.2, sc, sc * 1.2)); Bm.setMatrixAt(i, m4); }); grp.add(Bm); }
  /* 나무·덤불 그림자: 풀 위에 해 반대쪽으로 비켜 떨어지는 부드러운 그늘 (나무가 땅에 서 있게 보임) */
  { const L = []; place.forEach(P => P.forEach(([x, y, z, sc]) => L.push([x, y, z, 2.3 * sc, 3.4 * sc]))); bush.forEach(([x, y, z, sc]) => L.push([x, y, z, 1.3 * sc, .3]));
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    const sm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.); }',
      fragmentShader: 'varying vec2 vUv; void main(){ float d=length(vUv-.5)*2.; float a=smoothstep(1.,.2,d)*.38; gl_FragColor=vec4(.02,.05,.08,a); }' });
    const Sm = new THREE.InstancedMesh(g, sm, L.length); const ox = -sun.x / sun.y, oz = -sun.z / sun.y;
    L.forEach(([x, y, z, r, hgt], i) => { m4.compose(v.set(x + ox * hgt * .5, y + .06, z + oz * hgt * .5), q.identity(), s3.set(r * 2, 1, r * 2 * 1.1)); Sm.setMatrixAt(i, m4); });
    Sm.renderOrder = 1; grp.add(Sm); }
  grp.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  return { mesh: grp, uN, spots, topAt: (x, z) => { let best = null; for (const s of spots) if (Math.hypot(x - s.x, z - s.z) < s.r * 1.02 && (best == null || s.y > best)) best = s.y; return best; } };
}
function mergeColor(gs) { const P = [], C = [], Nn = []; for (const g of gs) { const p = g.attributes.position, c = g.attributes.color, n = g.attributes.normal; for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); C.push(c.getX(i), c.getY(i), c.getZ(i)); Nn.push(n.getX(i), n.getY(i), n.getZ(i)); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); return g; }

/* ─────────── 밝은 구름 바다 ─────────── 몽글몽글: 동그란 구름 덩이를 겹쳐 구운 높이 그림(이음새 없음)을 크고 작게 두 번 읽어
   볼록한 곳은 햇빛에 희고, 덩이 사이 골은 하늘빛 그늘 · 아주 천천히 흐름 */
function bakePuffs(N = 512, n = 260) { const R = rng(4242), h = new Float32Array(N * N);
  for (let i = 0; i < n; i++) { const cx = R() * N, cy = R() * N, r = 14 + Math.pow(R(), 2) * 46, k = .55 + R() * .45, r2 = r * r;
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy; if (d2 > r2) continue;
      const v = Math.sqrt(1 - d2 / r2) * k * (r / 60 + .4), j = (((y % N) + N) % N) * N + (((x % N) + N) % N); if (v > h[j]) h[j] = v; } }
  let mx = 0; for (const v of h) mx = Math.max(mx, v); const d = new Uint8Array(N * N * 4); for (let i = 0; i < N * N; i++) { const v = Math.min(255, h[i] / mx * 255); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(d, N, N); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t; }
export function makeCloudSea(uT, sun, uN, discs = []) {
  const uP = { value: bakePuffs() }, D = []; for (let i = 0; i < 16; i++) { const d = discs[i]; D.push(d ? new THREE.Vector4(d.x - sun.x / sun.y * (d.y - SEA), d.z - sun.z / sun.y * (d.y - SEA), d.r, 1) : new THREE.Vector4(0, 0, 0, 0)); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: { uT, uN: { value: uN }, uSun: { value: sun }, uP, uD: { value: D } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: SKY + `uniform sampler2D uP; uniform vec4 uD[16]; varying vec3 vW;
      float H(vec2 p){ vec2 a=p*.0045+vec2(uT*.0005,0.), b=p*.016+vec2(uT*.0011,.3);
        return texture2D(uP,a).r*.75+texture2D(uP,b).r*.35; }
      void main(){ vec2 p=vW.xz; float e=.9; float h=H(p), hx=H(p+vec2(e,0.)), hz=H(p+vec2(0.,e));
        vec3 n=normalize(vec3((h-hx)*9.,1.,(h-hz)*9.));
        float l=wrapL(n,.35);
        float ao=smoothstep(.05,.65,h);                                                                             /* 덩이 사이 골은 짙게 */
        vec3 shade=vec3(.50,.58,.80), lit=vec3(1.,.98,.95);
        vec3 c=mix(shade,lit,smoothstep(.1,.9,l*(.55+.45*ao)));
        c*=.72+.28*ao;
        c+=vec3(1.,.95,.9)*pow(1.-n.y,2.)*.25*l;                                                                    /* 덩이 가장자리 햇빛 테 */
        /* 섬 그림자: 해 반대쪽 구름 위로 크고 부드럽게 (섬이 높이 떠 있다는 게 한눈에 보임) */
        float sh=0.; for(int i=0;i<16;i++){ vec4 d=uD[i]; if(d.w<.5) continue; float q=length(p-d.xy)/(d.z*1.08); sh=max(sh,smoothstep(1.,.45,q)); }
        c=mix(c,c*vec3(.62,.68,.86),sh*.75);
        gl_FragColor=vec4(c*.9,1.); }` }));
  m.position.y = SEA; m.renderOrder = -1; return m;
}
export { bakeFbm, SKY, grassCap, grassMat, rockChunk, rockMat };
