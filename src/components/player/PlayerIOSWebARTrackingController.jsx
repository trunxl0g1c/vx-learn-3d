import { useEffect, useMemo, useRef } from "react";
import {
  InstantTracker,
  ZapparCamera,
} from "@zappar/zappar-react-three-fiber";

import { getXRNormalizedScale } from "../../engine/xr";

const DEFAULT_PLACEMENT_DISTANCE = 2;

/**
 * Official Zappar React Three Fiber bridge for iPhone/iPad tracked AR.
 *
 * The wrapper owns the camera texture + R3F render integration. This avoids
 * manually drawing camera frames or replacing R3F's renderer state, which was
 * the source of the black camera background on Safari/iPadOS.
 */
export default function PlayerIOSWebARTrackingController({
  active = false,
  engine = null,
  placed = false,
  modelMaxDimension = 0,
  settings = null,
  children,
}) {
  const cameraRef = useRef(null);

  const hasValidModelDimension =
    Number.isFinite(Number(modelMaxDimension)) && Number(modelMaxDimension) > 1e-5;

  const xrScale = useMemo(
    () =>
      getXRNormalizedScale({
        maxDimension: modelMaxDimension,
        mode: "ar",
        userScale: settings?.ar?.scale,
      }),
    [modelMaxDimension, settings?.ar?.scale],
  );

  useEffect(() => {
    if (!active) return undefined;

    // Permission is requested from the XR button click in the engine. Once the
    // R3F camera mounts we can start the already-authorized rear camera.
    const camera = cameraRef.current;
    if (!camera) return undefined;

    try {
      camera.start?.(false);
    } catch (error) {
      engine?.reportCameraError?.(
        error?.message || "Unable to start the rear camera for tracked WebAR.",
      );
    }

    return () => {
      try {
        camera.pause?.();
      } catch {
        // Camera cleanup must never break Player unmount/route changes.
      }
    };
  }, [active, engine]);

  if (!active) return children;

  return (
    <>
      <ZapparCamera
        ref={cameraRef}
        poseMode="default"
        rearCameraMirrorMode="none"
        onFirstFrame={() => engine?.markCameraFrameReady?.()}
      />

      <InstantTracker
        placementMode={!placed}
        placementCameraOffset={[0, 0, -DEFAULT_PLACEMENT_DISTANCE]}
      >
        <group visible={hasValidModelDimension} scale={xrScale}>
          {children}
        </group>
      </InstantTracker>
    </>
  );
}
