import { segmentSpeechText } from "./SpeechLanguageDetection";
import { selectConsistentSpeechVoices } from "./SpeechVoiceSelection";

function getSpeechRuntime() {
  if (typeof window === "undefined") return null;

  const synth = window.speechSynthesis;
  const Utterance = window.SpeechSynthesisUtterance || globalThis.SpeechSynthesisUtterance;
  if (!synth || !Utterance) return null;

  return { synth, Utterance };
}

export function createSpeechEngine() {
  let sessionId = 0;
  let cachedVoices = [];
  let observedSynth = null;
  let voiceChangeHandler = null;

  const refreshVoices = (synth) => {
    const voices = synth?.getVoices?.() || [];
    if (voices.length) cachedVoices = voices;
    return cachedVoices;
  };

  const ensureVoiceCatalog = (synth) => {
    refreshVoices(synth);
    if (!synth || observedSynth === synth) return;

    observedSynth = synth;
    if (typeof synth.addEventListener === "function") {
      voiceChangeHandler = () => refreshVoices(synth);
      synth.addEventListener("voiceschanged", voiceChangeHandler);
    }
  };

  const stop = () => {
    sessionId += 1;
    const runtime = getSpeechRuntime();
    runtime?.synth?.cancel?.();
  };

  const dispose = () => {
    stop();

    if (
      observedSynth &&
      voiceChangeHandler &&
      typeof observedSynth.removeEventListener === "function"
    ) {
      observedSynth.removeEventListener("voiceschanged", voiceChangeHandler);
    }

    observedSynth = null;
    voiceChangeHandler = null;
    cachedVoices = [];
  };

  const initialRuntime = getSpeechRuntime();
  if (initialRuntime) ensureVoiceCatalog(initialRuntime.synth);

  const speak = (
    text,
    {
      language = "auto",
      defaultLanguage = "id-ID",
      rate = 1,
      pitch = 1,
      volume = 1,
      consistentVoice = true,
    } = {},
  ) => {
    const runtime = getSpeechRuntime();
    const normalizedText = String(text || "").trim();
    if (!runtime || !normalizedText) return false;

    ensureVoiceCatalog(runtime.synth);
    stop();
    const currentSessionId = sessionId;
    const segments = language === "auto"
      ? segmentSpeechText(normalizedText, { defaultLanguage })
      : [{ text: normalizedText, lang: language }];

    if (!segments.length) return false;

    const voices = refreshVoices(runtime.synth);
    const segmentLanguages = segments.map((segment) => segment.lang);
    const selectedVoices = consistentVoice
      ? selectConsistentSpeechVoices(voices, segmentLanguages)
      : {};

    segments.forEach((segment) => {
      if (currentSessionId !== sessionId) return;

      const utterance = new runtime.Utterance(segment.text);
      utterance.lang = segment.lang;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      const voice = selectedVoices[segment.lang] || null;
      if (voice) utterance.voice = voice;

      runtime.synth.speak(utterance);
    });

    return true;
  };

  return {
    speak,
    stop,
    dispose,
    isSupported() {
      return Boolean(getSpeechRuntime());
    },
    segmentText(text, options = {}) {
      return segmentSpeechText(text, options);
    },
  };
}

const defaultSpeechEngine = createSpeechEngine();

export function speakText(text, options = {}) {
  return defaultSpeechEngine.speak(text, options);
}

export function stopSpeech() {
  defaultSpeechEngine.stop();
}

export function isSpeechSupported() {
  return defaultSpeechEngine.isSupported();
}

export default createSpeechEngine;
