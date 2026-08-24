import { Canvas, useThree } from '@react-three/fiber'
import {
  OrbitControls,
  Center,
  Bounds,
  TransformControls,
  Environment,
} from '@react-three/drei'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

import Marker from '../Marker'
import Model from '../Model'
import LoadingModel from '../viewer/LoadingModel'
import CameraAnimator from '../viewer/CameraAnimator'
import ModelRotator from '../viewer/ModelRotator'
import { getViewerBackground, getViewerBackgroundStyle } from '../../utils/viewerBackground'
import {
  armExpectedWebGLContextLoss,
  installExpectedWebGLContextLossGuard,
  isExpectedWebGLContextLoss,
} from '../../utils/webglContextLifecycle'
import CustomHdriEnvironment from './CustomHdriEnvironment'
import ViewerSceneBackground from './ViewerSceneBackground'
import ViewerSceneGrid from './ViewerSceneGrid'
import ViewerProjectionCameraController from './ViewerProjectionCameraController'
import ViewerStageFloor from './ViewerStageFloor'
import StageShadowDirectionalLight from './StageShadowDirectionalLight'
import FlowRuntimeRenderer from '../flow/FlowRuntimeRenderer'
import FlowWaypointEditor from '../flow/FlowWaypointEditor'
import AssemblyGhostTarget from '../procedural/AssemblyGhostTarget'
import AnimationPivotEditor from '../animation/AnimationPivotEditor'
import { DEFAULT_ORBIT_MIN_DISTANCE } from '../../engine/camera'
import { getFlowReferenceLengthFromObject } from '../../engine/flow'
import { getBlinkPresetById } from '../../engine/selection'

import { EffectComposer, Outline } from '@react-three/postprocessing'
import BlinkSelectionOutline from '../viewer/BlinkSelectionOutline'

function getShaderOutlineConfig(shaderOutlineStyle) {
  if (shaderOutlineStyle === 'sketch') {
    return {
      edgeStrength: 2,
      visibleEdgeColor: '#111111',
      hiddenEdgeColor: '#ffffff',
    }
  }

  return {
    edgeStrength: 2.5,
    visibleEdgeColor: '#172033',
    hiddenEdgeColor: '#172033',
  }
}

function WebGLRendererLifecycle({ registryKey }) {
  const { gl, scene, camera, invalidate } = useThree()

  useEffect(() => {
    const canvas = gl.domElement
    const removeExpectedLossGuard =
      installExpectedWebGLContextLossGuard(canvas)

    let mounted = true

    const handleContextLost = (event) => {
      // Intentional losses are intercepted in the capture phase before this
      // handler and before Three.js logs them. Anything reaching this point is
      // an unexpected runtime/GPU context loss and should remain recoverable.
      if (
        !mounted ||
        !canvas.isConnected ||
        isExpectedWebGLContextLoss(canvas)
      ) {
        return
      }

      event.preventDefault()

      if (typeof window !== 'undefined') {
        window.__VX_WEBGL_CONTEXT_LOST__ = true
      }
    }

    const handleContextRestored = () => {
      if (!mounted) return

      if (typeof window !== 'undefined') {
        window.__VX_WEBGL_CONTEXT_LOST__ = false
      }

      invalidate()
    }

    canvas.addEventListener('webglcontextlost', handleContextLost, false)
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false)

    if (typeof window !== 'undefined') {
      window[registryKey] = gl

      if (registryKey === '__EDITOR_RENDERER__') {
        window.__EDITOR_CAPTURE_VIEWPORT__ = () => {
          gl.render(scene, camera)
          return gl.domElement.toDataURL('image/png')
        }
      }
    }

    return () => {
      mounted = false

      // R3F intentionally calls forceContextLoss while unmounting Canvas.
      // Arm the capture guard before the renderer disposal happens so that a
      // normal route/HMR teardown is not reported as an application failure.
      armExpectedWebGLContextLoss(canvas)
      removeExpectedLossGuard({ delayed: true })

      canvas.removeEventListener('webglcontextlost', handleContextLost, false)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored, false)

      if (typeof window !== 'undefined' && window[registryKey] === gl) {
        window[registryKey] = null
      }

      if (
        typeof window !== 'undefined' &&
        registryKey === '__EDITOR_RENDERER__'
      ) {
        window.__EDITOR_CAPTURE_VIEWPORT__ = null
      }
    }
  }, [camera, gl, invalidate, registryKey, scene])

  return null
}

function RenderSettingsSync({ viewerSettings }) {
  const { gl, scene, invalidate } = useThree()

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = Number(viewerSettings?.exposure ?? 1)

    if ('environmentIntensity' in scene) {
      scene.environmentIntensity = Number(viewerSettings?.envIntensity ?? 1)
    }

    invalidate()
  }, [gl, scene, invalidate, viewerSettings?.exposure, viewerSettings?.envIntensity])

  return null
}

