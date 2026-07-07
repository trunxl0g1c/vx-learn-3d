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

export function highlightObjectUtil() {}

export function highlightObject({
  targetObject,
  modelScene,
  setOutlineObjects,
  setSelectedObject,
}) {
  if (!targetObject) return

  modelScene?.traverse((child) => {
    if (!child.isMesh || !child.material) return

    restoreOriginalMaterial(child)

    child.material.emissive?.set(0x000000)
    markMaterialNeedsUpdate(child.material)
  })

  const selectedMeshes = []

  targetObject.traverse((child) => {
    if (child.isMesh) {
      selectedMeshes.push(child)
    }
  })

  setOutlineObjects(selectedMeshes)
  setSelectedObject(targetObject)
}

export function makeXrayExcept({
  targetObject,
  modelScene,
  xrayMaterial,
  isChildOf,
  setOutlineObjects,
  setSelectedObject,
}) {
  if (!targetObject || !modelScene) return

  const selectedMeshes = []

  modelScene.traverse((child) => {
    if (!child.isMesh) return

    const isSelected =
      child === targetObject ||
      child.parent === targetObject ||
      targetObject.children.includes(child) ||
      isChildOf(child, targetObject)

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

  setOutlineObjects(selectedMeshes)
  setSelectedObject(targetObject)
}

export function resetXray({
  objectList,
  flattenObjectTree,
  setOutlineObjects,
  setSelectedObject,
}) {
  flattenObjectTree(objectList).forEach((item) => {
    item.object.traverse((child) => {
      if (!child.isMesh) return

      restoreOriginalMaterial(child)
      child.renderOrder = 0

      if (child.material) {
        markMaterialNeedsUpdate(child.material)
      }
    })
  })

  setOutlineObjects([])
  setSelectedObject(null)
}

export function selectObjectFromMesh({
  mesh,
  objectList,
  flattenObjectTree,
  setSelectedObjectName,
  setSelectedObject,
  setOutlineObjects,
  setOrbitEnabled,
  focusTargetRef,
  setIsAutoRotating,
}) {
  let selectedGroup = null

  flattenObjectTree(objectList).forEach((item) => {
    let current = mesh

    while (current) {
      if (current === item.object) {
        selectedGroup = item.object
        break
      }

      current = current.parent
    }
  })

  if (!selectedGroup) return

  const selectedItem = flattenObjectTree(objectList).find(
    (item) => item.object === selectedGroup
  )

  setSelectedObjectName(
    (selectedItem?.name || "Unnamed Object").replaceAll("_", " ")
  )

  const selectedMeshes = []

  selectedGroup.traverse((child) => {
    if (child.isMesh) {
      selectedMeshes.push(child)
    }
  })

  setSelectedObject(selectedGroup)
  setOutlineObjects(selectedMeshes)

  setOrbitEnabled(true)
  focusTargetRef.current = null
  setIsAutoRotating(false)
}
