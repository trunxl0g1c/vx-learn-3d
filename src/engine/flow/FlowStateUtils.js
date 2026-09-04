import {
  collectHiddenViewerObjectReferences,
  createViewerCutPercentages,
  createViewerObjectReference,
  createViewerVisualState,
} from "../viewer";

export const createFlowObjectReference = createViewerObjectReference;
export const createFlowCutPercentages = createViewerCutPercentages;
export const collectHiddenFlowObjectReferences =
  collectHiddenViewerObjectReferences;

export function createFlowVisualState(options = {}) {
  return createViewerVisualState({
    ...options,
    primaryObject: options.primaryObject || options.selectedObject || null,
  });
}
