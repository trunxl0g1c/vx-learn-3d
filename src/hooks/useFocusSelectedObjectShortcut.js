import { useEffect, useRef } from "react";

const DEFAULT_FOCUS_DISTANCE_MULTIPLIER = 1.25;

function isEditableKeyboardTarget(target) {
  if (!target || typeof target !== "object") return false;

  if (target.isContentEditable) return true;

  const tagName = String(target.tagName || "").toLowerCase();
  if (["input", "textarea", "select"].includes(tagName)) return true;

  return Boolean(
    target.closest?.(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]',
    ),
  );
}

/**
 * Global F shortcut used by Editor and Player to frame the active selection.
 * Keyboard concerns stay in a hook; camera framing remains in the camera
 * manager/engine layer. Text-entry controls are intentionally ignored.
 */
export function useFocusSelectedObjectShortcut({
  selectedObject,
  onFocus,
  enabled = true,
  distanceMultiplier = DEFAULT_FOCUS_DISTANCE_MULTIPLIER,
} = {}) {
  const shortcutStateRef = useRef({
    selectedObject,
    onFocus,
    enabled,
    distanceMultiplier,
  });

  shortcutStateRef.current = {
    selectedObject,
    onFocus,
    enabled,
    distanceMultiplier,
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (String(event.key || "").toLowerCase() !== "f") return;

      const activeElement =
        typeof document !== "undefined" ? document.activeElement : null;

      if (
        isEditableKeyboardTarget(event.target) ||
        isEditableKeyboardTarget(activeElement)
      ) {
        return;
      }

      const {
        selectedObject: activeObject,
        onFocus: focusSelectedObject,
        enabled: shortcutEnabled,
        distanceMultiplier: activeDistanceMultiplier,
      } = shortcutStateRef.current;

      if (!shortcutEnabled || !activeObject || !focusSelectedObject) return;

      event.preventDefault();
      focusSelectedObject(activeObject, {
        distanceMultiplier: activeDistanceMultiplier,
        fitOrthographicZoom: true,
        orthographicPadding: activeDistanceMultiplier,
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
