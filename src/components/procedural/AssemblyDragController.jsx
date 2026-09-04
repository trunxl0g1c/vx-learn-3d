import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createStoredObjectTransform } from "../../engine/procedural";

const LEFT_MOUSE_BUTTON = 0;

function stopPointerEvent(event) {
  event.preventDefault?.();
  event.stopPropagation?.();
  event.stopImmediatePropagation?.();
}

function isObjectEffectivelyVisible(object) {
  let current = object;

  while (current) {
    if (current.visible === false) return false;
    current = current.parent;
  }

  return true;
}

function setRayFromPointer({ event, element, camera, raycaster, pointer }) {
  const rect = element.getBoundingClientRect();
  const width = Math.max(rect.width, 1);
  const height = Math.max(rect.height, 1);

  pointer.set(
    ((event.clientX - rect.left) / width) * 2 - 1,
    -((event.clientY - rect.top) / height) * 2 + 1,
  );

  raycaster.setFromCamera(pointer, camera);
}

function getClosestAxisParameter(ray, origin, direction) {
  const offset = ray.origin.clone().sub(origin);
  const b = ray.direction.dot(direction);
  const d = ray.direction.dot(offset);
  const e = direction.dot(offset);
  const denominator = 1 - b * b;

  if (Math.abs(denominator) < 1e-6) return e;

  const rayParameter = (b * e - d) / denominator;
  return rayParameter < 0 ? e : (e - b * d) / denominator;
}

