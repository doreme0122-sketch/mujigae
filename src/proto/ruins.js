/* 맵 벽 — 고대 유적 (폭풍 고원)
   누가 만들었는지 모르는 옛 구조물이 부서져 남은 벽. 서 있는 돌기둥, 쓰러진 돌덩이, 그리고 거대한 고리의 조각이 공중에 떠서 천천히 돈다.
   · 표면에 문양이 새겨져 있다(고리·막대·반원·점이 칸마다 다르게, 띠 모양 장식줄). 오래 닳아 군데군데 끊김.
   · 평소: 빛나지 않는다. 문양은 어두운 홈으로만 보인다.
   · 맞으면: 맞은 자리에서 가까운 문양부터 하나씩 차례로 금빛으로 켜졌다가(지름 3m 남짓) 0.8초쯤에 꺼진다. */
import * as THREE from 'three';
import { HITS } from './rocks.js?v=11062343';
import { RUIN_TONE } from './ruintone.js?v=11062343';

const rng = seed => { let s = seed * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };

/* 돌기둥: 상자를 모서리 깎고 윗부분은 부서진 듯 */
export function pillar(seed) {
  const R = rng(seed), g = new THREE.BoxGeometry(1, 1, 1, 3, 6, 3); g.translate(0, .5, 0);
  const P = g.attributes.position, v = new THREE.Vector3();
  const cuts = []; for (let i = 0; i < 3; i++) { const a = R() * 6.28; cuts.push([new THREE.Vector3(Math.cos(a), .25 + R() * .6, Math.sin(a)).normalize(), .78 + R() * .12]); }
  const brk = new THREE.Vector3(R() - .5, 1, R() - .5).normalize(), bk = .85 + R() * .1;
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i);
    const c = new THREE.Vector3(v.x, v.y - .5, v.z);
    for (const [d, k] of cuts) { const h = c.dot(d) * 1.5; if (h > k) c.addScaledVector(d, -(h - k) / 1.5); }   /* 모서리 깎임 */
    v.set(c.x, c.y + .5, c.z);
    const hb = v.dot(brk); if (hb > bk) v.addScaledVector(brk, -(hb - bk) * (.6 + R() * .5));                  /* 부서진 윗면 */
    P.setXYZ(i, v.x, v.y, v.z); }
  g.deleteAttribute('uv'); const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng;
}
/* 쌓는 돌: 돌기둥과 같은 깎인 모서리, 윗면은 부서지지 않음 (닳아 둥그스름) */
export function brick(seed) {
  const R = rng(seed), g = new THREE.BoxGeometry(1, 1, 1, 2, 1, 2); g.translate(0, .5, 0);   /* 가볍게: 잘게 나눈 면 줄임 (돌 하나 104 → 32 삼각형, 모서리 깎임은 그대로) */
  const P = g.attributes.position, v = new THREE.Vector3(), cuts = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) cuts.push([new THREE.Vector3(sx, sy * .8, sz).normalize(), .62 + R() * .1]);   /* 여덟 모서리만 닳아 깎임 */
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const c = new THREE.Vector3(v.x, v.y - .5, v.z);
    for (const [d, k] of cuts) { const h = c.dot(d); if (h > k) c.addScaledVector(d, -(h - k)); }
    c.multiplyScalar(1 + (R() - .5) * .03); P.setXYZ(i, c.x, c.y + .5, c.z); }
  g.deleteAttribute('uv'); const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng;
}
/* 고리 조각: 네모난 단면이 원호를 따라 */
export function arc(seed) {
  const R = rng(seed), rad = 1, w = .16, h = .11, span = 1 + R() * .8, N = 22, pos = [];
  const pt = (a, dx, dy) => new THREE.Vector3(Math.cos(a) * (rad + dx), dy, Math.sin(a) * (rad + dx));
  const q = (a, b, c, d) => pos.push(a, b, c, a, c, d);
  for (let i = 0; i < N; i++) { const a0 = -span / 2 + span * i / N, a1 = -span / 2 + span * (i + 1) / N;
    const A = [pt(a0, -w, -h), pt(a0, w, -h), pt(a0, w, h), pt(a0, -w, h)], B = [pt(a1, -w, -h), pt(a1, w, -h), pt(a1, w, h), pt(a1, -w, h)];
    for (let k = 0; k < 4; k++) { const n = (k + 1) % 4; q(A[k], B[k], B[n], A[n]); } }
  const end = (a, flip) => { const E = [pt(a, -w, -h), pt(a, w, -h), pt(a, w, h), pt(a, -w, h)]; flip ? q(E[0], E[1], E[2], E[3]) : q(E[3], E[2], E[1], E[0]); };
  end(-span / 2, false); end(span / 2, true);
  const g = new THREE.BufferGeometry().setFromPoints(pos);
  /* 면 방향이 바깥을 보게 맞춘다 (단면 중심 기준) */
  const p = g.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), m = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) { a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    n.crossVectors(b.clone().sub(a), c.clone().sub(a)); m.copy(a).add(b).add(c).multiplyScalar(1 / 3);
    const ang = Math.atan2(m.z, m.x), cen = new THREE.Vector3(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
    if (n.dot(m.clone().sub(cen)) < 0) { p.setXYZ(i + 1, c.x, c.y, c.z); p.setXYZ(i + 2, b.x, b.y, b.z); } }
  g.computeVertexNormals(); g.userData.span = span; return g;
}

