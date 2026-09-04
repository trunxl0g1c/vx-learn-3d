import * as THREE from "three";

export const MORPH_ANIMATION_MODES = ["auto", "true", "cross"];

const EPSILON = 0.000001;

function clampProgress(value) {
  const numeric = Number(value);
  return THREE.MathUtils.clamp(Number.isFinite(numeric) ? numeric : 0, 0, 1);
}

function getMaterialArray(material) {
  return (Array.isArray(material) ? material : [material]).filter(Boolean);
}

function captureMaterialBindings(object) {
  const bindings = [];
  object?.traverse?.((child) => {
    if (!child?.material) return;
    bindings.push({
      object: child,
      originalMaterial: child.material,
      workingMaterial: null,
    });
  });
  return bindings;
}

function cloneMaterialValue(material) {
  if (Array.isArray(material)) return material.map((item) => item?.clone?.() || item);
  return material?.clone?.() || material;
}

function captureMaterialStatesFromBindings(bindings = []) {
  const states = [];
  const seen = new Set();
  bindings.forEach((binding) => {
    getMaterialArray(binding?.workingMaterial || binding?.object?.material).forEach(
      (material) => {
        if (!material || seen.has(material)) return;
        seen.add(material);
        states.push({
          material,
          opacity: Number.isFinite(Number(material.opacity))
            ? Number(material.opacity)
            : 1,
          transparent: material.transparent === true,
          depthWrite: material.depthWrite !== false,
        });
      },
    );
  });
  return states;
}

function ensureMaterialIsolation(morphState) {
  if (!morphState || morphState.materialsIsolated) return;
  [...(morphState.sourceMaterialBindings || []), ...(morphState.targetMaterialBindings || [])]
    .forEach((binding) => {
      if (!binding?.object || !binding.originalMaterial) return;
      binding.workingMaterial = cloneMaterialValue(binding.originalMaterial);
      binding.object.material = binding.workingMaterial;
    });
  morphState.sourceMaterialStates = captureMaterialStatesFromBindings(
    morphState.sourceMaterialBindings,
  );
  morphState.targetMaterialStates = captureMaterialStatesFromBindings(
    morphState.targetMaterialBindings,
  );
  morphState.materialsIsolated = true;
}

function restoreMaterialBindings(bindings = []) {
  bindings.forEach((binding) => {
    if (!binding?.object || !binding.originalMaterial) return;
    if (binding.object.material === binding.workingMaterial) {
      binding.object.material = binding.originalMaterial;
    }
    getMaterialArray(binding.workingMaterial).forEach((material) => material?.dispose?.());
    binding.workingMaterial = null;
  });
}

function restoreMaterialStates(states = []) {
  states.forEach((state) => {
    const material = state?.material;
    if (!material) return;
    const transparentChanged = material.transparent !== state.transparent;
    material.opacity = state.opacity;
    material.transparent = state.transparent;
    material.depthWrite = state.depthWrite;
    if (transparentChanged) material.needsUpdate = true;
  });
}

function applyMaterialMultiplier(states = [], multiplier = 1) {
  const alpha = THREE.MathUtils.clamp(Number(multiplier) || 0, 0, 1);
  states.forEach((state) => {
    const material = state?.material;
    if (!material) return;
    const baseOpacity = Number.isFinite(Number(state.opacity))
      ? Number(state.opacity)
      : 1;
    const nextOpacity = THREE.MathUtils.clamp(baseOpacity * alpha, 0, 1);
    const nextTransparent = state.transparent || nextOpacity < 0.999999;
    const transparentChanged = material.transparent !== nextTransparent;
    material.opacity = nextOpacity;
    material.transparent = nextTransparent;
    material.depthWrite = state.depthWrite && nextOpacity >= 0.999999;
    if (transparentChanged) material.needsUpdate = true;
  });
}

function collectMorphMeshes(root) {
  const meshes = [];
  root?.traverse?.((object) => {
    const position = object?.geometry?.attributes?.position;
    if (!object?.isMesh || !position || position.itemSize !== 3) return;
    meshes.push(object);
  });
  return meshes;
}

