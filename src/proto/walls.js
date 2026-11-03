/* 진짜 바위벽 — 바닥에 그려 두던 회색 벽 자리에서 바위 성벽이 솟아오름
   · 어디에 서나: 날아 보기 충돌과 같은 '벽 높이 지도' F(flight.js)의 .5 선 = 벽 밑동. 보이는 벽 = 부딪히는 벽
   · 생김새마다 이유:
     - 벽 안쪽으로 들어갈수록 높아짐(가장자리 낮고 등성이 높음) → 판판한 판이 아니라 땅이 솟은 바위 능선
       두꺼운 바위 덩어리일수록 더 높이 솟음 → 크기가 무게로 보임
     - 가장자리 높이가 곳마다 들쭉날쭉(오래 깎인 바위) · 등성이 윗면도 울퉁불퉁
     - 옆면: 아래로 갈수록 어두움(바닥과 만나는 곳에 빛이 덜 듦) + 가로 지층 줄(쌓여 굳은 돌)
     - 윗면 모서리에 빛이 걸림(해 쪽 모서리가 밝게 빛남) → 높이가 위에서 내려다봐도 읽힘
     - 이웃 땅 색이 바위에 살짝 배어 있음(얼음 성운 옆 바위는 푸르스름, 용암 옆은 붉은 기)
   · 무게: 벽 전체가 한 덩어리 → 그리기 1번. 지도 칸마다 삼각형 몇 개(가장자리 칸만 옆면) */
import * as THREE from 'three';
import { MAP, toWorld } from './mapfloor.js?v=11031919';
import { makeRidge, updateRidge, rockMaterial, chunk } from './rocks.js?v=11031919';
import { makeIceRidge, iceMaterial, block } from './ice.js?v=11031919';
import { makeCrystalRidge, crystalMaterial, prism } from './crystal.js?v=11031919';
import { makeRuinRidge, updateRuins, ruinMaterial, pillar, arc } from './ruins.js?v=11031919';
import { makeCoralRidge, coralMaterial, coral } from './coral.js?v=11031919';