export function ruinMaterial(uT) {
  const m = new THREE.MeshStandardMaterial({ color: RUIN_TONE.wall, roughness: .86, metalness: .05, envMapIntensity: .4, flatShading: true });
  m.onBeforeCompile = sh => { sh.uniforms.uT = uT; sh.uniforms.uHits = HITS;
    sh.vertexShader = 'varying vec3 vGp; varying vec3 vGn; varying vec3 vGw;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        { vec3 sc=vec3(1.); vec4 w4=vec4(transformed,1.);
          #ifdef USE_INSTANCING
            sc=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz)); w4=instanceMatrix*w4;
          #endif
          vGp=position*sc; vGn=objectNormal; vGw=(modelMatrix*w4).xyz; }`);
    sh.fragmentShader = `uniform float uT; uniform vec4 uHits[16]; varying vec3 vGp; varying vec3 vGn; varying vec3 vGw;
      float gh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float gn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(gh(i),gh(i+vec2(1,0)),f.x),mix(gh(i+vec2(0,1)),gh(i+vec2(1,1)),f.x),f.y); }
      /* 새겨진 문양 한 칸: 고리 · 반원+막대 · 십자 · 점 세 개 · 겹고리 · 빈칸 */
      float glyph(vec2 p, out vec2 cell){ vec2 q=p*2.4; cell=floor(q); vec2 f=fract(q)-.5; float h=gh(cell), w=.05, l=9.;
        if(h<.16) l=abs(length(f)-.3);
        else if(h<.32) l=min(abs(length(f)-.3)+step(f.y,0.)*9., max(abs(f.y+.05),abs(f.x)-.3));
        else if(h<.46) l=min(max(abs(f.x),abs(f.y)-.33),max(abs(f.y),abs(f.x)-.33));
        else if(h<.58) l=min(min(length(f-vec2(-.22,0.)),length(f)),length(f-vec2(.22,0.)))-.04;
        else if(h<.7) l=min(abs(length(f)-.32),abs(length(f)-.16));
        float g=smoothstep(w,w*.35,l);
        g*=smoothstep(.25,.45,gn(p*3.1+7.));                                                       /* 오래 닳아 끊긴 곳 */
        return g; }
      float frieze(float y){ float b=fract(y*.55); return smoothstep(.035,.012,abs(b-.06))+smoothstep(.02,.006,abs(b-.11)); }\n` + sh.fragmentShader
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { vec3 an=abs(normalize(vGn)); vec2 uv=an.y>.6?vGp.xz:(an.x>an.z?vGp.zy:vGp.xy); vec2 cell;
          float g=glyph(uv+vec2(17.3,4.1),cell);
          float fz=an.y>.6?0.:frieze(vGp.y)*smoothstep(.3,.5,gn(uv*2.7));
          float groove=max(g,fz);
          float wear=gn(uv*1.3)*.5+gn(uv*5.)*.3;                                                  /* 풍화된 얼룩 */
          diffuseColor.rgb*=(.7+wear*.6)*(1.-groove*.8);                                         /* 홈은 그늘져 어둡게 */
          float lit=0.;
          for(int i=0;i<16;i++){ float age=uT-uHits[i].w; if(age<0.||age>1.1) continue; float d=distance(vGw,uHits[i].xyz); if(d>3.2) continue;
            float delay=d/7.+gh(cell+float(i))*.12;                                               /* 가까운 문양부터 하나씩 */
            float on=step(delay,age)*exp(-max(0.,age-delay)*3.6)*exp(-d*d*.42);
            lit+=on; }
          if(lit>.003){ totalEmissiveRadiance+=vec3(1.,.78,.4)*groove*lit*3.2+vec3(1.,.6,.25)*lit*.08; } }`); };
  m.customProgramCacheKey = () => 'ruins';
  return m;
}

