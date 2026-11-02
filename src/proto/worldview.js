/* 맵 만들기 ① — 맵 6안(10명 개인전 · 정사각형)대로 바닥 · 지역 · 경계 능선 · 큰길 · 샛길 깔기
   보기: 끌면 이동, 두 손가락(휠)로 확대. 지역 이름표는 화면 위 글자. 시작 기지 자리는 빛 고리로만 표시(다음 단계에서 진짜 기지) */
import * as THREE from 'three';
import { makeBloom } from '../core/hangar/bloom.js?v=11030014';
import { makeMapFloor, MAP, toWorld } from './mapfloor.js?v=11030014';
import { makePerf } from './perf.js?v=11030014';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp;
const VIEWS = [{ name: '게임 시점', h: 60, tilt: .3 }, { name: '지역 보기', h: 130, tilt: .25 }, { name: '맵 전체', h: 400, tilt: .02 }];

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, 1, 3000), bloom = makeBloom(renderer, { samples: 0 });
  onProgress(.2);
  const floor = await makeMapFloor(renderer, './assets/map/v6.png?v=11030014');
  const J = await (await fetch('./assets/map/v6.json?v=11030014')).json();
  const SPAWN = J.spawns, ALL = [...J.labels.map(o => [o.x, o.y, o.n, o.l]), [500, 500, '무너진 중심부', 'Lv 10+']];
  onProgress(.7);
  /* 시작 기지 자리: 빛 고리 (임시) */
  const ringM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uT; varying vec2 vP; void main(){ float r=length(vP); float q=(r-7.)/.6; float k=exp(-q*q)+exp(-r*r*.05)*.25*(.7+.3*sin(uT*2.)); gl_FragColor=vec4(vec3(.72,1.,.3)*k,1.); }' });
  for (const [px, py] of SPAWN) { const [x, z] = toWorld(px, py), m = new THREE.Mesh(new THREE.CircleGeometry(9, 64), ringM); m.rotation.x = -Math.PI / 2; m.position.set(x, .1, z); scene.add(m); }
  /* 문: 길이 벽을 뚫고 지나가는 자리마다 문기둥 한 쌍 + 두 기둥 사이 바닥을 잇는 빛
     · 왜: 벽이 끊긴 자리가 '실수로 빈 틈'이 아니라 '일부러 낸 문'이라는 걸 멀리서도 알아보게
     · 기둥: 건메탈 몸통 + 금테 머리(기지와 같은 재료) · 안쪽 면에 빛 줄(문 종류 색)
     · 바닥 빛: 기둥 안쪽 빛 줄에서 흘러나와 맞은편 기둥으로 건너감 → 두 기둥이 한 문틀이라는 게 보임
       종류 색: 큰길 금빛 · 보물 땅 문 호박빛 · 보스 옆 샛길 붉은빛(위험) · 좁은 틈 보랏빛
     무게: 기둥·머리·빛 줄·바닥 빛 각각 한 묶음(InstancedMesh) → 문이 백 개여도 그리기 4번 */
  scene.add(new THREE.HemisphereLight(0x8a9ac0, 0x14100c, 1.1));
  { const k = new THREE.DirectionalLight(0xfff0dc, 2.4); k.position.set(-60, 120, -40); scene.add(k); }
  const GC = { road: [1, .78, .38], side: [1, .62, .22], aggro: [1, .3, .2], sneak: [.72, .45, 1] }, G = J.gates || [], S = MAP.SCALE;
  const colM = new THREE.MeshStandardMaterial({ color: 0x4a4f58, metalness: .55, roughness: .42 });   /* 건메탈: 주변 반사 없이도 형태가 보이게 금속감 낮춤 */
  const capM = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 1, roughness: .28, emissive: 0x3a2508 });
  const slitM = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const colG = new THREE.CylinderGeometry(.5, .78, 3.4, 6); colG.translate(0, 1.7, 0);
  const capG = new THREE.CylinderGeometry(.66, .5, .42, 6); capG.translate(0, 3.6, 0);
  const slitG = new THREE.BoxGeometry(.14, 2.3, .34); slitG.translate(0, 1.75, 0);
  const n2 = G.length * 2, cols = new THREE.InstancedMesh(colG, colM, n2), caps = new THREE.InstancedMesh(capG, capM, n2), slits = new THREE.InstancedMesh(slitG, slitM, n2);
  const sillM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec2 vU; varying vec3 vC; varying float vS; void main(){ vU=uv; vC=instanceColor; vS=instanceMatrix[3].x*.13+instanceMatrix[3].z*.07; gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uT; varying vec2 vU; varying vec3 vC; varying float vS;
      void main(){ float x=vU.x, y=vU.y-.5;
        float edge=exp(-x*x*40.)+exp(-(1.-x)*(1.-x)*40.);                          /* 기둥 발밑: 빛이 나오는 곳 */
        float band=exp(-y*y*60.);                                                    /* 문턱 한 줄 */
        float p=fract(uT*.35+vS), d=x-p, d2=(1.-x)-p;                                /* 양쪽 기둥에서 가운데로 건너가는 빛 */
        float run=exp(-d*d*90.)+exp(-d2*d2*90.);
        float k=band*(.22+.55*run)+edge*band*.9;
        gl_FragColor=vec4(vC*k,1.); }` });
  const sillG = new THREE.PlaneGeometry(1, 1); sillG.rotateX(-Math.PI / 2);
  const sills = new THREE.InstancedMesh(sillG, sillM, Math.max(1, G.length));
  { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    G.forEach((g, i) => { const [x, z] = toWorld(g.x, g.y), dx = Math.cos(g.a), dz = Math.sin(g.a), px = -dz, pz = dx, hw = g.w / 2 * S + .55;
      const [r, gg, b] = GC[g.k] || GC.road; c.setRGB(r * 2.2, gg * 2.2, b * 2.2);
      for (const s of [-1, 1]) { const j = i * 2 + (s > 0);
        q.setFromAxisAngle(up, Math.atan2(-s * px, -s * pz)); p.set(x + px * hw * s, 0, z + pz * hw * s); sc.set(1, 1, 1);
        m.compose(p, q, sc); cols.setMatrixAt(j, m); caps.setMatrixAt(j, m);
        p.set(x + px * (hw - .55) * s, 0, z + pz * (hw - .55) * s); m.compose(p, q, sc); slits.setMatrixAt(j, m); slits.setColorAt(j, c); }
      q.setFromAxisAngle(up, -Math.atan2(pz, px)); p.set(x, .12, z); sc.set(hw * 2, 1, 1.6); m.compose(p, q, sc); sills.setMatrixAt(i, m); c.setRGB(r, gg, b); sills.setColorAt(i, c); });
    for (const o of [cols, caps, slits, sills]) { o.frustumCulled = false; scene.add(o); }
    sills.renderOrder = 2; }

  /* 이름표 */
  const tagBox = $('#tags'), tags = ALL.map(([px, py, n, l]) => { const el = document.createElement('div'); el.className = 'tag'; el.innerHTML = `<b>${n}</b><span>${l}</span>`; tagBox.appendChild(el); const [x, z] = toWorld(px, py); return { el, p: new THREE.Vector3(x, 0, z) }; });

  /* 보기 */
  const [sx, sz] = toWorld(...SPAWN[0]);
  const cam = { x: sx, z: sz + 30, h: 130, H: 130, tilt: .25, T: .25, az: 0 }, tour = $('#tour');
  VIEWS.forEach((v, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = v.name; b.className = i === 1 ? 'on' : '';
    b.onclick = () => { cam.H = v.h; cam.T = v.tilt; if (i === 2) { cam.x = 0; cam.z = 0; } tour.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }; tour.appendChild(b); });
  const ptr = new Map(); let pin = 0;
  addEventListener('pointerdown', e => { if (e.target.closest('#ui')) return; ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, c] = [...ptr.values()]; pin = Math.hypot(a[0] - c[0], a[1] - c[1]); } });
  addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; const o = ptr.get(e.pointerId);
    if (ptr.size === 1) { const k = cam.h * .0018; cam.x -= (e.clientX - o[0]) * k; cam.z -= (e.clientY - o[1]) * k; cam.x = clamp(cam.x, -140, 140); cam.z = clamp(cam.z, -140, 140); }
    ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 2) { const [a, c] = [...ptr.values()], d = Math.hypot(a[0] - c[0], a[1] - c[1]); if (pin) cam.H = clamp(cam.H * pin / d, 20, 620); pin = d; } });
  const upF = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pin = 0; }; addEventListener('pointerup', upF); addEventListener('pointercancel', upF);
  addEventListener('wheel', e => { cam.H = clamp(cam.H * Math.exp(e.deltaY * .0012), 20, 620); }, { passive: true });

  let Wd = 2, Hd = 2, cw = 1, ch = 1;
  const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); cw = r.width; ch = r.height; [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); floor.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); }
  addEventListener('resize', size); size();
  let last = performance.now(), t = 0; const v = new THREE.Vector3();
  renderer.setAnimationLoop(now => { try {
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt;
    cam.h += (cam.H - cam.h) * Math.min(1, dt * 3); cam.tilt += (cam.T - cam.tilt) * Math.min(1, dt * 3);
    camera.position.set(cam.x, cam.h * Math.cos(cam.tilt), cam.z + cam.h * Math.sin(cam.tilt)); camera.lookAt(cam.x, 0, cam.z);
    floor.update(t); ringM.uniforms.uT.value = t; sillM.uniforms.uT.value = t;
    for (const g of tags) { v.copy(g.p).project(camera); const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      g.el.style.opacity = on ? 1 : 0; if (on) g.el.style.transform = `translate(${(v.x * .5 + .5) * cw}px,${(-v.y * .5 + .5) * ch}px) translate(-50%,-50%)`; }
    renderer.setRenderTarget(bloom.scene); renderer.clear(); floor.render(camera, bloom.scene); renderer.render(scene, camera);
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
  } catch (err) { console.error('[맵]', err); } });
  { const v = (import.meta.url.match(/v=(\d+)/) || [])[1] || '개발'; const el = document.createElement('div'); el.textContent = '6안 · 판 번호 ' + v;   /* 어떤 버전이 열렸는지 바로 확인 */
    el.style.cssText = 'position:fixed;left:max(18px,env(safe-area-inset-left,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 14px);font-size:11px;color:rgba(185,255,74,.7);pointer-events:none'; document.body.appendChild(el); }
  onProgress(1);
  window.__wv = { get t() { return t; }, cam };
}
