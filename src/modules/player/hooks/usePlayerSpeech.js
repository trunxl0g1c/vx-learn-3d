import { useState } from "react";
import { speakText, stopSpeech } from "../../../engine/speech";

export default function usePlayerSpeech(activeChapter) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speakChapterDescription = () => {
    if (!activeChapter?.description) return false;

    return speakText(activeChapter.description, {
      language: "auto",
      defaultLanguage: "id-ID",
      rate: 1,
      pitch: 1,
      consistentVoice: true,
      onSpeakingChange: setIsSpeaking,
    });
  };

  return {
    speakChapterDescription,
    stopSpeaking: stopSpeech,
    isSpeaking,
  };
}
