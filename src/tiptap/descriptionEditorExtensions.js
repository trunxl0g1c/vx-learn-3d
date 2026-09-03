import StarterKit from "@tiptap/starter-kit";
import TiptapTextAlign from "@tiptap/extension-text-align";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { ForceEnglish } from "./forceEnglishMark";

// Renders textAlign as class="vx-ta-<value>" instead of the extension's
// default inline style="text-align:…". This keeps the sanitizer
// (src/utils/descriptionHtml.js) from ever having to allowlist raw CSS on
// stored content — a class restricted to a fixed known-safe token set can't
// be used to inject arbitrary styling, an inline style attribute can.
const ClassTextAlign = TiptapTextAlign.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: this.options.defaultAlignment,
            parseHTML: (element) => {
              const match = (element.getAttribute("class") || "").match(
                /vx-ta-(left|center|right|justify)/,
              );
              if (match) return match[1];
              const styleAlign = element.style.textAlign;
              return this.options.alignments.includes(styleAlign)
                ? styleAlign
                : this.options.defaultAlignment;
            },
            renderHTML: (attributes) => {
              if (
                !attributes.textAlign ||
                attributes.textAlign === this.options.defaultAlignment
              ) {
                return {};
              }
              return { class: `vx-ta-${attributes.textAlign}` };
            },
          },
        },
      },
    ];
  },
});

export function buildDescriptionEditorExtensions({ maxLength, placeholder }) {
  return [
    StarterKit.configure({
      heading: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      },
    }),
    ClassTextAlign.configure({ types: ["paragraph"], defaultAlignment: "left" }),
    ForceEnglish,
    Placeholder.configure({ placeholder }),
    CharacterCount.configure({ limit: maxLength, mode: "textSize" }),
  ];
}
