import * as THREE from "three"

const DEFAULT_SHADER_MODE = "original"
const SUPPORTED_SHADER_MODES = new Set([
  "original",
  "toon",
  "wireframe",
  "xray",
  "clay",
  "2d",
  "sketch",
])

const SKETCH_EDGE_OBJECT_NAME = "__VX_SKETCH_EDGE__"
const SKETCH_EDGE_CACHE_KEY = "__vxSketchEdgeOverlay"
const SKETCH_MATERIAL_CACHE_KEY = "__vxSketchMaterialCache"
const DEFAULT_SKETCH_EDGE_THRESHOLD = 12
const DEFAULT_SKETCH_LINE_COLOR = "#181818"
const DEFAULT_SKETCH_SURFACE_COLOR = "#f4f2eb"

export function normalizeShaderMode(mode) {
  const normalizedMode = mode === "enhanced" ? DEFAULT_SHADER_MODE : mode

  return SUPPORTED_SHADER_MODES.has(normalizedMode)
    ? normalizedMode
    : DEFAULT_SHADER_MODE
}

function getMaterialList(material) {
  if (!material) return []

  return Array.isArray(material) ? material.filter(Boolean) : [material]
}

export function cloneModelMaterial(material) {
  if (Array.isArray(material)) {
    return material.map((item) => item?.clone?.() || item)
  }

  return material?.clone?.() || material
}

function mapMaterial(originalMaterial, factory) {
  if (Array.isArray(originalMaterial)) {
    return originalMaterial.map((item) => factory(item))
  }

  return factory(originalMaterial)
}

function disposeMaterial(material) {
  getMaterialList(material).forEach((item) => item?.dispose?.())
}

function markMaterialAsCached(material) {
  getMaterialList(material).forEach((item) => {
    if (!item) return
    item.userData = item.userData || {}
    item.userData.__vxCachedShaderMaterial = true
  })

  return material
}

function disposeGeneratedMaterial(material) {
  getMaterialList(material).forEach((item) => {
    if (!item?.userData?.__vxCachedShaderMaterial) {
      item?.dispose?.()
    }
  })
}

export function releaseGeneratedModelMaterial(mesh) {
  if (!mesh?.userData?.__vxGeneratedShaderMaterial) return false

  // Cached Sketch materials are reused after X-Ray and mode changes. Disposing
  // them here would force every selection/reset to allocate them again.
  disposeGeneratedMaterial(mesh.material)
  mesh.userData.__vxGeneratedShaderMaterial = false
  return true
}

export function captureOriginalModelMaterial(mesh) {
  if (!mesh?.material) return null

  if (!mesh.userData.originalMaterial) {
    mesh.userData.originalMaterial = cloneModelMaterial(mesh.material)
  }

  return mesh.userData.originalMaterial
}

function applyPbrSettings(material, settings = {}) {
  const envIntensity = Number.isFinite(Number(settings.envIntensity))
    ? Number(settings.envIntensity)
    : 0.8
  const metalness = Number.isFinite(Number(settings.metalness))
    ? Number(settings.metalness)
    : 0.1
  const roughness = Number.isFinite(Number(settings.roughness))
    ? Number(settings.roughness)
    : 0.1

  getMaterialList(material).forEach((item) => {
    if (!item) return

    if ("envMapIntensity" in item) {
      item.envMapIntensity = envIntensity
    }

    if ("metalness" in item) {
      item.metalness = metalness
    }

    if ("roughness" in item) {
      item.roughness = roughness
    }

    item.needsUpdate = true
  })
}

function copyCommonSurfaceProperties(source, target) {
  if (!source || !target) return target

  const copyKeys = [
    "name",
    "map",
    "alphaMap",
    "aoMap",
    "lightMap",
    "lightMapIntensity",
    "transparent",
    "opacity",
    "alphaTest",
    "side",
    "shadowSide",
    "vertexColors",
    "depthTest",
    "depthWrite",
    "blending",
    "blendSrc",
    "blendDst",
    "blendEquation",
    "premultipliedAlpha",
    "dithering",
    "fog",
    "visible",
  ]

  copyKeys.forEach((key) => {
    if (key in source && key in target) {
      target[key] = source[key]
    }
  })

  if (source.color && target.color) {
    target.color.copy(source.color)
  }

  return target
}