export default function SceneCanvas({
  cameraRef,
  controlsRef,
  focusTargetRef,
  viewerSettings,
  cameraProjectionMode = "perspective",
  outlineObjects,
  blinkSelectionEnabled = false,
  blinkRenderGroups = [],
  blinkOutlineObjects = [],
  shaderOutlineObjects = [],
  shaderOutlineStyle = null,
  modelUrl,
  additionalModels = [],
  additionalModelsEnabled = false,
  addMarker,
  handleModelLoaded,
  markerMode,
  selectObjectFromMesh,
  focusObjectFromMesh,
  selectedAnimations,
  animationCommand,
  setAnimations,
  setSelectedAnimations,
  activeMarkers,
  activeChapter = null,
  updateMarker,
  modelScene,
  targetRotationY,
  isAutoRotating,
  setIsAutoRotating,
  selectedObject,
  objectTransformMode = "translate",
  isTransforming,
  setIsTransforming,
  orbitEnabled,
  setOrbitEnabled,
  setSelectedObject,
  setOutlineObjects,
  setSelectedObjectName,
  onTransformStart = null,
  onTransformEnd = null,
  onClearSelection,
  flowPointMode = false,
  onAddFlowPoint,
  onUpdateFlowPoints,
  selectedFlowPointIds = [],
  onSelectFlowPoint,
  authoringFlow = null,
  flowPreviewPlaying = false,
  flowPreviewToken = 0,
  proceduralTransformMode = "translate",
  proceduralTransformObject = null,
  proceduralAssemblyTargetTransform = null,
  proceduralAssemblyShowGhost = false,
  animationTransformMode = "translate",
  animationTransformObject = null,
  animationTransformRig = null,
  animationPivotEditEnabled = false,
  animationPivotObject = null,
  animationPivotValue = [0, 0, 0],
  onAnimationTransformChange = null,
  onAnimationPivotChange = null,
  onAnimationPivotPick = null,
}) {
  const modelRootRef = useRef(null)
  const additionalSceneStateRef = useRef(null)
  const handleModelLoadedRef = useRef(handleModelLoaded)
  const [isFlowWaypointTransforming, setIsFlowWaypointTransforming] =
    useState(false)
  const shaderOutlineConfig = getShaderOutlineConfig(shaderOutlineStyle)
  const isSketchMode = shaderOutlineStyle === 'sketch'
  const background = getViewerBackground(viewerSettings)
  const stageBackgroundEnabled = background.type === 'stage' && !isSketchMode
  const canvasStyle = isSketchMode
    ? { background: '#ffffff' }
    : getViewerBackgroundStyle(viewerSettings)
  const transformObject = authoringFlow
    ? null
    : proceduralTransformObject || (animationPivotEditEnabled ? null : (animationTransformObject || selectedObject))
  const activeTransformMode = proceduralTransformObject
    ? proceduralTransformMode
    : animationTransformObject
      ? animationTransformMode
      : objectTransformMode
  const animationRigAxis = animationTransformRig?.axis || null
  const animationRigLocksAxis =
    animationTransformObject &&
    ["revolute", "linear"].includes(animationTransformRig?.type)
  const transformShowX = !animationRigLocksAxis || animationRigAxis === "x"
  const transformShowY = !animationRigLocksAxis || animationRigAxis === "y"
  const transformShowZ = !animationRigLocksAxis || animationRigAxis === "z"

  const transientOutlineObjects = useMemo(() => {
    if (!blinkSelectionEnabled || blinkOutlineObjects.length === 0) {
      return outlineObjects
    }

    const blinkSet = new Set(blinkOutlineObjects)
    return outlineObjects.filter((object) => !blinkSet.has(object))
  }, [blinkOutlineObjects, blinkSelectionEnabled, outlineObjects])

  const flowSpeedReferenceLength = useMemo(
    () => getFlowReferenceLengthFromObject(modelScene, 1),
    [modelScene],
  )
  const handleFlowWaypointTransformingChange = useCallback(
    (transforming) => {
      setIsFlowWaypointTransforming(transforming)
      setIsTransforming(transforming)
      setOrbitEnabled(!transforming)
    },
    [setIsTransforming, setOrbitEnabled],
  )

  const handleViewportTransformingChange = useCallback(
    (transforming) => {
      setIsTransforming(transforming)
      setOrbitEnabled(!transforming)

      if (transforming) {
        setIsAutoRotating(false)
        focusTargetRef.current = null
      }

      if (controlsRef.current) {
        controlsRef.current.enabled = !transforming
      }
    },
    [controlsRef, focusTargetRef, setIsAutoRotating, setIsTransforming, setOrbitEnabled],
  )

  useEffect(() => {
    handleModelLoadedRef.current = handleModelLoaded
  }, [handleModelLoaded])

  const additionalSceneStateKey = `${additionalModelsEnabled ? "on" : "off"}:${
    additionalModels.map((model) => model?.id).filter(Boolean).join("|")
  }`

  useEffect(() => {
    const previousKey = additionalSceneStateRef.current
    additionalSceneStateRef.current = additionalSceneStateKey

    // The Model callbacks initialize the first render. This effect is only for
    // later enable/disable/remove changes where an additional child disappears
    // and therefore cannot fire its own onModelLoaded callback.
    if (previousKey === null || previousKey === additionalSceneStateKey) return

    const frame = window.requestAnimationFrame?.(() => {
      const root = modelRootRef.current
      if (!root || root.children.length === 0) return
      handleModelLoadedRef.current?.(root)
    })

    return () => {
      if (frame !== undefined) window.cancelAnimationFrame?.(frame)
    }
  }, [additionalSceneStateKey])

  return (
    <Canvas
      shadows={stageBackgroundEnabled ? 'soft' : false}
      camera={{ position: [0, 0, 5] }}
      dpr={[1, 1.5]}
      style={canvasStyle}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
        localClippingEnabled: true,
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      onCreated={({ camera, gl }) => {
        cameraRef.current = camera
        gl.setClearColor(0x000000, 0)
        gl.toneMappingExposure = viewerSettings.exposure
      }}
      onPointerMissed={(event) => {
        if (isTransforming) return
        if (event?.button !== undefined && event.button !== 0) return
        if (Number(event?.delta || 0) > 2) return

        if (onClearSelection) {
          onClearSelection()
          return
        }

        setSelectedObject(null)
        setOutlineObjects([])
        setSelectedObjectName('')
        setOrbitEnabled(true)
      }}
    >
      <WebGLRendererLifecycle registryKey="__EDITOR_RENDERER__" />
      <ViewerProjectionCameraController
        mode={cameraProjectionMode}
        cameraRef={cameraRef}
        controlsRef={controlsRef}
        focusTargetRef={focusTargetRef}
      />
      <RenderSettingsSync viewerSettings={viewerSettings} />
      <ViewerSceneBackground
        viewerSettings={viewerSettings}
        backgroundOverrideColor={isSketchMode ? '#ffffff' : null}
      />
      <ViewerSceneGrid
        viewerSettings={viewerSettings}
        modelRootRef={modelRootRef}
        modelScene={modelScene}
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

        {transientOutlineObjects.length > 0 && (
          <Outline
            selection={transientOutlineObjects}
            selectionLayer={10}
            edgeStrength={8}
            pulseSpeed={0}
            visibleEdgeColor="yellow"
            hiddenEdgeColor="yellow"
            blur={false}
          />
        )}

        {blinkSelectionEnabled && blinkRenderGroups.length > 0
          ? blinkRenderGroups.map((group, index) => (
              <BlinkSelectionOutline
                key={group.presetId}
                selection={group.outlineObjects}
                selectionLayer={11 + (index % 20)}
                settings={getBlinkPresetById(
                  viewerSettings?.blinkPresets,
                  group.presetId,
                  viewerSettings?.blinkSettings,
                )}
              />
            ))
          : blinkSelectionEnabled && blinkOutlineObjects.length > 0 && (
              <BlinkSelectionOutline
                selection={blinkOutlineObjects}
                settings={viewerSettings?.blinkSettings}
              />
            )}
      </EffectComposer>

      <ambientLight intensity={viewerSettings.ambientLight} />

      {!isSketchMode && (
        viewerSettings?.hdriSource === "custom" && viewerSettings?.customHdri?.dataUrl ? (
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

      {modelUrl && (
        <Suspense fallback={<LoadingModel />}>
          <Bounds fit clip margin={1.2}>
            <Center>
            <group ref={modelRootRef}>
              <Model
                key={modelUrl}
                modelUrl={modelUrl}
                modelAssetId="primary"
                modelAssetName="Primary GLB"
                onAddMarker={addMarker}
                onModelLoaded={() => {
                  handleModelLoaded(modelRootRef.current)
                }}
                markerMode={markerMode}
                flowPointMode={flowPointMode}
                onAddFlowPoint={onAddFlowPoint}
                animationPivotPickMode={Boolean(animationPivotEditEnabled)}
                onAnimationPivotPick={onAnimationPivotPick}
                onSelectObject={selectObjectFromMesh}
                onDoubleClickObject={focusObjectFromMesh}
                selectedAnimations={selectedAnimations}
                animationCommand={animationCommand}
                onAnimationsLoaded={(clips) => {
                  setAnimations(clips)

                  const initial = {}

                  clips.forEach((clip) => {
                    initial[clip.name] = {
                      selected: false,
                      loop: false,
                      speed: 1,
                    }
                  })

                  setSelectedAnimations(initial)
                }}
              />

              {additionalModelsEnabled &&
                additionalModels
                  .filter((model) => model?.url)
                  .map((model) => (
                    <group
                      key={model.id}
                      name={model.name || model.fileName || "Additional GLB"}
                      userData={{
                        __vxAdditionalModelRoot: true,
                        __vxModelAssetId: model.id,
                        __vxModelAssetName: model.fileName || model.name || "",
                      }}
                    >
                      <Model
                        modelUrl={model.url}
                        modelAssetId={model.id}
                        modelAssetName={model.fileName || model.name || "Additional GLB"}
                        onAddMarker={addMarker}
                        onModelLoaded={() => {
                          handleModelLoaded(modelRootRef.current)
                        }}
                        markerMode={markerMode}
                        flowPointMode={flowPointMode}
                        onAddFlowPoint={onAddFlowPoint}
                        animationPivotPickMode={Boolean(animationPivotEditEnabled)}
                        onAnimationPivotPick={onAnimationPivotPick}
                        onSelectObject={selectObjectFromMesh}
                        onDoubleClickObject={focusObjectFromMesh}
                        selectedAnimations={{}}
                        animationCommand={null}
                      />
                    </group>
                  ))}

              {activeMarkers.map((marker) => (
                <Marker
                  key={marker.id}
                  marker={marker}
                  modelScene={modelScene}
                  chapter={activeChapter}
                  editable
                  onUpdateMarker={updateMarker}
                  onDraggingChange={(dragging) => {
                    setOrbitEnabled(!dragging);

                    if (controlsRef.current) {
                      controlsRef.current.enabled = !dragging;
                    }
                  }}
                />
              ))}

              {authoringFlow?.points?.length >= 1 && (
                <>
                  <FlowRuntimeRenderer
                    flow={authoringFlow}
                    playing={flowPreviewPlaying}
                    visible={!isFlowWaypointTransforming}
                    authoring
                    hideRuntimeWaypoints
                    speedReferenceLength={flowSpeedReferenceLength}
                    restartToken={flowPreviewToken}
                  />
                  <FlowWaypointEditor
                    flow={authoringFlow}
                    selectedPointIds={selectedFlowPointIds}
                    onSelectPoint={onSelectFlowPoint}
                    onUpdatePoints={onUpdateFlowPoints}
                    controlsRef={controlsRef}
                    onTransformingChange={
                      handleFlowWaypointTransformingChange
                    }
                  />
                </>
              )}
            </group>
            </Center>
          </Bounds>
        </Suspense>
      )}

      <CameraAnimator
        cameraRef={cameraRef}
        controlsRef={controlsRef}
        focusTargetRef={focusTargetRef}
      />

      <ModelRotator
        modelScene={modelScene}
        targetRotationY={targetRotationY}
        enabled={isAutoRotating}
        onFinish={() => setIsAutoRotating(false)}
      />

      <AssemblyGhostTarget
        object={proceduralTransformObject}
        targetTransform={proceduralAssemblyTargetTransform}
        visible={proceduralAssemblyShowGhost}
      />

      <AnimationPivotEditor
        object={animationPivotObject || animationTransformObject}
        pivot={animationPivotValue}
        enabled={Boolean(
          animationPivotEditEnabled &&
            (animationPivotObject || animationTransformObject)
        )}
        controlsRef={controlsRef}
        onTransformingChange={handleViewportTransformingChange}
        onPivotChange={onAnimationPivotChange}
      />

      {transformObject && (
        <TransformControls
          object={transformObject}
          mode={activeTransformMode}
          space="local"
          showX={transformShowX}
          showY={transformShowY}
          showZ={transformShowZ}
          onObjectChange={() => {
            if (animationTransformObject) {
              onAnimationTransformChange?.()
            }
          }}
          onMouseDown={() => {
            onTransformStart?.(transformObject)
            handleViewportTransformingChange(true)
          }}
          onMouseUp={() => {
            onTransformEnd?.(transformObject)
            handleViewportTransformingChange(false)
          }}
        />
      )}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={orbitEnabled && !isTransforming}
        enableRotate={
          orbitEnabled &&
          !isTransforming &&
          cameraProjectionMode !== "orthographic"
        }
        enableZoom={orbitEnabled && !isTransforming}
        enablePan={orbitEnabled && !isTransforming}
        zoomToCursor={cameraProjectionMode !== "orthographic"}
        minDistance={DEFAULT_ORBIT_MIN_DISTANCE}
        onStart={() => {
          if (!orbitEnabled || isTransforming) return

          focusTargetRef.current = null
          setIsAutoRotating(false)
        }}
      />
    </Canvas>
  )
}
