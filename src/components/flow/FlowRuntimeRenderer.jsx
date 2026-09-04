import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  createFlowRuntime,
  getFlowRuntimeSignature,
} from "../../engine/flow";

export default function FlowRuntimeRenderer({
  flow,
  playing = false,
  visible = true,
  showWaypoints = false,
  restartToken = 0,
  onComplete,
  renderOnTop = null,
  authoring = false,
  hideRuntimeWaypoints = false,
  speedReferenceLength = null,
}) {
  const { gl, invalidate } = useThree();
  const signature = getFlowRuntimeSignature(flow);
  const [runtime, setRuntime] = useState(null);
  const runtimeRef = useRef(null);
  const previousPlayingRef = useRef(false);
  const completionReportedRef = useRef(false);
  const contextLostRef = useRef(false);
  const playingRef = useRef(playing);
  const visibleRef = useRef(visible);
  const authoringRef = useRef(authoring);

  playingRef.current = playing;
  visibleRef.current = visible;
  authoringRef.current = authoring;

  // GPU resources must not be created during React render/useMemo. Concurrent
  // or interrupted renders can abandon those allocations without cleanup.
  // A layout effect gives every runtime a deterministic dispose lifecycle.
  useLayoutEffect(() => {
    const nextRuntime = createFlowRuntime(flow, {
      // Authoring always exposes path control points and a reference guide.
      // These overrides do not modify the saved Player settings.
      showWaypoints: hideRuntimeWaypoints
        ? false
        : authoring || showWaypoints,
      forceGuide: authoring,
      renderOnTop,
      speedReferenceLength,
    });

    runtimeRef.current = nextRuntime;
    setRuntime(nextRuntime);
    completionReportedRef.current = false;
    previousPlayingRef.current = false;

    nextRuntime?.setVisible(visibleRef.current);
    invalidate();

    return () => {
      if (runtimeRef.current === nextRuntime) {
        runtimeRef.current = null;
      }

      nextRuntime?.dispose();
    };
  }, [
    signature,
    showWaypoints,
    renderOnTop,
    authoring,
    hideRuntimeWaypoints,
    speedReferenceLength,
    invalidate,
  ]);

  // Keep one stable pair of context listeners for the lifetime of the canvas.
  useEffect(() => {
    const canvas = gl.domElement;

    const handleContextLost = (event) => {
      contextLostRef.current = true;
      event.preventDefault();
    };

    const handleContextRestored = () => {
      contextLostRef.current = false;
      const currentRuntime = runtimeRef.current;
      currentRuntime?.setVisible(visibleRef.current);

      if (playingRef.current) {
        currentRuntime?.restart();
        completionReportedRef.current = false;
      }

      invalidate();
    };

    canvas.addEventListener("webglcontextlost", handleContextLost, false);
    canvas.addEventListener("webglcontextrestored", handleContextRestored, false);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost, false);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored, false);
    };
  }, [gl, invalidate]);

  useEffect(() => {
    runtimeRef.current?.setVisible(visible);
    invalidate();
  }, [visible, invalidate]);

  useEffect(() => {
    runtimeRef.current?.restart();
    completionReportedRef.current = false;
  }, [restartToken, runtime]);

  useEffect(() => {
    const currentRuntime = runtimeRef.current;

    if (playing && !previousPlayingRef.current) {
      currentRuntime?.restart();
      completionReportedRef.current = false;
    }

    previousPlayingRef.current = playing;
  }, [playing, runtime]);

  useFrame((_state, delta) => {
    if (contextLostRef.current) return;

    const result = runtimeRef.current?.update(
      delta,
      playingRef.current,
      authoringRef.current,
    );

    if (result?.completed && !completionReportedRef.current) {
      completionReportedRef.current = true;
      onComplete?.();
    }
  });

  if (!runtime) return null;

  return <primitive object={runtime.group} dispose={null} />;
}