function createToonMaterial(source) {
  return copyCommonSurfaceProperties(
    source,
    new THREE.MeshToonMaterial({
      color: source?.color || new THREE.Color("#ffffff"),
      map: source?.map || null,
    }),
  )
}

function createXrayMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: "#4fc3f7",
    transparent: true,
    opacity: 0.22,
    roughness: 0.2,
    metalness: 0,
    depthWrite: false,
    depthTest: true,
  })
}

function createClayMaterial(source) {
  const material = new THREE.MeshStandardMaterial({
    color: "#c9b8a4",
    roughness: 1,
    metalness: 0,
  })

  if (source && "side" in source) material.side = source.side
  if (source && "vertexColors" in source) material.vertexColors = source.vertexColors

  return material
}

function createFlat2DMaterial(source) {
  const material = new THREE.MeshBasicMaterial({
    color: source?.color || new THREE.Color("#ffffff"),
    map: source?.map || null,
  })

  copyCommonSurfaceProperties(source, material)

  // Flat illustration mode should keep texture/color information but should
  // not be altered by scene lighting or ACES tone mapping.
  material.toneMapped = false
  material.needsUpdate = true

  return material
}

function createSketchMaterial(source) {
  const material = new THREE.MeshBasicMaterial({
    color: DEFAULT_SKETCH_SURFACE_COLOR,
  })

  copyCommonSurfaceProperties(source, material)

  // Technical sketch mode keeps only transparency/cutout properties from the
  // GLB. Realistic textures and PBR lighting are removed so geometry edges can
  // become the primary visual information.
  material.map = null
  material.alphaMap = source?.alphaMap || null
  material.aoMap = null
  material.lightMap = null
  material.color = new THREE.Color(DEFAULT_SKETCH_SURFACE_COLOR)
  material.vertexColors = false
  material.blending = THREE.NormalBlending
  material.premultipliedAlpha = false
  material.transparent = Boolean(source?.transparent)
  material.opacity = source?.opacity ?? 1
  material.depthWrite = source?.depthWrite ?? true
  material.depthTest = source?.depthTest ?? true
  material.toneMapped = false

  // Push the fill very slightly behind the generated line geometry. This
  // avoids z-fighting and keeps the technical lines visible.
  material.polygonOffset = true
  material.polygonOffsetFactor = 1
  material.polygonOffsetUnits = 1
  material.needsUpdate = true

  return material
}

function clampSketchThreshold(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_SKETCH_EDGE_THRESHOLD
  }

  return Math.min(60, Math.max(1, numericValue))
}

function getSketchMaterialSignature(originalMaterial) {
  return getMaterialList(originalMaterial)
    .map((material) => material?.uuid || "material")
    .join("|")
}

function getOrCreateSketchMaterial(mesh, originalMaterial) {
  const signature = getSketchMaterialSignature(originalMaterial)
  const cached = mesh?.userData?.[SKETCH_MATERIAL_CACHE_KEY]

  if (cached?.signature === signature && cached.material) {
    return cached.material
  }

  if (cached?.material) {
    disposeMaterial(cached.material)
  }

  const material = markMaterialAsCached(
    mapMaterial(originalMaterial, createSketchMaterial),
  )

  mesh.userData[SKETCH_MATERIAL_CACHE_KEY] = {
    signature,
    material,
  }

  return material
}

function getSketchEdgeSignature(mesh, settings = {}) {
  return [
    mesh?.geometry?.uuid || "geometry",
    clampSketchThreshold(settings.sketchEdgeThreshold),
  ].join(":")
}

function updateSketchEdgeMaterial(edgeObject, settings = {}) {
  const material = edgeObject?.material
  if (!material) return

  material.color?.set?.(
    settings.sketchLineColor || DEFAULT_SKETCH_LINE_COLOR,
  )
  material.opacity = Number.isFinite(Number(settings.sketchLineOpacity))
    ? Math.min(1, Math.max(0.1, Number(settings.sketchLineOpacity)))
    : 0.92
  material.needsUpdate = true
}

