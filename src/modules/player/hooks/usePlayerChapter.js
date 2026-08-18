import { useEffect, useMemo, useRef, useState } from "react"
import { getChapterCameraViews } from "../../../engine/chapter"
import { switchCameraProjectionThen } from "../../../engine/camera"
import {
  applyChapterModelRotation,
  createChapterFocusTarget,
} from "../../../engine/model"
import { createChapterHighlightPayload } from "../../../engine/selection"
import { isLazyMaterialRecord } from "../../../engine/project/LazyMaterialRecords"

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
  loadChapterRecord = null,
}) {
  const [activeCameraViewIndex, setActiveCameraViewIndex] = useState(0)
  const [activeChapterData, setActiveChapterData] = useState(null)
  const chapterSelectionRequestRef = useRef(0)

  const activeChapter = useMemo(() => {
    if (activeChapterData?.id === activeChapterId) return activeChapterData
    return material?.chapters?.find((chapter) => chapter.id === activeChapterId) || null
  }, [activeChapterData, activeChapterId, material?.chapters])

  const cameraViews = useMemo(
    () => getChapterCameraViews(activeChapter),
    [activeChapter],
  )

  useEffect(() => {
    setActiveCameraViewIndex(0)
    if (!activeChapterId) setActiveChapterData(null)
  }, [activeChapterId])

  useEffect(() => {
    setActiveChapterData(null)
  }, [material?.projectId, material?.id])

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

  const handleSelectChapter = async (chapterId) => {
    let chapter = material?.chapters?.find((item) => item.id === chapterId)

    if (!chapter) return null

    const requestId = chapterSelectionRequestRef.current + 1
    chapterSelectionRequestRef.current = requestId
    setActiveChapterId(chapterId)

    if (
      loadChapterRecord &&
      isLazyMaterialRecord(chapter, "chapters")
    ) {
      chapter = (await loadChapterRecord(chapterId)) || chapter
    }

    if (chapterSelectionRequestRef.current !== requestId) return null

    // Keep the hydrated Chapter as the active runtime record. The material
    // catalogue may intentionally contain only lazy summaries, which do not
    // include authored media, parameters, markers, animations, or camera data.
    setActiveChapterData(chapter)
    playerAnimation.prepareChapterAnimations(chapter)
    const selection = highlightChapterObject(chapter)
    const cameraResult = applyChapterCameraView(chapter, 0)

    const chapters = Array.isArray(material?.chapters) ? material.chapters : []
    const chapterIndex = chapters.findIndex((item) => item.id === chapterId)
    const nextChapter = chapters[chapterIndex + 1]

    if (
      loadChapterRecord &&
      isLazyMaterialRecord(nextChapter, "chapters")
    ) {
      const prefetch = () => loadChapterRecord(nextChapter.id).catch(() => {})

      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(prefetch, { timeout: 1200 })
      } else {
        window.setTimeout(prefetch, 160)
      }
    }

    return {
      chapter,
      selectedObject: selection?.selectedObject || null,
      outlineObjects: selection?.outlineObjects || [],
      focusTarget: cameraResult?.focusTarget || null,
      cameraView: cameraResult?.cameraView || null,
      cameraViewIndex: cameraResult?.index || 0,
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
