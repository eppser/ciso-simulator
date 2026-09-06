// One fixed production look, shared with the Blender review.
export const STORM_LOOK = Object.freeze({
 cloudOpacity:.74, cloudScale:1.08, cloudLight:.34, cloudSpeed:.032,
 wetCoverage:.66, reflection:.60, distortion:.0007, ripple:.025,
 exposure:1.1, key:3.2, fill:.9, rim:1.35, bloom:.26,
});
export function applyStormLight(rig,look=STORM_LOOK){
 rig.renderer.toneMappingExposure=look.exposure;
 rig.key.intensity=look.key;rig.hemi.intensity=look.fill;
 rig.rim.color.set(0x91bed5);rig.rim.intensity=look.rim;
 rig.scene.environmentIntensity=.9;
 rig.scene.fog.color.set(0x111b25);rig.scene.fog.density=.006;
 rig.bloom.strength=look.bloom;rig.vignette.uniforms.darkness.value=1.0;
}