export function makeRuinRidge(path, opt = {}) {
  const uT = opt.uT || { value: 0 }, mat = opt.mat || ruinMaterial(uT);
  const pg = opt.geos || [1, 2, 3, 4].map(pillar), ag = opt.arcs || [11, 12, 13].map(arc);
  const R = rng(opt.seed || 21);
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'), len = curve.getLength();
  const st = [], fl = [], tg = [];
  /* 이어진 무너진 담: 길이 방향으로 돌덩이를 쌓은 낮은 벽 (군데군데 무너져 낮아짐) */
  for (let d = 0; d < len; d += 1.25 + R() * .3) { const u = d / len, p = curve.getPointAt(u), t = curve.getTangentAt(u), yaw = Math.atan2(t.x, t.z);
    const ruin = .5 + .5 * Math.sin(d * .45 + R() * 1.5), h = (.5 + ruin * 1.3) * Math.min(1, .4 + (opt.noTaper ? 9 : Math.min(u, 1 - u)) * len / 5);
    if (h < .35) continue;
    st.push({ g: Math.floor(R() * 4), x: p.x, y: -.5, z: p.z, s: [.95, h, 1.3 + R() * .15], q: new THREE.Quaternion().setFromEuler(new THREE.Euler((R() - .5) * .06, yaw + (R() - .5) * .08, (R() - .5) * .06)) });
    tg.push({ x: p.x, y: -.5 + h * .5, z: p.z, r: .75 }); }
  /* 담을 따라 선 큰 돌기둥 · 담에서 무너져 나온 돌덩이 · 담 위로 떠 있는 고리 조각 */
  let kind = 0;
  for (let d = 1.5; d < len - 1; d += 4.2 + R() * 1.8) { const u = d / len, p = curve.getPointAt(u), t = curve.getTangentAt(u), nx = -t.z, nz = t.x, yaw = Math.atan2(t.x, t.z);
    const k = kind++ % 3;
    if (k !== 2) { const h = 3 + R() * 1.6, w = 1.15 + R() * .3, x = p.x + nx * (R() - .5) * .4, z = p.z + nz * (R() - .5) * .4;
      st.push({ g: Math.floor(R() * 4), x, y: -.6, z, s: [w, h, w * .85], q: new THREE.Quaternion().setFromEuler(new THREE.Euler((R() - .5) * .1, yaw + (R() - .5) * .3, (R() - .5) * .1)) });
      for (let j = 0; j < 4; j++) tg.push({ x, y: -.6 + h * (j + .5) / 4, z, r: w * .6 }); }
    else { const r = 3 + R() * .8, gi = Math.floor(R() * 3), ms = new THREE.Mesh(ag[gi], mat);
      ms.scale.setScalar(r); fl.push({ ms, x: p.x, z: p.z, y: 2.3 + R() * .6, r, tilt: (R() - .5) * .5, roll: 1.25 + (R() - .5) * .3, yaw: yaw + Math.PI / 2 + (R() - .5) * .4, spin: (R() - .5) * .08, ph: R() * 6.28, span: ag[gi].userData.span }); }
    for (let j = 0; j < 2; j++) { const sd = (R() < .5 ? -1 : 1) * (1.2 + R() * 1), along = (R() - .5) * 2;
      st.push({ g: Math.floor(R() * 4), x: p.x + nx * sd + t.x * along, y: -.55, z: p.z + nz * sd + t.z * along, s: [.55 + R() * .35, .45 + R() * .35, .5 + R() * .3], q: new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * .7, R() * 6.28, R() * .7)) }); } }
  const grp = new THREE.Group(), m4 = new THREE.Matrix4(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  pg.forEach((g, gi) => { const mine = st.filter(s => s.g === gi); if (!mine.length) return;
    const im = new THREE.InstancedMesh(g, mat, mine.length);
    mine.forEach((s, j) => { m4.compose(pos.set(s.x, s.y, s.z), s.q, sc.set(...s.s)); im.setMatrixAt(j, m4); });
    im.computeBoundingSphere(); grp.add(im); });
  for (const f of fl) grp.add(f.ms);
  const ftg = [];
  grp.userData = { kind: 'ruins', uT, fl,
    targets: () => { ftg.length = 0;
      for (const f of fl) { const e = f.ms.matrixWorld; for (let k = -3; k <= 3; k++) { const a = f.span / 2 * k / 3; const v = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).applyMatrix4(e); ftg.push({ x: v.x, y: v.y, z: v.z, r: .45 }); } }
      return tg.concat(ftg); } };
  return grp;
}
/* 떠 있는 고리 조각: 천천히 오르내리며 돈다 */
export function updateRuins(grp, t) { for (const f of grp.userData.fl) { f.ms.position.set(f.x, f.y + Math.sin(t * .4 + f.ph) * .3, f.z);
  f.ms.rotation.set(f.tilt, f.yaw + t * f.spin, f.roll, 'YXZ'); f.ms.updateMatrixWorld(); } }

