import { useState } from "react";
import { speakText, stopSpeech } from "../../../engine/speech";
import { descriptionToSpeechText } from "../../../utils/descriptionHtml";

export default function usePlayerSpeech(activeChapter) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speakChapterDescription = () => {
    if (!activeChapter?.description) return false;

    return speakText(descriptionToSpeechText(activeChapter.description), {
      language: "auto",
      defaultLanguage: "id-ID",
      allowForceMarkup: true,
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
