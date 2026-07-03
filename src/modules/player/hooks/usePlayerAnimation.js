import { useState } from "react"

export default function usePlayerAnimation(activeChapter) {
  const [, setAnimations] = useState([])
  const [selectedAnimations, setSelectedAnimations] = useState({})
  const [animationCommand, setAnimationCommand] = useState(null)

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

  const resetAnimationState = () => {
    setAnimations([])
    setSelectedAnimations({})
    setAnimationCommand(null)
  }

  const stopCurrentAnimations = () => {
    setAnimationCommand({
      type: "stop",
      id: crypto.randomUUID(),
    })
  }

  const prepareChapterAnimations = (chapter) => {
    setSelectedAnimations(getChapterAnimationConfig(chapter))
    stopCurrentAnimations()
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

  return {
    selectedAnimations,
    animationCommand,
    setAnimations,
    setSelectedAnimations,
    setAnimationCommand,
    resetAnimationState,
    getChapterAnimationConfig,
    prepareChapterAnimations,
    playChapterAnimations,
    stopChapterAnimations,
  }
}
