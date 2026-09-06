import {STORM_LOOK} from './storm-look.js';

// One planar reflection, broken into pools, wind streaks and rain rings.
// Below lane paint/footprint bases; tactical overlays are excluded by Campus.
export function dressWetGround(reflector){
 const m=reflector.material;
 Object.assign(m.uniforms,{stormTime:{value:0},coverage:{value:STORM_LOOK.wetCoverage},reflection:{value:STORM_LOOK.reflection},distortion:{value:STORM_LOOK.distortion},ripple:{value:STORM_LOOK.ripple}});
 m.transparent=true;m.depthWrite=false;
 m.vertexShader=m.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv;varying vec2 floorUv;varying vec3 floorWorld;').replace('vUv = textureMatrix','floorUv=position.xy;floorWorld=(modelMatrix*vec4(position,1.)).xyz;vUv = textureMatrix');
 m.fragmentShader=m.fragmentShader.replace('varying vec4 vUv;',`varying vec4 vUv;varying vec2 floorUv;varying vec3 floorWorld;
 uniform float stormTime,coverage,reflection,distortion,ripple;
 float wetHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float wetNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(wetHash(i),wetHash(i+vec2(1,0)),f.x),mix(wetHash(i+vec2(0,1)),wetHash(i+vec2(1,1)),f.x),f.y);}
 `).replace('vec4 base = texture2DProj( tDiffuse, vUv );',`
 vec2 p=floorUv;float n=wetNoise(p*.48)*.65+wetNoise(p*1.31)*.25+wetNoise(p*3.4)*.1;
 float wet=smoothstep(1.-coverage-.22,1.-coverage+.19,n);
 vec2 cell=floor(p*2.7),local=fract(p*2.7)-.5;float seed=wetHash(cell);
 float age=fract(stormTime*.73+seed*13.);float r=length(local);
 float ring=sin((r-age*.7)*58.)*exp(-abs(r-age*.7)*24.)*(1.-age);
 vec2 drift=vec2(sin(p.y*7.+stormTime*.6),cos(p.x*8.-stormTime*.45));
 vec2 wobble=drift*distortion+normalize(local+vec2(.001))*ring*ripple*.04;
 vec4 projected=vUv;projected.xy+=wobble*projected.w;
 vec4 base = texture2DProj(tDiffuse,projected);
 `).replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );',`
 float fresnel=pow(1.-abs(normalize(cameraPosition-floorWorld).y),3.);
 vec3 reflected=base.rgb*mix(.72,1.1,wet);
 float alpha=mix(.065,reflection,wet)*(.8+fresnel*.35);
 gl_FragColor=vec4(reflected+vec3(.09,.12,.14)*max(0.,ring)*wet*ripple,alpha);
 `);
 m.needsUpdate=true;
 return {configure(look){for(const [key,name]of [['wetCoverage','coverage'],['reflection','reflection'],['distortion','distortion'],['ripple','ripple']])if(look[key]!=null)m.uniforms[name].value=look[key];},update(t){m.uniforms.stormTime.value=t;}};
}
export function wetAsphaltMaterial(m){m.roughness=.24;m.metalness=.18;m.color.set(0x72808a);m.normalScale.set(.13,.13);return m;}
