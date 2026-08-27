import { useEffect, useRef } from "react";
import { panCameraByScreenDirection } from "../engine/camera";

const ARROW_DIRECTION = Object.freeze({
  ArrowLeft: { horizontal: -1, vertical: 0 },
  ArrowRight: { horizontal: 1, vertical: 0 },
  ArrowUp: { horizontal: 0, vertical: 1 },
  ArrowDown: { horizontal: 0, vertical: -1 },
});

const PAN_FRACTION_PER_SECOND = 0.72;
const PAN_ACCELERATION = 14;
const PAN_RELEASE_DAMPING = 10;
const MAX_FRAME_DELTA_SECONDS = 0.05;
const MIN_ACTIVE_VELOCITY = 0.0025;

function isEditableKeyboardTarget(target) {
  if (!target || typeof target !== "object") return false;
  if (target.isContentEditable) return true;

  const tagName = String(target.tagName || "").toLowerCase();
  if (["input", "textarea", "select"].includes(tagName)) return true;

  return Boolean(
    target.closest?.(
      'input, textarea, select, [contenteditable="true"], [role="textbox"], [role="slider"], [role="listbox"]',
    ),
  );
}

function hasBlockingDialog() {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.querySelector(
      '[aria-modal="true"], dialog[open], [role="dialog"][data-state="open"]',
    ),
  );
}

function dampValue(current, target, rate, deltaSeconds) {
  const blend = 1 - Math.exp(-Math.max(rate, 0) * deltaSeconds);
  return current + (target - current) * blend;
}

/**
 * Shared Editor/Player arrow-key camera panning. Keyboard state and smooth
 * frame timing live here; all camera-space pan math remains in the engine.
 */
export function useCameraKeyboardPan({
  cameraRef,
  controlsRef,
  focusTargetRef,
  enabled = true,
} = {}) {
  const shortcutStateRef = useRef({
    cameraRef,
    controlsRef,
    focusTargetRef,
    enabled,
  });

  shortcutStateRef.current = {
    cameraRef,
    controlsRef,
    focusTargetRef,
    enabled,
  };

  useEffect(() => {
    const pressedKeys = new Set();
    const velocity = { horizontal: 0, vertical: 0 };
    let animationFrameId = 0;
    let previousFrameTime = 0;
    let didMoveDuringGesture = false;

    const resetMotion = () => {
      pressedKeys.clear();
      velocity.horizontal = 0;
      velocity.vertical = 0;
      previousFrameTime = 0;
      didMoveDuringGesture = false;

      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
      }
    };

    const getTargetDirection = () => {
      let horizontal = 0;
      let vertical = 0;

      pressedKeys.forEach((key) => {
        const direction = ARROW_DIRECTION[key];
        if (!direction) return;
        horizontal += direction.horizontal;
        vertical += direction.vertical;
      });

      // Opposing keys cancel each other. Diagonal movement is normalized so
      // it does not become faster than horizontal/vertical movement.
      const length = Math.hypot(horizontal, vertical);
      if (length > 1) {
        horizontal /= length;
        vertical /= length;
      }

      return { horizontal, vertical };
    };

    const animatePan = (frameTime) => {
      animationFrameId = 0;

      const {
        cameraRef: activeCameraRef,
        controlsRef: activeControlsRef,
        focusTargetRef: activeFocusTargetRef,
        enabled: shortcutEnabled,
      } = shortcutStateRef.current;

      const camera = activeCameraRef?.current;
      const controls = activeControlsRef?.current;

      if (!shortcutEnabled || !camera || !controls?.enabled) {
        resetMotion();
        return;
      }

      if (!previousFrameTime) previousFrameTime = frameTime;

      const deltaSeconds = Math.min(
        Math.max((frameTime - previousFrameTime) / 1000, 1 / 240),
        MAX_FRAME_DELTA_SECONDS,
      );
      previousFrameTime = frameTime;

      const targetDirection = getTargetDirection();
      const horizontalRate = targetDirection.horizontal
        ? PAN_ACCELERATION
        : PAN_RELEASE_DAMPING;
      const verticalRate = targetDirection.vertical
        ? PAN_ACCELERATION
        : PAN_RELEASE_DAMPING;

      velocity.horizontal = dampValue(
        velocity.horizontal,
        targetDirection.horizontal,
        horizontalRate,
        deltaSeconds,
      );
      velocity.vertical = dampValue(
        velocity.vertical,
        targetDirection.vertical,
        verticalRate,
        deltaSeconds,
      );

      if (
        !targetDirection.horizontal &&
        Math.abs(velocity.horizontal) < MIN_ACTIVE_VELOCITY
      ) {
        velocity.horizontal = 0;
      }

      if (
        !targetDirection.vertical &&
        Math.abs(velocity.vertical) < MIN_ACTIVE_VELOCITY
      ) {
        velocity.vertical = 0;
      }

      const hasMotion =
        Math.abs(velocity.horizontal) >= MIN_ACTIVE_VELOCITY ||
        Math.abs(velocity.vertical) >= MIN_ACTIVE_VELOCITY;

      if (hasMotion) {
        const moved = panCameraByScreenDirection({
          camera,
          controls,
          horizontal: velocity.horizontal,
          vertical: velocity.vertical,
          fraction: PAN_FRACTION_PER_SECOND * deltaSeconds,
        });

        if (moved && !didMoveDuringGesture) {
          didMoveDuringGesture = true;
          if (activeFocusTargetRef) activeFocusTargetRef.current = null;
        }
      }

      if (pressedKeys.size > 0 || hasMotion) {
        animationFrameId = window.requestAnimationFrame(animatePan);
        return;
      }

      previousFrameTime = 0;
      didMoveDuringGesture = false;
    };

    const ensureAnimation = () => {
      if (animationFrameId) return;
      animationFrameId = window.requestAnimationFrame(animatePan);
    };

    const handleKeyDown = (event) => {
      if (event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (!ARROW_DIRECTION[event.key]) return;

      const activeElement =
        typeof document !== "undefined" ? document.activeElement : null;

      if (
        isEditableKeyboardTarget(event.target) ||
        isEditableKeyboardTarget(activeElement) ||
        hasBlockingDialog()
      ) {
        return;
      }

      const {
        cameraRef: activeCameraRef,
        controlsRef: activeControlsRef,
        enabled: shortcutEnabled,
      } = shortcutStateRef.current;

      if (!shortcutEnabled) return;
      if (!activeCameraRef?.current || !activeControlsRef?.current?.enabled) {
        return;
      }

      event.preventDefault();
      pressedKeys.add(event.key);
      ensureAnimation();
    };

    const handleKeyUp = (event) => {
      if (!ARROW_DIRECTION[event.key]) return;
      if (!pressedKeys.has(event.key)) return;

      event.preventDefault();
      pressedKeys.delete(event.key);
      ensureAnimation();
    };

    const handleWindowBlur = () => {
      pressedKeys.clear();
      ensureAnimation();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
      resetMotion();
    };
  }, []);
}
