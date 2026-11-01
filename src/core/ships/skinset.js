/* 1번 기체 도색 자료 — 받은 도색(재질 번호별 색·금속감·그림)을 그대로 입힘. 오팔 프리즘은 받은 반사 효과 그대로. */
import * as THREE from 'three';

const manifests = {}, textures = {}, built = new Map();

function tex(dir, file, src, color, renderer) {
  const k = dir + file + ':' + (src ? src.channel : 0);
  if (!textures[k]) textures[k] = new THREE.TextureLoader().loadAsync(dir + file).then(t => {
    t.flipY = false;
    if (src) { t.channel = src.channel; t.wrapS = src.wrapS; t.wrapT = src.wrapT; t.offset.copy(src.offset); t.repeat.copy(src.repeat); t.rotation = src.rotation; t.center.copy(src.center); }
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    if (renderer) t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  });
  return textures[k];
}

function opal(m) {
  m.iridescence = .62; m.iridescenceIOR = 1.58; m.iridescenceThicknessRange = [180, 420];
  m.metalness = 1; m.roughness = m.roughnessMap ? .48 : .12; m.clearcoat = 1; m.clearcoatRoughness = .075; m.envMapIntensity = 1.5;
  m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
    vec3 prismView=normalize(vViewPosition); vec3 prismReflect=reflect(-prismView,normal);
    float prismAngle=dot(prismReflect,normalize(vec3(.7,.4,1.)));
    float prismBand=.5+.5*sin(prismAngle*14.+normal.x*3.);
    vec3 prismTint=mix(vec3(.56,.38,1.),vec3(1.,.43,.72),prismBand);
    float prismRim=pow(1.-abs(dot(normal,prismView)),1.8);
    float prismGlint=pow(max(0.,dot(prismReflect,normalize(vec3(-.5,.7,1.)))),110.);
    float prismFoil=pow(.5+.5*sin(prismAngle*22.+dot(normal,vec3(3.3,7.4,1.1))),10.);
    outgoingLight*=mix(vec3(.78,.76,.88),vec3(1.08,1.04,1.12),prismBand);
    outgoingLight+=prismTint*(.06+.18*prismRim+.65*prismFoil)+vec3(1.,.94,1.)*prismGlint*1.2;
    #include <opaque_fragment>`); };
  m.customProgramCacheKey = () => 'r44-prism-optics';
}

/* 원래 재질 → 도색 재질 표 (같은 파일·같은 도색은 한 번만 만듦) */
export async function skinSet(gltf, dir, paint, renderer) {
  const key = gltf; if (!built.has(key)) built.set(key, {});
  const per = built.get(key);
  if (per[paint.id]) return per[paint.id];
  return per[paint.id] = (async () => {
    if (!manifests[dir]) manifests[dir] = fetch(dir + 'manifest.json').then(r => r.json());
    const specs = (await manifests[dir])[paint.set], out = new Map(), uniq = new Set();
    gltf.scene.traverse(o => { if (o.isMesh) uniq.add(o.material); });
    const skip = paint.fx && paint.fx.skip ? new RegExp(paint.fx.skip, 'i') : null;
    await Promise.all([...uniq].map(async om => {
      const sp = specs[gltf.parser.associations.get(om)?.materials];
      if (!sp || !Object.keys(sp).length) { out.set(om, om); return; }
      const m = om.clone();
      for (const p of ['metalness', 'roughness', 'clearcoat', 'clearcoatRoughness']) if (sp[p] !== undefined) m[p] = sp[p];
      if (sp.color) m.color.setRGB(...sp.color.map(v => v / 255), THREE.SRGBColorSpace);
      if (sp.map) { m.map = await tex(dir, sp.map, om.map, true, renderer); m.color.set(0xffffff); const orm = await tex(dir, sp.orm, om.map, false, renderer); m.metalnessMap = orm; m.roughnessMap = orm; }
      if (paint.fx && paint.fx.type === 'opal' && !skip.test(om.name)) opal(m);
      m.needsUpdate = true; out.set(om, m);
    }));
    return out;
  })();
}
