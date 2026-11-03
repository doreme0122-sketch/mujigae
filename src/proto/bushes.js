/* 수풀 — 들어가면 바깥에서 안 보이는 곳 (매복·기습의 긴장)
   · 어디에: 벽 틈(문) 바로 앞뒤 · 무너진 중심부 잔해 사이. 문을 지나는 순간이 가장 무서운 곳이 되게
   · 생김새: 성운 덤불 — 가늘고 휜 빛 줄기 수백 가닥이 한 뿌리에서 뻗은 덤불. 뿌리는 짙고 끝으로 갈수록 그 땅 안개 색으로 은은히 빛남
   · 움직임마다 이유:
     - 바람에 천천히 물결치며 흔들림(덤불 전체가 한쪽으로 쓸렸다 돌아옴 — 살아 있는 것)
     - 기체가 지나가면 그 둘레 줄기가 밀려 눕고, 지나가면 천천히 일어섬(밀고 들어간 자국)
     - 안에 숨으면 둘레 줄기가 살짝 더 밝아짐(내가 숨은 덤불이 어딘지 내게만 알려 줌)
   · 규칙(나중에 적·몬스터 붙일 때 그대로 씀): 수풀 안은 바깥에서 안 보임 · 같은 수풀 안이면 서로 보임 · 수풀 안에서 쏘면 2초 드러남
   · 무게: 줄기 전부 한 묶음(그리기 1번). 수풀 자리는 칸 지도로 바로 찾음 */
import * as THREE from 'three';
import { MAP, toWorld } from './mapfloor.js?v=11031147';

