import {
  areObjectPathsEqual,
  createObjectIndexPath,
  resolveObjectByStoredIndexPath,
} from "../model/ObjectNameOverrides"
import {
  releaseGeneratedModelMaterial,
  syncSketchEdgeVisibility,
} from "../model/ModelSceneUtils"
import { resolveLogicalObject } from "../../utils/objectTreeUtils"

export function normalizeObjectName(name) {
  return (name || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
}


function cloneMaterial(material) {
  if (Array.isArray(material)) {
    return material.map((item) => item?.clone?.() || item)
  }

  return material?.clone?.() || material
}

const XRAY_PREVIOUS_MATERIAL_KEY = "__vxXrayPreviousMaterial"
const XRAY_PREVIOUS_GENERATED_KEY = "__vxXrayPreviousGeneratedMaterial"

function rememberMaterialBeforeXray(mesh) {
  if (!mesh?.isMesh || !mesh.material) return false

  const userData = mesh.userData || (mesh.userData = {})

  // A mesh can pass through several X-Ray actions before the user resets the
  // visual state. Preserve the first real render material instead of stacking
  // clones/references on every toggle.
  if (Object.prototype.hasOwnProperty.call(userData, XRAY_PREVIOUS_MATERIAL_KEY)) {
    return false
  }

  userData[XRAY_PREVIOUS_MATERIAL_KEY] = mesh.material
  userData[XRAY_PREVIOUS_GENERATED_KEY] = Boolean(
    userData.__vxGeneratedShaderMaterial,
  )
  return true
}

function restoreMaterialAfterXray(mesh) {
  if (!mesh?.isMesh) return false

  const userData = mesh.userData
  if (
    !userData ||
    !Object.prototype.hasOwnProperty.call(userData, XRAY_PREVIOUS_MATERIAL_KEY)
  ) {
    return false
  }

  const previousMaterial = userData[XRAY_PREVIOUS_MATERIAL_KEY]
  const previousGenerated = Boolean(userData[XRAY_PREVIOUS_GENERATED_KEY])

  if (previousMaterial) {
    mesh.material = previousMaterial
  }

  userData.__vxGeneratedShaderMaterial = previousGenerated
  delete userData[XRAY_PREVIOUS_MATERIAL_KEY]
  delete userData[XRAY_PREVIOUS_GENERATED_KEY]
  markMaterialNeedsUpdate(mesh.material)
  return true
}

export function restoreXrayMaterialAssignments(scene) {
  if (!scene) return 0

  let restoredCount = 0

  scene.traverse?.((child) => {
    if (restoreMaterialAfterXray(child)) {
      restoredCount += 1
    }
  })

  return restoredCount
}

function restoreOriginalMaterial(child) {
  if (!child?.isMesh || !child.userData?.originalMaterial) return

  releaseGeneratedModelMaterial(child)
  child.material = cloneMaterial(child.userData.originalMaterial)
  // The restored material is a Viqubed-owned clone. Mark it so the next
  // restore/X-Ray transition disposes it instead of leaking one clone per click.
  child.userData.__vxGeneratedShaderMaterial = true
}

function markMaterialNeedsUpdate(material) {
  const materials = Array.isArray(material) ? material : [material]

  materials.forEach((item) => {
    if (item) item.needsUpdate = true
  })
}

export function findObjectByName(root, objectName) {
  if (!root || !objectName) return null

  let found = null
  const targetName = normalizeObjectName(objectName)

  root.traverse((child) => {
    if (found) return

    const childName = normalizeObjectName(child.name)

    if (childName === targetName) {
      found = child
    }
  })

  return found
}


export function findObjectByIndexPath(root, path) {
  if (!root || !Array.isArray(path)) return null

  let current = root

  for (const index of path) {
    if (!current?.children?.[index]) return null
    current = current.children[index]
  }

  return current
}

export function collectMeshes(object) {
  const meshes = []

  object?.traverse?.((child) => {
    if (child.isMesh) meshes.push(child)
  })

  return meshes
}

export function createSelectionPayload(object) {
  const logicalObject = resolveLogicalObject(object)

  if (!logicalObject) {
    return {
      selectedObject: null,
      outlineObjects: [],
    }
  }

  return {
    selectedObject: logicalObject,
    outlineObjects: collectMeshes(logicalObject),
  }
}

export function createMultiSelectionPayload(
  targetObjects = [],
  activeTargetObject = null,
) {
  const validTargets = Array.from(
    new Set(
      (Array.isArray(targetObjects) ? targetObjects : [targetObjects])
        .map(resolveLogicalObject)
        .filter(Boolean),
    ),
  )

  if (validTargets.length === 0) return createClearSelectionPayload()

  const logicalActiveTargetObject = resolveLogicalObject(activeTargetObject)
  const outlineObjects = Array.from(
    new Set(validTargets.flatMap((targetObject) => collectMeshes(targetObject))),
  )

  return {
    selectedObject:
      logicalActiveTargetObject &&
      validTargets.includes(logicalActiveTargetObject)
        ? logicalActiveTargetObject
        : validTargets[validTargets.length - 1],
    outlineObjects,
  }
}

export function createClearSelectionPayload() {
  return {
    selectedObject: null,
    outlineObjects: [],
  }
}

export function isObjectChildOf(child, parent) {
  let current = child

  while (current) {
    if (current === parent) return true
    current = current.parent
  }

  return false
}

export function flattenSelectionTree(items = []) {
  const result = []

  const walk = (nodes) => {
    nodes.forEach((node) => {
      result.push({
        name: node.name,
        object: node.object,
      })

      if (node.children?.length) {
        walk(node.children)
      }
    })
  }

  walk(items)

  return result
}

export function resetSceneMaterialState(
  scene,
  restoreMaterialState = null,
) {
  if (typeof restoreMaterialState === "function") {
    restoreMaterialState(scene)
  } else {
    scene?.traverse?.((child) => {
      if (!child.isMesh || !child.material) return
      restoreOriginalMaterial(child)
    })
  }

  scene?.traverse?.((child) => {
    if (!child.isMesh || !child.material) return

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material]

    materials.forEach((material) => material?.emissive?.set?.(0x000000))
    markMaterialNeedsUpdate(child.material)
  })
}

