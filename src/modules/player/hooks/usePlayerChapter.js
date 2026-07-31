import { useEffect, useMemo, useState } from "react"
import { getChapterCameraViews } from "../../../engine/chapter"
import { switchCameraProjectionThen } from "../../../engine/camera"
import {
  applyChapterModelRotation,
  createChapterFocusTarget,
} from "../../../engine/model"
import { createChapterHighlightPayload } from "../../../engine/selection"

function clampCameraIndex(index, count) {
  if (count <= 0) return 0
  return Math.max(0, Math.min(Number(index) || 0, count - 1))
}

export default function usePlayerChapter({
  material,
  activeChapterId,
  setActiveChapterId,
  modelScene,
  cameraRef,
  focusTargetRef,
  setViewerSettings,
  setSelectedObject,
  setOutlineObjects,
  playerAnimation,
}) {
  const [activeCameraViewIndex, setActiveCameraViewIndex] = useState(0)

  const activeChapter = material?.chapters?.find(
    (chapter) => chapter.id === activeChapterId
  )

  const cameraViews = useMemo(
    () => getChapterCameraViews(activeChapter),
    [activeChapter],
  )

  useEffect(() => {
    setActiveCameraViewIndex(0)
  }, [activeChapterId])

  const highlightChapterObject = (chapter, sceneOverride = null) => {
    const rootScene = sceneOverride || modelScene

    if (!rootScene || !chapter) return null

    const selection = createChapterHighlightPayload(chapter, rootScene)

    setSelectedObject(selection.selectedObject)
    setOutlineObjects(selection.outlineObjects)
    return selection
  }

  const applyChapterCameraView = (chapter, index = 0) => {
    if (!chapter) return null

    const chapterCameraViews = getChapterCameraViews(chapter)
    const normalizedIndex = clampCameraIndex(index, chapterCameraViews.length)
    const cameraView = chapterCameraViews[normalizedIndex] || null

    applyChapterModelRotation(modelScene, chapter, cameraView)

    const chapterFocusTarget = createChapterFocusTarget(chapter, cameraView)

    if (chapterFocusTarget) {
      switchCameraProjectionThen({
        cameraRef,
        setViewerSettings,
        mode: chapterFocusTarget.cameraType,
        onReady: () => {
          focusTargetRef.current = chapterFocusTarget
        },
      })
    } else {
      focusTargetRef.current = null
    }

    setActiveCameraViewIndex(normalizedIndex)

    return {
      index: normalizedIndex,
      cameraView,
      focusTarget: chapterFocusTarget,
    }
  }

  const handleSelectChapter = (chapterId) => {
    const chapter = material?.chapters?.find((item) => item.id === chapterId)

    if (!chapter) return

    setActiveChapterId(chapterId)
    playerAnimation.prepareChapterAnimations(chapter)
    const selection = highlightChapterObject(chapter)
    const cameraResult = applyChapterCameraView(chapter, 0)

    return {
      chapter,
      selectedObject: selection?.selectedObject || null,
      outlineObjects: selection?.outlineObjects || [],
      focusTarget: cameraResult?.focusTarget || null,
    }
  }

  const handleSelectCameraView = (index) => {
    return applyChapterCameraView(activeChapter, index)
  }

  return {
    activeChapter,
    cameraViews,
    activeCameraViewIndex,
    highlightChapterObject,
    handleSelectChapter,
    handleSelectCameraView,
  }
}
