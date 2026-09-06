import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SAOPass } from 'three/addons/postprocessing/SAOPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GRID } from '../sim/grid.js';
import { THEMES, loadThemeId, loadFlag } from './themes.js';
import { skyTexture, noiseCanvas } from './textures.js';

// A gentle per-theme colour grade applied before tone mapping: shadow lift (cool at night,
// teal at dusk), highlight gain (warm at dusk) and a saturation trim.
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, lift: { value: new THREE.Vector3(0, 0, 0) }, gain: { value: new THREE.Vector3(1, 1, 1) }, sat: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; uniform vec3 lift; uniform vec3 gain; uniform float sat; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 x = c.rgb * gain + lift * (1.0 - clamp(c.rgb, 0.0, 1.0)); float l = dot(x, vec3(0.2126, 0.7152, 0.0722)); x = mix(vec3(l), x, sat); gl_FragColor = vec4(x, c.a); }',
};

// Renderer, camera rig, lights, sky, environment and post-processing. The camera is a
// constrained orbit: pan (drag, edge scroll, WASD), zoom toward the cursor (wheel), yaw/pitch
// (right/middle drag, Q/E/R/F), smooth tweens to presets. Themes change lights, fog, sky,
// exposure and the environment map live.
const HOME = { x: 12.2, z: 12.5, dist: 35.5, yaw: -0.48, pitch: 0.76 };
export const PRESETS = {
  command: { ...HOME },
  overview: { x: 11.7, z: 12.5, dist: 33, yaw: -0.35, pitch: 0.90 },
  perimeter: { x: 8, z: 10.5, dist: 26, yaw: 0.35, pitch: 0.85 },
  core: { x: 22, z: 9.5, dist: 26, yaw: -0.45, pitch: 0.9 },
};

// SAO renders the scene twice more (depth, normals) with an override material. Sprites and
// depth-test-free overlays (labels, icons, health bars) would land in those buffers as
// opaque quads and come back as black blocks, so they are hidden for those two renders only.
class OverlaySafeSAO extends SAOPass {
  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    const hidden = [];
    this.scene.traverse((o) => { if (o.visible && (o.isSprite || (o.material && o.material.depthTest === false) || o.userData.noAO)) { o.visible = false; hidden.push(o); } });
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    for (const o of hidden) o.visible = true;
  }
}

