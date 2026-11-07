/* 문 타고 오르내리기 (사용자 2026-11-07 · 빛의 길(skypath)의 준비·출발·이동을 그대로 옮김)
   · 문 한가운데서 0.5초 멈추면 → 3초 준비(낮은 울림이 점점 높아짐 · 고리 조각이 점점 빨리 돎 · 기체가 갈 쪽으로 천천히 틂) · 움직이면 취소
   · 출발: 쿵 + 슉 · 뒤로 얇은 빛 고리가 한 번 퍼짐 · 길을 탐: 처음엔 확 빠르게 → 점점 느려지며 도착 문 앞에서 수평으로 미끄러져 멈춤 · 가는 동안 공격받지 않음
   · 카메라: 처음엔 제자리 → 길의 절반쯤부터 빠르게 따라붙어 함께 도착 (어디로 가는지 먼저 보이게)
   · 도착한 섬: 그 섬 땅 위만 날 수 있음(땅 밖은 막힘) · 섬 가장자리에 돌아가는 문(받침 섬 위) — 같은 방법으로 돌아감
   · 돌아가는 문과 도착 섬의 땅 지도는 '갈 때만' 만들고 돌아오면 비움 (지금 쓰는 것만 올림 · 설계 원칙) */
import * as THREE from 'three';
import { gate4, pedestal } from './gates.js?v=11072203';

const clamp = THREE.MathUtils.clamp, smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

/* 소리: 파일 없이 화면 안에서 만듦 (빛의 길과 같음 · 사용자 2026-11-06: 종소리 없음 · 도착 소리 없음) */
function makeSound() {
  let ac = null, master = null, noiseBuf = null;
  const init = () => { if (ac) { if (ac.state === 'suspended') ac.resume(); return; } try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ac.createGain(); master.gain.value = .55; const comp = ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; };
  addEventListener('pointerdown', init); addEventListener('keydown', init);
  const noise = () => { const n = ac.createBufferSource(); n.buffer = noiseBuf; n.loop = true; return n; };
  let ch = null;
  return {
    chargeStart() { if (!ac) return; this.chargeStop(true); const t = ac.currentTime, out = ac.createGain(); out.gain.value = 0; out.connect(master);
      const o1 = ac.createOscillator(), o2 = ac.createOscillator(), g1 = ac.createGain(); o1.type = 'sine'; o2.type = 'triangle'; const cv1 = new Float32Array(64), cv2 = new Float32Array(64); for (let i = 0; i < 64; i++) { const u = i / 63, f = 110 * Math.pow(12, u * u * u); cv1[i] = f; cv2[i] = f * 1.5; }   /* 처음은 낮게 → 3초로 갈수록 가파르게 높아짐 */
      o1.frequency.setValueCurveAtTime(cv1, t, 3); o2.frequency.setValueCurveAtTime(cv2, t, 3); g1.gain.value = .5;
      o1.connect(g1); o2.connect(g1); g1.connect(out); out.gain.linearRampToValueAtTime(.16, t + .4); out.gain.linearRampToValueAtTime(.3, t + 3); o1.start(t); o2.start(t); ch = { out, osc: [o1, o2] }; },
    chargeStop(quick) { if (!ac || !ch) return; const t = ac.currentTime, c = ch; ch = null; c.out.gain.cancelScheduledValues(t); c.out.gain.setValueAtTime(c.out.gain.value, t); c.out.gain.linearRampToValueAtTime(0, t + (quick ? .05 : .35));
      for (const o of c.osc) try { o.stop(t + .4); } catch (e) {} },
    depart(dur) { if (!ac) return; this.chargeStop(true); const t = ac.currentTime;
      { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(38, t + .35); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.55, t + .012); g.gain.exponentialRampToValueAtTime(.0005, t + .45); o.connect(g); g.connect(master); o.start(t); o.stop(t + .5); }   /* 쿵 */
      { const n = noise(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'bandpass'; f.Q.value = .9; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(500, t + .7); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.4, t + .03); g.gain.exponentialRampToValueAtTime(.001, t + .75); n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + .8); }   /* 슉 */
      { const n = noise(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'bandpass'; f.Q.value = .6; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(320, t + dur); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.16, t + .15); g.gain.exponentialRampToValueAtTime(.001, t + dur + .1); n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + dur + .2); } } };   /* 스치는 바람: 잦아듦 */
}

