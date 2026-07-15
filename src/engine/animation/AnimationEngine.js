export const ANIMATION_COMMAND_TYPES = {
  PLAY: "play",
  PLAY_CHAPTER: "playChapter",
  PAUSE: "pause",
  RESUME: "resume",
  STOP: "stop",
  SEEK: "seek",
  SET_SPEED: "setSpeed",
  UPDATE_CONFIG: "updateAnimationConfig",
}

export function normalizeAnimationName(animation) {
  if (!animation) return "Unnamed Animation"

  if (typeof animation === "string") {
    return animation || "Unnamed Animation"
  }

  return animation.name || "Unnamed Animation"
}

export function createAnimationConfig(animation, overrides = {}) {
  const name = normalizeAnimationName(animation)

  return {
    name,
    loop: Boolean(animation?.loop ?? overrides.loop),
    autoPlay: Boolean(animation?.autoPlay ?? overrides.autoPlay),
    speed: Number(animation?.speed ?? overrides.speed ?? 1),
    ...overrides,
  }
}

export function isChapterAnimationSelected(chapter, animationName) {
  if (!chapter || !animationName) return false

  return (chapter.animations || []).some(
    (item) => normalizeAnimationName(item) === animationName
  )
}

export function getChapterAnimationConfig(chapter, animationName) {
  if (!animationName) {
    return {
      name: "Unnamed Animation",
      loop: false,
      autoPlay: false,
      speed: 1,
    }
  }

  const config = (chapter?.animations || []).find(
    (item) => normalizeAnimationName(item) === animationName
  )

  return config || {
    name: animationName,
    loop: false,
    autoPlay: false,
    speed: 1,
  }
}

export function toggleChapterAnimationInMaterial(
  material,
  chapterId,
  animationName,
  checked
) {
  if (!material || !chapterId || !animationName) return material

  return {
    ...material,
    chapters: (material.chapters || []).map((chapter) => {
      if (chapter.id !== chapterId) return chapter

      const currentAnimations = chapter.animations || []

      if (!checked) {
        return {
          ...chapter,
          animations: currentAnimations.filter(
            (item) => normalizeAnimationName(item) !== animationName
          ),
        }
      }

      const exists = currentAnimations.some(
        (item) => normalizeAnimationName(item) === animationName
      )

      if (exists) return chapter

      return {
        ...chapter,
        animations: [
          ...currentAnimations,
          {
            name: animationName,
            loop: false,
            autoPlay: false,
            speed: 1,
          },
        ],
      }
    }),
  }
}

export function updateChapterAnimationFieldInMaterial(
  material,
  chapterId,
  animationName,
  field,
  value
) {
  if (!material || !chapterId || !animationName || !field) return material

  return {
    ...material,
    chapters: (material.chapters || []).map((chapter) => {
      if (chapter.id !== chapterId) return chapter

      const currentAnimations = chapter.animations || []
      const exists = currentAnimations.some(
        (item) => normalizeAnimationName(item) === animationName
      )

      const nextAnimations = exists
        ? currentAnimations.map((item) =>
            normalizeAnimationName(item) === animationName
              ? { ...item, [field]: value }
              : item
          )
        : [
            ...currentAnimations,
            {
              name: animationName,
              loop: false,
              autoPlay: false,
              speed: 1,
              [field]: value,
            },
          ]

      return {
        ...chapter,
        animations: nextAnimations,
      }
    }),
  }
}

export function createSelectedAnimationMap(availableAnimations = [], chapterAnimations = []) {
  const chapterAnimationMap = new Map(
    chapterAnimations.map((item) => [normalizeAnimationName(item), item])
  )

  return availableAnimations.reduce((result, animation) => {
    const name = normalizeAnimationName(animation)
    const config = chapterAnimationMap.get(name)

    result[name] = {
      selected: Boolean(config),
      loop: Boolean(config?.loop),
      speed: Number(config?.speed ?? 1),
    }

    return result
  }, {})
}

export function createAnimationCommand(type, payload = {}) {
  return {
    type,
    id: payload.id || crypto.randomUUID(),
    ...payload,
  }
}

export function createPlayCommand(options = {}) {
  return createAnimationCommand(options.type || ANIMATION_COMMAND_TYPES.PLAY, {
    selectedAnimations: options.selectedAnimations,
    animations: options.animations,
  })
}

export function createStopCommand(options = {}) {
  return createAnimationCommand(ANIMATION_COMMAND_TYPES.STOP, {
    reset: Boolean(options.reset),
  })
}

