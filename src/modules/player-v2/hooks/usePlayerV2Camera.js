import { useCallback, useEffect, useRef } from "react"

import {
  createCameraState,
  createDefaultCameraTarget,
  createFocusTargetFromObject,
} from "../../../engine/camera"

export default function usePlayerV2Camera({
  cameraRef,
  controlsRef,
  focusTargetRef,
  selectedObject,
} = {}) {
  const savedCameraStateRef = useRef(null)

  const saveCameraState = useCallback(() => {
    const state = createCameraState(cameraRef?.current, controlsRef?.current)
    if (state) {
      savedCameraStateRef.current = state
    }
    return state
  }, [cameraRef, controlsRef])

  const focusObject = useCallback(
    (object = selectedObject) => {
      if (!object || !focusTargetRef) return null

      const focusTarget = createFocusTargetFromObject(
        object,
        cameraRef?.current,
        controlsRef?.current
      )

      if (!focusTarget) return null

      saveCameraState()
      focusTargetRef.current = focusTarget
      return focusTarget
    },
    [cameraRef, controlsRef, focusTargetRef, saveCameraState, selectedObject]
  )

  const resetCamera = useCallback(() => {
    if (!focusTargetRef) return
    focusTargetRef.current = createDefaultCameraTarget()
  }, [focusTargetRef])

  const restoreCameraState = useCallback(() => {
    if (!focusTargetRef || !savedCameraStateRef.current) return null
    focusTargetRef.current = savedCameraStateRef.current
    return savedCameraStateRef.current
  }, [focusTargetRef])

  useEffect(() => {
    const handleKeyDown = (event) => {
      const targetTag = event.target?.tagName?.toLowerCase()
      const isTyping = targetTag === "input" || targetTag === "textarea"

      if (isTyping) return

      if (event.key?.toLowerCase() === "f") {
        focusObject()
      }

      if (event.key?.toLowerCase() === "r") {
        resetCamera()
      }

      if (event.key?.toLowerCase() === "b") {
        restoreCameraState()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [focusObject, resetCamera, restoreCameraState])

  return {
    focusObject,
    resetCamera,
    saveCameraState,
    restoreCameraState,
  }
}
