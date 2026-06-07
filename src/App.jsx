
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Center, Bounds , Html,  useProgress, useBounds, TransformControls} from '@react-three/drei'
import { useEffect, useRef, useState, Suspense } from 'react'
import * as THREE from 'three'

import Marker from './components/Marker'
import Sidebar from './components/Sidebar'
import Model from './components/Model'
import Toolbar from './components/Toolbar'
import { applyCutAway } from './utils/cutAwayUtils'
import { saveMarkersToFile, processLoadedMarkers} from './utils/markerUtils'
import LeftPanel from './components/LeftPanel'
import RightPanel from './components/RightPanel'

import { EffectComposer, Outline } from '@react-three/postprocessing'


function LoadingModel() {

  const { progress } = useProgress()

  return (
    <Html center>

      <div style={{
        background: 'white',
        padding: '16px 22px',
        borderRadius: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
        minWidth: 220,
        textAlign: 'center'
      }}>

        <div style={{
          marginBottom: 10,
          fontWeight: 'bold'
        }}>
          Loading 3D Object...
        </div>

        <div style={{
          width: '100%',
          height: 12,
          background: '#ddd',
          borderRadius: 999,
          overflow: 'hidden'
        }}>

         <div style={{
            width: `${progress.toFixed(0)}%`,
            height: '100%',
            background: '#4caf50'
          }} />
        </div>

        <div style={{
          marginTop: 8,
          fontSize: 13
        }}>
          {progress.toFixed(0)}%
        </div>

      </div>

    </Html>
  )
}

function ObjectItem({
  item,
  index,
  selectedObject,
  highlightObject,
  makeXrayExcept,
  focusObject
}) {
  

  return (
    <div
      onClick={() => {
          highlightObject(item.object)
          makeXrayExcept(item.object)
          focusObject(item.object)
        }}
      style={{
        padding: '6px 8px',
        borderBottom: '1px solid #eee',
        fontSize: 13,
        cursor: 'pointer',
        background:
          selectedObject === item.object
            ? '#ffe082'
            : 'white'
      }}
    >
      {item.name || `Object ${index + 1}`}
    </div>
  )
}

function CameraAnimator({ cameraRef, controlsRef, focusTargetRef }) {
  useFrame(() => {
    if (!focusTargetRef.current) return
    if (!cameraRef.current || !controlsRef.current) return

    cameraRef.current.position.lerp(
      focusTargetRef.current.cameraPosition,
      0.08
    )

    controlsRef.current.target.lerp(
      focusTargetRef.current.target,
      0.08
    )

    controlsRef.current.update()

    const distance = cameraRef.current.position.distanceTo(
      focusTargetRef.current.cameraPosition
    )

    if (distance < 0.02) {
      focusTargetRef.current = null
    }
  })

  return null
}

function ModelRotator({
  modelScene,
  targetRotationY,
  enabled,
  onFinish
}) {
  useFrame(() => {
    if (modelScene) {
      modelScene.traverse((child) => {
        if (child.userData.moveTargetPosition) {
            child.position.lerp(
              child.userData.moveTargetPosition,
              0.08
            )

            child.rotation.x +=
              (child.userData.moveTargetRotation.x - child.rotation.x) * 0.08
            child.rotation.y +=
              (child.userData.moveTargetRotation.y - child.rotation.y) * 0.08
            child.rotation.z +=
              (child.userData.moveTargetRotation.z - child.rotation.z) * 0.08

            const distance = child.position.distanceTo(
              child.userData.moveTargetPosition
            )

            if (distance < 0.01) {
              child.position.copy(child.userData.moveTargetPosition)

              delete child.userData.moveTargetPosition
              delete child.userData.moveTargetRotation
            }
          }
      })
    }

    if (!enabled || !modelScene) return

    const diff = targetRotationY - modelScene.rotation.y
    modelScene.rotation.y += diff * 0.08

    if (Math.abs(diff) < 0.01) {
      modelScene.rotation.y = targetRotationY
      onFinish?.()
    }
  })

  return null
}


