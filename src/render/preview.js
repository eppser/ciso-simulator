import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ORGS } from '../sim/orgs.js';
import { buildMap } from './map.js';
import { AssetView, attachAssetLayers } from './assets.js';
import { THEMES } from './themes.js';

// Renders one organisation's campus to a PNG data URL from a cinematic three-quarter angle,
// for the company cards on the start screen. A second, small, cached renderer draws into an
// offscreen canvas so the live scene, its renderer state and its shared instanced layers are
// left exactly as they were. Everything built for the shot is disposed afterwards.
let pr = null, env = null;
function previewRenderer() {
  if (pr) return pr;
  const canvas = document.createElement('canvas');
  pr = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  pr.setPixelRatio(1);
  pr.shadowMap.enabled = true; pr.shadowMap.type = THREE.PCFSoftShadowMap;
  pr.toneMapping = THREE.ACESFilmicToneMapping; pr.toneMappingExposure = 1.55;
  const pm = new THREE.PMREMGenerator(pr);
  env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  return pr;
}

export function renderOrgPreview(app, orgId, width = 640, height = 400) {
  const org = ORGS[orgId];
  if (!org) return null;
  const renderer = previewRenderer();
  renderer.setSize(width, height, false);
  const scene = new THREE.Scene();
  const theme = THEMES.dusk;
  scene.background = new THREE.Color(0x2a1a1c);
  scene.fog = new THREE.FogExp2(0x3a2a30, 0.012);
  scene.environment = env; scene.environmentIntensity = 0.7;
  const hemi = new THREE.HemisphereLight(0xffd3b0, 0x3a2820, 1.1); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffb878, 3.4); key.position.set(-26, 12, 10); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); const sc = key.shadow.camera; sc.left = -24; sc.right = 24; sc.top = 20; sc.bottom = -20; sc.near = 2; sc.far = 90; key.shadow.bias = -0.0012; key.shadow.normalBias = 0.09;
  key.target.position.set(15, 0, 10); scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x8fa4ff, 2.2); rim.position.set(30, 14, -20); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xffd8b0, 1.2); rim2.position.set(10, 20, 30); scene.add(rim2);

  // Map and buildings from the live builders; the shared asset layers are re-homed afterwards.
  const map = buildMap(scene, null);
  map.applyTheme(theme);
  const views = [];
  for (const tpl of org.assets) {
    const asset = { ...tpl, discovered: true, state: 'ok', integrity: 100, knownVulns: null, vulns: new Set(), job: null, threats: [] };
    views.push(new AssetView(asset, scene));
  }
  for (const v of views) { v.sync(1.7, false, theme); if (v.label) v.label.visible = false; }
  map.update(1.7);
  scene.traverse((o) => { if (o.isSprite) o.visible = false; });
  // The shared instanced layers (rings/spin) were attached to this scene by the views; give
  // them back to the live scene before rendering so nothing is stolen from it.
  attachAssetLayers(app.rig.scene);
  // Portals' labels and the shared ring layers are out of the shot; the gate lights stay.

  const cam = new THREE.PerspectiveCamera(34, width / height, 0.5, 200);
  const cx = 15.5, cz = 10.5, dist = 30, yaw = 0.62, pitch = 0.62;
  cam.position.set(cx + dist * Math.cos(pitch) * Math.sin(yaw), dist * Math.sin(pitch), cz + dist * Math.cos(pitch) * Math.cos(yaw));
  cam.lookAt(cx, 0.6, cz);
  renderer.setClearColor(0x2a1a1c, 1);
  renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL('image/png');

  // Tear down: geometries and per-view materials; shared materials stay.
  scene.traverse((o) => { if (o.geometry && !o.isInstancedMesh) o.geometry.dispose(); if (o.isSprite && o.material && o.material.map) { /* cached label textures are shared; keep */ } });
  for (const v of views) { scene.remove(v.group); }
  scene.clear();
  return url;
}
