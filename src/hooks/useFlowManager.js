import { useCallback, useEffect, useMemo, useState } from "react";
import { createFlowManagerAdapter } from "../managers/FlowManager";

export function useFlowManager({
  material,
  setMaterial,
  modelScene,
  selectedObject,
  controlsRef,
  flowEngine = null,
}) {
  const manager = useMemo(
    () => createFlowManagerAdapter(flowEngine),
    [flowEngine],
  );
  const flows = useMemo(
    () =>
      manager.normalizeDefinitions(material?.flows),
    [manager, material?.flows],
  );
  const [activeFlowId, setActiveFlowId] = useState(null);
  const [pointMode, setPointMode] = useState(false);
  const [isAuthoringActive, setIsAuthoringActive] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewToken, setPreviewToken] = useState(0);
  const [selectedPointIds, setSelectedPointIds] = useState([]);
  const [multiplePointEditEnabled, setMultiplePointEditEnabled] = useState(false);

  useEffect(() => {
    if (flows.length === 0) {
      setActiveFlowId(null);
      setPointMode(false);
      setIsPreviewing(false);
      setSelectedPointIds([]);
      setMultiplePointEditEnabled(false);
      return;
    }

    if (!flows.some((flow) => flow.id === activeFlowId)) {
      setActiveFlowId(flows[0].id);
    }
  }, [activeFlowId, flows]);

  const activeFlow = useMemo(
    () => flows.find((flow) => flow.id === activeFlowId) || null,
    [activeFlowId, flows],
  );


  useEffect(() => {
    const availablePointIds = new Set(
      (activeFlow?.points || []).map((point) => point.id),
    );

    setSelectedPointIds((currentPointIds) => {
      const nextPointIds = currentPointIds.filter((pointId) =>
        availablePointIds.has(pointId),
      );

      return nextPointIds.length === currentPointIds.length
        ? currentPointIds
        : nextPointIds;
    });
  }, [activeFlow?.id, activeFlow?.points]);

  const commitFlows = useCallback(
    (updater) => {
      setMaterial((previousMaterial) => {
        const currentFlows = manager.normalizeDefinitions(
          previousMaterial?.flows,
        );
        const nextFlows =
          typeof updater === "function" ? updater(currentFlows) : updater;

        return {
          ...previousMaterial,
          flows: manager.normalizeDefinitions(nextFlows),
        };
      });
    },
    [manager, setMaterial],
  );


  const selectFlow = useCallback(
    (flowId) => {
      const nextFlowId = flowId || null;

      setActiveFlowId(nextFlowId);
      setPointMode(false);
      setIsPreviewing(false);
      setSelectedPointIds([]);
      setMultiplePointEditEnabled(false);

      // Selecting another saved Flow is still part of the authoring session.
      // Do not call stopAuthoring here, otherwise the viewport removes the
      // authoring runtime even though the Flow panel remains open.
      if (nextFlowId) {
        setIsAuthoringActive(true);
      }
    },
    [],
  );

  const createFlow = useCallback(() => {
    const nextFlow = manager.createDefinition(flows.length + 1);

    commitFlows((currentFlows) => [...currentFlows, nextFlow]);
    setActiveFlowId(nextFlow.id);
    setPointMode(false);
    setIsPreviewing(false);
    setSelectedPointIds([]);
    setMultiplePointEditEnabled(false);

    return nextFlow;
  }, [commitFlows, flows.length, manager]);

  const updateFlow = useCallback(
    (flowId, patch) => {
      if (!flowId) return;

      commitFlows((currentFlows) =>
        currentFlows.map((flow) => {
          if (flow.id !== flowId) return flow;

          const resolvedPatch =
            typeof patch === "function" ? patch(flow) : patch;

          return {
            ...flow,
            ...resolvedPatch,
            settings: {
              ...flow.settings,
              ...(resolvedPatch?.settings || {}),
            },
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [commitFlows],
  );

  const deleteFlow = useCallback(
    (flowId) => {
      if (!flowId) return;

      commitFlows((currentFlows) =>
        currentFlows.filter((flow) => flow.id !== flowId),
      );
      setPointMode(false);
      setIsPreviewing(false);
      setSelectedPointIds([]);
      setMultiplePointEditEnabled(false);
    },
    [commitFlows],
  );

  const addPoint = useCallback(
    (position) => {
      if (!activeFlowId || !Array.isArray(position)) return false;

      updateFlow(activeFlowId, (flow) => ({
        points: [
          ...(flow.points || []),
          manager.createPoint(position, flow.points?.length || 0),
        ],
      }));

      return true;
    },
    [activeFlowId, manager, updateFlow],
  );

  const addPointFromSelectedObject = useCallback(() => {
    const position = manager.createPointFromObject(
      selectedObject,
      modelScene,
    );
    return position ? addPoint(position) : false;
  }, [addPoint, manager, modelScene, selectedObject]);

  const addPointFromViewTarget = useCallback(() => {
    const position = manager.createPointFromControls(
      controlsRef?.current,
      modelScene,
    );

    return position ? addPoint(position) : false;
  }, [addPoint, controlsRef, manager, modelScene]);

  const updatePoints = useCallback(
    (pointUpdates) => {
      if (!activeFlowId || !Array.isArray(pointUpdates)) return false;

      const normalizedUpdates = new Map();

      pointUpdates.forEach((update) => {
        const pointId = update?.pointId || update?.id;
        const position = update?.position;

        if (!pointId || !Array.isArray(position) || position.length < 3) {
          return;
        }

        const normalizedPosition = position
          .slice(0, 3)
          .map((value) => Number(value));

        if (!normalizedPosition.every(Number.isFinite)) return;
        normalizedUpdates.set(pointId, normalizedPosition);
      });

      if (normalizedUpdates.size === 0) return false;

      updateFlow(activeFlowId, (flow) => ({
        points: (flow.points || []).map((point) => {
          const nextPosition = normalizedUpdates.get(point.id);
          return nextPosition
            ? { ...point, position: nextPosition }
            : point;
        }),
      }));

      return true;
    },
    [activeFlowId, updateFlow],
  );

  const updatePoint = useCallback(
    (pointId, position) =>
      updatePoints([{ pointId, position }]),
    [updatePoints],
  );

  const selectPoint = useCallback(
    (pointId) => {
      if (!pointId) return;

      setSelectedPointIds((currentPointIds) => {
        if (!multiplePointEditEnabled) return [pointId];

        return currentPointIds.includes(pointId)
          ? currentPointIds.filter((currentId) => currentId !== pointId)
          : [...currentPointIds, pointId];
      });
    },
    [multiplePointEditEnabled],
  );

  const clearPointSelection = useCallback(() => {
    setSelectedPointIds([]);
  }, []);

  const toggleMultiplePointEdit = useCallback(() => {
    setPointMode(false);
    setIsPreviewing(false);
    setMultiplePointEditEnabled((currentEnabled) => {
      const nextEnabled = !currentEnabled;

      if (!nextEnabled) {
        setSelectedPointIds((currentPointIds) =>
          currentPointIds.length > 0
            ? [currentPointIds[currentPointIds.length - 1]]
            : [],
        );
      }

      return nextEnabled;
    });
  }, []);

  const removePoint = useCallback(
    (pointId) => {
      if (!activeFlowId || !pointId) return;

      updateFlow(activeFlowId, (flow) => ({
        points: (flow.points || []).filter((point) => point.id !== pointId),
      }));
      setSelectedPointIds((currentPointIds) =>
        currentPointIds.filter((currentId) => currentId !== pointId),
      );
    },
    [activeFlowId, updateFlow],
  );

  const removeLastPoint = useCallback(() => {
    if (!activeFlowId) return;

    updateFlow(activeFlowId, (flow) => ({
      points: (flow.points || []).slice(0, -1),
    }));
  }, [activeFlowId, updateFlow]);

  const clearPoints = useCallback(() => {
    if (!activeFlowId) return;
    updateFlow(activeFlowId, { points: [] });
    setSelectedPointIds([]);
  }, [activeFlowId, updateFlow]);

  const reversePoints = useCallback(() => {
    if (!activeFlowId) return;

    updateFlow(activeFlowId, (flow) => ({
      points: [...(flow.points || [])].reverse().map((point, index) => ({
        ...point,
        label: `Point ${index + 1}`,
      })),
    }));
  }, [activeFlowId, updateFlow]);

  const togglePointMode = useCallback(() => {
    if (!activeFlow) return;

    setPointMode((current) => {
      const nextPointMode = !current;

      if (nextPointMode) {
        setMultiplePointEditEnabled(false);
        setSelectedPointIds([]);
      }

      return nextPointMode;
    });
    setIsPreviewing(false);
  }, [activeFlow]);

  const togglePreview = useCallback(() => {
    if (!activeFlow || activeFlow.points.length < 2) return;

    setPointMode(false);
    setIsPreviewing((current) => {
      const next = !current;
      if (next) setPreviewToken((token) => token + 1);
      return next;
    });
  }, [activeFlow]);

  const beginAuthoring = useCallback(() => {
    setIsAuthoringActive(true);

    // Restore the first available saved Flow when reopening the authoring
    // panel. This also covers projects loaded before modelScene is ready.
    if (!activeFlowId && flows.length > 0) {
      setActiveFlowId(flows[0].id);
    }
  }, [activeFlowId, flows]);

  const stopAuthoring = useCallback(() => {
    setIsAuthoringActive(false);
    setPointMode(false);
    setIsPreviewing(false);
    setSelectedPointIds([]);
    setMultiplePointEditEnabled(false);
  }, []);

  return {
    flows,
    activeFlow,
    activeFlowId,
    setActiveFlowId,
    selectFlow,
    pointMode,
    isAuthoringActive,
    isPreviewing,
    previewToken,
    selectedPointIds,
    multiplePointEditEnabled,
    selectPoint,
    clearPointSelection,
    toggleMultiplePointEdit,
    createFlow,
    updateFlow,
    deleteFlow,
    addPoint,
    addPointFromSelectedObject,
    addPointFromViewTarget,
    updatePoint,
    updatePoints,
    removePoint,
    removeLastPoint,
    clearPoints,
    reversePoints,
    togglePointMode,
    setPointMode,
    togglePreview,
    beginAuthoring,
    stopAuthoring,
  };
}

export default useFlowManager;
