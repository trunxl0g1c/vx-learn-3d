export const DEFAULT_HISTORY_LIMIT = 10

function normalizeHistoryLimit(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) return DEFAULT_HISTORY_LIMIT

  return Math.max(1, Math.floor(numericValue))
}

export function cloneHistoryValue(value) {
  if (value === undefined || value === null) return value

  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value)
    } catch {
      // Fall back to JSON cloning for editor records that are plain data.
    }
  }

  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return value
  }
}

export function createHistoryEngine(options = {}) {
  let limit = normalizeHistoryLimit(options.limit)
  let undoStack = []
  let redoStack = []
  const listeners = new Set()

  const getState = () => ({
    limit,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoDepth: undoStack.length,
    redoDepth: redoStack.length,
    undoLabel: undoStack.at(-1)?.label || null,
    redoLabel: redoStack.at(-1)?.label || null,
  })

  const emit = () => {
    const state = getState()
    listeners.forEach((listener) => listener(state))
    return state
  }

  const trimUndoStack = () => {
    if (undoStack.length <= limit) return
    undoStack = undoStack.slice(undoStack.length - limit)
  }

  const recordSnapshot = ({
    label = "Editor change",
    before,
    after,
    apply,
    equals = null,
    mergeKey = null,
    mergeWindowMs = 0,
  } = {}) => {
    if (typeof apply !== "function") return false

    const isEqual = typeof equals === "function"
      ? equals(before, after)
      : Object.is(before, after)

    if (isEqual) return false

    const now = Date.now()
    const lastCommand = undoStack.at(-1)
    const normalizedMergeWindow = Math.max(0, Number(mergeWindowMs) || 0)
    const canMerge = Boolean(
      mergeKey &&
      normalizedMergeWindow > 0 &&
      lastCommand?.mergeKey === mergeKey &&
      lastCommand?.apply === apply &&
      now - lastCommand.timestamp <= normalizedMergeWindow,
    )

    if (canMerge) {
      lastCommand.after = after
      lastCommand.label = label || lastCommand.label
      lastCommand.timestamp = now
    } else {
      undoStack.push({
        label,
        before,
        after,
        apply,
        mergeKey,
        timestamp: now,
      })
      trimUndoStack()
    }

    // Any new edit after an Undo starts a new branch.
    redoStack = []
    emit()
    return true
  }

  const undo = () => {
    const command = undoStack.pop()
    if (!command) return false

    command.apply(command.before, {
      direction: "undo",
      label: command.label,
    })

    redoStack.push(command)
    emit()
    return true
  }

  const redo = () => {
    const command = redoStack.pop()
    if (!command) return false

    command.apply(command.after, {
      direction: "redo",
      label: command.label,
    })

    undoStack.push(command)
    trimUndoStack()
    emit()
    return true
  }

  const clear = () => {
    undoStack = []
    redoStack = []
    return emit()
  }

  const setLimit = (nextLimit) => {
    limit = normalizeHistoryLimit(nextLimit)
    trimUndoStack()

    if (redoStack.length > limit) {
      redoStack = redoStack.slice(redoStack.length - limit)
    }

    return emit()
  }

  const subscribe = (listener) => {
    if (typeof listener !== "function") return () => {}

    listeners.add(listener)
    listener(getState())

    return () => {
      listeners.delete(listener)
    }
  }

  const dispose = () => {
    undoStack = []
    redoStack = []
    listeners.clear()
  }

  return {
    getState,
    recordSnapshot,
    undo,
    redo,
    clear,
    setLimit,
    subscribe,
    dispose,
  }
}

export default createHistoryEngine
