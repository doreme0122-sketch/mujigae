/* 시작 기지 — 판 아래부터 이어진 바닥 + 두 층 계단(1층 낮게, 2층 두껍고 높은 장갑 단) + 2층 바깥의 겹친 비탈 장갑
   · 바닥: 검은 건메탈. 계단 윗면: 은색 메탈(판 선). 계단 세로면: 건메탈 갈빗대 + 밝은 에너지 빛.
   · 2층 윗면: 칸마다 다른 장갑판 — 겹친 판(볼트) · 파인 통풍칸(살창 + 빛) · 두 단으로 솟은 덮개판(점검구)
   · 2층 바깥: 계단이 아니라 위 판이 아래 판을 덮는 비탈 장갑, 두 판 사이로 빛
   · 에너지 길: 대각선 네 방향. 수호 기둥 발치에서 2층 → 1층 → 바닥 → 금테 별의 갈래 사이로. 빛이 바깥 → 가운데로 흘러 판에 힘을 넣는다.
   · 출구: 넓게, 양옆은 높이가 부드럽게 내려앉는 경사 + 바깥을 가리키는 빛 화살표
   단위는 자기장 판과 같음. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sweep, posNor } from './floatring.js?v=11041136';
import { GUARD_ANG, GUARD, guardScale } from './guardian.js?v=11041136';


/* 건담처럼 장갑판을 조립한 느낌의 검은 판 선 — 면 위치로 바로 그림(텍스처 없음, 가벼움)
   · 바닥·계단 윗면: 동심 띠 + 벽돌처럼 엇갈린 칸. 칸마다 운으로 '판 안의 판' · 반쯤 그은 선과 꺾인 끝 · 모서리 작은 네모 · 옆 칸과 이어진 긴 판
   · 세운 면(계단 앞면·벽): 세로 칸 + 칸마다 다른 높이의 가로 선 */
function panelLines(mat, cell = .55, imp = null) {   /* imp: { uImp } — 빛이 꽂힌 순간 판 선을 따라 퍼지는 빛 (앞머리 반지름) */
  mat.onBeforeCompile = sh => { if (imp) sh.uniforms.uImp = imp.uImp;
    sh.vertexShader = 'varying vec3 vLp; varying vec3 vLn;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vLp = position; vLn = normal;');
    sh.fragmentShader = `varying vec3 vLp; varying vec3 vLn;
      float ph(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float ln(float d, float w){ float f = fwidth(d) * 1.2; return 1. - smoothstep(w - f, w + f, d); }
      float panel(vec3 p, vec3 n){
        float r = length(p.xz), a = atan(p.z, p.x) + 3.14159265, W = .011, k = 0.;
        if (abs(n.y) > .6) {
          float C = ${cell.toFixed(3)}, ri = floor(r / C), fr = fract(r / C), rm = (ri + .5) * C;
          float na = max(8., floor(6.2831853 * rm / .95 / 4.) * 4.), sh = mod(ri, 2.) * .5;
          float u = a / 6.2831853 * na + sh, ci = floor(u), fa = fract(u), cw = 6.2831853 * rm / na;
          float dr = min(fr, 1. - fr) * C, da = min(fa, 1. - fa) * cw;
          float h = ph(vec2(ri, ci)), h2 = ph(vec2(ri + 17., ci + 3.));
          float joinR = step(.75, ph(vec2(ri, ci + 1.)));                 /* 다음 칸과 이어진 긴 판 */
          k = max(k, ln(dr, W));
          k = max(k, ln(da, W) * (fa > .5 ? 1. - joinR : 1. - step(.75, h)));
          float x = fa * cw, y = fr * C;                                    /* 칸 안의 자리 */
          if (h < .3) { float d2 = min(min(x - .07, cw - .07 - x), min(y - .07, C - .07 - y)); k = max(k, ln(abs(d2), W * .8) * step(-.0, d2 + W)); }   /* 판 안의 판 */
          else if (h < .55) { float xm = cw * (.35 + .3 * h2); k = max(k, ln(abs(x - xm), W) * step(y, C * .62)); k = max(k, ln(abs(y - C * .62), W) * step(abs(x - xm - .06), .06)); }   /* 반쯤 그은 선 + 꺾인 끝 */
          else if (h < .7) { vec2 q = vec2(x - .1, y - .1); float b = max(abs(q.x - .06), abs(q.y - .045)); k = max(k, ln(abs(b - .045), W * .8) * step(b, .06)); }   /* 모서리 작은 네모 */
        } else {
          float s = a * r, C = .62, ci = floor(s / C), fs = fract(s / C), h = ph(vec2(ci, floor(r * 3.)));
          k = max(k, ln(min(fs, 1. - fs) * C, W));
          float yh = .12 + h * .5; k = max(k, ln(abs(p.y - yh), W) * step(.35, h));
        }
        return k; }
      ` + (imp ? 'uniform vec2 uImp;\n' : '') + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n float pnl = panel(vLp, normalize(vLn)); diffuseColor.rgb *= 1. - .82 * pnl;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + (imp ? ' { float r = length(vLp.xz), d = uImp.x - r; totalEmissiveRadiance += vec3(.35,.65,1.4) * pnl * (exp(-d*d*6.) * 2.5 + step(0., d) * exp(-d * 1.2) * .5) * uImp.y; }' : ''));
  };
  mat.customProgramCacheKey = () => 'panel' + cell + (imp ? 'i' : '');
  return mat;
}

