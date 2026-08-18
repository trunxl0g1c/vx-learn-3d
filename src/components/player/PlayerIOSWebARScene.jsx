import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  InstantTracker,
  ZapparCamera,
  ZapparCanvas,
} from "@zappar/zappar-react-three-fiber";

import Model from "../Model";
import Marker from "../Marker";
import FlowRuntimeRenderer from "../flow/FlowRuntimeRenderer";
import { getFlowReferenceLengthFromObject } from "../../engine/flow";
import { getXRNormalizedScale } from "../../engine/xr";
import {
  GeneratedObjectAnnotations,
} from "./PlayerGeneratedAnnotations";
import { WebGLRendererLifecycle } from "./PlayerSceneCanvasSupport";

const DEFAULT_PLACEMENT_DISTANCE = 2;

function PlayerIOSWebARCamera({ engine, externalCameraRef }) {
  const [camera, setCamera] = useState(null);

  const assignCamera = useCallback(
    (instance) => {
      setCamera(instance || null);
      if (externalCameraRef) externalCameraRef.current = instance || null;
    },
    [externalCameraRef],
  );

  useEffect(() => {
    if (!camera) return undefined;

    try {
      // Permission is requested from the explicit XR button before this scene
      // mounts. Start the rear camera only after ZapparCanvas owns the WebGL
      // context and ZapparCamera has become the R3F default camera.
      camera.start?.(false);
    } catch (error) {
      engine?.reportCameraError?.(
        error?.message || "Unable to start the rear camera for iOS WebAR.",
      );
    }

    return () => {
      try {
        camera.pause?.();
      } catch {
        // Camera cleanup must never block route/XR teardown.
      }
      if (externalCameraRef?.current === camera) {
        externalCameraRef.current = null;
      }
    };
  }, [camera, engine, externalCameraRef]);

  return (
    <ZapparCamera
      ref={assignCamera}
      poseMode="default"
      rearCameraMirrorMode="none"
      makeDefault
      renderPriority={1}
      onFirstFrame={() => engine?.markCameraFrameReady?.()}
    />
  );
}

/**
 * Dedicated iPhone/iPad AR renderer.
 *
 * This deliberately does NOT reuse the normal Player Canvas. The desktop
 * Player owns Bounds/OrbitControls/stage/background/default-camera lifecycle,
 * while Zappar must own the canvas and camera during tracked WebAR. Keeping the
 * renderers separate prevents the normal Player camera/background from winning
 * the frame after XR starts.
 */
