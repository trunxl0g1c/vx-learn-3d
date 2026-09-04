import { useCallback, useEffect, useMemo, useState } from "react";
import { createProceduralManagerAdapter } from "../managers/ProceduralManager";
import {
  getLogicalObjectParent,
  resolveLogicalObject,
  resolveObjectTreeRoot,
} from "../utils/objectTreeUtils";
import { createSelectionPayload } from "../engine/selection/SelectionSceneUtils";
import {
  createCameraStateFromStoredView,
  switchCameraProjectionThen,
} from "../engine/camera";
import { createViewerCameraView } from "../engine/viewer";
import { applyStoredModelRotation } from "../engine/model";
import { isLazyMaterialRecord } from "../engine/project/LazyMaterialRecords";

export function useProceduralManager({
  material,
  setMaterial,
  modelScene,
  selectedObject,
  cameraRef = null,
  controlsRef = null,
  setCameraProjectionMode = null,
  proceduralEngine = null,
  modelEngine = null,
  setOutlineObjects = null,
  setSelectedObject = null,
  setSelectedObjectName = null,
  hydrateProcedureRecord = null,
}) {
  const manager = useMemo(
    () => createProceduralManagerAdapter(proceduralEngine),
    [proceduralEngine],
  );
  const procedures = useMemo(
    () => manager.normalizeDefinitions(material?.procedures),
    [manager, material?.procedures],
  );
  const [activeProcedureId, setActiveProcedureId] = useState(null);
  const [activeStepId, setActiveStepId] = useState(null);
  const [isAuthoringActive, setIsAuthoringActive] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [transformMode, setTransformMode] = useState("translate");
  const [activeAnimatedEntryId, setActiveAnimatedEntryId] = useState(null);

  useEffect(() => {
    if (procedures.length === 0) {
      setActiveProcedureId(null);
      setActiveStepId(null);
      setIsPreviewing(false);
      return;
    }

    if (!procedures.some((item) => item.id === activeProcedureId)) {
      setActiveProcedureId(procedures[0].id);
    }
  }, [activeProcedureId, procedures]);

  const activeProcedure = useMemo(
    () => procedures.find((item) => item.id === activeProcedureId) || null,
    [activeProcedureId, procedures],
  );
  const isLoadingActiveProcedure = isLazyMaterialRecord(
    activeProcedure,
    "procedures",
  );

  useEffect(() => {
    if (
      !isAuthoringActive ||
      !activeProcedureId ||
      !hydrateProcedureRecord ||
      !isLazyMaterialRecord(activeProcedure, "procedures")
    ) {
      return;
    }

    hydrateProcedureRecord(activeProcedureId).catch((error) => {
      console.error("Failed to load Procedure detail:", error);
    });
  }, [
    activeProcedure,
    activeProcedureId,
    hydrateProcedureRecord,
    isAuthoringActive,
  ]);

  useEffect(() => {
    const steps = activeProcedure?.steps || [];

    if (steps.length === 0) {
      setActiveStepId(null);
      return;
    }

    if (!steps.some((step) => step.id === activeStepId)) {
      setActiveStepId(steps[0].id);
    }
  }, [activeProcedure, activeStepId]);

  const activeStep = useMemo(
    () =>
      activeProcedure?.steps?.find((step) => step.id === activeStepId) || null,
    [activeProcedure, activeStepId],
  );

  const activeClickTargets = useMemo(
    () =>
      manager.normalizeClickTargets(
        activeStep,
        manager.isAssemblyProcedure(activeProcedure),
      ),
    [activeProcedure, activeStep, manager],
  );

  const activeAnimatedEntries = useMemo(
    () =>
      manager.normalizeAnimatedObjects(
        activeStep,
        manager.isAssemblyProcedure(activeProcedure),
      ),
    [activeProcedure, activeStep, manager],
  );
  const activeAnimatedEntry =
    activeAnimatedEntries.find((entry) => entry.id === activeAnimatedEntryId) ||
    activeAnimatedEntries[0] ||
    null;
  const activeAnimatedObject =
    activeAnimatedEntry && modelScene
      ? manager.findObject(modelScene, activeAnimatedEntry.object)
      : null;

  useEffect(() => {
    if (activeAnimatedEntries.length === 0) {
      setActiveAnimatedEntryId(null);
      return;
    }

    if (!activeAnimatedEntries.some((entry) => entry.id === activeAnimatedEntryId)) {
      setActiveAnimatedEntryId(activeAnimatedEntries[0].id);
    }
  }, [activeAnimatedEntries, activeAnimatedEntryId]);

  const applyStoredStepCameraView = useCallback(
    (cameraView) => {
      const cameraState = createCameraStateFromStoredView(cameraView);
      if (!cameraState || !cameraRef?.current) return false;

      applyStoredModelRotation(modelScene, cameraView);
      const requestedMode =
        cameraState.cameraType === "orthographic"
          ? "orthographic"
          : "perspective";

      return switchCameraProjectionThen({
        cameraRef,
        setProjectionMode: setCameraProjectionMode,
        mode: requestedMode,
        onReady: (camera) => {
          camera.position.copy(cameraState.position);
          if (cameraState.quaternion) camera.quaternion.copy(cameraState.quaternion);
          if (cameraState.up) camera.up.copy(cameraState.up).normalize();

          if (
            camera.isOrthographicCamera &&
            Number.isFinite(Number(cameraState.zoom))
          ) {
            camera.zoom = Number(cameraState.zoom);
          }
          if (
            camera.isPerspectiveCamera &&
            Number.isFinite(Number(cameraState.fov))
          ) {
            camera.fov = Number(cameraState.fov);
          }
          camera.updateProjectionMatrix?.();

          if (controlsRef?.current) {
            controlsRef.current.object = camera;
            controlsRef.current.target.copy(cameraState.target);
            controlsRef.current.update?.();
          }
        },
      });
    },
    [
      cameraRef,
      controlsRef,
      modelScene,
      setCameraProjectionMode,
    ],
  );

  const commitProcedures = useCallback(
    (updater) => {
      setMaterial((previous) => {
        const current = manager.normalizeDefinitions(previous?.procedures);
        const next = typeof updater === "function" ? updater(current) : updater;

        return {
          ...previous,
          procedures: manager.normalizeDefinitions(next),
        };
      });
    },
    [manager, setMaterial],
  );

  const createProcedure = useCallback((type = "guided") => {
    const next = manager.createDefinition(procedures.length + 1, type);
    commitProcedures((current) => [...current, next]);
    setActiveProcedureId(next.id);
    setActiveStepId(null);
    setIsAuthoringActive(true);
    return next;
  }, [commitProcedures, manager, procedures.length]);

  const resolveImplicitProcedureStartTransform = useCallback(
    (reference) => {
      if (!modelScene || !reference) return null;

      const object = manager.findObject(modelScene, reference);
      const logicalObject = resolveLogicalObject(object);
      if (!logicalObject) return null;

      const originals = modelEngine?.getOriginalGroupPositions?.() || [];
      const original = originals.find((entry) => entry?.object === logicalObject);

      if (original?.position && original?.rotation) {
        return {
          position: original.position.toArray(),
          rotation: [
            original.rotation.x,
            original.rotation.y,
            original.rotation.z,
          ],
          scale:
            original?.scale?.toArray?.() ||
            logicalObject.scale?.toArray?.() ||
            [1, 1, 1],
        };
      }

      // Fallback for custom model engines that do not expose the original
      // transform snapshot. This is still better than producing a reverse step
      // with no End transform at all.
      return manager.createStoredTransform(logicalObject);
    },
    [manager, modelEngine, modelScene],
  );

  const duplicateProcedure = useCallback(
    (procedureId = activeProcedureId, { reverse = false } = {}) => {
      const source =
        procedures.find((procedure) => procedure.id === procedureId) || null;

      if (!source || isLazyMaterialRecord(source, "procedures")) return null;

      const duplicate = manager.duplicateDefinition(source, {
        existingNames: procedures.map((procedure) => procedure.name),
        reverse,
        resolveImplicitStartTransform: reverse
          ? resolveImplicitProcedureStartTransform
          : null,
      });

      commitProcedures((current) => {
        const index = current.findIndex((procedure) => procedure.id === source.id);
        if (index < 0) return [...current, duplicate];

        const next = [...current];
        next.splice(index + 1, 0, duplicate);
        return next;
      });

      setActiveProcedureId(duplicate.id);
      setActiveStepId(duplicate.steps?.[0]?.id || null);
      setActiveAnimatedEntryId(null);
      setIsPreviewing(false);
      setIsAuthoringActive(true);

      if (reverse && modelScene && duplicate.steps?.[0]) {
        const applyReverseStart = () => {
          manager.resetStep(modelScene, duplicate.steps[0]);
          modelScene.updateMatrixWorld?.(true);
        };

        if (typeof globalThis.requestAnimationFrame === "function") {
          globalThis.requestAnimationFrame(applyReverseStart);
        } else {
          setTimeout(applyReverseStart, 0);
        }
      }

      return duplicate;
    },
    [
      activeProcedureId,
      commitProcedures,
      manager,
      modelScene,
      procedures,
      resolveImplicitProcedureStartTransform,
    ],
  );

  const updateProcedure = useCallback(
    (procedureId, patch) => {
      if (!procedureId) return;

      commitProcedures((current) =>
        current.map((procedure) => {
          if (procedure.id !== procedureId) return procedure;
          const resolved = typeof patch === "function" ? patch(procedure) : patch;

          return {
            ...procedure,
            ...resolved,
            settings: {
              ...procedure.settings,
              ...(resolved?.settings || {}),
            },
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [commitProcedures],
  );

  const deleteProcedure = useCallback(
    (procedureId) => {
      if (!procedureId) return;
      commitProcedures((current) => current.filter((item) => item.id !== procedureId));
      setActiveStepId(null);
      setIsPreviewing(false);
    },
    [commitProcedures],
  );

  const selectProcedure = useCallback(
    (procedureId) => {
      const nextProcedure =
        procedures.find((item) => item.id === procedureId) || null;
      const firstStep = nextProcedure?.steps?.[0] || null;

      setActiveProcedureId(procedureId || null);
      setActiveStepId(firstStep?.id || null);
      setIsPreviewing(false);
      if (procedureId) setIsAuthoringActive(true);
      if (firstStep?.cameraView) {
        requestAnimationFrame(() =>
          applyStoredStepCameraView(firstStep.cameraView),
        );
      }
    },
    [applyStoredStepCameraView, procedures],
  );

  const createStep = useCallback(() => {
    if (!activeProcedureId) return null;
    const next = manager.createStep(
      (activeProcedure?.steps?.length || 0) + 1,
      activeProcedure?.type || "guided",
    );

    updateProcedure(activeProcedureId, (procedure) => ({
      steps: [...(procedure.steps || []), next],
    }));
    setActiveStepId(next.id);
    return next;
  }, [activeProcedure?.steps?.length, activeProcedureId, manager, updateProcedure]);

  const updateStep = useCallback(
    (stepId, patch) => {
      if (!activeProcedureId || !stepId) return;

      updateProcedure(activeProcedureId, (procedure) => ({
        steps: (procedure.steps || []).map((step) => {
          if (step.id !== stepId) return step;
          const resolved = typeof patch === "function" ? patch(step) : patch;

          return {
            ...step,
            ...resolved,
            action: {
              ...step.action,
              ...(resolved?.action || {}),
            },
            interaction: {
              ...step.interaction,
              ...(resolved?.interaction || {}),
            },
          };
        }),
      }));
    },
    [activeProcedureId, updateProcedure],
  );

  const deleteStep = useCallback(
    (stepId) => {
      if (!activeProcedureId || !stepId) return;
      updateProcedure(activeProcedureId, (procedure) => ({
        steps: (procedure.steps || []).filter((step) => step.id !== stepId),
      }));
      setIsPreviewing(false);
    },
    [activeProcedureId, updateProcedure],
  );

  const moveStep = useCallback(
    (stepId, direction) => {
      if (!activeProcedureId || !stepId) return;

      updateProcedure(activeProcedureId, (procedure) => {
        const steps = [...(procedure.steps || [])];
        const index = steps.findIndex((step) => step.id === stepId);
        const nextIndex = index + direction;

        if (index < 0 || nextIndex < 0 || nextIndex >= steps.length) return {};
        [steps[index], steps[nextIndex]] = [steps[nextIndex], steps[index]];
        return { steps };
      });
    },
    [activeProcedureId, updateProcedure],
  );

  const reorderStep = useCallback(
    (stepId, targetStepId, placement = "before") => {
      if (!activeProcedureId || !stepId || !targetStepId || stepId === targetStepId) {
        return;
      }

      updateProcedure(activeProcedureId, (procedure) => {
        const steps = [...(procedure.steps || [])];
        const sourceIndex = steps.findIndex((step) => step.id === stepId);
        const targetIndex = steps.findIndex((step) => step.id === targetStepId);

        if (sourceIndex < 0 || targetIndex < 0) return {};

        const [draggedStep] = steps.splice(sourceIndex, 1);
        const adjustedTargetIndex = steps.findIndex((step) => step.id === targetStepId);
        const insertIndex =
          placement === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex;

        steps.splice(Math.max(0, insertIndex), 0, draggedStep);
        return { steps };
      });
    },
    [activeProcedureId, updateProcedure],
  );

  const syncLegacyAnimatedFields = (entries) => {
    const primary = entries[0] || null;
    return {
      animatedObjects: entries,
      animatedObject: primary?.object || null,
      startTransform: primary?.startTransform || null,
      endTransform: primary?.endTransform || null,
      startVisible: primary?.startVisible !== false,
      hideAfterAnimation: primary?.hideAfterAnimation === true,
    };
  };

  const syncLegacyClickTargetFields = (entries) => ({
    clickTargets: entries,
    targetObject: entries[0] || null,
  });

  const cloneStoredTransform = (transform) => {
    if (!transform) return null;

    return {
      position: Array.isArray(transform.position)
        ? [...transform.position]
        : [0, 0, 0],
      rotation: Array.isArray(transform.rotation)
        ? [...transform.rotation]
        : [0, 0, 0],
      scale: Array.isArray(transform.scale)
        ? [...transform.scale]
        : [1, 1, 1],
    };
  };

  const createAnimatedEntry = (
    objectReference,
    transform,
    startVisible = true,
  ) => ({
    id: `animated-${
      globalThis.crypto?.randomUUID?.() ||
      `${objectReference.uuid || objectReference.name || "object"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    }`,
    object: objectReference,
    // Start and End are captured immediately from the object's current pose.
    // They are intentionally separate snapshots so a no-motion action is
    // already valid, while later editing one endpoint cannot mutate the other.
    startTransform: cloneStoredTransform(transform),
    endTransform: cloneStoredTransform(transform),
    startVisible: startVisible !== false,
    showBeforeAnimation: false,
    hideAfterAnimation: false,
  });

  const referencesMatch = (left, right) => {
    if (!left || !right) return false;
    if (left.uuid && right.uuid) return left.uuid === right.uuid;
    if (Array.isArray(left.path) && Array.isArray(right.path)) {
      return left.path.join(".") === right.path.join(".");
    }
    return Boolean(left.name && right.name && left.name === right.name);
  };

  const assignObject = useCallback((object, role = "target") => {
    if (!activeStepId || !object || !modelScene) return false;

    const logicalObject = resolveLogicalObject(object);
    const objectReference = manager.createObjectReference(logicalObject, modelScene);
    const storedTransform = manager.createStoredTransform(logicalObject);
    if (!objectReference || !storedTransform) return false;

    if (manager.isAssemblyProcedure(activeProcedure)) {
      const entry = createAnimatedEntry(
        objectReference,
        storedTransform,
        logicalObject.visible !== false,
      );
      updateStep(activeStepId, {
        ...syncLegacyClickTargetFields([objectReference]),
        ...syncLegacyAnimatedFields([entry]),
      });
      setActiveAnimatedEntryId(entry.id);
      return true;
    }

    if (role === "animated") {
      // Animated entries are animation actions, not unique-object assignments.
      // The same logical object may therefore appear multiple times in one
      // Procedure step (for example Move first, then Rotate). When that happens
      // continue the new action from the previous action's authored End pose so
      // the chain is deterministic in both Editor preview and Player playback.
      const previousSameObject = [...activeAnimatedEntries]
        .reverse()
        .find((entry) => referencesMatch(entry.object, objectReference));
      const chainedStartTransform =
        previousSameObject?.endTransform || storedTransform;

      if (previousSameObject?.endTransform) {
        manager.applyStoredTransform?.(
          logicalObject,
          previousSameObject.endTransform,
        );
      }

      const entry = createAnimatedEntry(
        objectReference,
        chainedStartTransform,
        logicalObject.visible !== false,
      );
      updateStep(activeStepId, syncLegacyAnimatedFields([
        ...activeAnimatedEntries,
        entry,
      ]));
      setActiveAnimatedEntryId(entry.id);
      return true;
    }

    const existingTarget = activeClickTargets.find((reference) =>
      referencesMatch(reference, objectReference),
    );

    if (existingTarget) {
      return true;
    }

    const nextClickTargets = [...activeClickTargets, objectReference];

    updateStep(
      activeStepId,
      syncLegacyClickTargetFields(nextClickTargets),
    );
    return true;
  }, [
    activeAnimatedEntries,
    activeClickTargets,
    activeProcedure,
    activeStepId,
    manager,
    modelScene,
    updateStep,
  ]);

  const removeClickTarget = useCallback(
    (targetReference) => {
      if (
        !activeStepId ||
        manager.isAssemblyProcedure(activeProcedure) ||
        !targetReference
      ) {
        return false;
      }

      updateStep(activeStepId, (currentStep) => {
        const nextTargets = manager
          .normalizeClickTargets(currentStep, false)
          .filter((reference) => !referencesMatch(reference, targetReference));

        return syncLegacyClickTargetFields(nextTargets);
      });
      return true;
    },
    [activeProcedure, activeStepId, manager, updateStep],
  );

  const selectAuthoringObject = (object) => {
    const logicalObject = resolveLogicalObject(object);

    if (!logicalObject) {
      setSelectedObject?.(null);
      setSelectedObjectName?.("");
      setOutlineObjects?.([]);
      return null;
    }

    setSelectedObject?.(logicalObject);
    setSelectedObjectName?.(
      String(logicalObject.name || logicalObject.type || "Unnamed Object")
        .replaceAll("_", " "),
    );
    const payload = createSelectionPayload(logicalObject);
    setOutlineObjects?.(payload.outlineObjects || []);
    return logicalObject;
  };

  const selectClickTarget = (targetReference) => {
    const object =
      modelScene && targetReference
        ? manager.findObject(modelScene, targetReference)
        : null;

    return selectAuthoringObject(object);
  };

  const selectAnimatedEntry = useCallback(
    (entryId) => {
      const entry = activeAnimatedEntries.find((item) => item.id === entryId);
      setActiveAnimatedEntryId(entry?.id || null);
      const object = entry ? manager.findObject(modelScene, entry.object) : null;

      return selectAuthoringObject(object);
    },
    [activeAnimatedEntries, manager, modelScene],
  );

  const removeAnimatedEntry = useCallback(
    (entryId) => {
      if (!activeStepId || manager.isAssemblyProcedure(activeProcedure)) return false;

      updateStep(activeStepId, (currentStep) => {
        const nextEntries = manager
          .normalizeAnimatedObjects(currentStep, false)
          .filter((entry) => entry.id !== entryId);
        return syncLegacyAnimatedFields(nextEntries);
      });
      if (activeAnimatedEntryId === entryId) setActiveAnimatedEntryId(null);
      return true;
    },
    [
      activeAnimatedEntryId,
      activeProcedure,
      activeStepId,
      manager,
      updateStep,
    ],
  );

  const updateAnimatedEntry = useCallback(
    (entryId, patch) => {
      if (!activeStepId || !entryId) return false;

      updateStep(activeStepId, (currentStep) => {
        const entries = manager.normalizeAnimatedObjects(
          currentStep,
          manager.isAssemblyProcedure(activeProcedure),
        );
        const nextEntries = entries.map((entry) => {
          if (entry.id !== entryId) return entry;
          const resolved =
            typeof patch === "function" ? patch(entry) : patch;

          return {
            ...entry,
            ...(resolved || {}),
          };
        });

        return syncLegacyAnimatedFields(nextEntries);
      });
      return true;
    },
    [activeProcedure, activeStepId, manager, updateStep],
  );

  // Plain wrappers intentionally do not add more React hooks, keeping the hook
  // order stable for ViewerPage during development hot reloads.
  const highlightAuthoringObject = (object) => {
    const logicalObject = resolveLogicalObject(object);
    if (!logicalObject) {
      setOutlineObjects?.([]);
      return null;
    }

    const payload = createSelectionPayload(logicalObject);
    setOutlineObjects?.(payload.outlineObjects || []);
    return logicalObject;
  };

  const getParentOfSelectedObject = () => {
    const logicalObject = resolveLogicalObject(selectedObject);
    const rootObject = resolveObjectTreeRoot(modelScene);
    const parentObject = getLogicalObjectParent(logicalObject, rootObject);

    return parentObject ? selectAuthoringObject(parentObject) : null;
  };

  const assignSelectedObject = (role = "target") =>
    assignObject(selectedObject, role);
  const useSelectedTriggerObject = () => assignSelectedObject("target");
  const useSelectedAnimatedObject = () => assignSelectedObject("animated");
  const useSelectedObject = useSelectedTriggerObject;
  const resolveObjectReference = (reference) =>
    modelScene && reference ? manager.findObject(modelScene, reference) : null;

  const captureActiveAnimatedTransform = useCallback(
    (field) => {
      if (!activeStep?.id || !activeAnimatedEntry || !activeAnimatedObject) {
        return false;
      }

      const transform = manager.createStoredTransform(activeAnimatedObject);
      if (!transform) return false;

      updateStep(activeStep.id, (currentStep) => {
        const entries = manager.normalizeAnimatedObjects(
          currentStep,
          manager.isAssemblyProcedure(activeProcedure),
        );
        const nextEntries = entries.map((entry) =>
          entry.id === activeAnimatedEntry.id
            ? { ...entry, [field]: transform }
            : entry,
        );
        return syncLegacyAnimatedFields(nextEntries);
      });
      return true;
    },
    [
      activeAnimatedEntry,
      activeAnimatedObject,
      activeProcedure,
      activeStep?.id,
      manager,
      updateStep,
    ],
  );

  const captureStartTransform = useCallback(
    () => captureActiveAnimatedTransform("startTransform"),
    [captureActiveAnimatedTransform],
  );
  const captureEndTransform = useCallback(
    () => captureActiveAnimatedTransform("endTransform"),
    [captureActiveAnimatedTransform],
  );

  const captureStepCameraView = useCallback(() => {
    if (!activeStep?.id) return false;

    const cameraView = createViewerCameraView({
      camera: cameraRef?.current,
      controls: controlsRef?.current,
      modelScene,
    });
    if (!cameraView) return false;

    updateStep(activeStep.id, {
      cameraViewSaved: true,
      cameraView,
    });
    return true;
  }, [
    activeStep?.id,
    cameraRef,
    controlsRef,
    modelScene,
    updateStep,
  ]);

  const showActiveStepCameraView = useCallback(
    () => applyStoredStepCameraView(activeStep?.cameraView),
    [activeStep?.cameraView, applyStoredStepCameraView],
  );

  const deleteActiveStepCameraView = useCallback(() => {
    if (!activeStep?.id) return false;
    updateStep(activeStep.id, { cameraViewSaved: false, cameraView: null });
    return true;
  }, [activeStep?.id, updateStep]);

  const selectStep = useCallback(
    (stepId) => {
      const nextStep =
        activeProcedure?.steps?.find((item) => item.id === stepId) || null;
      setActiveStepId(stepId || null);
      if (nextStep?.cameraView) {
        requestAnimationFrame(() =>
          applyStoredStepCameraView(nextStep.cameraView),
        );
      }
    },
    [activeProcedure?.steps, applyStoredStepCameraView],
  );

  const applyActiveStepTransform = useCallback(
    (target = "start") => {
      if (!activeAnimatedEntry || !activeAnimatedObject) return false;
      const transform =
        target === "end"
          ? activeAnimatedEntry.endTransform
          : activeAnimatedEntry.startTransform;
      return Boolean(
        transform &&
          manager.applyStoredTransform(activeAnimatedObject, transform),
      );
    },
    [activeAnimatedEntry, activeAnimatedObject, manager],
  );

  const showActiveStepStart = useCallback(
    () => applyActiveStepTransform("start"),
    [applyActiveStepTransform],
  );
  const showActiveStepTarget = useCallback(
    () => applyActiveStepTransform("end"),
    [applyActiveStepTransform],
  );

  const getActivePlaybackStep = useCallback(() => {
    if (!activeStep) return null;

    return manager.createPlaybackStep(
      activeStep,
      activeProcedure?.type || "guided",
    );
  }, [activeProcedure?.type, activeStep, manager]);

  const resetActiveStep = useCallback(() => {
    if (!activeStep || !modelScene) return false;
    setIsPreviewing(false);
    const playbackStep = getActivePlaybackStep();
    return manager.resetStep(modelScene, playbackStep || activeStep);
  }, [activeStep, getActivePlaybackStep, manager, modelScene]);

  const previewActiveStep = useCallback(async () => {
    if (!activeStep || !modelScene || activeAnimatedEntries.length === 0) {
      return false;
    }

    const ready = activeAnimatedEntries.every(
      (entry) => entry.startTransform && entry.endTransform,
    );
    if (!ready) return false;

    const playbackStep = getActivePlaybackStep();
    if (!playbackStep) return false;

    setIsPreviewing(true);
    manager.resetStep(modelScene, playbackStep);
    const completed = await manager.animateStepObjects({
      scene: modelScene,
      step: playbackStep,
    });
    setIsPreviewing(false);
    return completed;
  }, [
    activeAnimatedEntries,
    activeStep,
    getActivePlaybackStep,
    manager,
    modelScene,
  ]);

  const beginAuthoring = useCallback(() => {
    setIsAuthoringActive(true);
    if (!activeProcedureId && procedures.length > 0) {
      setActiveProcedureId(procedures[0].id);
    }
  }, [activeProcedureId, procedures]);

  const stopAuthoring = useCallback(() => {
    setIsAuthoringActive(false);
    setIsPreviewing(false);

    const payload = createSelectionPayload(selectedObject);
    setOutlineObjects?.(payload.outlineObjects || []);
  }, [selectedObject, setOutlineObjects]);

  return {
    procedures,
    activeProcedure,
    activeProcedureId,
    isLoadingActiveProcedure,
    activeStep,
    activeStepId,
    activeClickTargets,
    activeAnimatedObject,
    activeAnimatedEntry,
    activeAnimatedEntries,
    activeAnimatedEntryId,
    isAuthoringActive,
    isPreviewing,
    transformMode,
    setTransformMode,
    createProcedure,
    duplicateProcedure,
    updateProcedure,
    deleteProcedure,
    selectProcedure,
    createStep,
    updateStep,
    deleteStep,
    moveStep,
    reorderStep,
    setActiveStepId: selectStep,
    useSelectedObject,
    useSelectedTriggerObject,
    useSelectedAnimatedObject,
    assignObject,
    selectClickTarget,
    removeClickTarget,
    selectAnimatedEntry,
    removeAnimatedEntry,
    updateAnimatedEntry,
    selectAuthoringObject,
    getParentOfSelectedObject,
    highlightAuthoringObject,
    selectedLogicalObject: resolveLogicalObject(selectedObject),
    modelScene,
    resolveObjectReference,
    normalizeClickTargets: manager.normalizeClickTargets,
    normalizeAnimatedObjects: manager.normalizeAnimatedObjects,
    captureStartTransform,
    captureEndTransform,
    captureStepCameraView,
    showActiveStepCameraView,
    deleteActiveStepCameraView,
    showActiveStepStart,
    showActiveStepTarget,
    resetActiveStep,
    previewActiveStep,
    beginAuthoring,
    stopAuthoring,
  };
}

export default useProceduralManager;
