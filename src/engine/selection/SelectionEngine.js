import {
  applyXrayExcept,
  createClearSelectionPayload,
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
    return true
  }

  return {
    getSelectedObject() {
      return selectedObject
    },

    getOutlineObjects() {
      return outlineObjects
    },

    clear() {
      restoreMaterialOverrideIfNeeded()
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

      return setSelection(payload)
    },

    selectFromMesh(mesh, targetObjectTree = objectTree) {
      restoreMaterialOverrideIfNeeded()

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