function indicesMatch(firstGeometry, secondGeometry) {
  const first = firstGeometry?.index?.array || null;
  const second = secondGeometry?.index?.array || null;
  if (!first && !second) return true;
  if (!first || !second || first.length !== second.length) return false;
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) return false;
  }
  return true;
}

function createTargetPositionArray(sourceRoot, targetRoot, sourceMesh, targetMesh) {
  sourceRoot.updateMatrixWorld?.(true);
  targetRoot.updateMatrixWorld?.(true);
  sourceMesh.updateMatrixWorld?.(true);
  targetMesh.updateMatrixWorld?.(true);

  const targetToSourceMesh = sourceMesh.matrixWorld
    .clone()
    .invert()
    .multiply(targetMesh.matrixWorld);
  const targetPosition = targetMesh.geometry.attributes.position;
  const output = new Float32Array(targetPosition.array.length);
  const point = new THREE.Vector3();

  for (let index = 0; index < targetPosition.count; index += 1) {
    point.fromBufferAttribute(targetPosition, index).applyMatrix4(targetToSourceMesh);
    const offset = index * 3;
    output[offset] = point.x;
    output[offset + 1] = point.y;
    output[offset + 2] = point.z;
  }

  return { output, targetToSourceMesh };
}

function createTargetNormalArray(sourceMesh, targetMesh, targetToSourceMesh) {
  const sourceNormal = sourceMesh.geometry?.attributes?.normal;
  const targetNormal = targetMesh.geometry?.attributes?.normal;
  if (
    !sourceNormal ||
    !targetNormal ||
    sourceNormal.itemSize !== 3 ||
    targetNormal.itemSize !== 3 ||
    sourceNormal.count !== targetNormal.count
  ) {
    return null;
  }

  const normalMatrix = new THREE.Matrix3().getNormalMatrix(targetToSourceMesh);
  const output = new Float32Array(targetNormal.array.length);
  const normal = new THREE.Vector3();

  for (let index = 0; index < targetNormal.count; index += 1) {
    normal.fromBufferAttribute(targetNormal, index).applyMatrix3(normalMatrix).normalize();
    const offset = index * 3;
    output[offset] = normal.x;
    output[offset + 1] = normal.y;
    output[offset + 2] = normal.z;
  }

  return output;
}

export function getMorphAnimationCompatibility(sourceObject, targetObject) {
  if (!sourceObject || !targetObject) {
    return {
      compatible: false,
      mode: "cross",
      reason: "Assign a target object",
      meshCount: 0,
    };
  }
  if (sourceObject === targetObject) {
    return {
      compatible: false,
      mode: "cross",
      reason: "Source and target must be different objects",
      meshCount: 0,
    };
  }

  let unsupported = false;
  sourceObject.traverse?.((object) => {
    if (object?.isSkinnedMesh || object?.isInstancedMesh) unsupported = true;
  });
  targetObject.traverse?.((object) => {
    if (object?.isSkinnedMesh || object?.isInstancedMesh) unsupported = true;
  });
  if (unsupported) {
    return {
      compatible: false,
      mode: "cross",
      reason: "Skinned/instanced mesh uses Cross Fade",
      meshCount: 0,
    };
  }

  const sourceMeshes = collectMorphMeshes(sourceObject);
  const targetMeshes = collectMorphMeshes(targetObject);
  if (sourceMeshes.length === 0 || targetMeshes.length === 0) {
    return {
      compatible: false,
      mode: "cross",
      reason: "Source or target has no mesh geometry",
      meshCount: 0,
    };
  }
  if (sourceMeshes.length !== targetMeshes.length) {
    return {
      compatible: false,
      mode: "cross",
      reason: `Mesh count differs (${sourceMeshes.length} vs ${targetMeshes.length})`,
      meshCount: Math.min(sourceMeshes.length, targetMeshes.length),
    };
  }

  for (let index = 0; index < sourceMeshes.length; index += 1) {
    const sourceGeometry = sourceMeshes[index].geometry;
    const targetGeometry = targetMeshes[index].geometry;
    const sourcePosition = sourceGeometry?.attributes?.position;
    const targetPosition = targetGeometry?.attributes?.position;
    if (
      sourcePosition?.isInterleavedBufferAttribute ||
      targetPosition?.isInterleavedBufferAttribute
    ) {
      return {
        compatible: false,
        mode: "cross",
        reason: `Interleaved geometry on mesh ${index + 1} uses Cross Fade`,
        meshCount: sourceMeshes.length,
      };
    }
    if (!sourcePosition || !targetPosition || sourcePosition.count !== targetPosition.count) {
      return {
        compatible: false,
        mode: "cross",
        reason: `Vertex count differs on mesh ${index + 1}`,
        meshCount: sourceMeshes.length,
      };
    }
    if (!indicesMatch(sourceGeometry, targetGeometry)) {
      return {
        compatible: false,
        mode: "cross",
        reason: `Topology differs on mesh ${index + 1}`,
        meshCount: sourceMeshes.length,
      };
    }
  }

  return {
    compatible: true,
    mode: "true",
    reason: "Topology compatible",
    meshCount: sourceMeshes.length,
  };
}

