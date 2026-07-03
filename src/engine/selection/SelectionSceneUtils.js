export function normalizeObjectName(name) {
  return (name || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
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

    if (child.userData.originalMaterial) {
      child.material = child.userData.originalMaterial
    }

    child.material.emissive?.set(0x000000)
    child.material.needsUpdate = true
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

      child.material = child.userData.originalMaterial || child.material
      child.material.transparent = false
      child.material.opacity = 1
      child.material.depthWrite = true
      child.material.depthTest = true
      child.renderOrder = 999
      child.material.emissive?.set(0x000000)
    } else {
      child.material = xrayMaterial
      child.renderOrder = 0
    }

    child.material.needsUpdate = true
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

      child.material = child.userData.originalMaterial
      child.renderOrder = 0

      if (child.material) {
        child.material.transparent = false
        child.material.opacity = 1
        child.material.depthWrite = true
        child.material.depthTest = true
        child.material.needsUpdate = true
      }
    })
  })

  return createClearSelectionPayload()
}

export function createSelectionFromMeshPayload(mesh, objectTree = []) {
  let selectedGroup = null
  const flattenedTree = flattenSelectionTree(objectTree)

  flattenedTree.forEach((item) => {
    let current = mesh

    while (current) {
      if (current === item.object) {
        selectedGroup = item.object
        break
      }

      current = current.parent
    }
  })

  if (!selectedGroup) return null

  const selectedItem = flattenedTree.find((item) => item.object === selectedGroup)

  return {
    selectedObject: selectedGroup,
    selectedObjectName: (selectedItem?.name || "Unnamed Object").replaceAll("_", " "),
    outlineObjects: collectMeshes(selectedGroup),
    orbitEnabled: true,
    focusTarget: null,
    isAutoRotating: false,
  }
}

export function findChapterForObject(object, chapters = []) {
  if (!object || !Array.isArray(chapters)) return null

  let current = object

  while (current) {
    const foundChapter = chapters.find(
      (chapter) =>
        normalizeObjectName(chapter.objectName) === normalizeObjectName(current.name)
    )

    if (foundChapter) return foundChapter

    current = current.parent
  }

  return null
}

export function createChapterHighlightPayload(chapter, scene) {
  if (!scene || !chapter?.objectName) {
    return createClearSelectionPayload()
  }

  const targetObject = findObjectByName(scene, chapter.objectName)

  return createSelectionPayload(targetObject)
}

export function createPlayerObjectSelectionPayload(object, chapters = []) {
  const selection = createSelectionPayload(object)
  const chapter = findChapterForObject(object, chapters)

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