function removeSketchEdgeOverlay(edgeObject) {
  if (!edgeObject?.userData?.__vxSketchEdge) return

  const owner = edgeObject.parent

  owner?.remove?.(edgeObject)
  edgeObject.geometry?.dispose?.()
  edgeObject.material?.dispose?.()
  edgeObject.onBeforeRender = null

  if (owner?.userData?.[SKETCH_EDGE_CACHE_KEY] === edgeObject) {
    delete owner.userData[SKETCH_EDGE_CACHE_KEY]
  }
}

export function setSketchEdgeOverlaysVisible(scene, visible) {
  if (!scene) return 0

  let count = 0

  scene.traverse((object) => {
    if (!object?.userData?.__vxSketchEdge) return

    object.visible = Boolean(visible)
    count += 1
  })

  return count
}


export function syncSketchEdgeVisibility(scene) {
  return setSketchEdgeOverlaysVisible(
    scene,
    scene?.userData?.__vxShaderMode === "sketch",
  )
}

export function clearSketchEdgeOverlays(scene) {
  if (!scene) return 0

  const overlays = []

  scene.traverse((object) => {
    if (object?.userData?.__vxSketchEdge) {
      overlays.push(object)
    }
  })

  overlays.forEach(removeSketchEdgeOverlay)
  return overlays.length
}

function getOrCreateSketchEdgeOverlay(mesh, settings = {}) {
  if (
    !mesh?.isMesh ||
    mesh.isSkinnedMesh ||
    mesh.isInstancedMesh ||
    !mesh.geometry?.attributes?.position
  ) {
    return null
  }

  const signature = getSketchEdgeSignature(mesh, settings)
  const cached = mesh.userData?.[SKETCH_EDGE_CACHE_KEY]

  if (cached?.userData?.__vxSketchEdge) {
    if (cached.userData.__vxSketchSignature === signature) {
      updateSketchEdgeMaterial(cached, settings)
      cached.visible = true
      return cached
    }

    removeSketchEdgeOverlay(cached)
  }

  const thresholdAngle = clampSketchThreshold(settings.sketchEdgeThreshold)
  const edgeGeometry = new THREE.EdgesGeometry(mesh.geometry, thresholdAngle)
  const edgePosition = edgeGeometry.getAttribute("position")

  if (!edgePosition || edgePosition.count === 0) {
    edgeGeometry.dispose()
    return null
  }

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: settings.sketchLineColor || DEFAULT_SKETCH_LINE_COLOR,
    transparent: true,
    opacity: Number.isFinite(Number(settings.sketchLineOpacity))
      ? Math.min(1, Math.max(0.1, Number(settings.sketchLineOpacity)))
      : 0.92,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  })

  const edgeObject = new THREE.LineSegments(edgeGeometry, edgeMaterial)
  edgeObject.name = SKETCH_EDGE_OBJECT_NAME
  edgeObject.userData.__vxInternal = true
  edgeObject.userData.__vxSketchEdge = true
  edgeObject.userData.__vxSketchSignature = signature
  edgeObject.renderOrder = 20
  edgeObject.frustumCulled = mesh.frustumCulled

  // Edge overlays are visual helpers only and must never become raycast/tool
  // targets in Editor or Player.
  edgeObject.raycast = () => null

  // Keep clipping behavior aligned with the active mesh material so Cut still
  // works while Sketch mode is active.
  edgeObject.onBeforeRender = () => {
    const sourceMaterial = getMaterialList(mesh.material).find(Boolean)
    const nextClippingPlanes = sourceMaterial?.clippingPlanes || null

    if (edgeMaterial.clippingPlanes !== nextClippingPlanes) {
      edgeMaterial.clippingPlanes = nextClippingPlanes
      edgeMaterial.needsUpdate = true
    }

    edgeMaterial.clipIntersection = Boolean(sourceMaterial?.clipIntersection)
    edgeMaterial.clipShadows = Boolean(sourceMaterial?.clipShadows)
  }

  mesh.add(edgeObject)
  mesh.userData[SKETCH_EDGE_CACHE_KEY] = edgeObject
  return edgeObject
}