export function captureMorphAnimationBaseline(sourceObject, targetObject) {
  if (!sourceObject || !targetObject || sourceObject === targetObject) return null;

  const compatibility = getMorphAnimationCompatibility(sourceObject, targetObject);
  const sourceMeshes = collectMorphMeshes(sourceObject);
  const targetMeshes = collectMorphMeshes(targetObject);
  const meshPairs = compatibility.compatible
    ? sourceMeshes.map((sourceMesh, index) => {
        const targetMesh = targetMeshes[index];
        const sourcePosition = sourceMesh.geometry.attributes.position;
        const sourceNormal = sourceMesh.geometry.attributes.normal;
        const { output: targetPositions, targetToSourceMesh } =
          createTargetPositionArray(sourceObject, targetObject, sourceMesh, targetMesh);
        return {
          sourceMesh,
          targetMesh,
          originalGeometry: sourceMesh.geometry,
          workingGeometry: null,
          sourceFrustumCulled: sourceMesh.frustumCulled,
          sourcePositions: new Float32Array(sourcePosition.array),
          targetPositions,
          sourceNormals: sourceNormal ? new Float32Array(sourceNormal.array) : null,
          targetNormals: createTargetNormalArray(
            sourceMesh,
            targetMesh,
            targetToSourceMesh,
          ),
        };
      })
    : [];

  return {
    sourceObject,
    targetObject,
    sourceVisible: sourceObject.visible !== false,
    targetVisible: targetObject.visible !== false,
    sourceMaterialBindings: captureMaterialBindings(sourceObject),
    targetMaterialBindings: captureMaterialBindings(targetObject),
    sourceMaterialStates: [],
    targetMaterialStates: [],
    materialsIsolated: false,
    compatibility,
    meshPairs,
    resolvedMode: compatibility.compatible ? "true" : "cross",
  };
}

function ensureWorkingGeometry(pair) {
  if (!pair?.sourceMesh || !pair.originalGeometry) return null;
  if (!pair.workingGeometry) {
    pair.workingGeometry = pair.originalGeometry.clone();
  }
  if (pair.sourceMesh.geometry !== pair.workingGeometry) {
    pair.sourceMesh.geometry = pair.workingGeometry;
  }
  return pair.workingGeometry;
}

