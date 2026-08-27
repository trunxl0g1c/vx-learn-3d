// Pro Tools remain part of the persisted project shape for backward compatibility,
// but their Project Settings controls are intentionally hidden. All Pro tools are
// enabled by default and normalized to ON so older projects cannot stay disabled
// after the controls are no longer exposed in the UI.
export const DEFAULT_PRO_TOOLS_SETTINGS = Object.freeze({
  flow: true,
  procedure: true,
  animationCreation: true,
  quiz: true,
  xrImmersive: true,
  addMoreGlb: true,
});

export function normalizeProToolsSettings() {
  return { ...DEFAULT_PRO_TOOLS_SETTINGS };
}

export function isProToolEnabled(settings, toolId) {
  const normalized = normalizeProToolsSettings(settings);

  if (toolId === "flow") return normalized.flow;
  if (toolId === "procedural") return normalized.procedure;
  if (toolId === "animation-creation") return normalized.animationCreation;
  if (toolId === "quiz") return normalized.quiz;
  if (toolId === "xr") return normalized.xrImmersive;
  if (toolId === "add-more-glb") return normalized.addMoreGlb;

  return false;
}
