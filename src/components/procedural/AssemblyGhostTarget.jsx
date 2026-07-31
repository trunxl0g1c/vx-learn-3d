import { useEffect } from "react";
import {
  applyStoredObjectTransform,
  normalizeStoredObjectTransform,
} from "../../engine/procedural";

function makeGhostMaterial(material) {
  const nextMaterial = material?.clone?.() || material;
  if (!nextMaterial) return nextMaterial;

  nextMaterial.transparent = true;
  nextMaterial.opacity = 0.22;
  nextMaterial.depthWrite = false;
  nextMaterial.wireframe = false;

  if (nextMaterial.color?.set) nextMaterial.color.set("#4dd9ff");
  if ("emissive" in nextMaterial && nextMaterial.emissive?.set) {
    nextMaterial.emissive.set("#0d6f86");
  }
  if ("emissiveIntensity" in nextMaterial) nextMaterial.emissiveIntensity = 0.7;

  return nextMaterial;
}

export default function AssemblyGhostTarget({
  object = null,
  targetTransform = null,
  visible = true,
}) {
  useEffect(() => {
    const normalizedTarget = normalizeStoredObjectTransform(targetTransform);
    const parent = object?.parent;

    if (!visible || !object || !parent || !normalizedTarget) return undefined;

    const ghost = object.clone(true);
    ghost.name = `__vx_assembly_ghost__${object.name || object.uuid}`;
    ghost.userData = {
      ...(ghost.userData || {}),
      __vxAssemblyGhost: true,
    };

    ghost.traverse?.((child) => {
      child.userData = {
        ...(child.userData || {}),
        __vxAssemblyGhost: true,
      };
      child.raycast = () => null;

      if (child.isMesh || child.isSkinnedMesh) {
        child.material = Array.isArray(child.material)
          ? child.material.map(makeGhostMaterial)
          : makeGhostMaterial(child.material);
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });

    applyStoredObjectTransform(ghost, normalizedTarget);
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
  }, [object, targetTransform, visible]);

  return null;
}
