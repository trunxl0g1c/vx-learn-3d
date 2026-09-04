import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { findExactChapterForObject } from "../../engine/selection";
import { isObjectEffectivelyVisible } from "../../engine/marker";
import {
  getLogicalObjectChildren,
  resolveLogicalObject,
} from "../../utils/objectTreeUtils";

export const GENERATED_ANNOTATION_COLOR = "#0ea5d8";

function getShaderOutlineConfig(shaderOutlineStyle) {
  if (shaderOutlineStyle === "sketch") {
    return {
      edgeStrength: 2,
      visibleEdgeColor: "#111111",
      hiddenEdgeColor: "#ffffff",
    };
  }

  return {
    edgeStrength: 2.5,
    visibleEdgeColor: "#172033",
    hiddenEdgeColor: "#172033",
  };
}

function isMeaningfulSceneObject(object) {
  return Boolean(
    object &&
    !object.userData?.__vxFlowHelper &&
    !object.userData?.__vxInternal &&
    object.type !== "Bone" &&
    object.type !== "SkeletonHelper" &&
    object.type !== "Camera" &&
    object.type !== "Light" &&
    object.type !== "DirectionalLight" &&
    object.type !== "AmbientLight" &&
    object.type !== "HemisphereLight",
  );
}

function hasRenderableContent(object) {
  if (!object) return false;

  let hasMesh = false;

  object.traverse((child) => {
    if (child.isMesh) hasMesh = true;
  });

  return hasMesh;
}

function getDirectAnnotationChildren(rootObject) {
  const logicalRoot = resolveLogicalObject(rootObject);

  if (!logicalRoot) return [];

  return getLogicalObjectChildren(logicalRoot).filter(
    (child) => isMeaningfulSceneObject(child) && hasRenderableContent(child),
  );
}

function resolveGeneratedAnnotationRoot(modelScene, selectedObject) {
  const logicalSelectedObject = resolveLogicalObject(selectedObject);

  if (logicalSelectedObject && hasRenderableContent(logicalSelectedObject)) {
    return logicalSelectedObject;
  }

  if (!modelScene) return null;

  const directChildren = getDirectAnnotationChildren(modelScene);

  // GLTF files often wrap the real assembly in one Scene/root node. When that
  // happens, use that wrapper as the root so annotations are generated for the
  // first-level assembly children, not every descendant mesh.
  if (directChildren.length === 1) {
    const onlyChildChildren = getDirectAnnotationChildren(directChildren[0]);

    if (onlyChildChildren.length > 0) {
      return directChildren[0];
    }
  }

  return modelScene;
}

function getAnnotationDisplayName(object, fallback) {
  const name =
    object?.name || object?.userData?.name || object?.type || fallback;

  return (
    String(name || fallback)
      .replace(/[_-]+/g, " ")
      .trim() || fallback
  );
}

function useGeneratedAnnotationTargets(
  modelScene,
  selectedObject,
  annotationRootObject,
) {
  return useMemo(() => {
    const root = resolveLogicalObject(
      annotationRootObject ||
        resolveGeneratedAnnotationRoot(modelScene, selectedObject),
    );
    const directChildren = getDirectAnnotationChildren(root);

    if (directChildren.length > 0) {
      return {
        root,
        targets: directChildren.map((object, index) => ({
          object,
          label: getAnnotationDisplayName(object, `Object ${index + 1}`),
        })),
      };
    }

    const logicalSelectedObject = resolveLogicalObject(selectedObject);

    if (
      logicalSelectedObject &&
      hasRenderableContent(logicalSelectedObject)
    ) {
      return {
        root,
        targets: [
          {
            object: logicalSelectedObject,
            label: getAnnotationDisplayName(
              logicalSelectedObject,
              "Selected Object",
            ),
          },
        ],
      };
    }

    return {
      root,
      targets: [],
    };
  }, [annotationRootObject, modelScene, selectedObject]);
}

