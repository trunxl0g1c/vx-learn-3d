import { useMemo } from "react"
import { createVXEngine } from "../engine"
import { buildObjectTree } from "../utils/objectTreeUtils"

export function useVXEngine(options = {}) {
  return useMemo(
    () =>
      createVXEngine({
        ...options,
        model: {
          buildObjectTree,
          ...(options.model || {}),
        },
      }),
    []
  )
}

export default useVXEngine