export function createObjectHighlightPayload(
  targetObject,
  scene = null,
  restoreMaterialState = null,
) {
  if (!targetObject) return createClearSelectionPayload()

  resetSceneMaterialState(scene, restoreMaterialState)

  return createSelectionPayload(targetObject)
}

export function applyXrayToNonTargets({
  targetObjects = [],
  activeTargetObject = null,
  scene,
  xrayMaterial,
  restoreMaterialState = null,
}) {
  const validTargets = Array.from(
    new Set(
      (Array.isArray(targetObjects) ? targetObjects : [targetObjects])
        .map(resolveLogicalObject)
        .filter(Boolean),
    ),
  )

  if (validTargets.length === 0 || !scene || !xrayMaterial) {
    return createClearSelectionPayload()
  }

  const logicalActiveTargetObject = resolveLogicalObject(activeTargetObject)

  // X-Ray is a transient material override. Restore only previous X-Ray swaps
  // instead of rebuilding/cloning the active shader material for every mesh in
  // the scene. Re-applying the whole shader mode here was the main source of
  // the large one-time memory spike on the first X-Ray action.
  restoreXrayMaterialAssignments(scene)

  const selectedMeshes = []

  scene.traverse((child) => {
    if (!child.isMesh) return

    const belongsToSelection = validTargets.some(
      (targetObject) =>
        child === targetObject || isObjectChildOf(child, targetObject),
    )

    if (belongsToSelection) {
      selectedMeshes.push(child)
      child.renderOrder = 999
      markMaterialNeedsUpdate(child.material)
      return
    }

    rememberMaterialBeforeXray(child)
    child.material = xrayMaterial
    child.userData.__vxGeneratedShaderMaterial = false
    child.renderOrder = 0
    markMaterialNeedsUpdate(child.material)
  })

  return {
    selectedObject:
      logicalActiveTargetObject &&
      validTargets.includes(logicalActiveTargetObject)
        ? logicalActiveTargetObject
        : validTargets[validTargets.length - 1],
    outlineObjects: selectedMeshes,
  }
}