export function makeFieldWall(B, floor, ridges = []) {
  const { N, F, cell } = B, S = MAP.SCALE, ISO = .5;
  const X = i => ((i + .5) * cell - MAP.W / 2) * S, Z = j => ((j + .5) * cell - MAP.H / 2) * S;   /* 지도 칸 가운데 → 세상 좌표 */
  const inside = k => F[k] >= ISO;
  /* 벽 안쪽 깊이(가장자리에서 몇 칸): 두 번 훑는 거리 재기 */
  const D = new Float32Array(N * N), BIG = 1e4;
  for (let k = 0; k < N * N; k++) D[k] = inside(k) ? BIG : 0;
  const s2 = Math.SQRT2;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = j * N + i; if (!D[k]) continue; let m = D[k];
    if (i > 0) m = Math.min(m, D[k - 1] + 1); if (j > 0) { m = Math.min(m, D[k - N] + 1); if (i > 0) m = Math.min(m, D[k - N - 1] + s2); if (i < N - 1) m = Math.min(m, D[k - N + 1] + s2); } D[k] = m; }
  for (let j = N - 1; j >= 0; j--) for (let i = N - 1; i >= 0; i--) { const k = j * N + i; if (!D[k]) continue; let m = D[k];
    if (i < N - 1) m = Math.min(m, D[k + 1] + 1); if (j < N - 1) { m = Math.min(m, D[k + N] + 1); if (i < N - 1) m = Math.min(m, D[k + N + 1] + s2); if (i > 0) m = Math.min(m, D[k + N - 1] + s2); } D[k] = m; }
  /* 높이: 가장자리 2.2~3.4m(곳마다 다름) + 안쪽으로 갈수록 솟음 + 윗면 울퉁불퉁 */
  const hs = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vn = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hs(ix, iy), b = hs(ix + 1, iy), c = hs(ix, iy + 1), d = hs(ix + 1, iy + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const edgeH = (x, z) => 2.2 + 1.2 * vn(x * .09, z * .09) + .25 * vn(x * .5, z * .5);
  const height = (x, z, d) => { const e = edgeH(x, z); if (d <= 0) return e;
    const rise = 1.9 * (1 - Math.exp(-d * .42)) + Math.max(0, d - 4) * .22;                     /* 처음엔 빨리 솟고, 두꺼운 덩어리는 계속 조금씩 */
    return e + Math.min(rise, 7) + (vn(x * .7, z * .7) - .5) * .7 * Math.min(1, d / 2); };
  /* 가장자리를 가르는 자리: 두 칸 값 사이에서 .5가 되는 곳 */
  const P = [], NRM = [], idx = [], vmap = new Map();
  const corner = (i, j) => { const key = j * N + i; let v = vmap.get(key); if (v !== undefined) return v; v = P.length / 3; const x = X(i), z = Z(j); P.push(x, height(x, z, D[key] * 1), z); vmap.set(key, v); return v; };
  const cross = (i0, j0, i1, j1, key) => { let v = vmap.get(key); if (v !== undefined) return v; v = P.length / 3; const a = F[j0 * N + i0], b = F[j1 * N + i1], t = (ISO - a) / (b - a);
    const x = X(i0) + (X(i1) - X(i0)) * t, z = Z(j0) + (Z(j1) - Z(j0)) * t; P.push(x, height(x, z, 0), z); vmap.set(key, v); return v; };
  const segs = [];
  const NN = N * N;
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
    const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], inn = c.map(([a, b]) => inside(b * N + a));
    if (!inn[0] && !inn[1] && !inn[2] && !inn[3]) continue;
    const poly = [], kind = [];
    for (let e = 0; e < 4; e++) { const [a, b] = c[e], [a2, b2] = c[(e + 1) % 4];
      if (inn[e]) { poly.push(corner(a, b)); kind.push(0); }
      if (inn[e] !== inn[(e + 1) % 4]) { const key = NN + (e === 0 ? j * N + i : e === 1 ? NN + j * N + i + 1 : e === 2 ? (j + 1) * N + i : NN + j * N + i) ; poly.push(cross(a, b, a2, b2, key)); kind.push(1); } }
    for (let q = 1; q < poly.length - 1; q++) idx.push(poly[0], poly[q], poly[q + 1]);
    for (let q = 0; q < poly.length; q++) if (kind[q] && kind[(q + 1) % poly.length]) segs.push(poly[q], poly[(q + 1) % poly.length]); }
  /* 윗면 삼각형은 위를 보게 · 윗면 결 방향(꼭짓점마다 이웃 면 평균) */
  const n = new Float32Array(P.length), va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), fn = new THREE.Vector3();
  for (let t = 0; t < idx.length; t += 3) {
    va.fromArray(P, idx[t] * 3); vb.fromArray(P, idx[t + 1] * 3); vc.fromArray(P, idx[t + 2] * 3); fn.crossVectors(vb.sub(va), vc.sub(va));
    if (fn.y < 0) { const s = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = s; fn.negate(); }
    for (let q = 0; q < 3; q++) { const o = idx[t + q] * 3; n[o] += fn.x; n[o + 1] += fn.y; n[o + 2] += fn.z; } }
  const top = P.length / 3;
  /* 옆면: 가장자리 선마다 바닥(조금 아래)에서 윗면 가장자리까지. 바깥(벽이 아닌 쪽)을 보게 */
  const pos = P.slice(), nor = Array.from(n), tri = idx.slice(), side = [];
  for (let k = 0; k < top; k++) side.push(0);
  for (let s = 0; s < segs.length; s += 2) {
    const a = segs[s] * 3, b = segs[s + 1] * 3, ax = P[a], az = P[a + 2], bx = P[b], bz = P[b + 2];
    let ox = bz - az, oz = -(bx - ax); const mx = (ax + bx) / 2, mz = (az + bz) / 2, l = Math.hypot(ox, oz) || 1; ox /= l; oz /= l;
    if (B.field(mx + ox * .2, mz + oz * .2) > B.field(mx - ox * .2, mz - oz * .2)) { ox = -ox; oz = -oz; }    /* 벽 높이가 낮아지는 쪽 = 바깥 */
    const v0 = pos.length / 3;
    pos.push(ax, -.1, az, bx, -.1, bz, bx, P[b + 1], bz, ax, P[a + 1], az);
    for (let q = 0; q < 4; q++) { nor.push(ox, 0, oz); side.push(1); }
    fn.crossVectors(va.set(bx - ax, 0, bz - az), vb.set(0, 1, 0));
    if (fn.x * ox + fn.z * oz >= 0) tri.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3); else tri.push(v0, v0 + 2, v0 + 1, v0, v0 + 3, v0 + 2); }
  for (let k = 0; k < top; k++) { const o = k * 3, l = Math.hypot(nor[o], nor[o + 1], nor[o + 2]) || 1; nor[o] /= l; nor[o + 1] /= l; nor[o + 2] /= l; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
  geo.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(tri, 1) : new THREE.Uint16BufferAttribute(tri, 1)); geo.computeBoundingSphere();
  const fu = floor.mat.uniforms, WX = MAP.W * S, WZ = MAP.H * S;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uN: { value: floor.noise }, uR: fu.uR, uB: fu.uB, uL: { value: new THREE.Vector3(-60, 120, -40).normalize() } },
    vertexShader: `attribute float aSide; varying vec3 vW, vN; varying float vS;
      void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normal; vS=aSide; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `precision highp float; varying vec3 vW, vN; varying float vS; uniform sampler2D uN, uR; uniform vec3 uB[18], uL;
      void main(){ vec3 n=normalize(vN);
        /* 윗면 울퉁불퉁: 돌 결의 기울기만큼 빛 받는 방향을 흔듦 (깎인 면 · 패인 곳) */
        { vec2 q=vW.xz*.23; float e=.02, h0=texture2D(uN,q).r, hx=texture2D(uN,q+vec2(e,0.)).r, hz=texture2D(uN,q+vec2(0.,e)).r;
          vec2 q2=vW.xz*.06; float g0=texture2D(uN,q2).b, gx=texture2D(uN,q2+vec2(e,0.)).b, gz=texture2D(uN,q2+vec2(0.,e)).b;
          vec2 gr=vec2(hx-h0,hz-h0)*7.+vec2(gx-g0,gz-g0)*10.;
          n=normalize(n+vec3(-gr.x,0.,-gr.y)*(1.-vS)*.9); }
        vec2 uv=vW.xz/vec2(${WX.toFixed(1)},${WZ.toFixed(1)})+.5;
        int id=int(floor(texture2D(uR,uv).r*255./12.+.5)); id=id<0?0:(id>17?17:id);
        /* 돌 결: 윗면은 위에서 본 결, 옆면은 높이를 따라 흐르는 결 */
        float tTop=texture2D(uN,vW.xz*.06).b*.65+texture2D(uN,vW.xz*.23).r*.35;
        float tSide=texture2D(uN,vec2(vW.x*.11+vW.z*.11,vW.y*.35)).r*.6+texture2D(uN,vec2((vW.x-vW.z)*.27,vW.y*.9)).b*.4;
        float tx=mix(tTop,tSide,vS);
        vec3 rock=vec3(.19,.195,.21)*(.6+.65*tx);                                         /* 짙은 회색 돌, 결이 깊음 */
        rock*=1.-.3*(1.-vS)*smoothstep(.3,.17,tTop);                                       /* 윗면 갈라진 틈은 어둡게 */
        rock=mix(rock, uB[id]*1.3, .16);                                                     /* 이웃 땅 색이 배어 있음 */
        float strata=vS*smoothstep(.75,.95,sin(vW.y*5.5+tSide*7.)*.5+.5);                     /* 쌓여 굳은 지층 줄 */
        rock*=1.-.28*strata;
        float ao=mix(1., .38+.62*smoothstep(-.1,1.8,vW.y), vS);                              /* 바닥과 만나는 곳은 어둡게 */
        float dif=max(dot(n,uL),0.);
        vec3 amb=mix(vec3(.08,.07,.06), vec3(.36,.4,.5), n.y*.5+.5);                          /* 하늘빛 · 땅빛 */
        vec3 c=rock*(amb*.9+vec3(1.,.94,.86)*dif*1.15)*ao;
        float lip=(1.-vS)*smoothstep(.97,.6,n.y)*smoothstep(.1,.6,dot(n,uL));                 /* 해 쪽 윗모서리에 걸린 빛 */
        c+=vec3(1.,.86,.62)*lip*.22;
        gl_FragColor=vec4(c,1.); }` });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 0;
  mesh.userData.tris = tri.length / 3;
  /* 바닥에도 같은 지도를 줌: 바닥의 회색 띠·그림자가 바위벽 밑동과 꼭 맞게 */
  const KM = kindMap(ridges, N), td = new Uint8Array(F.length * 4);
  /* 파랑 = 소행성 잔해 자리를 번지게 한 것: 잔해 가장자리를 칸칸이 계단 없이 둥글게 */
  const dm = new Float32Array(N * N), dt2 = new Float32Array(N * N); for (let i = 0; i < N * N; i++) dm[i] = B.reg[i] === 17 ? 1 : 0;
  for (let rep = 0; rep < 2; rep++) for (const [sx, sy] of [[1, 0], [0, 1]]) { const src = rep || sy ? dm : dm, R = 3;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let a = 0; for (let k = -R; k <= R; k++) { const x = Math.min(N - 1, Math.max(0, i + k * sx)), y = Math.min(N - 1, Math.max(0, j + k * sy)); a += src[y * N + x]; } dt2[j * N + i] = a / (2 * R + 1); }
    dm.set(dt2); }
  for (let i = 0; i < F.length; i++) { td[i * 4] = Math.round(F[i] * 255); td[i * 4 + 1] = KM[i] * 50; td[i * 4 + 2] = Math.round(dm[i] * 255); td[i * 4 + 3] = 255; }
  const ft = new THREE.DataTexture(td, N, N);
  ft.magFilter = THREE.LinearFilter; ft.minFilter = THREE.LinearFilter; ft.flipY = false; ft.needsUpdate = true;
  return { mesh, fieldTex: ft };
}
export function makeWalls(B, floor, ridges, uT) {
  const F = makeFieldWall(B, floor, ridges); return { ...F, real: makeRealWalls(B, ridges || [], uT) };
}

/* ───── 승인된 벽 5종을 맵 벽 자리에 세움 ─────
   · 어디에: 벽 지도 한가운데 선(docs/map_v6_ridges.py가 뽑아 v6.json 'ridges'에 넣음)을 따라 능선을 놓음
   · 어떤 벽: 그 벽이 닿은 땅 — 얼음 성운 = 빙하 얼음 · 결정 협곡 = 자수정 무리 · 폭풍 고원 = 고대 유적 · 안개 늪 = 성운 산호 · 나머지 = 용암 흑요석
     (흑요석은 용암이 식어 생긴 유리 → 맵을 둘러싼 기본 바위. 테마 땅에 들어서면 벽이 바뀌어 '다른 곳에 왔다'가 몸으로 느껴짐)
   · 벽 지도 띠 밖으로 넘치는 덩어리는 띠 안에 들어올 때까지 줄임 → 보이는 벽이 부딪히는 자리보다 튀어나오지 않음
     덩어리 사이 틈으로 보이는 바닥도 벽 띠(짙은 땅)라서 그 틈도 막힌 곳이라는 게 보임
   · 능선 끝은 가늘어지지 않음(문기둥 앞까지 벽 두께 그대로 — 문 폭 = 보이는 틈)
   · 맵에 깔 때만 흑요석 덩어리·산호를 조금 덜 잘게 깎음(게임 시점 40m 높이에선 같은 모양, 삼각형 수가 절반쯤)
   · 무게: 맵을 36m 칸으로 나눠 칸마다·모양마다 한 묶음 → 화면 밖 칸은 안 그림. 재질·덩어리 모양은 종류마다 한 벌 */
const TILE = 36;
const offsetLine = (P, o) => P.map((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [p[0] - dz / l * o, p[1] + dx / l * o]; });
/* 벽 종류 지도: 능선을 굵게 그려 벽 띠의 칸마다 무슨 벽인지 (바닥이 벽 밑 땅을 종류마다 다르게 칠함) */
export const KINDS = ['obsidian', 'ice', 'crystal', 'ruins', 'coral'];
export function kindMap(ridges, N) { const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000'; g.fillRect(0, 0, N, N); g.lineCap = g.lineJoin = 'round'; g.lineWidth = 16;
  for (const r of ridges) { const k = KINDS.indexOf(r.k); g.strokeStyle = `rgb(${k * 50},0,0)`; g.beginPath(); r.p.forEach(([x, y], i) => i ? g.lineTo(x * N / 1000, y * N / 1000) : g.moveTo(x * N / 1000, y * N / 1000)); g.stroke(); }
  const d = g.getImageData(0, 0, N, N).data, K = new Uint8Array(N * N); for (let i = 0; i < N * N; i++) K[i] = Math.round(d[i * 4] / 50); return K; }
export function makeRealWalls(B, ridges, uT) {
  const S = MAP.SCALE;
  const KIND = {
    obsidian: { mat: rockMaterial('obsidian', uT), geos: [0, 1, 2, 3, 4, 5].map(i => chunk('obsidian', i + 61, 3)), make: (p, o) => makeRidge('obsidian', p, { ...o, float: true, floatGap: 22, width: 2.6 }), offs: [-.9, .9] },
    ice: { mat: iceMaterial(uT), geos: [1, 2, 3, 4, 5, 6].map(block), make: makeIceRidge, offs: [-.7, .7] },
    crystal: { mat: crystalMaterial(uT), geos: [1, 2, 3, 4, 5].map(prism), make: makeCrystalRidge, offs: [-1.1, 0, 1.1] },
    ruins: { mat: ruinMaterial(uT), geos: [1, 2, 3, 4].map(pillar), arcs: [11, 12, 13].map(arc), make: makeRuinRidge, offs: [-1.15, 1.15] },
    coral: { mat: coralMaterial(uT), geos: [1, 2, 3, 4].map(i => coral(i, true)), make: makeCoralRidge, offs: [-1.1, 0, 1.1] } };
  for (const k in KIND) { const K = KIND[k]; K.box = K.geos.map(g => { g.computeBoundingBox(); return g.boundingBox; }); }
  const root = new THREE.Group(), movers = [], bucket = new Map(), targets = [];
  const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), c = new THREE.Vector3();
  /* 덩어리 하나가 벽 띠 안에 드는지: 밑면 네 귀(조금 안쪽)와 가운데가 모두 띠 안(벽 지도 .5 넘음)이어야 함 */
  const fits = (bb, mm) => { const xs = [bb.min.x * .72, bb.max.x * .72], zs = [bb.min.z * .72, bb.max.z * .72], y = Math.max(bb.min.y, -.2);
    for (const x of xs) for (const z of zs) { c.set(x, y, z).applyMatrix4(mm); if (B.field(c.x, c.z) < .5) return false; }
    c.set(0, y, 0).applyMatrix4(mm); return B.field(c.x, c.z) >= .5; };
  let seed = 1;
  for (const r of ridges) { const K = KIND[r.k]; if (!K) continue;
    const pts = r.p.map(([x, y]) => toWorld(x, y));
    /* 지역 경계는 빼곡하게 (사용자 2026-11-03): 흑요석·빙하 두 줄, 자수정·산호 세 줄, 유적 두 겹 담 — 덩어리 사이로 건너편이 훤히 안 보이게 */
    const lines = K.offs && !r.fill ? K.offs.map(o => o ? offsetLine(pts, o) : pts) : [pts];
    for (const line of lines) {
    const g = K.make(line, { uT, mat: K.mat, geos: K.geos, arcs: K.arcs, seed: seed++ * 13 + 5, noTaper: true });
    for (const ch of [...g.children]) { if (!ch.isInstancedMesh) continue;
      const gi = K.geos.indexOf(ch.geometry), bb = K.box[gi];
      for (let i = 0; i < ch.count; i++) { ch.getMatrixAt(i, m4); m4.decompose(p, q, sc);
        let ok = fits(bb, m4), n = 0;
        while (!ok && n++ < 8) { sc.multiplyScalar(.84); m4.compose(p, q, sc); ok = fits(bb, m4); }
        if (!ok && Math.max(sc.x, sc.z) < .25) continue;                                       /* 다 줄여도 안 들어가는 부스러기는 뺌 */
        const key = r.k + '|' + gi + '|' + Math.floor(p.x / TILE) + '|' + Math.floor(p.z / TILE);
        let b = bucket.get(key); if (!b) bucket.set(key, b = { K, gi, list: [] }); b.list.push(m4.clone()); }
      g.remove(ch); ch.dispose?.(); }
    if (g.userData.targets) targets.push(...[].concat(g.userData.targets()));
    if (g.children.length) { root.add(g); if (g.userData.fl && g.userData.fl.length) movers.push(g); } } }
  let draws = 0, inst = 0;
  for (const b of bucket.values()) { const im = new THREE.InstancedMesh(b.K.geos[b.gi], b.K.mat, b.list.length);
    b.list.forEach((mm, j) => im.setMatrixAt(j, mm)); im.computeBoundingSphere(); root.add(im); draws++; inst += b.list.length; }
  root.userData = { draws, inst, tris: [...bucket.values()].reduce((a, b) => a + b.list.length * ((b.K.geos[b.gi].index ? b.K.geos[b.gi].index.count : b.K.geos[b.gi].attributes.position.count) / 3), 0),
    update(t, dt) { for (const g of movers) g.userData.kind === 'ruins' ? updateRuins(g, t) : updateRidge(g, t, dt, null); } };
  return root;
}
