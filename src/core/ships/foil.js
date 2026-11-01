import * as THREE from 'three';

// Analytic diffraction accent over standard glTF thin-film iridescence.
// No sampled image, UV decal, random particle, timer, or per-vertex geometry edit.
const configured=new WeakSet();
export function applyPrismFoil(material){
  if(!material||configured.has(material)||material.userData.gem_role!=='prism_foil')return;
  configured.add(material);
  material.onBeforeCompile=shader=>{
    shader.uniforms.prismLightDirection={value:new THREE.Vector3(-6,10,6).normalize()};
    shader.vertexShader='varying vec3 vPrismPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      vPrismPosition=(modelMatrix*vec4(transformed,1.0)).xyz;`);
    shader.fragmentShader=`varying vec3 vPrismPosition;
      uniform vec3 prismLightDirection;
      vec3 prismSpectrum(float phase){
        vec3 wave=0.5+0.5*cos(6.28318530718*(phase+vec3(0.0,0.3333333,0.6666667)));
        return mix(vec3(1.0),wave,0.82);
      }
    `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      vec3 prismN=inverseTransformDirection(normal,viewMatrix);
      vec3 prismV=inverseTransformDirection(normalize(vViewPosition),viewMatrix);
      vec3 prismAxis=normalize(vec3(0.82,0.12,0.56));
      vec3 prismT=normalize(prismAxis-prismN*dot(prismN,prismAxis)+vec3(0.00001));
      float prismAngle=dot(prismLightDirection+prismV,prismT);
      float prismPhase=dot(vPrismPosition,prismAxis)*0.17+prismAngle*1.35;
      float prismBand=pow(0.5+0.5*cos(6.28318530718*prismPhase),5.0);
      vec3 prismTint=prismSpectrum(prismPhase*1.5+dot(prismN,prismV)*0.55);
      float prismReflect=0.25+0.75*pow(1.0-abs(dot(prismN,prismV)),0.6);
      outgoingLight=mix(outgoingLight,outgoingLight*prismTint*1.55,(0.16+0.66*prismBand)*prismReflect);
      #include <opaque_fragment>`);
    // Retain spectral saturation after HDR tone mapping, like a reflective foil card.
    shader.fragmentShader=shader.fragmentShader.replace('#include <tonemapping_fragment>',`#include <tonemapping_fragment>
      float prismCardMask=(0.12+0.78*prismBand)*(0.55+0.45*prismReflect);
      gl_FragColor.rgb=mix(gl_FragColor.rgb,gl_FragColor.rgb*prismTint+0.08*prismTint*prismBand,prismCardMask);
      float prismShine=pow(max(0.0,cos(6.28318530718*(prismPhase*0.70+0.25))),70.0);
      gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(1.0),prismShine*0.88);`);
  };
  material.customProgramCacheKey=()=> 'RAINBOW_PRISM_FOIL_R18';
  material.userData.prism_effect='view_and_light_dependent_diffraction';
  material.needsUpdate=true;
}