function createShaderMaterial(originalMaterial, mode, settings = {}) {
  if (mode === "wireframe") {
    const material = cloneModelMaterial(originalMaterial)

    getMaterialList(material).forEach((item) => {
      if ("wireframe" in item) item.wireframe = true
    })

    applyPbrSettings(material, settings)
    return material
  }

  if (mode === "toon") {
    return mapMaterial(originalMaterial, createToonMaterial)
  }

  if (mode === "xray") {
    return mapMaterial(originalMaterial, createXrayMaterial)
  }

  if (mode === "clay") {
    return mapMaterial(originalMaterial, createClayMaterial)
  }

  if (mode === "2d") {
    return mapMaterial(originalMaterial, createFlat2DMaterial)
  }

  const material = cloneModelMaterial(originalMaterial)
  applyPbrSettings(material, settings)
  return material
}

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
      const originalMaterial = captureOriginalModelMaterial(child)

      if (originalMaterial) {
        child.material = cloneModelMaterial(originalMaterial)
        applyPbrSettings(child.material, viewerSettings)
      }

      originalPositions.push({
        object: child,
        position: child.position.clone(),
      })
    }
  })

  return {
    originalPositions,
    originalGroupPositions,
  }
}

export function applyModelShaderMode(scene, settings = {}) {
  const shaderMode = normalizeShaderMode(settings?.shaderMode)
  const shaderOutlineObjects = []
  const shaderOutlineStyle =
    shaderMode === "sketch"
      ? "sketch"
      : shaderMode === "2d"
        ? "2d"
        : null

  if (!scene) {
    return {
      shaderMode,
      outlineObjects: shaderOutlineObjects,
      outlineStyle: null,
    }
  }

  scene.userData.__vxShaderMode = shaderMode

  // Sketch resources are cached on each mesh. Mode changes only toggle their
  // visibility; expensive EdgesGeometry generation happens once per geometry.
  setSketchEdgeOverlaysVisible(scene, shaderMode === "sketch")

  const meshes = []

  scene.traverse((child) => {
    if (
      child.isMesh &&
      child.material &&
      !child.userData?.__vxInternal
    ) {
      meshes.push(child)
    }
  })

  meshes.forEach((child) => {
    const originalMaterial = captureOriginalModelMaterial(child)
    if (!originalMaterial) return

    const nextMaterial =
      shaderMode === "sketch"
        ? getOrCreateSketchMaterial(child, originalMaterial)
        : createShaderMaterial(originalMaterial, shaderMode, settings)

    if (child.material !== nextMaterial) {
      releaseGeneratedModelMaterial(child)
      child.material = nextMaterial
    }

    child.userData.__vxGeneratedShaderMaterial = true
    child.renderOrder = 0

    getMaterialList(child.material).forEach((material) => {
      if (material) material.needsUpdate = true
    })

    if (shaderMode === "sketch") {
      getOrCreateSketchEdgeOverlay(child, settings)
    }

    // Sketch uses cached LineSegments for technical edges. Running the
    // full-screen post-processing Outline over the entire model would add a
    // substantial per-frame GPU cost and is unnecessary.
    if (shaderMode === "2d") {
      shaderOutlineObjects.push(child)
    }
  })

  return {
    shaderMode,
    outlineObjects: shaderOutlineObjects,
    outlineStyle: shaderOutlineStyle,
  }
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
      shaderOutlineObjects: [],
      focusTarget: null,
    }
  }

  const cutBounds = createSceneBounds(scene)
  const cutState = getCutStateForAxis(cutBounds, cutAxis)
  const modelState = initializeModelScene(scene, viewerSettings)
  const shaderState = applyModelShaderMode(scene, viewerSettings)

  return {
    cutBounds,
    cutState,
    originalPositions: modelState.originalPositions,
    originalGroupPositions: modelState.originalGroupPositions,
    firstChapter: null,
    chapterHighlight: {
      selectedObject: null,
      outlineObjects: [],
    },
    shaderOutlineObjects: shaderState.outlineObjects,
    shaderOutlineStyle: shaderState.outlineStyle || null,
    focusTarget: null,
  }
}
