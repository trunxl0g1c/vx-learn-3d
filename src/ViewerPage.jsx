
import { Canvas, useFrame } from '@react-three/fiber'
import {
  OrbitControls,
  Center,
  Bounds,
  Html,
  useProgress,
  TransformControls,
  Environment,
} from '@react-three/drei'
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


export default function ViewerPage() {

  const [modelScene, setModelScene] = useState(null)
  const [originalPositions, setOriginalPositions] = useState([])
  const [originalGroupPositions, setOriginalGroupPositions] = useState([])
  const [modelUrl, setModelUrl] = useState(null)
  const [materialModelUrl, setMaterialModelUrl] = useState("")
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
  const [orbitEnabled, setOrbitEnabled] = useState(true)
  
  const [selectedObjectName, setSelectedObjectName] = useState('')
  const [material, setMaterial] = useState({
    id: crypto.randomUUID(),
    title: "Materi 3D Baru",
    modelUrl: "",
    chapters: [],
    })

  const [activeChapterId, setActiveChapterId] = useState(null)

  const [treeDepth, setTreeDepth] = useState(2)
  const [animations, setAnimations] = useState([])
  const [selectedAnimations, setSelectedAnimations] = useState({})
  const [animationCommand, setAnimationCommand] = useState(null)
  const [viewerSettings, setViewerSettings] = useState({
    exposure: 1.8,

    ambientLight: 2.5,
    mainLight: 4,
    fillLight: 2,
    hemiLight: 2,
    envIntensity: 3,

    shaderMode: "original",
    metalness: 0.3,
    roughness: 0.8,
  })
  const [shaderMode, setShaderMode] = useState("original")
  const [metalness, setMetalness] = useState(0.3)
  const [roughness, setRoughness] = useState(0.8)
  const [markerScale, setMarkerScale] = useState(0.08)

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

    useEffect(() => {
      if (shaderMode === "pbr") {
        applyShaderMode("pbr")
      }
    }, [metalness, roughness])

  const handleFile = (e) => {
    const file = e.target.files[0]

    if (!file) return

    const url = URL.createObjectURL(file)

    setModelUrl(url)
    setMaterialModelUrl(`/models/${file.name}`)
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
  if (!activeChapterId) {
    alert("Pilih atau buat Bab dulu sebelum menambahkan marker")
    return
  }

  const fixedMarker = {
    id: crypto.randomUUID(),
    position: Array.isArray(marker.position)
  ? marker.position
  : [
      marker.position.x,
      marker.position.y,
      marker.position.z,
    ],
    text: marker.text,
  }

  setMaterial((prev) => ({
    ...prev,
    chapters: prev.chapters.map((chapter) =>
      chapter.id === activeChapterId
        ? {
            ...chapter,
            markers: [
              ...(chapter.markers || []),
              fixedMarker,
            ],
          }
        : chapter
    ),
  }))
}

const handleModelLoaded = (scene) => {

  setModelScene(scene)


  scene.traverse((child) => {
    if (!child.isMesh) return

    if (child.material) {
      child.material.envMapIntensity = viewerSettings.envIntensity
      child.material.needsUpdate = true
    }
  })

  const positions = []


  const box = new THREE.Box3().setFromObject(scene)
  const size = new THREE.Vector3()
    box.getSize(size)

    const maxSize = Math.max(size.x, size.y, size.z)

    // 1.5% dari ukuran model
    const calculatedMarkerScale = maxSize * 0.015

    setMarkerScale(
      Math.min(
        Math.max(calculatedMarkerScale, 0.03),
        0.15
      )
    )

 setCutMin(box.min.x)
setCutMax(box.max.x)

// posisi awal cutaway di tengah model
setCutX((box.min.x + box.max.x) / 2)

 const buildObjectTree = (object, level = 0) => {
  return {
    name: object.name || object.type || "Unnamed Object",
    object,
    level,
    children: object.children
      .filter((child) => child.type !== "Bone")
      .map((child) => buildObjectTree(child, level + 1)),
  }
}

const objects = scene.children
  .filter((child) => child.type !== "Bone")
  .map((child) => buildObjectTree(child, 0))

  const originalGroupPositions = []

    scene.traverse((child) => {
      originalGroupPositions.push({
        object: child,
        position: child.position.clone(),
        rotation: child.rotation.clone(),
      })
    })

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

const flattenObjectTree = (items) => {
  const result = []

  const walk = (nodes) => {
    nodes.forEach((node) => {
      result.push({
        name: node.name,
        object: node.object,
      })

      if (node.children?.length) {
        walk(node.children)
      }
    })
  }

  walk(items)

  return result
}

   const highlightObject = (targetObject) => {
      if (!targetObject) return

      // reset material semua object
      modelScene?.traverse((child) => {
        if (!child.isMesh || !child.material) return

        if (child.userData.originalMaterial) {
          child.material = child.userData.originalMaterial
        }

        child.material.emissive?.set(0x000000)
        child.material.needsUpdate = true
      })

      const selectedMeshes = []

      targetObject.traverse((child) => {
        if (child.isMesh) {
          selectedMeshes.push(child)
        }
      })

      setOutlineObjects(selectedMeshes)
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


    const isChildOf = (child, parent) => {
      let current = child

      while (current) {
        if (current === parent) return true
        current = current.parent
      }

      return false
    }

  const makeXrayExcept = (targetObject) => {
      if (!targetObject || !modelScene) return

      const selectedMeshes = []

      modelScene.traverse((child) => {
        if (!child.isMesh) return

        const isSelected =
          child === targetObject ||
          child.parent === targetObject ||
          targetObject.children.includes(child) ||
          isChildOf(child, targetObject)

        if (isSelected) {
          selectedMeshes.push(child)

          child.material = child.userData.originalMaterial || child.material
          child.material.transparent = false
          child.material.opacity = 1
          child.material.depthWrite = true
          child.material.depthTest = true
          child.renderOrder = 999
          child.material.emissive?.set(0x000000)
        } else {
          child.material = xrayMaterialRef.current
          child.renderOrder = 0
        }

        child.material.needsUpdate = true
      })

      setOutlineObjects(selectedMeshes)
      setSelectedObject(targetObject)
    }


   const applyShaderMode = (mode) => {
      if (!modelScene) return

      setShaderMode(mode)

      modelScene.traverse((child) => {
        if (!child.isMesh) return

        const original = child.userData.originalMaterial

        if (!original) return

        if (mode === "original") {
          child.material = original.clone()
        }

        if (mode === "wireframe") {
          child.material = original.clone()
          child.material.wireframe = true
        }

        if (mode === "toon") {
          child.material = new THREE.MeshToonMaterial({
            color: original.color || new THREE.Color("#ffffff"),
          })
        }

        if (mode === "xray") {
          child.material = new THREE.MeshPhysicalMaterial({
            color: "#4fc3f7",
            transparent: true,
            opacity: 0.22,
            roughness: 0.2,
            metalness: 0,
            depthWrite: false,
          })
        }

        if (mode === "clay") {
          child.material = new THREE.MeshStandardMaterial({
            color: "#c9b8a4",
            roughness: 1,
            metalness: 0,
          })
        }

        if (mode === "pbr") {
          child.material = original.clone()

          if ("metalness" in child.material) {
            child.material.metalness = metalness
          }

          if ("roughness" in child.material) {
            child.material.roughness = roughness
          }
        }

        child.material.needsUpdate = true
      })
    } 
   const resetXray = () => {
      flattenObjectTree(objectList).forEach((item) => {
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

      flattenObjectTree(objectList).forEach((item) => {
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

      const selectedItem = flattenObjectTree(objectList).find(
        (item) => item.object === selectedGroup
      )

      setSelectedObjectName(
        (selectedItem?.name || "Unnamed Object").replaceAll("_", " ")
      )

      const selectedMeshes = []

      selectedGroup.traverse((child) => {
        if (child.isMesh) {
          selectedMeshes.push(child)
        }
      })

      setSelectedObject(selectedGroup)
      setOutlineObjects(selectedMeshes)

      setOrbitEnabled(true)
      focusTargetRef.current = null
      setIsAutoRotating(false)
    }

    const createChapterFromSelectedObject = () => {
        if (!selectedObjectName) {
            alert("Pilih object 3D dulu")
            return
        }

       const newChapter = {
        
        id: crypto.randomUUID(),

        title: selectedObjectName,
        objectName: selectedObjectName,


        description: "",
        markers: [],
        cameraPosition: cameraRef.current
            ? [
                cameraRef.current.position.x,
                cameraRef.current.position.y,
                cameraRef.current.position.z,
            ]
            : [0, 0, 5],

        cameraTarget: controlsRef.current
            ? [
                controlsRef.current.target.x,
                controlsRef.current.target.y,
                controlsRef.current.target.z,
            ]
            : [0, 0, 0],

        modelRotation: modelScene
        ? [
            modelScene.rotation.x,
            modelScene.rotation.y,
            modelScene.rotation.z,
          ]
        : [0, 0, 0],

        callouts: [],
        }

        setMaterial((prev) => ({
            ...prev,
            chapters: [...prev.chapters, newChapter],
        }))

        setActiveChapterId(newChapter.id)
        }

        const updateChapterDescription = (chapterId, description) => {
            setMaterial((prev) => ({
                ...prev,
                chapters: prev.chapters.map((chapter) =>
                chapter.id === chapterId
                    ? { ...chapter, description }
                    : chapter
                ),
            }))
            }
        const saveMaterial = () => {
        const data = {
          ...material,
          modelUrl: materialModelUrl,
          viewerSettings: {
            ...viewerSettings,
            shaderMode,
            metalness,
            roughness,
          },
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
        })

        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")

        a.href = url
        a.download = `${material.title || "materi-3d"}.json`
        a.click()

        URL.revokeObjectURL(url)
        }


        const selectModelFromPublic = (modelPath) => {
        setModelUrl(modelPath)  
        setMaterialModelUrl(modelPath)
        setMarkers([])
        }

        const updateChapterField = (chapterId, field, value) => {
        setMaterial((prev) => ({
            ...prev,
            chapters: prev.chapters.map((chapter) =>
            chapter.id === chapterId
                ? {
                    ...chapter,
                    [field]: value,
                }
                : chapter
            ),
        }))
        }

        const resetModelRotationForCut = () => {
          if (!modelScene) return

          modelScene.rotation.set(0, 0, 0)
          setTargetRotationY(0)
          setIsAutoRotating(false)
          focusTargetRef.current = null
        }
        const getMaxTreeDepth = (nodes) => {
          let maxDepth = 0

          const walk = (items, depth) => {
            maxDepth = Math.max(maxDepth, depth)

            items.forEach((item) => {
              if (item.children?.length) {
                walk(item.children, depth + 1)
              }
            })
          }

          walk(nodes, 1)

          return maxDepth
        }
        const maxTreeDepth = getMaxTreeDepth(objectList)


        const saveCameraViewToActiveChapter = () => {
          if (!activeChapterId) {
            alert("Pilih Bab terlebih dahulu")
            return
          }

          if (!cameraRef.current || !controlsRef.current) {
            alert("Camera belum siap")
            return
          }

        const cameraPos = cameraRef.current.position.clone()
        const cameraTarget = controlsRef.current.target.clone()

        const minDistance = 2.5
        const currentDistance = cameraPos.distanceTo(cameraTarget)

        if (currentDistance < minDistance) {
          const direction = cameraPos
            .clone()
            .sub(cameraTarget)
            .normalize()

          cameraPos.copy(
            cameraTarget.clone().add(direction.multiplyScalar(minDistance))
          )
        }
          setMaterial((prev) => ({
            ...prev,
            chapters: prev.chapters.map((chapter) =>
              chapter.id === activeChapterId
                ? {
                    ...chapter,
                    cameraPosition: [
                      cameraPos.x,
                      cameraPos.y,
                      cameraPos.z,
                    ],
                    cameraTarget: [
                      cameraTarget.x,
                      cameraTarget.y,
                      cameraTarget.z,
                    ],
                    modelRotation: modelScene
                    ? [
                        modelScene.rotation.x,
                        modelScene.rotation.y,
                        modelScene.rotation.z,
                      ]
                    : [0, 0, 0],
                  }
                : chapter
            ),
          }))

          alert("Camera view berhasil disimpan ke Bab aktif")
        }
        

        const soloSelectedObject = () => {
          if (!selectedObject || !modelScene) {
            alert("Pilih object dulu")
            return
          }

          modelScene.traverse((child) => {
            if (!child.isMesh) return

            child.visible = false
          })

          selectedObject.traverse((child) => {
            if (!child.isMesh) return

            child.visible = true
          })
        }

        const showAllObjects = () => {
          if (!modelScene) return

          modelScene.traverse((child) => {
            child.visible = true
          })
        }


  const activeChapter = material.chapters.find(
    (chapter) => chapter.id === activeChapterId
  )

  const activeMarkers = activeChapter?.markers || []


  const deleteMarkerFromActiveChapter = (markerId) => {
  if (!activeChapterId) return

  setMaterial((prev) => ({
    ...prev,
    chapters: prev.chapters.map((chapter) =>
      chapter.id === activeChapterId
        ? {
            ...chapter,
            markers: (chapter.markers || []).filter(
              (marker) => marker.id !== markerId
            ),
          }
        : chapter
    ),
  }))
}


  const updateEnvIntensity = (value) => {
    setViewerSettings((prev) => ({
      ...prev,
      envIntensity: value,
    }))

    if (!modelScene) return

    modelScene.traverse((child) => {
      if (!child.isMesh) return

      if (child.material) {
        child.material.envMapIntensity = value
        child.material.needsUpdate = true
      }
    })
  }


  return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        overflow: 'hidden',
        background: '#f3f4f6'
      }}>
          
      <div
            style={{
                width: 300,
                height: "100vh",
                background: "#111827",
                color: "white",
                padding: 16,
                overflowY: "auto",
                borderRight: "1px solid #374151",
            }}
            >
            <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>
                Material Editor
            </h2>

            <input
                value={material.title}
                onChange={(e) =>
                setMaterial((prev) => ({
                    ...prev,
                    title: e.target.value,
                }))
                }
                placeholder="Judul materi"
                style={{
                width: "100%",
                padding: 8,
                marginBottom: 12,
                borderRadius: 6,
                border: "1px solid #4b5563",
                background: "#1f2937",
                color: "white",
                }}
            />

            <div
                style={{
                background: "#1f2937",
                padding: 10,
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 13,
                }}
            >
                Object dipilih:
                <br />
                <strong>{selectedObjectName || "-"}</strong>
            </div>

            <button
                onClick={createChapterFromSelectedObject}
                style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "none",
                background: "#2563eb",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
                marginBottom: 8,
                }}
            >
                Buat Bab dari Object
            </button>

            <button
              onClick={saveCameraViewToActiveChapter}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "none",
                background: "#7c3aed",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
                marginBottom: 8,
              }}
            >
              Save Camera View
            </button>

            <button
                onClick={saveMaterial}
                style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "none",
                background: "#059669",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
                marginBottom: 16,
                }}
            >
                Save Material JSON
            </button>

            <div
              style={{
                background: "#1f2937",
                padding: 10,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: 8,
                  fontSize: 14,
                }}
              >
                Visual Shader
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                {[
                  ["original", "Original"],
                  ["pbr", "PBR"],
                  ["toon", "Toon"],
                  ["wireframe", "Wire"],
                  ["xray", "X-Ray"],
                  ["clay", "Clay"],
                ].map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => applyShaderMode(mode)}
                    style={{
                      padding: 8,
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      background:
                        shaderMode === mode ? "#2563eb" : "#374151",
                      color: "white",
                      fontWeight: "bold",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: 12, marginBottom: 6 }}>
                Metalness: {metalness}
              </div>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={metalness}
                onChange={(e) => setMetalness(Number(e.target.value))}
                style={{ width: "100%", marginBottom: 10 }}
              />

              <div style={{ fontSize: 12, marginBottom: 6 }}>
                Roughness: {roughness}
              </div>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={roughness}
                onChange={(e) => setRoughness(Number(e.target.value))}
                style={{ width: "100%" }}
              />

              <div style={{ marginTop: 12, fontWeight: "bold", fontSize: 13 }}>
                Lighting
              </div>

              <div style={{ fontSize: 12, marginTop: 8 }}>
                Exposure: {viewerSettings.exposure}
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={viewerSettings.exposure}
                onChange={(e) => {
                  const value = Number(e.target.value)

                  setViewerSettings((prev) => ({
                    ...prev,
                    exposure: value,
                  }))

                  if (window.__EDITOR_RENDERER__) {
                    window.__EDITOR_RENDERER__.toneMappingExposure = value
                  }
                }}
                style={{ width: "100%" }}
              />

              <div style={{ fontSize: 12, marginTop: 8 }}>
                Ambient Light: {viewerSettings.ambientLight}
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={viewerSettings.ambientLight}
                onChange={(e) =>
                  setViewerSettings((prev) => ({
                    ...prev,
                    ambientLight: Number(e.target.value),
                  }))
                }
                style={{ width: "100%" }}
              />

              <div style={{ fontSize: 12, marginTop: 8 }}>
                Main Light: {viewerSettings.mainLight}
              </div>
              <input
                type="range"
                min="0"
                max="8"
                step="0.1"
                value={viewerSettings.mainLight}
                onChange={(e) =>
                  setViewerSettings((prev) => ({
                    ...prev,
                    mainLight: Number(e.target.value),
                  }))
                }
                style={{ width: "100%" }}
              />

              <div style={{ fontSize: 12, marginTop: 8 }}>
                Fill Light: {viewerSettings.fillLight}
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={viewerSettings.fillLight}
                onChange={(e) =>
                  setViewerSettings((prev) => ({
                    ...prev,
                    fillLight: Number(e.target.value),
                  }))
                }
                style={{ width: "100%" }}
              />

              <div style={{ fontSize: 12, marginTop: 8 }}>
                Hemisphere Light: {viewerSettings.hemiLight}
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={viewerSettings.hemiLight}
                onChange={(e) =>
                  setViewerSettings((prev) => ({
                    ...prev,
                    hemiLight: Number(e.target.value),
                  }))
                }
                style={{ width: "100%" }}
              />
              <div style={{ fontSize: 12, marginTop: 8 }}>
                Environment Intensity: {viewerSettings.envIntensity}
              </div>

              <input
                type="range"
                min="0"
                max="8"
                step="0.1"
                value={viewerSettings.envIntensity}
                onChange={(e) =>
                  updateEnvIntensity(Number(e.target.value))
                }
                style={{ width: "100%" }}
              />

            </div>
            

                <div
                    style={{
                      background: "#1f2937",
                      padding: 10,
                      borderRadius: 8,
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "bold",
                        marginBottom: 8,
                        fontSize: 14,
                      }}
                    >
                      Animasi Advance
                    </div>

                    {animations.length === 0 ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#9ca3af",
                        }}
                      >
                        Tidak ada animasi pada model ini
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                          <button
                            onClick={() => {
                              const next = {}

                              animations.forEach((anim) => {
                                next[anim.name] = {
                                  ...(selectedAnimations[anim.name] || {}),
                                  selected: true,
                                }
                              })

                              setSelectedAnimations(next)
                            }}
                            style={{
                              flex: 1,
                              padding: 8,
                              borderRadius: 6,
                              border: "none",
                              background: "#374151",
                              color: "white",
                              cursor: "pointer",
                            }}
                          >
                            Select All
                          </button>

                          <button
                            onClick={() => {
                              const next = {}

                              animations.forEach((anim) => {
                                next[anim.name] = {
                                  ...(selectedAnimations[anim.name] || {}),
                                  selected: false,
                                }
                              })

                              setSelectedAnimations(next)
                            }}
                            style={{
                              flex: 1,
                              padding: 8,
                              borderRadius: 6,
                              border: "none",
                              background: "#374151",
                              color: "white",
                              cursor: "pointer",
                            }}
                          >
                            Clear
                          </button>
                        </div>

                        <div
                          style={{
                            maxHeight: 180,
                            overflowY: "auto",
                            border: "1px solid #374151",
                            borderRadius: 8,
                            marginBottom: 8,
                          }}
                        >
                          {animations.map((anim) => {
                            const config = selectedAnimations[anim.name] || {
                              selected: false,
                              loop: false,
                            }

                            return (
                              <div
                                key={anim.name}
                                style={{
                                  padding: 8,
                                  borderBottom: "1px solid #374151",
                                  display: "grid",
                                  gridTemplateColumns: "24px 1fr 60px",
                                  gap: 8,
                                  alignItems: "center",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={config.selected}
                                  onChange={(e) => {
                                    setSelectedAnimations((prev) => ({
                                      ...prev,
                                      [anim.name]: {
                                        ...(prev[anim.name] || {}),
                                        selected: e.target.checked,
                                      },
                                    }))
                                  }}
                                />

                                <div>
                                  <div style={{ fontSize: 13, fontWeight: "bold" }}>
                                    {anim.name}
                                  </div>
                                  <div style={{ fontSize: 11, color: "#9ca3af" }}>
                                    {anim.duration?.toFixed?.(2) || 0}s
                                  </div>
                                </div>

                                <label
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontSize: 11,
                                    color: "#d1d5db",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={config.loop}
                                    onChange={(e) => {
                                      setSelectedAnimations((prev) => ({
                                        ...prev,
                                        [anim.name]: {
                                          ...(prev[anim.name] || {}),
                                          loop: e.target.checked,
                                        },
                                      }))
                                    }}
                                  />
                                  Loop
                                </label>
                              </div>
                            )
                          })}
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => {
                              setAnimationCommand(null)

                              setTimeout(() => {
                                setAnimationCommand({
                                  type: "play",
                                  id: crypto.randomUUID(),
                                })
                              }, 10)
                            }}
                            style={{
                              flex: 1,
                              padding: 8,
                              borderRadius: 6,
                              border: "none",
                              background: "#2563eb",
                              color: "white",
                              cursor: "pointer",
                            }}
                          >
                            Play Selected
                          </button>

                          <button
                            onClick={() => {
                              setAnimationCommand({
                                type: "stop",
                                id: crypto.randomUUID(),
                              })
                            }}
                            style={{
                              flex: 1,
                              padding: 8,
                              borderRadius: 6,
                              border: "none",
                              background: "#dc2626",
                              color: "white",
                              cursor: "pointer",
                            }}
                          >
                            Stop
                          </button>
                        </div>
                      </>
                    )}
                  </div>

            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Daftar Bab</h3>

            {material.chapters.map((chapter, index) => (
                <div
                key={chapter.id}
                onClick={() => setActiveChapterId(chapter.id)}
                style={{
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 10,
                    background:
                    activeChapterId === chapter.id ? "#2563eb" : "#1f2937",
                    cursor: "pointer",
                }}
                >
                <div style={{ fontWeight: "bold", marginBottom: 4 }}>
                    Bab {index + 1}: {chapter.title}
                </div>

                <div style={{ fontSize: 12, color: "#d1d5db", marginBottom: 6 }}>
                    Object: {chapter.objectName}
                </div>

                {
                    activeChapterId === chapter.id && (
                    <>
                        <textarea
                        value={chapter.description}
                        onChange={(e) =>
                            updateChapterField(
                            chapter.id,
                            "description",
                            e.target.value
                            )
                        }
                        placeholder="Isi deskripsi materi..."
                        style={{
                            width: "100%",
                            minHeight: 80,
                            padding: 8,
                            borderRadius: 6,
                            border: "1px solid #4b5563",
                            background: "#111827",
                            color: "white",
                        }}
                        />
                        <div style={{ marginTop: 10 }}>
                              <strong>Marker Bab Ini</strong>

                              {(chapter.markers || []).map((marker) => (
                                <div
                                  key={marker.id}
                                  style={{
                                    marginTop: 8,
                                    padding: 8,
                                    borderRadius: 6,
                                    background: "#111827",
                                  }}
                                >
                                  <div style={{ fontSize: 13, marginBottom: 6 }}>
                                    {marker.text}
                                  </div>

                                  <button
                                    onClick={() => deleteMarkerFromActiveChapter(marker.id)}
                                    style={{
                                      padding: "6px 8px",
                                      borderRadius: 6,
                                      border: "none",
                                      background: "#dc2626",
                                      color: "white",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Hapus Marker
                                  </button>
                                </div>
                              ))}
                            </div>
                      
                    </>
                    )
                }
                </div>
            ))}
            </div>
    
     
     


           <LeftPanel
              markers={markers}
              setMarkers={setMarkers}
              toolbarProps={{
                availableModels,
                setModelUrl: selectModelFromPublic,
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
                resetMovedObjects,
                resetModelRotationForCut,
                soloSelectedObject,
                showAllObjects,
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
          onCreated={({ camera, gl }) => {
            cameraRef.current = camera
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
        <Environment preset="studio" />
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
                  <Model
                    modelUrl={modelUrl}
                    onAddMarker={addMarker}
                    onModelLoaded={handleModelLoaded}
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
      </div>

      <RightPanel
        objectList={objectList}
        selectedObject={selectedObject}
        highlightObject={highlightObject}
        makeXrayExcept={makeXrayExcept}
        focusObject={focusObject}
        markers={markers}
        setSelectedObjectName={setSelectedObjectName}

        treeDepth={treeDepth}
        setTreeDepth={setTreeDepth}
        maxTreeDepth={maxTreeDepth}
      />
    </div>
  )
}