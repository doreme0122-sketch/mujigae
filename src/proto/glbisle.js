/* 하늘섬 모델 시험 (사용자 2026-11-06: 다른 채팅에서 만든 하늘섬 모델은 참고만 · 여기에 기체를 띄워 봄
   · 탑뷰도 사이드뷰도 아닌 그 중간 · 기체 고도는 가운데 섬보다 약간 높게 · 지형 뒤로 가면 숨음 · 지형 사이사이를 지나가 나는 느낌)
   · 가운데(가장 큰) 섬 윗면이 기체보다 1.2m 아래 오도록 장면을 내림
   · 기체 높이보다 높이 솟은 부분(기둥 등)만 막힘 — 그 높이에서 자른 단면 크기만큼
   · 아래는 밝은 낮 하늘의 흰 구름 바다 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function makeGlbIsle(hover, onReady) {
  const grp = new THREE.Group(), meshes = [], blockers = [];
  const api = { mesh: grp, ready: false, blockers,
    blocked: (x, z) => { if (Math.abs(x) > 34 || Math.abs(z) > 24) return true; for (const b of blockers) { const dx = x - b.x, dz = z - b.z; if (dx * dx + dz * dz < b.r * b.r) return true; } return false; },
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
  new GLTFLoader().load(new URL('./assets/ref_skyislands.glb', import.meta.url).href, g => {
    const root = g.scene; root.updateMatrixWorld(true);
    let big = null, bigW = 0;
    root.traverse(o => { if (!o.isMesh) return; const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()), w = s.x * s.z; if (w > bigW) { bigW = w; big = { o, b }; } });
    /* 가운데 큰 섬 윗면: 그 섬 꼭짓점 중 가운데 쪽 높은 점들의 높이 (위로 솟은 기둥은 빼고) */
    const top = (() => { const p = big.o.geometry.attributes.position, v = new THREE.Vector3(), ys = []; const c = big.b.getCenter(new THREE.Vector3());
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(big.o.matrixWorld); if (Math.hypot(v.x - c.x, v.z - c.z) < (big.b.max.x - big.b.min.x) * .35) ys.push(v.y); }
      ys.sort((a, b) => a - b); return ys[Math.floor(ys.length * .6)]; })();
    const c0 = big.b.getCenter(new THREE.Vector3());
    root.position.set(-c0.x, hover - 1.2 - top, -c0.z); grp.add(root); root.updateMatrixWorld(true);
    root.traverse(o => { if (o.isMesh) { meshes.push(o); o.frustumCulled = true; if (o.material) { o.material.envMapIntensity = .6; } } });
    /* 막힘: 기체 높이 ±1m에 걸친 삼각형의 점들을 모아 메시마다 덩어리별 원으로 */
    const v = new THREE.Vector3(), pts = [];
    for (const m of meshes) { const p = m.geometry.attributes.position, ix = m.geometry.index; const n = ix ? ix.count : p.count, A = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
      for (let i = 0; i < n; i += 3) { for (let k = 0; k < 3; k++) A[k].fromBufferAttribute(p, ix ? ix.getX(i + k) : i + k).applyMatrix4(m.matrixWorld);
        const lo = Math.min(A[0].y, A[1].y, A[2].y), hi = Math.max(A[0].y, A[1].y, A[2].y); if (hi < hover - .3 || lo > hover + 1.5) continue;
        for (let k = 0; k < 3; k++) pts.push([A[k].x, A[k].z]); pts.push([(A[0].x + A[1].x + A[2].x) / 3, (A[0].z + A[1].z + A[2].z) / 3]); } }
    /* 가까운 점끼리 묶어 원 하나로 */
    const used = new Array(pts.length).fill(false);
    for (let i = 0; i < pts.length; i++) { if (used[i]) continue; const cl = [i]; used[i] = true;
      for (let q = 0; q < cl.length; q++) { const a = pts[cl[q]]; for (let j = 0; j < pts.length; j++) if (!used[j] && Math.hypot(pts[j][0] - a[0], pts[j][1] - a[1]) < 1.5) { used[j] = true; cl.push(j); } }
      let cx = 0, cz = 0; for (const k of cl) { cx += pts[k][0]; cz += pts[k][1]; } cx /= cl.length; cz /= cl.length; let r = 0; for (const k of cl) r = Math.max(r, Math.hypot(pts[k][0] - cx, pts[k][1] - cz));
      blockers.push({ x: cx, z: cz, r: r + .8 }); }
    /* 그림자 자리 · 가려짐 판정 */
    const rc = new THREE.Raycaster(), dn = new THREE.Vector3(0, -1, 0);
    api.groundAt = (x, z) => { rc.set(new THREE.Vector3(x, hover + .5, z), dn); rc.far = 200; const h = rc.intersectObjects(meshes, false)[0]; return h ? h.point.y : null; };
    api.occluded = (camPos, x, y, z) => { const to = new THREE.Vector3(x, y, z), d = to.clone().sub(camPos), L = d.length(); rc.set(camPos, d.normalize()); rc.far = L - .6; return rc.intersectObjects(meshes, false).length > 0; };
    sea.position.y = new THREE.Box3().setFromObject(root).min.y - 25;
    api.ready = true; onReady?.(api);
  });
  return api;
}
