import { useMemo, useState } from "react"

import {
  collectMeshes,
  createChapterHighlightPayload,
  createClearSelectionPayload,
  createPlayerObjectSelectionPayload,
} from "../../../engine/selection"

function createSelectedObjectInfo(object, chapters = []) {
  if (!object) return null

  const meshes = collectMeshes(object)
  const normalizedName = object.name || object.type || "Selected Object"

  const objectUuid = String(object.uuid || "").trim()
  const objectName = (object.name || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()

  const matchedChapter = chapters.find((chapter) => {
    const chapterObjectUuid = String(
      chapter?.objectUuid || chapter?.objectUUID || "",
    ).trim()

    if (objectUuid && chapterObjectUuid && chapterObjectUuid === objectUuid) {
      return true
    }

    const chapterObjectName = (chapter.objectName || "")
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/\s+/g, " ")
      .trim()

    return objectName && chapterObjectName === objectName
  })

  return {
    name: normalizedName,
    type: object.type || "Object3D",
    meshCount: meshes.length,
    uuid: object.uuid,
    chapterId: matchedChapter?.id || null,
    chapterTitle: matchedChapter?.title || null,
  }
}

export default function usePlayerV2Selection({ chapters = [] } = {}) {
  const [selectedObject, setSelectedObject] = useState(null)
  const [outlineObjects, setOutlineObjects] = useState([])

  const selectedInfo = useMemo(() => {
    return createSelectedObjectInfo(selectedObject, chapters)
  }, [selectedObject, chapters])

  const applySelectionPayload = (payload) => {
    setSelectedObject(payload.selectedObject || null)
    setOutlineObjects(payload.outlineObjects || [])
    return payload
  }

  const clearSelection = () => {
    return applySelectionPayload(createClearSelectionPayload())
  }

  const selectObject = (object) => {
    const payload = createPlayerObjectSelectionPayload(object, chapters)
    return applySelectionPayload(payload)
  }

  const highlightChapterObject = (chapter, scene) => {
    const payload = createChapterHighlightPayload(chapter, scene)
    return applySelectionPayload(payload)
  }

  return {
    selectedObject,
    outlineObjects,
    selectedInfo,

    setSelectedObject,
    setOutlineObjects,

    selectObject,
    highlightChapterObject,
    clearSelection,
  }
}
