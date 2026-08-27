export const DEFAULT_PRO_TOOLS_SETTINGS = Object.freeze({
  flow: true,
  procedure: true,
  animationCreation: true,
  quiz: false,
  xrImmersive: false,
  addMoreGlb: false,
});

function readBoolean(source, keys, fallback) {
  for (const key of keys) {
    if (source[key] !== undefined) return Boolean(source[key]);
  }

  return fallback;
}

export function normalizeProToolsSettings(settings = {}) {
  const source = settings && typeof settings === "object" ? settings : {};

  return {
    flow: readBoolean(
      source,
      ["flow", "flowEnabled"],
      DEFAULT_PRO_TOOLS_SETTINGS.flow,
    ),
    procedure: readBoolean(
      source,
      ["procedure", "procedural", "procedureEnabled"],
      DEFAULT_PRO_TOOLS_SETTINGS.procedure,
    ),
    animationCreation: readBoolean(
      source,
      ["animationCreation", "animation", "animationEnabled"],
      DEFAULT_PRO_TOOLS_SETTINGS.animationCreation,
    ),
    quiz: readBoolean(
      source,
      ["quiz", "quizEnabled"],
      DEFAULT_PRO_TOOLS_SETTINGS.quiz,
    ),
    xrImmersive: readBoolean(
      source,
      ["xrImmersive", "xr", "immersive", "xrEnabled"],
      DEFAULT_PRO_TOOLS_SETTINGS.xrImmersive,
    ),
    addMoreGlb: readBoolean(
      source,
      ["addMoreGlb", "multiGlb", "additionalGlb", "addMoreGlbEnabled"],
      DEFAULT_PRO_TOOLS_SETTINGS.addMoreGlb,
    ),
  };
}

export function isProToolEnabled(settings, toolId, licenseFlowEnabled = true) {
  const normalized = normalizeProToolsSettings(settings);

  if (toolId === "flow") return normalized.flow && licenseFlowEnabled;
  if (toolId === "procedural") return normalized.procedure && licenseFlowEnabled;
  if (toolId === "animation-creation") return normalized.animationCreation;
  if (toolId === "quiz") return normalized.quiz;
  if (toolId === "xr") return normalized.xrImmersive;
  if (toolId === "add-more-glb") return normalized.addMoreGlb;

  return false;
}
