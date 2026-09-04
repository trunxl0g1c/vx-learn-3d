import { useEffect, useRef } from "react"
import {
  applyCameraOrbitRecenterProgress,
  createCameraOrbitRecenterState,
  createSceneProjectionCenterState,
  getOrbitPointerDragThreshold,
  isOrbitRotatePointerEvent,
} from "../engine/camera"

const DEFAULT_RECENTER_DURATION_MS = 220
const DEFAULT_ROTATE_DRAG_THRESHOLD = 3

/**
 * Keeps the original/native OrbitControls rotation behavior.
 *
 * When a rotate drag starts, views that are already fully in-frame and roughly
 * centered are left untouched so OrbitControls rotates immediately. Only views
 * that are clearly off-center or partially outside the frame are translated
 * smoothly back toward the model's logical center while native rotation keeps
 * running.
 */
export function useOrbitPointerPivot({
  controlsRef,
  camera,
  domElement,
  modelScene,
  enabled = true,
  dragThreshold = DEFAULT_ROTATE_DRAG_THRESHOLD,
  recenterDurationMs = DEFAULT_RECENTER_DURATION_MS,
}) {
  const pointerStateRef = useRef(null)
  const centerStateRef = useRef(null)
  const recenterAnimationRef = useRef(null)
  const animationFrameRef = useRef(null)

  useEffect(() => {
    centerStateRef.current = createSceneProjectionCenterState(modelScene)
  }, [modelScene])

  useEffect(() => {
    if (!domElement) return undefined

    const threshold = getOrbitPointerDragThreshold(dragThreshold)

    const stopRecenterAnimation = () => {
      if (animationFrameRef.current != null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      recenterAnimationRef.current = null
    }

    const runRecenterFrame = (timestamp) => {
      const animation = recenterAnimationRef.current
      const controls = controlsRef?.current

      if (
        !animation ||
        !enabled ||
        !camera ||
        !controls?.enabled ||
        controls.enableRotate === false
      ) {
        stopRecenterAnimation()
        return
      }

      if (animation.startedAt == null) {
        animation.startedAt = timestamp
      }

      const elapsed = Math.max(0, timestamp - animation.startedAt)
      const progress = Math.min(1, elapsed / animation.state.durationMs)
      const done = applyCameraOrbitRecenterProgress({
        camera,
        controls,
        recenterState: animation.state,
        progress,
      })

      if (done) {
        animationFrameRef.current = null
        recenterAnimationRef.current = null
        return
      }

      animationFrameRef.current = requestAnimationFrame(runRecenterFrame)
    }

    const startRecenterAnimation = () => {
      const controls = controlsRef?.current

      if (!modelScene || !camera || !controls?.target) return

      if (!centerStateRef.current) {
        centerStateRef.current = createSceneProjectionCenterState(modelScene)
      }

      const state = createCameraOrbitRecenterState({
        scene: modelScene,
        centerState: centerStateRef.current,
        camera,
        controls,
        durationMs: recenterDurationMs,
      })

      if (!state) return

      stopRecenterAnimation()
      recenterAnimationRef.current = {
        state,
        startedAt: null,
      }
      animationFrameRef.current = requestAnimationFrame(runRecenterFrame)
    }

    const clearPointerState = (event = null) => {
      const pointerState = pointerStateRef.current
      if (!pointerState) return

      if (
        event?.pointerId != null &&
        pointerState.pointerId != null &&
        event.pointerId !== pointerState.pointerId
      ) {
        return
      }

      pointerStateRef.current = null
    }

    const handlePointerDown = (event) => {
      const controls = controlsRef?.current

      if (!enabled || !camera || !isOrbitRotatePointerEvent(event, controls)) {
        clearPointerState()
        stopRecenterAnimation()
        return
      }

      pointerStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        recenterStarted: false,
      }
    }

    const handlePointerMove = (event) => {
      const pointerState = pointerStateRef.current
      if (!pointerState || event.pointerId !== pointerState.pointerId) return
      if (pointerState.recenterStarted) return

      const deltaX = event.clientX - pointerState.startX
      const deltaY = event.clientY - pointerState.startY

      if (Math.hypot(deltaX, deltaY) <= threshold) return

      pointerState.recenterStarted = true
      startRecenterAnimation()
    }

    const handleWheel = () => {
      stopRecenterAnimation()
    }

    // Capture is used only to observe the gesture before OrbitControls. Nothing
    // is prevented or disabled: native OrbitControls still owns the rotation.
    domElement.addEventListener("pointerdown", handlePointerDown, true)
    domElement.addEventListener("pointermove", handlePointerMove, true)
    domElement.addEventListener("pointerup", clearPointerState, true)
    domElement.addEventListener("pointercancel", clearPointerState, true)
    domElement.addEventListener("pointerleave", clearPointerState, true)
    domElement.addEventListener("wheel", handleWheel, true)

    return () => {
      clearPointerState()
      stopRecenterAnimation()
      domElement.removeEventListener("pointerdown", handlePointerDown, true)
      domElement.removeEventListener("pointermove", handlePointerMove, true)
      domElement.removeEventListener("pointerup", clearPointerState, true)
      domElement.removeEventListener("pointercancel", clearPointerState, true)
      domElement.removeEventListener("pointerleave", clearPointerState, true)
      domElement.removeEventListener("wheel", handleWheel, true)
    }
  }, [
    camera,
    controlsRef,
    domElement,
    dragThreshold,
    enabled,
    modelScene,
    recenterDurationMs,
  ])
}
