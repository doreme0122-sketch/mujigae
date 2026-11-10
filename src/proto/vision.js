/* 시야 가림 — 내 기체 둘레만 보이고, 벽 뒤는 안 보임 (매복의 무서움)
   · 보이는 곳: 기체에서 사방으로 빛줄기를 쏴서 30m까지, 벽(벽 지도 .5 넘는 곳)에 닿으면 그 뒤는 못 봄. 벽 앞면까지는 보임
   · 한 번 본 땅·벽은 흐리게 남음(지형은 기억함). 처음 보는 곳은 짙게 덮임
   · 수풀: 바깥에서 수풀 '안'은 안 보임(수풀 자체는 보임). 같은 수풀 안이면 보임 → canSee(x,z)로 나중에 적·몬스터 숨길 때 씀
   · 보이는 곳이 바뀔 때 칸칸이 탁 바뀌지 않고 서서히 밝아지고 어두워짐(눈이 적응하듯)
   · 덮개는 화면 위 한 장: 화면 칸마다 '눈높이 1.5m 땅'의 보임 값을 읽어 어둡게 덮음 → 벽·바닥·알갱이 모두 한 번에 가려짐
   · 무게: 빛줄기 320가닥 × 60걸음 (가벼움) · 시야 지도 250×250 한 장 */
import * as THREE from 'three';
import { MAP } from './mapfloor.js?v=11101615';

