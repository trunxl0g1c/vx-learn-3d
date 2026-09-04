import { useCallback, useEffect } from "react";
import { wouldCreateRigParentCycle } from "./animationAuthoringUtils";

function shouldInitializeObjectBoundsPivot(rig) {
  return (
    rig?.type === "free" &&
    (rig?.pivotSource || "default") === "default"
  );
}

export function useAnimationTrackParentPivot({
  activeAnimation,
  activeTrack,
  activeTrackId,
  activeTrackObject,
  isAuthoringActive,
  manager,
  updateActiveTrackRig,
}) {
  const setActiveTrackRigParent = useCallback(
    (parentTrackId) => {
      const nextParentId = parentTrackId || null;
      if (
        wouldCreateRigParentCycle(
          activeAnimation?.tracks,
          activeTrackId,
          nextParentId,
        )
      ) {
        return false;
      }

      const objectBoundsPivot =
        nextParentId && shouldInitializeObjectBoundsPivot(activeTrack?.rig)
          ? manager.createLocalBoundsCenter(activeTrackObject)
          : null;

      return updateActiveTrackRig({
        parentTrackId: nextParentId,
        ...(objectBoundsPivot
          ? {
              pivot: objectBoundsPivot,
              pivotSource: "objectBounds",
            }
          : {}),
      });
    },
    [
      activeAnimation?.tracks,
      activeTrack?.rig,
      activeTrackId,
      activeTrackObject,
      manager,
      updateActiveTrackRig,
    ],
  );

  useEffect(() => {
    if (
      !isAuthoringActive ||
      !activeTrack?.rig?.parentTrackId ||
      !activeTrackObject ||
      !shouldInitializeObjectBoundsPivot(activeTrack.rig)
    ) {
      return;
    }

    const objectBoundsPivot = manager.createLocalBoundsCenter(activeTrackObject);
    if (!objectBoundsPivot) return;

    updateActiveTrackRig({
      pivot: objectBoundsPivot,
      pivotSource: "objectBounds",
    });
  }, [
    activeTrack?.id,
    activeTrack?.rig,
    activeTrackObject,
    isAuthoringActive,
    manager,
    updateActiveTrackRig,
  ]);

  return setActiveTrackRigParent;
}

export default useAnimationTrackParentPivot;