/* 도착 섬의 땅 지도: 위에서 내려다본 섬 모양(25cm 칸) — 이 안에서만 날 수 있음 */
function footprint(meshes, cx, cz, rad) {
  const H = .25, half = rad + 6, M = Math.ceil(half * 2 / H) + 1, x0 = cx - half, z0 = cz - half, grid = new Uint8Array(M * M);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), w = new THREE.Vector3();
  for (const { geo, mat } of meshes) { const P = geo.attributes.position, I = geo.index, cnt = I ? I.count : P.count;
    for (let i = 0; i + 2 < cnt; i += 3) { a.fromBufferAttribute(P, I ? I.getX(i) : i).applyMatrix4(mat); b.fromBufferAttribute(P, I ? I.getX(i + 1) : i + 1).applyMatrix4(mat); c.fromBufferAttribute(P, I ? I.getX(i + 2) : i + 2).applyMatrix4(mat);
      const e = Math.max(Math.hypot(a.x - b.x, a.z - b.z), Math.hypot(b.x - c.x, b.z - c.z), Math.hypot(c.x - a.x, c.z - a.z)), n = Math.max(1, Math.ceil(e / .18));
      for (let u = 0; u <= n; u++) for (let v = 0; v <= n - u; v++) { const s1 = u / n, s2 = v / n; w.set(0, 0, 0).addScaledVector(a, 1 - s1 - s2).addScaledVector(b, s1).addScaledVector(c, s2);
        const gx = Math.floor((w.x - x0) / H), gz = Math.floor((w.z - z0) / H); if (gx >= 0 && gz >= 0 && gx < M && gz < M) grid[gz * M + gx] = 1; } } }
  /* 안쪽 구멍 메우기 (가장자리에서 닿지 않는 빈 칸 = 섬 안) */
  const seen = new Uint8Array(M * M), st = []; const push = k => { if (!seen[k] && !grid[k]) { seen[k] = 1; st.push(k); } };
  for (let i = 0; i < M; i++) { push(i); push((M - 1) * M + i); push(i * M); push(i * M + M - 1); }
  while (st.length) { const k = st.pop(), x = k % M, z = (k - x) / M; if (x > 0) push(k - 1); if (x < M - 1) push(k + 1); if (z > 0) push(k - M); if (z < M - 1) push(k + M); }
  for (let k = 0; k < M * M; k++) if (!seen[k]) grid[k] = 1;
  return (x, z) => { const gx = Math.floor((x - x0) / H), gz = Math.floor((z - z0) / H); return gx >= 0 && gz >= 0 && gx < M && gz < M && grid[gz * M + gx] === 1; };
}

