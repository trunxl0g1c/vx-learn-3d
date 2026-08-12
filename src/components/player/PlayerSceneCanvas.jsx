import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  OrbitControls,
  Bounds,
  Center,
  Environment,
  TransformControls,
} from "@react-three/drei";
import { EffectComposer, Outline } from "@react-three/postprocessing";

import Model from "../Model";
import Marker from "../Marker";
import LoadingModel from "../viewer/LoadingModel";
import CameraAnimator from "../viewer/CameraAnimator";
import { getViewerBackground, getViewerBackgroundStyle } from "../../utils/viewerBackground";
import CustomHdriEnvironment from "../canvas/CustomHdriEnvironment";
import ViewerSceneBackground from "../canvas/ViewerSceneBackground";
import ViewerSceneGrid from "../canvas/ViewerSceneGrid";
import ViewerProjectionCameraController from "../canvas/ViewerProjectionCameraController";
import ViewerStageFloor from "../canvas/ViewerStageFloor";
import StageShadowDirectionalLight from "../canvas/StageShadowDirectionalLight";
import FlowRuntimeRenderer from "../flow/FlowRuntimeRenderer";
import AssemblyDragController from "../procedural/AssemblyDragController";
import AssemblyGhostTarget from "../procedural/AssemblyGhostTarget";
import { DEFAULT_ORBIT_MIN_DISTANCE } from "../../engine/camera";
import { getFlowReferenceLengthFromObject } from "../../engine/flow";
import { collectMeshes } from "../../engine/selection";
import BlinkSelectionOutline from "../viewer/BlinkSelectionOutline";
import PlayerTurntableController from "./PlayerTurntableController";
import PlayerXRSceneController from "./PlayerXRSceneController";
import {
  GENERATED_ANNOTATION_COLOR,
  GeneratedObjectAnnotations,
} from "./PlayerGeneratedAnnotations";
import {
  InitialPlayerCameraSnapshot,
  RenderSettingsSync,
  WebGLRendererLifecycle,
} from "./PlayerSceneCanvasSupport";

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

