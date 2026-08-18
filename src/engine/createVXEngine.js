import { createCameraEngine } from "./camera"
import { createCutEngine } from "./cut"
import { createModelEngine } from "./model"
import { createSelectionEngine } from "./selection"
import { createAnimationEngine } from "./animation"
import { createFlowEngine } from "./flow"
import { createProceduralEngine } from "./procedural"
import { createQuizEngine } from "./quiz"
import { createXRSessionEngine } from "./xr"
import { createHistoryEngine } from "./history"
import { createSpeechEngine } from "./speech"

export function createVXEngine(options = {}) {
  const camera = options.cameraEngine || createCameraEngine(options.camera)
  const cut = options.cutEngine || createCutEngine(options.cut)
  const selection = options.selectionEngine || createSelectionEngine(options.selection)
  const model = options.modelEngine || createModelEngine(options.model)
  const animation = options.animationEngine || createAnimationEngine(options.animation)
  const flow = options.flowEngine || createFlowEngine(options.flow)
  const procedural =
    options.proceduralEngine || createProceduralEngine(options.procedural)
  const quiz = options.quizEngine || createQuizEngine(options.quiz)
  const xr = options.xrEngine || createXRSessionEngine(options.xr)
  const history =
    options.historyEngine || createHistoryEngine({ limit: 10, ...(options.history || {}) })
  const speech = options.speechEngine || createSpeechEngine(options.speech)

  const engine = {
    camera,
    cut,
    selection,
    model,
    animation,
    flow,
    procedural,
    quiz,
    xr,
    history,
    speech,

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
        flow: flow.getState?.(),
        procedural: procedural.getState?.(),
        quiz: quiz.getState?.(),
        xr: xr.getState?.(),
        history: history.getState?.(),
        speech: { supported: speech.isSupported?.() },
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
      flow.reset?.()
      procedural.dispose?.()
      quiz.reset?.()
      history.clear?.()
      speech.stop?.()
      return this.getState()
    },

    dispose(options = {}) {
      cut.dispose?.(options.scene)
      selection.dispose?.()
      camera.dispose?.()
      model.dispose?.(options.model)
      animation.dispose?.()
      flow.dispose?.()
      procedural.dispose?.()
      quiz.dispose?.()
      xr.dispose?.()
      history.dispose?.()
      speech.stop?.()
      return this.getState()
    },
  }

  return engine
}

export const createViqubedEngine = createVXEngine

export default createVXEngine
