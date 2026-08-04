import { useCallback, useEffect, useMemo, useState } from "react";
import { createProceduralManagerAdapter } from "../managers/ProceduralManager";
import { resolveLogicalObject } from "../utils/objectTreeUtils";
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
  setOutlineObjects = null,
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

  const syncLegacyAnimatedFields = (entries) => {
    const primary = entries[0] || null;
    return {
      animatedObjects: entries,
      animatedObject: primary?.object || null,
      startTransform: primary?.startTransform || null,
      endTransform: primary?.endTransform || null,
    };
  };

  const createAnimatedEntry = (objectReference, transform) => ({
    id: `animated-${objectReference.uuid || objectReference.name || Date.now()}-${Date.now()}`,
    object: objectReference,
    startTransform: transform,
    endTransform: transform,
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
      const entry = createAnimatedEntry(objectReference, storedTransform);
      updateStep(activeStepId, {
        targetObject: objectReference,
        ...syncLegacyAnimatedFields([entry]),
      });
      setActiveAnimatedEntryId(entry.id);
      return true;
    }

    if (role === "animated") {
      const existing = activeAnimatedEntries.find((entry) =>
        referencesMatch(entry.object, objectReference),
      );

      if (existing) {
        setActiveAnimatedEntryId(existing.id);
        return true;
      }

      const entry = createAnimatedEntry(objectReference, storedTransform);
      updateStep(activeStepId, syncLegacyAnimatedFields([
        ...activeAnimatedEntries,
        entry,
      ]));
      setActiveAnimatedEntryId(entry.id);
      return true;
    }

    if (activeAnimatedEntries.length > 0) {
      updateStep(activeStepId, { targetObject: objectReference });
      return true;
    }

    const entry = createAnimatedEntry(objectReference, storedTransform);
    updateStep(activeStepId, {
      targetObject: objectReference,
      ...syncLegacyAnimatedFields([entry]),
    });
    setActiveAnimatedEntryId(entry.id);
    return true;
  }, [
    activeAnimatedEntries,
    activeProcedure,
    activeStepId,
    manager,
    modelScene,
    updateStep,
  ]);

  const selectAnimatedEntry = useCallback(
    (entryId) => {
      const entry = activeAnimatedEntries.find((item) => item.id === entryId);
      setActiveAnimatedEntryId(entry?.id || null);
      const object = entry ? manager.findObject(modelScene, entry.object) : null;
      if (object) {
        const payload = createSelectionPayload(resolveLogicalObject(object));
        setOutlineObjects?.(payload.outlineObjects || []);
      }
      return object;
    },
    [activeAnimatedEntries, manager, modelScene, setOutlineObjects],
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
  }, [activeStep?.id, cameraRef, controlsRef, modelScene, updateStep]);

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

  const resetActiveStep = useCallback(() => {
    if (!activeStep || !modelScene) return false;
    setIsPreviewing(false);
    return manager.resetStep(modelScene, activeStep);
  }, [activeStep, manager, modelScene]);

  const previewActiveStep = useCallback(async () => {
    if (!activeStep || !modelScene || activeAnimatedEntries.length === 0) {
      return false;
    }

    const ready = activeAnimatedEntries.every(
      (entry) => entry.startTransform && entry.endTransform,
    );
    if (!ready) return false;

    setIsPreviewing(true);
    manager.resetStep(modelScene, activeStep);
    const completed = await manager.animateStepObjects({
      scene: modelScene,
      step: activeStep,
    });
    setIsPreviewing(false);
    return completed;
  }, [activeAnimatedEntries, activeStep, manager, modelScene]);

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
    activeAnimatedObject,
    activeAnimatedEntry,
    activeAnimatedEntries,
    activeAnimatedEntryId,
    isAuthoringActive,
    isPreviewing,
    transformMode,
    setTransformMode,
    createProcedure,
    updateProcedure,
    deleteProcedure,
    selectProcedure,
    createStep,
    updateStep,
    deleteStep,
    moveStep,
    setActiveStepId: selectStep,
    useSelectedObject,
    useSelectedTriggerObject,
    useSelectedAnimatedObject,
    assignObject,
    selectAnimatedEntry,
    removeAnimatedEntry,
    highlightAuthoringObject,
    selectedLogicalObject: resolveLogicalObject(selectedObject),
    modelScene,
    resolveObjectReference,
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
