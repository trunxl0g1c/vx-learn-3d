import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  createXRSpatialPanel,
  disposeXRSpatialPanel,
  getXRSpatialPanelTargetPose,
} from "../../engine/xr";

export default function PlayerXRInteractionPanel({
  mode = null,
  visible = false,
  viewModel = null,
  rootRef = null,
}) {
  const { gl } = useThree();
  const localRef = useRef(null);
  const targetPositionRef = useRef(null);
  const targetQuaternionRef = useRef(null);
  const panel = useMemo(
    () => createXRSpatialPanel(viewModel || {}),
    [viewModel],
  );

  useEffect(() => {
    if (rootRef) rootRef.current = panel;
    localRef.current = panel;
    return () => {
      if (rootRef?.current === panel) rootRef.current = null;
      if (localRef.current === panel) localRef.current = null;
      disposeXRSpatialPanel(panel);
    };
  }, [panel, rootRef]);

  useFrame((state, delta) => {
    if (!mode || !visible || !panel) {
      if (panel) panel.visible = false;
      return;
    }

    const xrCamera = gl.xr.isPresenting ? gl.xr.getCamera() : state.camera;
    if (!xrCamera) return;
    xrCamera.updateWorldMatrix?.(true, false);

    if (!targetPositionRef.current) {
      targetPositionRef.current = xrCamera.position.clone();
    }
    if (!targetQuaternionRef.current) {
      targetQuaternionRef.current = xrCamera.quaternion.clone();
    }

    xrCamera.getWorldPosition?.(targetPositionRef.current);
    xrCamera.getWorldQuaternion?.(targetQuaternionRef.current);
    const target = getXRSpatialPanelTargetPose({
      viewerPosition: targetPositionRef.current,
      viewerQuaternion: targetQuaternionRef.current,
      mode,
    });
    if (!target) return;

    const smoothing = 1 - Math.exp(-Math.max(0.001, delta) * 10);
    if (!panel.visible) {
      panel.position.copy(target.position);
      panel.quaternion.copy(target.quaternion);
    } else {
      panel.position.lerp(target.position, smoothing);
      panel.quaternion.slerp(target.quaternion, smoothing);
    }
    panel.visible = true;
    panel.updateMatrixWorld?.(true);
  });

  return <primitive object={panel} visible={visible} />;
}
