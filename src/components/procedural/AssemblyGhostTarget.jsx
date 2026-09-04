import { useLayoutEffect } from "react";
import * as THREE from "three";
import { normalizeStoredObjectTransform } from "../../engine/procedural";

const GHOST_COLOR = "#4dd9ff";
const GHOST_EMISSIVE_COLOR = "#0d6f86";
const GHOST_RENDER_ORDER = 1000;

function makeGhostMaterial(material) {
  const nextMaterial = material?.clone?.() || material;
  if (!nextMaterial) return nextMaterial;

  nextMaterial.transparent = true;
  nextMaterial.opacity = 0.3;
  nextMaterial.depthTest = false;
  nextMaterial.depthWrite = false;
  nextMaterial.side = THREE.DoubleSide;
  nextMaterial.toneMapped = false;
  nextMaterial.wireframe = false;
  nextMaterial.polygonOffset = true;
  nextMaterial.polygonOffsetFactor = -4;
  nextMaterial.polygonOffsetUnits = -4;

  if (nextMaterial.color?.set) nextMaterial.color.set(GHOST_COLOR);
  if ("emissive" in nextMaterial && nextMaterial.emissive?.set) {
    nextMaterial.emissive.set(GHOST_EMISSIVE_COLOR);
  }
  if ("emissiveIntensity" in nextMaterial) nextMaterial.emissiveIntensity = 0.85;

  nextMaterial.needsUpdate = true;
  return nextMaterial;
}

function applyGhostTransform(ghost, transform) {
  ghost.position.fromArray(transform.position);
  ghost.rotation.set(...transform.rotation);
  ghost.scale.fromArray(transform.scale);
  ghost.updateMatrix?.();
  ghost.updateMatrixWorld?.(true);
}

function removeClonedInternalHelpers(ghost) {
  const helpers = [];

  ghost.traverse?.((child) => {
    if (child !== ghost && child.userData?.__vxInternal) helpers.push(child);
  });

  helpers.forEach((helper) => helper.parent?.remove(helper));
}

export default function AssemblyGhostTarget({
  object = null,
  targetTransform = null,
  visible = true,
  refreshKey = 0,
}) {
  useLayoutEffect(() => {
    const normalizedTarget = normalizeStoredObjectTransform(targetTransform);
    const parent = object?.parent;

    if (!visible || !object || !parent || !normalizedTarget) return undefined;

    const ghost = object.clone(true);
    removeClonedInternalHelpers(ghost);

    ghost.name = `__vx_assembly_ghost__${object.name || object.uuid}`;
    ghost.userData = {
      ...(ghost.userData || {}),
      __vxInternal: true,
      __vxAssemblyGhost: true,
    };
    ghost.visible = true;
    ghost.renderOrder = GHOST_RENDER_ORDER;
    ghost.frustumCulled = false;
    ghost.raycast = () => null;

    ghost.traverse?.((child) => {
      child.userData = {
        ...(child.userData || {}),
        __vxInternal: true,
        __vxAssemblyGhost: true,
      };
      child.visible = true;
      child.renderOrder = GHOST_RENDER_ORDER;
      child.frustumCulled = false;
      child.raycast = () => null;

      if (child.isMesh || child.isSkinnedMesh) {
        child.material = Array.isArray(child.material)
          ? child.material.map(makeGhostMaterial)
          : makeGhostMaterial(child.material);
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });

    // Apply the authored transform directly to the clone. Using the generic
    // procedural helper here can promote a generated primitive clone back to
    // its logical parent and move the real object instead of the ghost.
    applyGhostTransform(ghost, normalizedTarget);
    parent.add(ghost);
    ghost.updateMatrixWorld?.(true);

    return () => {
      parent.remove(ghost);
      ghost.traverse?.((child) => {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        materials.filter(Boolean).forEach((material) => material.dispose?.());
      });
    };
  }, [object, refreshKey, targetTransform, visible]);

  return null;
}