export const SPEED = 5;
export const WAVE_R0 = 7.0 + .85 + .3;   /* 빛 물결이 출발하는 반지름 (맨 바깥 고리 바로 밖) */   /* 켜지는 빛이 바깥에서 가운데로 오는 빠르기 (판 단위/초) */
export const ARENA = { floor: 4.3, t1: [4.3, 5.3, .34], t2: [5.3, 7.0, .95], skirt: .85, exitHalf: .34, ramp: .3 };

export function makeArena() {
  const G = new THREE.Group(), { floor: RF, t1, t2, skirt: SK, exitHalf: EH, ramp: RS } = ARENA;
  /* 금은 판(금테 별)에만. 판 아래 바닥 = 검은 건메탈, 계단 윗면 = 은색 메탈, 세로면 = 건메탈 + 밝은 에너지 빛 */
  const silver = panelLines(new THREE.MeshPhysicalMaterial({ color: 0xc2c8d2, metalness: .45, roughness: .42, clearcoat: .6, clearcoatRoughness: .2, envMapIntensity: .9, sheen: .4, sheenColor: 0x9fc2ff }));
  const silverHi = new THREE.MeshPhysicalMaterial({ color: 0xd4d9e1, metalness: .35, roughness: .36, clearcoat: .7, clearcoatRoughness: .15, envMapIntensity: .95, sheen: .4, sheenColor: 0x9fc2ff });
  const gun = new THREE.MeshPhysicalMaterial({ color: 0x2a2e35, metalness: .9, roughness: .3, clearcoat: .5, clearcoatRoughness: .2, envMapIntensity: 1 });
  const gunRib = new THREE.MeshPhysicalMaterial({ color: 0x3a3f48, metalness: .9, roughness: .26, clearcoat: .6, clearcoatRoughness: .15, envMapIntensity: 1.1 });
  const uImp = { value: new THREE.Vector2(0, 0) };
  const floorM = panelLines(new THREE.MeshPhysicalMaterial({ color: 0x1c1f25, metalness: .88, roughness: .3, clearcoat: .45, clearcoatRoughness: .2, envMapIntensity: .95 }), .62, { uImp });   /* 검은 건메탈 + 판 선 */
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe2b35c, metalness: 1, roughness: .26, clearcoat: .4, clearcoatRoughness: .2, envMapIntensity: 1.25 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b0d12, metalness: .5, roughness: .45, envMapIntensity: .5 });
  const blue = new THREE.MeshBasicMaterial({ color: 0x3b6fd0 });
  blue.onBeforeCompile = sh => { Object.assign(sh.uniforms, { uOn, uT, uW });
    sh.vertexShader = 'varying vec3 vBw;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vBw = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = 'uniform float uOn,uT,uW; varying vec3 vBw;\n' + WAKE + '\n' + sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'float ON = onAt(length(vBw.xz)); vec4 diffuseColor = vec4( vec3(.28,.58,1.35) * (.3 + ON * 1.1), opacity );'); };
  const L = { silver: [], silverHi: [], gun: [], rib: [], floor: [], dark: [], blue: [], gold: [] };
  const A0 = EH, A1 = Math.PI * 2 - EH, M0 = EH + RS, M1 = Math.PI * 2 - EH - RS;   /* 출구를 뺀 범위 / 그중 경사를 뺀 온전한 높이 범위 */
  const sm = u => u * u * (3 - 2 * u);
  /* 출구 양옆은 끊지 않고 경사: 높이가 출구 쪽으로 갈수록 바닥까지 부드럽게 내려앉음 */
  const ramped = prof => [sweep(prof, A0, M0, undefined, 40, (u, y) => y > 0 ? Math.max(.004, y * sm(u)) : y), sweep(prof, M0, M1), sweep(prof, M1, A1, undefined, 40, (u, y) => y > 0 ? Math.max(.004, y * sm(1 - u)) : y)];
  const RO = t2[1] + SK;

  /* ── 바닥 ── */
  L.floor.push(sweep([[0.001, -.12], [RF, -.12], [RF, -.002], [0.001, -.002]], 0, Math.PI * 2, undefined, 128));
  L.floor.push(sweep([[RF - .05, -.12], [RO + .02, -.12], [RO + .02, -.002], [RF - .05, -.002]], -EH, EH, undefined, 16));   /* 출구 길 바닥 */

  /* ── 빛 띠 (계단 세로면) ── */
  const uOn = { value: 0 }, uT = { value: 0 }, uW = { value: 1e9 };   /* uW: 빛이 바깥에서 들어오기 시작한 시각 */
  const WAKE = `float onAt(float r){ return uOn * clamp(((uT - uW) * ${SPEED.toFixed(2)} - (${(t2[1] + SK + .3).toFixed(2)} - r)) / .6, 0., 1.); }`;
  const glowPos = [], glowK = [], glowS = [];
  const band = (r, y0, y1, k, a0 = M0, a1 = M1) => { const n = 200; for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n, b = a0 + (a1 - a0) * (i + 1) / n;
    const P = (aa, y) => [Math.cos(aa) * r, y, Math.sin(aa) * r]; const p = [P(a, y0), P(b, y0), P(b, y1), P(a, y1)]; glowPos.push(...p[0], ...p[1], ...p[2], ...p[0], ...p[2], ...p[3]);
    for (let j = 0; j < 6; j++) { glowK.push(k); glowS.push(-1); } } };
  const OV = .045, TH = .06;
  const riser = (r, y0, y1, i) => { const n = 64 + i * 12;
    for (let k = 0; k < n; k++) { const aa = M0 + (M1 - M0) * (k + .5) / n, g = new THREE.BoxGeometry(.03, y1 - y0 - .02, .045); g.translate(r - .014, (y0 + y1) / 2, 0); g.rotateY(-aa); L.rib.push(posNor(g)); }
    const ym = (y0 + y1) / 2; band(r - .006, ym - .03, ym + .03, i); band(r - .005, y1 - .025, y1 - .012, i + 10); };

  /* ── 1층: 낮고 얇은 단 ── */
  { const [r0, r1, h] = t1;
    L.gun.push(...ramped([[r0, -.12], [r1, -.12], [r1, h - TH], [r0, h - TH]]));
    L.silver.push(...ramped([[r0 - OV, h - TH], [r1, h - TH], [r1, h], [r0 - OV + .02, h], [r0 - OV, h - .015]]));
    riser(r0, 0, h - TH, 0); }

  /* ── 2층: 두껍고 높은 장갑 단. 윗면은 칸마다 다른 장갑판이 겹겹이 ── */
  const [q0, q1, H] = t2;
  L.gun.push(...ramped([[q0, -.12], [q1, -.12], [q1, H - .1], [q0, H - .1]]));
  L.silver.push(...ramped([[q0 - OV, H - .1], [q1, H - .1], [q1, H - .04], [q0 - OV + .02, H - .04], [q0 - OV, H - .055]]));   /* 바탕 판(경사 구간까지) */
  riser(q0, t1[2], H - .1, 1);
  const R = (() => { let v = 1234; return () => (v = (v * 9301 + 49297) % 233280) / 233280; })();
  /* 가장 가까운 탑까지 각도 거리 */
  const near = a => { let m = 9; for (const g of GUARD_ANG) { const d = Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) - (1 - guardScale(g)) * seatA0; if (d < m) m = d; } return m; };
  const SEAT = .8, seatA = (SEAT + .06) / GUARD.r, seatA0 = seatA;                        /* 탑을 앉히는 둥근 자리 반지름 */
  /* 2층 윗면: 탑에서 멀어지는 순서대로 정해진 장갑판이 되풀이됨 — 탑 옆은 무거운 덮개판 → 겹친 판 → 통풍칸 → 겹친 판 → … (양쪽 대칭, 정돈됨) */
  const N = 56, da = (M1 - M0) / N, SEQ = ['cover', 'overlap', 'vent', 'overlap'];
  for (let k = 0; k < N; k++) { const a0 = M0 + k * da + .007, a1 = a0 + da - .014, am = (a0 + a1) / 2, d = near(am);
    if (d < seatA) continue;                                                    /* 탑 자리 */
    const kind = SEQ[Math.floor((d - seatA) / da) % SEQ.length];
    if (kind === 'overlap') {  /* 겹친 장갑판: 안쪽 낮은 판 + 바깥 높은 판(모따기) + 볼트 */
      L.silverHi.push(sweep([[q0 + .02, H - .04], [q0 + .78, H - .04], [q0 + .78, H + .01], [q0 + .04, H + .01]], a0, a1));
      L.silver.push(sweep([[q0 + .7, H - .04], [q1 - .02, H - .04], [q1 - .02, H + .02], [q1 - .14, H + .1], [q0 + .86, H + .1], [q0 + .7, H + .04]], a0 + .006, a1 - .006));
      for (const f of [.25, .75]) { const aa = a0 + (a1 - a0) * f, g = new THREE.CylinderGeometry(.026, .03, .02, 8); g.translate(q0 + 1.15, H + .11, 0); g.rotateY(-aa); L.gun.push(posNor(g)); }
    } else if (kind === 'vent') {   /* 파인 통풍칸: 짙은 바닥 + 살창 + 가는 빛 */
      const rim = [[q0 + .02, H - .04], [q1 - .02, H - .04], [q1 - .02, H + .04], [q1 - .12, H + .07], [q0 + .12, H + .07], [q0 + .02, H + .03]];
      L.silverHi.push(sweep(rim, a0, a0 + .012, undefined, 1)); L.silverHi.push(sweep(rim, a1 - .012, a1, undefined, 1));
      L.dark.push(sweep([[q0 + .15, H - .04], [q1 - .15, H - .04], [q1 - .15, H - .03], [q0 + .15, H - .03]], a0 + .012, a1 - .012));
      for (let j = 0; j < 9; j++) { const r = q0 + .3 + (q1 - q0 - .6) * j / 8, g = new THREE.BoxGeometry(.035, .05, (a1 - a0 - .03) * r); g.translate(r, H - .01, 0); g.rotateY(-am); L.gun.push(posNor(g)); }
      band(q0 + .2, H - .028, H - .026, 30, a0 + .015, a1 - .015);
    } else {                   /* 무거운 덮개판(탑 옆): 두 단으로 솟은 판 + 점검구 */
      L.silver.push(sweep([[q0 + .02, H - .04], [q1 - .02, H - .04], [q1 - .02, H + .03], [q1 - .1, H + .08], [q0 + .1, H + .08], [q0 + .02, H + .03]], a0, a1));
      L.silverHi.push(sweep([[q0 + .45, H + .08], [q1 - .4, H + .08], [q1 - .45, H + .13], [q0 + .5, H + .13]], a0 + .02, a1 - .02));
      L.dark.push(sweep([[q0 + .7, H + .13], [q0 + .95, H + .13], [q0 + .95, H + .135], [q0 + .7, H + .135]], am - .02, am + .02));
    } }
  /* 탑 자리: 둥글게 판 우묵한 자리(짙은 바닥) + 솟은 은색 테 + 테 안쪽 빛 고리. 탑이 그 안에 앉음 */
  for (const g of GUARD_ANG) { const cx = Math.cos(g) * GUARD.r, cz = Math.sin(g) * GUARD.r, sc = guardScale(g);
    const put = geo => { geo.scale(sc, 1, sc); geo.translate(cx, 0, cz); return geo; };
    L.dark.push(put(sweep([[0.001, H - .045], [SEAT - .1, H - .045], [SEAT - .1, H - .03], [0.001, H - .03]], 0, Math.PI * 2, undefined, 48)));
    L.gold.push(put(sweep([[SEAT - .12, H - .045], [SEAT + .04, H - .045], [SEAT + .04, H + .08], [SEAT - .02, H + .14], [SEAT - .1, H + .14], [SEAT - .12, H + .1]], 0, Math.PI * 2, undefined, 64)));
    for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2, b = (i + 1) / 64 * Math.PI * 2, r = (SEAT - .125) * sc, P = (aa, y) => [cx + Math.cos(aa) * r, y, cz + Math.sin(aa) * r];
      const p = [P(a, H - .02), P(b, H - .02), P(b, H + .07), P(a, H + .07)]; glowPos.push(...p[0], ...p[1], ...p[2], ...p[0], ...p[2], ...p[3]); for (let j = 0; j < 6; j++) { glowK.push(5); glowS.push(-1); } } }
  /* ── 2층 바깥: 계단 대신 겹친 비탈 장갑(위 판이 아래 판을 덮으며 바닥까지) ── */
  { const sk = [[q1 - .02, -.12], [q1 + SK, -.12], [q1 + SK, .05], [q1 + SK * .55, .3], [q1 + .02, H - .12]];
    L.gold.push(...ramped(sk));                                   /* 맨 바깥 고리: 금 */
    const NS = 36, ds = (M1 - M0) / NS;
    for (let k = 0; k < NS; k++) { const a0 = M0 + k * ds + .006, a1 = a0 + ds - .012;
      L.silver.push(sweep([[q1 - .03, H - .1], [q1 + SK * .5, .36], [q1 + SK * .5, .42], [q1 - .03, H - .04]], a0, a1));              /* 윗 비탈판 */
      L.blue.push(sweep([[q1 + SK * .45, .2], [q1 + SK + .02, .02], [q1 + SK + .02, .07], [q1 + SK * .45, .27]], a0 + .01, a1 - .01));   /* 박힌 가로 네모: 푸른 빛 */
      band(q1 + SK * .52, .3, .34, 20, a0 + .01, a1 - .01); } }                   /* 두 판 사이 빛 */

  /* ── 출구 화살표: 바깥을 가리키는 빛 화살표가 차례로 밝아지며 흘러감 + 길 양옆 빛 줄 ── */
  { const NA = 6, x0 = RF + .5, x1 = RO - .45;
    for (let i = 0; i < NA; i++) { const x = x0 + (x1 - x0) * i / (NA - 1), W = .62, T = .2, y = .006;
      const pts = [[x + .32, 0], [x - .12, W], [x - .12 - T, W], [x + .32 - T, 0], [x - .12 - T, -W], [x - .12, -W]];
      const tri = [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5]];
      for (const t of tri) for (const j of t) { glowPos.push(pts[j][0], y, pts[j][1]); glowK.push(i); glowS.push(-2); } }
    for (const sd of [-1, 1]) { const z = sd * 1.02, w = .025, n = 24;
      for (let i = 0; i < n; i++) { const xa = RF + .2 + (x1 + .3 - RF - .2) * i / n, xb = RF + .2 + (x1 + .3 - RF - .2) * (i + 1) / n, y = .005;
        glowPos.push(xa, y, z - w, xb, y, z - w, xb, y, z + w, xa, y, z - w, xb, y, z + w, xa, y, z + w); for (let j = 0; j < 6; j++) { glowK.push(-1 + (i + .5) / n * 6); glowS.push(-3); } } } }

  /* ── 에너지 길: 꼭대기 단 → 계단을 타고 내려와 → 바닥 → 별의 갈래 사이. s: 바깥 1 → 안 0 ── */
  const e = .005;
  for (const a of GUARD_ANG) { const c = Math.cos(a), s = Math.sin(a), nx = -s, nz = c, diag = Math.abs(Math.cos(2 * a)) < .5;
    const path = [[GUARD.r - SEAT * guardScale(a) + .02, H - .03 + e], [q0 - OV - e, H - .04 + e], [q0 - OV - e, t1[2] + e], [t1[0] - OV - e, t1[2] + e], [t1[0] - OV - e, .004], [diag ? 2.0 : 3.2, .004]];
    const segL = []; let tot = 0; for (let i = 0; i < path.length - 1; i++) { const l = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]); segL.push(l); tot += l; }
    /* 홈: 바닥·계단에 파인 짙은 길 + 양옆 파란 실선 */
    let acc = 0;
    for (let i = 0; i < path.length - 1; i++) { const [ra, ya] = path[i], [rb, yb] = path[i + 1], sa = 1 - acc / tot, sb = 1 - (acc + segL[i]) / tot; acc += segL[i];
      const vert = Math.abs(ra - rb) < 1e-3;
      for (const [hw, list, lift] of [[.075, 'dark', .001], [.03, 'glow', .003]]) {
        const P = (r, y, o) => [c * r + nx * o + (vert ? -c * lift : 0), y + (vert ? 0 : lift), s * r + nz * o + (vert ? -s * lift : 0)];
        const p0 = P(ra, ya, -hw), p1 = P(ra, ya, hw), p2 = P(rb, yb, hw), p3 = P(rb, yb, -hw);
        if (list === 'dark') { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...p0, ...p2, ...p1, ...p0, ...p3, ...p2], 3)); g.computeVertexNormals(); L.dark.push(g); }
        else { glowPos.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3); for (const v of [sa, sa, sb, sa, sb, sb]) { glowK.push(9); glowS.push(v); } } }
      for (const sd of [-1, 1]) { if (vert) continue; const g = new THREE.BoxGeometry(Math.abs(rb - ra), .012, .014); g.translate((ra + rb) / 2, ya + .006, sd * .09); g.rotateY(-a); L.blue.push(posNor(g)); } } }

  /* 금 테: 1층·2층 단 모서리를 따라 원으로 빙 두르고(출구 쪽은 경사를 따라 내려앉음),
     출구 양옆 가장자리를 따라 같은 금이 세로로(안 → 바깥) 이어 두 고리를 묶는다 */
  for (const [r, h] of [[t1[0] - OV, t1[2]], [q0 - OV, H - .04]]) {
    const prof = [[r - .03, h - .06], [r + .02, h - .065], [r + .1, h + .004], [r + .1, h + .02], [r + .01, h + .02], [r - .03, h - .02]];
    L.gold.push(...ramped(prof)); }
  for (const aa of [A0, A1]) { const sd = aa === A0 ? 1 : -1, W = .2;                 /* 두께 있는 금 띠: 넓고 높게, 위 모서리 깎음 */
    const r0 = t1[0] - OV - .03, r1 = RO + .02, a0 = aa + sd * .004, a1 = aa + sd * (.004 + W / ((r0 + r1) / 2));
    L.gold.push(sweep([[r0, -.002], [r1, -.002], [r1, .11], [r1 - .03, .14], [r0 + .03, .14], [r0, .11]], Math.min(a0, a1), Math.max(a0, a1), undefined, 4)); }

  const add = (list, mat) => { if (list.length) G.add(new THREE.Mesh(mergeGeometries(list.map(posNor)), mat)); };
  add(L.silver, silver); add(L.silverHi, silverHi); add(L.gun, gun); add(L.rib, gunRib); add(L.floor, floorM); add(L.dark, dark); add(L.blue, blue); add(L.gold, gold);
  /* 숨은 빛 + 에너지 길 */
  const gMat = new THREE.ShaderMaterial({ uniforms: { uOn, uT, uW }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'attribute float aK, aS; varying float vK, vS; varying vec3 vW; void main(){ vK=aK; vS=aS; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uOn,uT,uW; varying float vK, vS; varying vec3 vW;
      ${WAKE}
      void main(){ float ON = onAt(length(vW.xz));
        vec3 c = vec3(.28,.58,1.35); float b;
        if (vS < -2.5) { float ph = fract(uT*.55 - vK*.16); b = .25 + .5*smoothstep(.0,.2,ph)*smoothstep(.6,.2,ph)*(.5+.5*ON); }   /* 길 양옆 빛 줄 */
        else if (vS < -1.5) { float ph = fract(uT*.55 - vK*.16), pk = smoothstep(.0,.08,ph)*smoothstep(.4,.08,ph);          /* 화살표: 안쪽부터 차례로 */
          b = .32 + 1.3*pk*(.55+.45*ON); c = mix(c, vec3(.8,.93,1.35), pk*.6); }
        else if (vS < -.5) { float a=atan(vW.z,vW.x); b = .35 + ON*(1.+.3*sin(uT*1.4+a*4.+vK*2.)); c = mix(c, vec3(.7,.88,1.4), .35); }          /* 계단 세로면 에너지 빛 */
        else {   /* 빛길: 탑에서 나온 빛 머리가 바닥 빛 물결과 같은 자리·같은 속도로 가운데로 옴. 지나간 자리는 이어진 빛줄기로 남음 */
          float r = length(vW.xz), front = ${WAVE_R0.toFixed(2)} - (uT - uW) * ${SPEED.toFixed(2)};
          float d = r - front, head = exp(-d*d*18.) * step(-1., front + 1.5), lit = smoothstep(-.3, .3, d) * uOn;
          float grain = .85 + .15 * sin(vS * 70. - uT * 9.) * sin(vS * 23. + uT * 3.);
          b = .3 * grain + lit * (.55 * grain + exp(-max(d, 0.) * .9) * .9) + head * 2.6;
          c = mix(c, vec3(.85,.95,1.35), clamp(head + lit * exp(-max(d,0.)) * .4, 0., 1.)); }
        gl_FragColor = vec4(c*b*2.2,1.); }` });

  /* 판 둘레 빛 웅덩이: 판·결정의 빛이 검은 바닥에 비쳐 번짐 (판이 기지와 한 세상이 되게) */
  { const pm = new THREE.ShaderMaterial({ uniforms: { uOn, uT, uW }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform float uOn,uT,uW; varying vec2 vP; ${WAKE} void main(){ float r=length(vP), a=atan(vP.y,vP.x); float ON = onAt(r);
        float pool = exp(-(((r-2.6)/1.3)*((r-2.6)/1.3)))*.55 + exp(-(((r-${RF.toFixed(1)})/.25)*((r-${RF.toFixed(1)})/.25)))*.5;      /* 판 바깥 + 1층 발치 */
        float rays = pow(abs(cos(a*4.)),40.)*exp(-r*.35)*.6*smoothstep(.15,.4,abs(a));                  /* 빛길 쪽으로 뻗는 결 (출구 쪽 빼고) */
        float b = (pool + rays) * (.35 + .65*ON) * (.9+.1*sin(uT*1.5));
        gl_FragColor = vec4(vec3(.25,.5,1.25)*b, 1.); }` });
    const m = new THREE.Mesh(new THREE.RingGeometry(1.6, RF + .4, 128, 1), pm); m.rotation.x = -Math.PI / 2; m.position.y = .006; m.renderOrder = 2; G.add(m); }
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(glowPos, 3)); gg.setAttribute('aK', new THREE.Float32BufferAttribute(glowK, 1)); gg.setAttribute('aS', new THREE.Float32BufferAttribute(glowS, 1));
  const gm = new THREE.Mesh(gg, gMat); gm.renderOrder = 3; G.add(gm);
  G.userData.wake = t => { uW.value = t; uOn.value = 1; };
  G.userData.sleep = () => { uW.value = 1e9; uOn.value = 0; };
  G.userData.impact = (r, k) => { uImp.value.set(r, k); };   /* 빛이 꽂힌 뒤 판 선을 따라 퍼지는 빛 */
  G.userData.update = t => { uT.value = t; };
  return G;
}