function applyTrueMorphGeometry(morphState, progress) {
  morphState.meshPairs.forEach((pair) => {
    const geometry = ensureWorkingGeometry(pair);
    const position = geometry?.attributes?.position;
    if (!position) return;

    const source = pair.sourcePositions;
    const target = pair.targetPositions;
    for (let index = 0; index < source.length; index += 1) {
      position.array[index] = THREE.MathUtils.lerp(source[index], target[index], progress);
    }
    position.needsUpdate = true;

    const normal = geometry.attributes?.normal;
    if (normal && pair.sourceNormals && pair.targetNormals) {
      const sourceNormal = pair.sourceNormals;
      const targetNormal = pair.targetNormals;
      const vector = new THREE.Vector3();
      for (let index = 0; index < normal.count; index += 1) {
        const offset = index * 3;
        vector.set(
          THREE.MathUtils.lerp(sourceNormal[offset], targetNormal[offset], progress),
          THREE.MathUtils.lerp(sourceNormal[offset + 1], targetNormal[offset + 1], progress),
          THREE.MathUtils.lerp(sourceNormal[offset + 2], targetNormal[offset + 2], progress),
        ).normalize();
        normal.array[offset] = vector.x;
        normal.array[offset + 1] = vector.y;
        normal.array[offset + 2] = vector.z;
      }
      normal.needsUpdate = true;
    }

    pair.sourceMesh.frustumCulled = false;
  });
}

function resolveRequestedMode(morphState, requestedMode) {
  const normalizedMode = MORPH_ANIMATION_MODES.includes(requestedMode)
    ? requestedMode
    : "auto";
  if (normalizedMode === "cross") return "cross";
  if (morphState?.compatibility?.compatible) return "true";
  return "cross";
}

export function applyMorphAnimationState(
  morphState,
  progressValue,
  requestedMode = "auto",
  options = {},
  opacityMultiplier = 1,
) {
  if (!morphState?.sourceObject || !morphState?.targetObject) return false;

  ensureMaterialIsolation(morphState);
  const progress = clampProgress(progressValue);
  const opacity = THREE.MathUtils.clamp(Number(opacityMultiplier) || 0, 0, 1);
  const hideSourceWhenComplete = options.hideSourceWhenComplete !== false;
  const hideTargetWhenStart = options.hideTargetWhenStart !== false;
  const mode = resolveRequestedMode(morphState, requestedMode);
  morphState.resolvedMode = mode;

  if (mode === "true") {
    applyTrueMorphGeometry(morphState, progress);
    const complete = progress >= 1 - EPSILON;
    morphState.sourceObject.visible = complete && hideSourceWhenComplete
      ? false
      : morphState.sourceVisible;
    morphState.targetObject.visible = complete && hideSourceWhenComplete
      ? true
      : hideTargetWhenStart
        ? false
        : morphState.targetVisible;
    applyMaterialMultiplier(morphState.sourceMaterialStates, opacity);
    if (complete && hideSourceWhenComplete) {
      applyMaterialMultiplier(morphState.targetMaterialStates, opacity);
    } else {
      restoreMaterialStates(morphState.targetMaterialStates);
    }
    return true;
  }

  const sourceAlpha = opacity * (1 - progress);
  const targetAlpha = opacity * progress;
  morphState.sourceObject.visible =
    progress >= 1 - EPSILON && hideSourceWhenComplete
      ? false
      : morphState.sourceVisible;
  morphState.targetObject.visible =
    progress <= EPSILON && hideTargetWhenStart
      ? false
      : true;
  applyMaterialMultiplier(morphState.sourceMaterialStates, sourceAlpha);
  applyMaterialMultiplier(morphState.targetMaterialStates, targetAlpha);
  return true;
}

export function restoreMorphAnimationBaseline(morphState) {
  if (!morphState) return false;

  morphState.meshPairs?.forEach((pair) => {
    if (!pair?.sourceMesh || !pair.originalGeometry) return;
    if (pair.sourceMesh.geometry === pair.workingGeometry) {
      pair.sourceMesh.geometry = pair.originalGeometry;
    }
    pair.workingGeometry?.dispose?.();
    pair.workingGeometry = null;
    pair.sourceMesh.frustumCulled = pair.sourceFrustumCulled;
  });

  if (morphState.sourceObject) {
    morphState.sourceObject.visible = morphState.sourceVisible;
  }
  if (morphState.targetObject) {
    morphState.targetObject.visible = morphState.targetVisible;
  }
  restoreMaterialBindings(morphState.sourceMaterialBindings);
  restoreMaterialBindings(morphState.targetMaterialBindings);
  morphState.sourceMaterialStates = [];
  morphState.targetMaterialStates = [];
  morphState.materialsIsolated = false;
  return true;
}
