import DOMPurify from "dompurify";
import {
  parseDescriptionMarkup,
  stripDescriptionMarkup,
  stripBoldMarkup,
} from "./descriptionMarkup";

// Bridges the legacy plain-text authoring markup (**bold**, //english//)
// with the HTML produced by the Tiptap rich text editor, so every consumer
// of chapter/slide `description` can keep treating it as one opaque string
// regardless of which era a given record was written in.

// Legacy records are plain text; fresh Tiptap content always wraps text in
// at least one block tag (<p>...</p>), so presence of a tag is a reliable
// heuristic to tell the two apart without a stored format flag.
export function isLegacyDescription(value) {
  const text = String(value || "");
  return !!text && !/<[a-z][\s\S]*>/i.test(text);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// One-time shape conversion of old **bold**/ //english// text into
// equivalent HTML, so it loads correctly into the Tiptap editor and renders
// correctly in the reader view before it has ever been re-saved.
export function legacyMarkupToHtml(text) {
  const inner = parseDescriptionMarkup(text)
    .map((node) => {
      const escaped = escapeHtml(node.value).replace(/\n/g, "<br>");
      if (node.type === "bold") return `<strong>${escaped}</strong>`;
      if (node.type === "forceEnglish") {
        return `<span lang="en-US" data-force-en="true" class="vx-force-en">${escaped}</span>`;
      }
      return escaped;
    })
    .join("");
  return `<p>${inner}</p>`;
}

const ALLOWED_CLASS_TOKENS = new Set([
  "vx-force-en",
  "vx-ta-left",
  "vx-ta-center",
  "vx-ta-right",
  "vx-ta-justify",
]);

let hooksInstalled = false;
function ensureSanitizeHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  // A `class` value can't execute code, but sanitized descriptions render
  // straight into this app's own React tree, where Tailwind utility
  // classes are globally in scope — restrict to our known-safe token set so
  // authored/stored content can never smuggle in e.g. an overlay class.
  DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
    if (data.attrName !== "class") return;
    data.attrValue = data.attrValue
      .split(/\s+/)
      .filter((token) => ALLOWED_CLASS_TOKENS.has(token))
      .join(" ");
    if (!data.attrValue) data.keepAttr = false;
  });
}

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ["p", "strong", "em", "u", "s", "code", "a", "span", "br"],
  ALLOWED_ATTR: ["href", "target", "rel", "lang", "data-force-en", "class"],
};

export function sanitizeDescriptionHtml(html) {
  ensureSanitizeHooks();
  return DOMPurify.sanitize(String(html || ""), SANITIZE_CONFIG);
}

// Feeds the Tiptap editor's initial content, transparently upgrading
// legacy records to HTML on load.
export function toEditableHtml(value) {
  const raw = String(value || "");
  if (!raw) return "";
  return isLegacyDescription(raw) ? legacyMarkupToHtml(raw) : raw;
}

// Replaces stripDescriptionMarkup call sites (truncated list/preview text).
export function descriptionToPlainText(value) {
  const raw = String(value || "");
  if (!raw) return "";
  if (isLegacyDescription(raw)) return stripDescriptionMarkup(raw);

  const container = document.createElement("div");
  container.innerHTML = sanitizeDescriptionHtml(raw);
  return (container.textContent || "").replace(/\s+/g, " ").trim();
}

// Replaces stripBoldMarkup call sites for Play Voice. Re-wraps any
// force-English span's text back in //../ markers so
// engine/speech/SpeechLanguageDetection.js keeps working completely
// unmodified — it only ever sees the same plain-text convention it always
// has, freshly re-derived from the HTML on every read.
export function descriptionToSpeechText(value) {
  const raw = String(value || "");
  if (!raw) return "";
  if (isLegacyDescription(raw)) return stripBoldMarkup(raw);

  const container = document.createElement("div");
  container.innerHTML = sanitizeDescriptionHtml(raw);

  let output = "";
  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      output += node.textContent || "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const isForceEn = node.hasAttribute("data-force-en");
    if (isForceEn) output += "//";
    node.childNodes.forEach(walk);
    if (isForceEn) output += "//";
    if (node.tagName === "BR") output += "\n";
  }

  const children = Array.from(container.childNodes);
  children.forEach((child, index) => {
    walk(child);
    if (
      child.nodeType === Node.ELEMENT_NODE &&
      child.tagName === "P" &&
      index < children.length - 1
    ) {
      output += "\n";
    }
  });

  return output.replace(/\n{3,}/g, "\n\n").trim();
}
