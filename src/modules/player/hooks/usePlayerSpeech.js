import { speakText, stopSpeech } from "../../../engine/speech";

export default function usePlayerSpeech(activeChapter) {
  const speakChapterDescription = () => {
    if (!activeChapter?.description) return false;

    return speakText(activeChapter.description, {
      language: "auto",
      defaultLanguage: "id-ID",
      rate: 1,
      pitch: 1,
      consistentVoice: true,
    });
  };

  return {
    speakChapterDescription,
    stopSpeaking: stopSpeech,
  };
}