export function applyXrayToTargets({
  targetObjects = [],
  activeTargetObject = null,
  scene,
  xrayMaterial,
  restoreMaterialState = null,
}) {
  const validTargets = Array.from(
    new Set(
      (Array.isArray(targetObjects) ? targetObjects : [targetObjects])
        .map(resolveLogicalObject)
        .filter(Boolean),
    ),
  )

  if (validTargets.length === 0 || !scene || !xrayMaterial) {
    return createClearSelectionPayload()
  }

  const logicalActiveTargetObject = resolveLogicalObject(activeTargetObject)

  restoreXrayMaterialAssignments(scene)

  const selectedMeshes = []

  scene.traverse((child) => {
    if (!child.isMesh) return

    const belongsToSelection = validTargets.some(
      (targetObject) =>
        child === targetObject || isObjectChildOf(child, targetObject),
    )

    if (belongsToSelection) {
      selectedMeshes.push(child)
      rememberMaterialBeforeXray(child)
      child.material = xrayMaterial
      child.userData.__vxGeneratedShaderMaterial = false
      child.renderOrder = 999
      markMaterialNeedsUpdate(child.material)
      return
    }

    child.renderOrder = 0
    markMaterialNeedsUpdate(child.material)
  })

  return {
    selectedObject:
      logicalActiveTargetObject &&
      validTargets.includes(logicalActiveTargetObject)
        ? logicalActiveTargetObject
        : validTargets[validTargets.length - 1],
    outlineObjects: selectedMeshes,
  }
}

export function applyXrayExcept({
  targetObject,
  scene,
  xrayMaterial,
  restoreMaterialState = null,
}) {
  const logicalTargetObject = resolveLogicalObject(targetObject)

  if (!logicalTargetObject || !scene || !xrayMaterial) {
    return createClearSelectionPayload()
  }

  // Restore only the previous X-Ray swap. The normal/shader material itself is
  // kept alive and reused, so X-Ray does not allocate a fresh material set.
  restoreXrayMaterialAssignments(scene)

  const selectedMeshes = []

  scene.traverse((child) => {
    if (!child.isMesh) return

    const belongsToTarget =
      child === logicalTargetObject ||
      isObjectChildOf(child, logicalTargetObject)

    if (belongsToTarget) {
      selectedMeshes.push(child)
      rememberMaterialBeforeXray(child)
      child.material = xrayMaterial
      child.userData.__vxGeneratedShaderMaterial = false
      child.renderOrder = 999
      markMaterialNeedsUpdate(child.material)
      return
    }

    child.renderOrder = 0
    markMaterialNeedsUpdate(child.material)
  })

  return {
    selectedObject: logicalTargetObject,
    outlineObjects: selectedMeshes,
  }
}

export function resetXrayObjects(
  objectTree = [],
  scene = null,
  restoreMaterialState = null,
) {
  if (scene) {
    restoreXrayMaterialAssignments(scene)

    scene.traverse((child) => {
      if (!child.isMesh) return

      child.renderOrder = 0
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material]

      materials.forEach((material) => material?.emissive?.set?.(0x000000))
      markMaterialNeedsUpdate(child.material)
    })

    return createClearSelectionPayload()
  }

  flattenSelectionTree(objectTree).forEach((item) => {
    item.object.traverse((child) => {
      if (!child.isMesh) return

      restoreOriginalMaterial(child)
      child.renderOrder = 0

      if (child.material) {
        markMaterialNeedsUpdate(child.material)
      }
    })
  })

  return createClearSelectionPayload()
}

