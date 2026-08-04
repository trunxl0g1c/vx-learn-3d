import { useEffect, useMemo, useRef, useState } from "react";
import {
  createProceduralEngine,
  normalizeProceduralDefinitions,
} from "../../../engine/procedural";
import { isLazyMaterialRecord } from "../../../engine/project/LazyMaterialRecords";
import { createPlayerProcedureActions } from "./createPlayerProcedureActions";
import { createPlayerProcedureStepHighlighter } from "./createPlayerProcedureStepHighlighter";

export default function usePlayerProcedurePlayback({
  material,
  modelScene,
  playerProject,
  playerAnimation,
  playerFreePlay,
  restorePlayerRenderMode,
  applySavedVisualState,
  applySavedCameraView,
  focusObject,
  setActiveChapterId,
  setSelectedObject,
  setOutlineObjects,
  stopFlow,
  stopChapterFlows,
}) {
  const [activeProcedureId, setActiveProcedureId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [stepIndex, setStepIndex] = useState(-1);
  const [completedStepIds, setCompletedStepIds] = useState([]);
  const [feedback, setFeedback] = useState("");
  const runTokenRef = useRef(0);
  const referenceLengthRef = useRef(1);
  const engine = useMemo(() => createProceduralEngine(), []);
  const procedures = useMemo(
    () => normalizeProceduralDefinitions(material?.procedures),
    [material?.procedures],
  );
  const activeProcedure = useMemo(
    () =>
      procedures.find((procedure) => procedure.id === activeProcedureId) || null,
    [activeProcedureId, procedures],
  );
  const activeSteps = useMemo(
    () => (activeProcedure?.steps || []).filter((step) => step.enabled !== false),
    [activeProcedure],
  );
  const activeStep = activeSteps[stepIndex] || null;
  const isAssembly = engine.isAssemblyProcedure?.(activeProcedure) === true;

  useEffect(() => {
    if (
      activeProcedureId &&
      !procedures.some((procedure) => procedure.id === activeProcedureId)
    ) {
      runTokenRef.current += 1;
      setActiveProcedureId(null);
      setStatus("idle");
      setStepIndex(-1);
      setCompletedStepIds([]);
      setFeedback("");
    }
  }, [activeProcedureId, procedures]);

  useEffect(() => {
    return () => engine.dispose?.();
  }, [engine]);

  const getStepTarget = (step) =>
    engine.findObject?.(modelScene, step?.targetObject) || null;

  const getStepAnimatedEntries = (step) =>
    engine.findAnimatedObjects?.(modelScene, step) || [];

  const highlightStep = createPlayerProcedureStepHighlighter({
    getProcedureStepTarget: getStepTarget,
    restorePlayerRenderMode,
    playerFreePlay,
    applySavedVisualState,
    setSelectedObject,
    setOutlineObjects,
    proceduralEngine: engine,
    applySavedCameraView,
    focusObject,
  });

  const {
    activeAssemblyObject,
    advanceProcedureStep,
    handleAssemblyDragStart,
    handleAssemblyDrag,
    handleAssemblyDragEnd,
    playProcedureCompletionAnimation,
  } = createPlayerProcedureActions({
    proceduralEngine: engine,
    modelScene,
    activeProcedure,
    procedures,
    activeProcedureIsAssembly: isAssembly,
    activeProcedureStep: activeStep,
    activeProcedureSteps: activeSteps,
    procedureStepIndex: stepIndex,
    procedureReferenceLengthRef: referenceLengthRef,
    setProcedureStatus: setStatus,
    setProcedureFeedback: setFeedback,
    setCompletedProcedureStepIds: setCompletedStepIds,
    setProcedureStepIndex: setStepIndex,
    setSelectedObject,
    setOutlineObjects,
    highlightProcedureStep: highlightStep,
    playAnimationAssignments: playerAnimation.playAnimationAssignments,
  });

  const resetControllerState = () => {
    runTokenRef.current += 1;
    engine.dispose?.();
    setActiveProcedureId(null);
    setStatus("idle");
    setStepIndex(-1);
    setCompletedStepIds([]);
    setFeedback("");
  };

  const stopProcedure = ({ clearSelection = true } = {}) => {
    runTokenRef.current += 1;
    engine.dispose?.();

    if (isAssembly && activeProcedure && modelScene) {
      engine.resetProcedure?.(modelScene, activeProcedure);
    }

    setStatus("idle");
    setActiveProcedureId(null);
    setStepIndex(-1);
    setCompletedStepIds([]);
    setFeedback("");

    if (clearSelection) {
      setSelectedObject(null);
      setOutlineObjects([]);
    }
  };

  const playProcedure = async (procedureId) => {
    let procedure = procedures.find((item) => item.id === procedureId);

    if (
      procedure &&
      isLazyMaterialRecord(procedure, "procedures") &&
      playerProject.loadProcedureRecord
    ) {
      procedure =
        (await playerProject.loadProcedureRecord(procedureId)) || procedure;
    }

    const steps = (procedure?.steps || []).filter((step) => step.enabled !== false);

    if (!procedure || steps.length === 0 || !modelScene) return false;

    runTokenRef.current += 1;
    engine.dispose?.();
    stopFlow();
    stopChapterFlows();
    setActiveChapterId(null);
    playerAnimation.stopChapterAnimations?.();
    playerFreePlay.resetVisualState?.({ animationDuration: 0 });
    restorePlayerRenderMode();
    referenceLengthRef.current = engine.getReferenceLength?.(modelScene, 1) || 1;
    engine.resetProcedure?.(modelScene, procedure);

    setActiveProcedureId(procedureId);
    setStepIndex(0);
    setCompletedStepIds([]);
    setFeedback(
      steps[0]?.instruction ||
        (engine.isAssemblyProcedure?.(procedure)
          ? "Geser komponen ke target yang ditampilkan."
          : "Klik object yang ditandai."),
    );
    setStatus("waiting");
    highlightStep(steps[0]);
    return true;
  };

  const handleObjectClick = (object) => {
    if (
      !activeProcedure ||
      !["waiting", "dragging", "animating"].includes(status)
    ) {
      return null;
    }

    const currentStep = activeSteps[stepIndex];
    const targetObject = getStepTarget(currentStep);
    const animatedEntries = getStepAnimatedEntries(currentStep);
    const animatedObject = animatedEntries[0]?.object3D || null;
    const animatedOutlineObjects = animatedEntries.flatMap(
      (entry) => engine.collectMeshes?.(entry.object3D) || [],
    );

    if (!currentStep || !targetObject) {
      setFeedback("Target object untuk step ini tidak ditemukan.");
      return null;
    }

    if (!animatedObject) {
      setFeedback("Animated object untuk step ini tidak ditemukan.");
      return null;
    }

    if (isAssembly) {
      const matchesAssemblyObject = engine.matchesClickTarget?.(
        object,
        animatedObject,
        modelScene,
      );

      if (!matchesAssemblyObject) {
        setFeedback(
          `Komponen belum tepat. Geser ${currentStep.animatedObject?.name || currentStep.targetObject?.name || currentStep.name}.`,
        );
        highlightStep(currentStep);
        return {
          selectedObject: animatedObject,
          outlineObjects: animatedOutlineObjects,
        };
      }

      setSelectedObject(animatedObject);
      setOutlineObjects(animatedOutlineObjects);
      setFeedback("Geser komponen ke ghost target.");
      return {
        selectedObject: animatedObject,
        outlineObjects: animatedOutlineObjects,
      };
    }

    if (status === "animating") {
      return {
        selectedObject: animatedObject,
        outlineObjects: animatedOutlineObjects,
      };
    }

    const matchesClickTarget = engine.matchesClickTarget?.(
      object,
      targetObject,
      modelScene,
    );

    if (!matchesClickTarget) {
      setFeedback(
        `Object belum tepat. Klik ${currentStep.targetObject?.name || currentStep.name}.`,
      );
      highlightStep(currentStep);
      return {
        selectedObject: targetObject,
        outlineObjects: engine.collectMeshes?.(targetObject) || [],
      };
    }

    const runToken = ++runTokenRef.current;
    setStatus("animating");
    setFeedback("Menjalankan animasi step...");
    setSelectedObject(animatedObject);
    setOutlineObjects(animatedOutlineObjects);

    engine
      .animateStepObjects({ scene: modelScene, step: currentStep })
      .then((completed) => {
        if (!completed || runTokenRef.current !== runToken) return;
        advanceProcedureStep(currentStep);
      });

    return {
      selectedObject: animatedObject,
      outlineObjects: animatedOutlineObjects,
    };
  };

  const getProtectedSelection = () => {
    if (!["waiting", "dragging", "animating"].includes(status)) return null;

    const currentStep = activeSteps[stepIndex];
    const reference =
      status === "animating"
        ? currentStep?.animatedObject || currentStep?.targetObject
        : currentStep?.targetObject;
    const displayObject = engine.findObject?.(modelScene, reference);

    if (!displayObject) return null;

    return {
      selectedObject: displayObject,
      outlineObjects: engine.collectMeshes?.(displayObject) || [],
    };
  };

  return {
    engine,
    procedures,
    activeProcedure,
    activeProcedureId,
    activeSteps,
    activeStep,
    isAssembly,
    status,
    stepIndex,
    completedStepIds,
    feedback,
    activeAssemblyObject,
    playProcedure,
    stopProcedure,
    resetControllerState,
    handleObjectClick,
    getProtectedSelection,
    handleAssemblyDragStart,
    handleAssemblyDrag,
    handleAssemblyDragEnd,
    playProcedureCompletionAnimation,
  };
}
