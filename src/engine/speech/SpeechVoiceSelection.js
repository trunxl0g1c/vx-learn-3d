const LANGUAGE_PREFIX = {
  "id-ID": "id",
  "en-US": "en",
};

const PROVIDERS = [
  ["microsoft", /microsoft|windows/i],
  ["google", /google/i],
  ["apple", /apple|siri/i],
  ["samsung", /samsung/i],
  ["amazon", /amazon|polly/i],
];

const FEMALE_HINTS = new Set([
  "aria", "ava", "catherine", "claire", "emma", "gadis", "hazel", "heera", "jenny",
  "joanna", "karen", "kendra", "kimberly", "lisa", "michelle", "moira", "monica",
  "natasha", "neerja", "nicole", "samantha", "sara", "serena", "susan", "tessa",
  "victoria", "zira",
]);

const MALE_HINTS = new Set([
  "adi", "andika", "ardi", "arthur", "brian", "christopher", "daniel", "david", "eric",
  "guy", "james", "joey", "justin", "liam", "mark", "matthew", "ravi", "ryan", "thomas",
]);

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function voiceNameTokens(voice) {
  return normalize(voice?.name)
    .replace(/[()\[\],._-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function detectProvider(voice) {
  const searchable = `${voice?.name || ""} ${voice?.voiceURI || ""}`;
  return PROVIDERS.find(([, pattern]) => pattern.test(searchable))?.[0] || "unknown";
}

function detectVoiceType(voice) {
  const tokens = voiceNameTokens(voice);
  if (tokens.some((token) => FEMALE_HINTS.has(token))) return "female";
  if (tokens.some((token) => MALE_HINTS.has(token))) return "male";
  return "unknown";
}

function detectQuality(voice) {
  const name = normalize(voice?.name);
  if (/natural|neural|premium|enhanced/.test(name)) return "premium";
  if (/online/.test(name)) return "online";
  return "standard";
}

function languageScore(voice, language) {
  const target = normalize(language || "id-ID");
  const prefix = LANGUAGE_PREFIX[language] || target.split("-")[0];
  const voiceLanguage = normalize(voice?.lang);

  if (voiceLanguage === target) return 120;
  if (voiceLanguage.startsWith(`${prefix}-`)) return 95;
  if (voiceLanguage === prefix) return 85;
  return -1000;
}

function baseVoiceScore(voice, language) {
  let score = languageScore(voice, language);
  if (score < 0) return score;

  const quality = detectQuality(voice);
  if (quality === "premium") score += 20;
  if (quality === "online") score += 8;
  if (voice?.default) score += 8;
  if (voice?.localService) score += 2;

  return score;
}

function pairCompatibilityScore(first, second) {
  if (!first || !second) return 0;

  let score = 0;
  const firstProvider = detectProvider(first);
  const secondProvider = detectProvider(second);
  const firstType = detectVoiceType(first);
  const secondType = detectVoiceType(second);
  const firstQuality = detectQuality(first);
  const secondQuality = detectQuality(second);

  if (firstProvider !== "unknown" && firstProvider === secondProvider) score += 50;
  if (firstQuality === secondQuality) score += 15;
  if (Boolean(first.localService) === Boolean(second.localService)) score += 4;

  if (firstType !== "unknown" && secondType !== "unknown") {
    score += firstType === secondType ? 70 : -80;
  }

  return score;
}

function voicesForLanguage(voices, language) {
  return (Array.isArray(voices) ? voices : [])
    .map((voice) => ({ voice, score: baseVoiceScore(voice, language) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score);
}

function selectBestSingleVoice(voices, language) {
  return voicesForLanguage(voices, language)[0]?.voice || null;
}

/**
 * Selects one Indonesian + one English browser voice as a stable pair.
 * Web Speech does not expose gender/timbre metadata, so this uses only
 * deterministic, non-invasive hints from the installed voice catalog.
 */
export function selectConsistentSpeechVoices(voices, languages = ["id-ID", "en-US"]) {
  const requestedLanguages = [...new Set(languages.filter(Boolean))];
  const result = {};

  if (!requestedLanguages.length) return result;
  if (requestedLanguages.length === 1) {
    result[requestedLanguages[0]] = selectBestSingleVoice(voices, requestedLanguages[0]);
    return result;
  }

  const primaryLanguage = requestedLanguages.includes("id-ID") ? "id-ID" : requestedLanguages[0];
  const secondaryLanguage = requestedLanguages.find((language) => language !== primaryLanguage);
  const primaryCandidates = voicesForLanguage(voices, primaryLanguage).slice(0, 12);
  const secondaryCandidates = voicesForLanguage(voices, secondaryLanguage).slice(0, 12);

  let bestPair = null;
  let bestScore = -Infinity;

  primaryCandidates.forEach((primary) => {
    secondaryCandidates.forEach((secondary) => {
      const score = primary.score + secondary.score + pairCompatibilityScore(primary.voice, secondary.voice);
      if (score > bestScore) {
        bestScore = score;
        bestPair = [primary.voice, secondary.voice];
      }
    });
  });

  result[primaryLanguage] = bestPair?.[0] || selectBestSingleVoice(voices, primaryLanguage);
  result[secondaryLanguage] = bestPair?.[1] || selectBestSingleVoice(voices, secondaryLanguage);

  requestedLanguages.forEach((language) => {
    if (!(language in result)) result[language] = selectBestSingleVoice(voices, language);
  });

  return result;
}

export function getSpeechVoiceDescriptor(voice) {
  if (!voice) return null;
  return {
    name: voice.name || "",
    lang: voice.lang || "",
    provider: detectProvider(voice),
    type: detectVoiceType(voice),
    quality: detectQuality(voice),
    localService: Boolean(voice.localService),
  };
}
