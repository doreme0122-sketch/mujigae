/* 하늘섬 모델 시험 (사용자 2026-11-06: 다른 채팅에서 만든 하늘섬 모델은 참고만 · 여기에 기체를 띄워 봄
   · 탑뷰도 사이드뷰도 아닌 그 중간 · 기체 고도는 가운데 섬보다 약간 높게 · 지형 뒤로 가면 숨음 · 지형 사이사이를 지나가 나는 느낌)
   · 가운데(가장 큰) 섬 윗면이 기체보다 1.2m 아래 오도록 장면을 내림
   · 기체 높이보다 높이 솟은 부분(기둥 등)만 막힘 — 그 높이에서 자른 단면 크기만큼
   · 아래는 밝은 낮 하늘의 흰 구름 바다 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function makeGlbIsle(hover, onReady, opt = {}) {
  const grp = new THREE.Group(), meshes = [], blockers = [];
  const api = { mesh: grp, ready: false, blockers,
    lim: { x: 34, z: 24 },
    blocked: (x, z) => { if (Math.abs(x) > api.lim.x || Math.abs(z) > api.lim.z) return true; for (const b of blockers) { const dx = x - b.x, dz = z - b.z; if (dx * dx + dz * dz < b.r * b.r) return true; } return false; },
    groundAt: null, occluded: null };
  /* 밝은 하늘 배경 + 저 아래 흰 구름 바다 */
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uT; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){ vec2 p=vW.xz*.02+vec2(uT*.004,0.); float c=n(p)*.5+n(p*2.1)*.3+n(p*4.3)*.2; c=smoothstep(.3,.8,c);
        vec3 col=mix(vec3(.62,.72,.9),vec3(.97,.98,1.),c); gl_FragColor=vec4(col,1.); }` }));
  grp.add(sea); api.sea = sea;
  new GLTFLoader().load(new URL(opt.url || './assets/ref_skyislands.glb', import.meta.url).href, g => {
    const root = g.scene; if (opt.scale) root.scale.setScalar(opt.scale); root.updateMatrixWorld(true);   /* 맵 크기 조절 (기체 크기는 그대로) */
    let big = null, bigW = 0;
    root.traverse(o => { if (!o.isMesh) return; const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()), w = s.x * s.z; if (w > bigW) { bigW = w; big = { o, b }; } });
    const rc0 = new THREE.Raycaster(), dn0 = new THREE.Vector3(0, -1, 0);
    /* 가운데 큰 섬 풀밭 높이: 섬 위 여러 곳에서 아래로 쏘아 맞은 "위를 보는 면" 높이의 가운데값 (기둥·나무 꼭대기는 빠짐) */
    const top = (() => { const c = big.b.getCenter(new THREE.Vector3()), sx = (big.b.max.x - big.b.min.x) * .4, sz = (big.b.max.z - big.b.min.z) * .4, ys = [];
      for (let i = 0; i < 15; i++) for (let j = 0; j < 15; j++) { rc0.set(new THREE.Vector3(c.x + (i / 7 - 1) * sx, big.b.max.y + 5, c.z + (j / 7 - 1) * sz), dn0);
        const hs = rc0.intersectObject(big.o, false); for (const h of hs) { const n = h.face.normal.clone().transformDirection(big.o.matrixWorld); if (n.y > .85) { ys.push(h.point.y); break; } } }
      ys.sort((a, b) => a - b); return ys[Math.floor(ys.length * .5)] ?? big.b.max.y; })();
    const c0 = big.b.getCenter(new THREE.Vector3());
    root.position.set(-c0.x, hover - 1.6 - top, -c0.z); grp.add(root); root.updateMatrixWorld(true);   /* 기체가 가운데 섬 풀밭보다 1.6m 위 */
    /* 높이 띠: 기체 둘레 지형에서 기체와 같은 높이인 곳을 따라 빛나는 가는 띠 (띠 위 = 막힘 · 아래 = 넘어감) */
    api.uShip = { value: new THREE.Vector3(0, hover, 0) }; api.uBand = { value: 0 };
    root.traverse(o => { if (!o.isMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const mt of ms) { if (!mt || /water/i.test(mt.name)) continue; mt.onBeforeCompile = sh => { sh.uniforms.uShip = api.uShip; sh.uniforms.uBand = api.uBand;
          sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWp=(modelMatrix*vec4(transformed,1.)).xyz;');
          sh.fragmentShader = 'uniform vec3 uShip; uniform float uBand; varying vec3 vWp;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
            { float dy=vWp.y-uShip.y; int md=int(uBand+.5);
              if(md==1){ float under=smoothstep(.05,-1.2,dy); gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.93,.96,1.),under*.78); gl_FragColor.rgb+=vec3(1.)*smoothstep(.25,.0,abs(dy))*.35; }   /* 구름 바다: 내 높이 아래는 안개에 잠김 */
              else if(md==2){ float up=smoothstep(-.05,.35,dy); gl_FragColor.rgb=mix(gl_FragColor.rgb,gl_FragColor.rgb*vec3(1.15,.55,.5),up*.7); }   /* 높은 지형만 붉게 */
              else if(md==3){ gl_FragColor.rgb+=vec3(1.,.8,.25)*smoothstep(.14,.0,abs(dy))*1.8; }   /* 내 높이에 금색 선 */
            }`); };
        mt.customProgramCacheKey = () => 'band'; mt.needsUpdate = true; } });
    root.traverse(o => { if (o.isMesh) { meshes.push(o); o.frustumCulled = true; if (o.material) { o.material.envMapIntensity = .6; } } });
    /* 막힘 = 보이는 모양 그대로 (사용자 2026-11-06: 구조물에서 멀리 떨어져 있는데도 못 가는 데가 있음)
       0.4m 칸 바둑판에, 지형 면 위의 점을 촘촘히 찍어 기체 높이(-0.5 ~ +0.8m)에 걸친 점만 칸을 채움 · 물(폭포)은 뺌 · 기체 몸 반지름만큼만 여유 */
    const bb = new THREE.Box3(); for (const m of meshes) bb.union(new THREE.Box3().setFromObject(m));
    const G = .4, gx0 = bb.min.x - 2, gz0 = bb.min.z - 2, GW = Math.ceil((bb.max.x - bb.min.x + 4) / G), GH = Math.ceil((bb.max.z - bb.min.z + 4) / G), grid = new Uint8Array(GW * GH);
    const HG = 1, HW = Math.ceil(GW * G / HG) + 1, HH = Math.ceil(GH * G / HG) + 1, hmap = new Float32Array(HW * HH).fill(-1e9);
    const A = new THREE.Vector3(), Bv = new THREE.Vector3(), C = new THREE.Vector3(), P = new THREE.Vector3(), lo = hover - .5, hi = hover + .8;
    for (const m of meshes) { const geo = m.geometry, p = geo.attributes.position, ix = geo.index, groups = geo.groups.length ? geo.groups : [{ start: 0, count: ix ? ix.count : p.count, materialIndex: 0 }], mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const gr of groups) { const mt = mats[gr.materialIndex] || mats[0]; if (mt && /water/i.test(mt.name)) continue;
        for (let i = gr.start; i < gr.start + gr.count; i += 3) { const id = k => ix ? ix.getX(i + k) : i + k;
          A.fromBufferAttribute(p, id(0)).applyMatrix4(m.matrixWorld); Bv.fromBufferAttribute(p, id(1)).applyMatrix4(m.matrixWorld); C.fromBufferAttribute(p, id(2)).applyMatrix4(m.matrixWorld);
          if (Math.min(A.y, Bv.y, C.y) < lo) { const L2 = Math.max(A.distanceTo(Bv), Bv.distanceTo(C), C.distanceTo(A)), n2 = Math.max(1, Math.ceil(L2 / .7));   /* 바닥 높이 지도(1m 칸): 기체 아래 지형 윗면 — 그림자 자리 */
            for (let u = 0; u <= n2; u++) for (let w = 0; w <= n2 - u; w++) { const a = u / n2, b2 = w / n2; P.set(0, 0, 0).addScaledVector(A, 1 - a - b2).addScaledVector(Bv, a).addScaledVector(C, b2);
              if (P.y >= lo) continue; const hx = Math.floor((P.x - gx0) / HG), hz = Math.floor((P.z - gz0) / HG); if (hx >= 0 && hz >= 0 && hx < HW && hz < HH && P.y > hmap[hz * HW + hx]) hmap[hz * HW + hx] = P.y; } }
          if (Math.max(A.y, Bv.y, C.y) < lo || Math.min(A.y, Bv.y, C.y) > hi) continue;
          const L = Math.max(A.distanceTo(Bv), Bv.distanceTo(C), C.distanceTo(A)), n = Math.max(2, Math.ceil(L / .2));
          for (let u = 0; u <= n; u++) for (let w = 0; w <= n - u; w++) { const a = u / n, b2 = w / n; P.set(0, 0, 0).addScaledVector(A, 1 - a - b2).addScaledVector(Bv, a).addScaledVector(C, b2);
            if (P.y < lo || P.y > hi) continue; const cx = Math.floor((P.x - gx0) / G), cz = Math.floor((P.z - gz0) / G); if (cx >= 0 && cz >= 0 && cx < GW && cz < GH) grid[cz * GW + cx] = 1; } } } }
    /* 속 채우기: 바깥에서 물 붓듯 채워 닿지 않는 빈칸(기둥 속처럼 둘러싸인 곳)은 막힘으로 */
    { const out = new Uint8Array(GW * GH), q = []; const push = (x, z) => { const k = z * GW + x; if (x < 0 || z < 0 || x >= GW || z >= GH || out[k] || grid[k]) return; out[k] = 1; q.push(k); };
      for (let x = 0; x < GW; x++) { push(x, 0); push(x, GH - 1); } for (let z = 0; z < GH; z++) { push(0, z); push(GW - 1, z); }
      while (q.length) { const k = q.pop(), x = k % GW, z = (k / GW) | 0; push(x + 1, z); push(x - 1, z); push(x, z + 1); push(x, z - 1); }
      for (let k = 0; k < grid.length; k++) if (!out[k]) grid[k] = 1; }
    api.gridAt = (x, z) => { const cx = Math.floor((x - gx0) / G), cz = Math.floor((z - gz0) / G); return cx >= 0 && cz >= 0 && cx < GW && cz < GH && grid[cz * GW + cx] === 1; };
    const RAD = .55;   /* 기체 몸 반지름 */
    api.blocked = (x, z) => { if (Math.abs(x) > api.lim.x || Math.abs(z) > api.lim.z) return true; for (let a = 0; a < 8; a++) if (api.gridAt(x + Math.cos(a * .785) * RAD, z + Math.sin(a * .785) * RAD)) return true; return api.gridAt(x, z); };
    api.top = top;
    api.groundFast = (x, z) => { const hx = Math.floor((x - gx0) / HG), hz = Math.floor((z - gz0) / HG); if (hx < 0 || hz < 0 || hx >= HW || hz >= HH) return null; const v = hmap[hz * HW + hx]; return v > -1e8 ? v : null; };
    /* 그림자 자리 · 가려짐 판정 */
    const rc = new THREE.Raycaster(), dn = new THREE.Vector3(0, -1, 0);
    api.groundAt = (x, z) => { rc.set(new THREE.Vector3(x, hover + .5, z), dn); rc.far = 200; const h = rc.intersectObjects(meshes, false)[0]; return h ? h.point.y : null; };
    api.occluded = (camPos, x, y, z) => { const to = new THREE.Vector3(x, y, z), d = to.clone().sub(camPos), L = d.length(); rc.set(camPos, d.normalize()); rc.far = L - .6; return rc.intersectObjects(meshes, false).length > 0; };
    sea.position.y = new THREE.Box3().setFromObject(root).min.y - 25;
    /* 날 수 있는 범위: 구조물 둘레로 넉넉히 (사용자 2026-11-06: 갈 수 있는 공간을 막아 놔서 확인이 안 됨) */
    api.lim.x = Math.max(Math.abs(bb.min.x), Math.abs(bb.max.x)) + 14; api.lim.z = Math.max(Math.abs(bb.min.z), Math.abs(bb.max.z)) + 12;
    api.ready = true; onReady?.(api);
  });
  return api;
}
