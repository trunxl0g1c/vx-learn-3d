import { Canvas, useThree } from '@react-three/fiber'
import {
  OrbitControls,
  Center,
  Bounds,
  TransformControls,
  Environment,
} from '@react-three/drei'
import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'

import Marker from '../Marker'
import Model from '../Model'
import LoadingModel from '../viewer/LoadingModel'
import CameraAnimator from '../viewer/CameraAnimator'
import ModelRotator from '../viewer/ModelRotator'
import { getViewerBackgroundStyle } from '../../utils/viewerBackground'
import CustomHdriEnvironment from './CustomHdriEnvironment'
import ViewerSceneBackground from './ViewerSceneBackground'

import { EffectComposer, Outline } from '@react-three/postprocessing'


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
  outlineObjects,
  modelUrl,
  addMarker,
  handleModelLoaded,
  markerMode,
  selectObjectFromMesh,
  selectedAnimations,
  animationCommand,
  setAnimations,
  setSelectedAnimations,
  activeMarkers,
  modelScene,
  targetRotationY,
  isAutoRotating,
  setIsAutoRotating,
  selectedObject,
  isTransforming,
  setIsTransforming,
  orbitEnabled,
  setOrbitEnabled,
  setSelectedObject,
  setOutlineObjects,
  setSelectedObjectName,
}) {
  const modelRootRef = useRef(null)
  return (
    <Canvas
      camera={{ position: [0, 0, 5] }}
      style={getViewerBackgroundStyle(viewerSettings)}
      gl={{
        alpha: true,
        preserveDrawingBuffer: true,
        localClippingEnabled: true,
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      onCreated={({ camera, gl }) => {
        cameraRef.current = camera
        gl.setClearColor(0x000000, 0)
        gl.toneMappingExposure = viewerSettings.exposure
        window.__EDITOR_RENDERER__ = gl
      }}
      onPointerMissed={() => {
        setSelectedObject(null)
        setOutlineObjects([])
        setSelectedObjectName('')
        setOrbitEnabled(true)
      }}
    >
      <RenderSettingsSync viewerSettings={viewerSettings} />
      <ViewerSceneBackground viewerSettings={viewerSettings} />

      <EffectComposer autoClear={false}>
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

      {viewerSettings?.hdriSource === "custom" && viewerSettings?.customHdri?.dataUrl ? (
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

      {modelUrl && (
        <Suspense fallback={<LoadingModel />}>
          <Bounds fit clip margin={1.2}>
            <Center>
            <group ref={modelRootRef}>
              <Model
                key={modelUrl}
                modelUrl={modelUrl}
                onAddMarker={addMarker}
                onModelLoaded={() => {
                  handleModelLoaded(modelRootRef.current)
                }}
                markerMode={markerMode}
                onSelectObject={selectObjectFromMesh}
                selectedAnimations={selectedAnimations}
                animationCommand={animationCommand}
                onAnimationsLoaded={(clips) => {
                  setAnimations(clips)

                  const initial = {}

                  clips.forEach((clip) => {
                    initial[clip.name] = {
                      selected: false,
                      loop: false,
                    }
                  })

                  setSelectedAnimations(initial)
                }}
              />

              {activeMarkers.map((marker) => (
                <Marker
                  key={marker.id}
                  marker={marker}
                />
              ))}
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

      {selectedObject && (
        <TransformControls
          object={selectedObject}
          mode="translate"
          space="world"
          onMouseDown={() => {
            setIsTransforming(true)
            setOrbitEnabled(false)
            setIsAutoRotating(false)
            focusTargetRef.current = null

            if (controlsRef.current) {
              controlsRef.current.enabled = false
            }
          }}
          onMouseUp={() => {
            setIsTransforming(false)
            setOrbitEnabled(true)

            if (controlsRef.current) {
              controlsRef.current.enabled = true
            }
          }}
        />
      )}

      <OrbitControls
        ref={controlsRef}
        enabled={orbitEnabled && !isTransforming}
        enableRotate={orbitEnabled && !isTransforming}
        onStart={() => {
          if (!orbitEnabled || isTransforming) return

          focusTargetRef.current = null
          setIsAutoRotating(false)
        }}
      />
    </Canvas>
  )
}