export const SIGHT = 30;
export function makeVision(B, bushes, floorNoise) {
  const N = 250, S = MAP.SCALE, W = MAP.W * S, cellM = W / N;
  const vis = new Float32Array(N * N), seen = new Uint8Array(N * N), now = new Uint8Array(N * N), tex8 = new Uint8Array(N * N * 2);
  const extra = new Uint8Array(N * N), extraList = [];                                         /* 와드가 보여 주는 칸 (내 기체 둘레가 아니어도 보임) */
  const BN = B.N, F = B.F, bcell = MAP.W / BN;
  const wallAt = (x, z) => { const i = Math.floor((x / S + MAP.W / 2) / bcell), j = Math.floor((z / S + MAP.H / 2) / bcell); return i < 0 || j < 0 || i >= BN || j >= BN || F[j * BN + i] > .5 || B.reg[j * BN + i] === 17; };
  const ci = x => Math.floor((x + W / 2) / cellM);
  const tex = new THREE.DataTexture(tex8, N, N, THREE.RGFormat); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  let myBush = 0, touched = [];
  const temps = [], lit = new Uint8Array(N * N); let litL = [];                                  /* 잠깐 밝힌 자리 (비추는 탄 빛 꽃 4m · 2초): 안개도 걷히고 숨을 곳 속도 보임 */
  function cast(sx, sz) {
    for (const k of touched) now[k] = 0; touched = [];
    myBush = bushes.bushAt(sx, sz);
    const RAYS = 320, step = .5, n = Math.ceil(SIGHT / step);
    for (let r = 0; r < RAYS; r++) { const a = r / RAYS * 6.2832, dx = Math.cos(a), dz = Math.sin(a);
      for (let k = 0; k <= n; k++) { const x = sx + dx * k * step, z = sz + dz * k * step, i = ci(x), j = ci(z); if (i < 0 || j < 0 || i >= N || j >= N) break;
        const c = j * N + i; if (!now[c]) { now[c] = 1; touched.push(c); seen[c] = 1; }
        if (wallAt(x, z)) { /* 벽 앞면까지 보이고 그 뒤는 안 보임: 벽 속으로 한 칸 더 보고 멈춤 */
          const x2 = x + dx * cellM, z2 = z + dz * cellM, i2 = ci(x2), j2 = ci(z2); if (i2 >= 0 && j2 >= 0 && i2 < N && j2 < N) { const c2 = j2 * N + i2; if (!now[c2]) { now[c2] = 1; touched.push(c2); seen[c2] = 1; } } break; } } }
  }
  /* 덮개: 화면 앞 한 장. 화면 칸마다 카메라에서 그 칸을 지나는 줄이 눈높이(1.5m)와 만나는 땅 자리의 시야 값을 읽음 */
  const mat = new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false,
    uniforms: { uV: { value: tex }, uN: { value: floorNoise }, uT: { value: 0 }, uOn: { value: 1 }, uCam: { value: new THREE.Vector3() }, uInvPV: { value: new THREE.Matrix4() } },
    vertexShader: 'varying vec2 vS; void main(){ vS=position.xy; gl_Position=vec4(position.xy,0.,1.); }',
    fragmentShader: `precision highp float; varying vec2 vS; uniform sampler2D uV, uN; uniform float uT, uOn; uniform vec3 uCam; uniform mat4 uInvPV;
      void main(){ vec4 f=uInvPV*vec4(vS,1.,1.); vec3 d=normalize(f.xyz/f.w-uCam);
        float t=(1.5-uCam.y)/min(d.y,-1e-3); vec3 p=uCam+d*t;
        float drift=texture2D(uN,p.xz*.012+vec2(uT*.006,uT*.004)).r, fine=texture2D(uN,p.xz*.09-vec2(uT*.01,0.)).r;   /* 덮인 곳도 아주 천천히 일렁임 (멈춘 검은 판이 아님) */
        /* 시야 칸(약 1.4m)이 계단처럼 깨져 보이지 않게: 둘레 아홉 곳을 섞어 부드럽게 + 경계를 안개 결로 살짝 흔듦 (사용자: 안개 픽셀이 깨져 보임) */
        vec2 uv=p.xz/${W.toFixed(1)}+.5, px=vec2(1./${N}.); uv+=(vec2(fine,drift)-.5)*px*1.6;
        vec2 v=texture2D(uV,uv).rg*.24;
        v+=(texture2D(uV,uv+vec2(px.x,0.)).rg+texture2D(uV,uv-vec2(px.x,0.)).rg+texture2D(uV,uv+vec2(0.,px.y)).rg+texture2D(uV,uv-vec2(0.,px.y)).rg)*.12;
        v+=(texture2D(uV,uv+px*1.4).rg+texture2D(uV,uv-px*1.4).rg+texture2D(uV,uv+vec2(px.x,-px.y)*1.4).rg+texture2D(uV,uv+vec2(-px.x,px.y)*1.4).rg)*.07;
        float see=smoothstep(.04,.9,v.r);
        /* 덮개 한 단계 (사용자 2026-11-04: 맵은 판마다 같아 '처음 본 곳·본 곳' 구분이 의미 없음 → 하나로. 안 보이는 곳이 확실해야 플레이어가 대처함)
           안 보이는 곳 = 깊은 남색 안개로 짙게(지형은 희미하게 비침) · 경계는 부드럽게 번지되, 시야 끝에 옅은 안개 테가 있어 '여기부터 안 보임'이 읽힘 */
        float rim=exp(-((see-.38)/.2)*((see-.38)/.2))*(1.-see);
        float a=mix(.95+(drift-.5)*.03, 0., see)-rim*.04;                                                  /* 덮개는 밝기 계산 전 단계에 칠해져 나중에 화면 밝기 보정으로 들려 보임 → .95여야 눈에 약 25%만 비침 */
        if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.) a=.96;
        vec3 fog=mix(vec3(.002,.004,.012),vec3(.006,.01,.024),drift)*(.9+.2*fine)+vec3(.02,.03,.05)*rim;
        gl_FragColor=vec4(fog,a*uOn); }` });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; quad.renderOrder = 50;
  const scene = new THREE.Scene(); scene.add(quad); const cam0 = new THREE.Camera(), m4 = new THREE.Matrix4();
  let acc = 0;
  return { scene, cam0, mat, N, cellM, W,
    light(x, z, r, dur, t) { temps.push({ x, z, r, t0: t, end: t + dur }); },
    reveal(c) { if (!extra[c]) { extra[c] = 1; seen[c] = 1; extraList.push(c); } },
    /* 매 장면: 빛줄기 쏘기 → 보이는 값을 서서히 따라감(둘레 45m 안만) → 시야 지도 올림 */
    update(t, dt, sx, sz, camera) {
      cast(sx, sz);
      for (const c of litL) lit[c] = 0; litL = [];
      for (let q = temps.length - 1; q >= 0; q--) { const o = temps[q]; if (t > o.end) { temps.splice(q, 1); continue; } const rr = o.r * Math.min(1, (t - o.t0) / .3), R = Math.ceil(rr / cellM), i0 = ci(o.x), j0 = ci(o.z);   /* 꽃이 피는 0.3초 동안 둘레가 넓어짐 */
        for (let j = j0 - R; j <= j0 + R; j++) for (let i = i0 - R; i <= i0 + R; i++) { if (i < 0 || j < 0 || i >= N || j >= N) continue; const x = (i + .5) * cellM - W / 2 - o.x, z = (j + .5) * cellM - W / 2 - o.z; if (x * x + z * z > rr * rr) continue; const c = j * N + i;
          if (!now[c]) { now[c] = 1; touched.push(c); } seen[c] = 1; if (!lit[c]) { lit[c] = 1; litL.push(c); } } }
      const k = Math.min(1, dt * 6), R = Math.ceil(45 / cellM), i0 = Math.max(0, ci(sx) - R), i1 = Math.min(N - 1, ci(sx) + R), j0 = Math.max(0, ci(sz) - R), j1 = Math.min(N - 1, ci(sz) + R);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const c = j * N + i; vis[c] += (Math.max(now[c], extra[c]) - vis[c]) * k; tex8[c * 2] = vis[c] * 255; tex8[c * 2 + 1] = seen[c] * 255; }
      for (const c of extraList) { vis[c] += (1 - vis[c]) * Math.min(1, dt * 4); tex8[c * 2] = vis[c] * 255; tex8[c * 2 + 1] = 255; }   /* 와드 시야: 물결이 지나간 칸부터 차례로 걷힘 */
      if ((acc += dt) > 1 / 30) { acc = 0; tex.needsUpdate = true; }                                /* 1초에 30번만 올림 (충분히 부드럽고 가벼움) */
      mat.uniforms.uT.value = t; mat.uniforms.uCam.value.copy(camera.position);
      mat.uniforms.uInvPV.value.copy(m4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert()); },
    /* 적·몬스터가 보이는지: 시야 안 + (수풀 안이면 같은 수풀일 때만) */
    canSee(x, z) { const i = ci(x), j = ci(z); if (i < 0 || j < 0 || i >= N || j >= N) return false; if (extra[j * N + i] || lit[j * N + i]) return true; if (!now[j * N + i]) return false;   /* 와드 시야 안이면 숨을 곳 속도 보임 */ const b = bushes.bushAt(x, z); return !b || b === myBush; },
    set on(v) { mat.uniforms.uOn.value = v ? 1 : 0; } };
}
