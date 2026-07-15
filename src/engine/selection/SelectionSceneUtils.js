import { resolveObjectByStoredIndexPath } from "../model/ObjectNameOverrides"

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

function restoreOriginalMaterial(child) {
  if (!child?.isMesh || !child.userData?.originalMaterial) return

  child.material = cloneMaterial(child.userData.originalMaterial)
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
  if (!object) {
    return {
      selectedObject: null,
      outlineObjects: [],
    }
  }

  return {
    selectedObject: object,
    outlineObjects: collectMeshes(object),
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

export function resetSceneMaterialState(scene) {
  scene?.traverse?.((child) => {
    if (!child.isMesh || !child.material) return

    restoreOriginalMaterial(child)

    child.material.emissive?.set(0x000000)
    markMaterialNeedsUpdate(child.material)
  })
}

export function createObjectHighlightPayload(targetObject, scene = null) {
  if (!targetObject) return createClearSelectionPayload()

  resetSceneMaterialState(scene)

  return createSelectionPayload(targetObject)
}

export function applyXrayExcept({
  targetObject,
  scene,
  xrayMaterial,
}) {
  if (!targetObject || !scene || !xrayMaterial) {
    return createClearSelectionPayload()
  }

  const selectedMeshes = []

  scene.traverse((child) => {
    if (!child.isMesh) return

    const isSelected =
      child === targetObject ||
      child.parent === targetObject ||
      targetObject.children.includes(child) ||
      isObjectChildOf(child, targetObject)

    if (isSelected) {
      selectedMeshes.push(child)

      restoreOriginalMaterial(child)
      child.renderOrder = 999
      child.material.emissive?.set(0x000000)
    } else {
      child.material = xrayMaterial
      child.renderOrder = 0
    }

    markMaterialNeedsUpdate(child.material)
  })

  return {
    selectedObject: targetObject,
    outlineObjects: selectedMeshes,
  }
}

export function resetXrayObjects(objectTree = []) {
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

  const flattenedTree = flattenSelectionTree(objectTree)
  const treeItemByObject = new Map(
    flattenedTree.map((item) => [item.object, item]),
  )

  // Resolve the deepest selectable object hit by the raycast. The previous
  // implementation iterated every tree item and could keep replacing the
  // result with a higher ancestor, which made clicks select the parent group.
  let selectedObject = mesh

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

export function findExactChapterForObject(object, chapters = []) {
  if (!object || !Array.isArray(chapters)) return null

  const objectUuid = String(object.uuid || "").trim()
  const objectName = normalizeObjectName(object.name)

  return (
    chapters.find((chapter) => {
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
    }) || null
  )
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
}
