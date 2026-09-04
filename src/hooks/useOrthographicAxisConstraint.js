import { useEffect, useState } from "react";
import {
  areAxisConstraintsEqual,
  getFullAxisVisibility,
  getOrthographicAxisConstraint,
} from "../engine/camera/OrthographicAxisConstraintUtils";

const CAMERA_SYNC_INTERVAL_MS = 120;

export default function useOrthographicAxisConstraint({
  cameraRef,
  controlsRef,
  projectionMode = "perspective",
  coordinateSpace = "world",
  object = null,
}) {
  const [axisConstraint, setAxisConstraint] = useState(() =>
    getFullAxisVisibility(),
  );

  useEffect(() => {
    if (projectionMode !== "orthographic") {
      setAxisConstraint((current) => {
        const next = getFullAxisVisibility();
        return areAxisConstraintsEqual(current, next) ? current : next;
      });
      return undefined;
    }

    const syncAxisConstraint = () => {
      const next = getOrthographicAxisConstraint(
        cameraRef?.current,
        controlsRef?.current,
        projectionMode,
        { coordinateSpace, object },
      );

      setAxisConstraint((current) =>
        areAxisConstraintsEqual(current, next) ? current : next,
      );
    };

    syncAxisConstraint();
    const intervalId = window.setInterval(
      syncAxisConstraint,
      CAMERA_SYNC_INTERVAL_MS,
    );

    return () => window.clearInterval(intervalId);
  }, [cameraRef, controlsRef, coordinateSpace, object, projectionMode]);

  return axisConstraint;
}