export default function PlayerIOSWebARScene({
  material,
  modelScene,
  viewerSettings,
  xrSettings,
  iosWebARState,
  iosWebARController,
  modelMaxDimension = 0,
  cameraRef,
  selectedAnimations,
  animationCommand,
  setAnimations,
  handleSelectObjectFromPlayer,
  handleDoubleClickObjectFromPlayer,
  onObjectSelectInteraction,
  selectedObject,
  activeChapter,
  activeSlide,
  activeFlow,
  flowPlaying,
  flowPlaybackKey,
  activeChapterFlows = [],
  chapterFlowPlaybackKey = 0,
  activeSlideFlows = [],
  slideFlowPlaybackKey = 0,
  onSlideFlowComplete,
  onChapterFlowComplete,
  onFlowComplete,
  showAnnotations = true,
  selectedAnnotationId = null,
  onAnnotationClick,
  onAnnotationClose,
  onAnnotationOpenDetail,
  onAnnotationHierarchyBack,
  preserveSelectionOnPointerMiss = false,
  clearPlayerSelection,
  onRendererReady,
}) {
  const modelRootRef = useRef(null);
  const placed = Boolean(iosWebARState?.placed);
  const hasValidModelDimension =
    Number.isFinite(Number(modelMaxDimension)) && Number(modelMaxDimension) > 1e-5;

  const xrScale = useMemo(
    () =>
      getXRNormalizedScale({
        maxDimension: modelMaxDimension,
        mode: "ar",
        userScale: xrSettings?.ar?.scale,
      }),
    [modelMaxDimension, xrSettings?.ar?.scale],
  );

  const flowSpeedReferenceLength = useMemo(
    () => getFlowReferenceLengthFromObject(modelScene, 1),
    [modelScene],
  );

  const handleObjectSelect = useCallback(
    (object) => {
      const selection = handleSelectObjectFromPlayer?.(object);
      if (selection) {
        onObjectSelectInteraction?.(selection.selectedObject || object);
      }
      return selection;
    },
    [handleSelectObjectFromPlayer, onObjectSelectInteraction],
  );

  const handleObjectDoubleClick = useCallback(
    (object) => {
      const selection = handleDoubleClickObjectFromPlayer?.(object);
      if (selection) {
        onObjectSelectInteraction?.(selection.selectedObject || object);
      }
      return selection;
    },
    [handleDoubleClickObjectFromPlayer, onObjectSelectInteraction],
  );

  return (
    <ZapparCanvas
      dpr={1}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        background: "#000000",
      }}
      onPointerMissed={(event) => {
        if (event?.button !== undefined && event.button !== 0) return;
        if (Number(event?.delta || 0) > 2) return;
        if (preserveSelectionOnPointerMiss) return;
        clearPlayerSelection?.();
      }}
    >
      <WebGLRendererLifecycle
        registryKey="__PLAYER_RENDERER__"
        onRendererReady={onRendererReady}
      />

      <PlayerIOSWebARCamera
        engine={iosWebARController}
        externalCameraRef={cameraRef}
      />

      <ambientLight intensity={viewerSettings?.ambientLight ?? 0.5} />
      <directionalLight
        position={[3, 6, 4]}
        intensity={viewerSettings?.mainLight ?? 0.8}
      />
      <hemisphereLight
        skyColor="#ffffff"
        groundColor="#888888"
        intensity={viewerSettings?.hemiLight ?? 0.5}
      />

      <InstantTracker
        placementMode={!placed}
        placementCameraOffset={[0, 0, -DEFAULT_PLACEMENT_DISTANCE]}
      >
        <group visible={hasValidModelDimension} scale={xrScale}>
          <Suspense fallback={null}>
            <group ref={modelRootRef}>
              <Model
                modelUrl={material.modelUrl}
                markerMode={false}
                onSelectObject={handleObjectSelect}
                onDoubleClickObject={handleObjectDoubleClick}
                // This GLTF is already loaded by the normal Player before the
                // XR button can be used. Do not notify the global Player load
                // lifecycle again when the cached scene is mounted in AR.
                onModelLoaded={() => {}}
                selectedAnimations={selectedAnimations}
                animationCommand={animationCommand}
                onAnimationsLoaded={(clips) => setAnimations?.(clips || [])}
              />

              {activeFlow?.points?.length >= 2 && (
                <FlowRuntimeRenderer
                  flow={activeFlow}
                  playing={flowPlaying}
                  visible={flowPlaying}
                  showWaypoints={activeFlow?.settings?.showWaypoints === true}
                  restartToken={flowPlaybackKey}
                  speedReferenceLength={flowSpeedReferenceLength}
                  onComplete={onFlowComplete}
                />
              )}

              {activeChapterFlows.map((flow) => (
                <FlowRuntimeRenderer
                  key={`chapter-flow-${flow.id}`}
                  flow={flow}
                  playing
                  visible
                  showWaypoints={flow?.settings?.showWaypoints === true}
                  restartToken={`${chapterFlowPlaybackKey}:${flow.id}`}
                  speedReferenceLength={flowSpeedReferenceLength}
                  onComplete={() => onChapterFlowComplete?.(flow.id)}
                />
              ))}

              {activeSlideFlows.map((flow) => (
                <FlowRuntimeRenderer
                  key={`slide-flow-${flow.id}`}
                  flow={flow}
                  playing
                  visible
                  showWaypoints={flow?.settings?.showWaypoints === true}
                  restartToken={`${slideFlowPlaybackKey}:${flow.id}`}
                  speedReferenceLength={flowSpeedReferenceLength}
                  onComplete={() => onSlideFlowComplete?.(flow.id)}
                />
              ))}

              {(activeChapter?.markers || []).map((marker, index) => (
                <Marker
                  key={marker.id || index}
                  marker={marker}
                  modelScene={modelScene}
                  chapter={activeChapter}
                />
              ))}

              {(activeSlide?.markers || []).map((marker, index) => (
                <Marker
                  key={`slide-${marker.id || index}`}
                  marker={marker}
                  modelScene={modelScene}
                  chapter={activeSlide}
                />
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
                  onAnnotationHierarchyBack={onAnnotationHierarchyBack}
                />
              )}
            </group>
          </Suspense>
        </group>
      </InstantTracker>
    </ZapparCanvas>
  );
}