export function makeTravel({ scene, gates, meadow, jungle, fly, ship, FS, HOVER, GATE_H, say }) {
  const SND = makeSound();
  /* 출발 충격파: 기체 뒤로 얇은 빛 고리가 한 번 퍼지며 사라짐 (과하지 않게) */
  const shockM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uC: { value: new THREE.Color() }, uA: { value: 0 }, uK: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform vec3 uC; uniform float uA, uK; varying vec2 vP;
      void main(){ float r=length(vP); float w=mix(.10,.035,uK); float ring=exp(-pow((r-.92)/w,2.)); float inner=smoothstep(.92,.2,r)*.18*(1.-uK); gl_FragColor=vec4(uC*(ring+inner)*uA,1.); }` });
  const shock = new THREE.Mesh(new THREE.CircleGeometry(1, 48), shockM); shock.visible = false; shock.renderOrder = 9; scene.add(shock); const SW = { t: 9, c: new THREE.Color() };
  let mode = 'mid', dest = null, trip = null, charge = null, lock = null, yOff = 0;
  const v3 = new THREE.Vector3(), tan = new THREE.Vector3(), camT = { x: 0, y: 0, z: 0 };
  /* 도착 섬 찾기: 초원 보물 섬(place) 또는 정글 던전 섬(pieces) */
  const destMeshes = g => { const Gd = g.Gd, out = [];
    if (Gd.jungle) { const p = jungle.pieces.find(q => Math.abs(q.x - Gd.tx) < .5 && Math.abs(q.z - Gd.tz) < .5); if (p) { p.G.updateMatrixWorld(true); p.G.traverse(m => { if (!m.isMesh || m.isInstancedMesh || !m.geometry?.attributes.position) return; const mt = m.material; if (mt && (mt.blending === THREE.AdditiveBlending || mt.depthWrite === false)) return; out.push({ geo: m.geometry, mat: m.matrixWorld }); }); } }
    else { const p = meadow.place.find(q => q.layer === Gd.layer && Math.abs(q.x - Gd.tx) < .5 && Math.abs(q.z - Gd.tz) < .5); if (p) for (const pr of meadow.KIT[p.k].prims) if (pr.mat !== 'Foliage' && pr.mat !== 'Water') out.push({ geo: pr.geo, mat: p.m }); }
    return out; };
  /* 돌아가는 문: 빛의 길 끝(섬 가장자리 바로 밖) · 받침 섬 위 · 길 쪽을 바라봄 */
  const openDest = g => { const G = gate4(GATE_H / .8); G.g.scale.setScalar(.8); const root = new THREE.Group(), ped = pedestal(91 + gates.indexOf(g) * 7); ped.scale.setScalar(.5); root.add(ped); root.add(G.g);
    root.position.set(g.ex, g.y1 - GATE_H, g.ez); root.rotation.y = Math.atan2(-g.ax, -g.az); scene.add(root);
    const isle = footprint(destMeshes(g), g.Gd.tx, g.Gd.tz, g.Gd.rad * 1.6 + 4);
    const exitG = { G, root, x: g.ex, z: g.ez, ax: g.ax, az: g.az, col: g.col, ch: 0, stay: 0, back: true, from: g };
    dest = { g, exitG, isle, onPed: (x, z) => Math.hypot(x - g.ex, z - g.ez) < 3.4 }; };
  const closeDest = () => { if (!dest) return; const r = dest.exitG.root; scene.remove(r); r.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); }); dest = null; };
  const stones = (gg, x, z) => { const dx = x - gg.x, dz = z - gg.z; if (dx > 4 || dx < -4 || dz > 4 || dz < -4) return false; const along = dx * gg.ax + dz * gg.az, lat = Math.abs(dx * -gg.az + dz * gg.ax); return Math.abs(along) < .5 && lat > 1.9 && lat < 3.0; };
  /* 도착 섬에서 막힘: 고리 돌 조각 · 섬 땅 밖 */
  const blocked = (x, z) => { if (mode === 'trip') return false; if (mode !== 'dest' || !dest) return null; if (stones(dest.exitG, x, z)) return true; return !(dest.onPed(x, z) || dest.isle(x, z)); };
  const startTrip = (g, back, t) => { const dir = g.curve.getTangentAt(back ? 1 : 0); if (back) dir.negate();
    trip = { g, back, u: 0, dur: clamp(g.len / 30, 1.1, 1.8), cam0: { ...camT } }; mode = 'trip'; FS.aim = null; SND.depart(trip.dur);
    if (!back) openDest(g);
    shock.position.set(FS.x, HOVER + yOff, FS.z).addScaledVector(dir, -.7); shock.quaternion.setFromUnitVectors(v3.set(0, 0, 1), dir); SW.t = 0; SW.c.copy(g.col); };
  /* 지금 다룰 문: 가운데층이면 들어가는 문들 · 도착 섬이면 돌아가는 문 하나 */
  const live = () => mode === 'mid' ? gates : mode === 'dest' && dest ? [dest.exitG] : [];
  const update = (t, dt, cam) => {
    camT.x = cam.x; camT.y = cam.y; camT.z = cam.z;
    const spd = Math.hypot(FS.vx, FS.vz), L = live();
    /* 출발 준비: 문 한가운데서 0.5초 멈춤 → 3초 */
    for (const g of L) { const inG = g !== lock && Math.hypot(FS.x - g.x, FS.z - g.z) < 1.6;
      if (inG && spd < 1.2 && !(charge && charge.g !== g)) g.stay += dt; else g.stay = 0;
      if (g.stay > .5 && !charge) { const back = !!g.back, gg = back ? g.from : g, look = gg.curve.getPointAt(back ? .8 : .2), wantYaw = Math.atan2(-(look.x - FS.x), -(look.z - FS.z)); charge = { g, u: 0, yaw0: FS.head, wantYaw, back }; SND.chargeStart(); } }
    for (const g of gates.concat(dest ? [dest.exitG] : [])) g.ch = charge?.g === g ? charge.u : Math.max(0, g.ch - dt * .8);
    if (lock && Math.hypot(FS.x - lock.x, FS.z - lock.z) > 2.5) lock = null;
    if (charge) { const c = charge, g = c.g; if (Math.hypot(FS.x - g.x, FS.z - g.z) > 1.9 || spd > 2.6) { charge = null; FS.aim = null; FS.chBank = 0; FS.chPitch = 0; SND.chargeStop(); }   /* 움직이면 취소 */
      else { c.u = Math.min(1, c.u + dt / 3); const e = c.u * c.u * (3 - 2 * c.u), dY = Math.atan2(Math.sin(c.wantYaw - c.yaw0), Math.cos(c.wantYaw - c.yaw0)); FS.aim = c.yaw0 + dY * e;   /* 갈 쪽으로 천천히 틂 */
        FS.chBank = -Math.sign(dY || 1) * Math.min(.5, Math.abs(dY) * .3 + .12) * Math.sin(c.u * Math.PI); const gg = c.back ? g.from : g; FS.chPitch = (c.back ? 0 : (gg.Gd.layer === 'up' ? .18 : -.14)) * e;
        if (c.u >= 1) { charge = null; FS.chBank = 0; FS.chPitch = 0; startTrip(gg, c.back, t); } } }
    /* 길을 탐: 처음부터 확 빠르게, 점점 느려지며 도착 문 앞에서 수평으로 미끄러져 멈춤 */
    if (mode === 'trip') { const tr = trip; tr.u = Math.min(1, tr.u + dt / tr.dur); const e = 1 - Math.pow(1 - tr.u, 2.6), s = tr.back ? 1 - e : e;
      tr.g.curve.getPointAt(clamp(s, 0, 1), v3); tr.g.curve.getTangentAt(clamp(s, 0, 1), tan); if (tr.back) tan.negate(); tr.s = e;
      FS.dashUntil = t + 1; FS.dashVx = (v3.x - FS.x) / Math.max(dt, 1e-3); FS.dashVz = (v3.z - FS.z) / Math.max(dt, 1e-3); fly.position.y = v3.y - HOVER; yOff = fly.position.y;
      FS.aim = Math.atan2(-tan.x, -tan.z); FS.tripPitch = Math.atan2(tan.y, Math.hypot(tan.x, tan.z));
      if (tr.u >= 1) { FS.dashUntil = 0; FS.aim = null; FS.tripPitch = 0; FS.vx = tan.x * 2; FS.vz = tan.z * 2;
        if (tr.back) { lock = tr.g; closeDest(); mode = 'mid'; yOff = 0; } else { lock = dest.exitG; mode = 'dest'; yOff = tr.g.y1 - HOVER; }
        fly.position.y = yOff; fly.userData.moveTo(v3.x, v3.z); trip = null; } }
    /* 문 빛: 준비하는 동안 고리 조각·빛 상자가 점점 빨리 돎 */
    if (dest) dest.exitG.G.update(t, 1, dest.exitG.col, dt, dest.exitG.ch);
    if (SW.t < .5) { SW.t += dt; const k = SW.t / .5; shock.visible = true; shock.scale.setScalar(.6 + k * 3.6); shockM.uniforms.uK.value = k; shockM.uniforms.uA.value = (1 - k) * (1 - k) * .9; shockM.uniforms.uC.value.copy(SW.c); } else shock.visible = false;
  };
  /* 기체 자세: 길 기울기만큼 고개 · 준비 중 기울며 틂 (flight 갱신 뒤에 얹음) */
  const pose = () => { if (FS.tripPitch) ship.rotateX(FS.tripPitch * .7); if (FS.chPitch) ship.rotateX(FS.chPitch); if (FS.chBank) ship.rotateZ(FS.chBank); };
  /* 카메라: 길을 탈 땐 처음엔 제자리 → 길의 절반쯤부터 빠르게 따라붙어 함께 도착 */
  const camera = (cam, sp, dt) => { const ty = HOVER + yOff;
    if (mode === 'trip') { const f = smooth(.45, .9, trip.s); cam.x = THREE.MathUtils.lerp(trip.cam0.x, sp.x, f); cam.y = THREE.MathUtils.lerp(trip.cam0.y, ty, f); cam.z = THREE.MathUtils.lerp(trip.cam0.z, sp.z, f); return true; }
    cam.y += (ty - cam.y) * Math.min(1, dt * 4); return false; };
  /* 길 타는 동안 기체 둘레로 흩어지는 빛 알갱이 */
  const glowTrail = (glow, sp) => { if (mode !== 'trip') return; const ca = trip.g.col.toArray(), k = 1 - trip.u;
    for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28, r = 1.3 + Math.random() * 2; glow.add(sp.x + Math.cos(a) * r, HOVER + yOff + Math.sin(a) * r * .5, sp.z + Math.sin(a) * r * .4, -tan.x * 3 * k, -tan.y * 3 * k, -tan.z * 3 * k, .05, 0, ca, .8 * k, i); } };
  const status = () => mode === 'trip' ? (trip.back ? '돌아가는 중 · 공격받지 않음' : (trip.g.Gd.layer === 'up' ? '위층으로' : '아래층으로') + ' 가는 중 · 공격받지 않음')
    : charge ? `출발 준비 ${Math.ceil(3 - charge.u * 3)} · 움직이면 취소` : mode === 'dest' ? (dest.g.Gd.jungle ? '정글 던전' : '보물 섬') + ' · ' + (dest.g.Gd.layer === 'up' ? '위층' : '아래층') + ' · 돌아가는 문 한가운데서 멈추면 돌아감' : null;
  return { update, blocked, pose, camera, glowTrail, status, get mode() { return mode; }, get yOff() { return yOff; }, get dest() { return dest; }, get charge() { return charge; }, startTrip };
}
