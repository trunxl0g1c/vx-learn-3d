import { useEffect, useMemo } from "react"
import { createVXEngine } from "../engine"
import { buildObjectTree, buildObjectTreeList } from "../utils/objectTreeUtils"

export function useVXEngine(options = {}) {
  const engine = useMemo(
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

  useEffect(() => () => {
    engine?.dispose?.()
  }, [engine])

  return engine
}

export default useVXEngine
