import { useCallback, useMemo } from "react";
import {
  createViewerCameraView,
  createViewerVisualState,
} from "../../engine/viewer";
import { applySavedViewerVisualState } from "./applySavedViewerVisualState";

export function useViewerAuthoringState({
  flow,
  procedural,
  quiz,
  modelScene,
  selectedObject,
  selectedObjects,
  blinkSelectedObjectsEnabled,
  blinkTargetObjects = [],
  blinkAssignments = [],
  setBlinkSelectedObjectsEnabled,
  setBlinkTargetObjects,
  setBlinkAssignments,
  xrayTargetObject,
  xrayTargetObjects,
  xrayNormalObjects = [],
  selectionVisualMode,
  selectionEngine = null,
  pullApartState,
  captureObjectTransformState,
  applySavedObjectTransforms,
  getCutStates,
  cutEnabled,
  cutValues,
  cutRanges,
  cameraRef,
  controlsRef,
  resetXray,
  resetVisualState,
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
        xrayNormalObjects,
        selectionVisualMode:
          selectionEngine?.getMaterialOverrideMode?.() || selectionVisualMode,
        blinkSelectedObjectsEnabled,
        blinkTargetObjects,
        blinkAssignments,
        pullApartState,
        objectTransforms: captureObjectTransformState?.() || [],
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
      blinkTargetObjects,
      blinkAssignments,
      pullApartState,
      captureObjectTransformState,
      selectedObject,
      selectedObjects,
      selectionVisualMode,
      selectionEngine,
      xrayTargetObject,
      xrayTargetObjects,
      xrayNormalObjects,
    ],
  );

  const captureCameraView = useCallback(() => {
    const cameraView = createViewerCameraView({
      camera: cameraRef.current,
      controls: controlsRef.current,
      modelScene,
    });

    return cameraView || null;
  }, [cameraRef, controlsRef, modelScene]);

  const saveCurrentStateToActiveFlow = useCallback(() => {
    if (!flow.activeFlowId || !modelScene) return false;

    const visualState = captureVisualState(selectedObject);
    if (!visualState) return false;

    flow.updateFlow(flow.activeFlowId, { visualState });
    return true;
  }, [captureVisualState, flow, modelScene, selectedObject]);

  const saveCameraToActiveFlow = useCallback(() => {
    if (!flow.activeFlowId) return false;

    const cameraView = captureCameraView();
    if (!cameraView) return false;

    flow.updateFlow(flow.activeFlowId, { cameraView });
    return true;
  }, [captureCameraView, flow]);

  const saveViewStateToActiveFlow = useCallback(() => {
    if (!flow.activeFlowId || !modelScene) return false;

    const visualState = captureVisualState(selectedObject);
    const cameraView = captureCameraView();
    if (!visualState || !cameraView) return false;

    const savedAt = new Date().toISOString();
    flow.updateFlow(flow.activeFlowId, {
      visualState: { ...visualState, savedAt },
      cameraView: { ...cameraView, savedAt },
    });
    return true;
  }, [
    captureCameraView,
    captureVisualState,
    flow,
    modelScene,
    selectedObject,
  ]);

  const saveCurrentStateToActiveProcedureStep = useCallback(() => {
    if (!procedural.activeStepId || !modelScene) return false;

    const primaryObject = procedural.activeAnimatedObject || selectedObject;
    const visualState = captureVisualState(primaryObject);
    if (!visualState) return false;

    procedural.updateStep(procedural.activeStepId, { visualState });
    return true;
  }, [captureVisualState, modelScene, procedural, selectedObject]);

  const saveActiveProcedureStepViewState = useCallback(() => {
    if (!procedural.activeStepId || !modelScene) return false;

    const primaryObject = procedural.activeAnimatedObject || selectedObject;
    const visualState = captureVisualState(primaryObject);
    const cameraView = captureCameraView();
    if (!visualState || !cameraView) return false;

    const savedAt = new Date().toISOString();
    procedural.updateStep(procedural.activeStepId, {
      visualState: { ...visualState, savedAt },
      cameraViewSaved: true,
      cameraView: { ...cameraView, savedAt },
    });
    return true;
  }, [
    captureCameraView,
    captureVisualState,
    modelScene,
    procedural,
    selectedObject,
  ]);

  const saveQuizQuestionVisualState = useCallback(() => {
    if (!quiz?.activeQuestionId || !modelScene) return false;

    const visualState = captureVisualState(selectedObject);
    if (!visualState) return false;

    quiz.updateQuestion(quiz.activeQuestionId, { visualState });
    return true;
  }, [captureVisualState, modelScene, quiz, selectedObject]);

  const saveQuizQuestionCamera = useCallback(() => {
    if (!quiz?.activeQuestionId) return false;

    const cameraView = captureCameraView();
    if (!cameraView) return false;

    quiz.updateQuestion(quiz.activeQuestionId, { cameraView });
    return true;
  }, [captureCameraView, quiz]);

  const saveQuizQuestionViewState = useCallback(() => {
    if (!quiz?.activeQuestionId || !modelScene) return false;

    const visualState = captureVisualState(selectedObject);
    const cameraView = captureCameraView();
    if (!visualState || !cameraView) return false;

    const savedAt = new Date().toISOString();
    quiz.updateQuestion(quiz.activeQuestionId, {
      visualState: { ...visualState, savedAt },
      cameraView: { ...cameraView, savedAt },
    });
    return true;
  }, [
    captureCameraView,
    captureVisualState,
    modelScene,
    quiz,
    selectedObject,
  ]);

  const applyVisualState = useCallback(
    (
      visualState,
      {
        chapter = null,
        chapterObject = null,
        resetBeforeApply = true,
        closeInfoOnReset = true,
      } = {},
    ) => {
      if (!visualState || !modelScene) return null;

      if (resetBeforeApply) {
        resetXray({ closeInfo: closeInfoOnReset });
        setBlinkSelectedObjectsEnabled?.(false);
        setBlinkTargetObjects?.([]);
        setBlinkAssignments?.([]);
        if (resetVisualState) {
          resetVisualState();
        } else {
          showAllObjects();
        }
        clearCutSession();
      }

      return applySavedViewerVisualState({
        scene: modelScene,
        chapter,
        chapterObject,
        visualState,
        applySavedPullApart,
        applySavedObjectTransforms,
        makeOthersXray,
        makeTargetObjectsXray,
        highlightObject,
        highlightSelectedObjectsPreservingVisualState,
        setSelectedObjectName,
        setBlinkSelectedObjectsEnabled,
        setBlinkTargetObjects,
        setBlinkAssignments,
        applySavedCuts,
      });
    },
    [
      applySavedCuts,
      applySavedObjectTransforms,
      applySavedPullApart,
      clearCutSession,
      highlightObject,
      highlightSelectedObjectsPreservingVisualState,
      makeOthersXray,
      makeTargetObjectsXray,
      modelScene,
      resetXray,
      resetVisualState,
      setBlinkSelectedObjectsEnabled,
      setBlinkTargetObjects,
      setBlinkAssignments,
      setSelectedObjectName,
      showAllObjects,
    ],
  );

  const showActiveProcedureStepVisualState = useCallback(() => {
    const visualState = procedural.activeStep?.visualState;

    return Boolean(
      applyVisualState(visualState, {
        chapterObject: procedural.activeAnimatedObject || selectedObject,
      }),
    );
  }, [
    applyVisualState,
    procedural.activeAnimatedObject,
    procedural.activeStep?.visualState,
    selectedObject,
  ]);

  const showActiveProcedureStepViewState = useCallback(() => {
    const visualStateApplied = showActiveProcedureStepVisualState();
    const cameraApplied = Boolean(procedural.showActiveStepCameraView?.());
    return visualStateApplied || cameraApplied;
  }, [procedural, showActiveProcedureStepVisualState]);

  const deleteActiveProcedureStepVisualState = useCallback(() => {
    if (!procedural.activeStepId) return false;

    procedural.updateStep(procedural.activeStepId, { visualState: null });
    return true;
  }, [procedural]);

  const deleteActiveProcedureStepViewState = useCallback(() => {
    if (!procedural.activeStepId) return false;

    procedural.updateStep(procedural.activeStepId, {
      visualState: null,
      cameraViewSaved: false,
      cameraView: null,
    });
    return true;
  }, [procedural]);

  const flowAuthoring = useMemo(
    () => ({
      ...flow,
      saveCurrentState: saveCurrentStateToActiveFlow,
      saveCamera: saveCameraToActiveFlow,
      saveViewState: saveViewStateToActiveFlow,
    }),
    [
      flow,
      saveCameraToActiveFlow,
      saveCurrentStateToActiveFlow,
      saveViewStateToActiveFlow,
    ],
  );

  const proceduralAuthoring = useMemo(
    () => ({
      ...procedural,
      saveActiveStepVisualState: saveCurrentStateToActiveProcedureStep,
      showActiveStepVisualState: showActiveProcedureStepVisualState,
      deleteActiveStepVisualState: deleteActiveProcedureStepVisualState,
      saveActiveStepViewState: saveActiveProcedureStepViewState,
      showActiveStepViewState: showActiveProcedureStepViewState,
      deleteActiveStepViewState: deleteActiveProcedureStepViewState,
    }),
    [
      deleteActiveProcedureStepViewState,
      deleteActiveProcedureStepVisualState,
      procedural,
      saveActiveProcedureStepViewState,
      saveCurrentStateToActiveProcedureStep,
      showActiveProcedureStepViewState,
      showActiveProcedureStepVisualState,
    ],
  );

  const quizAuthoring = useMemo(
    () => ({
      ...quiz,
      saveActiveQuestionVisualState: saveQuizQuestionVisualState,
      saveActiveQuestionCamera: saveQuizQuestionCamera,
      saveActiveQuestionViewState: saveQuizQuestionViewState,
    }),
    [
      quiz,
      saveQuizQuestionCamera,
      saveQuizQuestionViewState,
      saveQuizQuestionVisualState,
    ],
  );

  return {
    flowAuthoring,
    proceduralAuthoring,
    quizAuthoring,
    captureVisualState,
    captureCameraView,
    applyVisualState,
  };
}

export default useViewerAuthoringState;
