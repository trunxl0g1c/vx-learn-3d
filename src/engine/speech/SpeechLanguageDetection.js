const INDONESIAN_WORDS = new Set([
  "ada", "adalah", "agar", "akan", "akhir", "anda", "atau", "bagian", "baik", "bawah",
  "bekerja", "belum", "berikut", "bisa", "buka", "cara", "cek", "dalam", "dan", "dari",
  "dengan", "di", "dipilih", "gunakan", "harus", "hingga", "ini", "itu", "jangan", "jika",
  "juga", "kembali", "kemudian", "ke", "ketika", "klik", "lanjut", "lalu", "lebih", "masih",
  "melanjutkan", "memastikan", "memilih", "membuka", "menekan", "menu", "merupakan", "pada",
  "pastikan", "periksa", "pilih", "posisi", "saat", "sampai", "sebelum", "setelah", "silakan",
  "sudah", "supaya", "tekan", "terdapat", "tidak", "untuk", "yang", "kebocoran", "apakah",
  "objek", "materi", "langkah", "selesai", "berada", "sesuai", "dapat", "terlebih", "dahulu",
]);

const ENGLISH_WORDS = new Set([
  "a", "about", "above", "after", "again", "all", "also", "an", "and", "any", "are", "as",
  "at", "back", "be", "before", "below", "between", "button", "by", "can", "check", "click",
  "close", "continue", "do", "down", "each", "ensure", "for", "from", "go", "has", "have",
  "if", "in", "into", "is", "it", "make", "next", "no", "not", "of", "off", "on", "open",
  "or", "previous", "press", "remove", "select", "should", "step", "sure", "the", "then", "there",
  "this", "to", "up", "use", "using", "with", "without", "you", "your", "leak", "leakage",
  "component", "compartment", "system", "control", "panel", "view", "player", "editor", "camera",
]);

const TECHNICAL_ENGLISH_WORDS = new Set([
  "actuator", "assembly", "bearing", "blade", "boom", "bracket", "bucket", "cable", "caliper",
  "chassis", "circuit", "compressor", "connector", "coolant", "coupling", "cylinder", "dashboard",
  "disassembly", "engine", "filter", "fitting", "gear", "gearbox", "gasket", "hose", "hydraulic",
  "lever", "motor", "nozzle", "pipe", "piston", "pump", "radiator", "relay", "roller", "rotor",
  "sensor", "shaft", "solenoid", "switch", "tank", "terminal", "track", "transmission", "tube",
  "object", "mesh", "scene", "render", "reset", "play", "pause", "stop", "drag", "drop", "rotate",
  "rotation", "translate", "scale", "fullscreen", "screen", "zoom", "focus", "pivot", "timeline", "track",
  "valve", "voltage", "wiring", "workflow", "viewport", "fullscreen", "xray", "animation", "marker",
]);

const INDONESIAN_PREFIXES = ["ber", "ter", "meng", "meny", "men", "mem", "me", "peng", "peny", "pen", "pem", "per"];
const INDONESIAN_SUFFIXES = ["kan", "nya", "lah", "kah", "pun"];
const ENGLISH_SUFFIXES = ["tion", "sion", "ment", "ness", "able", "ible", "ous", "ive", "ally", "ly", "ing", "ed"];

