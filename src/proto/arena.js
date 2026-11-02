/* 시작 기지 — 판 아래부터 이어진 바닥 + 콜로세움처럼 바깥으로 올라가는 계단 세 단 + 아치 벽
   · 바닥: 판과 금테 별 아래를 틈 없이 덮은 어두운 쇳빛 판(동심 이음선 + 방사 이음선).
   · 계단: 바깥으로 갈수록 한 단씩 높아짐. 앞면엔 세로 장식 판, 모서리엔 금 테, 금 테 아래 그늘에 숨은 파란 빛(판이 켜지면 같이 켜짐).
   · 맨 바깥 벽: 아치가 줄지어 서고, 아치 안쪽에서 빛이 난다.
   · 에너지 길: 대각선 네 방향. 아치 벽에서 시작해 계단을 타고 내려와 바닥을 건너 금테 별의 갈래 사이로 들어간다.
     빛이 바깥 → 가운데로 흘러 판에 힘을 넣는다(기체가 있는 동안 계속 흐르고, 없으면 거의 꺼짐).
   · 출구: 출구 쪽(+x, 별의 한 갈래가 가리키는 쪽) 한 곳만 계단과 벽을 모두 뚫어 길을 냄.
   단위는 자기장 판과 같음. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sweep, posNor } from './floatring.js?v=11021748';


/* 건담처럼 장갑판을 조립한 느낌의 검은 판 선 — 면 위치로 바로 그림(텍스처 없음, 가벼움)
   · 바닥·계단 윗면: 동심 띠 + 벽돌처럼 엇갈린 칸. 칸마다 운으로 '판 안의 판' · 반쯤 그은 선과 꺾인 끝 · 모서리 작은 네모 · 옆 칸과 이어진 긴 판
   · 세운 면(계단 앞면·벽): 세로 칸 + 칸마다 다른 높이의 가로 선 */
