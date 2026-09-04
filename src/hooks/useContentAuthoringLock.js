export function useContentAuthoringLock({
  slideModeActive = false,
  flowAuthoringActive = false,
  proceduralAuthoringActive = false,
  animationAuthoringActive = false,
  quizAuthoringActive = false,
  xrAuthoringActive = false,
}) {
  const locked = Boolean(
    slideModeActive ||
      flowAuthoringActive ||
      proceduralAuthoringActive ||
      animationAuthoringActive ||
      quizAuthoringActive ||
      xrAuthoringActive,
  );

  let reason = "";
  if (slideModeActive) {
    reason = "Create Description Object is disabled while Slide authoring is active.";
  } else if (flowAuthoringActive) {
    reason = "Create Description Object is disabled while Flow Authoring is active.";
  } else if (proceduralAuthoringActive) {
    reason = "Create Description Object is disabled while Procedural Authoring is active.";
  } else if (animationAuthoringActive) {
    reason = "Create Description Object is disabled while Animation Authoring is active.";
  } else if (quizAuthoringActive) {
    reason = "Create Description Object is disabled while Quiz Authoring is active.";
  } else if (xrAuthoringActive) {
    reason = "Create Description Object is disabled while XR Authoring is active.";
  }

  return { contentAuthoringLocked: locked, contentAuthoringLockReason: reason };
}

export default useContentAuthoringLock;
