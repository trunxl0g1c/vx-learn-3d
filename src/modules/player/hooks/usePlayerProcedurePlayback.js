import { useEffect, useMemo, useRef, useState } from "react";
import {
  createProceduralEngine,
  normalizeProceduralDefinitions,
} from "../../../engine/procedural";
import { isLazyMaterialRecord } from "../../../engine/project/LazyMaterialRecords";
import { createPlayerProcedureActions } from "./createPlayerProcedureActions";
import { createPlayerProcedureStepHighlighter } from "./createPlayerProcedureStepHighlighter";
import { repairLegacyReverseProcedureForPlayback } from "../playerProcedureLegacyRepair";
import { getPlayerInitialObjectTransform } from "../playerInitialSceneState";

function waitForProcedureResetFrame() {
  return new Promise((resolve) => {
    if (typeof globalThis.requestAnimationFrame === "function") {
      globalThis.requestAnimationFrame(() => resolve());
      return;
    }

    setTimeout(resolve, 0);
  });
}

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
  initialSceneStateRef = null,
}) {
  const [activeProcedureId, setActiveProcedureId] = useState(null);
  const [activeProcedureSnapshot, setActiveProcedureSnapshot] = useState(null);
  const [status, setStatus] = useState("idle");
  const [stepIndex, setStepIndex] = useState(-1);
  const [completedStepIds, setCompletedStepIds] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [assemblyGhostRevision, setAssemblyGhostRevision] = useState(0);
  const runTokenRef = useRef(0);
  const referenceLengthRef = useRef(1);
  const engine = useMemo(() => createProceduralEngine(), []);
  const procedures = useMemo(
    () => normalizeProceduralDefinitions(material?.procedures),
    [material?.procedures],
  );
  const activeProcedure = useMemo(() => {
    if (
      activeProcedureSnapshot?.id &&
      activeProcedureSnapshot.id === activeProcedureId
    ) {
      return activeProcedureSnapshot;
    }

    return (
      procedures.find((procedure) => procedure.id === activeProcedureId) || null
    );
  }, [activeProcedureId, activeProcedureSnapshot, procedures]);
  const activePlaybackProcedure = useMemo(
    () =>
      activeProcedure
        ? engine.createPlaybackDefinition?.(activeProcedure) || activeProcedure
        : null,
    [activeProcedure, engine],
  );
  const activeSteps = useMemo(
    () =>
      (activePlaybackProcedure?.steps || []).filter(
        (step) => step.enabled !== false,
      ),
    [activePlaybackProcedure],
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
      setActiveProcedureSnapshot(null);
      setStatus("idle");
      setStepIndex(-1);
      setCompletedStepIds([]);
      setFeedback("");
    }
  }, [activeProcedureId, procedures]);

  useEffect(() => {
    return () => engine.dispose?.();
  }, [engine]);

  const getStepTargets = (step) => {
    const targets = engine.findClickTargets?.(modelScene, step) || [];

    if (targets.length > 0) return targets;

    const legacyTarget =
      engine.findObject?.(modelScene, step?.targetObject) || null;
    return legacyTarget ? [legacyTarget] : [];
  };

  const getStepAnimatedEntries = (step) =>
    engine.findAnimatedObjects?.(modelScene, step) || [];

  const highlightStep = createPlayerProcedureStepHighlighter({
    getProcedureStepTargets: getStepTargets,
    restorePlayerRenderMode,
    playerFreePlay,
    applySavedVisualState,
    setSelectedObject,
    setOutlineObjects,
    proceduralEngine: engine,
    applySavedCameraView,
    focusObject,
    modelScene,
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
    refreshAssemblyGhost: () => {
      setAssemblyGhostRevision((current) => current + 1);
    },
  });

  const resetControllerState = () => {
    runTokenRef.current += 1;
    engine.dispose?.();
    setActiveProcedureId(null);
    setActiveProcedureSnapshot(null);
    setStatus("idle");
    setStepIndex(-1);
    setCompletedStepIds([]);
    setFeedback("");
  };

  const stopProcedure = ({ clearSelection = true } = {}) => {
    runTokenRef.current += 1;
    engine.dispose?.();

    if (isAssembly && activePlaybackProcedure && modelScene) {
      engine.resetProcedure?.(modelScene, activePlaybackProcedure);
    }

    setStatus("idle");
    setActiveProcedureId(null);
    setActiveProcedureSnapshot(null);
    setStepIndex(-1);
    setCompletedStepIds([]);
    setFeedback("");

    if (clearSelection) {
      setSelectedObject(null);
      setOutlineObjects([]);
    }
  };

  const resolveProcedureForPlayback = async (procedureId) => {
    let procedure = procedures.find((item) => item.id === procedureId) || null;

    if (
      procedure &&
      isLazyMaterialRecord(procedure, "procedures") &&
      playerProject.loadProcedureRecord
    ) {
      procedure =
        (await playerProject.loadProcedureRecord(procedureId)) || procedure;
    }

    return procedure;
  };

  const startProcedurePlayback = async (
    procedureId,
    { replay = false } = {},
  ) => {
    const procedure = await resolveProcedureForPlayback(procedureId);
    const repairedProcedure = procedure
      ? repairLegacyReverseProcedureForPlayback({
          procedure,
          scene: modelScene,
          engine,
          resolveInitialTransform: (object) =>
            getPlayerInitialObjectTransform(
              initialSceneStateRef?.current,
              object,
            ),
        })
      : null;
    const playbackProcedure = repairedProcedure
      ? engine.createPlaybackDefinition?.(repairedProcedure) || repairedProcedure
      : null;
    const steps = (playbackProcedure?.steps || []).filter(
      (step) => step.enabled !== false,
    );

    if (!procedure || !playbackProcedure || steps.length === 0 || !modelScene) {
      return false;
    }

    const runToken = ++runTokenRef.current;

    engine.dispose?.();
    stopFlow();
    stopChapterFlows();
    setActiveChapterId(null);
    playerAnimation.stopChapterAnimations?.();
    playerFreePlay.resetVisualState?.({ animationDuration: 0 });
    restorePlayerRenderMode();

    // Keep the exact hydrated definition used to start playback as a runtime
    // snapshot. IndexedDB hydration updates React state asynchronously; without
    // this snapshot the first interaction could still read the lazy summary
    // (0 inline steps), so Guided animation appeared to do nothing until a
    // later render. This is especially visible immediately after duplicating a
    // reversed Procedure.
    setActiveProcedureSnapshot(playbackProcedure);
    setActiveProcedureId(procedureId);
    setStepIndex(-1);
    setCompletedStepIds([]);
    setSelectedObject(null);
    setOutlineObjects([]);
    setStatus("resetting");
    setFeedback(
      replay
        ? "Mengembalikan semua step ke posisi awal..."
        : "Menyiapkan procedure...",
    );

    referenceLengthRef.current =
      engine.getReferenceLength?.(modelScene, 1) || 1;
    engine.resetProcedure?.(modelScene, playbackProcedure);
    modelScene.updateMatrixWorld?.(true);

    // Re-apply the first step after the reset has reached the scene graph. This
    // makes replay deterministic even when the same Procedure id stays active.
    await waitForProcedureResetFrame();
    if (runTokenRef.current !== runToken) return false;

    const firstStep = steps[0];
    setStepIndex(0);
    setFeedback(
      firstStep?.instruction ||
        (engine.isAssemblyProcedure?.(procedure)
          ? "Geser komponen ke target yang ditampilkan."
          : "Klik object yang ditandai."),
    );
    setStatus("waiting");
    setAssemblyGhostRevision((current) => current + 1);
    highlightStep(firstStep, { applyStepStart: true });
    return true;
  };

  const playProcedure = (procedureId) =>
    startProcedurePlayback(procedureId, { replay: false });

  const replayProcedure = (procedureId = activeProcedureId) => {
    if (!procedureId) return Promise.resolve(false);
    return startProcedurePlayback(procedureId, { replay: true });
  };

  const handleObjectClick = (object) => {
    if (
      !activeProcedure ||
      !["waiting", "dragging", "animating"].includes(status)
    ) {
      return null;
    }

    const currentStep = activeSteps[stepIndex];
    const targetObjects = getStepTargets(currentStep);
    const targetObject = targetObjects[0] || null;
    const targetOutlineObjects = targetObjects.flatMap(
      (entry) => engine.collectMeshes?.(entry) || [],
    );
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

    const matchesClickTarget = engine.matchesAnyClickTarget?.(
      object,
      targetObjects,
      modelScene,
    ) ?? targetObjects.some((entry) =>
      engine.matchesClickTarget?.(object, entry, modelScene),
    );

    if (!matchesClickTarget) {
      const targetNames = (currentStep.clickTargets || [])
        .map((entry) => entry?.name)
        .filter(Boolean);
      setFeedback(
        targetNames.length > 1
          ? `Object belum tepat. Klik salah satu dari ${targetNames.join(", ")}.`
          : `Object belum tepat. Klik ${
              currentStep.targetObject?.name || currentStep.name
            }.`,
      );
      highlightStep(currentStep);
      return {
        selectedObject: targetObject,
        outlineObjects: targetOutlineObjects,
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
        if (runTokenRef.current !== runToken) return;

        if (!completed) {
          setStatus("waiting");
          setFeedback(
            "Animasi step tidak memiliki transform Start/End yang valid. Periksa Save Start dan Save Target pada Animated Object.",
          );
          highlightStep(currentStep, { applyStepStart: true });
          return;
        }

        advanceProcedureStep(currentStep);
      })
      .catch((error) => {
        if (runTokenRef.current !== runToken) return;
        console.error("Failed to play Guided Procedure step:", error);
        setStatus("waiting");
        setFeedback("Animasi step gagal dijalankan. Periksa transform object.");
        highlightStep(currentStep, { applyStepStart: true });
      });

    return {
      selectedObject: animatedObject,
      outlineObjects: animatedOutlineObjects,
    };
  };

  const getProtectedSelection = () => {
    if (!["waiting", "dragging", "animating"].includes(status)) return null;

    const currentStep = activeSteps[stepIndex];

    if (status === "animating") {
      const reference =
        currentStep?.animatedObject || currentStep?.targetObject;
      const displayObject = engine.findObject?.(modelScene, reference);

      if (!displayObject) return null;

      return {
        selectedObject: displayObject,
        outlineObjects: engine.collectMeshes?.(displayObject) || [],
      };
    }

    const targetObjects = getStepTargets(currentStep);
    const displayObject = targetObjects[0] || null;

    if (!displayObject) return null;

    return {
      selectedObject: displayObject,
      outlineObjects: targetObjects.flatMap(
        (entry) => engine.collectMeshes?.(entry) || [],
      ),
    };
  };

  return {
    engine,
    procedures,
    activeProcedure,
    activePlaybackProcedure,
    activeProcedureId,
    activeSteps,
    activeStep,
    isAssembly,
    status,
    stepIndex,
    completedStepIds,
    feedback,
    activeAssemblyObject,
    assemblyGhostRevision,
    playProcedure,
    replayProcedure,
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