function useAnnotationAnchorPosition(object, rootRef) {
  const wrapperRef = useRef(null);
  const visibilityRef = useRef(true);
  const [visible, setVisible] = useState(true);
  const { camera } = useThree();

  useFrame(() => {
    if (!wrapperRef.current || !object || !rootRef?.current) return;

    const nextVisible = isObjectEffectivelyVisible(object);

    if (visibilityRef.current !== nextVisible) {
      visibilityRef.current = nextVisible;
      setVisible(nextVisible);
    }

    wrapperRef.current.visible = nextVisible;

    if (!nextVisible) return;

    object.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(object);

    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const localCenter = rootRef.current.worldToLocal(center.clone());
    const distance = camera.position.distanceTo(center);
    const scale = THREE.MathUtils.clamp(distance * 0.0024, 0.45, 1.05);

    wrapperRef.current.position.copy(localCenter);
    wrapperRef.current.scale.setScalar(scale);
  });

  return { wrapperRef, visible };
}

function GeneratedAnnotationMarker({
  index,
  label,
  object,
  rootRef,
  selectedAnnotationId,
  onClick,
  onHoverChange,
}) {
  const { wrapperRef, visible } = useAnnotationAnchorPosition(object, rootRef);
  const [hovered, setHovered] = useState(false);
  const annotationId = object?.uuid || `${label}-${index}`;
  const isSelected = selectedAnnotationId === annotationId;
  const isExpanded = hovered || isSelected;

  const createAnnotationTarget = () => {
    const logicalObject = resolveLogicalObject(object) || object;

    return {
      id: logicalObject?.uuid || annotationId,
      index,
      number: index + 1,
      title: label,
      objectName: logicalObject?.name || label,
      object: logicalObject,
    };
  };

  useEffect(() => {
    setHovered(false);
  }, [object]);

  return (
    <group ref={wrapperRef} visible={visible}>
      <Html occlude={false} zIndexRange={[20, 0]}>
        <div
          style={{
            display: visible ? "inline-flex" : "none",
            position: "relative",
            alignItems: "center",
            pointerEvents: "auto",
            transform: "translateY(-50%)",
            transformOrigin: "left center",
          }}
        >
          <button
            type="button"
            onPointerEnter={(event) => {
              event.stopPropagation();
              setHovered(true);
              onHoverChange?.(createAnnotationTarget());
            }}
            onPointerLeave={(event) => {
              event.stopPropagation();
              setHovered(false);
              onHoverChange?.(null);
            }}
            onClick={(event) => {
              event.stopPropagation();
              onClick?.(createAnnotationTarget());
            }}
            style={{
              height: 28,
              minWidth: 28,
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              overflow: "hidden",
              borderRadius: 999,
              border: `1px solid rgba(103, 232, 249, ${
                isExpanded ? 0.95 : 0.55
              })`,
              background: isExpanded
                ? GENERATED_ANNOTATION_COLOR
                : "rgba(15, 49, 58, 0.86)",
              color: "#ffffff",
              fontSize: 10,
              fontWeight: 800,
              lineHeight: 1,
              boxShadow: isExpanded
                ? "0 10px 30px rgba(14, 165, 216, 0.35)"
                : "0 8px 22px rgba(0, 0, 0, 0.28)",
              cursor: "pointer",
              transition:
                "background 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
            }}
            title={label}
          >
            <span
              style={{
                width: 28,
                minWidth: 28,
                height: 28,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {index + 1}
            </span>

            <span
              style={{
                maxWidth: isExpanded ? 220 : 0,
                paddingRight: isExpanded ? 10 : 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                opacity: isExpanded ? 1 : 0,
                transform: `translateX(${isExpanded ? 0 : -5}px)`,
                transition:
                  "max-width 140ms ease, padding-right 140ms ease, opacity 110ms ease, transform 140ms ease",
              }}
            >
              {label}
            </span>
          </button>
        </div>
      </Html>
    </group>
  );
}

function GeneratedAnnotationPopup({
  target,
  rootRef,
  chapters,
  sceneRoot,
  canGoBack,
  onBack,
  onClose,
  onOpenDetail,
}) {
  const { wrapperRef, visible } = useAnnotationAnchorPosition(
    target?.object,
    rootRef,
  );
  const assignedChapter = useMemo(
    () => findExactChapterForObject(target?.object, chapters || [], sceneRoot),
    [chapters, sceneRoot, target?.object],
  );
  const chapterParameters = useMemo(
    () =>
      (assignedChapter?.parameters || []).filter((parameter) =>
        [parameter?.name, parameter?.value, parameter?.unit].some(
          (value) => String(value ?? "").trim().length > 0,
        ),
      ),
    [assignedChapter],
  );
  const chapterDescription = String(assignedChapter?.description || "").trim();
  const openedFromObjectList = target?.source === "object-list";
  const popupTitle =
    assignedChapter?.title ||
    target?.title ||
    target?.label ||
    `Annotation ${target?.number || 1}`;
  const hasAssignedChapter = Boolean(assignedChapter?.id);
  const hasDirectChildren = useMemo(
    () => getDirectAnnotationChildren(target?.object).length > 0,
    [target?.object],
  );
  const canOpenDetail = hasAssignedChapter || hasDirectChildren;

  if (!target?.object) return null;

  return (
    <group ref={wrapperRef} visible={visible}>
      <Html occlude={false} zIndexRange={[30, 0]}>
        <div
          style={{
            display: visible ? "inline-flex" : "none",
            position: "relative",
            alignItems: "center",
            pointerEvents: "auto",
            transform: "translateY(-50%)",
            transformOrigin: "left center",
          }}
        >
          <div
            style={{
              height: 28,
              minWidth: 28,
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              overflow: "hidden",
              borderRadius: 999,
              border: "1px solid rgba(103, 232, 249, 0.95)",
              background: GENERATED_ANNOTATION_COLOR,
              color: "#ffffff",
              fontSize: 10,
              fontWeight: 800,
              lineHeight: 1,
              boxShadow: "0 10px 30px rgba(14, 165, 216, 0.35)",
            }}
          >
            <span
              style={{
                width: 28,
                minWidth: 28,
                height: 28,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {target.number}
            </span>

            <span
              style={{
                maxWidth: 220,
                paddingRight: 10,
                overflow: "hidden",
                whiteSpace: "nowrap",
                opacity: 1,
              }}
            >
              {target.title || target.label}
            </span>
          </div>

          <div
            className="vx-player-annotation-popup"
            style={{
              position: "absolute",
              left: 40,
              top: 34,
              width: 360,
              borderRadius: 16,
              border: "1px solid rgba(103, 232, 249, 0.22)",
              background: "rgba(24, 34, 35, 0.94)",
              padding: 16,
              color: "white",
              boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
              backdropFilter: "blur(14px)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: chapterParameters.length > 0 ? 12 : 14,
                paddingBottom: 10,
                borderBottom: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div
                style={{
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {canGoBack && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onBack?.();
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      flexShrink: 0,
                      border: "1px solid rgba(103, 232, 249, 0.22)",
                      borderRadius: 8,
                      background: "rgba(103, 232, 249, 0.06)",
                      color: "#67e8f9",
                      cursor: "pointer",
                      fontSize: 16,
                    }}
                    title="Back one hierarchy level"
                  >
                    ←
                  </button>
                )}

                <strong
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 13,
                  }}
                  title={popupTitle}
                >
                  {popupTitle}
                </strong>
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onClose?.();
                }}
                style={{
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  border: 0,
                  borderRadius: 8,
                  background: "transparent",
                  color: "rgba(255,255,255,0.75)",
                  cursor: "pointer",
                  fontSize: 18,
                }}
                title="Close annotation info"
              >
                ×
              </button>
            </div>

            {chapterDescription && (
              <p className="mb-3 whitespace-pre-wrap text-xs leading-5 text-white/80">
                {chapterDescription}
              </p>
            )}

            {chapterParameters.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gap: 5,
                  marginBottom: 14,
                  fontSize: 11,
                }}
              >
                {chapterParameters.map((parameter, parameterIndex) => (
                  <div
                    key={
                      parameter.id ||
                      `${target.id}-parameter-${parameterIndex}`
                    }
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(105px, 0.95fr) minmax(105px, 1.2fr) minmax(54px, 0.45fr)",
                      minHeight: 32,
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 7,
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "6px 10px",
                        color: "#67e8f9",
                        background: "rgba(255,255,255,0.03)",
                        borderRight: "1px solid rgba(255,255,255,0.1)",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {String(parameter.name || "Parameter")}
                    </span>

                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "6px 10px",
                        color: "white",
                        borderRight: "1px solid rgba(255,255,255,0.1)",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {String(parameter.value || "—")}
                    </span>

                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "6px 8px",
                        color: "rgba(255,255,255,0.78)",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {String(parameter.unit || "")}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!openedFromObjectList && (
              <button
                type="button"
                disabled={!canOpenDetail}
                onClick={(event) => {
                event.stopPropagation();

                if (!canOpenDetail) return;

                onOpenDetail?.(assignedChapter?.id || null, target);
              }}
              style={{
                minHeight: 34,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "0 13px",
                borderRadius: 8,
                border: canOpenDetail
                  ? "1px solid rgba(250, 204, 21, 0.78)"
                  : "1px solid rgba(148, 163, 184, 0.22)",
                background: canOpenDetail
                  ? "rgba(250, 204, 21, 0.08)"
                  : "rgba(148, 163, 184, 0.04)",
                color: canOpenDetail
                  ? "#ffffff"
                  : "rgba(148, 163, 184, 0.5)",
                cursor: canOpenDetail ? "pointer" : "not-allowed",
                fontSize: 12,
                fontWeight: 700,
              }}
              title={
                hasAssignedChapter && hasDirectChildren
                  ? "Open assigned chapter and explore child objects"
                  : hasAssignedChapter
                    ? "Open assigned chapter detail"
                    : hasDirectChildren
                      ? "Explore child objects"
                      : "No chapter or child object is available"
              }
            >
              <span
                aria-hidden="true"
                style={{
                  width: 16,
                  height: 19,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid currentColor",
                  borderRadius: 3,
                  fontSize: 10,
                  lineHeight: 1,
                }}
              >
                ▯
              </span>
              Detail
              </button>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}

export function GeneratedObjectAnnotations({
  modelScene,
  selectedObject,
  rootRef,
  chapters,
  enabled,
  showMarkers = true,
  selectedAnnotationId,
  externalSelectedTarget = null,
  onAnnotationClick,
  onAnnotationClose,
  onAnnotationOpenDetail,
  onAnnotationHighlight,
  onAnnotationHierarchyBack,
}) {
  const [annotationRootObject, setAnnotationRootObject] = useState(null);
  const [annotationPath, setAnnotationPath] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [hoveredTarget, setHoveredTarget] = useState(null);
  const drilldownSelectionRef = useRef(null);
  const { root, targets } = useGeneratedAnnotationTargets(
    modelScene,
    selectedObject,
    annotationRootObject,
  );

  useEffect(() => {
    drilldownSelectionRef.current = null;
    setAnnotationRootObject(null);
    setAnnotationPath([]);
    setSelectedTarget(null);
    setHoveredTarget(null);
  }, [enabled, modelScene?.uuid]);

  useEffect(() => {
    // Opening chapter detail selects/highlights the same object in Player.
    // Preserve the hierarchy root for that intentional selection change so
    // the object's direct children remain visible after Detail is pressed.
    const expectedSelection = drilldownSelectionRef.current;
    const selectedObjectName = String(selectedObject?.name || "")
      .trim()
      .toLowerCase();
    const expectedSelectionIsValid = Boolean(
      expectedSelection && Date.now() <= expectedSelection.expiresAt,
    );
    const matchesExpectedSelection = Boolean(
      expectedSelectionIsValid &&
        ((selectedObject?.uuid &&
          selectedObject.uuid === expectedSelection.uuid) ||
          (selectedObjectName &&
            selectedObjectName === expectedSelection.name)),
    );
    const shouldIgnoreSelectionChange = Boolean(
      expectedSelectionIsValid && expectedSelection.ignoreSelectionChange,
    );

    if (matchesExpectedSelection || shouldIgnoreSelectionChange) {
      drilldownSelectionRef.current = null;
      return;
    }

    drilldownSelectionRef.current = null;
    setAnnotationRootObject(null);
    setAnnotationPath([]);
    setSelectedTarget(null);
    setHoveredTarget(null);
  }, [selectedObject?.uuid]);

  useEffect(() => {
    if (!selectedAnnotationId) {
      setSelectedTarget(null);
      setHoveredTarget(null);
      return;
    }

    const externalObject = resolveLogicalObject(externalSelectedTarget?.object);
    const externalId = externalSelectedTarget?.id || externalObject?.uuid || null;

    if (externalObject && externalId === selectedAnnotationId) {
      setHoveredTarget(null);
      setSelectedTarget({
        ...externalSelectedTarget,
        id: externalObject.uuid || selectedAnnotationId,
        title:
          externalSelectedTarget?.title ||
          getAnnotationDisplayName(externalObject, "Selected Object"),
        number: externalSelectedTarget?.number || 1,
        objectName: externalObject.name || externalSelectedTarget?.objectName || "",
        object: externalObject,
      });
      return;
    }

    const matchingTarget = targets.find(
      (target) => target.object?.uuid === selectedAnnotationId,
    );

    if (matchingTarget) {
      setHoveredTarget(null);
      setSelectedTarget(matchingTarget);
    }
  }, [externalSelectedTarget, selectedAnnotationId, targets]);

  useEffect(() => {
    onAnnotationHighlight?.(
      hoveredTarget?.object || selectedTarget?.object || null,
    );
  }, [hoveredTarget?.object, onAnnotationHighlight, selectedTarget?.object]);

  if (!enabled || targets.length === 0) return null;

  const handleAnnotationClick = (target) => {
    // Selecting an annotation only opens its popup. Hierarchy drill-down is
    // intentionally deferred until the user presses the Detail button.
    setHoveredTarget(null);
    setSelectedTarget(target);
    onAnnotationClick?.(target);
  };

  const handleOpenDetail = (chapterId, target = selectedTarget) => {
    if (!target?.object) return;

    const directChildren = getDirectAnnotationChildren(target.object);

    // Detail is the explicit hierarchy-navigation action. Keep rendering only
    // one direct-child level at a time, but allow the user to continue through
    // intermediary assembly/group nodes until the deepest leaf is reached.
    if (directChildren.length > 0 && target.object !== root) {
      setAnnotationPath((currentPath) => [...currentPath, root]);
      setAnnotationRootObject(target.object);
    }

    // Once Detail is pressed, the current marker and popup must disappear.
    // The next hierarchy level (when available) is then rendered cleanly,
    // without leaving the previous annotation expanded on screen.
    setSelectedTarget(null);
    setHoveredTarget(null);
    onAnnotationClose?.();

    // A group may have child objects without having its own assigned chapter.
    // In that case Detail still drills into the hierarchy, but does not open a
    // chapter reader. Leaf objects without a chapter remain disabled.
    if (chapterId) {
      drilldownSelectionRef.current = {
        uuid: target.object.uuid || "",
        name: String(target.object.name || "").trim().toLowerCase(),
        expiresAt: Date.now() + 1500,
      };
      onAnnotationOpenDetail?.(chapterId);
    }
  };

  const handleHierarchyBack = () => {
    if (annotationPath.length === 0) return;

    const previousRoot = annotationPath[annotationPath.length - 1];

    setAnnotationPath(annotationPath.slice(0, -1));
    setAnnotationRootObject(previousRoot || null);
    setSelectedTarget(null);
    setHoveredTarget(null);

    // Back is hierarchy navigation, not object selection. Clear both the
    // transient annotation outline and any Player selection/chapter highlight
    // before rendering the parent annotations again.
    onAnnotationHighlight?.(null);
    onAnnotationClose?.();

    // Clearing Player selection in the parent callback changes selectedObject.
    // Preserve the just-restored parent root for that intentional change.
    if (selectedObject) {
      drilldownSelectionRef.current = {
        ignoreSelectionChange: true,
        expiresAt: Date.now() + 1500,
      };
    }

    onAnnotationHierarchyBack?.({
      parentObject: previousRoot || null,
    });
  };

  const handleClose = () => {
    setSelectedTarget(null);
    setHoveredTarget(null);
    setAnnotationRootObject(null);
    setAnnotationPath([]);
    onAnnotationClose?.();
  };

  return (
    <>
      {showMarkers &&
        targets
          .filter((target) => target.object?.uuid !== selectedTarget?.object?.uuid)
          .map((target, index) => (
            <GeneratedAnnotationMarker
            key={target.object.uuid || `${target.label}-${index}`}
            index={index}
            label={target.label}
            object={target.object}
            rootRef={rootRef}
            selectedAnnotationId={selectedAnnotationId}
            onClick={handleAnnotationClick}
            onHoverChange={setHoveredTarget}
          />
        ))}

      {selectedTarget && (
        <GeneratedAnnotationPopup
          target={selectedTarget}
          rootRef={rootRef}
          chapters={chapters}
          sceneRoot={modelScene}
          canGoBack={annotationPath.length > 0}
          onBack={handleHierarchyBack}
          onClose={handleClose}
          onOpenDetail={handleOpenDetail}
        />
      )}
    </>
  );
}