export function makeBushes(B, J, ST) {
  const S = MAP.SCALE, rnd = (() => { let s = 977; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const ok = (x, z, r) => { if (B.region(x, z) === 17) return false; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; if (B.field(x + Math.cos(a) * r, z + Math.sin(a) * r) > .3) return false; } return B.field(x, z) < .2; };
  const list = [];
  const add = (x, z, r) => { if (list.some(b => Math.hypot(b.x - x, b.z - z) < b.r + r + 6)) return false;
    const lobes = []; const n = 3 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) { const a = rnd() * 6.28, d = r * .45 * rnd(); lobes.push([x + Math.cos(a) * d, z + Math.sin(a) * d, r * (.55 + rnd() * .35)]); }
    list.push({ x, z, r, lobes, k: B.region(x, z) }); return true; };
  /* 문 앞뒤: 문을 지나는 길 한쪽 옆에 (길을 막지 않게 옆으로 비켜) */
  (J.gates || []).forEach((g, i) => { const [x, z] = toWorld(g.x, g.y), dx = Math.cos(g.a), dz = Math.sin(g.a), px = -dz, pz = dx;
    const side = i % 2 ? 1 : -1, w = g.w / 2 * S;
    for (const along of [7.5, -7.5, 10, -10]) { const bx = x + dx * along + px * side * (w + 2.5), bz = z + dz * along + pz * side * (w + 2.5), r = 3 + rnd() * 1.5; if (ok(bx, bz, r) && add(bx, bz, r)) break; } });
  /* 무너진 중심부: 잔해 사이에 흩어져 숨고 피하고 기습 */
  for (let i = 0, tries = 0; i < 9 && tries < 200; tries++) { const a = rnd() * 6.28, d = 14 + rnd() * 34, x = Math.cos(a) * d, z = Math.sin(a) * d, r = 3.2 + rnd() * 1.8; if (B.region(x, z) === 16 && ok(x, z, r) && add(x, z, r)) i++; }
  /* 칸 지도: 칸마다 몇 번 수풀인지 (0 = 없음) */
  const N = 500, cell = MAP.W / N * S, grid = new Uint8Array(N * N);
  const toCell = (x, z) => [Math.floor((x / S + MAP.W / 2) / (MAP.W / N)), Math.floor((z / S + MAP.H / 2) / (MAP.H / N))];
  list.forEach((b, id) => { for (const [lx, lz, lr] of b.lobes) { const [i0, j0] = toCell(lx - lr, lz - lr), [i1, j1] = toCell(lx + lr, lz + lr);
    for (let j = Math.max(0, j0); j <= Math.min(N - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(N - 1, i1); i++) { const cx = ((i + .5) * MAP.W / N - MAP.W / 2) * S, cz = ((j + .5) * MAP.H / N - MAP.H / 2) * S;
      if (Math.hypot(cx - lx, cz - lz) <= lr) grid[j * N + i] = id + 1; } } });
  const bushAt = (x, z) => { const [i, j] = toCell(x, z); return i < 0 || j < 0 || i >= N || j >= N ? 0 : grid[j * N + i]; };

  /* 줄기 하나: 휜 빛 잎 (3마디, 뿌리 넓고 끝 가늘게, 바깥으로 휨) */
  const seg = 3, pos = [], uvs = [], idx = [];
  for (let i = 0; i <= seg; i++) { const v = i / seg, w = .17 * (1 - v * .88), bend = v * v * .7;
    pos.push(-w, v, bend, w, v, bend); uvs.push(0, v, 1, v); if (i < seg) { const o = i * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); } }
  const geo = new THREE.InstancedBufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(idx);
  const F = [];
  list.forEach(b => { const area = b.lobes.reduce((a, l) => a + Math.PI * l[2] * l[2], 0), n = Math.min(520, Math.round(area * 7.5));
    for (let k = 0, t = 0; k < n && t < n * 4; t++) { const L = b.lobes[Math.floor(rnd() * b.lobes.length)], a = rnd() * 6.28, d = Math.sqrt(rnd()) * L[2], x = L[0] + Math.cos(a) * d, z = L[1] + Math.sin(a) * d;
      if (B.field(x, z) > .35) continue; k++;
      const dl = Math.hypot(x - L[0], z - L[1]) / L[2], edge = 1 - Math.min(1, dl);                     /* 덩이 가운데가 높고 가장자리가 낮음 → 둥근 덤불 */
      const out = Math.atan2(x - L[0], z - L[1]);                                                     /* 덩이 가운데서 바깥으로 뻗음 → 분수처럼 퍼진 덤불 */
      F.push(x, z, (.55 + edge * 1.5) * (.8 + rnd() * .4), out + (rnd() - .5) * (.9 + edge * 2.6), ...ST[b.k].b, rnd()); } });
  const mat = new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { uT: { value: 0 }, uShip: { value: new THREE.Vector3(0, 0, -1e4) }, uIn: { value: 0 } },
    vertexShader: `attribute vec4 iP, iC; uniform float uT, uIn; uniform vec3 uShip; varying vec2 vU; varying vec3 vC; varying float vG;
      void main(){ vec3 p=position; float h=iP.z, v=uv.y;
        float c=cos(iP.w), s=sin(iP.w); vec3 q=vec3(p.x*c+p.z*s, p.y*h, -p.x*s+p.z*c);
        vec2 wv=vec2(sin(uT*.8+iP.x*.15+iP.y*.07), cos(uT*.6+iP.y*.13))*.35;                  /* 바람: 덤불 전체가 천천히 물결 */
        vec2 away=vec2(iP.x,iP.y)-uShip.xz; float d=length(away);
        float push=uShip.y*smoothstep(2.6,.6,d);                                                    /* 기체가 밀고 지나간 자리: 둘레 줄기가 바깥으로 눕음 */
        vec2 off=(wv+normalize(away+1e-4)*push*1.6)*v*v*h;
        q.xz+=off; q.y*=1.-push*.55*v;
        vec3 w=vec3(iP.x,0.,iP.y)+q; vU=uv; vC=iC.rgb;         vG=(1.-smoothstep(1.5,3.5,d))*uIn;                                                          /* 내가 숨은 덤불 둘레가 살짝 밝아짐 */
        gl_Position=projectionMatrix*viewMatrix*vec4(w,1.); }`,
    fragmentShader: `uniform float uT; varying vec2 vU; varying vec3 vC; varying float vG;
      void main(){ float v=vU.y, e=1.-abs(vU.x*2.-1.);
        vec3 root=vec3(.012,.018,.016), tip=vC*1.25;
        vec3 c=mix(root, tip, smoothstep(.15,1.,v))*(.55+.45*e);                                  /* 뿌리 짙고 끝은 그 땅 빛 */
        float v2=clamp(v,0.,1.); v2*=v2; c+=vC*v2*v2*v2*.9 + vC*vG*.35;   /* 거듭제곱은 음수에서 휴대폰이 고장 값을 냄 → 곱셈으로 */                                                           /* 줄기 끝 은은한 빛 · 숨은 덤불 */
        gl_FragColor=vec4(c,1.); }` });
  /* 맵을 36m 칸으로 나눠 칸마다 한 묶음 → 화면 밖 칸의 수풀은 안 그림 */
  const mesh = new THREE.Group(), TL = 36, tiles = new Map(), cnt = F.length / 8;
  for (let i = 0; i < cnt; i++) { const key = Math.floor(F[i * 8] / TL) + ',' + Math.floor(F[i * 8 + 1] / TL); if (!tiles.has(key)) tiles.set(key, []); tiles.get(key).push(i); }
  for (const [key, ids] of tiles) { const g = new THREE.InstancedBufferGeometry(); g.index = geo.index; g.setAttribute('position', geo.attributes.position); g.setAttribute('uv', geo.attributes.uv);
    const iP = new Float32Array(ids.length * 4), iC = new Float32Array(ids.length * 4);
    ids.forEach((i, j) => { iP.set(F.slice(i * 8, i * 8 + 4), j * 4); iC.set(F.slice(i * 8 + 4, i * 8 + 8), j * 4); });
    g.setAttribute('iP', new THREE.InstancedBufferAttribute(iP, 4)); g.setAttribute('iC', new THREE.InstancedBufferAttribute(iC, 4)); g.instanceCount = ids.length;
    const [tx, tz] = key.split(',').map(Number); g.boundingSphere = new THREE.Sphere(new THREE.Vector3((tx + .5) * TL, 1, (tz + .5) * TL), TL * .75 + 3);
    const m = new THREE.Mesh(g, mat); m.renderOrder = 1; mesh.add(m); }
  /* 덤불 속 짙은 덩이: 잎 사이로 바닥이 비치지 않게 속을 채움 (덤불은 속이 꽉 차 있어야 숨을 수 있다는 게 보임) */
  const dome = new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);
  { const P = dome.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), n = .85 + .3 * Math.sin(x * 5.1 + z * 3.7) * Math.cos(z * 4.3 - x * 2.1); P.setXYZ(i, x * n, y * n, z * n); } dome.computeVertexNormals(); }
  const lobes = list.flatMap(b => b.lobes.map(l => [...l, ...ST[b.k].b]));
  const domeM = new THREE.ShaderMaterial({ uniforms: {},
    vertexShader: 'attribute vec3 iC; varying vec3 vC, vN; varying float vY; void main(){ vC=iC; vN=normalize(mat3(instanceMatrix)*normal); vY=position.y; gl_Position=projectionMatrix*viewMatrix*instanceMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 vC, vN; varying float vY; void main(){ float l=.35+.65*max(dot(vN,normalize(vec3(-.4,1.,-.3))),0.); vec3 c=mix(vec3(.01,.014,.012), vC*.22, vY)*l; gl_FragColor=vec4(c,1.); }' });
  const dm = new THREE.Matrix4(), dt = new Map();
  lobes.forEach(l => { const key = Math.floor(l[0] / TL) + ',' + Math.floor(l[1] / TL); if (!dt.has(key)) dt.set(key, []); dt.get(key).push(l); });
  for (const ls of dt.values()) { const g = dome.clone(), iCd = new Float32Array(ls.length * 3), dms = new THREE.InstancedMesh(g, domeM, ls.length);
    ls.forEach((l, i) => { dm.makeScale(l[2] * .8, Math.min(1.1, l[2] * .3), l[2] * .8); dm.setPosition(l[0], -.1, l[1]); dms.setMatrixAt(i, dm); iCd.set([l[3], l[4], l[5]], i * 3); });
    g.setAttribute('iC', new THREE.InstancedBufferAttribute(iCd, 3)); dms.computeBoundingSphere(); mesh.add(dms); }
  let push = 0;
  return { mesh, list, bushAt, count: cnt,
    update(t, dt, sx, sz, moving) { const inB = bushAt(sx, sz) > 0; const tg = inB ? 1 : 0; push += (tg - push) * Math.min(1, dt * (tg > push ? 5 : 1.2));   /* 밀 땐 빨리, 일어설 땐 천천히 */
      mat.uniforms.uT.value = t; mat.uniforms.uShip.value.set(sx, push, sz); mat.uniforms.uIn.value += ((inB ? 1 : 0) - mat.uniforms.uIn.value) * Math.min(1, dt * 3); return inB; } };
}
