import { useRef, useState } from "react"
import { createId } from "../../../utils/createId"
import { normalizeChapterAnimationAssignments } from "../../../engine/chapter"

export default function usePlayerAnimation(activeChapter) {
  const [animations, setAnimations] = useState([])
  const [selectedAnimations, setSelectedAnimations] = useState({})
  const [animationCommand, setAnimationCommand] = useState(null)
  const autoPlayTokenRef = useRef(0)

  const getChapterAnimationConfig = (chapter) => {
    const next = {}

    normalizeChapterAnimationAssignments(chapter?.animations).forEach(
      (animation) => {
        if (!animation.name) return

        next[animation.name] = {
          selected: true,
          loop: Boolean(animation.loop),
          speed: Number(animation.speed) || 1,
        }
      },
    )

    return next
  }

  const resetAnimationState = () => {
    autoPlayTokenRef.current += 1
    setAnimations([])
    setSelectedAnimations({})
    setAnimationCommand(null)
  }

  const stopCurrentAnimations = () => {
    autoPlayTokenRef.current += 1
    setAnimationCommand({
      type: "stop",
      id: createId(),
    })
  }

  const prepareChapterAnimations = (chapter) => {
    const assignments = normalizeChapterAnimationAssignments(
      chapter?.animations,
    ).filter((animation) => animation.name)
    const autoPlayAnimations = assignments.filter(
      (animation) => animation.autoPlay,
    )

    setSelectedAnimations(getChapterAnimationConfig(chapter))
    stopCurrentAnimations()

    if (autoPlayAnimations.length === 0) return

    const autoPlayToken = autoPlayTokenRef.current

    setTimeout(() => {
      if (autoPlayTokenRef.current !== autoPlayToken) return

      setAnimationCommand({
        type: "playChapter",
        animations: autoPlayAnimations,
        id: createId(),
      })
    }, 10)
  }

  const playAnimationAssignments = (assignments = []) => {
    const playable = (Array.isArray(assignments) ? assignments : [])
      .filter((animation) => String(animation?.name || "").trim())
      .map((animation) => ({
        name: String(animation.name).trim(),
        loop: animation.loop === true,
        speed: Number(animation.speed) || 1,
      }))

    if (playable.length === 0) return false

    const nextSelectedAnimations = playable.reduce((result, animation) => {
      result[animation.name] = {
        selected: true,
        loop: animation.loop,
        speed: animation.speed,
      }
      return result
    }, {})

    autoPlayTokenRef.current += 1
    const playToken = autoPlayTokenRef.current
    setSelectedAnimations(nextSelectedAnimations)
    setAnimationCommand(null)

    setTimeout(() => {
      if (autoPlayTokenRef.current !== playToken) return
      setAnimationCommand({
        type: "playChapter",
        animations: playable,
        id: createId(),
      })
    }, 10)

    return true
  }

  const playChapterAnimations = () => {
    if (!activeChapter?.animations?.length) return false

    return playAnimationAssignments(
      normalizeChapterAnimationAssignments(activeChapter.animations),
    )
  }

  const stopChapterAnimations = () => {
    autoPlayTokenRef.current += 1
    setAnimationCommand({
      type: "stop",
      reset: true,
      id: createId(),
    })
  }

  return {
    animations,
    selectedAnimations,
    animationCommand,
    setAnimations,
    setSelectedAnimations,
    setAnimationCommand,
    resetAnimationState,
    stopCurrentAnimations,
    getChapterAnimationConfig,
    prepareChapterAnimations,
    playAnimationAssignments,
    playChapterAnimations,
    stopChapterAnimations,
  }
}