export default function PlayerSceneCanvas({
  material,
  modelScene,
  viewerSettings,
  cameraProjectionMode = null,
  outlineObjects,
  blinkSelectionEnabled = false,
  shaderOutlineObjects = [],
  shaderOutlineStyle = null,
  cameraRef,
  controlsRef,
  focusTargetRef,
  freePlay,
  selectedObject,
  transformMode,
  activeChapter,
  activeSlide = null,
  activeProcedure = null,
  turntableAnimation = null,
  turntablePresentationActive = true,
  selectedAnimations,
  animationCommand,
  handleSelectObjectFromPlayer,
  handleDoubleClickObjectFromPlayer,
  handleModelLoaded,
  captureInitialCameraState,
  onSceneReady,
  setAnimations,
  showAnnotations = true,
  selectedAnnotationId = null,
  onAnnotationClick,
  onAnnotationClose,
  onAnnotationOpenDetail,
  onAnnotationHierarchyBack,
  onObjectSelectInteraction,
  clearPlayerSelection,
  preserveSelectionOnPointerMiss = false,
  activeFlow = null,
  flowPlaying = false,
  flowPlaybackKey = 0,
  activeChapterFlows = [],
  chapterFlowPlaybackKey = 0,
  activeSlideFlows = [],
  slideFlowPlaybackKey = 0,
  onSlideFlowComplete,
  onChapterFlowComplete,
  onFlowComplete,
  assemblyDragObject = null,
  assemblyStartTransform = null,
  assemblyTargetTransform = null,
  assemblyDragEnabled = false,
  assemblyCameraLocked = false,
  assemblyShowGhost = false,
  assemblyGhostRevision = 0,
  onAssemblyDragStart,
  onAssemblyDrag,
  onAssemblyDragEnd,
  xrMode = null,
  xrSettings = null,
  onRendererReady,
}) {
  const modelRootRef = useRef(null);
  const turntableRootRef = useRef(null);
  const xrRootRef = useRef(null);
  const [annotationOutlineObjects, setAnnotationOutlineObjects] = useState([]);
  const flowSpeedReferenceLength = useMemo(
    () => getFlowReferenceLengthFromObject(modelScene, 1),
    [modelScene],
  );
  const effectiveProjectionMode =
    cameraProjectionMode ||
    viewerSettings?.cameraProjectionMode ||
    "perspective";
  const animationPlaying = ["play", "playChapter", "resume"].includes(
    animationCommand?.type,
  );
  const turntableEnabled =
    Boolean(turntablePresentationActive) &&
    !freePlay &&
    !activeChapter &&
    !activeSlide &&
    !activeFlow &&
    activeChapterFlows.length === 0 &&
    activeSlideFlows.length === 0 &&
    !activeProcedure &&
    !xrMode &&
    !animationPlaying;

  const handleAnnotationHighlight = useCallback((object) => {
    setAnnotationOutlineObjects(object ? collectMeshes(object) : []);
  }, []);

  useEffect(() => {
    setAnnotationOutlineObjects([]);
  }, [modelScene?.uuid, showAnnotations]);

  const handleObjectSelect = (object) => {
    const selection = handleSelectObjectFromPlayer?.(object);

    // A disabled Player click must be a true no-op: do not close Chapter UI or
    // trigger any secondary interaction merely because a mesh was raycast.
    if (selection) {
      onObjectSelectInteraction?.(selection.selectedObject || object);
    }

    return selection;
  };

  const handleObjectDoubleClick = (object) => {
    const selection = handleDoubleClickObjectFromPlayer?.(object);

    if (selection) {
      onObjectSelectInteraction?.(selection.selectedObject || object);
    }

    return selection;
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
  const background = getViewerBackground(viewerSettings);
  const stageBackgroundEnabled =
    background.type === "stage" && !isSketchMode && xrMode !== "ar";
  const isARSession = xrMode === "ar";
  const xrGridEnabled = xrMode
    ? xrMode === "vr"
      ? Boolean(xrSettings?.vr?.showGrid)
      : Boolean(xrSettings?.ar?.showGrid)
    : null;
  const gridViewerSettings = xrMode
    ? {
        ...viewerSettings,
        grid: {
          ...(viewerSettings?.grid || {}),
          enabled: xrGridEnabled,
          showInPlayer: xrGridEnabled,
        },
      }
    : viewerSettings;
  const canvasStyle = isARSession
    ? { background: "transparent" }
    : isSketchMode
      ? { background: "#ffffff" }
      : getViewerBackgroundStyle(viewerSettings);

  return (
    <Canvas
      shadows={stageBackgroundEnabled ? 'soft' : false}
      camera={{ position: [0, 0, 5] }}
      dpr={[1, 1.5]}
      style={canvasStyle}
      gl={{
        alpha: true,
        localClippingEnabled: true,
        antialias: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      onCreated={({ camera, gl }) => {
        cameraRef.current = camera;
        gl.setClearColor(0x000000, 0);
        gl.toneMappingExposure = viewerSettings.exposure;
      }}
      onPointerMissed={(event) => {
        if (event?.button !== undefined && event.button !== 0) return;
        if (Number(event?.delta || 0) > 2) return;
        if (preserveSelectionOnPointerMiss) return;

        setAnnotationOutlineObjects([]);
        clearPlayerSelection?.();
      }}
    >
      <WebGLRendererLifecycle registryKey="__PLAYER_RENDERER__" onRendererReady={onRendererReady} />
      <ViewerProjectionCameraController
        mode={effectiveProjectionMode}
        cameraRef={cameraRef}
        controlsRef={controlsRef}
        focusTargetRef={focusTargetRef}
      />
      <RenderSettingsSync viewerSettings={viewerSettings} />
      {!isARSession && (
        <ViewerSceneBackground
          viewerSettings={viewerSettings}
          backgroundOverrideColor={isSketchMode ? "#ffffff" : null}
        />
      )}
      <ViewerSceneGrid
        viewerSettings={gridViewerSettings}
        modelRootRef={modelRootRef}
        modelScene={modelScene}
        player
      />

      <EffectComposer autoClear={false} multisampling={0}>
        {shaderOutlineObjects.length > 0 && (
          <Outline
            selection={shaderOutlineObjects}
            selectionLayer={8}
            edgeStrength={shaderOutlineConfig.edgeStrength}
            visibleEdgeColor={shaderOutlineConfig.visibleEdgeColor}
            hiddenEdgeColor={shaderOutlineConfig.hiddenEdgeColor}
            blur={false}
          />
        )}

        {annotationOutlineObjects.length > 0 && (
          <Outline
            selection={annotationOutlineObjects}
            selectionLayer={9}
            edgeStrength={7}
            visibleEdgeColor={GENERATED_ANNOTATION_COLOR}
            hiddenEdgeColor={GENERATED_ANNOTATION_COLOR}
            blur={false}
          />
        )}

        {outlineObjects.length > 0 &&
          (blinkSelectionEnabled ? (
            <BlinkSelectionOutline
              selection={outlineObjects}
              settings={viewerSettings?.blinkSettings}
            />
          ) : (
            <Outline
              selection={outlineObjects}
              selectionLayer={10}
              edgeStrength={8}
              pulseSpeed={0}
              visibleEdgeColor="yellow"
              hiddenEdgeColor="yellow"
              blur={false}
            />
          ))}
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

      <StageShadowDirectionalLight
        enabled={stageBackgroundEnabled}
        intensity={viewerSettings.mainLight}
        modelRootRef={modelRootRef}
        modelScene={modelScene}
        position={[5, 8, 5]}
        softness={background.stageShadowSoftness}
        blurRadius={background.stageShadowBlurRadius}
        spread={background.stageShadowSpread}
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

      {stageBackgroundEnabled && (
        <ViewerStageFloor
          viewerSettings={viewerSettings}
          modelRootRef={modelRootRef}
          modelScene={modelScene}
        />
      )}

      <group ref={xrRootRef}>
        <Suspense fallback={<LoadingModel />}>
          <Bounds fit clip margin={1.2}>
            <Center>
              <group ref={turntableRootRef}>
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
                (activeChapter?.markers || []).map((marker, index) => (
                  <Marker
                    key={marker.id || index}
                    marker={marker}
                    modelScene={modelScene}
                    chapter={activeChapter}
                  />
                ))}

              {!freePlay &&
                (activeSlide?.markers || []).map((marker, index) => (
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
                  onAnnotationHighlight={handleAnnotationHighlight}
                  onAnnotationHierarchyBack={onAnnotationHierarchyBack}
                />
              )}
              </group>
            </group>
            </Center>
          </Bounds>
        </Suspense>
      </group>

      <PlayerXRSceneController
        mode={xrMode}
        settings={xrSettings}
        rootRef={xrRootRef}
        modelScene={modelScene}
        onSelectObject={handleObjectSelect}
      />

      <PlayerTurntableController
        rootRef={turntableRootRef}
        enabled={turntableEnabled}
        settings={turntableAnimation}
        sceneKey={`${material?.projectId || "project"}:${modelScene?.uuid || "scene"}`}
      />

      <CameraAnimator
        cameraRef={cameraRef}
        controlsRef={controlsRef}
        focusTargetRef={focusTargetRef}
      />

      <InitialPlayerCameraSnapshot
        modelScene={modelScene}
        controlsRef={controlsRef}
        onCapture={captureInitialCameraState}
        onReady={onSceneReady}
      />

      <AssemblyGhostTarget
        object={assemblyDragObject}
        targetTransform={assemblyTargetTransform}
        visible={assemblyDragEnabled && assemblyShowGhost}
        refreshKey={assemblyGhostRevision}
      />

      <AssemblyDragController
        enabled={assemblyDragEnabled}
        object={assemblyDragObject}
        startTransform={assemblyStartTransform}
        targetTransform={assemblyTargetTransform}
        controlsRef={controlsRef}
        cameraLocked={assemblyCameraLocked}
        onDragStart={onAssemblyDragStart}
        onDrag={onAssemblyDrag}
        onDragEnd={onAssemblyDragEnd}
      />

      <OrbitControls
        ref={controlsRef}
        enabled={!assemblyCameraLocked && !xrMode}
        enableRotate={
          !assemblyCameraLocked && effectiveProjectionMode !== "orthographic"
        }
        enableZoom={!assemblyCameraLocked}
        enablePan={!assemblyCameraLocked}
        zoomToCursor={effectiveProjectionMode !== "orthographic"}
        minDistance={DEFAULT_ORBIT_MIN_DISTANCE}
        onStart={() => {
          focusTargetRef.current = null;
        }}
      />
    </Canvas>
  );
}