function panelLines(mat, cell = .55) {
  mat.onBeforeCompile = sh => {
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
      ` + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb *= 1. - .82 * panel(vLp, normalize(vLn));');
  };
  mat.customProgramCacheKey = () => 'panel' + cell;
  return mat;
}

export const ARENA = { floor: 4.3, rings: [[4.3, 5.1, .32], [5.1, 5.9, .64], [5.9, 6.7, .96], [6.7, 7.3, .64], [7.3, 7.9, .32]], top: 2, exitHalf: .34, ramp: .3 };

export function makeArena() {
  const G = new THREE.Group(), { floor: RF, rings, top: TOP, exitHalf: EH, ramp: RS } = ARENA;
  /* 금은 판(금테 별)에만. 판 아래 바닥 = 검은 건메탈, 계단 윗면 = 무광 흰 세라믹, 계단 세로면 = 건메탈 + 밝은 에너지 빛 */
  const tread = panelLines(new THREE.MeshStandardMaterial({ color: 0xc4c9d1, metalness: 0, roughness: .86, envMapIntensity: .55 }));
  const gun = new THREE.MeshPhysicalMaterial({ color: 0x2a2e35, metalness: .9, roughness: .3, clearcoat: .5, clearcoatRoughness: .2, envMapIntensity: 1 });
  const gunRib = new THREE.MeshPhysicalMaterial({ color: 0x3a3f48, metalness: .9, roughness: .26, clearcoat: .6, clearcoatRoughness: .15, envMapIntensity: 1.1 });
  const floorM = panelLines(new THREE.MeshPhysicalMaterial({ color: 0x1c1f25, metalness: .88, roughness: .3, clearcoat: .45, clearcoatRoughness: .2, envMapIntensity: .95 }), .62);   /* 검은 건메탈 + 판 선 */
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b0d12, metalness: .5, roughness: .45, envMapIntensity: .5 });
  const blue = new THREE.MeshBasicMaterial({ color: 0x3b6fd0 });
  const L = { tread: [], gun: [], rib: [], floor: [], dark: [], blue: [] };
  const A0 = EH, A1 = Math.PI * 2 - EH, M0 = EH + RS, M1 = Math.PI * 2 - EH - RS;   /* 출구를 뺀 범위 / 그중 경사를 뺀 온전한 높이 범위 */
  const sm = u => u * u * (3 - 2 * u);
  /* 출구 양옆은 끊지 않고 경사: 계단 높이가 출구 쪽으로 갈수록 바닥까지 부드럽게 내려앉음 */
  const ramped = (prof, extra = 0) => [sweep(prof, A0 + extra, M0, undefined, 40, (u, y) => y > 0 ? Math.max(.004, y * sm(u)) : y),
    sweep(prof, M0, M1), sweep(prof, M1, A1 - extra, undefined, 40, (u, y) => y > 0 ? Math.max(.004, y * sm(1 - u)) : y)];
  const RO = rings[rings.length - 1][1];

  /* ── 바닥: 가운데부터 계단 앞까지, 출구 쪽은 바깥으로 길게 이어짐 ── */
  L.floor.push(sweep([[0.001, -.12], [RF, -.12], [RF, -.002], [0.001, -.002]], 0, Math.PI * 2, undefined, 128));
  L.floor.push(sweep([[RF - .05, -.12], [RO + .02, -.12], [RO + .02, -.002], [RF - .05, -.002]], -EH, EH, undefined, 16));   /* 출구 길 바닥 */

  /* ── 계단: 안쪽으로 세 단 올라가고, 바깥으로 두 단 내려감(바깥도 계단 그대로, 덮지 않음) ── */
  const uOn = { value: 0 }, uT = { value: 0 };
  const glowPos = [], glowK = [], glowS = [];
  const band = (r, y0, y1, k) => { const n = 200; for (let i = 0; i < n; i++) { const a = M0 + (M1 - M0) * i / n, b = M0 + (M1 - M0) * (i + 1) / n;
    const P = (aa, y) => [Math.cos(aa) * r, y, Math.sin(aa) * r]; const p = [P(a, y0), P(b, y0), P(b, y1), P(a, y1)]; glowPos.push(...p[0], ...p[1], ...p[2], ...p[0], ...p[2], ...p[3]);
    for (let j = 0; j < 6; j++) { glowK.push(k); glowS.push(-1); } } };
  const TH = .06, OV = .045;                                       /* 윗면 판 두께, 세로면 위로 내민 길이 */
  rings.forEach(([r0, r1, h], i) => {
    const hin = i === 0 ? 0 : rings[i - 1][2], hout = i === rings.length - 1 ? 0 : rings[i + 1][2];
    const riseIn = h > hin, riseOut = h > hout;                     /* 이 단의 안쪽/바깥쪽에 세로면이 드러나는가 */
    /* 몸통(건메탈) */
    L.gun.push(...ramped([[r0, -.12], [r1, -.12], [r1, h - TH], [r0, h - TH]]));
    /* 윗면: 무광 흰 세라믹 판, 드러난 세로면 쪽으로 살짝 내밀고 모서리를 깎음 */
    const a = riseIn ? r0 - OV : r0, b = riseOut ? r1 + OV : r1;
    L.tread.push(...ramped([[a, h - TH], [b, h - TH], [b, h - .015], [b - (riseOut ? .02 : 0), h], [a + (riseIn ? .02 : 0), h], [a, h - .015]], .002));
    /* 드러난 세로면: 세로 갈빗대 + 그 뒤로 밝은 에너지 빛 띠 */
    for (const [on, r, lo, dir] of [[riseIn, r0, hin, -1], [riseOut, r1, hout, 1]]) { if (!on) continue;
      const y0 = lo, y1 = h - TH, n = 56 + i * 6;
      for (let k = 0; k < n; k++) { const aa = M0 + (M1 - M0) * (k + .5) / n, g = new THREE.BoxGeometry(.03, y1 - y0 - .02, .045); g.translate(r + dir * .014, (y0 + y1) / 2, 0); g.rotateY(-aa); L.rib.push(posNor(g)); }
      const ym = (y0 + y1) / 2; band(r + dir * .006, ym - .03, ym + .03, i);
      band(r + dir * .005, y1 - .025, y1 - .012, i + 10); }                      /* 윗면 판 바로 아래 가는 빛 */
  });

  /* ── 출구 화살표: 바깥을 가리키는 빛 화살표가 차례로 밝아지며 흘러감 + 길 양옆 빛 줄 ── */
  { const NA = 5, x0 = RF + .5, x1 = RO - .45;
    for (let i = 0; i < NA; i++) { const x = x0 + (x1 - x0) * i / (NA - 1), W = .62, T = .2, y = .006;
      const pts = [[x + .32, 0], [x - .12, W], [x - .12 - T, W], [x + .32 - T, 0], [x - .12 - T, -W], [x - .12, -W]];
      const tri = [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5]];
      for (const t of tri) for (const j of t) { glowPos.push(pts[j][0], y, pts[j][1]); glowK.push(i); glowS.push(-2); } }
    for (const sd of [-1, 1]) { const z = sd * 1.02, w = .025, n = 24;
      for (let i = 0; i < n; i++) { const xa = RF + .2 + (x1 + .3 - RF - .2) * i / n, xb = RF + .2 + (x1 + .3 - RF - .2) * (i + 1) / n, y = .005;
        glowPos.push(xa, y, z - w, xb, y, z - w, xb, y, z + w, xa, y, z - w, xb, y, z + w, xa, y, z + w); for (let j = 0; j < 6; j++) { glowK.push(-1 + (i + .5) / n * 6); glowS.push(-3); } } } }

  /* ── 에너지 길: 꼭대기 단 → 계단을 타고 내려와 → 바닥 → 별의 갈래 사이. s: 바깥 1 → 안 0 ── */
  const st = rings, e = .005, path = [[st[TOP][1] - .15, st[TOP][2] + e], [st[2][0] - OV - e, st[2][2] + e], [st[2][0] - OV - e, st[1][2] + e], [st[1][0] - OV - e, st[1][2] + e],
    [st[1][0] - OV - e, st[0][2] + e], [st[0][0] - OV - e, st[0][2] + e], [st[0][0] - OV - e, .004], [2.0, .004]];
  const segL = []; let tot = 0; for (let i = 0; i < path.length - 1; i++) { const l = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]); segL.push(l); tot += l; }
  for (let q = 0; q < 4; q++) { const a = Math.PI / 4 + q * Math.PI / 2, c = Math.cos(a), s = Math.sin(a), nx = -s, nz = c;
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

  const add = (list, mat) => { if (list.length) G.add(new THREE.Mesh(mergeGeometries(list.map(posNor)), mat)); };
  add(L.tread, tread); add(L.gun, gun); add(L.rib, gunRib); add(L.floor, floorM); add(L.dark, dark); add(L.blue, blue);
  /* 숨은 빛 + 에너지 길 */
  const gMat = new THREE.ShaderMaterial({ uniforms: { uOn, uT }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'attribute float aK, aS; varying float vK, vS; varying vec3 vW; void main(){ vK=aK; vS=aS; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uOn,uT; varying float vK, vS; varying vec3 vW;
      void main(){
        vec3 c = vec3(.28,.58,1.35); float b;
        if (vS < -2.5) { float ph = fract(uT*.55 - vK*.16); b = .25 + .5*smoothstep(.0,.2,ph)*smoothstep(.6,.2,ph)*(.5+.5*uOn); }   /* 길 양옆 빛 줄 */
        else if (vS < -1.5) { float ph = fract(uT*.55 - vK*.16), pk = smoothstep(.0,.08,ph)*smoothstep(.4,.08,ph);          /* 화살표: 안쪽부터 차례로 */
          b = .32 + 1.3*pk*(.55+.45*uOn); c = mix(c, vec3(.8,.93,1.35), pk*.6); }
        else if (vS < -.5) { float a=atan(vW.z,vW.x); b = .35 + uOn*(1.+.3*sin(uT*1.4+a*4.+vK*2.)); c = mix(c, vec3(.7,.88,1.4), .35); }          /* 계단 세로면 에너지 빛 */
        else { float flow = fract(vS*6. + uT*.9);                                                           /* 바깥 → 안으로 흐르는 빛 덩어리 */
          float pk = smoothstep(.0,.15,flow)*smoothstep(.55,.15,flow);
          b = .06 + uOn*(.35 + 1.4*pk); c = mix(c, vec3(.85,.95,1.3), pk*uOn*.6); }
        gl_FragColor = vec4(c*b,1.); }` });
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(glowPos, 3)); gg.setAttribute('aK', new THREE.Float32BufferAttribute(glowK, 1)); gg.setAttribute('aS', new THREE.Float32BufferAttribute(glowS, 1));
  const gm = new THREE.Mesh(gg, gMat); gm.renderOrder = 3; G.add(gm);
  G.userData.update = (t, on) => { uT.value = t; uOn.value += ((on ? 1 : 0) - uOn.value) * .05; const k = .25 + uOn.value * 1.1; blue.color.setRGB(.28 * k, .58 * k, 1.35 * k); };
  return G;
}