export class SceneRig {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.info.autoReset = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x121218);
    this.scene.fog = new THREE.FogExp2(0x121218, 0.012);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.5, 260);
    this.target = new THREE.Vector3(HOME.x, 0, HOME.z);
    this.dist = HOME.dist; this.yaw = HOME.yaw; this.pitch = HOME.pitch;
    this.minDist = 9; this.maxDist = 52;
    this.tween = null;
    this.vel = new THREE.Vector2(); // pan inertia

    this.hemi = new THREE.HemisphereLight(0xa0a8c0, 0x1c1c24, 1.3);
    this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xfff1e6, 2.6);
    this.key.position.set(-14, 26, 12);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(4096, 4096);
    const sc = this.key.shadow.camera;
    sc.left = -22; sc.right = 22; sc.top = 18; sc.bottom = -18; sc.near = 2; sc.far = 90;
    // Low sun angles (dusk/day) striped the ground with shadow acne; a larger normal bias cures it
    // at the cost of a hair of peter-panning on thin masts.
    this.key.shadow.bias = -0.0002; this.key.shadow.normalBias = 0.018; this.key.shadow.radius = 3;
    this.key.target.position.copy(this.target);
    this.scene.add(this.key, this.key.target);
    this.rim = new THREE.DirectionalLight(0xff5a50, 0.4);
    this.rim.position.set(30, 10, -20);
    this.scene.add(this.rim);
    // Sun disc for dusk/day.
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(3.2, 20, 12), new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false }));
    this.scene.add(this.sun);

    // Dusk light shafts: three long additive planes aligned with the sun, faded by noise.
    this.shafts = new THREE.Group();
    const shaftTex = new THREE.CanvasTexture(noiseCanvas(128, 7, 2, 2, 0, 255)); shaftTex.wrapS = shaftTex.wrapT = THREE.RepeatWrapping;
    for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(70, 9 + i * 5), new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0.025, alphaMap: shaftTex, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide, fog: false })); m.position.set(0, 8 + i * 4, -4 + i * 9); m.rotation.y = 0.25 * (i - 0.5); m.rotation.x = 0.12; m.userData.noAO = true; this.shafts.add(m); }
    this.scene.add(this.shafts);
    // Sky dome, inside-out sphere, per-theme gradient.
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, depthWrite: false }));
    this.sky.position.set(HOME.x, -20, HOME.z);
    this.scene.add(this.sky);

    // Environment map for reflections.
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTex = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTex;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.6, 0.93);
    this.composer.addPass(this.bloom);
    // SAO after bloom: the SAO pass blends onto the read buffer in place and the bloom pass
    // cannot read a buffer SAO has just written (measured: black frame), so AO multiplies the
    // bloomed image instead. Visually the difference is a slightly darker glow at contact edges.
    this.ao = new OverlaySafeSAO(this.scene, this.camera);
    this.ao.params.saoIntensity = 0.02; this.ao.params.saoScale = 24; this.ao.params.saoKernelRadius = 24; this.ao.params.saoBlur = true; this.ao.params.saoBlurRadius = 6; this.ao.params.saoBlurStdDev = 3;
    this.ao.enabled = loadFlag('dtw.ao', false);
    this.composer.addPass(this.ao);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.vignette = new ShaderPass(VignetteShader);
    this.vignette.uniforms.offset.value = 0.95; this.vignette.uniforms.darkness.value = 0.9;
    this.composer.addPass(this.vignette);
    this.composer.addPass(new OutputPass());
    this.smaa = new SMAAPass(1, 1);
    this.composer.addPass(this.smaa);

    this.theme = THEMES[loadThemeId()];
    this.themeListeners = [];
    this.applyTheme(this.theme);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.updateCamera();
  }
  onTheme(fn) { this.themeListeners.push(fn); fn(this.theme); }
  async loadCampusEnvironment(){
    const hdr=await new RGBELoader().loadAsync(`${import.meta.env.BASE_URL}environment/urban-courtyard-1k.hdr`);
    hdr.mapping=THREE.EquirectangularReflectionMapping;
    const target=this.pmrem.fromEquirectangular(hdr);this.scene.environment=target.texture;
    this.envTex.dispose();this.envTex=target.texture;hdr.dispose();this.scene.environmentRotation.y=.65;
  }
  setAO(on) { this.ao.enabled = on; }
  applyTheme(t) {
    this.theme = t;
    this.scene.background.set(t.bg);
    this.scene.fog.color.set(t.fogColor || t.bg); this.scene.fog.density = t.fogDensity || 0.012;
    this.hemi.color.set(t.hemi.sky); this.hemi.groundColor.set(t.hemi.ground); this.hemi.intensity = t.hemi.intensity;
    this.key.color.set(t.key.color); this.key.intensity = t.key.intensity; this.key.position.set(...t.key.pos);
    this.rim.color.set(t.rim.color); this.rim.intensity = t.rim.intensity; this.rim.position.set(...t.rim.pos);
    this.renderer.toneMappingExposure = t.exposure;
    this.bloom.strength = t.bloom;
    this.vignette.uniforms.darkness.value = t.vignette;
    this.scene.environmentIntensity = t.env;
    if (this.sky.material.map) this.sky.material.map.dispose();
    this.sky.material.map = skyTexture(t.sky); this.sky.material.needsUpdate = true;
    // Sun sits along the key light direction, far away.
    const d = new THREE.Vector3(...t.key.pos).normalize();
    this.sun.position.copy(this.target).addScaledVector(d, 170);
    this.sun.visible = t.id !== 'night';
    this.sun.material.color.set(t.id === 'dusk' ? 0xffb060 : 0xfff4dc);
    this.ao.params.saoIntensity = t.id === 'day' ? 0.03 : 0.02;
    const gr = t.grade || { lift: [0, 0, 0], gain: [1, 1, 1], sat: 1 };
    this.grade.uniforms.lift.value.set(...gr.lift); this.grade.uniforms.gain.value.set(...gr.gain); this.grade.uniforms.sat.value = gr.sat;
    this.shafts.visible = t.id === 'dusk';
    if (this.shafts.visible) { const d = new THREE.Vector3(...t.key.pos).normalize(); this.shafts.position.set(this.target.x, 0, this.target.z); this.shafts.lookAt(this.target.x + d.x * 40, d.y * 40, this.target.z + d.z * 40); }
    for (const fn of this.themeListeners) fn(t);
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    if(w<760){this.camera.setViewOffset(w,h,0,Math.min(160,h*.19),w,h);this.maxDist=130;if(this.dist<85){this.dist=110;this.target.set(14.5,0,10.5);this.pitch=1;this.yaw=-.1;}}
    else{this.camera.clearViewOffset();this.maxDist=52;if(this.dist>52){this.dist=52;this.target.set(HOME.x,0,HOME.z);this.pitch=HOME.pitch;this.yaw=HOME.yaw;}}
    this.camera.updateProjectionMatrix();
    this.updateCamera();
  }
  clampTarget() {
    this.target.x = THREE.MathUtils.clamp(this.target.x, 2, GRID.w + 1);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -2, GRID.h - 2);
  }
  updateCamera() {
    this.clampTarget();
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const x = this.target.x + this.dist * cp * Math.sin(this.yaw);
    const z = this.target.z + this.dist * cp * Math.cos(this.yaw);
    this.camera.position.set(x, this.target.y + this.dist * sp, z);
    this.camera.lookAt(this.target);
    // Shadow frustum follows the view so it stays tight.
    this.key.target.position.set(this.target.x, 0, this.target.z);
    this.key.position.set(this.target.x + this.theme.key.pos[0], this.theme.key.pos[1], this.target.z + this.theme.key.pos[2]);
    const half = 12 + this.dist * 0.42;
    const sc = this.key.shadow.camera;
    if (Math.abs(sc.right - half) > 0.5) { sc.left = -half; sc.right = half; sc.top = half * 0.85; sc.bottom = -half * 0.85; sc.updateProjectionMatrix(); }
  }
  pan(dx, dz) {
    this.tween = null;
    const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const r = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.target.addScaledVector(r, dx).addScaledVector(f, dz);
    this.updateCamera();
  }
  // Pan with inertia: velocity in camera-plane units per second, decays in update().
  fling(dx, dz) { this.vel.set(dx, dz); }
  zoom(k, toward = null) {
    this.tween = null;
    const before = this.dist;
    this.dist = THREE.MathUtils.clamp(this.dist * k, this.minDist, this.maxDist);
    if (toward && this.dist !== before) {
      const f = 1 - this.dist / before;
      this.target.x += (toward.x - this.target.x) * f;
      this.target.z += (toward.z - this.target.z) * f;
    }
    this.updateCamera();
  }
  rotate(dy, dp) {
    this.tween = null;
    this.yaw = THREE.MathUtils.clamp(this.yaw + dy, -1.3, 1.3);
    this.pitch = THREE.MathUtils.clamp(this.pitch + dp, 0.38, 1.45);
    this.updateCamera();
  }
  goTo(preset, seconds = 0.6) {
    const p = ['overview','command'].includes(preset)&&window.innerWidth<760?{x:14.5,z:10.5,dist:88,yaw:-.1,pitch:1}:typeof preset === 'string' ? PRESETS[preset] : preset;
    if (!p) return;
    this.vel.set(0, 0);
    this.tween = { t: 0, dur: seconds, from: { x: this.target.x, z: this.target.z, dist: this.dist, yaw: this.yaw, pitch: this.pitch }, to: { x: this.target.x, z: this.target.z, dist: this.dist, yaw: this.yaw, pitch: this.pitch, ...p } };
  }
  focus(x, z, dist = 16) { this.goTo({ x, z, dist }, 0.55); }
  home() { this.goTo('command'); }
  update(dt) {
    if (this.vel.lengthSq() > 1e-4) {
      const k = Math.exp(-dt / 0.28);
      this.pan(this.vel.x * dt, this.vel.y * dt);
      this.vel.multiplyScalar(k);
      if (this.vel.lengthSq() < 1e-4) this.vel.set(0, 0);
    }
    if (!this.tween) return;
    const tw = this.tween;
    tw.t += dt;
    const u = Math.min(1, tw.t / tw.dur);
    const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    const L = (a, b) => a + (b - a) * e;
    this.target.x = L(tw.from.x, tw.to.x); this.target.z = L(tw.from.z, tw.to.z);
    this.dist = L(tw.from.dist, tw.to.dist); this.yaw = L(tw.from.yaw, tw.to.yaw); this.pitch = L(tw.from.pitch, tw.to.pitch);
    this.updateCamera();
    if (u >= 1) this.tween = null;
  }
  render() { this.renderer.info.reset(); this.composer.render(); }
}
