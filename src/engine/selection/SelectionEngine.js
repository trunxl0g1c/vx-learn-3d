import {
  applyXrayExcept,
  applyXrayToNonTargets,
  applyXrayToTargets,
  createClearSelectionPayload,
  createMultiSelectionPayload,
  createSelectionFromMeshPayload,
  createSelectionPayload,
  resetSceneMaterialState,
  resetXrayObjects,
} from "./SelectionSceneUtils"

export function createSelectionEngine(options = {}) {
  let selectedObject = null
  let outlineObjects = []
  let scene = options.scene || null
  let objectTree = options.objectTree || []
  let xrayMaterial = options.xrayMaterial || null
  let materialRestorer = options.materialRestorer || null
  let materialOverrideActive = false
  let materialOverrideMode = "none"

  const setSelection = (payload) => {
    selectedObject = payload?.selectedObject || null
    outlineObjects = payload?.outlineObjects || []

    return {
      ...(payload || createClearSelectionPayload()),
      selectedObject,
      outlineObjects,
    }
  }

  const restoreMaterialOverrideIfNeeded = (targetScene = scene) => {
    if (!materialOverrideActive) return false

    resetSceneMaterialState(targetScene, materialRestorer)
    materialOverrideActive = false
    materialOverrideMode = "none"
    return true
  }

  return {
    getSelectedObject() {
      return selectedObject
    },

    getOutlineObjects() {
      return outlineObjects
    },

    getMaterialOverrideMode() {
      return materialOverrideMode
    },

    clear() {
      restoreMaterialOverrideIfNeeded()
      return setSelection(createClearSelectionPayload())
    },

    clearSelectionPreservingMaterials() {
      return setSelection(createClearSelectionPayload())
    },

    selectObject(object) {
      restoreMaterialOverrideIfNeeded()
      return setSelection(createSelectionPayload(object))
    },

    setScene(nextScene) {
      const resolvedScene = nextScene || null

      if (scene !== resolvedScene) {
        materialOverrideActive = false
        materialOverrideMode = "none"
      }

      scene = resolvedScene
      return scene
    },

    setObjectTree(nextObjectTree) {
      objectTree = nextObjectTree || []
      return objectTree
    },

    setXrayMaterial(nextXrayMaterial) {
      xrayMaterial = nextXrayMaterial || null
      return xrayMaterial
    },

    setMaterialRestorer(nextMaterialRestorer) {
      materialRestorer =
        typeof nextMaterialRestorer === "function"
          ? nextMaterialRestorer
          : null

      return materialRestorer
    },

    registerModelState(modelState = {}) {
      const nextScene = modelState.scene || scene

      if (scene !== nextScene) {
        materialOverrideActive = false
        materialOverrideMode = "none"
      }

      scene = nextScene
      objectTree = modelState.objectList || objectTree

      return {
        scene,
        objectTree,
      }
    },

    highlightObject(targetObject, targetScene = scene) {
      restoreMaterialOverrideIfNeeded(targetScene)
      return setSelection(createSelectionPayload(targetObject))
    },

    highlightObjects(
      targetObjects,
      activeTargetObject = null,
      targetScene = scene,
    ) {
      restoreMaterialOverrideIfNeeded(targetScene)
      return setSelection(
        createMultiSelectionPayload(targetObjects, activeTargetObject),
      )
    },

    highlightObjectsPreservingMaterials(
      targetObjects,
      activeTargetObject = null,
    ) {
      return setSelection(
        createMultiSelectionPayload(targetObjects, activeTargetObject),
      )
    },

    makeOthersXray(
      targetObjects,
      activeTargetObject = null,
      targetScene = scene,
      targetXrayMaterial = xrayMaterial,
    ) {
      const payload = applyXrayToNonTargets({
        targetObjects,
        activeTargetObject,
        scene: targetScene,
        xrayMaterial: targetXrayMaterial,
        restoreMaterialState: materialRestorer,
      })

      materialOverrideActive = Boolean(
        Array.isArray(targetObjects)
          ? targetObjects.some(Boolean) && targetScene && targetXrayMaterial
          : targetObjects && targetScene && targetXrayMaterial,
      )
      materialOverrideMode = materialOverrideActive ? "non-targets" : "none"

      return setSelection(payload)
    },

    makeTargetsXray(
      targetObjects,
      activeTargetObject = null,
      targetScene = scene,
      targetXrayMaterial = xrayMaterial,
    ) {
      const payload = applyXrayToTargets({
        targetObjects,
        activeTargetObject,
        scene: targetScene,
        xrayMaterial: targetXrayMaterial,
        restoreMaterialState: materialRestorer,
      })

      materialOverrideActive = Boolean(
        Array.isArray(targetObjects)
          ? targetObjects.some(Boolean) && targetScene && targetXrayMaterial
          : targetObjects && targetScene && targetXrayMaterial,
      )
      materialOverrideMode = materialOverrideActive ? "targets" : "none"

      return setSelection(payload)
    },

    makeXrayExcept(
      targetObject,
      targetScene = scene,
      targetXrayMaterial = xrayMaterial,
    ) {
      const payload = applyXrayExcept({
        targetObject,
        scene: targetScene,
        xrayMaterial: targetXrayMaterial,
        restoreMaterialState: materialRestorer,
      })

      materialOverrideActive = Boolean(
        targetObject && targetScene && targetXrayMaterial,
      )
      materialOverrideMode = materialOverrideActive ? "targets" : "none"

      return setSelection(payload)
    },

    resetXray(targetObjectTree = objectTree) {
      if (!materialOverrideActive) {
        return setSelection(createClearSelectionPayload())
      }

      const payload = resetXrayObjects(
        targetObjectTree,
        scene,
        materialRestorer,
      )
      materialOverrideActive = false
      materialOverrideMode = "none"

      return setSelection(payload)
    },

    selectFromMesh(
      mesh,
      targetObjectTree = objectTree,
      { preserveMaterialOverride = false } = {},
    ) {
      if (!preserveMaterialOverride) {
        restoreMaterialOverrideIfNeeded()
      }

      const payload = createSelectionFromMeshPayload(mesh, targetObjectTree)

      if (!payload) return null

      return setSelection(payload)
    },

    reset() {
      return this.clear()
    },

    dispose() {
      selectedObject = null
      outlineObjects = []
      scene = null
      objectTree = []
      xrayMaterial = null
      materialRestorer = null
      materialOverrideActive = false
      materialOverrideMode = "none"

      return {
        selectedObject,
        outlineObjects,
        scene,
        objectTree,
      }
    },
  }
}

export default createSelectionEngine
