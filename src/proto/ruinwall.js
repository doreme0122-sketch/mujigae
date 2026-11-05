/* 고대 유적 벽 — 사용자 참고 그림(2026-11-05)의 '느낌만' + 유적 벽 돌(ruins.js 돌: 어두운 풍화 돌 · 새긴 문양 · 맞으면 가까운 문양부터 금빛)
   그림에서 가져온 느낌 → 만드는 법
   ① 사람이 쌓은 돌: 단마다 높이가 다른 돌 줄(0.34~0.5m), 줄마다 길이가 제각각인 돌이 엇갈려 쌓임 · 돌마다 튀어나온 정도가 조금씩 다름 · 줄눈은 어둡게 파임 · 모서리는 닳음
   ② 무너짐: 구간마다 온전 / 반쯤 무너짐 / 돌무더기만 남음 — 위 돌이 하나씩 빠진 계단 모양 윤곽(돌 단위라 칼로 썬 줄 X)
   ③ 돌기둥: 5~9m마다 벽보다 굵고 높은 네모 기둥 · 받침돌 · 머리돌 아래 금빛 띠(새긴 무늬) · 기둥 앞뒤 면엔 세로 문양 홈에서 푸른 빛이 흐름 · 몇 개는 부러짐
   ④ 무너진 돌: 벽 앞에 떨어진 네모 돌과 깨진 돌 · 그 사이 돋은 작은 푸른 결정
   ⑤ 문 양옆: 가장 크고 온전한 기둥 · 위로 떠 도는 거대한 고리 조각(예전 유적 벽에서 이어옴)
   석상·깃발·이끼·덩굴은 넣지 않음(느낌만, 사용자 2026-11-05)
   무게: 벽 한 줄 = 돌 1번 + 떠 있는 고리 조각 몇 개. 금빛·푸른 빛·결정도 같은 재질(aM 값으로 구분) */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HITS } from './rocks.js?v=11050950';
import { arc } from './ruins.js?v=11050950';

const hs = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/* 돌 줄(단): 세 줄마다 높이 [.5 .34 .42] 되풀이 → 단 경계 높이 · 줄마다 돌 길이·엇갈림 (셰이더와 같은 식) */
const CH = [.5, .34, .42], CP = 1.26, Y0 = -.3;
const course = y => { const q = y - Y0, k3 = Math.floor(q / CP); let r = q - k3 * CP, k = 0; while (k < 2 && r >= CH[k]) { r -= CH[k]; k++; } return [k3 * 3 + k, y - r, CH[k]]; };   /* [단 번호, 단 바닥, 단 높이] */
const stoneW = k => .7 + .6 * hs(k, 3, 1);
const cellAt = (d, k, side) => { const w = stoneW(k + side * 31), off = hs(k, 7, side) * w; const x = d + off, j0 = Math.floor(x / w);
  const b = j => (j + (hs(k, j, 9 + side) - .5) * .5) * w; let j = j0; if (x < b(j)) j--; else if (x >= b(j + 1)) j++;
  return [j, b(j) - off, b(j + 1) - off]; };   /* [돌 번호, 시작 d, 끝 d] */

