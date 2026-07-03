import * as THREE from "three"
import { createChapterHighlightPayload } from "../selection"

export function createSceneBounds(scene) {
  if (!scene) return null

  scene.updateMatrixWorld(true)

  const box = new THREE.Box3().setFromObject(scene)

  return {
    x: { min: box.min.x, max: box.max.x },
    y: { min: box.min.y, max: box.max.y },
    z: { min: box.min.z, max: box.max.z },
  }
}

export function getCutStateForAxis(bounds, axis = "x") {
  const axisBounds = bounds?.[axis]

  if (!axisBounds) return null

  return {
    min: axisBounds.min,
    max: axisBounds.max,
    value: (axisBounds.min + axisBounds.max) / 2,
  }
}

export function initializeModelScene(scene, viewerSettings = {}) {
  if (!scene) {
    return {
      originalPositions: [],
      originalGroupPositions: [],
    }
  }

  const originalPositions = []
  const originalGroupPositions = []

  scene.traverse((child) => {
    originalGroupPositions.push({
      object: child,
      position: child.position.clone(),
      rotation: child.rotation.clone(),
    })

    if (child.isMesh) {
      child.material = child.material.clone()
      child.userData.originalMaterial = child.material

      originalPositions.push({
        object: child,
        position: child.position.clone(),
      })

      child.material.envMapIntensity = viewerSettings.envIntensity ?? 3
      child.material.needsUpdate = true
    }
  })

  return {
    originalPositions,
    originalGroupPositions,
  }
}

export function applyModelShaderMode(scene, settings = {}) {
  if (!scene || !settings) return

  scene.traverse((child) => {
    if (!child.isMesh || !child.material) return

    if (!child.userData.originalMaterial) {
      child.userData.originalMaterial = child.material.clone()
    }

    const original = child.userData.originalMaterial

    if (settings.shaderMode === "original") {
      child.material = original.clone()
    }

    if (settings.shaderMode === "enhanced") {
      child.material = original.clone()

      if ("envMapIntensity" in child.material) {
        child.material.envMapIntensity = settings.envIntensity ?? 3
      }

      if ("metalness" in child.material) {
        child.material.metalness =
          (original.metalness ?? 1) * (settings.metalness ?? 0.3)
      }

      if ("roughness" in child.material) {
        child.material.roughness =
          (original.roughness ?? 1) * (settings.roughness ?? 0.8)
      }
    }

    if (settings.shaderMode === "wireframe") {
      child.material = original.clone()
      child.material.wireframe = true
    }

    if (settings.shaderMode === "toon") {
      child.material = new THREE.MeshToonMaterial({
        color: original.color || new THREE.Color("#ffffff"),
      })
    }

    if (settings.shaderMode === "xray") {
      child.material = new THREE.MeshPhysicalMaterial({
        color: "#4fc3f7",
        transparent: true,
        opacity: 0.22,
        roughness: 0.2,
        metalness: 0,
        depthWrite: false,
      })
    }

    if (settings.shaderMode === "clay") {
      child.material = new THREE.MeshStandardMaterial({
        color: "#c9b8a4",
        roughness: 1,
        metalness: 0,
      })
    }

    child.material.needsUpdate = true
  })
}

export function createChapterFocusTarget(chapter) {
  if (!chapter?.cameraPosition || !chapter?.cameraTarget) return null

  return {
    cameraPosition: new THREE.Vector3(
      chapter.cameraPosition[0],
      chapter.cameraPosition[1],
      chapter.cameraPosition[2]
    ),
    target: new THREE.Vector3(
      chapter.cameraTarget[0],
      chapter.cameraTarget[1],
      chapter.cameraTarget[2]
    ),
  }
}

export function applyChapterModelRotation(scene, chapter) {
  if (!scene || !chapter?.modelRotation) return

  scene.rotation.set(
    chapter.modelRotation[0],
    chapter.modelRotation[1],
    chapter.modelRotation[2]
  )
}

export function initializePlayerModelScene({
  scene,
  material,
  viewerSettings,
  cutAxis = "x",
}) {
  if (!scene) {
    return {
      cutBounds: null,
      cutState: null,
      originalPositions: [],
      originalGroupPositions: [],
      firstChapter: null,
      chapterHighlight: {
        selectedObject: null,
        outlineObjects: [],
      },
      focusTarget: null,
    }
  }

  const cutBounds = createSceneBounds(scene)
  const cutState = getCutStateForAxis(cutBounds, cutAxis)
  const modelState = initializeModelScene(scene, viewerSettings)

  applyModelShaderMode(scene, viewerSettings)

  const firstChapter = material?.chapters?.[0] || null

  if (firstChapter) {
    applyChapterModelRotation(scene, firstChapter)
  }

  return {
    cutBounds,
    cutState,
    originalPositions: modelState.originalPositions,
    originalGroupPositions: modelState.originalGroupPositions,
    firstChapter,
    chapterHighlight: createChapterHighlightPayload(firstChapter, scene),
    focusTarget: createChapterFocusTarget(firstChapter),
  }
}
