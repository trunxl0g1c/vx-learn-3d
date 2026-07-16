import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  OrbitControls,
  Bounds,
  Center,
  Environment,
  Html,
  TransformControls,
} from "@react-three/drei";
import { EffectComposer, Outline } from "@react-three/postprocessing";

import Model from "../Model";
import Marker from "../Marker";
import LoadingModel from "../viewer/LoadingModel";
import CameraAnimator from "../viewer/CameraAnimator";
import { getViewerBackgroundStyle } from "../../utils/viewerBackground";
import CustomHdriEnvironment from "../canvas/CustomHdriEnvironment";
import ViewerSceneBackground from "../canvas/ViewerSceneBackground";
import { findExactChapterForObject } from "../../engine/selection";

const GENERATED_ANNOTATION_COLOR = "#0ea5d8";

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
  if (!rootObject) return [];

  return rootObject.children.filter(
    (child) => isMeaningfulSceneObject(child) && hasRenderableContent(child),
  );
}

function resolveGeneratedAnnotationRoot(modelScene, selectedObject) {
  if (selectedObject && hasRenderableContent(selectedObject)) {
    return selectedObject;
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
    const root =
      annotationRootObject ||
      resolveGeneratedAnnotationRoot(modelScene, selectedObject);
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

    if (selectedObject && hasRenderableContent(selectedObject)) {
      return {
        root,
        targets: [
          {
            object: selectedObject,
            label: getAnnotationDisplayName(
              selectedObject,
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
  const { camera } = useThree();

  useFrame(() => {
    if (!wrapperRef.current || !object || !rootRef?.current) return;

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

  return wrapperRef;
}

function GeneratedAnnotationMarker({
  index,
  label,
  object,
  rootRef,
  selectedAnnotationId,
  onClick,
}) {
  const wrapperRef = useAnnotationAnchorPosition(object, rootRef);
  const [hovered, setHovered] = useState(false);
  const annotationId = object?.uuid || `${label}-${index}`;
  const isSelected = selectedAnnotationId === annotationId;
  const isExpanded = hovered || isSelected;

  useEffect(() => {
    setHovered(false);
  }, [object]);

  return (
    <group ref={wrapperRef}>
      <Html occlude={false} zIndexRange={[60, 0]}>
        <div
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            pointerEvents: "auto",
            transform: "translateY(-50%)",
            transformOrigin: "left center",
          }}
        >
          <button
            type="button"
            onPointerOver={(event) => {
              event.stopPropagation();
              setHovered(true);
            }}
            onPointerOut={(event) => {
              event.stopPropagation();
              setHovered(false);
            }}
            onClick={(event) => {
              event.stopPropagation();

              onClick?.({
                id: annotationId,
                index,
                number: index + 1,
                title: label,
                objectName: object?.name || label,
                object,
              });
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
  canGoBack,
  onBack,
  onClose,
  onOpenDetail,
}) {
  const wrapperRef = useAnnotationAnchorPosition(target?.object, rootRef);
  const assignedChapter = useMemo(
    () => findExactChapterForObject(target?.object, chapters || []),
    [chapters, target?.object],
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
    <group ref={wrapperRef}>
      <Html occlude={false} zIndexRange={[70, 0]}>
        <div
          style={{
            position: "relative",
            display: "inline-flex",
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
          </div>
        </div>
      </Html>
    </group>
  );
}

function GeneratedObjectAnnotations({
  modelScene,
  selectedObject,
  rootRef,
  chapters,
  enabled,
  selectedAnnotationId,
  onAnnotationClick,
  onAnnotationClose,
  onAnnotationOpenDetail,
}) {
  const [annotationRootObject, setAnnotationRootObject] = useState(null);
  const [annotationPath, setAnnotationPath] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
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
  }, [enabled, modelScene?.uuid]);

  useEffect(() => {
    // Opening chapter detail selects/highlights the same object in Player.
    // Preserve the hierarchy root for that intentional selection change so
    // the object's direct children remain visible after Detail is pressed.
    const expectedSelection = drilldownSelectionRef.current;
    const selectedObjectName = String(selectedObject?.name || "")
      .trim()
      .toLowerCase();
    const matchesExpectedSelection = Boolean(
      expectedSelection &&
        Date.now() <= expectedSelection.expiresAt &&
        ((selectedObject?.uuid &&
          selectedObject.uuid === expectedSelection.uuid) ||
          (selectedObjectName &&
            selectedObjectName === expectedSelection.name)),
    );

    if (matchesExpectedSelection) {
      drilldownSelectionRef.current = null;
      return;
    }

    drilldownSelectionRef.current = null;
    setAnnotationRootObject(null);
    setAnnotationPath([]);
    setSelectedTarget(null);
  }, [selectedObject?.uuid]);

  useEffect(() => {
    if (!selectedAnnotationId) {
      setSelectedTarget(null);
    }
  }, [selectedAnnotationId]);

  if (!enabled || targets.length === 0) return null;

  const handleAnnotationClick = (target) => {
    // Selecting an annotation only opens its popup. Hierarchy drill-down is
    // intentionally deferred until the user presses the Detail button.
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
    onAnnotationClose?.();
  };

  const handleClose = () => {
    setSelectedTarget(null);
    setAnnotationRootObject(null);
    setAnnotationPath([]);
    onAnnotationClose?.();
  };

  return (
    <>
      {targets
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
          />
        ))}

      {selectedTarget && (
        <GeneratedAnnotationPopup
          target={selectedTarget}
          rootRef={rootRef}
          chapters={chapters}
          canGoBack={annotationPath.length > 0}
          onBack={handleHierarchyBack}
          onClose={handleClose}
          onOpenDetail={handleOpenDetail}
        />
      )}
    </>
  );
}

function RenderSettingsSync({ viewerSettings }) {
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

function InitialPlayerCameraSnapshot({
  modelScene,
  controlsRef,
  onCapture,
}) {
  const { camera } = useThree();
  const capturedSceneIdRef = useRef(null);
  const trackedSceneIdRef = useRef(null);
  const stableFrameCountRef = useRef(0);
  const lastPositionRef = useRef(new THREE.Vector3());
  const lastTargetRef = useRef(new THREE.Vector3());
  const lastQuaternionRef = useRef(new THREE.Quaternion());

  useFrame(() => {
    const controls = controlsRef?.current;
    const sceneId = modelScene?.uuid || modelScene?.id || null;

    if (!sceneId || !controls || !onCapture) return;
    if (capturedSceneIdRef.current === sceneId) return;

    if (trackedSceneIdRef.current !== sceneId) {
      trackedSceneIdRef.current = sceneId;
      stableFrameCountRef.current = 0;
      lastPositionRef.current.copy(camera.position);
      lastTargetRef.current.copy(controls.target);
      lastQuaternionRef.current.copy(camera.quaternion);
      return;
    }

    const positionDelta = lastPositionRef.current.distanceTo(camera.position);
    const targetDelta = lastTargetRef.current.distanceTo(controls.target);
    const rotationDelta = lastQuaternionRef.current.angleTo(camera.quaternion);

    if (
      positionDelta < 0.00001 &&
      targetDelta < 0.00001 &&
      rotationDelta < 0.00001
    ) {
      stableFrameCountRef.current += 1;
    } else {
      stableFrameCountRef.current = 0;
    }

    lastPositionRef.current.copy(camera.position);
    lastTargetRef.current.copy(controls.target);
    lastQuaternionRef.current.copy(camera.quaternion);

    // Wait until Bounds and OrbitControls have settled before storing the
    // immutable Player home-camera snapshot.
    if (stableFrameCountRef.current < 4) return;

    onCapture({
      sceneId,
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
      target: controls.target.clone(),
      zoom: camera.zoom,
    });

    capturedSceneIdRef.current = sceneId;
  });

  return null;
}

export default function PlayerSceneCanvas({
  material,
  modelScene,
  viewerSettings,
  outlineObjects,
  shaderOutlineObjects = [],
  shaderOutlineStyle = null,
  cameraRef,
  controlsRef,
  focusTargetRef,
  freePlay,
  selectedObject,
  transformMode,
  activeChapter,
  selectedAnimations,
  animationCommand,
  handleSelectObjectFromPlayer,
  handleDoubleClickObjectFromPlayer,
  handleModelLoaded,
  captureInitialCameraState,
  setAnimations,
  showAnnotations = true,
  selectedAnnotationId = null,
  onAnnotationClick,
  onAnnotationClose,
  onAnnotationOpenDetail,
  onObjectSelectInteraction,
}) {
  const modelRootRef = useRef(null);

  const handleObjectSelect = (object) => {
    const selection = handleSelectObjectFromPlayer?.(object);
    onObjectSelectInteraction?.(selection?.selectedObject || object);

    return selection;
  };

  const handleObjectDoubleClick = (object) => {
    onObjectSelectInteraction?.(object);
    handleDoubleClickObjectFromPlayer?.(object);
  };

  if (!material?.modelUrl) {
    return (
      <div
        style={{
          height: "100%",
          display: "grid",
          placeItems: "center",
          color: "#94a3b8",
          fontSize: 20,
          fontWeight: "bold",
        }}
      >
        Load JSON materi terlebih dahulu
      </div>
    );
  }

  const shaderOutlineConfig = getShaderOutlineConfig(shaderOutlineStyle);
  const isSketchMode = shaderOutlineStyle === "sketch";
  const canvasStyle = isSketchMode
    ? { background: "#ffffff" }
    : getViewerBackgroundStyle(viewerSettings);

  return (
    <Canvas
      camera={{ position: [0, 0, 5] }}
      style={canvasStyle}
      gl={{
        alpha: true,
        localClippingEnabled: true,
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      onCreated={({ camera, gl }) => {
        cameraRef.current = camera;
        gl.setClearColor(0x000000, 0);
        gl.toneMappingExposure = viewerSettings.exposure;
        window.__PLAYER_RENDERER__ = gl;
      }}
    >
      <RenderSettingsSync viewerSettings={viewerSettings} />
      <ViewerSceneBackground
        viewerSettings={viewerSettings}
        backgroundOverrideColor={isSketchMode ? "#ffffff" : null}
      />

      <EffectComposer autoClear={false}>
        {shaderOutlineObjects.length > 0 && (
          <Outline
            selection={shaderOutlineObjects}
            edgeStrength={shaderOutlineConfig.edgeStrength}
            visibleEdgeColor={shaderOutlineConfig.visibleEdgeColor}
            hiddenEdgeColor={shaderOutlineConfig.hiddenEdgeColor}
            blur={false}
          />
        )}

        {outlineObjects.length > 0 && (
          <Outline
            selection={outlineObjects}
            edgeStrength={8}
            visibleEdgeColor="yellow"
            hiddenEdgeColor="yellow"
            blur={false}
          />
        )}
      </EffectComposer>

      <ambientLight intensity={viewerSettings.ambientLight} />

      {!isSketchMode && (
        viewerSettings?.hdriSource === "custom" &&
        viewerSettings?.customHdri?.dataUrl ? (
          <CustomHdriEnvironment viewerSettings={viewerSettings} />
        ) : (
          viewerSettings.hdri && (
            <Environment
              files={viewerSettings.hdri}
              background={viewerSettings.showHdriBackground}
              environmentIntensity={viewerSettings.envIntensity}
              backgroundIntensity={viewerSettings.envIntensity}
            />
          )
        )
      )}

      <directionalLight
        position={[5, 8, 5]}
        intensity={viewerSettings.mainLight}
      />

      <directionalLight
        position={[-5, 4, -5]}
        intensity={viewerSettings.fillLight}
      />

      <hemisphereLight
        skyColor="#ffffff"
        groundColor="#aaaaaa"
        intensity={viewerSettings.hemiLight}
      />

      <Suspense fallback={<LoadingModel />}>
        <Bounds fit clip margin={1.2}>
          <Center>
            <group ref={modelRootRef}>
              <Model
                modelUrl={material.modelUrl}
                markerMode={false}
                onSelectObject={handleObjectSelect}
                onDoubleClickObject={handleObjectDoubleClick}
                onModelLoaded={(scene) => {
                  handleModelLoaded(scene || modelRootRef.current);
                }}
                selectedAnimations={selectedAnimations}
                animationCommand={animationCommand}
                onAnimationsLoaded={(clips) => {
                  setAnimations(clips || []);
                }}
              />

              {freePlay && selectedObject && (
                <TransformControls
                  object={selectedObject}
                  mode={transformMode}
                  onMouseDown={() => {
                    controlsRef.current.enabled = false;
                  }}
                  onMouseUp={() => {
                    controlsRef.current.enabled = true;
                  }}
                />
              )}

              {!freePlay &&
                showAnnotations &&
                (activeChapter?.markers || []).map((marker, index) => (
                  <Marker key={marker.id || index} marker={marker} />
                ))}

              {showAnnotations && (
                <GeneratedObjectAnnotations
                  modelScene={modelScene}
                  selectedObject={selectedObject}
                  rootRef={modelRootRef}
                  chapters={material?.chapters || []}
                  enabled={showAnnotations}
                  selectedAnnotationId={selectedAnnotationId}
                  onAnnotationClick={onAnnotationClick}
                  onAnnotationClose={onAnnotationClose}
                  onAnnotationOpenDetail={onAnnotationOpenDetail}
                />
              )}
            </group>
          </Center>
        </Bounds>
      </Suspense>

      <CameraAnimator
        cameraRef={cameraRef}
        controlsRef={controlsRef}
        focusTargetRef={focusTargetRef}
      />

      <InitialPlayerCameraSnapshot
        modelScene={modelScene}
        controlsRef={controlsRef}
        onCapture={captureInitialCameraState}
      />

      <OrbitControls
        ref={controlsRef}
        enabled={true}
        enableRotate={true}
        enableZoom={true}
        enablePan={true}
        zoomToCursor
        minDistance={0.001}
        onStart={() => {
          focusTargetRef.current = null;
        }}
      />
    </Canvas>
  );
}
