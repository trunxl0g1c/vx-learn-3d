import { applyCutAway as applyEngineCutAway } from "../engine/cut"

export function applyCutAway(
  modelScene,
  enabled,
  cutValueOrValues,
  axis = "x",
  bounds = null,
  targetObject = null,
) {
  return applyEngineCutAway(
    modelScene,
    enabled,
    cutValueOrValues,
    axis,
    bounds,
    targetObject,
  )
}