const normalizeWord = (word) =>
  String(word || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'");

function scoreWordLanguage(word) {
  const normalized = normalizeWord(word);
  if (!normalized) return { id: 0, en: 0 };

  let id = 0;
  let en = 0;

  if (INDONESIAN_WORDS.has(normalized)) id += 5;
  if (ENGLISH_WORDS.has(normalized)) en += 5;
  if (TECHNICAL_ENGLISH_WORDS.has(normalized)) en += 7;

  if (normalized.length >= 6) {
    if (INDONESIAN_PREFIXES.some((prefix) => normalized.startsWith(prefix))) id += 2;
    if (INDONESIAN_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) id += 2;
    if (ENGLISH_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) en += 2;
  }

  if (/^(di|ke|se)[a-z]{4,}$/.test(normalized)) id += 1;
  if (/^[a-z]+ization$/.test(normalized)) en += 3;

  return { id, en };
}

function classifyWord(word) {
  const score = scoreWordLanguage(word);
  if (score.en >= score.id + 2) return "en-US";
  if (score.id >= score.en + 2) return "id-ID";
  return null;
}

function isWordToken(value) {
  return /^\p{L}+(?:[’'-]\p{L}+)*$/u.test(value);
}

function isSentenceBoundary(value) {
  return /[.!?;:\n]/.test(value);
}

function getSentenceRanges(tokens) {
  const ranges = [];
  let start = 0;

  for (let index = 0; index < tokens.length; index += 1) {
    if (!isSentenceBoundary(tokens[index].text)) continue;
    ranges.push([start, index]);
    start = index + 1;
  }

  if (start < tokens.length) ranges.push([start, tokens.length - 1]);
  return ranges;
}

function inferUnknownLanguages(tokens, defaultLanguage) {
  const ranges = getSentenceRanges(tokens);

  ranges.forEach(([start, end]) => {
    const wordIndexes = [];
    const knownCounts = { "id-ID": 0, "en-US": 0 };

    for (let index = start; index <= end; index += 1) {
      if (!tokens[index].isWord) continue;
      wordIndexes.push(index);
      if (tokens[index].lang) knownCounts[tokens[index].lang] += 1;
    }

    const sentenceDefault =
      knownCounts["en-US"] > knownCounts["id-ID"]
        ? "en-US"
        : knownCounts["id-ID"] > 0
          ? "id-ID"
          : defaultLanguage;

    wordIndexes.forEach((tokenIndex, wordPosition) => {
      if (tokens[tokenIndex].lang) return;

      let previous = null;
      let next = null;

      for (let cursor = wordPosition - 1; cursor >= 0; cursor -= 1) {
        const candidate = tokens[wordIndexes[cursor]].lang;
        if (candidate) {
          previous = candidate;
          break;
        }
      }

      for (let cursor = wordPosition + 1; cursor < wordIndexes.length; cursor += 1) {
        const candidate = tokens[wordIndexes[cursor]].lang;
        if (candidate) {
          next = candidate;
          break;
        }
      }

      tokens[tokenIndex].lang = previous && previous === next
        ? previous
        : sentenceDefault;
    });
  });
}

function mergeSpeechTokens(tokens, defaultLanguage) {
  const segments = [];
  let activeLanguage = defaultLanguage;

  tokens.forEach((token) => {
    if (token.isWord && token.lang) activeLanguage = token.lang;

    const language = token.isWord ? (token.lang || activeLanguage) : activeLanguage;
    const previous = segments[segments.length - 1];

    if (previous && previous.lang === language) {
      previous.text += token.text;
    } else {
      segments.push({ text: token.text, lang: language });
    }
  });

  return segments
    .map((segment) => ({ ...segment, text: segment.text }))
    .filter((segment) => segment.text.trim().length > 0);
}

export function segmentSpeechText(text, { defaultLanguage = "id-ID" } = {}) {
  const normalizedText = String(text || "").trim();
  if (!normalizedText) return [];

  const parts = normalizedText.match(/\p{L}+(?:[’'-]\p{L}+)*|\d+(?:[.,]\d+)*|[^\p{L}\d]+/gu) || [];
  const tokens = parts.map((part) => ({
    text: part,
    isWord: isWordToken(part),
    lang: isWordToken(part) ? classifyWord(part) : null,
  }));

  inferUnknownLanguages(tokens, defaultLanguage);
  return mergeSpeechTokens(tokens, defaultLanguage);
}

export function detectSpeechLanguage(text, options = {}) {
  const segments = segmentSpeechText(text, options);
  if (!segments.length) return options.defaultLanguage || "id-ID";

  const totals = segments.reduce(
    (result, segment) => {
      result[segment.lang] = (result[segment.lang] || 0) + segment.text.trim().length;
      return result;
    },
    {},
  );

  return (totals["en-US"] || 0) > (totals["id-ID"] || 0) ? "en-US" : "id-ID";
}