export function ruinWallMaterial(uT) {
  const m = new THREE.MeshStandardMaterial({ color: 0x2b2824, roughness: .86, metalness: .05, envMapIntensity: .4, flatShading: true });
  m.onBeforeCompile = sh => { sh.uniforms.uT = uT; sh.uniforms.uHits = HITS;
    sh.vertexShader = 'attribute float aM; attribute float aD; varying float vM; varying float vD; varying vec3 vGw; varying vec3 vGn;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vM=aM; vD=aD; vGw=(modelMatrix*vec4(transformed,1.)).xyz; vGn=normalize(mat3(modelMatrix)*objectNormal);');
    sh.fragmentShader = `uniform float uT; uniform vec4 uHits[16]; varying float vM; varying float vD; varying vec3 vGw; varying vec3 vGn;
      float gh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float gn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(gh(i),gh(i+vec2(1,0)),f.x),mix(gh(i+vec2(0,1)),gh(i+vec2(1,1)),f.x),f.y); }
      float h3(float x,float y,float z){ return fract(sin(x*127.1+y*311.7+z*74.7)*43758.5453); }
      /* 새긴 문양 한 칸 (유적 벽 돌과 같음): 고리 · 반원+막대 · 십자 · 점 셋 · 겹고리 · 빈칸 */
      float glyph(vec2 p, out vec2 cell){ vec2 q=p*2.4; cell=floor(q); vec2 f=fract(q)-.5; float h=gh(cell), w=.05, l=9.;
        if(h<.16) l=abs(length(f)-.3);
        else if(h<.32) l=min(abs(length(f)-.3)+step(f.y,0.)*9., max(abs(f.y+.05),abs(f.x)-.3));
        else if(h<.46) l=min(max(abs(f.x),abs(f.y)-.33),max(abs(f.y),abs(f.x)-.33));
        else if(h<.58) l=min(min(length(f-vec2(-.22,0.)),length(f)),length(f-vec2(.22,0.)))-.04;
        else if(h<.7) l=min(abs(length(f)-.32),abs(length(f)-.16));
        return smoothstep(w,w*.35,l)*smoothstep(.25,.45,gn(p*3.1+7.)); }
      /* 돌 줄 (만드는 쪽과 같은 식) */
      vec3 courseOf(float y){ float q=y+.3, k3=floor(q/1.26), r=q-k3*1.26, k=0., hh=.5; if(r>=.5){ r-=.5; k=1.; hh=.34; if(r>=.34){ r-=.34; k=2.; hh=.42; } } return vec3(k3*3.+k, r, hh); }
      vec3 cellOf(float d, float k, float side){ float w=.7+.6*h3(k+side*31.,3.,1.), off=h3(k,7.,side)*w, x=d+off, j=floor(x/w);
        float b0=(j+(h3(k,j,9.+side)-.5)*.5)*w, b1=(j+1.+(h3(k,j+1.,9.+side)-.5)*.5)*w;
        if(x<b0){ b1=b0; j-=1.; b0=(j+(h3(k,j,9.+side)-.5)*.5)*w; } else if(x>=b1){ b0=b1; j+=1.; b1=(j+1.+(h3(k,j+1.,9.+side)-.5)*.5)*w; }
        return vec3(j, x-b0, b1-x); }\n` + sh.fragmentShader
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        if(vM>.5&&vM<1.5){ metalnessFactor=.55; roughnessFactor=.5; }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { vec3 n=normalize(vGn), an=abs(n); vec2 uv=an.y>.6?vGw.xz:(an.x>an.z?vGw.zy:vGw.xy); vec2 cell; float groove=0.;
          float wear=gn(uv*1.3)*.5+gn(uv*5.)*.3;                                                          /* 풍화 얼룩 */
          if(vM<.5){ /* 돌 */
            float mort=0., inStone=1.;
            if(vD>-.5&&an.y<.6){ vec3 c=courseOf(vGw.y); vec3 s=cellOf(vD,c.x,0.);
              float ey=min(c.y,c.z-c.y), ex=min(s.y,s.z);
              mort=1.-smoothstep(.012,.035,min(ey,ex));                                                   /* 줄눈 */
              float chip=1.-smoothstep(.03,.09,min(ey,ex)); diffuseColor.rgb*=1.+chip*.25*(gh(vec2(s.x,c.x)*.7)-.3);   /* 닳은 모서리 */
              diffuseColor.rgb*=.82+.36*gh(vec2(s.x,c.x));                                                 /* 돌마다 색이 조금씩 다름 */
              if(gh(vec2(s.x*1.7,c.x))<.1) groove=max(groove,glyph(uv+vec2(17.3,4.1),cell)); }             /* 문양 새긴 돌은 드물게 */
            else if(vD>-.5){ vec3 c=courseOf(vGw.y-.02); vec3 s=cellOf(vD,c.x,0.); mort=1.-smoothstep(.012,.035,min(s.y,s.z)); diffuseColor.rgb*=.85+.3*gh(vec2(s.x,c.x)); }
            else groove=glyph(uv+vec2(17.3,4.1),cell)*step(.55,gn(uv*.6));                                 /* 기둥·떨어진 돌 */
            diffuseColor.rgb*=(.6+wear*.8)*(1.-groove*.8)*(1.-mort*.8); }
          else if(vM<1.5){ /* 금빛 띠: 낡은 금 · 새긴 꺾쇠 무늬 · 닳아 거뭇함 */
            diffuseColor.rgb=vec3(.5,.3,.07)*(.7+.45*wear);
            float u=an.x>an.z?vGw.z:vGw.x; float fy=fract(vGw.y*12.5), fu=fract(u*3.2);
            float key=step(.5,fract(u*3.2+step(.5,fy)*.5))*step(.2,fy)*step(fy,.8);
            float edge=smoothstep(.1,.0,fy)+smoothstep(.9,1.,fy);
            diffuseColor.rgb*=1.-(key*.45+edge*.3)*step(an.y,.6); }
          else if(vM<2.5){ /* 푸른 문양 줄: 기둥 앞뒤 면 홈 — 문양을 따라 아래에서 위로 빛이 천천히 흘러 오름 */
            float g=glyph(uv*vec2(1.,.8)+vec2(3.7,1.1),cell);
            diffuseColor.rgb*=.35;
            float flow=.55+.45*sin(vGw.y*3.-uT*1.6+gh(cell)*6.);
            totalEmissiveRadiance+=vec3(.12,.6,1.15)*(g*2.+.18)*flow+vec3(.05,.25,.5)*.15; groove=g; }
          else { /* 푸른 결정 */
            diffuseColor.rgb=vec3(.05,.2,.32); float ndv=abs(dot(normal,normalize(vViewPosition)));
            totalEmissiveRadiance+=vec3(.15,.65,1.2)*(.45+.55*pow(1.-ndv,2.))*(.8+.2*sin(uT*1.7+vGw.x*3.)); }
          /* 맞으면: 가까운 문양부터 하나씩 금빛 (유적 벽 돌과 같음) */
          float lit=0.;
          for(int i=0;i<16;i++){ float age=uT-uHits[i].w; if(age<0.||age>1.1) continue; float d=distance(vGw,uHits[i].xyz); if(d>3.2) continue;
            float delay=d/7.+gh(cell+float(i))*.12; lit+=step(delay,age)*exp(-max(0.,age-delay)*3.6)*exp(-d*d*.42); }
          if(lit>.003) totalEmissiveRadiance+=vec3(1.,.78,.4)*groove*lit*3.2+vec3(1.,.6,.25)*lit*.08; }`); };
  m.customProgramCacheKey = () => 'ruin-wall-v2';
  return m;
}

const tagged = (g, M, D = -1) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'aM' && k !== 'aD') n.deleteAttribute(k);
  const c = n.attributes.position.count; if (!n.attributes.aM) n.setAttribute('aM', new THREE.Float32BufferAttribute(new Float32Array(c).fill(M), 1));
  if (!n.attributes.aD) n.setAttribute('aD', new THREE.Float32BufferAttribute(new Float32Array(c).fill(D), 1)); return n; };
/* 모서리 깎인 네모 돌 */
const stoneBox = (w, h, d, R, chip = .08) => { const g = new THREE.BoxGeometry(w, h, d, 2, 2, 2), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), ex = Math.abs(x) > w / 2 - 1e-4, ey = Math.abs(y) > h / 2 - 1e-4, ez = Math.abs(z) > d / 2 - 1e-4;
    if (ex + ey + ez >= 2) { const k = chip * (.5 + R()); P.setXYZ(i, x - Math.sign(x) * k * ex, y - Math.sign(y) * k * ey * .7, z - Math.sign(z) * k * ez); } }
  return g; };

export function makeRuinWall(path, opt = {}) {
  const uT = opt.uT || { value: 0 }, mat = opt.mat || ruinWallMaterial(uT), doors = opt.doors || [true, true];
  const seed = opt.seed || 3, R = (() => { let s = seed * 7919 + 7; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'), len = curve.getLength();
  const Hm = opt.H || 2.4, W = .75, DS = .1, N = Math.max(4, Math.round(len / DS));
  /* ② 무너짐 구간: 3~7m마다 온전 / 반쯤 / 돌무더기 · 문 가까이는 온전 · 문 없는 끝은 무너짐 */
  const ZN = []; for (let d = -1; d < len + 1;) { const l = 3 + R() * 4, r = R(); ZN.push([d, d + l, r < .4 ? 1.05 : r < .75 ? .55 : .18]); d += l; }
  const target = d => { let a = 1; for (const z of ZN) if (d >= z[0] && d < z[1]) { const e = Math.min(d - z[0], z[1] - d); a = z[2]; const nb = ZN[ZN.indexOf(z) + (d - z[0] < z[1] - d ? -1 : 1)]; if (nb) a += (nb[2] - a) * .5 * (1 - sstep(0, 1.2, e)); }
    const ds = doors[0] ? d : 1e9, de = doors[1] ? len - d : 1e9; a = Math.max(a, 1 - sstep(1.5, 4, Math.min(ds, de)));
    if (!doors[0]) a *= sstep(0, 2.5, d) * .8 + .2; if (!doors[1]) a *= sstep(0, 2.5, len - d) * .8 + .2;
    return Hm * a * (.8 + .4 * hs(Math.floor(d * .9), 2, seed)); };   /* 돌 몇 개 폭마다 높이가 들쭉날쭉 → 빠진 돌 계단 */
  /* 돌 단위 윤곽: 아래 단부터 쌓아 올라가며, 그 돌의 가운데 자리에서 목표 높이를 넘으면 그 돌은 빠짐(=거기서 멈춤) */
  const topAt = (d, side) => { let y = Y0; for (let i = 0; i < 12; i++) { const [k, y0, h] = course(y + 1e-4), [, a, b] = cellAt(d, k, 0), dc = (a + b) / 2;
      if (y0 + h > target(dc) + h * .35) break; y = y0 + h; } return Math.max(Y0 + .3, y); };
  const p = new THREE.Vector3(), tg = new THREE.Vector3(), fr = [];
  for (let i = 0; i <= N; i++) { const d = i / N * len; curve.getPointAt(i / N, p); curve.getTangentAt(i / N, tg); let nx = -tg.z, nz = tg.x; const sg = opt.out ? opt.out(p.x, p.z, nx, nz) : 1; nx *= sg; nz *= sg;
    fr.push({ d, x: p.x, z: p.z, nx, nz, tx: tg.x, tz: tg.z, sg, hf: topAt(d, 0), hb: topAt(d, 1) }); }
  const FL = fr[0].sg < 0;
  /* ① 앞뒤 면: 단 경계마다 줄을 두어 돌마다 튀어나온 정도가 또렷이 바뀜 */
  const ROWS = []; for (let y = Y0; y < Hm * 1.3; ) { const [, y0, h] = course(y + 1e-4); ROWS.push(y0 + .015, y0 + h * .5, y0 + h - .015); y = y0 + h; }
  const face = (f, side, y) => { const [k] = course(Math.min(y, (side ? f.hb : f.hf) - .01)), [j] = cellAt(f.d, k, 0);
    return W + (hs(j, k, side + 5) - .5) * .13 + .025 * (1 - Math.min(1, (y - Y0) / 1.5)); };   /* 돌마다 튀어나옴 · 아래가 살짝 두꺼움 */
  const section = f => { const out = [], hf = f.hf, hb = f.hb, ht = Math.min(hf, hb);
    for (const y of ROWS) { const yy = Math.min(y, hf); out.push([-face(f, 0, yy), yy]); }
    out.push([-W + .04, hf], [-W * .2, ht + .01], [W * .2, ht + .01], [W - .04, hb]);
    for (let r = ROWS.length - 1; r >= 0; r--) { const yy = Math.min(ROWS[r], hb); out.push([face(f, 1, yy), yy]); }
    return out; };
  const S = fr.map(section), M = S[0].length, P = [], Dd = [];
  const pt = (i, k) => { const f = fr[i], q = S[i][k]; return [f.x + f.nx * q[0], q[1], f.z + f.nz * q[0]]; };
  const tri = (a, b, c, da, db, dc) => { if (FL) { P.push(...a, ...c, ...b); Dd.push(da, dc, db); } else { P.push(...a, ...b, ...c); Dd.push(da, db, dc); } };
  for (let i = 0; i < N; i++) for (let k = 0; k < M - 1; k++) { const A = pt(i, k), B = pt(i, k + 1), C = pt(i + 1, k), D = pt(i + 1, k + 1);
    if (Math.abs(A[1] - B[1]) < 1e-4 && Math.abs(C[1] - D[1]) < 1e-4 && Math.abs(A[0] - B[0]) + Math.abs(A[2] - B[2]) < 1e-4) continue;   /* 빠진 돌 위 빈 줄 */
    tri(A, B, C, fr[i].d, fr[i].d, fr[i + 1].d); tri(C, B, D, fr[i + 1].d, fr[i].d, fr[i + 1].d); }
  /* 높이가 바뀌는 자리(빠진 돌 옆면)는 위 식에서 비스듬히 이어짐 → 짧은 간격(0.1m)이라 돌 옆면처럼 보임 */
  for (const i of [0, N]) { const f = fr[i], dir = i === 0 ? -1 : 1, tx = f.tx * dir, tz = f.tz * dir, ring = S[i];
    const tris = THREE.ShapeUtils.triangulateShape(ring.map(q => new THREE.Vector2(q[0], q[1])), []);
    for (const [x, y, z] of tris) { const A = pt(i, x), B = pt(i, y), C = pt(i, z), ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
      ((uy * vz - uz * vy) * tx + (ux * vy - uy * vx) * tz >= 0) ? P.push(...A, ...B, ...C) : P.push(...A, ...C, ...B); Dd.push(f.d, f.d, f.d); } }
  const parts = []; { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aD', new THREE.Float32BufferAttribute(Dd, 1)); parts.push(tagged(g, 0)); }
  const RG = (() => { let s = seed * 104729 + 13; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const place = (g, f, along, out, y, yaw = 0) => { g.rotateY(Math.atan2(f.nx, f.nz) + yaw); g.translate(f.x + f.tx * along + f.nx * out, y, f.z + f.tz * along + f.nz * out); return g; };
  const frAt = d => fr[Math.min(N, Math.max(0, Math.round(d / len * N)))];
  /* ③ 돌기둥 */
  const pillarAt = (d, big) => { const f = frAt(d), broken = !big && RG() < .35, w = (big ? 1.35 : 1.05) + RG() * .15, h = big ? Hm * 1.75 : broken ? Hm * (.55 + RG() * .4) : Hm * (1.3 + RG() * .25);
    parts.push(tagged(place(stoneBox(w + .3, .35, w + .3, RG, .06).translate(0, Y0 + .175 + .3, 0), f, 0, 0, 0), 0));                 /* 받침돌 */
    const sh = stoneBox(w, h, w, RG, .07); sh.translate(0, Y0 + .65 + h / 2, 0);
    if (broken) { const Pp = sh.attributes.position, brk = new THREE.Vector3(RG() - .5, 1, RG() - .5).normalize(), top = Y0 + .65 + h;   /* 부러진 윗면: 비스듬히 깨짐 */
      for (let j = 0; j < Pp.count; j++) if (Pp.getY(j) > top - .01) Pp.setY(j, top - (Pp.getX(j) * brk.x + Pp.getZ(j) * brk.z) / brk.y * .9 - hs(j, 1, seed) * .25); }
    parts.push(tagged(place(sh, f, 0, 0, 0), 0));
    for (const s of [-1, 1]) { const rs = new THREE.BoxGeometry(.24, h * .62, .03); rs.translate(0, Y0 + .65 + h * .42, s * (w / 2 + .005)); parts.push(tagged(place(rs, f, 0, 0, 0), 2)); }   /* 푸른 문양 줄 (앞뒤 면) */
    if (!broken) { const yt = Y0 + .65 + h;
      parts.push(tagged(place(new THREE.BoxGeometry(w + .12, .1, w + .12).translate(0, yt - .05, 0), f, 0, 0, 0), 1));                   /* 금빛 띠 */
      parts.push(tagged(place(stoneBox(w + .32, .34, w + .32, RG, .06).translate(0, yt + .17, 0), f, 0, 0, 0), 0));                      /* 머리돌 */
      parts.push(tagged(place(new THREE.BoxGeometry(w + .36, .07, w + .36).translate(0, yt + .3, 0), f, 0, 0, 0), 1));                   /* 머리돌 위 금 테 */
      parts.push(tagged(place(stoneBox(w * .7, .28, w * .7, RG, .05).translate(0, yt + .48, 0), f, 0, 0, 0, (RG() - .5) * .3), 0)); }    /* 꼭대기 작은 돌 */
    return f; };
  const PIL = []; if (doors[0]) PIL.push(pillarAt(.6, true)); if (doors[1]) PIL.push(pillarAt(len - .6, true));
  for (let d = 3 + R() * 3; d < len - 3; d += 5 + R() * 4) PIL.push(pillarAt(d, false));
  /* ④ 무너진 돌: 무너진 구간 앞에 많이 · 네모 돌(쓰러지고 기울어짐) · 군데군데 푸른 결정 */
  for (let d = .5 + R(); d < len - .3; d += .5 + R() * 1.3) { const f = frAt(d), fallen = 1 - (f.hf + .3) / (Hm + .3); if (R() > .25 + fallen * .9) continue;
    const side = R() < .78 ? -1 : 1, out = side * (W + .3 + R() * (1 + fallen * 2.2)), s = .3 + R() * .35;
    const g = stoneBox(s * (1.2 + R() * .8), s * (.7 + R() * .4), s * (.9 + R() * .4), R, .06); g.rotateX((R() - .5) * .8); g.rotateZ((R() - .5) * .8);
    parts.push(tagged(place(g, f, (R() - .5) * .6, out, Y0 + .3 + s * .25, R() * 6), 0));
    if (R() < .12) for (let c = 0; c < 2 + R() * 3; c++) { const r = .05 + R() * .07, hh = .25 + R() * .45, cg = new THREE.CylinderGeometry(r * .2, r, hh, 6, 1);   /* 푸른 결정 */
      cg.translate(0, hh / 2, 0); cg.rotateX((R() - .5) * .9); cg.rotateZ((R() - .5) * .9); parts.push(tagged(place(cg, f, (R() - .5) * .5, out + (R() - .5) * .4, -.02), 3)); } }
  const grp = new THREE.Group(); grp.add(new THREE.Mesh(mergeGeometries(parts), mat));
  /* ⑤ 떠 있는 고리 조각: 문 위 (예전 유적 벽처럼 천천히 오르내리며 돎) */
  const fl = []; const ag = [11, 12, 13].map(arc);
  for (const f of PIL.slice(0, (doors[0] ? 1 : 0) + (doors[1] ? 1 : 0))) { const r = 2.4 + RG() * .6, g = tagged(ag[Math.floor(RG() * 3)].clone(), 0), ms = new THREE.Mesh(g, mat);
    ms.scale.setScalar(r); grp.add(ms); fl.push({ ms, x: f.x, z: f.z, y: Hm * 2.1, tilt: (RG() - .5) * .5, roll: 1.25 + (RG() - .5) * .3, yaw: Math.atan2(f.tx, f.tz) + Math.PI / 2, spin: (RG() - .5) * .08, ph: RG() * 6 }); }
  grp.userData = { mat, len, update: t => { for (const f of fl) { f.ms.position.set(f.x, f.y + Math.sin(t * .4 + f.ph) * .3, f.z); f.ms.rotation.set(f.tilt, f.yaw + t * f.spin, f.roll, 'YXZ'); } } };
  return grp;
}
