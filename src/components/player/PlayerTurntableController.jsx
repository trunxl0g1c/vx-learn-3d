import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { normalizeTurntableAnimationSettings } from "../../modules/material/playerSettings";

const FULL_ROTATION = Math.PI * 2;

function normalizeAngle(angle) {
  if (!Number.isFinite(angle)) return 0;

  const wrapped = ((angle + Math.PI) % FULL_ROTATION + FULL_ROTATION) % FULL_ROTATION;
  return wrapped - Math.PI;
}

export default function PlayerTurntableController({
  rootRef,
  enabled = false,
  settings,
  sceneKey = "",
}) {
  const normalizedSettings = useMemo(
    () => normalizeTurntableAnimationSettings(settings),
    [settings],
  );
  const wasActiveRef = useRef(false);

  useEffect(() => {
    const root = rootRef?.current;
    if (!root) return;

    root.rotation.set(0, 0, 0);
    root.updateMatrixWorld(true);
    wasActiveRef.current = false;
  }, [rootRef, sceneKey]);

  useFrame((_, delta) => {
    const root = rootRef?.current;
    if (!root) return;

    const shouldRotate = Boolean(enabled && normalizedSettings.enabled);

    if (!shouldRotate) {
      // Freeze the turntable at its current angle. User interaction, Chapter,
      // Flow, Procedure, Free Play, etc. must stop the intro rotation without
      // snapping the model back to its original orientation.
      wasActiveRef.current = false;
      return;
    }

    const direction =
      normalizedSettings.direction === "counterclockwise" ? 1 : -1;
    const radiansPerSecond =
      (normalizedSettings.speed * FULL_ROTATION) / 60;
    const safeDelta = Math.min(Math.max(Number(delta) || 0, 0), 0.1);

    root.rotation.y = normalizeAngle(
      root.rotation.y + direction * radiansPerSecond * safeDelta,
    );
    wasActiveRef.current = true;
  });

  return null;
}