/* ── 고대 유적 벽 (사용자 2026-11-05: 기존 유적 돌·돌기둥으로 멋지게, 떠 있는 고리 조각은 없앰) ──
   같은 돌(ruinMaterial)·같은 깎인 돌덩이(pillar)를 '쌓아 올린 성벽'으로 짬
   ① 몸통: 길게 누운 돌덩이를 단마다 엇갈려 3~5단 쌓음(아래 단일수록 길고 두껍게, 위로 갈수록 살짝 들어감) — 덩어리 사이가 비지 않게 겹침
   ② 무너짐: 높이가 길게 오르내리는 물결 — 온전한 구간은 끝까지 쌓이고 머리돌(넓고 납작한 판돌)이 얹힘, 무너진 구간은 위 단이 빠지고 돌이 비뚤어짐
   ③ 돌기둥: 6~9m마다 벽을 뚫고 선 굵은 기둥(벽보다 높음, 몇 개는 부러져 낮음) · 문 양옆은 가장 크고 높은 기둥 둘씩
   ④ 떨어진 돌: 무너진 구간 양옆 바닥에 굴러떨어진 돌 · 몇 개는 벽에 기대 비스듬히
   ⑤ 문이 없는 끝은 낮아지며 돌무더기로 끝남 */
export function makeRuinWall(path, opt = {}) {
  const uT = opt.uT || { value: 0 }, mat = opt.mat || ruinMaterial(uT), pg = opt.geos || [1, 2, 3, 4].map(pillar).concat([5, 6, 7, 8].map(brick)), doors = opt.doors || [true, true];
  const R = rng(opt.seed || 21), Hm = opt.H || 2.4;
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'), len = curve.getLength();
  const at = d => { const u = Math.min(1, Math.max(0, d / len)), p = curve.getPointAt(u), t = curve.getTangentAt(u); return { p, t, nx: -t.z, nz: t.x, yaw: Math.atan2(t.x, t.z) }; };
  const st = [], tg = [], BLK = [];   /* BLK = 기체가 못 지나가는 자리 */
  const put = (x, y, z, sx, sy, sz, yaw, tx = 0, tz = 0, kind = 1) => { st.push({ g: kind ? 4 + Math.floor(R() * 4) : Math.floor(R() * 4), x, y, z, s: [sx, sy, sz], q: new THREE.Quaternion().setFromEuler(new THREE.Euler(tx, yaw, tz)) }); };
  /* 무너짐 물결 (0 = 바닥까지 무너짐 · 1 = 온전) · 문 가까이 온전 · 문 없는 끝은 무너짐 */
  const ph = R() * 9, keep = d => { let k = .78 + .28 * Math.sin(d * .19 + ph) + .18 * Math.sin(d * .47 + ph * 2.3);
    const ds = doors[0] ? d : 1e9, de = doors[1] ? len - d : 1e9; k = Math.max(k, 1.1 - Math.min(ds, de) / 4);
    if (!doors[0]) k *= Math.min(1, .55 + d / 4); if (!doors[1]) k *= Math.min(1, .55 + (len - d) / 4); return Math.min(1.05, Math.max(.5, k)); };   /* 가장 무너진 곳도 절반은 남음 (사용자: 낮은 벽이 너무 낮음) */
  /* ① 단마다 엇갈려 쌓기 */
  const COURSES = [[.62, 1.55, 1.3], [.55, 1.42, 1.15], [.5, 1.3, 1.0], [.46, 1.2, .9], [.42, 1.1, .85]];   /* [단 높이, 두께, 돌 길이 기준] */
  let y0 = -.18;
  COURSES.forEach(([h, th, L], ci) => { const yTop = y0 + h;
    for (let d = -.2 + (ci % 2) * L * .5 - R() * .3; d < len + .2;) { const l = L * (.75 + R() * .6), dc = d + l / 2, k = keep(dc);
      if (yTop <= Hm * k + .05) { const a = at(dc), loose = 1 - Math.min(1, (Hm * k - yTop) / .8);   /* 무너지기 직전인 맨 위 돌일수록 비뚤어짐 */
        const out = (R() - .5) * .08 + loose * (R() - .5) * .25;
        put(a.p.x + a.nx * out, y0 - .05, a.p.z + a.nz * out, th * (.94 + R() * .1), h * (1.04 + R() * .12) + (ci ? 0 : .05), l * 1.06, a.yaw + (R() - .5) * (.04 + loose * .2), (R() - .5) * loose * .14, (R() - .5) * loose * .14);
        tg.push({ x: a.p.x, y: y0 + h * .5, z: a.p.z, r: .7 }); if (!ci) for (const q of [-.3, 0, .3]) BLK.push({ x: a.p.x + a.t.x * l * q, z: a.p.z + a.t.z * l * q, r: th * .52, top: Hm * keep(dc) }); }   /* 맨 아래 단 돌 길이를 따라 셋 */
      d += l; }
    y0 = yTop; });
  /* ② 온전한 구간 위 머리돌: 넓고 납작한 판돌이 벽 위를 덮음 (조금 내민 처마) */
  for (let d = .5; d < len - .5;) { const l = 1.2 + R() * 1.2, dc = d + l / 2, k = keep(dc), a = at(dc);
    if (Hm * k >= y0 - .02 && R() < .85) put(a.p.x, y0 - .08, a.p.z, 1.15, .26, l * 1.02, a.yaw + (R() - .5) * .04);
    d += l; }
  /* ③ 돌기둥: 벽을 뚫고 선 굵은 기둥 · 문 양옆은 가장 크게 둘씩 */
  const col = (d, big) => { const a = at(d), broken = !big && R() < .35, w = big ? 1.5 + R() * .2 : 1.15 + R() * .25, h = big ? Hm * 1.75 + R() * .5 : broken ? Hm * (.7 + R() * .4) : Hm * (1.3 + R() * .3);
    put(a.p.x, -.25, a.p.z, w + .35, .42, w + .35, a.yaw + (R() - .5) * .1);                                   /* 받침돌 */
    put(a.p.x, -.2, a.p.z, w, h, w * .92, a.yaw + (R() - .5) * .12, (R() - .5) * .04, (R() - .5) * .04, broken ? 0 : 1);   /* 부러진 기둥만 깨진 윗면 */
    if (!broken) put(a.p.x, -.2 + h - .1, a.p.z, w + .3, .3, w + .3, a.yaw + (R() - .5) * .1);                   /* 머리돌 */
    for (let j = 0; j < 4; j++) tg.push({ x: a.p.x, y: h * (j + .5) / 4, z: a.p.z, r: w * .6 }); BLK.push({ x: a.p.x, z: a.p.z, r: (w + .35) * .62, top: h - .2 }); };
  if (doors[0]) { col(.5, true); col(2.1, false); } if (doors[1]) { col(len - .5, true); col(len - 2.1, false); }
  for (let d = 5 + R() * 2; d < len - 4; d += 6 + R() * 3) col(d, false);
  /* ⑥ 벽 주변 부서진 기둥 (사용자 2026-11-05): 벽 앞뒤 1.5~4m에 옛 기둥이 남은 자리
     · 부러진 밑동: 받침돌 위에 깨진 윗면의 짧은 기둥(0.5~1.6m)
     · 쓰러진 토막: 부러져 나간 윗부분이 옆으로 누움(반쯤 바닥에 묻힌 듯), 머리돌이 떨어져 굴러 있기도 */
  /* 벽 주변 구조물: 없앰 (사용자 2026-11-05: 가끔 걸리면 짜증) — opt.props 로만 켬 */
  if (opt.props) for (let d = 2 + R() * 3; d < len - 2; d += 4 + R() * 5) { const a = at(d), side = R() < .65 ? -1 : 1, off = side * (1.6 + R() * 2.4), x = a.p.x + a.nx * off, z = a.p.z + a.nz * off, w = .85 + R() * .3;
    const stump = .5 + R() * 1.1; put(x, -.25, z, w + .3, .35, w + .3, R() * 6.28, 0, 0, 1);
    put(x, -.2, z, w, stump, w * .92, R() * 6.28, (R() - .5) * .06, (R() - .5) * .06, 0);
    tg.push({ x, y: stump * .5, z, r: w * .6 }); BLK.push({ x, z, r: (w + .3) * .62, top: stump - .2 });
    if (R() < .7) { const fa = R() * 6.28, fl = 1.2 + R() * 1.6, fx = x + Math.cos(fa) * (fl * .5 + .5), fz = z + Math.sin(fa) * (fl * .5 + .5);   /* 쓰러진 토막 */
      for (let k = 0; k <= 3; k++) { const t = k / 3; BLK.push({ x: fx - Math.cos(fa) * fl * .5 + Math.cos(fa) * fl * t, z: fz - Math.sin(fa) * fl * .5 + Math.sin(fa) * fl * t, r: w * .5, top: w * .3 - .15 + w * .5 }); }   /* 쓰러진 토막: 길이를 따라 */
      st.push({ g: Math.floor(R() * 4), x: fx - Math.cos(fa) * fl * .5, y: w * .3 - .15, z: fz - Math.sin(fa) * fl * .5, s: [w * .95, fl, w * .9],
        q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -fa, -Math.PI / 2 + (R() - .5) * .15, 'YXZ')) });
      if (R() < .5) put(fx + Math.cos(fa) * .6, -.2, fz + Math.sin(fa) * .6, w + .25, .3, w + .25, R() * 6.28, (R() - .5) * .5, (R() - .5) * .5, 1); } }
  /* ④ 떨어진 돌: 무너진 만큼 많이 · 바닥에 구르거나 벽에 기댐 */
  if (opt.props) for (let d = .3; d < len; d += .6 + R() * .9) { const k = keep(d), lost = 1 - k; if (R() > .15 + lost * 1.1) continue; const a = at(d), side = R() < .7 ? -1 : 1;
    const lean = R() < .25, s = .4 + R() * .45, off = side * (lean ? .95 + R() * .2 : 1.3 + R() * 2.4);
    const fs = s * (.6 + R() * .5); BLK.push({ x: a.p.x + a.nx * off, z: a.p.z + a.nz * off, r: s * .6, top: -.3 + fs * (lean ? 1.3 : 1) });
    put(a.p.x + a.nx * off, -.3, a.p.z + a.nz * off, s * (1 + R() * .6), fs, s * (.9 + R() * .7), R() * 6.28, lean ? side * (.45 + R() * .3) : (R() - .5) * .5, (R() - .5) * .5); }
  const grp = new THREE.Group(), m4 = new THREE.Matrix4(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  pg.forEach((g, gi) => { const mine = st.filter(s => s.g === gi); if (!mine.length) return;
    const im = new THREE.InstancedMesh(g, mat, mine.length); mine.forEach((s, j) => { m4.compose(pos.set(s.x, s.y, s.z), s.q, sc.set(...s.s)); im.setMatrixAt(j, m4); });
    im.computeBoundingSphere(); grp.add(im); });
  grp.userData = { kind: 'ruins', uT, fl: [], targets: () => tg, blockers: BLK };
  return grp;
}
