import { useCallback, useMemo } from "react";
import {
  createViewerCameraView,
  createViewerVisualState,
} from "../../engine/viewer";
import { applySavedViewerVisualState } from "./applySavedViewerVisualState";

export function useViewerAuthoringState({
  flow,
  procedural,
  modelScene,
  selectedObject,
  selectedObjects,
  blinkSelectedObjectsEnabled,
  setBlinkSelectedObjectsEnabled,
  xrayTargetObject,
  xrayTargetObjects,
  selectionVisualMode,
  pullApartState,
  getCutStates,
  cutEnabled,
  cutValues,
  cutRanges,
  cameraRef,
  controlsRef,
  resetXray,
  showAllObjects,
  clearCutSession,
  applySavedPullApart,
  makeOthersXray,
  makeTargetObjectsXray,
  highlightObject,
  highlightSelectedObjectsPreservingVisualState,
  setSelectedObjectName,
  applySavedCuts,
}) {
  const captureVisualState = useCallback(
    (primaryObject = null) =>
      createViewerVisualState({
        scene: modelScene,
        primaryObject,
        selectedObject,
        selectedObjects,
        xrayTargetObject,
        xrayTargetObjects,
        selectionVisualMode,
        blinkSelectedObjectsEnabled,
        pullApartState,
        cutStates: getCutStates?.() || [],
        cutEnabled,
        cutValues,
        cutRanges,
      }),
    [
      cutEnabled,
      cutRanges,
      cutValues,
      getCutStates,
      modelScene,
      blinkSelectedObjectsEnabled,
      pullApartState,
      selectedObject,
      selectedObjects,
      selectionVisualMode,
      xrayTargetObject,
      xrayTargetObjects,
    ],
  );

  const saveCurrentStateToActiveFlow = useCallback(() => {
    if (!flow.activeFlowId || !modelScene) return false;

    const visualState = captureVisualState(selectedObject);
    if (!visualState) return false;

    flow.updateFlow(flow.activeFlowId, { visualState });
    return true;
  }, [captureVisualState, flow, modelScene, selectedObject]);

  const saveCameraToActiveFlow = useCallback(() => {
    if (!flow.activeFlowId) return false;

    const cameraView = createViewerCameraView({
      camera: cameraRef.current,
      controls: controlsRef.current,
      modelScene,
    });

    if (!cameraView) return false;
    flow.updateFlow(flow.activeFlowId, { cameraView });
    return true;
  }, [cameraRef, controlsRef, flow, modelScene]);

  const saveCurrentStateToActiveProcedureStep = useCallback(() => {
    if (!procedural.activeStepId || !modelScene) return false;

    const primaryObject = procedural.activeAnimatedObject || selectedObject;
    const visualState = captureVisualState(primaryObject);
    if (!visualState) return false;

    procedural.updateStep(procedural.activeStepId, { visualState });
    return true;
  }, [captureVisualState, modelScene, procedural, selectedObject]);

  const showActiveProcedureStepVisualState = useCallback(() => {
    const visualState = procedural.activeStep?.visualState;

    if (!visualState || !modelScene) return false;

    resetXray();
    showAllObjects();
    clearCutSession();

    return Boolean(
      applySavedViewerVisualState({
        scene: modelScene,
        chapter: null,
        chapterObject: procedural.activeAnimatedObject || selectedObject,
        visualState,
        applySavedPullApart,
        makeOthersXray,
        makeTargetObjectsXray,
        highlightObject,
        highlightSelectedObjectsPreservingVisualState,
        setSelectedObjectName,
        setBlinkSelectedObjectsEnabled,
        applySavedCuts,
      }),
    );
  }, [
    applySavedCuts,
    applySavedPullApart,
    clearCutSession,
    highlightObject,
    highlightSelectedObjectsPreservingVisualState,
    makeOthersXray,
    makeTargetObjectsXray,
    modelScene,
    procedural.activeAnimatedObject,
    procedural.activeStep?.visualState,
    resetXray,
    selectedObject,
    setBlinkSelectedObjectsEnabled,
    setSelectedObjectName,
    showAllObjects,
  ]);

  const deleteActiveProcedureStepVisualState = useCallback(() => {
    if (!procedural.activeStepId) return false;

    procedural.updateStep(procedural.activeStepId, { visualState: null });
    return true;
  }, [procedural]);

  const flowAuthoring = useMemo(
    () => ({
      ...flow,
      saveCurrentState: saveCurrentStateToActiveFlow,
      saveCamera: saveCameraToActiveFlow,
    }),
    [flow, saveCameraToActiveFlow, saveCurrentStateToActiveFlow],
  );

  const proceduralAuthoring = useMemo(
    () => ({
      ...procedural,
      saveActiveStepVisualState: saveCurrentStateToActiveProcedureStep,
      showActiveStepVisualState: showActiveProcedureStepVisualState,
      deleteActiveStepVisualState: deleteActiveProcedureStepVisualState,
    }),
    [
      deleteActiveProcedureStepVisualState,
      procedural,
      saveCurrentStateToActiveProcedureStep,
      showActiveProcedureStepVisualState,
    ],
  );

  return {
    flowAuthoring,
    proceduralAuthoring,
  };
}

export default useViewerAuthoringState;