export default function AssemblyDragController({
  enabled = false,
  object = null,
  startTransform = null,
  targetTransform = null,
  controlsRef = null,
  cameraLocked = false,
  onDragStart,
  onDrag,
  onDragEnd,
}) {
  const { camera, gl } = useThree();
  const callbacksRef = useRef({ onDragStart, onDrag, onDragEnd });
  const dragStateRef = useRef(null);

  callbacksRef.current = { onDragStart, onDrag, onDragEnd };

  useEffect(() => {
    const element = gl?.domElement;

    if (!enabled || !object || !camera || !element) return undefined;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragPlane = new THREE.Plane();
    const cameraDirection = new THREE.Vector3();
    const objectWorldPosition = new THREE.Vector3();
    const planeIntersection = new THREE.Vector3();
    const dragOffset = new THREE.Vector3();
    const nextWorldPosition = new THREE.Vector3();
    const nextLocalPosition = new THREE.Vector3();
    const objectStartWorldPosition = new THREE.Vector3();
    const authoredLocalAxis = new THREE.Vector3();
    const authoredWorldAxis = new THREE.Vector3();

    const restoreOrbitControls = (dragState) => {
      if (!controlsRef?.current) return;
      controlsRef.current.enabled = cameraLocked
        ? false
        : dragState?.controlsWereEnabled !== false;
    };

    const finishDrag = (event, { cancelled = false } = {}) => {
      const dragState = dragStateRef.current;

      if (!dragState) return;
      if (
        event?.pointerId !== undefined &&
        dragState.pointerId !== event.pointerId
      ) {
        return;
      }

      stopPointerEvent(event);
      dragStateRef.current = null;

      try {
        if (
          typeof element.hasPointerCapture === "function" &&
          element.hasPointerCapture(dragState.pointerId)
        ) {
          element.releasePointerCapture(dragState.pointerId);
        }
      } catch {
        // Pointer capture may already have been released by the browser.
      }

      element.style.cursor = "grab";
      restoreOrbitControls(dragState);

      object.updateMatrix?.();
      object.updateMatrixWorld?.(true);

      callbacksRef.current.onDragEnd?.({
        object,
        startTransform: dragState.startTransform,
        cancelled,
      });
    };

    const handlePointerDown = (event) => {
      if (
        !enabled ||
        !object ||
        event.button !== LEFT_MOUSE_BUTTON ||
        dragStateRef.current
      ) {
        return;
      }

      object.updateWorldMatrix?.(true, true);
      setRayFromPointer({ event, element, camera, raycaster, pointer });

      const hit = raycaster
        .intersectObject(object, true)
        .find(
          (intersection) =>
            intersection.object &&
            !intersection.object.userData?.__vxInternal &&
            isObjectEffectivelyVisible(intersection.object),
        );

      if (!hit) return;

      stopPointerEvent(event);

      object.getWorldPosition(objectWorldPosition);
      objectStartWorldPosition.copy(objectWorldPosition);
      authoredLocalAxis.set(
        Number(targetTransform?.position?.[0]) - Number(startTransform?.position?.[0]),
        Number(targetTransform?.position?.[1]) - Number(startTransform?.position?.[1]),
        Number(targetTransform?.position?.[2]) - Number(startTransform?.position?.[2]),
      );
      const useAuthoredLocalAxis =
        Number.isFinite(authoredLocalAxis.x) &&
        Number.isFinite(authoredLocalAxis.y) &&
        Number.isFinite(authoredLocalAxis.z) &&
        authoredLocalAxis.lengthSq() > 1e-10;

      if (useAuthoredLocalAxis) {
        authoredWorldAxis.copy(authoredLocalAxis).normalize();
        if (object.parent) {
          object.parent.updateWorldMatrix?.(true, false);
          authoredWorldAxis.transformDirection(object.parent.matrixWorld);
        }
        authoredWorldAxis.normalize();
      }

      camera.getWorldDirection(cameraDirection).normalize();
      dragPlane.setFromNormalAndCoplanarPoint(cameraDirection, hit.point);

      if (!raycaster.ray.intersectPlane(dragPlane, planeIntersection)) return;

      // Preserve the exact surface point grabbed by the learner. The object no
      // longer jumps so its origin/center sits below the cursor.
      dragOffset.copy(planeIntersection).sub(objectWorldPosition);

      dragStateRef.current = {
        pointerId: event.pointerId,
        startTransform: createStoredObjectTransform(object),
        controlsWereEnabled: controlsRef?.current?.enabled !== false,
        axisConstrained: useAuthoredLocalAxis,
        axisStartParameter: useAuthoredLocalAxis
          ? getClosestAxisParameter(
              raycaster.ray,
              objectStartWorldPosition,
              authoredWorldAxis,
            )
          : 0,
        objectStartWorldPosition: objectStartWorldPosition.clone(),
        worldAxis: authoredWorldAxis.clone(),
      };

      if (controlsRef?.current) controlsRef.current.enabled = false;
      element.style.cursor = "grabbing";

      try {
        element.setPointerCapture?.(event.pointerId);
      } catch {
        // Pointer capture is an enhancement; drag still works without it.
      }

      callbacksRef.current.onDragStart?.({
        object,
        startTransform: dragStateRef.current.startTransform,
      });
    };

    const handlePointerMove = (event) => {
      const dragState = dragStateRef.current;

      if (!dragState || dragState.pointerId !== event.pointerId) return;

      stopPointerEvent(event);
      setRayFromPointer({ event, element, camera, raycaster, pointer });

      if (dragState.axisConstrained) {
        const nextParameter = getClosestAxisParameter(
          raycaster.ray,
          dragState.objectStartWorldPosition,
          dragState.worldAxis,
        );
        nextWorldPosition
          .copy(dragState.objectStartWorldPosition)
          .addScaledVector(
            dragState.worldAxis,
            nextParameter - dragState.axisStartParameter,
          );
      } else {
        if (!raycaster.ray.intersectPlane(dragPlane, planeIntersection)) return;
        nextWorldPosition.copy(planeIntersection).sub(dragOffset);
      }

      nextLocalPosition.copy(nextWorldPosition);

      if (object.parent) {
        object.parent.updateWorldMatrix?.(true, false);
        object.parent.worldToLocal(nextLocalPosition);
      }

      object.position.copy(nextLocalPosition);
      object.updateMatrix?.();
      object.updateMatrixWorld?.(true);

      callbacksRef.current.onDrag?.({ object });
    };

    const handlePointerUp = (event) => finishDrag(event);
    const handlePointerCancel = (event) =>
      finishDrag(event, { cancelled: true });
    const handleLostPointerCapture = (event) => finishDrag(event);

    // Capture phase is intentional. It lets assembly dragging claim the pointer
    // before OrbitControls receives it, while clicks outside the active part
    // still pass through and keep normal camera navigation available.
    element.addEventListener("pointerdown", handlePointerDown, true);
    element.addEventListener("pointermove", handlePointerMove, true);
    element.addEventListener("pointerup", handlePointerUp, true);
    element.addEventListener("pointercancel", handlePointerCancel, true);
    element.addEventListener(
      "lostpointercapture",
      handleLostPointerCapture,
      true,
    );

    element.style.cursor = "grab";

    return () => {
      element.removeEventListener("pointerdown", handlePointerDown, true);
      element.removeEventListener("pointermove", handlePointerMove, true);
      element.removeEventListener("pointerup", handlePointerUp, true);
      element.removeEventListener("pointercancel", handlePointerCancel, true);
      element.removeEventListener(
        "lostpointercapture",
        handleLostPointerCapture,
        true,
      );

      if (dragStateRef.current) {
        restoreOrbitControls(dragStateRef.current);
        dragStateRef.current = null;
      }

      element.style.cursor = "";
    };
  }, [
    camera,
    cameraLocked,
    controlsRef,
    enabled,
    gl,
    object,
    startTransform,
    targetTransform,
  ]);

  return null;
}
