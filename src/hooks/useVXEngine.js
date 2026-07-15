import { useMemo } from "react"
import { createVXEngine } from "../engine"
import { buildObjectTree, buildObjectTreeList } from "../utils/objectTreeUtils"

export function useVXEngine(options = {}) {
  return useMemo(
    () =>
      createVXEngine({
        ...options,
        model: {
          buildObjectTree,
          buildObjectTreeList,
          ...(options.model || {}),
        },
      }),
    []
  )
}

export default useVXEngine
