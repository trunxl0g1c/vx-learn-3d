import { useRef, useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import useProjectLoader from "../../core/project/useProjectLoader"
import * as THREE from "three"
import { useGlobalLoading } from "../loading/LoadingContext"

import { applyCutAway } from "../../utils/cutAwayUtils"
import PlayerSceneCanvas from "../../components/player/PlayerSceneCanvas"
import PlayerChapterInfoPanel from "../../components/player/PlayerChapterInfoPanel"
import PlayerToolsMenu from "../../components/player/PlayerToolsMenu"
import PlayerCutSlider from "../../components/player/PlayerCutSlider"
import PlayerChapterListPanel from "../../components/player/PlayerChapterListPanel"
import PlayerBottomToolbar from "../../components/player/PlayerBottomToolbar"
import { importVXPack, isVXPackFile } from "../../utils/vxpackUtils"

export default function PlayerPage() {
  const { projectId } = useParams()
  const { updateLoading, hideLoading } = useGlobalLoading()

  const {
    loadProject,
    glbFileName,
    isLoadingProject,
    loadError,
  } = useProjectLoader()


  const [material, setMaterial] = useState(null)
  const [activeChapterId, setActiveChapterId] = useState(null)
  const [modelScene, setModelScene] = useState(null)

  const [freePlay, setFreePlay] = useState(false)
  const [freePlayMenu, setFreePlayMenu] = useState(false)
  const [activeMenu, setActiveMenu] = useState(null)
  const [showInfoPanel, setShowInfoPanel] = useState(false)

  const [outlineObjects, setOutlineObjects] = useState([])
  const [selectedObject, setSelectedObject] = useState(null)
  const [originalPositions, setOriginalPositions] = useState([])
  const [originalGroupPositions, setOriginalGroupPositions] = useState([])

  const [transformMode, setTransformMode] = useState("translate")

  const [, setAnimations] = useState([])
  const [selectedAnimations, setSelectedAnimations] = useState({})
  const [animationCommand, setAnimationCommand] = useState(null)

  const [cutEnabled, setCutEnabled] = useState(false)
  const [cutAxis, setCutAxis] = useState("x")
  const [cutValue, setCutValue] = useState(0)
  const [cutMin, setCutMin] = useState(-3)
  const [cutMax, setCutMax] = useState(3)
  const cutBoundsRef = useRef(null)

  const [viewerSettings, setViewerSettings] = useState({
    exposure: 1.8,
    ambientLight: 2.5,
    mainLight: 4,
    fillLight: 2,
    hemiLight: 2,
    envIntensity: 3,
    hdri: "",
    showHdriBackground: false,
    shaderMode: "original",
    metalness: 0.3,
    roughness: 0.8,
  })

  const cameraRef = useRef(null)
  const controlsRef = useRef(null)
  const focusTargetRef = useRef(null)

  const activeChapter = material?.chapters?.find(
    (chapter) => chapter.id === activeChapterId
  )

  useEffect(() => {
    hideLoading()
  }, [hideLoading])

  useEffect(() => {
    if (!projectId || projectId === "demo") return

    let cancelled = false

    async function openProjectForPlayer() {
      try {
        updateLoading({
          title: "Opening Player",
          text: "Loading project for player...",
          progress: null,
        })

        const loaded = await loadProject(projectId)

        if (!loaded || cancelled) {
          hideLoading()
          return
        }

        const nextMaterial =
          loaded.material ||
          loaded.projectDraft?.material ||
          loaded.project?.material ||
          null

        const nextViewer =
          loaded.viewer ||
          loaded.projectDraft?.viewer ||
          loaded.project?.viewer ||
          null

        if (nextMaterial) {
          setMaterial({
            ...nextMaterial,

            modelUrl: loaded.glbUrl,
            modelFileName: loaded.glbFileName || glbFileName,

            model: {
              ...(nextMaterial.model || {}),
              uri: loaded.glbUrl,
              fileName: loaded.glbFileName || glbFileName,
            },
          })

          setActiveChapterId(nextMaterial.chapters?.[0]?.id || null)
        }

        if (nextViewer) {
          setViewerSettings((prev) => ({
            ...prev,
            ...nextViewer,
          }))
        }

        setActiveMenu("chapters")
        setFreePlay(false)
        setFreePlayMenu(false)
        setShowInfoPanel(true)
        setSelectedObject(null)
        setOutlineObjects([])
        setAnimations([])
        setSelectedAnimations({})
        setAnimationCommand(null)
      } catch (error) {
        console.error("Gagal membuka project player:", error)
      } finally {
        hideLoading()
      }
    }

    openProjectForPlayer()

    return () => {
      cancelled = true
      hideLoading()
    }
  }, [projectId, loadProject, glbFileName, updateLoading, hideLoading])

  useEffect(() => {
    applyCutAway(modelScene, cutEnabled, cutValue, cutAxis)
  }, [modelScene, cutEnabled, cutValue, cutAxis])

  useEffect(() => {
    if (!modelScene) return

    applyPlayerShaderMode(modelScene, viewerSettings)

    if (window.__PLAYER_RENDERER__) {
      window.__PLAYER_RENDERER__.toneMappingExposure =
        viewerSettings.exposure
    }

    modelScene.traverse((child) => {
      if (!child.isMesh) return

      if (child.material) {
        child.material.envMapIntensity = viewerSettings.envIntensity ?? 3
        child.material.needsUpdate = true
      }
    })
  }, [viewerSettings, modelScene])

  const loadPlayerFile = async (file) => {
    if (!file) return

    try {
      let json = null

      if (isVXPackFile(file)) {
        const { manifest } = await importVXPack(file)
        json = manifest
      } else {
        const text = await file.text()
        json = JSON.parse(text)
      }

      setMaterial(json)
      setActiveChapterId(json.chapters?.[0]?.id || null)
      setActiveMenu(null)
      setFreePlay(false)
      setFreePlayMenu(false)
      setShowInfoPanel(false)
      setSelectedObject(null)
      setOutlineObjects([])
      setAnimations([])
      setSelectedAnimations({})
      setAnimationCommand(null)

      if (json.viewerSettings) {
        setViewerSettings((prev) => ({
          ...prev,
          ...json.viewerSettings,
        }))
      }
    } catch (error) {
      console.error("Gagal membuka file player:", error)
      alert(error.message || "Gagal membuka file player")
    }
  }

  const normalizeName = (name) => {
    return (name || "")
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  const findObjectByName = (root, objectName) => {
    if (!root || !objectName) return null

    let found = null
    const targetName = normalizeName(objectName)

    root.traverse((child) => {
      if (found) return

      const childName = normalizeName(child.name)

      if (childName === targetName) {
        found = child
      }
    })

    return found
  }

  const collectMeshes = (object) => {
    const meshes = []

    object?.traverse?.((child) => {
      if (child.isMesh) meshes.push(child)
    })

    return meshes
  }

  const highlightChapterObject = (chapter, sceneOverride = null) => {
    const rootScene = sceneOverride || modelScene

    if (!rootScene || !chapter?.objectName) return

    const targetObject = findObjectByName(rootScene, chapter.objectName)

    if (!targetObject) {
      setOutlineObjects([])
      return
    }

    setSelectedObject(targetObject)
    setOutlineObjects(collectMeshes(targetObject))
  }

  const createCutBoundsFromScene = (scene) => {
    if (!scene) return null

    scene.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(scene)

    return {
      x: { min: box.min.x, max: box.max.x },
      y: { min: box.min.y, max: box.max.y },
      z: { min: box.min.z, max: box.max.z },
    }
  }

  const applyCutBoundsForAxis = (axis) => {
    const bounds = cutBoundsRef.current?.[axis]

    if (!bounds) return

    const mid = (bounds.min + bounds.max) / 2

    setCutMin(bounds.min)
    setCutMax(bounds.max)
    setCutValue(mid)
  }

  const applyPlayerShaderMode = (scene, settings) => {
    if (!scene || !settings) return

    scene.traverse((child) => {
      if (!child.isMesh || !child.material) return

      if (!child.userData.originalMaterial) {
        child.userData.originalMaterial = child.material.clone()
      }

      const original = child.userData.originalMaterial

      if (settings.shaderMode === "original") {
        child.material = original.clone()
      }

      if (settings.shaderMode === "enhanced") {
        child.material = original.clone()

        if ("envMapIntensity" in child.material) {
          child.material.envMapIntensity = settings.envIntensity ?? 3
        }

        if ("metalness" in child.material) {
          child.material.metalness =
            (original.metalness ?? 1) * (settings.metalness ?? 0.3)
        }

        if ("roughness" in child.material) {
          child.material.roughness =
            (original.roughness ?? 1) * (settings.roughness ?? 0.8)
        }
      }

      if (settings.shaderMode === "wireframe") {
        child.material = original.clone()
        child.material.wireframe = true
      }

      if (settings.shaderMode === "toon") {
        child.material = new THREE.MeshToonMaterial({
          color: original.color || new THREE.Color("#ffffff"),
        })
      }

      if (settings.shaderMode === "xray") {
        child.material = new THREE.MeshPhysicalMaterial({
          color: "#4fc3f7",
          transparent: true,
          opacity: 0.22,
          roughness: 0.2,
          metalness: 0,
          depthWrite: false,
        })
      }

      if (settings.shaderMode === "clay") {
        child.material = new THREE.MeshStandardMaterial({
          color: "#c9b8a4",
          roughness: 1,
          metalness: 0,
        })
      }

      child.material.needsUpdate = true
    })
  }

  const updateCutAxis = (axis) => {
    setCutAxis(axis)

    if (!cutBoundsRef.current && modelScene) {
      cutBoundsRef.current = createCutBoundsFromScene(modelScene)
    }

    applyCutBoundsForAxis(axis)
  }

  const handleModelLoaded = (scene, gltf = null) => {
    

    setModelScene(scene)

   
    cutBoundsRef.current = createCutBoundsFromScene(scene)
    applyCutBoundsForAxis("x")

    const positions = []
    const groupPositions = []

    scene.traverse((child) => {
      groupPositions.push({
        object: child,
        position: child.position.clone(),
        rotation: child.rotation.clone(),
      })

      if (child.isMesh) {
        child.material = child.material.clone()
        child.userData.originalMaterial = child.material

        positions.push({
          object: child,
          position: child.position.clone(),
        })

        child.material.envMapIntensity = viewerSettings.envIntensity
        child.material.needsUpdate = true
      }
    })

    setOriginalPositions(positions)
    setOriginalGroupPositions(groupPositions)

    applyPlayerShaderMode(scene, viewerSettings)

    const firstChapter = material?.chapters?.[0]

    if (firstChapter) {
      highlightChapterObject(firstChapter, scene)
    }

    if (firstChapter?.modelRotation) {
      scene.rotation.set(
        firstChapter.modelRotation[0],
        firstChapter.modelRotation[1],
        firstChapter.modelRotation[2]
      )
    }

    if (firstChapter?.cameraPosition && firstChapter?.cameraTarget) {
      focusTargetRef.current = {
        cameraPosition: new THREE.Vector3(
          firstChapter.cameraPosition[0],
          firstChapter.cameraPosition[1],
          firstChapter.cameraPosition[2]
        ),
        target: new THREE.Vector3(
          firstChapter.cameraTarget[0],
          firstChapter.cameraTarget[1],
          firstChapter.cameraTarget[2]
        ),
      }
    }

    setTimeout(() => {
      setActiveMenu("chapters")
      setShowInfoPanel(true)
    }, 300)
  }

  const handleSelectChapter = (chapterId) => {
    const chapter = material?.chapters?.find((item) => item.id === chapterId)

    if (!chapter) return

    setActiveChapterId(chapterId)
    setSelectedAnimations(getChapterAnimationConfig(chapter))
    setAnimationCommand({
      type: "stop",
      id: crypto.randomUUID(),
    })
    highlightChapterObject(chapter)

    if (chapter.modelRotation && modelScene) {
      modelScene.rotation.set(
        chapter.modelRotation[0],
        chapter.modelRotation[1],
        chapter.modelRotation[2]
      )
    }

    if (chapter.cameraPosition && chapter.cameraTarget) {
      focusTargetRef.current = {
        cameraPosition: new THREE.Vector3(
          chapter.cameraPosition[0],
          chapter.cameraPosition[1],
          chapter.cameraPosition[2]
        ),
        target: new THREE.Vector3(
          chapter.cameraTarget[0],
          chapter.cameraTarget[1],
          chapter.cameraTarget[2]
        ),
      }
    }
  }

  const handleSelectObjectFromPlayer = (object) => {
    if (!object) return

    setSelectedObject(object)
    setOutlineObjects(collectMeshes(object))

    if (!material?.chapters) return

    let current = object

    while (current) {
      const foundChapter = material.chapters.find(
        (chapter) =>
          normalizeName(chapter.objectName) === normalizeName(current.name)
      )

      if (foundChapter) {
        handleSelectChapter(foundChapter.id)
        return
      }

      current = current.parent
    }
  }

  const pullApart = () => {
    if (!modelScene) return

    modelScene.traverse((child) => {
      if (!child.isMesh) return

      const direction = child.position.clone().normalize()

      if (direction.length() === 0) {
        direction
          .set(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
          )
          .normalize()
      }

      child.userData.targetPosition = child.position
        .clone()
        .add(direction.multiplyScalar(1.2))
    })
  }

  const resetParts = () => {
    originalPositions.forEach((item) => {
      item.object.userData.targetPosition = item.position.clone()
    })
  }

  const resetMovedObjects = () => {
    originalGroupPositions.forEach((item) => {
      item.object.userData.moveTargetPosition = item.position.clone()
      item.object.userData.moveTargetRotation = item.rotation.clone()
    })
  }

  const resetModelRotationForCut = () => {
    if (!modelScene) return

    modelScene.rotation.set(0, 0, 0)
    focusTargetRef.current = null
  }

  const resetSection = () => {
    if (!modelScene) return

    if (!cutBoundsRef.current) {
      cutBoundsRef.current = createCutBoundsFromScene(modelScene)
    }

    applyCutBoundsForAxis(cutAxis)
    resetModelRotationForCut()
  }

  const toggleCutSection = () => {
    resetSection()
    setCutEnabled((prev) => !prev)
  }

  const hideSelectedObject = () => {
    if (!selectedObject) return

    selectedObject.visible = false
    selectedObject.traverse?.((child) => {
      child.visible = false
    })

    setSelectedObject(null)
    setOutlineObjects([])
  }

  const soloSelectedObject = () => {
    if (!selectedObject || !modelScene) return

    modelScene.traverse((child) => {
      if (child.isMesh) child.visible = false
    })

    selectedObject.traverse?.((child) => {
      if (child.isMesh) child.visible = true
    })

    setOutlineObjects(collectMeshes(selectedObject))
  }

  const showAllObjects = () => {
    if (!modelScene) return

    modelScene.traverse((child) => {
      child.visible = true
    })
  }

  const resetAllTransforms = () => {
    resetParts()
    resetMovedObjects()
    resetModelRotationForCut()
    showAllObjects()
    setCutEnabled(false)
  }

  const speakChapterDescription = () => {
    if (!activeChapter?.description) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(activeChapter.description)

    utterance.lang = "id-ID"
    utterance.rate = 1
    utterance.pitch = 1

    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    window.speechSynthesis.cancel()
  }

  const getChapterAnimationConfig = (chapter) => {
    const next = {}

    ;(chapter?.animations || []).forEach((animation) => {
      const name =
        typeof animation === "string"
          ? animation
          : animation?.name

      if (!name) return

      next[name] = {
        selected: true,
        loop: Boolean(animation?.loop),
      }
    })

    return next
  }

  const playChapterAnimations = () => {
    if (!activeChapter?.animations?.length) return

    const nextSelectedAnimations = getChapterAnimationConfig(activeChapter)

    setSelectedAnimations(nextSelectedAnimations)
    setAnimationCommand(null)

    setTimeout(() => {
      setAnimationCommand({
        type: "playChapter",
        animations: activeChapter.animations || [],
        id: crypto.randomUUID(),
      })
    }, 10)
  }

  const stopChapterAnimations = () => {
    setAnimationCommand({
      type: "stop",
      reset: true,
      id: crypto.randomUUID(),
    })
  }

  if (isLoadingProject) {
    return <div style={{ padding: 24 }}>Loading project...</div>
  }

  if (loadError) {
    return <div style={{ padding: 24 }}>{loadError}</div>
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        background: "#0f172a",
        color: "white",
        overflow: "hidden",
      }}
    >
      <main
        style={{
          position: "absolute",
          inset: 0,
          height: "100vh",
          background: "#0f172a",
        }}
      >
        <PlayerSceneCanvas
          material={material}
          viewerSettings={viewerSettings}
          outlineObjects={outlineObjects}
          setOutlineObjects={setOutlineObjects}
          setSelectedObject={setSelectedObject}
          cameraRef={cameraRef}
          controlsRef={controlsRef}
          focusTargetRef={focusTargetRef}
          freePlay={freePlay}
          selectedObject={selectedObject}
          transformMode={transformMode}
          activeChapter={activeChapter}
          selectedAnimations={selectedAnimations}
          animationCommand={animationCommand}
          handleSelectObjectFromPlayer={handleSelectObjectFromPlayer}
          handleModelLoaded={handleModelLoaded}
          setAnimations={setAnimations}
        />

        {!freePlay && showInfoPanel && activeChapter && (
          <PlayerChapterInfoPanel
            activeChapter={activeChapter}
            speakChapterDescription={speakChapterDescription}
            stopSpeaking={stopSpeaking}
            playChapterAnimations={playChapterAnimations}
            stopChapterAnimations={stopChapterAnimations}
          />
        )}

        {freePlay && freePlayMenu && (
          <PlayerToolsMenu
            cutEnabled={cutEnabled}
            toggleCutSection={toggleCutSection}
            hideSelectedObject={hideSelectedObject}
            pullApart={pullApart}
            resetAllTransforms={resetAllTransforms}
            soloSelectedObject={soloSelectedObject}
            showAllObjects={showAllObjects}
          />
        )}

        {freePlay && cutEnabled && (
          <PlayerCutSlider
            cutAxis={cutAxis}
            setCutAxis={updateCutAxis}
            cutValue={cutValue}
            cutMin={cutMin}
            cutMax={cutMax}
            setCutValue={setCutValue}
          />
        )}

        {!freePlay && activeMenu === "chapters" && material && (
          <PlayerChapterListPanel
            material={material}
            activeChapterId={activeChapterId}
            handleSelectChapter={handleSelectChapter}
          />
        )}

        <PlayerBottomToolbar
          loadPlayerFile={loadPlayerFile}
          freePlay={freePlay}
          setFreePlay={setFreePlay}
          setFreePlayMenu={setFreePlayMenu}
          setActiveMenu={setActiveMenu}
          setShowInfoPanel={setShowInfoPanel}
          setOutlineObjects={setOutlineObjects}
          stopChapterAnimations={stopChapterAnimations}
          setCutEnabled={setCutEnabled}
          showAllObjects={showAllObjects}
          resetAllTransforms={resetAllTransforms}
          activeChapterId={activeChapterId}
          handleSelectChapter={handleSelectChapter}
          freePlayMenu={freePlayMenu}
          activeMenu={activeMenu}
          showInfoPanel={showInfoPanel}
        />
      </main>
    </div>
  )
}