import { Mark, mergeAttributes } from "@tiptap/core";

// Replaces the legacy //word// authoring convention with a real inline
// mark. Renders as <span lang="en-US" data-force-en="true" class="vx-force-en">
// so descriptionToSpeechText() (src/utils/descriptionHtml.js) can walk the
// HTML and re-emit //..// markers for engine/speech/SpeechLanguageDetection.js,
// which is not modified by this feature and still only understands that
// plain-text convention.
export const ForceEnglish = Mark.create({
  name: "forceEnglish",

  parseHTML() {
    return [{ tag: "span[data-force-en]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        lang: "en-US",
        "data-force-en": "true",
        class: "vx-force-en",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleForceEnglish:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
});

export default ForceEnglish;
