import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

import {
  armExpectedWebGLContextLoss,
  installExpectedWebGLContextLossGuard,
  isExpectedWebGLContextLoss,
  cancelScheduledWebGLRendererDisposal,
  scheduleFinalWebGLRendererDisposal,
} from "../../utils/webglContextLifecycle";

export function WebGLRendererLifecycle({ registryKey, onRendererReady }) {
  const { gl, scene, camera, invalidate } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    cancelScheduledWebGLRendererDisposal(gl);
    const removeExpectedLossGuard =
      installExpectedWebGLContextLossGuard(canvas);

    let mounted = true;

    const handleContextLost = (event) => {
      if (
        !mounted ||
        !canvas.isConnected ||
        isExpectedWebGLContextLoss(canvas)
      ) {
        return;
      }

      event.preventDefault();

      if (typeof window !== "undefined") {
        window.__VX_WEBGL_CONTEXT_LOST__ = true;
      }
    };

    const handleContextRestored = () => {
      if (!mounted) return;

      if (typeof window !== "undefined") {
        window.__VX_WEBGL_CONTEXT_LOST__ = false;
      }

      invalidate();
    };

    canvas.addEventListener("webglcontextlost", handleContextLost, false);
    canvas.addEventListener("webglcontextrestored", handleContextRestored, false);

    if (typeof window !== "undefined") {
      window[registryKey] = gl;
    }
    onRendererReady?.(gl);

    return () => {
      mounted = false;

      armExpectedWebGLContextLoss(canvas);
      removeExpectedLossGuard({ delayed: true });
      scheduleFinalWebGLRendererDisposal(gl, canvas);

      canvas.removeEventListener("webglcontextlost", handleContextLost, false);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored, false);

      if (typeof window !== "undefined" && window[registryKey] === gl) {
        window[registryKey] = null;
      }
      onRendererReady?.(null);
    };
  }, [camera, gl, invalidate, onRendererReady, registryKey, scene]);

  return null;
}

export function RenderSettingsSync({ viewerSettings }) {
  const { gl, scene, invalidate } = useThree();

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = Number(viewerSettings?.exposure ?? 1);

    if ("environmentIntensity" in scene) {
      scene.environmentIntensity = Number(viewerSettings?.envIntensity ?? 1);
    }

    invalidate();
  }, [
    gl,
    scene,
    invalidate,
    viewerSettings?.exposure,
    viewerSettings?.envIntensity,
  ]);

  return null;
}

export function InitialPlayerCameraSnapshot({
  modelScene,
  controlsRef,
  onCapture,
  onReady,
}) {
  const { camera } = useThree();
  const readySceneIdRef = useRef(null);
  const trackedSceneIdRef = useRef(null);
  const phaseRef = useRef("settling");
  const stableFrameCountRef = useRef(0);
  const postCaptureFrameCountRef = useRef(0);
  const lastPositionRef = useRef(new THREE.Vector3());
  const lastTargetRef = useRef(new THREE.Vector3());
  const lastQuaternionRef = useRef(new THREE.Quaternion());
  const lastModelQuaternionRef = useRef(new THREE.Quaternion());

  useFrame(() => {
    const controls = controlsRef?.current;
    const sceneId = modelScene?.uuid || modelScene?.id || null;

    if (!sceneId || !controls || !onCapture) return;
    if (readySceneIdRef.current === sceneId) return;

    if (trackedSceneIdRef.current !== sceneId) {
      trackedSceneIdRef.current = sceneId;
      phaseRef.current = "settling";
      stableFrameCountRef.current = 0;
      postCaptureFrameCountRef.current = 0;
      lastPositionRef.current.copy(camera.position);
      lastTargetRef.current.copy(controls.target);
      lastQuaternionRef.current.copy(camera.quaternion);
      lastModelQuaternionRef.current.copy(modelScene.quaternion);
      return;
    }

    const positionDelta = lastPositionRef.current.distanceTo(camera.position);
    const targetDelta = lastTargetRef.current.distanceTo(controls.target);
    const rotationDelta = lastQuaternionRef.current.angleTo(camera.quaternion);
    const modelRotationDelta = lastModelQuaternionRef.current.angleTo(
      modelScene.quaternion,
    );

    if (
      positionDelta < 0.00001 &&
      targetDelta < 0.00001 &&
      rotationDelta < 0.00001 &&
      modelRotationDelta < 0.00001
    ) {
      stableFrameCountRef.current += 1;
    } else {
      stableFrameCountRef.current = 0;
    }

    lastPositionRef.current.copy(camera.position);
    lastTargetRef.current.copy(controls.target);
    lastQuaternionRef.current.copy(camera.quaternion);
    lastModelQuaternionRef.current.copy(modelScene.quaternion);

    if (phaseRef.current === "settling") {
      // Wait until Bounds and OrbitControls have settled before applying the
      // saved default camera and model rotation.
      if (stableFrameCountRef.current < 4) return;

      onCapture({
        sceneId,
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        up: camera.up.clone(),
        target: controls.target.clone(),
        zoom: camera.zoom,
        fov: camera.fov,
        cameraType: camera.isOrthographicCamera
          ? "orthographic"
          : "perspective",
      });

      phaseRef.current = "applying";
      stableFrameCountRef.current = 0;
      postCaptureFrameCountRef.current = 0;

      // onCapture may synchronously apply a stored camera. Snapshot the latest
      // values so the next frame measures only subsequent projection changes.
      lastPositionRef.current.copy(camera.position);
      lastTargetRef.current.copy(controls.target);
      lastQuaternionRef.current.copy(camera.quaternion);
      lastModelQuaternionRef.current.copy(modelScene.quaternion);
      return;
    }

    postCaptureFrameCountRef.current += 1;

    // Projection switching can take one or two requestAnimationFrame cycles.
    // Do not report ready until camera, controls, and model rotation stay stable
    // for several frames after that switch has had time to complete.
    if (postCaptureFrameCountRef.current < 3) return;
    if (stableFrameCountRef.current < 5) return;

    readySceneIdRef.current = sceneId;
    onReady?.({
      sceneId,
      cameraType: camera.isOrthographicCamera
        ? "orthographic"
        : "perspective",
    });
  });

  return null;
}

