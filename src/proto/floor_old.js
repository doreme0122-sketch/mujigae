/* 지역 바닥 — 발밑에 깔린 빛나는 구름층 (맵은 행성 위 궤도에 떠 있으므로 땅 대신)
   두 겹(아래 겹은 더 멀고 느리게)으로 깊이감. 지역마다 성질이 다르다.
   · 먼지 들판: 잔잔한 회색 먼지, 띄엄띄엄 작은 반짝임
   · 얼음 서리: 푸른 서리 안개, 얼음 알갱이가 날카롭게 반짝
   · 용암 재: 검은 재 구름, 아래에서 붉은 빛이 비치고 불씨가 숨 쉬듯
   · 결정 가루: 보랏빛 가루, 반짝임이 빛이 갈라진 무지개
   · 안개 늪: 짙은 청록 안개가 천천히 소용돌이
   기체가 지나가면 구름이 양옆으로 갈라졌다가(가장자리는 밀려 짙어짐) 천천히 다시 메워진다. */
import * as THREE from 'three';

export const FLOORS = [
  { id: 'dust', name: '먼지 들판', a: [.16, .15, .14], b: [.3, .27, .23], glint: [1, .95, .85], gk: .5, dens: .55, speed: .02, swirl: .4, scale: .05 },
  { id: 'frost', name: '얼음 서리', a: [.05, .14, .22], b: [.22, .42, .55], glint: [.8, .95, 1.3], gk: 1.2, dens: .6, speed: .015, swirl: .5, scale: .06 },
  { id: 'ash', name: '용암 재', a: [.03, .02, .02], b: [.12, .07, .06], glint: [1.4, .45, .1], gk: 1, dens: .7, speed: .025, swirl: .6, scale: .055, ember: 1 },
  { id: 'shard', name: '결정 가루', a: [.07, .04, .12], b: [.22, .14, .32], glint: [1, 1, 1], gk: 1.3, dens: .5, speed: .012, swirl: .3, scale: .07, spec: 1 },
  { id: 'bog', name: '안개 늪', a: [.02, .09, .09], b: [.07, .3, .28], glint: [.5, 1, .85], gk: .35, dens: .8, speed: .01, swirl: 1.2, scale: .04 }];

const NT = 24;
export function floorMaterial(depth) {
  const trail = Array.from({ length: NT }, () => new THREE.Vector4(0, 0, -99, 0));
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uA: { value: new THREE.Color() }, uB: { value: new THREE.Color() }, uG: { value: new THREE.Color() }, uP: { value: new THREE.Vector4() }, uP2: { value: new THREE.Vector4() }, uTrail: { value: trail }, uDepth: { value: depth } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `precision highp float; varying vec3 vW; uniform float uT, uDepth; uniform vec3 uA, uB, uG; uniform vec4 uP, uP2; uniform vec4 uTrail[${NT}];
      float h2(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      float n2(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ s+=a*n2(p); p=mat2(1.6,1.2,-1.2,1.6)*p+3.1; a*=.5; } return s; }
      vec3 hue(float h){ return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }
      void main(){
        float dens=uP.x, speed=uP.y, swirl=uP.z, sc=uP.w, gk=uP2.x, ember=uP2.y, spec=uP2.z;
        vec2 p=vW.xz*sc*(1.+uDepth*.4)+vec2(uDepth*7.3,uDepth*3.1);
        float t=uT*speed*(1.-uDepth*.4);
        vec2 w=vec2(fbm(p*1.3+vec2(t,-t*.7)),fbm(p*1.3+vec2(5.2-t*.8,1.3+t)))-.5;
        p+=w*swirl*2.;
        float d=fbm(p+vec2(t*.6,t*.3));
        /* 기체가 지나간 자리: 구름이 갈라지고 가장자리는 밀려 짙어짐, 천천히 메워짐 */
        float part=0., push=0.;
        for(int i=0;i<${NT};i++){ vec4 tr=uTrail[i]; if(tr.z<0.) continue; float age=uT-tr.z; if(age>5.) continue;
          float r=length(vW.xz-tr.xy), k=exp(-age*.55), wid=1.1+age*.45;
          part=max(part,exp(-r*r/(wid*wid))*k*(1.-uDepth*.6));
          push=max(push,exp(-pow((r-wid*1.4)/(wid*.5),2.))*k*.6*(1.-uDepth*.6)); }
        float a=smoothstep(.35,.85,d)*dens*(1.-part*.92)+push*smoothstep(.3,.7,d)*dens*.6;
        a*=1.-uDepth*.35;
        a*=smoothstep(66.,48.,length(vW.xz));                                                     /* 판 가장자리가 보이지 않게 */
        vec3 c=mix(uA,uB,smoothstep(.4,.95,d));
        c*=.8+.4*fbm(p*3.+4.);
        /* 용암 재: 아래에서 비치는 붉은 빛 + 숨 쉬는 불씨 */
        if(ember>.5){ float hot=smoothstep(.55,.8,fbm(p*.7+vec2(-t*.5,t*.2)+9.)); c+=vec3(.5,.1,.02)*hot*(.6+.4*sin(uT*1.2+d*9.))*(1.-d*.6);
          vec2 ec=floor(vW.xz*1.6); float eh=h2(ec+uDepth*13.); if(eh>.985){ vec2 ef=fract(vW.xz*1.6)-.5; float tw=.5+.5*sin(uT*(2.+eh*4.)+eh*40.);
            c+=vec3(1.5,.5,.1)*exp(-dot(ef,ef)*90.)*tw*3.; a=max(a,exp(-dot(ef,ef)*90.)*tw*.9); } }
        /* 반짝임: 칸마다 하나, 시간 따라 깜빡 */
        vec2 gc=floor(vW.xz*(2.2+uDepth)); float gh=h2(gc+uDepth*31.);
        if(gh>1.-.012*gk){ vec2 gf=fract(vW.xz*(2.2+uDepth))-.5; float tw=pow(max(0.,sin(uT*(1.+gh*3.)+gh*60.)),6.);
          vec3 gcol=spec>.5?hue(fract(gh*7.+uT*.05))*.8+.4:uG; float g=exp(-dot(gf,gf)*160.)*tw*(1.-part);
          c+=gcol*g*2.5; a=max(a,g); }
        gl_FragColor=vec4(c,clamp(a,0.,1.));
      }` });
}

/* 두 겹 바닥 묶음 */
export function makeFloor(size = 140) {
  const grp = new THREE.Group(), mats = [];
  for (const [y, dpt] of [[-3.2, 1], [-1.6, 0]]) { const m = floorMaterial(dpt), pl = new THREE.Mesh(new THREE.PlaneGeometry(size, size), m); pl.rotation.x = -Math.PI / 2; pl.position.y = y; pl.renderOrder = -1 + dpt * -1; grp.add(pl); mats.push(m); }
  let ti = 0, last = null;
  return { grp, mats,
    set(F) { for (const m of mats) { m.uniforms.uA.value.setRGB(...F.a); m.uniforms.uB.value.setRGB(...F.b); m.uniforms.uG.value.setRGB(...F.glint);
      m.uniforms.uP.value.set(F.dens, F.speed, F.swirl, F.scale); m.uniforms.uP2.value.set(F.gk, F.ember || 0, F.spec || 0, 0); } },
    update(t, sx, sz) { for (const m of mats) m.uniforms.uT.value = t;
      if (!last || Math.hypot(sx - last[0], sz - last[1]) > .9) { last = [sx, sz]; for (const m of mats) m.uniforms.uTrail.value[ti % NT].set(sx, sz, t, 0); ti++; } } };
}
