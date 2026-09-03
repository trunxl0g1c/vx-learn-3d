const BOLD_PATTERN = /\*\*([^*]+)\*\*/;
const FORCE_ENGLISH_PATTERN = /\/\/([^/]+)\/\//;
const BOLD_PATTERN_GLOBAL = /\*\*([^*]+)\*\*/g;

// Shared authoring markup for object/slide descriptions: **bold** renders as
// bold text, //english// pins a word/phrase to English (see
// engine/speech/SpeechLanguageDetection.js, which reuses this same //..//
// convention to keep the id/en voice auto-detection from mis-speaking it).
export function parseDescriptionMarkup(text) {
  const source = String(text || "");
  const nodes = [];
  let cursor = 0;

  while (cursor < source.length) {
    const rest = source.slice(cursor);
    const boldMatch = rest.match(BOLD_PATTERN);
    const forceMatch = rest.match(FORCE_ENGLISH_PATTERN);

    const candidates = [
      boldMatch && { type: "bold", match: boldMatch },
      forceMatch && { type: "forceEnglish", match: forceMatch },
    ].filter(Boolean);

    if (candidates.length === 0) {
      nodes.push({ type: "text", value: rest });
      break;
    }

    candidates.sort((a, b) => a.match.index - b.match.index);
    const next = candidates[0];

    if (next.match.index > 0) {
      nodes.push({ type: "text", value: rest.slice(0, next.match.index) });
    }

    nodes.push({ type: next.type, value: next.match[1] });
    cursor += next.match.index + next.match[0].length;
  }

  return nodes;
}

export function stripDescriptionMarkup(text) {
  return parseDescriptionMarkup(text)
    .map((node) => node.value)
    .join("");
}

// Removes only **bold** markers, leaving //english// spans intact so
// segmentSpeechText can still pin them to an English voice.
export function stripBoldMarkup(text) {
  return String(text || "").replace(BOLD_PATTERN_GLOBAL, "$1");
}
