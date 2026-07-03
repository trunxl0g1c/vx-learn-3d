export default function usePlayerSpeech(activeChapter) {
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

  return {
    speakChapterDescription,
    stopSpeaking,
  }
}
