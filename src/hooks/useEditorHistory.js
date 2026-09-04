import { useCallback, useEffect, useState } from "react"
import { DEFAULT_HISTORY_LIMIT } from "../engine/history"

function createEmptyHistoryState() {
  return {
    limit: DEFAULT_HISTORY_LIMIT,
    canUndo: false,
    canRedo: false,
    undoDepth: 0,
    redoDepth: 0,
    undoLabel: null,
    redoLabel: null,
  }
}

export function useEditorHistory({ historyEngine, projectId }) {
  const [historyState, setHistoryState] = useState(() =>
    historyEngine?.getState?.() || createEmptyHistoryState(),
  )

  useEffect(() => {
    if (!historyEngine?.subscribe) return undefined
    return historyEngine.subscribe(setHistoryState)
  }, [historyEngine])

  useEffect(() => {
    historyEngine?.clear?.()
  }, [historyEngine, projectId])

  const undo = useCallback(() => historyEngine?.undo?.() || false, [historyEngine])
  const redo = useCallback(() => historyEngine?.redo?.() || false, [historyEngine])

  useEffect(() => {
    if (!historyEngine) return undefined

    const handleKeyDown = (event) => {
      if (event.altKey || (!event.ctrlKey && !event.metaKey)) return

      const key = String(event.key || "").toLowerCase()

      if (key === "z" && !event.shiftKey) {
        event.preventDefault()
        undo()
        return
      }

      if (key === "r" && !event.shiftKey) {
        // Ctrl+R is intentionally reserved for Redo inside the Viqubed Editor.
        // Prevent the browser reload even when the redo stack is empty.
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [historyEngine, redo, undo])

  return {
    ...historyState,
    undo,
    redo,
    clear: historyEngine?.clear?.bind(historyEngine),
  }
}

export default useEditorHistory
