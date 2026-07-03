import {
  applyChapterModelRotation,
  createChapterFocusTarget,
} from "../../../engine/model"
import { createChapterHighlightPayload } from "../../../engine/selection"

export default function usePlayerChapter({
  material,
  activeChapterId,
  setActiveChapterId,
  modelScene,
  focusTargetRef,
  setSelectedObject,
  setOutlineObjects,
  playerAnimation,
}) {
  const activeChapter = material?.chapters?.find(
    (chapter) => chapter.id === activeChapterId
  )

  const highlightChapterObject = (chapter, sceneOverride = null) => {
    const rootScene = sceneOverride || modelScene

    if (!rootScene || !chapter?.objectName) return

    const { selectedObject, outlineObjects } = createChapterHighlightPayload(
      chapter,
      rootScene
    )

    setSelectedObject(selectedObject)
    setOutlineObjects(outlineObjects)
  }

  const handleSelectChapter = (chapterId) => {
    const chapter = material?.chapters?.find((item) => item.id === chapterId)

    if (!chapter) return

    setActiveChapterId(chapterId)
    playerAnimation.prepareChapterAnimations(chapter)
    highlightChapterObject(chapter)

    applyChapterModelRotation(modelScene, chapter)

    const chapterFocusTarget = createChapterFocusTarget(chapter)

    if (chapterFocusTarget) {
      focusTargetRef.current = chapterFocusTarget
    }
  }

  return {
    activeChapter,
    highlightChapterObject,
    handleSelectChapter,
  }
}
