export function useChapterManager({
  selectedObjectName,
  cameraRef,
  controlsRef,
  modelScene,
  material,
  setMaterial,
  materialModelUrl,
  viewerSettings,
  shaderMode,
  metalness,
  roughness,
  activeChapterId,
  setActiveChapterId,
  setRightTab,
  animations,
  setSelectedAnimations,
  setAnimationCommand,
}) {
  const activeChapter = material.chapters.find(
    (chapter) => chapter.id === activeChapterId
  )

  const activeMarkers = activeChapter?.markers || []

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
      parameters: [],
      markers: [],
      animations: [],
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
    setRightTab("chapter")
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
      const direction = cameraPos.clone().sub(cameraTarget).normalize()
      cameraPos.copy(cameraTarget.clone().add(direction.multiplyScalar(minDistance)))
    }

    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) =>
        chapter.id === activeChapterId
          ? {
              ...chapter,
              cameraPosition: [cameraPos.x, cameraPos.y, cameraPos.z],
              cameraTarget: [cameraTarget.x, cameraTarget.y, cameraTarget.z],
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

  const isChapterAnimationSelected = (chapter, animationName) => {
    return (chapter.animations || []).some((item) => item.name === animationName)
  }

  const getChapterAnimationConfig = (chapter, animationName) => {
    return (chapter.animations || []).find((item) => item.name === animationName) || {
      name: animationName,
      loop: false,
      autoPlay: false,
    }
  }

  const toggleChapterAnimation = (chapterId, animationName, checked) => {
    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) => {
        if (chapter.id !== chapterId) return chapter

        const currentAnimations = chapter.animations || []

        if (!checked) {
          return {
            ...chapter,
            animations: currentAnimations.filter((item) => item.name !== animationName),
          }
        }

        const exists = currentAnimations.some((item) => item.name === animationName)
        if (exists) return chapter

        return {
          ...chapter,
          animations: [
            ...currentAnimations,
            {
              name: animationName,
              loop: false,
              autoPlay: false,
            },
          ],
        }
      }),
    }))
  }

  const updateChapterAnimationField = (chapterId, animationName, field, value) => {
    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) => {
        if (chapter.id !== chapterId) return chapter

        const currentAnimations = chapter.animations || []
        const exists = currentAnimations.some((item) => item.name === animationName)

        const nextAnimations = exists
          ? currentAnimations.map((item) =>
              item.name === animationName
                ? {
                    ...item,
                    [field]: value,
                  }
                : item
            )
          : [
              ...currentAnimations,
              {
                name: animationName,
                loop: false,
                autoPlay: false,
                [field]: value,
              },
            ]

        return {
          ...chapter,
          animations: nextAnimations,
        }
      }),
    }))
  }

  const playAnimationPreview = (chapter) => {
    const chapterAnimations = chapter.animations || []

    if (chapterAnimations.length === 0) {
      alert("Pilih animasi untuk bab ini terlebih dahulu")
      return
    }

    const nextSelectedAnimations = {}

    animations.forEach((anim) => {
      const config = chapterAnimations.find((item) => item.name === anim.name)

      nextSelectedAnimations[anim.name] = {
        selected: Boolean(config),
        loop: config?.loop || false,
      }
    })

    setSelectedAnimations(nextSelectedAnimations)
    setAnimationCommand(null)

    setTimeout(() => {
      setAnimationCommand({
        type: "play",
        id: crypto.randomUUID(),
      })
    }, 10)
  }

  const stopAnimationPreview = () => {
    setAnimationCommand({
      type: "stop",
      id: crypto.randomUUID(),
    })
  }

  const addChapterParameter = (chapterId) => {
    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) =>
        chapter.id === chapterId
          ? {
              ...chapter,
              parameters: [
                ...(chapter.parameters || []),
                {
                  id: crypto.randomUUID(),
                  name: "",
                  value: "",
                  unit: "",
                },
              ],
            }
          : chapter
      ),
    }))
  }

  const updateChapterParameter = (chapterId, parameterId, field, value) => {
    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) =>
        chapter.id === chapterId
          ? {
              ...chapter,
              parameters: (chapter.parameters || []).map((parameter) =>
                parameter.id === parameterId
                  ? {
                      ...parameter,
                      [field]: value,
                    }
                  : parameter
              ),
            }
          : chapter
      ),
    }))
  }

  const deleteChapterParameter = (chapterId, parameterId) => {
    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) =>
        chapter.id === chapterId
          ? {
              ...chapter,
              parameters: (chapter.parameters || []).filter(
                (parameter) => parameter.id !== parameterId
              ),
            }
          : chapter
      ),
    }))
  }

  const addChapterMedia = (chapterId, type, file) => {
    if (!file) return

    const reader = new FileReader()

    reader.onload = () => {
      setMaterial((prev) => ({
        ...prev,
        chapters: prev.chapters.map((chapter) =>
          chapter.id === chapterId
            ? {
                ...chapter,
                media: [
                  ...(chapter.media || []),
                  {
                    id: crypto.randomUUID(),
                    type,
                    name: file.name,
                    mimeType: file.type,
                    data: reader.result,
                  },
                ],
              }
            : chapter
        ),
      }))
    }

    reader.readAsDataURL(file)
  }

  const deleteChapterMedia = (chapterId, mediaId) => {
    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) =>
        chapter.id === chapterId
          ? {
              ...chapter,
              media: (chapter.media || []).filter((media) => media.id !== mediaId),
            }
          : chapter
      ),
    }))
  }

  return {
    activeChapter,
    activeMarkers,
    createChapterFromSelectedObject,
    saveMaterial,
    updateChapterField,
    saveCameraViewToActiveChapter,
    deleteMarkerFromActiveChapter,
    isChapterAnimationSelected,
    getChapterAnimationConfig,
    toggleChapterAnimation,
    updateChapterAnimationField,
    playAnimationPreview,
    stopAnimationPreview,
    addChapterParameter,
    updateChapterParameter,
    deleteChapterParameter,
    addChapterMedia,
    deleteChapterMedia,
  }
}
