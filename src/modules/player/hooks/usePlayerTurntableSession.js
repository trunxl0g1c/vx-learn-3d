import { useCallback, useEffect, useRef, useState } from "react"

const TURN_TABLE_STOP_EVENTS = ["pointerdown", "keydown"]

/**
 * Keeps the Player's intro turntable active only until the first user input.
 * Reset All may explicitly arm the intro presentation again.
 */
export default function usePlayerTurntableSession({
  enabled = true,
  sessionKey = "",
} = {}) {
  const [sessionActive, setSessionActive] = useState(Boolean(enabled))
  const previousSessionKeyRef = useRef("")

  useEffect(() => {
    if (!sessionKey || previousSessionKeyRef.current === sessionKey) return

    previousSessionKeyRef.current = sessionKey
    setSessionActive(Boolean(enabled))
  }, [enabled, sessionKey])

  useEffect(() => {
    if (!sessionActive) return undefined

    const stopTurntable = () => {
      setSessionActive(false)
    }

    TURN_TABLE_STOP_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, stopTurntable, true)
    })
    window.addEventListener("wheel", stopTurntable, {
      capture: true,
      passive: true,
    })

    return () => {
      TURN_TABLE_STOP_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, stopTurntable, true)
      })
      window.removeEventListener("wheel", stopTurntable, true)
    }
  }, [sessionActive])

  const restartTurntable = useCallback(() => {
    setSessionActive(Boolean(enabled))
  }, [enabled])

  return {
    turntableSessionActive: Boolean(enabled && sessionActive),
    restartTurntable,
  }
}
