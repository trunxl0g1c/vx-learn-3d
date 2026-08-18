import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createStoredObjectTransform } from "../../engine/procedural";
import {
  createXRSelectionIndicator,
  disposeXRSelectionIndicator,
  findXRUIActionHit,
  getXRNormalizedScale,
  getXRPresentationTransform,
  getXRSpawnTransform,
  setXRRayFromInputEvent,
  setXRUIHovered,
  updateXRSelectionIndicator,
} from "../../engine/xr";

function createControllerRay() {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const material = new THREE.LineBasicMaterial({ color: 0x59d7ff });
  const line = new THREE.Line(geometry, material);
  line.name = "VIQUBED_XR_CONTROLLER_RAY";
  line.scale.z = 4;
  line.frustumCulled = false;
  line.renderOrder = 10020;
  return line;
}

function isVisibleMeshHit(entry) {
  return (
    entry?.object?.isMesh &&
    entry.object.visible !== false &&
    !entry.object.userData?.__vxInternal
  );
}

export default function PlayerXRSceneController({
  mode = null,
  settings,
  rootRef,
  modelScene,
  modelMaxDimension = 0,
  selectedObject = null,
  presentation = null,
  onSelectObject,
  interactionRootRef = null,
  onXRAction,
  onPlacementReady,
  assemblyDragObject = null,
  assemblyDragEnabled = false,
  onAssemblyDragStart,
  onAssemblyDrag,
  onAssemblyDragEnd,
}) {
  const { gl, scene } = useThree();
  const reticleRef = useRef(null);
  const hitTestSourceRef = useRef(null);
  const hitTestSessionRef = useRef(null);
  const placementReadyRef = useRef(false);
  const surfaceFallbackRef = useRef(false);
  const controllersRef = useRef([]);
  const hoveredUIRef = useRef(null);
  const dragStateRef = useRef(null);
  const selectionIndicatorRef = useRef(null);
  const lastPresentationKeyRef = useRef(null);
  const suppressNextSelectRef = useRef(false);
  const lastXRActionRef = useRef({ sourceEvent: null, action: null, at: 0 });
  const lastUISelectEventRef = useRef(null);
  const callbacksRef = useRef({});
  callbacksRef.current = {
    onSelectObject,
    onXRAction,
    onPlacementReady,
    onAssemblyDragStart,
    onAssemblyDrag,
    onAssemblyDragEnd,
  };
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const rayOrigin = useMemo(() => new THREE.Vector3(), []);
  const rayDirection = useMemo(() => new THREE.Vector3(), []);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempPosition = useMemo(() => new THREE.Vector3(), []);
  const tempQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const inputRayQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const tempScale = useMemo(() => new THREE.Vector3(), []);
  const viewerPosition = useMemo(() => new THREE.Vector3(), []);
  const viewerQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const dragWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const dragLocalPosition = useMemo(() => new THREE.Vector3(), []);
  const reticleGeometry = useMemo(
    () => new THREE.RingGeometry(0.08, 0.105, 32).rotateX(-Math.PI / 2),
    [],
  );

  const xrScale = useMemo(() => {
    const userScale =
      mode === "ar" ? settings?.ar?.scale : settings?.vr?.scale;
    return getXRNormalizedScale({
      maxDimension: modelMaxDimension,
      mode: mode || "vr",
      userScale,
    });
  }, [mode, modelMaxDimension, settings?.ar?.scale, settings?.vr?.scale]);

  const setRayFromController = (controller) => {
    if (!controller) return false;
    controller.updateWorldMatrix?.(true, false);
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    rayOrigin.setFromMatrixPosition(controller.matrixWorld);
    rayDirection.set(0, 0, -1).applyMatrix4(tempMatrix).normalize();
    raycaster.set(rayOrigin, rayDirection);
    return true;
  };

  const setRayFromInteraction = (controller, event = null) => {
    const referenceSpace = gl.xr.getReferenceSpace?.();
    if (
      setXRRayFromInputEvent({
        event,
        referenceSpace,
        raycaster,
        origin: rayOrigin,
        direction: rayDirection,
        quaternion: inputRayQuaternion,
      })
    ) {
      return true;
    }

    return setRayFromController(controller);
  };

  const findUIHit = (controller, event = null) => {
    if (!setRayFromInteraction(controller, event)) return null;
    return findXRUIActionHit({
      root: interactionRootRef?.current,
      raycaster,
      origin: rayOrigin,
      direction: rayDirection,
    });
  };

  const dispatchXRAction = useCallback((action, event = null) => {
    if (!action) return false;

    const sourceEvent = event?.data || event || null;
    const now =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    const previous = lastXRActionRef.current;
    if (
      previous.action === action &&
      ((sourceEvent && previous.sourceEvent === sourceEvent) ||
        now - previous.at < 180)
    ) {
      return false;
    }

    lastXRActionRef.current = { sourceEvent, action, at: now };
    if (sourceEvent) lastUISelectEventRef.current = sourceEvent;
    callbacksRef.current.onXRAction?.(action);
    return true;
  }, []);

  useEffect(() => () => reticleGeometry.dispose(), [reticleGeometry]);

  useEffect(() => {
    const root = rootRef?.current;
    if (!root) return undefined;

    placementReadyRef.current = false;
    surfaceFallbackRef.current = false;
    lastPresentationKeyRef.current = null;
    callbacksRef.current.onPlacementReady?.(false);

    if (mode === "vr" || mode === "ar") {
      // Keep the model hidden until the first valid XR viewer pose (VR/fixed AR)
      // or a surface hit-test selection (surface AR) is available.
      root.visible = false;
      root.position.set(0, 0, 0);
      root.quaternion.identity();
      root.scale.setScalar(Math.max(0.0001, xrScale));
    } else {
      root.visible = true;
      root.position.set(0, 0, 0);
      root.quaternion.identity();
      root.scale.setScalar(1);
    }

    root.updateMatrixWorld(true);
    return undefined;
  }, [mode, rootRef, xrScale]);

  useEffect(() => {
    if (!mode) return undefined;

    const indicator = createXRSelectionIndicator();
    selectionIndicatorRef.current = indicator;
    scene.add(indicator);

    return () => {
      scene.remove(indicator);
      disposeXRSelectionIndicator(indicator);
      if (selectionIndicatorRef.current === indicator) {
        selectionIndicatorRef.current = null;
      }
    };
  }, [mode, scene]);

  useEffect(() => {
    if (mode !== "ar") return undefined;

    // Passthrough AR requires a transparent scene background. Environment maps
    // may still light the model, but must never become scene.background here.
    scene.background = null;
    gl.setClearColor?.(0x000000, 0);
    return undefined;
  }, [gl, mode, scene]);

  useEffect(() => {
    if (!mode) return undefined;

    // The spatial XR UI requires a visible pointing affordance. Keep the ray
    // available whenever the interaction panel exists, even if a legacy VR
    // project had controllerRay disabled.
    const showControllerRay =
      Boolean(interactionRootRef) ||
      mode === "ar" ||
      settings?.vr?.controllerRay !== false;
    const controllers = [0, 1].map((index) => gl.xr.getController(index));
    controllersRef.current = controllers;

    const cleanups = controllers.map((controller) => {
      const ray = showControllerRay ? createControllerRay() : null;
      if (ray) {
        controller.add(ray);
        controller.userData.__viqubedXRRay = ray;
      }
      scene.add(controller);

      const handleSelectStart = (event) => {
        if (
          !assemblyDragEnabled ||
          !assemblyDragObject ||
          dragStateRef.current ||
          (mode === "ar" &&
            settings?.ar?.placement === "surface" &&
            !placementReadyRef.current)
        ) {
          return;
        }

        if (findUIHit(controller, event)) return;
        if (!setRayFromInteraction(controller, event)) return;
        const hit = raycaster
          .intersectObject(assemblyDragObject, true)
          .find(isVisibleMeshHit);
        if (!hit) return;

        assemblyDragObject.updateWorldMatrix?.(true, true);
        const worldPosition = new THREE.Vector3();
        assemblyDragObject.getWorldPosition(worldPosition);
        const localControllerOffset = controller.worldToLocal(worldPosition.clone());
        const startTransform = createStoredObjectTransform(assemblyDragObject);

        dragStateRef.current = {
          controller,
          object: assemblyDragObject,
          controllerOffset: localControllerOffset,
          startTransform,
        };
        callbacksRef.current.onAssemblyDragStart?.({
          object: assemblyDragObject,
          startTransform,
        });
      };

      const handleSelectEnd = () => {
        const dragState = dragStateRef.current;
        if (!dragState || dragState.controller !== controller) return;
        dragStateRef.current = null;
        suppressNextSelectRef.current = true;
        callbacksRef.current.onAssemblyDragEnd?.({
          object: dragState.object,
          startTransform: dragState.startTransform,
        });
      };

      const handleSelect = (event) => {
        if (suppressNextSelectRef.current) {
          suppressNextSelectRef.current = false;
          return;
        }

        // XR UI must remain interactive even while AR surface placement is
        // still waiting. UI gets first priority over model/placement actions.
        const uiHit = findUIHit(controller, event);
        if (uiHit?.object?.userData?.xrAction) {
          dispatchXRAction(uiHit.object.userData.xrAction, event);
          return;
        }

        if (
          mode === "ar" &&
          settings?.ar?.placement === "surface" &&
          !placementReadyRef.current
        ) {
          // The XRSession-level select handler below owns initial surface
          // placement. Object selection becomes active after placement.
          return;
        }

        if (!modelScene || !setRayFromInteraction(controller, event)) return;
        const intersections = raycaster.intersectObject(modelScene, true);
        const hit = intersections.find(isVisibleMeshHit);
        if (hit?.object) callbacksRef.current.onSelectObject?.(hit.object);
      };

      controller.addEventListener("selectstart", handleSelectStart);
      controller.addEventListener("selectend", handleSelectEnd);
      controller.addEventListener("select", handleSelect);
      return () => {
        controller.removeEventListener("selectstart", handleSelectStart);
        controller.removeEventListener("selectend", handleSelectEnd);
        controller.removeEventListener("select", handleSelect);
        if (ray) {
          controller.remove(ray);
          ray.geometry.dispose();
          ray.material.dispose();
          delete controller.userData.__viqubedXRRay;
        }
        scene.remove(controller);
      };
    });

    return () => {
      controllersRef.current = [];
      if (hoveredUIRef.current) {
        setXRUIHovered(hoveredUIRef.current, false);
        hoveredUIRef.current = null;
      }
      dragStateRef.current = null;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [
    assemblyDragEnabled,
    assemblyDragObject,
    dispatchXRAction,
    gl,
    inputRayQuaternion,
    interactionRootRef,
    mode,
    modelScene,
    rayDirection,
    rayOrigin,
    raycaster,
    scene,
    settings?.ar?.placement,
    settings?.vr?.controllerRay,
    tempMatrix,
  ]);

  useEffect(() => {
    if (!mode) return undefined;

    const session = gl.xr.getSession?.();
    if (!session) return undefined;

    const handleSessionSelect = (event) => {
      const referenceSpace = gl.xr.getReferenceSpace?.();
      const hasInputRay = setXRRayFromInputEvent({
        event,
        referenceSpace,
        raycaster,
        origin: rayOrigin,
        direction: rayDirection,
        quaternion: inputRayQuaternion,
      });
      if (!hasInputRay) return;

      const uiHit = findXRUIActionHit({
        root: interactionRootRef?.current,
        raycaster,
        origin: rayOrigin,
        direction: rayDirection,
      });
      const action = uiHit?.object?.userData?.xrAction;
      if (!action) return;

      lastUISelectEventRef.current = event;
      dispatchXRAction(action, event);
    };

    // Meta Quest can deliver the authoritative target-ray pose on the session
    // event before/without a reliable Object3D controller matrix. Listening at
    // session level gives controller trigger and hand pinch the same UI path.
    session.addEventListener("select", handleSessionSelect);
    return () => session.removeEventListener("select", handleSessionSelect);
  }, [
    dispatchXRAction,
    gl,
    inputRayQuaternion,
    interactionRootRef,
    mode,
    rayDirection,
    rayOrigin,
    raycaster,
  ]);

  useEffect(() => {
    if (mode !== "ar" || settings?.ar?.placement !== "surface") {
      hitTestSourceRef.current?.cancel?.();
      hitTestSourceRef.current = null;
      hitTestSessionRef.current = null;
      return undefined;
    }

    let cancelled = false;
    const session = gl.xr.getSession?.();
    if (!session || typeof session.requestHitTestSource !== "function") {
      surfaceFallbackRef.current = true;
      return undefined;
    }

    hitTestSessionRef.current = session;
    session
      .requestReferenceSpace("viewer")
      .then((viewerSpace) => session.requestHitTestSource({ space: viewerSpace }))
      .then((source) => {
        if (cancelled) {
          source?.cancel?.();
          return;
        }
        hitTestSourceRef.current = source;
      })
      .catch(() => {
        hitTestSourceRef.current = null;
        surfaceFallbackRef.current = true;
      });

    const handleSelect = (event) => {
      const root = rootRef?.current;
      const reticle = reticleRef.current;
      if (!root || !reticle?.visible || placementReadyRef.current) return;

      // A trigger press aimed at the floating XR UI must never also place the
      // AR model on the detected surface behind the panel.
      const isUISelect =
        lastUISelectEventRef.current === event ||
        controllersRef.current.some((controller) =>
          Boolean(findUIHit(controller, event)),
        );
      if (isUISelect) return;

      reticle.matrix.decompose(tempPosition, tempQuaternion, tempScale);
      root.visible = true;
      root.position.copy(tempPosition);
      root.quaternion.copy(tempQuaternion);
      root.scale.setScalar(Math.max(0.0001, xrScale));
      root.updateMatrixWorld(true);
      placementReadyRef.current = true;
      callbacksRef.current.onPlacementReady?.(true);
    };

    session.addEventListener("select", handleSelect);

    return () => {
      cancelled = true;
      session.removeEventListener("select", handleSelect);
      hitTestSourceRef.current?.cancel?.();
      hitTestSourceRef.current = null;
      hitTestSessionRef.current = null;
    };
  }, [
    gl,
    mode,
    rootRef,
    settings?.ar?.placement,
    tempPosition,
    tempQuaternion,
    tempScale,
    xrScale,
  ]);

  useFrame((state, delta, frame) => {
    const root = rootRef?.current;
    if (!root || !mode) return;

    if (
      !placementReadyRef.current &&
      (mode === "vr" ||
        (mode === "ar" && settings?.ar?.placement === "fixed"))
    ) {
      const xrCamera = gl.xr.isPresenting ? gl.xr.getCamera() : state.camera;
      xrCamera?.updateWorldMatrix?.(true, false);
      xrCamera?.getWorldPosition?.(viewerPosition);
      xrCamera?.getWorldQuaternion?.(viewerQuaternion);

      const spawn = getXRSpawnTransform({
        viewerPosition,
        viewerQuaternion,
        mode,
        distance:
          mode === "vr"
            ? Math.max(0.25, Number(settings?.vr?.spawnDistance || 2))
            : 1.25,
        heightOffset:
          mode === "vr" ? Number(settings?.vr?.spawnHeight || 0) : 0,
      });

      if (spawn) {
        root.position.copy(spawn.position);
        root.quaternion.copy(spawn.quaternion);
        root.scale.setScalar(Math.max(0.0001, xrScale));
        root.visible = true;
        root.updateMatrixWorld(true);
        placementReadyRef.current = true;
        callbacksRef.current.onPlacementReady?.(true);
      }
    }

    if (
      mode === "ar" &&
      settings?.ar?.placement === "surface" &&
      surfaceFallbackRef.current &&
      !placementReadyRef.current
    ) {
      const xrCamera = gl.xr.isPresenting ? gl.xr.getCamera() : state.camera;
      xrCamera?.updateWorldMatrix?.(true, false);
      xrCamera?.getWorldPosition?.(viewerPosition);
      xrCamera?.getWorldQuaternion?.(viewerQuaternion);

      const fallbackSpawn = getXRSpawnTransform({
        viewerPosition,
        viewerQuaternion,
        mode: "ar",
        distance: 1.25,
        heightOffset: -0.25,
      });

      if (fallbackSpawn) {
        root.position.copy(fallbackSpawn.position);
        root.quaternion.copy(fallbackSpawn.quaternion);
        root.scale.setScalar(Math.max(0.0001, xrScale));
        root.visible = true;
        root.updateMatrixWorld(true);
        placementReadyRef.current = true;
        callbacksRef.current.onPlacementReady?.(true);
      }
    }

    updateXRSelectionIndicator(selectionIndicatorRef.current, selectedObject);

    const presentationKey = presentation?.key || null;
    if (
      placementReadyRef.current &&
      presentationKey &&
      presentationKey !== lastPresentationKeyRef.current
    ) {
      const xrCamera = gl.xr.isPresenting ? gl.xr.getCamera() : state.camera;
      xrCamera?.updateWorldMatrix?.(true, false);
      xrCamera?.getWorldPosition?.(viewerPosition);
      xrCamera?.getWorldQuaternion?.(viewerQuaternion);

      const transform = getXRPresentationTransform({
        root,
        targetObject: presentation?.targetObject || modelScene || root,
        viewerPosition,
        viewerQuaternion,
        mode,
        distance:
          mode === "vr"
            ? Math.max(0.25, Number(settings?.vr?.spawnDistance || 2))
            : 1.25,
        heightOffset:
          mode === "vr" ? Number(settings?.vr?.spawnHeight || 0) : 0,
        scale: xrScale,
        cameraView: presentation?.cameraView || null,
      });

      if (transform) {
        root.position.copy(transform.position);
        root.quaternion.copy(transform.quaternion);
        root.scale.setScalar(transform.scale);
        root.visible = true;
        root.updateMatrixWorld(true);
        lastPresentationKeyRef.current = presentationKey;
      }
    }

    const dragState = dragStateRef.current;
    if (dragState?.controller && dragState?.object) {
      dragState.controller.updateWorldMatrix?.(true, false);
      dragWorldPosition
        .copy(dragState.controllerOffset)
        .applyMatrix4(dragState.controller.matrixWorld);
      dragLocalPosition.copy(dragWorldPosition);
      if (dragState.object.parent) {
        dragState.object.parent.updateWorldMatrix?.(true, false);
        dragState.object.parent.worldToLocal(dragLocalPosition);
      }
      dragState.object.position.copy(dragLocalPosition);
      dragState.object.updateMatrix?.();
      dragState.object.updateMatrixWorld?.(true);
      callbacksRef.current.onAssemblyDrag?.({ object: dragState.object, delta });
    }

    if (interactionRootRef?.current?.visible) {
      let nextHovered = null;
      for (const controller of controllersRef.current) {
        const hit = findUIHit(controller);
        if (hit?.object) {
          nextHovered = hit.object;
          break;
        }
      }
      if (nextHovered !== hoveredUIRef.current) {
        if (hoveredUIRef.current) setXRUIHovered(hoveredUIRef.current, false);
        hoveredUIRef.current = nextHovered;
        if (hoveredUIRef.current) setXRUIHovered(hoveredUIRef.current, true);
      }
    } else if (hoveredUIRef.current) {
      setXRUIHovered(hoveredUIRef.current, false);
      hoveredUIRef.current = null;
    }

    if (mode !== "ar" || settings?.ar?.placement !== "surface") return;
    if (placementReadyRef.current) {
      if (reticleRef.current) reticleRef.current.visible = false;
      return;
    }

    const reticle = reticleRef.current;
    const source = hitTestSourceRef.current;
    if (!reticle || !frame || !source) return;

    const referenceSpace = gl.xr.getReferenceSpace?.();
    if (!referenceSpace) return;

    const hit = frame.getHitTestResults(source)[0];
    if (!hit) {
      reticle.visible = false;
      return;
    }

    const pose = hit.getPose(referenceSpace);
    if (!pose) {
      reticle.visible = false;
      return;
    }

    reticle.visible = true;
    reticle.matrix.fromArray(pose.transform.matrix);
  });

  if (mode !== "ar" || settings?.ar?.placement !== "surface") return null;

  return (
    <mesh ref={reticleRef} matrixAutoUpdate={false} visible={false}>
      <primitive object={reticleGeometry} attach="geometry" />
      <meshBasicMaterial color="#59d7ff" side={THREE.DoubleSide} />
    </mesh>
  );
}
