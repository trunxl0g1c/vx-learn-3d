import * as THREE from "three";

const XRAY_COLOR = "#4fc3f7";
const XRAY_OPACITY = 0.22;

/**
 * Creates the lightweight material used by every Viqubed X-Ray path.
 *
 * X-Ray does not need volume, transmission, clearcoat, iridescence, or the
 * other branches compiled by MeshPhysicalMaterial. Keeping this material on
 * MeshStandardMaterial avoids unnecessary physical-shader variants and the
 * ANGLE compiler warnings those variants can produce on some Windows GPUs.
 */
export function createViqubedXrayMaterial() {
  const material = new THREE.MeshStandardMaterial({
    color: XRAY_COLOR,
    transparent: true,
    opacity: XRAY_OPACITY,
    roughness: 0.2,
    metalness: 0,
    depthWrite: false,
    depthTest: true,
  });

  material.name = "VIQUBED_XRAY_MATERIAL";
  material.userData = {
    ...(material.userData || {}),
    __viqubedGeneratedMaterial: true,
    __viqubedXrayMaterial: true,
  };

  return material;
}