export default function App() {

  const [modelScene, setModelScene] = useState(null)
  const [originalPositions, setOriginalPositions] = useState([])
  const [originalGroupPositions, setOriginalGroupPositions] = useState([])
  const [modelUrl, setModelUrl] = useState(null)
  const [availableModels, setAvailableModels] = useState([])
  const [markers, setMarkers] = useState([])
  const [objectList, setObjectList] = useState([])
  const [selectedObject, setSelectedObject] = useState(null)
  
  const [targetRotationY, setTargetRotationY] = useState(0)
  const [isAutoRotating, setIsAutoRotating] = useState(false)
  const cameraRef = useRef()
  const controlsRef = useRef()  
  const focusTargetRef = useRef(null)
  
  
  const [cutEnabled, setCutEnabled] = useState(false)
  const [cutX, setCutX] = useState(0)

  const [cutMin, setCutMin] = useState(-3)
  const [cutMax, setCutMax] = useState(3)
  const [markerMode, setMarkerMode] = useState(false)

  const [outlineObjects, setOutlineObjects] = useState([])
  const [isTransforming, setIsTransforming] = useState(false)
  const [selectedObjectName, setSelectedObjectName] = useState('')

useEffect(() => {
  applyCutAway(modelScene, cutEnabled, cutX)
}, [cutEnabled, cutX, modelScene])

useEffect(() => {
  fetch('/models/models.json')
    .then((res) => res.json())
    .then((data) => {
      setAvailableModels(data)
    })
}, [])


  const handleFile = (e) => {

    const file = e.target.files[0]

    if (!file) return

    const url = URL.createObjectURL(file)

    setModelUrl(url)
    setMarkers([])
  }

  const xrayMaterialRef = useRef(
  new THREE.MeshStandardMaterial({
    color: 0x333333,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    depthTest: true,
    metalness: 0,
    roughness: 1
  })
)

const addMarker = (marker) => {

  const fixedMarker = {
    position: [
      marker.position.x,
      marker.position.y,
      marker.position.z
    ],
    text: marker.text
    //cek upload
  }

  setMarkers((prev) => [...prev, fixedMarker])
}

const handleModelLoaded = (scene) => {

  setModelScene(scene)

  const positions = []


  const box = new THREE.Box3().setFromObject(scene)

  setCutMin(box.min.x)
  setCutMax(box.max.x)
  setCutX(box.min.x)

  const objects = scene.children.map((child, index) => ({
    name: child.name || `Group ${index + 1}`,
    object: child
  }))

  const originalGroupPositions = scene.children.map((child) => ({
    object: child,
    position: child.position.clone(),
    rotation: child.rotation.clone()
  }))

    setOriginalGroupPositions(originalGroupPositions)

  scene.traverse((child) => {
    if (child.isMesh) {
      child.material = child.material.clone()
      child.userData.originalMaterial = child.material

      positions.push({
        object: child,
        position: child.position.clone()
      })
    }
  })

  setObjectList(objects)

  setOriginalPositions(positions)
}

const pullApart = () => {
  if (!modelScene) return

  modelScene.traverse((child) => {
    if (child.isMesh) {
      const direction = child.position.clone().normalize()

      if (direction.length() === 0) {
        direction.set(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize()
      }

      child.userData.targetPosition = child.position
        .clone()
        .add(direction.multiplyScalar(1.2))
    }
  })
}

const resetParts = () => {

  originalPositions.forEach((item) => {

    item.object.userData.targetPosition =
      item.position.clone()
  })
}
  

const resetMovedObjects = () => {
  originalGroupPositions.forEach((item) => {
    item.object.userData.moveTargetPosition =
      item.position.clone()

    item.object.userData.moveTargetRotation =
      item.rotation.clone()
  })
}

 const loadMarkers = (e) => {

  const file = e.target.files[0]

  if (!file) return

  const reader = new FileReader()

  reader.onload = (event) => {

    const json = JSON.parse(event.target.result)

   const fixedMarkers =
  processLoadedMarkers(json)

    setMarkers(fixedMarkers)
  }

  reader.readAsText(file)
}
  
     const saveMarkers = () => {
  saveMarkersToFile(markers)
}

   const highlightObject = (targetObject) => {

    if (!targetObject) return

    // reset semua warna
    objectList.forEach((item) => {

      if (item.object.material) {

        item.object.material.emissive?.set(0x000000)
      }
    })

    // highlight object terpilih
    if (targetObject.material) {

      targetObject.material.emissive?.set(0xffff00)
    }

    setSelectedObject(targetObject)
  }   
   
   const focusObject = (object) => {
      if (!object || !modelScene) return

      const box = new THREE.Box3().setFromObject(object)
      const center = new THREE.Vector3()
      const size = new THREE.Vector3()

      box.getCenter(center)
      box.getSize(size)

      const maxSize = Math.max(size.x, size.y, size.z)
      const distance = maxSize * 4

      const modelBox = new THREE.Box3().setFromObject(modelScene)
      const modelCenter = new THREE.Vector3()
      modelBox.getCenter(modelCenter)

      const direction = center.clone().sub(modelCenter).normalize()

      const angle = Math.atan2(
        direction.x,
        direction.z
      )

      setTargetRotationY(modelScene.rotation.y - angle)
      setIsAutoRotating(true)

      if (direction.length() === 0) {
        direction.set(0, 0, 1)
      }

      const cameraPosition = center
        .clone()
        .add(direction.multiplyScalar(distance))

      focusTargetRef.current = {
        cameraPosition,
        target: center
      }
    }


   const makeXrayExcept = (targetObject) => {
      const selectedMeshes = []

      objectList.forEach((item) => {
        const group = item.object
        const isSelected = group === targetObject

        group.traverse((child) => {
          if (!child.isMesh) return

          if (isSelected) {
            selectedMeshes.push(child)

            child.material = child.userData.originalMaterial
            child.material.transparent = false
            child.material.opacity = 1
            child.material.depthWrite = true
            child.material.depthTest = true
            child.renderOrder = 999
          } else {
            child.material = xrayMaterialRef.current
            child.renderOrder = 0
          }
        })
      })

      setOutlineObjects(selectedMeshes)
      setSelectedObject(targetObject)
  }

   const resetXray = () => {
      objectList.forEach((item) => {
        item.object.traverse((child) => {
          if (!child.isMesh) return

          child.material = child.userData.originalMaterial
          child.renderOrder = 0

          if (child.material) {
            child.material.transparent = false
            child.material.opacity = 1
            child.material.depthWrite = true
            child.material.depthTest = true
            child.material.needsUpdate = true
          }
        })
      })

      setOutlineObjects([])
      setSelectedObject(null)
    }

   const selectObjectFromMesh = (mesh) => {
      let selectedGroup = null

      objectList.forEach((item) => {
        let current = mesh

        while (current) {
          if (current === item.object) {
            selectedGroup = item.object
            break
          }

          current = current.parent
        }
      })

      if (!selectedGroup) return

      const selectedItem = objectList.find(
        (item) => item.object === selectedGroup
      )

      setSelectedObjectName(
        selectedItem?.name || 'Unnamed Object'
      )

      const selectedMeshes = []

      selectedGroup.traverse((child) => {
        if (child.isMesh) {
          selectedMeshes.push(child)
        }
      })

      setSelectedObject(selectedGroup)
      setOutlineObjects(selectedMeshes)

      focusTargetRef.current = null
      setIsAutoRotating(false)
    }

  return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        overflow: 'hidden',
        background: '#f3f4f6'
      }}>
          

    
     
     


           <LeftPanel
              markers={markers}
              setMarkers={setMarkers}
              toolbarProps={{
                availableModels,
                setModelUrl,
                resetXray,
                handleFile,
                saveMarkers,
                loadMarkers,
                pullApart,
                resetParts,
                cutEnabled,
                setCutEnabled,
                cutMin,
                cutMax,
                cutX,
                setCutX,
                markerMode,
                setMarkerMode,
                resetMovedObjects
              }}
            />

            <div style={{
              flex: 1,
              height: '100vh',
              position: 'relative',
              background: '#f1f6fc'
            }}>

             {selectedObjectName && (
              <div style={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                background: 'rgba(17, 24, 39, 0.9)',
                color: 'white',
                padding: '10px 18px',
                borderRadius: 999,
                fontWeight: 'bold',
                fontSize: 14
              }}>
                {selectedObjectName}
              </div>
            )}
            <Canvas
          camera={{ position: [0, 0, 5] }}
          gl={{ localClippingEnabled: true }}
          onCreated={({ camera }) => {
            cameraRef.current = camera
          }}
          onPointerMissed={() => {
            setSelectedObject(null)
            setOutlineObjects([])
            setSelectedObjectName('')
          }}
        >


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





        <ambientLight intensity={0.8} />

          <directionalLight
            position={[5, 8, 5]}
            intensity={2}
          />

          <directionalLight
            position={[-5, 4, -5]}
            intensity={0.8}
          />

          <hemisphereLight
            skyColor="#ffffff"
            groundColor="#444444"
            intensity={1}
          />

          {modelUrl && (
            <Suspense fallback={<LoadingModel />}>
              <Bounds fit clip margin={1.2}>
                <Center>
                  <Model
                    modelUrl={modelUrl}
                    onAddMarker={addMarker}
                    onModelLoaded={handleModelLoaded}
                    markerMode={markerMode}
                    onSelectObject={selectObjectFromMesh}
                  />
                </Center>
              </Bounds>
            </Suspense>
          )}

        {markers.map((marker, index) => (
          <Marker
            key={index}
            marker={marker}
          />
        ))}
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
          onMouseDown={() => setIsTransforming(true)}
          onMouseUp={() => setIsTransforming(false)}
        />
      )}
      <OrbitControls
        ref={controlsRef}
        enabled={!isTransforming}
        onStart={() => {
          focusTargetRef.current = null
          setIsAutoRotating(false)
        }}
      />

      </Canvas>
      </div>

      <RightPanel
        objectList={objectList}
        selectedObject={selectedObject}
        highlightObject={highlightObject}
        makeXrayExcept={makeXrayExcept}
        focusObject={focusObject}
        markers={markers}
        setSelectedObjectName={setSelectedObjectName}
      />
    </div>
  )
}