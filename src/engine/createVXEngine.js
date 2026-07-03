import { createCameraEngine } from "./camera"
import { createCutEngine } from "./cut"
import { createModelEngine } from "./model"
import { createSelectionEngine } from "./selection"
import { createAnimationEngine } from "./animation"

export function createVXEngine(options = {}) {
  const camera = options.cameraEngine || createCameraEngine(options.camera)
  const cut = options.cutEngine || createCutEngine(options.cut)
  const selection = options.selectionEngine || createSelectionEngine(options.selection)
  const model = options.modelEngine || createModelEngine(options.model)
  const animation = options.animationEngine || createAnimationEngine(options.animation)

  const engine = {
    camera,
    cut,
    selection,
    model,
    animation,

    initializeModel(scene, viewerSettings = {}) {
      camera.setScene?.(scene)
      selection.setScene?.(scene)

      const modelState = model.initialize?.(scene, viewerSettings, {
        selectionEngine: selection,
        cutEngine: cut,
        cameraEngine: camera,
      })

      if (modelState) {
        selection.registerModelState?.(modelState)
        cut.setBounds?.(modelState.boundsMap)
        camera.setScene?.(modelState.scene)
      }

      return modelState
    },

    registerModelState(modelState = {}) {
      selection.registerModelState?.(modelState)
      cut.setBounds?.(modelState.boundsMap)
      camera.setScene?.(modelState.scene)
      return modelState
    },

    getState() {
      return {
        camera: camera.getState?.(),
        cut: cut.getState?.(),
        selection: {
          selectedObject: selection.getSelectedObject?.(),
          outlineObjects: selection.getOutlineObjects?.(),
        },
        model: model.getState?.(),
        animation: animation.getState?.(),
      }
    },

    clearScene(scene) {
      cut.clear?.(scene)
      selection.clear?.()
      camera.clear?.()
      return this.getState()
    },

    reset() {
      selection.reset?.()
      camera.resetState?.()
      cut.resetState?.()
      model.clearState?.()
      animation.clear?.()
      return this.getState()
    },

    dispose(options = {}) {
      cut.dispose?.(options.scene)
      selection.dispose?.()
      camera.dispose?.()
      model.dispose?.(options.model)
      animation.dispose?.()
      return this.getState()
    },
  }

  return engine
}

export const createVXploreEngine = createVXEngine

export default createVXEngine
