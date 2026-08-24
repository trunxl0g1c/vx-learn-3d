import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import {
  createMarkerConnector,
  getMarkerLegacyPosition,
  isObjectEffectivelyVisible,
  normalizeMarkerLabelOffset,
  resolveMarkerAttachment,
} from "../engine/marker";

const MARKER_SIZE = 24;
const MARKER_TEXT_MAX_LENGTH = 50;
const MIN_LABEL_WIDTH = 96;
const MAX_LABEL_WIDTH = 360;

function clampLabelWidth(value) {
  const width = Number(value);
  if (!Number.isFinite(width)) return MIN_LABEL_WIDTH;
  return Math.min(MAX_LABEL_WIDTH, Math.max(MIN_LABEL_WIDTH, Math.round(width)));
}

function getDefaultLabelWidth(marker, label) {
  if (Number.isFinite(Number(marker?.labelWidth))) {
    return clampLabelWidth(marker.labelWidth);
  }

  return clampLabelWidth(
    Math.min(240, Math.max(96, String(label || "").length * 7.5 + 28)),
  );
}

function Marker({
  marker,
  modelScene = null,
  chapter = null,
  editable = false,
  onUpdateMarker,
  onDraggingChange,
}) {
  const anchorRef = useRef(null);
  const htmlRootRef = useRef(null);
  const legacyAttachmentLocalRef = useRef(null);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const editInputRef = useRef(null);
  const skipNextBlurRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [labelOffset, setLabelOffset] = useState(() =>
    normalizeMarkerLabelOffset(marker),
  );
  const label = marker?.text || marker?.label || "Marker";
  const [labelWidth, setLabelWidth] = useState(() =>
    getDefaultLabelWidth(marker, label),
  );
  const legacyPosition = useMemo(
    () => new THREE.Vector3(...getMarkerLegacyPosition(marker)),
    [marker?.position],
  );
  const resolvedAttachment = useMemo(
    () => resolveMarkerAttachment(marker, modelScene, chapter),
    [chapter, marker, modelScene],
  );
  const targetObject = resolvedAttachment.object;
  const storedAttachedPosition = useMemo(() => {
    const value = resolvedAttachment.localPosition;
    return value ? new THREE.Vector3(...value) : null;
  }, [resolvedAttachment]);

  useEffect(() => {
    if (dragging) return;
    setLabelOffset(normalizeMarkerLabelOffset(marker));
  }, [dragging, marker?.labelOffset]);

  useEffect(() => {
    if (resizing) return;
    setLabelWidth(getDefaultLabelWidth(marker, label));
  }, [label, marker?.labelWidth, resizing]);

  useEffect(() => {
    if (editing) return;
    setEditText(label);
  }, [editing, label]);

  useEffect(() => {
    if (!editing) return;
    editInputRef.current?.focus?.();
    editInputRef.current?.select?.();
  }, [editing]);

  useEffect(() => {
    legacyAttachmentLocalRef.current = null;
  }, [marker?.id, targetObject?.uuid]);

  useFrame(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    let markerVisible = true;

    if (targetObject) {
      markerVisible = isObjectEffectivelyVisible(targetObject, modelScene);
      targetObject.updateWorldMatrix?.(true, false);

      let targetLocalPosition = storedAttachedPosition;

      if (!targetLocalPosition && anchor.parent) {
        if (!legacyAttachmentLocalRef.current) {
          anchor.parent.updateWorldMatrix?.(true, false);
          const worldPosition = anchor.parent.localToWorld(
            legacyPosition.clone(),
          );

          legacyAttachmentLocalRef.current = targetObject.worldToLocal(
            worldPosition,
          );
        }

        targetLocalPosition = legacyAttachmentLocalRef.current;
      }

      if (targetLocalPosition && anchor.parent) {
        const worldPosition = targetObject.localToWorld(
          targetLocalPosition.clone(),
        );
        const parentPosition = anchor.parent.worldToLocal(worldPosition);
        anchor.position.copy(parentPosition);
      }
    } else {
      anchor.position.copy(legacyPosition);
    }

    anchor.visible = markerVisible;

    if (htmlRootRef.current) {
      htmlRootRef.current.style.display = markerVisible ? "block" : "none";
    }
  });

  const connector = createMarkerConnector(labelOffset);

  const stopViewportInteraction = (active) => {
    onDraggingChange?.(active);
  };

  const beginEditing = () => {
    if (!editable || !marker?.id) return;
    skipNextBlurRef.current = false;
    setEditText(label);
    setEditing(true);
  };

  const saveEditedText = () => {
    if (!editing || skipNextBlurRef.current) {
      skipNextBlurRef.current = false;
      return;
    }
    const nextText =
      String(editText || "").trim().slice(0, MARKER_TEXT_MAX_LENGTH) ||
      "Marker";
    setEditing(false);
    setEditText(nextText);
    if (nextText !== label) {
      onUpdateMarker?.(marker?.id, { text: nextText });
    }
  };

  const cancelEditing = () => {
    skipNextBlurRef.current = true;
    setEditing(false);
    setEditText(label);
  };

  const finishDrag = (event, nextOffset = labelOffset) => {
    const activeDrag = dragRef.current;
    if (!activeDrag) return false;

    if (event?.currentTarget?.hasPointerCapture?.(activeDrag.pointerId)) {
      event.currentTarget.releasePointerCapture(activeDrag.pointerId);
    }

    dragRef.current = null;
    setDragging(false);
    stopViewportInteraction(false);

    const finalOffset = activeDrag.currentOffset || nextOffset;
    const normalizedOffset = [
      Math.round(Number(finalOffset[0]) * 10) / 10,
      Math.round(Number(finalOffset[1]) * 10) / 10,
    ];

    if (activeDrag.moved) {
      onUpdateMarker?.(marker?.id, {
        labelOffset: normalizedOffset,
        connector: createMarkerConnector(normalizedOffset),
      });
    }

    return activeDrag.moved === true;
  };

  const handlePointerDown = (event) => {
    if (!editable || !marker?.id || editing || resizing) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      labelOffset: [...labelOffset],
      moved: false,
    };

    setDragging(true);
    stopViewportInteraction(true);
  };

  const handlePointerMove = (event) => {
    const activeDrag = dragRef.current;

    if (!editable || !activeDrag || activeDrag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const deltaX = event.clientX - activeDrag.clientX;
    const deltaY = event.clientY - activeDrag.clientY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 4) {
      activeDrag.moved = true;
    }

    const nextOffset = [
      activeDrag.labelOffset[0] + deltaX,
      activeDrag.labelOffset[1] + deltaY,
    ];

    activeDrag.currentOffset = nextOffset;
    setLabelOffset(nextOffset);
  };

  const handlePointerUp = (event) => {
    if (!dragRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    const moved = finishDrag(
      event,
      dragRef.current?.currentOffset || labelOffset,
    );

    if (!moved && editable) {
      beginEditing();
    }
  };

  const handleResizePointerDown = (event) => {
    if (!editable || !marker?.id || editing) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    resizeRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      startWidth: labelWidth,
      currentWidth: labelWidth,
    };
    setResizing(true);
    stopViewportInteraction(true);
  };

  const handleResizePointerMove = (event) => {
    const activeResize = resizeRef.current;
    if (!activeResize || activeResize.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const nextWidth = clampLabelWidth(
      activeResize.startWidth + event.clientX - activeResize.clientX,
    );
    activeResize.currentWidth = nextWidth;
    setLabelWidth(nextWidth);
  };

  const finishResize = (event) => {
    const activeResize = resizeRef.current;
    if (!activeResize) return;
    event.preventDefault();
    event.stopPropagation();
    if (event?.currentTarget?.hasPointerCapture?.(activeResize.pointerId)) {
      event.currentTarget.releasePointerCapture(activeResize.pointerId);
    }
    const finalWidth = clampLabelWidth(
      activeResize.currentWidth ?? labelWidth,
    );
    resizeRef.current = null;
    setResizing(false);
    setLabelWidth(finalWidth);
    stopViewportInteraction(false);
    onUpdateMarker?.(marker?.id, { labelWidth: finalWidth });
  };

  return (
    <group ref={anchorRef} position={legacyPosition.toArray()}>
      <Html
        center
        occlude={false}
        zIndexRange={[40, 0]}
        style={{
          pointerEvents: editable ? "auto" : "none",
          userSelect: editing ? "text" : "none",
        }}
      >
        <div
          ref={htmlRootRef}
          aria-label={label}
          style={{
            position: "relative",
            width: 0,
            height: 0,
            overflow: "visible",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: `${connector.length}px`,
              height: "1.5px",
              background: "rgba(18, 20, 22, 0.88)",
              transformOrigin: "0 50%",
              transform: `translateY(-50%) rotate(${connector.angle}deg)`,
              pointerEvents: "none",
            }}
          />

          <div
            role={editable ? "group" : undefined}
            tabIndex={editable && !editing ? 0 : undefined}
            title={
              editable
                ? "Click to edit. Drag to move. Drag right edge to resize."
                : label
            }
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "absolute",
              left: `${labelOffset[0]}px`,
              top: `${labelOffset[1]}px`,
              transform: "translate(-50%, -50%)",
              width: `${labelWidth}px`,
              minHeight: "34px",
              padding: "7px 12px",
              border:
                dragging || resizing || editing
                  ? "1px solid rgba(103, 232, 249, 0.95)"
                  : "1px solid rgba(74, 78, 84, 0.9)",
              borderRadius: "7px",
              background: "rgba(29, 30, 31, 0.96)",
              boxShadow:
                dragging || resizing || editing
                  ? "0 8px 24px rgba(14, 165, 216, 0.28)"
                  : "0 6px 18px rgba(0, 0, 0, 0.24)",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              lineHeight: 1.3,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              cursor: editable
                ? dragging
                  ? "grabbing"
                  : editing
                    ? "text"
                    : "grab"
                : "default",
              touchAction: "none",
              pointerEvents: editable ? "auto" : "none",
            }}
          >
            {editing ? (
              <textarea
                ref={editInputRef}
                value={editText}
                maxLength={MARKER_TEXT_MAX_LENGTH}
                rows={Math.max(1, Math.min(4, Math.ceil(editText.length / 22)))}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerMove={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => setEditText(event.target.value)}
                onBlur={saveEditedText}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelEditing();
                  }
                  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    saveEditedText();
                  }
                }}
                style={{
                  display: "block",
                  width: "100%",
                  minHeight: "20px",
                  resize: "none",
                  overflow: "hidden",
                  border: 0,
                  outline: 0,
                  padding: 0,
                  margin: 0,
                  background: "transparent",
                  color: "inherit",
                  font: "inherit",
                  lineHeight: "inherit",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              />
            ) : (
              label
            )}

            {editable && !editing && (
              <div
                role="separator"
                aria-label="Resize marker label"
                title="Drag to change marker label width"
                onPointerDown={handleResizePointerDown}
                onPointerMove={handleResizePointerMove}
                onPointerUp={finishResize}
                onPointerCancel={finishResize}
                onClick={(event) => event.stopPropagation()}
                style={{
                  position: "absolute",
                  right: "-5px",
                  top: "4px",
                  bottom: "4px",
                  width: "10px",
                  borderRadius: "5px",
                  cursor: "ew-resize",
                  touchAction: "none",
                  pointerEvents: "auto",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "4px",
                    top: "20%",
                    bottom: "20%",
                    width: "2px",
                    borderRadius: "999px",
                    background: "rgba(103, 232, 249, 0.8)",
                  }}
                />
              </div>
            )}
          </div>

          <div
            role={editable ? "button" : undefined}
            tabIndex={editable ? 0 : undefined}
            aria-label={editable ? `Edit ${label}` : undefined}
            title={editable ? "Click to edit marker text" : undefined}
            onPointerDown={(event) => {
              if (!editable) return;
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              if (!editable) return;
              event.preventDefault();
              event.stopPropagation();
              beginEditing();
            }}
            onKeyDown={(event) => {
              if (!editable || (event.key !== "Enter" && event.key !== " ")) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              beginEditing();
            }}
            style={{
              position: "absolute",
              left: `${-MARKER_SIZE / 2}px`,
              top: `${-MARKER_SIZE / 2}px`,
              width: `${MARKER_SIZE}px`,
              height: `${MARKER_SIZE}px`,
              boxSizing: "border-box",
              border: "2px solid #4a4650",
              borderRadius: "50%",
              background: "#ffffff",
              boxShadow: "0 2px 7px rgba(0, 0, 0, 0.34)",
              cursor: editable ? "text" : "default",
              pointerEvents: editable ? "auto" : "none",
            }}
          />
        </div>
      </Html>
    </group>
  );
}

export default Marker;
