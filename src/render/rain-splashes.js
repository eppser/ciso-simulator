import * as THREE from 'three';
// A fixed GPU pool. Depth-testing hides rings beneath buildings and controls.
export class RainSplashes {
 constructor(scene){
  const count=220,geometry=new THREE.PlaneGeometry(1,1),phase=new Float32Array(count);
  for(let i=0;i<count;i++)phase[i]=(i*.61803398875)%1;
  geometry.setAttribute('phase',new THREE.InstancedBufferAttribute(phase,1));
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},
   vertexShader:`uniform float time;attribute float phase;varying vec2 vUv;varying float age;void main(){vUv=uv;age=fract(time*.65+phase*7.);vec3 p=position;p.xy*=.045+age*.23;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.);}`,
   fragmentShader:`varying vec2 vUv;varying float age;void main(){float d=length(vUv-.5)*2.;float ring=smoothstep(.77,.87,d)*(1.-smoothstep(.87,1.,d));gl_FragColor=vec4(.18,.28,.36,ring*pow(1.-age,3.)*.16);}`});
  this.mesh=new THREE.InstancedMesh(geometry,m,count);this.mesh.name='rain-impact-rings';this.mesh.userData.noAO=true;this.mesh.userData.noReflection=true;
  const d=new THREE.Object3D();d.rotation.x=-Math.PI/2;
  for(let i=0;i<count;i++){d.position.set(((i*1.618)%1)*31-.9,.001,((i*.754877)%1)*23-.8);d.updateMatrix();this.mesh.setMatrixAt(i,d.matrix);}
  this.mesh.frustumCulled=false;scene.add(this.mesh);
 }
 update(t){this.mesh.material.uniforms.time.value=t;}
}
