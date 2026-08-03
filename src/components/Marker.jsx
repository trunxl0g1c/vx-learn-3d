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
  const [dragging, setDragging] = useState(false);
  const [labelOffset, setLabelOffset] = useState(() =>
    normalizeMarkerLabelOffset(marker),
  );
  const label = marker?.text || marker?.label || "Marker";
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

  const finishDrag = (event, nextOffset = labelOffset) => {
    const activeDrag = dragRef.current;
    if (!activeDrag) return;

    if (
      event?.currentTarget?.hasPointerCapture?.(activeDrag.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(activeDrag.pointerId);
    }

    dragRef.current = null;
    setDragging(false);
    onDraggingChange?.(false);

    const finalOffset = activeDrag.currentOffset || nextOffset;
    const normalizedOffset = [
      Math.round(Number(finalOffset[0]) * 10) / 10,
      Math.round(Number(finalOffset[1]) * 10) / 10,
    ];

    onUpdateMarker?.(marker?.id, {
      labelOffset: normalizedOffset,
      connector: createMarkerConnector(normalizedOffset),
    });
  };

  const handlePointerDown = (event) => {
    if (!editable || !marker?.id) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      labelOffset: [...labelOffset],
    };

    setDragging(true);
    onDraggingChange?.(true);
  };

  const handlePointerMove = (event) => {
    const activeDrag = dragRef.current;

    if (!editable || !activeDrag || activeDrag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const nextOffset = [
      activeDrag.labelOffset[0] + event.clientX - activeDrag.clientX,
      activeDrag.labelOffset[1] + event.clientY - activeDrag.clientY,
    ];

    activeDrag.currentOffset = nextOffset;
    setLabelOffset(nextOffset);
  };

  const handlePointerUp = (event) => {
    if (!dragRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    finishDrag(event, dragRef.current?.currentOffset || labelOffset);
  };

  return (
    <group ref={anchorRef} position={legacyPosition.toArray()}>
      <Html
        center
        occlude={false}
        zIndexRange={[40, 0]}
        style={{
          pointerEvents: editable ? "auto" : "none",
          userSelect: "none",
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
            role={editable ? "button" : undefined}
            tabIndex={editable ? 0 : undefined}
            title={editable ? "Drag to reposition marker label" : label}
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
              minWidth: "max-content",
              padding: "7px 12px",
              border: dragging
                ? "1px solid rgba(103, 232, 249, 0.95)"
                : "1px solid rgba(74, 78, 84, 0.9)",
              borderRadius: "7px",
              background: "rgba(29, 30, 31, 0.96)",
              boxShadow: dragging
                ? "0 8px 24px rgba(14, 165, 216, 0.28)"
                : "0 6px 18px rgba(0, 0, 0, 0.24)",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              cursor: editable ? (dragging ? "grabbing" : "grab") : "default",
              touchAction: "none",
              pointerEvents: editable ? "auto" : "none",
            }}
          >
            {label}
          </div>

          <div
            aria-hidden="true"
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
              pointerEvents: "none",
            }}
          />
        </div>
      </Html>
    </group>
  );
}

export default Marker;
