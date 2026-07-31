export function createPlayerProcedureActions({
  proceduralEngine,
  modelScene,
  activeProcedure,
  procedures,
  activeProcedureIsAssembly,
  activeProcedureStep,
  activeProcedureSteps,
  procedureStepIndex,
  procedureReferenceLengthRef,
  setProcedureStatus,
  setProcedureFeedback,
  setCompletedProcedureStepIds,
  setProcedureStepIndex,
  setSelectedObject,
  setOutlineObjects,
  highlightProcedureStep,
  playAnimationAssignments,
}) {
  const activeAssemblyObject =
    activeProcedureIsAssembly && modelScene && activeProcedureStep
      ? proceduralEngine.findObject?.(
          modelScene,
          activeProcedureStep.animatedObject || activeProcedureStep.targetObject,
        ) || null
      : null;

  const playProcedureCompletionAnimation = (procedureId = activeProcedure?.id) => {
    const procedure = (procedures || []).find((item) => item.id === procedureId);
    const animation = procedure?.settings?.completionAnimation;

    if (!animation?.name) return false;
    return playAnimationAssignments?.([animation]) === true;
  };

  const advanceProcedureStep = (currentStep) => {
    const nextIndex = procedureStepIndex + 1;

    setCompletedProcedureStepIds((current) =>
      Array.from(new Set([...current, currentStep.id])),
    );

    if (nextIndex >= activeProcedureSteps.length) {
      setProcedureStatus("completed");
      setProcedureFeedback(
        activeProcedureIsAssembly ? "Assembly selesai." : "Procedure selesai.",
      );
      setProcedureStepIndex(activeProcedureSteps.length);
      setSelectedObject(null);
      setOutlineObjects([]);

      const completionAnimation = activeProcedure?.settings?.completionAnimation;
      if (completionAnimation?.name && completionAnimation.autoPlay !== false) {
        playProcedureCompletionAnimation(activeProcedure?.id);
      }
      return;
    }

    const nextStep = activeProcedureSteps[nextIndex];
    setProcedureStepIndex(nextIndex);
    setProcedureStatus("waiting");
    setProcedureFeedback(
      nextStep.instruction ||
        (activeProcedureIsAssembly
          ? "Geser komponen berikutnya ke target."
          : "Klik object berikutnya."),
    );
    highlightProcedureStep(nextStep);
  };

  const handleAssemblyDragStart = ({ object } = {}) => {
    if (!activeProcedureIsAssembly || !activeProcedureStep || !object) return;

    setProcedureStatus("dragging");
    setProcedureFeedback("Geser komponen ke ghost target.");
    setSelectedObject(object);
    setOutlineObjects(proceduralEngine.collectMeshes?.(object) || []);
  };

  const handleAssemblyDrag = ({ object } = {}) => {
    if (!activeProcedureIsAssembly || !activeProcedureStep || !object) return;
    object.updateMatrixWorld?.(true);
  };

  const handleAssemblyDragEnd = ({ object, startTransform } = {}) => {
    if (!activeProcedureIsAssembly || !activeProcedureStep || !object) return;

    const validation = proceduralEngine.validateAssemblyPlacement?.({
      scene: modelScene,
      object,
      step: activeProcedureStep,
      referenceLength: procedureReferenceLengthRef.current,
    });

    if (validation?.valid) {
      if (activeProcedureStep.interaction?.autoSnap !== false) {
        proceduralEngine.applyStoredTransform?.(
          object,
          activeProcedureStep.endTransform,
        );
      }
      setProcedureFeedback("Posisi benar. Step selesai.");
      advanceProcedureStep(activeProcedureStep);
      return;
    }

    if (activeProcedureStep.interaction?.snapBackOnFail !== false) {
      proceduralEngine.applyStoredTransform?.(
        object,
        startTransform || activeProcedureStep.startTransform,
      );
    }

    setProcedureStatus("waiting");
    const distanceText = Number.isFinite(validation?.distance)
      ? validation.distance.toFixed(3)
      : "-";
    const thresholdText = Number.isFinite(validation?.snapThreshold)
      ? validation.snapThreshold.toFixed(3)
      : "-";
    setProcedureFeedback(
      `Belum tepat. Jarak ${distanceText}, batas snap ${thresholdText}.`,
    );
    highlightProcedureStep(activeProcedureStep);
  };

  return {
    activeAssemblyObject,
    advanceProcedureStep,
    handleAssemblyDragStart,
    handleAssemblyDrag,
    handleAssemblyDragEnd,
    playProcedureCompletionAnimation,
  };
}

export default createPlayerProcedureActions;