export function createSelectionFromMeshPayload(mesh, objectTree = []) {
  if (!mesh) return null

  const logicalMesh = resolveLogicalObject(mesh)
  const flattenedTree = flattenSelectionTree(objectTree)
  const treeItemByObject = new Map(
    flattenedTree.map((item) => [item.object, item]),
  )

  // Resolve the deepest selectable object hit by the raycast. The previous
  // implementation iterated every tree item and could keep replacing the
  // result with a higher ancestor, which made clicks select the parent group.
  let selectedObject = logicalMesh

  while (selectedObject && !treeItemByObject.has(selectedObject)) {
    selectedObject = selectedObject.parent
  }

  if (!selectedObject) return null

  const selectedItem = treeItemByObject.get(selectedObject)

  return {
    selectedObject,
    selectedObjectName: (selectedItem?.name || "Unnamed Object").replaceAll("_", " "),
    outlineObjects: collectMeshes(selectedObject),
    orbitEnabled: true,
    focusTarget: null,
    isAutoRotating: false,
  }
}

export function findExactChapterForObject(
  object,
  chapters = [],
  root = null,
) {
  if (!object || !Array.isArray(chapters)) return null

  const logicalObject = resolveLogicalObject(object)
  const candidates = [logicalObject]

  // Backward compatibility: older projects could attach content to one of the
  // generated primitive children before logical grouping was introduced. A
  // chapter attached to the logical parent wins; primitive chapters are only a
  // fallback.
  logicalObject?.traverse?.((child) => {
    if (child !== logicalObject && child.isMesh) candidates.push(child)
  })

  for (const candidate of candidates.filter(Boolean)) {
    const objectUuid = String(candidate.uuid || "").trim()
    const objectName = normalizeObjectName(candidate.name)
    const objectPath = root ? createObjectIndexPath(candidate, root) : []

    const foundChapter = chapters.find((chapter) => {
      if (
        objectPath.length > 0 &&
        Array.isArray(chapter?.objectPath) &&
        areObjectPathsEqual(chapter.objectPath, objectPath)
      ) {
        return true
      }

      const chapterObjectUuid = String(
        chapter?.objectUuid || chapter?.objectUUID || ""
      ).trim()

      if (objectUuid && chapterObjectUuid && chapterObjectUuid === objectUuid) {
        return true
      }

      return (
        objectName.length > 0 &&
        normalizeObjectName(chapter?.objectName) === objectName
      )
    })

    if (foundChapter) return foundChapter
  }

  return null
}

export function findChapterForObject(object, chapters = []) {
  if (!object || !Array.isArray(chapters)) return null

  let current = object

  while (current) {
    const foundChapter = findExactChapterForObject(current, chapters)

    if (foundChapter) return foundChapter

    current = current.parent
  }

  return null
}

export function createChapterHighlightPayload(chapter, scene) {
  if (!scene || (!chapter?.objectUuid && !chapter?.objectName)) {
    return createClearSelectionPayload()
  }

  const targetObject =
    resolveObjectByStoredIndexPath(
      scene,
      chapter?.objectPath,
      chapter?.objectName,
    ) ||
    (chapter?.objectUuid
      ? scene.getObjectByProperty?.("uuid", chapter.objectUuid)
      : null) ||
    findObjectByName(scene, chapter.objectName)

  return createSelectionPayload(targetObject)
}

export function createPlayerObjectSelectionPayload(object, chapters = []) {
  const selection = createSelectionPayload(object)
  const chapter = findExactChapterForObject(object, chapters)

  return {
    ...selection,
    chapter,
    chapterId: chapter?.id || null,
  }
}

export function hideObject(object) {
  if (!object) return createClearSelectionPayload()

  object.visible = false
  object.traverse?.((child) => {
    child.visible = false
  })

  return createClearSelectionPayload()
}

export function soloObject(scene, object) {
  if (!scene || !object) {
    return createClearSelectionPayload()
  }

  scene.traverse((child) => {
    if (child.isMesh) child.visible = false
  })

  object.traverse?.((child) => {
    if (child.isMesh) child.visible = true
  })

  return createSelectionPayload(object)
}

export function showAllObjectsInScene(scene) {
  if (!scene) return

  scene.traverse((child) => {
    child.visible = true
  })

  syncSketchEdgeVisibility(scene)
}
