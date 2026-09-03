import {
  isLegacyDescription,
  legacyMarkupToHtml,
  sanitizeDescriptionHtml,
} from "../../utils/descriptionHtml";

export default function RichDescriptionText({ text, className }) {
  const raw = String(text || "");
  if (!raw) return <div className={className} />;

  const html = isLegacyDescription(raw) ? legacyMarkupToHtml(raw) : raw;
  const safeHtml = sanitizeDescriptionHtml(html);

  return (
    <div
      className={`vx-rich-description ${className || ""}`}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