export function createPauseCommand(options = {}) {
  return createAnimationCommand(ANIMATION_COMMAND_TYPES.PAUSE, options)
}

export function createResumeCommand(options = {}) {
  return createAnimationCommand(ANIMATION_COMMAND_TYPES.RESUME, options)
}

export function createSeekCommand(time = 0, options = {}) {
  return createAnimationCommand(ANIMATION_COMMAND_TYPES.SEEK, {
    time,
    ...options,
  })
}

export function createSetSpeedCommand(speed = 1, options = {}) {
  return createAnimationCommand(ANIMATION_COMMAND_TYPES.SET_SPEED, {
    speed,
    ...options,
  })
}

export function createUpdateAnimationConfigCommand(
  animationName,
  config = {},
  options = {},
) {
  return createAnimationCommand(ANIMATION_COMMAND_TYPES.UPDATE_CONFIG, {
    animationName,
    config: {
      loop: Boolean(config.loop),
      speed: Number(config.speed) || 1,
    },
    ...options,
  })
}

export function createAnimationEngine() {
  let animations = []
  let selectedAnimations = {}
  let lastCommand = null
  let isPlaying = false
  let isPaused = false
  let speed = 1
  let currentTime = 0

  const setAnimations = (nextAnimations = []) => {
    animations = Array.isArray(nextAnimations) ? nextAnimations : []
    return animations
  }

  const getAnimations = () => animations

  const setSelectedAnimations = (nextSelectedAnimations = {}) => {
    selectedAnimations = nextSelectedAnimations || {}
    return selectedAnimations
  }

  const getSelectedAnimations = () => selectedAnimations

  const dispatch = (command) => {
    lastCommand = command
    return lastCommand
  }

  const play = (options = {}) => {
    isPlaying = true
    isPaused = false
    return dispatch(createPlayCommand(options))
  }

  const playChapter = (animations = [], options = {}) => {
    isPlaying = true
    isPaused = false
    return dispatch(
      createAnimationCommand(ANIMATION_COMMAND_TYPES.PLAY_CHAPTER, {
        animations,
        ...options,
      })
    )
  }

  const pause = (options = {}) => {
    isPaused = true
    return dispatch(createPauseCommand(options))
  }

  const resume = (options = {}) => {
    if (isPlaying) isPaused = false
    return dispatch(createResumeCommand(options))
  }

  const stop = (options = {}) => {
    isPlaying = false
    isPaused = false
    currentTime = 0
    return dispatch(createStopCommand(options))
  }

  const seek = (time = 0, options = {}) => {
    currentTime = Number(time) || 0
    return dispatch(createSeekCommand(currentTime, options))
  }

  const setSpeed = (nextSpeed = 1, options = {}) => {
    speed = Number(nextSpeed) || 1
    return dispatch(createSetSpeedCommand(speed, options))
  }

  const updateAnimationConfig = (animationName, config = {}, options = {}) => {
    if (!animationName) return lastCommand

    selectedAnimations = {
      ...selectedAnimations,
      [animationName]: {
        ...(selectedAnimations[animationName] || {}),
        loop: Boolean(config.loop),
        speed: Number(config.speed) || 1,
      },
    }

    return dispatch(
      createUpdateAnimationConfigCommand(animationName, config, options),
    )
  }

  const clear = () => {
    animations = []
    selectedAnimations = {}
    lastCommand = null
    isPlaying = false
    isPaused = false
    speed = 1
    currentTime = 0

    return getState()
  }

  const getState = () => ({
    animations,
    selectedAnimations,
    lastCommand,
    isPlaying,
    isPaused,
    speed,
    currentTime,
  })

  return {
    setAnimations,
    getAnimations,
    setSelectedAnimations,
    getSelectedAnimations,
    normalizeAnimationName,
    createAnimationConfig,
    isChapterAnimationSelected,
    getChapterAnimationConfig,
    toggleChapterAnimationInMaterial,
    updateChapterAnimationFieldInMaterial,
    createSelectedAnimationMap,
    createAnimationCommand,
    createPlayCommand,
    createStopCommand,
    createPauseCommand,
    createResumeCommand,
    createSeekCommand,
    createSetSpeedCommand,
    createUpdateAnimationConfigCommand,
    play,
    playChapter,
    pause,
    resume,
    stop,
    seek,
    setSpeed,
    updateAnimationConfig,
    clear,
    reset: clear,
    dispose: clear,
    getState,
  }
}

export default createAnimationEngine
