import {
  applyXrayExcept,
  createClearSelectionPayload,
  createObjectHighlightPayload,
  createSelectionFromMeshPayload,
  createSelectionPayload,
  resetXrayObjects,
} from "./SelectionSceneUtils"

export function createSelectionEngine(options = {}) {
  let selectedObject = null
  let outlineObjects = []
  let scene = options.scene || null
  let objectTree = options.objectTree || []
  let xrayMaterial = options.xrayMaterial || null

  const setSelection = (payload) => {
    selectedObject = payload?.selectedObject || null
    outlineObjects = payload?.outlineObjects || []

    return {
      ...(payload || createClearSelectionPayload()),
      selectedObject,
      outlineObjects,
    }
  }

  return {
    getSelectedObject() {
      return selectedObject
    },

    getOutlineObjects() {
      return outlineObjects
    },

    clear() {
      return setSelection(createClearSelectionPayload())
    },

    selectObject(object) {
      return setSelection(createSelectionPayload(object))
    },

    setScene(nextScene) {
      scene = nextScene || null
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

    registerModelState(modelState = {}) {
      scene = modelState.scene || scene
      objectTree = modelState.objectList || objectTree

      return {
        scene,
        objectTree,
      }
    },

    highlightObject(targetObject, targetScene = scene) {
      return setSelection(createObjectHighlightPayload(targetObject, targetScene))
    },

    makeXrayExcept(targetObject, targetScene = scene, targetXrayMaterial = xrayMaterial) {
      return setSelection(
        applyXrayExcept({
          targetObject,
          scene: targetScene,
          xrayMaterial: targetXrayMaterial,
        })
      )
    },

    resetXray(targetObjectTree = objectTree) {
      return setSelection(resetXrayObjects(targetObjectTree))
    },

    selectFromMesh(mesh, targetObjectTree = objectTree) {
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
