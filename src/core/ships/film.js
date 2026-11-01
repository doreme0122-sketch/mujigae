/* 얇은 무지개 막 — 프리즘 도색 공용 블록 (3번 골드 프리즘 · 4번 블루 프리즘 · 앞으로의 프리즘 도색)
   기체마다 다른 건 설정 데이터(fx)로만 정한다. 코드는 하나.
   - 띠: 보는 각도 + 표면 위치로 정해짐 → 기체를 돌리면 띠가 표면을 따라 미끄러짐 (기체 크기에 맞춰 한두~세 겹)
   - tint   : 표면 색에 무지개를 곱해 물들임 (어두운 파랑 바탕에 맞음)
   - reflect: 비친 빛의 밝기는 그대로 두고 색만 무지개로 바꿈 + 막 자체의 은은한 빛 (금처럼 밝은 금속이 탁해지지 않게)
   - 빛 받는 곳: 빨강·초록·파랑 하이라이트를 조금씩 비껴 놓아 빨강~보라로 갈라짐 */
import * as THREE from 'three';

const f = v => Number(v).toFixed(4);
const lum = c => c.r * .2126 + c.g * .7152 + c.b * .0722;

function fragment(fx) {
  const F = fx.film, S = fx.split;
  const head = `
  { vec3 Nn=normalize(normal), Vv=normalize(vViewPosition); float cv=abs(dot(Nn,-Vv)), fv=1.-cv;
    float ph=fv*${f(F.angle)}+dot(vPO,vec3(.9,.35,.6))*uF*${f(F.freq)}+uT*${f(F.flow)};
    vec3 film=.5+.5*cos(6.2831*(ph+vec3(0.,.33,.67)));`;
  const split = `
    vec3 Ld=normalize((viewMatrix*vec4(.45,.85,.6,0.)).xyz); vec3 Hh=normalize(Ld-Vv);
    vec3 split=vec3(pow(max(dot(Nn,normalize(Hh+vec3(${f(S.width)},0.,0.))),0.),${f(S.power)}),pow(max(dot(Nn,Hh),0.),${f(S.power)}),pow(max(dot(Nn,normalize(Hh-vec3(${f(S.width)},0.,0.))),0.),${f(S.power)}));
    outgoingLight+=(.5+.5*cos(6.2831*(ph*1.7+vec3(0.,.33,.67))))*split*${f(S.gain)}*pmask;`;
  let body;
  if (F.mode === 'reflect') {
    body = `
    film=pow(film,vec3(${f(F.sharpen || 1)}));
    float band=${F.band ? '.35+.65*smoothstep(.25,.75,.5+.5*sin(6.2831*(ph*.5+.13)))' : '1.'};
    float amt=mix(${f(F.front)},${f(F.side)},fv*fv)*band*pmask;
    float L=dot(outgoingLight,vec3(.299,.587,.114));
    outgoingLight=mix(outgoingLight,film*L*2.0+outgoingLight*.2,amt*${f(F.mix)});
    outgoingLight+=film*(${f(F.glow[0])}+${f(F.glow[1])}*pow(fv,1.5))*.9*pmask;` + split +
    (fx.saturate ? `
    { float g=dot(outgoingLight,vec3(.299,.587,.114)); outgoingLight=max(vec3(0.),mix(vec3(g),outgoingLight,${f(fx.saturate)})); }` : '');
  } else {
    body = `
    float amt=mix(${f(F.front)},${f(F.side)},fv*fv)*pmask;
    outgoingLight=mix(outgoingLight,outgoingLight*(.55+.9*film),amt*.8)+film*amt*.22;` + split;
  }
  return head + body + ` }
  #include <opaque_fragment>`;
}

/* om: 원래 재질, fx: 설정, UF: {value: 1.6/기체 최대 길이}, UT: 시간 */
export function filmMaterial(om, fx, UF, UT) {
  const name = om.name || '';
  if (fx.skip && new RegExp(fx.skip, 'i').test(name)) return om;
  const isFrame = fx.frame && new RegExp(fx.frame.match).test(name);
  if (fx.only) {                                                  /* 정해진 재질만 (블루 프리즘: 그림 있는 장갑 + 안쪽 면 + 테두리) */
    const ok = fx.only.split('|').some(k => k === 'textured' ? !!om.map : new RegExp(k).test(name));
    if (!ok && !isFrame) return om;
  }
  const pm = om.clone();
  Object.assign(pm, fx.surface || {});
  if (isFrame) pm.color = new THREE.Color(fx.frame.color);
  if (fx.recolor && !pm.map) {                                    /* 원래 밝기 단계는 살리고 색만 바꿈 */
    const R = fx.recolor, k = Math.min(1, Math.max(R.min, Math.pow(lum(om.color) / R.ref, R.gamma)));
    pm.color.setRGB(R.color[0] * k, R.color[1] * k, R.color[2] * k);
  }
  const M = fx.mask;
  pm.onBeforeCompile = sh => {
    sh.uniforms.uT = UT; sh.uniforms.uF = UF;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPO;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPO=position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT, uF; float pmask=1.; varying vec3 vPO;');
    if (M) sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      #ifdef USE_MAP
        { vec3 t=texture2D(map,vMapUv).rgb; float lum=dot(t,vec3(.2126,.7152,.0722));
          pmask=smoothstep(${f(M.hi)},${f(M.lo)},lum);
          float grain=clamp(lum/.012,0.,1.);
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(${M.color.map(f).join(',')})*(${f(1 - M.grain)}+${f(M.grain)}*grain),pmask); }
      #endif`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', fragment(fx));
  };
  pm.customProgramCacheKey = () => 'film:' + JSON.stringify(fx);
  return pm;
}
